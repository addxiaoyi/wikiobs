import React, { useState, useEffect, useRef } from 'react'
import {
  FolderArchive,
  FolderOpen,
  ArrowRightLeft,
  X,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Upload,
  Download,
} from 'lucide-react'
import gsap from 'gsap'

import ReorModal from './Modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { useTranslation } from '@/lib/i18n'
import { staggerFadeInUp, fadeInScale } from '@/lib/gsap-animations'
import { cn } from '@/lib/ui'

interface ObsidianExportOptions {
  outputDir: string
  includeBacklinks: boolean
  includeGraph: boolean
  folderNoteName: string
}

interface ObsidianCompatModalProps {
  isOpen: boolean
  onClose: () => void
  vaultDir?: string
  embedded?: boolean
}

const ObsidianCompatModal: React.FC<ObsidianCompatModalProps> = ({ isOpen, onClose, vaultDir: propVaultDir, embedded }) => {
  const { t } = useTranslation()
  const [vaultDir, setVaultDir] = useState(propVaultDir || '')
  const [mode, setMode] = useState<'export' | 'import'>('export')
  const [outputDir, setOutputDir] = useState('')
  const [sourceDir, setSourceDir] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState<{ current: number; total: number; fileName?: string } | null>(null)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  const contentRef = useRef<HTMLDivElement>(null)
  const resultRef = useRef<HTMLDivElement>(null)
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleClose = () => {
    if (isProcessing) return
    setMode('export')
    setOutputDir('')
    setSourceDir('')
    setProgress(null)
    setResult(null)
    onClose()
  }

  useEffect(() => {
    return () => {
      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current)
    }
  }, [])

  useEffect(() => {
    const loadVaultDir = async () => {
      if (propVaultDir) {
        setVaultDir(propVaultDir)
      } else {
        try {
          const dir = await window.electronStore.getVaultDirectoryForWindow()
          setVaultDir(dir)
        } catch {
          // ignore
        }
      }
    }
    loadVaultDir()
  }, [propVaultDir])

  // GSAP: Form entrance
  useEffect(() => {
    if (!isOpen || !contentRef.current) return

    const container = contentRef.current
    const ctx = gsap.context(() => {
      const formItems = container.querySelectorAll('.obsidian-form-item')
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

  const handleExport = async () => {
    if (!outputDir) {
      setResult({ success: false, message: t('obsidianCompat.selectOutputDir') })
      return
    }

    if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current)
    setIsProcessing(true)
    setResult(null)
    setProgress({ current: 0, total: 100 })

    try {
      if (window.ipcRenderer?.invoke) {
        const options: ObsidianExportOptions = {
          outputDir,
          includeBacklinks: true,
          includeGraph: false,
          folderNoteName: 'index',
        }
        const res = await window.ipcRenderer.invoke('obsidian:export', options)
        setResult({
          success: res.success,
          message: t('obsidianCompat.exportComplete', {
            count: res.exported,
            dir: res.outputDir,
            errors: res.errors.length,
          }),
        })
      } else {
        fallbackTimerRef.current = setTimeout(() => {
          setResult({
            success: true,
            message: t('obsidianCompat.exportComplete', { count: 0, dir: outputDir, errors: 0 }),
          })
          setIsProcessing(false)
        }, 1000)
      }
    } catch (error) {
      setResult({ success: false, message: `${t('obsidianCompat.exportFailed')}: ${error}` })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleImport = async () => {
    if (!sourceDir) {
      setResult({ success: false, message: t('obsidianCompat.selectSourceDir') })
      return
    }

    if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current)
    setIsProcessing(true)
    setResult(null)

    try {
      if (window.ipcRenderer?.invoke) {
        const res = await window.ipcRenderer.invoke('obsidian:import', sourceDir, vaultDir)
        const importMessage = res.success
          ? t('obsidianCompat.importComplete', {
              imported: res.imported,
              skipped: res.skipped,
              errors: res.errors.length,
            })
          : [t('obsidianCompat.importFailed'), res.errors.join(', ')].filter(Boolean).join(': ')
        setResult({ success: res.success, message: importMessage })
      } else {
        fallbackTimerRef.current = setTimeout(() => {
          fallbackTimerRef.current = null
          setResult({
            success: true,
            message: t('obsidianCompat.importComplete', { imported: 0, skipped: 0, errors: 0 }),
          })
          setIsProcessing(false)
        }, 1000)
      }
    } catch (error) {
      setResult({ success: false, message: `${t('obsidianCompat.importFailed')}: ${error}` })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleBrowse = async (type: 'output' | 'source') => {
    try {
      if (window.ipcRenderer?.invoke) {
        const paths = await window.ipcRenderer.invoke('open-directory-dialog')
        if (paths && paths.length > 0) {
          if (type === 'output') setOutputDir(paths[0])
          else setSourceDir(paths[0])
        }
      } else {
        const dir = type === 'output' ? `${vaultDir}/ObsidianExport` : sourceDir
        if (type === 'output') setOutputDir(dir)
        else setSourceDir(dir)
      }
    } catch {
      // Ignore
    }
  }

  return (
    <ReorModal isOpen={isOpen} onClose={handleClose} embedded={embedded} className="max-w-[560px] p-5">
      {/* Header */}
      <div className="flex items-start gap-3 pb-4 border-b border-border">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-[#7b68ee]/30 bg-[#7b68ee]/15 text-[#7b68ee] dark:text-[#9d8ff5] shadow-sm shadow-[#7b68ee]/20">
          <FolderArchive size={18} strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1 pr-6">
          <h2 className="text-base font-semibold text-foreground tracking-tight">{t('obsidianCompat.title')}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">在 Obsidian 格式与 WIKIOBS 知识库之间双向无损迁移</p>
        </div>
      </div>

      <div ref={contentRef} className="pt-4 space-y-3.5">
        {/* Mode Selector Tabs */}
        <div className="obsidian-form-item flex rounded-lg bg-muted/40 border border-border p-1">
          <button
            type="button"
            onClick={() => {
              setMode('export')
              setResult(null)
            }}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-all',
              mode === 'export'
                ? 'bg-[#7b68ee] text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Download size={13} />
            <span>{t('obsidianCompat.exportToObsidian')}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('import')
              setResult(null)
            }}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-all',
              mode === 'import'
                ? 'bg-[#7b68ee] text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Upload size={13} />
            <span>{t('obsidianCompat.importFromObsidian')}</span>
          </button>
        </div>

        {/* Result alert */}
        {result && (
          <div
            ref={resultRef}
            className={cn(
              'rounded-lg border p-3 text-xs flex items-start gap-2.5',
              result.success
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200'
                : 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-200',
            )}
          >
            {result.success ? (
              <CheckCircle2 size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle size={15} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 break-all">{result.message}</div>
          </div>
        )}

        {/* Processing progress */}
        {isProcessing && progress && (
          <div className="space-y-1.5 rounded-lg border border-purple-500/20 bg-purple-500/10 p-3">
            <div className="flex items-center justify-between text-xs text-purple-700 dark:text-purple-200">
              <span className="flex items-center gap-1.5 truncate">
                <Loader2 size={13} className="animate-spin text-[#7b68ee] shrink-0" />
                <span>
                  {t('obsidianCompat.processing', { current: progress.current, total: progress.total })}
                  {progress.fileName && ` · ${progress.fileName}`}
                </span>
              </span>
            </div>
            <Progress value={(progress.current / progress.total) * 100} className="h-1.5 bg-purple-950/40" />
          </div>
        )}

        {/* Directory Picker Form */}
        <div className="obsidian-form-item rounded-lg border border-border bg-card p-3 space-y-2">
          <p className="text-xs text-foreground leading-relaxed">
            {mode === 'export' ? t('obsidianCompat.exportDesc') : t('obsidianCompat.importDesc')}
          </p>
          <div className="space-y-1 pt-1">
            <label htmlFor="obsidian-dir-input" className="text-xs font-medium text-foreground block">
              {mode === 'export' ? t('obsidianCompat.outputDir') : t('obsidianCompat.sourceDir')}
            </label>
            <div className="flex items-center gap-2">
              <Input
                id="obsidian-dir-input"
                placeholder={
                  mode === 'export'
                    ? t('obsidianCompat.selectOutputPlaceholder')
                    : t('obsidianCompat.selectSourcePlaceholder')
                }
                value={mode === 'export' ? outputDir : sourceDir}
                onChange={(e) => (mode === 'export' ? setOutputDir(e.target.value) : setSourceDir(e.target.value))}
                className="h-8 bg-background border-border text-foreground text-xs font-mono"
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleBrowse(mode === 'export' ? 'output' : 'source')}
                className="h-8 px-2.5 gap-1 shrink-0 border-border"
              >
                <FolderOpen size={13} />
                <span>{t('obsidianCompat.browse')}</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-2.5 pt-4 mt-2 border-t border-border">
        <Button variant="secondary" size="sm" onClick={handleClose} disabled={isProcessing} className="text-xs">
          {t('button.close')}
        </Button>
        <Button
          variant="accent"
          size="sm"
          onClick={mode === 'export' ? handleExport : handleImport}
          disabled={isProcessing || (mode === 'export' ? !outputDir : !sourceDir)}
          className="text-xs gap-1.5 shadow-md shadow-[#7b68ee]/25"
        >
          {isProcessing ? (
            <>
              <Loader2 size={13} className="animate-spin" />
              <span>处理中...</span>
            </>
          ) : mode === 'export' ? (
            <>
              <Download size={13} />
              <span>{t('obsidianCompat.startExport')}</span>
            </>
          ) : (
            <>
              <Upload size={13} />
              <span>{t('obsidianCompat.startImport')}</span>
            </>
          )}
        </Button>
      </div>
    </ReorModal>
  )
}

export default ObsidianCompatModal
