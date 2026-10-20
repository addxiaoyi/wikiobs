import React, { useEffect, useRef } from 'react'

import { MdSettings, MdImportExport, MdSchedule, MdExtension } from 'react-icons/md'
import { VscNewFolder } from 'react-icons/vsc'
import { HiOutlinePencilAlt } from 'react-icons/hi'
import { GlobeIcon, Sparkles, Network } from 'lucide-react'

import { Files, MessageCircle, Search, Moon, SunMoon, BookOpen } from '@tamagui/lucide-icons'
import { YStack } from 'tamagui'
import gsap from 'gsap'
import { useTranslation } from '@/lib/i18n'
import { useModalOpeners } from '../../contexts/ModalContext'
import { useChatContext } from '@/contexts/ChatContext'
import { useContentContext } from '@/contexts/ContentContext'
import { useThemeManager } from '@/contexts/ThemeContext'
import VaultSwitcher from '../Common/VaultSwitcher'
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
  const { createUntitledNote } = useContentContext()

  useEffect(() => {
    if (iconsRef.current) {
      const ctx = gsap.context(() => {
        gsap.set('.icons-sidebar-group', { opacity: 0, x: -20 })
        gsap.to('.icons-sidebar-group', {
          opacity: 1,
          x: 0,
          duration: 0.5,
          stagger: 0.06,
          ease: Easing.smooth,
          delay: 0.15,
        })
        gsap.set('.icons-sidebar-group-bottom', { opacity: 0, x: -20 })
        gsap.to('.icons-sidebar-group-bottom', {
          opacity: 1,
          x: 0,
          duration: 0.5,
          stagger: 0.06,
          ease: Easing.smooth,
          delay: 0.45,
        })
      }, iconsRef)
      return () => ctx.revert()
    }
  }, [])

  return (
    <nav
      ref={iconsRef}
      aria-label={t('app.name')}
      className="icons-sidebar flex h-full w-[52px] flex-col items-center justify-between py-3"
    >
      <div className="sidebar-brand" title={t('app.name')} aria-label={t('app.name')} aria-hidden="true">
        <BookOpen size={18} strokeWidth={1.8} />
      </div>
      <YStack className="icons-sidebar-group items-center gap-1">
        <button
          type="button"
          className={`icons-sidebar-button flex size-10 items-center justify-center rounded-md transition-colors ${
            sidebarShowing === 'files' ? 'is-active' : ''
          }`}
          title={getShortcutDescription('open-files') || t('files.title')}
          aria-label={getShortcutDescription('open-files') || t('files.title')}
          aria-keyshortcuts="Control+O"
          aria-pressed={sidebarShowing === 'files'}
          onClick={() => setSidebarShowing(sidebarShowing === 'files' ? null : 'files')}
        >
          <Files size={22} />
        </button>
        <button
          type="button"
          className={`icons-sidebar-button flex size-10 items-center justify-center rounded-md transition-colors ${
            sidebarShowing === 'chats' ? 'is-active' : ''
          }`}
          title={t('sidebar.chatHistory')}
          aria-label={t('sidebar.chatHistory')}
          aria-keyshortcuts="Control+T"
          aria-pressed={sidebarShowing === 'chats'}
          onClick={() => setSidebarShowing(sidebarShowing === 'chats' ? null : 'chats')}
        >
          <MessageCircle size={22} />
        </button>
        <button
          type="button"
          className={`icons-sidebar-button flex size-10 items-center justify-center rounded-md transition-colors ${
            sidebarShowing === 'search' ? 'is-active' : ''
          }`}
          title={getShortcutDescription('open-search') || t('sidebar.semanticSearch')}
          aria-label={getShortcutDescription('open-search') || t('sidebar.semanticSearch')}
          aria-keyshortcuts="Control+P"
          aria-pressed={sidebarShowing === 'search'}
          onClick={() => setSidebarShowing(sidebarShowing === 'search' ? null : 'search')}
        >
          <Search size={22} />
        </button>
        <div className="my-1 h-px w-6 bg-white/10" />

        <button
          type="button"
          className="icons-sidebar-button flex size-10 items-center justify-center rounded-md transition-colors"
          title={getShortcutDescription('open-new-note') || t('files.newNote')}
          aria-label={getShortcutDescription('open-new-note') || t('files.newNote')}
          aria-keyshortcuts="Control+N"
          onClick={() => createUntitledNote()}
        >
          <HiOutlinePencilAlt size={22} />
        </button>
        <button
          type="button"
          className="icons-sidebar-button flex size-10 items-center justify-center rounded-md transition-colors"
          title={getShortcutDescription('open-new-directory-modal') || t('sidebar.newDirectory')}
          aria-label={getShortcutDescription('open-new-directory-modal') || t('sidebar.newDirectory')}
          aria-keyshortcuts="Control+D"
          onClick={() => setIsNewDirectoryModalOpen(true)}
        >
          <VscNewFolder size={22} />
        </button>

        <div className="my-1 h-px w-6 bg-white/10" />

        <button
          type="button"
          className="icons-sidebar-button flex size-10 items-center justify-center rounded-md transition-colors"
          title={t('wikiImporter.title')}
          aria-label={t('wikiImporter.title')}
          onClick={() => setIsWikiImporterOpen(true)}
        >
          <GlobeIcon size={22} />
        </button>
        <button
          type="button"
          className="icons-sidebar-button flex size-10 items-center justify-center rounded-md transition-colors"
          title={t('aiOrg.title')}
          aria-label={t('aiOrg.title')}
          onClick={() => setIsAIOrganizationOpen(true)}
        >
          <Sparkles size={22} />
        </button>
        <VaultSwitcher onOpenManagement={() => setIsVaultManagementOpen(true)} />
        <button
          type="button"
          className="icons-sidebar-button flex size-10 items-center justify-center rounded-md transition-colors"
          title={t('graph.title')}
          aria-label={t('graph.title')}
          onClick={() => setIsKnowledgeGraphOpen(true)}
        >
          <Network size={22} />
        </button>
        <button
          type="button"
          className="icons-sidebar-button flex size-10 items-center justify-center rounded-md transition-colors"
          title={t('scheduled.title')}
          aria-label={t('scheduled.title')}
          onClick={() => setIsScheduledTasksOpen(true)}
        >
          <MdSchedule size={22} />
        </button>
        <button
          type="button"
          className="icons-sidebar-button flex size-10 items-center justify-center rounded-md transition-colors"
          title={t('export.title')}
          aria-label={t('export.title')}
          onClick={() => setIsExportOpen(true)}
        >
          <MdImportExport size={22} />
        </button>
        <button
          type="button"
          className="icons-sidebar-button flex size-10 items-center justify-center rounded-md transition-colors"
          title={t('obsidianCompat.title')}
          aria-label={t('obsidianCompat.title')}
          onClick={() => setIsObsidianCompatOpen(true)}
        >
          <BookOpen size={22} />
        </button>
        <button
          type="button"
          className="icons-sidebar-button flex size-10 items-center justify-center rounded-md transition-colors"
          title={t('plugin.title')}
          aria-label={t('plugin.title')}
          onClick={() => setIsPluginManagerOpen(true)}
        >
          <MdExtension size={22} />
        </button>
      </YStack>
      <YStack className="icons-sidebar-group-bottom items-center gap-1">
        <div className="mb-1 h-px w-6 bg-white/10" />
        <button
          type="button"
          className="icons-sidebar-button flex size-10 items-center justify-center rounded-md transition-colors"
          title={getShortcutDescription('toggle-theme') || t('sidebar.toggleTheme')}
          aria-label={getShortcutDescription('toggle-theme') || t('sidebar.toggleTheme')}
          onClick={() => themeActions.toggle()}
        >
          {theme === 'dark' ? <Moon size={22} /> : <SunMoon size={22} />}
        </button>
        <button
          type="button"
          className="icons-sidebar-button settings-entry flex size-10 items-center justify-center rounded-md transition-colors"
          title={getShortcutDescription('open-settings-modal') || t('settings.title')}
          aria-label={getShortcutDescription('open-settings-modal') || t('settings.title')}
          aria-keyshortcuts="Control+,"
          onClick={() => setIsSettingsModalOpen(true)}
        >
          <MdSettings size={22} />
        </button>
      </YStack>
    </nav>
  )
}

export default IconsSidebar
