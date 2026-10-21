/* eslint-disable no-console -- Import diagnostics are shown in the development console. */

import React, { useState, useEffect, useRef } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import TextField from '@mui/material/TextField'
import LinearProgress from '@mui/material/LinearProgress'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Alert from '@mui/material/Alert'
import gsap from 'gsap'
import { X } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'
import { staggerFadeInUp, fadeInScale } from '@/lib/gsap-animations'

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
}

const ObsidianCompatModal: React.FC<ObsidianCompatModalProps> = ({ isOpen, onClose, vaultDir: propVaultDir }) => {
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
        } catch (err) {
          console.error('Failed to load vault directory:', err)
        }
      }
    }
    loadVaultDir()
  }, [propVaultDir])

  // GSAP: 表单元素错位入场
  useEffect(() => {
    if (!isOpen || !contentRef.current) return

    const container = contentRef.current
    const ctx = gsap.context(() => {
      const formItems = container.querySelectorAll('.obsidian-form-item')
      if (formItems.length) {
        staggerFadeInUp(formItems, 0.35, 0.08, 0.1)
      }
    }, container)

    return () => ctx.revert()
  }, [isOpen])

  // GSAP: 结果弹入
  useEffect(() => {
    if (result && resultRef.current) {
      const ctx = gsap.context(() => {
        fadeInScale(resultRef.current, 0.4, 0)
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
    <Dialog open={isOpen} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1 }}>
        {t('obsidianCompat.title')}
        <IconButton onClick={handleClose} aria-label={t('button.close')} title={t('button.close')} size="small">
          <X size={16} />
        </IconButton>
      </DialogTitle>
      <DialogContent ref={contentRef}>
        <Box className="obsidian-form-item" sx={{ display: 'flex', gap: 1, mb: 3 }}>
          <Button variant={mode === 'export' ? 'contained' : 'outlined'} onClick={() => setMode('export')}>
            {t('obsidianCompat.exportToObsidian')}
          </Button>
          <Button variant={mode === 'import' ? 'contained' : 'outlined'} onClick={() => setMode('import')}>
            {t('obsidianCompat.importFromObsidian')}
          </Button>
        </Box>

        {result && (
          <Box ref={resultRef}>
            <Alert severity={result.success ? 'success' : 'error'} sx={{ mb: 2 }}>
              {result.message}
            </Alert>
          </Box>
        )}

        {isProcessing && progress && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              {t('obsidianCompat.processing', { current: progress.current, total: progress.total })}
              {progress.fileName && ` - ${progress.fileName}`}
            </Typography>
            <LinearProgress variant="determinate" value={(progress.current / progress.total) * 100} />
          </Box>
        )}

        {mode === 'export' ? (
          <Box className="obsidian-form-item">
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {t('obsidianCompat.exportDesc')}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexDirection: { xs: 'column', sm: 'row' } }}>
              <TextField
                fullWidth
                label={t('obsidianCompat.outputDir')}
                value={outputDir}
                onChange={(e) => setOutputDir(e.target.value)}
                placeholder={t('obsidianCompat.selectOutputPlaceholder')}
                inputProps={{ 'aria-label': t('obsidianCompat.outputDir') }}
              />
              <Button
                variant="outlined"
                onClick={() => handleBrowse('output')}
                sx={{ alignSelf: { xs: 'flex-end', sm: 'auto' } }}
              >
                {t('obsidianCompat.browse')}
              </Button>
            </Box>
          </Box>
        ) : (
          <Box className="obsidian-form-item">
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {t('obsidianCompat.importDesc')}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexDirection: { xs: 'column', sm: 'row' } }}>
              <TextField
                fullWidth
                label={t('obsidianCompat.sourceDir')}
                value={sourceDir}
                onChange={(e) => setSourceDir(e.target.value)}
                placeholder={t('obsidianCompat.selectSourcePlaceholder')}
                inputProps={{ 'aria-label': t('obsidianCompat.sourceDir') }}
              />
              <Button
                variant="outlined"
                onClick={() => handleBrowse('source')}
                sx={{ alignSelf: { xs: 'flex-end', sm: 'auto' } }}
              >
                {t('obsidianCompat.browse')}
              </Button>
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>{t('button.close')}</Button>
        <Button variant="contained" onClick={mode === 'export' ? handleExport : handleImport} disabled={isProcessing}>
          {mode === 'export' ? t('obsidianCompat.startExport') : t('obsidianCompat.startImport')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default ObsidianCompatModal
