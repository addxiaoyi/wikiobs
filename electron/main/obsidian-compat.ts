/**
 * Obsidian Compatibility - Obsidian 格式兼容
 * 导入/导出 Obsidian Vault
 */

import { ipcMain, dialog } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import Store from 'electron-store'
import { logger } from './common/logger'
import WindowsManager from './common/windowManager'

interface ObsidianNote {
  filePath: string
  title: string
  content: string
  frontmatter: Record<string, unknown>
  tags: string[]
  links: ObsidianLink[]
  embeds: ObsidianEmbed[]
  created: Date
  modified: Date
}

interface ObsidianLink {
  target: string
  displayText?: string
  type: 'internal' | 'external'
  position: { start: number; end: number }
}

interface ObsidianEmbed {
  target: string
  position: { start: number; end: number }
}

interface ImportResult {
  success: boolean
  imported: number
  skipped: number
  errors: string[]
  notes: ObsidianNote[]
}

interface ExportOptions {
  includeAttachments?: boolean
  preserveLinks?: boolean
  convertToRelative?: boolean
  outputFormat?: 'obsidian' | 'standard'
}

const store = new Store()

// 解析 Obsidian frontmatter
export function parseFrontmatter(content: string): {
  frontmatter: Record<string, unknown>
  body: string
} {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/
  const match = content.match(frontmatterRegex)

  if (!match) {
    return { frontmatter: {}, body: content }
  }

  const frontmatterStr = match[1]
  const body = match[2]

  const frontmatter: Record<string, unknown> = {}

  // 简单的 YAML 解析
  for (const line of frontmatterStr.split('\n')) {
    const colonIndex = line.indexOf(':')
    if (colonIndex === -1) continue

    const key = line.substring(0, colonIndex).trim()
    let value: unknown = line.substring(colonIndex + 1).trim()

    // 移除引号
    if ((value as string).startsWith('"') && (value as string).endsWith('"')) {
      value = (value as string).slice(1, -1)
    } else if ((value as string).startsWith("'") && (value as string).endsWith("'")) {
      value = (value as string).slice(1, -1)
    }

    // 解析数组
    if ((value as string).startsWith('[') && (value as string).endsWith(']')) {
      value = (value as string)
        .slice(1, -1)
        .split(',')
        .map((v) => v.trim().replace(/^["']|["']$/g, ''))
    }

    // 解析布尔值
    if (value === 'true') value = true
    if (value === 'false') value = false

    frontmatter[key] = value
  }

  return { frontmatter, body }
}

// 序列化 frontmatter
export function serializeFrontmatter(frontmatter: Record<string, unknown>): string {
  const lines: string[] = ['---']

  for (const [key, value] of Object.entries(frontmatter)) {
    if (Array.isArray(value)) {
      lines.push(`${key}: [${value.map((v) => `"${v}"`).join(', ')}]`)
    } else if (typeof value === 'string') {
      lines.push(`${key}: "${value}"`)
    } else {
      lines.push(`${key}: ${value}`)
    }
  }

  lines.push('---')
  return lines.join('\n')
}

// 解析 Wiki 链接 [[...]]
export function parseWikiLinks(content: string): ObsidianLink[] {
  const links: ObsidianLink[] = []
  const wikiLinkRegex = /\[\[([^\]]+)\]\]/g
  let match

  while ((match = wikiLinkRegex.exec(content)) !== null) {
    const fullMatch = match[0]
    const inner = match[1]
    const parts = inner.split('|')
    const target = parts[0].trim()
    const displayText = parts[1]?.trim()

    const isExternal = target.startsWith('http://') || target.startsWith('https://')

    links.push({
      target,
      displayText,
      type: isExternal ? 'external' : 'internal',
      position: { start: match.index, end: match.index + fullMatch.length },
    })
  }

  return links
}

// 解析嵌入 ![[...]]
export function parseEmbeds(content: string): ObsidianEmbed[] {
  const embeds: ObsidianEmbed[] = []
  const embedRegex = /!\[\[([^\]]+)\]\]/g
  let match

  while ((match = embedRegex.exec(content)) !== null) {
    embeds.push({
      target: match[1].trim(),
      position: { start: match.index, end: match.index + match[0].length },
    })
  }

  return embeds
}

// 解析标签
export function parseObsidianTags(content: string): string[] {
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

// 解析单个 Obsidian 笔记
function collectObsidianNotes(vaultPath: string): ObsidianNote[] {
  const notes: ObsidianNote[] = []
  const scanDir = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === '.obsidian' || entry.name === '.trash') continue
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) scanDir(fullPath)
      else if (entry.name.endsWith('.md')) {
        const note = parseObsidianNote(fullPath, fs.readFileSync(fullPath, 'utf-8'))
        note.filePath = path.relative(vaultPath, fullPath)
        notes.push(note)
      }
    }
  }
  if (fs.existsSync(vaultPath)) scanDir(vaultPath)
  return notes
}

function parseObsidianNote(filePath: string, content: string): ObsidianNote {
  const { frontmatter, body } = parseFrontmatter(content)
  const links = parseWikiLinks(body)
  const embeds = parseEmbeds(body)
  const tags = parseObsidianTags(body)

  const stats = fs.statSync(filePath)

  return {
    filePath,
    title: (frontmatter.title as string) || path.basename(filePath, '.md'),
    content: body,
    frontmatter,
    tags,
    links,
    embeds,
    created: stats.birthtime,
    modified: stats.mtime,
  }
}

// 导入 Obsidian Vault
async function importObsidianVault(vaultPath: string, targetPathOverride?: string): Promise<ImportResult> {
  const result: ImportResult = {
    success: true,
    imported: 0,
    skipped: 0,
    errors: [],
    notes: [],
  }

  const targetPath = targetPathOverride || (store.get('vaultDirectory') as string)
  if (!targetPath) {
    result.success = false
    result.errors.push('No vault directory configured')
    return result
  }

  // 确保目标目录存在
  if (!fs.existsSync(targetPath)) {
    fs.mkdirSync(targetPath, { recursive: true })
  }

  const scanDir = (dir: string) => {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true })

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)

        if (entry.name === '.obsidian' || entry.name === '.trash') {
          continue
        }

        if (entry.isDirectory()) {
          scanDir(fullPath)
        } else if (entry.name.endsWith('.md')) {
          try {
            const content = fs.readFileSync(fullPath, 'utf-8')
            const note = parseObsidianNote(fullPath, content)
            result.notes.push(note)

            // 复制到 Reor Vault
            const relativePath = path.relative(vaultPath, fullPath)
            const targetFilePath = path.join(targetPath, relativePath)
            const targetDir = path.dirname(targetFilePath)

            if (!fs.existsSync(targetDir)) {
              fs.mkdirSync(targetDir, { recursive: true })
            }

            // 添加 Reor 特有 frontmatter
            const reorFrontmatter = {
              ...note.frontmatter,
              source: 'obsidian',
              sourcePath: fullPath,
              importedAt: new Date().toISOString(),
              originalTags: note.tags,
            }

            const outputContent = `${serializeFrontmatter(reorFrontmatter)}\n${note.content}`

            // 检查是否已存在
            if (fs.existsSync(targetFilePath)) {
              const existingContent = fs.readFileSync(targetFilePath, 'utf-8')
              if (existingContent === outputContent) {
                result.skipped++
                continue
              }
            }

            fs.writeFileSync(targetFilePath, outputContent, 'utf-8')
            result.imported++
          } catch (e) {
            result.errors.push(`Failed to import ${fullPath}: ${e}`)
          }
        }
      }
    } catch (e) {
      result.errors.push(`Failed to scan directory ${dir}: ${e}`)
    }
  }

  scanDir(vaultPath)

  if (result.errors.length > 0) {
    result.success = result.imported > 0
  }

  return result
}

// 迁移链接
function migrateLinks(notes: ObsidianNote[], linkMapping: Map<string, string>): ObsidianNote[] {
  return notes.map((note) => {
    let content = note.content

    // 替换内部链接
    for (const [oldPath, newPath] of linkMapping) {
      const oldName = path.basename(oldPath, '.md')
      const newName = path.basename(newPath, '.md')

      // 替换 [[oldName]] 和 [[oldName|display]]
      content = content.replace(
        new RegExp(`\\[\\[${escapeRegex(oldName)}(\\|[^\\]]*)?\\]\\]`, 'g'),
        (match, display) => {
          return display ? `[[${newName}${display}]]` : `[[${newName}]]`
        },
      )

      // 替换 ![[oldName]]
      content = content.replace(new RegExp(`!\\[\\[${escapeRegex(oldName)}\\]\\]`, 'g'), `![[${newName}]]`)
    }

    return { ...note, content }
  })
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// 导出为 Obsidian 格式
async function exportToObsidian(
  notes: ObsidianNote[],
  outputPath: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    // 确保输出目录存在
    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath, { recursive: true })
    }

    // 创建 .obsidian 配置目录
    const obsidianConfigDir = path.join(outputPath, '.obsidian')
    if (!fs.existsSync(obsidianConfigDir)) {
      fs.mkdirSync(obsidianConfigDir, { recursive: true })
    }

    for (const note of notes) {
      const filePath = path.join(outputPath, note.filePath)
      const dir = path.dirname(filePath)

      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }

      // 清理 frontmatter
      const cleanFrontmatter: Record<string, unknown> = {
        title: note.title,
        tags: note.tags,
        created: note.created.toISOString(),
        modified: note.modified.toISOString(),
      }

      const content = `${serializeFrontmatter(cleanFrontmatter)}\n${note.content}`

      fs.writeFileSync(filePath, content, 'utf-8')
    }

    return { success: true }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

// 导出 ZIP
async function exportVaultZip(
  notes: ObsidianNote[],
  outputPath: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const AdmZip = require('adm-zip')
    const zip = new AdmZip()

    for (const note of notes) {
      const content = `${serializeFrontmatter(note.frontmatter)}\n${note.content}`
      zip.addFile(note.filePath, Buffer.from(content, 'utf-8'))
    }

    zip.writeZip(outputPath)
    return { success: true }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

// 注册 IPC handlers
export function registerObsidianCompatHandlers(windowsManager?: WindowsManager) {
  ipcMain.handle('obsidian:import', async (_event, vaultPath: string, targetPath?: string) => {
    return importObsidianVault(vaultPath, targetPath)
  })

  ipcMain.handle('obsidian:export', async (_event, options: { outputDir: string }) => {
    const vaultPath =
      windowsManager?.getVaultDirectoryForWinContents(_event.sender) || (store.get('vaultDirectory') as string)
    const notes = collectObsidianNotes(vaultPath)
    const result = await exportToObsidian(notes, options.outputDir)
    return {
      ...result,
      exported: result.success ? notes.length : 0,
      outputDir: options.outputDir,
      errors: result.error ? [result.error] : [],
    }
  })

  ipcMain.handle(
    'obsidian:migrate-links',
    async (_event, notes: ObsidianNote[], linkMapping: Record<string, string>) => {
      const map = new Map(Object.entries(linkMapping))
      return migrateLinks(notes, map)
    },
  )

  ipcMain.handle('obsidian:select-vault', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Select Obsidian Vault',
    })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle('obsidian:export-zip', async (_event, notes: ObsidianNote[], outputPath: string) => {
    return exportVaultZip(notes, outputPath)
  })

  logger.info('ObsidianCompat', 'IPC handlers registered')
}

export {
  parseObsidianNote,
  importObsidianVault,
  exportToObsidian,
  migrateLinks,
  type ObsidianNote,
  type ObsidianLink,
  type ObsidianEmbed,
  type ExportOptions,
}
