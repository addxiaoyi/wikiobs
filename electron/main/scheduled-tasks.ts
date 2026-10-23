/**
 * Scheduled Tasks - 定时任务系统
 * 支持 cron 表达式、预设任务、间隔执行
 */

import { ipcMain, BrowserWindow, app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import crypto from 'crypto'
import Store from 'electron-store'
import { logger } from './common/logger'
import { scanMarkdownFiles } from './common/scanner'
import { StoreSchema } from './electron-store/storeConfig'
import WindowsManager from './common/windowManager'
import type { WikiImporterOptions } from './wiki-importer'
import type LanceDBTableWrapper from './vector-database/lanceTableWrapper'
import { updateFileInTable } from './vector-database/tableHelperFunctions'

// 类型定义
interface ScheduleConfig {
  type: 'interval' | 'cron' | 'preset'
  // interval
  intervalMinutes?: number
  // cron
  cronExpression?: string
  // preset
  preset?: 'daily' | 'weekly' | 'monthly'
  hour?: number
  minute?: number
  dayOfWeek?: number
  dayOfMonth?: number
}

export interface ScheduledTask {
  id: string
  name: string
  type: 'wiki-import' | 'ai-organize' | 'incremental-index' | 'custom'
  schedule: ScheduleConfig
  config: Record<string, unknown>
  enabled: boolean
  lastRun?: string
  nextRun?: string
  status: 'idle' | 'running' | 'error'
  lastError?: string
  createdAt: string
}

interface ScheduledTaskInstance extends ScheduledTask {
  timer?: NodeJS.Timeout
  cronJob?: object
  controller?: AbortController
}

type ScheduledTaskInput = Omit<ScheduledTask, 'id' | 'status' | 'createdAt' | 'lastRun' | 'nextRun' | 'enabled'> & {
  enabled?: boolean
}

// 任务存储
const tasks: Map<string, ScheduledTaskInstance> = new Map()
const store = new Store<StoreSchema>()
const TASKS_FILE = 'scheduled-tasks.json'

// 获取任务文件路径
function getTasksFilePath(): string {
  const userDataPath = (store.get('userDataPath') as string) || app.getPath('userData')
  return path.join(userDataPath, TASKS_FILE)
}

// 加载任务
function loadTasks(): ScheduledTask[] {
  try {
    const tasksPath = getTasksFilePath()
    const legacyPath = path.resolve(TASKS_FILE)
    const sourcePath = fs.existsSync(tasksPath) ? tasksPath : legacyPath
    if (sourcePath !== legacyPath || fs.existsSync(legacyPath)) {
      const loaded = JSON.parse(fs.readFileSync(sourcePath, 'utf-8'))
      if (Array.isArray(loaded)) return loaded
      logger.error('ScheduledTasks', `Invalid scheduled task data in ${sourcePath}`)
    }
  } catch (e) {
    logger.error('ScheduledTasks', 'Failed to load scheduled tasks', e)
  }
  return []
}

// 保存任务
function saveTasks(): void {
  try {
    const tasksPath = getTasksFilePath()
    const dir = path.dirname(tasksPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    const tasksArray = Array.from(tasks.values()).map((t) => ({
      id: t.id,
      name: t.name,
      type: t.type,
      schedule: t.schedule,
      config: t.config,
      enabled: t.enabled,
      lastRun: t.lastRun,
      nextRun: t.nextRun,
      status: t.status,
      lastError: t.lastError,
      createdAt: t.createdAt,
    }))

    const temporaryPath = `${tasksPath}.${process.pid}.tmp`
    fs.writeFileSync(temporaryPath, JSON.stringify(tasksArray, null, 2), 'utf-8')
    fs.renameSync(temporaryPath, tasksPath)
  } catch (e) {
    logger.error('ScheduledTasks', 'Failed to save scheduled tasks', e)
  }
}

// 解析 cron 表达式（简化版）
function parseCron(cronExpr: string): { hour: number; minute: number; dayOfWeek?: number; dayOfMonth?: number } | null {
  const parts = cronExpr.split(' ')
  if (parts.length < 5) return null

  const [minute, hour, dayOfMonth, , dayOfWeek] = parts

  const result: { hour: number; minute: number; dayOfWeek?: number; dayOfMonth?: number } = {
    hour: hour === '*' ? -1 : parseInt(hour, 10),
    minute: minute === '*' ? -1 : parseInt(minute, 10),
  }

  if (dayOfWeek !== '*') {
    result.dayOfWeek = parseInt(dayOfWeek, 10)
  }
  if (dayOfMonth !== '*') {
    result.dayOfMonth = parseInt(dayOfMonth, 10)
  }

  return result
}

// 计算下次执行时间
function calculateNextRun(task: ScheduledTask): string | undefined {
  const now = new Date()

  if (task.schedule.type === 'interval' && task.schedule.intervalMinutes) {
    const next = new Date(now.getTime() + task.schedule.intervalMinutes * 60 * 1000)
    return next.toISOString()
  }

  if (task.schedule.type === 'cron' && task.schedule.cronExpression) {
    const parsed = parseCron(task.schedule.cronExpression)
    if (!parsed) return undefined

    const next = new Date()
    next.setSeconds(0)
    next.setMilliseconds(0)

    // 简单实现：找下一个匹配的时间
    for (let i = 0; i < 24 * 60; i++) {
      next.setMinutes(next.getMinutes() + 1)

      const matchHour = parsed.hour === -1 || next.getHours() === parsed.hour
      const matchMinute = parsed.minute === -1 || next.getMinutes() === parsed.minute
      const matchDayOfWeek = !parsed.dayOfWeek || next.getDay() === parsed.dayOfWeek
      const matchDayOfMonth = !parsed.dayOfMonth || next.getDate() === parsed.dayOfMonth

      if (matchHour && matchMinute && matchDayOfWeek && matchDayOfMonth) {
        return next.toISOString()
      }
    }
  }

  if (task.schedule.type === 'preset') {
    const next = new Date(now)
    next.setSeconds(0)
    next.setMilliseconds(0)

    if (task.schedule.preset === 'daily' || task.schedule.preset === 'weekly' || task.schedule.preset === 'monthly') {
      next.setHours(task.schedule.hour || 9)
      next.setMinutes(task.schedule.minute || 0)

      if (task.schedule.preset === 'weekly') {
        next.setDate(next.getDate() + (((task.schedule.dayOfWeek || 1) - next.getDay() + 7) % 7))
      } else if (task.schedule.preset === 'monthly') {
        next.setDate(task.schedule.dayOfMonth || 1)
      }

      if (next <= now) {
        if (task.schedule.preset === 'daily') {
          next.setDate(next.getDate() + 1)
        } else if (task.schedule.preset === 'weekly') {
          next.setDate(next.getDate() + 7)
        } else if (task.schedule.preset === 'monthly') {
          next.setMonth(next.getMonth() + 1)
        }
      }

      return next.toISOString()
    }
  }

  return undefined
}

// 辅助函数：获取目录中的所有 Markdown 文件（委托给共享 scanner）
function getMarkdownFiles(dir: string): string[] {
  return scanMarkdownFiles(dir)
}

// 任务执行上下文
const executeContext: { windowsManager?: WindowsManager } = {}

function getVaultWindow(vaultPath: string): { dbTableClient: LanceDBTableWrapper } | null {
  const windowsManager = executeContext.windowsManager
  if (!windowsManager) return null

  for (const win of BrowserWindow.getAllWindows()) {
    const windowInfo = windowsManager.getWindowInfoForContents(win.webContents)
    if (windowInfo && path.resolve(windowInfo.vaultDirectoryForWindow) === path.resolve(vaultPath)) {
      return { dbTableClient: windowInfo.dbTableClient }
    }
  }
  return null
}

function getTaskVaultPath(task: ScheduledTask): string | undefined {
  const configuredPath = task.config.vaultPath
  if (typeof configuredPath === 'string' && configuredPath.trim()) return configuredPath
  return (store.get('vaultDirectory') as string) || undefined
}

function throwIfTaskCancelled(signal: AbortSignal): void {
  if (signal.aborted) throw new Error('Task cancelled.')
}

// 执行任务
async function executeTask(taskId: string): Promise<{ success: boolean; error?: string }> {
  const task = tasks.get(taskId)
  if (!task) {
    return { success: false, error: 'Task not found' }
  }
  if (task.status === 'running') {
    return { success: false, error: 'Task is already running' }
  }

  task.status = 'running'
  task.lastRun = new Date().toISOString()
  const controller = new AbortController()
  task.controller = controller
  saveTasks()

  try {
    // 根据任务类型执行不同的操作
    switch (task.type) {
      case 'wiki-import': {
        const { importFromWiki } = await import('./wiki-importer')
        const source = task.config.source as string
        if (!source) throw new Error('Wiki import task is missing a source.')
        const vaultPath = getTaskVaultPath(task)
        if (!vaultPath) throw new Error('Wiki import task has no vault configured.')
        const sourceType = task.config.sourceType as WikiImporterOptions['sourceType'] | undefined
        const options: WikiImporterOptions = {
          source,
          sourceType: sourceType || 'url',
          outputDir: (task.config.outputDir as string) || path.join(vaultPath, 'WikiImports'),
        }
        const result = await importFromWiki({ ...options, signal: controller.signal })
        if (result.cancelled) throw new Error('Task cancelled.')
        if (!result.success) throw new Error(result.errors.join('\n') || 'Wiki import failed.')
        const windowInfo = getVaultWindow(vaultPath)
        if (windowInfo) {
          for (const filePath of result.filesToIndex) {
            throwIfTaskCancelled(controller.signal)
            await updateFileInTable(windowInfo.dbTableClient, filePath)
          }
        }
        break
      }

      case 'ai-organize': {
        const { organizeNotes } = await import('./ai-organization')
        // 获取所有笔记文件
        const vaultPath = getTaskVaultPath(task)
        if (vaultPath) {
          const files = getMarkdownFiles(vaultPath)
          if (!executeContext.windowsManager) throw new Error('Window manager is not available.')
          await organizeNotes(files, store, executeContext.windowsManager, undefined, controller.signal)
        }
        break
      }

      case 'incremental-index': {
        const { incrementalIndex } = await import('./incremental-indexer')
        const vaultDir = getTaskVaultPath(task)
        const userDataPath = app.getPath('userData')
        if (vaultDir) {
          // 从活跃窗口获取 dbTableClient
          const dbTableClient = getVaultWindow(vaultDir)?.dbTableClient || null
          await incrementalIndex(vaultDir, dbTableClient, userDataPath, undefined, controller.signal)
        }
        break
      }

      case 'custom': {
        // 触发自定义钩子
        logger.info('ScheduledTasks', `Running custom task: ${task.name}`)
        break
      }

      default:
        break
    }

    if (tasks.get(taskId) === task) {
      task.controller = undefined
      task.status = 'idle'
      task.nextRun = task.enabled ? calculateNextRun(task) : undefined
      task.lastError = undefined
      saveTasks()
    }

    return { success: true }
  } catch (e) {
    if (tasks.get(taskId) === task) {
      task.controller = undefined
      const cancelled = controller.signal.aborted
      task.status = cancelled ? 'idle' : 'error'
      task.lastError = cancelled ? undefined : String(e)
      task.nextRun = task.enabled ? calculateNextRun(task) : undefined
      saveTasks()
    }

    return { success: false, error: String(e) }
  }
}

// 启动任务调度
function startTaskScheduler(taskId: string): void {
  const task = tasks.get(taskId)
  if (!task) return

  // 清除已有的定时器
  if (task.timer) {
    clearInterval(task.timer)
    task.timer = undefined
  }

  if (!task.enabled) return

  // 计算下次执行时间
  task.nextRun = task.enabled ? calculateNextRun(task) : undefined

  if (task.schedule.type === 'interval' && task.schedule.intervalMinutes) {
    const intervalMs = task.schedule.intervalMinutes * 60 * 1000
    task.timer = setInterval(() => {
      executeTask(taskId)
    }, intervalMs)
  } else {
    // 对于 cron 和 preset，使用 setTimeout 模拟
    const checkInterval = setInterval(() => {
      const now = new Date()
      if (task.nextRun && new Date(task.nextRun) <= now) {
        executeTask(taskId)
        task.nextRun = calculateNextRun(task)
      }
    }, 60 * 1000) // 每分钟检查一次

    task.timer = checkInterval
  }

  logger.info('ScheduledTasks', `Started scheduler for: ${task.name}`)
}

// 停止任务调度
function stopTaskScheduler(taskId: string): void {
  const task = tasks.get(taskId)
  if (!task) return

  task.controller?.abort()
  task.controller = undefined

  if (task.timer) {
    clearInterval(task.timer as unknown as number)
    task.timer = undefined
  }

  logger.info('ScheduledTasks', `Stopped scheduler for: ${task.name}`)
}

// 获取所有任务
function getAll(): ScheduledTask[] {
  return Array.from(tasks.values()).map((t) => ({
    id: t.id,
    name: t.name,
    type: t.type,
    schedule: t.schedule,
    config: t.config,
    enabled: t.enabled,
    lastRun: t.lastRun,
    nextRun: t.nextRun,
    status: t.status,
    lastError: t.lastError,
    createdAt: t.createdAt,
  }))
}

// 获取单个任务
function getTask(taskId: string): ScheduledTask | undefined {
  const task = tasks.get(taskId)
  if (!task) return undefined

  return {
    id: task.id,
    name: task.name,
    type: task.type,
    schedule: task.schedule,
    config: task.config,
    enabled: task.enabled,
    lastRun: task.lastRun,
    nextRun: task.nextRun,
    status: task.status,
    lastError: task.lastError,
    createdAt: task.createdAt,
  }
}

// 添加任务
function addTask(taskConfig: ScheduledTaskInput): ScheduledTask {
  const task: ScheduledTaskInstance = {
    ...taskConfig,
    enabled: taskConfig.enabled ?? true,
    id: crypto.randomUUID(),
    status: 'idle',
    createdAt: new Date().toISOString(),
  }

  tasks.set(task.id, task)
  saveTasks()

  if (task.enabled) {
    startTaskScheduler(task.id)
  }

  return task
}

// 更新任务
function updateTask(taskId: string, updates: Partial<ScheduledTask>): ScheduledTask | null {
  const task = tasks.get(taskId)
  if (!task) return null

  // 如果更新了启用状态或调度配置，需要重启调度器
  const needsRestart =
    (updates.enabled !== undefined && updates.enabled !== task.enabled) || updates.schedule !== undefined

  if (needsRestart && task.enabled) {
    stopTaskScheduler(taskId)
  }

  Object.assign(task, updates)

  if (needsRestart && task.enabled) {
    startTaskScheduler(task.id)
  }

  task.nextRun = task.enabled ? calculateNextRun(task) : undefined
  saveTasks()

  return task
}

// 删除任务
function removeTask(taskId: string): boolean {
  const task = tasks.get(taskId)
  if (!task) return false

  stopTaskScheduler(taskId)
  tasks.delete(taskId)
  saveTasks()

  return true
}

// 手动触发任务
function triggerTask(taskId: string): boolean {
  const task = tasks.get(taskId)
  if (!task || task.status === 'running') return false

  executeTask(taskId)
  return true
}

function cancelTask(taskId: string): boolean {
  const task = tasks.get(taskId)
  if (!task?.controller) return false
  task.controller.abort()
  return true
}

// 初始化调度器
async function initScheduler(): Promise<void> {
  for (const taskId of tasks.keys()) stopTaskScheduler(taskId)
  tasks.clear()

  const loadedTasks = loadTasks()

  for (const taskData of loadedTasks) {
    const restoredTask: ScheduledTaskInstance = {
      ...taskData,
      status: taskData.status === 'running' ? 'idle' : taskData.status,
      nextRun: undefined,
    }
    tasks.set(restoredTask.id, restoredTask)
    if (restoredTask.enabled) {
      startTaskScheduler(restoredTask.id)
    }
  }

  saveTasks()

  logger.info('ScheduledTasks', `Initialized ${tasks.size} scheduled tasks`)
}

const initializeScheduler = initScheduler

// 关闭调度器
function shutdownScheduler(): void {
  for (const taskId of tasks.keys()) {
    stopTaskScheduler(taskId)
  }
  logger.info('ScheduledTasks', 'Shutdown complete')
}

// 注册 IPC handlers
export function registerScheduledTasksHandlers(_windowsManager?: WindowsManager) {
  if (_windowsManager) {
    executeContext.windowsManager = _windowsManager
  }
  ipcMain.handle('scheduled-tasks:get-all', async () => {
    return getAll()
  })

  ipcMain.handle('scheduled-tasks:get', async (_event, taskId: string) => {
    return getTask(taskId)
  })

  ipcMain.handle('scheduled-tasks:add', async (_event, taskConfig: ScheduledTaskInput) => {
    const windowInfo = _windowsManager?.getWindowInfoForContents(_event.sender)
    const config = windowInfo
      ? { ...taskConfig, config: { ...taskConfig.config, vaultPath: windowInfo.vaultDirectoryForWindow } }
      : taskConfig
    return addTask(config)
  })

  ipcMain.handle('scheduled-tasks:update', async (_event, taskId: string, updates: Partial<ScheduledTask>) => {
    return updateTask(taskId, updates)
  })

  ipcMain.handle('scheduled-tasks:remove', async (_event, taskId: string) => {
    return { success: removeTask(taskId) }
  })

  ipcMain.handle('scheduled-tasks:trigger', async (_event, taskId: string) => {
    return { success: triggerTask(taskId) }
  })

  ipcMain.handle('scheduled-tasks:cancel', async (_event, taskId: string) => {
    return { success: cancelTask(taskId) }
  })

  ipcMain.handle('scheduled-tasks:enable', async (_event, taskId: string) => {
    return updateTask(taskId, { enabled: true })
  })

  ipcMain.handle('scheduled-tasks:disable', async (_event, taskId: string) => {
    return updateTask(taskId, { enabled: false })
  })

  logger.info('ScheduledTasks', 'IPC handlers registered')
}

export {
  type ScheduleConfig,
  parseCron,
  calculateNextRun,
  getAll,
  getTask,
  addTask,
  updateTask,
  removeTask,
  triggerTask,
  cancelTask,
  initScheduler,
  initializeScheduler,
  shutdownScheduler,
  startTaskScheduler,
  stopTaskScheduler,
}
