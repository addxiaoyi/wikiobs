/**
 * 内置预设插件 —— 元数据与入口源码。
 *
 * 预设是插件中心的"一键创建"入口：选中后在用户插件目录下生成一份完整、
 * 可直接运行、也可以整份改写的插件。预设本身只是普通 TypeScript 数据，
 * 编译进主进程产物，不依赖任何外部文件。
 */

import { renderCliPlugin, renderLlmPlugin, renderPluginSkeleton } from './plugin-preset-source'
import type { KnownPermission, PluginCategory, PluginPresetKind, PluginScaffoldManifest } from './plugin-types'

export type { PluginPresetKind } from './plugin-types'

export type PluginPresetCategory = Exclude<PluginCategory, 'core'>

/** 预设分组。 */

export interface PluginPresetSourceContext {
  /** 应用设置里的默认模型名；预设不写死模型，换模型后无需重新创建。 */
  defaultModel: string
}

/** 入口源码可以直接给字符串，也可以给构建器以便读取默认模型。 */
export type PluginPresetSource = string | ((context: PluginPresetSourceContext) => string)

export interface PluginPreset {
  /** 同时作为安装后的目录名与运行时插件 ID。 */
  id: string
  kind: PluginPresetKind
  category: PluginPresetCategory
  /** 检索标签，插件中心的归类与搜索依赖它。 */
  tags: readonly string[]
  manifest: PluginScaffoldManifest
  /** 入口文件源码（CommonJS，导出 activate / deactivate）。 */
  source: PluginPresetSource
}

// ---------------------------------------------------------------------------
// LLM 预设
// ---------------------------------------------------------------------------

function llmPreset(fields: {
  id: string
  name: string
  description: string
  tags: readonly string[]
  systemPrompt: string
  commandLabel: string
}): PluginPreset {
  const { id, name, description, tags, systemPrompt, commandLabel } = fields
  return {
    id,
    kind: 'llm',
    category: 'analysis',
    tags,
    manifest: {
      name,
      version: '1.0.0',
      main: 'index.js',
      description,
      author: 'WIKIOBS',
      license: 'MIT',
      homepage: '',
      permissions: ['network'],
      contributions: {
        commands: [{ id: 'ask', label: commandLabel, description }],
        ui: [{ id: 'ask', label: commandLabel, location: 'sidebar', icon: 'Sparkles' }],
      },
    },
    source: renderLlmPlugin({
      name,
      commandId: 'ask',
      commandLabel,
      systemPrompt,
    }),
  }
}

export const LLM_PRESETS: readonly PluginPreset[] = [
  llmPreset({
    id: 'openai-chat',
    name: 'ChatGPT 连接',
    description: '把问题直接交给 ChatGPT 或其他 OpenAI 兼容接口，回答通过事件总线回传。',
    tags: ['llm', 'openai', 'chatgpt', 'openai-compatible', '提问'],
    systemPrompt: '你是 WIKIOBS 的笔记助手。回答简洁、分点；引用笔记时保持原文措辞，不要编造没出现过的链接。',
    commandLabel: '向 ChatGPT 提问',
  }),
  llmPreset({
    id: 'openai-summary',
    name: '笔记摘要（OpenAI）',
    description: '把当前笔记压成三句话摘要：主题、关键结论、下一步。适合晨读与复习。',
    tags: ['llm', 'openai', 'summary', '摘要', '写作'],
    systemPrompt:
      '把用户发来的笔记总结成 3 句话。第一句写主题，第二句写关键结论，第三句写可执行的下一步；不要新增原文没有的信息。',
    commandLabel: '生成笔记摘要',
  }),
  llmPreset({
    id: 'openai-rewrite',
    name: '文字润色（OpenAI）',
    description: '把选中的段落改写得更顺，保留原意与专有名词；输出只含改后的正文，便于整体替换。',
    tags: ['llm', 'openai', 'rewrite', '润色', '写作'],
    systemPrompt: '重写这段文字。保留原意、专有名词与数字，删掉空话，把长句拆短。只输出正文，不要前后缀或解释。',
    commandLabel: '润色选中的文字',
  }),
  llmPreset({
    id: 'openai-outline',
    name: '大纲展开（OpenAI）',
    description: '把一串要点扩写成带小标题的笔记段落，适合写作前先搭骨架。',
    tags: ['llm', 'openai', 'outline', '大纲', '写作'],
    systemPrompt:
      '把用户的要点扩写为 Markdown 笔记：一级标题概括主题，二级标题切分逻辑块，每个块下用短句展开。不要臆造事实；不确定的地方保留为待补充项。',
    commandLabel: '把要点展开成大纲',
  }),
  llmPreset({
    id: 'anthropic-chat',
    name: 'Claude 连接',
    description: '通过 Anthropic Messages 接口把问题发给 Claude，适合长文阅读与严谨推理。',
    tags: ['llm', 'anthropic', 'claude', '提问', '推理'],
    systemPrompt: '你是 WIKIOBS 的笔记助手。先给结论，再给依据；不确定时明确说明是哪一步不确定。',
    commandLabel: '向 Claude 提问',
  }),
  llmPreset({
    id: 'anthropic-critique',
    name: '笔记审阅（Claude）',
    description: '从论点清晰度、证据充分度、结构连贯度三个角度审阅当前笔记，并给出可执行的修改建议。',
    tags: ['llm', 'anthropic', 'claude', 'review', '审阅'],
    systemPrompt: '审阅用户的笔记：先列出 3 个主要问题并指出具体句子，再给出 3 条能直接动手的修改建议。不要重写全文。',
    commandLabel: '审阅当前笔记',
  }),
  llmPreset({
    id: 'ollama-local',
    name: 'Ollama 本地模型',
    description: '调用本机 Ollama 的默认模型，完全离线；模型名跟随应用设置，无需密钥。',
    tags: ['llm', 'ollama', 'local', 'offline', '离线', '本地'],
    systemPrompt: '你是本地笔记助手，回答尽量短。先给结论，再补一两点必要说明。',
    commandLabel: '向本地模型提问',
  }),
]

// ---------------------------------------------------------------------------
// 普通插件预设
// ---------------------------------------------------------------------------

function pluginPreset(fields: {
  id: string
  name: string
  description: string
  tags: readonly string[]
  permissions: KnownPermission[]
  commands: readonly { id: string; label: string }[]
  ui: readonly {
    id: string
    label: string
    location: 'sidebar' | 'editor-toolbar' | 'status-bar' | 'global'
    icon?: string
  }[]
}): PluginPreset {
  const { id, name, description, tags, permissions, commands, ui } = fields
  return {
    id,
    kind: 'plugin',
    category: 'productivity',
    tags,
    manifest: {
      name,
      version: '1.0.0',
      main: 'index.js',
      description,
      author: 'WIKIOBS',
      license: 'MIT',
      homepage: '',
      permissions,
      contributions: { commands: [...commands], ui: [...ui] },
    },
    source: renderPluginSkeleton({ name, commands }),
  }
}

export const PLUGIN_PRESETS: readonly PluginPreset[] = [
  pluginPreset({
    id: 'daily-note',
    name: '每日笔记',
    description: '一键打开今天的日记，没有就新建；可以用来搭自己的晨间流程。',
    tags: ['notes', 'daily', '日记', '习惯'],
    permissions: ['notes.read', 'notes.write'],
    commands: [{ id: 'open-today', label: '打开今天' }],
    ui: [{ id: 'open-today', label: '今天', location: 'sidebar', icon: 'Calendar' }],
  }),
  pluginPreset({
    id: 'frontmatter-tidy',
    name: 'Frontmatter 整理',
    description: '保存时规整标签与时间戳字段，让一批笔记的元数据保持一致。',
    tags: ['notes', 'frontmatter', '标签', '整理'],
    permissions: ['notes.read', 'notes.write'],
    commands: [{ id: 'tidy-current', label: '整理当前笔记' }],
    ui: [{ id: 'tidy-current', label: '整理', location: 'editor-toolbar', icon: 'Wand2' }],
  }),
]

// ---------------------------------------------------------------------------
// CLI 工具预设：把本地命令行工具接到命令面板与侧栏上。
// 真正放行的命令由宿主白名单决定，命令名在入口文件里改一行即可。
// ---------------------------------------------------------------------------

function cliPreset(fields: {
  id: string
  name: string
  description: string
  tags: readonly string[]
  permissions: KnownPermission[]
  command: string
  args: readonly string[]
  timeoutMs: number
  commandLabel: string
  icon: string
}): PluginPreset {
  const { id, name, description, tags, permissions, command, args, timeoutMs, commandLabel, icon } = fields
  return {
    id,
    kind: 'cli' as const,
    category: 'automation',
    tags,
    manifest: {
      name,
      version: '1.0.0',
      main: 'index.js',
      description,
      author: 'WIKIOBS',
      license: 'MIT',
      homepage: '',
      permissions,
      contributions: {
        commands: [{ id: `${id}:run`, label: commandLabel, description }],
        ui: [{ id: `${id}:run`, label: commandLabel, location: 'sidebar', icon }],
      },
    },
    source: () => renderCliPlugin({ name, commandId: id, commandLabel, command, args, timeoutMs }),
  }
}
export const CLI_PRESETS: readonly PluginPreset[] = [
  cliPreset({
    id: 'cli-git-sync',
    name: 'Git 同步',
    description: '在 vault 目录执行 git pull --ff-only。先确认仓库干净，再交给命令面板跑。',
    tags: ['cli', 'git', 'sync', '终端'],
    permissions: ['filesystem'],
    command: 'git',
    args: ['pull', '--ff-only'],
    timeoutMs: 60000,
    commandLabel: '拉取更新（git pull）',
    icon: 'GitBranch',
  }),
  cliPreset({
    id: 'cli-git-status',
    name: 'Git 状态',
    description: '列出 vault 里改动的文件，结果从命令面板直接看到，不必切到终端。',
    tags: ['cli', 'git', 'status'],
    permissions: ['filesystem'],
    command: 'git',
    args: ['status', '--short'],
    timeoutMs: 15000,
    commandLabel: '查看改动（git status）',
    icon: 'GitCommit',
  }),
  cliPreset({
    id: 'cli-ripgrep',
    name: 'ripgrep 搜索',
    description: '在 vault 里用 rg 全文搜索；命令面板传参时直接给关键词。没装 rg 时可用脚本自带的 node 版本。',
    tags: ['cli', 'search', 'rg', '全文搜索'],
    permissions: ['filesystem'],
    command: 'rg',
    args: ['--line-number', '--color', 'never', '--json'],
    timeoutMs: 20000,
    commandLabel: '全文搜索（rg）',
    icon: 'Search',
  }),
  cliPreset({
    id: 'cli-codex-ask',
    name: 'Codex 命令行提问',
    description: '把问题交给已安装的 codex / kimi / claude 命令行助手，回答回到侧栏。命令名在入口文件第一行改。',
    tags: ['cli', 'llm', 'codex', 'kimi', 'claude', 'agent'],
    permissions: ['filesystem', 'network'],
    command: 'codex',
    args: ['exec', '--skip-git-repo-check'],
    timeoutMs: 300000,
    commandLabel: '问命令行助手',
    icon: 'Terminal',
  }),
  cliPreset({
    id: 'cli-ollama-pull',
    name: 'Ollama 拉取模型',
    description: '用 ollama pull 补一个本地模型；模型名在命令面板输入，适合换机后一次性装好。',
    tags: ['cli', 'ollama', 'model', '本地'],
    permissions: ['network', 'filesystem'],
    command: 'ollama',
    args: ['pull'],
    timeoutMs: 300000,
    commandLabel: '拉取 Ollama 模型',
    icon: 'Download',
  }),
]
