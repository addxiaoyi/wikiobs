import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  CalendarClock,
  Play,
  Pencil,
  Trash2,
  X,
  Plus,
  ArrowLeft,
  Check,
  AlertCircle,
  Globe,
  Brain,
  Layers,
  Clock,
  Loader2,
  Square,
} from 'lucide-react'
import gsap from 'gsap'

import ReorModal from './Modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useTranslation } from '@/lib/i18n'
import { staggerFadeInUp, fadeInScale } from '@/lib/gsap-animations'
import { cn } from '@/lib/ui'

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
  embedded?: boolean
}

const TASK_TYPES = [
  { value: 'wiki-import', labelKey: 'scheduled.typeWikiImport', icon: Globe },
  { value: 'ai-organize', labelKey: 'scheduled.typeAiOrganize', icon: Brain },
  { value: 'incremental-index', labelKey: 'scheduled.typeIndex', icon: Layers },
  { value: 'custom', labelKey: 'scheduled.typeCustom', icon: Clock },
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

const ScheduledTasksModal: React.FC<ScheduledTasksModalProps> = ({ isOpen, onClose, embedded }) => {
  const { t } = useTranslation()
  const [tasks, setTasks] = useState<ScheduledTask[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
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
  const listRef = useRef<HTMLDivElement>(null)
  const formRef = useRef<HTMLDivElement>(null)
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showSuccess = (message: string) => {
    if (successTimerRef.current) clearTimeout(successTimerRef.current)
    setSuccessMsg(message)
    successTimerRef.current = setTimeout(() => {
      setSuccessMsg(null)
      successTimerRef.current = null
    }, 3000)
  }

  useEffect(() => {
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current)
    }
  }, [])

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
      setShowAddForm(false)
      setEditingTask(null)
      setError(null)
      setSuccessMsg(null)
    }
  }, [isOpen, loadTasks])

  useEffect(() => {
    if (!isOpen || !tasks.some((task) => task.status === 'running')) return undefined
    const timer = setInterval(() => {
      window.scheduledTasks
        .getAll()
        .then(setTasks)
        .catch((err) => setError(`${t('error.generic')}: ${err}`))
    }, 1000)
    return () => clearInterval(timer)
  }, [isOpen, tasks, t])

  // GSAP: Task list entrance
  useEffect(() => {
    if (!isOpen || loading || showAddForm || !listRef.current) return
    const list = listRef.current
    const ctx = gsap.context(() => {
      const rows = list.querySelectorAll('.st-task-item')
      if (rows.length) {
        staggerFadeInUp(rows, 0.25, 0.04, 0.05)
      }
    }, listRef)
    return () => ctx.revert()
  }, [isOpen, loading, tasks, showAddForm])

  // GSAP: Add/edit form entrance
  useEffect(() => {
    if (showAddForm && formRef.current) {
      const formEl = formRef.current
      const ctx = gsap.context(() => {
        const items = formEl.querySelectorAll('.st-form-item')
        if (items.length) {
          staggerFadeInUp(items, 0.25, 0.05, 0.05)
        }
      }, formRef)
      return () => ctx.revert()
    }
  }, [showAddForm])

  const resetForm = () => {
    setFormName('')
    setFormType('wiki-import')
    setFormSchedule('0 9 * * *')
    setFormCustomCron('')
    setFormEnabled(true)
  }

  const handleOpenAdd = () => {
    resetForm()
    setEditingTask(null)
    setShowAddForm(true)
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
    setShowAddForm(true)
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

      setShowAddForm(false)
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
      await loadTasks()
    } catch (err) {
      setError(`${t('error.generic')}: ${err}`)
    }
  }

  const handleCancel = async (task: ScheduledTask) => {
    try {
      const result = await window.scheduledTasks.cancel(task.id)
      if (!result.success) throw new Error(t('error.generic'))
      showSuccess(t('scheduled.cancelling'))
      await loadTasks()
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

  const getTypeInfo = (type: string) => {
    const found = TASK_TYPES.find((tt) => tt.value === type)
    return found || { value: type, labelKey: 'scheduled.typeCustom', icon: Clock }
  }

  const getScheduleLabel = (cron?: string) => {
    if (!cron) return '-'
    const preset = PRESET_SCHEDULES.find((p) => p.value === cron)
    return preset ? t(preset.labelKey as any) : cron
  }

  return (
    <ReorModal isOpen={isOpen} onClose={onClose} embedded={embedded} className="max-w-[620px] p-5">
      {/* Header */}
      <div className="flex items-start gap-3 pb-4 border-b border-border">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-[#7b68ee]/30 bg-[#7b68ee]/15 text-[#7b68ee] dark:text-[#9d8ff5] shadow-sm shadow-[#7b68ee]/20">
          <CalendarClock size={18} strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1 pr-6">
          <h2 className="text-base font-semibold text-foreground tracking-tight">{t('scheduled.title')}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">自动化维基导入、AI 深度整理与增量索引构建</p>
        </div>
      </div>

      <div ref={contentRef} className="pt-4 space-y-3.5">
        {/* Alerts */}
        {error && (
          <div className="flex items-start gap-2.5 rounded-lg border border-red-500/25 bg-red-500/10 p-3 text-xs text-red-600 dark:text-red-200">
            <AlertCircle size={15} className="mt-0.5 shrink-0 text-red-500" />
            <div className="flex-1 break-all">{error}</div>
            <button type="button" onClick={() => setError(null)} className="text-red-500 hover:text-red-400">
              ×
            </button>
          </div>
        )}

        {successMsg && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-200">
            <Check size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="py-8 flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <Loader2 size={20} className="animate-spin text-[#7b68ee]" />
            <span className="text-xs">{t('scheduled.loading')}</span>
          </div>
        )}

        {/* Add/Edit Form Mode */}
        {!loading && showAddForm && (
          <div ref={formRef} className="rounded-lg border border-border bg-card p-4 space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <span className="text-xs font-semibold text-foreground">
                {editingTask ? t('scheduled.editTask') : t('scheduled.newTask')}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAddForm(false)}
                className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft size={12} className="mr-1" />
                返回列表
              </Button>
            </div>

            {/* Task Name */}
            <div className="st-form-item space-y-1">
              <label htmlFor="task-name-input" className="text-xs font-medium text-foreground block">
                {t('scheduled.taskName')}
              </label>
              <Input
                id="task-name-input"
                placeholder="例如：每日维基同步更新"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                disabled={saving}
                className="h-8 bg-background border-border text-foreground text-xs"
              />
            </div>

            {/* Task Type */}
            <div className="st-form-item space-y-1">
              <label className="text-xs font-medium text-foreground block">{t('scheduled.taskType')}</label>
              <Select
                value={formType}
                onValueChange={(val) => setFormType(val as ScheduledTask['type'])}
                disabled={saving}
              >
                <SelectTrigger className="h-8 bg-background border-border text-foreground text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-border bg-popover text-popover-foreground">
                  {TASK_TYPES.map((tt) => {
                    const TypeIcon = tt.icon
                    return (
                      <SelectItem key={tt.value} value={tt.value} className="text-xs">
                        <div className="flex items-center gap-2">
                          <TypeIcon size={13} className="text-muted-foreground" />
                          <span>{t(tt.labelKey as any)}</span>
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Schedule Preset */}
            <div className="st-form-item space-y-1">
              <label className="text-xs font-medium text-foreground block">{t('scheduled.schedule')}</label>
              <Select value={formSchedule} onValueChange={setFormSchedule} disabled={saving}>
                <SelectTrigger className="h-8 bg-background border-border text-foreground text-xs font-mono">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-border bg-popover text-popover-foreground">
                  {PRESET_SCHEDULES.map((ps) => (
                    <SelectItem key={ps.value} value={ps.value} className="text-xs font-mono">
                      {t(ps.labelKey as any)} ({ps.value})
                    </SelectItem>
                  ))}
                  <SelectItem value="custom" className="text-xs">
                    {t('scheduled.customCron')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Custom Cron Expression */}
            {formSchedule === 'custom' && (
              <div className="st-form-item space-y-1">
                <label htmlFor="task-custom-cron" className="text-xs font-medium text-foreground block">
                  {t('scheduled.cronExpression')}
                </label>
                <Input
                  id="task-custom-cron"
                  placeholder="0 9 * * *"
                  value={formCustomCron}
                  onChange={(e) => setFormCustomCron(e.target.value)}
                  disabled={saving}
                  className="h-8 bg-background border-border text-foreground text-xs font-mono"
                />
                {!customCronValid && formCustomCron.length > 0 && (
                  <p className="text-[11px] text-red-400">请输入合法的 5 段 Cron 表达式 (分 时 日 月 周)</p>
                )}
              </div>
            )}

            {/* Enable switch */}
            <div className="st-form-item flex items-center justify-between pt-1">
              <span className="text-xs text-foreground">{t('scheduled.enabled')}</span>
              <Switch checked={formEnabled} onCheckedChange={setFormEnabled} disabled={saving} />
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button variant="secondary" size="sm" onClick={() => setShowAddForm(false)} disabled={saving}>
                {t('button.cancel')}
              </Button>
              <Button
                variant="accent"
                size="sm"
                onClick={handleSave}
                disabled={saving || !isFormValid}
                className="gap-1.5"
              >
                {saving && <Loader2 size={12} className="animate-spin" />}
                <span>{saving ? t('scheduled.saving') : t('button.save')}</span>
              </Button>
            </div>
          </div>
        )}

        {/* Task List Mode */}
        {!loading && !showAddForm && tasks.length === 0 && (
          <div className="py-8 px-4 text-center rounded-lg border border-border bg-card">
            <div className="size-11 rounded-xl bg-muted/40 border border-border flex items-center justify-center mx-auto mb-2 text-muted-foreground">
              <CalendarClock size={22} />
            </div>
            <h3 className="text-xs font-semibold text-foreground">{t('scheduled.noTasks')}</h3>
            <p className="text-[11px] text-muted-foreground mt-1 max-w-xs mx-auto leading-relaxed">
              {t('scheduled.emptyHint')}
            </p>
            <Button variant="accent" size="sm" onClick={handleOpenAdd} className="mt-3 gap-1.5 text-xs">
              <Plus size={13} />
              <span>{t('scheduled.newTask')}</span>
            </Button>
          </div>
        )}

        {!loading && !showAddForm && tasks.length > 0 && (
          <div ref={listRef} className="space-y-2">
            <div className="flex items-center justify-between px-1 text-xs">
              <span className="text-muted-foreground font-medium">任务列表 ({tasks.length})</span>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleOpenAdd}
                className="h-7 px-2.5 text-xs gap-1 border-border bg-secondary hover:bg-secondary/80 text-foreground"
              >
                <Plus size={12} />
                <span>{t('scheduled.newTask')}</span>
              </Button>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
              {tasks.map((task) => {
                const typeInfo = getTypeInfo(task.type)
                const TypeIcon = typeInfo.icon
                return (
                  <div
                    key={task.id}
                    className="st-task-item flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-2.5 text-xs transition-colors hover:border-border/80"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted/40 border border-border text-muted-foreground">
                        <TypeIcon size={14} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground truncate">{task.name}</span>
                          <span
                            className={cn(
                              'px-1.5 py-0.2 rounded text-[10px] font-mono',
                              task.enabled
                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-500/20'
                                : 'bg-muted/40 text-muted-foreground border border-border',
                            )}
                          >
                            {task.enabled ? t('scheduled.enabled') : t('scheduled.disabled')}
                          </span>
                          {task.status === 'running' && (
                            <span className="text-[10px] text-amber-600 dark:text-amber-300">{t('scheduled.running')}</span>
                          )}
                        </div>
                        <div className="truncate whitespace-nowrap text-[11px] text-muted-foreground font-mono mt-0.5">
                          {getScheduleLabel(task.schedule.cronExpression)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Switch
                        checked={task.enabled}
                        onCheckedChange={() => handleToggle(task)}
                        title={task.enabled ? t('scheduled.disabled') : t('scheduled.enabled')}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => (task.status === 'running' ? handleCancel(task) : handleTrigger(task))}
                        className="size-7 p-0 text-muted-foreground hover:text-foreground"
                        title={t(task.status === 'running' ? 'scheduled.cancelRun' : 'scheduled.trigger')}
                      >
                        {task.status === 'running' ? <Square size={12} /> : <Play size={13} />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(task)}
                        className="size-7 p-0 text-muted-foreground hover:text-foreground"
                        title={t('scheduled.edit')}
                      >
                        <Pencil size={13} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(task)}
                        className="size-7 p-0 text-muted-foreground hover:text-destructive"
                        title={t('button.delete')}
                      >
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-2.5 pt-4 mt-2 border-t border-border">
        <Button variant="secondary" size="sm" onClick={onClose} className="text-xs">
          {t('button.close')}
        </Button>
      </div>
    </ReorModal>
  )
}

export default ScheduledTasksModal
