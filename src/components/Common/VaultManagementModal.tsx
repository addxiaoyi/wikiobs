import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  FolderArchive,
  Search,
  Plus,
  Clipboard,
  Check,
  Pencil,
  Copy,
  Star,
  Trash2,
  FolderOpen,
  ArrowRight,
  AlertCircle,
  Loader2,
  X,
} from 'lucide-react'
import gsap from 'gsap'

import ReorModal from './Modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useTranslation } from '@/lib/i18n'
import { staggerFadeInUp, fadeInScale } from '@/lib/gsap-animations'
import { cn } from '@/lib/ui'

interface Vault {
  id: string
  name: string
  path: string
  isDefault: boolean
  createdAt: string
  lastOpened?: string
}

interface VaultManagementModalProps {
  isOpen: boolean
  onClose: () => void
  embedded?: boolean
}

type ModalSubView = 'list' | 'create' | 'rename' | 'duplicate' | 'delete'

const VaultManagementModal: React.FC<VaultManagementModalProps> = ({ isOpen, onClose, embedded }) => {
  const { t } = useTranslation()
  const [vaults, setVaults] = useState<Vault[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [currentVaultId, setCurrentVaultId] = useState<string | null>(null)
  const [vaultQuery, setVaultQuery] = useState('')
  const [subView, setSubView] = useState<ModalSubView>('list')

  // Form states
  const [createName, setCreateName] = useState('')
  const [createPath, setCreatePath] = useState('')
  const [targetVault, setTargetVault] = useState<Vault | null>(null)
  const [formInput, setFormInput] = useState('')
  const [processing, setProcessing] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const contentRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const formatUiError = (reason: unknown) => {
    const message = reason instanceof Error ? reason.message : String(reason)
    return message.replace(/^Error invoking remote method '[^']+':\s*Error:\s*/i, '').replace(/^Error:\s*/i, '')
  }

  const showSuccess = (message: string) => {
    if (successTimerRef.current) clearTimeout(successTimerRef.current)
    setSuccessMsg(message)
    successTimerRef.current = setTimeout(() => {
      setSuccessMsg(null)
      successTimerRef.current = null
    }, 3000)
  }

  useEffect(() => {
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current)
    }
  }, [])

  const loadVaults = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [result, active] = await Promise.all([window.multiVault.getAll(), window.multiVault.current()])
      setVaults(result || [])
      setCurrentVaultId(active?.id || null)
    } catch (err) {
      setError(`${t('error.generic')}: ${err}`)
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    if (isOpen) {
      loadVaults()
    } else {
      setSubView('list')
      setTargetVault(null)
      setCreateName('')
      setCreatePath('')
      setFormInput('')
      setError(null)
      setSuccessMsg(null)
    }
  }, [isOpen, loadVaults])

  // GSAP: Vault rows
  useEffect(() => {
    if (!isOpen || loading || subView !== 'list' || !listRef.current) return
    const list = listRef.current
    const ctx = gsap.context(() => {
      const rows = list.querySelectorAll('.vault-row-item')
      if (rows.length) {
        staggerFadeInUp(rows, 0.25, 0.03, 0.05)
      }
    }, listRef)
    return () => ctx.revert()
  }, [isOpen, loading, vaults, subView])

  const handleSwitch = async (vault: Vault) => {
    try {
      const result = await window.multiVault.switch(vault.id)
      if (!result.success) throw new Error(t('error.generic'))
      setCurrentVaultId(vault.id)
      onClose()
      showSuccess(`${t('vault.switched')}: ${vault.name}`)
      await loadVaults()
    } catch (err) {
      setError(`${t('error.generic')}: ${err}`)
    }
  }

  const handleCreate = async () => {
    if (!createName.trim() || !createPath.trim()) return
    setProcessing(true)
    setError(null)
    try {
      await window.multiVault.add({
        name: createName.trim(),
        path: createPath.trim(),
        isDefault: false,
      })
      setSubView('list')
      setCreateName('')
      setCreatePath('')
      showSuccess(t('vault.created'))
      await loadVaults()
    } catch (err) {
      setError(`${t('error.generic')}: ${formatUiError(err)}`)
    } finally {
      setProcessing(false)
    }
  }

  const handleRename = async () => {
    if (!targetVault || !formInput.trim()) return
    setProcessing(true)
    try {
      const result = await window.multiVault.rename(targetVault.id, formInput.trim())
      if (!result) throw new Error(t('error.generic'))
      setSubView('list')
      setTargetVault(null)
      showSuccess(t('vault.renamed'))
      await loadVaults()
    } catch (err) {
      setError(`${t('error.generic')}: ${formatUiError(err)}`)
    } finally {
      setProcessing(false)
    }
  }

  const handleDuplicate = async () => {
    if (!targetVault || !formInput.trim()) return
    setProcessing(true)
    try {
      const result = await window.multiVault.duplicate(targetVault.id, formInput.trim())
      if (!result) throw new Error(t('error.generic'))
      setSubView('list')
      setTargetVault(null)
      showSuccess(t('vault.duplicated'))
      await loadVaults()
    } catch (err) {
      setError(`${t('error.generic')}: ${formatUiError(err)}`)
    } finally {
      setProcessing(false)
    }
  }

  const handleDelete = async () => {
    if (!targetVault) return
    setProcessing(true)
    try {
      const result = await window.multiVault.remove(targetVault.id)
      if (!result.success) throw new Error(t('error.generic'))
      setSubView('list')
      setTargetVault(null)
      showSuccess(t('vault.deleted'))
      await loadVaults()
    } catch (err) {
      setError(`${t('error.generic')}: ${err}`)
    } finally {
      setProcessing(false)
    }
  }

  const handleSetDefault = async (vault: Vault) => {
    try {
      const result = await window.multiVault.setDefault(vault.id)
      if (!result.success) throw new Error(t('error.generic'))
      showSuccess(t('vault.defaultSet'))
      await loadVaults()
    } catch (err) {
      setError(`${t('error.generic')}: ${err}`)
    }
  }

  const handleCopyPath = async (vault: Vault) => {
    try {
      await navigator.clipboard.writeText(vault.path)
      setCopiedId(vault.id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (copyError) {
      setError(`${t('error.generic')}: ${copyError instanceof Error ? copyError.message : String(copyError)}`)
    }
  }

  const handleBrowse = async () => {
    try {
      const dirs = await window.fileSystem.openDirectoryDialog()
      if (dirs && dirs.length > 0) {
        if (subView === 'create') setCreatePath(dirs[0])
        else setFormInput(dirs[0])
      }
    } catch (err) {
      setError(`${t('error.generic')}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const filteredVaults = vaults.filter((vault) => {
    const query = vaultQuery.trim().toLocaleLowerCase()
    if (!query) return true
    return `${vault.name} ${vault.path}`.toLocaleLowerCase().includes(query)
  })

  return (
    <ReorModal isOpen={isOpen} onClose={onClose} embedded={embedded} className="max-w-[620px] p-5">
      {/* Header */}
      <div className="flex items-start gap-3 pb-4 border-b border-border">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-[#7b68ee]/30 bg-[#7b68ee]/15 text-[#7b68ee] dark:text-[#9d8ff5] shadow-sm shadow-[#7b68ee]/20">
          <FolderArchive size={18} strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1 pr-6">
          <h2 className="text-base font-semibold text-foreground tracking-tight">{t('vault.title')}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">切换、管理与创建多个独立工作空间知识库</p>
        </div>
      </div>

      <div ref={contentRef} className="pt-4 space-y-3.5">
        {/* Alerts */}
        {error && (
          <div className="flex items-start gap-2.5 rounded-lg border border-red-500/25 bg-red-500/10 p-3 text-xs text-red-600 dark:text-red-200">
            <AlertCircle size={15} className="mt-0.5 shrink-0 text-red-500" />
            <div className="flex-1 break-all">{error}</div>
            <button type="button" onClick={() => setError(null)} className="text-red-500 hover:text-red-400">
              ×
            </button>
          </div>
        )}

        {successMsg && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-200">
            <Check size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="py-8 flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <Loader2 size={20} className="animate-spin text-[#7b68ee]" />
            <span className="text-xs">{t('scheduled.loading')}</span>
          </div>
        )}

        {/* Sub-view: Create Vault */}
        {!loading && subView === 'create' && (
          <div className="rounded-lg border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <span className="text-xs font-semibold text-foreground">{t('vault.create')}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSubView('list')}
                className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                返回列表
              </Button>
            </div>
            <div className="space-y-1">
              <label htmlFor="create-vault-name" className="text-xs font-medium text-foreground block">
                {t('vault.vaultName')}
              </label>
              <Input
                id="create-vault-name"
                placeholder="例如：工作与研究库"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                disabled={processing}
                className="h-8 bg-background border-border text-foreground text-xs"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="create-vault-path" className="text-xs font-medium text-foreground block">
                {t('vault.vaultPath')}
              </label>
              <div className="flex items-center gap-2">
                <Input
                  id="create-vault-path"
                  placeholder="D:/Notes/WorkVault"
                  value={createPath}
                  onChange={(e) => setCreatePath(e.target.value)}
                  disabled={processing}
                  className="h-8 bg-background border-border text-foreground text-xs font-mono"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleBrowse}
                  disabled={processing}
                  className="h-8 px-2.5 gap-1 shrink-0 border-border"
                >
                  <FolderOpen size={13} />
                  <span>{t('obsidianCompat.browse')}</span>
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button variant="secondary" size="sm" onClick={() => setSubView('list')} disabled={processing}>
                {t('button.cancel')}
              </Button>
              <Button
                variant="accent"
                size="sm"
                onClick={handleCreate}
                disabled={processing || !createName.trim() || !createPath.trim()}
                className="gap-1.5"
              >
                {processing && <Loader2 size={12} className="animate-spin" />}
                <span>{processing ? t('scheduled.saving') : t('button.save')}</span>
              </Button>
            </div>
          </div>
        )}

        {/* Sub-view: Rename Vault */}
        {!loading && subView === 'rename' && targetVault && (
          <div className="rounded-lg border border-border bg-card p-4 space-y-3">
            <span className="text-xs font-semibold text-foreground block pb-1 border-b border-border">
              {t('vault.rename')}: {targetVault.name}
            </span>
            <div className="space-y-1">
              <label htmlFor="rename-vault-input" className="text-xs font-medium text-foreground block">
                {t('vault.vaultName')}
              </label>
              <Input
                id="rename-vault-input"
                value={formInput}
                onChange={(e) => setFormInput(e.target.value)}
                disabled={processing}
                className="h-8 bg-background border-border text-foreground text-xs"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button variant="secondary" size="sm" onClick={() => setSubView('list')} disabled={processing}>
                {t('button.cancel')}
              </Button>
              <Button
                variant="accent"
                size="sm"
                onClick={handleRename}
                disabled={processing || !formInput.trim()}
              >
                {processing ? t('scheduled.saving') : t('button.save')}
              </Button>
            </div>
          </div>
        )}

        {/* Sub-view: Duplicate Vault */}
        {!loading && subView === 'duplicate' && targetVault && (
          <div className="rounded-lg border border-border bg-card p-4 space-y-3">
            <span className="text-xs font-semibold text-foreground block pb-1 border-b border-border">
              {t('vault.duplicate')}: {targetVault.name}
            </span>
            <div className="space-y-1">
              <label htmlFor="dup-vault-input" className="text-xs font-medium text-foreground block">
                目标副本路径
              </label>
              <div className="flex items-center gap-2">
                <Input
                  id="dup-vault-input"
                  value={formInput}
                  onChange={(e) => setFormInput(e.target.value)}
                  disabled={processing}
                  className="h-8 bg-background border-border text-foreground text-xs font-mono"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleBrowse}
                  disabled={processing}
                  className="h-8 px-2.5 gap-1 shrink-0 border-border"
                >
                  <FolderOpen size={13} />
                  <span>{t('obsidianCompat.browse')}</span>
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button variant="secondary" size="sm" onClick={() => setSubView('list')} disabled={processing}>
                {t('button.cancel')}
              </Button>
              <Button
                variant="accent"
                size="sm"
                onClick={handleDuplicate}
                disabled={processing || !formInput.trim()}
              >
                {processing ? t('scheduled.saving') : t('vault.duplicate')}
              </Button>
            </div>
          </div>
        )}

        {/* Sub-view: Delete Confirm */}
        {!loading && subView === 'delete' && targetVault && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 space-y-3">
            <span className="text-xs font-semibold text-red-600 dark:text-red-200 block pb-1 border-b border-red-500/20">
              {t('vault.deleteConfirm')}
            </span>
            <p className="text-xs text-foreground leading-relaxed">{t('vault.deleteWarning')}</p>
            <div className="rounded bg-muted/40 border border-border px-3 py-2 text-xs font-medium text-foreground">
              {targetVault.name}
              <span className="block text-[11px] text-muted-foreground font-mono mt-0.5">{targetVault.path}</span>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-red-500/20">
              <Button variant="secondary" size="sm" onClick={() => setSubView('list')} disabled={processing}>
                {t('button.cancel')}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={processing}
              >
                {processing ? t('scheduled.saving') : t('vault.delete')}
              </Button>
            </div>
          </div>
        )}

        {/* Default View: Vaults List */}
        {!loading && subView === 'list' && (
          <div className="space-y-2.5">
            {/* Search & Actions Bar */}
            <div className="flex items-center justify-between gap-2">
              <div className="relative flex-1">
                <Search size={13} className="absolute left-2.5 top-2.5 text-muted-foreground" />
                <Input
                  placeholder="搜索知识库名称或路径..."
                  value={vaultQuery}
                  onChange={(e) => setVaultQuery(e.target.value)}
                  className="h-8 pl-8 bg-background border-border text-foreground text-xs placeholder:text-muted-foreground"
                />
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSubView('create')}
                className="h-8 px-3 text-xs gap-1.5 border-border bg-secondary hover:bg-secondary/80 text-foreground shrink-0"
              >
                <Plus size={13} />
                <span>{t('vault.create')}</span>
              </Button>
            </div>

            {/* List */}
            <div ref={listRef} className="max-h-80 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
              {filteredVaults.map((vault) => {
                const isCurrent = vault.id === currentVaultId
                return (
                  <div
                    key={vault.id}
                    className={cn(
                      'vault-row-item rounded-lg border p-3 text-xs transition-colors',
                      isCurrent
                        ? 'border-[#7b68ee]/40 bg-[#7b68ee]/10'
                        : 'border-border bg-card hover:border-border/80',
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground truncate">{vault.name}</span>
                          {isCurrent && (
                            <span className="rounded bg-[#7b68ee]/25 border border-[#7b68ee]/40 px-1.5 py-0.2 text-[10px] text-[#7b68ee] dark:text-[#b6a9ff] font-medium">
                              {t('vault.current')}
                            </span>
                          )}
                          {vault.isDefault && !isCurrent && (
                            <span className="rounded bg-muted/40 border border-border px-1.5 py-0.2 text-[10px] text-muted-foreground">
                              {t('vault.default')}
                            </span>
                          )}
                        </div>
                        <div className="font-mono text-[11px] text-muted-foreground truncate mt-1" title={vault.path}>
                          {vault.path}
                        </div>
                        {vault.lastOpened && (
                          <div className="text-[10px] text-muted-foreground mt-1">
                            {t('vault.lastOpened')}: {new Date(vault.lastOpened).toLocaleDateString()}
                          </div>
                        )}
                      </div>

                      {/* Row Action Buttons */}
                      <div className="flex items-center gap-1 shrink-0">
                        {!isCurrent && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleSwitch(vault)}
                            className="h-7 px-2.5 text-xs border-border bg-secondary hover:bg-secondary/80 text-foreground"
                          >
                            {t('vault.switch')}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyPath(vault)}
                          className="size-7 p-0 text-muted-foreground hover:text-foreground"
                          title={t('vault.copyPath')}
                        >
                          {copiedId === vault.id ? <Check size={13} className="text-emerald-400" /> : <Clipboard size={13} />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setTargetVault(vault)
                            setFormInput(vault.name)
                            setSubView('rename')
                          }}
                          className="size-7 p-0 text-muted-foreground hover:text-foreground"
                          title={t('vault.rename')}
                        >
                          <Pencil size={13} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setTargetVault(vault)
                            setFormInput(`${vault.path}_copy`)
                            setSubView('duplicate')
                          }}
                          className="size-7 p-0 text-muted-foreground hover:text-foreground"
                          title={t('vault.duplicate')}
                        >
                          <Copy size={13} />
                        </Button>
                        {!vault.isDefault && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSetDefault(vault)}
                            className="size-7 p-0 text-muted-foreground hover:text-amber-400"
                            title={t('vault.setDefault')}
                          >
                            <Star size={13} />
                          </Button>
                        )}
                        {!isCurrent && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setTargetVault(vault)
                              setSubView('delete')
                            }}
                            className="size-7 p-0 text-muted-foreground hover:text-destructive"
                            title={t('vault.delete')}
                          >
                            <Trash2 size={13} />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}

              {filteredVaults.length === 0 && (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  {t('vault.noSearchResults')}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-2.5 pt-4 mt-2 border-t border-border">
        <Button variant="secondary" size="sm" onClick={onClose} className="text-xs">
          {t('button.close')}
        </Button>
      </div>
    </ReorModal>
  )
}

export default VaultManagementModal
