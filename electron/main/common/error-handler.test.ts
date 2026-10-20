import { wrapIPCHandler, type IPCResponse } from './error-handler'
import errorToStringMainProcess from './error'

// Mock the error module
jest.mock('./error', () => ({
  __esModule: true,
  default: jest.fn((error: unknown) => String(error)),
}))

// Mock logger
jest.mock('./logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
  },
}))

describe('wrapIPCHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should wrap a successful handler', async () => {
    const handler = async () => 'success'
    const wrapped = wrapIPCHandler(handler)
    const result = await wrapped()

    expect(result).toEqual({ success: true, data: 'success' })
  })

  it('should wrap a handler with arguments', async () => {
    const handler = async (arg: string) => `Hello, ${arg}`
    const wrapped = wrapIPCHandler(handler)
    const result = await wrapped('World')

    expect(result).toEqual({ success: true, data: 'Hello, World' })
  })

  it('should wrap a handler with multiple arguments', async () => {
    const handler = async (a: number, b: number) => a + b
    const wrapped = wrapIPCHandler(handler)
    const result = await wrapped(3, 4)

    expect(result).toEqual({ success: true, data: 7 })
  })

  it('should catch errors and return error response', async () => {
    const handler = async () => {
      throw new Error('something went wrong')
    }
    const wrapped = wrapIPCHandler(handler)
    const result = await wrapped()

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBeDefined()
    }
  })

  it('should catch non-Error throws', async () => {
    const handler = async () => {
      // eslint-disable-next-line no-throw-literal
      throw 'string error'
    }
    const wrapped = wrapIPCHandler(handler)
    const result = await wrapped()

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('string error')
    }
  })

  it('should handle object throws', async () => {
    const handler = async () => {
      // eslint-disable-next-line no-throw-literal
      throw { code: 'ERR_TEST', message: 'test error' }
    }
    const wrapped = wrapIPCHandler(handler)
    const result = await wrapped()

    expect(result.success).toBe(false)
    // code is only set for Error instances, not plain objects
  })

  it('should return the correct type for a void handler', async () => {
    const handler = async () => {
      // no return
    }
    const wrapped = wrapIPCHandler(handler)
    const result = await wrapped()

    expect(result).toEqual({ success: true, data: undefined })
  })
})

describe('IPCResponse type', () => {
  it('should satisfy the type contract for success', () => {
    const response: IPCResponse<string> = { success: true, data: 'test' }
    expect(response.success).toBe(true)
    if (response.success) {
      expect(response.data).toBe('test')
    }
  })

  it('should satisfy the type contract for error', () => {
    const response: IPCResponse = { success: false, error: 'error message' }
    expect(response.success).toBe(false)
    if (!response.success) {
      expect(response.error).toBe('error message')
    }
  })
})