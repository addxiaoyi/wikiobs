/**
 * CLI 工具连接：插件把本地命令行工具当作自己的能力来用。
 *
 * 插件只能声明"想跑什么"，实际执行由主进程统一完成——工作目录受限、
 * 超时与输出上限由宿主兜底，插件拿到的是一份结构化结果而不是原始进程。
 */

/** 一次 CLI 调用的请求。字段全部显式，插件无法注入 stdout 之外的参数。 */
export interface PluginCliRequest {
  /** 可执行文件名或路径，如 git、rg、node、codex。 */
  command: string
  args?: string[]
  /** 工作目录：vault 或插件自身目录；省略时使用 vault。 */
  cwd?: 'vault' | 'plugin'
  /** 写入 stdin 的文本；省略时不写入。 */
  stdin?: string
  /** 毫秒，默认 30000，上限 300000。 */
  timeoutMs?: number
  /** 额外环境变量；只会叠加在宿主环境下，不会替换 PATH。 */
  env?: Record<string, string>
}

export interface PluginCliResult {
  success: boolean
  /** 进程正常退出时为退出码；被超时或信号终止时为 null。 */
  code: number | null
  signal: string | null
  stdout: string
  stderr: string
  durationMs: number
  /** 命令真正执行的工作目录。 */
  cwd: string
  /** 输出被截断时标记，便于插件提示用户结果不完整。 */
  truncated: { stdout: boolean; stderr: boolean }
  /** 超时、参数非法等宿主侧失败；非零退出码不算 error。 */
  error?: string
}

export interface PluginCliContext {
  /** 执行命令并等待结束；永不 reject，失败体现在 success/error。 */
  run: (request: PluginCliRequest, options?: PluginCliRunOptions) => Promise<PluginCliResult>
  /** 命令是否在 PATH 上可见，用于设置页做可用性提示。 */
  isAvailable: (command: string) => Promise<boolean>
  /** 本机内置支持的命令白名单；真正放行的见 PluginHostInfo.cliCommands。 */
  allowedCommands: readonly string[]
}

/** 宿主允许宿主插件调用的命令。新增命令需同时放行，避免插件变成任意代码执行器。 */
export const PLUGIN_CLI_ALLOWED_COMMANDS: readonly string[] = [
  'git',
  'rg',
  'node',
  'python',
  'python3',
  'npm',
  'kimi',
  'codex',
  'claude',
  'ollama',
]

export const PLUGIN_CLI_DEFAULT_TIMEOUT_MS = 30000
export const PLUGIN_CLI_MAX_TIMEOUT_MS = 300000

/** stdout / stderr 各自保留的字节上限，超出部分截断而不是让主进程吃满内存。 */
export const PLUGIN_CLI_MAX_OUTPUT_BYTES = 1000000

/** 单个参数长度上限，挡住把整篇笔记当命令行参数塞进去这类误用。 */
export const PLUGIN_CLI_MAX_ARG_LENGTH = 8192

/** 一次调用可覆盖的工作目录：插件目录由 hostInfo.pluginPath 给出。 */
export interface PluginCliRunOptions {
  pluginPath?: string | null
}

/** 插件在入口文件里能读到的宿主信息。 */
export interface PluginHostInfo {
  /** 插件自身目录；以源码目录形式加载时才有值。 */
  pluginPath: string | null
  /** 当前 vault 根目录；未打开库时为 null。 */
  vaultPath: string | null
  /** 宿主放行的 CLI 命令。 */
  cliCommands: readonly string[]
  /** 本插件已被授予的权限；未声明的不会出现在这里。 */
  permissions?: readonly string[]
}

/** 渲染层转发 CLI 请求时要带上发起插件，主进程据此校验该插件是否启用并定位其目录。 */
export interface PluginHostCliRequest extends PluginCliRequest {
  pluginId: string
}
