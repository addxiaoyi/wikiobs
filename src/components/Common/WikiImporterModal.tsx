import React, { useState, useEffect, useRef } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import TextField from '@mui/material/TextField'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import LinearProgress from '@mui/material/LinearProgress'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Alert from '@mui/material/Alert'
import gsap from 'gsap'
import { FolderOpen, X } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'
import { staggerFadeInUp, fadeInScale, Easing } from '@/lib/gsap-animations'
import { useContentContext } from '@/contexts/ContentContext'

interface WikiImportOptions {
  sourceType: 'url' | 'sitemap' | 'mediawiki-api' | 'xml-dump' | 'crawl4ai'
  source: string
}

interface WikiImportResult {
  success: boolean
  imported: number
  skipped: number
  errors: string[]
  files: string[]
}

interface WikiImportProgress {
  current: number
  total: number
  currentUrl: string
}

interface WikiImporterModalProps {
  isOpen: boolean
  onClose: () => void
}

const WikiImporterModal: React.FC<WikiImporterModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation()
  const { openContent } = useContentContext()
  const [sourceType, setSourceType] = useState<'url' | 'sitemap' | 'mediawiki-api' | 'xml-dump' | 'crawl4ai'>('url')
  const [source, setSource] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const [progress, setProgress] = useState<WikiImportProgress | null>(null)
  const [result, setResult] = useState<WikiImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const lastOptionsRef = useRef<WikiImportOptions | null>(null)

  const contentRef = useRef<HTMLDivElement>(null)
  const resultRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)

  const finishImport = (importResult: WikiImportResult) => {
    setIsImporting(false)
    setResult(importResult)
    setProgress(null)
  }

  const sourceTypes = [
    {
      value: 'url',
      label: t('wikiImporter.singleUrl'),
      description: t('wikiImporter.singleUrlDesc'),
    },
    {
      value: 'crawl4ai',
      label: t('wikiImporter.crawl4ai'),
      description: t('wikiImporter.crawl4aiDesc'),
    },
    {
      value: 'sitemap',
      label: t('wikiImporter.sitemap'),
      description: t('wikiImporter.sitemapDesc'),
    },
    {
      value: 'mediawiki-api',
      label: t('wikiImporter.mediawiki'),
      description: t('wikiImporter.mediawikiDesc'),
    },
    {
      value: 'xml-dump',
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
  }, [isOpen])

  // GSAP: 表单元素入场错位动画
  useEffect(() => {
    if (!isOpen || !contentRef.current) return

    const container = contentRef.current
    const ctx = gsap.context(() => {
      const formItems = container.querySelectorAll('.wiki-form-item')
      if (formItems.length) {
        staggerFadeInUp(formItems, 0.35, 0.08, 0.1)
      }
    }, container)

    return () => ctx.revert()
  }, [isOpen])

  // GSAP: 进度条出现动画
  useEffect(() => {
    if (progress && progressRef.current) {
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
  }, [progress])

  // GSAP: 结果提示弹入
  useEffect(() => {
    if (result && resultRef.current) {
      const ctx = gsap.context(() => {
        fadeInScale(resultRef.current, 0.4, 0)
      })
      return () => ctx.revert()
    }
  }, [result])

  // GSAP: 错误提示弹入
  useEffect(() => {
    if (error && contentRef.current) {
      const errorEl = contentRef.current.querySelector('.wiki-error-alert') as HTMLElement
      if (errorEl) {
        const ctx = gsap.context(() => {
          gsap.fromTo(errorEl, { autoAlpha: 0, x: -10 }, { autoAlpha: 1, x: 0, duration: 0.3, ease: Easing.smooth })
        })
        return () => ctx.revert()
      }
    }
  }, [error])

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
      const options: WikiImportOptions = { sourceType, source: normalizedSource }
      lastOptionsRef.current = options
      const importResult = await window.wikiImporter.import(options)
      finishImport(importResult)
    } catch (err) {
      setError(`${t('wikiImporter.failed')}: ${err}`)
      setIsImporting(false)
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

  const openImportedFile = (filePath: string) => {
    openContent(filePath)
    handleClose()
  }

  const progressPercent = progress && progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0

  const getPlaceholder = () => {
    switch (sourceType) {
      case 'url':
        return 'https://en.wikipedia.org/wiki/Example'
      case 'sitemap':
        return 'https://example.com'
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
    <Dialog open={isOpen} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1 }}>
        {t('wikiImporter.title')}
        <IconButton onClick={handleClose} aria-label={t('button.close')} title={t('button.close')} size="small">
          <X size={16} />
        </IconButton>
      </DialogTitle>
      <DialogContent ref={contentRef}>
        {/* Source Type Selector */}
        <FormControl fullWidth margin="normal" className="wiki-form-item">
          <InputLabel>{t('wikiImporter.sourceType')}</InputLabel>
          <Select
            value={sourceType}
            label={t('wikiImporter.sourceType')}
            inputProps={{ 'aria-label': t('wikiImporter.sourceType') }}
            onChange={(e) => setSourceType(e.target.value as typeof sourceType)}
            disabled={isImporting}
          >
            {sourceTypes.map((type) => (
              <MenuItem key={type.value} value={type.value}>
                <Box>
                  <Typography variant="body1">{type.label}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {type.description}
                  </Typography>
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Source Input */}
        <Box
          className="wiki-form-item"
          display="flex"
          gap={1}
          flexDirection={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'stretch', sm: 'flex-end' }}
          mt={2}
        >
          <TextField
            id="wiki-import-source"
            fullWidth
            margin="normal"
            label={sourceType === 'xml-dump' ? t('wikiImporter.xmlFilePath') : t('wikiImporter.url')}
            placeholder={getPlaceholder()}
            inputProps={{
              'aria-label': sourceType === 'xml-dump' ? t('wikiImporter.xmlFilePath') : t('wikiImporter.url'),
              title: source,
            }}
            value={source}
            onChange={(e) => setSource(e.target.value)}
            disabled={isImporting}
          />
          {sourceType === 'xml-dump' && (
            <Button
              variant="outlined"
              onClick={handleBrowseXml}
              disabled={isImporting}
              aria-label={t('wikiImporter.browseXml')}
              title={t('wikiImporter.browseXml')}
              sx={{ mb: { xs: 0, sm: 1 }, minWidth: 44, px: 1, alignSelf: { xs: 'flex-end', sm: 'auto' } }}
            >
              <FolderOpen size={17} aria-hidden="true" />
            </Button>
          )}
        </Box>

        {/* Help Text */}
        <Box className="wiki-form-item" mt={2} mb={2}>
          <Typography variant="body2" color="text.secondary">
            {getHelpText()}
          </Typography>
        </Box>

        {/* Error Message */}
        {error && (
          <div className="wiki-error-alert">
            <Alert severity="error" onClose={() => setError(null)} sx={{ overflowWrap: 'anywhere' }}>
              {error}
            </Alert>
          </div>
        )}

        {/* Progress */}
        {isImporting && progress && (
          <Box ref={progressRef} mt={2}>
            <Box display="flex" justifyContent="space-between" mb={1}>
              <Typography
                variant="body2"
                noWrap
                title={progress.currentUrl}
                sx={{ maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis' }}
              >
                {progress.currentUrl}
              </Typography>
              <Typography variant="body2">
                {progress.current} / {progress.total}
              </Typography>
            </Box>
            <LinearProgress variant="determinate" value={progressPercent} />
          </Box>
        )}

        {/* Result */}
        {result && (
          <Box ref={resultRef} mt={2}>
            <Alert
              severity={result.success ? 'success' : 'error'}
              onClose={() => setResult(null)}
              sx={{ overflowWrap: 'anywhere' }}
              action={
                !result.success ? (
                  <Button color="inherit" size="small" onClick={handleRetry} aria-label={t('button.retry')}>
                    {t('button.retry')}
                  </Button>
                ) : undefined
              }
            >
              <Typography variant="body1">
                {result.success ? t('wikiImporter.complete') : t('wikiImporter.failed')}
              </Typography>
              <Typography variant="body2">
                {t('wikiImporter.imported')}: {result.imported} | {t('wikiImporter.skipped')}: {result.skipped}
              </Typography>
              {result.errors.length > 0 && (
                <Typography variant="body2" color="error">
                  {t('wikiImporter.errors')}: {result.errors.length}
                </Typography>
              )}
            </Alert>
            {result.success && result.files.length > 0 && (
              <Box mt={1}>
                <Typography variant="subtitle2" gutterBottom>
                  {t('wikiImporter.importedFiles')}
                </Typography>
                <Box display="flex" flexDirection="column" gap={0.5}>
                  {result.files.slice(0, 5).map((filePath) => (
                    <Button
                      key={filePath}
                      variant="text"
                      size="small"
                      onClick={() => openImportedFile(filePath)}
                      aria-label={`${t('wikiImporter.openFile')}: ${filePath.split(/[/\\]/).pop() || filePath}`}
                      sx={{ justifyContent: 'flex-start', minWidth: 0, textTransform: 'none' }}
                      title={filePath}
                    >
                      <span className="min-w-0 truncate">{filePath.split(/[/\\]/).pop() || filePath}</span>
                      <span className="ml-auto pl-2 text-xs text-primary">{t('wikiImporter.openFile')}</span>
                    </Button>
                  ))}
                </Box>
              </Box>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={isImporting} color="inherit" sx={{ color: 'text.secondary' }}>
          {result ? t('button.close') : t('button.cancel')}
        </Button>
        {!result && (
          <Button onClick={handleImport} variant="contained" disabled={isImporting || !source.trim()}>
            {isImporting ? t('wikiImporter.importing') : t('wikiImporter.startImport')}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}

export default WikiImporterModal
