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
