/**
 * Unified Error Handler - 统一错误处理
 * 为所有 IPC 处理器提供错误包装，确保一致的错误响应格式
 */

import { ipcMain } from 'electron'
import { logger } from './logger'
import errorToStringMainProcess from './error'

/**
 * IPC 错误响应格式
 */
export interface IPCErrorResponse {
  success: false
  error: string
  code?: string
}

/**
 * IPC 成功响应格式
 */
export interface IPCSuccessResponse<T = unknown> {
  success: true
  data: T
}

export type IPCResponse<T = unknown> = IPCSuccessResponse<T> | IPCErrorResponse

/**
 * 包装 IPC 处理器，统一捕获异常并返回标准格式
 */
export function wrapIPCHandler<T>(handler: () => Promise<T>): () => Promise<IPCResponse<T>>
export function wrapIPCHandler<T, A>(handler: (arg: A) => Promise<T>): (arg: A) => Promise<IPCResponse<T>>
export function wrapIPCHandler<T, A, B>(
  handler: (argA: A, argB: B) => Promise<T>,
): (argA: A, argB: B) => Promise<IPCResponse<T>>
export function wrapIPCHandler(handler: (...args: unknown[]) => Promise<unknown>) {
  return async (...args: unknown[]): Promise<IPCResponse> => {
    try {
      const data = await handler(...args)
      return { success: true, data }
    } catch (error) {
      const errorMessage = errorToStringMainProcess(error)
      logger.error('IPC', `Handler error: ${errorMessage}`, error)
      return {
        success: false,
        error: errorMessage,
        code:
          error && typeof error === 'object' && 'code' in error ? String((error as { code: unknown }).code) : undefined,
      }
    }
  }
}

/**
 * 注册全局 IPC 错误处理
 * 在 app.whenReady() 之后调用
 */
export function registerErrorHandler(): void {
  // 监听来自渲染进程或内部转发的未捕获错误
  ipcMain.on('unhandled-error', (_event, error) => {
    logger.error('IPC', 'Unhandled IPC error', error)
  })

  logger.info('ErrorHandler', 'Unified error handler registered')
}
