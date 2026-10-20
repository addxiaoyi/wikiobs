import { Logger } from './logger'

// Mock electron module so jest can resolve it
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn().mockReturnValue('/tmp/test-logs'),
  },
}))

describe('Logger', () => {
  let logger: Logger
  let consoleLogSpy: jest.SpyInstance
  let consoleErrorSpy: jest.SpyInstance
  let consoleWarnSpy: jest.SpyInstance
  let consoleDebugSpy: jest.SpyInstance

  beforeEach(() => {
    logger = new Logger()

    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
    logger.close()
  })

  describe('without initialization', () => {
    it('should write to console even without init', () => {
      logger.info('TestModule', 'test message')
      expect(consoleLogSpy).toHaveBeenCalled()
      const output = consoleLogSpy.mock.calls[0][0]
      expect(output).toContain('[INFO]')
      expect(output).toContain('[TestModule]')
      expect(output).toContain('test message')
    })

    it('should handle debug level', () => {
      logger.debug('Mod', 'debug msg')
      expect(consoleDebugSpy).toHaveBeenCalled()
    })

    it('should handle warn level', () => {
      logger.warn('Mod', 'warn msg')
      expect(consoleWarnSpy).toHaveBeenCalled()
    })

    it('should handle error level', () => {
      logger.error('Mod', 'error msg')
      expect(consoleErrorSpy).toHaveBeenCalled()
    })
  })

  describe('log level filtering', () => {
    it('should filter out messages below the set level', () => {
      logger.setLevel('warn')
      logger.debug('Mod', 'should not appear')
      logger.info('Mod', 'should not appear')
      logger.warn('Mod', 'should appear')
      logger.error('Mod', 'should appear')

      expect(consoleDebugSpy).not.toHaveBeenCalled()
      expect(consoleLogSpy).not.toHaveBeenCalled()
      expect(consoleWarnSpy).toHaveBeenCalled()
      expect(consoleErrorSpy).toHaveBeenCalled()
    })

    it('should show all levels when set to debug', () => {
      logger.setLevel('debug')
      logger.debug('Mod', 'debug')
      logger.info('Mod', 'info')
      logger.warn('Mod', 'warn')
      logger.error('Mod', 'error')

      expect(consoleDebugSpy).toHaveBeenCalled()
      expect(consoleLogSpy).toHaveBeenCalled()
      expect(consoleWarnSpy).toHaveBeenCalled()
      expect(consoleErrorSpy).toHaveBeenCalled()
    })

    it('should show only error level when set to error', () => {
      logger.setLevel('error')
      logger.info('Mod', 'info')
      logger.error('Mod', 'error')

      expect(consoleLogSpy).not.toHaveBeenCalled()
      expect(consoleErrorSpy).toHaveBeenCalled()
    })
  })

  describe('message formatting', () => {
    it('should format log entry with timestamp, level, module, and message', () => {
      logger.info('MyModule', 'my message')
      const output = consoleLogSpy.mock.calls[0][0]
      expect(output).toMatch(/^\[.+\] \[INFO\] \[MyModule\] my message$/)
    })

    it('should include data when provided', () => {
      logger.info('Mod', 'msg', { key: 'value' })
      const output = consoleLogSpy.mock.calls[0][0]
      expect(output).toContain('{"key":"value"}')
    })

    it('should include error stack when error is provided', () => {
      const err = new Error('test error')
      logger.error('Mod', 'msg', err)
      const output = consoleErrorSpy.mock.calls[0][0]
      expect(output).toContain('ERROR:')
      expect(output).toContain('Error: test error')
    })
  })

  describe('setLevel', () => {
    it('should default to debug level', () => {
      logger.debug('Mod', 'debug msg')
      expect(consoleDebugSpy).toHaveBeenCalled()
    })
  })
})