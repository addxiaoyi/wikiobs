import * as fs from 'fs'
import * as path from 'path'

import { ipcMain, dialog, app } from 'electron'
import Store from 'electron-store'

import WindowsManager from '../common/windowManager'
import { StoreSchema } from '../electron-store/storeConfig'
import { handleFileRename, updateFileInTable } from '../vector-database/tableHelperFunctions'

import { GetFilesInfoTree, createFileRecursive, isHidden, GetFilesInfoListForListOfPaths } from './filesystem'
import { FileInfoTree, WriteFileProps, RenameFileProps, FileInfoWithContent } from './types'
import ImageStorage from './storage/ImageStore'
import VideoStorage from './storage/VideoStore'
import { resolveExistingVaultPath } from './pathGuard'
import { notifyPluginHook } from '../plugin-system'

const imageStorage = new ImageStorage(app.getPath('userData'))
const videoStorage = new VideoStorage(app.getPath('userData'))

const registerFileHandlers = (store: Store<StoreSchema>, _windowsManager: WindowsManager) => {
  const windowsManager = _windowsManager
  ipcMain.handle('get-files-tree-for-window', async (event): Promise<FileInfoTree> => {
    const directoryPath = windowsManager.getVaultDirectoryForWinContents(event.sender)
    if (!directoryPath) return []

    const files: FileInfoTree = GetFilesInfoTree(directoryPath)
    return files
  })

  ipcMain.handle('read-file', async (event, filePath, encoding = 'utf-8') => {
    const vaultDirectory = windowsManager.getVaultDirectoryForWinContents(event.sender)
    if (!vaultDirectory) throw new Error('No vault is selected.')
    const safePath = resolveExistingVaultPath(vaultDirectory, filePath)
    const data = await fs.promises.readFile(safePath, encoding)
    return data
  })

  ipcMain.handle('check-file-exists', async (event, filePath) => {
    const vaultDirectory = windowsManager.getVaultDirectoryForWinContents(event.sender)
    if (!vaultDirectory) return false
    try {
      const safePath = resolveExistingVaultPath(vaultDirectory, filePath)
      await fs.promises.access(safePath, fs.constants.F_OK)
      return true
    } catch (error) {
      return false
    }
  })

  ipcMain.handle('delete-file', async (event, filePath: string): Promise<void> => {
    const windowInfo = windowsManager.getWindowInfoForContents(event.sender)
    if (!windowInfo) {
      throw new Error('Window info not found.')
    }

    const safePath = resolveExistingVaultPath(windowInfo.vaultDirectoryForWindow, filePath)
    let stats: fs.Stats
    try {
      stats = await fs.promises.stat(safePath)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return
      throw new Error(`Failed to inspect file for deletion: ${error}`)
    }

    try {
      const indexedPaths = stats.isDirectory()
        ? GetFilesInfoListForListOfPaths([safePath]).map((file) => file.path)
        : [safePath]
      if (stats.isDirectory()) {
        await fs.promises.rm(safePath, { recursive: true, force: true })
      } else {
        await fs.promises.unlink(safePath)
      }
      if (indexedPaths.length > 0) {
        await windowInfo.dbTableClient.deleteDBItemsByFilePaths(indexedPaths)
      }
    } catch (error) {
      throw new Error(`Failed to delete ${filePath}: ${error}`)
    }
  })

  ipcMain.handle('write-file', async (event, writeFileProps: WriteFileProps) => {
    const vaultDirectory = windowsManager.getVaultDirectoryForWinContents(event.sender)
    if (!vaultDirectory) throw new Error('No vault is selected.')
    const safePath = resolveExistingVaultPath(vaultDirectory, writeFileProps.filePath)
    if (!fs.existsSync(path.dirname(safePath))) {
      fs.mkdirSync(path.dirname(safePath), {
        recursive: true,
      })
    }
    fs.writeFileSync(safePath, writeFileProps.content, 'utf-8')
    await notifyPluginHook('note:saved', {
      path: safePath,
      content: writeFileProps.content,
      vaultPath: vaultDirectory,
    })
  })

  ipcMain.handle('store-image', async (event, imageData: string, originalName: string, blockID: string) => {
    try {
      const localURL = await imageStorage.storeMedia(imageData, originalName, blockID)
      return localURL
    } catch (error) {
      throw new Error(`Failed to store image: ${error}`)
    }
  })

  ipcMain.handle('delete-image', async (event, fileName: string) => {
    try {
      await imageStorage.deleteMedia(fileName)
      return true
    } catch (error) {
      throw new Error(`Failed to delete image: ${error}`)
    }
  })

  ipcMain.handle('get-image', async (event, fileName) => {
    try {
      const imageData = await imageStorage.getMedia(fileName)
      return imageData
    } catch (error) {
      throw new Error(`Failed to get image: ${error}`)
    }
  })

  ipcMain.handle('store-video', async (event, videoData, originalName, blockId) => {
    try {
      const localURL = await videoStorage.storeMedia(videoData, originalName, blockId)
      return localURL
    } catch (error) {
      throw new Error(`Failed to store video: ${error}`)
    }
  })

  ipcMain.handle('get-video', async (event, fileName) => {
    try {
      const videoData = await videoStorage.getMedia(fileName)
      return videoData
    } catch (error) {
      throw new Error(`Failed to get video: ${error}`)
    }
  })

  ipcMain.handle('is-directory', (event, filepath: string) => {
    const vaultDirectory = windowsManager.getVaultDirectoryForWinContents(event.sender)
    if (!vaultDirectory) return false
    return fs.statSync(resolveExistingVaultPath(vaultDirectory, filepath)).isDirectory()
  })

  ipcMain.handle('rename-file', async (event, renameFileProps: RenameFileProps) => {
    const windowInfo = windowsManager.getWindowInfoForContents(event.sender)

    if (!windowInfo) {
      throw new Error('Window info not found.')
    }

    await handleFileRename(
      windowsManager,
      windowInfo,
      {
        oldFilePath: resolveExistingVaultPath(windowInfo.vaultDirectoryForWindow, renameFileProps.oldFilePath),
        newFilePath: resolveExistingVaultPath(windowInfo.vaultDirectoryForWindow, renameFileProps.newFilePath),
      },
      event.sender,
    )
  })

  ipcMain.handle('index-file-in-database', async (event, filePath: string) => {
    const windowInfo = windowsManager.getWindowInfoForContents(event.sender)
    if (!windowInfo) {
      throw new Error('Window info not found.')
    }
    await updateFileInTable(
      windowInfo.dbTableClient,
      resolveExistingVaultPath(windowInfo.vaultDirectoryForWindow, filePath),
    )
  })

  ipcMain.handle('create-file', async (event, filePath: string, content: string): Promise<void> => {
    const vaultDirectory = windowsManager.getVaultDirectoryForWinContents(event.sender)
    if (!vaultDirectory) throw new Error('No vault is selected.')
    const safePath = resolveExistingVaultPath(vaultDirectory, filePath)
    createFileRecursive(safePath, content, 'utf-8')
    await notifyPluginHook('note:created', { path: safePath, content, vaultPath: vaultDirectory })
  })

  ipcMain.handle('create-directory', async (event, dirPath: string): Promise<void> => {
    const vaultDirectory = windowsManager.getVaultDirectoryForWinContents(event.sender)
    if (!vaultDirectory) throw new Error('No vault is selected.')
    dirPath = resolveExistingVaultPath(vaultDirectory, dirPath)
    const mkdirRecursiveSync = (_dirPath: string) => {
      const parentDir = path.dirname(_dirPath)
      if (!fs.existsSync(parentDir)) {
        mkdirRecursiveSync(parentDir)
      }
      if (!fs.existsSync(_dirPath)) {
        fs.mkdirSync(_dirPath)
      }
    }

    if (!fs.existsSync(dirPath)) {
      mkdirRecursiveSync(dirPath)
    }
  })

  ipcMain.handle('get-files', async (event, filePaths: string[]): Promise<FileInfoWithContent[]> => {
    const vaultDirectory = windowsManager.getVaultDirectoryForWinContents(event.sender)
    if (!vaultDirectory) return []
    const safePaths = filePaths.map((filePath) => resolveExistingVaultPath(vaultDirectory, filePath))
    const fileItems = GetFilesInfoListForListOfPaths(safePaths)
    const fileContents = fileItems.map((fileItem) => fs.readFileSync(fileItem.path, 'utf-8'))
    return fileItems.map((fileItem, index) => ({ ...fileItem, content: fileContents[index] }))
  })

  ipcMain.handle('get-files-in-directory', (event, dirName: string) => {
    const vaultDirectory = windowsManager.getVaultDirectoryForWinContents(event.sender)
    if (!vaultDirectory) return []
    const itemsInDir = fs
      .readdirSync(resolveExistingVaultPath(vaultDirectory, dirName))
      .filter((item) => !isHidden(item))
    return itemsInDir
  })

  ipcMain.handle('open-directory-dialog', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
    })
    if (!result.canceled) {
      return result.filePaths
    }
    return null
  })

  ipcMain.handle('open-file-dialog', async (event, extensions) => {
    const filters = extensions && extensions.length > 0 ? [{ name: 'Files', extensions }] : []

    const result = await dialog.showOpenDialog({
      properties: ['openFile', 'multiSelections', 'showHiddenFiles'], // Add 'showHiddenFiles' here
      filters,
    })

    if (!result.canceled) {
      return result.filePaths
    }
    return []
  })

  // Similar to open-file-dialog except it filters out non-images
  ipcMain.handle('open-img-file-dialog', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['jpg', 'png', 'gif'] }],
    })
    return result.filePaths
  })

  // Similar to open-file-dialog except it filters out non-videos
  ipcMain.handle('open-video-file-dialog', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Videos', extensions: ['mp4', 'mkv'] }],
    })
    return result.filePaths
  })
}

export default registerFileHandlers
