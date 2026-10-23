/**
 * AI Organization Pipeline - 批量 AI 处理新导入的笔记
 * 功能：总结摘要、实体提取、标签生成、推荐相关笔记
 */

import { ipcMain, BrowserWindow } from 'electron'
import Store from 'electron-store'
import * as fs from 'fs'
import * as path from 'path'
import { logger } from './common/logger'
import { scanMarkdownFiles } from './common/scanner'
import WindowsManager from './common/windowManager'
import { StoreSchema, StoreKeys, LLMAPIConfig } from './electron-store/storeConfig'
import OllamaService from './llm/models/ollama'
import { parseFrontmatter } from './obsidian-compat'
import type LanceDBTableWrapper from './vector-database/lanceTableWrapper'

// Ollama 服务实例
const ollamaService = new OllamaService()

function isPathWithinVault(filePath: string, vaultPath: string): boolean {
  const relativePath = path.relative(path.resolve(vaultPath), path.resolve(filePath))
  return relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath))
}

// LLM 配置类型

// 实体提取结果
export interface ExtractedEntities {
  people: string[]
  places: string[]
  organizations: string[]
  concepts: string[]
  dates: string[]
}

// AI 整理结果
export interface AIOrganizationResult {
  filePath: string
  inputCharacters: number
  inputTruncated: boolean
  summary: string
  entities: ExtractedEntities
  tags: string[]
  relatedNotes: string[]
  relations: Array<{ target: string; relation: string }>
}

// 提示词模板
const PROMPTS = {
  extractSummary: `请为以下内容生成一个简洁的摘要（50-100字）：
---
{content}
---
只返回摘要，不要其他内容。`,

  extractEntities: `从以下文本中提取实体，按类别列出：

Text:
---
{content}
---

请以 JSON 格式返回：
{
  "people": ["人名列表"],
  "places": ["地名列表"],
  "organizations": ["组织名列表"],
  "concepts": ["概念术语列表"],
  "dates": ["日期列表"]
}

只返回 JSON，不要其他内容。`,

  generateTags: `为以下内容生成 3-5 个标签（标签应该简短、通用、适合作为笔记分类）：
---
{content}
---

返回格式：用逗号分隔的标签列表，如：tag1, tag2, tag3`,
}

// 获取当前配置的 LLM 模型
async function getConfiguredModel(store: Store<StoreSchema>): Promise<string> {
  const defaultModel = store.get(StoreKeys.DefaultLLM) as string
  if (defaultModel) return defaultModel

  // 回退到可用的第一个模型
  const models = await ollamaService.getAvailableModels()
  if (models.length > 0) return models[0].modelName

  return 'llama3.2' // 最终回退
}

// 获取 Ollama API 基础 URL（从配置中读取）
function getOllamaBaseUrl(store: Store<StoreSchema>): string {
  const llmAPIs = store.get(StoreKeys.LLMAPIs) || []
  const ollamaAPI = llmAPIs.find((api: LLMAPIConfig) => api.apiInterface === 'ollama')
  if (ollamaAPI?.apiURL) {
    // 规范化：去除末尾的 /v1 或 /api 或斜杠，保留 host:port 根地址
    return ollamaAPI.apiURL.replace(/(\/v1|\/api)?\/?$/, '')
  }
  return 'http://localhost:11434' // 默认回退
}

// 调用 LLM 生成摘要
async function generateSummary(content: string, store: Store<StoreSchema>, signal?: AbortSignal): Promise<string> {
  const prompt = PROMPTS.extractSummary.replace('{content}', content.substring(0, 4000))
  const modelName = await getConfiguredModel(store)
  const baseUrl = getOllamaBaseUrl(store)

  try {
    const response = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal,
      body: JSON.stringify({
        model: modelName,
        prompt,
        stream: false,
      }),
    })

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`)
    }

    const data = await response.json()
    const summary = (data.response || '').trim()
    if (!summary) throw new Error('Ollama returned an empty summary')
    return summary
  } catch (error) {
    if (signal?.aborted) throw new Error('AI organization cancelled')
    logger.error('AIOrganization', 'Summary generation failed', error)
    throw new Error(`Summary generation failed: ${error instanceof Error ? error.message : String(error)}`)
  }
}

// 调用 LLM 提取实体
async function extractEntities(
  content: string,
  store: Store<StoreSchema>,
  signal?: AbortSignal,
): Promise<ExtractedEntities> {
  const prompt = PROMPTS.extractEntities.replace('{content}', content.substring(0, 4000))
  const modelName = await getConfiguredModel(store)
  const baseUrl = getOllamaBaseUrl(store)

  try {
    const response = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal,
      body: JSON.stringify({
        model: modelName,
        prompt,
        stream: false,
      }),
    })

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`)
    }

    const data = await response.json()
    const responseContent = data.response || ''

    const jsonMatch = responseContent.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
  } catch (error) {
    if (signal?.aborted) throw new Error('AI organization cancelled')
    logger.error('AIOrganization', 'Entity extraction failed', error)
    throw new Error(`Entity extraction failed: ${error instanceof Error ? error.message : String(error)}`)
  }

  throw new Error('Ollama returned no entity JSON')
}

// 调用 LLM 生成标签
async function generateTags(content: string, store: Store<StoreSchema>, signal?: AbortSignal): Promise<string[]> {
  const prompt = PROMPTS.generateTags.replace('{content}', content.substring(0, 4000))
  const modelName = await getConfiguredModel(store)
  const baseUrl = getOllamaBaseUrl(store)

  try {
    const response = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal,
      body: JSON.stringify({
        model: modelName,
        prompt,
        stream: false,
      }),
    })

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`)
    }

    const data = await response.json()
    const tagsStr = (data.response || '').trim()
    if (!tagsStr) throw new Error('Ollama returned empty tags')
    return tagsStr
      .split(',')
      .map((t: string) => t.trim())
      .filter(Boolean)
  } catch (error) {
    if (signal?.aborted) throw new Error('AI organization cancelled')
    logger.error('AIOrganization', 'Tag generation failed', error)
    throw new Error(`Tag generation failed: ${error instanceof Error ? error.message : String(error)}`)
  }
}

// 查找相关笔记
async function findRelatedNotes(
  content: string,
  _vaultDir: string,
  currentFilePath: string,
  dbTableClient: LanceDBTableWrapper | null,
): Promise<string[]> {
  if (!dbTableClient?.search) {
    return []
  }

  try {
    // 提取前几个关键词作为搜索词
    const keywords = content
      .split(/[\s\n]+/)
      .filter((w: string) => w.length > 3)
      .slice(0, 50)
      .join(' ')

    const results = await dbTableClient.search(keywords, 5)

    return results
      .filter((r) => r.notepath !== currentFilePath)
      .map((r) => r.notepath)
      .slice(0, 5)
  } catch (error) {
    logger.error('AIOrganization', 'Finding related notes failed', error)
    return []
  }
}

// 更新笔记的 Frontmatter，保留并合并现有字段
function updateNoteFrontmatter(
  result: AIOrganizationResult,
  existingFrontmatter: Record<string, unknown> = {},
): string {
  let existingTags: string[] = []
  if (Array.isArray(existingFrontmatter.tags)) {
    existingTags = (existingFrontmatter.tags as unknown[]).map(String)
  } else if (typeof existingFrontmatter.tags === 'string') {
    existingTags = [existingFrontmatter.tags]
  }

  const mergedTags = [...new Set([...existingTags, ...result.tags])]

  // 构建合并后的 frontmatter，保留原有字段
  const frontmatter: Record<string, unknown> = {
    ...existingFrontmatter,
    summary: result.summary,
    tags: mergedTags,
    entities: result.entities,
    related: result.relatedNotes.map((p: string) => path.basename(p, '.md')),
    aiProcessed: new Date().toISOString(),
  }

  // 构建 frontmatter 字符串
  const yamlLines = Object.entries(frontmatter).map(([key, value]) => {
    if (Array.isArray(value)) {
      return `${key}: [${value.map((v: unknown) => `"${v}"`).join(', ')}]`
    }
    if (typeof value === 'object' && value !== null) {
      const objLines = Object.entries(value as Record<string, unknown>)
        .map(([k, v]) => `  ${k}: [${Array.isArray(v) ? v.map((x: unknown) => `"${x}"`).join(', ') : `"${v}"`}]`)
        .join('\n')
      return `${key}:\n${objLines}`
    }
    return `${key}: "${value}"`
  })

  return `---\n${yamlLines.join('\n')}\n---\n`
}

// 主导入函数 - 处理单个笔记
async function processNote(
  filePath: string,
  vaultDir: string,
  dbTableClient: LanceDBTableWrapper | null,
  store: Store<StoreSchema>,
  onProgress?: (filePath: string, status: string) => void,
  signal?: AbortSignal,
  applyChanges = true,
): Promise<AIOrganizationResult | null> {
  try {
    if (signal?.aborted) throw new Error('AI organization cancelled')
    onProgress?.(filePath, 'Reading...')

    const rawContent = fs.readFileSync(filePath, 'utf-8')

    // 跳过太短的内容
    if (rawContent.length < 100) {
      return null
    }

    // 提取纯文本内容与现有 frontmatter
    const { frontmatter: existingFrontmatter, body: plainContent } = parseFrontmatter(rawContent)

    onProgress?.(filePath, 'Generating summary...')
    const summary = await generateSummary(plainContent, store, signal)

    if (signal?.aborted) throw new Error('AI organization cancelled')
    onProgress?.(filePath, 'Extracting entities...')
    const entities = await extractEntities(plainContent, store, signal)

    if (signal?.aborted) throw new Error('AI organization cancelled')
    onProgress?.(filePath, 'Generating tags...')
    const tags = await generateTags(plainContent, store, signal)

    if (signal?.aborted) throw new Error('AI organization cancelled')
    onProgress?.(filePath, 'Finding related notes...')
    const relatedNotes = await findRelatedNotes(plainContent, vaultDir, filePath, dbTableClient)

    const result: AIOrganizationResult = {
      filePath,
      inputCharacters: plainContent.length,
      inputTruncated: plainContent.length > 4000,
      summary,
      entities,
      tags,
      relatedNotes,
      relations: [],
    }

    // 更新笔记内容
    if (applyChanges) {
      onProgress?.(filePath, 'Updating note...')
      const updatedFrontmatter = updateNoteFrontmatter(result, existingFrontmatter)
      if (signal?.aborted) throw new Error('AI organization cancelled')
      fs.writeFileSync(filePath, updatedFrontmatter + plainContent, 'utf-8')
    } else {
      onProgress?.(filePath, 'Preview ready')
    }

    return result
  } catch (error) {
    if (signal?.aborted) throw new Error('AI organization cancelled')
    logger.error('AIOrganization', `Failed to process ${filePath}`, error)
    throw new Error(
      `Failed to process ${path.basename(filePath)}: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

// 批量处理笔记
export async function organizeNotes(
  filePaths: string[],
  store: Store<StoreSchema>,
  windowsManager: WindowsManager,
  onProgress?: (current: number, total: number, filePath: string, status: string) => void,
  signal?: AbortSignal,
  applyChanges = true,
): Promise<AIOrganizationResult[]> {
  const results: AIOrganizationResult[] = []

  for (let i = 0; i < filePaths.length; i++) {
    if (signal?.aborted) {
      onProgress?.(i, filePaths.length, '', 'Cancelled')
      break
    }
    const filePath = filePaths[i]
    onProgress?.(i + 1, filePaths.length, filePath, 'Starting...')

    // 获取对应的 dbTableClient
    const windows = BrowserWindow.getAllWindows()
    let dbTableClient: LanceDBTableWrapper | null = null

    for (const win of windows) {
      const info = windowsManager.getWindowInfoForContents(win.webContents)
      if (info && isPathWithinVault(filePath, info.vaultDirectoryForWindow)) {
        dbTableClient = info.dbTableClient as LanceDBTableWrapper | null
        break
      }
    }

    const result = await processNote(
      filePath,
      path.dirname(filePath),
      dbTableClient,
      store,
      (fp: string, status: string) => onProgress?.(i + 1, filePaths.length, fp, status),
      signal,
      applyChanges,
    )

    if (result) {
      results.push(result)
    }
  }

  return results
}

export async function previewOrganization(
  filePaths: string[],
  store: Store<StoreSchema>,
  windowsManager: WindowsManager,
  onProgress?: (current: number, total: number, filePath: string, status: string) => void,
  signal?: AbortSignal,
): Promise<AIOrganizationResult[]> {
  return organizeNotes(filePaths, store, windowsManager, onProgress, signal, false)
}

function applyOrganizationResults(results: AIOrganizationResult[], vaultDirectory: string): AIOrganizationResult[] {
  for (const result of results) {
    if (!isPathWithinVault(result.filePath, vaultDirectory)) {
      throw new Error(`File is outside the current vault: ${result.filePath}`)
    }

    const content = fs.readFileSync(result.filePath, 'utf-8')
    const originalContent = content.replace(/^---\n[\s\S]*?\n---\n?/, '')
    fs.writeFileSync(result.filePath, updateNoteFrontmatter(result) + originalContent, 'utf-8')
  }
  return results
}

// 注册 IPC 处理器
const activeOrganizationRuns = new Map<number, AbortController>()

export function registerAIOrganizationHandlers(_store: Store<StoreSchema>, windowsManager: WindowsManager) {
  ipcMain.handle('ai-organize-notes', async (event, filePaths: string[]): Promise<AIOrganizationResult[]> => {
    const controller = new AbortController()
    activeOrganizationRuns.set(event.sender.id, controller)
    try {
      const results = await organizeNotes(
        filePaths,
        _store,
        windowsManager,
        (current: number, total: number, filePath: string, status: string) => {
          event.sender.send('ai-organization-progress', { current, total, filePath, status })
        },
        controller.signal,
      )
      if (controller.signal.aborted) event.sender.send('ai-organization-cancelled')
      return results
    } catch (error) {
      if (controller.signal.aborted) {
        event.sender.send('ai-organization-cancelled')
        return []
      }
      throw error
    } finally {
      activeOrganizationRuns.delete(event.sender.id)
    }
  })

  ipcMain.handle('ai-organize-cancel', async (event) => {
    const controller = activeOrganizationRuns.get(event.sender.id)
    if (!controller) return { cancelled: false }
    controller.abort()
    return { cancelled: true }
  })

  ipcMain.handle('ai-preview-notes', async (event, filePaths: string[]): Promise<AIOrganizationResult[]> => {
    const controller = new AbortController()
    activeOrganizationRuns.set(event.sender.id, controller)
    try {
      const results = await previewOrganization(
        filePaths,
        _store,
        windowsManager,
        (current: number, total: number, filePath: string, status: string) => {
          event.sender.send('ai-organization-progress', { current, total, filePath, status })
        },
        controller.signal,
      )
      if (controller.signal.aborted) event.sender.send('ai-organization-cancelled')
      return results
    } catch (error) {
      if (controller.signal.aborted) {
        event.sender.send('ai-organization-cancelled')
        return []
      }
      throw error
    } finally {
      activeOrganizationRuns.delete(event.sender.id)
    }
  })

  ipcMain.handle('ai-apply-notes', async (event, results: AIOrganizationResult[]): Promise<AIOrganizationResult[]> => {
    const windowInfo = windowsManager.getWindowInfoForContents(event.sender)
    if (!windowInfo) throw new Error('No vault directory set')
    return applyOrganizationResults(results, windowInfo.vaultDirectoryForWindow)
  })

  ipcMain.handle('ai-organize-vault', async (event): Promise<AIOrganizationResult[]> => {
    const windowInfo = windowsManager.getWindowInfoForContents(event.sender)
    if (!windowInfo) {
      throw new Error('No vault directory set')
    }

    const files = getMarkdownFiles(windowInfo.vaultDirectoryForWindow)
    const controller = new AbortController()
    activeOrganizationRuns.set(event.sender.id, controller)
    try {
      const results = await organizeNotes(
        files,
        _store,
        windowsManager,
        (current: number, total: number, filePath: string, status: string) => {
          event.sender.send('ai-organization-progress', { current, total, filePath, status })
        },
        controller.signal,
      )
      if (controller.signal.aborted) event.sender.send('ai-organization-cancelled')
      return results
    } catch (error) {
      if (controller.signal.aborted) {
        event.sender.send('ai-organization-cancelled')
        return []
      }
      throw error
    } finally {
      activeOrganizationRuns.delete(event.sender.id)
    }
  })
}

// 递归获取目录中的所有 .md 文件（委托给共享 scanner）
function getMarkdownFiles(dir: string): string[] {
  return scanMarkdownFiles(dir)
}
