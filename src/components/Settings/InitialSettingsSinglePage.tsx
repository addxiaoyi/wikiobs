import React, { useState, useEffect, useRef } from 'react'

import { Button } from '@material-tailwind/react'

import { YStack, H2, SizableText, XStack } from 'tamagui'
import gsap from 'gsap'
import ReorModal from '../Common/Modal'

import DirectorySelector from './DirectorySelector'
import InitialEmbeddingModelSettings from './EmbeddingSettings/InitialEmbeddingSettings'
import InitialSetupLLMSettings from './LLMSettings/InitialSetupLLMSettings'
import { useTranslation } from '@/lib/i18n'
import { Easing } from '@/lib/gsap-animations'

interface OldInitialSettingsProps {
  readyForIndexing: () => void
  onClose?: () => void
}

const InitialSetupSinglePage: React.FC<OldInitialSettingsProps> = ({ readyForIndexing, onClose }) => {
  const { t } = useTranslation()
  const [directoryErrorMsg, setDirectoryErrorMsg] = useState('')
  const [embeddingErrorMsg, setEmbeddingErrorMsg] = useState('')
  const [showError, setShowError] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  const handleNext = () => {
    if (!directoryErrorMsg && !embeddingErrorMsg) {
      readyForIndexing()
    } else {
      setShowError(true)
    }
  }

  // GSAP: 设置步骤按顺序入场
  useEffect(() => {
    if (!contentRef.current) return

    const container = contentRef.current
    const ctx = gsap.context(() => {
      const title = container.querySelector('.setup-title') as HTMLElement
      const tagline = container.querySelector('.setup-tagline') as HTMLElement
      const sections = container.querySelectorAll('.setup-section')
      const ctaBtn = container.querySelector('.setup-cta-btn') as HTMLElement

      const tl = gsap.timeline({ defaults: { ease: Easing.smooth } })

      // 标题从上淡入
      tl.fromTo(title, { autoAlpha: 0, y: -12 }, { autoAlpha: 1, y: 0, duration: 0.4 })

      // 副标题
      tl.fromTo(tagline, { autoAlpha: 0, y: -8 }, { autoAlpha: 1, y: 0, duration: 0.35 }, '-=0.1')

      // 配置区域错位入场
      if (sections.length) {
        tl.fromTo(
          sections,
          { autoAlpha: 0, x: -16 },
          { autoAlpha: 1, x: 0, duration: 0.4, stagger: 0.12, ease: Easing.smooth },
          '-=0.05',
        )
      }

      // CTA 按钮弹入
      if (ctaBtn) {
        tl.fromTo(
          ctaBtn,
          { autoAlpha: 0, scale: 0.9 },
          { autoAlpha: 1, scale: 1, duration: 0.35, ease: Easing.snappy },
          '-=0.1',
        )
      }
    }, container)

    return () => ctx.revert()
  }, [])

  return (
    <ReorModal isOpen onClose={onClose || (() => {})} hideCloseButton={!onClose}>
      <YStack ref={contentRef} className="mx-2 w-[min(620px,calc(100vw-1rem))] py-3">
        <YStack className="mt-0 max-h-[min(450px,calc(100vh-7rem))] overflow-y-auto pr-2">
          <H2 className="setup-title" marginBottom={0} textAlign="center" fontWeight={600}>
            {t('setup.title')}
          </H2>
          <SizableText className="setup-tagline" marginTop={3} textAlign="center" fontWeight={300}>
            {t('app.tagline')}
          </SizableText>
          <XStack className="setup-section mt-10 flex w-full items-center justify-between border-0 border-b-2 border-solid border-neutral-700 pb-4">
            <YStack className="w-80 flex-col">
              <SizableText fontSize={16} fontWeight="bold">
                {t('settings.vaultDirectory')}
              </SizableText>
              <SizableText margin={0} paddingTop={1} fontSize={12}>
                {t('setup.selectVaultDesc')}
              </SizableText>
            </YStack>
            <YStack className="flex-col">
              <DirectorySelector setErrorMsg={setDirectoryErrorMsg} />
              {showError && directoryErrorMsg && (
                <SizableText className="text-xs text-red-500">{directoryErrorMsg}</SizableText>
              )}
            </YStack>
          </XStack>
          <YStack className="setup-section mt-2 border-0 border-b-2 border-solid border-neutral-700 pb-2">
            <InitialEmbeddingModelSettings setErrorMsg={setEmbeddingErrorMsg} />
            {showError && embeddingErrorMsg && (
              <SizableText className="text-xs text-red-500">{embeddingErrorMsg}</SizableText>
            )}
          </YStack>
          <div className="setup-section">
            <InitialSetupLLMSettings />
          </div>
        </YStack>
        <div className="flex justify-end">
          <Button
            className=" setup-cta-btn mb-3 mt-4 h-10 w-[80px] cursor-pointer border-none bg-blue-500 px-2 py-0 text-center hover:bg-blue-600"
            onClick={handleNext}
            placeholder=""
          >
            {t('setup.getStarted')}
          </Button>
        </div>
      </YStack>
    </ReorModal>
  )
}

export default InitialSetupSinglePage
