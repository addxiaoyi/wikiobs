import React, { useEffect, useState } from 'react'

import { Button } from '@material-tailwind/react'
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

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isUpdatingDirName) {
      sendDirRename()
    }
  }

  return (
    <ReorModal isOpen={!!fileDirToBeRenamed} onClose={onClose}>
      <div className="my-2 w-full min-w-0 max-w-[420px]">
        <h2 className="mb-3 text-xl font-semibold text-white">{t('file.renameDirTitle')}</h2>
        <input
          type="text"
          aria-label={t('file.renameDirTitle')}
          className="block w-full rounded-md border border-gray-300 bg-neutral-900 px-3 py-2 text-white transition duration-150 ease-in-out placeholder:text-gray-400 focus:border-blue-300 focus:outline-none"
          value={dirName}
          onChange={handleNameChange}
          onKeyDown={handleKeyPress}
          placeholder={t('file.renameDirTitle')}
        />
        <div className="flex items-center gap-3">
          <Button
            className="mb-2 mt-3 h-10 w-[80px] cursor-pointer border-none bg-blue-600 px-2 py-0 text-center hover:bg-blue-600"
            onClick={sendDirRename}
            placeholder=""
            disabled={isUpdatingDirName}
          >
            {t('file.renameBtn')}
          </Button>
          {errorMessage && <p className="text-xs text-red-500">{errorMessage}</p>}
        </div>
      </div>
    </ReorModal>
  )
}

export default RenameDirModal
