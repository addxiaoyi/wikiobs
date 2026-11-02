import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'

jest.mock('./common/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}))

import { isCommandAvailable, runPluginCli } from './plugin-cli'
import { PLUGIN_CLI_ALLOWED_COMMANDS, PLUGIN_CLI_MAX_ARG_LENGTH } from '@shared/plugin-cli'

// node 一定在 PATH 上，用它代替 git 验证执行链路；不依赖 git 是否安装。
const SCRIPT = (code: string) => ['-e', code]

describe('plugin cli allowlist', () => {
  it('exposes a frozen, lowercase-friendly list of tool names', () => {
    expect(PLUGIN_CLI_ALLOWED_COMMANDS).toContain('git')
    expect(PLUGIN_CLI_ALLOWED_COMMANDS).toContain('rg')
    expect(PLUGIN_CLI_ALLOWED_COMMANDS).toContain('node')
    expect(PLUGIN_CLI_ALLOWED_COMMANDS.every((name) => /^[a-z0-9]+$/i.test(name))).toBe(true)
  })

  it('rejects commands outside the allowlist and paths', async () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'plugin-cli-'))
    try {
      expect((await runPluginCli({ command: 'rm' }, { vaultPath: cwd })).error).toMatch(/not allowed/i)
      expect((await runPluginCli({ command: 'node.exe' }, { vaultPath: cwd })).success).toBe(false)
      expect((await runPluginCli({ command: '../../evil' }, { vaultPath: cwd })).error).toMatch(/bare executable/)
      expect((await runPluginCli({ command: 'node; rm -rf /' }, { vaultPath: cwd })).error).toMatch(/bare executable/)
      expect((await runPluginCli({ command: '' }, { vaultPath: cwd })).error).toMatch(/required/)
    } finally {
      fs.rmSync(cwd, { recursive: true, force: true })
    }
  })

  it('reports a missing working directory instead of executing', async () => {
    const result = await runPluginCli({ command: 'git', args: ['--version'] }, { vaultPath: null })
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/Working directory/)
  })
})

describe('plugin cli execution', () => {
  let cwd: string

  beforeEach(() => {
    cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'plugin-cli-run-'))
  })

  afterEach(() => {
    fs.rmSync(cwd, { recursive: true, force: true })
  })

  it('does not interpret shell metacharacters in args', async () => {
    const result = await runPluginCli(
      { command: 'node', args: ['-e', 'console.log(process.argv.slice(1).join(","))', '&&', 'echo', 'pwned', '|', 'x'] },
      { vaultPath: cwd },
    )
    expect(result.success).toBe(true)
    expect(result.code).toBe(0)
    // 参数原样传给 node，绝不交给 shell 二次解析
    expect(result.stdout.trim()).toBe('&&,echo,pwned,|,x')
    expect(result.stderr).toBe('')
    expect(result.cwd).toBe(cwd)
  })

  it('passes stdin to the child process', async () => {
    const result = await runPluginCli(
      { command: 'node', args: ['-e', 'let s = ""; process.stdin.on("data", (d) => { s += d }); process.stdin.on("end", () => console.log("got:" + s))'], stdin: 'hello' },
      { vaultPath: cwd },
    )
    expect(result.success).toBe(true)
    expect(result.stdout.trim()).toBe('got:hello')
  })

  it('reports a non-zero exit code without treating it as a host failure', async () => {
    const result = await runPluginCli({ command: 'node', args: ['-e', 'process.exit(2)'] }, { vaultPath: cwd })
    expect(result.success).toBe(false)
    expect(result.code).toBe(2)
    expect(result.error).toBeUndefined()
  })

  it('kills a long running command after the timeout', async () => {
    const result = await runPluginCli(
      { command: 'node', args: ['-e', 'setTimeout(() => {}, 60000)'], timeoutMs: 1000 },
      { vaultPath: cwd },
    )
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/timed out/)
    expect(result.durationMs).toBeLessThan(15000)
  }, 20000)

  it('clamps oversized timeouts and rejects oversized args', async () => {
    const tooLong = await runPluginCli({ command: 'node', args: ['x'.repeat(PLUGIN_CLI_MAX_ARG_LENGTH + 1)] }, { vaultPath: cwd })
    expect(tooLong.success).toBe(false)
    expect(tooLong.error).toMatch(/exceeds/)

    const notStrings = await runPluginCli({ command: 'node', args: [42 as unknown as string] }, { vaultPath: cwd })
    expect(notStrings.success).toBe(false)
    expect(notStrings.error).toMatch(/array of strings/)

    const started = Date.now()
    const clamped = await runPluginCli(
      { command: 'node', args: ['-e', 'setTimeout(() => console.log("done"), 1200)'], timeoutMs: 999_999_999 },
      { vaultPath: cwd },
    )
    expect(Date.now() - started).toBeLessThan(15000)
  }, 20000)
})

describe('isCommandAvailable', () => {
  it('finds node but not an obviously missing tool', () => {
    expect(isCommandAvailable('node')).toBe(true)
    expect(isCommandAvailable('definitely-not-a-real-tool-xyz')).toBe(false)
    expect(isCommandAvailable('')).toBe(false)
  })
})
