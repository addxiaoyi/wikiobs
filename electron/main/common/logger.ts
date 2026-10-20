/**
 * Structured Logger - 结构化日志系统
 * 替换所有 console.log/warn/error
 * 支持多级别、格式化输出、文件持久化
 */

/* eslint-disable no-console -- Console output is the logger's terminal sink. */

import * as fs from 'fs'
import * as path from 'path'
import { app } from 'electron'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogEntry {
  timestamp: string
  level: LogLevel
  module: string
  message: string
  data?: unknown
  error?: string
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

export class Logger {
  private minLevel: LogLevel = 'debug'

  private logDir: string = ''

  private logFile: string = ''

  private stream: fs.WriteStream | null = null

  private initialized = false

  /**
   * 初始化日志系统
   */
  init(userDataPath?: string): void {
    if (this.initialized) return
    this.logDir = userDataPath || app.getPath('userData')
    const logsDir = path.join(this.logDir, 'logs')
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true })
    }

    const dateStr = new Date().toISOString().slice(0, 10)
    this.logFile = path.join(logsDir, `app-${dateStr}.log`)
    this.stream = fs.createWriteStream(this.logFile, { flags: 'a' })
    this.initialized = true

    this.info('Logger', 'Logger initialized', { logFile: this.logFile })
  }

  /**
   * 设置最低日志级别
   */
  setLevel(level: LogLevel): void {
    this.minLevel = level
  }

  /**
   * 格式化日志条目
   */
  private formatEntry(entry: LogEntry): string {
    const parts = [`[${entry.timestamp}]`, `[${entry.level.toUpperCase()}]`, `[${entry.module}]`, entry.message]

    if (entry.data !== undefined) {
      parts.push(JSON.stringify(entry.data))
    }
    if (entry.error !== undefined) {
      parts.push(`ERROR: ${entry.error}`)
    }

    return parts.join(' ')
  }

  /**
   * 写入日志
   */
  private write(entry: LogEntry): void {
    if (LOG_LEVELS[entry.level] < LOG_LEVELS[this.minLevel]) return

    const formatted = this.formatEntry(entry)

    // 控制台输出（保留颜色）
    switch (entry.level) {
      case 'error':
        console.error(formatted)
        break
      case 'warn':
        console.warn(formatted)
        break
      case 'debug':
        console.debug(formatted)
        break
      default:
        console.log(formatted)
    }

    // 写入文件
    if (this.stream) {
      this.stream.write(`${formatted}\n`)
    }
  }

  debug(module: string, message: string, data?: unknown): void {
    this.write({
      timestamp: new Date().toISOString(),
      level: 'debug',
      module,
      message,
      data,
    })
  }

  info(module: string, message: string, data?: unknown): void {
    this.write({
      timestamp: new Date().toISOString(),
      level: 'info',
      module,
      message,
      data,
    })
  }

  warn(module: string, message: string, data?: unknown): void {
    this.write({
      timestamp: new Date().toISOString(),
      level: 'warn',
      module,
      message,
      data,
    })
  }

  error(module: string, message: string, error?: unknown, data?: unknown): void {
    const errorStr = error instanceof Error ? error.stack || error.message : String(error || '')
    this.write({
      timestamp: new Date().toISOString(),
      level: 'error',
      module,
      message,
      data,
      error: errorStr,
    })
  }

  /**
   * 关闭日志流
   */
  close(): void {
    if (this.stream) {
      this.stream.end()
      this.stream = null
    }
    this.initialized = false
  }
}

// 全局单例
export const logger = new Logger()

// 便捷函数
export function logDebug(module: string, message: string, data?: unknown): void {
  logger.debug(module, message, data)
}

export function logInfo(module: string, message: string, data?: unknown): void {
  logger.info(module, message, data)
}

export function logWarn(module: string, message: string, data?: unknown): void {
  logger.warn(module, message, data)
}

export function logError(module: string, message: string, error?: unknown, data?: unknown): void {
  logger.error(module, message, error, data)
}
