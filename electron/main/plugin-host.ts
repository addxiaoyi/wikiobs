/**
 * 插件宿主能力实现：把应用已有的 LLM 配置与 vault 访问收敛成插件可直接调用的接口。
 *
 * 读取 model / baseUrl / vault 都走这里，插件只在调用时给出参数，
 * 因此插件切换配置后无需重新加载，也不会各自缓存一份过期的设置。
 */

import * as fs from 'fs'
import * as path from 'path'
import Store from 'electron-store'
import type {
  PluginHostServices,
  PluginLLMChatRequest,
  PluginLLMChatResult,
  PluginNote,
  PluginNotesContext,
} from '@shared/plugin-host'
import { PLUGIN_CLI_ALLOWED_COMMANDS } from '@shared/plugin-cli'
import { logger } from './common/logger'
import { resolveExistingVaultPath } from './filesystem/pathGuard'
import type { StoreSchema, LLMAPIConfig } from './electron-store/storeConfig'
import { isCommandAvailable, runPluginCli } from './plugin-cli'
import { hasPermission } from './plugin-permissions'

export const DEFAULT_OLLAMA_BASE_URL = 'http://localhost:11434'
const TAG_TIMEOUT_MS = 5_000

type LlmApiEntry = Pick<LLMAPIConfig, 'apiInterface' | 'apiURL'>

// 从设置里找出 Ollama 地址；地址可能写成 .../api、.../v1 或带尾斜杠，统一裁成 host:port 根地址。
export function normalizeOllamaBaseUrl(apiURL?: string): string {
  const trimmed = (apiURL ?? '').trim()
  if (!trimmed) return DEFAULT_OLLAMA_BASE_URL
  return trimmed.replace(/\/+$/, '').replace(/\/(api|v1)$/, '')
}

export function readOllamaBaseUrl(llmAPIs: LlmApiEntry[] | undefined): string {
  const ollama = (llmAPIs ?? []).find((api) => api.apiInterface === 'ollama')
  return normalizeOllamaBaseUrl(ollama?.apiURL)
}

export function renderPromptTemplate(template: string, variables: Record<string, unknown> = {}): string {
  if (typeof template !== 'string') return ''
  return template.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (match, key: string) => {
    let value: unknown = variables
    for (const segment of key.split('.')) {
      if (value === null || value === undefined || typeof value !== 'object') return match
      value = (value as Record<string, unknown>)[segment]
    }
    if (value === null || value === undefined) return match
    return typeof value === 'string' ? value : JSON.stringify(value)
  })
}

function createNotesContext(store: Store<StoreSchema>): PluginNotesContext {
  const readNote = (notePath: string): string | null => {
    try {
      if (typeof notePath !== 'string') return null
      const vaultPath = store.get('vaultDirectory') as string
      if (!vaultPath) return null
      const resolved = resolveExistingVaultPath(vaultPath, notePath)
      return fs.existsSync(resolved) ? fs.readFileSync(resolved, 'utf-8') : null
    } catch (e) {
      logger.error('PluginHost', `Failed to read note: ${notePath}`, e)
      return null
    }
  }

  const listNotes = (): PluginNote[] => {
    const vaultPath = store.get('vaultDirectory') as string
    return vaultPath ? walkMarkdownFiles(vaultPath, vaultPath) : []
  }

  return { listNotes, readNote }
}

/** 没有 filesystem 权限时给的空上下文：接口形状一致，插件不必到处判空。 */
const EMPTY_NOTES_CONTEXT: PluginNotesContext = {
  listNotes: () => [],
  readNote: () => null,
}

function walkMarkdownFiles(root: string, dir: string): PluginNote[] {
  const notes: PluginNote[] = []
  let entries: fs.Dirent[]
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return notes
  }
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      notes.push(...walkMarkdownFiles(root, fullPath))
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      try {
        notes.push({
          path: path.relative(root, fullPath).split(path.sep).join('/'),
          title: path.basename(entry.name, '.md'),
          content: fs.readFileSync(fullPath, 'utf-8'),
        })
      } catch {
        // 单个文件不可读不应中断整次遍历
      }
    }
  }
  return notes
}

export function buildPrompt(messages: PluginLLMChatRequest['messages']): string {
  if (!Array.isArray(messages)) return ''
  return messages
    .filter((m) => m && typeof m.content === 'string' && m.content.trim() !== '')
    .map((m) => {
      if (m.role === 'system') return m.content
      if (m.role === 'assistant') return `Assistant: ${m.content}`
      return m.content
    })
    .join('\n\n')
}

async function fetchModelNames(baseUrl: string): Promise<string[]> {
  const response = await fetch(`${baseUrl}/api/tags`, { signal: AbortSignal.timeout(TAG_TIMEOUT_MS) })
  if (!response.ok) throw new Error(`Ollama responded with ${response.status}`)
  const data = (await response.json()) as { models?: Array<{ name?: string }> }
  return (data.models ?? []).map((m) => m.name).filter((name): name is string => Boolean(name))
}

export interface PluginHostOptions {
  /** 插件 ID，只用于错误信息，避免把本地绝对路径回传给插件。 */
  pluginId?: string | null
  /** 发起调用的插件目录；cwd: 'plugin' 与相对路径解析的基准。 */
  pluginPath?: string | null
  /** 该插件已被授予的权限；调用点据此在真正动手之前拒绝越权。 */
  granted?: ReadonlySet<string>
}

export function createPluginHostServices(
  store: Store<StoreSchema>,
  options: PluginHostOptions = {},
): PluginHostServices {
  const pluginId = options.pluginId ?? null
  const pluginPath = options.pluginPath ?? null
  const granted = options.granted ?? new Set<string>()
  // 启动时解析一次默认模型；插件调用 chat 而未指定 model 时沿用。
  const configuredModel = () => (store.get('defaultLLM') as string | undefined) ?? ''

  const llm = {
    async chat(request: PluginLLMChatRequest): Promise<PluginLLMChatResult> {
      // 调用外部模型 = 出网。没声明 network 的插件，这里就是它唯一的出口，必须挡住。
      if (!hasPermission(granted, 'network')) {
        return {
          success: false,
          error: `Plugin has no "network" permission; add "network" to manifest.json permissions to call LLMs.`,
        }
      }
      try {
        const baseUrl = normalizeOllamaBaseUrl(request.baseUrl ?? readOllamaBaseUrl(store.get('LLMAPIs')))
        const model = (request.model ?? '').trim() || configuredModel()
        if (!model) {
          const available = await fetchModelNames(baseUrl).catch(() => [] as string[])
          if (available.length === 0) {
            return { success: false, baseUrl, error: 'No LLM model is configured and Ollama is not reachable.' }
          }
        }
        const prompt = buildPrompt(request.messages)
        if (!prompt.trim()) return { success: false, error: 'messages must contain at least one non-empty entry.' }

        const response = await fetch(`${baseUrl}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: model || configuredModel(),
            prompt,
            stream: false,
            options: {
              ...(typeof request.temperature === 'number' ? { temperature: request.temperature } : {}),
              ...(typeof request.maxTokens === 'number' ? { num_predict: request.maxTokens } : {}),
            },
          }),
        })
        if (!response.ok) return { success: false, error: `Ollama API error: ${response.status}` }
        const data = (await response.json()) as { response?: string }
        return { success: true, model, content: (data.response ?? '').trim() }
      } catch (e) {
        logger.error('PluginHost', 'LLM chat failed', e)
        return { success: false, error: e instanceof Error ? e.message : String(e) }
      }
    },
    async listModels(baseUrl?: string): Promise<string[]> {
      try {
        return await fetchModelNames(normalizeOllamaBaseUrl(baseUrl ?? readOllamaBaseUrl(store.get('LLMAPIs'))))
      } catch (e) {
        logger.error('PluginHost', 'Failed to list Ollama models', e)
        return []
      }
    },
    isEmpty: () => configuredModel().trim() === '',
  }

  return {
    ai: { llm, prompt: renderPromptTemplate },
    editing: {
      // 没有 filesystem 权限就不给读取整个 vault 的能力：返回空列表比抛错更适合"我只想看看"的场景。
      notes: hasPermission(granted, 'filesystem') ? createNotesContext(store) : EMPTY_NOTES_CONTEXT,
    },
    cli: {
      run: (request) => {
        // CLI 在本机能拉起任意进程，权限面等同 filesystem。
        if (!hasPermission(granted, 'filesystem')) {
          return Promise.resolve({
            success: false,
            code: null,
            signal: null,
            stdout: '',
            stderr: '',
            durationMs: 0,
            cwd: '',
            truncated: { stdout: false, stderr: false },
            error: `Plugin "${pluginId ?? 'unknown'}" has no "filesystem" permission; CLI is disabled.`,
          })
        }
        return runPluginCli(request, {
          vaultPath: (store.get('vaultDirectory') as string | undefined) ?? null,
          pluginPath,
        })
      },
      isAvailable: async (command: string) => isCommandAvailable(command),
      allowedCommands: PLUGIN_CLI_ALLOWED_COMMANDS,
    },
    permissions: Array.from(granted),
  }
}
