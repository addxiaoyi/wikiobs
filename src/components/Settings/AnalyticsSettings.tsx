import React, { useState, useEffect } from 'react'
import Switch from '@mui/material/Switch'
import posthog from 'posthog-js'
import { toast } from 'react-toastify'
import { YStack, XStack, SizableText } from 'tamagui'
import errorToStringRendererProcess from '@/lib/error'
import { useTranslation } from '@/lib/i18n'

interface AnalyticsSettingsProps {}
const AnalyticsSettings: React.FC<AnalyticsSettingsProps> = () => {
  const [isAnalyticsEnabled, setIsAnalyticsEnabled] = useState<boolean>(false)
  const { t } = useTranslation()

  useEffect(() => {
    const fetchParams = async () => {
      const storedIsAnalyticsEnabled = await window.electronStore.getAnalyticsMode()

      if (storedIsAnalyticsEnabled !== undefined) {
        setIsAnalyticsEnabled(storedIsAnalyticsEnabled)
      }
    }

    fetchParams().catch((error) => toast.error(String(error)))
  }, [])

  const handleSave = async () => {
    const nextValue = !isAnalyticsEnabled
    try {
      await window.electronStore.setAnalyticsMode(nextValue)
      setIsAnalyticsEnabled(nextValue)
      if (!nextValue) posthog.capture('analytics_disabled')
    } catch (error) {
      toast.error(errorToStringRendererProcess(error))
    }
  }

  return (
    <YStack px="$4" backgroundColor="$gray1" maxWidth="100%">
      <h2 className="mb-0">{t('settings.analytics')}</h2>
      <YStack maxWidth="100%" width="100%" overflow="hidden" py="$4">
        <XStack className="h-[2px] w-full bg-neutral-700" />
        <XStack>
          <XStack justifyContent="space-between" alignItems="center" py="$3" width="100%">
            <SizableText size="$2">{t('analytics.desc')}</SizableText>
            <Switch checked={isAnalyticsEnabled} onChange={handleSave} inputProps={{ 'aria-label': t('settings.analytics') }} />
          </XStack>
        </XStack>
      </YStack>
    </YStack>
  )
}

export default AnalyticsSettings
