import * as path from 'path'

import { app, BrowserWindow, ipcMain } from 'electron'
import Store from 'electron-store'
import * as lancedb from 'vectordb'

import WindowsManager from '../common/windowManager'
import { getDefaultEmbeddingModelConfig } from '../electron-store/ipcHandlers'
import { StoreSchema } from '../electron-store/storeConfig'
import { startWatchingDirectory, updateFileListForRenderer } from '../filesystem/filesystem'

import { rerankSearchedEmbeddings } from './embeddings'
import { DBEntry, DatabaseFields } from './schema'
import { updateFileInTable } from './tableHelperFunctions'
import { incrementalIndex } from '../incremental-indexer'

export interface PromptWithRagResults {
  ragPrompt: string
  uniqueFilesReferenced: string[]
}

export interface BasePromptRequirements {
  query: string
  llmName: string
  filePathToBeUsedAsContext?: string
}

export const registerDBSessionHandlers = (store: Store<StoreSchema>, _windowManager: WindowsManager) => {
  let dbConnection: lancedb.Connection
  const windowManager = _windowManager
  const databaseInitializationByWindow = new Map<number, Promise<void>>()

  const initializeWindowDatabase = async (webContents: Electron.WebContents, vaultPath: string): Promise<void> => {
    const windowId = webContents.id
    const previousInitialization = databaseInitializationByWindow.get(windowId) ?? Promise.resolve()
    const currentInitialization = previousInitialization.then(() => initializeWindowDatabaseNow(webContents, vaultPath))
    databaseInitializationByWindow.set(windowId, currentInitialization)

    try {
      await currentInitialization
    } finally {
      if (databaseInitializationByWindow.get(windowId) === currentInitialization) {
        databaseInitializationByWindow.delete(windowId)
      }
    }
  }

  const initializeWindowDatabaseNow = async (webContents: Electron.WebContents, vaultPath: string) => {
    const windowInfo = windowManager.getWindowInfoForContents(webContents)
    if (!windowInfo) throw new Error('No window info found')

    const defaultEmbeddingModelConfig = getDefaultEmbeddingModelConfig(store)
    const dbPath = path.join(app.getPath('userData'), 'vectordb')
    dbConnection = await lancedb.connect(dbPath)
    await windowInfo.dbTableClient.initialize(dbConnection, vaultPath, defaultEmbeddingModelConfig)
    await incrementalIndex(vaultPath, windowInfo.dbTableClient, app.getPath('userData'), (current, total) => {
      webContents.send('indexing-progress', total > 0 ? current / total : 0)
    })

    const win = BrowserWindow.fromWebContents(webContents)
    if (win) {
      const watcher = startWatchingDirectory(win, vaultPath, async (eventType, filePath) => {
        if (eventType === 'removed') {
          await windowInfo.dbTableClient.deleteDBItemsByFilePaths([filePath])
        } else {
          await updateFileInTable(windowInfo.dbTableClient, filePath)
        }
      })
      await windowManager.replaceWatcherForContents(webContents, watcher)
      updateFileListForRenderer(win, vaultPath)
    }
    webContents.send('indexing-progress', 1)
  }

  windowManager.setVaultSwitchHandler(async (webContents, vaultPath) => {
    await initializeWindowDatabase(webContents, vaultPath)
  })

  ipcMain.handle('search', async (event, query: string, limit: number, filter?: string): Promise<DBEntry[]> => {
    const windowInfo = windowManager.getWindowInfoForContents(event.sender)
    if (!windowInfo) {
      throw new Error('Window info not found.')
    }
    const searchResults = await windowInfo.dbTableClient.search(query, limit, filter)
    return searchResults
  })

  ipcMain.handle('index-files-in-directory', async (event) => {
    const windowInfo = windowManager.getWindowInfoForContents(event.sender)
    if (!windowInfo) {
      throw new Error('No window info found')
    }

    await initializeWindowDatabase(event.sender, windowInfo.vaultDirectoryForWindow)
  })

  ipcMain.handle(
    'search-with-reranking',
    async (event, query: string, limit: number, filter?: string): Promise<DBEntry[]> => {
      const windowInfo = windowManager.getWindowInfoForContents(event.sender)
      if (!windowInfo) {
        throw new Error('Window info not found.')
      }
      const searchResults = await windowInfo.dbTableClient.search(query, limit, filter)

      const rankedResults = await rerankSearchedEmbeddings(query, searchResults)
      return rankedResults
    },
  )

  ipcMain.handle('get-database-fields', () => DatabaseFields)
}
