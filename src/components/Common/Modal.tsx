import React, { useRef, useEffect, useState, useCallback } from 'react'
import ReactDOM from 'react-dom'
import { YStack, XStack } from '@tamagui/stacks'
import { X } from '@tamagui/lucide-icons'
import gsap from 'gsap'

import { animateModalIn, animateModalOut } from '@/lib/gsap-animations'
import { useTranslation } from '@/lib/i18n'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  hideCloseButton?: boolean
}

const ReorModal: React.FC<ModalProps> = ({ isOpen, onClose, children, hideCloseButton }) => {
  const modalRef = useRef<HTMLDivElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)
  const { t } = useTranslation()
  const [animState, setAnimState] = useState<'entering' | 'open' | 'exiting' | 'closed'>('closed')
  const animationRef = useRef<gsap.core.Timeline | null>(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (isOpen && animState === 'closed') setAnimState('entering')
    if (!isOpen && (animState === 'open' || animState === 'entering')) setAnimState('exiting')
  }, [animState, isOpen])

  useEffect(() => {
    if (animState !== 'entering' || !backdropRef.current || !modalRef.current) return undefined

    animationRef.current?.kill()
    const timeline = animateModalIn(backdropRef.current, modalRef.current)
    animationRef.current = timeline
    timeline.eventCallback('onComplete', () => {
      animationRef.current = null
      setAnimState('open')
    })

    return () => {
      timeline.kill()
      if (animationRef.current === timeline) animationRef.current = null
    }
  }, [animState])

  useEffect(() => {
    if (animState !== 'exiting' || !backdropRef.current || !modalRef.current) return undefined

    animationRef.current?.kill()
    const timeline = animateModalOut(backdropRef.current, modalRef.current, () => {
      animationRef.current = null
      setAnimState('closed')
      onCloseRef.current()
    })
    animationRef.current = timeline

    return () => {
      timeline.kill()
      if (animationRef.current === timeline) animationRef.current = null
    }
  }, [animState])

  const handleClose = useCallback(() => {
    if (animState === 'closed' || animState === 'exiting') return
    animationRef.current?.kill()
    setAnimState('exiting')
  }, [animState])

  useEffect(() => {
    if (!isOpen) return undefined

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') handleClose()
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [handleClose, isOpen])

  if (animState === 'closed') return null

  const modalContent = (
    <YStack
      ref={backdropRef}
      // Tamagui's shared position type omits the web-only fixed value.
      // @ts-expect-error fixed is valid in the Electron renderer.
      position="fixed"
      top={0}
      right={0}
      bottom={0}
      left={0}
      width="100vw"
      height="100vh"
      alignItems="center"
      justifyContent="center"
      backgroundColor="rgba(0, 0, 0, 0.4)"
      role="presentation"
      onPress={handleClose}
      zIndex={9999}
    >
      <YStack
        ref={modalRef}
        borderRadius="$4"
        borderWidth={1}
        borderColor="$gray7"
        backgroundColor="$background"
        shadowColor="$shadowColor"
        shadowOpacity={0.5}
        shadowRadius={10}
        padding="$4"
        width="calc(100vw - 32px)"
        maxWidth={520}
        maxHeight="calc(100vh - 32px)"
        style={{ overflow: 'auto' }}
        role="dialog"
        aria-modal
        onPress={(event) => event.stopPropagation()}
      >
        {!hideCloseButton && (
          <XStack position="absolute" top={10} right={15}>
            <button
              type="button"
              onClick={handleClose}
              className="cursor-pointer rounded-full p-1 transition-colors hover:bg-neutral-200 dark:hover:bg-neutral-700"
              style={{ background: 'transparent', border: 'none' }}
              aria-label={t('button.close')}
            >
              <X size={18} />
            </button>
          </XStack>
        )}
        {children}
      </YStack>
    </YStack>
  )

  return ReactDOM.createPortal(modalContent, document.body)
}

export default ReorModal
