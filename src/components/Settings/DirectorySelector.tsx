import React, { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { Folder } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
    <div className="flex w-full max-w-xs flex-col items-end">
      <Button
        variant="secondary"
        onClick={handleDirectorySelection}
        className="flex items-center gap-1.5"
      >
        <Folder size={13} className="text-[#7b68ee]" />
        <span>{t('settings.selectDirectory')}</span>
      </Button>
      {userDirectory && (
        <div className="mt-1.5 flex max-w-full items-center gap-1.5 rounded-md border border-border bg-secondary/50 px-2 py-1 font-mono text-[11px] text-muted-foreground">
          <Folder size={12} className="shrink-0 text-muted-foreground" />
          <span className="truncate" title={userDirectory}>
            {truncateName(userDirectory, 40)}
          </span>
        </div>
      )}
    </div>
  )
}

export default DirectorySelector
