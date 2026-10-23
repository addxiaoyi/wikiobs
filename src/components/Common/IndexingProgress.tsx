import React, { useEffect, useState, useRef } from 'react'
import gsap from 'gsap'
import { Loader2 } from 'lucide-react'

import ReorModal from './Modal'
import { animateProgress } from '@/lib/gsap-animations'
import { useTranslation } from '@/lib/i18n'

interface IndexingProgressProps {
  indexingProgress: number
  status?: string
}

const IndexingProgress: React.FC<IndexingProgressProps> = ({ indexingProgress, status = '' }) => {
  const [startTime, setStartTime] = useState<number>(Date.now())
  const [eta, setEta] = useState<string>('')
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const { t } = useTranslation()

  const progressBarRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const prevProgressRef = useRef(0)

  useEffect(() => {
    const startedAt = Date.now()
    setStartTime(startedAt)
    const timer = window.setInterval(() => setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000)), 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (indexingProgress > 0) {
      const elapsedTime = Date.now() - startTime
      const estimatedTotalTime = elapsedTime / indexingProgress
      const remainingTime = estimatedTotalTime - elapsedTime

      const etaMinutes = Math.floor(remainingTime / 60000)
      const etaSeconds = Math.floor((remainingTime % 60000) / 1000)
      setEta(t('indexing.remaining', { minutes: etaMinutes, seconds: etaSeconds }))
    }
  }, [indexingProgress, startTime, t])

  // Animate progress width only; the modal shell stays fixed while indexing updates.
  useEffect(() => {
    const progressBar = progressBarRef.current
    if (!progressBar || indexingProgress <= 0) return undefined

    gsap.killTweensOf(progressBar)
    animateProgress(progressBar, prevProgressRef.current, indexingProgress, 0.8)
    prevProgressRef.current = indexingProgress

    return () => gsap.killTweensOf(progressBar)
  }, [indexingProgress])

  // Fade the heading in without moving the modal content vertically.
  useEffect(() => {
    const title = titleRef.current
    if (!title) return undefined

    gsap.killTweensOf(title)
    gsap.fromTo(
      title,
      { autoAlpha: 0 },
      { autoAlpha: 1, duration: 0.35, ease: 'power2.out', clearProps: 'opacity,visibility' },
    )

    return () => gsap.killTweensOf(title)
  }, [])

  return (
    <ReorModal isOpen onClose={() => {}} hideCloseButton>
      <div className="mx-3 mb-3 mt-2 flex w-[min(500px,calc(100vw-2rem))] flex-col gap-2">
        <h2 ref={titleRef} className="text-xl font-semibold text-foreground">
          {indexingProgress === 0 ? t('indexing.initializing') : t('indexing.title')}
        </h2>
        <div className="mb-2 h-2.5 w-full overflow-hidden rounded-full bg-secondary">
          <div ref={progressBarRef} className="h-full rounded-full bg-[#7b68ee] transition-all duration-150" style={{ width: '0%' }} />
        </div>
        <div className="flex min-w-0 items-center gap-2">
          {indexingProgress === 0 && <Loader2 size={16} className="shrink-0 animate-spin text-[#7b68ee]" />}
          <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
            <span className="text-sm text-foreground">
              {indexingProgress > 0 ? `${Math.round(indexingProgress * 100)}%` : t('indexing.preparing')}
            </span>
            <span className="shrink-0 tabular-nums text-xs text-muted-foreground">
              {eta || `${elapsedSeconds}s`}
            </span>
          </div>
        </div>
        {status && status !== 'Complete' && (
          <span className="truncate text-xs text-muted-foreground">
            {status}
          </span>
        )}
      </div>
    </ReorModal>
  )
}

export default IndexingProgress
