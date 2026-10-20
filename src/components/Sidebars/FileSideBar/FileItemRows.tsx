import React, { useState, useCallback } from 'react'
import { ListChildComponentProps } from 'react-window'
import posthog from 'posthog-js'
import { toast } from 'react-toastify'
import { isFileNodeDirectory } from '@shared/utils'
import { XStack, Text } from 'tamagui'
import { ChevronRight, ChevronDown } from '@tamagui/lucide-icons'
import { useFileContext } from '@/contexts/FileContext'
import { removeFileExtension } from '@/lib/file'
import { useContentContext } from '@/contexts/ContentContext'
import { useTranslation } from '@/lib/i18n'
import errorToStringRendererProcess from '@/lib/error'
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu'
import NewDirectoryComponent from '@/components/File/NewDirectory'

const FileItemRows: React.FC<ListChildComponentProps> = ({ index, style, data }) => {
  const { file, indentation } = data.filesAndIndentations[index]

  const {
    handleDirectoryToggle,
    expandedDirectories,
    currentlyOpenFilePath,
    setNoteToBeRenamed,
    setFileDirToBeRenamed,
    deleteFile,
    selectedDirectory,
    setSelectedDirectory,
    renameFile,
  } = useFileContext()
  const { openContent, createUntitledNote } = useContentContext()
  const { t } = useTranslation()
  const [isNewDirectoryModalOpen, setIsNewDirectoryModalOpen] = useState(false)
  const [parentDirectoryPathForNewDirectory, setParentDirectoryPathForNewDirectory] = useState<string | undefined>()
  const [isDragOver, setIsDragOver] = useState(false)

  const isDirectory = isFileNodeDirectory(file)
  const isSelected = isDirectory ? file.path === selectedDirectory : file.path === currentlyOpenFilePath

  const indentationPadding = indentation ? 10 * Math.min(indentation, 6) : 0
  const isExpanded = expandedDirectories.get(file.path)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => setIsDragOver(false), [])

  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      e.stopPropagation()
      e.dataTransfer.setData('text/plain', file.path)
      e.dataTransfer.effectAllowed = 'move'
    },
    [file.path],
  )

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragOver(false)
      const sourcePath = e.dataTransfer.getData('text/plain')
      const destinationDirectory = isDirectory ? file.path : await window.path.dirname(file.path)
      const destinationPath = await window.path.join(destinationDirectory, await window.path.basename(sourcePath))
      try {
        await renameFile(sourcePath, destinationPath)
      } catch (error) {
        toast.error(errorToStringRendererProcess(error))
      }
    },
    [file.path, isDirectory, renameFile],
  )

  const clickOnFileOrDirectory = useCallback(
    (event: { stopPropagation: () => void; preventDefault?: () => void }) => {
      if (isDirectory) {
        handleDirectoryToggle(file.path)
        setSelectedDirectory(file.path)
      } else {
        openContent(file.path)
        posthog.capture('open_file_from_sidebar')
      }
      event.stopPropagation()
    },
    [file.path, isDirectory, handleDirectoryToggle, openContent, setSelectedDirectory],
  )

  const openNewDirectoryModal = useCallback(async () => {
    const dirPath = isDirectory ? file.path : await window.path.dirname(file.path)
    setParentDirectoryPathForNewDirectory(dirPath)
    setIsNewDirectoryModalOpen(true)
  }, [file.path, isDirectory])

  const handleDelete = useCallback(async () => {
    const confirmMessage = isDirectory ? t('file.deleteConfirmDir') : t('file.deleteConfirmFile')

    // eslint-disable-next-line no-alert
    if (window.confirm(confirmMessage)) {
      try {
        await deleteFile(file.path)
      } catch {
        toast.error(t('file.deleteFailed'))
      }
    }
  }, [deleteFile, file.path, isDirectory, t])

  const itemClasses = `flex items-center cursor-pointer px-2 py-1 h-full mt-0 mb-0 font-sans text-sm leading-relaxed rounded-md transition-colors ${
    isSelected ? 'font-medium border-l-2 border-primary' : ''
  } ${isDragOver ? 'bg-accent ring-2 ring-primary shadow-sm' : ''}`

  const renderContextMenuItems = () => (
    <>
      <ContextMenuItem
        onClick={async () => createUntitledNote(isDirectory ? file.path : await window.path.dirname(file.path))}
      >
        {t('files.newNote')}
      </ContextMenuItem>
      <ContextMenuItem onClick={openNewDirectoryModal}>{t('files.newFolder')}</ContextMenuItem>
      <ContextMenuItem onClick={() => (isDirectory ? setFileDirToBeRenamed(file.path) : setNoteToBeRenamed(file.path))}>
        {t('file.rename')}
      </ContextMenuItem>
      <ContextMenuItem onClick={handleDelete}>{t('file.delete')}</ContextMenuItem>
    </>
  )

  return (
    <div style={{ ...style, paddingLeft: `${indentationPadding}px` }}>
      <ContextMenu>
        <ContextMenuTrigger>
          <div
            draggable
            role="button"
            tabIndex={0}
            aria-label={`${file.name}${isDirectory ? ' directory' : ' file'}`}
            aria-current={isSelected ? 'page' : undefined}
            aria-expanded={isDirectory ? isExpanded : undefined}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                clickOnFileOrDirectory(event)
              } else if (isDirectory && (event.key === 'ArrowRight' || event.key === 'ArrowLeft')) {
                event.preventDefault()
                const shouldExpand = event.key === 'ArrowRight'
                if (Boolean(isExpanded) !== shouldExpand) handleDirectoryToggle(file.path)
              } else if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) {
                event.preventDefault()
                event.currentTarget.dispatchEvent(
                  new MouseEvent('contextmenu', { bubbles: true, clientX: 8, clientY: 8 }),
                )
              }
            }}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onDragLeave={handleDragLeave}
          >
            <XStack
              hoverStyle={{
                backgroundColor: '$gray5',
              }}
              backgroundColor={isSelected ? '$gray7' : 'transparent'}
              onPress={clickOnFileOrDirectory}
              className={`${itemClasses} min-w-0`}
              overflow="hidden"
            >
              {isDirectory && (
                <span className="mr-2 mt-1">
                  {isExpanded ? (
                    <ChevronDown title={t('file.collapseDir')} size={14} color="$gray10" />
                  ) : (
                    <ChevronRight title={t('file.openDir')} size={14} color="$gray10" />
                  )}
                </span>
              )}
              <Text color={isSelected ? '#14b8a6' : '$gray11'} numberOfLines={1} className="min-w-0 flex-1">
                {isDirectory ? file.name : removeFileExtension(file.name)}
              </Text>
            </XStack>
            <NewDirectoryComponent
              isOpen={isNewDirectoryModalOpen}
              onClose={() => setIsNewDirectoryModalOpen(false)}
              parentDirectoryPath={parentDirectoryPathForNewDirectory}
            />
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>{renderContextMenuItems()}</ContextMenuContent>
      </ContextMenu>
    </div>
  )
}

export default FileItemRows
