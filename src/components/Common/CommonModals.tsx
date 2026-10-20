import React, { lazy, Suspense } from 'react'

import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles'
import { useModalOpeners } from '@/contexts/ModalContext'
import { useFileContext } from '@/contexts/FileContext'
import { appMuiTheme } from '@/theme/appMuiTheme'
import { useTranslation } from '@/lib/i18n'

const SettingsModal = lazy(() => import('../Settings/Settings'))
const RenameNoteModal = lazy(() => import('../File/RenameNote'))
const RenameDirModal = lazy(() => import('../File/RenameDirectory'))
const NewDirectoryComponent = lazy(() => import('../File/NewDirectory'))
const WikiImporterModal = lazy(() => import('./WikiImporterModal'))
const AIOrganizationModal = lazy(() => import('./AIOrganizationModal'))
const ObsidianCompatModal = lazy(() => import('./ObsidianCompatModal'))
const ScheduledTasksModal = lazy(() => import('./ScheduledTasksModal'))
const VaultManagementModal = lazy(() => import('./VaultManagementModal'))
const ExportModal = lazy(() => import('./ExportModal'))
const PluginManagerModal = lazy(() => import('./PluginManagerModal'))
const KnowledgeGraphModal = lazy(() => import('./KnowledgeGraphModal'))

const ModalLoadingFallback = () => {
  const { t } = useTranslation()

  return (
    <div
      className="fixed inset-0 z-[9998] grid place-items-center bg-black/20 text-sm text-muted-foreground"
      role="status"
      aria-live="polite"
    >
      {t('common.loadingWorkspace')}
    </div>
  )
}
const CommonModals: React.FC = () => {
  const {
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
    setIsPluginManagerOpen,
    isKnowledgeGraphOpen,
    setIsKnowledgeGraphOpen,
  } = useModalOpeners()

  const { noteToBeRenamed, fileDirToBeRenamed } = useFileContext()

  return (
    <Suspense fallback={<ModalLoadingFallback />}>
      {isNewDirectoryModalOpen && <NewDirectoryComponent isOpen onClose={() => setIsNewDirectoryModalOpen(false)} />}
      {noteToBeRenamed && <RenameNoteModal />}
      {fileDirToBeRenamed && <RenameDirModal />}
      {isSettingsModalOpen && <SettingsModal isOpen onClose={() => setIsSettingsModalOpen(false)} />}
      <MuiThemeProvider theme={appMuiTheme}>
        {isWikiImporterOpen && <WikiImporterModal isOpen onClose={() => setIsWikiImporterOpen(false)} />}
        {isAIOrganizationOpen && <AIOrganizationModal isOpen onClose={() => setIsAIOrganizationOpen(false)} />}
        {isObsidianCompatOpen && <ObsidianCompatModal isOpen onClose={() => setIsObsidianCompatOpen(false)} />}
        {isScheduledTasksOpen && <ScheduledTasksModal isOpen onClose={() => setIsScheduledTasksOpen(false)} />}
        {isVaultManagementOpen && <VaultManagementModal isOpen onClose={() => setIsVaultManagementOpen(false)} />}
        {isExportOpen && <ExportModal isOpen onClose={() => setIsExportOpen(false)} />}
        {isPluginManagerOpen && <PluginManagerModal isOpen onClose={() => setIsPluginManagerOpen(false)} />}
        {isKnowledgeGraphOpen && <KnowledgeGraphModal isOpen onClose={() => setIsKnowledgeGraphOpen(false)} />}
      </MuiThemeProvider>
    </Suspense>
  )
}

export default CommonModals
