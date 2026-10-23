/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-use-before-define */
import React, { createContext, useContext, ReactNode, useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { toast } from 'react-toastify'
import { useDebounce } from 'use-debounce'
import { FileInfo, FileInfoTree } from 'electron/main/filesystem/types'
import { isFileNodeDirectory } from '@shared/utils'
import errorToStringRendererProcess from '@/lib/error'
import {
  findRelevantDirectoriesToBeExpanded,
  flattenFileInfoTree,
  generateFileNameFromFileContent,
  getFilesInDirectory,
  getInvalidCharacterInFilePath,
  isPathWithinDirectory,
  getNextAvailableFileNameGivenBaseName,
  sortFilesAndDirectories,
  removeFileExtension,
} from '@/lib/file'
import { SuggestionsState } from '@/components/Editor/BacklinkSuggestionsDisplay'
import { HighlightData } from '@/components/Editor/HighlightExtension'
import '@/styles/tiptap.scss'
import useOrderedSet from '../lib/hooks/use-ordered-set'
import welcomeNote from '@/lib/welcome-note'
import { useBlockNote, BlockNoteEditor } from '@/lib/blocknote'
import { hmBlockSchema } from '@/components/Editor/schema'
import { setGroupTypes } from '@/lib/utils'
import slashMenuItems from '../components/Editor/slash-menu-items'

export interface TabItem {
  id: string
  filePath: string
  title: string
}

export const VIRTUAL_URI_TITLES: Record<string, string> = {
  'graph://global': '全局关系图',
  'wikiobs://settings': '系统设置',
  'wikiobs://plugins': '插件中心',
  'wikiobs://tasks': '计划任务',
  'wikiobs://export': '导入与导出',
  'wikiobs://obsidian': 'Obsidian 兼容',
  'wikiobs://ai-org': 'AI 智能整理',
  'wikiobs://wiki-importer': '维基导入',
  'wikiobs://vaults': '知识库管理',
}

export const isVirtualWorkspaceUri = (filePath: string | null | undefined): boolean => {
  if (!filePath) return false
  return filePath.startsWith('graph://') || filePath.startsWith('wikiobs://')
}

type FileContextType = {
  vaultFilesTree: FileInfoTree
  vaultFilesFlattened: FileInfo[]
  filesLoadState: 'loading' | 'ready' | 'error'
  filesLoadError: string | null
  refreshFiles: () => Promise<void>
  expandedDirectories: Map<string, boolean>
  handleDirectoryToggle: (path: string) => void
  collapseAllDirectories: () => void
  expandAllDirectories: () => void
  currentlyOpenFilePath: string | null
  setCurrentlyOpenFilePath: React.Dispatch<React.SetStateAction<string | null>>
  saveCurrentlyOpenedFile: () => Promise<void>
  saveState: 'idle' | 'dirty' | 'saving' | 'saved' | 'error'
  saveError: string | null
  editor: BlockNoteEditor | null
  navigationHistory: string[]
  addToNavigationHistory: (value: string) => void
  openOrCreateFile: (filePath: string, optionalContentToWriteOnCreate?: string) => Promise<void>
  suggestionsState: SuggestionsState | null | undefined
  spellCheckEnabled: boolean
  highlightData: HighlightData
  noteToBeRenamed: string
  setNoteToBeRenamed: React.Dispatch<React.SetStateAction<string>>
  fileDirToBeRenamed: string
  setFileDirToBeRenamed: React.Dispatch<React.SetStateAction<string>>
  renameFile: (oldFilePath: string, newFilePath: string) => Promise<void>
  setSuggestionsState: React.Dispatch<React.SetStateAction<SuggestionsState | null | undefined>>
  setSpellCheckEnabled: React.Dispatch<React.SetStateAction<boolean>>
  deleteFile: (path: string | undefined) => Promise<boolean>
  selectedDirectory: string | null
  setSelectedDirectory: React.Dispatch<React.SetStateAction<string | null>>
  openTabs: TabItem[]
  activeTabId: string | null
  selectTab: (tabId: string) => void
  closeTab: (tabId: string) => void
  closeOtherTabs: (tabId: string) => void
  closeAllTabs: () => void
  noteStats: { words: number; characters: number }
}

export const FileContext = createContext<FileContextType | undefined>(undefined)

export const useFileContext = () => {
  const context = useContext(FileContext)
  if (context === undefined) {
    throw new Error('useFileContext must be used within a FileProvider')
  }
  return context
}

export const FileProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [vaultFilesTree, setVaultFilesTree] = useState<FileInfoTree>([])
  const [vaultFilesFlattened, setVaultFilesFlattened] = useState<FileInfo[]>([])
  const [filesLoadState, setFilesLoadState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [filesLoadError, setFilesLoadError] = useState<string | null>(null)
  const [expandedDirectories, setExpandedDirectories] = useState<Map<string, boolean>>(new Map())
  const [selectedDirectory, setSelectedDirectory] = useState<string | null>(null)
  const [currentlyOpenFilePath, setCurrentlyOpenFilePath] = useState<string | null>(null)
  const [suggestionsState, setSuggestionsState] = useState<SuggestionsState | null>()
  const [, setNeedToWriteEditorContentToDisk] = useState<boolean>(false)
  const [needToIndexEditorContent, setNeedToIndexEditorContent] = useState<boolean>(false)
  const [spellCheckEnabled, setSpellCheckEnabled] = useState<boolean>(false)
  const [noteToBeRenamed, setNoteToBeRenamed] = useState<string>('')
  const [fileDirToBeRenamed, setFileDirToBeRenamed] = useState<string>('')
  const [currentlyChangingFilePath, setCurrentlyChangingFilePath] = useState(false)
  const [saveState, setSaveState] = useState<'idle' | 'dirty' | 'saving' | 'saved' | 'error'>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)
  const isLoadingFileRef = useRef(false)
  const editorDirtyRef = useRef(false)
  const editorVersionRef = useRef(0)
  const lastEditorChangeAtRef = useRef(0)
  const skipPersistForPathRef = useRef<string | null>(null)
  const isClosingRef = useRef(false)
  const persistPromiseRef = useRef<Promise<void> | null>(null)
  const currentlyOpenFilePathRef = useRef<string | null>(null)
  const editorRef = useRef<BlockNoteEditor | null>(null)
  const latestMarkdownRef = useRef<{ filePath: string | null; markdown: Promise<string | null> } | null>(null)
  const fileFrontmatterRef = useRef<{ filePath: string; content: string } | null>(null)
  // TODO: Add highlighting data on search
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [highlightData, setHighlightData] = useState<HighlightData>({
    text: '',
    position: null,
  })

  const {
    add: addToNavigationHistory,
    remove: removeFromNavigationHistory,
    values: navigationHistory,
  } = useOrderedSet()

  useEffect(() => {
    const fetchSpellCheckMode = async () => {
      try {
        const storedSpellCheckEnabled = await window.electronStore.getSpellCheckMode()
        setSpellCheckEnabled(storedSpellCheckEnabled)
      } catch (error) {
        toast.error(errorToStringRendererProcess(error))
      }
    }
    fetchSpellCheckMode()
    const unsubscribe = window.ipcRenderer.receive('spellcheck-changed', (value: boolean) => {
      setSpellCheckEnabled(value)
    })
    return unsubscribe
  }, [])

  const createFileIfNotExists = async (filePath: string, optionalContent?: string): Promise<string> => {
    const invalidChars = await getInvalidCharacterInFilePath(filePath)
    if (invalidChars) {
      const errorMessage = `Could not create note ${filePath}. Character ${invalidChars} cannot be included in note name.`
      toast.error(errorMessage)
      throw new Error(errorMessage)
    }
    const filePathWithExtension = await window.path.addExtensionIfNoExtensionPresent(filePath)
    const isAbsolutePath = await window.path.isAbsolute(filePathWithExtension)
    const absolutePath = isAbsolutePath
      ? filePathWithExtension
      : await window.path.join(await window.electronStore.getVaultDirectoryForWindow(), filePathWithExtension)

    const fileExists = await window.fileSystem.checkFileExists(absolutePath)
    if (!fileExists) {
      await window.fileSystem.createFile(absolutePath, optionalContent || ``)
      setNeedToIndexEditorContent(true)
    }

    return absolutePath
  }

  const loadFileIntoEditor = async (filePath: string) => {
    isLoadingFileRef.current = true
    latestMarkdownRef.current = null
    setCurrentlyChangingFilePath(true)
    setSaveError(null)
    if (currentlyOpenFilePath && !isVirtualWorkspaceUri(currentlyOpenFilePath)) {
      await writeEditorContentToDisk(editor, currentlyOpenFilePath)
      if (needToIndexEditorContent) {
        window.database.indexFileInDatabase(currentlyOpenFilePath)
        setNeedToIndexEditorContent(false)
      }
    }
    const fileContent = (await window.fileSystem.readFile(filePath, 'utf-8')) ?? ''
    const frontmatterMatch = fileContent.match(/^---\n[\s\S]*?\n---\n?/)
    const frontmatter = frontmatterMatch?.[0] || ''
    fileFrontmatterRef.current = { filePath, content: frontmatter }
    const editorContent = frontmatter ? fileContent.slice(frontmatter.length) : fileContent
    const blocks = await editor.markdownToBlocks(editorContent)
    // @ts-expect-error
    editor.replaceBlocks(editor.topLevelBlocks, blocks)
    setGroupTypes(editor?._tiptapEditor, blocks)

    setCurrentlyOpenFilePath(filePath)
    setSaveState('saved')
    isLoadingFileRef.current = false
    setCurrentlyChangingFilePath(false)
    const parentDirectory = await window.path.dirname(filePath)
    setSelectedDirectory(parentDirectory)
  }

  const openOrCreateFile = async (filePath: string, optionalContentToWriteOnCreate?: string): Promise<void> => {
    if (isVirtualWorkspaceUri(filePath)) {
      if (currentlyOpenFilePath && !isVirtualWorkspaceUri(currentlyOpenFilePath)) {
        await writeEditorContentToDisk(editor, currentlyOpenFilePath)
        if (needToIndexEditorContent) {
          window.database.indexFileInDatabase(currentlyOpenFilePath)
          setNeedToIndexEditorContent(false)
        }
      }
      const targetUri = filePath.startsWith('graph://') ? 'graph://global' : filePath
      const tabTitle = VIRTUAL_URI_TITLES[targetUri] || '工作区标签'
      const tabId = targetUri.replace(/[^a-zA-Z0-9-]/g, '-')
      setCurrentlyOpenFilePath(targetUri)
      setSaveState('saved')
      setOpenTabs((prev) => {
        if (prev.some((tab) => tab.filePath === targetUri || tab.id === tabId)) {
          return prev
        }
        return [...prev, { id: tabId, filePath: targetUri, title: tabTitle }]
      })
      return
    }
    const absolutePath = await createFileIfNotExists(filePath, optionalContentToWriteOnCreate)
    await loadFileIntoEditor(absolutePath)
  }

  const editor = useBlockNote<typeof hmBlockSchema>({
    onEditorContentChange(changedEditor) {
      if (isLoadingFileRef.current) return
      editorDirtyRef.current = true
      setSaveState('dirty')
      setSaveError(null)
      editorVersionRef.current += 1
      lastEditorChangeAtRef.current = Date.now()
      latestMarkdownRef.current = {
        filePath: currentlyOpenFilePathRef.current,
        markdown: changedEditor.blocksToMarkdown(changedEditor.topLevelBlocks),
      }
      setNeedToWriteEditorContentToDisk(true)
      setNeedToIndexEditorContent(true)
    },
    blockSchema: hmBlockSchema,
    slashMenuItems,
  })

  editorRef.current = editor
  currentlyOpenFilePathRef.current = currentlyOpenFilePath

  const [debouncedEditor] = useDebounce(editor?.topLevelBlocks, 3000)

  useEffect(() => {
    if (!debouncedEditor || currentlyChangingFilePath || isClosingRef.current) return
    if (skipPersistForPathRef.current === currentlyOpenFilePath) {
      skipPersistForPathRef.current = null
      return
    }

    const persistEditorState = async () => {
      if (!editor || !currentlyOpenFilePath || isVirtualWorkspaceUri(currentlyOpenFilePath) || !editorDirtyRef.current) return

      for (let attempt = 0; attempt < 3; attempt += 1) {
        const versionAtStart = editorVersionRef.current
        await writeEditorContentToDisk(editor, currentlyOpenFilePath, versionAtStart)
        if (versionAtStart === editorVersionRef.current) break
      }

      if (needToIndexEditorContent && currentlyOpenFilePath && !isVirtualWorkspaceUri(currentlyOpenFilePath)) {
        await window.database.indexFileInDatabase(currentlyOpenFilePath)
        setNeedToIndexEditorContent(false)
      }
      await handleNewFileRenaming(editor, currentlyOpenFilePath, editorVersionRef.current)
    }

    const persistPromise = persistEditorState()
    persistPromiseRef.current = persistPromise
    persistPromise
      .catch((error) => toast.error(errorToStringRendererProcess(error)))
      .finally(() => {
        if (persistPromiseRef.current === persistPromise) persistPromiseRef.current = null
      })
  }, [debouncedEditor, currentlyOpenFilePath, editor, currentlyChangingFilePath, needToIndexEditorContent])

  const saveCurrentlyOpenedFile = async () => {
    if (!editor || !currentlyOpenFilePath || isVirtualWorkspaceUri(currentlyOpenFilePath)) return

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const versionAtStart = editorVersionRef.current
      await writeEditorContentToDisk(editor, currentlyOpenFilePath, versionAtStart)
      if (versionAtStart === editorVersionRef.current) break
    }

    if (currentlyOpenFilePath && !isVirtualWorkspaceUri(currentlyOpenFilePath) && needToIndexEditorContent) {
      await window.database.indexFileInDatabase(currentlyOpenFilePath)
      setNeedToIndexEditorContent(false)
    }
  }

  const writeEditorContentToDisk = async (
    _editor: BlockNoteEditor | null,
    filePath: string | null,
    versionAtStart = editorVersionRef.current,
  ): Promise<string | null> => {
    if (filePath === null || isVirtualWorkspaceUri(filePath) || !_editor || !editorDirtyRef.current) return null

    const blocks = _editor.topLevelBlocks
    const markdownContent =
      (latestMarkdownRef.current?.filePath === filePath ? await latestMarkdownRef.current.markdown : null) ??
      (await _editor.blocksToMarkdown(blocks))
    if (markdownContent === null) return null
    const frontmatter = fileFrontmatterRef.current?.filePath === filePath ? fileFrontmatterRef.current.content : ''
    const fileContent = `${frontmatter}${markdownContent}`

    setSaveState('saving')
    setSaveError(null)
    try {
      await window.fileSystem.writeFile({
        filePath,
        content: fileContent,
      })
    } catch (error) {
      const message = errorToStringRendererProcess(error)
      setSaveState('error')
      setSaveError(message)
      throw error
    }

    if (versionAtStart === editorVersionRef.current) {
      editorDirtyRef.current = false
      setNeedToWriteEditorContentToDisk(false)
      setSaveState('saved')
    }

    return markdownContent
  }

  const handleNewFileRenaming = async (_editor: BlockNoteEditor, filePath: string, expectedVersion: number) => {
    const stableFor = Date.now() - lastEditorChangeAtRef.current
    if (editorVersionRef.current !== expectedVersion || stableFor < 750) return

    const fileInfo = vaultFilesFlattened.find((f) => f.path === filePath)
    if (
      fileInfo &&
      fileInfo.name.startsWith('Untitled') &&
      new Date().getTime() - fileInfo.dateCreated.getTime() < 60000
    ) {
      // const editorText = _editor.getText()
      const editorText = await _editor.blocksToMarkdown(_editor.topLevelBlocks)
      if (editorText) {
        const newProposedFileName = generateFileNameFromFileContent(editorText)
        if (newProposedFileName) {
          const directoryToMakeFileIn = await window.path.dirname(filePath)
          const filesInDirectory = await getFilesInDirectory(directoryToMakeFileIn, vaultFilesFlattened)
          const fileName = getNextAvailableFileNameGivenBaseName(
            filesInDirectory.map((file) => file.name),
            newProposedFileName,
          )
          const newFilePath = await window.path.join(directoryToMakeFileIn, fileName)
          await renameFile(filePath, newFilePath)
          // setCurrentlyOpenFilePath(newFilePath)
        }
      }
    }
  }

  useEffect(() => {
    async function checkAppUsage() {
      if (!editor || currentlyOpenFilePath) return
      const hasOpened = await window.electronStore.getHasUserOpenedAppBefore()

      if (!hasOpened) {
        await window.electronStore.setHasUserOpenedAppBefore()
      }
    }

    checkAppUsage().catch((error) => toast.error(errorToStringRendererProcess(error)))
  }, [editor, currentlyOpenFilePath])

  const renameFile = async (oldFilePath: string, newFilePath: string) => {
    await window.fileSystem.renameFile({
      oldFilePath,
      newFilePath,
    })
    removeFromNavigationHistory(oldFilePath)
    addToNavigationHistory(newFilePath)

    if (currentlyOpenFilePath === oldFilePath) {
      editorDirtyRef.current = false
      skipPersistForPathRef.current = newFilePath
      setCurrentlyOpenFilePath(newFilePath)
      if (fileFrontmatterRef.current?.filePath === oldFilePath) {
        fileFrontmatterRef.current = { ...fileFrontmatterRef.current, filePath: newFilePath }
      }
    }
  }

  useEffect(() => {
    const handleWindowClose = async () => {
      isClosingRef.current = true
      try {
        await persistPromiseRef.current
        const currentPath = currentlyOpenFilePathRef.current
        const currentEditor = editorRef.current
        if (currentPath !== null && currentEditor && currentEditor.topLevelBlocks !== null) {
          const blocks = currentEditor.topLevelBlocks
          const markdownContent =
            (latestMarkdownRef.current?.filePath === currentPath ? await latestMarkdownRef.current.markdown : null) ??
            (await currentEditor.blocksToMarkdown(blocks))
          const frontmatter =
            fileFrontmatterRef.current?.filePath === currentPath ? fileFrontmatterRef.current.content : ''
          await window.fileSystem.writeFile({
            filePath: currentPath,
            content: `${frontmatter}${markdownContent}`,
          })
          await window.database.indexFileInDatabase(currentPath)
        }
      } catch (error) {
        toast.error(errorToStringRendererProcess(error))
      } finally {
        await window.ipcRenderer.invoke('window-close-ready').catch(() => undefined)
      }
    }

    const removeWindowCloseListener = window.ipcRenderer.receive('prepare-for-window-close', handleWindowClose)

    return () => {
      removeWindowCloseListener()
    }
  }, [])

  const deleteFile = async (path: string | undefined) => {
    if (!path) return false

    await window.fileSystem.deleteFile(path)

    const closesCurrentFile = currentlyOpenFilePath ? isPathWithinDirectory(currentlyOpenFilePath, path) : false
    if (closesCurrentFile) {
      setSaveState('error')
      setSaveError('file-removed')
    }

    if (selectedDirectory && isPathWithinDirectory(selectedDirectory, path)) {
      setSelectedDirectory(null)
    }

    return true
  }

  const handleDirectoryToggle = (path: string) => {
    const isExpanded = expandedDirectories.get(path)
    const newExpandedDirectories = new Map(expandedDirectories)
    newExpandedDirectories.set(path, !isExpanded)
    setExpandedDirectories(newExpandedDirectories)
  }

  const collapseAllDirectories = useCallback(() => {
    setExpandedDirectories(new Map())
  }, [])

  const expandAllDirectories = useCallback(() => {
    const newMap = new Map<string, boolean>()
    const markAllDirs = (nodes: FileInfoTree) => {
      nodes.forEach((node) => {
        if (isFileNodeDirectory(node)) {
          newMap.set(node.path, true)
          if (node.children) markAllDirs(node.children)
        }
      })
    }
    markAllDirs(vaultFilesTree)
    setExpandedDirectories(newMap)
  }, [vaultFilesTree])

  useEffect(() => {
    const handleVaultSwitched = async () => {
      try {
        await saveCurrentlyOpenedFile()
        editor?.replaceBlocks(editor.topLevelBlocks, [])
        setCurrentlyOpenFilePath(null)
        setSelectedDirectory(null)
        setNeedToWriteEditorContentToDisk(false)
        setNeedToIndexEditorContent(false)

        const fetchedFiles = await window.fileSystem.getFilesTreeForWindow()
        const sortedFiles = sortFilesAndDirectories(fetchedFiles, null)
        setVaultFilesTree(sortedFiles)
        setVaultFilesFlattened(flattenFileInfoTree(sortedFiles))
        setExpandedDirectories(new Map())
      } catch (error) {
        toast.error(errorToStringRendererProcess(error))
      }
    }

    const removeVaultSwitchListener = window.ipcRenderer.receive('vault-switched', handleVaultSwitched)

    return () => {
      removeVaultSwitchListener()
    }
  }, [editor, saveCurrentlyOpenedFile])

  const refreshFiles = async () => {
    setFilesLoadState('loading')
    setFilesLoadError(null)
    try {
      const fetchedFiles = await window.fileSystem.getFilesTreeForWindow()
      const sortedFiles = sortFilesAndDirectories(fetchedFiles, null)
      setVaultFilesTree(sortedFiles)
      setVaultFilesFlattened(flattenFileInfoTree(sortedFiles))
      setFilesLoadState('ready')
    } catch (error) {
      const message = errorToStringRendererProcess(error)
      setFilesLoadError(message)
      setFilesLoadState('error')
      throw error
    }
  }

  useEffect(() => {
    const handleFilesListUpdateFromMainProcess = async (updatedFiles: FileInfoTree) => {
      const sortedFiles = sortFilesAndDirectories(updatedFiles, null)
      setVaultFilesTree(sortedFiles)
      const updatedFlattenedFiles = flattenFileInfoTree(sortedFiles)
      setVaultFilesFlattened(updatedFlattenedFiles)
      setFilesLoadState('ready')
      setFilesLoadError(null)

      const paths = new Set(updatedFlattenedFiles.map((file) => file.path))
      const currentFileWasRemoved = currentlyOpenFilePath !== null && !paths.has(currentlyOpenFilePath)
      if (currentFileWasRemoved) {
        setSaveState('error')
        setSaveError('file-removed')
      }

      const directoriesToBeExpanded = await findRelevantDirectoriesToBeExpanded(
        currentFileWasRemoved ? null : currentlyOpenFilePath,
        expandedDirectories,
      )
      setExpandedDirectories(
        new Map([...directoriesToBeExpanded].filter(([directoryPath]) => paths.has(directoryPath))),
      )
      if (selectedDirectory && !paths.has(selectedDirectory)) {
        setSelectedDirectory(null)
      }
    }

    const removeFilesListListener = window.ipcRenderer.receive('files-list', handleFilesListUpdateFromMainProcess)

    return () => {
      removeFilesListListener()
    }
  }, [currentlyOpenFilePath, expandedDirectories])

  useEffect(() => {
    refreshFiles().catch((error) => toast.error(errorToStringRendererProcess(error)))
  }, [])

  const [openTabs, setOpenTabs] = useState<TabItem[]>([])

  useEffect(() => {
    if (!currentlyOpenFilePath) return
    setOpenTabs((prev) => {
      if (
        prev.some(
          (tab) =>
            tab.filePath === currentlyOpenFilePath ||
            (isVirtualWorkspaceUri(currentlyOpenFilePath) && tab.filePath === currentlyOpenFilePath),
        )
      ) {
        return prev
      }
      if (isVirtualWorkspaceUri(currentlyOpenFilePath)) {
        const title = VIRTUAL_URI_TITLES[currentlyOpenFilePath] || '工作区标签'
        const tabId = currentlyOpenFilePath.replace(/[^a-zA-Z0-9-]/g, '-')
        return [...prev, { id: tabId, filePath: currentlyOpenFilePath, title }]
      }
      const rawName = currentlyOpenFilePath.split(/[/\\]/).pop() || 'Untitled'
      const title = removeFileExtension(rawName)
      return [...prev, { id: currentlyOpenFilePath, filePath: currentlyOpenFilePath, title }]
    })
  }, [currentlyOpenFilePath])

  const selectTab = useCallback(
    (tabId: string) => {
      const target = openTabs.find((t) => t.id === tabId || t.filePath === tabId)
      if (target && target.filePath !== currentlyOpenFilePath) {
        openOrCreateFile(target.filePath)
      }
    },
    [openTabs, currentlyOpenFilePath, openOrCreateFile],
  )

  const closeTab = useCallback(
    (tabId: string) => {
      setOpenTabs((prev) => {
        const target = prev.find((t) => t.id === tabId || t.filePath === tabId)
        const next = prev.filter((t) => t.id !== tabId && t.filePath !== tabId)
        const isCurrentActive = target
          ? target.filePath === currentlyOpenFilePath
          : tabId === currentlyOpenFilePath
        if (isCurrentActive) {
          if (next.length > 0) {
            const nextActive = next[next.length - 1]
            openOrCreateFile(nextActive.filePath)
          } else {
            setCurrentlyOpenFilePath(null)
          }
        }
        return next
      })
    },
    [currentlyOpenFilePath, openOrCreateFile],
  )

  const closeOtherTabs = useCallback(
    (tabId: string) => {
      setOpenTabs((prev) => prev.filter((t) => t.id === tabId || t.filePath === tabId))
      const target = openTabs.find((t) => t.id === tabId || t.filePath === tabId)
      if (target && target.filePath !== currentlyOpenFilePath) {
        openOrCreateFile(target.filePath)
      }
    },
    [openTabs, currentlyOpenFilePath, openOrCreateFile],
  )

  const closeAllTabs = useCallback(() => {
    setOpenTabs([])
    setCurrentlyOpenFilePath(null)
  }, [])

  const noteStats = useMemo(() => {
    if (!editor || !currentlyOpenFilePath || isVirtualWorkspaceUri(currentlyOpenFilePath)) return { words: 0, characters: 0 }
    try {
      const blocks = editor.topLevelBlocks || []
      let totalChars = 0
      let totalWords = 0
      for (const b of blocks) {
        // @ts-ignore
        const textContent = Array.isArray(b.content) ? b.content.map((c: any) => c.text || '').join('') : ''
        if (textContent) {
          totalChars += textContent.length
          totalWords += (textContent.trim().match(/\S+/g) || []).length
        }
      }
      return { words: totalWords, characters: totalChars }
    } catch {
      return { words: 0, characters: 0 }
    }
  }, [editor, currentlyOpenFilePath, saveState])

  const contextValues = {
    vaultFilesTree,
    vaultFilesFlattened,
    filesLoadState,
    filesLoadError,
    refreshFiles,
    expandedDirectories,
    handleDirectoryToggle,
    collapseAllDirectories,
    expandAllDirectories,
    currentlyOpenFilePath,
    setCurrentlyOpenFilePath,
    saveCurrentlyOpenedFile,
    saveState,
    saveError,
    editor,
    navigationHistory,
    addToNavigationHistory,
    openOrCreateFile,
    suggestionsState,
    spellCheckEnabled,
    highlightData,
    noteToBeRenamed,
    setNoteToBeRenamed,
    fileDirToBeRenamed,
    setFileDirToBeRenamed,
    renameFile,
    setSuggestionsState,
    setSpellCheckEnabled,
    deleteFile,
    selectedDirectory,
    setSelectedDirectory,
    openTabs,
    activeTabId: currentlyOpenFilePath,
    selectTab,
    closeTab,
    closeOtherTabs,
    closeAllTabs,
    noteStats,
  }

  const contextValuesMemo: FileContextType = React.useMemo(
    () => ({
      ...contextValues,
    }),
    [contextValues],
  )

  return <FileContext.Provider value={contextValuesMemo}>{children}</FileContext.Provider>
}
