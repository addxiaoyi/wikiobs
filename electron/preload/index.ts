import { contextBridge, ipcRenderer } from 'electron'
import {
  EmbeddingModelConfig,
  EmbeddingModelWithLocalPath,
  EmbeddingModelWithRepo,
  LLMConfig,
  LLMAPIConfig,
  LLMGenerationParameters,
  TamaguiThemeTypes,
} from 'electron/main/electron-store/storeConfig'
import { SearchProps } from 'electron/main/electron-store/types'
import { FileInfoTree, FileInfoWithContent, RenameFileProps, WriteFileProps } from 'electron/main/filesystem/types'
import { DBQueryResult } from 'electron/main/vector-database/schema'
import { BackgroundTask } from 'electron/main/incremental-indexer'

import { AgentConfig, ChatMetadata, Chat } from '@/lib/llm/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type IPCHandler<T extends (...args: any[]) => any> = (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createIPCHandler<T extends (...args: any[]) => any>(channel: string): IPCHandler<T> {
  return (...args: Parameters<T>) => ipcRenderer.invoke(channel, ...args) as Promise<Awaited<ReturnType<T>>>
}

const database = {
  search: createIPCHandler<(query: string, limit: number, filter?: string) => Promise<DBQueryResult[]>>('search'),
  deleteLanceDBEntriesByFilePath: createIPCHandler<(filePath: string) => Promise<void>>(
    'delete-lance-db-entries-by-filepath',
  ),
  indexFilesInDirectory: createIPCHandler<() => Promise<void>>('index-files-in-directory'),
  indexFileInDatabase: createIPCHandler<(filePath: string) => Promise<void>>('index-file-in-database'),
  getDatabaseFields: createIPCHandler<() => Promise<Record<string, string>>>('get-database-fields'),
  hybridSearch:
    createIPCHandler<(query: string, limit: number, filter?: string) => Promise<unknown[]>>('hybrid-search'),
  hybridSearchWithReranking:
    createIPCHandler<(query: string, limit: number, filter?: string) => Promise<unknown[]>>(
      'hybrid-search-with-reranking',
    ),
}

const electronUtils = {
  openExternal: createIPCHandler<(url: string) => Promise<void>>('open-external'),
  getPlatform: createIPCHandler<() => Promise<string>>('get-platform'),
  openNewWindow: createIPCHandler<() => Promise<void>>('open-new-window'),
  getReorAppVersion: createIPCHandler<() => Promise<string>>('get-reor-app-version'),
  getUserAppPath: createIPCHandler<() => Promise<string>>('get-user-data-path'),
}

const electronStore = {
  setVaultDirectoryForWindow: createIPCHandler<(path: string) => Promise<void>>('set-vault-directory-for-window'),
  getVaultDirectoryForWindow: createIPCHandler<() => Promise<string>>('get-vault-directory-for-window'),
  getDefaultEmbeddingModel: createIPCHandler<() => Promise<string | undefined>>('get-default-embedding-model'),
  setDefaultEmbeddingModel: createIPCHandler<(repoName: string) => Promise<void>>('set-default-embedding-model'),
  addNewLocalEmbeddingModel: createIPCHandler<(model: EmbeddingModelWithLocalPath) => Promise<void>>(
    'add-new-local-embedding-model',
  ),
  getEmbeddingModels: createIPCHandler<() => Promise<Record<string, EmbeddingModelConfig>>>('get-embedding-models'),
  addNewRepoEmbeddingModel:
    createIPCHandler<(model: EmbeddingModelWithRepo) => Promise<void>>('add-new-repo-embedding-model'),
  updateEmbeddingModel:
    createIPCHandler<
      (modelName: string, updatedModel: EmbeddingModelWithLocalPath | EmbeddingModelWithRepo) => Promise<void>
    >('update-embedding-model'),
  removeEmbeddingModel: createIPCHandler<(modelName: string) => Promise<void>>('remove-embedding-model'),
  getChunkSize: createIPCHandler<() => Promise<number>>('get-chunk-size'),
  setChunkSize: createIPCHandler<(chunkSize: number) => Promise<void>>('set-chunk-size'),
  getLLMGenerationParams: createIPCHandler<() => Promise<LLMGenerationParameters>>('get-llm-generation-params'),
  setLLMGenerationParams:
    createIPCHandler<(params: LLMGenerationParameters) => Promise<void>>('set-llm-generation-params'),
  getAnalyticsMode: createIPCHandler<() => Promise<boolean>>('get-analytics-mode'),
  setAnalyticsMode: createIPCHandler<(isAnalytics: boolean) => Promise<void>>('set-analytics-mode'),
  getSpellCheckMode: createIPCHandler<() => Promise<boolean>>('get-spellcheck-mode'),
  setSpellCheckMode: createIPCHandler<(isSpellCheck: boolean) => Promise<void>>('set-spellcheck-mode'),
  getDocumentStats: createIPCHandler<() => Promise<boolean>>('get-document-stats'),
  setDocumentStats: createIPCHandler<(showWordCount: boolean) => Promise<void>>('set-document-stats'),
  getHasUserOpenedAppBefore: createIPCHandler<() => Promise<boolean>>('has-user-opened-app-before'),
  setHasUserOpenedAppBefore: createIPCHandler<() => Promise<void>>('set-user-has-opened-app-before'),
  getAllChatsMetadata: createIPCHandler<() => Promise<ChatMetadata[]>>('get-all-chats-metadata'),
  saveChat: createIPCHandler<(chat: Chat) => Promise<void>>('save-chat'),
  deleteChat: createIPCHandler<(chatID: string) => Promise<void>>('delete-chat'),
  getChat: createIPCHandler<(chatID: string | undefined) => Promise<Chat | undefined>>('get-chat'),
  getEditorFlexCenter: createIPCHandler<() => Promise<boolean>>('get-editor-flex-center'),
  setEditorFlexCenter: createIPCHandler<(editorFlexCenter: boolean) => Promise<void>>('set-editor-flex-center'),
  getAgentConfigs: createIPCHandler<() => Promise<AgentConfig[]>>('get-agent-configs'),
  setAgentConfig: createIPCHandler<(agentConfig: AgentConfig) => Promise<void>>('set-agent-config'),
  setAutoContext: createIPCHandler<(value: boolean) => Promise<void>>('set-auto-context'),
  getAutoContext: createIPCHandler<() => Promise<boolean>>('get-auto-context'),
  setTamaguiTheme: createIPCHandler<(theme: TamaguiThemeTypes) => Promise<void>>('set-tamagui-theme'),
  getTamaguiTheme: createIPCHandler<() => Promise<TamaguiThemeTypes>>('get-tamagui-theme'),
  getSearchParams: createIPCHandler<() => Promise<SearchProps>>('get-search-params'),
  setSearchParams: createIPCHandler<(searchParams: SearchProps) => Promise<void>>('set-search-params'),
}

const fileSystem = {
  openDirectoryDialog: createIPCHandler<() => Promise<string[] | null>>('open-directory-dialog'),
  openFileDialog: createIPCHandler<(fileExtensions?: string[]) => Promise<string[]>>('open-file-dialog'),
  openImageFileDialog: createIPCHandler<() => Promise<string[]>>('open-img-file-dialog'),
  openVideoFileDialog: createIPCHandler<() => Promise<string[]>>('open-video-file-dialog'),
  getFilesTreeForWindow: createIPCHandler<() => Promise<FileInfoTree>>('get-files-tree-for-window'),
  readFile: createIPCHandler<(filePath: string, encoding: 'utf-8' | string) => Promise<string>>('read-file'),
  writeFile: createIPCHandler<(writeFileProps: WriteFileProps) => Promise<void>>('write-file'),
  storeImage:
    createIPCHandler<(imageData: string, filePath: string, blockID: string) => Promise<string>>('store-image'),
  deleteImage: createIPCHandler<(filePath: string) => Promise<boolean>>('delete-image'),
  getImage: createIPCHandler<(fileName: string) => Promise<string | null>>('get-image'),
  storeVideo:
    createIPCHandler<(videoData: string, filePath: string, blockID: string) => Promise<string>>('store-video'),
  getVideo: createIPCHandler<(fileName: string) => Promise<string | null>>('get-video'),
  isDirectory: createIPCHandler<(filePath: string) => Promise<boolean>>('is-directory'),
  renameFile: createIPCHandler<(renameFileProps: RenameFileProps) => Promise<void>>('rename-file'),
  createFile: createIPCHandler<(filePath: string, content: string) => Promise<void>>('create-file'),
  createDirectory: createIPCHandler<(dirPath: string) => Promise<void>>('create-directory'),
  checkFileExists: createIPCHandler<(filePath: string) => Promise<boolean>>('check-file-exists'),
  deleteFile: createIPCHandler<(filePath: string) => Promise<void>>('delete-file'),
  getAllFilenamesInDirectory: createIPCHandler<(dirName: string) => Promise<string[]>>('get-files-in-directory'),
  getFiles: createIPCHandler<(filePaths: string[]) => Promise<FileInfoWithContent[]>>('get-files'),
}

const path = {
  basename: createIPCHandler<(pathString: string) => Promise<string>>('path-basename'),
  join: createIPCHandler<(...pathSegments: string[]) => Promise<string>>('join-path'),
  dirname: createIPCHandler<(pathString: string) => Promise<string>>('path-dirname'),
  relative: createIPCHandler<(from: string, to: string) => Promise<string>>('path-relative'),
  isAbsolute: createIPCHandler<(filePath: string) => Promise<string>>('path-absolute'),
  addExtensionIfNoExtensionPresent: createIPCHandler<(pathString: string) => Promise<string>>(
    'add-extension-if-no-extension-present',
  ),
  pathSep: createIPCHandler<() => Promise<string>>('path-sep'),
  extName: createIPCHandler<(pathString: string) => Promise<string>>('path-ext-name'),
}

const llm = {
  getLLMConfigs: createIPCHandler<() => Promise<LLMConfig[]>>('get-llm-configs'),
  getLLMAPIConfigs: createIPCHandler<() => Promise<LLMAPIConfig[]>>('get-llm-api-configs'),
  addOrUpdateLLMConfig: createIPCHandler<(model: LLMConfig) => Promise<void>>('add-or-update-llm-config'),
  addOrUpdateLLMAPIConfig:
    createIPCHandler<(modelConfig: LLMAPIConfig) => Promise<void>>('add-or-update-llm-api-config'),
  removeLLM: createIPCHandler<(modelNameToDelete: string) => Promise<void>>('remove-llm'),
  setDefaultLLM: createIPCHandler<(modelName: string) => Promise<void>>('set-default-llm'),
  getDefaultLLMName: createIPCHandler<() => Promise<string>>('get-default-llm-name'),
  pullOllamaModel: createIPCHandler<(modelName: string) => Promise<void>>('pull-ollama-model'),
  deleteLLM: createIPCHandler<(modelNameToDelete: string) => Promise<void>>('delete-llm'),
}

export interface WikiImportOptions {
  sourceType: 'url' | 'sitemap' | 'mediawiki-api' | 'xml-dump' | 'crawl4ai'
  source: string
}

export interface WikiImportResult {
  success: boolean
  imported: number
  skipped: number
  errors: string[]
  files: string[]
}

export interface WikiImportProgress {
  current: number
  total: number
  currentUrl: string
}

export interface AIOrganizationResult {
  filePath: string
  inputCharacters: number
  inputTruncated: boolean
  summary: string
  entities: {
    people: string[]
    places: string[]
    organizations: string[]
    concepts: string[]
    dates: string[]
  }
  tags: string[]
  relatedNotes: string[]
  relations: Array<{ target: string; relation: string }>
}

export interface AIOrganizationProgress {
  current: number
  total: number
  filePath: string
  status: string
}

const wikiImporter = {
  import: createIPCHandler<(options: WikiImportOptions) => Promise<WikiImportResult>>('wiki-import'),
  cancel: createIPCHandler<() => Promise<{ cancelled: boolean }>>('wiki-import-cancel'),
  onProgress: (callback: (progress: WikiImportProgress) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, progress: WikiImportProgress) => callback(progress)
    ipcRenderer.on('wiki-import-progress', listener)
    return () => ipcRenderer.removeListener('wiki-import-progress', listener)
  },
  onComplete: (callback: (result: WikiImportResult) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, result: WikiImportResult) => callback(result)
    ipcRenderer.on('wiki-import-complete', listener)
    return () => ipcRenderer.removeListener('wiki-import-complete', listener)
  },
}

const aiOrganization = {
  previewNotes: createIPCHandler<(filePaths: string[]) => Promise<AIOrganizationResult[]>>('ai-preview-notes'),
  organizeNotes: createIPCHandler<(filePaths: string[]) => Promise<AIOrganizationResult[]>>('ai-organize-notes'),
  applyNotes: createIPCHandler<(results: AIOrganizationResult[]) => Promise<AIOrganizationResult[]>>('ai-apply-notes'),
  organizeVault: createIPCHandler<() => Promise<AIOrganizationResult[]>>('ai-organize-vault'),
  cancel: createIPCHandler<() => Promise<{ cancelled: boolean }>>('ai-organize-cancel'),
  onProgress: (callback: (progress: AIOrganizationProgress) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, progress: AIOrganizationProgress) => callback(progress)
    ipcRenderer.on('ai-organization-progress', listener)
    return () => ipcRenderer.removeListener('ai-organization-progress', listener)
  },
  onCancelled: (callback: () => void) => {
    const listener = () => callback()
    ipcRenderer.on('ai-organization-cancelled', listener)
    return () => ipcRenderer.removeListener('ai-organization-cancelled', listener)
  },
}

const search = {
  // 标准向量搜索
  search: createIPCHandler<(query: string, limit: number, filter?: string) => Promise<DBQueryResult[]>>('search'),
  // 混合搜索（向量 + BM25 + Graph）
  hybridSearch:
    createIPCHandler<(query: string, limit: number, filter?: string) => Promise<unknown[]>>('hybrid-search'),
  hybridSearchWithReranking:
    createIPCHandler<(query: string, limit: number, filter?: string) => Promise<unknown[]>>(
      'hybrid-search-with-reranking',
    ),
}

const indexer = {
  incrementalIndex:
    createIPCHandler<() => Promise<{ added: number; updated: number; deleted: number }>>('incremental-index'),
  addBackgroundTask:
    createIPCHandler<(taskType: string, data: Record<string, unknown>) => Promise<string>>('add-background-task'),
  getTaskStatus: createIPCHandler<(taskId: string) => Promise<BackgroundTask | null>>('get-task-status'),
  getAllTasks: createIPCHandler<() => Promise<BackgroundTask[]>>('get-all-tasks'),
  onProgress: (callback: (progress: { current: number; total: number; status: string }) => void) => {
    return ipcRenderer.on('indexing-progress', (_event, progress) => callback(progress))
  },
}

// Scheduled Tasks
export interface ScheduledTask {
  id: string
  name: string
  type: 'wiki-import' | 'ai-organize' | 'incremental-index' | 'custom'
  schedule: {
    type: 'interval' | 'cron' | 'preset'
    intervalMinutes?: number
    cronExpression?: string
    preset?: 'daily' | 'weekly' | 'monthly'
    hour?: number
    minute?: number
    dayOfWeek?: number
    dayOfMonth?: number
  }
  config: Record<string, unknown>
  enabled: boolean
  lastRun?: string
  nextRun?: string
  status: 'idle' | 'running' | 'error'
  createdAt: string
}

export type ScheduledTaskInput = Omit<
  ScheduledTask,
  'id' | 'status' | 'createdAt' | 'lastRun' | 'nextRun' | 'enabled'
> & {
  enabled?: boolean
}

const scheduledTasks = {
  getAll: createIPCHandler<() => Promise<ScheduledTask[]>>('scheduled-tasks:get-all'),
  get: createIPCHandler<(taskId: string) => Promise<ScheduledTask | undefined>>('scheduled-tasks:get'),
  add: createIPCHandler<(task: ScheduledTaskInput) => Promise<ScheduledTask>>('scheduled-tasks:add'),
  update:
    createIPCHandler<(taskId: string, updates: Partial<ScheduledTask>) => Promise<ScheduledTask | null>>(
      'scheduled-tasks:update',
    ),
  remove: createIPCHandler<(taskId: string) => Promise<{ success: boolean }>>('scheduled-tasks:remove'),
  trigger: createIPCHandler<(taskId: string) => Promise<{ success: boolean }>>('scheduled-tasks:trigger'),
  enable: createIPCHandler<(taskId: string) => Promise<ScheduledTask | null>>('scheduled-tasks:enable'),
  disable: createIPCHandler<(taskId: string) => Promise<ScheduledTask | null>>('scheduled-tasks:disable'),
}

// Knowledge Graph types
export interface WikiLink {
  sourceFile: string
  targetFile: string
  targetTitle: string
  linkType: 'internal' | 'external' | 'broken'
  context: string
  position: { start: number; end: number }
}

export interface Entity {
  id: string
  title: string
  type: 'note' | 'person' | 'place' | 'concept' | 'tag'
  aliases?: string[]
  metadata?: Record<string, unknown>
}

export interface Relation {
  source: string
  target: string
  type: 'links_to' | 'mentions' | 'belongs_to' | 'related_to'
  weight: number
}

export interface KnowledgeGraph {
  entities: Entity[]
  relations: Relation[]
  links: WikiLink[]
}

// Multi-Vault types
export interface Vault {
  id: string
  name: string
  path: string
  isDefault: boolean
  createdAt: string
  lastOpened?: string
}

export interface VaultMetadata {
  totalNotes: number
  lastModified: string
  size: number
}

// Export types
export interface ExportOptions {
  tags?: string[]
  dateFrom?: string
  dateTo?: string
  includeAttachments?: boolean
  includeSubfolders?: boolean
  outputPath?: string
}

export interface NoteMetadata {
  filePath: string
  title: string
  tags: string[]
  modified: string
  created: string
  content?: string
}

export interface ObsidianNote {
  filePath: string
  title: string
  content: string
  frontmatter: Record<string, unknown>
  tags: string[]
  created: Date
  modified: Date
}

// Plugin types
export interface Plugin {
  id: string
  name: string
  version: string
  description?: string
  author?: string
  permissions?: string[]
  error?: string
  enabled: boolean
  settings?: Record<string, unknown>
}

export interface PluginAPI {
  registerTool: (tool: {
    name: string
    description: string
    execute: (params: Record<string, unknown>) => Promise<unknown>
  }) => void
  registerUIComponent: (component: { id: string; position: string; render: () => void }) => void
  hookIntoEvent: (event: string, callback: () => void) => void
}

const knowledgeGraph = {
  build:
    createIPCHandler<(options?: { includeContent?: boolean; maxDepth?: number }) => Promise<KnowledgeGraph>>(
      'knowledge-graph:build',
    ),
  getEntityRelations: createIPCHandler<
    (
      graph: KnowledgeGraph,
      entityId: string,
    ) => Promise<{
      incoming: Relation[]
      outgoing: Relation[]
    }>
  >('knowledge-graph:get-entity-relations'),
  findRelated:
    createIPCHandler<(graph: KnowledgeGraph, entityId: string, maxResults?: number) => Promise<Entity[]>>(
      'knowledge-graph:find-related',
    ),
  exportJson: createIPCHandler<(graph: KnowledgeGraph) => Promise<string>>('knowledge-graph:export-json'),
  exportDot: createIPCHandler<(graph: KnowledgeGraph) => Promise<string>>('knowledge-graph:export-dot'),
  parseLinks:
    createIPCHandler<(filePath: string, content: string) => Promise<WikiLink[]>>('knowledge-graph:parse-links'),
}

const multiVault = {
  getAll: createIPCHandler<() => Promise<Vault[]>>('vault:get-all'),
  get: createIPCHandler<(vaultId: string) => Promise<Vault | undefined>>('vault:get'),
  current: createIPCHandler<() => Promise<Vault | null>>('vault:current'),
  add: createIPCHandler<(vault: Omit<Vault, 'id' | 'createdAt'>) => Promise<Vault>>('vault:add'),
  remove: createIPCHandler<(vaultId: string) => Promise<{ success: boolean }>>('vault:remove'),
  switch: createIPCHandler<(vaultId: string) => Promise<{ success: boolean }>>('vault:switch'),
  setDefault: createIPCHandler<(vaultId: string) => Promise<{ success: boolean }>>('vault:set-default'),
  update: createIPCHandler<(vaultId: string, updates: Partial<Vault>) => Promise<Vault | null>>('vault:update'),
  rename: createIPCHandler<(vaultId: string, newName: string) => Promise<Vault | null>>('vault:rename'),
  duplicate: createIPCHandler<(vaultId: string, newPath: string) => Promise<Vault | null>>('vault:duplicate'),
  validate: createIPCHandler<(vaultPath: string) => Promise<{ valid: boolean; error?: string }>>('vault:validate'),
  metadata: createIPCHandler<(vaultId: string) => Promise<VaultMetadata | null>>('vault:metadata'),
}

const exportModule = {
  exportVault:
    createIPCHandler<
      (
        options?: ExportOptions,
      ) => Promise<{ success: boolean; outputPath?: string; filesExported?: number; error?: string }>
    >('export:zip'),
  exportNotes:
    createIPCHandler<
      (
        filePaths: string[],
        options?: ExportOptions,
      ) => Promise<{ success: boolean; outputPath?: string; filesExported?: number; error?: string }>
    >('export:selective'),
  exportToObsidian:
    createIPCHandler<
      (options: {
        outputDir: string
      }) => Promise<{ success: boolean; exported?: number; outputDir?: string; errors?: string[]; error?: string }>
    >('obsidian:export'),
  exportPdf:
    createIPCHandler<
      (
        options?: ExportOptions,
      ) => Promise<{ success: boolean; outputPath?: string; filesExported?: number; error?: string }>
    >('export:pdf'),
  exportGraphJson:
    createIPCHandler<() => Promise<{ success: boolean; outputPath?: string; filesExported?: number; error?: string }>>(
      'export:graph',
    ),
  exportSingleMarkdown:
    createIPCHandler<() => Promise<{ success: boolean; outputPath?: string; filesExported?: number; error?: string }>>(
      'export:single-markdown',
    ),
  exportPreview:
    createIPCHandler<
      (options?: ExportOptions) => Promise<{ success: boolean; files?: NoteMetadata[]; error?: string }>
    >('export:preview'),
}

const plugin = {
  getAll: createIPCHandler<() => Promise<Plugin[]>>('plugins:list'),
  get: createIPCHandler<(pluginId: string) => Promise<Plugin | undefined>>('plugins:loaded'),
  inspect:
    createIPCHandler<
      (pluginPath: string) => Promise<{ success: boolean; error?: string; manifest?: Omit<Plugin, 'id' | 'enabled'> }>
    >('plugins:inspect'),
  install:
    createIPCHandler<(pluginPath: string) => Promise<{ success: boolean; error?: string; plugin?: Plugin }>>(
      'plugins:install',
    ),
  uninstall: createIPCHandler<(pluginId: string) => Promise<boolean>>('plugins:uninstall'),
  enable: createIPCHandler<(pluginId: string) => Promise<{ success: boolean; error?: string }>>('plugins:enable'),
  disable: createIPCHandler<(pluginId: string) => Promise<{ success: boolean; error?: string }>>('plugins:disable'),
  updateSettings:
    createIPCHandler<(pluginId: string, settings: Record<string, unknown>) => Promise<void>>('plugins:execute-hook'),
  load: createIPCHandler<(pluginId: string) => Promise<Plugin | null>>('plugins:load'),
  unload: createIPCHandler<(pluginId: string) => Promise<boolean>>('plugins:unload'),
  getApi: createIPCHandler<(pluginId: string) => Promise<Record<string, unknown>>>('plugins:get-api'),
}

// Graph types
export interface GraphNode {
  id: string
  label: string
  x?: number
  y?: number
  tags?: string[]
  type?: string
}

export interface GraphEdge {
  source: string
  target: string
  type: 'related' | 'link' | 'mention'
  weight?: number
}

export interface GraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

// Expose to renderer process
contextBridge.exposeInMainWorld('database', database)
contextBridge.exposeInMainWorld('electronUtils', electronUtils)
contextBridge.exposeInMainWorld('electronStore', electronStore)
contextBridge.exposeInMainWorld('fileSystem', fileSystem)
contextBridge.exposeInMainWorld('path', path)
contextBridge.exposeInMainWorld('llm', llm)
contextBridge.exposeInMainWorld('wikiImporter', wikiImporter)
contextBridge.exposeInMainWorld('aiOrganization', aiOrganization)
contextBridge.exposeInMainWorld('search', search)
contextBridge.exposeInMainWorld('indexer', indexer)
contextBridge.exposeInMainWorld('knowledgeGraph', knowledgeGraph)
contextBridge.exposeInMainWorld('scheduledTasks', scheduledTasks)
contextBridge.exposeInMainWorld('multiVault', multiVault)
contextBridge.exposeInMainWorld('exportModule', exportModule)
contextBridge.exposeInMainWorld('plugin', plugin)

// Keep the legacy bridge for a few renderer paths that are not wrapped above.
// A renderer compromise must not become an arbitrary main-process IPC primitive.
const legacyInvokeChannels = new Set([
  'window-close-ready',
  'obsidian:export',
  'obsidian:import',
  'open-directory-dialog',
])
const legacyEventChannels = new Set([
  'indexing-progress',
  'error-to-display-in-window',
  'spellcheck-changed',
  'prepare-for-window-close',
  'vault-switched',
  'files-list',
  'editor-flex-center-changed',
  'show-doc-stats-changed',
  'wiki-import-progress',
  'wiki-import-complete',
  'ollamaDownloadProgress',
  'ai-organization-progress',
  'llm-configs-changed',
])

const assertLegacyChannel = (channels: Set<string>, channel: string): void => {
  if (!channels.has(channel)) throw new Error(`IPC channel is not exposed: ${channel}`)
}

const ipcReceiver = (channel: string, func: (...args: any[]) => void) => {
  assertLegacyChannel(legacyEventChannels, channel)
  const subscription = (_event: Electron.IpcRendererEvent, ...args: any[]) => func(...args)
  ipcRenderer.on(channel, subscription)
  return () => {
    ipcRenderer.removeListener(channel, subscription)
  }
}

contextBridge.exposeInMainWorld('ipcRenderer', {
  on: ipcReceiver,
  receive: ipcReceiver,
  invoke: (channel: string, ...args: any[]) => {
    assertLegacyChannel(legacyInvokeChannels, channel)
    return ipcRenderer.invoke(channel, ...args)
  },
})

// Add to Window interface for renderer
declare global {
  interface Window {
    ipcRenderer: {
      on: (channel: string, func: (...args: any[]) => void) => () => void
      receive: (channel: string, func: (...args: any[]) => void) => () => void
      invoke: (channel: string, ...args: any[]) => Promise<any>
    }
  }
}

// Type declarations
declare global {
  interface Window {
    database: typeof database
    electronUtils: typeof electronUtils
    electronStore: typeof electronStore
    fileSystem: typeof fileSystem
    path: typeof path
    llm: typeof llm
    wikiImporter: typeof wikiImporter
    aiOrganization: typeof aiOrganization
    search: typeof search
    indexer: typeof indexer
    knowledgeGraph: typeof knowledgeGraph
    scheduledTasks: typeof scheduledTasks
    multiVault: typeof multiVault
    exportModule: typeof exportModule
    plugin: typeof plugin
  }
}
