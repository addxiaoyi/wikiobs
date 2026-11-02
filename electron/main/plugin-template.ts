import * as fs from 'fs'
import * as path from 'path'
import type {
  PluginCommandContribution,
  PluginScaffoldOptions,
  PluginUiContribution,
  PluginUiSlot,
} from '@shared/plugin-types'

const VALID_SLOTS: readonly PluginUiSlot[] = ['sidebar', 'editor-toolbar', 'status-bar', 'global']

export function mergeContributions(options: PluginScaffoldOptions): {
  commands: PluginCommandContribution[]
  ui: PluginUiContribution[]
} {
  const commandMap = new Map<string, PluginCommandContribution>()
  for (const command of options.manifest.contributions?.commands ?? []) commandMap.set(command.id, command)
  for (const command of options.extra?.commands ?? []) commandMap.set(command.id, command)

  const uiMap = new Map<string, PluginUiContribution>()
  for (const item of options.manifest.contributions?.ui ?? []) uiMap.set(item.id, item)
  for (const item of options.extra?.ui ?? []) uiMap.set(item.id, item)

  return { commands: Array.from(commandMap.values()), ui: Array.from(uiMap.values()) }
}

export function assertValidId(id: string, label: string): void {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/.test(id)) {
    throw new Error(`${label} must start with a letter or digit and only contain letters, digits, ".", "_" or "-".`)
  }
}

export function sanitizeSlot(location: string): PluginUiSlot {
  return (VALID_SLOTS as readonly string[]).includes(location) ? (location as PluginUiSlot) : 'sidebar'
}

export function buildPluginManifestJson(options: PluginScaffoldOptions): string {
  assertValidId(options.id, 'Plugin ID')
  const { commands, ui } = mergeContributions(options)
  const manifest = {
    name: options.manifest.name,
    version: options.manifest.version,
    main: options.manifest.main,
    description: options.manifest.description,
    author: options.manifest.author,
    license: options.manifest.license,
    homepage: options.manifest.homepage,
    permissions: options.manifest.permissions,
    contributions: {
      commands: commands.map(({ id, label, description, keybinding }) => {
        const entry: Record<string, string> = { id, label }
        if (description) entry.description = description
        if (keybinding) entry.keybinding = keybinding
        return entry
      }),
      ui: ui.map(({ id, label, location, icon }) => {
        const entry: Record<string, string> = { id, label, location: sanitizeSlot(location) }
        if (icon) entry.icon = icon
        return entry
      }),
    },
  }
  return `${JSON.stringify(manifest, null, 2)}\n`
}

// 生成插件入口使用的 JS 模板：先写成不含反引号/美元花括号的字面量，再在生成时替换占位符，
// 避免在 TS 源码里嵌套模板字符串导致的格式错乱。
const ENTRY_TEMPLATE = [
  "'use strict'",
  '// __PLUGIN_NAME__ — WIKIOBS 插件入口',
  '//',
  '// 由插件创作器生成。api 对象就是本插件可用的全部能力，按需增删下列段落即可。',
  '//',
  '// api.storage     插件私有的持久化键值存储：get / set / delete',
  '// api.hooks       订阅生命周期：onNoteCreated / onNoteSaved / onNoteDeleted / onVaultIndexed / onSearch',
  "// api.events      插件间事件总线：emit(name, data) / on(name, cb)，支持 'other:event' 与 '*:event'",
  '// api.commands    注册可被命令面板调用的命令：register(id, handler) / run(id, payload)',
  '// api.ui          渲染座席：renderItem({ id, label, location, icon, onActivate })',
  '// api.app         应用能力：getVaultPath / getNoteContent / setNoteContent / showNotification',
  '',
  'exports.activate = (api) => {',
  "  const bootCount = (api.storage.get('bootCount') || 0) + 1",
  "  api.storage.set('bootCount', bootCount)",
  '  api.app.showNotification(__PLUGIN_NAME__ + " 已激活（第 " + bootCount + " 次）", "info")',
  '',
  '__COMMANDS__',
  '',
  '__UI__',
  '}',
  '',
  'exports.deactivate = () => {',
  '  // 释放定时器、监听器与外部连接',
  '}',
  '',
].join('\n')

function buildCommandBlock(command: PluginCommandContribution): string {
  const id = JSON.stringify(command.id)
  const label = JSON.stringify(command.label)
  return [
    `  // command: ${command.label}`,
    `  api.commands.register(${id}, (payload) => {`,
    `    api.app.showNotification(${label} + " 已执行")`,
    `    return { id: ${id}, payload }`,
    '  })',
  ].join('\n')
}

function buildUiBlock(item: PluginUiContribution): string {
  const id = JSON.stringify(item.id)
  const label = JSON.stringify(item.label)
  const location = JSON.stringify(sanitizeSlot(item.location))
  const icon = JSON.stringify(item.icon ?? 'Sparkles')
  return [
    `  // ui: ${item.label}`,
    '  api.ui.renderItem({',
    `    id: ${id},`,
    `    label: ${label},`,
    `    location: ${location},`,
    `    icon: ${icon},`,
    '    onActivate: () => {',
    `      api.app.showNotification(${label} + " 被点击")`,
    '    },',
    '  })',
  ].join('\n')
}

export function buildPluginEntry(options: PluginScaffoldOptions): string {
  assertValidId(options.id, 'Plugin ID')
  const { commands, ui } = mergeContributions(options)
  return ENTRY_TEMPLATE.replaceAll('__PLUGIN_NAME__', JSON.stringify(options.manifest.name))
    .replace('__COMMANDS__', commands.map(buildCommandBlock).join('\n\n'))
    .replace('__UI__', ui.map(buildUiBlock).join('\n\n'))
}

export function buildPluginReadme(options: PluginScaffoldOptions): string {
  return [
    `# ${options.manifest.name}`,
    '',
    options.manifest.description,
    '',
    `- 版本: ${options.manifest.version}`,
    `- 作者: ${options.manifest.author || '未署名'}`,
    `- 许可证: ${options.manifest.license || '未声明'}`,
    `- 权限: ${options.manifest.permissions.length ? options.manifest.permissions.join(', ') : '无'}`,
    '',
    '## 入口',
    '',
    `\`${options.manifest.main}\` 导出可选的 \`activate(api)\` 与 \`deactivate()\`。`,
    '',
    '## api 骨架',
    '',
    '| 能力 | 说明 |',
    '| --- | --- |',
    '| `api.storage` | `get / set / delete`，插件私有的持久化键值存储 |',
    '| `api.hooks` | `onNoteCreated / onNoteSaved / onNoteDeleted / onVaultIndexed / onSearch` |',
    '| `api.events` | `emit(name, data)`、`on(name, cb)`，支持跨插件事件 |',
    '| `api.commands` | `register(id, handler)`、`run(id, payload)`，命令面板可调用 |',
    '| `api.ui` | `renderItem({ id, label, location, icon, onActivate })` |',
    '| `api.app` | `getVaultPath / getNoteContent / setNoteContent / showNotification` |',
    '',
    '所有能力均按需使用，未调用的部分不会产生开销。',
    '',
    '## 调试',
    '',
    '在 WIKIOBS「插件」视图中加载本目录即可试用：插件会被启用并出现在已安装列表，',
    '可随时禁用或卸载。运行期错误会记录到主进程日志。',
    '',
  ].join('\n')
}

// ============================================================================
// 安装相关的纯文件系统辅助
//
// 插件包有两种常见布局：manifest.json 直接位于包根，或整包多套了一层目录
// （GitHub 的 "Download ZIP" 就是后者）。安装时先找到真正的根再拷贝，
// 否则插件目录里会多出一层不明所以的文件夹再接 manifest。
// ============================================================================

function isDirectory(dir: string): boolean {
  try {
    return fs.statSync(dir).isDirectory()
  } catch {
    return false
  }
}

/**
 * 在解包/拷贝后的目录里定位插件根：根上有 manifest.json 就是根，
 * 否则要求恰好只有一个顶层子目录且它带 manifest.json。
 */
export function resolvePluginRootDir(stagingDir: string): string {
  const root = path.resolve(stagingDir)
  const rootManifest = path.join(root, 'manifest.json')
  if (fs.existsSync(rootManifest) && fs.statSync(rootManifest).isFile()) return root

  const candidates: string[] = []
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (entry.name.startsWith('__MACOSX')) continue
    const candidateManifest = path.join(root, entry.name, 'manifest.json')
    if (entry.isDirectory() && fs.existsSync(candidateManifest) && fs.statSync(candidateManifest).isFile()) {
      candidates.push(path.join(root, entry.name))
    }
  }
  if (candidates.length === 1) return candidates[0]
  if (candidates.length > 1) throw new Error('Plugin package contains more than one manifest.json.')
  throw new Error('manifest.json was not found.')
}

/** 从用户选中的路径（可能是插件根，也可能是它的上一层）解析出真正的插件根。 */
export function resolvePluginSourceRoot(source: string): string {
  if (!source || !fs.existsSync(source)) throw new Error('Plugin path does not exist.')
  if (!isDirectory(source)) throw new Error('Plugin path must be a directory.')
  return resolvePluginRootDir(source)
}

/** 递归拷贝插件目录；遇到符号链接或特殊文件直接拒绝，避免把 vault 外的东西带进插件目录。 */
export function copyPluginTree(source: string, destination: string): void {
  fs.mkdirSync(destination, { recursive: true })
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    if (entry.name === '__MACOSX') continue
    const from = path.join(source, entry.name)
    const to = path.join(destination, entry.name)
    if (entry.isSymbolicLink()) throw new Error('Plugin packages cannot contain symbolic links.')
    else if (entry.isDirectory()) copyPluginTree(from, to)
    else if (entry.isFile()) fs.copyFileSync(from, to)
    else throw new Error('Plugin package contains an unsupported filesystem entry.')
  }
}
