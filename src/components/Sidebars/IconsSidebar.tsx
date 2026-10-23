import React, { useEffect, useRef } from 'react'

import {
  Files,
  MessageSquare,
  Search,
  PenLine,
  FolderPlus,
  Globe,
  Sparkles,
  Network,
  Clock,
  ArrowUpDown,
  Compass,
  Puzzle,
  Moon,
  Sun,
  Settings,
  BookOpen,
} from 'lucide-react'
import gsap from 'gsap'
import { useTranslation } from '@/lib/i18n'
import { useModalOpeners } from '../../contexts/ModalContext'
import { useChatContext } from '@/contexts/ChatContext'
import { useContentContext } from '@/contexts/ContentContext'
import { useFileContext } from '@/contexts/FileContext'
import { useThemeManager } from '@/contexts/ThemeContext'
import VaultSwitcher from '../Common/VaultSwitcher'
import { WikiObsLogo } from '../Common/WikiObsLogo'
import { Easing } from '@/lib/gsap-animations'

export interface IconsSidebarProps {
  getShortcutDescription: (action: string) => string
}

const IconsSidebar: React.FC<IconsSidebarProps> = ({ getShortcutDescription }) => {
  const { sidebarShowing, setSidebarShowing } = useChatContext()
  const { t } = useTranslation()
  const iconsRef = useRef<HTMLDivElement>(null)

  const {
    setIsSettingsModalOpen,
    setIsWikiImporterOpen,
    setIsAIOrganizationOpen,
    setIsNewDirectoryModalOpen,
    setIsScheduledTasksOpen,
    setIsExportOpen,
    setIsObsidianCompatOpen,
    setIsPluginManagerOpen,
    setIsVaultManagementOpen,
    setIsKnowledgeGraphOpen,
  } = useModalOpeners()
  const { state: theme, actions: themeActions } = useThemeManager()
  const { createUntitledNote, setShowEditor } = useContentContext()
  const { openOrCreateFile, currentlyOpenFilePath } = useFileContext()

  const openTab = (uri: string) => {
    setShowEditor(true)
    openOrCreateFile(uri)
  }

  useEffect(() => {
    if (iconsRef.current) {
      const ctx = gsap.context(() => {
        gsap.fromTo(
          '.icons-sidebar-group > *',
          { opacity: 0 },
          {
            opacity: 1,
            duration: 0.35,
            stagger: 0.03,
            ease: Easing.smooth,
            clearProps: 'all',
          },
        )
        gsap.fromTo(
          '.icons-sidebar-group-bottom > *',
          { opacity: 0 },
          {
            opacity: 1,
            duration: 0.35,
            stagger: 0.04,
            ease: Easing.smooth,
            delay: 0.15,
            clearProps: 'all',
          },
        )
      }, iconsRef)
      return () => ctx.revert()
    }
  }, [])

  return (
    <nav
      ref={iconsRef}
      aria-label={t('app.name')}
      onContextMenu={(e) => e.preventDefault()}
      className="icons-sidebar w-10 min-w-10 max-w-10 shrink-0 flex h-full flex-col items-center justify-start py-2 select-none"
    >
      <button
        type="button"
        className="sidebar-brand group mb-1.5 flex size-8 cursor-pointer items-center justify-center rounded-md transition-all duration-200 hover:scale-105 active:scale-95"
        title="WIKIOBS · 展开/收起侧边栏"
        aria-label="WIKIOBS · 展开/收起侧边栏"
        onClick={() => setSidebarShowing(sidebarShowing ? null : 'files')}
      >
        <WikiObsLogo size={20} className="drop-shadow-[0_0_8px_rgba(123,104,238,0.5)] transition-transform group-hover:drop-shadow-[0_0_12px_rgba(168,85,247,0.7)]" />
      </button>
      <div className="icons-sidebar-group flex-1 min-h-0 w-full flex flex-col items-center gap-1 overflow-y-auto overflow-x-hidden no-scrollbar">
        <button
          type="button"
          className={`icons-sidebar-button flex size-8 items-center justify-center rounded-md transition-colors ${
            sidebarShowing === 'files' ? 'is-active' : ''
          }`}
          title={getShortcutDescription('open-files') || t('files.title')}
          aria-label={getShortcutDescription('open-files') || t('files.title')}
          aria-keyshortcuts="Control+O"
          aria-pressed={sidebarShowing === 'files'}
          aria-current={sidebarShowing === 'files' ? 'page' : undefined}
          onClick={() => setSidebarShowing(sidebarShowing === 'files' ? null : 'files')}
        >
          <Files size={16} strokeWidth={1.8} />
        </button>
        <button
          type="button"
          className={`icons-sidebar-button flex size-8 items-center justify-center rounded-md transition-colors ${
            sidebarShowing === 'chats' ? 'is-active' : ''
          }`}
          title={t('sidebar.chatHistory')}
          aria-label={t('sidebar.chatHistory')}
          aria-keyshortcuts="Control+T"
          aria-pressed={sidebarShowing === 'chats'}
          aria-current={sidebarShowing === 'chats' ? 'page' : undefined}
          onClick={() => setSidebarShowing(sidebarShowing === 'chats' ? null : 'chats')}
        >
          <MessageSquare size={16} strokeWidth={1.8} />
        </button>
        <button
          type="button"
          className={`icons-sidebar-button flex size-8 items-center justify-center rounded-md transition-colors ${
            sidebarShowing === 'search' ? 'is-active' : ''
          }`}
          title={getShortcutDescription('open-search') || t('sidebar.semanticSearch')}
          aria-label={getShortcutDescription('open-search') || t('sidebar.semanticSearch')}
          aria-keyshortcuts="Control+P"
          aria-pressed={sidebarShowing === 'search'}
          aria-current={sidebarShowing === 'search' ? 'page' : undefined}
          onClick={() => setSidebarShowing(sidebarShowing === 'search' ? null : 'search')}
        >
          <Search size={16} strokeWidth={1.8} />
        </button>
        <div className="my-1 h-px w-4 bg-border" />

        <button
          type="button"
          className="icons-sidebar-button flex size-8 items-center justify-center rounded-md transition-colors"
          title={getShortcutDescription('open-new-note') || t('files.newNote')}
          aria-label={getShortcutDescription('open-new-note') || t('files.newNote')}
          aria-keyshortcuts="Control+N"
          onClick={() => createUntitledNote()}
        >
          <PenLine size={16} strokeWidth={1.8} />
        </button>
        <button
          type="button"
          className="icons-sidebar-button flex size-8 items-center justify-center rounded-md transition-colors"
          title={getShortcutDescription('open-new-directory-modal') || t('sidebar.newDirectory')}
          aria-label={getShortcutDescription('open-new-directory-modal') || t('sidebar.newDirectory')}
          aria-keyshortcuts="Control+D"
          onClick={() => setIsNewDirectoryModalOpen(true)}
        >
          <FolderPlus size={16} strokeWidth={1.8} />
        </button>

        <div className="my-1 h-px w-4 bg-border" />

        <button
          type="button"
          className={`icons-sidebar-button flex size-8 items-center justify-center rounded-md transition-colors ${
            currentlyOpenFilePath === 'wikiobs://wiki-importer' ? 'is-active' : ''
          }`}
          title={t('wikiImporter.title')}
          aria-label={t('wikiImporter.title')}
          onClick={() => openTab('wikiobs://wiki-importer')}
        >
          <Globe size={16} strokeWidth={1.8} />
        </button>
        <button
          type="button"
          className={`icons-sidebar-button flex size-8 items-center justify-center rounded-md transition-colors ${
            currentlyOpenFilePath === 'wikiobs://ai-org' ? 'is-active' : ''
          }`}
          title={t('aiOrg.title')}
          aria-label={t('aiOrg.title')}
          onClick={() => openTab('wikiobs://ai-org')}
        >
          <Sparkles size={16} strokeWidth={1.8} />
        </button>
        <button
          type="button"
          data-testid="sidebar-btn-graph"
          className={`icons-sidebar-button flex size-8 items-center justify-center rounded-md transition-colors ${
            currentlyOpenFilePath === 'graph://global' ? 'is-active' : ''
          }`}
          title={t('graph.title')}
          aria-label={t('graph.title')}
          onClick={() => openTab('graph://global')}
        >
          <Network size={16} strokeWidth={1.8} />
        </button>
        <button
          type="button"
          data-testid="sidebar-btn-scheduled"
          className={`icons-sidebar-button flex size-8 items-center justify-center rounded-md transition-colors ${
            currentlyOpenFilePath === 'wikiobs://tasks' ? 'is-active' : ''
          }`}
          title={t('scheduled.title')}
          aria-label={t('scheduled.title')}
          onClick={() => openTab('wikiobs://tasks')}
        >
          <Clock size={16} strokeWidth={1.8} />
        </button>
        <button
          type="button"
          data-testid="sidebar-btn-export"
          className={`icons-sidebar-button flex size-8 items-center justify-center rounded-md transition-colors ${
            currentlyOpenFilePath === 'wikiobs://export' ? 'is-active' : ''
          }`}
          title={t('export.title')}
          aria-label={t('export.title')}
          onClick={() => openTab('wikiobs://export')}
        >
          <ArrowUpDown size={16} strokeWidth={1.8} />
        </button>
        <button
          type="button"
          className={`icons-sidebar-button flex size-8 items-center justify-center rounded-md transition-colors ${
            currentlyOpenFilePath === 'wikiobs://obsidian' ? 'is-active' : ''
          }`}
          title={t('obsidianCompat.title')}
          aria-label={t('obsidianCompat.title')}
          onClick={() => openTab('wikiobs://obsidian')}
        >
          <Compass size={16} strokeWidth={1.8} />
        </button>
        <button
          type="button"
          className={`icons-sidebar-button flex size-8 items-center justify-center rounded-md transition-colors ${
            currentlyOpenFilePath === 'wikiobs://plugins' ? 'is-active' : ''
          }`}
          title={t('plugin.title')}
          aria-label={t('plugin.title')}
          onClick={() => openTab('wikiobs://plugins')}
        >
          <Puzzle size={16} strokeWidth={1.8} />
        </button>
      </div>
      <div className="icons-sidebar-group-bottom flex w-full flex-col items-center gap-1">
        <div className="mb-1 h-px w-4 bg-border" />
        <VaultSwitcher onOpenManagement={() => openTab('wikiobs://vaults')} />
        <button
          type="button"
          data-testid="sidebar-btn-theme-toggle"
          className="icons-sidebar-button flex size-8 items-center justify-center rounded-md transition-colors"
          title={theme === 'dark' ? t('theme.switchToLight') || '切换至明亮主题' : t('theme.switchToDark') || '切换至暗色主题'}
          aria-label={theme === 'dark' ? t('theme.switchToLight') || '切换至明亮主题' : t('theme.switchToDark') || '切换至暗色主题'}
          onClick={() => themeActions.toggle()}
        >
          {theme === 'dark' ? <Sun size={16} strokeWidth={1.8} /> : <Moon size={16} strokeWidth={1.8} />}
        </button>
        <button
          type="button"
          data-testid="sidebar-btn-settings"
          className={`icons-sidebar-button flex size-8 items-center justify-center rounded-md transition-colors ${
            currentlyOpenFilePath === 'wikiobs://settings' ? 'is-active' : ''
          }`}
          title={getShortcutDescription('open-settings-modal') || t('settings.title')}
          aria-label={getShortcutDescription('open-settings-modal') || t('settings.title')}
          aria-keyshortcuts="Control+,"
          onClick={() => openTab('wikiobs://settings')}
        >
          <Settings size={16} strokeWidth={1.8} />
        </button>
      </div>
    </nav>
  )
}

export default IconsSidebar
