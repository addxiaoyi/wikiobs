import React from 'react'
import { toast } from 'react-toastify'
import { CheckCircleIcon, CogIcon } from '@heroicons/react/24/solid'
import { Button } from '@/components/ui/button'
import { SizableText, XStack, ScrollView } from 'tamagui'
import useLLMConfigs from '../../../lib/hooks/use-llm-configs'
import LLMSettingsContent from './LLMSettingsContent'
import { Dialog, DialogContent, DialogTrigger, DialogOverlay, DialogPortal, DialogTitle } from '@/components/ui/dialog'
import { useTranslation } from '@/lib/i18n'

interface InitialSetupLLMSettingsProps {}

const InitialSetupLLMSettings: React.FC<InitialSetupLLMSettingsProps> = () => {
  const [isSetupModalOpen, setIsSetupModalOpen] = React.useState<boolean>(false)
  const { t } = useTranslation()
  const { llmConfigs, fetchAndUpdateModelConfigs } = useLLMConfigs()

  const isSetupComplete = llmConfigs.length > 0

  const handleOpenChange = (open: boolean) => {
    setIsSetupModalOpen(open)
    if (!open) {
      fetchAndUpdateModelConfigs().catch((error) => {
        toast.error(error instanceof Error ? error.message : String(error))
      })
    }
  }

  return (
    <XStack width="100%" justifyContent="space-between" alignItems="center" paddingTop="$2">
      <SizableText color="$gray13" fontWeight={600}>
        {t('settings.llm')}
      </SizableText>
      <Dialog open={isSetupModalOpen} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button
            className={`flex cursor-pointer items-center justify-between rounded-md border border-none px-3 py-2 ${
              isSetupComplete
                ? 'bg-emerald-600/80 text-white hover:bg-emerald-600'
                : 'bg-secondary hover:bg-secondary/80 text-foreground'
            } font-normal transition-colors duration-200`}
          >
            {isSetupComplete ? (
              <>
                <CheckCircleIcon className="mr-2 size-5" />
                <span>{t('llm.setup')}</span>
              </>
            ) : (
              <>
                <CogIcon className="mr-2 size-5" />
                <span>{t('llm.setup')}</span>
              </>
            )}
          </Button>
        </DialogTrigger>
        <DialogPortal>
          <DialogOverlay>
            <DialogContent
              aria-describedby={undefined}
              style={{ maxHeight: '60vh', display: 'flex', flexDirection: 'column' }}
            >
              <DialogTitle className="sr-only">{t('llm.customSetup')}</DialogTitle>
              <ScrollView style={{ flex: 1 }}>
                <LLMSettingsContent />
              </ScrollView>
            </DialogContent>
          </DialogOverlay>
        </DialogPortal>
      </Dialog>
    </XStack>
  )
}

export default InitialSetupLLMSettings
