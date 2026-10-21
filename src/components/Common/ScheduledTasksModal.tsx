import React, { useState, useEffect, useRef, useCallback } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Switch from '@mui/material/Switch'
import FormControlLabel from '@mui/material/FormControlLabel'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'
import IconButton from '@mui/material/IconButton'
import LinearProgress from '@mui/material/LinearProgress'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Alert from '@mui/material/Alert'
import Chip from '@mui/material/Chip'
import gsap from 'gsap'
import { Play, Pencil, Trash2, CalendarClock, X } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'
import { staggerFadeInUp, fadeInScale } from '@/lib/gsap-animations'

interface ScheduledTask {
  id: string
  name: string
  type: 'wiki-import' | 'ai-organize' | 'incremental-index' | 'custom'
  schedule: {
    type: 'interval' | 'cron' | 'preset'
    intervalMinutes?: number
    cronExpression?: string
    preset?: 'daily' | 'weekly' | 'monthly'
    hour?: number
    minute?: number
    dayOfWeek?: number
    dayOfMonth?: number
  }
  enabled: boolean
  lastRun?: string
  nextRun?: string
  config?: Record<string, unknown>
  status: 'idle' | 'running' | 'error'
  createdAt: string
}

interface ScheduledTasksModalProps {
  isOpen: boolean
  onClose: () => void
}

const TASK_TYPES = [
  { value: 'wiki-import', labelKey: 'scheduled.typeWikiImport' },
  { value: 'ai-organize', labelKey: 'scheduled.typeAiOrganize' },
  { value: 'incremental-index', labelKey: 'scheduled.typeIndex' },
  { value: 'custom', labelKey: 'scheduled.typeCustom' },
] as const

const PRESET_SCHEDULES = [
  { value: '0 9 * * *', labelKey: 'scheduled.presetDaily' },
  { value: '0 9 * * 1', labelKey: 'scheduled.presetWeekly' },
  { value: '0 9 1 * *', labelKey: 'scheduled.presetMonthly' },
] as const

const isCronExpressionShapeValid = (expression: string): boolean => {
  const fields = expression.trim().split(/\s+/)
  if (fields.length !== 5) return false
  return fields.every((field) => /^(\*|\d{1,2})([-/]((\*|\d{1,2})))?$/.test(field))
}

const ScheduledTasksModal: React.FC<ScheduledTasksModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation()
  const [tasks, setTasks] = useState<ScheduledTask[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingTask, setEditingTask] = useState<ScheduledTask | null>(null)
  const [saving, setSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Form state
  const [formName, setFormName] = useState('')
  const [formType, setFormType] = useState<ScheduledTask['type']>('wiki-import')
  const [formSchedule, setFormSchedule] = useState('0 9 * * *')
  const [formCustomCron, setFormCustomCron] = useState('')
  const [formEnabled, setFormEnabled] = useState(true)

  const contentRef = useRef<HTMLDivElement>(null)
  const tableRef = useRef<HTMLDivElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const successRef = useRef<HTMLDivElement>(null)
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showSuccess = (message: string) => {
    if (successTimerRef.current) clearTimeout(successTimerRef.current)
    setSuccessMsg(message)
    successTimerRef.current = setTimeout(() => {
      setSuccessMsg(null)
      successTimerRef.current = null
    }, 3000)
  }

  useEffect(
    () => () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current)
    },
    [],
  )

  const loadTasks = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await window.scheduledTasks.getAll()
      setTasks(result || [])
    } catch (err) {
      setError(`${t('error.generic')}: ${err}`)
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    if (isOpen) {
      loadTasks()
    } else {
      setShowAddDialog(false)
      setEditingTask(null)
      setError(null)
      setSuccessMsg(null)
    }
  }, [isOpen, loadTasks])

  // GSAP: table rows stagger
  useEffect(() => {
    if (!isOpen || loading || !tableRef.current) return
    const table = tableRef.current
    const ctx = gsap.context(() => {
      const rows = table.querySelectorAll('.st-task-row')
      if (rows.length) {
        staggerFadeInUp(rows, 0.3, 0.04, 0.1)
      }
    }, tableRef)
    return () => ctx.revert()
  }, [isOpen, loading, tasks])

  // GSAP: add/edit dialog
  useEffect(() => {
    if (showAddDialog && dialogRef.current) {
      const dialog = dialogRef.current
      const ctx = gsap.context(() => {
        const items = dialog.querySelectorAll('.st-form-item')
        if (items.length) {
          staggerFadeInUp(items, 0.3, 0.06, 0.1)
        }
      }, dialogRef)
      return () => ctx.revert()
    }
  }, [showAddDialog])

  // GSAP: success message
  useEffect(() => {
    if (successMsg && successRef.current) {
      const ctx = gsap.context(() => {
        fadeInScale(successRef.current, 0.4, 0)
      }, successRef)
      return () => ctx.revert()
    }
  }, [successMsg])

  const resetForm = () => {
    setFormName('')
    setFormType('wiki-import')
    setFormSchedule('0 9 * * *')
    setFormCustomCron('')
    setFormEnabled(true)
  }

  const handleAdd = () => {
    resetForm()
    setEditingTask(null)
    setShowAddDialog(true)
  }

  const handleEdit = (task: ScheduledTask) => {
    const cronExpression = task.schedule.cronExpression || '0 9 * * *'
    const isPresetSchedule = PRESET_SCHEDULES.some((preset) => preset.value === cronExpression)
    setEditingTask(task)
    setFormName(task.name)
    setFormType(task.type)
    setFormSchedule(isPresetSchedule ? cronExpression : 'custom')
    setFormCustomCron(isPresetSchedule ? '' : cronExpression)
    setFormEnabled(task.enabled)
    setShowAddDialog(true)
  }

  const customCronValid = formSchedule !== 'custom' || isCronExpressionShapeValid(formCustomCron)
  const isFormValid = formName.trim().length > 0 && customCronValid

  const handleSave = async () => {
    if (!isFormValid) return
    setSaving(true)
    setError(null)
    try {
      const cronExpr = formSchedule === 'custom' ? formCustomCron : formSchedule
      const taskData = {
        name: formName.trim(),
        type: formType,
        schedule: { type: 'cron' as const, cronExpression: cronExpr },
        config: {},
        enabled: formEnabled,
      }

      const savedTask = editingTask
        ? await window.scheduledTasks.update(editingTask.id, taskData)
        : await window.scheduledTasks.add(taskData)
      if (!savedTask) throw new Error(t('error.generic'))

      setShowAddDialog(false)
      showSuccess(editingTask ? t('scheduled.updated') : t('scheduled.created'))
      await loadTasks()
    } catch (err) {
      setError(`${t('error.generic')}: ${err}`)
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (task: ScheduledTask) => {
    try {
      const result = task.enabled
        ? await window.scheduledTasks.disable(task.id)
        : await window.scheduledTasks.enable(task.id)
      if (!result) throw new Error(t('error.generic'))
      await loadTasks()
    } catch (err) {
      setError(`${t('error.generic')}: ${err}`)
    }
  }

  const handleTrigger = async (task: ScheduledTask) => {
    try {
      const result = await window.scheduledTasks.trigger(task.id)
      if (!result.success) throw new Error(t('error.generic'))
      showSuccess(t('scheduled.triggered'))
    } catch (err) {
      setError(`${t('error.generic')}: ${err}`)
    }
  }

  const handleDelete = async (task: ScheduledTask) => {
    try {
      const result = await window.scheduledTasks.remove(task.id)
      if (!result.success) throw new Error(t('error.generic'))
      showSuccess(t('scheduled.deleted'))
      await loadTasks()
    } catch (err) {
      setError(`${t('error.generic')}: ${err}`)
    }
  }

  const handleClose = () => {
    if (!saving) {
      onClose()
    }
  }

  const getTypeLabel = (type: string) => {
    const found = TASK_TYPES.find((tt) => tt.value === type)
    return found ? t(found.labelKey as any) : type
  }

  const getScheduleLabel = (cron?: string) => {
    if (!cron) return '-'
    const preset = PRESET_SCHEDULES.find((p) => p.value === cron)
    return preset ? t(preset.labelKey as any) : cron
  }

  return (
    <Dialog open={isOpen} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1 }}>
        {t('scheduled.title')}
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

        {successMsg && (
          <Box ref={successRef} mb={2}>
            <Alert severity="success" onClose={() => setSuccessMsg(null)}>
              {successMsg}
            </Alert>
          </Box>
        )}

        {loading && (
          <Box py={4}>
            <LinearProgress />
            <Typography variant="body2" color="text.secondary" align="center" mt={2}>
              {t('scheduled.loading')}
            </Typography>
          </Box>
        )}

        {!loading && tasks.length === 0 && !showAddDialog && (
          <Box py={5} px={2} textAlign="center">
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: 2,
                display: 'grid',
                placeItems: 'center',
                mx: 'auto',
                mb: 1.5,
                bgcolor: 'rgba(45, 212, 191, 0.12)',
                color: '#2dd4bf',
              }}
            >
              <CalendarClock size={28} />
            </Box>
            <Typography variant="body1" color="text.primary" gutterBottom fontWeight={600}>
              {t('scheduled.noTasks')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 360, mx: 'auto' }}>
              {t('scheduled.emptyHint')}
            </Typography>
            <Button variant="contained" onClick={handleAdd} sx={{ mt: 2 }}>
              {t('scheduled.newTask')}
            </Button>
          </Box>
        )}

        {!loading && tasks.length > 0 && (
          <Box ref={tableRef} mt={1}>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t('scheduled.taskName')}</TableCell>
                    <TableCell>{t('scheduled.taskType')}</TableCell>
                    <TableCell>{t('scheduled.schedule')}</TableCell>
                    <TableCell>{t('scheduled.status')}</TableCell>
                    <TableCell align="right">{t('scheduled.actions')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tasks.map((task) => (
                    <TableRow key={task.id} className="st-task-row" hover>
                      <TableCell>{task.name}</TableCell>
                      <TableCell>
                        <Chip label={getTypeLabel(task.type)} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                          {getScheduleLabel(task.schedule.cronExpression)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={task.enabled ? t('scheduled.enabled') : t('scheduled.disabled')}
                          color={task.enabled ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <FormControlLabel
                          control={
                            <Switch
                              size="small"
                              checked={task.enabled}
                              onChange={() => handleToggle(task)}
                              inputProps={{ 'aria-label': `${t('scheduled.enableTask') || t('scheduled.enabled')}: ${task.name}` }}
                            />
                          }
                          label=""
                          sx={{ mr: 0.5 }}
                        />
                        <IconButton
                          size="small"
                          onClick={() => handleTrigger(task)}
                          title={t('scheduled.trigger')}
                          aria-label={t('scheduled.trigger')}
                        >
                          <Play size="15" aria-hidden="true" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleEdit(task)}
                          title={t('scheduled.edit')}
                          aria-label={t('scheduled.edit')}
                        >
                          <Pencil size="15" aria-hidden="true" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(task)}
                          title={t('button.delete')}
                          aria-label={t('button.delete')}
                        >
                          <Trash2 size="15" aria-hidden="true" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Box mt={2} display="flex" justifyContent="flex-end">
              <Button variant="contained" onClick={handleAdd}>
                {t('scheduled.newTask')}
              </Button>
            </Box>
          </Box>
        )}

        {/* Add/Edit Dialog */}
        <Dialog open={showAddDialog} onClose={() => !saving && setShowAddDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle
            ref={dialogRef}
            sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1 }}
          >
            {editingTask ? t('scheduled.editTask') : t('scheduled.newTask')}
            <IconButton
              onClick={() => !saving && setShowAddDialog(false)}
              aria-label={t('button.close')}
              title={t('button.close')}
              size="small"
            >
              <X size={16} />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            <TextField
              className="st-form-item"
              fullWidth
              margin="normal"
              label={t('scheduled.taskName')}
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              disabled={saving}
            />

            <FormControl fullWidth margin="normal" className="st-form-item">
              <InputLabel>{t('scheduled.taskType')}</InputLabel>
              <Select
                value={formType}
                label={t('scheduled.taskType')}
                onChange={(e) => setFormType(e.target.value as ScheduledTask['type'])}
                disabled={saving}
              >
                {TASK_TYPES.map((tt) => (
                  <MenuItem key={tt.value} value={tt.value}>
                    {t(tt.labelKey as any)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth margin="normal" className="st-form-item">
              <InputLabel>{t('scheduled.schedule')}</InputLabel>
              <Select
                value={formSchedule}
                label={t('scheduled.schedule')}
                onChange={(e) => setFormSchedule(e.target.value)}
                disabled={saving}
              >
                {PRESET_SCHEDULES.map((ps) => (
                  <MenuItem key={ps.value} value={ps.value}>
                    {t(ps.labelKey as any)}
                  </MenuItem>
                ))}
                <MenuItem value="custom">{t('scheduled.customCron')}</MenuItem>
              </Select>
            </FormControl>

            {formSchedule === 'custom' && (
              <TextField
                className="st-form-item"
                fullWidth
                margin="normal"
                label={t('scheduled.cronExpression')}
                placeholder="0 9 * * *"
                inputProps={{ 'aria-label': t('scheduled.cronExpression') }}
                value={formCustomCron}
                onChange={(e) => setFormCustomCron(e.target.value)}
                disabled={saving}
                error={formCustomCron.length > 0 && !customCronValid}
                helperText={
                  formCustomCron.length > 0 && !customCronValid
                    ? 'Use five cron fields, for example 0 9 * * *'
                    : undefined
                }
              />
            )}

            <FormControlLabel
              className="st-form-item"
              control={
                <Switch checked={formEnabled} onChange={(e) => setFormEnabled(e.target.checked)} disabled={saving} />
              }
              label={t('scheduled.enabled')}
              sx={{ mt: 1 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowAddDialog(false)} disabled={saving}>
              {t('button.cancel')}
            </Button>
            <Button onClick={handleSave} variant="contained" disabled={saving || !isFormValid}>
              {saving ? t('scheduled.saving') : t('button.save')}
            </Button>
          </DialogActions>
        </Dialog>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>{t('button.close')}</Button>
      </DialogActions>
    </Dialog>
  )
}

export default ScheduledTasksModal
