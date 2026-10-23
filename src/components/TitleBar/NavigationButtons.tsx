import React, { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, FileText } from 'lucide-react'
import { removeFileExtension } from '@/lib/file'
import '../../styles/history.scss'
import { useFileContext } from '@/contexts/FileContext'
import { useContentContext } from '@/contexts/ContentContext'
import { useTranslation } from '@/lib/i18n'

const NavigationButtons: React.FC = () => {
  const [showMenu, setShowMenu] = useState<string>('')
  const { t } = useTranslation()

  const longPressTimer = useRef<NodeJS.Timeout | null>(null)
  const buttonRefBack = useRef<HTMLButtonElement>(null)
  const buttonRefForward = useRef<HTMLButtonElement>(null)

  const { openContent, currentOpenFileOrChatID } = useContentContext()
  const { navigationHistory } = useFileContext()

  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent): void {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setShowMenu('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  if (!currentOpenFileOrChatID) {
    return null
  }

  const canGoBack = navigationHistory.length > 1
  const indexOfCurrentOpenFileOrChat = navigationHistory.indexOf(currentOpenFileOrChatID)
  const canGoForward = indexOfCurrentOpenFileOrChat < navigationHistory.length - 1

  const goBack = () => {
    if (canGoBack && showMenu === '') {
      const newIndex = indexOfCurrentOpenFileOrChat - 1
      openContent(navigationHistory[newIndex], undefined, true)
    }
  }

  const goForward = () => {
    if (canGoForward && showMenu === '') {
      const newIndex = indexOfCurrentOpenFileOrChat + 1
      openContent(navigationHistory[newIndex], undefined, true)
    }
  }

  const goSelected = (pathOrChatID: string): void => {
    if (pathOrChatID) {
      openContent(pathOrChatID, undefined, true)
    }
    setShowMenu('')
  }

  const handleLongPressStart = (direction: 'back' | 'forward') => {
    longPressTimer.current = setTimeout(() => {
      setShowMenu(direction)
    }, 400)
  }

  const handleLongPressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  const handleHistoryContext = (currentRef: React.RefObject<HTMLButtonElement>) => {
    const offsetTop = currentRef.current?.offsetTop || 0
    const offsetLeft = currentRef.current?.offsetLeft || 0
    const offsetHeight = currentRef.current?.offsetHeight || 0

    const menuChild =
      currentRef.current?.id === 'back'
        ? navigationHistory.slice(0, indexOfCurrentOpenFileOrChat)
        : navigationHistory.slice(indexOfCurrentOpenFileOrChat + 1)

    return (
      showMenu !== '' &&
      menuChild.length > 0 && (
        <div
          ref={ref}
          tabIndex={0}
          className="absolute z-50 min-w-[190px] overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--surface-1)]/95 p-1.5 text-foreground shadow-2xl backdrop-blur-xl animate-in fade-in-0 zoom-in-95"
          style={{ left: offsetLeft, top: offsetTop + offsetHeight + 4 }}
        >
          <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--ink-muted)]">
            {currentRef.current?.id === 'back' ? '后退历史' : '前进历史'}
          </div>
          <div className="flex flex-col gap-0.5">
            {menuChild.map((pathOrChatID) => (
              <button
                key={pathOrChatID}
                type="button"
                className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs text-foreground transition-all duration-100 hover:bg-[var(--accent-soft)] hover:text-[#7b68ee]"
                onClick={() => goSelected(pathOrChatID)}
              >
                <FileText size={12} className="text-[#7b68ee] shrink-0" />
                <span className="truncate">
                  {removeFileExtension(pathOrChatID.replace(/\\/g, '/').split('/').pop() || '')}
                </span>
              </button>
            ))}
          </div>
        </div>
      )
    )
  }

  return (
    <div className="history-container flex items-center gap-1 relative">
      <button
        id="back"
        ref={buttonRefBack}
        onMouseDown={() => handleLongPressStart('back')}
        onMouseUp={handleLongPressEnd}
        onMouseLeave={handleLongPressEnd}
        onClick={goBack}
        disabled={!canGoBack}
        aria-disabled={!canGoBack}
        title={t('titlebar.goBack') || t('navigation.back')}
        type="button"
        aria-label={t('navigation.back')}
        className="rounded-md p-1 text-muted-foreground transition-all duration-75 hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-30 disabled:hover:bg-transparent"
      >
        <ArrowLeft size={14} strokeWidth={1.8} />
      </button>
      <button
        id="forward"
        ref={buttonRefForward}
        onMouseDown={() => handleLongPressStart('forward')}
        onMouseUp={handleLongPressEnd}
        onMouseLeave={handleLongPressEnd}
        onClick={goForward}
        disabled={!canGoForward}
        aria-disabled={!canGoForward}
        title={t('titlebar.goForward') || t('navigation.forward')}
        type="button"
        aria-label={t('navigation.forward')}
        className="rounded-md p-1 text-muted-foreground transition-all duration-75 hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-30 disabled:hover:bg-transparent"
      >
        <ArrowRight size={14} strokeWidth={1.8} />
      </button>
      {handleHistoryContext(showMenu === 'back' ? buttonRefBack : buttonRefForward)}
    </div>
  )
}

export default NavigationButtons
