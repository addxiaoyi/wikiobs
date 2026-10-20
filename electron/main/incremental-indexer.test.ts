import * as path from 'path'
import * as os from 'os'
import * as fs from 'fs'

// Mock electron before importing the module under test
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => '/tmp/fake-user-data'),
  },
  ipcMain: {
    handle: jest.fn(),
  },
}))

jest.mock('electron-store', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
  }))
})

jest.mock('./common/scanner', () => ({
  scanMarkdownFiles: jest.fn(),
}))

jest.mock('./common/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  logDebug: jest.fn(),
  logInfo: jest.fn(),
  logWarn: jest.fn(),
  logError: jest.fn(),
}))

// Need to import after mocks are set up
import { scanMarkdownFiles } from './common/scanner'
import { incrementalIndex, registerIncrementalIndexerHandlers } from './incremental-indexer'

function createTempDir(): string {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'incremental-indexer-test-'))
  return tmpDir
}

function removeTempDir(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true })
}

function writeFile(filePath: string, content: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, content, 'utf-8')
}

describe('incrementalIndex', () => {
  let tmpDir: string
  let userDataPath: string

  beforeEach(() => {
    tmpDir = createTempDir()
    userDataPath = createTempDir()
    jest.clearAllMocks()
    ;(scanMarkdownFiles as jest.Mock).mockReturnValue([])
  })

  afterEach(() => {
    removeTempDir(tmpDir)
    removeTempDir(userDataPath)
  })

  it('should return zero counts when no files exist', async () => {
    const result = await incrementalIndex(tmpDir, null, userDataPath)
    expect(result).toEqual({ added: 0, updated: 0, deleted: 0 })
  })

  it('should detect newly added files', async () => {
    const filePath = path.join(tmpDir, 'note.md')
    writeFile(filePath, '# Hello')
    ;(scanMarkdownFiles as jest.Mock).mockReturnValue([filePath])

    const result = await incrementalIndex(tmpDir, null, userDataPath)
    expect(result.added).toBe(1)
    expect(result.updated).toBe(0)
    expect(result.deleted).toBe(0)
  })

  it('should detect updated files', async () => {
    const filePath = path.join(tmpDir, 'note.md')
    writeFile(filePath, '# Hello')
    ;(scanMarkdownFiles as jest.Mock).mockReturnValue([filePath])

    // First run: file is added
    await incrementalIndex(tmpDir, null, userDataPath)

    // Modify the file
    writeFile(filePath, '# Hello Updated')

    // Second run: file should be updated
    const result = await incrementalIndex(tmpDir, null, userDataPath)
    expect(result.updated).toBe(1)
    expect(result.added).toBe(0)
    expect(result.deleted).toBe(0)
  })

  it('should remove an index entry when a file is deleted', async () => {
    const filePath = path.join(tmpDir, 'deleted.md')
    writeFile(filePath, '# Deleted')
    ;(scanMarkdownFiles as jest.Mock).mockReturnValue([filePath])
    const dbTableClient = { deleteDBItemsByFilePaths: jest.fn().mockResolvedValue(undefined) } as any

    await incrementalIndex(tmpDir, null, userDataPath)
    fs.unlinkSync(filePath)
    ;(scanMarkdownFiles as jest.Mock).mockReturnValue([])

    const result = await incrementalIndex(tmpDir, dbTableClient, userDataPath)

    expect(result.deleted).toBe(1)
    expect(dbTableClient.deleteDBItemsByFilePaths).toHaveBeenCalledWith([filePath])
  })

  it('keeps index state isolated between vaults', async () => {
    const firstVault = path.join(tmpDir, 'first-vault')
    const secondVault = path.join(tmpDir, 'second-vault')
    const firstFile = path.join(firstVault, 'first.md')
    const secondFile = path.join(secondVault, 'second.md')
    writeFile(firstFile, '# First')
    writeFile(secondFile, '# Second')
    ;(scanMarkdownFiles as jest.Mock).mockReturnValue([firstFile])
    const firstResult = await incrementalIndex(firstVault, null, userDataPath)

    ;(scanMarkdownFiles as jest.Mock).mockReturnValue([secondFile])
    const secondResult = await incrementalIndex(secondVault, null, userDataPath)

    expect(firstResult).toMatchObject({ added: 1, deleted: 0 })
    expect(secondResult).toMatchObject({ added: 1, deleted: 0 })
    expect(fs.readdirSync(userDataPath).filter((file) => file.startsWith('indexer-state-'))).toHaveLength(2)
  })

  it('should report progress via callback', async () => {
    const filePath = path.join(tmpDir, 'note.md')
    writeFile(filePath, '# Hello')
    ;(scanMarkdownFiles as jest.Mock).mockReturnValue([filePath])

    const onProgress = jest.fn()
    await incrementalIndex(tmpDir, null, userDataPath, onProgress)

    // Should be called at least once for progress and once for completion
    expect(onProgress).toHaveBeenCalled()
    // Last call should be completion
    const lastCall = onProgress.mock.calls[onProgress.mock.calls.length - 1]
    expect(lastCall[2]).toBe('Complete')
  })
})

describe('computeContentHash (indirect via incrementalIndex)', () => {
  let tmpDir: string
  let userDataPath: string

  beforeEach(() => {
    tmpDir = createTempDir()
    userDataPath = createTempDir()
    jest.clearAllMocks()
    ;(scanMarkdownFiles as jest.Mock).mockReturnValue([])
  })

  afterEach(() => {
    removeTempDir(tmpDir)
    removeTempDir(userDataPath)
  })

  it('should detect same content as unchanged', async () => {
    const filePath = path.join(tmpDir, 'note.md')
    writeFile(filePath, '# Same Content')
    ;(scanMarkdownFiles as jest.Mock).mockReturnValue([filePath])

    // First run: add
    await incrementalIndex(tmpDir, null, userDataPath)
    // Second run with same content: no change
    const result = await incrementalIndex(tmpDir, null, userDataPath)
    expect(result.added).toBe(0)
    expect(result.updated).toBe(0)
    expect(result.deleted).toBe(0)
  })
})

describe('registerIncrementalIndexerHandlers', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should register ipcMain handlers', () => {
    const { ipcMain } = require('electron')
    const store = {} as any
    const windowsManager = { getWindowInfoForContents: jest.fn() } as any

    registerIncrementalIndexerHandlers(store, windowsManager)

    // Should register handlers for expected channels
    expect(ipcMain.handle).toHaveBeenCalledWith('incremental-index', expect.any(Function))
    expect(ipcMain.handle).toHaveBeenCalledWith('reindex-all', expect.any(Function))
    expect(ipcMain.handle).toHaveBeenCalledWith('add-background-task', expect.any(Function))
    expect(ipcMain.handle).toHaveBeenCalledWith('get-task-status', expect.any(Function))
    expect(ipcMain.handle).toHaveBeenCalledWith('get-all-tasks', expect.any(Function))
  })
})
