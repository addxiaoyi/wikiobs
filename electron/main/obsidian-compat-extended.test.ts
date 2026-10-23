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
}))

jest.mock('electron-store', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
  }))
})

import {
  importObsidianVault,
  migrateLinks,
  parseObsidianNote,
  type ObsidianNote,
} from './obsidian-compat'

function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'obsidian-compat-test-'))
}

function removeTempDir(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true })
}

describe('migrateLinks', () => {
  it('should migrate links according to the mapping', () => {
    const notes: ObsidianNote[] = [
      {
        filePath: '/tmp/note1.md',
        content: 'Link to [[Old Name]] here',
        title: 'Note 1',
        tags: [],
        frontmatter: {},
        links: [],
        embeds: [],
      },
    ]

    const linkMapping = new Map<string, string>([
      ['Old Name', 'New Name'],
    ])

    const migrated = migrateLinks(notes, linkMapping)
    expect(migrated[0].content).toContain('[[New Name]]')
    expect(migrated[0].content).not.toContain('[[Old Name]]')
  })

  it('should handle notes with no links to migrate', () => {
    const notes: ObsidianNote[] = [
      {
        filePath: '/tmp/note2.md',
        content: 'No links here',
        title: 'Note 2',
        tags: [],
        frontmatter: {},
        links: [],
        embeds: [],
      },
    ]

    const migrated = migrateLinks(notes, new Map([['Old', 'New']]))
    expect(migrated[0].content).toBe('No links here')
  })

  it('should handle multiple notes', () => {
    const notes: ObsidianNote[] = [
      {
        filePath: '/tmp/a.md',
        content: 'See [[Target]]',
        title: 'A',
        tags: [],
        frontmatter: {},
        links: [],
        embeds: [],
      },
      {
        filePath: '/tmp/b.md',
        content: 'Also [[Target]]',
        title: 'B',
        tags: [],
        frontmatter: {},
        links: [],
        embeds: [],
      },
    ]

    const migrated = migrateLinks(notes, new Map([['Target', 'Renamed']]))
    expect(migrated[0].content).toContain('[[Renamed]]')
    expect(migrated[1].content).toContain('[[Renamed]]')
  })

  it('should return empty array for empty input', () => {
    const migrated = migrateLinks([], new Map())
    expect(migrated).toEqual([])
  })
})

describe('parseObsidianNote', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = createTempDir()
  })

  afterEach(() => {
    removeTempDir(tmpDir)
  })

  it('should parse a note with frontmatter', () => {
    const filePath = path.join(tmpDir, 'note.md')
    const content = `---
title: Test Note
tags: [test, sample]
---
# Body Content

Some text here [[Wiki Link]] and ![[Embed]]

#tag1 #tag2`

    fs.writeFileSync(filePath, content, 'utf-8')

    const note = parseObsidianNote(filePath, content)
    expect(note.title).toBe('Test Note')
    expect(note.tags).toContain('tag1')
    expect(note.tags).toContain('tag2')
    // ![[Embed]] is parsed as both a link AND an embed, so links contains both
    expect(note.links.length).toBeGreaterThanOrEqual(1)
    expect(note.embeds).toHaveLength(1)
    expect(note.embeds[0].target).toBe('Embed')
  })

  it('should parse a note without frontmatter', () => {
    const filePath = path.join(tmpDir, 'note.md')
    const content = '# Just Content\n\nNo frontmatter here'
    fs.writeFileSync(filePath, content, 'utf-8')

    const note = parseObsidianNote(filePath, content)
    // Without frontmatter, title is derived from the filename
    expect(note.title).toBe('note')
    expect(note.filePath).toBe(filePath)
  })

  it('should handle notes with no wiki links', () => {
    const filePath = path.join(tmpDir, 'note.md')
    const content = '# Plain Note\n\nNo links here'
    fs.writeFileSync(filePath, content, 'utf-8')

    const note = parseObsidianNote(filePath, content)
    expect(note.links).toEqual([])
    expect(note.embeds).toEqual([])
  })
})

describe('importObsidianVault conflict handling', () => {
  let rootPath: string

  beforeEach(() => {
    rootPath = createTempDir()
  })

  afterEach(() => {
    removeTempDir(rootPath)
  })

  it('preserves an existing target note and reports it as skipped', async () => {
    const sourcePath = path.join(rootPath, 'source')
    const targetPath = path.join(rootPath, 'target')
    const sourceNotePath = path.join(sourcePath, 'same-name.md')
    const targetNotePath = path.join(targetPath, 'same-name.md')
    const originalTarget = 'Locally edited note that must remain untouched.'

    fs.mkdirSync(sourcePath, { recursive: true })
    fs.mkdirSync(targetPath, { recursive: true })
    fs.writeFileSync(sourceNotePath, '# Imported version', 'utf8')
    fs.writeFileSync(targetNotePath, originalTarget, 'utf8')

    const result = await importObsidianVault(sourcePath, targetPath)

    expect(result.success).toBe(true)
    expect(result.imported).toBe(0)
    expect(result.skipped).toBe(1)
    expect(fs.readFileSync(targetNotePath, 'utf8')).toBe(originalTarget)
  })
})
