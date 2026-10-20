import errorToStringMainProcess from './error'

describe('errorToStringMainProcess', () => {
  it('should convert Error to string with name and message', () => {
    const result = errorToStringMainProcess(new Error('test error'))
    expect(result).toContain('Error: test error')
  })

  it('should include stack trace at top level', () => {
    const result = errorToStringMainProcess(new Error('stack test'))
    expect(result).toContain('Stack Trace:')
    expect(result).toContain('at')
  })

  it('should handle non-Error values', () => {
    expect(errorToStringMainProcess('string error')).toBe('string error')
    expect(errorToStringMainProcess(42)).toBe('42')
    expect(errorToStringMainProcess(null)).toBe('null')
    expect(errorToStringMainProcess(undefined)).toBe('undefined')
  })

  it('should handle object errors', () => {
    const result = errorToStringMainProcess({ message: 'custom error' })
    expect(result).toBe('[object Object]')
  })

  it('should handle nested errors with cause', () => {
    const inner = new Error('inner error')
    const outer = new Error('outer error')
    outer.cause = inner
    const result = errorToStringMainProcess(outer)

    expect(result).toContain('Error: outer error')
    expect(result).toContain('Caused by: Error: inner error')
    expect(result).toContain('Stack Trace:')
  })

  it('should deeply nest cause chains', () => {
    const root = new Error('root cause')
    const middle = new Error('middle layer')
    middle.cause = root
    const top = new Error('top level')
    top.cause = middle
    const result = errorToStringMainProcess(top)

    expect(result).toContain('Error: top level')
    expect(result).toContain('Caused by: Error: middle layer')
    expect(result).toContain('Caused by: Error: root cause')
  })

  it('should handle Error with empty message', () => {
    const result = errorToStringMainProcess(new Error())
    expect(result).toContain('Error:')
  })
})