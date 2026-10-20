import React, { useEffect, useState } from 'react'
import { toast } from 'react-toastify'

import { Button } from '@material-tailwind/react'
import { SizableText } from 'tamagui'
import { truncateName } from '../Chat/MessageComponents/ChatSources'
import { useTranslation } from '@/lib/i18n'
import errorToStringRendererProcess from '@/lib/error'

interface DirectorySelectorProps {
  setErrorMsg: (error: string) => void
}

const DirectorySelector: React.FC<DirectorySelectorProps> = ({ setErrorMsg }) => {
  const [userDirectory, setUserDirectory] = useState<string>('')
  const { t } = useTranslation()

  const handleDirectorySelection = async () => {
    try {
      const paths = await window.fileSystem.openDirectoryDialog()
      if (paths && paths[0]) setUserDirectory(paths[0])
    } catch (error) {
      toast.error(errorToStringRendererProcess(error))
    }
  }

  useEffect(() => {
    const fetchDirectory = async () => {
      try {
        const directory = await window.electronStore.getVaultDirectoryForWindow()
        if (directory) {
          setUserDirectory(directory)
        }
      } catch (error) {
        toast.error(String(error))
      }
    }
    fetchDirectory()
  }, [])

  useEffect(() => {
    if (!userDirectory) {
      setErrorMsg(t('settings.selectDirectory'))
      return
    }

    const persistDirectory = async () => {
      try {
        await window.electronStore.setVaultDirectoryForWindow(userDirectory)
        setErrorMsg('')
      } catch (error) {
        const message = errorToStringRendererProcess(error)
        setErrorMsg(message)
        toast.error(message)
      }
    }

    persistDirectory()
  }, [userDirectory, setErrorMsg, t])
  return (
    <div className="flex w-full max-w-60 flex-col items-end">
      <Button
        className="h-10 w-[140px] cursor-pointer border-none bg-blue-500 px-2 py-0 text-center hover:bg-blue-600"
        onClick={handleDirectorySelection}
        placeholder=""
      >
        {t('settings.selectDirectory')}
      </Button>
      {userDirectory && (
        <SizableText fontSize={12} width="100%" textAlign="left" marginTop={1} fontWeight={300}>
          <strong>{truncateName(userDirectory, 60)}</strong>
        </SizableText>
      )}
    </div>
  )
}

export default DirectorySelector
