import React, { useRef, useEffect, useState, useCallback } from 'react'
import ReactDOM from 'react-dom'
import { X } from 'lucide-react'
import gsap from 'gsap'

import { animateModalIn, animateModalOut } from '@/lib/gsap-animations'
import { useTranslation } from '@/lib/i18n'
import { cn } from '@/lib/ui'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  hideCloseButton?: boolean
  className?: string
  embedded?: boolean
}

const ModernModal: React.FC<ModalProps> = ({ isOpen, onClose, children, hideCloseButton, className, embedded }) => {
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
    if (embedded) return
    if (isOpen && animState === 'closed') setAnimState('entering')
    if (!isOpen && (animState === 'open' || animState === 'entering')) setAnimState('exiting')
  }, [animState, isOpen, embedded])

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

  if (embedded) {
    return (
      <div
        className={cn(
          'size-full flex flex-col bg-background text-foreground overflow-y-auto p-6 md:p-8',
          className?.replace(/max-w-\[[^\]]+\]/g, 'max-w-4xl mx-auto').replace(/rounded-\S+/g, 'rounded-xl'),
        )}
      >
        <div className="relative w-full">
          {!hideCloseButton && (
            <button
              type="button"
              onClick={onClose}
              className="absolute right-0 top-0 z-20 flex size-7 cursor-pointer items-center justify-center rounded-lg border border-border text-muted-foreground transition-all hover:bg-muted hover:text-foreground active:scale-95"
              aria-label={t('button.close')}
            >
              <X size={15} strokeWidth={2} />
            </button>
          )}
          {children}
        </div>
      </div>
    )
  }

  if (animState === 'closed') return null

  const modalContent = (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/45 dark:bg-black/65 backdrop-blur-xl"
      role="presentation"
      onClick={handleClose}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal
        onClick={(event) => event.stopPropagation()}
        className={cn(
          'relative max-h-[calc(100vh-48px)] w-[calc(100vw-32px)] max-w-[480px] overflow-y-auto rounded-2xl border border-[var(--line)] bg-[var(--surface-1)] p-6 text-foreground shadow-[0_24px_64px_rgba(0,0,0,0.25)] backdrop-blur-2xl custom-scrollbar',
          className,
        )}
      >
        {!hideCloseButton && (
          <button
            type="button"
            onClick={handleClose}
            className="absolute right-4 top-4 z-20 flex size-7 cursor-pointer items-center justify-center rounded-lg border border-transparent text-[var(--ink-muted)] transition-all hover:bg-[var(--accent-soft)] hover:text-[#7b68ee] active:scale-95"
            aria-label={t('button.close')}
          >
            <X size={15} strokeWidth={2} />
          </button>
        )}
        {children}
      </div>
    </div>
  )

  return ReactDOM.createPortal(modalContent, document.body)
}

export const ReorModal = ModernModal
export default ModernModal
