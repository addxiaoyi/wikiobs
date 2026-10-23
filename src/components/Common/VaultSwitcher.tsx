import React, { useState, useEffect, useCallback } from 'react'
import { toast } from 'react-toastify'
import { Check, LibraryBig, Settings2, Folder } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/ui'

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
  const [open, setOpen] = useState(false)

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

  const handleSwitch = async (vault: Vault) => {
    try {
      await window.multiVault.switch(vault.id)
      setCurrentVaultId(vault.id)
    } catch {
      toast.error(t('error.generic'))
    }
    setOpen(false)
  }

  const handleManage = () => {
    setOpen(false)
    onOpenManagement()
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          id="vault-switcher-button"
          className="icons-sidebar-button flex size-8 items-center justify-center rounded-md transition-colors hover:text-foreground"
          title={currentVault ? `${t('vault.current')}: ${currentVault.name}` : t('vault.manage')}
          aria-label={currentVault ? `${t('vault.current')}: ${currentVault.name}` : t('vault.manage')}
          type="button"
        >
          <span className="flex size-5 items-center justify-center rounded border border-border bg-secondary text-[11px] font-semibold text-foreground shadow-sm transition-transform hover:scale-105 leading-none">
            {currentVault ? currentVault.name.charAt(0).toUpperCase() : <LibraryBig size={12} aria-hidden="true" />}
          </span>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        side="right"
        className="w-64 border-border bg-popover/98 text-popover-foreground p-1.5 shadow-2xl backdrop-blur-2xl"
      >
        <DropdownMenuLabel className="px-2 py-1.5">
          <div className="text-[11px] font-medium text-muted-foreground">{t('vault.title')}</div>
          {currentVault && (
            <div className="mt-1">
              <div className="text-xs font-semibold text-foreground truncate">{currentVault.name}</div>
              <div className="text-[10px] text-muted-foreground font-mono truncate" title={currentVault.path}>
                {currentVault.path}
              </div>
            </div>
          )}
        </DropdownMenuLabel>

        <DropdownMenuSeparator className="bg-border" />

        {vaults.length === 0 ? (
          <div className="px-3 py-3 text-center text-xs text-muted-foreground">
            <LibraryBig size={16} className="mx-auto mb-1 text-muted-foreground" />
            <div>{t('vault.noVaults')}</div>
          </div>
        ) : (
          <div className="max-h-56 overflow-y-auto space-y-0.5 custom-scrollbar">
            {vaults.map((vault) => {
              const isSelected = vault.id === currentVaultId
              return (
                <DropdownMenuItem
                  key={vault.id}
                  onClick={() => handleSwitch(vault)}
                  className={cn(
                    'flex items-center justify-between gap-2 rounded px-2 py-1.5 text-xs transition-colors cursor-pointer',
                    isSelected ? 'bg-[#7b68ee]/20 text-[#7b68ee] dark:text-[#a29bfe] font-medium' : 'text-foreground hover:bg-accent hover:text-foreground',
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span
                      className={cn(
                        'flex size-5 shrink-0 items-center justify-center rounded text-[10px] font-bold',
                        isSelected ? 'bg-[#7b68ee] text-white' : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {vault.name.charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate">{vault.name}</div>
                      {vault.isDefault && (
                        <span className="text-[10px] text-muted-foreground">{t('vault.default')}</span>
                      )}
                    </div>
                  </div>
                  {isSelected && <Check size={14} className="text-[#7b68ee] shrink-0" />}
                </DropdownMenuItem>
              )
            })}
          </div>
        )}

        <DropdownMenuSeparator className="bg-border" />

        <DropdownMenuItem
          onClick={handleManage}
          className="flex items-center gap-2 rounded px-2 py-1.5 text-xs text-foreground hover:bg-accent hover:text-foreground cursor-pointer"
        >
          <Settings2 size={13} className="text-muted-foreground" />
          <span>{t('vault.manage')}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default VaultSwitcher
