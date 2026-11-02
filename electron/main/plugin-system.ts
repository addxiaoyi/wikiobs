/**
 * Plugin System - 插件系统
 * 支持加载/卸载插件，提供 hooks 和 API
 */

import { ipcMain, app, BrowserWindow } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import crypto from 'crypto'
import Store from 'electron-store'
import type {
  PluginActiveNoteInfo,
  PluginCommandContribution,
  PluginCommandRunRequest,
  PluginCommandRunResult,
  PluginContributionRegistry,
  PluginManifest as SharedPluginManifest,
  PluginNoteEditProposal,
  PluginPresetCreateResponse,
  PluginPresetListing,
  PluginScaffoldRequest,
  PluginUiContribution,
} from '@shared/plugin-types'
import { isKnownPermission } from '@shared/plugin-types'
import { PLUGIN_CLI_ALLOWED_COMMANDS, type PluginHostCliRequest } from '@shared/plugin-cli'
import { CLI_PRESETS, LLM_PRESETS, PLUGIN_PRESETS } from '@shared/plugin-presets'
import type { PluginHostServices, PluginHostInfo } from '@shared/plugin-host'
import type { PluginPreset } from '@shared/plugin-presets'
import {
  clearContributions,
  listContributions,
  registerCommand,
  registerUiContribution,
  runCommand,
  type PluginCommandHandler,
  type PluginContributionStoreOwner,
} from './plugin-sdk'
import { assertValidId, buildPluginEntry, buildPluginManifestJson, buildPluginReadme } from './plugin-template'
import { createPluginHostServices } from './plugin-host'
import { assertPermission, PluginPermissionError, type PluginGrantSet } from './plugin-permissions'
import { runPluginCli } from './plugin-cli'
import { logger } from './common/logger'
import { resolveExistingVaultPath } from './filesystem/pathGuard'
import type { StoreSchema } from './electron-store/storeConfig'

// 清单字段与共享类型保持一致，插件作者与运行时校验同一份定义。
interface PluginManifest extends SharedPluginManifest {
  main: string
  permissions: string[]
  homepage?: string
}

// 权限常量：用于 manifest 声明校验与运行时授权检查
const PERMISSIONS = {
  NOTES_READ: 'notes.read',
  NOTES_WRITE: 'notes.write',
  VAULT_READ: 'vault.read',
  VAULT_WRITE: 'vault.write',
  NETWORK: 'network',
  FILE_SYSTEM: 'filesystem',
} as const

const KNOWN_PERMISSIONS = new Set<string>(Object.values(PERMISSIONS))

function isValidPermission(p: string): boolean {
  // 读取点安全（如 manifest.permissions 非数组时 String 会抛错），白名单与共享类型保持一致
  return typeof p === 'string' && KNOWN_PERMISSIONS.has(p) && isKnownPermission(p)
}

// 市场分类
export type PluginCategory = 'core' | 'productivity' | 'writing' | 'analysis' | 'automation' | 'integration'

export interface MarketplacePlugin {
  id: string
  name: string
  version: string
  description: string
  author: string
  permissions: string[]
  source: 'bundled' | 'remote'
  category: PluginCategory
  license?: string
  homepage?: string
  downloadUrl?: string
  installed: boolean
  /** 已安装版本；未安装时为空。 */
  installedVersion?: string
  hasUpdate: boolean
}

export interface PluginManifestPreview {
  name: string
  version: string
  main: string
  description?: string
  author?: string
  license?: string
  homepage?: string
  permissions: string[]
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

// 运行时贡献点归属：enabled 取自插件对象本身（动态），clear 后重新注册即生效
function ownerOf(pluginId: string): PluginContributionStoreOwner {
  return {
    id: pluginId,
    name: getPluginDisplayName(pluginId),
    get enabled() {
      return plugins.get(pluginId)?.enabled ?? false
    },
  }
}

function getPluginDisplayName(pluginId: string): string {
  return plugins.get(pluginId)?.manifest.name ?? pluginId
}

// ============================================================================
// 活动笔记 / 编辑提案
// ============================================================================

let activeNote: PluginActiveNoteInfo | null = null

// 编辑提案的确认由渲染层完成：主进程通过 IPC 请求渲染层打开差异视图，
// 渲染层用 plugins:edit-note:resolve 回传用户决定。由窗口接线方调用 setEditProposalRequester。
type EditProposalRequester = (
  p: PluginNoteEditProposal,
  id: string,
) => Promise<EditProposalResult | undefined> | EditProposalResult

let editProposalRequester: EditProposalRequester | null = null

const EDIT_PROPOSAL_TIMEOUT_MS = 5 * 60 * 1000
const PLUGIN_API_SUMMARY = ['storage', 'hooks', 'events', 'commands', 'ui', 'app', 'host.ai', 'host.notes', 'settings']

let nextProposalId = 0

function buildProposalId(): string {
  nextProposalId += 1
  return `edit-${Date.now().toString(36)}-${nextProposalId}`
}

// ============================================================================
// 类型
// ============================================================================

interface EditProposalDecision {
  proposalId: string
  accepted: boolean
}

interface EditProposalResult {
  accepted: boolean
  error?: string
}

interface PendingEditProposal {
  proposalId: string
  resolve: (result: EditProposalResult) => void
  timeout: ReturnType<typeof setTimeout> | null
}

let pendingEditProposal: PendingEditProposal | null = null

export function settleEditProposal(decision: EditProposalDecision): boolean {
  const pending = pendingEditProposal
  if (!pending || pending.proposalId !== decision.proposalId) return false
  pendingEditProposal = null
  pending.resolve(
    decision.accepted ? { accepted: true } : { accepted: false, error: 'Edit proposal was rejected by the user.' },
  )
  return true
}

interface PluginContributionsBridge {
  registerCommand: (id: string, handler: PluginCommandHandler) => void
  run: (id: string, payload?: unknown) => Promise<PluginCommandRunResult>
  listCommands: () => PluginCommandContribution[]
  renderItem: (item: PluginUiContribution) => void
  listUi: () => PluginUiContribution[]
  clear: () => void
}

interface PluginAPI {
  storage: {
    get: (key: string) => unknown
    set: (key: string, value: unknown) => void
    delete: (key: string) => void
  }
  hooks: {
    onNoteCreated: (callback: (note: { path: string; content: string; vaultPath: string }) => void) => void
    onNoteSaved: (callback: (note: { path: string; content: string; vaultPath: string }) => void) => void
    onNoteDeleted: (callback: (note: { path: string }) => void) => void
    onVaultIndexed: (callback: () => void) => void
    onSearch: (callback: (query: string) => void) => void
  }
  events: {
    emit: (event: string, data: unknown) => void
    on: (event: string, callback: (data: unknown) => void) => void
  }
  commands: {
    register: (id: string, handler: (payload: unknown) => unknown | Promise<unknown>) => void
    run: (id: string, payload?: unknown) => Promise<unknown>
    list: () => string[]
  }
  ui: {
    renderItem: (item: PluginUiContribution) => void
    list: () => PluginUiContribution[]
    clear: () => void
  }
  /** 命令与 UI 贡献点的统一入口，供插件声明式注册后由宿主调用。 */
  contributions: PluginContributionsBridge
  app: {
    getVaultPath: () => string
    getNoteContent: (notePath: string) => string | null
    setNoteContent: (notePath: string, content: string, vaultPath?: string) => void
    showNotification: (message: string, type?: 'info' | 'warning' | 'error') => void
    /** 当前活动笔记的相对路径与标题；无活动笔记时为 null。 */
    readActiveNote: () => PluginActiveNoteInfo | null
    /** 提交一次编辑提案（diff），由渲染层确认后才落盘。 */
    proposeEdit: (proposal: PluginNoteEditProposal) => Promise<{ accepted: boolean; error?: string }>
  }
  /** 宿主能力：LLM 调用、笔记遍历与 prompt 模版，插件无需自行拼装。 */
  host: PluginHostServices
  /** 插件只读的宿主信息：自身目录、vault 根目录与 CLI 白名单。 */
  hostInfo: PluginHostInfo
  /** 插件的设置值，由 manifest 中 contributions.settings 定义并在设置页编辑。 */
  settings: { get: (key: string) => unknown }
}

interface PluginEvent {
  name: string
  data: unknown
  timestamp: string
}

const store = new Store<StoreSchema>()
const PLUGINS_DIR = 'plugins'
// 被用户禁用的插件 ID 集合，持久化在 electron-store 中。
// 启动扫描时跳过它们；禁用时连同运行时状态一起卸下，启用时再加载。
const DISABLED_PLUGINS_KEY = 'plugins.disabled'
const plugins: Map<string, Plugin> = new Map()
const pluginStorage: Map<string, Map<string, unknown>> = new Map()
const hookCallbacks: Map<string, Array<(data: unknown) => void | Promise<void>>> = new Map()
const eventBus: PluginEvent[] = []

const bundledMarketplace: Omit<MarketplacePlugin, 'installed' | 'hasUpdate'>[] = [
  {
    id: 'word-count-on-save',
    name: 'Word Count on Save',
    version: '1.1.0',
    description: 'Adds word and character counts to note frontmatter when a note is saved.',
    author: 'WIKIOBS',
    permissions: ['notes.read', 'notes.write'],
    source: 'bundled',
    category: 'productivity',
    license: 'AGPL-3.0',
    homepage: 'https://github.com/WIKIOBS/wikiobs',
  },
]

// 获取插件目录
function getPluginsDir(): string {
  const userDataPath = app.getPath('userData')
  return path.join(userDataPath, PLUGINS_DIR)
}

function getDisabledPluginIds(): Set<string> {
  const stored = store.get(DISABLED_PLUGINS_KEY)
  return new Set(Array.isArray(stored) ? stored.filter((id): id is string => typeof id === 'string') : [])
}

function setPluginEnabledPersisted(pluginId: string, enabled: boolean): void {
  const disabled = getDisabledPluginIds()
  if (enabled) disabled.delete(pluginId)
  else disabled.add(pluginId)
  store.set(DISABLED_PLUGINS_KEY, Array.from(disabled))
}

function getBundledPluginsDir(): string {
  const root = app.isPackaged ? process.resourcesPath : app.getAppPath()
  return path.join(root, 'plugins')
}

function getMarketplace(): MarketplacePlugin[] {
  const installed = getAllPlugins()
  const byName = new Map<string, string[]>()
  for (const plugin of installed) {
    const versions = byName.get(plugin.manifest.name) ?? []
    versions.push(plugin.manifest.version)
    byName.set(plugin.manifest.name, versions)
  }

  return bundledMarketplace.map((record) => {
    const versions = byName.get(record.name) ?? []
    const installedVersion = versions.sort((a, b) => (semverGt(a, b) ? -1 : 1))[0]
    return {
      ...record,
      installed: typeof installedVersion === 'string',
      installedVersion,
      hasUpdate: typeof installedVersion === 'string' && semverGt(record.version, installedVersion),
    }
  })
}

async function installMarketplacePlugin(
  pluginId: string,
): Promise<{ success: boolean; error?: string; plugin?: unknown }> {
  const entry = bundledMarketplace.find((plugin) => plugin.id === pluginId)
  if (!entry) return { success: false, error: 'Marketplace plugin was not found.' }

  const sourcePath = path.join(getBundledPluginsDir(), entry.id)
  if (!fs.existsSync(sourcePath)) return { success: false, error: 'Bundled plugin payload is missing.' }

  const installed = getAllPlugins().find((plugin) => plugin.manifest.name === entry.name)
  if (installed) {
    // 已安装：仅在市场版本较新时执行就地升级，否则视为已是最新。
    if (!semverGt(entry.version, installed.manifest.version)) {
      return { success: false, error: 'This marketplace plugin is already up to date.' }
    }
    // 卸载旧运行实例，再以覆盖模式安装市场新版。
    await unloadPlugin(installed.id)
    return installPlugin(sourcePath, true)
  }
  return installPlugin(sourcePath)
}

function copyPluginTree(source: string, destination: string): void {
  fs.mkdirSync(destination, { recursive: true })
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) throw new Error('Plugin packages cannot contain symbolic links.')
    const from = path.join(source, entry.name)
    const to = path.join(destination, entry.name)
    if (fs.statSync(from).isDirectory()) copyPluginTree(from, to)
    else fs.copyFileSync(from, to)
  }
}

function resolvePluginDirectory(pluginId: string): string {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/.test(pluginId)) {
    throw new Error('Invalid plugin ID.')
  }
  const pluginsDir = path.resolve(getPluginsDir())
  const resolved = path.resolve(pluginsDir, pluginId)
  const relative = path.relative(pluginsDir, resolved)
  if (relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error('Plugin path must stay inside the plugins directory.')
  }
  return resolved
}

function validatePluginEntry(pluginPath: string, main: string): string {
  if (typeof main !== 'string' || main.trim() === '' || path.isAbsolute(main)) {
    throw new Error('Plugin entry must be a relative path.')
  }
  const root = path.resolve(pluginPath)
  const entry = path.resolve(root, main)
  const relative = path.relative(root, entry)
  if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error('Plugin entry must stay inside the plugin directory.')
  }
  return entry
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
      const raw = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
      // 统一校验：权限、semver、入口路径。抛错则由调用方捕获，标记插件无效。
      validateManifest(raw)
      return raw
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
  if (typeof manifest.version !== 'string' || !/^\d+\.\d+\.\d+/.test(manifest.version)) {
    throw new Error('Manifest version must be a valid semver (e.g. 1.0.0).')
  }
  if (manifest.permissions !== undefined && !Array.isArray(manifest.permissions)) {
    throw new Error('Manifest permissions must be an array.')
  }
  if (manifest.permissions !== undefined) {
    const invalid = manifest.permissions.filter((p) => !isValidPermission(p))
    if (invalid.length > 0) {
      throw new Error(`Manifest declares unknown permissions: ${invalid.join(', ')}`)
    }
  }
  validatePluginEntry('.', manifest.main)

  return {
    name: manifest.name,
    version: manifest.version,
    main: manifest.main,
    description: manifest.description,
    author: manifest.author,
    license: manifest.license,
    homepage: manifest.homepage,
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

// 插件设置值持久化在 electron-store 的 plugins.settings.<pluginId> 下，渲染层写、主进程读。
function getPluginSetting(pluginId: string, key: string): unknown {
  return (store.get('plugins.settings') as Record<string, Record<string, unknown>> | undefined)?.[pluginId]?.[key]
}

/**
 * 读出一份可用的权限授予集：只认已知权限键，未知项逐个记日志后丢弃。
 * 丢弃而不是整体拒绝，是为了让声明了未来权限的插件在老版本里仍能加载——
 * 代价是它拿不到那项能力，而不是悄悄多拿。
 */
function resolveGrantedPermissions(pluginId: string, declared: readonly unknown[] | undefined): PluginGrantSet {
  const granted = new Set<string>()
  const ignored: unknown[] = []
  for (const permission of declared ?? []) {
    if (typeof permission === 'string' && isValidPermission(permission)) granted.add(permission)
    else ignored.push(permission)
  }
  if (ignored.length > 0) {
    logger.warn('PluginSystem', `Plugin ${pluginId} declares unsupported permissions, ignored: ${ignored.join(', ')}`)
  }
  return granted
}

// 创建插件 API
function createPluginAPI(
  pluginId: string,
  pluginPath: string | null = null,
  granted: PluginGrantSet = new Set<string>(),
): PluginAPI {
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
        // emitEvent 统一广播给：自身命名空间 ${pluginId}:event、全局 *:event、显式其他命名空间 other:event
        emitEvent(pluginId, event, data)
      },
      on: (event: string, callback: (data: unknown) => void) => {
        // 支持三种订阅形式：
        //   on('event')            -> 订阅自身命名空间 ${pluginId}:event
        //   on('other:event')      -> 订阅其他插件的命名空间事件（跨插件通信）
        //   on('*:event')          -> 订阅全局事件，监听所有插件的同名广播
        const fullEvent = event.includes(':') ? event : `${pluginId}:${event}`
        subscribe(fullEvent, callback as (data: unknown) => void | Promise<void>)
      },
    },
    commands: {
      register: (id: string, handler: PluginCommandHandler) =>
        createContributionsBridge(pluginId).registerCommand(id, handler),
      run: async (id: string, payload?: unknown) => {
        const result = await runCommand(pluginId, id, payload)
        if (!result.success) throw new Error(result.error)
        return result.result
      },
      list: () =>
        createContributionsBridge(pluginId)
          .listCommands()
          .map((command) => command.id),
    },
    ui: {
      renderItem: (item) => createContributionsBridge(pluginId).renderItem(item),
      list: () => createContributionsBridge(pluginId).listUi(),
      clear: () => createContributionsBridge(pluginId).clear(),
    },
    contributions: createContributionsBridge(pluginId),
    app: {
      getVaultPath: () => {
        assertPermission(pluginId, granted, 'vault.read')
        return store.get('vaultDirectory') as string
      },
      getNoteContent: (notePath: string) => {
        assertPermission(pluginId, granted, 'notes.read')
        try {
          const vaultPath = store.get('vaultDirectory') as string
          if (!vaultPath) return null
          const resolved = resolveExistingVaultPath(vaultPath, notePath)
          if (fs.existsSync(resolved)) {
            return fs.readFileSync(resolved, 'utf-8')
          }
        } catch (e) {
          if (e instanceof PluginPermissionError) throw e
          logger.error('PluginSystem', `Failed to read note: ${notePath}`, e)
        }
        return null
      },
      setNoteContent: (notePath: string, content: string, vaultOverride?: string) => {
        assertPermission(pluginId, granted, 'notes.write')
        const vaultPath = vaultOverride || (store.get('vaultDirectory') as string)
        if (!vaultPath) throw new Error('No vault directory configured')
        const resolved = resolveExistingVaultPath(vaultPath, notePath)
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
      readActiveNote: () => activeNote,
      proposeEdit: (proposal) => proposeNoteEdit(proposal),
    },
    host: createPluginHostServices(store, { pluginId, pluginPath, granted }),
    hostInfo: {
      pluginPath,
      vaultPath: (store.get('vaultDirectory') as string | undefined) ?? null,
      cliCommands: PLUGIN_CLI_ALLOWED_COMMANDS,
      permissions: Array.from(granted),
    },
    settings: {
      get: (key: string) => getPluginSetting(pluginId, key),
    },
  }
}

// 向插件暴露的贡献点桥：命令与 UI 项由宿主（渲染层）调用，处理器返回值必须可经 IPC 序列化。
function createContributionsBridge(pluginId: string): PluginContributionsBridge {
  return {
    registerCommand: (id: string, handler: PluginCommandHandler): void => {
      registerCommand(ownerOf(pluginId), { id, label: id }, handler)
    },
    run: async (id: string, payload?: unknown): Promise<PluginCommandRunResult> => runCommand(pluginId, id, payload),
    listCommands: (): PluginCommandContribution[] =>
      listContributions([ownerOf(pluginId)], () => true).commands.map(
        ({ pluginId: _p, pluginName: _n, ...rest }) => rest,
      ),
    renderItem: (item: PluginUiContribution): void => registerUiContribution(ownerOf(pluginId), item),
    listUi: (): PluginUiContribution[] =>
      listContributions([ownerOf(pluginId)], () => true).ui.map(
        ({ pluginId: _p, pluginName: _n, enabled: _e, ...rest }) => rest,
      ),
    clear: (): void => clearContributions(pluginId),
  }
}

function finishEditProposal(proposalId: string, result: EditProposalResult): void {
  const pending = pendingEditProposal
  if (!pending || pending.proposalId !== proposalId) return
  pendingEditProposal = null
  if (pending.timeout) clearTimeout(pending.timeout)
  pending.resolve(result)
}

// 插件命令执行后由桥统一收口：让宿主在 ui 侧做真实动作（例如打开差异面板）。
export async function runPluginCommand(
  pluginId: string,
  commandId: string,
  payload: unknown,
): Promise<PluginCommandRunResult> {
  return runCommand(pluginId, commandId, payload)
}

export function setEditProposalRequester(requester: EditProposalRequester | null): void {
  editProposalRequester = requester
}

export function notifyActiveNoteChanged(note: PluginActiveNoteInfo | null): void {
  if (activeNote?.path === note?.path) return
  activeNote = note
  broadcastToWindows('plugins:active-note:changed', note)
}

// 向所有窗口广播宿主事件；没有窗口时（如单元测试）静默跳过。
function broadcastToWindows(channel: string, payload: unknown): void {
  if (!BrowserWindow) return
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed()) window.webContents.send(channel, payload)
  }
}

export function getActiveNote(): PluginActiveNoteInfo | null {
  return activeNote
}

export function listPluginContributions(): PluginContributionRegistry {
  const owners = getAllPlugins().map((plugin) => ({
    id: plugin.id,
    name: plugin.manifest.name,
    enabled: plugin.enabled,
  }))
  return listContributions(owners, (id) => plugins.get(id)?.enabled ?? false)
}

export async function proposeNoteEdit(proposal: PluginNoteEditProposal): Promise<EditProposalResult> {
  if (!proposal || typeof proposal.path !== 'string') {
    return Promise.resolve({ accepted: false, error: 'path is required.' })
  }
  if (typeof proposal.proposedContent !== 'string') {
    return Promise.resolve({ accepted: false, error: 'proposedContent is required.' })
  }
  if (!editProposalRequester) {
    return Promise.resolve({ accepted: false, error: 'No renderer is connected to confirm edit proposals.' })
  }
  if (pendingEditProposal) {
    return Promise.resolve({ accepted: false, error: 'Another edit proposal is already awaiting confirmation.' })
  }

  let original = typeof proposal.originalContent === 'string' ? proposal.originalContent : ''
  if (typeof proposal.originalContent !== 'string') {
    const vaultPath = store.get('vaultDirectory') as string
    if (vaultPath) {
      try {
        const resolved = resolveExistingVaultPath(vaultPath, proposal.path)
        if (fs.existsSync(resolved)) original = fs.readFileSync(resolved, 'utf-8')
      } catch (e) {
        logger.error('PluginSystem', `Failed to read edit proposal target: ${proposal.path}`, e)
      }
    }
  }
  const normalized: PluginNoteEditProposal = {
    path: proposal.path,
    originalContent: original,
    proposedContent: proposal.proposedContent,
    rationale: proposal.rationale,
  }

  return new Promise<EditProposalResult>((resolve) => {
    const proposalId = buildProposalId()
    pendingEditProposal = {
      proposalId,
      resolve,
      timeout: setTimeout(() => {
        finishEditProposal(proposalId, { accepted: false, error: 'Edit proposal was not confirmed in time.' })
      }, EDIT_PROPOSAL_TIMEOUT_MS),
    }

    try {
      if (editProposalRequester) {
        const outcome = editProposalRequester(normalized, proposalId)
        if (outcome && typeof (outcome as Promise<unknown>).then === 'function') {
          ;(outcome as Promise<EditProposalResult>).then(
            (result) => finishEditProposal(proposalId, result),
            (e) => finishEditProposal(proposalId, { accepted: false, error: String(e) }),
          )
        }
      } else {
        broadcastToWindows('plugins:edit-note:proposed', { ...normalized, proposalId })
      }
    } catch (e) {
      finishEditProposal(proposalId, { accepted: false, error: String(e) })
    }
  })
}

// 订阅一个事件键（命名空间为 ${pluginId}:${event} 或显式 `other:event` / `*:event`）
function subscribe(key: string, callback: (data: unknown) => void | Promise<void>): void {
  const callbacks = hookCallbacks.get(key)
  if (callbacks) {
    callbacks.push(callback)
  } else {
    hookCallbacks.set(key, [callback])
  }
}

// 依次调用某事件键下的所有订阅者，捕获并记录单个订阅者的异常
function invokeSubscribers(key: string, data: unknown): void {
  const callbacks = hookCallbacks.get(key) || []
  for (const callback of callbacks) {
    try {
      callback(data)
    } catch (e) {
      logger.error('PluginSystem', `Error in subscriber for ${key}`, e)
    }
  }
}

// 添加钩子回调
function addHook(pluginId: string, hookName: string, callback: (data: unknown) => void | Promise<void>): void {
  subscribe(`${pluginId}:${hookName}`, callback)
}

// 触发事件：广播给本插件命名空间、全局 *:event 订阅者，以及显式订阅了 other:event 的第三方订阅者
function emitEvent(pluginId: string, event: string, data: unknown): void {
  const fullEvent = `${pluginId}:${event}`
  invokeSubscribers(fullEvent, data)
  invokeSubscribers(`*:${event}`, data)
  if (event.includes(':')) invokeSubscribers(event, data)

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

function clearPluginHostModule(pluginPath: string): void {
  try {
    delete require.cache[require.resolve(pluginPath)]
  } catch {
    // 目录本身未被 require 过（例如只作为来源安装）：无需清理
  }
}

// 预设与示例插件在用户插件目录下生成：先列出已装状态，再按需一键创建。
function listPluginPresets(): PluginPresetListing[] {
  const defaultModel = (store.get('defaultLLM') as string | undefined) ?? ''
  const pluginsDir = path.resolve(getPluginsDir())
  return [...PLUGIN_PRESETS, ...LLM_PRESETS, ...CLI_PRESETS].map((preset) => ({
    id: preset.id,
    kind: preset.kind,
    category: preset.category,
    tags: preset.tags,
    name: preset.manifest.name,
    version: preset.manifest.version,
    description: preset.manifest.description ?? '',
    permissions: preset.manifest.permissions,
    installed: fs.existsSync(path.join(pluginsDir, preset.id)),
    source: resolvePresetSource(preset, defaultModel),
  }))
}

async function createPresetPlugin(presetId: string): Promise<PluginPresetCreateResponse> {
  const preset = [...PLUGIN_PRESETS, ...LLM_PRESETS, ...CLI_PRESETS].find((item) => item.id === presetId)
  if (!preset) return { success: false, error: 'Unknown preset.' }

  let destPath: string
  try {
    destPath = resolvePluginDirectory(preset.id)
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) }
  }
  if (fs.existsSync(destPath)) return { success: false, error: `Plugin "${preset.id}" already exists.` }

  try {
    validateManifest(preset.manifest)
    const defaultModel = (store.get('defaultLLM') as string | undefined) ?? ''
    fs.mkdirSync(destPath, { recursive: true })
    fs.writeFileSync(path.join(destPath, 'manifest.json'), `${JSON.stringify(preset.manifest, null, 2)}\n`, 'utf-8')
    fs.writeFileSync(path.join(destPath, preset.manifest.main), resolvePresetSource(preset, defaultModel), 'utf-8')
    fs.writeFileSync(path.join(destPath, 'README.md'), buildPresetReadme(preset), 'utf-8')
  } catch (e) {
    fs.rmSync(destPath, { recursive: true, force: true })
    return { success: false, error: e instanceof Error ? e.message : String(e) }
  }

  const plugin = await loadPlugin(destPath)
  if (!plugin?.enabled || plugin.error) {
    fs.rmSync(destPath, { recursive: true, force: true })
    return { success: false, error: plugin?.error ?? 'Plugin activation failed.' }
  }
  broadcastContributionsChanged()
  const item = toPluginListItem(plugin)
  return { success: true, plugin: { id: item.id, name: item.name, version: item.version, enabled: item.enabled } }
}

function resolvePresetSource(preset: PluginPreset, defaultModel: string): string {
  const source = typeof preset.source === 'function' ? preset.source({ defaultModel }) : preset.source
  // 入口模板里模型名留了占位符，创建时用当前设置填上，避免生成的插件一激活就报未定义。
  return source.split('__DEFAULT_MODEL__').join(JSON.stringify(defaultModel))
}

function buildPresetReadme(preset: PluginPreset): string {
  return [
    `# ${preset.manifest.name}`,
    '',
    preset.manifest.description ?? '',
    '',
    `- 版本: ${preset.manifest.version}`,
    '',
  ].join('\n')
}

// 启用插件后调用：让渲染层重新拉取贡献点，而不必重启窗口。数据库未就绪时静默跳过。
function broadcastContributionsChanged(): void {
  broadcastToWindows('plugins:contributions:changed', listPluginContributions())
}

// 加载单个插件
async function loadPlugin(pluginPath: string): Promise<Plugin | null> {
  const manifest = loadManifest(pluginPath)
  if (!manifest) {
    return null
  }

  // 插件 ID 使用插件目录名作为稳定身份，与 getAllPlugins / enablePlugin / resolvePluginDirectory 保持一致，
  // 避免原先以 crypto.randomUUID() 作为运行实例 ID 导致已加载插件在列表中无法正确匹配的错位问题。
  const pluginId = path.basename(pluginPath)
  const plugin: Plugin = {
    id: pluginId,
    manifest,
    path: pluginPath,
    enabled: false,
  }

  try {
    const mainPath = validatePluginEntry(pluginPath, manifest.main)
    if (fs.existsSync(mainPath)) {
      clearContributions(pluginId)
      // 去掉 require 缓存，让重新启用/升级后的插件重新执行入口并注册最新贡献点。
      clearPluginHostModule(pluginPath)
      const api = createPluginAPI(pluginId, pluginPath, resolveGrantedPermissions(pluginId, manifest.permissions))
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
      const mainPath = validatePluginEntry(plugin.path, plugin.manifest.main)
      const pluginModule = require(mainPath)
      if (typeof pluginModule.deactivate === 'function') {
        await pluginModule.deactivate()
      }
    }

    // 清理存储、钩子与贡献点
    pluginStorage.delete(pluginId)
    clearContributions(pluginId)
    clearPluginHostModule(plugin.path)
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
    const disabled = getDisabledPluginIds()
    for (const entry of entries) {
      if (entry.isDirectory() && !disabled.has(entry.name)) {
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
      const disabledIds = getDisabledPluginIds()
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
                enabled: !disabledIds.has(entry.name),
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

export async function notifyPluginHook(hookName: string, data: unknown): Promise<void> {
  await triggerHook(hookName, data)
}

// 在已解压/拷贝的暂存目录中定位包含 manifest.json 的插件根目录。
// 支持两种布局：
//   1) manifest.json 位于暂存根（扁平包）
//   2) manifest.json 位于暂存根下唯一的顶层子目录（嵌套包，如 GitHub 发布 zip）
// 若存在多种 manifest 布局则视为无效。
function resolvePluginRootDir(stagingDir: string): string {
  const rootManifest = path.join(stagingDir, 'manifest.json')
  if (fs.existsSync(rootManifest)) {
    return stagingDir
  }

  const candidates: string[] = []
  for (const entry of fs.readdirSync(stagingDir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      const nested = path.join(stagingDir, entry.name, 'manifest.json')
      if (fs.existsSync(nested)) candidates.push(path.join(stagingDir, entry.name))
    }
  }
  if (candidates.length === 1) {
    return candidates[0]
  }
  throw new Error(candidates.length === 0 ? 'manifest.json was not found.' : 'Plugin package layout is ambiguous.')
}

// 校验目录内的 manifest.json 并将原始校验错误向上抛出（用于安装等需要精确错误信息的路径）。
function assertValidManifest(dir: string): void {
  const manifestPath = path.join(dir, 'manifest.json')
  if (!fs.existsSync(manifestPath)) throw new Error('manifest.json was not found.')
  validateManifest(JSON.parse(fs.readFileSync(manifestPath, 'utf-8')))
}

// 处理安装暂存目录：定位插件根、把嵌套根提升到暂存顶层、校验 manifest，
// 然后覆盖目标目录并把暂存目录落到最终位置。任一步骤失败都会清理暂存目录并向上抛错。
function finalizeStaging(stagingPath: string, destPath: string): void {
  try {
    const pluginRoot = resolvePluginRootDir(stagingPath)
    if (pluginRoot !== stagingPath) {
      const lifted = `${destPath}.lifted-${crypto.randomUUID()}`
      fs.renameSync(pluginRoot, lifted)
      fs.rmSync(stagingPath, { recursive: true, force: true })
      fs.renameSync(lifted, stagingPath)
    }
    assertValidManifest(stagingPath)
  } catch (e) {
    fs.rmSync(stagingPath, { recursive: true, force: true })
    throw e
  }
  if (fs.existsSync(destPath)) {
    fs.rmSync(destPath, { recursive: true, force: true })
  }
  fs.renameSync(stagingPath, destPath)
}

// 简单 semver 比较：返回 a 是否严格大于 b（a > b）。非规范版本按字符串排序兜底。
function semverGt(a: string, b: string): boolean {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0)
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0)
  for (let i = 0; i < 3; i++) {
    const x = pa[i] || 0
    const y = pb[i] || 0
    if (x !== y) return x > y
  }
  return false
}

// 安装插件（从 ZIP 或目录）
// overwrite=true 时允许就地覆盖已存在目录（用于市场升级）。
async function installPlugin(
  source: string,
  overwrite = false,
): Promise<{ success: boolean; error?: string; plugin?: Plugin }> {
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

      if (fs.existsSync(destPath) && !overwrite) {
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

      const stagingPath = `${destPath}.staging-${crypto.randomUUID()}`
      zip.extractAllTo(stagingPath, true)
      finalizeStaging(stagingPath, destPath)
    } else {
      // 从目录安装
      destPath = path.join(pluginsDir, path.basename(source))
      if (fs.existsSync(destPath) && !overwrite) {
        return { success: false, error: 'Plugin already exists' }
      }
      const stagingPath = `${destPath}.staging-${crypto.randomUUID()}`
      copyPluginTree(source, stagingPath)
      finalizeStaging(stagingPath, destPath)
    }

    const plugin = await loadPlugin(destPath)
    if (!plugin?.enabled || plugin.error) {
      fs.rmSync(destPath, { recursive: true, force: true })
      return { success: false, error: plugin?.error || 'Plugin activation failed.' }
    }
    return { success: true, plugin }
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
    const pluginPath = resolvePluginDirectory(pluginId)
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
    setPluginEnabledPersisted(pluginId, true)
    logger.info('PluginSystem', `Enabled plugin: ${plugin.manifest.name}`)
    return true
  }

  // 未加载则尝试从目录加载
  const pluginPath = resolvePluginDirectory(pluginId)
  if (fs.existsSync(pluginPath)) {
    // 同步加载（不 await，因为 IPC handler 需要同步返回）
    loadPlugin(pluginPath).then((loaded) => {
      if (loaded) {
        loaded.enabled = true
        plugins.set(loaded.id, loaded)
        setPluginEnabledPersisted(loaded.id, true)
        broadcastContributionsChanged()
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
  setPluginEnabledPersisted(pluginId, false)
  clearContributions(pluginId)
  logger.info('PluginSystem', `Disabled plugin: ${plugin.manifest.name}`)
  return true
}

// 注册 IPC handlers
export function registerPluginSystemHandlers() {
  ipcMain.handle('plugins:list', async () => {
    return getAllPlugins().map(toPluginListItem)
  })

  ipcMain.handle('plugins:marketplace:list', async () => getMarketplace())

  ipcMain.handle('plugins:marketplace:install', async (_event, pluginId: string) => {
    const result = await installMarketplacePlugin(pluginId)
    return result.plugin ? { ...result, plugin: toPluginListItem(result.plugin as Plugin) } : result
  })

  ipcMain.handle('plugins:inspect', async (_event, source: string) => inspectPluginSource(source))

  ipcMain.handle('plugins:loaded', async () => {
    return getLoadedPlugins()
  })

  ipcMain.handle('plugins:load', async (_event, pluginId: string) => {
    const pluginPath = resolvePluginDirectory(pluginId)
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

    const pluginPath = resolvePluginDirectory(pluginId)
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

  ipcMain.handle('plugins:create-from-template', async (_event, request: PluginScaffoldRequest) => {
    try {
      if (!request || typeof request.id !== 'string' || !request.manifest) {
        throw new Error('A plugin id and manifest draft are required.')
      }
      assertValidId(request.id, 'Plugin ID')
      const destPath = resolvePluginDirectory(request.id)
      if (fs.existsSync(destPath)) {
        return { success: false, error: `Plugin "${request.id}" already exists.` }
      }
      const options = { id: request.id, manifest: request.manifest }
      // 入口路径先按最终目录解析校验，确认不会逃逸出插件目录后再解析回相对清单写入。
      const mainEntry = validatePluginEntry(destPath, request.manifest.main)
      if (!/\.(c|m)?js$/.test(mainEntry)) {
        throw new Error('Plugin entry must be a .js, .cjs or .mjs file.')
      }
      const manifestJson = buildPluginManifestJson(options)
      validateManifest(JSON.parse(manifestJson))
      fs.mkdirSync(path.dirname(mainEntry), { recursive: true })
      const files = ['manifest.json', 'README.md', path.relative(destPath, mainEntry).split(path.sep).join('/')]
      fs.writeFileSync(path.join(destPath, 'manifest.json'), manifestJson, 'utf-8')
      fs.writeFileSync(mainEntry, buildPluginEntry(options), 'utf-8')
      fs.writeFileSync(path.join(destPath, 'README.md'), buildPluginReadme(options), 'utf-8')
      return {
        success: true,
        result: { relativePath: request.id, files, apiSummary: PLUGIN_API_SUMMARY },
      }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : String(e) }
    }
  })

  ipcMain.handle('plugins:contribution-registry', async () => listPluginContributions())

  ipcMain.handle('plugins:presets:list', async () => listPluginPresets())

  ipcMain.handle('plugins:presets:create', async (_event, presetId: string) => createPresetPlugin(presetId))

  ipcMain.handle('plugins:cli:run', async (_event, request: PluginHostCliRequest) => {
    if (!request || typeof request.command !== 'string' || typeof request.pluginId !== 'string') {
      return {
        success: false,
        code: null,
        signal: null,
        stdout: '',
        stderr: '',
        durationMs: 0,
        cwd: '',
        truncated: { stdout: false, stderr: false },
        error: 'pluginId and command are required.',
      }
    }
    const plugin = plugins.get(request.pluginId)
    if (!plugin?.enabled || plugin.error)
      return {
        success: false,
        code: null,
        signal: null,
        stdout: '',
        stderr: '',
        durationMs: 0,
        cwd: '',
        truncated: { stdout: false, stderr: false },
        error: 'Plugin is not enabled.',
      }
    const pluginPath = request.cwd === 'plugin' ? plugin.path : null
    return runPluginCli(request, { vaultPath: (store.get('vaultDirectory') as string | undefined) ?? null, pluginPath })
  })

  ipcMain.handle('plugins:commands:run', async (_event, request: PluginCommandRunRequest) => {
    if (!request || typeof request.pluginId !== 'string' || typeof request.commandId !== 'string') {
      return { success: false, error: 'pluginId and commandId are required.' }
    }
    return runPluginCommand(request.pluginId, request.commandId, request.payload)
  })

  ipcMain.handle('plugins:active-note', async (_event, note?: PluginActiveNoteInfo | null) => {
    if (note !== undefined) notifyActiveNoteChanged(note ?? null)
    return getActiveNote()
  })

  ipcMain.handle('plugins:edit-note', async (_event, proposal: PluginNoteEditProposal) => proposeNoteEdit(proposal))

  ipcMain.handle('plugins:edit-note:resolve', async (_event, decision: { proposalId: string; accepted: boolean }) => {
    if (!decision || typeof decision.proposalId !== 'string') return false
    return settleEditProposal({ proposalId: decision.proposalId, accepted: Boolean(decision.accepted) })
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
  installPlugin,
  uninstallPlugin,
  getMarketplace,
  semverGt,
  resolvePluginRootDir,
  listPluginPresets,
  createPresetPlugin,
}
