import { release } from 'node:os'
import { join } from 'node:path'

import { app, BrowserWindow, ipcMain } from 'electron'
import Store from 'electron-store'

import * as Sentry from '@sentry/electron/main'
import errorToStringMainProcess from './common/error'
import { logger } from './common/logger'
import { registerErrorHandler } from './common/error-handler'
import WindowsManager from './common/windowManager'
import { registerStoreHandlers } from './electron-store/ipcHandlers'
import { StoreSchema } from './electron-store/storeConfig'
import registerElectronUtilsHandlers from './electron-utils/ipcHandlers'
import registerFileHandlers from './filesystem/ipcHandlers'
import { ollamaService, registerLLMSessionHandlers } from './llm/ipcHandlers'
import registerPathHandlers from './path/ipcHandlers'
import { registerDBSessionHandlers } from './vector-database/ipcHandlers'
import { registerWikiImporterHandlers } from './wiki-importer'
import { registerObsidianCompatHandlers } from './obsidian-compat'
import { registerAIOrganizationHandlers } from './ai-organization'
import { registerHybridSearchHandlers } from './hybrid-search'
import { registerIncrementalIndexerHandlers } from './incremental-indexer'
import registerKnowledgeGraphHandlers from './knowledge-graph-handlers'
import { registerScheduledTasksHandlers, initScheduler, shutdownScheduler } from './scheduled-tasks'
import { registerMultiVaultHandlers } from './multi-vault'
import { registerExportHandlers } from './export'
import { registerPluginSystemHandlers } from './plugin-system'

if (process.env.NODE_ENV === 'production') {
  Sentry.init({
    dsn: process.env.SENTRY_DSN || '',
  })
}

const store = new Store<StoreSchema>()
// store.clear() // clear store for testing CAUTION: THIS WILL DELETE YOUR CHAT HISTORY
const windowsManager = new WindowsManager()

// 初始化日志系统
logger.init(app.getPath('userData'))
logger.info('App', 'Application starting', { version: app.getVersion(), platform: process.platform })

process.env.DIST_ELECTRON = join(__dirname, '../')
process.env.DIST = join(process.env.DIST_ELECTRON, '../dist')
process.env.VITE_PUBLIC = process.env.VITE_DEV_SERVER_URL
  ? join(process.env.DIST_ELECTRON, '../public')
  : process.env.DIST

// Disable GPU Acceleration for Windows 7
if (release().startsWith('6.1')) app.disableHardwareAcceleration()

// Disable GPU acceleration for macOS 21.6
if (process.platform === 'darwin' && release().startsWith('21.6')) app.disableHardwareAcceleration()

// Set application name for Windows 10+ notifications & taskbar
app.name = 'WIKIOBS by Helstera'
if (process.platform === 'win32') app.setAppUserModelId('com.helstera.wikiobs')

if (!app.requestSingleInstanceLock()) {
  app.quit()
  process.exit(0)
}

app.on('second-instance', () => {
  const allWindows = BrowserWindow.getAllWindows()
  if (allWindows.length) {
    if (allWindows[0].isMinimized()) allWindows[0].restore()
    allWindows[0].show()
    allWindows[0].focus()
  }
})

const preload = join(__dirname, '../preload/index.js')
const url = process.env.VITE_DEV_SERVER_URL
const indexHtml = join(process.env.DIST, 'index.html')
app.whenReady().then(() => {
  windowsManager.createWindow(store, preload, url, indexHtml)

  // Local model startup can take tens of seconds. The workspace must remain usable
  // while Ollama is unavailable or still warming up.
  ollamaService.init().then(
    () => logger.info('Ollama', 'Local model service initialized'),
    (error: unknown) => logger.error('Ollama', 'Local model service failed to initialize', error),
  )

  // Initialize scheduled tasks
  initScheduler().catch((error: unknown) => logger.error('Scheduler', 'Failed to initialize scheduled tasks', error))
})

app.on('window-all-closed', () => {
  logger.info('App', 'window-all-closed event triggered')
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', async () => {
  logger.info('App', 'before-quit event triggered')
  shutdownScheduler()
  ollamaService.stop()
  logger.close()
})

app.on('activate', () => {
  const allWindows = BrowserWindow.getAllWindows()
  if (allWindows.length) {
    allWindows[0].focus()
  } else {
    windowsManager.createWindow(store, preload, url, indexHtml)
  }
})

process.on('uncaughtException', (error: Error) => {
  logger.error('App', 'Uncaught exception', error)
  windowsManager.appendNewErrorToDisplayInWindow(errorToStringMainProcess(error))
  if (process.env.NODE_ENV === 'production') {
    Sentry.captureException(error)
  }
})

process.on('unhandledRejection', (reason: unknown) => {
  logger.error('App', 'Unhandled rejection', reason instanceof Error ? reason : new Error(String(reason)))
  windowsManager.appendNewErrorToDisplayInWindow(errorToStringMainProcess(reason))
  if (process.env.NODE_ENV === 'production') {
    Sentry.captureException(reason as Error)
  }
})

// 注册所有 IPC handlers
registerLLMSessionHandlers(store)
registerDBSessionHandlers(store, windowsManager)
registerStoreHandlers(store, windowsManager)
registerFileHandlers(store, windowsManager)
registerElectronUtilsHandlers(store, windowsManager, preload, url, indexHtml)
registerPathHandlers()
registerWikiImporterHandlers(store, windowsManager)
registerObsidianCompatHandlers(windowsManager)
registerAIOrganizationHandlers(store, windowsManager)
registerHybridSearchHandlers(windowsManager)
registerIncrementalIndexerHandlers(store, windowsManager)
registerKnowledgeGraphHandlers(store, windowsManager)
registerScheduledTasksHandlers(windowsManager)
registerMultiVaultHandlers(windowsManager, store)
registerExportHandlers(windowsManager)
registerPluginSystemHandlers()

// 注册统一错误处理
ipcMain.handle('window-close-ready', async (event) => {
  await windowsManager.closeWindowAfterSave(event.sender, store)
})

registerErrorHandler()

logger.info('App', 'All IPC handlers registered successfully')
