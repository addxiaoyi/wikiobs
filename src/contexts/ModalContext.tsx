import React, { createContext, useContext, useState, ReactNode, useMemo, useCallback } from 'react'
import { useFileContext } from './FileContext'
import { useContentContext } from './ContentContext'

interface ModalProviderProps {
  children: ReactNode
}

interface ModalOpenContextType {
  isNewDirectoryModalOpen: boolean
  setIsNewDirectoryModalOpen: (newDirectoryOpen: boolean) => void
  isSettingsModalOpen: boolean
  setIsSettingsModalOpen: (settingsOpen: boolean) => void
  isWikiImporterOpen: boolean
  setIsWikiImporterOpen: (open: boolean) => void
  isAIOrganizationOpen: boolean
  setIsAIOrganizationOpen: (open: boolean) => void
  isObsidianCompatOpen: boolean
  setIsObsidianCompatOpen: (open: boolean) => void
  isScheduledTasksOpen: boolean
  setIsScheduledTasksOpen: (open: boolean) => void
  isVaultManagementOpen: boolean
  setIsVaultManagementOpen: (open: boolean) => void
  isExportOpen: boolean
  setIsExportOpen: (open: boolean) => void
  isPluginManagerOpen: boolean
  setIsPluginManagerOpen: (open: boolean) => void
  isKnowledgeGraphOpen: boolean
  setIsKnowledgeGraphOpen: (open: boolean) => void
  isCommandPaletteOpen: boolean
  setIsCommandPaletteOpen: React.Dispatch<React.SetStateAction<boolean>>
}

const ModalContext = createContext<ModalOpenContextType | undefined>(undefined)

export const useModalOpeners = (): ModalOpenContextType => {
  const context = useContext(ModalContext)
  if (context === undefined) {
    throw new Error('useModalOpeners must be used within a ModalProvider')
  }
  return context
}

export const ModalProvider: React.FC<ModalProviderProps> = ({ children }) => {
  const { openOrCreateFile } = useFileContext()
  const { setShowEditor } = useContentContext()

  const [isNewDirectoryModalOpen, setIsNewDirectoryModalOpen] = useState(false)
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)

  const openVirtualTab = useCallback(
    (uri: string) => {
      setShowEditor(true)
      openOrCreateFile(uri)
    },
    [setShowEditor, openOrCreateFile],
  )

  const setIsSettingsModalOpen = useCallback(
    (open: boolean) => {
      if (open) openVirtualTab('wikiobs://settings')
    },
    [openVirtualTab],
  )

  const setIsWikiImporterOpen = useCallback(
    (open: boolean) => {
      if (open) openVirtualTab('wikiobs://wiki-importer')
    },
    [openVirtualTab],
  )

  const setIsAIOrganizationOpen = useCallback(
    (open: boolean) => {
      if (open) openVirtualTab('wikiobs://ai-org')
    },
    [openVirtualTab],
  )

  const setIsObsidianCompatOpen = useCallback(
    (open: boolean) => {
      if (open) openVirtualTab('wikiobs://obsidian')
    },
    [openVirtualTab],
  )

  const setIsScheduledTasksOpen = useCallback(
    (open: boolean) => {
      if (open) openVirtualTab('wikiobs://tasks')
    },
    [openVirtualTab],
  )

  const setIsVaultManagementOpen = useCallback(
    (open: boolean) => {
      if (open) openVirtualTab('wikiobs://vaults')
    },
    [openVirtualTab],
  )

  const setIsExportOpen = useCallback(
    (open: boolean) => {
      if (open) openVirtualTab('wikiobs://export')
    },
    [openVirtualTab],
  )

  const setIsPluginManagerOpen = useCallback(
    (open: boolean) => {
      if (open) openVirtualTab('wikiobs://plugins')
    },
    [openVirtualTab],
  )

  const setIsKnowledgeGraphOpen = useCallback(
    (open: boolean) => {
      if (open) openVirtualTab('graph://global')
    },
    [openVirtualTab],
  )

  const modalOpenContextValue = useMemo(
    () => ({
      isNewDirectoryModalOpen,
      setIsNewDirectoryModalOpen,
      isSettingsModalOpen: false,
      setIsSettingsModalOpen,
      isWikiImporterOpen: false,
      setIsWikiImporterOpen,
      isAIOrganizationOpen: false,
      setIsAIOrganizationOpen,
      isObsidianCompatOpen: false,
      setIsObsidianCompatOpen,
      isScheduledTasksOpen: false,
      setIsScheduledTasksOpen,
      isVaultManagementOpen: false,
      setIsVaultManagementOpen,
      isExportOpen: false,
      setIsExportOpen,
      isPluginManagerOpen: false,
      isKnowledgeGraphOpen: false,
      setIsPluginManagerOpen,
      setIsKnowledgeGraphOpen,
      isCommandPaletteOpen,
      setIsCommandPaletteOpen,
    }),
    [
      isNewDirectoryModalOpen,
      setIsNewDirectoryModalOpen,
      setIsSettingsModalOpen,
      setIsWikiImporterOpen,
      setIsAIOrganizationOpen,
      setIsObsidianCompatOpen,
      setIsScheduledTasksOpen,
      setIsVaultManagementOpen,
      setIsExportOpen,
      setIsPluginManagerOpen,
      setIsKnowledgeGraphOpen,
      isCommandPaletteOpen,
      setIsCommandPaletteOpen,
    ],
  )

  return <ModalContext.Provider value={modalOpenContextValue}>{children}</ModalContext.Provider>
}

export default ModalProvider
