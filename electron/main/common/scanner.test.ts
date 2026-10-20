import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { scanMarkdownFiles, scanMarkdownFilesWithStats } from './scanner'

function createTempDir(): string {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scanner-test-'))
  return tmpDir
}

function removeTempDir(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true })
}

describe('scanMarkdownFiles', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = createTempDir()
  })

  afterEach(() => {
    removeTempDir(tmpDir)
  })

  it('should return empty array for empty directory', () => {
    const result = scanMarkdownFiles(tmpDir)
    expect(result).toEqual([])
  })

  it('should return empty array for non-existent directory', () => {
    const result = scanMarkdownFiles('/nonexistent/path')
    expect(result).toEqual([])
  })

  it('should find markdown files in root directory', () => {
    fs.writeFileSync(path.join(tmpDir, 'note1.md'), '# Note 1')
    fs.writeFileSync(path.join(tmpDir, 'note2.md'), '# Note 2')
    fs.writeFileSync(path.join(tmpDir, 'readme.txt'), 'Not a markdown file')

    const result = scanMarkdownFiles(tmpDir)
    expect(result).toHaveLength(2)
    expect(result).toContain(path.join(tmpDir, 'note1.md'))
    expect(result).toContain(path.join(tmpDir, 'note2.md'))
  })

  it('should find markdown files recursively', () => {
    const subDir = path.join(tmpDir, 'subdir')
    fs.mkdirSync(subDir, { recursive: true })
    fs.writeFileSync(path.join(tmpDir, 'root.md'), '# Root')
    fs.writeFileSync(path.join(subDir, 'nested.md'), '# Nested')

    const result = scanMarkdownFiles(tmpDir)
    expect(result).toHaveLength(2)
  })

  it('should skip hidden directories', () => {
    const hiddenDir = path.join(tmpDir, '.hidden')
    fs.mkdirSync(hiddenDir, { recursive: true })
    fs.writeFileSync(path.join(hiddenDir, 'secret.md'), '# Secret')

    const result = scanMarkdownFiles(tmpDir)
    expect(result).toEqual([])
  })

  it('should skip node_modules directory', () => {
    const nmDir = path.join(tmpDir, 'node_modules')
    fs.mkdirSync(nmDir, { recursive: true })
    fs.writeFileSync(path.join(nmDir, 'dep.md'), '# Dep')

    const result = scanMarkdownFiles(tmpDir)
    expect(result).toEqual([])
  })

  it('should handle deeply nested directories', () => {
    const deepDir = path.join(tmpDir, 'a', 'b', 'c')
    fs.mkdirSync(deepDir, { recursive: true })
    fs.writeFileSync(path.join(deepDir, 'deep.md'), '# Deep')

    const result = scanMarkdownFiles(tmpDir)
    expect(result).toHaveLength(1)
    expect(result[0]).toBe(path.join(deepDir, 'deep.md'))
  })

  it('should handle mixed content types', () => {
    fs.writeFileSync(path.join(tmpDir, 'a.md'), '# A')
    fs.writeFileSync(path.join(tmpDir, 'b.md'), '# B')
    fs.writeFileSync(path.join(tmpDir, 'c.txt'), 'text')
    fs.writeFileSync(path.join(tmpDir, 'd.json'), '{}')
    const subDir = path.join(tmpDir, 'sub')
    fs.mkdirSync(subDir)
    fs.writeFileSync(path.join(subDir, 'e.md'), '# E')

    const result = scanMarkdownFiles(tmpDir)
    expect(result).toHaveLength(3)
  })
})

describe('scanMarkdownFilesWithStats', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = createTempDir()
  })

  afterEach(() => {
    removeTempDir(tmpDir)
  })

  it('should return zero stats for empty directory', () => {
    const stats = scanMarkdownFilesWithStats(tmpDir)
    expect(stats.totalNotes).toBe(0)
    expect(stats.lastModified).toBeDefined()
    expect(stats.totalSize).toBe(0)
  })

  it('should count total notes', () => {
    fs.writeFileSync(path.join(tmpDir, 'a.md'), '# A')
    fs.writeFileSync(path.join(tmpDir, 'b.md'), '# B')

    const stats = scanMarkdownFilesWithStats(tmpDir)
    expect(stats.totalNotes).toBe(2)
  })

  it('should calculate total size', () => {
    const contentA = '# Note A\n\nSome content here'
    const contentB = '# Note B\n\nMore content'
    fs.writeFileSync(path.join(tmpDir, 'a.md'), contentA)
    fs.writeFileSync(path.join(tmpDir, 'b.md'), contentB)

    const stats = scanMarkdownFilesWithStats(tmpDir)
    expect(stats.totalSize).toBe(Buffer.byteLength(contentA) + Buffer.byteLength(contentB))
  })

  it('should set lastModified to the most recent file', () => {
    fs.writeFileSync(path.join(tmpDir, 'old.md'), '# Old')
    const oldPath = path.join(tmpDir, 'old.md')
    const oldStats = fs.statSync(oldPath)

    // Wait a bit and create a new file
    const newContent = '# New'
    fs.writeFileSync(path.join(tmpDir, 'new.md'), newContent)

    const stats = scanMarkdownFilesWithStats(tmpDir)
    expect(stats.totalNotes).toBe(2)
    // The new file should have a more recent mtime
    const newStats = fs.statSync(path.join(tmpDir, 'new.md'))
    expect(new Date(stats.lastModified).getTime()).toBeGreaterThanOrEqual(newStats.mtime.getTime())
  })
})