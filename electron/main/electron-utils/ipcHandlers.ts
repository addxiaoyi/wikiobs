import { app, ipcMain, shell } from 'electron'
import Store from 'electron-store'

import WindowsManager from '../common/windowManager'
import { StoreSchema } from '../electron-store/storeConfig'

const registerElectronUtilsHandlers = (
  store: Store<StoreSchema>,
  windowsManager: WindowsManager,
  preload: string,
  url: string | undefined,
  indexHtml: string,
) => {
  ipcMain.handle('open-external', async (_event, rawUrl: string) => {
    if (typeof rawUrl !== 'string') throw new Error('A URL is required.')
    let parsed: URL
    try {
      parsed = new URL(rawUrl)
    } catch {
      throw new Error('Only valid web URLs can be opened.')
    }
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      throw new Error('Only http and https URLs can be opened.')
    }
    await shell.openExternal(parsed.toString())
  })

  ipcMain.handle('get-platform', async () => process.platform)

  ipcMain.handle('open-new-window', () => {
    windowsManager.createWindow(store, preload, url, indexHtml)
  })

  ipcMain.handle('get-reor-app-version', async () => app.getVersion())

  ipcMain.handle('get-user-data-path', () => {
    return app.getPath('userData')
  })
}

export default registerElectronUtilsHandlers
