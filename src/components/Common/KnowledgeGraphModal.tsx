import React, { useEffect, useRef, useState } from 'react'
import { Share2, AlertCircle, Loader2, Network } from 'lucide-react'

import ReorModal from './Modal'
import { Button } from '@/components/ui/button'
import EnhancedGraphView from './EnhancedGraphView'
import { useTranslation } from '@/lib/i18n'
import { useContentContext } from '@/contexts/ContentContext'
import { useFileContext } from '@/contexts/FileContext'

interface GraphEntity {
  id: string
  title: string
  type: string
  aliases?: string[]
  filePath?: string
}

interface GraphRelation {
  source: string
  target: string
  type: string
  weight: number
}

interface KnowledgeGraph {
  entities: GraphEntity[]
  relations: GraphRelation[]
}

const getEdgeType = (type: string): 'related' | 'link' | 'mention' => {
  if (type === 'links_to') return 'link'
  if (type === 'mentions') return 'mention'
  return 'related'
}

interface KnowledgeGraphModalProps {
  isOpen: boolean
  onClose: () => void
}

const KnowledgeGraphModal: React.FC<KnowledgeGraphModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation()
  const { openContent } = useContentContext()
  const { openOrCreateFile } = useFileContext()
  const [graph, setGraph] = useState<KnowledgeGraph | null>(null)

  const handleOpenInTab = () => {
    openOrCreateFile('graph://global')
    onClose()
  }
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [graphWidth, setGraphWidth] = useState(960)
  const [graphHeight, setGraphHeight] = useState(600)
  const graphContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return undefined

    let cancelled = false
    setLoading(true)
    setError(null)

    window.knowledgeGraph
      .build({ includeContent: false, maxDepth: 3 })
      .then((nextGraph) => {
        if (!cancelled) setGraph(nextGraph as unknown as KnowledgeGraph)
      })
      .catch(() => {
        if (!cancelled) setError(t('error.generic'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [isOpen, t])

  useEffect(() => {
    const container = graphContainerRef.current
    if (!container || !isOpen) return undefined

    const updateWidth = () => {
      const availableWidth = container.clientWidth || window.innerWidth - 80
      setGraphWidth(Math.max(280, availableWidth))
      const compactViewport = window.innerWidth <= 640
      setGraphHeight(Math.max(320, window.innerHeight - (compactViewport ? 260 : 200)))
    }
    updateWidth()
    const observer = new ResizeObserver(updateWidth)
    observer.observe(container)
    return () => observer.disconnect()
  }, [isOpen, graph])

  const nodes =
    graph?.entities.map((entity) => ({
      id: entity.id,
      label: entity.title,
      type: entity.type,
      tags: entity.aliases,
      filePath: entity.filePath,
    })) || []
  const edges =
    graph?.relations.map((relation) => ({
      source: relation.source,
      target: relation.target,
      type: getEdgeType(relation.type),
      weight: relation.weight,
    })) || []

  const handleNodeClick = async (node: { filePath?: string }) => {
    if (!node.filePath) return
    try {
      const vaultDirectory = await window.electronStore.getVaultDirectoryForWindow()
      const filePath = /^[A-Za-z]:[\\/]/.test(node.filePath)
      ? node.filePath
        : await window.path.join(vaultDirectory, node.filePath)
      onClose()
      openContent(filePath)
    } catch (clickError) {
      setError(clickError instanceof Error ? clickError.message : String(clickError))
    }
  }

  return (
    <ReorModal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-6xl w-[94vw] h-[86vh] max-h-[86vh] p-4 flex flex-col"
    >
      {/* Header */}
      <div className="flex items-start gap-3 pb-3 border-b border-border shrink-0">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-[#7b68ee]/30 bg-[#7b68ee]/15 text-[#7b68ee] dark:text-[#9d8ff5] shadow-sm shadow-[#7b68ee]/20">
          <Share2 size={16} strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1 pr-6">
          <h2 className="text-sm font-semibold text-foreground tracking-tight">{t('graph.title')}</h2>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            双向链接拓扑关系与知识网络探索 ({nodes.length} 节点 · {edges.length} 连线)
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 relative flex flex-col pt-2 overflow-hidden">
        {loading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-background/80 backdrop-blur-sm text-muted-foreground">
            <Loader2 size={24} className="animate-spin text-[#7b68ee]" />
            <span className="text-xs">{t('scheduled.loading')}</span>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2.5 rounded-lg border border-red-500/25 bg-red-500/10 p-3 text-xs text-red-600 dark:text-red-200 m-2">
            <AlertCircle size={15} className="mt-0.5 shrink-0 text-red-500" />
            <div className="flex-1">{error}</div>
          </div>
        )}

        {!loading && !error && nodes.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
            <div className="size-12 rounded-xl bg-muted/40 border border-border flex items-center justify-center mx-auto mb-2 text-muted-foreground">
              <Share2 size={24} />
            </div>
            <p className="text-xs">{t('graph.empty')}</p>
          </div>
        )}

        {!loading && !error && nodes.length > 0 && (
          <div
            ref={graphContainerRef}
            className="flex-1 w-full min-w-0 min-h-0 overflow-hidden rounded-lg border border-border bg-card/40"
          >
            <EnhancedGraphView
              nodes={nodes}
              edges={edges}
              width={graphWidth}
              height={graphHeight}
              onNodeClick={handleNodeClick}
            />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2.5 pt-3 mt-2 border-t border-border shrink-0">
        <Button
          variant="outline"
          size="sm"
          onClick={handleOpenInTab}
          title="在工作区标签页中打开"
          className="text-xs gap-1.5 border-[#7b68ee]/40 text-[#7b68ee] hover:bg-[#7b68ee]/10 hover:text-[#7b68ee]"
        >
          <Network size={13} />
          <span>在工作区标签页中打开</span>
        </Button>
        <Button variant="secondary" size="sm" onClick={onClose} className="text-xs">
          {t('button.close')}
        </Button>
      </div>
    </ReorModal>
  )
}

export default KnowledgeGraphModal
