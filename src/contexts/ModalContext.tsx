import React, { createContext, useContext, useState, ReactNode, useMemo } from 'react'

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
  const [isNewDirectoryModalOpen, setIsNewDirectoryModalOpen] = useState(false)
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)
  const [isWikiImporterOpen, setIsWikiImporterOpen] = useState(false)
  const [isAIOrganizationOpen, setIsAIOrganizationOpen] = useState(false)
  const [isObsidianCompatOpen, setIsObsidianCompatOpen] = useState(false)
  const [isScheduledTasksOpen, setIsScheduledTasksOpen] = useState(false)
  const [isVaultManagementOpen, setIsVaultManagementOpen] = useState(false)
  const [isExportOpen, setIsExportOpen] = useState(false)
  const [isPluginManagerOpen, setIsPluginManagerOpen] = useState(false)
  const [isKnowledgeGraphOpen, setIsKnowledgeGraphOpen] = useState(false)

  const modalOpenContextValue = useMemo(
    () => ({
      isNewDirectoryModalOpen,
      setIsNewDirectoryModalOpen,
      isSettingsModalOpen,
      setIsSettingsModalOpen,
      isWikiImporterOpen,
      setIsWikiImporterOpen,
      isAIOrganizationOpen,
      setIsAIOrganizationOpen,
      isObsidianCompatOpen,
      setIsObsidianCompatOpen,
      isScheduledTasksOpen,
      setIsScheduledTasksOpen,
      isVaultManagementOpen,
      setIsVaultManagementOpen,
      isExportOpen,
      setIsExportOpen,
      isPluginManagerOpen,
      isKnowledgeGraphOpen,
      setIsPluginManagerOpen,
      setIsKnowledgeGraphOpen,
    }),
    [
      isNewDirectoryModalOpen,
      isSettingsModalOpen,
      isWikiImporterOpen,
      isAIOrganizationOpen,
      isObsidianCompatOpen,
      isScheduledTasksOpen,
      isVaultManagementOpen,
      isExportOpen,
      isPluginManagerOpen,
      isKnowledgeGraphOpen,
    ],
  )

  return <ModalContext.Provider value={modalOpenContextValue}>{children}</ModalContext.Provider>
}

export default ModalProvider
