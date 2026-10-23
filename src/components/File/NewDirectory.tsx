import React, { useEffect, useState } from 'react'
import { FolderPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import posthog from 'posthog-js'
import { toast } from 'react-toastify'
import ReorModal from '../Common/Modal'
import { getInvalidCharacterInFilePath } from '@/lib/file'
import { useFileContext } from '@/contexts/FileContext'
import { useTranslation } from '@/lib/i18n'

interface NewDirectoryComponentProps {
  isOpen: boolean
  onClose: () => void
  parentDirectoryPath?: string
}

const NewDirectoryComponent: React.FC<NewDirectoryComponentProps> = ({ isOpen, onClose, parentDirectoryPath }) => {
  const [directoryRelativePath, setDirectoryRelativePath] = useState<string>('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  const { selectedDirectory } = useFileContext()
  const { t } = useTranslation()

  useEffect(() => {
    const setupInitialPath = async () => {
      const vaultDirectory = await window.electronStore.getVaultDirectoryForWindow()

      let fullPath = ''
      if (parentDirectoryPath) {
        fullPath = parentDirectoryPath
      } else if (selectedDirectory) {
        fullPath = selectedDirectory
      }

      if (fullPath) {
        const relativePath = await window.path.relative(vaultDirectory, fullPath)
        const pathWithSeparator = relativePath ? `${relativePath}${await window.path.pathSep()}` : ''
        setDirectoryRelativePath(pathWithSeparator)
      }
    }

    if (isOpen) {
      setupInitialPath()
    }
  }, [isOpen, parentDirectoryPath, selectedDirectory])

  useEffect(() => {
    if (!isOpen) {
      setDirectoryRelativePath('')
      setErrorMessage(null)
    }
  }, [isOpen])

  const handleValidName = async (name: string) => {
    const invalidCharacters = await getInvalidCharacterInFilePath(name)
    if (invalidCharacters) {
      setErrorMessage(t('file.invalidName', { character: invalidCharacters }))
      return false
    }
    setErrorMessage(null)
    return true
  }

  const handleNameChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value
    await handleValidName(newName)
    setDirectoryRelativePath(newName)
  }

  const createNewDirectory = async () => {
    const validName = await handleValidName(directoryRelativePath)
    if (!directoryRelativePath.trim() || errorMessage || !validName || isCreating) return

    setIsCreating(true)
    try {
      const directoryPath = await window.electronStore.getVaultDirectoryForWindow()
      const finalPath = await window.path.join(directoryPath, directoryRelativePath.trim())
      await window.fileSystem.createDirectory(finalPath)
      posthog.capture('created_new_directory_from_new_directory_modal')
      onClose()
    } catch (error) {
      toast.error(String(error))
    } finally {
      setIsCreating(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      createNewDirectory()
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <ReorModal isOpen={isOpen} onClose={onClose} className="max-w-[420px] p-5">
      <div className="flex items-start gap-3 pb-3 border-b border-border">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-[#7b68ee]/30 bg-[#7b68ee]/15 text-[#7b68ee] dark:text-[#9d8ff5] shadow-sm shadow-[#7b68ee]/20">
          <FolderPlus size={18} strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1 pr-6">
          <h2 className="text-sm font-semibold text-foreground tracking-tight">{t('file.newDirectoryTitle')}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">在当前工作空间建立新文件夹分类</p>
        </div>
      </div>

      <div className="pt-3.5 space-y-3">
        <div className="space-y-1">
          <Input
            aria-label={t('file.newDirectoryTitle')}
            value={directoryRelativePath}
            onChange={handleNameChange}
            onKeyDown={handleKeyDown}
            placeholder="例如：Projects/Notes"
            disabled={isCreating}
            autoFocus
            className="h-8 bg-background border-border text-foreground text-xs focus:border-[#7b68ee] font-mono"
          />
          {errorMessage && <p className="text-[11px] text-red-400 pt-0.5">{errorMessage}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={isCreating} className="text-xs">
            {t('button.cancel')}
          </Button>
          <Button
            variant="accent"
            size="sm"
            onClick={createNewDirectory}
            disabled={isCreating || !directoryRelativePath.trim() || Boolean(errorMessage)}
            className="text-xs shadow-md shadow-[#7b68ee]/25"
          >
            {t('file.createDirectory')}
          </Button>
        </div>
      </div>
    </ReorModal>
  )
}

export default NewDirectoryComponent
