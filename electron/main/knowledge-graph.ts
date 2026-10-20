/**
 * Knowledge Graph - 知识图谱构建
 * 解析双向链接、提取实体、构建关系图
 */

import * as fs from 'fs'
import * as path from 'path'
import crypto from 'crypto'
import Store from 'electron-store'
import { logger } from './common/logger'

// 类型定义
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
  type: 'note' | 'person' | 'place' | 'organization' | 'concept' | 'tag'
  aliases?: string[]
  metadata?: Record<string, unknown>
  filePath?: string
}

export interface Relation {
  id: string
  source: string
  target: string
  type: 'links_to' | 'mentions' | 'belongs_to' | 'related_to' | 'references'
  weight: number
  context?: string
}

export interface KnowledgeGraph {
  entities: Entity[]
  relations: Relation[]
  links: WikiLink[]
  metadata: {
    totalNotes: number
    totalLinks: number
    totalEntities: number
    createdAt: string
  }
}

// 全局图谱实例
const globalGraphState: { current: KnowledgeGraph | null } = { current: null }
const store = new Store()

// 解析 [[双向链接]]
function parseWikiLinksInternal(content: string, sourceFile: string): WikiLink[] {
  const links: WikiLink[] = []
  // 匹配 [[链接]] 或 [[链接|显示文本]]
  const wikiLinkRegex = /\[\[([^\]]+)\]\]/g
  let match

  while ((match = wikiLinkRegex.exec(content)) !== null) {
    const fullMatch = match[0]
    const inner = match[1]
    const parts = inner.split('|')
    const targetTitle = parts[0].trim()
    const displayText = parts[1]?.trim() || targetTitle

    // 提取上下文（链接前后各50个字符）
    const start = Math.max(0, match.index - 50)
    const end = Math.min(content.length, match.index + fullMatch.length + 50)
    const context = content.substring(start, end)

    // 判断链接类型
    const isExternal = targetTitle.startsWith('http://') || targetTitle.startsWith('https://')
    const isBroken = !isExternal && !targetTitle.includes('.md') && !targetTitle.includes('/')
    let linkType: WikiLink['linkType'] = 'internal'
    if (isExternal) linkType = 'external'
    else if (isBroken) linkType = 'broken'

    links.push({
      sourceFile,
      targetFile: isExternal ? targetTitle : targetTitle,
      targetTitle: displayText,
      linkType,
      context,
      position: { start: match.index, end: match.index + fullMatch.length },
    })
  }

  return links
}

// 解析 #标签
function parseTags(content: string): string[] {
  const tagRegex = /#([a-zA-Z一-龥][\w一-龥-]*)/g
  const tags: string[] = []
  let match

  while ((match = tagRegex.exec(content)) !== null) {
    const tag = match[1].toLowerCase()
    if (!tags.includes(tag)) {
      tags.push(tag)
    }
  }

  return tags
}

// 简单的命名实体识别
function extractEntities(content: string): {
  people: string[]
  places: string[]
  organizations: string[]
  concepts: string[]
} {
  const people: string[] = []
  const places: string[] = []
  const organizations: string[] = []
  const concepts: string[] = []

  // 简单模式匹配（实际应用中应该使用 NLP 模型）
  // 人名模式：2-4个汉字或大写字母开头的英文名
  const personRegex = /([A-Z][a-z]+ [A-Z][a-z]+)|([一-龥]{2,4}先生|[一-龥]{2,4}女士|[一-龥]{2,4}博士)/g
  // 地名模式：包含 省/市/县/区/国/洲 等
  const placeRegex = /([一-龥]+省|[一-龥]+市|[一-龥]+县|[一-龥]+区|[一-龥]+国|[一-龥]+洲)/g
  // 组织模式：公司/大学/机构/医院等
  const orgRegex = /([一-龥]+公司|[一-龥]+大学|[一-龥]+医院|[一-龥]+研究所|[一-龥]+机构)/g

  let match

  while ((match = personRegex.exec(content)) !== null) {
    const name = match[1] || match[2]
    if (name && !people.includes(name)) people.push(name)
  }

  while ((match = placeRegex.exec(content)) !== null) {
    const place = match[1]
    if (place && !places.includes(place)) places.push(place)
  }

  while ((match = orgRegex.exec(content)) !== null) {
    const org = match[1]
    if (org && !organizations.includes(org)) organizations.push(org)
  }

  return { people, places, organizations, concepts }
}

// 构建知识图谱
async function buildGraph(options?: {
  includeContent?: boolean
  maxDepth?: number
  vaultPath?: string
}): Promise<KnowledgeGraph> {
  const vaultPath = options?.vaultPath || (store.get('vaultDirectory') as string)

  if (!vaultPath || !fs.existsSync(vaultPath)) {
    return {
      entities: [],
      relations: [],
      links: [],
      metadata: { totalNotes: 0, totalLinks: 0, totalEntities: 0, createdAt: new Date().toISOString() },
    }
  }

  const entities: Entity[] = []
  const relations: Relation[] = []
  const links: WikiLink[] = []
  const fileContents = new Map<string, string>()
  const entityMap = new Map<string, Entity>()

  // 扫描所有 Markdown 文件
  const scanDir = (dir: string, depth = 0) => {
    if (options?.maxDepth && depth > options.maxDepth) return

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          scanDir(fullPath, depth + 1)
        } else if (entry.name.endsWith('.md')) {
          try {
            const content = fs.readFileSync(fullPath, 'utf-8')
            const relativePath = path.relative(vaultPath, fullPath)
            fileContents.set(relativePath, content)

            // 解析 Wiki 链接
            const fileLinks = parseWikiLinksInternal(content, relativePath)
            links.push(...fileLinks)

            // 解析标签
            const tags = parseTags(content)
            for (const tag of tags) {
              const tagId = `tag:${tag}`
              if (!entityMap.has(tagId)) {
                const entity: Entity = {
                  id: tagId,
                  title: tag,
                  type: 'tag',
                  filePath: relativePath,
                }
                entityMap.set(tagId, entity)
                entities.push(entity)
              }
            }

            // 提取实体
            if (options?.includeContent) {
              const extracted = extractEntities(content)

              for (const person of extracted.people) {
                const id = `person:${person}`
                if (!entityMap.has(id)) {
                  const entity: Entity = {
                    id,
                    title: person,
                    type: 'person',
                    filePath: relativePath,
                  }
                  entityMap.set(id, entity)
                  entities.push(entity)
                }
              }

              for (const place of extracted.places) {
                const id = `place:${place}`
                if (!entityMap.has(id)) {
                  const entity: Entity = {
                    id,
                    title: place,
                    type: 'place',
                    filePath: relativePath,
                  }
                  entityMap.set(id, entity)
                  entities.push(entity)
                }
              }

              for (const org of extracted.organizations) {
                const id = `org:${org}`
                if (!entityMap.has(id)) {
                  const entity: Entity = {
                    id,
                    title: org,
                    type: 'organization',
                    filePath: relativePath,
                  }
                  entityMap.set(id, entity)
                  entities.push(entity)
                }
              }
            }

            // 为当前文件创建笔记实体
            const noteId = `note:${relativePath}`
            if (!entityMap.has(noteId)) {
              const title = path.basename(relativePath, '.md')
              const entity: Entity = {
                id: noteId,
                title,
                type: 'note',
                filePath: relativePath,
              }
              entityMap.set(noteId, entity)
              entities.push(entity)
            }
          } catch (e) {
            // 忽略读取错误
          }
        }
      }
    } catch (e) {
      logger.error('KnowledgeGraph', 'Error scanning directory', e)
    }
  }

  scanDir(vaultPath)

  // Obsidian links commonly omit the .md suffix. Resolve those links against
  // scanned notes before creating relations, while keeping standalone parsing
  // conservative for callers that do not have a vault index.
  for (const link of links) {
    if (link.linkType === 'broken') {
      const target = link.targetFile.replace(/\.md$/i, '')
      const resolved = Array.from(fileContents.keys()).find((file) => {
        const stem = file.replace(/\.md$/i, '')
        return stem === target || path.basename(stem) === target
      })
      if (resolved) {
        link.targetFile = resolved
        link.linkType = 'internal'
      }
    }
  }

  // 构建关系
  for (const link of links) {
    if (link.linkType === 'internal') {
      const sourceId = `note:${link.sourceFile}`
      const targetTitle = path.basename(link.targetFile, '.md')
      const targetId = `note:${link.targetFile}`

      // 查找目标笔记实体
      let targetEntity = entityMap.get(targetId)
      if (!targetEntity) {
        targetEntity = {
          id: targetId,
          title: targetTitle,
          type: 'note',
          filePath: link.targetFile,
        }
        entityMap.set(targetId, targetEntity)
        entities.push(targetEntity)
      }

      const relation: Relation = {
        id: crypto.randomUUID(),
        source: sourceId,
        target: targetId,
        type: 'links_to',
        weight: 1,
        context: link.context,
      }
      relations.push(relation)
    }
  }

  // 添加标签关系
  for (const entity of entities) {
    if (entity.filePath && entity.type !== 'tag') {
      const content = fileContents.get(entity.filePath) || ''
      const tags = parseTags(content)
      for (const tag of tags) {
        const tagId = `tag:${tag}`
        if (entityMap.has(tagId)) {
          relations.push({
            id: crypto.randomUUID(),
            source: entity.id,
            target: tagId,
            type: 'belongs_to',
            weight: 0.5,
          })
        }
      }
    }
  }

  const graph: KnowledgeGraph = {
    entities,
    relations,
    links,
    metadata: {
      totalNotes: entities.filter((e) => e.type === 'note').length,
      totalLinks: links.filter((l) => l.linkType === 'internal').length,
      totalEntities: entities.length,
      createdAt: new Date().toISOString(),
    },
  }

  globalGraphState.current = graph
  // Keep the lightweight link index available to hybrid search without
  // introducing an IPC round-trip between main-process modules.
  globalThis.graphLinks = links.map((link) => ({
    sourceFile: link.sourceFile,
    targetFile: link.targetFile,
    targetTitle: link.targetTitle,
    context: link.context,
  }))
  return graph
}

// 获取实体的关系
function getEntityRelations(
  graph: KnowledgeGraph,
  entityId: string,
): {
  incoming: Relation[]
  outgoing: Relation[]
} {
  return {
    incoming: graph.relations.filter((r) => r.target === entityId),
    outgoing: graph.relations.filter((r) => r.source === entityId),
  }
}

// 查找相关实体
function findRelated(graph: KnowledgeGraph, entityId: string, maxResults: number = 10): Entity[] {
  const entity = graph.entities.find((e) => e.id === entityId)
  if (!entity) return []

  const relatedIds = new Set<string>()
  const queue = [entityId]
  const depth = new Map<string, number>()
  depth.set(entityId, 0)

  // BFS 查找相关实体
  while (queue.length > 0 && relatedIds.size < maxResults * 2) {
    const current = queue.shift()!
    const currentDepth = depth.get(current) || 0

    if (currentDepth < 2) {
      for (const relation of graph.relations) {
        if (relation.source === current && !relatedIds.has(relation.target)) {
          relatedIds.add(relation.target)
          depth.set(relation.target, currentDepth + 1)
          queue.push(relation.target)
        }
        if (relation.target === current && !relatedIds.has(relation.source)) {
          relatedIds.add(relation.source)
          depth.set(relation.source, currentDepth + 1)
          queue.push(relation.source)
        }
      }
    }
  }

  return graph.entities.filter((e) => relatedIds.has(e.id) && e.id !== entityId).slice(0, maxResults)
}

// 导出为 JSON
function exportToJson(graph: KnowledgeGraph): string {
  return JSON.stringify(graph, null, 2)
}

// 导出为 DOT 格式（用于 Graphviz）
function exportToDot(graph: KnowledgeGraph): string {
  let dot = 'digraph KnowledgeGraph {\n'
  dot += '  rankdir=LR;\n'
  dot += '  node [shape=box];\n\n'

  // 节点
  for (const entity of graph.entities) {
    const label = entity.title.replace(/"/g, '\\"')
    let attrs = `label="${label}"`
    if (entity.type === 'note') attrs += ' shape=ellipse color=blue'
    if (entity.type === 'person') attrs += ' shape=person color=green'
    if (entity.type === 'place') attrs += ' shape=diamond color=orange'
    if (entity.type === 'tag') attrs += ' shape=tag color=purple'
    if (entity.type === 'organization') attrs += ' shape=box color=red'
    dot += `  "${entity.id}" [${attrs}];\n`
  }

  dot += '\n'

  // 边
  for (const relation of graph.relations) {
    const label = relation.type
    dot += `  "${relation.source}" -> "${relation.target}" [label="${label}" weight=${relation.weight}];\n`
  }

  dot += '}\n'
  return dot
}

// 解析单个文件的链接
function parseLinks(filePath: string, content: string): WikiLink[] {
  return parseWikiLinksInternal(content, filePath)
}

// 导出供其他模块使用
export { buildGraph, getEntityRelations, findRelated, exportToJson, exportToDot, parseLinks }

// 兼容别名 - 与 knowledge-graph-handlers.ts 保持一致
export const buildKnowledgeGraph = buildGraph
export const exportGraphToJson = exportToJson
export const exportGraphToDot = exportToDot
export const parseWikiLinks = parseLinks
export const findRelatedEntities = findRelated

// 供 hybrid-search 使用
export function getGlobalGraph() {
  return globalGraphState.current
}

export function setGlobalLinks(links: WikiLink[]) {
  if (globalGraphState.current) {
    globalGraphState.current.links = links
  }
}
