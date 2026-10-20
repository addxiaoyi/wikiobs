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
  const store = new Map<string, unknown>()
  return jest.fn().mockImplementation(() => ({
    get: jest.fn((key: string) => store.get(key)),
    set: jest.fn((key: string, value: unknown) => { store.set(key, value) }),
    delete: jest.fn((key: string) => { store.delete(key) }),
    clear: jest.fn(() => { store.clear() }),
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

import {
  getVaultMetadata,
  validateVaultPath,
  getAllVaults,
  getVault,
  addVault,
  updateVault,
  removeVault,
  switchVault,
  renameVault,
  setDefaultVault,
  type VaultConfig,
} from './multi-vault'

function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'multi-vault-test-'))
}

function removeTempDir(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true })
}

function stripDynamicFields(vault: VaultConfig): VaultConfig {
  return {
    ...vault,
    id: '<id>',
    createdAt: '<createdAt>',
    lastOpened: undefined,
  }
}

function writeFiles(dir: string, files: Record<string, string>): void {
  for (const [filePath, content] of Object.entries(files)) {
    const fullPath = path.join(dir, filePath)
    fs.mkdirSync(path.dirname(fullPath), { recursive: true })
    fs.writeFileSync(fullPath, content, 'utf-8')
  }
}

describe('getVaultMetadata', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = createTempDir()
  })

  afterEach(() => {
    removeTempDir(tmpDir)
  })

  it('should return zero counts for empty directory', () => {
    const metadata = getVaultMetadata(tmpDir)
    expect(metadata.totalNotes).toBe(0)
    expect(metadata.size).toBe(0)
    expect(metadata.lastModified).toBeDefined()
  })

  it('should return zero counts for non-existent directory', () => {
    const metadata = getVaultMetadata('/nonexistent/path')
    expect(metadata.totalNotes).toBe(0)
    expect(metadata.size).toBe(0)
  })

  it('should count markdown files', () => {
    writeFiles(tmpDir, {
      'note1.md': '# Note 1',
      'note2.md': '# Note 2',
      'readme.txt': 'Not a markdown file',
    })

    const metadata = getVaultMetadata(tmpDir)
    expect(metadata.totalNotes).toBe(2)
  })

  it('should calculate total size', () => {
    writeFiles(tmpDir, {
      'a.md': '# Note A',
      'b.md': '# Note B',
    })

    const metadata = getVaultMetadata(tmpDir)
    expect(metadata.size).toBeGreaterThan(0)
  })

  it('should find files recursively', () => {
    writeFiles(tmpDir, {
      'root.md': '# Root',
      'sub/nested.md': '# Nested',
    })

    const metadata = getVaultMetadata(tmpDir)
    expect(metadata.totalNotes).toBe(2)
  })
})

describe('validateVaultPath', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = createTempDir()
  })

  afterEach(() => {
    removeTempDir(tmpDir)
  })

  it('should return invalid for non-existent path', () => {
    const result = validateVaultPath('/nonexistent/path')
    expect(result.valid).toBe(false)
    expect(result.error).toBeDefined()
  })

  it('should return invalid for file path', () => {
    const filePath = path.join(tmpDir, 'test.md')
    fs.writeFileSync(filePath, '# test')
    const result = validateVaultPath(filePath)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('not a directory')
  })

  it('should return valid for a directory with markdown files', () => {
    writeFiles(tmpDir, { 'note.md': '# Note' })
    const result = validateVaultPath(tmpDir)
    expect(result.valid).toBe(true)
    expect(result.noteCount).toBe(1)
  })

  it('should return valid for empty directory', () => {
    const result = validateVaultPath(tmpDir)
    expect(result.valid).toBe(true)
    expect(result.noteCount).toBe(0)
  })
})

describe('vault CRUD operations', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = createTempDir()
    jest.clearAllMocks()
    // Set up a valid vaults.json path by mocking app.getPath
    const { app: mockApp } = require('electron')
    mockApp.getPath.mockReturnValue(tmpDir)
  })

  afterEach(() => {
    removeTempDir(tmpDir)
  })

  it('should add a vault and return it with id and createdAt', () => {
    const vault = addVault({
      name: 'Test Vault',
      path: tmpDir,
      settings: {},
    })

    expect(vault.id).toBeDefined()
    expect(vault.name).toBe('Test Vault')
    expect(vault.path).toBe(tmpDir)
    expect(vault.createdAt).toBeDefined()
  })

  it('should return existing vault when adding duplicate path', () => {
    const vault1 = addVault({
      name: 'Test Vault',
      path: tmpDir,
      settings: {},
    })

    const vault2 = addVault({
      name: 'Test Vault',
      path: tmpDir,
      settings: {},
    })

    expect(vault2.id).toBe(vault1.id)
  })

  it('should get all vaults', () => {
    addVault({ name: 'Vault 1', path: tmpDir, settings: {} })
    const vaults = getAllVaults()
    expect(vaults.length).toBeGreaterThanOrEqual(1)
  })

  it('should get a vault by id', () => {
    const added = addVault({ name: 'Test Vault', path: tmpDir, settings: {} })
    const found = getVault(added.id)
    expect(found).toBeDefined()
    expect(found!.name).toBe('Test Vault')
  })

  it('should return undefined for non-existent vault', () => {
    expect(getVault('nonexistent')).toBeUndefined()
  })

  it('should update a vault', () => {
    const added = addVault({ name: 'Original', path: tmpDir, settings: {} })
    const updated = updateVault(added.id, { name: 'Updated' })
    expect(updated).not.toBeNull()
    expect(updated!.name).toBe('Updated')
  })

  it('should return null when updating non-existent vault', () => {
    expect(updateVault('nonexistent', { name: 'Nope' })).toBeNull()
  })

  it('should remove a vault', () => {
    const added = addVault({ name: 'To Remove', path: tmpDir, settings: {} })
    const removed = removeVault(added.id)
    expect(removed).toBe(true)
    expect(getVault(added.id)).toBeUndefined()
  })

  it('should return false when removing non-existent vault', () => {
    expect(removeVault('nonexistent')).toBe(false)
  })

  it('should rename a vault', () => {
    const added = addVault({ name: 'Old Name', path: tmpDir, settings: {} })
    const renamed = renameVault(added.id, 'New Name')
    expect(renamed).not.toBeNull()
    expect(renamed!.name).toBe('New Name')
  })

  it('should set default vault', () => {
    const added = addVault({ name: 'Default', path: tmpDir, settings: {} })
    const result = setDefaultVault(added.id)
    expect(result).toBe(true)
  })

  it('should return false when setting non-existent default vault', () => {
    expect(setDefaultVault('nonexistent')).toBe(false)
  })
})

describe('switchVault', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = createTempDir()
    jest.clearAllMocks()
    const { app: mockApp } = require('electron')
    mockApp.getPath.mockReturnValue(tmpDir)
  })

  afterEach(() => {
    removeTempDir(tmpDir)
  })

  it('should switch to an existing vault', () => {
    const added = addVault({ name: 'Target', path: tmpDir, settings: {} })
    const result = switchVault(added.id)
    expect(result).toBe(true)
  })

  it('should return false for non-existent vault', () => {
    expect(switchVault('nonexistent')).toBe(false)
  })

  it('should create vault directory if it does not exist when switching', () => {
    const newDir = path.join(tmpDir, 'new-vault-dir')
    const added = addVault({ name: 'New Dir', path: newDir, settings: {} })
    // Remove the directory that addVault created
    fs.rmSync(newDir, { recursive: true, force: true })
    expect(fs.existsSync(newDir)).toBe(false)

    const result = switchVault(added.id)
    expect(result).toBe(true)
    expect(fs.existsSync(newDir)).toBe(true)
  })
})