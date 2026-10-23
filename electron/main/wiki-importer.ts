/**
 * Wiki Importer - 支持多种来源的 Wiki 内容导入
 * 支持：单 URL、Sitemap、MediaWiki API、XML Dump、Crawl4AI
 */

import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'
import { ipcMain, app } from 'electron'
import Store from 'electron-store'
import { spawn, execSync } from 'child_process'
import * as os from 'os'
import WindowsManager from './common/windowManager'
import { StoreSchema } from './electron-store/storeConfig'
import { updateFileInTable } from './vector-database/tableHelperFunctions'

// 内容哈希去重
function computeContentHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex')
}

// HTML 转 Markdown
function htmlToMarkdown(html: string, baseUrl = ''): string {
  let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')

  // 标题
  text = text.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n')
  text = text.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n')
  text = text.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n')
  text = text.replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n')
  text = text.replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n')
  text = text.replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n')
  text = text.replace(/<\/h[1-6]>/gi, '\n')

  // 粗体和斜体
  text = text.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
  text = text.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
  text = text.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
  text = text.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')

  // 代码
  text = text.replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
  text = text.replace(/<pre[^>]*>(.*?)<\/pre>/gi, '```\n$1\n```')

  // 列表
  text = text.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
  text = text.replace(/<br\s*\/?>/gi, '\n')
  text = text.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
  text = text.replace(/<div[^>]*>(.*?)<\/div>/gi, '$1\n')
  text = text.replace(/<tr[^>]*>(.*?)<\/tr>/gi, '$1\n')
  text = text.replace(/<td[^>]*>(.*?)<\/td>/gi, '| $1 ')
  text = text.replace(/<th[^>]*>(.*?)<\/th>/gi, '| $1 ')

  // 链接
  text = text.replace(/<a[^>]*href=["']([^"']*)["'][^>]*>(.*?)<\/a>/gi, (_m, href, linkText) => {
    let fullUrl = href
    if (href.startsWith('/') && baseUrl) {
      try {
        fullUrl = new URL(href, baseUrl).href
      } catch {
        fullUrl = href
      }
    }
    return `[${linkText}](${fullUrl})`
  })

  // 图片
  text = text.replace(/<img[^>]*src=["']([^"']*)["'][^>]*alt=["']([^"']*)["'][^>]*\/?>/gi, '![$2]($1)')
  text = text.replace(/<img[^>]*alt=["']([^"']*)["'][^>]*src=["']([^"']*)["'][^>]*\/?>/gi, '![$1]($2)')
  text = text.replace(/<img[^>]*src=["']([^"']*)["'][^>]*\/?>/gi, '![]($1)')

  // 移除剩余 HTML 标签
  text = text.replace(/<[^>]+>/g, '')

  // HTML 实体解码
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")

  return text.replace(/\n{3,}/g, '\n\n').trim()
}

// 提取标题
function extractTitle(html: string, url: string): string {
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  if (titleMatch) return titleMatch[1].trim()

  const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i)
  if (h1Match) return h1Match[1].trim()

  try {
    const urlObj = new URL(url)
    const pathParts = urlObj.pathname.split('/').filter(Boolean)
    if (pathParts.length > 0) {
      return decodeURIComponent(pathParts[pathParts.length - 1].replace(/[-_]/g, ' '))
    }
    return urlObj.hostname
  } catch {
    return 'Untitled'
  }
}

// HTTP 请求
const FETCH_RETRY_LIMIT = 3
const FETCH_RETRY_DELAY_MS = 250
const INVALID_FILENAME_CHARACTERS = new Set(['<', '>', ':', '"', '/', '\\', '|', '?', '*', '[', ']'])

async function fetchWithRetry(url: string, init?: RequestInit, signal?: AbortSignal): Promise<Response> {
  for (let attempt = 1; attempt <= FETCH_RETRY_LIMIT; attempt++) {
    throwIfImportCancelled(signal)
    let response: Response
    try {
      response = await fetch(url, { ...init, signal })
    } catch (error) {
      if (signal?.aborted) throw new Error('Wiki import cancelled.')
      if (attempt === FETCH_RETRY_LIMIT) throw error
      await waitBeforeRetry(FETCH_RETRY_DELAY_MS * attempt, signal)
      continue
    }

    const shouldRetry = [408, 425, 429].includes(response.status) || response.status >= 500
    if (response.ok || !shouldRetry || attempt === FETCH_RETRY_LIMIT) return response

    await waitBeforeRetry(FETCH_RETRY_DELAY_MS * attempt, signal)
  }

  throw new Error(`Failed to fetch ${url} after ${FETCH_RETRY_LIMIT} attempts`)
}

async function fetchUrl(url: string, signal?: AbortSignal): Promise<string> {
  const response = await fetchWithRetry(
    url,
    {
      headers: {
        'User-Agent': 'WIKIOBS-Wiki-Importer/1.0',
        Accept: 'text/html,application/xhtml+xml',
      },
    },
    signal,
  )

  if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`)

  return response.text()
}

// 解析 Sitemap
async function fetchSitemap(url: string, signal?: AbortSignal): Promise<string[]> {
  const sitemapUrl = url.endsWith('/') ? `${url}sitemap.xml` : `${url}/sitemap.xml`

  try {
    const response = await fetchWithRetry(sitemapUrl, undefined, signal)
    if (!response.ok) {
      const altUrl = `${new URL(url).origin}/sitemap.xml`
      const altResponse = await fetchWithRetry(altUrl, undefined, signal)
      if (!altResponse.ok) throw new Error('Sitemap not found')
      return parseSitemapXml(await altResponse.text())
    }
    return parseSitemapXml(await response.text())
  } catch (error) {
    throw new Error(`Failed to fetch sitemap: ${error}`)
  }
}

function parseSitemapXml(xml: string): string[] {
  const urls: string[] = []
  const locMatches = xml.match(/<loc[^>]*>([^<]+)<\/loc>/gi)
  if (locMatches) {
    for (const match of locMatches) {
      const urlMatch = match.match(/<loc[^>]*>([^<]+)<\/loc>/)
      if (urlMatch) urls.push(urlMatch[1])
    }
  }
  return urls
}

// MediaWiki API
interface MediaWikiResponse {
  query?: {
    pages?: Record<string, { title: string; extract?: string; revisions?: Record<string, string>[] }>
  }
}

async function fetchFromMediaWikiApi(
  apiUrl: string,
  titles: string[],
  signal?: AbortSignal,
): Promise<Map<string, string>> {
  const results = new Map<string, string>()
  const titlesParam = titles.join('|')
  const url = `${apiUrl}?action=query&titles=${encodeURIComponent(titlesParam)}&prop=extracts|revisions&exintro=true&explaintext=true&rvslots=main&format=json`

  const response = await fetchWithRetry(url, { headers: { 'User-Agent': 'WIKIOBS-Wiki-Importer/1.0' } }, signal)
  if (!response.ok) throw new Error(`MediaWiki API error: ${response.status}`)

  const data: MediaWikiResponse = await response.json()
  if (data.query?.pages) {
    for (const page of Object.values(data.query.pages)) {
      const content = page.extract || page.revisions?.[0]?.['2'] || ''
      if (content) results.set(page.title, content)
    }
  }
  return results
}

// XML Dump 解析
function parseXmlDump(xml: string): Array<{ title: string; content: string }> {
  const results: Array<{ title: string; content: string }> = []
  const pageRegex = /<page>([\s\S]*?)<\/page>/gi
  let match

  while ((match = pageRegex.exec(xml)) !== null) {
    const pageContent = match[1]
    const titleMatch = pageContent.match(/<title>([^<]+)<\/title>/i)
    if (!titleMatch) continue

    const title = titleMatch[1]
    if (pageContent.includes('<redirect') || title.startsWith('Special:') || title.startsWith('Talk:')) continue

    const textMatch = pageContent.match(/<text[^>]*>([\s\S]*?)<\/text>/i)
    if (!textMatch) continue

    results.push({ title, content: mediaWikiToMarkdown(textMatch[1]) })
  }
  return results
}

// MediaWiki 转 Markdown
function mediaWikiToMarkdown(wikiText: string): string {
  let text = wikiText

  // 标题
  text = text.replace(/^==+\s*(.+?)\s*==+$/gm, (_m, title) => {
    const level = (title.match(/^=+/) || [''])[0].length + 1
    return `${'#'.repeat(Math.min(level, 6))} ${title.replace(/^=+\s*|\s*=+$/g, '')}`
  })

  text = text.replace(/'''(.+?)'''/g, '**$1**')
  text = text.replace(/''(.+?)''/g, '*$1*')
  text = text.replace(/\[\[([^\]|]+)\]\]/g, '[[$1|$1]]')
  text = text.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '[[$1|$2]]')
  text = text.replace(/\[(https?:\/\/[^\s\]]+)\s*([^\]]+)\]/g, '[$2]($1)')
  text = text.replace(/\[(https?:\/\/[^\s\]]+)\]/g, '<$1>')
  text = text.replace(/^\*+\s*/gm, (match) => `${'  '.repeat(match.length - 1)}- `)
  text = text.replace(/^#+\s*/gm, (match) => `${'  '.repeat(match.length - 1)}1. `)
  text = text.replace(/<pre>([\s\S]*?)<\/pre>/gi, '```\n$1\n```')
  text = text.replace(/<code>([\s\S]*?)<\/code>/gi, '`$1`')
  text = text.replace(/^----+$/gm, '\n---\n')

  return text
}

// 类型定义
export interface ImportResult {
  success: boolean
  imported: number
  skipped: number
  errors: string[]
  files: string[]
  filesToIndex: string[]
  cancelled?: boolean
}

export interface WikiImporterOptions {
  sourceType: 'url' | 'sitemap' | 'mediawiki-api' | 'xml-dump' | 'crawl4ai'
  source: string
  importId?: string
  outputDir?: string
  onProgress?: (current: number, total: number, currentUrl: string) => void
  signal?: AbortSignal
}

function throwIfImportCancelled(signal?: AbortSignal): void {
  if (!signal?.aborted) return
  const error = new Error('Wiki import cancelled.')
  error.name = 'AbortError'
  throw error
}

function waitBeforeRetry(delayMs: number, signal?: AbortSignal): Promise<void> {
  if (!signal) return new Promise((resolve) => setTimeout(resolve, delayMs))
  throwIfImportCancelled(signal)
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', cancel)
      resolve()
    }, delayMs)
    const cancel = () => {
      clearTimeout(timer)
      signal.removeEventListener('abort', cancel)
      throwIfImportCancelled(signal)
      reject(new Error('Wiki import cancelled.'))
    }
    signal.addEventListener('abort', cancel, { once: true })
  })
}

// 主导入函数
export async function importFromWiki(options: WikiImporterOptions): Promise<ImportResult> {
  const { sourceType, source, outputDir = '.', onProgress, signal } = options
  const result: ImportResult = { success: true, imported: 0, skipped: 0, errors: [], files: [], filesToIndex: [] }
  const seenHashes = new Set<string>()

  try {
    throwIfImportCancelled(signal)
    let itemsToProcess: Array<{ title: string; content: string; sourceUrl: string }> = []

    switch (sourceType) {
      case 'url': {
        const html = await fetchUrl(source, signal)
        itemsToProcess = [
          { title: extractTitle(html, source), content: htmlToMarkdown(html, source), sourceUrl: source },
        ]
        break
      }

      case 'sitemap': {
        const urls = await fetchSitemap(source, signal)
        for (let i = 0; i < urls.length; i++) {
          throwIfImportCancelled(signal)
          const url = urls[i]
          onProgress?.(i + 1, urls.length, url)
          try {
            const html = await fetchUrl(url, signal)
            itemsToProcess.push({ title: extractTitle(html, url), content: htmlToMarkdown(html, url), sourceUrl: url })
          } catch (error) {
            if (signal?.aborted) throw new Error('Wiki import cancelled.')
            result.errors.push(`Failed to fetch ${url}: ${error}`)
          }
        }
        break
      }

      case 'mediawiki-api': {
        const apiUrl = source.endsWith('/') ? source : `${source}/`
        const categoryUrl = `${apiUrl}api.php?action=query&list=categorymembers&cmtitle=Category:Main&cmlimit=500&format=json`
        try {
          const response = await fetchWithRetry(
            categoryUrl,
            { headers: { 'User-Agent': 'WIKIOBS-Wiki-Importer/1.0' } },
            signal,
          )
          if (!response.ok) throw new Error(`MediaWiki API error: ${response.status}`)
          const data = await response.json()
          if (data.query?.categorymembers) {
            const titles = data.query.categorymembers
              .filter((m: { ns: number }) => m.ns === 0)
              .map((m: { title: string }) => m.title)
            const batchSize = 50
            for (let i = 0; i < titles.length; i += batchSize) {
              throwIfImportCancelled(signal)
              const batch = titles.slice(i, i + batchSize)
              onProgress?.(i + batchSize, titles.length, `Batch ${Math.floor(i / batchSize) + 1}`)
              const pageContents = await fetchFromMediaWikiApi(apiUrl, batch, signal)
              for (const [title, content] of pageContents) {
                itemsToProcess.push({ title, content, sourceUrl: `${apiUrl}wiki/${encodeURIComponent(title)}` })
              }
            }
          }
        } catch (error) {
          if (signal?.aborted) throw new Error('Wiki import cancelled.')
          result.errors.push(`MediaWiki API error: ${error}`)
        }
        break
      }

      case 'xml-dump': {
        if (!fs.existsSync(source)) throw new Error(`XML file not found: ${source}`)
        const xml = fs.readFileSync(source, 'utf-8')
        const parsed = parseXmlDump(xml)
        for (let i = 0; i < parsed.length; i++) {
          throwIfImportCancelled(signal)
          onProgress?.(i + 1, parsed.length, parsed[i].title)
          itemsToProcess.push({ title: parsed[i].title, content: parsed[i].content, sourceUrl: source })
        }
        break
      }

      case 'crawl4ai': {
        // 使用 Crawl4AI 进行高质量爬取
        const { spawn: spawnProcess } = await import('child_process')
        const validatedUrl = new URL(source).href // throws on invalid URL
        const scriptPath = path.join(os.tmpdir(), `crawl4ai_${Date.now()}.py`)
        const script = `
import asyncio
import sys
from crawl4ai import AsyncWebCrawler

async def main():
    url = sys.argv[1]
    async with AsyncWebCrawler(headless=True) as crawler:
        result = await crawler.arun(url=url)
        print(result.markdown if result.markdown else "")
        print("---TITLE---")
        print(result.metadata.get("title", "Untitled") if result.metadata else "Untitled")

asyncio.run(main())
`
        fs.writeFileSync(scriptPath, script, 'utf-8')
        try {
          const output = await new Promise<string>((resolve, reject) => {
            const chunks: string[] = []
            const proc = spawnProcess('python', [scriptPath, validatedUrl], { timeout: 45000, signal })
            proc.stdout.on('data', (data) => chunks.push(data.toString()))
            proc.on('close', () => resolve(chunks.join('')))
            proc.on('error', reject)
            setTimeout(() => {
              proc.kill()
              reject(new Error('timeout'))
            }, 45000)
          })
          const [markdown, ...titleParts] = output.split('---TITLE---')
          const title = titleParts.join('').trim() || extractTitle(markdown, source)
          itemsToProcess.push({ title, content: markdown.trim(), sourceUrl: source })
        } catch {
          if (signal?.aborted) throw new Error('Wiki import cancelled.')
          result.errors.push(`Crawl4AI failed for ${source}, falling back to basic fetch`)
          const html = await fetchUrl(source, signal)
          itemsToProcess.push({
            title: extractTitle(html, source),
            content: htmlToMarkdown(html, source),
            sourceUrl: source,
          })
        } finally {
          try {
            fs.unlinkSync(scriptPath)
          } catch {
            /* ignore */
          }
        }
        break
      }

      default:
        throw new Error(`Unsupported source type: ${sourceType}`)
    }

    throwIfImportCancelled(signal)
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true })

    const importedSources = new Map<string, string>()
    const filesByContentHash = new Map<string, string>()
    for (const fileName of fs.readdirSync(outputDir)) {
      if (!fileName.toLowerCase().endsWith('.md')) continue
      const existing = fs.readFileSync(path.join(outputDir, fileName), 'utf-8')
      const existingBody = existing.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n\r?\n?([\s\S]*)$/)?.[1]
      if (existingBody !== undefined) {
        filesByContentHash.set(computeContentHash(existingBody), path.join(outputDir, fileName))
      }
      const marker = existing.match(/^sourceId: ([a-f0-9]{64})$/m)?.[1]
      const legacyFrontmatter = existing.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n\r?\n?([\s\S]*)$/)
      const quotedSource = legacyFrontmatter?.[1].match(/^source: (".*")$/m)?.[1]
      const quotedTitle = legacyFrontmatter?.[1].match(/^title: (".*")$/m)?.[1]
      let sourceId = marker
      if (!sourceId && quotedSource && quotedTitle) {
        try {
          const sourceUrl = JSON.parse(quotedSource) as string
          const title = JSON.parse(quotedTitle) as string
          const contentHash = computeContentHash(legacyFrontmatter?.[2] || '')
          sourceId = computeContentHash(`${sourceUrl}\n${title}\n${contentHash}`)
        } catch {
          // Legacy frontmatter with malformed quoting cannot be matched reliably.
        }
      }
      if (sourceId) importedSources.set(sourceId, path.join(outputDir, fileName))
    }

    for (let i = 0; i < itemsToProcess.length; i++) {
      throwIfImportCancelled(signal)
      const item = itemsToProcess[i]
      onProgress?.(i + 1, itemsToProcess.length, item.title)

      try {
        const contentHash = computeContentHash(item.content)
        if (seenHashes.has(contentHash)) {
          result.skipped++
          const duplicateFile = filesByContentHash.get(contentHash)
          if (duplicateFile) result.filesToIndex.push(duplicateFile)
          continue
        }
        seenHashes.add(contentHash)

        const sourceId = computeContentHash(`${item.sourceUrl}\n${item.title}\n${contentHash}`)
        const existingFile = importedSources.get(sourceId)
        if (existingFile) {
          result.skipped++
          result.filesToIndex.push(existingFile)
          continue
        }

        const safeTitle = Array.from(item.title, (character) =>
          INVALID_FILENAME_CHARACTERS.has(character) ? '_' : character,
        )
          .join('')
          .substring(0, 100)
        let filePath = path.join(outputDir, `${safeTitle}.md`)
        let counter = 1
        while (fs.existsSync(filePath)) {
          filePath = path.join(outputDir, `${safeTitle} ${counter}.md`)
          counter++
        }

        const frontmatter = `---\ntitle: "${item.title.replace(/"/g, '\\"')}"\nsource: "${item.sourceUrl}"\nsourceId: ${sourceId}\nimported: "${new Date().toISOString()}"\ntags: []\n---\n\n`
        throwIfImportCancelled(signal)
        fs.writeFileSync(filePath, frontmatter + item.content, 'utf-8')
        importedSources.set(sourceId, filePath)
        filesByContentHash.set(contentHash, filePath)
        result.files.push(filePath)
        result.filesToIndex.push(filePath)
        result.imported++
      } catch (error) {
        if (signal?.aborted) throw new Error('Wiki import cancelled.')
        result.errors.push(`Failed to save ${item.title}: ${error}`)
      }
    }
  } catch (error) {
    result.success = false
    if (signal?.aborted) result.cancelled = true
    else result.errors.push(`Import failed: ${error}`)
  }

  if (!result.cancelled && result.errors.length > 0) result.success = false

  return result
}

// 注册 IPC 处理器
export function registerWikiImporterHandlers(_store: Store<StoreSchema>, windowsManager: WindowsManager) {
  const activeImports = new Map<string, { ownerId: number; controller: AbortController }>()

  ipcMain.handle('wiki-import', async (event, options: WikiImporterOptions): Promise<ImportResult> => {
    const windowInfo = windowsManager.getWindowInfoForContents(event.sender)
    if (!windowInfo) {
      return {
        success: false,
        imported: 0,
        skipped: 0,
        errors: ['No vault directory set'],
        files: [],
        filesToIndex: [],
      }
    }

    const importId = options.importId || crypto.randomUUID()
    const importKey = `${event.sender.id}:${importId}`
    if (activeImports.has(importKey)) {
      return {
        success: false,
        imported: 0,
        skipped: 0,
        errors: ['An import with this ID is already running.'],
        files: [],
        filesToIndex: [],
      }
    }
    const controller = new AbortController()
    activeImports.set(importKey, { ownerId: event.sender.id, controller })

    const outputDir = path.join(windowInfo.vaultDirectoryForWindow, 'WikiImports')
    try {
      const result = await importFromWiki({
        ...options,
        outputDir,
        signal: controller.signal,
        onProgress: (current, total, currentUrl) => {
          if (!event.sender.isDestroyed()) event.sender.send('wiki-import-progress', { current, total, currentUrl })
        },
      })

      for (const filePath of result.filesToIndex) {
        if (controller.signal.aborted) break
        try {
          await updateFileInTable(windowInfo.dbTableClient, filePath)
        } catch (error) {
          result.errors.push(`Failed to index ${filePath}: ${error}`)
        }
      }

      if (controller.signal.aborted) {
        result.cancelled = true
        result.success = false
      }
      if (result.errors.length > 0) result.success = false
      if (!event.sender.isDestroyed()) event.sender.send('wiki-import-complete', result)
      return result
    } finally {
      activeImports.delete(importKey)
    }
  })

  ipcMain.handle('wiki-import-cancel', async (event, importId: string) => {
    const activeImport = activeImports.get(`${event.sender.id}:${importId}`)
    if (!activeImport || activeImport.ownerId !== event.sender.id) return { cancelled: false }
    activeImport.controller.abort()
    return { cancelled: true }
  })

  // 检查 Crawl4AI 是否可用
  ipcMain.handle('crawl4ai-check', async () => {
    try {
      const result = execSync('pip show crawl4ai', { encoding: 'utf-8', timeout: 10000 })
      return { available: result.includes('Version') }
    } catch {
      return { available: false }
    }
  })

  // 使用 Crawl4AI 爬取
  ipcMain.handle('crawl4ai-crawl', async (event, url: string, options?: { headless?: boolean; verbose?: boolean }) => {
    const validatedUrl = new URL(url).href
    const scriptPath = path.join(app.getPath('temp'), `crawl4ai_${Date.now()}.py`)

    const script = `
import asyncio
import json
import sys
from crawl4ai import AsyncWebCrawler

async def main():
    url = sys.argv[1]
    async with AsyncWebCrawler(headless=${options?.headless ?? true}, verbose=${options?.verbose ?? false}) as crawler:
        result = await crawler.arun(url=url)
        print(result.markdown)
        print("---METADATA---")
        import json
        print(json.dumps({
            "title": result.metadata.get("title", ""),
            "description": result.metadata.get("description", ""),
            "source_url": result.url
        }))

asyncio.run(main())
`

    fs.writeFileSync(scriptPath, script, 'utf-8')

    return new Promise((resolve) => {
      const chunks: string[] = []
      const proc = spawn('python', [scriptPath, validatedUrl])

      proc.stdout.on('data', (data) => chunks.push(data.toString()))
      proc.on('close', () => {
        fs.unlinkSync(scriptPath)
        const output = chunks.join('')
        const [markdown, ...metaParts] = output.split('---METADATA---')
        try {
          const metadata = JSON.parse(metaParts.join('').trim())
          resolve({ success: true, markdown: markdown.trim(), metadata })
        } catch {
          resolve({ success: true, markdown: output.trim(), metadata: {} })
        }
      })

      proc.on('error', () => {
        try {
          fs.unlinkSync(scriptPath)
        } catch {
          /* ignore */
        }
        resolve({ success: false, error: 'Crawl4AI execution failed' })
      })

      setTimeout(() => {
        proc.kill()
        try {
          fs.unlinkSync(scriptPath)
        } catch {
          /* ignore */
        }
        resolve({ success: false, error: 'Crawl4AI timeout' })
      }, 60000)
    })
  })

  // Crawl4AI 批量爬取 - 改进版，使用异步并发
  ipcMain.handle(
    'crawl4ai-batch-crawl',
    async (event, urls: string[], options?: { headless?: boolean; verbose?: boolean; concurrency?: number }) => {
      const results: Array<{
        url: string
        success: boolean
        markdown?: string
        metadata?: Record<string, string>
        error?: string
      }> = []
      const concurrency = options?.concurrency ?? 3 // 默认并发 3 个
      const total = urls.length

      // 分批处理
      for (let batchStart = 0; batchStart < total; batchStart += concurrency) {
        const batchEnd = Math.min(batchStart + concurrency, total)
        const batchUrls = urls.slice(batchStart, batchEnd)

        const batchPromises = batchUrls.map((url, idx) => {
          const globalIdx = batchStart + idx
          event.sender.send('crawl4ai-progress', { current: globalIdx + 1, total, url })

          return crawlSingleUrl(url, options)
        })

        const batchResults = await Promise.allSettled(batchPromises)
        batchResults.forEach((result, idx) => {
          if (result.status === 'fulfilled') {
            results.push(result.value)
          } else {
            results.push({ url: batchUrls[idx], success: false, error: String(result.reason) })
          }
        })
      }

      return results
    },
  )
}

// 单独爬取单个 URL 的辅助函数
async function crawlSingleUrl(
  url: string,
  options?: { headless?: boolean; verbose?: boolean },
): Promise<{ url: string; success: boolean; markdown?: string; metadata?: Record<string, string>; error?: string }> {
  const validatedUrl = new URL(url).href
  const scriptPath = path.join(
    app.getPath('temp'),
    `crawl4ai_${Date.now()}_${Math.random().toString(36).substring(7)}.py`,
  )

  const script = `
import asyncio
import json
import sys
sys.stdout.reconfigure(encoding='utf-8')

from crawl4ai import AsyncWebCrawler

async def main():
    url = sys.argv[1]
    try:
        async with AsyncWebCrawler(headless=${options?.headless ?? true}, verbose=${options?.verbose ?? false}) as crawler:
            result = await crawler.arun(url=url)
            output = {
                "markdown": result.markdown if result.markdown else "",
                "metadata": {
                    "title": result.metadata.get("title", "") if result.metadata else "",
                    "description": result.metadata.get("description", "") if result.metadata else "",
                    "source_url": result.url or url
                }
            }
            print(json.dumps(output, ensure_ascii=False))
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

asyncio.run(main())
`

  fs.writeFileSync(scriptPath, script, 'utf-8')

  try {
    const output = await new Promise<string>((resolve, reject) => {
      const chunks: string[] = []
      const errChunks: string[] = []
      const proc = spawn('python', [scriptPath, validatedUrl])

      proc.stdout.on('data', (data) => chunks.push(data.toString()))
      proc.stderr.on('data', (data) => errChunks.push(data.toString()))

      proc.on('close', (code) => {
        if (code === 0) {
          resolve(chunks.join(''))
        } else {
          reject(new Error(errChunks.join('') || `Process exited with code ${code}`))
        }
      })
      proc.on('error', (err) => reject(err))

      setTimeout(() => {
        proc.kill()
        reject(new Error('Crawl4AI timeout after 45s'))
      }, 45000)
    })

    const parsed = JSON.parse(output)
    if (parsed.error) {
      return { url, success: false, error: parsed.error }
    }
    return { url, success: true, markdown: parsed.markdown, metadata: parsed.metadata }
  } catch (error) {
    return { url, success: false, error: String(error) }
  } finally {
    try {
      fs.unlinkSync(scriptPath)
    } catch {
      /* ignore */
    }
  }
}
