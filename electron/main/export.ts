/**
 * Export Module - 知识库导出
 * 支持 ZIP、PDF、Graph JSON 等格式
 */

import { ipcMain, dialog } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import Store from 'electron-store'
import { logger } from './common/logger'
import WindowsManager from './common/windowManager'

interface ExportOptions {
  tags?: string[]
  dateFrom?: string
  dateTo?: string
  includeAttachments?: boolean
  includeSubfolders?: boolean
  /** Optional deterministic destination used by trusted local callers; the UI uses the native save dialog. */
  outputPath?: string
}

interface ExportResult {
  success: boolean
  outputPath?: string
  filesExported?: number
  error?: string
}

interface NoteMetadata {
  filePath: string
  title: string
  tags: string[]
  modified: string
  created: string
  content?: string
}

const store = new Store()

// 简单的 markdown 转 HTML
function markdownToHtml(markdown: string): string {
  let html = markdown

  // 标题
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>')
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>')
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>')

  // 粗体和斜体
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>')

  // 链接
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')

  // 列表
  html = html.replace(/^\s*[-*]\s+(.*$)/gim, '<li>$1</li>')
  html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')

  // 代码块
  html = html.replace(/```([^`]+)```/g, '<pre><code>$1</code></pre>')
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>')

  // 段落
  html = html.replace(/\n\n/g, '</p><p>')
  html = `<p>${html}</p>`

  // 清理空段落
  html = html.replace(/<p>\s*<\/p>/g, '')

  return html
}

// 生成 PDF HTML 模板
function generatePdfHtml(notes: NoteMetadata[], title: string): string {
  const notesHtml = notes
    .map((note) => {
      const content = note.content ? markdownToHtml(note.content) : ''
      return `
        <article class="note">
          <h2>${note.title}</h2>
          <div class="meta">
            <span>Created: ${new Date(note.created).toLocaleDateString()}</span>
            <span>Modified: ${new Date(note.modified).toLocaleDateString()}</span>
            ${note.tags.length > 0 ? `<span>Tags: ${note.tags.map((t) => `#${t}`).join(', ')}</span>` : ''}
          </div>
          <div class="content">${content}</div>
        </article>
        <hr/>
      `
    })
    .join('\n')

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px 20px; line-height: 1.6; }
    h1 { border-bottom: 2px solid #333; padding-bottom: 10px; }
    h2 { color: #2c3e50; margin-top: 30px; }
    .meta { color: #666; font-size: 0.9em; margin-bottom: 20px; }
    .meta span { margin-right: 15px; }
    .note { margin-bottom: 40px; }
    pre { background: #f5f5f5; padding: 15px; border-radius: 5px; overflow-x: auto; }
    code { background: #f5f5f5; padding: 2px 5px; border-radius: 3px; }
    hr { border: none; border-top: 1px solid #ddd; margin: 30px 0; }
    a { color: #3498db; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <p>Exported on: ${new Date().toLocaleDateString()}</p>
  <p>Total notes: ${notes.length}</p>
  ${notesHtml}
</body>
</html>`
}

// 扫描要导出的文件
function scanFilesForExport(vaultPath: string, options?: ExportOptions): NoteMetadata[] {
  const notes: NoteMetadata[] = []

  const scanDir = (dir: string) => {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)

        if (entry.isDirectory()) {
          if (options?.includeSubfolders !== false) {
            scanDir(fullPath)
          }
        } else if (entry.name.endsWith('.md')) {
          try {
            const content = fs.readFileSync(fullPath, 'utf-8')
            const relativePath = path.relative(vaultPath, fullPath)
            const stats = fs.statSync(fullPath)

            // 解析标签
            const tagRegex = /#([a-zA-Z一-龥][\w一-龥-]*)/g
            const tags: string[] = []
            let match
            while ((match = tagRegex.exec(content)) !== null) {
              const tag = match[1].toLowerCase()
              if (!tags.includes(tag)) tags.push(tag)
            }

            // 日期过滤
            const modifiedDate = stats.mtime.toISOString()
            if (options?.dateFrom && modifiedDate < options.dateFrom) continue
            if (options?.dateTo && modifiedDate > options.dateTo) continue

            // 标签过滤
            if (options?.tags && options.tags.length > 0) {
              const hasMatchingTag = options.tags.some((t) => tags.includes(t.toLowerCase()))
              if (!hasMatchingTag) continue
            }

            notes.push({
              filePath: relativePath,
              title: path.basename(fullPath, '.md'),
              tags,
              modified: stats.mtime.toISOString(),
              created: stats.birthtime.toISOString(),
              content,
            })
          } catch (e) {
            // 忽略读取错误
          }
        }
      }
    } catch (e) {
      // 忽略
    }
  }

  scanDir(vaultPath)
  return notes
}

// 导出为 ZIP
async function exportVaultZip(options?: ExportOptions, vaultPathOverride?: string): Promise<ExportResult> {
  const vaultPath = vaultPathOverride || (store.get('vaultDirectory') as string)
  if (!vaultPath) {
    return { success: false, error: 'No vault directory configured' }
  }

  let outputPath = options?.outputPath
  if (!outputPath) {
    const result = await dialog.showSaveDialog({
      title: 'Export Vault as ZIP',
      defaultPath: `vault-export-${Date.now()}.zip`,
      filters: [{ name: 'ZIP Archive', extensions: ['zip'] }],
    })
    if (result.canceled || !result.filePath) return { success: false, error: 'Cancelled' }
    outputPath = result.filePath
  }

  try {
    const AdmZip = require('adm-zip')
    const zip = new AdmZip()
    const notes = scanFilesForExport(vaultPath, options)

    for (const note of notes) {
      const frontmatter = `---
title: ${note.title}
created: ${note.created}
modified: ${note.modified}
tags: [${note.tags.join(', ')}]
---

`
      const fullContent = frontmatter + (note.content || '')
      zip.addFile(note.filePath, Buffer.from(fullContent, 'utf-8'))
    }

    fs.mkdirSync(path.dirname(outputPath), { recursive: true })
    zip.writeZip(outputPath)

    return {
      success: true,
      outputPath,
      filesExported: notes.length,
    }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

// 导出为 PDF (HTML 格式，可打印)
async function exportVaultPdf(options?: ExportOptions, vaultPathOverride?: string): Promise<ExportResult> {
  const vaultPath = vaultPathOverride || (store.get('vaultDirectory') as string)
  if (!vaultPath) {
    return { success: false, error: 'No vault directory configured' }
  }

  const result = await dialog.showSaveDialog({
    title: 'Export Vault as PDF',
    defaultPath: `vault-export-${Date.now()}.html`,
    filters: [{ name: 'HTML Document', extensions: ['html'] }],
  })

  if (result.canceled || !result.filePath) {
    return { success: false, error: 'Cancelled' }
  }

  try {
    const notes = scanFilesForExport(vaultPath, options)
    const html = generatePdfHtml(notes, 'Knowledge Base Export')

    fs.writeFileSync(result.filePath, html, 'utf-8')

    return {
      success: true,
      outputPath: result.filePath,
      filesExported: notes.length,
    }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

// 导出为 Graph JSON
async function exportGraphJson(vaultPathOverride?: string): Promise<ExportResult> {
  try {
    // 尝试调用 knowledge-graph 模块
    const { exportToJson, buildGraph } = await import('./knowledge-graph')
    const graph = await buildGraph({ vaultPath: vaultPathOverride })
    const json = exportToJson(graph)

    const result = await dialog.showSaveDialog({
      title: 'Export Graph as JSON',
      defaultPath: `knowledge-graph-${Date.now()}.json`,
      filters: [{ name: 'JSON', extensions: ['json'] }],
    })

    if (result.canceled || !result.filePath) {
      return { success: false, error: 'Cancelled' }
    }

    fs.writeFileSync(result.filePath, json, 'utf-8')

    return {
      success: true,
      outputPath: result.filePath,
      filesExported: graph.entities.length,
    }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

// 选择性导出
async function selectiveExport(
  filePaths?: string[],
  options?: ExportOptions,
  vaultPathOverride?: string,
): Promise<ExportResult> {
  const vaultPath = vaultPathOverride || (store.get('vaultDirectory') as string)
  if (!vaultPath) {
    return { success: false, error: 'No vault directory configured' }
  }

  const result = await dialog.showOpenDialog({
    title: 'Select Export Destination',
    properties: ['openDirectory', 'createDirectory'],
  })

  if (result.canceled || !result.filePaths[0]) {
    return { success: false, error: 'Cancelled' }
  }

  try {
    const outputPath = result.filePaths[0]
    const notes = scanFilesForExport(vaultPath, options).filter(
      (note) => !filePaths || filePaths.includes(note.filePath),
    )

    for (const note of notes) {
      const targetPath = path.join(outputPath, note.filePath)
      const dir = path.dirname(targetPath)

      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }

      const frontmatter = `---
title: ${note.title}
created: ${note.created}
modified: ${note.modified}
tags: [${note.tags.join(', ')}]
---

`
      fs.writeFileSync(targetPath, frontmatter + (note.content || ''), 'utf-8')
    }

    return {
      success: true,
      outputPath,
      filesExported: notes.length,
    }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

// 导出为 Markdown（单文件聚合）
async function exportAsSingleMarkdown(vaultPathOverride?: string): Promise<ExportResult> {
  const vaultPath = vaultPathOverride || (store.get('vaultDirectory') as string)
  if (!vaultPath) {
    return { success: false, error: 'No vault directory configured' }
  }

  const result = await dialog.showSaveDialog({
    title: 'Export as Single Markdown',
    defaultPath: `knowledge-base-${Date.now()}.md`,
    filters: [{ name: 'Markdown', extensions: ['md'] }],
  })

  if (result.canceled || !result.filePath) {
    return { success: false, error: 'Cancelled' }
  }

  try {
    const notes = scanFilesForExport(vaultPath)
    const combinedContent = notes
      .map(
        (note) =>
          `# ${note.title}\n\n*Created: ${note.created} | Modified: ${note.modified}*\n\n${note.tags.length > 0 ? `**Tags:** ${note.tags.map((tag) => `#${tag}`).join(' ')}\n\n` : ''}---\n\n${note.content || ''}\n\n---\n\n`,
      )
      .join('\n')

    fs.writeFileSync(result.filePath, combinedContent, 'utf-8')

    return {
      success: true,
      outputPath: result.filePath,
      filesExported: notes.length,
    }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

// 注册 IPC handlers
export function registerExportHandlers(windowsManager?: WindowsManager) {
  const getVaultPath = (event: Electron.IpcMainInvokeEvent) =>
    windowsManager?.getVaultDirectoryForWinContents(event.sender) || (store.get('vaultDirectory') as string)

  ipcMain.handle('export:zip', async (event, options?: ExportOptions) => {
    return exportVaultZip(options, getVaultPath(event))
  })

  ipcMain.handle('export:pdf', async (event, options?: ExportOptions) => {
    return exportVaultPdf(options, getVaultPath(event))
  })

  ipcMain.handle('export:graph', async (event) => {
    return exportGraphJson(getVaultPath(event))
  })

  ipcMain.handle('export:selective', async (event, filePaths?: string[], options?: ExportOptions) => {
    return selectiveExport(filePaths, options, getVaultPath(event))
  })

  ipcMain.handle('export:single-markdown', async (event) => {
    return exportAsSingleMarkdown(getVaultPath(event))
  })

  ipcMain.handle('export:preview', async (event, options?: ExportOptions) => {
    const vaultPath = getVaultPath(event)
    if (!vaultPath) return { success: false, error: 'No vault directory configured' }
    return { success: true, files: scanFilesForExport(vaultPath, options) }
  })

  logger.info('Export', 'IPC handlers registered')
}

export {
  type ExportOptions,
  type ExportResult,
  type NoteMetadata,
  exportVaultZip,
  exportVaultPdf,
  exportGraphJson,
  selectiveExport,
  exportAsSingleMarkdown,
  scanFilesForExport,
}
