/* eslint-disable class-methods-use-this */
import chokidar from 'chokidar'
import { BrowserWindow, WebContents, screen, shell } from 'electron'
import Store from 'electron-store'

import { StoreSchema, StoreKeys } from '../electron-store/storeConfig'
import LanceDBTableWrapper from '../vector-database/lanceTableWrapper'

type WindowInfo = {
  windowID: number
  dbTableClient: LanceDBTableWrapper
  vaultDirectoryForWindow: string
}

class WindowsManager {
  activeWindows: WindowInfo[] = []

  private errorStringsToSendWindow: string[] = []

  private windowsPreparingToClose = new Set<number>()

  private closeFallbacks = new Map<number, ReturnType<typeof setTimeout>>()

  private vaultSwitchHandler?: (webContents: WebContents, directory: string) => Promise<void>

  private watchers = new Map<number, chokidar.FSWatcher>()

  async createWindow(store: Store<StoreSchema>, preload: string, url: string | undefined, indexHtml: string) {
    const { x, y } = this.getNextWindowPosition()
    const { width, height } = this.getWindowSize()

    const win = new BrowserWindow({
      title: 'Reor',
      x,
      y,
      webPreferences: {
        preload,
      },
      frame: false,
      titleBarStyle: 'hidden',
      titleBarOverlay: {
        color: '#303030',
        symbolColor: '#fff',
        height: 36,
      },
      width,
      height,
    })

    if (url) {
      // electron-vite-vue#298
      win.loadURL(url)
      // Open devTool if the app is not packaged
      win.webContents.openDevTools()
    } else {
      win.loadFile(indexHtml)
    }

    // Make all links open with the browser, not with the application
    win.webContents.setWindowOpenHandler(({ url: _url }) => {
      if (_url.startsWith('https:')) shell.openExternal(_url)
      return { action: 'deny' }
    })

    win.on('close', (event) => {
      if (this.windowsPreparingToClose.has(win.id)) return

      event.preventDefault()
      this.windowsPreparingToClose.add(win.id)
      win.webContents.send('prepare-for-window-close')
      const fallback = setTimeout(() => {
        this.closeFallbacks.delete(win.id)
        if (!win.isDestroyed() && this.windowsPreparingToClose.has(win.id)) {
          this.closeWindowAfterSave(win.webContents, store).catch(() => undefined)
        }
      }, 10000)
      this.closeFallbacks.set(win.id, fallback)
      fallback.unref()
    })

    win.webContents.on('did-finish-load', () => {
      const errorsToSendWindow = this.getAndClearErrorStrings()
      errorsToSendWindow.forEach((errorStrToSendWindow) => {
        win.webContents.send('error-to-display-in-window', errorStrToSendWindow)
      })
    })
  }

  getAndSetupDirectoryForWindowFromPreviousAppSession(
    webContents: Electron.WebContents,
    store: Store<StoreSchema>,
  ): string {
    const lastUsedVaultDirectory = store.get(StoreKeys.DirectoryFromPreviousSession) as string
    if (!lastUsedVaultDirectory) {
      return ''
    }
    const isUserDirectoryUsed = this.activeWindows.some((w) => w.vaultDirectoryForWindow === lastUsedVaultDirectory)
    if (!isUserDirectoryUsed) {
      this.setVaultDirectoryForContents(webContents, lastUsedVaultDirectory, store)
      return lastUsedVaultDirectory
    }
    return ''
  }

  setVaultSwitchHandler(handler: (webContents: WebContents, directory: string) => Promise<void>): void {
    this.vaultSwitchHandler = handler
  }

  async handleVaultSwitch(webContents: WebContents, directory: string): Promise<void> {
    if (this.vaultSwitchHandler) {
      await this.vaultSwitchHandler(webContents, directory)
    }
  }

  async closeWindowAfterSave(webContents: WebContents, store?: Store<StoreSchema>): Promise<void> {
    const win = BrowserWindow.fromWebContents(webContents)
    if (!win) return

    try {
      if (store) await this.prepareWindowForClose(store, win)
    } finally {
      const fallback = this.closeFallbacks.get(win.id)
      if (fallback) clearTimeout(fallback)
      this.closeFallbacks.delete(win.id)
      this.windowsPreparingToClose.delete(win.id)
      if (!win.isDestroyed()) win.destroy()
    }
  }

  appendNewErrorToDisplayInWindow(errorString: string) {
    let errorSent = false
    const activeWindows = BrowserWindow.getAllWindows()
    activeWindows.forEach((window) => {
      if (!window.webContents.isLoading()) {
        window.webContents.send('error-to-display-in-window', errorString)
        errorSent = true
      }
    })

    if (!errorSent) {
      this.errorStringsToSendWindow.push(errorString)
    }
  }

  getAndClearErrorStrings(): string[] {
    const errorStrings = this.errorStringsToSendWindow
    this.errorStringsToSendWindow = []
    return errorStrings
  }

  getBrowserWindowId(webContents: WebContents): number | null {
    const browserWindow = BrowserWindow.fromWebContents(webContents)
    return browserWindow ? browserWindow.id : null
  }

  getWatcherForContents(webContents: WebContents): chokidar.FSWatcher | undefined {
    const windowID = this.getBrowserWindowId(webContents)
    return windowID === null ? undefined : this.watchers.get(windowID)
  }

  async replaceWatcherForContents(webContents: WebContents, watcher: chokidar.FSWatcher | undefined): Promise<void> {
    const windowID = this.getBrowserWindowId(webContents)
    if (windowID === null) return

    const previousWatcher = this.watchers.get(windowID)
    if (previousWatcher && previousWatcher !== watcher) await previousWatcher.close()

    if (watcher) this.watchers.set(windowID, watcher)
    else this.watchers.delete(windowID)
  }

  async closeWatcherForContents(webContents: WebContents): Promise<void> {
    await this.replaceWatcherForContents(webContents, undefined)
  }

  getWindowInfoForContents(webContents: WebContents): WindowInfo | null {
    const windowID = this.getBrowserWindowId(webContents)

    if (windowID === null) {
      return null
    }

    const windowInfo = this.activeWindows.find((w) => w.windowID === windowID)
    return windowInfo || null
  }

  getVaultDirectoryForWinContents(webContents: WebContents): string | null {
    const windowID = this.getBrowserWindowId(webContents)
    return windowID !== null ? this.getVaultDirectoryForWindowID(windowID) : null
  }

  private getVaultDirectoryForWindowID(windowID: number): string | null {
    const windowInfo = this.activeWindows.find((w) => w.windowID === windowID)
    return windowInfo ? windowInfo.vaultDirectoryForWindow : null
  }

  setVaultDirectoryForContents(webContents: WebContents, directory: string, store: Store<StoreSchema>): void {
    if (!webContents) {
      throw new Error('Invalid webContents provided.')
    }

    const windowID = this.getBrowserWindowId(webContents)
    if (!windowID) {
      throw new Error('Unable to find the browser window ID.')
    }

    if (!directory || typeof directory !== 'string') {
      throw new Error('Invalid directory provided.')
    }

    let windowInfo = this.activeWindows.find((w) => w.windowID === windowID)

    if (!windowInfo) {
      windowInfo = {
        windowID,
        dbTableClient: new LanceDBTableWrapper(), // Assuming default value as null, modify as needed
        vaultDirectoryForWindow: directory,
      }
      this.activeWindows.push(windowInfo)
    } else {
      windowInfo.vaultDirectoryForWindow = directory
    }

    store.set(StoreKeys.DirectoryFromPreviousSession, directory)
  }

  async prepareWindowForClose(store: Store<StoreSchema>, win: BrowserWindow): Promise<void> {
    const directoryToSave = this.getVaultDirectoryForWinContents(win.webContents)

    // Save the directory if found
    if (directoryToSave) {
      store.set(StoreKeys.DirectoryFromPreviousSession, directoryToSave)
      await this.closeWatcherForContents(win.webContents)
      this.removeActiveWindow(win.id)
    }
  }

  removeActiveWindow(windowID: number): void {
    this.activeWindows = this.activeWindows.filter((w) => w.windowID !== windowID)
  }

  getNextWindowPosition(): { x: number | undefined; y: number | undefined } {
    const windowOffset = 30 // Offset for each new window
    const focusedWin = BrowserWindow.getFocusedWindow()

    if (focusedWin) {
      const [x, y] = focusedWin.getPosition()
      return { x: x + windowOffset, y: y + windowOffset }
    }
    return { x: undefined, y: undefined }
  }

  getWindowSize(): { width: number; height: number } {
    const primaryDisplay = screen.getPrimaryDisplay()
    const { width, height } = primaryDisplay.workAreaSize

    const windowWidth = Math.min(1200, width * 0.8) // e.g., 80% of screen width or 1200px
    const windowHeight = Math.min(800, height * 0.8) // e.g., 80% of screen height or 800px

    return { width: windowWidth, height: windowHeight }
  }
}

export default WindowsManager
