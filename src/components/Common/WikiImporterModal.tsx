import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Globe,
  FolderOpen,
  X,
  AlertCircle,
  CheckCircle2,
  FileText,
  RotateCcw,
  Loader2,
  ArrowRight,
  ExternalLink,
} from 'lucide-react'
import gsap from 'gsap'

import ReorModal from './Modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useTranslation } from '@/lib/i18n'
import { staggerFadeInUp, fadeInScale } from '@/lib/gsap-animations'
import { useContentContext } from '@/contexts/ContentContext'
import { cn } from '@/lib/ui'
import { nanoid } from 'nanoid'

interface WikiImportOptions {
  sourceType: 'url' | 'sitemap' | 'mediawiki-api' | 'xml-dump' | 'crawl4ai'
  source: string
  importId?: string
}

interface WikiImportResult {
  success: boolean
  imported: number
  skipped: number
  errors: string[]
  files: string[]
  filesToIndex: string[]
  cancelled?: boolean
}

interface WikiImportProgress {
  current: number
  total: number
  currentUrl: string
}

interface WikiImporterModalProps {
  isOpen: boolean
  onClose: () => void
  embedded?: boolean
}

const WikiImporterModal: React.FC<WikiImporterModalProps> = ({ isOpen, onClose, embedded }) => {
  const { t } = useTranslation()
  const { openContent } = useContentContext()
  const [sourceType, setSourceType] = useState<'url' | 'sitemap' | 'mediawiki-api' | 'xml-dump' | 'crawl4ai'>('url')
  const [source, setSource] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const [progress, setProgress] = useState<WikiImportProgress | null>(null)
  const [result, setResult] = useState<WikiImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const lastOptionsRef = useRef<WikiImportOptions | null>(null)
  const activeImportIdRef = useRef<string | null>(null)
  const isCancellingRef = useRef(false)

  const contentRef = useRef<HTMLDivElement>(null)
  const resultRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)

  const finishImport = useCallback((importResult: WikiImportResult) => {
    if (importResult.cancelled) {
      setIsImporting(false)
      setIsCancelling(false)
      setProgress(null)
      setResult(null)
      setError(t('wikiImporter.cancelled'))
      return
    }
    setIsImporting(false)
    setResult(importResult)
    setProgress(null)
  }, [t])

  const sourceTypes = [
    {
      value: 'url' as const,
      label: t('wikiImporter.singleUrl'),
      description: t('wikiImporter.singleUrlDesc'),
    },
    {
      value: 'crawl4ai' as const,
      label: t('wikiImporter.crawl4ai'),
      description: t('wikiImporter.crawl4aiDesc'),
    },
    {
      value: 'sitemap' as const,
      label: t('wikiImporter.sitemap'),
      description: t('wikiImporter.sitemapDesc'),
    },
    {
      value: 'mediawiki-api' as const,
      label: t('wikiImporter.mediawiki'),
      description: t('wikiImporter.mediawikiDesc'),
    },
    {
      value: 'xml-dump' as const,
      label: t('wikiImporter.xmlDump'),
      description: t('wikiImporter.xmlDumpDesc'),
    },
  ]

  useEffect(() => {
    if (!isOpen) return

    const unsubProgress = window.wikiImporter.onProgress(setProgress)
    const unsubComplete = window.wikiImporter.onComplete(finishImport)

    return () => {
      unsubProgress()
      unsubComplete()
    }
  }, [isOpen, finishImport])

  // GSAP: Form entrance
  useEffect(() => {
    if (!isOpen || !contentRef.current) return

    const container = contentRef.current
    const ctx = gsap.context(() => {
      const formItems = container.querySelectorAll('.wiki-form-item')
      if (formItems.length) {
        staggerFadeInUp(formItems, 0.25, 0.05, 0.05)
      }
    }, container)

    return () => ctx.revert()
  }, [isOpen])

  // GSAP: Result
  useEffect(() => {
    if (result && resultRef.current) {
      const ctx = gsap.context(() => {
        fadeInScale(resultRef.current, 0.35, 0)
      })
      return () => ctx.revert()
    }
  }, [result])

  const handleBrowseXml = async () => {
    try {
      const files = await window.fileSystem.openFileDialog(['xml'])
      const selectedFile = files?.[0]
      if (selectedFile) setSource(selectedFile)
    } catch (err) {
      setError(`${t('error.generic')}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const handleImport = async () => {
    if (!source.trim()) {
      setError(t('wikiImporter.errorEmptySource'))
      return
    }

    setError(null)
    setResult(null)
    setIsImporting(true)
    setProgress({ current: 0, total: 0, currentUrl: t('wikiImporter.starting') })

    try {
      let normalizedSource = source.trim()
      if (sourceType !== 'xml-dump' && !/^https?:\/\//i.test(normalizedSource)) {
        normalizedSource = `https://${normalizedSource}`
      }
      const importId = nanoid()
      activeImportIdRef.current = importId
      isCancellingRef.current = false
      setIsCancelling(false)
      const options: WikiImportOptions = { sourceType, source: normalizedSource, importId }
      lastOptionsRef.current = options
      const importResult = await window.wikiImporter.import(options)
      if (isCancellingRef.current || importResult.cancelled) {
        setError(t('wikiImporter.cancelled'))
        setIsImporting(false)
        setIsCancelling(false)
        setProgress(null)
        return
      }
      finishImport(importResult)
    } catch (err) {
      setError(`${t('wikiImporter.failed')}: ${err}`)
      setIsImporting(false)
    } finally {
      activeImportIdRef.current = null
      isCancellingRef.current = false
      setIsCancelling(false)
    }
  }

  const handleRetry = () => {
    if (!lastOptionsRef.current) return
    setSourceType(lastOptionsRef.current.sourceType)
    setSource(lastOptionsRef.current.source)
    handleImport().catch(() => undefined)
  }

  const handleClose = () => {
    if (!isImporting) {
      setSource('')
      setResult(null)
      setError(null)
      setProgress(null)
      onClose()
    }
  }

  const handleCancelImport = async () => {
    const importId = activeImportIdRef.current
    if (!importId || isCancellingRef.current) return
    isCancellingRef.current = true
    setIsCancelling(true)
    try {
      const result = await window.wikiImporter.cancel(importId)
      if (!result.cancelled) {
        isCancellingRef.current = false
        setIsCancelling(false)
        setError(t('wikiImporter.cancelFailed'))
      }
    } catch (err) {
      isCancellingRef.current = false
      setIsCancelling(false)
      setError(`${t('wikiImporter.cancelFailed')}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const openImportedFile = (filePath: string) => {
    openContent(filePath)
    handleClose()
  }

  const progressPercent = progress && progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0
  let footerActionLabel = t('button.cancel')
  if (result) footerActionLabel = t('button.close')
  if (isImporting) footerActionLabel = t(isCancelling ? 'wikiImporter.cancelling' : 'wikiImporter.cancelImport')

  const getPlaceholder = () => {
    switch (sourceType) {
      case 'url':
        return 'https://en.wikipedia.org/wiki/Example'
      case 'sitemap':
        return 'https://example.com/sitemap.xml'
      case 'mediawiki-api':
        return 'https://en.wikipedia.org/w/api.php'
      case 'xml-dump':
        return '/path/to/wiki-export.xml'
      default:
        return 'https://example.com'
    }
  }

  const getHelpText = () => {
    switch (sourceType) {
      case 'url':
        return t('wikiImporter.helpUrl')
      case 'sitemap':
        return t('wikiImporter.helpSitemap')
      case 'mediawiki-api':
        return t('wikiImporter.helpMediawiki')
      case 'xml-dump':
        return t('wikiImporter.helpXmlDump')
      default:
        return ''
    }
  }

  return (
    <ReorModal isOpen={isOpen} onClose={handleClose} embedded={embedded} className="max-w-[560px] p-5">
      {/* Header */}
      <div className="flex items-start gap-3 pb-4 border-b border-border">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-[#7b68ee]/30 bg-[#7b68ee]/15 text-[#7b68ee] dark:text-[#9d8ff5] shadow-sm shadow-[#7b68ee]/20">
          <Globe size={18} strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1 pr-6">
          <h2 className="text-base font-semibold text-foreground tracking-tight">{t('wikiImporter.title')}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">导入外部维基、站点或备份，自动解析为本地笔记</p>
        </div>
      </div>

      <div ref={contentRef} className="flex flex-col gap-3.5 pt-4">
        {/* Error Alert */}
        {error && (
          <div className="flex items-start gap-2.5 rounded-lg border border-red-500/25 bg-red-500/10 p-3 text-xs text-red-600 dark:text-red-200">
            <AlertCircle size={15} className="mt-0.5 shrink-0 text-red-500" />
            <div className="flex-1 break-all">{error}</div>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-red-500 hover:text-red-400"
            >
              ×
            </button>
          </div>
        )}

        {/* Source Type Selector */}
        <div className="wiki-form-item flex flex-col gap-1.5 rounded-lg border border-border bg-card p-3">
          <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <span className="text-xs font-medium text-foreground">{t('wikiImporter.sourceType')}</span>
              <p className="text-[11px] text-muted-foreground mt-0.5">选择导入源的数据格式或爬取协议</p>
            </div>
            <div className="w-full sm:w-52 sm:shrink-0">
              <Select
                value={sourceType}
                onValueChange={(val) => setSourceType(val as typeof sourceType)}
                disabled={isImporting}
              >
                <SelectTrigger className="h-8 bg-background border-border text-foreground text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-border bg-popover text-popover-foreground">
                  {sourceTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value} className="text-xs">
                      <div>
                        <div className="font-medium">{type.label}</div>
                        <div className="text-[10px] text-muted-foreground font-normal">{type.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Source Input */}
        <div className="wiki-form-item rounded-lg border border-border bg-card p-3 space-y-2">
          <label htmlFor="wiki-import-source" className="text-xs font-medium text-foreground block">
            {sourceType === 'xml-dump' ? t('wikiImporter.xmlFilePath') : t('wikiImporter.url')}
          </label>
          <div className="flex items-center gap-2">
            <Input
              id="wiki-import-source"
              placeholder={getPlaceholder()}
              value={source}
              onChange={(e) => setSource(e.target.value)}
              disabled={isImporting}
              className="h-8 bg-background border-border text-foreground text-xs placeholder:text-muted-foreground font-mono"
            />
            {sourceType === 'xml-dump' && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleBrowseXml}
                disabled={isImporting}
                className="h-8 px-2.5 shrink-0 gap-1.5 border-border"
                title={t('wikiImporter.browseXml')}
              >
                <FolderOpen size={14} />
                <span className="text-xs">{t('obsidianCompat.browse')}</span>
              </Button>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">{getHelpText()}</p>
        </div>

        {/* Progress */}
        {isImporting && progress && (
          <div ref={progressRef} className="space-y-1.5 rounded-lg border border-purple-500/20 bg-purple-500/10 p-3">
            <div className="flex items-center justify-between text-xs text-purple-200">
              <span className="flex items-center gap-1.5 truncate max-w-[70%]">
                <Loader2 size={13} className="animate-spin text-[#7b68ee] shrink-0" />
                <span className="truncate">{progress.currentUrl}</span>
              </span>
              <span className="font-mono text-[11px]">
                {progress.current} / {progress.total}
              </span>
            </div>
            <Progress value={progressPercent} className="h-1.5 bg-purple-950/40" />
          </div>
        )}

        {/* Result Feedback Banner */}
        {result && (
          <div
            ref={resultRef}
            className={cn(
              'rounded-lg border p-3.5 space-y-2.5 text-xs',
              result.success
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200'
                : 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-200',
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-medium">
                {result.success ? (
                  <>
                    <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
                    <span>{t('wikiImporter.complete')}</span>
                  </>
                ) : (
                  <>
                    <AlertCircle size={16} className="text-red-600 dark:text-red-400" />
                    <span>{t('wikiImporter.failed')}</span>
                  </>
                )}
              </div>
              {!result.success && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleRetry}
                  className="h-6 px-2 text-[11px] gap-1 text-red-600 dark:text-red-200 border-red-500/30 hover:bg-red-500/20"
                >
                  <RotateCcw size={11} />
                  <span>{t('button.retry')}</span>
                </Button>
              )}
            </div>

            <div className="text-[11px] text-foreground">
              {t('wikiImporter.imported')}: <strong className="text-foreground">{result.imported}</strong> 篇 ·{' '}
              {t('wikiImporter.skipped')}: <strong className="text-foreground">{result.skipped}</strong> 篇
              {result.errors.length > 0 && (
                <span className="text-red-400 ml-2">
                  ({t('wikiImporter.errors')}: {result.errors.length})
                </span>
              )}
            </div>

            {result.success && result.files.length > 0 && (
              <div className="pt-2 border-t border-border space-y-1">
                <span className="text-[11px] font-medium text-muted-foreground block mb-1">
                  {t('wikiImporter.importedFiles')}
                </span>
                <div className="max-h-36 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                  {result.files.slice(0, 10).map((filePath) => {
                    const baseName = filePath.split(/[/\\]/).pop() || filePath
                    return (
                      <button
                        key={filePath}
                        type="button"
                        onClick={() => openImportedFile(filePath)}
                        className="flex w-full items-center justify-between rounded-md bg-muted/40 hover:bg-muted px-2.5 py-1.5 text-left text-xs transition-colors group"
                      >
                        <span className="flex items-center gap-1.5 truncate text-foreground">
                          <FileText size={13} className="text-[#7b68ee] shrink-0" />
                          <span className="truncate">{baseName}</span>
                        </span>
                        <span className="text-[11px] text-[#7b68ee] dark:text-[#9d8ff5] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0 ml-2">
                          <span>{t('wikiImporter.openFile')}</span>
                          <ArrowRight size={11} />
                        </span>
                      </button>
                    )
                  })}
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
          onClick={isImporting ? handleCancelImport : handleClose}
          disabled={isCancelling}
          className="text-xs"
        >
          {footerActionLabel}
        </Button>
        {!result && (
          <Button
            variant="accent"
            size="sm"
            onClick={handleImport}
            disabled={isImporting || !source.trim()}
            className="text-xs shadow-md shadow-[#7b68ee]/25 gap-1.5"
          >
            {isImporting ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                <span>{t('wikiImporter.importing')}</span>
              </>
            ) : (
              <>
                <Globe size={13} />
                <span>{t('wikiImporter.startImport')}</span>
              </>
            )}
          </Button>
        )}
      </div>
    </ReorModal>
  )
}

export default WikiImporterModal
