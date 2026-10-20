import React, { useState, useEffect, useCallback } from 'react'
import { toast } from 'react-toastify'
import Button from '@mui/material/Button'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Divider from '@mui/material/Divider'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import { Check, LibraryBig } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'

interface Vault {
  id: string
  name: string
  path: string
  isDefault: boolean
  createdAt: string
  lastOpened?: string
}

interface VaultSwitcherProps {
  onOpenManagement: () => void
}

const VaultSwitcher: React.FC<VaultSwitcherProps> = ({ onOpenManagement }) => {
  const { t } = useTranslation()
  const [vaults, setVaults] = useState<Vault[]>([])
  const [currentVaultId, setCurrentVaultId] = useState<string | null>(null)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)

  const loadVaults = useCallback(async () => {
    try {
      const [result, current] = await Promise.all([window.multiVault.getAll(), window.multiVault.current()])
      setVaults(result || [])
      setCurrentVaultId(current?.id || null)
    } catch (error) {
      toast.error(`${t('error.generic')}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }, [t])

  useEffect(() => {
    loadVaults()
  }, [loadVaults])

  const currentVault = vaults.find((v) => v.id === currentVaultId)

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleSwitch = async (vault: Vault) => {
    try {
      await window.multiVault.switch(vault.id)
      setCurrentVaultId(vault.id)
    } catch {
      toast.error(t('error.generic'))
    }
    handleClose()
  }

  const handleManage = () => {
    handleClose()
    onOpenManagement()
  }

  return (
    <>
      <Button
        id="vault-switcher-button"
        onClick={handleClick}
        size="small"
        variant="text"
        sx={{
          minWidth: 0,
          width: 40,
          height: 40,
          p: 0,
          color: 'text.secondary',
          '&:hover': { bgcolor: 'action.hover' },
          position: 'relative',
        }}
        title={currentVault ? `${t('vault.current')}: ${currentVault.name}` : t('vault.manage')}
        aria-label={currentVault ? `${t('vault.current')}: ${currentVault.name}` : t('vault.manage')}
      >
        <Box
          sx={{
            width: 24,
            height: 24,
            borderRadius: '4px',
            bgcolor: currentVault ? 'primary.main' : 'action.disabledBackground',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: 'bold',
            color: '#fff',
            lineHeight: 1,
          }}
        >
          {currentVault ? currentVault.name.charAt(0).toUpperCase() : <LibraryBig size={14} aria-hidden="true" />}
        </Box>
      </Button>

      <Menu
        id="vault-switcher-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        PaperProps={{
          sx: {
            minWidth: 240,
            maxHeight: 360,
            ml: 0.5,
            bgcolor: '#1d2129',
            color: '#e2e8f0',
            border: '1px solid rgba(148, 163, 184, 0.18)',
            boxShadow: '0 18px 40px rgba(0,0,0,0.35)',
          },
        }}
      >
        <Box px={2} py={1}>
          <Typography variant="caption" sx={{ color: '#94a3b8' }} fontWeight="bold">
            {t('vault.title')}
          </Typography>
          {currentVault && (
            <>
              <Typography variant="caption" display="block" sx={{ color: '#e2e8f0', mt: 0.5 }}>
                {currentVault.name}
              </Typography>
              <Typography
                variant="caption"
                display="block"
                title={currentVault.path}
                sx={{ color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              >
                {currentVault.path}
              </Typography>
            </>
          )}
        </Box>
        <Divider />

        {vaults.length === 0 ? (
          <Box px={2} py={2} sx={{ color: '#94a3b8' }}>
            <Box display="flex" alignItems="center" gap={1} mb={0.75}>
              <LibraryBig size={16} aria-hidden="true" />
              <Typography variant="body2" sx={{ color: '#e2e8f0', fontWeight: 600 }}>
                {t('vault.noVaults')}
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ color: '#94a3b8' }}>
              {t('vault.create')}
            </Typography>
          </Box>
        ) : (
          vaults.map((vault) => (
            <MenuItem key={vault.id} selected={vault.id === currentVaultId} onClick={() => handleSwitch(vault)} dense>
              <ListItemIcon sx={{ minWidth: 28 }}>
                <Box
                  sx={{
                    width: 20,
                    height: 20,
                    borderRadius: '3px',
                    bgcolor: vault.id === currentVaultId ? 'primary.main' : 'action.disabledBackground',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    color: '#fff',
                  }}
                >
                  {vault.name.charAt(0).toUpperCase()}
                </Box>
              </ListItemIcon>
              <ListItemText
                primary={vault.name}
                primaryTypographyProps={{
                  variant: 'body2',
                  fontWeight: vault.id === currentVaultId ? 'bold' : 'normal',
                }}
                secondary={vault.isDefault ? t('vault.default') : undefined}
                secondaryTypographyProps={{ variant: 'caption' }}
              />
              {vault.id === currentVaultId && <Check size={14} aria-label={t('vault.current')} />}
            </MenuItem>
          ))
        )}

        <Divider />
        <MenuItem onClick={handleManage} dense>
          <ListItemText primary={t('vault.manage')} primaryTypographyProps={{ variant: 'body2' }} />
        </MenuItem>
      </Menu>
    </>
  )
}

export default VaultSwitcher
