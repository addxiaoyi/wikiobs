/**
 * Hybrid Search - RAG 混合检索
 * 结合向量搜索 + BM25 + Graph 关系
 */

import { ipcMain } from 'electron'
import path from 'path'
import * as fs from 'fs'
import Store from 'electron-store'
import { logger } from './common/logger'

// 扩展 globalThis 类型
declare global {
  var lanceSearch:
    | ((query: string, limit: number) => Promise<Array<{ filePath: string; content?: string }>>)
    | undefined
  var graphLinks: Array<{ sourceFile: string; targetFile: string; targetTitle?: string; context?: string }> | undefined
}

interface SearchResult {
  filePath: string
  content: string
  score: number
  matchType: 'vector' | 'bm25' | 'graph' | 'hybrid'
  highlights: string[]
}

interface BM25Posting {
  docId: string
  positions: number[]
}

interface BM25Index {
  terms: Map<string, BM25Posting[]>
  docLengths: Map<string, number>
  avgDocLength: number
}

let bm25Index: BM25Index | null = null
const store = new Store()

interface CachedFile {
  path: string
  content: string
  mtime: number
}

let cachedVaultPath: string | null = null
const cachedFilesMap: Map<string, CachedFile> = new Map()
let lastScanTimestamp = 0
const RESCAN_INTERVAL_MS = 5000

function invalidateBM25Index(): void {
  bm25Index = null
  cachedFilesMap.clear()
  cachedVaultPath = null
  lastScanTimestamp = 0
}

// 简单的分词器
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s一-鿿]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1)
}

// 计算 BM25
function calculateBM25(queryTerms: string[], docId: string, k1 = 1.5, b = 0.75): number {
  if (!bm25Index) return 0
  const docLength = bm25Index.docLengths.get(docId) || 0
  let score = 0
  const N = bm25Index.docLengths.size
  const avgDL = bm25Index.avgDocLength

  for (const term of queryTerms) {
    const postings = bm25Index.terms.get(term)
    if (!postings) continue

    const ni = new Set(postings.map((p) => p.docId)).size
    const fi = postings.filter((p) => p.docId === docId).length

    const idf = Math.log((N - ni + 0.5) / (ni + 0.5) + 1)
    const lengthRatio = avgDL > 0 ? docLength / avgDL : 0
    const tf = fi / (fi + k1 * (1 - b + b * lengthRatio))
    score += idf * tf
  }

  return score
}

// 构建 BM25 索引
async function buildBM25Index(files: Array<{ path: string; content: string }>) {
  const index: BM25Index = {
    terms: new Map(),
    docLengths: new Map(),
    avgDocLength: 0,
  }

  let totalLength = 0

  for (const file of files) {
    const tokens = tokenize(file.content)
    index.docLengths.set(file.path, tokens.length)
    totalLength += tokens.length

    for (let i = 0; i < tokens.length; i++) {
      const term = tokens[i]
      let postings = index.terms.get(term)
      if (!postings) {
        postings = []
        index.terms.set(term, postings)
      }
      const existing = postings.find((p) => p.docId === file.path)
      if (existing) {
        existing.positions.push(i)
      } else {
        postings.push({
          docId: file.path,
          positions: [i],
        })
      }
    }
  }

  index.avgDocLength = totalLength / Math.max(files.length, 1)
  bm25Index = index
}

// 提取文本片段（用于高亮）
function extractHighlights(content: string, queryTerms: string[], radius = 50): string[] {
  const highlights: string[] = []
  const lowerContent = content.toLowerCase()
  const lowerTerms = queryTerms.map((t) => t.toLowerCase())

  for (const term of lowerTerms) {
    let idx = lowerContent.indexOf(term)
    while (idx !== -1 && highlights.length < 3) {
      const start = Math.max(0, idx - radius)
      const end = Math.min(content.length, idx + term.length + radius)
      let snippet = content.substring(start, end)
      if (start > 0) snippet = `...${snippet}`
      if (end < content.length) snippet += '...'
      if (!highlights.includes(snippet)) {
        highlights.push(snippet)
      }
      idx = lowerContent.indexOf(term, idx + 1)
    }
  }

  return highlights
}

// RRF 融合排序（Reciprocal Rank Fusion）
function rrfFusion(results: Map<string, { result: SearchResult; rank: number }>[], k = 60): SearchResult[] {
  const scores = new Map<string, number>()

  for (const resultSet of results) {
    for (const { result, rank } of resultSet.values()) {
      const current = scores.get(result.filePath) || 0
      scores.set(result.filePath, current + 1 / (k + rank))
    }
  }

  return Array.from(scores.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([filePath, score]) => {
      const firstResult = results
        .flatMap((r) => Array.from(r.values()))
        .find((r) => r.result.filePath === filePath)?.result
      return { ...firstResult!, score }
    })
}

// 混合搜索主函数
async function hybridSearch(query: string, limit: number = 10, filter?: string): Promise<SearchResult[]> {
  const vaultPath = store.get('vaultDirectory') as string
  if (!vaultPath || !fs.existsSync(vaultPath)) {
    return []
  }

  // 1. 获取向量搜索结果
  const vectorResults = await getVectorResults(query, limit)

  // 2. 获取 BM25 结果
  const bm25Results = await getBM25Results(query, limit, vaultPath)

  // 3. 获取 Graph 关系结果
  const graphResults = await getGraphResults(query, limit)

  // 4. RRF 融合
  const fusedResults = rrfFusion([vectorResults, bm25Results, graphResults])

  // 5. 应用过滤
  let filteredResults = fusedResults
  if (filter) {
    filteredResults = fusedResults.filter((r) => r.filePath.includes(filter))
  }

  return filteredResults.slice(0, limit)
}

// 带重排的混合搜索
async function hybridSearchWithReranking(query: string, limit: number = 10, filter?: string): Promise<SearchResult[]> {
  const results = await hybridSearch(query, limit * 3, filter)

  // 简单的重排：结合相关性分数和内容质量
  const reranked = results.map((r) => {
    const contentLength = r.content.length
    const hasQueryTerms = tokenize(query).every((t) => r.content.toLowerCase().includes(t))
    const qualityBoost = hasQueryTerms ? 1.2 : 1.0
    return {
      ...r,
      score: r.score * qualityBoost * Math.min(contentLength / 1000, 1.5),
    }
  })

  return reranked.sort((a, b) => b.score - a.score).slice(0, limit)
}

// 获取向量搜索结果（调用 LanceDB）
async function getVectorResults(
  query: string,
  limit: number,
): Promise<Map<string, { result: SearchResult; rank: number }>> {
  const results = new Map<string, { result: SearchResult; rank: number }>()

  try {
    // 尝试使用现有的向量数据库 IPC
    // 由于无法直接访问，这里返回模拟结果
    // 实际应该通过 IPC 调用 lance.ts 的搜索功能
    const lanceSearch = globalThis.lanceSearch
    const lanceResults = lanceSearch ? await lanceSearch(query, limit) : null
    if (lanceResults) {
      lanceResults.forEach((r, idx: number) => {
        results.set(r.filePath, {
          result: {
            filePath: r.filePath,
            content: r.content || '',
            score: 1 - idx / limit,
            matchType: 'vector',
            highlights: [],
          },
          rank: idx,
        })
      })
    }
  } catch (e) {
    logger.warn('HybridSearch', 'Vector search not available', e)
  }

  return results
}

async function ensureBM25Index(vaultPath: string): Promise<Array<{ path: string; content: string }>> {
  const now = Date.now()
  const isDifferentVault = cachedVaultPath !== vaultPath

  if (bm25Index && !isDifferentVault && now - lastScanTimestamp < RESCAN_INTERVAL_MS) {
    return Array.from(cachedFilesMap.values())
  }

  if (isDifferentVault) {
    cachedFilesMap.clear()
    cachedVaultPath = vaultPath
    bm25Index = null
  }

  let indexDirty = !bm25Index
  const currentPaths = new Set<string>()

  const scanDir = (dir: string) => {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
            scanDir(fullPath)
          }
        } else if (entry.name.endsWith('.md')) {
          currentPaths.add(fullPath)
          try {
            const stat = fs.statSync(fullPath)
            const cached = cachedFilesMap.get(fullPath)
            if (!cached || cached.mtime !== stat.mtimeMs) {
              const content = fs.readFileSync(fullPath, 'utf-8')
              cachedFilesMap.set(fullPath, { path: fullPath, content, mtime: stat.mtimeMs })
              indexDirty = true
            }
          } catch {
            // ignore read error
          }
        }
      }
    } catch {
      // ignore dir error
    }
  }

  scanDir(vaultPath)
  lastScanTimestamp = now

  for (const cachedPath of cachedFilesMap.keys()) {
    if (!currentPaths.has(cachedPath)) {
      cachedFilesMap.delete(cachedPath)
      indexDirty = true
    }
  }

  const files = Array.from(cachedFilesMap.values())

  if (indexDirty || !bm25Index) {
    await buildBM25Index(files)
  }

  return files
}

// 获取 BM25 结果
async function getBM25Results(
  query: string,
  limit: number,
  vaultPath: string,
): Promise<Map<string, { result: SearchResult; rank: number }>> {
  const results = new Map<string, { result: SearchResult; rank: number }>()

  try {
    const files = await ensureBM25Index(vaultPath)

    // 计算分数
    const queryTerms = tokenize(query)
    const scored = files
      .map((f) => ({
        ...f,
        score: calculateBM25(queryTerms, f.path),
      }))
      .filter((f) => f.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)

    scored.forEach((f, idx) => {
      results.set(f.path, {
        result: {
          filePath: f.path,
          content: f.content,
          score: f.score,
          matchType: 'bm25',
          highlights: extractHighlights(f.content, queryTerms),
        },
        rank: idx,
      })
    })
  } catch (e) {
    logger.error('HybridSearch', 'BM25 search error', e)
  }

  return results
}

// 获取图关系结果
async function getGraphResults(
  query: string,
  limit: number,
): Promise<Map<string, { result: SearchResult; rank: number }>> {
  const results = new Map<string, { result: SearchResult; rank: number }>()

  try {
    // 查找包含查询词的链接
    const graphLinks = globalThis.graphLinks || []
    const queryLower = query.toLowerCase()

    const matchingLinks = graphLinks.filter(
      (l) => l.targetTitle?.toLowerCase().includes(queryLower) || l.sourceFile?.toLowerCase().includes(queryLower),
    )

    matchingLinks.slice(0, limit).forEach((l, idx: number) => {
      const filePath = l.sourceFile
      if (!results.has(filePath)) {
        results.set(filePath, {
          result: {
            filePath,
            content: l.context || '',
            score: 1 - idx / limit,
            matchType: 'graph',
            highlights: [l.context || ''],
          },
          rank: idx,
        })
      }
    })
  } catch (e) {
    logger.warn('HybridSearch', 'Graph search not available', e)
  }

  return results
}

// 注册 IPC handlers
export function registerHybridSearchHandlers() {
  ipcMain.handle('hybrid-search', async (_event, query: string, limit?: number, filter?: string) => {
    return hybridSearch(query, limit, filter)
  })

  ipcMain.handle('hybrid-search-with-reranking', async (_event, query: string, limit?: number, filter?: string) => {
    return hybridSearchWithReranking(query, limit, filter)
  })

  logger.info('HybridSearch', 'IPC handlers registered')
}

// 供其他模块调用
export { hybridSearch, hybridSearchWithReranking, buildBM25Index, extractHighlights, rrfFusion, invalidateBM25Index }
