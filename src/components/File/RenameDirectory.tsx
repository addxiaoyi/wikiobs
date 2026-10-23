import React, { useEffect, useState } from 'react'
import { FolderEdit, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'react-toastify'

import ReorModal from '../Common/Modal'

import { getInvalidCharacterInFileName } from '@/lib/file'
import { useFileContext } from '@/contexts/FileContext'
import { useTranslation } from '@/lib/i18n'

const RenameDirModal: React.FC = () => {
  const { t } = useTranslation()
  const { fileDirToBeRenamed, setFileDirToBeRenamed, renameFile } = useFileContext()
  const [isUpdatingDirName, setIsUpdatingDirName] = useState<boolean>(false)

  const [dirPrefix, setDirPrefix] = useState<string>('')
  const [dirName, setDirName] = useState<string>('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!fileDirToBeRenamed) return

    const setDirectoryUponNoteChange = async () => {
      const initialDirPathPrefix = await window.path.dirname(fileDirToBeRenamed)
      setDirPrefix(initialDirPathPrefix)
      const trimmedInitialDirName = await window.path.basename(fileDirToBeRenamed)
      setDirName(trimmedInitialDirName)
    }

    setDirectoryUponNoteChange()
  }, [fileDirToBeRenamed])

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value
    setDirName(newName)

    const invalidCharacter = getInvalidCharacterInFileName(newName)
    if (invalidCharacter) {
      setErrorMessage(t('file.invalidCharDir', { char: invalidCharacter }))
    } else {
      setErrorMessage(null)
    }
  }

  const onClose = () => {
    setDirPrefix('')
    setDirName('')
    setErrorMessage(null)
    setFileDirToBeRenamed('')
  }

  const sendDirRename = async () => {
    if (errorMessage) {
      return
    }
    if (!dirName) {
      toast.error(t('file.emptyDirName'), {
        className: 'mt-5',
        closeOnClick: false,
        draggable: false,
      })
      return
    }
    setIsUpdatingDirName(true)
    try {
      const newDirPath = await window.path.join(dirPrefix, dirName)
      await renameFile(fileDirToBeRenamed, newDirPath)
      onClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error))
    } finally {
      setIsUpdatingDirName(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isUpdatingDirName) {
      e.preventDefault()
      sendDirRename()
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <ReorModal isOpen={Boolean(fileDirToBeRenamed)} onClose={onClose} className="max-w-[420px] p-5">
      <div className="flex items-start gap-3 pb-3 border-b border-border">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-[#7b68ee]/30 bg-[#7b68ee]/15 text-[#7b68ee] dark:text-[#9d8ff5] shadow-sm shadow-[#7b68ee]/20">
          <FolderEdit size={18} strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1 pr-6">
          <h2 className="text-sm font-semibold text-foreground tracking-tight">{t('file.renameDirTitle')}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">输入文件夹的新名称，路径内所有子文件将保持相对关系</p>
        </div>
      </div>

      <div className="pt-3.5 space-y-3">
        <div className="space-y-1">
          <Input
            aria-label={t('file.renameDirTitle')}
            value={dirName}
            onChange={handleNameChange}
            onKeyDown={handleKeyDown}
            placeholder={t('file.renameDirTitle')}
            disabled={isUpdatingDirName}
            autoFocus
            className="h-8 bg-background border-border text-foreground text-xs focus:border-[#7b68ee]"
          />
          {errorMessage && <p className="text-[11px] text-red-400 pt-0.5">{errorMessage}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={isUpdatingDirName} className="text-xs">
            {t('button.cancel')}
          </Button>
          <Button
            variant="accent"
            size="sm"
            onClick={sendDirRename}
            disabled={isUpdatingDirName || !dirName.trim() || Boolean(errorMessage)}
            className="text-xs shadow-md shadow-[#7b68ee]/25 gap-1.5"
          >
            {isUpdatingDirName && <Loader2 size={12} className="animate-spin" />}
            <span>{t('file.renameBtn')}</span>
          </Button>
        </div>
      </div>
    </ReorModal>
  )
}

export default RenameDirModal
