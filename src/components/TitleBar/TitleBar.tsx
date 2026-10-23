import React, { useEffect, useState } from 'react'
import {
  MessageSquare,
  MessageSquareOff,
  PanelRightOpen,
  PanelRightClose,
  Search,
  Network,
  Keyboard,
} from 'lucide-react'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'
import { toast } from 'react-toastify'
import NavigationButtons from './NavigationButtons'
import { WikiObsLogo } from '../Common/WikiObsLogo'
import KeyboardShortcutsModal from '../Common/KeyboardShortcutsModal'
import errorToStringRendererProcess from '@/lib/error'
import { useTranslation } from '@/lib/i18n'
import { useModalOpeners } from '@/contexts/ModalContext'

export const titleBarHeight = '36px'

interface TitleBarProps {
  activePanel: 'chat' | 'similarFiles' | 'localGraph' | null
  togglePanel: (show: 'chat' | 'similarFiles' | 'localGraph' | null) => void
}

const TitleBar: React.FC<TitleBarProps> = ({ activePanel, togglePanel }) => {
  const [platform, setPlatform] = useState('')
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false)
  const { t } = useTranslation()
  const { setIsCommandPaletteOpen } = useModalOpeners()

  useEffect(() => {
    const fetchPlatform = async () => {
      if (window.electronUtils?.getPlatform) {
        const response = await window.electronUtils.getPlatform()
        setPlatform(response)
      } else {
        setPlatform('win32')
      }
    }

    fetchPlatform().catch((error) => toast.error(errorToStringRendererProcess(error)))
  }, [])

  const iconBtn =
    'titlebar-panel-button electron-no-drag flex size-7 cursor-pointer items-center justify-center rounded-lg border-0 bg-transparent text-muted-foreground transition-all duration-150 hover:bg-secondary/80 hover:text-foreground active:scale-95'

  return (
    <header
      style={{ zIndex: 10001 }}
      className="titlebar electron-drag relative z-[10001] flex h-9 items-center justify-between border-b border-[var(--line)] bg-[var(--surface-0)]/90 backdrop-blur-xl px-3 select-none"
    >
      {/* Left: Brand logo & Navigation buttons */}
      <div className="flex items-center gap-2" style={platform === 'darwin' ? { marginLeft: '65px' } : undefined}>
        <div className="electron-no-drag flex items-center gap-2 select-none pr-1" title="WIKIOBS · Helstera 旗下产品">
          <WikiObsLogo size={16} className="drop-shadow-[0_0_6px_rgba(123,104,238,0.4)]" />
          <div className="flex items-baseline gap-1.5">
            <span className="font-semibold text-[11px] tracking-wider text-foreground/90 font-mono">WIKIOBS</span>
            <span className="text-[9px] font-medium text-muted-foreground/75 tracking-wider font-sans">by Helstera</span>
          </div>
        </div>
        <NavigationButtons />
      </div>

      {/* Center: Command Palette / Quick Search Pill (macOS Capsule Style) */}
      <button
        type="button"
        onClick={() => setIsCommandPaletteOpen(true)}
        className="electron-no-drag absolute left-1/2 -translate-x-1/2 flex h-6.5 w-64 max-w-[42vw] items-center justify-between rounded-full border border-[var(--line)] bg-[var(--surface-1)] hover:border-[#7b68ee]/50 hover:bg-[var(--surface-2)] px-2.5 text-[11px] text-[var(--ink-muted)] hover:text-foreground shadow-xs transition-all active:scale-[0.98]"
        title={platform === 'darwin' ? 'Command Palette (⌘K / ⌘P)' : '命令面板 (Ctrl+K / Ctrl+P)'}
      >
        <span className="flex items-center gap-1.5 truncate">
          <Search size={12} className="shrink-0 text-[var(--ink-muted)]" />
          <span className="truncate">{t('commandPalette.searchPlaceholder')}</span>
        </span>
        <kbd className="hidden sm:inline-flex items-center rounded-full border border-[var(--line)] bg-[var(--surface-2)] px-1.5 py-0.2 font-mono text-[9px] text-[var(--ink-muted)]">
          {platform === 'darwin' ? '⌘K' : 'Ctrl+K'}
        </kbd>
      </button>

      {/* Right: Local Shortcuts Help & Panel toggles */}
      <div className="titlebar-actions electron-no-drag flex items-center gap-0.5">
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className={iconBtn}
                aria-label="快捷键与使用指引"
                title="快捷键与使用指引"
                onClick={() => setIsShortcutsModalOpen(true)}
              >
                <Keyboard size={15} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-[11px]">
              快捷键与使用指引
            </TooltipContent>
          </Tooltip>

          <div className="mx-1 h-3.5 w-px bg-border/60" />

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className={`${iconBtn} ${activePanel === 'chat' ? 'text-[#7b68ee] bg-[#7b68ee]/15 font-medium' : ''}`}
                aria-label={activePanel !== 'chat' ? t('titlebar.openChatPanel') : t('titlebar.closeChatPanel')}
                aria-pressed={activePanel === 'chat'}
                onClick={() => togglePanel('chat')}
              >
                {activePanel !== 'chat' ? <MessageSquare size={15} /> : <MessageSquareOff size={15} />}
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-[11px]">
              {activePanel !== 'chat' ? t('titlebar.openChatPanel') : t('titlebar.closeChatPanel')}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className={`${iconBtn} ${activePanel === 'similarFiles' ? 'text-[#7b68ee] bg-[#7b68ee]/15 font-medium' : ''}`}
                aria-label={activePanel !== 'similarFiles' ? t('titlebar.showSimilar') : t('titlebar.hideSimilar')}
                aria-pressed={activePanel === 'similarFiles'}
                onClick={() => togglePanel('similarFiles')}
              >
                {activePanel !== 'similarFiles' ? <PanelRightOpen size={15} /> : <PanelRightClose size={15} />}
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-[11px]">
              {activePanel !== 'similarFiles' ? t('titlebar.showSimilar') : t('titlebar.hideSimilar')}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                data-testid="titlebar-btn-localgraph"
                className={`${iconBtn} ${activePanel === 'localGraph' ? 'text-[#7b68ee] bg-[#7b68ee]/15 font-medium' : ''}`}
                aria-label={activePanel !== 'localGraph' ? '局部关系图' : '关闭局部关系图'}
                title="局部关系图"
                aria-pressed={activePanel === 'localGraph'}
                onClick={() => togglePanel('localGraph')}
              >
                <Network size={15} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-[11px]">
              {activePanel !== 'localGraph' ? '局部关系图' : '关闭局部关系图'}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <KeyboardShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />
    </header>
  )
}

export default TitleBar
