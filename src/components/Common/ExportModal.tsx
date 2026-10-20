import React, { useState, useEffect, useRef, useCallback } from 'react'
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
import Switch from '@mui/material/Switch'
import FormControlLabel from '@mui/material/FormControlLabel'
import LinearProgress from '@mui/material/LinearProgress'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Alert from '@mui/material/Alert'
import Chip from '@mui/material/Chip'
import Checkbox from '@mui/material/Checkbox'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import gsap from 'gsap'
import { X } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'
import { staggerFadeInUp, fadeInScale } from '@/lib/gsap-animations'

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
}

const FORMATS: ExportFormat[] = ['zip', 'pdf', 'markdown', 'graph', 'obsidian']

const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose }) => {
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

  const contentRef = useRef<HTMLDivElement>(null)
  const resultRef = useRef<HTMLDivElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)

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

  // GSAP: form items
  useEffect(() => {
    if (!isOpen || !contentRef.current) return
    const content = contentRef.current
    const ctx = gsap.context(() => {
      const items = content.querySelectorAll('.export-form-item')
      if (items.length) {
        staggerFadeInUp(items, 0.3, 0.05, 0.1)
      }
    }, contentRef)
    return () => ctx.revert()
  }, [isOpen, format])

  // GSAP: result
  useEffect(() => {
    if (result && resultRef.current) {
      const ctx = gsap.context(() => {
        fadeInScale(resultRef.current, 0.4, 0)
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
          staggerFadeInUp(items, 0.3, 0.03, 0.1)
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

  const getFormatLabel = (fmt: ExportFormat) => {
    const key = `export.${fmt}` as any
    const label = t(key)
    return label
  }

  return (
    <Dialog open={isOpen} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1 }}>
        {t('export.title')}
        <IconButton onClick={handleClose} aria-label={t('button.close')} title={t('button.close')} size="small">
          <X size={16} />
        </IconButton>
      </DialogTitle>
      <DialogContent ref={contentRef}>
        {error && (
          <Box mb={2}>
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          </Box>
        )}

        {/* Format Selector */}
        <FormControl fullWidth margin="normal" className="export-form-item">
          <InputLabel>{t('export.format')}</InputLabel>
          <Select
            value={format}
            label={t('export.format')}
            inputProps={{ 'aria-label': t('export.format') }}
            onChange={(e) => {
              setFormat(e.target.value as ExportFormat)
              setResult(null)
              setPreview(null)
            }}
            disabled={exporting}
          >
            {FORMATS.map((fmt) => (
              <MenuItem key={fmt} value={fmt}>
                {getFormatLabel(fmt)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Options */}
        <Box className="export-form-item" mt={1}>
          <FormControlLabel
            control={
              <Switch
                checked={includeSubfolders}
                onChange={(e) => setIncludeSubfolders(e.target.checked)}
                disabled={exporting}
              />
            }
            label={t('export.includeSubfolders')}
          />
        </Box>
        <Box className="export-form-item">
          <FormControlLabel
            control={
              <Switch
                checked={includeAttachments}
                onChange={(e) => setIncludeAttachments(e.target.checked)}
                disabled={exporting}
              />
            }
            label={t('export.includeAttachments')}
          />
        </Box>

        <Box className="export-form-item" display="flex" gap={1} flexDirection={{ xs: 'column', sm: 'row' }}>
          <TextField
            id="export-date-from"
            label={t('export.dateFrom')}
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            disabled={exporting}
            InputLabelProps={{ shrink: true }}
            inputProps={{ 'aria-label': t('export.dateFrom') }}
            size="small"
            fullWidth
          />
          <TextField
            id="export-date-to"
            label={t('export.dateTo')}
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            disabled={exporting}
            InputLabelProps={{ shrink: true }}
            inputProps={{ 'aria-label': t('export.dateTo') }}
            size="small"
            fullWidth
          />
        </Box>

        <TextField
          id="export-tag-filter"
          className="export-form-item"
          fullWidth
          margin="normal"
          label={t('export.tagFilter')}
          placeholder="tag1, tag2, ..."
          inputProps={{ 'aria-label': t('export.tagFilter') }}
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
          disabled={exporting}
          size="small"
        />

        {/* Preview Button */}
        <Box className="export-form-item" mt={1} display="flex" justifyContent="flex-end">
          <Button variant="outlined" size="small" onClick={handlePreview} disabled={exporting || loadingPreview}>
            {loadingPreview ? t('scheduled.loading') : t('export.preview')}
          </Button>
        </Box>

        {/* Preview List */}
        {preview && (
          <Box ref={previewRef} mt={2}>
            {preview.length === 0 && (
              <Alert severity="info" sx={{ mb: 1 }}>
                {t('export.noFilesMatch')}
              </Alert>
            )}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="subtitle2">
                {t('export.files')} ({preview.length})
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    size="small"
                    checked={selectedFiles.size === preview.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                }
                label={t('export.selectAll')}
                sx={{ mr: 0 }}
              />
            </Box>
            <List dense>
              {preview.map((note) => (
                <ListItem
                  key={note.filePath}
                  className="export-preview-item"
                  button
                  onClick={() => handleToggleFile(note.filePath)}
                  sx={{
                    bgcolor: selectedFiles.has(note.filePath) ? 'action.selected' : 'transparent',
                    borderRadius: 1,
                  }}
                >
                  <Checkbox
                    edge="start"
                    checked={selectedFiles.has(note.filePath)}
                    tabIndex={-1}
                    disableRipple
                    onClick={(event) => event.stopPropagation()}
                    onChange={(event) => {
                      event.stopPropagation()
                      handleToggleFile(note.filePath)
                    }}
                    inputProps={{ 'aria-label': `${note.title} ${t('export.selectAll')}` }}
                  />
                  <ListItemText
                    sx={{ minWidth: 0, overflow: 'hidden' }}
                    primary={note.title}
                    secondary={note.filePath}
                    primaryTypographyProps={{ variant: 'body2' }}
                    secondaryTypographyProps={{
                      variant: 'caption',
                      noWrap: true,
                      sx: { fontFamily: 'monospace', fontSize: '0.7rem', overflow: 'hidden', textOverflow: 'ellipsis' },
                    }}
                  />
                  {note.tags.length > 0 &&
                    note.tags
                      .slice(0, 3)
                      .map((tag) => <Chip key={tag} label={tag} size="small" variant="outlined" sx={{ ml: 0.5 }} />)}
                </ListItem>
              ))}
            </List>
          </Box>
        )}

        {/* Progress / Result */}
        {exporting && (
          <Box mt={2}>
            <LinearProgress />
            <Typography variant="body2" color="text.secondary" align="center" mt={1}>
              {t('export.exporting')}
            </Typography>
          </Box>
        )}

        {result && (
          <Box ref={resultRef} mt={2}>
            <Alert severity={result.success ? 'success' : 'error'} onClose={() => setResult(null)}>
              <Typography variant="body1">
                {result.success ? t('export.exportSuccess') : t('export.exportFailed')}
              </Typography>
              {result.outputPath && (
                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                  {result.outputPath}
                </Typography>
              )}
              {result.filesExported !== undefined && (
                <Typography variant="body2">
                  {t('export.filesExported')}: {result.filesExported}
                </Typography>
              )}
              {result.error && (
                <Typography variant="body2" color="error">
                  {result.error}
                </Typography>
              )}
            </Alert>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={exporting}>
          {result ? t('button.close') : t('button.cancel')}
        </Button>
        {!result && (
          <Button
            onClick={handleExport}
            variant="contained"
            disabled={exporting || (preview !== null && selectedFiles.size === 0)}
          >
            {exporting ? t('export.exporting') : t('export.startExport')}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}

export default ExportModal
