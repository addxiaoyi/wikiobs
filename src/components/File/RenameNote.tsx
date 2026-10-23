import React, { useEffect, useState } from 'react'
import { FileEdit, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'react-toastify'
import ReorModal from '../Common/Modal'
import { getInvalidCharacterInFileName, removeFileExtension } from '@/lib/file'
import { useFileContext } from '@/contexts/FileContext'
import { useTranslation } from '@/lib/i18n'
import errorToStringRendererProcess from '@/lib/error'

const RenameNoteModal: React.FC = () => {
  const { t } = useTranslation()
  const { noteToBeRenamed, setNoteToBeRenamed, renameFile } = useFileContext()
  const [newNoteName, setNewNoteName] = useState<string>('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isRenaming, setIsRenaming] = useState(false)

  useEffect(() => {
    if (!noteToBeRenamed) return
    window.path.basename(noteToBeRenamed).then((name) => {
      setNewNoteName(removeFileExtension(name))
      setErrorMessage(null)
    })
  }, [noteToBeRenamed])

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value
    setNewNoteName(name)

    const invalidCharacter = getInvalidCharacterInFileName(name)
    if (invalidCharacter) {
      setErrorMessage(t('file.invalidCharNote', { char: invalidCharacter }))
    } else {
      setErrorMessage(null)
    }
  }

  const onClose = () => {
    if (isRenaming) return
    setNewNoteName('')
    setErrorMessage(null)
    setNoteToBeRenamed('')
  }

  const handleNoteRename = async () => {
    if (errorMessage || isRenaming) return
    if (!newNoteName.trim()) {
      toast.error(t('file.emptyNoteName'))
      return
    }

    setIsRenaming(true)
    try {
      const initialNotePathPrefix = await window.path.dirname(noteToBeRenamed)
      const initialPath = await window.path.join(initialNotePathPrefix, newNoteName.trim())
      const outputPath = await window.path.addExtensionIfNoExtensionPresent(initialPath)
      await renameFile(noteToBeRenamed, outputPath)
      onClose()
    } catch (error) {
      toast.error(errorToStringRendererProcess(error))
    } finally {
      setIsRenaming(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleNoteRename()
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <ReorModal isOpen={Boolean(noteToBeRenamed)} onClose={onClose} className="max-w-[420px] p-5">
      <div className="flex items-start gap-3 pb-3 border-b border-border">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-[#7b68ee]/30 bg-[#7b68ee]/15 text-[#7b68ee] dark:text-[#9d8ff5] shadow-sm shadow-[#7b68ee]/20">
          <FileEdit size={18} strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1 pr-6">
          <h2 className="text-sm font-semibold text-foreground tracking-tight">{t('file.renameNoteTitle')}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">输入新的笔记标题，自动保留 Markdown 扩展名</p>
        </div>
      </div>

      <div className="pt-3.5 space-y-3">
        <div className="space-y-1">
          <Input
            aria-label={t('file.renameNoteTitle')}
            value={newNoteName}
            onChange={handleNameChange}
            onKeyDown={handleKeyDown}
            placeholder={t('file.renameNoteTitle')}
            disabled={isRenaming}
            autoFocus
            className="h-8 bg-background border-border text-foreground text-xs focus:border-[#7b68ee]"
          />
          {errorMessage && <p className="text-[11px] text-red-400 pt-0.5">{errorMessage}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={isRenaming} className="text-xs">
            {t('button.cancel')}
          </Button>
          <Button
            variant="accent"
            size="sm"
            onClick={handleNoteRename}
            disabled={isRenaming || !newNoteName.trim() || Boolean(errorMessage)}
            className="text-xs shadow-md shadow-[#7b68ee]/25"
          >
            {t('file.renameBtn')}
          </Button>
        </div>
      </div>
    </ReorModal>
  )
}

export default RenameNoteModal
