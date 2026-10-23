/**
 * GlobalGraphView.tsx
 * Full-canvas container for the Global Dynamic Force-Directed Knowledge Graph.
 * Hosts ForceGraphCanvas and floating GraphHUD pill with real-time physics simulation,
 * interactive dragging, directory/tag color grouping, and navigation back to editor notes.
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Loader2, Share2, PenLine } from 'lucide-react'
import { ForceGraphCanvas } from './ForceGraphCanvas'
import { GraphHUD } from './GraphHUD'
import { Button } from '@/components/ui/button'
import {
  GraphNode,
  GraphLink,
  GraphPhysicsConfig,
  GraphDisplayConfig,
  DEFAULT_PHYSICS_CONFIG,
  DEFAULT_DISPLAY_CONFIG,
} from './graph-types'
import { useFileContext } from '@/contexts/FileContext'
import { useContentContext } from '@/contexts/ContentContext'

export const GlobalGraphView: React.FC = () => {
  const { openOrCreateFile } = useFileContext()
  const { setShowEditor, createUntitledNote } = useContentContext()
  const [nodes, setNodes] = useState<GraphNode[]>([])
  const [links, setLinks] = useState<GraphLink[]>([])
  const [physicsConfig, setPhysicsConfig] = useState<GraphPhysicsConfig>(DEFAULT_PHYSICS_CONFIG)
  const [displayConfig, setDisplayConfig] = useState<GraphDisplayConfig>(DEFAULT_DISPLAY_CONFIG)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [, setError] = useState<string | null>(null)

  const resetCameraRef = useRef<(() => void) | null>(null)
  const reheatRef = useRef<(() => void) | null>(null)

  const loadGraph = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      if (!window.knowledgeGraph?.build) {
        setNodes([])
        setLinks([])
        return
      }
      const rawGraph = await window.knowledgeGraph.build({ includeContent: false, maxDepth: 3 })
      if (!rawGraph) {
        setNodes([])
        setLinks([])
        return
      }
      const rawEntities = rawGraph.entities || []
      const rawRelations = rawGraph.relations || []

      const mappedNodes: GraphNode[] = rawEntities.map((entity: any) => ({
        id: entity.id,
        name: entity.title || entity.id,
        label: entity.title || entity.id,
        filePath: entity.filePath,
        type: entity.type,
        tags: entity.aliases || [],
        isTag: entity.type === 'tag',
      }))

      const mappedLinks: GraphLink[] = rawRelations.map((rel: any) => ({
        source: rel.source,
        target: rel.target,
        type: rel.type,
        weight: rel.weight,
      }))

      setNodes(mappedNodes)
      setLinks(mappedLinks)
    } catch (err: any) {
      console.error('Failed to load global graph:', err)
      setError(err?.message || 'Failed to load knowledge graph')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadGraph()
    const removeListener = window.ipcRenderer?.receive('files-list', () => {
      loadGraph()
    })
    return () => {
      if (removeListener) removeListener()
    }
  }, [loadGraph])

  const handleNodeClick = useCallback(
    async (node: GraphNode) => {
      if (!node.filePath) return
      try {
        setShowEditor(true)
        const vaultDirectory = await window.electronStore.getVaultDirectoryForWindow()
        const absolutePath = /^[A-Za-z]:[\\/]/.test(node.filePath)
          ? node.filePath
          : await window.path.join(vaultDirectory, node.filePath)
        openOrCreateFile(absolutePath)
      } catch (err) {
        console.error('Failed to open note from global graph:', err)
      }
    },
    [openOrCreateFile, setShowEditor],
  )

  const matchCount = useMemo(() => {
    const q = displayConfig.searchQuery.trim().toLowerCase()
    if (!q) return 0
    return nodes.filter((n) => {
      const name = (n.name || n.label || n.id).toLowerCase()
      const filePath = (n.filePath || '').toLowerCase()
      const tags = (n.tags || []).map((t) => t.toLowerCase())
      return name.includes(q) || filePath.includes(q) || tags.some((t) => t.includes(q))
    }).length
  }, [nodes, displayConfig.searchQuery])

  return (
    <div className="relative size-full overflow-hidden bg-background">
      <ForceGraphCanvas
        nodes={nodes}
        links={links}
        physicsConfig={physicsConfig}
        displayConfig={displayConfig}
        onNodeClick={handleNodeClick}
        resetCameraRef={resetCameraRef}
        reheatRef={reheatRef}
        className="size-full"
      />
      <GraphHUD
        className="graph-hud"
        physicsConfig={physicsConfig}
        displayConfig={displayConfig}
        onPhysicsChange={(p) => setPhysicsConfig((prev) => ({ ...prev, ...p }))}
        onDisplayChange={(d) => setDisplayConfig((prev) => ({ ...prev, ...d }))}
        matchCount={matchCount}
        totalNodes={nodes.length}
        onResetView={() => resetCameraRef.current?.()}
        onReheatSimulation={() => reheatRef.current?.()}
      />
      {/* Empty State Overlay */}
      {nodes.length === 0 && !isLoading && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none p-6 text-center select-none">
          <div className="size-12 rounded-2xl border border-[var(--line)] bg-[var(--surface-1)] backdrop-blur-md flex items-center justify-center mb-3 shadow-lg">
            <Share2 size={22} className="text-[#7b68ee]/80" />
          </div>
          <h3 className="text-sm font-semibold text-foreground tracking-tight">知识网络尚未建立关联</h3>
          <p className="mt-1.5 max-w-sm text-xs text-[var(--ink-muted)] leading-relaxed">
            在 Markdown 笔记中使用 <code className="rounded bg-[var(--surface-2)] border border-[var(--line)] px-1.5 py-0.5 text-[11px] font-mono text-[#7b68ee]">[[双向链接]]</code> 或 <code className="rounded bg-[var(--surface-2)] border border-[var(--line)] px-1.5 py-0.5 text-[11px] font-mono text-[#7b68ee]">#标签</code>，图谱将实时生成拓扑节点。
          </p>
          <div className="mt-4 pointer-events-auto flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setShowEditor(true)
                createUntitledNote()
              }}
              className="gap-1.5 text-xs border-[#7b68ee]/40 text-[#7b68ee] hover:bg-[#7b68ee]/10 active:scale-95"
            >
              <PenLine size={12} />
              <span>新建首篇关联笔记</span>
            </Button>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/50 backdrop-blur-xs">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  )
}

export default GlobalGraphView
