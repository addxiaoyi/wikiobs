import React, { useState, useEffect, useRef } from 'react'
import {
  Brain,
  CheckSquare,
  Square,
  Folder,
  X,
  AlertCircle,
  CheckCircle2,
  RotateCcw,
  Play,
  Loader2,
  FileText,
  Clock,
  Sparkles,
} from 'lucide-react'
import gsap from 'gsap'

import ReorModal from './Modal'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { FileInfoTree } from 'electron/main/filesystem/types'
import { flattenFileInfoTree } from '@/lib/file'
import { useTranslation } from '@/lib/i18n'
import { staggerFadeInUp, fadeInScale } from '@/lib/gsap-animations'
import { cn } from '@/lib/ui'

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
  embedded?: boolean
}

const AIOrganizationModal: React.FC<AIOrganizationModalProps> = ({ isOpen, onClose, embedded }) => {
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
  const suggestionsRef = useRef<HTMLDivElement>(null)
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

  // GSAP: Form entrance
  useEffect(() => {
    if (!isOpen || !contentRef.current) return

    const container = contentRef.current
    const ctx = gsap.context(() => {
      const formItems = container.querySelectorAll('.ai-org-form-item')
      if (formItems.length) {
        staggerFadeInUp(formItems, 0.25, 0.05, 0.05)
      }
    }, container)

    return () => ctx.revert()
  }, [isOpen])

  // GSAP: Suggestions entrance
  useEffect(() => {
    if (result?.suggestions?.length && suggestionsRef.current) {
      const ctx = gsap.context(() => {
        const items = suggestionsRef.current!.querySelectorAll('.ai-org-suggestion-item')
        if (items.length) {
          staggerFadeInUp(items, 0.25, 0.03, 0.1)
        }
      }, suggestionsRef)
      return () => ctx.revert()
    }
  }, [result?.suggestions])

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

  return (
    <ReorModal isOpen={isOpen} onClose={handleClose} embedded={embedded} className="max-w-[580px] p-5">
      {/* Header */}
      <div className="flex items-start gap-3 pb-4 border-b border-border">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-[#7b68ee]/30 bg-[#7b68ee]/15 text-[#7b68ee] dark:text-[#9d8ff5] shadow-sm shadow-[#7b68ee]/20">
          <Brain size={18} strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1 pr-6">
          <h2 className="text-base font-semibold text-foreground tracking-tight">{t('aiOrganization.title')}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{t('aiOrganization.description')}</p>
        </div>
      </div>

      <div ref={contentRef} className="pt-4 space-y-3.5">
        {/* Error Alert */}
        {error && (
          <div className="flex items-start gap-2.5 rounded-lg border border-red-500/25 bg-red-500/10 p-3 text-xs text-red-600 dark:text-red-200">
            <AlertCircle size={15} className="mt-0.5 shrink-0 text-red-500" />
            <div className="flex-1 break-all">{error}</div>
            {Object.keys(originalContents).length > 0 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleUndo}
                disabled={isUndoing}
                className="h-6 px-2 text-[11px] border-red-500/30 text-red-600 dark:text-red-200"
              >
                {isUndoing ? t('aiOrganization.undoing') : t('aiOrganization.undo')}
              </Button>
            )}
            <button type="button" onClick={() => setError(null)} className="text-red-500 hover:text-red-400">
              ×
            </button>
          </div>
        )}

        {/* Undo Notice */}
        {undoNotice && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-200">
            <CheckCircle2 size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{undoNotice}</span>
          </div>
        )}

        {/* Note Selector Box */}
        <div className="ai-org-form-item rounded-lg border border-border bg-card p-3 space-y-2">
          <div className="flex items-center justify-between pb-2 border-b border-border text-xs">
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground">{t('aiOrganization.selectFiles')}</span>
              <span className="rounded bg-muted/40 border border-border px-1.5 py-0.2 text-[11px] font-mono text-muted-foreground">
                {selectedCount} / {noteCount}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                variant="secondary"
                size="sm"
                onClick={selectAll}
                disabled={isRunning || isApplying || previewReady || allSelected}
                className="h-6 px-2 text-[11px] border-border"
              >
                {t('aiOrganization.selectAll')}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={clearSelection}
                disabled={isRunning || isApplying || previewReady || selectedCount === 0}
                className="h-6 px-2 text-[11px] border-border"
              >
                {t('aiOrganization.clearSelection')}
              </Button>
            </div>
          </div>

          <div className="max-h-48 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
            {markdownFiles.map((file) => {
              const checked = selectedPaths.includes(file.path)
              return (
                <div
                  key={file.path}
                  role="button"
                  tabIndex={0}
                  onClick={() => !isRunning && !isApplying && !previewReady && togglePath(file.path)}
                  onKeyDown={(e) => {
                    if (e.key === ' ' || e.key === 'Enter') togglePath(file.path)
                  }}
                  className={cn(
                    'flex items-center gap-2.5 rounded px-2 py-1 text-xs transition-colors cursor-pointer select-none',
                    checked ? 'bg-[#7b68ee]/15 text-[#7b68ee] dark:text-[#a29bfe] font-medium' : 'text-foreground hover:bg-accent',
                  )}
                >
                  <Checkbox
                    id={`ai-note-${file.path.replace(/[^a-zA-Z0-9_-]/g, '-')}`}
                    checked={checked}
                    onCheckedChange={() => togglePath(file.path)}
                    disabled={isRunning || isApplying || previewReady}
                    label={file.name}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate text-foreground">{file.name}</div>
                    <div className="text-[10px] text-muted-foreground font-mono truncate">{file.relativePath}</div>
                  </div>
                </div>
              )
            })}
            {markdownFiles.length === 0 && (
              <p className="py-4 text-center text-xs text-muted-foreground">{t('aiOrganization.noNotes')}</p>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        {isRunning && (
          <div className="space-y-1.5 rounded-lg border border-purple-500/20 bg-purple-500/10 p-3">
            <div className="flex items-center justify-between text-xs text-purple-200">
              <span className="flex items-center gap-1.5 truncate max-w-[70%]">
                <Loader2 size={13} className="animate-spin text-[#7b68ee] shrink-0" />
                <span className="truncate">{progress.status || t('aiOrganization.analyzing')}</span>
              </span>
              <span className="font-mono text-[11px]">{progressPercent}%</span>
            </div>
            <Progress value={progressPercent} className="h-1.5 bg-purple-950/40" />
            <div className="flex items-center justify-between text-[10px] text-purple-300/70 pt-0.5">
              <span className="truncate">{progress.filePath}</span>
              <span className="shrink-0 ml-2">
                耗时: {formatDuration(elapsedSeconds)}
                {estimatedRemainingSeconds !== null && ` · 预估剩余: ${formatDuration(estimatedRemainingSeconds)}`}
              </span>
            </div>
          </div>
        )}

        {/* Results Banner & Suggestions */}
        {result && (
          <div ref={resultRef} className="space-y-3">
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3.5 space-y-1.5 text-xs text-emerald-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-medium">
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                  <span>{previewReady ? t('aiOrganization.previewReady') : t('aiOrganization.complete')}</span>
                </div>
                {!previewReady && Object.keys(originalContents).length > 0 && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleUndo}
                    disabled={isUndoing}
                    className="h-6 px-2 text-[11px] border-emerald-500/30 text-emerald-200 hover:bg-emerald-500/20"
                  >
                    {isUndoing ? t('aiOrganization.undoing') : t('aiOrganization.undo')}
                  </Button>
                )}
              </div>
              <p className="text-[11px] text-emerald-300/80">
                整理文件: <strong className="text-foreground">{result.filesOrganized}</strong> 篇 · 新建分类:{' '}
                <strong className="text-foreground">{result.newFoldersCreated}</strong> 个
                {lastDurationSeconds !== null && ` · 耗时: ${formatDuration(lastDurationSeconds)}`}
              </p>
            </div>

            {/* Suggestions list */}
            {result.suggestions.length > 0 && (
              <div ref={suggestionsRef} className="rounded-lg border border-border bg-card p-3 space-y-2">
                <span className="text-xs font-medium text-foreground block pb-1 border-b border-border">
                  {t('aiOrganization.suggestions')} ({result.suggestions.length})
                </span>
                <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                  {result.suggestions.map((suggestion) => (
                    <div
                      key={suggestion.path}
                      className="ai-org-suggestion-item flex items-center justify-between gap-2 rounded bg-muted/40 border border-border p-2 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Folder size={14} className="text-[#7b68ee] shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-foreground truncate">{suggestion.suggestedCategory}</div>
                          <div className="text-[10px] text-muted-foreground font-mono truncate">{suggestion.path}</div>
                        </div>
                      </div>
                      <span className="rounded bg-muted/60 border border-border px-1.5 py-0.2 text-[10px] font-mono text-muted-foreground shrink-0">
                        {Math.round(suggestion.confidence * 100)}% 置信度
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-2.5 pt-4 mt-2 border-t border-border">
        <Button
          variant="secondary"
          size="sm"
          onClick={isRunning ? handleCancel : handleClose}
          disabled={isCancelling}
          className="text-xs"
        >
          {isRunning
            ? isCancelling
              ? t('aiOrganization.cancelling')
              : t('aiOrganization.cancelRun')
            : result
              ? t('button.close')
              : t('button.cancel')}
        </Button>
        {previewReady ? (
          <Button
            variant="accent"
            size="sm"
            onClick={handleApply}
            disabled={isApplying}
            className="text-xs gap-1.5 shadow-md shadow-[#7b68ee]/25"
          >
            {isApplying && <Loader2 size={13} className="animate-spin" />}
            <span>{isApplying ? t('aiOrganization.applying') : t('aiOrganization.applyChanges')}</span>
          </Button>
        ) : (
          !result && (
            <Button
              variant="accent"
              size="sm"
              onClick={handleRun}
              disabled={isRunning || selectedCount === 0}
              className="text-xs gap-1.5 shadow-md shadow-[#7b68ee]/25"
            >
              {isRunning ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>{t('aiOrganization.running')}</span>
                </>
              ) : (
                <>
                  <Sparkles size={13} />
                  <span>{t('aiOrganization.start')}</span>
                </>
              )}
            </Button>
          )
        )}
      </div>
    </ReorModal>
  )
}

export default AIOrganizationModal
