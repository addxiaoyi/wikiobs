import React, { useEffect, useState, useRef } from 'react'
import { YStack, H2, SizableText } from 'tamagui'
import gsap from 'gsap'

import CircularProgress from '@mui/material/CircularProgress'
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
      <YStack className="mx-3 mb-3 mt-2 w-[min(500px,calc(100vw-2rem))] gap-2">
        <H2 ref={titleRef} fontWeight="semi-bold" fontSize="xl" color="$gray13">
          {indexingProgress === 0 ? t('indexing.initializing') : t('indexing.title')}
        </H2>
        <div
          className={`mb-2 h-4 w-full overflow-hidden rounded-full border-2 border-gray-400 ${
            indexingProgress !== 0 ? 'bg-neutral-800' : ''
          }`}
        >
          <div ref={progressBarRef} className="h-full bg-blue-600" style={{ width: '0%' }} />
        </div>
        <div className="flex min-w-0 items-center gap-2">
          {indexingProgress === 0 && <CircularProgress size={20} thickness={7} className="shrink-0 text-blue-500" />}
          <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
            <SizableText fontSize={14} color="$gray13">
              {indexingProgress > 0 ? `${Math.round(indexingProgress * 100)}%` : t('indexing.preparing')}
            </SizableText>
            <SizableText className="shrink-0 tabular-nums" fontSize={12} color="$gray10">
              {eta || `${elapsedSeconds}s`}
            </SizableText>
          </div>
        </div>
        {status && status !== 'Complete' && (
          <SizableText className="truncate" fontSize={12} color="$gray10">
            {status}
          </SizableText>
        )}
      </YStack>
    </ReorModal>
  )
}

export default IndexingProgress
