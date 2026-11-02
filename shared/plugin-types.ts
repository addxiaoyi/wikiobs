/**
 * 插件 manifest 的共享类型定义。
 * 同时被主进程、preload 与渲染进程（插件编辑器）引用，避免三处各写一份导致漂移。
 */

export type PluginCategory = 'core' | 'productivity' | 'writing' | 'analysis' | 'automation' | 'integration'

export type PluginUiSlot = 'sidebar' | 'editor-toolbar' | 'status-bar' | 'global'

export interface PluginUiContribution {
  /** 渲染层唯一标识，用于生成 React key 与 DOM data 属性。 */
  id: string
  /** 人类可读标签，显示在按钮/侧栏项上；可被插件的 i18n 覆盖。 */
  label: string
  /** 挂载位置。 */
  location: PluginUiSlot
  /** 可选图标名（lucide-react 导出名）。 */
  icon?: string
}

export interface PluginCommandContribution {
  id: string
  label: string
  description?: string
  keybinding?: string
}

export interface PluginSettingContribution {
  key: string
  type: 'string' | 'boolean' | 'number'
  default: unknown
  label: string
  description?: string
}

export interface PluginContributions {
  commands?: PluginCommandContribution[]
  ui?: PluginUiContribution[]
  settings?: PluginSettingContribution[]
}

export interface PluginManifest {
  name: string
  version: string
  main: string
  description?: string
  author?: string
  license?: string
  homepage?: string
  repository?: string
  permissions: string[]
  contributions?: PluginContributions
}

export type KnownPermission = 'notes.read' | 'notes.write' | 'vault.read' | 'vault.write' | 'network' | 'filesystem'

/** 所有受支持的权限键，主进程校验与渲染层权限展示共用。 */
export const KNOWN_PERMISSIONS: readonly KnownPermission[] = [
  'notes.read',
  'notes.write',
  'vault.read',
  'vault.write',
  'network',
  'filesystem',
]

export function isKnownPermission(value: string): value is KnownPermission {
  return (KNOWN_PERMISSIONS as readonly string[]).includes(value)
}

/**
 * 权限影响面。用户看到的是"这条权限能干什么"，而不是权限字符串本身：
 *   low    只能读当前 vault 的笔记或元信息
 *   medium 能改写 vault 里的文件
 *   high   能离开 vault——发起网络请求或在本机起子进程
 */
export type PermissionRisk = 'low' | 'medium' | 'high'

export interface PermissionDescriptor {
  permission: KnownPermission
  risk: PermissionRisk
}

export const PERMISSION_DESCRIPTORS: Readonly<Record<KnownPermission, PermissionDescriptor>> = {
  'notes.read': { permission: 'notes.read', risk: 'low' },
  'notes.write': { permission: 'notes.write', risk: 'medium' },
  'vault.read': { permission: 'vault.read', risk: 'low' },
  'vault.write': { permission: 'vault.write', risk: 'medium' },
  network: { permission: 'network', risk: 'high' },
  filesystem: { permission: 'filesystem', risk: 'high' },
}

const RISK_ORDER: Record<PermissionRisk, number> = { low: 0, medium: 1, high: 2 }

export function permissionRisk(permission: string): PermissionRisk | null {
  return isKnownPermission(permission) ? PERMISSION_DESCRIPTORS[permission].risk : null
}

/** 一组权限里最高的影响面；未知权限不计入，所以空列表得到 'low'。 */
export function highestPermissionRisk(permissions: readonly string[]): PermissionRisk {
  let highest: PermissionRisk = 'low'
  for (const permission of permissions) {
    const risk = permissionRisk(permission)
    if (risk && RISK_ORDER[risk] > RISK_ORDER[highest]) highest = risk
  }
  return highest
}

/**
 * 插件开发者在一次创作中可选的 manifest 草稿。
 * `name / version / main` 与运行时的核心字段保持一致，其余为可选元数据。
 */
export interface PluginScaffoldManifest {
  name: string
  version: string
  main: string
  description: string
  author: string
  license: string
  homepage: string
  permissions: KnownPermission[]
  contributions: {
    commands: PluginCommandContribution[]
    ui: PluginUiContribution[]
  }
}

export interface PluginScaffoldOptions {
  /** 插件标识目录名，同时用作运行时插件 ID。 */
  id: string
  /** 生成的清单。id 会写入清单文件，插件加载时再以此识别运行时插件。 */
  manifest: PluginScaffoldManifest
  /** 额外的 UI 与命令提供点，与 manifest 中的 contributions 合并去重后注入。 */
  extra?: {
    commands?: PluginCommandContribution[]
    ui?: PluginUiContribution[]
  }
}

export interface PluginScaffoldResult {
  /** 插件在 plugins 目录下的相对路径。 */
  relativePath: string
  /** 创建的文件相对路径列表。 */
  files: string[]
  /** 提供给作者预览的核心 API 描述。 */
  apiSummary: string[]
}

// ============================================================================
// IPC 契约：主进程 <-> 渲染进程
// 下面这些类型同时被 electron/main/plugin-system(-contributions).ts、
// electron/preload/index.ts 与 src 使用，是唯一事实源。
// ============================================================================

/** 插件创作器提交的草稿：只允许声明白名单内的字段，主进程负责落盘与校验。 */
export interface PluginScaffoldRequest {
  id: string
  manifest: PluginScaffoldManifest
}

/** 创作结果。success=false 时 error 说明具体原因（非法 ID、目录已存在等）。 */
export interface PluginScaffoldResponse {
  success: boolean
  error?: string
  result?: PluginScaffoldResult
}

/** 单个 UI 贡献点的运行时归属信息。 */
export interface PluginUiContributionEntry extends PluginUiContribution {
  /** 提供该贡献点的插件 ID（目录名）。 */
  pluginId: string
  /** 插件在清单中声明的显示名，便于 UI 直接展示。 */
  pluginName: string
  /** 插件是否处于启用状态；渲染层只应展示 enabled=true 的条目。 */
  enabled: boolean
}

/** 已启用插件贡献的、可被命令面板调用的命令。 */
export interface PluginCommandEntry extends PluginCommandContribution {
  pluginId: string
  pluginName: string
}

/** 渲染层可订阅的插件贡献注册表。 */
export interface PluginContributionRegistry {
  ui: PluginUiContributionEntry[]
  commands: PluginCommandEntry[]
}

/** 运行一条插件命令。 */
export interface PluginCommandRunRequest {
  pluginId: string
  commandId: string
  /** 透传给插件命令处理器的任意 JSON 载荷。 */
  payload?: unknown
}

export interface PluginCommandRunResult {
  success: boolean
  error?: string
  /** 命令处理器的返回值；不可序列化时为 undefined。 */
  result?: unknown
}

/** 读取当前活动笔记（编辑器或侧栏选中的笔记）。 */
export interface PluginActiveNoteInfo {
  /** 相对 vault 的路径，作为 api.app.getNoteContent 的入参。 */
  path: string
  title: string
}

/**
 * 插件对笔记的一次编辑提案。
 * 渲染层展示差异，用户确认后才写盘——插件不直接覆盖正文，避免静默丢失用户输入。
 */
export interface PluginNoteEditProposal {
  /** 相对 vault 的路径。 */
  path: string
  /** 提案理由，显示在差异面板顶部，便于用户判断是否接受。 */
  rationale?: string
  /** 自提案生成以来用户未再修改的原文；与磁盘内容不一致视为过期冲突。 */
  originalContent: string
  /** 建议的新正文。 */
  proposedContent: string
}

/** preload 暴露给渲染进程的插件创作能力。 */
export interface PluginScaffoldBridge {
  /** 拉取目标目录下的插件 SKILL.md 模板。 */
  getTemplate: (pluginId: string) => Promise<{ success: boolean; template?: string; error?: string }>
  /** 按草稿创建插件骨架并写入磁盘 ids。 */
  scaffold: (request: PluginScaffoldRequest) => Promise<PluginScaffoldResponse>
}

// ============================================================================
// 预设插件：插件中心"一键创建"的入口，属于本地模板而非远程市场
// ============================================================================

/** 预设分组，与 shared/plugin-presets.ts 的分类一致。 */
export type PluginPresetKind = 'plugin' | 'llm' | 'cli'

/** 插件中心列出的一个可创建预设。source 是即将写入磁盘的入口源码。 */
export interface PluginPresetListing {
  id: string
  kind: PluginPresetKind
  category: PluginCategory
  tags: readonly string[]
  name: string
  version: string
  description: string
  permissions: string[]
  /** 用户插件目录下已存在同名目录。 */
  installed: boolean
  /** 渲染层据此渲染入口文件预览。 */
  source: string
}

/** 按预设创建插件的结果。 */
export interface PluginPresetCreateResponse {
  success: boolean
  error?: string
  plugin?: { id: string; name: string; version: string; enabled: boolean }
}
