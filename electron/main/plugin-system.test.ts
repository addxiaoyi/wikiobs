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

// Import the module under test — this loads the module-level state
// Note: addHook and emitEvent are NOT exported from plugin-system.ts
// Only the following are exported:
// loadPlugins, unloadPlugin, loadPlugin, getLoadedPlugins, getAllPlugins,
// executePluginHook, triggerHook, enablePlugin, disablePlugin, types
import {
  triggerHook,
  enablePlugin,
  disablePlugin,
  getLoadedPlugins,
  loadPlugins,
  unloadPlugin,
  getAllPlugins,
  getMarketplace,
  installPlugin,
  semverGt,
  resolvePluginRootDir,
  registerPluginSystemHandlers,
  runPluginCommand,
  getActiveNote,
  type Plugin,
} from './plugin-system'

function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'plugin-system-test-'))
}

function removeTempDir(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true })
}

function createPluginDir(baseDir: string, name: string, mainContent: string): string {
  const pluginDir = path.join(baseDir, name)
  fs.mkdirSync(pluginDir, { recursive: true })

  // Write manifest
  const manifest = {
    name,
    version: '1.0.0',
    main: 'index.js',
    description: `Test plugin ${name}`,
    permissions: [],
  }
  fs.writeFileSync(path.join(pluginDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf-8')

  // Write main file
  fs.writeFileSync(path.join(pluginDir, 'index.js'), mainContent, 'utf-8')

  return pluginDir
}

describe('triggerHook', () => {
  it('should do nothing for unregistered hooks', async () => {
    // Should not throw
    await expect(triggerHook('nonexistent:hook', {})).resolves.toBeUndefined()
  })

  it('should handle errors in callbacks gracefully', async () => {
    // Should not throw even if no callbacks are registered
    await triggerHook('note:error-test', { data: 'test' })
  })
})

describe('enablePlugin / disablePlugin', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = createTempDir()
    jest.clearAllMocks()
    const { app: mockApp } = require('electron')
    mockApp.getPath.mockReturnValue(tmpDir)
  })

  afterEach(() => {
    // Clean up plugin state
    const loaded = getLoadedPlugins()
    for (const plugin of loaded) {
      unloadPlugin(plugin.id)
    }
    removeTempDir(tmpDir)
  })

  it('should enable a plugin by loading it from directory', () => {
    // enablePlugin looks up the plugin directory at app.getPath('userData')/plugins/<pluginId>/
    // We need to create the plugin directory at the correct path
    const pluginsDir = path.join(tmpDir, 'plugins', 'test-plugin')
    const manifest = {
      name: 'test-plugin',
      version: '1.0.0',
      main: 'index.js',
      description: 'Test plugin',
      permissions: [],
    }
    fs.mkdirSync(pluginsDir, { recursive: true })
    fs.writeFileSync(path.join(pluginsDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf-8')
    fs.writeFileSync(path.join(pluginsDir, 'index.js'), 'exports.activate = () => {}', 'utf-8')

    const result = enablePlugin('test-plugin')
    expect(result).toBe(true)
  })

  it('should return false for non-existent plugin', () => {
    const result = enablePlugin('nonexistent-plugin')
    expect(result).toBe(false)
  })

  it('rejects plugin IDs that attempt path traversal', () => {
    expect(() => enablePlugin('../outside')).toThrow('Invalid plugin ID')
    expect(() => enablePlugin('..\\outside')).toThrow('Invalid plugin ID')
  })
})

describe('plugin manifest boundaries', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = createTempDir()
    const { app: mockApp } = require('electron')
    mockApp.getPath.mockReturnValue(tmpDir)
  })

  afterEach(() => {
    for (const plugin of getLoadedPlugins()) unloadPlugin(plugin.id)
    removeTempDir(tmpDir)
  })

  it('does not load a manifest entry outside the plugin directory', async () => {
    const pluginsDir = path.join(tmpDir, 'plugins', 'unsafe-plugin')
    fs.mkdirSync(pluginsDir, { recursive: true })
    fs.writeFileSync(
      path.join(pluginsDir, 'manifest.json'),
      JSON.stringify({ name: 'unsafe-plugin', version: '1.0.0', main: '../outside.js', permissions: [] }),
      'utf8',
    )
    fs.writeFileSync(path.join(tmpDir, 'outside.js'), 'exports.activate = () => {}', 'utf8')

    const loaded = await loadPlugins()
    expect(loaded.some((plugin) => plugin.id === 'unsafe-plugin' && !plugin.error)).toBe(false)
  })
})

describe('loadPlugins / getLoadedPlugins / getAllPlugins', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = createTempDir()
    jest.clearAllMocks()
    const { app: mockApp } = require('electron')
    mockApp.getPath.mockReturnValue(tmpDir)
  })

  afterEach(() => {
    const loaded = getLoadedPlugins()
    for (const plugin of loaded) {
      unloadPlugin(plugin.id)
    }
    removeTempDir(tmpDir)
  })

  it('should return empty array when no plugins directory exists', async () => {
    const plugins = await loadPlugins()
    expect(plugins).toEqual([])
  })

  it('should return empty for getLoadedPlugins initially', () => {
    expect(getLoadedPlugins()).toEqual([])
  })
})

describe('semverGt', () => {
  it('compares semver versions', () => {
    expect(semverGt('1.1.0', '1.0.0')).toBe(true)
    expect(semverGt('1.0.0', '1.0.0')).toBe(false)
    expect(semverGt('1.0.0', '1.1.0')).toBe(false)
    expect(semverGt('2.0.0', '1.9.9')).toBe(true)
    expect(semverGt('1.10.0', '1.9.0')).toBe(true)
  })
})

describe('resolvePluginRootDir', () => {
  let tmpDir: string
  beforeEach(() => {
    tmpDir = createTempDir()
  })
  afterEach(() => {
    removeTempDir(tmpDir)
  })

  it('returns the staging dir for a flat package (manifest at root)', () => {
    createPluginDir(tmpDir, 'flat-plugin', 'exports.activate = () => {}')
    const root = resolvePluginRootDir(path.join(tmpDir, 'flat-plugin'))
    expect(root).toBe(path.join(tmpDir, 'flat-plugin'))
  })

  it('lifts a nested package (manifest inside a single top-level folder)', () => {
    // 暂存根下仅一个顶层目录，其内直接含 manifest.json（典型 GitHub 发布 zip 布局）
    const nested = path.join(tmpDir, 'plugin-v1.0.0')
    fs.mkdirSync(nested, { recursive: true })
    const manifest = {
      name: 'nested-plugin',
      version: '1.0.0',
      main: 'index.js',
      description: 'Nested',
      permissions: [],
    }
    fs.writeFileSync(path.join(nested, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf-8')
    fs.writeFileSync(path.join(nested, 'index.js'), 'exports.activate = () => {}', 'utf-8')
    const root = resolvePluginRootDir(tmpDir)
    expect(root).toBe(nested)
  })

  it('throws when no manifest is found', () => {
    const empty = path.join(tmpDir, 'empty')
    fs.mkdirSync(empty, { recursive: true })
    expect(() => resolvePluginRootDir(empty)).toThrow('manifest.json was not found')
  })
})

describe('installPlugin (directory, overwrite)', () => {
  let tmpDir: string
  beforeEach(() => {
    tmpDir = createTempDir()
    const { app: mockApp } = require('electron')
    mockApp.getPath.mockReturnValue(tmpDir)
  })
  afterEach(() => {
    for (const plugin of getLoadedPlugins()) unloadPlugin(plugin.id)
    removeTempDir(tmpDir)
  })

  it('installs a plugin directory and loads it', async () => {
    const src = createPluginDir(tmpDir, 'source-plugin', 'exports.activate = () => {}')
    const result = await installPlugin(src)
    expect(result.success).toBe(true)
    expect(result.plugin?.enabled).toBe(true)
  })

  it('installs a nested plugin directory (single top-level folder) and loads it', async () => {
    const src = path.join(tmpDir, 'src-wrapper')
    fs.mkdirSync(src, { recursive: true })
    createPluginDir(src, 'plugin-inner', 'exports.activate = () => {}')
    const result = await installPlugin(src)
    expect(result.success).toBe(true)
  })

  it('rejects a second install of the same plugin without overwrite', async () => {
    const src = createPluginDir(tmpDir, 'dup-plugin', 'exports.activate = () => {}')
    await installPlugin(src)
    const second = await installPlugin(src)
    expect(second.success).toBe(false)
    expect(second.error).toMatch(/already exists/)
  })

  it('overwrites an existing plugin when overwrite=true', async () => {
    const src = createPluginDir(tmpDir, 'overwrite-plugin', 'exports.activate = () => {}')
    await installPlugin(src)
    const second = await installPlugin(src, true)
    expect(second.success).toBe(true)
  })

  it('rejects a manifest with unknown permissions', async () => {
    const src = createPluginDir(tmpDir, 'bad-perm-plugin', 'exports.activate = () => {}')
    const manifestPath = path.join(src, 'manifest.json')
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
    manifest.permissions = ['not-a-real-permission']
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8')
    const result = await installPlugin(src)
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/unknown permissions/)
  })
})

describe('getMarketplace', () => {
  let tmpDir: string
  beforeEach(() => {
    tmpDir = createTempDir()
    const { app: mockApp } = require('electron')
    mockApp.getPath.mockReturnValue(tmpDir)
  })
  afterEach(() => {
    for (const plugin of getLoadedPlugins()) unloadPlugin(plugin.id)
    removeTempDir(tmpDir)
  })

  it('reports bundled plugins as not installed initially', () => {
    const marketplace = getMarketplace()
    expect(marketplace.length).toBeGreaterThan(0)
    const wc = marketplace.find((m) => m.id === 'word-count-on-save')
    expect(wc).toBeDefined()
    expect(wc?.installed).toBe(false)
    expect(wc?.hasUpdate).toBe(false)
    expect(wc?.category).toBeTruthy()
  })
})

describe('plugin contributions and scaffolding', () => {
  let tmpDir: string

  const handlerFor = (channel: string) => {
    const mockIpc = require('electron').ipcMain as { handle: jest.Mock }
    const call = mockIpc.handle.mock.calls.filter(([name]) => name === channel).pop()
    if (!call) throw new Error(`handler not registered: ${channel}`)
    return call[1]
  }

  beforeEach(() => {
    tmpDir = createTempDir()
    const { app: mockApp } = require('electron')
    mockApp.getPath.mockReturnValue(tmpDir)
    const { ipcMain: mockIpc } = require('electron')
    mockIpc.handle.mockClear()
    registerPluginSystemHandlers()
  })

  afterEach(async () => {
    for (const plugin of getLoadedPlugins()) await unloadPlugin(plugin.id)
    removeTempDir(tmpDir)
  })

  it('creates a plugin skeleton from a template request', async () => {
    const response = await handlerFor('plugins:create-from-template')(
      {},
      {
        id: 'hello-plugin',
        manifest: {
          name: 'Hello Plugin',
          version: '1.0.0',
          main: 'index.js',
          description: 'demo',
          author: 'me',
          license: 'MIT',
          homepage: '',
          permissions: ['notes.read'],
          contributions: {
            commands: [{ id: 'greet', label: 'Greet' }],
            ui: [{ id: 'open-greet', label: 'Open Greet', location: 'sidebar', icon: 'Sparkles' }],
          },
        },
      },
    )

    expect(response.success).toBe(true)
    expect(response.result.relativePath).toBe('hello-plugin')
    expect(response.result.files).toEqual(expect.arrayContaining(['manifest.json', 'README.md', 'index.js']))

    const dir = path.join(tmpDir, 'plugins', 'hello-plugin')
    const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf-8'))
    expect(manifest.name).toBe('Hello Plugin')
    expect(manifest.permissions).toEqual(['notes.read'])
    expect(manifest.contributions.commands[0].id).toBe('greet')
    expect(fs.readFileSync(path.join(dir, 'index.js'), 'utf-8')).toContain('exports.activate')
  })

  it('rejects an existing plugin id and an invalid id', async () => {
    const handler = handlerFor('plugins:create-from-template')
    const draft = {
      manifest: {
        name: 'Dup',
        version: '1.0.0',
        main: 'index.js',
        description: '',
        author: '',
        license: '',
        homepage: '',
        permissions: [],
        contributions: { commands: [], ui: [] },
      },
    }
    fs.mkdirSync(path.join(tmpDir, 'plugins', 'taken'), { recursive: true })

    expect((await handler({}, {}, { id: 'taken', ...draft })).success).toBe(false)
    expect((await handler({}, {}, { id: '../escape', ...draft })).success).toBe(false)
  })

  it('refuses an entry path that escapes the plugin directory', async () => {
    const response = await handlerFor('plugins:create-from-template')(
      {},
      {
        id: 'escape-entry',
        manifest: {
          name: 'Escape',
          version: '1.0.0',
          main: '../outside.js',
          description: '',
          author: '',
          license: '',
          homepage: '',
          permissions: [],
          contributions: { commands: [], ui: [] },
        },
      },
    )
    expect(response.success).toBe(false)
    expect(response.error).toMatch(/must stay/i)
  })

  it('lists contributions only for enabled plugins', async () => {
    await installPlugin(createPluginDir(tmpDir, 'contrib-plugin', 'exports.activate = () => {}'))
    const registry = await handlerFor('plugins:contribution-registry')({})
    expect(Array.isArray(registry.ui)).toBe(true)
    expect(Array.isArray(registry.commands)).toBe(true)
  })

  it('runs a registered command and reports unknown commands', async () => {
    const result = await handlerFor('plugins:commands:run')({}, { pluginId: 'missing', commandId: 'nope' })
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/Command not found/)
    expect(await runPluginCommand('missing', 'nope', undefined)).toEqual(result)
  })

  it('tracks the active note and reports no renderer while unconnected', async () => {
    const handler = handlerFor('plugins:active-note')
    expect(getActiveNote()).toBeNull()
    handler({}, { path: 'notes/demo.md', title: 'demo' })
    expect(getActiveNote()).toEqual({ path: 'notes/demo.md', title: 'demo' })
    handler({}, null)
    expect(getActiveNote()).toBeNull()

    const decision = await handlerFor('plugins:edit-note')({}, {
      path: 'notes/demo.md',
      originalContent: 'a',
      proposedContent: 'b',
    })
    expect(decision.accepted).toBe(false)
  })
})

describe('plugin presets', () => {
  let tmpDir: string

  const handlerFor = (channel: string) => {
    const mockIpc = require('electron').ipcMain as { handle: jest.Mock }
    const call = mockIpc.handle.mock.calls.filter(([name]: [string]) => name === channel).pop()
    if (!call) throw new Error(`handler not registered: ${channel}`)
    return call[1]
  }

  beforeEach(() => {
    tmpDir = createTempDir()
    const { app: mockApp } = require('electron')
    mockApp.getPath.mockReturnValue(tmpDir)
    const { ipcMain: mockIpc } = require('electron')
    mockIpc.handle.mockClear()
    registerPluginSystemHandlers()
  })

  afterEach(async () => {
    for (const plugin of getLoadedPlugins()) await unloadPlugin(plugin.id)
    removeTempDir(tmpDir)
  })

  it('lists llm, cli and plain presets before anything is created', async () => {
    const presets = await handlerFor('plugins:presets:list')({})
    const kinds = new Set(presets.map((preset: { kind: string }) => preset.kind))
    expect(kinds.has('llm')).toBe(true)
    expect(kinds.has('cli')).toBe(true)
    expect(kinds.has('plugin')).toBe(true)
    expect(presets.every((preset: { installed: boolean }) => preset.installed === false)).toBe(true)
    for (const preset of presets) {
      expect(typeof preset.source).toBe('string')
      expect(preset.source.length).toBeGreaterThan(0)
    }
  })

  it('writes manifest, entry and README when creating an LLM preset', async () => {
    const result = await handlerFor('plugins:presets:create')({}, 'ollama-local')
    expect(result.success).toBe(true)
    expect(result.plugin).toMatchObject({ id: 'ollama-local', enabled: true })

    const dir = path.join(tmpDir, 'plugins', 'ollama-local')
    for (const file of ['manifest.json', 'index.js', 'README.md']) {
      expect(fs.existsSync(path.join(dir, file))).toBe(true)
    }
    const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'))
    expect(manifest.name).toBe('Ollama 本地模型')
    expect(manifest.main).toBe('index.js')
    expect(manifest.permissions).toEqual(['network'])
    expect((await getAllPlugins()).some((plugin) => plugin.id === 'ollama-local')).toBe(true)

    const listed = await handlerFor('plugins:presets:list')({})
    const entry = listed.find((preset: { id: string }) => preset.id === 'ollama-local')
    expect(entry?.installed).toBe(true)
  })

  it('rejects creating the same preset twice and unknown presets', async () => {
    expect((await handlerFor('plugins:presets:create')({}, 'daily-note')).success).toBe(true)
    const again = await handlerFor('plugins:presets:create')({}, 'daily-note')
    expect(again.success).toBe(false)
    expect(again.error).toMatch(/already exists/)

    const unknown = await handlerFor('plugins:presets:create')({}, 'no-such-preset')
    expect(unknown.success).toBe(false)
    expect(unknown.error).toMatch(/Unknown preset/)
  })
})
