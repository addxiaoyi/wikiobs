/**
 * 插件 CLI 执行器：让插件把本地命令行工具当成一项宿主能力。
 *
 * 这里只做"可控地起一个进程"这一件事——不走 shell、命令白名单、参数与输出长度上限、
 * 超时强杀、工作目录限定在 vault 或插件目录内。它不是沙箱：插件能执行的命令
 * 仍然带着应用自身的权限，白名单只是把误用和远程注入挡在门外。
 */

import { spawn } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import {
  PLUGIN_CLI_ALLOWED_COMMANDS as ALLOWED_COMMANDS,
  PLUGIN_CLI_DEFAULT_TIMEOUT_MS as DEFAULT_TIMEOUT,
  PLUGIN_CLI_MAX_ARG_LENGTH as MAX_ARG_LENGTH,
  PLUGIN_CLI_MAX_OUTPUT_BYTES as MAX_OUTPUT_BYTES,
  PLUGIN_CLI_MAX_TIMEOUT_MS as MAX_TIMEOUT,
  type PluginCliRequest,
  type PluginCliResult,
} from '@shared/plugin-cli'

const isWin = process.platform === 'win32'

/** 解析 PATH 上是否存在某个命令；Windows 需要补 PATHEXT 后缀。 */
export function isCommandAvailable(command: string): boolean {
  if (!command || typeof command !== 'string') return false
  const dirs = (process.env.PATH || '').split(path.delimiter).filter(Boolean)
  const exts = isWin ? (process.env.PATHEXT || '.EXE;.CMD;.BAT;.COM').split(';').filter(Boolean) : ['']
  const targets = path.extname(command) ? [command] : exts.map((ext) => command + ext)
  return dirs.some((dir) => {
    try {
      return targets.some((target) => {
        const full = path.join(dir, target)
        return fs.existsSync(full) && fs.statSync(full).isFile()
      })
    } catch {
      return false
    }
  })
}

export interface PluginCliRunOptions {
  /** vault 根目录；cwd: 'vault' 时的落点。 */
  vaultPath?: string | null
  /** 调用方插件目录；cwd: 'plugin' 时的落点。 */
  pluginPath?: string | null
}

const ENV_KEY_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/

function clampTimeout(value: unknown): number {
  const parsed = typeof value === 'number' && Number.isFinite(value) ? Math.floor(value) : DEFAULT_TIMEOUT
  return Math.min(Math.max(parsed, 1_000), MAX_TIMEOUT)
}

function failure(cwd: string, durationMs: number, error: string): PluginCliResult {
  return {
    success: false,
    code: null,
    signal: null,
    stdout: '',
    stderr: '',
    durationMs,
    cwd,
    truncated: { stdout: false, stderr: false },
    error,
  }
}

/** 收集子进程输出，超过上限即丢弃尾部并打标记，避免长任务把内存吃穿。 */
function createCollector(limit: number): {
  push: (chunk: Buffer) => void
  text: () => string
  overflowed: () => boolean
} {
  const parts: Buffer[] = []
  let size = 0
  let overflowed = false
  return {
    push(chunk) {
      if (overflowed) return
      const remaining = limit - size
      if (chunk.length <= remaining) {
        parts.push(chunk)
        size += chunk.length
        return
      }
      if (remaining > 0) parts.push(chunk.subarray(0, remaining))
      size = limit
      overflowed = true
    },
    text: () => Buffer.concat(parts).toString('utf-8'),
    overflowed: () => overflowed,
  }
}

export async function runPluginCli(
  request: PluginCliRequest,
  options: PluginCliRunOptions = {},
): Promise<PluginCliResult> {
  const startedAt = Date.now()
  const command = typeof request?.command === 'string' ? request.command.trim() : ''
  const resolvedCwd =
    request?.cwd === 'plugin' ? (options.pluginPath ?? options.vaultPath ?? '') : (options.vaultPath ?? '')

  if (!command) return failure(resolvedCwd, 0, 'command is required.')
  // 只接受裸命令名：带路径分隔符或空白的一律拒绝，避免插件绕过白名单指向任意可执行文件。
  if (!/^[A-Za-z0-9._-]+$/.test(command)) {
    return failure(resolvedCwd, 0, 'command must be a bare executable name.')
  }
  if (!ALLOWED_COMMANDS.includes(command.toLowerCase())) {
    return failure(resolvedCwd, 0, `Command "${command}" is not allowed. Allowed: ${ALLOWED_COMMANDS.join(', ')}.`)
  }

  const rawArgs = request.args ?? []
  if (!Array.isArray(rawArgs)) return failure(resolvedCwd, 0, 'args must be an array of strings.')
  const args: string[] = []
  for (const arg of rawArgs) {
    if (typeof arg !== 'string') return failure(resolvedCwd, 0, 'args must be an array of strings.')
    if (arg.length > MAX_ARG_LENGTH)
      return failure(resolvedCwd, 0, `A single argument exceeds ${MAX_ARG_LENGTH} characters.`)
    args.push(arg)
  }

  if (!resolvedCwd || !fs.existsSync(resolvedCwd) || !fs.statSync(resolvedCwd).isDirectory()) {
    return failure(
      resolvedCwd,
      0,
      'Working directory is not available. Open a vault first, or install the plugin as a directory.',
    )
  }

  const env: NodeJS.ProcessEnv = { ...process.env }
  if (request.env && typeof request.env === 'object') {
    for (const [key, value] of Object.entries(request.env)) {
      if (!ENV_KEY_PATTERN.test(key)) return failure(resolvedCwd, 0, `Invalid environment variable name: ${key}`)
      if (typeof value !== 'string') return failure(resolvedCwd, 0, `Environment variable ${key} must be a string.`)
      env[key] = value
    }
  }

  const timeoutMs = clampTimeout(request.timeoutMs)
  const stdout = createCollector(MAX_OUTPUT_BYTES)
  const stderr = createCollector(MAX_OUTPUT_BYTES)

  return new Promise<PluginCliResult>((resolve) => {
    let settled = false
    let timedOut = false
    let spawnError: Error | null = null

    const finish = (code: number | null, signal: NodeJS.Signals | null) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      const durationMs = Date.now() - startedAt
      const result: PluginCliResult = {
        success: !timedOut && !spawnError && code === 0,
        code,
        signal,
        stdout: stdout.text(),
        stderr: stderr.text(),
        durationMs,
        cwd: resolvedCwd,
        truncated: { stdout: stdout.overflowed(), stderr: stderr.overflowed() },
      }
      if (timedOut) result.error = `Command timed out after ${timeoutMs}ms.`
      else if (spawnError) result.error = spawnError.message
      resolve(result)
    }

    let child: ReturnType<typeof spawn>
    try {
      // shell:false + windowsHide：参数原样传给目标程序，不发生二次解析，"&&" 之类不会变成控制符。
      child = spawn(command, args, {
        cwd: resolvedCwd,
        env,
        shell: false,
        windowsHide: true,
        stdio: ['pipe', 'pipe', 'pipe'],
      })
    } catch (e) {
      resolve(failure(resolvedCwd, Date.now() - startedAt, e instanceof Error ? e.message : String(e)))
      return
    }

    const timer = setTimeout(() => {
      timedOut = true
      child.kill(isWin ? undefined : 'SIGTERM')
      const forceKill = setTimeout(() => child.kill('SIGKILL'), 1_500)
      forceKill.unref()
    }, timeoutMs)

    child.stdout?.on('data', (chunk: Buffer) => stdout.push(chunk))
    child.stderr?.on('data', (chunk: Buffer) => stderr.push(chunk))
    child.on('error', (e) => {
      spawnError = e
      finish(null, null)
    })
    child.on('close', (code, signal) => finish(code, signal))

    if (typeof request.stdin === 'string' && request.stdin.length > 0) {
      child.stdin?.on('error', () => {
        // 目标程序不读 stdin 时会 EPIPE，属于正常情况，忽略即可。
      })
      child.stdin?.end(request.stdin)
    } else {
      child.stdin?.end()
    }
  })
}

export { ALLOWED_COMMANDS, MAX_OUTPUT_BYTES, MAX_ARG_LENGTH, DEFAULT_TIMEOUT, MAX_TIMEOUT }
