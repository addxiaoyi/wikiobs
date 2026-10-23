import React, { useState, useCallback } from 'react'
import { ListChildComponentProps } from 'react-window'
import { toast } from 'react-toastify'
import { isFileNodeDirectory } from '@shared/utils'
import { XStack, Text } from 'tamagui'
import { useFileContext } from '@/contexts/FileContext'
import { removeFileExtension } from '@/lib/file'
import { useContentContext } from '@/contexts/ContentContext'
import { useTranslation } from '@/lib/i18n'
import errorToStringRendererProcess from '@/lib/error'
import { FilePlus, FolderPlus, Edit3, Trash2, FileText, ChevronRight, Link, Copy } from 'lucide-react'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import NewDirectoryComponent from '@/components/File/NewDirectory'
import ConfirmDialog from '@/components/Common/ConfirmDialog'

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
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  const isDirectory = isFileNodeDirectory(file)
  const isSelected = isDirectory ? file.path === selectedDirectory : file.path === currentlyOpenFilePath

  const indentationPadding = indentation ? 14 * indentation + 4 : 4
  const isExpanded = Boolean(expandedDirectories.get(file.path))

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

  const handleDelete = useCallback(() => {
    setIsDeleteDialogOpen(true)
  }, [])

  const confirmDelete = useCallback(async () => {
    setIsDeleteDialogOpen(false)
    try {
      await deleteFile(file.path)
    } catch {
      toast.error(t('file.deleteFailed'))
    }
  }, [deleteFile, file.path, t])

  const itemClasses = `relative flex items-center cursor-pointer px-2 py-1 h-full mt-0 mb-0 font-sans text-xs leading-relaxed rounded-md transition-colors duration-100 ${
    isSelected
      ? 'font-medium bg-[var(--accent-soft)] text-foreground'
      : 'text-muted-foreground/85 hover:text-foreground hover:bg-[var(--surface-2)]'
  } ${isDragOver ? 'bg-[var(--accent-soft)] ring-1 ring-[#7b68ee]/50' : ''}`

  const renderContextMenuItems = () => (
    <>
      <ContextMenuItem
        onClick={async () => createUntitledNote(isDirectory ? file.path : await window.path.dirname(file.path))}
        className="flex items-center gap-2"
      >
        <FilePlus className="size-3.5 text-muted-foreground" />
        <span>{t('files.newNote')}</span>
      </ContextMenuItem>
      <ContextMenuItem onClick={openNewDirectoryModal} className="flex items-center gap-2">
        <FolderPlus className="size-3.5 text-muted-foreground" />
        <span>{t('files.newFolder')}</span>
      </ContextMenuItem>
      <ContextMenuItem
        onClick={() => (isDirectory ? setFileDirToBeRenamed(file.path) : setNoteToBeRenamed(file.path))}
        className="flex items-center gap-2"
      >
        <Edit3 className="size-3.5 text-muted-foreground" />
        <span>{t('file.rename')}</span>
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem
        onClick={() => {
          const cleanName = isDirectory ? file.name : removeFileExtension(file.name)
          navigator.clipboard.writeText(`[[${cleanName}]]`)
          toast.success(`已复制双链引用 [[${cleanName}]]`)
        }}
        className="flex items-center gap-2"
      >
        <Link className="size-3.5 text-muted-foreground" />
        <span>复制 Markdown 双链</span>
      </ContextMenuItem>
      <ContextMenuItem
        onClick={() => {
          navigator.clipboard.writeText(file.path)
          toast.success('已复制文件绝对路径')
        }}
        className="flex items-center gap-2"
      >
        <Copy className="size-3.5 text-muted-foreground" />
        <span>复制文件路径</span>
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem
        onClick={handleDelete}
        className="flex items-center gap-2 text-red-400 focus:bg-red-500/20 focus:text-red-300"
      >
        <Trash2 className="size-3.5 text-red-400" />
        <span>{t('file.delete')}</span>
      </ContextMenuItem>
    </>
  )

  return (
    <div className="relative group" style={{ ...style, paddingLeft: `${indentationPadding}px` }}>
      {indentation > 0 &&
        Array.from({ length: indentation }).map((_, i) => (
          <div
            key={i}
            className="absolute top-0 bottom-0 w-px bg-border/40 group-hover:bg-border/70 pointer-events-none transition-colors"
            style={{ left: `${(i + 1) * 14 - 4}px` }}
          />
        ))}
      {isSelected && !isDirectory && (
        <span className="absolute left-0.5 top-1 bottom-1 w-[2.5px] rounded-r bg-[#7b68ee] shadow-[0_0_6px_rgba(123,104,238,0.7)] pointer-events-none" />
      )}
      <ContextMenu>
        <ContextMenuTrigger>
          <div
            draggable
            role="treeitem"
            tabIndex={0}
            aria-selected={isSelected}
            aria-label={`${file.name} ${isDirectory ? t('file.directory') : t('file.file')}`}
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
              onPress={clickOnFileOrDirectory}
              className={`${itemClasses} min-w-0`}
              overflow="hidden"
            >
              {isDirectory ? (
                <span className="mr-1.5 flex size-4 shrink-0 items-center justify-center">
                  <ChevronRight
                    size={12}
                    className={`text-muted-foreground/70 transition-transform duration-150 ${
                      isExpanded ? 'rotate-90 text-foreground' : 'rotate-0'
                    }`}
                  />
                </span>
              ) : (
                <span className="mr-1.5 flex size-4 shrink-0 items-center justify-center">
                  <FileText className={`size-3.5 ${isSelected ? 'text-foreground' : 'text-muted-foreground/60'}`} />
                </span>
              )}
              <span title={file.name} className="min-w-0 flex-1 truncate">
                <Text
                  color={isSelected ? '$foreground' : '$gray11'}
                  fontWeight={isSelected ? '600' : '400'}
                  numberOfLines={1}
                >
                  {isDirectory ? file.name : removeFileExtension(file.name)}
                </Text>
              </span>
            </XStack>
            <NewDirectoryComponent
              isOpen={isNewDirectoryModalOpen}
              onClose={() => setIsNewDirectoryModalOpen(false)}
              parentDirectoryPath={parentDirectoryPathForNewDirectory}
            />
            <ConfirmDialog
              isOpen={isDeleteDialogOpen}
              title={isDirectory ? '删除文件夹' : '删除笔记'}
              message={isDirectory ? t('file.deleteConfirmDir') : t('file.deleteConfirmFile')}
              confirmText="删除"
              cancelText="取消"
              isDestructive
              onConfirm={confirmDelete}
              onCancel={() => setIsDeleteDialogOpen(false)}
            />
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>{renderContextMenuItems()}</ContextMenuContent>
      </ContextMenu>
    </div>
  )
}

export default FileItemRows
