import React, { useState, useEffect, useRef } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import LinearProgress from '@mui/material/LinearProgress'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Alert from '@mui/material/Alert'
import Chip from '@mui/material/Chip'
import Checkbox from '@mui/material/Checkbox'
import Divider from '@mui/material/Divider'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import { CheckSquare, Folder, X } from 'lucide-react'
import gsap from 'gsap'
import { FileInfoTree } from 'electron/main/filesystem/types'
import { flattenFileInfoTree } from '@/lib/file'
import { useTranslation } from '@/lib/i18n'
import { staggerFadeInUp, fadeInScale, Easing } from '@/lib/gsap-animations'

interface AIOrganizationResult {
  filePath: string
  inputCharacters: number
  inputTruncated: boolean
  summary: string
  entities: {
    people: string[]
    places: string[]
    organizations: string[]
    concepts: string[]
    dates: string[]
  }
  tags: string[]
  relatedNotes: string[]
  relations: Array<{ target: string; relation: string }>
}

interface AIOrganizationProgress {
  current: number
  total: number
  filePath: string
  status: string
}

interface OrganizationResult {
  filesOrganized: number
  newFoldersCreated: number
  truncatedFiles: number
  suggestions: Array<{
    path: string
    suggestedCategory: string
    confidence: number
  }>
}

interface AIOrganizationModalProps {
  isOpen: boolean
  onClose: () => void
}

const AIOrganizationModal: React.FC<AIOrganizationModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation()
  const [isRunning, setIsRunning] = useState(false)
  const [progress, setProgress] = useState<AIOrganizationProgress>({
    current: 0,
    total: 0,
    filePath: '',
    status: '',
  })
  const [result, setResult] = useState<OrganizationResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [runStartedAt, setRunStartedAt] = useState<number | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [lastDurationSeconds, setLastDurationSeconds] = useState<number | null>(null)
  const [isCancelling, setIsCancelling] = useState(false)
  const [isUndoing, setIsUndoing] = useState(false)
  const [undoNotice, setUndoNotice] = useState<string | null>(null)
  const [originalContents, setOriginalContents] = useState<Record<string, string>>({})
  const [previewResults, setPreviewResults] = useState<AIOrganizationResult[]>([])
  const [previewReady, setPreviewReady] = useState(false)
  const [isApplying, setIsApplying] = useState(false)
  const [markdownFiles, setMarkdownFiles] = useState<Array<{ path: string; relativePath: string; name: string }>>([])
  const [selectedPaths, setSelectedPaths] = useState<string[]>([])

  const contentRef = useRef<HTMLDivElement>(null)
  const resultRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const suggestionsRef = useRef<HTMLUListElement>(null)
  const cancelledRef = useRef(false)

  useEffect(() => {
    if (!isOpen) return

    const unsubProgress = window.ipcRenderer.on('ai-organization-progress', (p: AIOrganizationProgress) => {
      setProgress(p)
    })
    const unsubCancelled = window.aiOrganization.onCancelled(() => {
      cancelledRef.current = true
      setError(t('aiOrganization.cancelled'))
    })

    return () => {
      unsubProgress()
      unsubCancelled()
    }
  }, [isOpen, t])

  useEffect(() => {
    if (!isOpen) return undefined
    window.fileSystem
      .getFilesTreeForWindow()
      .then((tree) => {
        const files = flattenFileInfoTree(tree as FileInfoTree)
          .filter((file) => file.name.toLowerCase().endsWith('.md'))
          .map(({ path, relativePath, name }) => ({ path, relativePath, name }))
          .sort((left, right) => left.relativePath.localeCompare(right.relativePath))
        setMarkdownFiles(files)
        setSelectedPaths(files.map((file) => file.path))
      })
      .catch((loadError) => {
        setMarkdownFiles([])
        setSelectedPaths([])
        setError(`${t('error.generic')}: ${loadError instanceof Error ? loadError.message : String(loadError)}`)
      })
    return undefined
  }, [isOpen, t])

  useEffect(() => {
    if (!isRunning || runStartedAt === null) return undefined
    const timer = window.setInterval(() => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - runStartedAt) / 1000)))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [isRunning, runStartedAt])
  // GSAP: 表单元素入场动画
  useEffect(() => {
    if (!isOpen || !contentRef.current) return

    const container = contentRef.current
    const ctx = gsap.context(() => {
      const formItems = container.querySelectorAll('.ai-org-form-item')
      if (formItems.length) {
        staggerFadeInUp(formItems, 0.35, 0.08, 0.1)
      }
    }, container)

    return () => ctx.revert()
  }, [isOpen])

  const selectedCount = selectedPaths.length
  const noteCount = markdownFiles.length
  const allSelected = noteCount > 0 && selectedCount === noteCount

  const togglePath = (filePath: string) => {
    setSelectedPaths((current) =>
      current.includes(filePath) ? current.filter((path) => path !== filePath) : [...current, filePath],
    )
  }

  const selectAll = () => setSelectedPaths(markdownFiles.map((file) => file.path))
  const clearSelection = () => setSelectedPaths([])

  const progressPercent = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0
  const estimatedRemainingSeconds =
    progress.current > 0 && progress.total > progress.current
      ? Math.max(1, Math.round((elapsedSeconds / progress.current) * (progress.total - progress.current)))
      : null

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
  }

  // GSAP: 进度条入场
  useEffect(() => {
    if (progressPercent > 0 && progressRef.current) {
      const ctx = gsap.context(() => {
        gsap.fromTo(
          progressRef.current,
          { autoAlpha: 0 },
          {
            autoAlpha: 1,
            duration: 0.35,
            ease: Easing.smooth,
            clearProps: 'opacity,visibility,transform',
            overwrite: 'auto',
          },
        )
      })
      return () => ctx.revert()
    }
  }, [progressPercent])

  // GSAP: 结果弹入
  useEffect(() => {
    if (result && resultRef.current) {
      const ctx = gsap.context(() => {
        fadeInScale(resultRef.current, 0.4, 0)
      })
      return () => ctx.revert()
    }
  }, [result])

  // GSAP: 建议列表错位入场
  useEffect(() => {
    if (result?.suggestions?.length && suggestionsRef.current) {
      const ctx = gsap.context(() => {
        const items = suggestionsRef.current!.querySelectorAll('.ai-org-suggestion-item')
        if (items.length) {
          staggerFadeInUp(items, 0.35, 0.05, 0.2)
        }
      })
      return () => ctx.revert()
    }
  }, [result?.suggestions])

  // GSAP: 错误提示滑入
  useEffect(() => {
    if (error && contentRef.current) {
      const errorEl = contentRef.current.querySelector('.ai-org-error-alert') as HTMLElement
      if (errorEl) {
        const ctx = gsap.context(() => {
          gsap.fromTo(errorEl, { autoAlpha: 0, x: -10 }, { autoAlpha: 1, x: 0, duration: 0.3, ease: Easing.smooth })
        })
        return () => ctx.revert()
      }
    }
  }, [error])

  const handleRun = async () => {
    setError(null)
    setUndoNotice(null)
    setResult(null)
    setPreviewResults([])
    setPreviewReady(false)
    if (selectedPaths.length === 0) {
      setError(t('aiOrganization.noNotes'))
      return
    }
    const startedAt = Date.now()
    cancelledRef.current = false
    setIsCancelling(false)
    setIsRunning(true)
    setRunStartedAt(startedAt)
    setElapsedSeconds(0)
    setLastDurationSeconds(null)
    setProgress({ current: 0, total: 0, filePath: '', status: t('aiOrganization.analyzing') })

    try {
      const contents = await Promise.all(
        selectedPaths.map(
          async (filePath) => [filePath, (await window.fileSystem.readFile(filePath, 'utf-8')) ?? ''] as const,
        ),
      )
      const snapshot = Object.fromEntries(contents)
      setOriginalContents(snapshot)
      const results = await window.aiOrganization.previewNotes(selectedPaths)

      if (cancelledRef.current) return

      // 从返回的逐文件结果派生汇总视图
      const suggestions = results.map((r) => ({
        path: r.filePath,
        suggestedCategory: (r.tags && r.tags[0]) || r.summary || '',
        confidence: r.tags && r.tags.length > 0 ? 1 : 0.5,
      }))
      const newFolders = new Set(suggestions.map((s) => s.suggestedCategory).filter(Boolean))
      const truncatedFiles = results.filter((item) => item.inputTruncated).length

      setResult({
        filesOrganized: results.length,
        newFoldersCreated: newFolders.size,
        truncatedFiles,
        suggestions,
      })
      setPreviewResults(results)
      setPreviewReady(true)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      const cleanMessage = message.replace(/^Error invoking remote method '[^']+':\s*/i, '').replace(/^Error:\s*/i, '')
      setError(`${t('aiOrganization.failed')}: ${cleanMessage}`)
    } finally {
      const duration = Math.floor((Date.now() - startedAt) / 1000)
      setLastDurationSeconds(duration)
      setRunStartedAt(null)
      setIsCancelling(false)
      setIsRunning(false)
    }
  }

  const handleUndo = async () => {
    const entries = Object.entries(originalContents)
    if (entries.length === 0 || isUndoing) return
    setIsUndoing(true)
    setError(null)
    setUndoNotice(null)
    try {
      for (const [filePath, content] of entries) {
        await window.fileSystem.writeFile({ filePath, content })
        await window.database.indexFileInDatabase(filePath)
      }
      setResult(null)
      setUndoNotice(t('aiOrganization.undoComplete'))
      setOriginalContents({})
    } catch (undoError) {
      setError(
        `${t('aiOrganization.undoFailed')}: ${undoError instanceof Error ? undoError.message : String(undoError)}`,
      )
    } finally {
      setIsUndoing(false)
    }
  }

  const handleApply = async () => {
    if (!previewReady || previewResults.length === 0 || isApplying) return
    setIsApplying(true)
    setError(null)
    try {
      await window.aiOrganization.applyNotes(previewResults)
      setPreviewReady(false)
    } catch (applyError) {
      setError(
        `${t('aiOrganization.applyFailed')}: ${applyError instanceof Error ? applyError.message : String(applyError)}`,
      )
    } finally {
      setIsApplying(false)
    }
  }

  const handleCancel = async () => {
    if (!isRunning || isCancelling) return
    setIsCancelling(true)
    try {
      const response = await window.aiOrganization.cancel()
      if (!response.cancelled) {
        setIsCancelling(false)
        setError(t('aiOrganization.cancelUnavailable'))
      }
    } catch (cancelError) {
      setIsCancelling(false)
      setError(
        `${t('aiOrganization.cancelFailed')}: ${cancelError instanceof Error ? cancelError.message : String(cancelError)}`,
      )
    }
  }

  const handleClose = () => {
    if (!isRunning) {
      setError(null)
      setResult(null)
      setIsRunning(false)
      onClose()
    }
  }

  const getConfidenceColor = (confidence: number): 'success' | 'warning' | 'default' => {
    if (confidence >= 0.8) return 'success'
    if (confidence >= 0.5) return 'warning'
    return 'default'
  }

  let actionLabel = t('button.cancel')
  if (isRunning) actionLabel = isCancelling ? t('aiOrganization.cancelling') : t('aiOrganization.cancelRun')
  else if (result) actionLabel = t('button.close')

  return (
    <Dialog open={isOpen} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1 }}>
        {t('aiOrganization.title')}
        <IconButton onClick={handleClose} aria-label={t('button.close')} title={t('button.close')} size="small">
          <X size={16} />
        </IconButton>
      </DialogTitle>
      <DialogContent ref={contentRef} sx={{ overflowX: 'hidden' }}>
        {/* Description */}
        <Box className="ai-org-form-item" mt={2} mb={2}>
          <Typography variant="body2" color="text.secondary">
            {t('aiOrganization.description')}
          </Typography>
        </Box>
        <Box className="ai-org-form-item" mb={2}>
          <FormControl fullWidth size="small">
            <InputLabel id="ai-org-scope-label">{t('aiOrganization.scope')}</InputLabel>
            <Select labelId="ai-org-scope-label" value="vault" label={t('aiOrganization.scope')} disabled={isRunning}>
              <MenuItem value="vault">{t('aiOrganization.currentVault')}</MenuItem>
            </Select>
          </FormControl>
          <Typography variant="caption" color="text.secondary" display="block" mt={1}>
            {t('aiOrganization.scopeHint', { count: selectedCount })}
          </Typography>
        </Box>

        <Box
          className="ai-org-form-item"
          mb={2}
          sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, overflow: 'hidden' }}
        >
          <Box px={1.5} py={1} display="flex" alignItems="center" justifyContent="space-between" gap={1}>
            <Box display="flex" alignItems="center" gap={1} minWidth={0}>
              <CheckSquare size={16} aria-hidden="true" />
              <Typography variant="subtitle2" noWrap>
                {t('aiOrganization.selectFiles')}
              </Typography>
              <Chip size="small" label={`${selectedCount}/${noteCount}`} />
            </Box>
            <Box display="flex" gap={0.5}>
              <Button
                size="small"
                onClick={selectAll}
                disabled={isRunning || isApplying || previewReady || allSelected}
              >
                {t('aiOrganization.selectAll')}
              </Button>
              <Button
                size="small"
                onClick={clearSelection}
                disabled={isRunning || isApplying || previewReady || selectedCount === 0}
              >
                {t('aiOrganization.clearSelection')}
              </Button>
            </Box>
          </Box>
          <Divider />
          <List
            dense
            disablePadding
            sx={{ maxHeight: 210, overflowY: 'auto' }}
            aria-label={t('aiOrganization.selectFiles')}
          >
            {markdownFiles.map((file) => {
              const checked = selectedPaths.includes(file.path)
              return (
                <ListItem key={file.path} disablePadding>
                  <Checkbox
                    checked={checked}
                    onChange={() => togglePath(file.path)}
                    disabled={isRunning || isApplying || previewReady}
                    inputProps={{ 'aria-label': file.relativePath }}
                  />
                  <ListItemText
                    sx={{ minWidth: 0, overflow: 'hidden' }}
                    primary={file.name}
                    secondary={file.relativePath}
                    primaryTypographyProps={{ noWrap: true, sx: { overflow: 'hidden', textOverflow: 'ellipsis' } }}
                    secondaryTypographyProps={{
                      noWrap: true,
                      sx: { overflow: 'hidden', textOverflow: 'ellipsis' },
                    }}
                  />
                </ListItem>
              )
            })}
            {markdownFiles.length === 0 && (
              <ListItem>
                <ListItemText secondary={t('aiOrganization.noNotes')} />
              </ListItem>
            )}
          </List>
        </Box>

        {/* Error */}
        {error && (
          <div className="ai-org-error-alert">
            <Alert
              severity="error"
              onClose={() => setError(null)}
              action={
                Object.keys(originalContents).length > 0 ? (
                  <Button color="inherit" size="small" onClick={handleUndo} disabled={isUndoing}>
                    {isUndoing ? t('aiOrganization.undoing') : t('aiOrganization.undo')}
                  </Button>
                ) : undefined
              }
            >
              {error}
            </Alert>
          </div>
        )}

        {undoNotice && (
          <Alert severity="success" onClose={() => setUndoNotice(null)} sx={{ mt: 2 }}>
            {undoNotice}
          </Alert>
        )}

        {/* Progress */}
        {isRunning && (
          <Box ref={progressRef} mt={2}>
            <Box display="flex" justifyContent="space-between" mb={1}>
              <Typography variant="body2">{progress.status || t('aiOrganization.analyzing')}</Typography>
              <Typography variant="body2" className="tabular-nums">
                {progress.current > 0 && progress.total > 0 ? `${progress.current}/${progress.total} · ` : ''}
                {progressPercent}%
              </Typography>
            </Box>
            <LinearProgress
              variant={progressPercent > 0 ? 'determinate' : 'indeterminate'}
              value={progressPercent > 0 ? progressPercent : undefined}
            />
            {progress.filePath && (
              <Typography variant="caption" color="text.secondary" mt={0.5} display="block">
                {progress.filePath}
              </Typography>
            )}
            <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
              {t('aiOrganization.elapsed')}: {formatDuration(elapsedSeconds)}
              {estimatedRemainingSeconds !== null
                ? ` · ${t('aiOrganization.remaining')}: ${formatDuration(estimatedRemainingSeconds)}`
                : ''}
            </Typography>
          </Box>
        )}

        {/* Result */}
        {result && (
          <Box ref={resultRef} mt={2}>
            <Alert
              severity={previewReady ? 'info' : 'success'}
              onClose={previewReady ? undefined : () => setResult(null)}
              sx={{
                overflowWrap: 'normal',
                wordBreak: 'normal',
                width: '100%',
                boxSizing: 'border-box',
                '& .MuiAlert-message': { minWidth: 0, flex: 1, overflowWrap: 'break-word' },
                '& .MuiAlert-action': { flexShrink: 0, alignItems: 'flex-start' },
              }}
              action={
                !previewReady && Object.keys(originalContents).length > 0 ? (
                  <Button color="inherit" size="small" onClick={handleUndo} disabled={isUndoing}>
                    {isUndoing ? t('aiOrganization.undoing') : t('aiOrganization.undo')}
                  </Button>
                ) : undefined
              }
            >
              <Typography variant="body1">
                {previewReady ? t('aiOrganization.previewReady') : t('aiOrganization.complete')}
              </Typography>
              <Typography variant="body2">
                {result.filesOrganized} {t('aiOrganization.filesOrganized')} | {result.newFoldersCreated}{' '}
                {t('aiOrganization.foldersCreated')}
              </Typography>
              {result.truncatedFiles > 0 && (
                <Typography variant="caption" display="block" mt={0.75} color="warning.main">
                  {t('aiOrganization.truncatedWarning', { count: result.truncatedFiles })}
                </Typography>
              )}
              {lastDurationSeconds !== null && (
                <Typography variant="caption" display="block" mt={0.5}>
                  {t('aiOrganization.elapsed')}: {formatDuration(lastDurationSeconds)}
                </Typography>
              )}
            </Alert>

            {result.suggestions.length > 0 && (
              <Box mt={2}>
                <Typography variant="subtitle2" gutterBottom>
                  {t('aiOrganization.suggestions')} ({result.suggestions.length})
                </Typography>
                <List ref={suggestionsRef} dense>
                  {result.suggestions.map((suggestion) => (
                    <ListItem key={suggestion.path} className="ai-org-suggestion-item">
                      <ListItemIcon>
                        <Folder size={16} />
                      </ListItemIcon>
                      <ListItemText
                        sx={{ minWidth: 0, overflow: 'hidden' }}
                        primary={suggestion.suggestedCategory}
                        secondary={suggestion.path}
                        primaryTypographyProps={{ noWrap: true, sx: { overflow: 'hidden', textOverflow: 'ellipsis' } }}
                        secondaryTypographyProps={{
                          noWrap: true,
                          sx: { overflow: 'hidden', textOverflow: 'ellipsis' },
                        }}
                      />
                      <Chip
                        label={`${Math.round(suggestion.confidence * 100)}%`}
                        size="small"
                        color={getConfidenceColor(suggestion.confidence)}
                        variant="outlined"
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={isRunning ? handleCancel : handleClose} disabled={isCancelling}>
          {actionLabel}
        </Button>
        {previewReady ? (
          <Button onClick={handleApply} variant="contained" disabled={isApplying}>
            {isApplying ? t('aiOrganization.applying') : t('aiOrganization.applyChanges')}
          </Button>
        ) : (
          !result && (
            <Button onClick={handleRun} variant="contained" disabled={isRunning || selectedCount === 0}>
              {isRunning ? t('aiOrganization.running') : t('aiOrganization.start')}
            </Button>
          )
        )}
      </DialogActions>
    </Dialog>
  )
}

export default AIOrganizationModal
