import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => '/tmp/fake-user-data'),
  },
  ipcMain: {
    handle: jest.fn(),
  },
  dialog: {
    showSaveDialog: jest.fn(),
    showOpenDialog: jest.fn(),
  },
}))

jest.mock('electron-store', () => {
  const store = new Map<string, unknown>()
  store.set('vaultDirectory', '/tmp/fake-vault')
  return jest.fn().mockImplementation(() => ({
    get: jest.fn((key: string) => store.get(key)),
    set: jest.fn((key: string, value: unknown) => {
      store.set(key, value)
    }),
  }))
})

jest.mock('./common/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}))

// These are not exported from the module, so we test them indirectly
// through scanFilesForExport and generatePdfHtml
import { scanFilesForExport, exportVaultZip, exportVaultPdf } from './export'

function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'export-test-'))
}

function removeTempDir(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true })
}

function writeFile(dir: string, filePath: string, content: string): void {
  const fullPath = path.join(dir, filePath)
  fs.mkdirSync(path.dirname(fullPath), { recursive: true })
  fs.writeFileSync(fullPath, content, 'utf-8')
}

describe('markdownToHtml (indirect via scanFilesForExport content)', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = createTempDir()
  })

  afterEach(() => {
    removeTempDir(tmpDir)
  })

  it('should include raw markdown content in scanned notes', () => {
    writeFile(tmpDir, 'note.md', '# Heading\n\n**bold** text')
    const notes = scanFilesForExport(tmpDir)
    expect(notes).toHaveLength(1)
    expect(notes[0].content).toContain('# Heading')
    expect(notes[0].content).toContain('**bold**')
  })
})

describe('generatePdfHtml (indirect via exportVaultPdf)', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = createTempDir()
    jest.clearAllMocks()
    // Set the shared mock store's vaultDirectory to our temp dir
    // Both this instance and the store in export.ts share the same closure Map
    const Store = require('electron-store')
    const instance = new Store()
    instance.set('vaultDirectory', tmpDir)
  })

  afterEach(() => {
    removeTempDir(tmpDir)
  })

  it('should produce HTML output when exporting PDF', async () => {
    writeFile(tmpDir, 'note.md', '# Hello World')
    const { dialog } = require('electron')
    const outputPath = path.join(tmpDir, 'output.html')
    dialog.showSaveDialog.mockResolvedValue({
      canceled: false,
      filePath: outputPath,
    })

    const result = await exportVaultPdf()
    expect(result.success).toBe(true)
    expect(fs.existsSync(outputPath)).toBe(true)
    const html = fs.readFileSync(outputPath, 'utf-8')
    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('Hello World')
  })
})

describe('selectiveExport', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = createTempDir()
    jest.clearAllMocks()
    const Store = require('electron-store')
    const instance = new Store()
    instance.set('vaultDirectory', tmpDir)
  })

  afterEach(() => {
    removeTempDir(tmpDir)
  })

  it('exports only the selected relative note paths', async () => {
    writeFile(tmpDir, 'keep.md', '# Keep')
    writeFile(tmpDir, 'skip.md', '# Skip')
    const outputDir = path.join(tmpDir, 'out')
    fs.mkdirSync(outputDir, { recursive: true })
    const { dialog } = require('electron')
    dialog.showOpenDialog.mockResolvedValue({ canceled: false, filePaths: [outputDir] })

    const { selectiveExport } = require('./export') as typeof import('./export')
    const result = await selectiveExport(['keep.md'], undefined, tmpDir)

    expect(result.success).toBe(true)
    expect(result.filesExported).toBe(1)
    expect(fs.existsSync(path.join(outputDir, 'keep.md'))).toBe(true)
    expect(fs.existsSync(path.join(outputDir, 'skip.md'))).toBe(false)
  })
})

describe('scanFilesForExport', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = createTempDir()
  })

  afterEach(() => {
    removeTempDir(tmpDir)
  })

  it('should return empty array for empty directory', () => {
    const notes = scanFilesForExport(tmpDir)
    expect(notes).toEqual([])
  })

  it('should return empty array for non-existent directory', () => {
    const notes = scanFilesForExport('/nonexistent/path')
    expect(notes).toEqual([])
  })

  it('should find markdown files', () => {
    writeFile(tmpDir, 'note1.md', '# Note 1')
    writeFile(tmpDir, 'note2.md', '# Note 2')
    writeFile(tmpDir, 'readme.txt', 'Not markdown')

    const notes = scanFilesForExport(tmpDir)
    expect(notes).toHaveLength(2)
  })

  it('should parse tags from content', () => {
    writeFile(tmpDir, 'note.md', '# Note\n\nThis is a #test note with #multiple tags')
    const notes = scanFilesForExport(tmpDir)
    expect(notes).toHaveLength(1)
    expect(notes[0].tags).toContain('test')
    expect(notes[0].tags).toContain('multiple')
  })

  it('should include relative file paths', () => {
    writeFile(tmpDir, 'note.md', '# Note')
    const notes = scanFilesForExport(tmpDir)
    expect(notes[0].filePath).toBe('note.md')
  })

  it('should include file metadata', () => {
    writeFile(tmpDir, 'note.md', '# Note')
    const notes = scanFilesForExport(tmpDir)
    expect(notes[0].title).toBe('note')
    expect(notes[0].modified).toBeDefined()
    expect(notes[0].created).toBeDefined()
  })

  it('should respect includeSubfolders option', () => {
    writeFile(tmpDir, 'root.md', '# Root')
    writeFile(tmpDir, 'sub/nested.md', '# Nested')

    const withSub = scanFilesForExport(tmpDir, { includeSubfolders: true })
    expect(withSub).toHaveLength(2)

    const withoutSub = scanFilesForExport(tmpDir, { includeSubfolders: false })
    expect(withoutSub).toHaveLength(1)
  })

  it('should filter by tags', () => {
    writeFile(tmpDir, 'tagged.md', '# Tagged\n\n#important')
    writeFile(tmpDir, 'untagged.md', '# Untagged')

    const notes = scanFilesForExport(tmpDir, { tags: ['important'] })
    expect(notes).toHaveLength(1)
    expect(notes[0].title).toBe('tagged')
  })

  it('should filter by date range', () => {
    writeFile(tmpDir, 'note.md', '# Note')
    const futureDate = '2099-01-01T00:00:00.000Z'
    const pastDate = '2020-01-01T00:00:00.000Z'

    // Date filter that excludes everything
    const notes = scanFilesForExport(tmpDir, {
      dateFrom: futureDate,
    })
    expect(notes).toHaveLength(0)

    // Date filter that includes everything
    const notes2 = scanFilesForExport(tmpDir, {
      dateFrom: pastDate,
    })
    expect(notes2).toHaveLength(1)
  })
})

describe('exportVaultZip', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = createTempDir()
    jest.clearAllMocks()
  })

  afterEach(() => {
    removeTempDir(tmpDir)
  })

  it('should export to a supplied output path without opening a save dialog', async () => {
    const { dialog } = require('electron')
    const vaultDir = createTempDir()
    const outputDir = createTempDir()
    writeFile(vaultDir, 'note.md', '# Note\\n\\nContent')
    const outputPath = path.join(outputDir, 'vault.zip')

    const result = await exportVaultZip({ outputPath }, vaultDir)

    expect(result.success).toBe(true)
    expect(result.outputPath).toBe(outputPath)
    expect(fs.existsSync(outputPath)).toBe(true)
    expect(dialog.showSaveDialog).not.toHaveBeenCalled()
    fs.rmSync(vaultDir, { recursive: true, force: true })
    fs.rmSync(outputDir, { recursive: true, force: true })
  })

  it('should fail when dialog is cancelled', async () => {
    const { dialog } = require('electron')
    dialog.showSaveDialog.mockResolvedValue({ canceled: true, filePath: undefined })

    const result = await exportVaultZip()
    expect(result.success).toBe(false)
    expect(result.error).toContain('Cancelled')
  })
})

describe('registerExportHandlers (indirect via exportVaultZip/Pdf)', () => {
  it('should handle missing vault directory gracefully', async () => {
    const { dialog } = require('electron')
    dialog.showSaveDialog.mockResolvedValue({
      canceled: false,
      filePath: '/tmp/output.zip',
    })

    const result = await exportVaultZip()
    // The vault path in mock store points to /tmp/fake-vault which may not exist — scanFiles will be empty
    expect(result.success).toBe(true)
    expect(result.filesExported).toBe(0)
  })
})
