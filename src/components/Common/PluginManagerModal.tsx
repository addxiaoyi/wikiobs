import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Blocks,
  Plus,
  Info,
  AlertCircle,
  CheckCircle2,
  FolderOpen,
  ShieldAlert,
  Trash2,
  Loader2,
  Store,
} from 'lucide-react'
import gsap from 'gsap'

import Modal from './Modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { useTranslation } from '@/lib/i18n'
import { staggerFadeInUp } from '@/lib/gsap-animations'
import { cn } from '@/lib/ui'

interface Plugin {
  id: string
  name: string
  version: string
  description?: string
  author?: string
  permissions?: string[]
  error?: string
  enabled: boolean
  settings?: Record<string, unknown>
}

interface PluginManifestPreview {
  name: string
  version: string
  main: string
  description?: string
  author?: string
  permissions: string[]
}

interface PluginManagerModalProps {
  isOpen: boolean
  onClose: () => void
  embedded?: boolean
}

type PluginSubView = 'list' | 'install' | 'detail' | 'uninstall'

interface MarketplacePlugin {
  id: string
  name: string
  version: string
  description: string
  author: string
  permissions: string[]
  installed: boolean
}

const PluginManagerModal: React.FC<PluginManagerModalProps> = ({ isOpen, onClose, embedded }) => {
  const { t } = useTranslation()
  const [plugins, setPlugins] = useState<Plugin[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [subView, setSubView] = useState<PluginSubView>('list')

  const [installPath, setInstallPath] = useState('')
  const [installing, setInstalling] = useState(false)
  const [inspecting, setInspecting] = useState(false)
  const [manifestPreview, setManifestPreview] = useState<PluginManifestPreview | null>(null)
  const [trustPlugin, setTrustPlugin] = useState(false)
  const [selectedPlugin, setSelectedPlugin] = useState<Plugin | null>(null)
  const [marketplace, setMarketplace] = useState<MarketplacePlugin[]>([])
  const [showMarketplace, setShowMarketplace] = useState(false)

  const contentRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  const loadPlugins = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await window.plugin.getAll()
      setPlugins(result || [])
    } catch (err) {
      setError(`${t('error.generic')}: ${err}`)
    } finally {
      setLoading(false)
    }
  }, [t])

  const loadMarketplace = useCallback(async () => {
    try {
      setMarketplace((await window.plugin.marketplace.list()) || [])
    } catch (err) {
      setError(`${t('error.generic')}: ${err}`)
    }
  }, [t])

  useEffect(() => {
    if (isOpen) {
      loadPlugins()
      loadMarketplace()
    } else {
      setSubView('list')
      setSelectedPlugin(null)
      setManifestPreview(null)
      setTrustPlugin(false)
      setError(null)
      setSuccessMsg(null)
      setShowMarketplace(false)
    }
  }, [isOpen, loadPlugins, loadMarketplace])

  const installMarketplacePlugin = async (entry: MarketplacePlugin) => {
    const permissions = entry.permissions.length > 0 ? entry.permissions.join(', ') : 'none'
    const trusted = window.confirm(
      `${entry.name} v${entry.version} will run in the main process and requests: ${permissions}. Install it?`,
    )
    if (!trusted) return

    try {
      const result = await window.plugin.marketplace.install(entry.id)
      if (!result.success) throw new Error(result.error || t('error.generic'))
      showSuccess(`${entry.name} ${t('plugin.installed')}`)
      await Promise.all([loadPlugins(), loadMarketplace()])
    } catch (err) {
      setError(`${t('error.generic')}: ${err}`)
    }
  }

  // GSAP: Cards entrance
  useEffect(() => {
    if (!isOpen || loading || subView !== 'list' || !listRef.current) return
    const list = listRef.current
    const ctx = gsap.context(() => {
      const items = list.querySelectorAll('.plugin-card-item')
      if (items.length) {
        staggerFadeInUp(items, 0.25, 0.03, 0.05)
      }
    }, listRef)
    return () => ctx.revert()
  }, [isOpen, loading, plugins, subView])

  const handleToggle = async (plugin: Plugin) => {
    try {
      const result = plugin.enabled ? await window.plugin.disable(plugin.id) : await window.plugin.enable(plugin.id)
      if (!result.success) throw new Error(result.error || t('plugin.activationFailed'))
      showSuccess(plugin.enabled ? t('plugin.disabled') : t('plugin.enabled'))
      await loadPlugins()
    } catch (err) {
      setError(
        `${plugin.enabled ? t('plugin.disableFailed') : t('plugin.activationFailed')}: ${err instanceof Error ? err.message : String(err)}`,
      )
    }
  }

  const inspectPlugin = async () => {
    if (!installPath.trim()) return false
    setInspecting(true)
    setError(null)
    try {
      const result = await window.plugin.inspect(installPath.trim())
      if (!result.success || !result.manifest) throw new Error(result.error || t('plugin.invalidManifest'))
      setManifestPreview(result.manifest as PluginManifestPreview)
      setTrustPlugin(false)
      return true
    } catch (err) {
      setError(`${t('plugin.inspectFailed')}: ${err instanceof Error ? err.message : String(err)}`)
      return false
    } finally {
      setInspecting(false)
    }
  }

  const handleInstall = async () => {
    if (!installPath.trim()) return
    if (!manifestPreview) {
      await inspectPlugin()
      return
    }
    if (!trustPlugin) return

    setInstalling(true)
    setError(null)
    try {
      const result = await window.plugin.install(installPath.trim())
      if (!result.success) throw new Error(result.error || t('error.generic'))
      setSubView('list')
      setInstallPath('')
      setManifestPreview(null)
      setTrustPlugin(false)
      showSuccess(t('plugin.installed'))
      await loadPlugins()
    } catch (err) {
      setError(`${t('error.generic')}: ${err}`)
    } finally {
      setInstalling(false)
    }
  }

  const handleUninstall = async (plugin: Plugin) => {
    try {
      const result = await window.plugin.uninstall(plugin.id)
      if (!result) throw new Error(t('error.generic'))
      setSubView('list')
      setSelectedPlugin(null)
      showSuccess(t('plugin.uninstalled'))
      await loadPlugins()
    } catch (err) {
      setError(`${t('error.generic')}: ${err}`)
    }
  }

  const handleBrowse = async () => {
    try {
      const dirs = await window.fileSystem.openDirectoryDialog()
      if (dirs && dirs.length > 0) {
        setInstallPath(dirs[0])
      }
    } catch (err) {
      setError(`${t('error.generic')}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  let installLabel = t('plugin.inspect')
  if (manifestPreview) installLabel = t('plugin.install')
  if (installing) installLabel = t('scheduled.loading')

  return (
    <Modal isOpen={isOpen} onClose={onClose} embedded={embedded} className="max-w-[620px] p-5">
      {/* Header */}
      <div className="flex items-start gap-3 border-b border-border pb-4">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-[#7b68ee]/30 bg-[#7b68ee]/15 text-[#7b68ee] shadow-sm shadow-[#7b68ee]/20 dark:text-[#9d8ff5]">
          <Blocks size={18} strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1 pr-6">
          <h2 className="text-base font-semibold tracking-tight text-foreground">{t('plugin.title')}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">管理、安装与配置 Obsidian 生态与第三方社区插件</p>
        </div>
      </div>

      <div ref={contentRef} className="space-y-3.5 pt-4">
        {showMarketplace && (
          <div className="space-y-2 rounded-lg border border-border bg-card p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">Plugin Marketplace</span>
              <Button variant="ghost" size="sm" onClick={() => setShowMarketplace(false)} className="h-6 px-2 text-xs">
                Back
              </Button>
            </div>
            {marketplace.map((entry) => (
              <div key={entry.id} className="rounded-md border border-border bg-background p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-foreground">{entry.name}</div>
                    <div className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{entry.description}</div>
                    <div className="mt-1 font-mono text-[10px] text-muted-foreground">
                      v{entry.version} · {entry.author}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={entry.installed ? 'secondary' : 'accent'}
                    disabled={entry.installed}
                    onClick={() => installMarketplacePlugin(entry)}
                    className="shrink-0 text-xs"
                  >
                    {entry.installed ? 'Installed' : 'Install'}
                  </Button>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {entry.permissions.map((permission) => (
                    <span
                      key={permission}
                      className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground"
                    >
                      {permission}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
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
            <CheckCircle2 size={15} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground">
            <Loader2 size={20} className="animate-spin text-[#7b68ee]" />
            <span className="text-xs">{t('scheduled.loading')}</span>
          </div>
        )}

        {/* Sub-view: Install Plugin */}
        {!showMarketplace && !loading && subView === 'install' && (
          <div className="space-y-3.5 rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="text-xs font-semibold text-foreground">{t('plugin.install')}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSubView('list')
                  setManifestPreview(null)
                  setTrustPlugin(false)
                }}
                className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                返回列表
              </Button>
            </div>

            <div className="space-y-1">
              <label htmlFor="plugin-install-path" className="block text-xs font-medium text-foreground">
                {t('plugin.installPath')}
              </label>
              <div className="flex items-center gap-2">
                <Input
                  id="plugin-install-path"
                  placeholder="/path/to/plugin/directory"
                  value={installPath}
                  onChange={(e) => {
                    setInstallPath(e.target.value)
                    setManifestPreview(null)
                    setTrustPlugin(false)
                  }}
                  disabled={installing || inspecting}
                  className="h-8 border-border bg-background font-mono text-xs text-foreground"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleBrowse}
                  disabled={installing || inspecting}
                  className="h-8 shrink-0 gap-1 border-border px-2.5"
                >
                  <FolderOpen size={13} />
                  <span>{t('obsidianCompat.browse')}</span>
                </Button>
              </div>
            </div>

            {manifestPreview && (
              <div className="space-y-2.5 rounded-lg border border-border bg-muted/40 p-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">
                    {manifestPreview.name}{' '}
                    <span className="font-normal text-muted-foreground">v{manifestPreview.version}</span>
                  </span>
                  {manifestPreview.author && (
                    <span className="text-[11px] text-muted-foreground">By {manifestPreview.author}</span>
                  )}
                </div>
                {manifestPreview.description && (
                  <p className="text-[11px] leading-relaxed text-foreground">{manifestPreview.description}</p>
                )}
                <div className="flex items-start gap-1.5 rounded border border-amber-500/20 bg-amber-500/10 p-2 text-[11px] text-amber-600 dark:text-amber-200">
                  <ShieldAlert size={14} className="mt-0.5 shrink-0 text-amber-500" />
                  <span>{t('plugin.trustWarning')}</span>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <Checkbox
                    id="trust-confirm"
                    checked={trustPlugin}
                    onCheckedChange={(checked) => setTrustPlugin(Boolean(checked))}
                    label={t('plugin.trustConfirm')}
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 border-t border-border pt-2">
              <div className="flex items-center gap-1.5">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowMarketplace(true)}
                  className="h-7 gap-1 border-border px-2.5 text-xs"
                >
                  <Store size={12} />
                  <span>Marketplace</span>
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSubView('list')}
                  disabled={installing || inspecting}
                >
                  {t('button.cancel')}
                </Button>
                <Button
                  variant="accent"
                  size="sm"
                  onClick={handleInstall}
                  disabled={installing || inspecting || !installPath.trim() || Boolean(manifestPreview && !trustPlugin)}
                  className="gap-1.5"
                >
                  {(installing || inspecting) && <Loader2 size={12} className="animate-spin" />}
                  <span>{installLabel}</span>
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Sub-view: Plugin Detail */}
        {!showMarketplace && !loading && subView === 'detail' && selectedPlugin && (
          <div className="space-y-3.5 rounded-lg border border-border bg-card p-4 text-xs">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">{selectedPlugin.name}</span>
                <span className="py-0.2 rounded border border-border bg-muted/40 px-1.5 font-mono text-[10px] text-muted-foreground">
                  v{selectedPlugin.version}
                </span>
                <span
                  className={cn(
                    'rounded px-1.5 py-0.2 text-[10px] font-mono',
                    selectedPlugin.enabled
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-500/20'
                      : 'bg-muted/40 text-muted-foreground border border-border',
                  )}
                >
                  {selectedPlugin.enabled ? t('plugin.enabled') : t('plugin.disabled')}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSubView('list')}
                className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                返回列表
              </Button>
            </div>

            {selectedPlugin.description && (
              <p className="leading-relaxed text-foreground">{selectedPlugin.description}</p>
            )}

            <div className="space-y-1 text-[11px] text-muted-foreground">
              {selectedPlugin.author && (
                <div>
                  <strong className="text-foreground">{t('plugin.byAuthor')}:</strong> {selectedPlugin.author}
                </div>
              )}
              <div>
                <strong className="text-foreground">ID:</strong> <span className="font-mono">{selectedPlugin.id}</span>
              </div>
            </div>

            {/* Permissions */}
            <div className="space-y-1.5 border-t border-border pt-2">
              <span className="block font-medium text-foreground">{t('plugin.permissions')}</span>
              <div className="flex flex-wrap gap-1">
                {(selectedPlugin.permissions?.length ? selectedPlugin.permissions : [t('plugin.noPermissions')]).map(
                  (perm) => (
                    <span
                      key={perm}
                      className="rounded border border-border bg-muted/40 px-2 py-0.5 font-mono text-[10px] text-muted-foreground"
                    >
                      {perm}
                    </span>
                  ),
                )}
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-border pt-3">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setSubView('uninstall')}
                className="gap-1.5 text-xs"
              >
                <Trash2 size={13} />
                <span>{t('plugin.uninstall')}</span>
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setSubView('list')}>
                {t('button.close')}
              </Button>
            </div>
          </div>
        )}

        {/* Sub-view: Uninstall Confirm */}
        {!showMarketplace && !loading && subView === 'uninstall' && selectedPlugin && (
          <div className="space-y-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-xs">
            <span className="block border-b border-red-500/20 pb-1 font-semibold text-red-600 dark:text-red-200">
              {t('plugin.uninstallConfirm')}
            </span>
            <p className="leading-relaxed text-foreground">
              {t('plugin.uninstallWarning', { name: selectedPlugin.name })}
            </p>
            <div className="flex items-center justify-end gap-2 border-t border-red-500/20 pt-2">
              <Button variant="secondary" size="sm" onClick={() => setSubView('detail')}>
                {t('button.cancel')}
              </Button>
              <Button variant="destructive" size="sm" onClick={() => handleUninstall(selectedPlugin)}>
                {t('plugin.uninstall')}
              </Button>
            </div>
          </div>
        )}

        {/* Default View: Plugins List */}
        {!showMarketplace && !loading && subView === 'list' && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-1 text-xs">
              <span className="font-medium text-muted-foreground">已安装插件 ({plugins.length})</span>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowMarketplace(true)}
                  className="h-7 gap-1 border-border px-2.5 text-xs"
                >
                  <Store size={12} />
                  <span>Marketplace</span>
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setSubView('install')
                    setInstallPath('')
                    setManifestPreview(null)
                    setTrustPlugin(false)
                  }}
                  className="h-7 gap-1 border-border bg-secondary px-2.5 text-xs text-foreground hover:bg-secondary/80"
                >
                  <Plus size={12} />
                  <span>{t('plugin.install')}</span>
                </Button>
              </div>
            </div>

            {plugins.length === 0 ? (
              <div className="rounded-lg border border-border bg-card px-4 py-8 text-center">
                <div className="mx-auto mb-2 flex size-11 items-center justify-center rounded-xl border border-border bg-muted/40 text-muted-foreground">
                  <Blocks size={22} />
                </div>
                <h3 className="text-xs font-semibold text-foreground">{t('plugin.noPlugins')}</h3>
                <p className="mx-auto mt-1 max-w-xs text-[11px] leading-relaxed text-muted-foreground">
                  {t('plugin.emptyHint')}
                </p>
              </div>
            ) : (
              <div ref={listRef} className="custom-scrollbar max-h-80 space-y-1.5 overflow-y-auto pr-1">
                {plugins.map((plugin) => (
                  <div
                    key={plugin.id}
                    className="plugin-card-item rounded-lg border border-border bg-card p-3 text-xs transition-colors hover:border-border/80"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-semibold text-foreground">{plugin.name}</span>
                          <span className="py-0.2 rounded border border-border bg-muted/40 px-1.5 font-mono text-[10px] text-muted-foreground">
                            v{plugin.version}
                          </span>
                          <span
                            className={cn(
                              'rounded px-1.5 py-0.2 text-[10px] font-mono',
                              plugin.enabled
                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-500/20'
                                : 'bg-muted/40 text-muted-foreground border border-border',
                            )}
                          >
                            {plugin.enabled ? t('plugin.enabled') : t('plugin.disabled')}
                          </span>
                        </div>
                        {plugin.description && (
                          <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
                            {plugin.description}
                          </p>
                        )}
                        {plugin.error && (
                          <div className="mt-1.5 rounded border border-red-500/30 bg-red-500/10 p-1.5 text-[10px] text-red-600 dark:text-red-300">
                            {plugin.error}
                          </div>
                        )}
                      </div>

                      <div className="flex shrink-0 items-center gap-1.5 pt-0.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedPlugin(plugin)
                            setSubView('detail')
                          }}
                          className="size-7 p-0 text-muted-foreground hover:text-foreground"
                          aria-label={`${plugin.name}: Details`}
                          title="查看详情"
                        >
                          <Info size={14} />
                        </Button>
                        <Switch
                          checked={plugin.enabled}
                          onCheckedChange={() => handleToggle(plugin)}
                          title={plugin.enabled ? t('plugin.disabled') : t('plugin.enabled')}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-2 flex items-center justify-end gap-2.5 border-t border-border pt-4">
        <Button variant="secondary" size="sm" onClick={onClose} className="text-xs">
          {t('button.close')}
        </Button>
      </div>
    </Modal>
  )
}

export default PluginManagerModal
