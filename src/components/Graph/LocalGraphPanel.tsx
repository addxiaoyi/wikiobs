/**
 * LocalGraphPanel.tsx
 * Right auxiliary drawer component hosting an ego-centered Force-Directed Knowledge Graph.
 * Automatically refocuses when active note changes, extracting 1-to-N degree neighbors via
 * in-memory BFS on cached graph data with <150ms reactive updates and depth slider (1-5).
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Network, RotateCcw, RefreshCw, Layers, Info, FileText } from 'lucide-react'
import { ForceGraphCanvas } from './ForceGraphCanvas'
import {
  GraphNode,
  GraphLink,
  GraphPhysicsConfig,
  GraphDisplayConfig,
  DEFAULT_DISPLAY_CONFIG,
} from './graph-types'
import { useFileContext } from '@/contexts/FileContext'
import { useContentContext } from '@/contexts/ContentContext'
import { Slider } from '@/components/ui/slider'

const LOCAL_GRAPH_PHYSICS: GraphPhysicsConfig = {
  repelForce: -180,
  linkDistance: 80,
  centerPull: 0.1,
  collisionMargin: 10,
}

export const LocalGraphPanel: React.FC = () => {
  const { currentlyOpenFilePath } = useFileContext()
  const { openContent } = useContentContext()

  // Full vault graph cache
  const [cachedRawGraph, setCachedRawGraph] = useState<{ entities: any[]; relations: any[] } | null>(null)
  const [depth, setDepth] = useState<number>(2)

  // Local subgraph state
  const [subgraphNodes, setSubgraphNodes] = useState<GraphNode[]>([])
  const [subgraphLinks, setSubgraphLinks] = useState<GraphLink[]>([])
  const [activeCenterId, setActiveCenterId] = useState<string | null>(null)
  const [isOrphan, setIsOrphan] = useState<boolean>(false)

  const resetCameraRef = useRef<(() => void) | null>(null)
  const reheatRef = useRef<(() => void) | null>(null)

  // Fetch and cache full vault graph data
  const refreshCache = useCallback(async () => {
    try {
      if (!window.knowledgeGraph?.build) return
      const rawGraph = await window.knowledgeGraph.build({ includeContent: false, maxDepth: 3 })
      if (rawGraph) {
        setCachedRawGraph({
          entities: rawGraph.entities || [],
          relations: rawGraph.relations || [],
        })
      }
    } catch (err) {
      console.error('Failed to load vault graph cache for LocalGraphPanel:', err)
    }
  }, [])

  useEffect(() => {
    refreshCache()
    const removeListener = window.ipcRenderer?.receive('files-list', () => {
      refreshCache()
    })
    return () => {
      if (removeListener) removeListener()
    }
  }, [refreshCache])

  // Precompute adjacency list & lookup indices from cached raw graph
  const graphIndex = useMemo(() => {
    if (!cachedRawGraph) {
      return {
        adj: new Map<string, Set<string>>(),
        entityMap: new Map<string, any>(),
        pathMap: new Map<string, string>(),
        titleMap: new Map<string, string>(),
      }
    }

    const adj = new Map<string, Set<string>>()
    const entityMap = new Map<string, any>()
    const pathMap = new Map<string, string>()
    const titleMap = new Map<string, string>()

    cachedRawGraph.entities.forEach((entity: any) => {
      entityMap.set(entity.id, entity)
      adj.set(entity.id, new Set())

      if (entity.filePath) {
        const norm = entity.filePath.replace(/\\/g, '/').toLowerCase()
        pathMap.set(norm, entity.id)
      }
      if (entity.title) {
        titleMap.set(entity.title.toLowerCase(), entity.id)
      }
      if (entity.id) {
        titleMap.set(entity.id.toLowerCase(), entity.id)
      }
    })

    cachedRawGraph.relations.forEach((rel: any) => {
      const s = rel.source
      const t = rel.target
      if (adj.has(s) && adj.has(t)) {
        adj.get(s)!.add(t)
        adj.get(t)!.add(s)
      }
    })

    return { adj, entityMap, pathMap, titleMap }
  }, [cachedRawGraph])

  // Extract local subgraph centered at currentlyOpenFilePath with BFS
  useEffect(() => {
    const startPerf = performance.now()

    if (!currentlyOpenFilePath || currentlyOpenFilePath.startsWith('graph://')) {
      setActiveCenterId(null)
      setSubgraphNodes([])
      setSubgraphLinks([])
      setIsOrphan(false)
      return
    }

    const { adj, entityMap, pathMap, titleMap } = graphIndex

    // Resolve active file path to center node ID
    const normPath = currentlyOpenFilePath.replace(/\\/g, '/').toLowerCase()
    const rawFileName = currentlyOpenFilePath.split(/[/\\]/).pop() || ''
    const cleanTitle = rawFileName.replace(/\.md$/i, '').toLowerCase()

    let centerId: string | null = pathMap.get(normPath) || null
    if (!centerId) {
      centerId = titleMap.get(cleanTitle) || null
    }

    // Fallback if note not yet in graph index
    if (!centerId) {
      const fallbackNode: GraphNode = {
        id: cleanTitle || 'Active Note',
        name: rawFileName.replace(/\.md$/i, '') || 'Active Note',
        label: rawFileName.replace(/\.md$/i, '') || 'Active Note',
        filePath: currentlyOpenFilePath,
        degree: 0,
        isOrphan: true,
      }
      setActiveCenterId(fallbackNode.id)
      setSubgraphNodes([fallbackNode])
      setSubgraphLinks([])
      setIsOrphan(true)
      return
    }

    setActiveCenterId(centerId)

    // Run BFS up to `depth` hops
    const visited = new Set<string>([centerId])
    let currentLevel = [centerId]

    for (let d = 0; d < depth; d++) {
      const nextLevel: string[] = []
      for (const curr of currentLevel) {
        const neighbors = adj.get(curr)
        if (neighbors) {
          for (const n of neighbors) {
            if (!visited.has(n)) {
              visited.add(n)
              nextLevel.push(n)
            }
          }
        }
      }
      currentLevel = nextLevel
      if (currentLevel.length === 0) break
    }

    const directNeighbors = adj.get(centerId)?.size || 0
    const orphanState = directNeighbors === 0
    setIsOrphan(orphanState)

    // Construct subgraph nodes
    const subNodes: GraphNode[] = []
    visited.forEach((nodeId) => {
      const ent = entityMap.get(nodeId)
      const isCenter = nodeId === centerId
      if (ent) {
        subNodes.push({
          id: ent.id,
          name: ent.title || ent.id,
          label: ent.title || ent.id,
          filePath: ent.filePath,
          type: ent.type,
          tags: ent.aliases || [],
          isTag: ent.type === 'tag',
        })
      } else {
        subNodes.push({
          id: nodeId,
          name: nodeId,
          label: nodeId,
        })
      }
    })

    // Construct subgraph links
    const subLinks: GraphLink[] = []
    if (cachedRawGraph) {
      cachedRawGraph.relations.forEach((rel: any) => {
        if (visited.has(rel.source) && visited.has(rel.target)) {
          subLinks.push({
            source: rel.source,
            target: rel.target,
            type: rel.type,
            weight: rel.weight,
          })
        }
      })
    }

    setSubgraphNodes(subNodes)
    setSubgraphLinks(subLinks)

    const elapsed = performance.now() - startPerf
    if (elapsed > 100) {
      console.warn(`[LocalGraph] Slow neighbor computation: ${elapsed.toFixed(2)}ms`)
    }
  }, [currentlyOpenFilePath, depth, graphIndex, cachedRawGraph])

  const handleNodeClick = useCallback(
    async (node: GraphNode) => {
      if (!node.filePath) return
      try {
        const vaultDirectory = await window.electronStore.getVaultDirectoryForWindow()
        const absolutePath = /^[A-Za-z]:[\\/]/.test(node.filePath)
          ? node.filePath
          : await window.path.join(vaultDirectory, node.filePath)
        openContent(absolutePath)
      } catch (err) {
        console.error('Failed to navigate from local graph:', err)
      }
    },
    [openContent],
  )

  const activeNoteTitle = useMemo(() => {
    if (!currentlyOpenFilePath) return null
    const name = currentlyOpenFilePath.split(/[/\\]/).pop() || ''
    return name.replace(/\.md$/i, '')
  }, [currentlyOpenFilePath])

  const displayConfig: GraphDisplayConfig = useMemo(
    () => ({
      ...DEFAULT_DISPLAY_CONFIG,
      showTags: true,
      showOrphans: true,
      showLabels: true,
      showParticles: true,
      searchQuery: '',
    }),
    [],
  )

  return (
    <div className="relative flex size-full flex-col overflow-hidden bg-background border-l border-border select-none">
      {/* Header Bar */}
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-border bg-secondary/50 px-3">
        <div className="flex items-center gap-1.5 min-w-0">
          <Network size={14} className="text-foreground shrink-0" />
          <span className="text-xs font-semibold text-foreground truncate">局部关系图</span>
          {activeNoteTitle && (
            <span className="truncate rounded bg-foreground/10 px-1.5 py-0.5 text-[10px] font-mono text-foreground/90 max-w-[120px]">
              {activeNoteTitle}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => reheatRef.current?.()}
            title="重新计算布局"
            className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <RefreshCw size={13} />
          </button>
          <button
            type="button"
            onClick={() => resetCameraRef.current?.()}
            title="重置居中视角"
            className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <RotateCcw size={13} />
          </button>
        </div>
      </div>

      {/* Subgraph Controls Bar */}
      <div className="flex items-center justify-between border-b border-border/70 bg-card/40 px-3 py-1.5 text-xs">
        <div className="flex items-center gap-2 flex-1 max-w-[200px]">
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground shrink-0">
            <Layers size={12} />
            <span>深度 {depth}</span>
          </span>
          <Slider
            value={[depth]}
            min={1}
            max={5}
            step={1}
            onValueChange={([val]) => setDepth(val)}
            className="py-1 flex-1"
          />
        </div>

        <span className="text-[10px] text-muted-foreground font-mono">
          {subgraphNodes.length > 0 ? `${subgraphNodes.length} 节点` : ''}
        </span>
      </div>

      {/* Canvas & States Container */}
      <div className="relative flex-1 min-h-0 overflow-hidden">
        {!currentlyOpenFilePath || currentlyOpenFilePath.startsWith('graph://') ? (
          <div className="flex size-full flex-col items-center justify-center p-6 text-center text-muted-foreground">
            <div className="flex size-10 items-center justify-center rounded-xl bg-muted/40 border border-border mb-2 text-muted-foreground">
              <FileText size={20} />
            </div>
            <p className="text-xs font-medium">请在编辑器中打开笔记</p>
            <p className="text-[11px] text-muted-foreground/70 mt-1">
              局部关系图将自动呈现当前笔记的关联网络
            </p>
          </div>
        ) : (
          <>
            <ForceGraphCanvas
              nodes={subgraphNodes}
              links={subgraphLinks}
              physicsConfig={LOCAL_GRAPH_PHYSICS}
              displayConfig={displayConfig}
              onNodeClick={handleNodeClick}
              selectedNodeId={activeCenterId}
              resetCameraRef={resetCameraRef}
              reheatRef={reheatRef}
              className="size-full"
            />

            {/* Informative Empty State for 0-Link Orphan Notes */}
            {isOrphan && (
              <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full border border-border/80 bg-background/90 px-3 py-1 text-[11px] text-muted-foreground shadow-md backdrop-blur-md">
                <Info size={12} className="text-muted-foreground" />
                <span>当前笔记暂无双向链接</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default LocalGraphPanel
