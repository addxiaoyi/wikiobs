import { assertPermission, hasPermission, PluginPermissionError, type PluginPermission } from './plugin-permissions'

const grant = (...permissions: PluginPermission[]) => new Set<string>(permissions)

describe('assertPermission', () => {
  it('passes when the permission is declared', () => {
    expect(() => assertPermission('demo', grant('notes.read'), 'notes.read')).not.toThrow()
  })

  it('throws a named, actionable error when it is not', () => {
    let caught: unknown
    try {
      assertPermission('demo', grant(), 'notes.write')
    } catch (e) {
      caught = e
    }
    expect(caught).toBeInstanceOf(PluginPermissionError)
    expect((caught as Error).name).toBe('PluginPermissionError')
    expect((caught as Error).message).toContain('notes.write')
    expect((caught as Error).message).toContain('manifest.json')
    expect((caught as PluginPermissionError).pluginId).toBe('demo')
  })

  it('does not treat a similar permission as a match', () => {
    // 声明 notes.read 不能顺带获得 notes.write
    expect(() => assertPermission('demo', grant('notes.read'), 'notes.write')).toThrow(PluginPermissionError)
    // 空字符串也不能被当成通配
    expect(() => assertPermission('demo', new Set<string>(['']), 'filesystem')).toThrow(PluginPermissionError)
  })
})

describe('hasPermission', () => {
  it('is a plain membership check, no prefix or wildcard matching', () => {
    expect(hasPermission(grant('filesystem'), 'filesystem')).toBe(true)
    expect(hasPermission(grant('filesystem'), 'network')).toBe(false)
    expect(hasPermission(grant('notes.read'), 'notes.write')).toBe(false)
    expect(hasPermission(grant(), 'notes.read')).toBe(false)
    expect(hasPermission(new Set<string>(['']), 'filesystem')).toBe(false)
  })
})
