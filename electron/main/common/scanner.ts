/**
 * Scanner Utility - 共享的 Markdown 文件扫描器
 * 消除 incremental-indexer, scheduled-tasks, ai-organization 中的重复实现
 */

import * as fs from 'fs'
import * as path from 'path'

/**
 * 递归扫描目录中的所有 Markdown 文件
 * 跳过隐藏目录和 node_modules
 */
export function scanMarkdownFiles(dir: string, depth = 0): string[] {
  const files: string[] = []

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
          files.push(...scanMarkdownFiles(fullPath, depth + 1))
        }
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        files.push(fullPath)
      }
    }
  } catch {
    // 忽略无法访问的目录
  }

  return files
}

/**
 * 扫描 Markdown 文件并返回文件统计信息
 */
export function scanMarkdownFilesWithStats(dir: string): {
  totalNotes: number
  lastModified: string
  totalSize: number
} {
  let totalNotes = 0
  let lastModified = new Date(0).toISOString()
  let totalSize = 0

  const files = scanMarkdownFiles(dir)
  for (const filePath of files) {
    totalNotes++
    try {
      const stats = fs.statSync(filePath)
      if (stats.mtime > new Date(lastModified)) {
        lastModified = stats.mtime.toISOString()
      }
      totalSize += stats.size
    } catch {
      // 忽略
    }
  }

  return { totalNotes, lastModified, totalSize }
}
