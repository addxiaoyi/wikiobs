import React, { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { FileInfoNode, FileInfoTree } from 'electron/main/filesystem/types'
import { FixedSizeList } from 'react-window'
import { isFileNodeDirectory } from '@shared/utils'
import { YStack } from 'tamagui'
import { HiOutlinePencilAlt } from 'react-icons/hi'
import { VscNewFolder } from 'react-icons/vsc'
import { RefreshCw } from 'lucide-react'
import { useFileContext } from '@/contexts/FileContext'
import { useContentContext } from '@/contexts/ContentContext'
import { useModalOpeners } from '@/contexts/ModalContext'
import { useTranslation } from '@/lib/i18n'
import FileItemRows from './FileItemRows'

const getFilesAndIndentationsForSidebar = (
  files: FileInfoTree,
  expandedDirectories: Map<string, boolean>,
  indentation = 0,
): { file: FileInfoNode; indentation: number }[] => {
  let filesAndIndexes: { file: FileInfoNode; indentation: number }[] = []
  files.forEach((file) => {
    filesAndIndexes.push({ file, indentation })
    if (isFileNodeDirectory(file) && expandedDirectories.has(file.path) && expandedDirectories.get(file.path)) {
      if (file.children) {
        filesAndIndexes = [
          ...filesAndIndexes,
          ...getFilesAndIndentationsForSidebar(file.children, expandedDirectories, indentation + 1),
        ]
      }
    }
  })
  return filesAndIndexes
}

const HEADER_HEIGHT = 40

interface FileExplorerProps {
  lheight?: number
}

const FileSidebar: React.FC<FileExplorerProps> = ({ lheight }) => {
  const [listHeight, setListHeight] = useState(Math.max(1, (lheight ?? window.innerHeight - 50) - HEADER_HEIGHT))
  const [vaultName, setVaultName] = useState('')
  const [isRootDragOver, setIsRootDragOver] = useState(false)
  const {
    vaultFilesTree,
    expandedDirectories,
    renameFile,
    setSelectedDirectory,
    filesLoadState,
    filesLoadError,
    refreshFiles,
  } = useFileContext()
  const { createUntitledNote } = useContentContext()
  const { setIsNewDirectoryModalOpen } = useModalOpeners()
  const { t } = useTranslation()

  useEffect(() => {
    const fetchVaultName = async () => {
      const dir = await window.electronStore.getVaultDirectoryForWindow()
      if (dir) {
        const name = await window.path.basename(dir)
        setVaultName(name)
      }
    }
    fetchVaultName().catch((error) => toast.error(String(error)))
  }, [])

  useEffect(() => {
    const updateHeight = () => {
      setListHeight(Math.max(1, (lheight ?? window.innerHeight - 50) - HEADER_HEIGHT))
    }
    window.addEventListener('resize', updateHeight)
    return () => window.removeEventListener('resize', updateHeight)
  }, [lheight])

  const handleDrop = async (event: React.DragEvent) => {
    event.preventDefault()
    event.stopPropagation()
    setIsRootDragOver(false)
    try {
      const sourcePath = event.dataTransfer.getData('text/plain')
      const destinationDirectory = await window.electronStore.getVaultDirectoryForWindow()
      const destinationPath = await window.path.join(destinationDirectory, await window.path.basename(sourcePath))
      await renameFile(sourcePath, destinationPath)
    } catch (error) {
      toast.error(String(error))
    }
  }

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault()
    event.stopPropagation()
  }

  const handleDragEnter = (event: React.DragEvent) => {
    event.preventDefault()
    if ((event.target as HTMLElement).closest('[draggable="true"]')) return
    setIsRootDragOver(true)
  }

  const handleDragLeave = (event: React.DragEvent) => {
    if (event.currentTarget === event.target) setIsRootDragOver(false)
  }

  const handleClick = () => {
    setSelectedDirectory(null)
  }

  const handleRefresh = () => {
    refreshFiles().catch((error) => toast.error(String(error)))
  }

  const handleNewNote = () => {
    createUntitledNote()
  }

  const handleNewFolder = () => {
    setIsNewDirectoryModalOpen(true)
  }

  const filesAndIndentations = getFilesAndIndentationsForSidebar(vaultFilesTree, expandedDirectories)
  const itemCount = filesAndIndentations.length
  let fileTreeContent: React.ReactNode

  if (filesLoadState === 'loading') {
    fileTreeContent = (
      <div className="flex min-h-[220px] items-center justify-center px-4 text-xs text-muted-foreground" role="status">
        {t('common.loadingWorkspace')}
      </div>
    )
  } else if (filesLoadState === 'error') {
    fileTreeContent = (
      <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 px-4 text-center" role="alert">
        <span className="text-xs leading-5 text-destructive">{filesLoadError || t('error.generic')}</span>
        <button
          type="button"
          className="rounded-md border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-accent"
          onClick={handleRefresh}
        >
          {t('button.retry')}
        </button>
      </div>
    )
  } else if (itemCount > 0) {
    fileTreeContent = (
      <FixedSizeList
        height={listHeight}
        itemCount={itemCount}
        itemSize={34}
        width="100%"
        itemData={{ filesAndIndentations }}
      >
        {FileItemRows}
      </FixedSizeList>
    )
  } else {
    fileTreeContent = (
      <div
        className="flex min-h-[220px] flex-col items-center justify-center gap-2 px-4 py-8 text-center"
        role="status"
      >
        <span className="text-sm font-medium text-foreground">{t('files.empty')}</span>
        <span className="text-xs leading-5 text-muted-foreground">{t('files.emptyHint')}</span>
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            className="rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90"
            onClick={handleNewNote}
          >
            {t('files.newNote')}
          </button>
          <button
            type="button"
            className="rounded-md border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-accent"
            onClick={handleNewFolder}
          >
            {t('files.newFolder')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <YStack className="file-sidebar-surface h-full grow">
      <div
        className="file-sidebar-header electron-no-drag flex items-center justify-between px-3"
        style={{ height: HEADER_HEIGHT }}
      >
        <span
          className="truncate text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          title={vaultName}
        >
          {vaultName || t('files.title')}
        </span>
        <div className="flex items-center gap-0.5">
          <button
            className="flex size-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title={t('files.newNote')}
            aria-label={t('files.newNote')}
            onClick={handleNewNote}
            type="button"
          >
            <HiOutlinePencilAlt size={16} />
          </button>
          <button
            className="flex size-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title={t('files.newFolder')}
            aria-label={t('files.newFolder')}
            onClick={handleNewFolder}
            type="button"
          >
            <VscNewFolder size={16} />
          </button>
          <button
            className="flex size-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title={t('files.refresh')}
            aria-label={t('files.refresh')}
            onClick={handleRefresh}
            type="button"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>
      <div
        className={`file-sidebar-content relative px-1 ${isRootDragOver ? 'rounded-md bg-accent/60 ring-2 ring-primary' : ''}`}
        onDrop={handleDrop}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onClick={handleClick}
        aria-label={isRootDragOver ? t('files.moveToVault') : undefined}
      >
        {isRootDragOver && (
          <div className="pointer-events-none absolute inset-x-2 top-1 z-10 rounded border border-primary bg-background/95 px-2 py-1 text-center text-[11px] text-primary">
            {t('files.moveToVault')}
          </div>
        )}
        {fileTreeContent}
      </div>
    </YStack>
  )
}

export default FileSidebar
