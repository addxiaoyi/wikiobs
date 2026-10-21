import React, { useRef, useEffect } from 'react'
import { SizableText, YStack } from 'tamagui'
import { File } from '@tamagui/lucide-icons'
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

      const tl = gsap.timeline({ defaults: { ease: Easing.smooth } })

      tl.fromTo(
        iconEl,
        { autoAlpha: 0, scale: 0.5 },
        { autoAlpha: 0.78, scale: 1, duration: 0.8, ease: Easing.elastic },
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
    }, container)

    return () => {
      ctx.revert()
    }
  }, [])

  return (
    <div ref={containerRef} className="empty-page flex size-full min-w-0 flex-col items-center justify-center px-6">
      <div className="flex max-w-[360px] flex-col items-center text-center">
        <div className="empty-icon-shell mb-5" data-animation="empty-icon">
          <File color="#2dd4bf" size={72} strokeWidth={1.5} />
        </div>
        <SizableText className="mb-0 text-lg font-medium" data-animation="empty-text" color="$foreground" size="$6">
          {t('empty.noFile')}
        </SizableText>
        <SizableText
          className="max-w-[300px] text-center"
          data-animation="empty-subtext"
          color="$gray10"
          paddingTop={8}
        >
          {t('empty.openFile')}
        </SizableText>
        <YStack className="flex-row gap-2" data-animation="empty-buttons" paddingTop={24}>
          <button
            className="cursor-pointer rounded-md border-0 bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => createUntitledNote()}
            type="button"
          >
            {t('empty.createFile')}
          </button>
          <button
            className="cursor-pointer rounded-md border border-solid border-border bg-transparent px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => setIsNewDirectoryModalOpen(true)}
            type="button"
          >
            {t('empty.createFolder')}
          </button>
        </YStack>
      </div>
    </div>
  )
}

export default EmptyPage
