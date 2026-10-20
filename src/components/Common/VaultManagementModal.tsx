import React, { useState, useEffect, useRef, useCallback } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'
import IconButton from '@mui/material/IconButton'
import LinearProgress from '@mui/material/LinearProgress'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Alert from '@mui/material/Alert'
import Chip from '@mui/material/Chip'
import gsap from 'gsap'
import { Clipboard, Pencil, Copy, Star, Trash2, X } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'
import { staggerFadeInUp, fadeInScale } from '@/lib/gsap-animations'

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
}

const VaultManagementModal: React.FC<VaultManagementModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation()
  const [vaults, setVaults] = useState<Vault[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [currentVaultId, setCurrentVaultId] = useState<string | null>(null)
  const [vaultQuery, setVaultQuery] = useState('')

  // Create dialog
  const [showCreate, setShowCreate] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createPath, setCreatePath] = useState('')
  const [creating, setCreating] = useState(false)

  // Rename dialog
  const [renameTarget, setRenameTarget] = useState<Vault | null>(null)
  const [renameName, setRenameName] = useState('')

  // Duplicate dialog
  const [dupTarget, setDupTarget] = useState<Vault | null>(null)
  const [dupPath, setDupPath] = useState('')

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<Vault | null>(null)
  const [dialogError, setDialogError] = useState<string | null>(null)

  const contentRef = useRef<HTMLDivElement>(null)
  const tableRef = useRef<HTMLDivElement>(null)
  const successRef = useRef<HTMLDivElement>(null)
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
      setVaultQuery('')
      successTimerRef.current = null
    }, 3000)
  }

  useEffect(
    () => () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current)
    },
    [],
  )

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
      setShowCreate(false)
      setCreateName('')
      setCreatePath('')
      setRenameTarget(null)
      setDupTarget(null)
      setDeleteTarget(null)
      setError(null)
      setSuccessMsg(null)
    }
  }, [isOpen, loadVaults])

  // GSAP: table rows
  useEffect(() => {
    if (!isOpen || loading || !tableRef.current) return
    const table = tableRef.current
    const ctx = gsap.context(() => {
      const rows = table.querySelectorAll('.vault-row')
      if (rows.length) {
        staggerFadeInUp(rows, 0.3, 0.04, 0.1)
      }
    }, tableRef)
    return () => ctx.revert()
  }, [isOpen, loading, vaults])

  // GSAP: success
  useEffect(() => {
    if (successMsg && successRef.current) {
      const ctx = gsap.context(() => {
        fadeInScale(successRef.current, 0.4, 0)
      }, successRef)
      return () => ctx.revert()
    }
  }, [successMsg])

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
    setCreating(true)
    setError(null)
    setDialogError(null)
    try {
      await window.multiVault.add({
        name: createName.trim(),
        path: createPath.trim(),
        isDefault: false,
      })
      setShowCreate(false)
      setCreateName('')
      setCreatePath('')
      showSuccess(t('vault.created'))
      await loadVaults()
    } catch (err) {
      setDialogError(`${t('error.generic')}: ${formatUiError(err)}`)
    } finally {
      setCreating(false)
    }
  }

  const closeCreateDialog = () => {
    if (creating) return
    setShowCreate(false)
    setCreateName('')
    setCreatePath('')
    setDialogError(null)
  }

  const handleRename = async () => {
    if (!renameTarget || !renameName.trim()) return
    try {
      const result = await window.multiVault.rename(renameTarget.id, renameName.trim())
      if (!result) throw new Error(t('error.generic'))
      setRenameTarget(null)
      showSuccess(t('vault.renamed'))
      await loadVaults()
    } catch (err) {
      setDialogError(`${t('error.generic')}: ${formatUiError(err)}`)
    }
  }

  const handleDuplicate = async () => {
    if (!dupTarget || !dupPath.trim()) return
    try {
      const result = await window.multiVault.duplicate(dupTarget.id, dupPath.trim())
      if (!result) throw new Error(t('error.generic'))
      setDupTarget(null)
      showSuccess(t('vault.duplicated'))
      await loadVaults()
    } catch (err) {
      setDialogError(`${t('error.generic')}: ${formatUiError(err)}`)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      const result = await window.multiVault.remove(deleteTarget.id)
      if (!result.success) throw new Error(t('error.generic'))
      setDeleteTarget(null)
      showSuccess(t('vault.deleted'))
      await loadVaults()
    } catch (err) {
      setError(`${t('error.generic')}: ${err}`)
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
      showSuccess(t('vault.pathCopied'))
    } catch (copyError) {
      setError(`${t('error.generic')}: ${copyError instanceof Error ? copyError.message : String(copyError)}`)
    }
  }

  const handleBrowse = async () => {
    try {
      const dirs = await window.fileSystem.openDirectoryDialog()
      if (dirs && dirs.length > 0) {
        setCreatePath(dirs[0])
      }
    } catch (err) {
      setError(`${t('error.generic')}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const handleClose = () => {
    if (!creating) onClose()
  }

  const filteredVaults = vaults.filter((vault) => {
    const query = vaultQuery.trim().toLocaleLowerCase()
    if (!query) return true
    return `${vault.name} ${vault.path}`.toLocaleLowerCase().includes(query)
  })

  const getCompactStatus = (vault: Vault) => {
    if (vault.id === currentVaultId) return t('vault.current')
    if (vault.lastOpened) return `${t('vault.lastOpened')}: ${new Date(vault.lastOpened).toLocaleDateString()}`
    return t('vault.neverOpened')
  }

  return (
    <Dialog open={isOpen} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1 }}>
        {t('vault.title')}
        <IconButton onClick={handleClose} aria-label={t('button.close')} title={t('button.close')} size="small">
          <X size={16} />
        </IconButton>
      </DialogTitle>
      <DialogContent ref={contentRef}>
        {error && (
          <Box mb={2}>
            <Alert severity="error" onClose={() => setError(null)}>
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

        {!loading && vaults.length === 0 && (
          <Box py={4} textAlign="center">
            <Typography variant="body1" color="text.secondary" gutterBottom>
              {t('vault.noVaults')}
            </Typography>
          </Box>
        )}

        {!loading && vaults.length > 0 && (
          <Box ref={tableRef} mt={1}>
            {vaults.length > 8 && (
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <TextField
                  size="small"
                  fullWidth
                  label={t('vault.search')}
                  value={vaultQuery}
                  onChange={(event) => setVaultQuery(event.target.value)}
                  inputProps={{ 'aria-label': t('vault.search') }}
                />
                <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                  {filteredVaults.length}/{vaults.length}
                </Typography>
              </Box>
            )}
            <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'hidden' }}>
              <Table size="small" sx={{ tableLayout: { xs: 'fixed', sm: 'auto' } }}>
                <TableHead>
                  <TableRow>
                    <TableCell>{t('vault.vaultName')}</TableCell>
                    <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>{t('vault.vaultPath')}</TableCell>
                    <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>{t('vault.status')}</TableCell>
                    <TableCell align="right" sx={{ width: { xs: '58%', sm: 'auto' } }}>
                      {t('vault.actions')}
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredVaults.map((vault) => (
                    <TableRow key={vault.id} className="vault-row" hover>
                      <TableCell sx={{ minWidth: 0 }}>
                        <Typography
                          variant="body2"
                          title={vault.name}
                          fontWeight={vault.id === currentVaultId ? 'bold' : 'normal'}
                          sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        >
                          {vault.name}
                          {vault.id === currentVaultId && (
                            <Chip label={t('vault.current')} size="small" color="primary" sx={{ ml: 1 }} />
                          )}
                          {vault.isDefault && vault.id !== currentVaultId && (
                            <Chip label={t('vault.default')} size="small" variant="outlined" sx={{ ml: 1 }} />
                          )}
                        </Typography>
                        <Typography
                          variant="caption"
                          display={{ xs: 'block', sm: 'none' }}
                          color={vault.id === currentVaultId ? 'primary.main' : 'text.secondary'}
                        >
                          {getCompactStatus(vault)}
                        </Typography>
                        <Typography
                          variant="caption"
                          display={{ xs: 'block', sm: 'none' }}
                          title={vault.path}
                          sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        >
                          {vault.path}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' }, maxWidth: 280 }}>
                        <Typography
                          variant="body2"
                          title={vault.path}
                          sx={{
                            fontFamily: 'monospace',
                            fontSize: '0.75rem',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {vault.path}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                        {vault.lastOpened ? (
                          <Typography variant="caption" color="text.secondary">
                            {new Date(vault.lastOpened).toLocaleDateString()}
                          </Typography>
                        ) : (
                          <Typography variant="caption" color="text.secondary">
                            {t('vault.neverOpened')}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        {vault.id !== currentVaultId && (
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => handleSwitch(vault)}
                            sx={{ mr: 0.5, minWidth: 'auto' }}
                          >
                            {t('vault.switch')}
                          </Button>
                        )}
                        <IconButton
                          size="small"
                          onClick={() => handleCopyPath(vault)}
                          title={t('vault.copyPath')}
                          aria-label={`${t('vault.copyPath')}: ${vault.name}`}
                        >
                          <Clipboard size={15} aria-hidden="true" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => {
                            setDialogError(null)
                            setRenameTarget(vault)
                            setRenameName(vault.name)
                          }}
                          title={t('vault.rename')}
                        >
                          <Pencil size={15} aria-hidden="true" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => {
                            setDialogError(null)
                            setDupTarget(vault)
                            setDupPath(`${vault.path}_copy`)
                          }}
                          title={t('vault.duplicate')}
                        >
                          <Copy size={15} aria-hidden="true" />
                        </IconButton>
                        {!vault.isDefault && (
                          <IconButton
                            size="small"
                            onClick={() => handleSetDefault(vault)}
                            title={t('vault.setDefault')}
                          >
                            <Star size={15} aria-hidden="true" />
                          </IconButton>
                        )}
                        {vault.id !== currentVaultId && (
                          <IconButton
                            size="small"
                            onClick={() => setDeleteTarget(vault)}
                            title={t('vault.delete')}
                            aria-label={`${t('vault.delete')}: ${vault.name}`}
                          >
                            <Trash2 size={15} aria-hidden="true" />
                          </IconButton>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredVaults.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        <Typography variant="body2" color="text.secondary">
                          {t('vault.noSearchResults')}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        <Box mt={2} display="flex" justifyContent="flex-end">
          <Button
            variant="contained"
            onClick={() => {
              setDialogError(null)
              setShowCreate(true)
            }}
          >
            {t('vault.create')}
          </Button>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>{t('button.close')}</Button>
      </DialogActions>

      {/* Create Dialog */}
      <Dialog open={showCreate} onClose={closeCreateDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1 }}>
          {t('vault.create')}
          <IconButton onClick={closeCreateDialog} aria-label={t('button.close')} title={t('button.close')} size="small">
            <X size={16} />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {dialogError && (
            <Alert severity="error" onClose={() => setDialogError(null)} sx={{ mt: 1, overflowWrap: 'anywhere' }}>
              {dialogError}
            </Alert>
          )}
          <TextField
            fullWidth
            margin="normal"
            label={t('vault.vaultName')}
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
            disabled={creating}
          />
          <Box
            display="flex"
            gap={1}
            flexDirection={{ xs: 'column', sm: 'row' }}
            alignItems={{ xs: 'stretch', sm: 'flex-end' }}
          >
            <TextField
              fullWidth
              margin="normal"
              label={t('vault.vaultPath')}
              value={createPath}
              onChange={(e) => setCreatePath(e.target.value)}
              disabled={creating}
            />
            <Button
              variant="outlined"
              onClick={handleBrowse}
              disabled={creating}
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
        </DialogContent>
        <DialogActions>
          <Button onClick={closeCreateDialog} disabled={creating}>
            {t('button.cancel')}
          </Button>
          <Button
            onClick={handleCreate}
            variant="contained"
            disabled={creating || !createName.trim() || !createPath.trim()}
          >
            {creating ? t('scheduled.saving') : t('button.save')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={!!renameTarget} onClose={() => setRenameTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1 }}>
          {t('vault.rename')}
          <IconButton
            onClick={() => {
              setDialogError(null)
              setRenameTarget(null)
            }}
            aria-label={t('button.close')}
            title={t('button.close')}
            size="small"
          >
            <X size={16} />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {dialogError && (
            <Alert severity="error" onClose={() => setDialogError(null)} sx={{ mt: 1, overflowWrap: 'anywhere' }}>
              {dialogError}
            </Alert>
          )}
          <TextField
            fullWidth
            margin="normal"
            label={t('vault.vaultName')}
            value={renameName}
            onChange={(e) => setRenameName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenameTarget(null)}>{t('button.cancel')}</Button>
          <Button onClick={handleRename} variant="contained" disabled={!renameName.trim()}>
            {t('button.save')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Duplicate Dialog */}
      <Dialog open={!!dupTarget} onClose={() => setDupTarget(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1 }}>
          {t('vault.duplicate')}
          <IconButton
            onClick={() => {
              setDialogError(null)
              setDupTarget(null)
            }}
            aria-label={t('button.close')}
            title={t('button.close')}
            size="small"
          >
            <X size={16} />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {dialogError && (
            <Alert severity="error" onClose={() => setDialogError(null)} sx={{ mt: 1, overflowWrap: 'anywhere' }}>
              {dialogError}
            </Alert>
          )}
          <TextField
            fullWidth
            margin="normal"
            label={t('vault.vaultPath')}
            value={dupPath}
            onChange={(e) => setDupPath(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDupTarget(null)}>{t('button.cancel')}</Button>
          <Button onClick={handleDuplicate} variant="contained" disabled={!dupPath.trim()}>
            {t('vault.duplicate')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1 }}>
          {t('vault.deleteConfirm')}
          <IconButton
            onClick={() => setDeleteTarget(null)}
            aria-label={t('button.close')}
            title={t('button.close')}
            size="small"
          >
            <X size={16} />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            {t('vault.deleteWarning')}
          </Typography>
          {deleteTarget && (
            <Typography variant="body1" fontWeight="bold" mt={1}>
              {deleteTarget.name}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>{t('button.cancel')}</Button>
          <Button onClick={handleDelete} variant="contained" color="error">
            {t('vault.delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  )
}

export default VaultManagementModal
