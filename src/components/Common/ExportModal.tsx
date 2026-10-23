import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Copy,
  Check,
  Download,
  Calendar,
  Tag,
  FolderTree,
  Paperclip,
  FileText,
  Archive,
  Share2,
  FolderArchive,
  AlertCircle,
  CheckCircle2,
  Eye,
  Loader2,
  LucideIcon,
} from 'lucide-react'
import gsap from 'gsap'

import ReorModal from './Modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { useTranslation } from '@/lib/i18n'
import { staggerFadeInUp, fadeInScale } from '@/lib/gsap-animations'
import { cn } from '@/lib/ui'

interface ExportOptions {
  tags?: string[]
  dateFrom?: string
  dateTo?: string
  includeAttachments?: boolean
  includeSubfolders?: boolean
}

interface NoteMetadata {
  filePath: string
  title: string
  tags: string[]
  modified: string
  created: string
  content?: string
}

interface ExportResult {
  success: boolean
  outputPath?: string
  filesExported?: number
  error?: string
}

type ExportFormat = 'zip' | 'pdf' | 'markdown' | 'graph' | 'obsidian'

interface ExportModalProps {
  isOpen: boolean
  onClose: () => void
  embedded?: boolean
}

const FORMAT_CONFIG: Record<
  ExportFormat,
  { icon: LucideIcon; title: string; subtitle: string; description: string }
> = {
  zip: { icon: Archive, title: 'ZIP 归档', subtitle: '完整压缩包', description: '打包所有笔记、媒体附件为标准 ZIP 档案' },
  pdf: { icon: FileText, title: 'PDF 文档', subtitle: '排版渲染', description: '排版渲染并合并为标准印刷级 PDF' },
  markdown: { icon: FileText, title: 'Markdown', subtitle: '纯净文本', description: '导出纯净标准 Markdown 文档与结构' },
  graph: { icon: Share2, title: '图谱拓扑', subtitle: 'JSON 数据', description: '导出双向链接关系与图谱拓扑 JSON' },
  obsidian: { icon: FolderArchive, title: 'Obsidian', subtitle: '无缝兼容', description: '完整兼容官方 Obsidian 库配置结构' },
}

const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, embedded }) => {
  const { t } = useTranslation()
  const [format, setFormat] = useState<ExportFormat>('zip')
  const [includeSubfolders, setIncludeSubfolders] = useState(true)
  const [includeAttachments, setIncludeAttachments] = useState(false)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ExportResult | null>(null)
  const [preview, setPreview] = useState<NoteMetadata[] | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())
  const [copied, setCopied] = useState(false)

  const contentRef = useRef<HTMLDivElement>(null)
  const resultRef = useRef<HTMLDivElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)

  const handleCopyPath = async () => {
    if (result?.outputPath) {
      try {
        await navigator.clipboard.writeText(result.outputPath)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch {
        // ignore clipboard error
      }
    }
  }

  const buildOptions = useCallback(
    (): ExportOptions => ({
      includeSubfolders,
      includeAttachments,
      ...(dateFrom ? { dateFrom } : {}),
      ...(dateTo ? { dateTo } : {}),
      ...(tagFilter.trim()
        ? {
            tags: tagFilter
              .split(',')
              .map((tag) => tag.trim())
              .filter(Boolean),
          }
        : {}),
    }),
    [includeSubfolders, includeAttachments, dateFrom, dateTo, tagFilter],
  )

  const applyDatePreset = (preset: 'all' | '7d' | '30d' | 'this_month') => {
    if (preset === 'all') {
      setDateFrom('')
      setDateTo('')
      return
    }
    const today = new Date()
    const formatDate = (d: Date) => d.toISOString().split('T')[0]
    setDateTo(formatDate(today))

    if (preset === '7d') {
      const past = new Date()
      past.setDate(past.getDate() - 7)
      setDateFrom(formatDate(past))
    } else if (preset === '30d') {
      const past = new Date()
      past.setDate(past.getDate() - 30)
      setDateFrom(formatDate(past))
    } else if (preset === 'this_month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
      setDateFrom(formatDate(firstDay))
    }
  }

  const getActivePreset = () => {
    if (!dateFrom && !dateTo) return 'all'
    const today = new Date().toISOString().split('T')[0]
    if (dateTo === today) {
      const d7 = new Date()
      d7.setDate(d7.getDate() - 7)
      if (dateFrom === d7.toISOString().split('T')[0]) return '7d'
      const d30 = new Date()
      d30.setDate(d30.getDate() - 30)
      if (dateFrom === d30.toISOString().split('T')[0]) return '30d'
      const now = new Date()
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
      if (dateFrom === firstDay) return 'this_month'
    }
    return 'custom'
  }

  // GSAP: form items entrance
  useEffect(() => {
    if (!isOpen || !contentRef.current) return
    const content = contentRef.current
    const ctx = gsap.context(() => {
      const items = content.querySelectorAll('.export-form-item')
      if (items.length) {
        staggerFadeInUp(items, 0.25, 0.04, 0.05)
      }
    }, contentRef)
    return () => ctx.revert()
  }, [isOpen, format])

  // GSAP: result
  useEffect(() => {
    if (result && resultRef.current) {
      const ctx = gsap.context(() => {
        fadeInScale(resultRef.current, 0.35, 0)
      }, resultRef)
      return () => ctx.revert()
    }
  }, [result])

  // GSAP: preview
  useEffect(() => {
    if (preview && previewRef.current) {
      const previewElement = previewRef.current
      const ctx = gsap.context(() => {
        const items = previewElement.querySelectorAll('.export-preview-item')
        if (items.length) {
          staggerFadeInUp(items, 0.25, 0.02, 0.05)
        }
      }, previewRef)
      return () => ctx.revert()
    }
  }, [preview])

  // Reset on open/close
  useEffect(() => {
    if (!isOpen) {
      setResult(null)
      setError(null)
      setExporting(false)
      setPreview(null)
    }
  }, [isOpen])

  const getDateRangeError = () => {
    if (dateFrom && dateTo && dateFrom > dateTo) return t('export.invalidDateRange')
    return null
  }

  const handlePreview = async () => {
    const dateRangeError = getDateRangeError()
    if (dateRangeError) {
      setError(dateRangeError)
      return
    }

    setLoadingPreview(true)
    setError(null)
    try {
      const opts = buildOptions()
      const res = await window.exportModule.exportPreview(opts)
      if (res.success && res.files) {
        setPreview(res.files)
        setSelectedFiles(new Set(res.files.map((f) => f.filePath)))
        if (res.files.length === 0) setError(t('export.noFilesMatch'))
      } else {
        setError(res.error || t('export.exportFailed'))
      }
    } catch (err) {
      setError(`${t('error.generic')}: ${err}`)
    } finally {
      setLoadingPreview(false)
    }
  }

  const handleExport = async () => {
    const dateRangeError = getDateRangeError()
    if (dateRangeError) {
      setError(dateRangeError)
      return
    }

    setExporting(true)
    setError(null)
    setResult(null)
    try {
      const opts = buildOptions()
      let res: ExportResult

      const selectedPaths = preview ? Array.from(selectedFiles) : null

      switch (format) {
        case 'zip':
          res = selectedPaths
            ? await window.exportModule.exportNotes(selectedPaths, opts)
            : await window.exportModule.exportVault(opts)
          break
        case 'pdf':
          res = selectedPaths
            ? await window.exportModule.exportNotes(selectedPaths, opts)
            : await window.exportModule.exportPdf(opts)
          break
        case 'markdown':
          res = await window.exportModule.exportSingleMarkdown()
          break
        case 'graph':
          res = await window.exportModule.exportGraphJson()
          break
        case 'obsidian':
          res = await window.exportModule.exportVault(opts)
          break
        default:
          res = { success: false, error: 'Unknown format' }
      }

      setResult(res)
    } catch (err) {
      setError(`${t('error.generic')}: ${err}`)
    } finally {
      setExporting(false)
    }
  }

  const handleClose = () => {
    if (!exporting) onClose()
  }

  const handleSelectAll = (checked: boolean) => {
    if (!preview) return
    if (checked) {
      setSelectedFiles(new Set(preview.map((f) => f.filePath)))
    } else {
      setSelectedFiles(new Set())
    }
  }

  const handleToggleFile = (filePath: string) => {
    setSelectedFiles((prev) => {
      const next = new Set(prev)
      if (next.has(filePath)) {
        next.delete(filePath)
      } else {
        next.add(filePath)
      }
      return next
    })
  }

  const activePreset = getActivePreset()

  return (
    <ReorModal isOpen={isOpen} onClose={handleClose} embedded={embedded} className="max-w-[620px] p-5">
      {/* Modal Header */}
      <div className="flex items-start gap-3 pb-4 border-b border-border">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-[#7b68ee]/30 bg-[#7b68ee]/15 text-[#7b68ee] dark:text-[#9d8ff5] shadow-sm shadow-[#7b68ee]/20">
          <Download size={18} strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1 pr-6">
          <h2 className="text-base font-semibold text-foreground tracking-tight">{t('export.title')}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">打包笔记、图谱或知识库，快速导出与迁移</p>
        </div>
      </div>

      <div ref={contentRef} className="flex flex-col gap-3.5 pt-4">
        {/* Error Alert */}
        {error && (
          <div className="flex items-start gap-2.5 rounded-lg border border-red-500/25 bg-red-500/10 p-3 text-xs text-red-600 dark:text-red-200">
            <AlertCircle size={15} className="mt-0.5 shrink-0 text-red-500" />
            <div className="flex-1">{error}</div>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-red-500 hover:text-red-400"
            >
              ×
            </button>
          </div>
        )}

        {/* Format Selector Tiles Grid */}
        <div className="export-form-item space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-foreground px-0.5">
            <span>{t('export.format')}</span>
            <span className="text-[11px] text-muted-foreground font-normal">
              {FORMAT_CONFIG[format].description}
            </span>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {(Object.keys(FORMAT_CONFIG) as ExportFormat[]).map((fmt) => {
              const cfg = FORMAT_CONFIG[fmt]
              const FmtIcon = cfg.icon
              const isSelected = format === fmt
              return (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => {
                    setFormat(fmt)
                    setResult(null)
                    setPreview(null)
                  }}
                  disabled={exporting}
                  className={cn(
                    'group relative flex flex-col items-center justify-center rounded-xl p-2.5 text-center transition-all cursor-pointer border',
                    isSelected
                      ? 'border-[#7b68ee] bg-[#7b68ee]/15 text-[#7b68ee] dark:text-[#a29bfe] ring-1 ring-[#7b68ee]/40 shadow-sm shadow-[#7b68ee]/20'
                      : 'border-border bg-card text-muted-foreground hover:border-border/80 hover:bg-accent/50 hover:text-foreground',
                  )}
                >
                  <div
                    className={cn(
                      'flex size-8 items-center justify-center rounded-lg transition-colors mb-1.5',
                      isSelected
                        ? 'bg-[#7b68ee] text-white'
                        : 'bg-muted text-muted-foreground group-hover:text-foreground',
                    )}
                  >
                    <FmtIcon size={16} strokeWidth={2} />
                  </div>
                  <span className="text-xs font-semibold leading-tight">{cfg.title}</span>
                  <span className="text-[10px] text-muted-foreground mt-0.5">{cfg.subtitle}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Options Toggles Card */}
        <div className="export-form-item rounded-xl border border-border bg-card p-3.5 space-y-3">
          {/* Subfolders toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex size-7 items-center justify-center rounded-md bg-muted border border-border text-muted-foreground">
                <FolderTree size={14} />
              </div>
              <div>
                <span className="text-xs font-medium text-foreground">{t('export.includeSubfolders')}</span>
                <p className="text-[11px] text-muted-foreground">保留完整目录树并递归导出子文件夹</p>
              </div>
            </div>
            <Switch
              checked={includeSubfolders}
              aria-label={t('export.includeSubfolders')}
              onCheckedChange={setIncludeSubfolders}
              disabled={exporting}
            />
          </div>

          <div className="h-px w-full bg-border" />

          {/* Attachments toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex size-7 items-center justify-center rounded-md bg-muted border border-border text-muted-foreground">
                <Paperclip size={14} />
              </div>
              <div>
                <span className="text-xs font-medium text-foreground">{t('export.includeAttachments')}</span>
                <p className="text-[11px] text-muted-foreground">同步导出图片、音视频及嵌入媒体资源</p>
              </div>
            </div>
            <Switch
              checked={includeAttachments}
              aria-label={t('export.includeAttachments')}
              onCheckedChange={setIncludeAttachments}
              disabled={exporting}
            />
          </div>
        </div>

        {/* Filters Card */}
        <div className="export-form-item rounded-xl border border-border bg-card p-3.5 space-y-3">
          {/* Date Range Inputs */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="flex size-6 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <Calendar size={13} />
                </div>
                <span className="text-xs font-medium text-foreground">按时间范围筛选</span>
              </div>
              <div className="flex items-center gap-1">
                {[
                  { id: 'all', label: '全部' },
                  { id: '7d', label: '近7天' },
                  { id: '30d', label: '近30天' },
                  { id: 'this_month', label: '本月' },
                ].map((item) => {
                  const isActive = activePreset === item.id
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => applyDatePreset(item.id as any)}
                      className={cn(
                        'px-2 py-0.5 rounded text-[11px] transition-colors',
                        isActive
                          ? 'bg-[#7b68ee]/20 text-[#7b68ee] dark:text-[#9d8ff5] font-medium border border-[#7b68ee]/30'
                          : 'bg-muted/40 text-muted-foreground hover:text-foreground border border-transparent',
                      )}
                    >
                      {item.label}
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label htmlFor="export-date-from" className="text-[11px] text-muted-foreground block">
                  {t('export.dateFrom')}
                </label>
                <Input
                  id="export-date-from"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  disabled={exporting}
                  className="h-8 bg-background border-border text-xs text-foreground"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="export-date-to" className="text-[11px] text-muted-foreground block">
                  {t('export.dateTo')}
                </label>
                <Input
                  id="export-date-to"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  disabled={exporting}
                  className="h-8 bg-background border-border text-xs text-foreground"
                />
              </div>
            </div>
          </div>

          <div className="h-px w-full bg-border" />

          {/* Tag Filter Input */}
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <div className="flex size-6 items-center justify-center rounded-md bg-muted text-muted-foreground">
                <Tag size={13} />
              </div>
              <span className="text-xs font-medium text-foreground">{t('export.tagFilter')}</span>
            </div>
            <Input
              id="export-tag-filter"
              placeholder="多个标签请用逗号分隔，如：work, obsidian"
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              disabled={exporting}
              className="h-8 bg-background border-border text-xs placeholder:text-muted-foreground text-foreground"
            />
          </div>

          {/* Preview Trigger Button */}
          <div className="flex justify-end pt-1">
            <Button
              variant="secondary"
              size="sm"
              onClick={handlePreview}
              disabled={exporting || loadingPreview}
              className="h-7 text-xs border-border bg-muted hover:bg-muted/80 gap-1.5"
            >
              {loadingPreview ? (
                <>
                  <Loader2 size={12} className="animate-spin" />
                  <span>{t('scheduled.loading')}</span>
                </>
              ) : (
                <>
                  <Eye size={12} />
                  <span>{t('export.preview')}</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Preview List */}
        {preview && (
          <div ref={previewRef} className="rounded-xl border border-border bg-card p-3 space-y-2">
            <div className="flex items-center justify-between text-xs pb-1.5 border-b border-border">
              <span className="font-medium text-foreground">
                {t('export.files')} ({preview.length})
              </span>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="export-select-all"
                  checked={selectedFiles.size === preview.length && preview.length > 0}
                  onCheckedChange={handleSelectAll}
                  label={t('export.selectAll')}
                />
              </div>
            </div>

            {preview.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">{t('export.noFilesMatch')}</p>
            ) : (
              <div className="max-h-40 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                {preview.map((note) => {
                  const isChecked = selectedFiles.has(note.filePath)
                  return (
                    <div
                      key={note.filePath}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleToggleFile(note.filePath)}
                      onKeyDown={(e) => {
                        if (e.key === ' ' || e.key === 'Enter') handleToggleFile(note.filePath)
                      }}
                      className={cn(
                        'export-preview-item flex items-center gap-2.5 rounded-md px-2 py-1.5 text-xs transition-colors cursor-pointer select-none',
                        isChecked ? 'bg-[#7b68ee]/15 text-[#7b68ee] dark:text-[#a29bfe] font-medium' : 'text-foreground hover:bg-accent',
                      )}
                    >
                      <Checkbox
                        id={`export-note-${note.filePath.replace(/[^a-zA-Z0-9_-]/g, '-')}`}
                        checked={isChecked}
                        onCheckedChange={() => handleToggleFile(note.filePath)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate text-foreground">{note.title}</div>
                        <div className="text-[10px] text-muted-foreground font-mono truncate">{note.filePath}</div>
                      </div>
                      {note.tags && note.tags.length > 0 && (
                        <div className="flex items-center gap-1 shrink-0">
                          {note.tags.slice(0, 2).map((tag) => (
                            <span
                              key={tag}
                              className="rounded bg-muted/60 border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Exporting Progress */}
        {exporting && (
          <div className="space-y-1.5 rounded-xl border border-purple-500/20 bg-purple-500/10 p-3">
            <div className="flex items-center justify-between text-xs text-purple-200">
              <span className="flex items-center gap-1.5">
                <Loader2 size={13} className="animate-spin text-[#7b68ee]" />
                {t('export.exporting')}
              </span>
            </div>
            <Progress value={undefined} className="h-1.5 bg-purple-950/40" />
          </div>
        )}

        {/* Result Feedback Banner */}
        {result && (
          <div
            ref={resultRef}
            className={cn(
              'rounded-xl border p-3.5 space-y-2 text-xs',
              result.success
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200'
                : 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-200',
            )}
          >
            <div className="flex items-center gap-2 font-medium">
              {result.success ? (
                <>
                  <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
                  <span>{t('export.exportSuccess')}</span>
                </>
              ) : (
                <>
                  <AlertCircle size={16} className="text-red-600 dark:text-red-400" />
                  <span>{t('export.exportFailed')}</span>
                </>
              )}
            </div>

            {result.outputPath && (
              <div className="flex items-center justify-between gap-2 rounded bg-muted/30 border border-border px-2.5 py-1.5 font-mono text-[11px] text-foreground">
                <span className="truncate">{result.outputPath}</span>
                <button
                  type="button"
                  onClick={handleCopyPath}
                  className="flex items-center gap-1 shrink-0 rounded px-1.5 py-0.5 text-muted-foreground hover:text-foreground transition-colors"
                  title={t('vault.copyPath')}
                >
                  {copied ? (
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                      <Check size={12} /> 已复制
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <Copy size={12} /> 复制路径
                    </span>
                  )}
                </button>
              </div>
            )}

            {result.filesExported !== undefined && (
              <p className="text-[11px] text-emerald-700 dark:text-emerald-300/80">
                {t('export.filesExported')}: {result.filesExported} 篇
              </p>
            )}

            {result.error && <p className="text-[11px] text-red-600 dark:text-red-300">{result.error}</p>}
          </div>
        )}
      </div>

      {/* Modal Footer Actions */}
      <div className="flex items-center justify-end gap-2.5 pt-4 mt-2 border-t border-border">
        <Button
          variant="secondary"
          size="sm"
          onClick={handleClose}
          disabled={exporting}
          className="text-xs"
        >
          {result ? t('button.close') : t('button.cancel')}
        </Button>
        {!result && (
          <Button
            variant="accent"
            size="sm"
            onClick={handleExport}
            disabled={exporting || (preview !== null && selectedFiles.size === 0)}
            className="text-xs shadow-md shadow-[#7b68ee]/25 gap-1.5"
          >
            {exporting ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                <span>{t('export.exporting')}</span>
              </>
            ) : (
              <>
                <Download size={13} />
                <span>{t('export.startExport')}</span>
              </>
            )}
          </Button>
        )}
      </div>
    </ReorModal>
  )
}

export default ExportModal
