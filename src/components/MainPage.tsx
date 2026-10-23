/* eslint-disable react/button-has-type */
/* eslint-disable jsx-a11y/control-has-associated-label */
/* eslint-disable react/jsx-no-useless-fragment */
/* eslint-disable no-nested-ternary */
import React from 'react'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'

import '../styles/global.css'
import ChatComponent from './Chat'
import TitleBar from './TitleBar/TitleBar'
import EditorManager from './Editor/EditorManager'
import IconsSidebar from './Sidebars/IconsSidebar'
import SidebarManager from './Sidebars/MainSidebar'
import EmptyPage from './Common/EmptyPage'
import { ContentProvider, useContentContext } from '../contexts/ContentContext'
// import WritingAssistant from './WritingAssistant/WritingAssistant'
import { ChatProvider, useChatContext } from '@/contexts/ChatContext'
import { FileProvider, useFileContext } from '@/contexts/FileContext'
import ModalProvider from '@/contexts/ModalContext'
import CommonModals from './Common/CommonModals'
import useAppShortcuts from '../lib/shortcuts/use-shortcut'
import WindowControls from './ui/window-controls'
import SimilarFilesSidebarComponent from '@/components/Sidebars/SimilarFilesSidebar'
import EditorTabsBar from './Editor/EditorTabsBar'
import StatusBar from './StatusBar/StatusBar'
import GlobalGraphView from './Graph/GlobalGraphView'
import LocalGraphPanel from './Graph/LocalGraphPanel'
import EmbeddedWorkspaceView from './Workspace/EmbeddedWorkspaceView'

interface MainContentProps {
  togglePanel: (panel: 'chat' | 'similarFiles' | 'localGraph' | null) => void
}

// Moved MainContent outside as a separate component
const MainContent: React.FC<MainContentProps> = ({ togglePanel }) => {
  const { currentlyOpenFilePath, saveCurrentlyOpenedFile, openTabs, closeTab } = useFileContext()
  const { showEditor, setShowEditor } = useContentContext()

  const closeEditor = async () => {
    await saveCurrentlyOpenedFile()
    setShowEditor(false)
  }

  const isGlobalGraph = currentlyOpenFilePath === 'graph://global'
  const isVirtualWorkspace = currentlyOpenFilePath?.startsWith('wikiobs://')

  return (
    <div className="relative flex size-full flex-col overflow-hidden">
      {currentlyOpenFilePath && showEditor && (
        <div className="flex size-full flex-col overflow-hidden">
          <EditorTabsBar />
          <div className="relative flex-1 overflow-hidden">
            {isGlobalGraph ? (
              <GlobalGraphView />
            ) : isVirtualWorkspace ? (
              <EmbeddedWorkspaceView
                uri={currentlyOpenFilePath}
                onClose={() => {
                  const currentTab = openTabs.find((t) => t.filePath === currentlyOpenFilePath)
                  if (currentTab) closeTab(currentTab.id)
                }}
              />
            ) : (
              <>
                <WindowControls
                  onClose={closeEditor}
                  onMaximize={() => {
                    togglePanel('chat')
                  }}
                />
                <EditorManager />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
const MainPageContent: React.FC = () => {
  const { currentlyOpenFilePath } = useFileContext()
  const { setShowEditor, showEditor } = useContentContext()
  const { getShortcutDescription } = useAppShortcuts()
  const { activePanel, setActivePanel, openNewChat, sidebarShowing } = useChatContext()

  const togglePanel = (panel: 'chat' | 'similarFiles' | 'localGraph' | null) => {
    setActivePanel((prev) => (prev === panel ? null : panel))
  }

  const panelSizes = {
    mainContent: 65,
    chatComponent: 35,
    similarFilesSidebar: 30,
  }

  return (
    <div className="relative flex h-screen flex-col overflow-hidden">
      <TitleBar activePanel={activePanel} togglePanel={togglePanel} />
      <div className="flex min-h-0 flex-1">
        <div className="w-10 min-w-10 max-w-10 shrink-0">
          <IconsSidebar getShortcutDescription={getShortcutDescription} />
        </div>

        <ResizablePanelGroup direction="horizontal" className="flex-1">
          {sidebarShowing && (
            <>
              <ResizablePanel
                className="sidebar-panel"
                defaultSize={20}
                minSize={15}
                maxSize={40}
              >
                <div className="size-full border-y-0 border-l-0 border-r border-solid border-border">
                  <SidebarManager />
                </div>
              </ResizablePanel>

              <ResizableHandle />
            </>
          )}

          <ResizablePanel>
            <div className="size-full">
              {currentlyOpenFilePath || activePanel ? (
                <ResizablePanelGroup direction="horizontal" className="size-full">
                  {currentlyOpenFilePath && showEditor && (
                    <>
                      <ResizablePanel
                        className={`main-editor-panel ${activePanel ? 'is-background-panel' : ''}`}
                        defaultSize={
                          activePanel === 'chat'
                            ? panelSizes.mainContent
                            : activePanel === 'similarFiles' || activePanel === 'localGraph'
                              ? 70
                              : 100
                        }
                      >
                        <MainContent togglePanel={togglePanel} />
                      </ResizablePanel>
                      {activePanel && <ResizableHandle />}
                    </>
                  )}
                  {activePanel === 'chat' && (
                    <ResizablePanel className="chat-panel" defaultSize={panelSizes.chatComponent}>
                      <div className="relative size-full ">
                        <WindowControls
                          onClose={() => setActivePanel(null)}
                          onMaximize={() => setShowEditor(false)}
                          onNewChat={() => openNewChat()}
                        />
                        <ChatComponent />
                      </div>
                    </ResizablePanel>
                  )}
                  {activePanel === 'similarFiles' && (
                    <ResizablePanel className="similar-panel" defaultSize={panelSizes.similarFilesSidebar}>
                      <SimilarFilesSidebarComponent />
                    </ResizablePanel>
                  )}
                  {activePanel === 'localGraph' && (
                    <ResizablePanel className="local-graph-panel" defaultSize={30} minSize={15} maxSize={50}>
                      <LocalGraphPanel />
                    </ResizablePanel>
                  )}
                </ResizablePanelGroup>
              ) : (
                <EmptyPage />
              )}
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>

        <CommonModals />
      </div>
      <StatusBar />
    </div>
  )
}

const MainPageComponent: React.FC = () => {
  return (
    <FileProvider>
      <ChatProvider>
        <ContentProvider>
          <ModalProvider>
            <MainPageContent />
          </ModalProvider>
        </ContentProvider>
      </ChatProvider>
    </FileProvider>
  )
}

export default MainPageComponent
