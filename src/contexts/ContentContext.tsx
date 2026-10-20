import React, { createContext, useContext, useMemo, ReactNode, useState, useCallback, useEffect } from 'react'

import posthog from 'posthog-js'
import { useChatContext } from './ChatContext'
import { useFileContext } from './FileContext'
import { getFilesInDirectory, getNextAvailableFileNameGivenBaseName } from '@/lib/file'

interface ContentContextType {
  showEditor: boolean
  setShowEditor: (showEditor: boolean) => void
  openContent: (
    pathOrChatID: string,
    optionalContentToWriteOnCreate?: string,
    dontUpdateChatHistory?: boolean,
  ) => Promise<void>
  currentOpenFileOrChatID: string | null
  createUntitledNote: (parentFileOrDirectory?: string) => Promise<void>
}

const ContentContext = createContext<ContentContextType | undefined>(undefined)

export const useContentContext = (): ContentContextType => {
  const context = useContext(ContentContext)
  if (context === undefined) {
    throw new Error('useContentContext must be used within a ContentProvider')
  }
  return context
}

interface ContentProviderProps {
  children: ReactNode
}

export const ContentProvider: React.FC<ContentProviderProps> = ({ children }) => {
  const [showEditor, setShowEditor] = useState(false)
  const [currentOpenFileOrChatID, setCurrentOpenFileOrChatID] = useState<string | null>(null)

  const { allChatsMetadata, openNewChat } = useChatContext()
  const {
    vaultFilesFlattened: flattenedFiles,
    openOrCreateFile,
    addToNavigationHistory,
    selectedDirectory,
  } = useFileContext()

  const openContent = React.useCallback(
    async (pathOrChatID: string, optionalContentToWriteOnCreate?: string, dontUpdateChatHistory?: boolean) => {
      if (!pathOrChatID) return
      const chatMetadata = allChatsMetadata.find((chat) => chat.id === pathOrChatID)
      if (chatMetadata) {
        await openNewChat(pathOrChatID)
      } else {
        setShowEditor(true)
        await openOrCreateFile(pathOrChatID, optionalContentToWriteOnCreate)
      }
      setCurrentOpenFileOrChatID(pathOrChatID)
      if (!dontUpdateChatHistory) {
        addToNavigationHistory(pathOrChatID)
      }
    },
    [allChatsMetadata, openNewChat, openOrCreateFile, addToNavigationHistory],
  )

  useEffect(() => {
    if (showEditor || flattenedFiles.length === 0) return

    const currentFileStillExists = currentOpenFileOrChatID
      ? flattenedFiles.some((file) => file.path === currentOpenFileOrChatID)
      : false
    if (currentFileStillExists) return

    const firstMarkdownFile = flattenedFiles.find((file) => file.name.toLowerCase().endsWith('.md'))
    if (!firstMarkdownFile) return

    openContent(firstMarkdownFile.path, undefined, true)
  }, [showEditor, currentOpenFileOrChatID, flattenedFiles, openContent])
  const createUntitledNote = useCallback(
    async (parentDirectory?: string) => {
      const directoryToMakeFileIn =
        parentDirectory || selectedDirectory || (await window.electronStore.getVaultDirectoryForWindow())

      const filesInDirectory = await getFilesInDirectory(directoryToMakeFileIn, flattenedFiles)
      const fileName = getNextAvailableFileNameGivenBaseName(
        filesInDirectory.map((file) => file.name),
        'Untitled',
      )
      const finalPath = await window.path.join(directoryToMakeFileIn, fileName)
      await openContent(finalPath, `## `)
      posthog.capture('created_new_note_from_new_note_modal')
    },
    [selectedDirectory, flattenedFiles, openContent],
  )

  const ContentContextMemo = useMemo(
    () => ({
      showEditor,
      setShowEditor,
      openContent,
      currentOpenFileOrChatID,
      createUntitledNote,
    }),
    [showEditor, openContent, currentOpenFileOrChatID, createUntitledNote],
  )

  return <ContentContext.Provider value={ContentContextMemo}>{children}</ContentContext.Provider>
}
