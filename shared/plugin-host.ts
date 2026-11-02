/**
 * 插件入口可用的宿主能力接口。
 *
 * 插件入口在主进程里以独立模块加载，不接触 ipcMain，也无法读写应用 store；
 * plugin-system 在激活时把这些能力作为 api 的一部分注入，
 * 让插件作者不必自己拼 fetch、不必处理进程间通信。
 */

import type { PluginCliContext } from './plugin-cli'

export type { PluginCliContext, PluginCliRequest, PluginCliResult, PluginHostInfo } from './plugin-cli'

export interface PluginNote {
  /** 相对 vault 的路径。 */
  path: string
  title: string
  content: string
}

/** 读取/写入笔记的上下文，由宿主在调用时注入，插件无法伪造 vault 路径。 */
export interface PluginNotesContext {
  listNotes: () => PluginNote[]
  readNote: (notePath: string) => string | null
}

export interface PluginLLMChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface PluginLLMChatRequest {
  /** 省略时使用应用设置里的默认模型。 */
  model?: string
  messages: PluginLLMChatMessage[]
  temperature?: number
  maxTokens?: number
  /** 覆盖 Ollama 地址；省略时读取应用设置里的 Ollama 配置。 */
  baseUrl?: string
}

export interface PluginLLMChatResult {
  success: boolean
  /** 模型返回的完整文本。 */
  content?: string
  model?: string
  /** 实际请求的地址，便于插件提示用户 Ollama 是否连接了预期实例。 */
  baseUrl?: string
  error?: string
}

export interface PluginLLMClient {
  chat: (request: PluginLLMChatRequest) => Promise<PluginLLMChatResult>
  /** 列出模型；baseUrl 省略时读取应用设置。 */
  listModels: (baseUrl?: string) => Promise<string[]>
  isEmpty: () => boolean
}

export interface PluginAIContext {
  llm: PluginLLMClient
  /** 用 {{name}} 占位符填充模板，便于插件把 prompt 写成数据而不是拼接字符串。 */
  prompt: (template: string, variables?: Record<string, unknown>) => string
}

export interface PluginEditingContext {
  notes: PluginNotesContext
}

export interface PluginHostServices {
  ai: PluginAIContext
  editing: PluginEditingContext
  /** 本地命令行工具；具体命令由插件传入，宿主按白名单与超时执行。 */
  cli: PluginCliContext
  /** 本插件被授予的权限，来源于 manifest.json；插件可据此自己降级 UI。 */
  permissions: readonly string[]
}
