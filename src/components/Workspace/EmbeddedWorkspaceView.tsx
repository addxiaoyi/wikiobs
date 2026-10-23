import React, { lazy, Suspense } from 'react'
import { Loader2 } from 'lucide-react'

const SettingsView = lazy(() => import('../Settings/Settings'))
const PluginManagerView = lazy(() => import('../Common/PluginManagerModal'))
const ScheduledTasksView = lazy(() => import('../Common/ScheduledTasksModal'))
const ExportView = lazy(() => import('../Common/ExportModal'))
const ObsidianCompatView = lazy(() => import('../Common/ObsidianCompatModal'))
const AIOrganizationView = lazy(() => import('../Common/AIOrganizationModal'))
const WikiImporterView = lazy(() => import('../Common/WikiImporterModal'))
const VaultManagementView = lazy(() => import('../Common/VaultManagementModal'))

interface EmbeddedWorkspaceViewProps {
  uri: string
  onClose: () => void
}

export const EmbeddedWorkspaceView: React.FC<EmbeddedWorkspaceViewProps> = ({ uri, onClose }) => {
  return (
    <div className="relative size-full overflow-hidden bg-background">
      <Suspense
        fallback={
          <div className="flex size-full items-center justify-center gap-2 text-xs text-muted-foreground">
            <Loader2 size={16} className="animate-spin text-[#7b68ee]" />
            <span>加载视图中...</span>
          </div>
        }
      >
        {uri === 'wikiobs://settings' && <SettingsView isOpen embedded onClose={onClose} />}
        {uri === 'wikiobs://plugins' && <PluginManagerView isOpen embedded onClose={onClose} />}
        {uri === 'wikiobs://tasks' && <ScheduledTasksView isOpen embedded onClose={onClose} />}
        {uri === 'wikiobs://export' && <ExportView isOpen embedded onClose={onClose} />}
        {uri === 'wikiobs://obsidian' && <ObsidianCompatView isOpen embedded onClose={onClose} />}
        {uri === 'wikiobs://ai-org' && <AIOrganizationView isOpen embedded onClose={onClose} />}
        {uri === 'wikiobs://wiki-importer' && <WikiImporterView isOpen embedded onClose={onClose} />}
        {uri === 'wikiobs://vaults' && <VaultManagementView isOpen embedded onClose={onClose} />}
      </Suspense>
    </div>
  )
}

export default EmbeddedWorkspaceView
