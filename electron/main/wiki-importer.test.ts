import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { importFromWiki } from './wiki-importer'

describe('importFromWiki', () => {
  let rootPath: string
  let outputPath: string

  beforeEach(() => {
    rootPath = fs.mkdtempSync(path.join(os.tmpdir(), 'wiki-import-test-'))
    outputPath = path.join(rootPath, 'output')
  })

  afterEach(() => {
    jest.restoreAllMocks()
    fs.rmSync(rootPath, { recursive: true, force: true })
  })

  it('does not duplicate pages when retrying a partially completed XML import', async () => {
    const dumpPath = path.join(rootPath, 'wiki.xml')
    fs.writeFileSync(
      dumpPath,
      '<mediawiki><page><title>Shared title</title><revision><text>First page content</text></revision></page>' +
        '<page><title>Shared title</title><revision><text>Second page content</text></revision></page></mediawiki>',
      'utf8',
    )

    const firstRun = await importFromWiki({ sourceType: 'xml-dump', source: dumpPath, outputDir: outputPath })
    const retry = await importFromWiki({ sourceType: 'xml-dump', source: dumpPath, outputDir: outputPath })

    expect(firstRun.imported).toBe(2)
    expect(firstRun.files).toHaveLength(2)
    expect(retry.imported).toBe(0)
    expect(retry.skipped).toBe(2)
    expect(fs.readdirSync(outputPath).filter((file) => file.endsWith('.md'))).toHaveLength(2)
  })

  it('returns existing duplicate pages for index retry without rewriting them', async () => {
    const dumpPath = path.join(rootPath, 'index-retry.xml')
    fs.writeFileSync(
      dumpPath,
      '<mediawiki><page><title>Retry page</title><revision><text>Retryable content</text></revision></page></mediawiki>',
      'utf8',
    )

    const initial = await importFromWiki({ sourceType: 'xml-dump', source: dumpPath, outputDir: outputPath })
    const existingPath = initial.files[0]
    const original = fs.readFileSync(existingPath, 'utf8')
    const retry = await importFromWiki({ sourceType: 'xml-dump', source: dumpPath, outputDir: outputPath })

    expect(retry.imported).toBe(0)
    expect(retry.skipped).toBe(1)
    expect(retry.files).toEqual([])
    expect(retry.filesToIndex).toEqual([existingPath])
    expect(fs.readFileSync(existingPath, 'utf8')).toBe(original)
  })

  it('aborts an in-flight request and does not write a page', async () => {
    const controller = new AbortController()
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockImplementation((_input, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new Error('aborted')), { once: true })
      }),
    )

    const importing = importFromWiki({
      sourceType: 'url',
      source: 'https://example.test/slow',
      outputDir: outputPath,
      signal: controller.signal,
    })
    await new Promise((resolve) => setTimeout(resolve, 10))
    controller.abort()
    const result = await importing

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(result.cancelled).toBe(true)
    expect(result.files).toEqual([])
    expect(fs.existsSync(outputPath)).toBe(false)
  })

  it('checks cancellation at the page write boundary', async () => {
    const controller = new AbortController()
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => '<title>Cancelled before write</title><p>Do not persist this page.</p>',
    } as Response)

    const result = await importFromWiki({
      sourceType: 'url',
      source: 'https://example.test/cancel-before-write',
      outputDir: outputPath,
      signal: controller.signal,
      onProgress: () => controller.abort(),
    })

    expect(result.cancelled).toBe(true)
    expect(result.files).toEqual([])
    expect(fs.readdirSync(outputPath)).toEqual([])
  })

  it('retries a transient server error before importing a page', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch')
    fetchMock
      .mockResolvedValueOnce({ ok: false, status: 503, statusText: 'Unavailable' } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () => '<title>Recovered page</title><p>Fetched after retry.</p>',
      } as Response)

    const importResult = await importFromWiki({
      sourceType: 'url',
      source: 'https://example.test/recovered',
      outputDir: outputPath,
    })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(importResult.imported).toBe(1)
    expect(importResult.errors).toEqual([])
    expect(fs.readFileSync(importResult.files[0], 'utf8')).toContain('Fetched after retry.')
  })
})
