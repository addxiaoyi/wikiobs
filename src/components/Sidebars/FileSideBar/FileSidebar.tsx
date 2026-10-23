import React, { useEffect, useState, useMemo } from 'react'
import { toast } from 'react-toastify'
import { FileInfoNode, FileInfoTree } from 'electron/main/filesystem/types'
import { FixedSizeList } from 'react-window'
import { isFileNodeDirectory } from '@shared/utils'
import {
  PenLine,
  FolderPlus,
  RefreshCw,
  ChevronsDownUp,
  ChevronsUpDown,
  ArrowUpDown,
  Search,
  X,
  PanelLeftClose,
  FolderClosed,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useFileContext } from '@/contexts/FileContext'
import { useContentContext } from '@/contexts/ContentContext'
import { useChatContext } from '@/contexts/ChatContext'
import { useModalOpeners } from '@/contexts/ModalContext'
import { useTranslation } from '@/lib/i18n'
import FileItemRows from './FileItemRows'

export type SortOrder = 'name-asc' | 'name-desc' | 'modified-desc' | 'modified-asc' | 'created-desc' | 'created-asc'

const sortNodes = (nodes: FileInfoNode[], sortOrder: SortOrder): FileInfoNode[] => {
  return [...nodes].sort((a, b) => {
    const isADir = isFileNodeDirectory(a)
    const isBDir = isFileNodeDirectory(b)
    if (isADir && !isBDir) return -1
    if (!isADir && isBDir) return 1

    switch (sortOrder) {
      case 'name-asc':
        return a.name.localeCompare(b.name, 'zh-CN', { numeric: true, sensitivity: 'base' })
      case 'name-desc':
        return b.name.localeCompare(a.name, 'zh-CN', { numeric: true, sensitivity: 'base' })
      case 'modified-desc':
        return new Date(b.dateModified || 0).getTime() - new Date(a.dateModified || 0).getTime()
      case 'modified-asc':
        return new Date(a.dateModified || 0).getTime() - new Date(b.dateModified || 0).getTime()
      case 'created-desc':
        return new Date(b.dateCreated || 0).getTime() - new Date(a.dateCreated || 0).getTime()
      case 'created-asc':
        return new Date(a.dateCreated || 0).getTime() - new Date(b.dateCreated || 0).getTime()
      default:
        return a.name.localeCompare(b.name)
    }
  })
}

const getFilesAndIndentationsForSidebar = (
  files: FileInfoTree,
  expandedDirectories: Map<string, boolean>,
  sortOrder: SortOrder = 'name-asc',
  filterText = '',
  indentation = 0,
): { file: FileInfoNode; indentation: number }[] => {
  let filesAndIndexes: { file: FileInfoNode; indentation: number }[] = []
  const cleanFilter = filterText.trim().toLowerCase()
  const sortedFiles = sortNodes(files, sortOrder)

  sortedFiles.forEach((file) => {
    const isDir = isFileNodeDirectory(file)

    if (cleanFilter) {
      // Check if file or any descendant matches filter
      const matchesFilter = (node: FileInfoNode): boolean => {
        if (node.name.toLowerCase().includes(cleanFilter)) return true
        if (node.children) return node.children.some(matchesFilter)
        return false
      }

      if (!matchesFilter(file)) return
    }

    filesAndIndexes.push({ file, indentation })

    // If filtering, automatically expand matching directories; otherwise use expandedDirectories map
    const isExpanded = cleanFilter ? true : expandedDirectories.has(file.path) && expandedDirectories.get(file.path)

    if (isDir && isExpanded && file.children) {
      filesAndIndexes = [
        ...filesAndIndexes,
        ...getFilesAndIndentationsForSidebar(file.children, expandedDirectories, sortOrder, cleanFilter, indentation + 1),
      ]
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
  const [showFilter, setShowFilter] = useState(false)
  const [filterText, setFilterText] = useState('')
  const [inlineCreation, setInlineCreation] = useState<{ type: 'note' | 'folder' } | null>(null)
  const [inlineItemName, setInlineItemName] = useState('')

  const {
    vaultFilesTree,
    expandedDirectories,
    collapseAllDirectories,
    expandAllDirectories,
    renameFile,
    selectedDirectory,
    setSelectedDirectory,
    filesLoadState,
    filesLoadError,
    refreshFiles,
    openOrCreateFile,
  } = useFileContext()
  const { setSidebarShowing } = useChatContext()
  const { createUntitledNote, setShowEditor } = useContentContext()
  const { setIsNewDirectoryModalOpen } = useModalOpeners()
  const { t } = useTranslation()

  const [sortOrder, setSortOrder] = useState<SortOrder>(() => {
    return (localStorage.getItem('wikiobs-file-sort-order') as SortOrder) || 'name-asc'
  })

  const handleSortChange = (newOrder: string) => {
    const val = newOrder as SortOrder
    setSortOrder(val)
    localStorage.setItem('wikiobs-file-sort-order', val)
  }

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
    const filterOffset = showFilter ? 34 : 0
    const updateHeight = () => {
      setListHeight(Math.max(1, (lheight ?? window.innerHeight - 50) - HEADER_HEIGHT - filterOffset))
    }
    updateHeight()
    window.addEventListener('resize', updateHeight)
    return () => window.removeEventListener('resize', updateHeight)
  }, [lheight, showFilter])

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
    setInlineCreation({ type: 'note' })
    setInlineItemName('')
  }

  const handleNewFolder = () => {
    setInlineCreation({ type: 'folder' })
    setInlineItemName('')
  }

  const handleConfirmInline = async () => {
    const trimmed = inlineItemName.trim()
    if (!trimmed) {
      setInlineCreation(null)
      setInlineItemName('')
      return
    }
    try {
      const vaultDirectory = await window.electronStore.getVaultDirectoryForWindow()
      const targetDir = selectedDirectory || vaultDirectory

      if (inlineCreation?.type === 'folder') {
        const newFolderPath = await window.path.join(targetDir, trimmed)
        await window.fileSystem.createDirectory(newFolderPath)
        await refreshFiles()
        toast.success(`文件夹 "${trimmed}" 已创建`)
      } else {
        const cleanName = trimmed.endsWith('.md') ? trimmed : `${trimmed}.md`
        const newFilePath = await window.path.join(targetDir, cleanName)
        const noteTitle = cleanName.replace(/\.md$/i, '')
        await openOrCreateFile(newFilePath, `# ${noteTitle}\n\n`)
        setShowEditor(true)
        await refreshFiles()
      }
    } catch (err) {
      toast.error(`创建失败: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setInlineCreation(null)
      setInlineItemName('')
    }
  }

  const filesAndIndentations = useMemo(
    () => getFilesAndIndentationsForSidebar(vaultFilesTree, expandedDirectories, sortOrder, filterText),
    [vaultFilesTree, expandedDirectories, sortOrder, filterText],
  )
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
        <span className="text-xs leading-5 text-red-400">{filesLoadError || t('error.generic')}</span>
        <button
          type="button"
          className="rounded-md border border-border bg-secondary/50 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary transition-colors"
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
        itemSize={30}
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
        <span className="text-sm font-medium text-foreground">
          {filterText ? '未找到匹配的笔记' : t('files.empty')}
        </span>
        <span className="text-xs leading-5 text-muted-foreground">
          {filterText ? '尝试清除过滤关键词' : t('files.emptyHint')}
        </span>
        {!filterText && (
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background hover:bg-foreground/90 transition-all active:scale-95 shadow-sm cursor-pointer"
              onClick={handleNewNote}
            >
              <PenLine size={13} strokeWidth={2} />
              <span>{t('files.newNote')}</span>
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary/50 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary transition-all active:scale-95 cursor-pointer"
              onClick={handleNewFolder}
            >
              <FolderPlus size={13} strokeWidth={2} />
              <span>{t('files.newFolder')}</span>
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="file-sidebar-surface flex flex-col h-full grow select-none">
      {/* Obsidian-Style File Explorer Header */}
      <div
        className="file-sidebar-header electron-no-drag flex items-center justify-between px-3"
        style={{ height: HEADER_HEIGHT }}
      >
        <div className="flex min-w-0 items-center gap-1.5 mr-2">
          <FolderClosed size={13} className="text-muted-foreground shrink-0" />
          <span
            className="truncate text-[11px] font-semibold uppercase tracking-wider text-foreground"
            title={vaultName}
          >
            {vaultName || t('files.title')}
          </span>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            className="flex size-6 cursor-pointer items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title={t('files.newNote')}
            aria-label={t('files.newNote')}
            onClick={handleNewNote}
            type="button"
          >
            <PenLine size={13} strokeWidth={1.8} />
          </button>
          <button
            className="flex size-6 cursor-pointer items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title={t('files.newFolder')}
            aria-label={t('files.newFolder')}
            onClick={handleNewFolder}
            type="button"
          >
            <FolderPlus size={13} strokeWidth={1.8} />
          </button>
          <button
            className={`flex size-6 cursor-pointer items-center justify-center rounded transition-colors ${
              showFilter ? 'bg-foreground/15 text-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            }`}
            title="快速筛选文件"
            aria-label="快速筛选文件"
            onClick={() => {
              setShowFilter((prev) => !prev)
              if (showFilter) setFilterText('')
            }}
            type="button"
          >
            <Search size={13} strokeWidth={1.8} />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex size-6 cursor-pointer items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                title="更改排序方式"
                aria-label="更改排序方式"
                type="button"
              >
                <ArrowUpDown size={13} strokeWidth={1.8} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>排序方式</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={sortOrder} onValueChange={handleSortChange}>
                <DropdownMenuRadioItem value="name-asc">文件名 (A 到 Z)</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="name-desc">文件名 (Z 到 A)</DropdownMenuRadioItem>
                <DropdownMenuSeparator />
                <DropdownMenuRadioItem value="modified-desc">修改时间 (由新到旧)</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="modified-asc">修改时间 (由旧到新)</DropdownMenuRadioItem>
                <DropdownMenuSeparator />
                <DropdownMenuRadioItem value="created-desc">创建时间 (由新到旧)</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="created-asc">创建时间 (由旧到新)</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={expandAllDirectories} className="gap-2">
                <ChevronsUpDown size={13} className="text-muted-foreground" />
                <span>展开全部目录</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={collapseAllDirectories} className="gap-2">
                <ChevronsDownUp size={13} className="text-muted-foreground" />
                <span>折叠全部目录</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            className="flex size-6 cursor-pointer items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title="全部折叠"
            aria-label="全部折叠"
            onClick={collapseAllDirectories}
            type="button"
          >
            <ChevronsDownUp size={13} strokeWidth={1.8} />
          </button>
          <button
            className="flex size-6 cursor-pointer items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title={t('files.refresh')}
            aria-label={t('files.refresh')}
            onClick={handleRefresh}
            type="button"
          >
            <RefreshCw size={12} strokeWidth={1.8} />
          </button>
          <button
            className="flex size-6 cursor-pointer items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground ml-0.5"
            title="收起侧栏"
            aria-label="收起侧栏"
            onClick={() => setSidebarShowing(null)}
            type="button"
          >
            <PanelLeftClose size={13} strokeWidth={1.8} />
          </button>
        </div>
      </div>

      {/* Inline Quick Filter Search */}
      {showFilter && (
        <div className="flex h-8 items-center gap-1.5 border-b border-border bg-secondary/40 px-2.5 py-1">
          <Search size={12} className="text-muted-foreground shrink-0" />
          <input
            type="text"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="输入文件名过滤..."
            autoFocus
            className="h-full min-w-0 flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none"
          />
          {filterText && (
            <button
              type="button"
              onClick={() => setFilterText('')}
              className="flex size-4 items-center justify-center rounded text-muted-foreground hover:text-foreground"
            >
              <X size={11} />
            </button>
          )}
        </div>
      )}

      {/* File Tree List */}
      <div
        className={`file-sidebar-content relative px-1 py-1 ${
          isRootDragOver ? 'rounded-md bg-foreground/10 ring-1 ring-foreground/20' : ''
        }`}
        onDrop={handleDrop}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onClick={handleClick}
        aria-label={isRootDragOver ? t('files.moveToVault') : undefined}
      >
        {isRootDragOver && (
          <div className="pointer-events-none absolute inset-x-2 top-1 z-10 rounded border border-border bg-popover/95 px-2 py-1 text-center text-[11px] text-foreground shadow-lg backdrop-blur-sm">
            {t('files.moveToVault')}
          </div>
        )}
        {inlineCreation && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 mb-1 rounded-md bg-secondary/80 border border-border/80 shadow-xs">
            {inlineCreation.type === 'folder' ? (
              <FolderPlus size={13} className="text-muted-foreground shrink-0" />
            ) : (
              <PenLine size={13} className="text-foreground shrink-0" />
            )}
            <input
              type="text"
              autoFocus
              value={inlineItemName}
              onChange={(e) => setInlineItemName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleConfirmInline()
                if (e.key === 'Escape') {
                  setInlineCreation(null)
                  setInlineItemName('')
                }
              }}
              onBlur={() => {
                if (!inlineItemName.trim()) setInlineCreation(null)
              }}
              placeholder={
                inlineCreation.type === 'folder'
                  ? '新建文件夹名称 (Enter确认, Esc取消)'
                  : '新建笔记名称 (Enter确认, Esc取消)'
              }
              className="flex-1 min-w-0 bg-transparent text-xs text-foreground placeholder:text-muted-foreground/60 outline-none py-0.5"
            />
          </div>
        )}
        {fileTreeContent}
      </div>
    </div>
  )
}

export default FileSidebar
