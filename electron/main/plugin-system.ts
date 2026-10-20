/**
 * Plugin System - 插件系统
 * 支持加载/卸载插件，提供 hooks 和 API
 */

import { ipcMain, app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import crypto from 'crypto'
import Store from 'electron-store'
import { logger } from './common/logger'

// 插件类型定义
interface PluginManifest {
  name: string
  version: string
  main: string
  description?: string
  author?: string
  permissions: string[]
  contributions?: PluginContributions
}

export interface PluginManifestPreview {
  name: string
  version: string
  main: string
  description?: string
  author?: string
  permissions: string[]
}

interface PluginContributions {
  commands?: Array<{
    id: string
    label: string
    keybinding?: string
  }>
  menus?: Array<{
    id: string
    label: string
    location: 'sidebar' | 'editor' | 'global'
  }>
  settings?: Array<{
    key: string
    type: 'string' | 'boolean' | 'number'
    default: unknown
    label: string
  }>
}

interface Plugin {
  id: string
  manifest: PluginManifest
  path: string
  enabled: boolean
  loadedAt?: string
  api?: PluginAPI
  error?: string
}

interface PluginAPI {
  storage: {
    get: (key: string) => unknown
    set: (key: string, value: unknown) => void
    delete: (key: string) => void
  }
  hooks: {
    onNoteCreated: (callback: (note: { path: string; content: string }) => void) => void
    onNoteSaved: (callback: (note: { path: string; content: string }) => void) => void
    onNoteDeleted: (callback: (note: { path: string }) => void) => void
    onVaultIndexed: (callback: () => void) => void
    onSearch: (callback: (query: string) => void) => void
  }
  events: {
    emit: (event: string, data: unknown) => void
    on: (event: string, callback: (data: unknown) => void) => void
  }
  app: {
    getVaultPath: () => string
    getNoteContent: (notePath: string) => string | null
    setNoteContent: (notePath: string, content: string) => void
    showNotification: (message: string, type?: 'info' | 'warning' | 'error') => void
  }
}

interface PluginEvent {
  name: string
  data: unknown
  timestamp: string
}

const store = new Store()
const PLUGINS_DIR = 'plugins'
const plugins: Map<string, Plugin> = new Map()
const pluginStorage: Map<string, Map<string, unknown>> = new Map()
const hookCallbacks: Map<string, Array<(data: unknown) => void | Promise<void>>> = new Map()
const eventBus: PluginEvent[] = []

// 获取插件目录
function getPluginsDir(): string {
  const userDataPath = app.getPath('userData')
  return path.join(userDataPath, PLUGINS_DIR)
}

// 确保插件目录存在
function ensurePluginsDir(): void {
  const pluginsDir = getPluginsDir()
  if (!fs.existsSync(pluginsDir)) {
    fs.mkdirSync(pluginsDir, { recursive: true })
  }
}

// 加载插件清单
function loadManifest(pluginPath: string): PluginManifest | null {
  const manifestPath = path.join(pluginPath, 'manifest.json')
  try {
    if (fs.existsSync(manifestPath)) {
      return JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
    }
  } catch (e) {
    logger.error('PluginSystem', `Failed to load manifest for ${pluginPath}`, e)
  }
  return null
}

function validateManifest(value: unknown): PluginManifestPreview {
  if (!value || typeof value !== 'object') throw new Error('Manifest must be a JSON object.')
  const manifest = value as Partial<PluginManifest>
  if (!manifest.name || !manifest.version || !manifest.main) {
    throw new Error('Manifest must include name, version, and main.')
  }
  if (manifest.permissions !== undefined && !Array.isArray(manifest.permissions)) {
    throw new Error('Manifest permissions must be an array.')
  }

  return {
    name: manifest.name,
    version: manifest.version,
    main: manifest.main,
    description: manifest.description,
    author: manifest.author,
    permissions: manifest.permissions || [],
  }
}

function inspectPluginSource(source: string): { success: boolean; manifest?: PluginManifestPreview; error?: string } {
  try {
    if (!source.trim()) throw new Error('Plugin path is required.')
    if (source.toLowerCase().endsWith('.zip')) {
      const AdmZip = require('adm-zip')
      const zip = new AdmZip(source)
      const manifestEntry = zip
        .getEntries()
        .find(
          (entry: { entryName: string; isDirectory: boolean }) =>
            !entry.isDirectory && /(^|\/)manifest\.json$/i.test(entry.entryName),
        )
      if (!manifestEntry) throw new Error('manifest.json was not found.')
      return { success: true, manifest: validateManifest(JSON.parse(manifestEntry.getData().toString('utf-8'))) }
    }

    const manifestPath = path.join(source, 'manifest.json')
    if (!fs.existsSync(manifestPath)) throw new Error('manifest.json was not found.')
    return { success: true, manifest: validateManifest(JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))) }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

// 创建插件 API
function createPluginAPI(pluginId: string): PluginAPI {
  // 插件存储
  const pluginStore = new Map<string, unknown>()
  pluginStorage.set(pluginId, pluginStore)

  return {
    storage: {
      get: (key: string) => pluginStore.get(key),
      set: (key: string, value: unknown) => pluginStore.set(key, value),
      delete: (key: string) => pluginStore.delete(key),
    },
    hooks: {
      onNoteCreated: (callback) => {
        addHook(pluginId, 'note:created', callback as (data: unknown) => void | Promise<void>)
      },
      onNoteSaved: (callback) => {
        addHook(pluginId, 'note:saved', callback as (data: unknown) => void | Promise<void>)
      },
      onNoteDeleted: (callback) => {
        addHook(pluginId, 'note:deleted', callback as (data: unknown) => void | Promise<void>)
      },
      onVaultIndexed: (callback) => {
        addHook(pluginId, 'vault:indexed', callback as (data: unknown) => void | Promise<void>)
      },
      onSearch: (callback: (query: string) => void) => {
        addHook(pluginId, 'search:query', callback as (data: unknown) => void)
      },
    },
    events: {
      emit: (event: string, data: unknown) => {
        emitEvent(pluginId, event, data)
      },
      on: (event: string, callback: (data: unknown) => void) => {
        const fullEvent = `${pluginId}:${event}`
        const callbacks = hookCallbacks.get(fullEvent)
        if (callbacks) {
          callbacks.push(callback)
        } else {
          hookCallbacks.set(fullEvent, [callback])
        }
      },
    },
    app: {
      getVaultPath: () => store.get('vaultDirectory') as string,
      getNoteContent: (notePath: string) => {
        try {
          const vaultPath = store.get('vaultDirectory') as string
          if (!vaultPath) return null
          const resolved = path.resolve(vaultPath, notePath)
          // Ensure path stays within vault directory
          if (!resolved.startsWith(path.resolve(vaultPath) + path.sep) && resolved !== path.resolve(vaultPath)) {
            logger.error('PluginSystem', `Plugin tried to access path outside vault: ${notePath}`)
            return null
          }
          if (fs.existsSync(resolved)) {
            return fs.readFileSync(resolved, 'utf-8')
          }
        } catch (e) {
          logger.error('PluginSystem', `Failed to read note: ${notePath}`, e)
        }
        return null
      },
      setNoteContent: (notePath: string, content: string) => {
        const vaultPath = store.get('vaultDirectory') as string
        if (!vaultPath) throw new Error('No vault directory configured')
        const resolved = path.resolve(vaultPath, notePath)
        // Ensure path stays within vault directory
        if (!resolved.startsWith(path.resolve(vaultPath) + path.sep) && resolved !== path.resolve(vaultPath)) {
          throw new Error('Path must stay inside the current vault.')
        }
        try {
          const dir = path.dirname(resolved)
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true })
          }
          fs.writeFileSync(resolved, content, 'utf-8')
        } catch (e) {
          throw new Error(`Failed to write note: ${e}`)
        }
      },
      showNotification: (message: string, type = 'info') => {
        logger.info('PluginSystem', `[${type.toUpperCase()}] ${message}`)
      },
    },
  }
}

// 添加钩子回调
function addHook(pluginId: string, hookName: string, callback: (data: unknown) => void | Promise<void>): void {
  const key = `${pluginId}:${hookName}`
  const callbacks = hookCallbacks.get(key)
  if (callbacks) {
    callbacks.push(callback)
  } else {
    hookCallbacks.set(key, [callback])
  }
}

// 触发事件
function emitEvent(pluginId: string, event: string, data: unknown): void {
  const fullEvent = `${pluginId}:${event}`
  const callbacks = hookCallbacks.get(fullEvent) || []
  for (const callback of callbacks) {
    try {
      callback(data)
    } catch (e) {
      logger.error('PluginSystem', `Error in plugin ${pluginId} event handler`, e)
    }
  }

  eventBus.push({
    name: fullEvent,
    data,
    timestamp: new Date().toISOString(),
  })
}

// 触发全局钩子
async function triggerHook(hookName: string, data: unknown): Promise<void> {
  const callbacks = hookCallbacks.get(hookName) || []
  for (const callback of callbacks) {
    try {
      await callback(data)
    } catch (e) {
      logger.error('PluginSystem', `Error in hook ${hookName}`, e)
    }
  }
}

// 加载单个插件
async function loadPlugin(pluginPath: string): Promise<Plugin | null> {
  const manifest = loadManifest(pluginPath)
  if (!manifest) {
    return null
  }

  const pluginId = crypto.randomUUID()
  const plugin: Plugin = {
    id: pluginId,
    manifest,
    path: pluginPath,
    enabled: false,
  }

  try {
    const mainPath = path.join(pluginPath, manifest.main)
    if (fs.existsSync(mainPath)) {
      const api = createPluginAPI(pluginId)
      plugin.api = api

      // 动态导入插件主文件
      // 注意：在 Electron 主进程中可以使用 require
      const pluginModule = require(mainPath)
      if (typeof pluginModule.activate === 'function') {
        await pluginModule.activate(api)
      }

      plugin.enabled = true
      plugin.loadedAt = new Date().toISOString()
      plugins.set(pluginId, plugin)

      logger.info('PluginSystem', `Loaded plugin: ${manifest.name} v${manifest.version}`)
    }
  } catch (e) {
    plugin.error = String(e)
    plugins.set(pluginId, plugin)
    logger.error('PluginSystem', `Failed to load plugin ${manifest.name}`, e)
  }

  return plugin
}

// 卸载插件
async function unloadPlugin(pluginId: string): Promise<boolean> {
  const plugin = plugins.get(pluginId)
  if (!plugin) return false

  try {
    if (plugin.api) {
      const mainPath = path.join(plugin.path, plugin.manifest.main)
      const pluginModule = require(mainPath)
      if (typeof pluginModule.deactivate === 'function') {
        await pluginModule.deactivate()
      }
    }

    // 清理存储和钩子
    pluginStorage.delete(pluginId)
    for (const key of hookCallbacks.keys()) {
      if (key.startsWith(pluginId)) {
        hookCallbacks.delete(key)
      }
    }

    // Clean up event bus entries for this plugin
    const eventBusLength = eventBus.length
    for (let i = eventBusLength - 1; i >= 0; i--) {
      if (eventBus[i].name.startsWith(`${pluginId}:`)) {
        eventBus.splice(i, 1)
      }
    }

    plugins.delete(pluginId)
    logger.info('PluginSystem', `Unloaded plugin: ${plugin.manifest.name}`)
    return true
  } catch (e) {
    logger.error('PluginSystem', `Failed to unload plugin ${pluginId}`, e)
    return false
  }
}

// 加载所有插件
async function loadPlugins(): Promise<Plugin[]> {
  ensurePluginsDir()
  const pluginsDir = getPluginsDir()
  const loadedPlugins: Plugin[] = []

  try {
    const entries = fs.readdirSync(pluginsDir, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const pluginPath = path.join(pluginsDir, entry.name)
        const plugin = await loadPlugin(pluginPath)
        if (plugin) {
          loadedPlugins.push(plugin)
        }
      }
    }
  } catch (e) {
    logger.error('PluginSystem', 'Failed to load plugins', e)
  }

  return loadedPlugins
}

// 获取所有已加载的插件
function getLoadedPlugins(): Plugin[] {
  return Array.from(plugins.values())
}

// 获取插件列表（包含未加载的）
function getAllPlugins(): Plugin[] {
  ensurePluginsDir()
  const pluginsDir = getPluginsDir()
  const allPlugins: Plugin[] = []

  try {
    if (fs.existsSync(pluginsDir)) {
      const entries = fs.readdirSync(pluginsDir, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const pluginPath = path.join(pluginsDir, entry.name)
          const manifest = loadManifest(pluginPath)
          if (manifest) {
            const existing =
              plugins.get(entry.name) || Array.from(plugins.values()).find((plugin) => plugin.path === pluginPath)
            allPlugins.push(
              existing || {
                id: entry.name,
                manifest,
                path: pluginPath,
                enabled: false,
              },
            )
          }
        }
      }
    }
  } catch (e) {
    logger.error('PluginSystem', 'Failed to list plugins', e)
  }

  return allPlugins
}

function toPluginListItem(plugin: Plugin) {
  return {
    id: plugin.id,
    name: plugin.manifest.name,
    version: plugin.manifest.version,
    description: plugin.manifest.description,
    author: plugin.manifest.author,
    permissions: plugin.manifest.permissions || [],
    enabled: plugin.enabled,
    error: plugin.error,
    settings: plugin.manifest.contributions?.settings,
  }
}

// 执行插件钩子
async function executePluginHook(hookName: string, data: unknown): Promise<void> {
  await triggerHook(hookName, data)
}

// 安装插件（从 ZIP 或目录）
async function installPlugin(source: string): Promise<{ success: boolean; error?: string; plugin?: Plugin }> {
  ensurePluginsDir()
  const pluginsDir = getPluginsDir()

  try {
    let destPath: string

    if (source.endsWith('.zip')) {
      // 从 ZIP 安装
      const AdmZip = require('adm-zip')
      const zip = new AdmZip(source)
      const pluginName = path.basename(source, '.zip')
      destPath = path.join(pluginsDir, pluginName)

      if (fs.existsSync(destPath)) {
        return { success: false, error: 'Plugin already exists' }
      }

      // Zip Slip protection: validate all entry paths before extraction
      const entries = zip.getEntries()
      for (const entry of entries) {
        const entryPath = path.resolve(destPath, entry.entryName)
        if (!entryPath.startsWith(path.resolve(destPath) + path.sep) && entryPath !== path.resolve(destPath)) {
          return { success: false, error: `Malicious zip entry detected: ${entry.entryName}` }
        }
      }

      zip.extractAllTo(destPath, true)
    } else {
      // 从目录安装
      destPath = path.join(pluginsDir, path.basename(source))
      if (fs.existsSync(destPath)) {
        return { success: false, error: 'Plugin already exists' }
      }
      fs.mkdirSync(destPath, { recursive: true })

      // 复制文件
      const copyDir = (src: string, dest: string) => {
        fs.mkdirSync(dest, { recursive: true })
        const entries = fs.readdirSync(src, { withFileTypes: true })
        for (const entry of entries) {
          const srcPath = path.join(src, entry.name)
          const destinationPath = path.join(dest, entry.name)
          if (entry.isDirectory()) {
            copyDir(srcPath, destinationPath)
          } else {
            fs.copyFileSync(srcPath, destinationPath)
          }
        }
      }
      copyDir(source, destPath)
    }

    const plugin = await loadPlugin(destPath)
    return { success: true, plugin: plugin || undefined }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

// 卸载并删除插件
async function uninstallPlugin(pluginId: string): Promise<boolean> {
  const plugin = plugins.get(pluginId)
  if (!plugin) {
    // 尝试从目录删除
    ensurePluginsDir()
    const pluginPath = path.join(getPluginsDir(), pluginId)
    if (fs.existsSync(pluginPath)) {
      fs.rmSync(pluginPath, { recursive: true })
      return true
    }
    return false
  }

  await unloadPlugin(pluginId)
  fs.rmSync(plugin.path, { recursive: true })
  return true
}

// 启用插件
function enablePlugin(pluginId: string): boolean {
  // 先检查是否已加载
  const plugin = plugins.get(pluginId)
  if (plugin) {
    if (plugin.enabled) return true // 已启用
    plugin.enabled = true
    plugin.loadedAt = new Date().toISOString()
    logger.info('PluginSystem', `Enabled plugin: ${plugin.manifest.name}`)
    return true
  }

  // 未加载则尝试从目录加载
  const pluginsDir = getPluginsDir()
  const pluginPath = path.join(pluginsDir, pluginId)
  if (fs.existsSync(pluginPath)) {
    // 同步加载（不 await，因为 IPC handler 需要同步返回）
    loadPlugin(pluginPath).then((loaded) => {
      if (loaded) {
        loaded.enabled = true
        plugins.set(loaded.id, loaded)
        logger.info('PluginSystem', `Enabled plugin: ${loaded.manifest.name}`)
      }
    })
    return true
  }

  return false
}

// 禁用插件
function disablePlugin(pluginId: string): boolean {
  const plugin = plugins.get(pluginId)
  if (!plugin) return false

  plugin.enabled = false
  logger.info('PluginSystem', `Disabled plugin: ${plugin.manifest.name}`)
  return true
}

// 注册 IPC handlers
export function registerPluginSystemHandlers() {
  ipcMain.handle('plugins:list', async () => {
    return getAllPlugins().map(toPluginListItem)
  })

  ipcMain.handle('plugins:inspect', async (_event, source: string) => inspectPluginSource(source))

  ipcMain.handle('plugins:loaded', async () => {
    return getLoadedPlugins()
  })

  ipcMain.handle('plugins:load', async (_event, pluginId: string) => {
    const pluginPath = path.join(getPluginsDir(), pluginId)
    return loadPlugin(pluginPath)
  })

  ipcMain.handle('plugins:unload', async (_event, pluginId: string) => {
    return unloadPlugin(pluginId)
  })

  ipcMain.handle('plugins:install', async (_event, source: string) => {
    const result = await installPlugin(source)
    return result.plugin ? { ...result, plugin: toPluginListItem(result.plugin) } : result
  })

  ipcMain.handle('plugins:uninstall', async (_event, pluginId: string) => {
    return uninstallPlugin(pluginId)
  })

  ipcMain.handle('plugins:execute-hook', async (_event, hookName: string, data: unknown) => {
    await executePluginHook(hookName, data)
    return { success: true }
  })

  ipcMain.handle('plugins:get-api', async (_event, pluginId: string) => {
    const plugin = plugins.get(pluginId)
    if (!plugin?.api) return null
    // 返回 API 的可序列化部分
    return {
      hasStorage: true,
      hasHooks: true,
      hasEvents: true,
      hasApp: true,
    }
  })

  ipcMain.handle('plugins:enable', async (_event, pluginId: string) => {
    const existing = plugins.get(pluginId)
    if (existing) {
      existing.enabled = true
      return existing.error ? { success: false, error: existing.error } : { success: true }
    }

    const pluginPath = path.join(getPluginsDir(), pluginId)
    if (!fs.existsSync(pluginPath)) return { success: false, error: 'Plugin directory not found.' }
    const loaded = await loadPlugin(pluginPath)
    if (!loaded || loaded.error || !loaded.enabled) {
      return { success: false, error: loaded?.error || 'Plugin activation failed.' }
    }
    return { success: true }
  })

  ipcMain.handle('plugins:disable', async (_event, pluginId: string) => {
    return disablePlugin(pluginId) ? { success: true } : { success: false, error: 'Plugin is not currently loaded.' }
  })

  logger.info('PluginSystem', 'IPC handlers registered')
}

// 导出供其他模块使用
export {
  loadPlugins,
  unloadPlugin,
  loadPlugin,
  getLoadedPlugins,
  getAllPlugins,
  executePluginHook,
  triggerHook,
  enablePlugin,
  disablePlugin,
  type Plugin,
  type PluginManifest,
  inspectPluginSource,
  type PluginAPI,
}
