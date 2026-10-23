import React, { useRef, useEffect } from 'react'
import { FileText } from 'lucide-react'
import gsap from 'gsap'
import { useContentContext } from '@/contexts/ContentContext'
import { useModalOpeners } from '@/contexts/ModalContext'
import { useTranslation } from '@/lib/i18n'
import { Easing } from '@/lib/gsap-animations'

const EmptyPage: React.FC = () => {
  const { setIsNewDirectoryModalOpen } = useModalOpeners()
  const { createUntitledNote } = useContentContext()
  const { t } = useTranslation()

  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return undefined

    const ctx = gsap.context(() => {
      // 图标弹跳入场
      const iconEl = container.querySelector('[data-animation="empty-icon"]') as HTMLElement
      const textEl = container.querySelector('[data-animation="empty-text"]') as HTMLElement
      const subtextEl = container.querySelector('[data-animation="empty-subtext"]') as HTMLElement
      const btnItems = container.querySelectorAll('[data-animation="empty-buttons"] button')
      const shortcutsEl = container.querySelector('[data-animation="empty-shortcuts"]') as HTMLElement

      const tl = gsap.timeline({ defaults: { ease: Easing.smooth } })

      tl.fromTo(
        iconEl,
        { autoAlpha: 0, scale: 0.5 },
        { autoAlpha: 1, scale: 1, duration: 0.8, ease: Easing.elastic },
      )
      tl.fromTo(textEl, { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.4 }, '-=0.3')
      tl.fromTo(subtextEl, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.35 }, '-=0.2')

      // 按钮错位入场
      if (btnItems.length) {
        tl.fromTo(
          btnItems,
          { autoAlpha: 0, x: -16 },
          { autoAlpha: 1, x: 0, duration: 0.35, stagger: 0.08, ease: Easing.smooth },
          '-=0.1',
        )
      }
      if (shortcutsEl) {
        tl.fromTo(shortcutsEl, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.4 }, '-=0.1')
      }
    }, container)

    return () => {
      ctx.revert()
    }
  }, [])

  return (
    <div ref={containerRef} className="empty-page flex size-full min-w-0 flex-col items-center justify-center px-6">
      <div className="flex max-w-[360px] flex-col items-center text-center">
        <div className="empty-icon-shell mb-5" data-animation="empty-icon">
          <div className="flex size-16 items-center justify-center rounded-2xl border border-[#7b68ee]/30 bg-[#7b68ee]/10 text-[#7b68ee] shadow-2xl backdrop-blur-md">
            <FileText size={32} strokeWidth={1.6} className="drop-shadow-[0_0_12px_rgba(123,104,238,0.4)]" />
          </div>
        </div>
        <h2 className="mb-0 text-base font-semibold tracking-tight text-foreground" data-animation="empty-text">
          {t('empty.noFile')}
        </h2>
        <p
          className="max-w-[300px] text-center text-xs leading-relaxed text-muted-foreground pt-1.5"
          data-animation="empty-subtext"
        >
          {t('empty.openFile')}
        </p>
        <div className="flex flex-row gap-2.5 pt-5" data-animation="empty-buttons">
          <button
            className="cursor-pointer rounded-lg border border-[#7b68ee]/30 bg-[#7b68ee] px-4 py-2 text-xs font-medium text-white shadow-lg shadow-[#7b68ee]/25 transition-all duration-75 hover:bg-[#6c5ce7] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#7b68ee]"
            onClick={() => createUntitledNote()}
            type="button"
          >
            {t('empty.createFile')}
          </button>
          <button
            className="cursor-pointer rounded-lg border border-border bg-secondary/50 px-4 py-2 text-xs font-medium text-foreground backdrop-blur-sm transition-all duration-75 hover:bg-secondary active:scale-[0.98] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            onClick={() => setIsNewDirectoryModalOpen(true)}
            type="button"
          >
            {t('empty.createFolder')}
          </button>
        </div>

        <div
          data-animation="empty-shortcuts"
          className="mt-8 flex w-full flex-col gap-2 rounded-xl border border-border bg-card/60 px-4 py-3 text-left backdrop-blur-sm"
        >
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>指令面板</span>
            <kbd className="rounded border border-border bg-muted/60 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">Ctrl + K</kbd>
          </div>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>新建空白笔记</span>
            <kbd className="rounded border border-border bg-muted/60 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">Ctrl + N</kbd>
          </div>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>全局搜索</span>
            <kbd className="rounded border border-border bg-muted/60 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">Ctrl + Shift + F</kbd>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EmptyPage
