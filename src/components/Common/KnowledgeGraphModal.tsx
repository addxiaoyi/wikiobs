import React, { useEffect, useRef, useState } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import { X } from 'lucide-react'
import Alert from '@mui/material/Alert'
import LinearProgress from '@mui/material/LinearProgress'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import EnhancedGraphView from './EnhancedGraphView'
import { useTranslation } from '@/lib/i18n'
import { useContentContext } from '@/contexts/ContentContext'

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
  const [graph, setGraph] = useState<KnowledgeGraph | null>(null)
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
      const availableWidth =
        window.innerWidth <= 960
          ? window.innerWidth - 80
          : container.parentElement?.clientWidth || window.innerWidth - 80
      setGraphWidth(Math.max(280, Math.min(960, availableWidth)))
      const compactViewport = window.innerWidth <= 640
      setGraphHeight(Math.max(320, Math.min(600, window.innerHeight - (compactViewport ? 330 : 220))))
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
    <Dialog open={isOpen} onClose={onClose} maxWidth="xl" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1 }}>
        {t('graph.title')}
        <IconButton onClick={onClose} aria-label={t('button.close')} title={t('button.close')} size="small">
          <X size={16} />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ minHeight: { xs: 320, sm: 420, md: 560 }, overflowX: 'hidden', px: { xs: 1.5, sm: 3 } }}>
        {loading && (
          <Box py={4}>
            <LinearProgress />
            <Typography variant="body2" color="text.secondary" align="center" mt={2}>
              {t('scheduled.loading')}
            </Typography>
          </Box>
        )}
        {error && <Alert severity="error">{error}</Alert>}
        {!loading && !error && nodes.length === 0 && (
          <Box
            sx={{
              minHeight: { xs: 280, sm: 520 },
              display: 'grid',
              placeItems: 'center',
              py: { xs: 4, sm: 8 },
            }}
          >
            <Alert severity="info" sx={{ width: '100%', maxWidth: 560 }}>
              {t('graph.empty')}
            </Alert>
          </Box>
        )}
        {!loading && !error && nodes.length > 0 && (
          <Box
            ref={graphContainerRef}
            sx={{ width: '100%', minWidth: 0, maxWidth: '100%', minHeight: graphHeight, overflow: 'hidden' }}
          >
            <EnhancedGraphView
              nodes={nodes}
              edges={edges}
              width={graphWidth}
              height={graphHeight}
              onNodeClick={handleNodeClick}
            />
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('button.close')}</Button>
      </DialogActions>
    </Dialog>
  )
}

export default KnowledgeGraphModal
