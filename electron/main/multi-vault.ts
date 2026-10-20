/**
 * Multi-Vault - 多知识库支持
 * 管理多个 Vault 配置和快速切换
 */

import { ipcMain, app, BrowserWindow } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import crypto from 'crypto'
import { execFileSync } from 'child_process'
import Store from 'electron-store'
import { logger } from './common/logger'
import WindowsManager from './common/windowManager'
import { StoreSchema } from './electron-store/storeConfig'

interface VaultConfig {
  id: string
  name: string
  path: string
  embeddingModel?: string
  llmModel?: string
  chunkSize?: number
  settings: {
    autoIndex?: boolean
    watchForChanges?: boolean
    defaultNoteTemplate?: string
  }
  createdAt: string
  lastOpened?: string
}

interface VaultMetadata {
  totalNotes: number
  lastModified: string
  size: number
}

const store = new Store()

const CURRENT_VAULT_KEY = 'currentVaultId'

// 获取 vaults 存储路径
function getVaultsFilePath(): string {
  const userDataPath = app.getPath('userData')
  return path.join(userDataPath, 'vaults.json')
}

// 加载所有 vault 配置
function loadVaults(): VaultConfig[] {
  try {
    const vaultsPath = getVaultsFilePath()
    if (fs.existsSync(vaultsPath)) {
      const data = JSON.parse(fs.readFileSync(vaultsPath, 'utf-8'))
      if (!Array.isArray(data)) return []
      return data.filter((vault): vault is VaultConfig => {
        return Boolean(
          vault && typeof vault.id === 'string' && typeof vault.name === 'string' && typeof vault.path === 'string',
        )
      })
    }
  } catch (e) {
    logger.error('MultiVault', 'Failed to load vaults', e)
  }
  return []
}

// 保存 vault 配置
function saveVaults(vaults: VaultConfig[]): void {
  try {
    const vaultsPath = getVaultsFilePath()
    const dir = path.dirname(vaultsPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(vaultsPath, JSON.stringify(vaults, null, 2), 'utf-8')
  } catch (e) {
    logger.error('MultiVault', 'Failed to save vaults', e)
  }
}

// 获取 vault 统计信息
function getVaultMetadata(vaultPath: string): VaultMetadata {
  let totalNotes = 0
  let lastModified = new Date(0).toISOString()
  let totalSize = 0

  const scanDir = (dir: string) => {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          scanDir(fullPath)
        } else if (entry.name.endsWith('.md')) {
          totalNotes++
          try {
            const stats = fs.statSync(fullPath)
            if (stats.mtime > new Date(lastModified)) {
              lastModified = stats.mtime.toISOString()
            }
            totalSize += stats.size
          } catch (e) {
            // 忽略
          }
        }
      }
    } catch (e) {
      // 忽略
    }
  }

  if (fs.existsSync(vaultPath)) {
    scanDir(vaultPath)
  }

  return {
    totalNotes,
    lastModified,
    size: totalSize,
  }
}

function assertVaultWritable(vaultPath: string): void {
  if (process.platform === 'win32') {
    try {
      const acl = execFileSync('icacls.exe', [vaultPath], { encoding: 'utf8', windowsHide: true })
      if (/\(DENY\).*\bW\b/i.test(acl)) {
        throw new Error('Vault path is not writable.')
      }
    } catch (error) {
      if (error instanceof Error && error.message === 'Vault path is not writable.') throw error
      // If ACL inspection is unavailable, keep the write probe as the source of truth.
    }
  }

  const probePath = path.join(vaultPath, `.wikiobs-write-check-${crypto.randomUUID()}.tmp`)
  try {
    fs.writeFileSync(probePath, '')
    fs.rmSync(probePath, { force: true })
  } catch {
    try {
      fs.rmSync(probePath, { force: true })
    } catch {
      // Preserve the original write failure for the caller.
    }
    throw new Error('Vault path is not writable.')
  }
}

// 获取所有 vault
function getAllVaults(): VaultConfig[] {
  return loadVaults()
}

// 获取单个 vault
function getVault(vaultId: string): VaultConfig | undefined {
  const vaults = loadVaults()
  return vaults.find((v) => v.id === vaultId)
}

// 获取当前 vault
function getCurrentVault(): VaultConfig | null {
  const currentId = store.get(CURRENT_VAULT_KEY) as string
  if (!currentId) return null
  return getVault(currentId) || null
}

// 添加 vault
function addVault(config: Omit<VaultConfig, 'id' | 'createdAt'>): VaultConfig {
  const vaults = loadVaults()
  const resolvedPath = path.resolve(config.path)
  const normalizedName = config.name.trim().toLocaleLowerCase()

  if (!normalizedName) {
    throw new Error('Vault name cannot be empty.')
  }

  if (!fs.existsSync(resolvedPath)) {
    fs.mkdirSync(resolvedPath, { recursive: true })
  } else if (!fs.statSync(resolvedPath).isDirectory()) {
    throw new Error('Vault path is not a directory.')
  }

  const existing = vaults.find((v) => path.resolve(v.path) === resolvedPath)
  if (existing) {
    return existing
  }

  if (vaults.some((vault) => vault.name.trim().toLocaleLowerCase() === normalizedName)) {
    throw new Error('A vault with this name already exists.')
  }

  assertVaultWritable(resolvedPath)

  const vault: VaultConfig = {
    ...config,
    name: config.name.trim(),
    path: resolvedPath,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  }

  vaults.push(vault)
  saveVaults(vaults)

  if (vaults.length === 1) {
    store.set(CURRENT_VAULT_KEY, vault.id)
  }

  return vault
}

// 更新 vault
function updateVault(vaultId: string, updates: Partial<VaultConfig>): VaultConfig | null {
  const vaults = loadVaults()
  const index = vaults.findIndex((v) => v.id === vaultId)

  if (index === -1) return null

  vaults[index] = { ...vaults[index], ...updates }
  saveVaults(vaults)

  return vaults[index]
}

// 移除 vault
function removeVault(vaultId: string): boolean {
  const vaults = loadVaults()
  const filtered = vaults.filter((v) => v.id !== vaultId)

  if (filtered.length === vaults.length) return false

  saveVaults(filtered)

  // 如果删除的是当前 vault，切换到其他
  const currentId = store.get(CURRENT_VAULT_KEY)
  if (currentId === vaultId) {
    const newCurrent = filtered[0]
    if (newCurrent) {
      store.set(CURRENT_VAULT_KEY, newCurrent.id)
    }
  }

  return true
}

// 切换 vault
function switchVault(vaultId: string): boolean {
  const vault = getVault(vaultId)
  if (!vault) return false

  if (!fs.existsSync(vault.path)) {
    fs.mkdirSync(vault.path, { recursive: true })
  }

  store.set(CURRENT_VAULT_KEY, vaultId)
  store.set('vaultDirectory', vault.path)

  // 更新最后打开时间
  updateVault(vaultId, { lastOpened: new Date().toISOString() })

  return true
}

// 重命名 vault
function renameVault(vaultId: string, newName: string): VaultConfig | null {
  const trimmedName = newName.trim()
  if (!trimmedName) throw new Error('Vault name cannot be empty.')

  const vaults = loadVaults()
  const duplicate = vaults.find(
    (vault) => vault.id !== vaultId && vault.name.trim().toLocaleLowerCase() === trimmedName.toLocaleLowerCase(),
  )
  if (duplicate) throw new Error('A vault with this name already exists.')

  return updateVault(vaultId, { name: trimmedName })
}

// 复制 vault 设置
function duplicateVault(vaultId: string, newPath: string): VaultConfig | null {
  const vault = getVault(vaultId)
  if (!vault) return null

  const sourcePath = path.resolve(vault.path)
  const destinationPath = path.resolve(newPath)
  const sourceToDestination = path.relative(sourcePath, destinationPath)
  const destinationToSource = path.relative(destinationPath, sourcePath)
  const isNested = (relative: string) =>
    relative === '' || relative === '..' || relative.startsWith(`..${path.sep}`) === false
  if (isNested(sourceToDestination) || isNested(destinationToSource)) {
    throw new Error('A duplicated vault cannot contain or replace the source vault.')
  }
  if (fs.existsSync(destinationPath) && fs.readdirSync(destinationPath).length > 0) {
    throw new Error('The destination directory must be empty.')
  }

  const newVault = addVault({
    name: `${vault.name} (Copy)`,
    path: destinationPath,
    embeddingModel: vault.embeddingModel,
    llmModel: vault.llmModel,
    chunkSize: vault.chunkSize,
    settings: { ...vault.settings },
  })

  // 复制文件
  if (fs.existsSync(sourcePath)) {
    const scanDir = (src: string, dest: string) => {
      if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true })
      }

      const entries = fs.readdirSync(src, { withFileTypes: true })
      for (const entry of entries) {
        const srcPath = path.join(src, entry.name)
        const destPath = path.join(dest, entry.name)

        if (entry.isDirectory()) {
          scanDir(srcPath, destPath)
        } else {
          fs.copyFileSync(srcPath, destPath)
        }
      }
    }

    scanDir(sourcePath, destinationPath)
  }

  return newVault
}

// 设置默认 vault
function setDefaultVault(vaultId: string): boolean {
  const vault = getVault(vaultId)
  if (!vault) return false

  // 存储默认 vault ID 到 electron store
  store.set('defaultVaultId', vaultId)

  logger.info('MultiVault', `Set default vault: ${vault.name} (${vaultId})`)
  return true
}

// 验证 vault 路径
function validateVaultPath(vaultPath: string): {
  valid: boolean
  error?: string
  noteCount?: number
} {
  if (!fs.existsSync(vaultPath)) {
    return { valid: false, error: 'Path does not exist' }
  }

  if (!fs.statSync(vaultPath).isDirectory()) {
    return { valid: false, error: 'Path is not a directory' }
  }

  const noteCount = getVaultMetadata(vaultPath).totalNotes
  try {
    assertVaultWritable(vaultPath)
  } catch (error) {
    return { valid: false, error: error instanceof Error ? error.message : String(error) }
  }
  return { valid: true, noteCount }
}

// 注册 IPC handlers
export function registerMultiVaultHandlers(windowsManager: WindowsManager, appStore: Store<StoreSchema>) {
  ipcMain.handle('vault:get-all', async () => {
    return getAllVaults()
  })

  ipcMain.handle('vault:get', async (_event, vaultId: string) => {
    return getVault(vaultId)
  })

  ipcMain.handle('vault:current', async () => {
    return getCurrentVault()
  })

  ipcMain.handle('vault:add', async (_event, config: Omit<VaultConfig, 'id' | 'createdAt'>) => {
    return addVault(config)
  })

  ipcMain.handle('vault:update', async (_event, vaultId: string, updates: Partial<VaultConfig>) => {
    return updateVault(vaultId, updates)
  })

  ipcMain.handle('vault:remove', async (_event, vaultId: string) => {
    return { success: removeVault(vaultId) }
  })

  ipcMain.handle('vault:switch', async (_event, vaultId: string) => {
    const success = switchVault(vaultId)
    if (success) {
      const vault = getVault(vaultId)
      const win = BrowserWindow.fromWebContents(_event.sender)
      if (vault && win) {
        windowsManager.setVaultDirectoryForContents(_event.sender, vault.path, appStore)
        await windowsManager.handleVaultSwitch(_event.sender, vault.path)
        _event.sender.send('vault-switched', vault.path)
      }
    }
    return { success }
  })

  ipcMain.handle('vault:rename', async (_event, vaultId: string, newName: string) => {
    return renameVault(vaultId, newName)
  })

  ipcMain.handle('vault:duplicate', async (_event, vaultId: string, newPath: string) => {
    return duplicateVault(vaultId, newPath)
  })

  ipcMain.handle('vault:validate', async (_event, vaultPath: string) => {
    return validateVaultPath(vaultPath)
  })

  ipcMain.handle('vault:metadata', async (_event, vaultId: string) => {
    const vault = vaultId === 'current' ? getCurrentVault() : getVault(vaultId)
    if (!vault) return null
    return getVaultMetadata(vault.path)
  })

  ipcMain.handle('vault:set-default', async (_event, vaultId: string) => {
    return { success: setDefaultVault(vaultId) }
  })

  logger.info('MultiVault', 'IPC handlers registered')
}

export {
  type VaultConfig,
  type VaultMetadata,
  getAllVaults,
  getVault,
  getCurrentVault,
  addVault,
  updateVault,
  removeVault,
  switchVault,
  setDefaultVault,
  renameVault,
  duplicateVault,
  validateVaultPath,
  getVaultMetadata,
}
