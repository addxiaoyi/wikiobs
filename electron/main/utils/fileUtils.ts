/**
 * File Utilities - 文件处理辅助函数
 */

import * as fs from 'fs'
import * as path from 'path'
import { logger } from '../common/logger'

export interface FileWithContent {
  path: string
  name: string
  content: string
}

/**
 * 获取目录下所有 Markdown 文件及其内容
 */
export async function getMarkdownFilesWithContent(dir: string): Promise<FileWithContent[]> {
  const files: FileWithContent[] = []

  async function scanDir(currentDir: string) {
    try {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true })

      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name)

        if (entry.isDirectory()) {
          // 跳过隐藏目录和特殊目录
          if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
            await scanDir(fullPath)
          }
        } else if (entry.name.endsWith('.md')) {
          try {
            const content = fs.readFileSync(fullPath, 'utf-8')
            // 去除 frontmatter
            const plainContent = content.replace(/^---\n[\s\S]*?\n---\n?/, '')
            files.push({
              path: fullPath,
              name: entry.name,
              content: plainContent,
            })
          } catch (err) {
            logger.error('FileUtils', `Failed to read ${fullPath}`, err)
          }
        }
      }
    } catch (err) {
      logger.error('FileUtils', `Failed to scan directory ${currentDir}`, err)
    }
  }

  await scanDir(dir)
  return files
}

/**
 * 计算文件的 SHA256 哈希
 */
export function computeFileHash(content: string): string {
  const crypto = require('crypto')
  return crypto.createHash('sha256').update(content).digest('hex')
}

/**
 * 检查文件是否已存在（基于内容哈希）
 */
export async function isFileDuplicate(content: string, existingHashes: Set<string>): Promise<boolean> {
  const hash = computeFileHash(content)
  return existingHashes.has(hash)
}
