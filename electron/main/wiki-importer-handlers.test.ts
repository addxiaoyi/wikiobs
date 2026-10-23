import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'

const mockHandlers = new Map<string, (...args: any[]) => Promise<unknown>>()
const mockUpdateFile = jest.fn()

jest.mock('electron', () => ({
  app: { getPath: jest.fn(() => '/tmp/wiki-import-handler-test') },
  ipcMain: {
    handle: (channel: string, handler: (...args: any[]) => Promise<unknown>) => mockHandlers.set(channel, handler),
  },
}))

jest.mock('electron-store', () => jest.fn().mockImplementation(() => ({ get: jest.fn(), set: jest.fn() })))
jest.mock('./common/logger', () => ({ logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() } }))
jest.mock('./vector-database/tableHelperFunctions', () => ({ updateFileInTable: mockUpdateFile }))

import Store from 'electron-store'
import { registerWikiImporterHandlers } from './wiki-importer'

describe('Wiki importer handler cancellation during indexing', () => {
  let rootPath: string
  let vaultPath: string
  let dumpPath: string

  beforeEach(() => {
    rootPath = fs.mkdtempSync(path.join(os.tmpdir(), 'wiki-import-handler-'))
    vaultPath = path.join(rootPath, 'vault')
    dumpPath = path.join(rootPath, 'wiki.xml')
    fs.mkdirSync(vaultPath, { recursive: true })
    fs.writeFileSync(
      dumpPath,
      '<mediawiki><page><title>Index recovery</title><revision><text>Keep this imported note.</text></revision></page></mediawiki>',
      'utf8',
    )
    mockHandlers.clear()
    mockUpdateFile.mockReset()
    registerWikiImporterHandlers(new Store() as never, {
      getWindowInfoForContents: jest.fn(() => ({ vaultDirectoryForWindow: vaultPath, dbTableClient: {} })),
    } as never)
  })

  afterEach(() => {
    fs.rmSync(rootPath, { recursive: true, force: true })
  })

  it('retries indexing an existing note after cancellation interrupted indexing', async () => {
    let finishFirstIndex: (() => void) | undefined
    mockUpdateFile
      .mockImplementationOnce(() => new Promise<void>((resolve) => { finishFirstIndex = resolve }))
      .mockResolvedValue(undefined)

    const messages: Array<{ channel: string; payload: unknown }> = []
    const sender = {
      id: 77,
      isDestroyed: () => false,
      send: (channel: string, payload: unknown) => messages.push({ channel, payload }),
    }
    const runImport = mockHandlers.get('wiki-import')
    const cancelImport = mockHandlers.get('wiki-import-cancel')
    if (!runImport || !cancelImport) throw new Error('Wiki import IPC handlers were not registered.')

    const pendingImport = runImport({ sender }, {
      sourceType: 'xml-dump',
      source: dumpPath,
      importId: 'cancel-index-pass',
    }) as Promise<{
      cancelled?: boolean
      imported: number
      skipped: number
      files: string[]
      filesToIndex: string[]
    }>

    for (let attempt = 0; attempt < 30 && !finishFirstIndex; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 0))
    }
    expect(finishFirstIndex).toBeDefined()
    expect(mockUpdateFile).toHaveBeenCalledTimes(1)
    await expect(cancelImport({ sender }, 'cancel-index-pass')).resolves.toEqual({ cancelled: true })
    finishFirstIndex?.()

    const cancelled = await pendingImport
    expect(cancelled.cancelled).toBe(true)
    expect(cancelled.imported).toBe(1)
    expect(fs.readdirSync(path.join(vaultPath, 'WikiImports')).filter((name) => name.endsWith('.md'))).toHaveLength(1)

    const retry = await runImport({ sender }, {
      sourceType: 'xml-dump',
      source: dumpPath,
      importId: 'index-retry-pass',
    }) as {
      cancelled?: boolean
      imported: number
      skipped: number
      files: string[]
      filesToIndex: string[]
    }

    expect(retry.cancelled).toBeUndefined()
    expect(retry.imported).toBe(0)
    expect(retry.skipped).toBe(1)
    expect(retry.files).toEqual([])
    expect(retry.filesToIndex).toHaveLength(1)
    expect(mockUpdateFile).toHaveBeenCalledTimes(2)
    expect(messages.some((message) => message.channel === 'wiki-import-complete')).toBe(true)
  })
})
