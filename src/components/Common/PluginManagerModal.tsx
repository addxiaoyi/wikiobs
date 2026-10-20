import React, { useState, useEffect, useRef, useCallback } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import TextField from '@mui/material/TextField'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Switch from '@mui/material/Switch'
import FormControlLabel from '@mui/material/FormControlLabel'
import LinearProgress from '@mui/material/LinearProgress'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Alert from '@mui/material/Alert'
import Chip from '@mui/material/Chip'
import Checkbox from '@mui/material/Checkbox'
import Divider from '@mui/material/Divider'
import gsap from 'gsap'
import { Info, X } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'
import { staggerFadeInUp, fadeInScale } from '@/lib/gsap-animations'

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
}

const PluginManagerModal: React.FC<PluginManagerModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation()
  const [plugins, setPlugins] = useState<Plugin[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [showInstallDialog, setShowInstallDialog] = useState(false)
  const [installPath, setInstallPath] = useState('')
  const [installing, setInstalling] = useState(false)
  const [inspecting, setInspecting] = useState(false)
  const [manifestPreview, setManifestPreview] = useState<PluginManifestPreview | null>(null)
  const [trustPlugin, setTrustPlugin] = useState(false)
  const [detailPlugin, setDetailPlugin] = useState<Plugin | null>(null)
  const [uninstallTarget, setUninstallTarget] = useState<Plugin | null>(null)

  const contentRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const successRef = useRef<HTMLDivElement>(null)
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showSuccess = (message: string) => {
    if (successTimerRef.current) clearTimeout(successTimerRef.current)
    setSuccessMsg(message)
    successTimerRef.current = setTimeout(() => {
      setSuccessMsg(null)
      successTimerRef.current = null
    }, 3000)
  }

  useEffect(
    () => () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current)
    },
    [],
  )

  const installDialogRef = useRef<HTMLDivElement>(null)
  const detailRef = useRef<HTMLDivElement>(null)

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

  useEffect(() => {
    if (isOpen) {
      loadPlugins()
    } else {
      setShowInstallDialog(false)
      setDetailPlugin(null)
      setUninstallTarget(null)
      setManifestPreview(null)
      setTrustPlugin(false)
      setError(null)
      setSuccessMsg(null)
    }
  }, [isOpen, loadPlugins])

  // GSAP: plugin cards stagger
  useEffect(() => {
    if (!isOpen || loading || !listRef.current) return
    const list = listRef.current
    const ctx = gsap.context(() => {
      const items = list.querySelectorAll('.plugin-card')
      if (items.length) {
        staggerFadeInUp(items, 0.3, 0.04, 0.1)
      }
    }, listRef)
    return () => ctx.revert()
  }, [isOpen, loading, plugins])

  // GSAP: success message
  useEffect(() => {
    if (successMsg && successRef.current) {
      const ctx = gsap.context(() => {
        fadeInScale(successRef.current, 0.4, 0)
      }, successRef)
      return () => ctx.revert()
    }
  }, [successMsg])

  // GSAP: install dialog form
  useEffect(() => {
    if (showInstallDialog && installDialogRef.current) {
      const dialog = installDialogRef.current
      const ctx = gsap.context(() => {
        const items = dialog.querySelectorAll('.plugin-install-form-item')
        if (items.length) {
          staggerFadeInUp(items, 0.3, 0.06, 0.1)
        }
      }, installDialogRef)
      return () => ctx.revert()
    }
  }, [showInstallDialog])

  // GSAP: detail view
  useEffect(() => {
    if (detailPlugin && detailRef.current) {
      const ctx = gsap.context(() => {
        fadeInScale(detailRef.current, 0.4, 0)
      }, detailRef)
      return () => ctx.revert()
    }
  }, [detailPlugin])

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
      setShowInstallDialog(false)
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
      setDetailPlugin(null)
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

  const handleClose = () => {
    if (!installing) onClose()
  }

  const closeInstallDialog = () => {
    if (installing || inspecting) return
    setShowInstallDialog(false)
    setManifestPreview(null)
    setTrustPlugin(false)
    setError(null)
  }

  const getStatusColor = (enabled: boolean) => (enabled ? 'success' : 'default')
  let installButtonLabel = t('plugin.inspect')
  if (installing) installButtonLabel = t('scheduled.loading')
  else if (manifestPreview) installButtonLabel = t('plugin.install')

  return (
    <Dialog open={isOpen} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1 }}>
        {t('plugin.title')}
        <IconButton onClick={handleClose} aria-label={t('button.close')} title={t('button.close')} size="small">
          <X size={16} />
        </IconButton>
      </DialogTitle>
      <DialogContent ref={contentRef}>
        {error && (
          <Box mb={2}>
            <Alert
              severity="error"
              onClose={() => setError(null)}
              action={
                installPath.trim() ? (
                  <Button
                    color="inherit"
                    size="small"
                    onClick={handleInstall}
                    disabled={installing}
                    aria-label={t('button.retry')}
                  >
                    {t('button.retry')}
                  </Button>
                ) : undefined
              }
            >
              {error}
            </Alert>
          </Box>
        )}

        {successMsg && (
          <Box ref={successRef} mb={2}>
            <Alert severity="success" onClose={() => setSuccessMsg(null)}>
              {successMsg}
            </Alert>
          </Box>
        )}

        {loading && (
          <Box py={4}>
            <LinearProgress />
            <Typography variant="body2" color="text.secondary" align="center" mt={2}>
              {t('scheduled.loading')}
            </Typography>
          </Box>
        )}

        {!loading && plugins.length === 0 && (
          <Box py={4} px={2} textAlign="center">
            <Typography variant="body1" color="text.primary" fontWeight={600} gutterBottom>
              {t('plugin.noPlugins')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420, mx: 'auto' }}>
              {t('plugin.emptyHint')}
            </Typography>
          </Box>
        )}

        {!loading && plugins.length > 0 && (
          <Box ref={listRef} mt={1} display="flex" flexDirection="column" gap={1}>
            {plugins.map((plugin) => (
              <Card
                key={plugin.id}
                className="plugin-card"
                variant="outlined"
                role="group"
                tabIndex={0}
                aria-label={plugin.name}
                sx={{ cursor: 'pointer' }}
                onClick={() => setDetailPlugin(plugin)}
                onKeyDown={(event) => {
                  if (event.target !== event.currentTarget) return
                  if (event.key !== 'Enter' && event.key !== ' ') return
                  event.preventDefault()
                  setDetailPlugin(plugin)
                }}
              >
                <CardContent sx={{ pb: 1, '&:last-child': { pb: 1 } }}>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                    <Box flex={1}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="subtitle2" fontWeight="bold">
                          {plugin.name}
                        </Typography>
                        <Chip label={`v${plugin.version}`} size="small" variant="outlined" />
                        <Chip
                          label={plugin.enabled ? t('plugin.enabled') : t('plugin.disabled')}
                          color={getStatusColor(plugin.enabled)}
                          size="small"
                        />
                      </Box>
                      {plugin.description && (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          mt={0.5}
                          sx={{ lineClamp: 2, overflow: 'hidden', textOverflow: 'ellipsis' }}
                        >
                          {plugin.description}
                        </Typography>
                      )}
                      {plugin.author && (
                        <Typography variant="caption" color="text.secondary" mt={0.5} display="block">
                          {t('plugin.byAuthor')}: {plugin.author}
                        </Typography>
                      )}
                      {plugin.error && (
                        <Alert severity="error" sx={{ mt: 1, py: 0.25 }}>
                          {t('plugin.activationFailed')}: {plugin.error}
                        </Alert>
                      )}
                    </Box>
                    <IconButton
                      size="small"
                      onClick={(event) => {
                        event.stopPropagation()
                        setDetailPlugin(plugin)
                      }}
                      title={`${t('plugin.title')}: ${plugin.name}`}
                      aria-label={`${t('plugin.title')}: ${plugin.name}`}
                    >
                      <Info size={16} aria-hidden="true" />
                    </IconButton>
                    <FormControlLabel
                      control={
                        <Switch
                          size="small"
                          checked={plugin.enabled}
                          inputProps={{ role: 'switch', 'aria-label': `${plugin.name}: ${t('plugin.enabled')}` }}
                          onChange={(e) => {
                            e.stopPropagation()
                            handleToggle(plugin)
                          }}
                        />
                      }
                      label=""
                      sx={{ mr: 0, ml: 1 }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}

        <Box mt={2} display="flex" justifyContent="flex-end">
          <Button
            variant="contained"
            onClick={() => {
              setShowInstallDialog(true)
              setInstallPath('')
              setManifestPreview(null)
              setTrustPlugin(false)
            }}
          >
            {t('plugin.install')}
          </Button>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>{t('button.close')}</Button>
      </DialogActions>

      {/* Install Dialog */}
      <Dialog open={showInstallDialog} onClose={closeInstallDialog} maxWidth="sm" fullWidth>
        <DialogTitle
          ref={installDialogRef}
          sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1 }}
        >
          {t('plugin.install')}
          <IconButton
            onClick={closeInstallDialog}
            aria-label={t('button.close')}
            title={t('button.close')}
            size="small"
          >
            <X size={16} />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box
            display="flex"
            gap={1}
            alignItems="flex-end"
            flexDirection={{ xs: 'column', sm: 'row' }}
            className="plugin-install-form-item"
          >
            <TextField
              fullWidth
              margin="normal"
              label={t('plugin.installPath')}
              value={installPath}
              onChange={(e) => {
                setInstallPath(e.target.value)
                setManifestPreview(null)
                setTrustPlugin(false)
              }}
              disabled={installing || inspecting}
              placeholder="/path/to/plugin/directory"
            />
            <Button
              variant="outlined"
              onClick={handleBrowse}
              disabled={installing || inspecting}
              sx={{
                mb: { xs: 0, sm: 1 },
                minWidth: 'auto',
                whiteSpace: 'nowrap',
                alignSelf: { xs: 'stretch', sm: 'auto' },
              }}
            >
              {t('obsidianCompat.browse')}
            </Button>
          </Box>
          {error && (
            <Alert severity="error" sx={{ mt: 2, overflowWrap: 'anywhere' }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
          {manifestPreview && (
            <Box mt={2} p={1.5} border="1px solid" borderColor="divider" borderRadius={1.5}>
              <Typography variant="subtitle2">
                {manifestPreview.name} v{manifestPreview.version}
              </Typography>
              {manifestPreview.description && (
                <Typography variant="body2" color="text.secondary" mt={0.5}>
                  {manifestPreview.description}
                </Typography>
              )}
              <Typography variant="caption" display="block" mt={1} color="warning.main">
                {t('plugin.trustWarning')}
              </Typography>
              <Typography variant="caption" display="block" mt={1}>
                {t('plugin.permissions')}
              </Typography>
              <Box display="flex" flexWrap="wrap" gap={0.5} mt={0.5}>
                {(manifestPreview.permissions.length ? manifestPreview.permissions : [t('plugin.noPermissions')]).map(
                  (permission) => (
                    <Chip key={permission} label={permission} size="small" variant="outlined" />
                  ),
                )}
              </Box>
              <FormControlLabel
                control={<Checkbox checked={trustPlugin} onChange={(event) => setTrustPlugin(event.target.checked)} />}
                label={t('plugin.trustConfirm')}
                sx={{ mt: 1, alignItems: 'flex-start' }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeInstallDialog} disabled={installing || inspecting}>
            {t('button.cancel')}
          </Button>
          <Button
            onClick={handleInstall}
            variant="contained"
            disabled={installing || inspecting || !installPath.trim() || Boolean(manifestPreview && !trustPlugin)}
          >
            {installButtonLabel}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Plugin Detail Dialog */}
      <Dialog open={!!detailPlugin} onClose={() => setDetailPlugin(null)} maxWidth="sm" fullWidth>
        {detailPlugin && (
          <>
            <DialogTitle
              ref={detailRef}
              sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1 }}
            >
              {detailPlugin.name}
              <IconButton
                onClick={() => setDetailPlugin(null)}
                aria-label={t('button.close')}
                title={t('button.close')}
                size="small"
              >
                <X size={16} />
              </IconButton>
            </DialogTitle>
            <DialogContent>
              <Box display="flex" gap={1} alignItems="center" mb={1}>
                <Chip label={`v${detailPlugin.version}`} size="small" variant="outlined" />
                <Chip
                  label={detailPlugin.enabled ? t('plugin.enabled') : t('plugin.disabled')}
                  color={getStatusColor(detailPlugin.enabled)}
                  size="small"
                />
              </Box>

              {detailPlugin.description && (
                <Typography variant="body2" color="text.secondary" mb={2}>
                  {detailPlugin.description}
                </Typography>
              )}

              {detailPlugin.author && (
                <Typography variant="body2" mb={1}>
                  <strong>{t('plugin.byAuthor')}:</strong> {detailPlugin.author}
                </Typography>
              )}

              <Typography variant="body2" mb={1}>
                <strong>ID:</strong> {detailPlugin.id}
              </Typography>

              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2" gutterBottom>
                {t('plugin.permissions')}
              </Typography>
              <Box display="flex" flexWrap="wrap" gap={0.5}>
                {(detailPlugin.permissions?.length ? detailPlugin.permissions : [t('plugin.noPermissions')]).map(
                  (permission) => (
                    <Chip key={permission} label={permission} size="small" variant="outlined" />
                  ),
                )}
              </Box>

              {detailPlugin.settings && Object.keys(detailPlugin.settings).length > 0 && (
                <>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="subtitle2" gutterBottom>
                    {t('plugin.settings')}
                  </Typography>
                  {Object.entries(detailPlugin.settings).map(([key, value]) => (
                    <Typography key={key} variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                      {key}: {String(value)}
                    </Typography>
                  ))}
                </>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDetailPlugin(null)}>{t('button.close')}</Button>
              <Button onClick={() => setUninstallTarget(detailPlugin)} variant="contained" color="error">
                {t('plugin.uninstall')}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      <Dialog open={Boolean(uninstallTarget)} onClose={() => setUninstallTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('plugin.uninstallConfirm')}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            {uninstallTarget ? t('plugin.uninstallWarning', { name: uninstallTarget.name }) : ''}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUninstallTarget(null)}>{t('button.cancel')}</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              if (!uninstallTarget) return
              const target = uninstallTarget
              setUninstallTarget(null)
              handleUninstall(target)
            }}
          >
            {t('plugin.uninstall')}
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  )
}

export default PluginManagerModal
