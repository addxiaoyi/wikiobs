import React, { useEffect, useState } from 'react'
import { XStack } from 'tamagui'
import { MessageSquareMore, MessageSquareOff, PanelRightOpen, PanelRightClose } from '@tamagui/lucide-icons'
import Tooltip from '@mui/material/Tooltip'
import { toast } from 'react-toastify'
import NavigationButtons from './NavigationButtons'
import ExternalLink from '../Common/ExternalLink'
import errorToStringRendererProcess from '@/lib/error'
import { useTranslation } from '@/lib/i18n'

export const titleBarHeight = '36px'

interface TitleBarProps {
  activePanel: 'chat' | 'similarFiles' | null
  togglePanel: (show: 'chat' | 'similarFiles' | null) => void
}

const TitleBar: React.FC<TitleBarProps> = ({ activePanel, togglePanel }) => {
  const [platform, setPlatform] = useState('')
  const { t } = useTranslation()

  useEffect(() => {
    const fetchPlatform = async () => {
      const response = await window.electronUtils.getPlatform()
      setPlatform(response)
    }

    fetchPlatform().catch((error) => toast.error(errorToStringRendererProcess(error)))
  }, [])

  const iconBtn =
    'titlebar-panel-button electron-no-drag flex size-7 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent text-muted-foreground transition-all duration-75 hover:bg-white/[0.08] hover:text-white'

  return (
    <XStack
      alignItems="center"
      className="titlebar electron-drag relative flex h-9 justify-between border-b border-border bg-secondary px-3"
    >
      {/* Left: navigation. Feature tools live in the sidebar. */}
      <div className="flex items-center gap-1" style={platform === 'darwin' ? { marginLeft: '65px' } : undefined}>
        <NavigationButtons />
      </div>

      <span className="titlebar-title pointer-events-none absolute left-1/2 -translate-x-1/2 select-none text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
        WIKIOBS
      </span>

      {/* Right: feedback and panel toggles */}
      <div className="titlebar-actions electron-no-drag flex items-center gap-1">
        <ExternalLink
          href="https://forms.gle/8H4GtEcE6MBnNAUa7"
          className="titlebar-feedback mr-1 cursor-pointer no-underline"
        >
          <span className="text-xs text-muted-foreground transition-colors hover:text-foreground">
            {t('titlebar.feedback')}
          </span>
        </ExternalLink>

        <div className="mx-1 h-4 w-px bg-border" />

        <Tooltip title={activePanel !== 'chat' ? t('titlebar.openChatPanel') : t('titlebar.closeChatPanel')}>
          <button
            type="button"
            className={`${iconBtn} ${activePanel === 'chat' ? 'is-active' : ''}`}
            aria-label={activePanel !== 'chat' ? t('titlebar.openChatPanel') : t('titlebar.closeChatPanel')}
            aria-pressed={activePanel === 'chat'}
            onClick={() => togglePanel('chat')}
          >
            {activePanel !== 'chat' ? <MessageSquareMore size={17} /> : <MessageSquareOff size={17} />}
          </button>
        </Tooltip>
        <Tooltip title={activePanel !== 'similarFiles' ? t('titlebar.showSimilar') : t('titlebar.hideSimilar')}>
          <button
            type="button"
            className={`${iconBtn} ${activePanel === 'similarFiles' ? 'is-active' : ''}`}
            aria-label={activePanel !== 'similarFiles' ? t('titlebar.showSimilar') : t('titlebar.hideSimilar')}
            aria-pressed={activePanel === 'similarFiles'}
            onClick={() => togglePanel('similarFiles')}
          >
            {activePanel !== 'similarFiles' ? <PanelRightOpen size={17} /> : <PanelRightClose size={17} />}
          </button>
        </Tooltip>
      </div>
    </XStack>
  )
}

export default TitleBar
