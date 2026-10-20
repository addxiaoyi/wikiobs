import * as fs from 'fs'
import * as fsPromises from 'fs/promises'

import { BrowserWindow } from 'electron'
import { chunkMarkdownByHeadingsAndByCharsIfBig } from '../common/chunking'
import { readFile, updateFileListForRenderer, startWatchingDirectory } from '../filesystem/filesystem'
import { RenameFileProps } from '../filesystem/types'

import LanceDBTableWrapper from './lanceTableWrapper'
import WindowsManager from '../common/windowManager'

export const handleFileRename = async (
  windowsManager: WindowsManager,
  windowInfo: { vaultDirectoryForWindow: string; dbTableClient: LanceDBTableWrapper },
  renameFileProps: RenameFileProps,
  sender: Electron.WebContents,
): Promise<void> => {
  try {
    await fsPromises.access(renameFileProps.newFilePath)
    throw new Error(`A file already exists at destination: ${renameFileProps.newFilePath}`)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  }

  const win = BrowserWindow.fromWebContents(sender)
  await windowsManager.closeWatcherForContents(sender)

  const restartWatcher = () => {
    if (!win || win.isDestroyed()) return
    const watcher = startWatchingDirectory(win, windowInfo.vaultDirectoryForWindow, async (eventType, filePath) => {
      if (eventType === 'removed') {
        await windowInfo.dbTableClient.deleteDBItemsByFilePaths([filePath])
      } else {
        await updateFileInTable(windowInfo.dbTableClient, filePath)
      }
    })
    windowsManager.replaceWatcherForContents(sender, watcher)
    updateFileListForRenderer(win, windowInfo.vaultDirectoryForWindow)
  }

  try {
    await fsPromises.rename(renameFileProps.oldFilePath, renameFileProps.newFilePath)
    await windowInfo.dbTableClient.updateDBItemsWithNewFilePath(
      renameFileProps.oldFilePath,
      renameFileProps.newFilePath,
    )
  } finally {
    restartWatcher()
  }
}

export const updateFileInTable = async (dbTable: LanceDBTableWrapper, filePath: string): Promise<void> => {
  await dbTable.deleteDBItemsByFilePaths([filePath])
  const content = readFile(filePath)
  const chunkedContentList = await chunkMarkdownByHeadingsAndByCharsIfBig(content)
  const stats = fs.statSync(filePath)
  const dbEntries = chunkedContentList.map((_content, index) => ({
    notepath: filePath,
    content: _content,
    subnoteindex: index,
    timeadded: new Date(), // time now
    filemodified: stats.mtime,
    filecreated: stats.birthtime,
  }))
  await dbTable.add(dbEntries)
}

export function formatTimestampForLanceDB(date: Date): string {
  const year = date.getFullYear()
  const month = date.getMonth() + 1 // getMonth() is zero-based
  const day = date.getDate()
  const hours = date.getHours()
  const minutes = date.getMinutes()
  const seconds = date.getSeconds()

  // Pad single digits with leading zeros
  const monthPadded = month.toString().padStart(2, '0')
  const dayPadded = day.toString().padStart(2, '0')
  const hoursPadded = hours.toString().padStart(2, '0')
  const minutesPadded = minutes.toString().padStart(2, '0')
  const secondsPadded = seconds.toString().padStart(2, '0')

  return `timestamp '${year}-${monthPadded}-${dayPadded} ${hoursPadded}:${minutesPadded}:${secondsPadded}'`
}
