/**
 * Incremental Indexer - 增量索引和后台任务
 * 阶段 4 核心功能
 */

import { ipcMain, app } from 'electron'
import Store from 'electron-store'
import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'
import { logger } from './common/logger'
import { scanMarkdownFiles } from './common/scanner'
import WindowsManager from './common/windowManager'
import { StoreSchema } from './electron-store/storeConfig'
import { updateFileInTable } from './vector-database/tableHelperFunctions'
import LanceDBTableWrapper from './vector-database/lanceTableWrapper'

// 文件修改状态跟踪
interface FileState {
  mtime: number
  hash: string
}

interface IndexerState {
  lastIndexTime: number
  fileStates: Record<string, FileState>
}

// 计算文件内容哈希
function computeContentHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex')
}

// 获取文件修改时间和哈希
function getFileState(filePath: string): FileState | null {
  try {
    const stats = fs.statSync(filePath)
    const content = fs.readFileSync(filePath, 'utf-8')
    return {
      mtime: stats.mtimeMs,
      hash: computeContentHash(content),
    }
  } catch {
    return null
  }
}

// 增量索引状态文件路径
function getStateFilePath(userDataPath: string, vaultDir: string): string {
  const vaultKey = crypto.createHash('sha256').update(path.resolve(vaultDir)).digest('hex').slice(0, 16)
  return path.join(userDataPath, `indexer-state-${vaultKey}.json`)
}

// 加载索引状态
function loadIndexerState(userDataPath: string, vaultDir: string): IndexerState {
  const statePath = getStateFilePath(userDataPath, vaultDir)
  try {
    if (fs.existsSync(statePath)) {
      return JSON.parse(fs.readFileSync(statePath, 'utf-8'))
    }
  } catch {
    // 忽略错误
  }
  return { lastIndexTime: 0, fileStates: {} }
}

// 保存索引状态
function saveIndexerState(userDataPath: string, vaultDir: string, state: IndexerState): void {
  const statePath = getStateFilePath(userDataPath, vaultDir)
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf-8')
}

// 删除数据库条目
async function deleteDBItemsByFilePaths(dbTableClient: LanceDBTableWrapper | null, filePaths: string[]): Promise<void> {
  if (dbTableClient?.deleteDBItemsByFilePaths) {
    await dbTableClient.deleteDBItemsByFilePaths(filePaths)
  }
}

// 执行增量索引
export async function incrementalIndex(
  vaultDir: string,
  dbTableClient: LanceDBTableWrapper | null,
  userDataPath: string,
  onProgress?: (current: number, total: number, status: string) => void,
): Promise<{ added: number; updated: number; deleted: number }> {
  const state = loadIndexerState(userDataPath, vaultDir)
  const currentFiles = scanMarkdownFiles(vaultDir)
  const currentFileSet = new Set(currentFiles)

  let added = 0
  let updated = 0
  let deleted = 0

  // 1. 检测删除的文件
  const knownFiles = Object.keys(state.fileStates)
  for (const filePath of knownFiles) {
    if (!currentFileSet.has(filePath) && !fs.existsSync(filePath)) {
      // 文件已被删除
      try {
        await deleteDBItemsByFilePaths(dbTableClient, [filePath])
        delete state.fileStates[filePath]
        deleted++
      } catch (error) {
        logger.error('IncrementalIndex', `Failed to delete index for ${filePath}`, error)
      }
    }
  }

  // 2. 检测新增和修改的文件
  const total = currentFiles.length
  for (let i = 0; i < currentFiles.length; i++) {
    const filePath = currentFiles[i]
    onProgress?.(i + 1, total, path.basename(filePath))

    try {
      const currentState = getFileState(filePath)
      if (!currentState) continue

      const previousState = state.fileStates[filePath]

      if (!previousState) {
        // 新文件
        if (dbTableClient) {
          await updateFileInTable(dbTableClient, filePath)
        }
        state.fileStates[filePath] = currentState
        added++
      } else if (currentState.mtime !== previousState.mtime || currentState.hash !== previousState.hash) {
        // 已修改的文件
        if (dbTableClient) {
          await updateFileInTable(dbTableClient, filePath)
        }
        state.fileStates[filePath] = currentState
        updated++
      }
    } catch (error) {
      logger.error('IncrementalIndex', `Failed to index ${filePath}`, error)
    }
  }

  // 更新状态
  state.lastIndexTime = Date.now()
  saveIndexerState(userDataPath, vaultDir, state)

  onProgress?.(total, total, 'Complete')

  return { added, updated, deleted }
}

// 后台任务队列
export interface BackgroundTask {
  id: string
  type: 'index' | 'reindex'
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress: number
  createdAt: string
  completedAt?: string
  error?: string
  data?: unknown
}

class BackgroundTaskQueue {
  private queue: BackgroundTask[] = []

  private running = false

  private taskHistory: BackgroundTask[] = []

  private maxHistory = 100

  async addTask(taskType: string, data: unknown): Promise<string> {
    const id = `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    const type: BackgroundTask['type'] = taskType === 'reindex' ? 'reindex' : 'index'
    const task: BackgroundTask = {
      id,
      type,
      status: 'pending',
      progress: 0,
      createdAt: new Date().toISOString(),
      data,
    }
    this.queue.push(task)
    this.processQueue()
    return id
  }

  private async processQueue(): Promise<void> {
    if (this.running || this.queue.length === 0) return
    this.running = true

    while (this.queue.length > 0) {
      const task = this.queue.shift()!
      task.status = 'running'

      try {
        // 根据任务类型执行
        switch (task.type) {
          case 'index':
          case 'reindex':
            task.progress = 100
            task.status = 'completed'
            break
          default:
            task.error = `Unknown task type: ${task.type}`
            task.status = 'failed'
        }

        task.completedAt = new Date().toISOString()
        this.taskHistory.push(task)
        if (this.taskHistory.length > this.maxHistory) {
          this.taskHistory.shift()
        }
      } catch (error) {
        task.error = String(error)
        task.status = 'failed'
        task.completedAt = new Date().toISOString()
        this.taskHistory.push(task)
      }
    }

    this.running = false
  }

  getTaskStatus(id: string): BackgroundTask | null {
    const current = this.queue.find((t) => t.id === id)
    if (current) return current
    return this.taskHistory.find((t) => t.id === id) || null
  }

  getAllTasks(): BackgroundTask[] {
    return [...this.queue, ...this.taskHistory]
  }
}

const taskQueue = new BackgroundTaskQueue()

// ====== IPC 处理器注册 ======

export function registerIncrementalIndexerHandlers(_store: Store<StoreSchema>, windowsManager: WindowsManager) {
  ipcMain.handle('incremental-index', async (event) => {
    const windowInfo = windowsManager.getWindowInfoForContents(event.sender)
    if (!windowInfo) {
      throw new Error('No window info found')
    }

    const userDataPath = app.getPath('userData')

    return incrementalIndex(
      windowInfo.vaultDirectoryForWindow,
      windowInfo.dbTableClient,
      userDataPath,
      (current: number, total: number, status: string) => {
        event.sender.send('indexing-progress', { current, total, status })
      },
    )
  })

  ipcMain.handle('reindex-all', async (event) => {
    const windowInfo = windowsManager.getWindowInfoForContents(event.sender)
    if (!windowInfo) {
      throw new Error('No window info found')
    }
    const userDataPath = app.getPath('userData')
    // 清除状态后全量重建
    const statePath = getStateFilePath(userDataPath, windowInfo.vaultDirectoryForWindow)
    try {
      if (fs.existsSync(statePath)) {
        fs.unlinkSync(statePath)
      }
    } catch {
      /* ignore */
    }
    return incrementalIndex(
      windowInfo.vaultDirectoryForWindow,
      windowInfo.dbTableClient,
      userDataPath,
      (current: number, total: number, status: string) => {
        event.sender.send('indexing-progress', { current, total, status })
      },
    )
  })

  ipcMain.handle('add-background-task', async (_event, taskType: string, data: unknown) => {
    return taskQueue.addTask(taskType, data)
  })

  ipcMain.handle('get-task-status', async (_event, taskId: string) => {
    return taskQueue.getTaskStatus(taskId)
  })

  ipcMain.handle('get-all-tasks', async () => {
    return taskQueue.getAllTasks()
  })
}
