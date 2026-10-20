import React, { useState } from 'react'
import { APIInterface } from 'electron/main/electron-store/storeConfig'
import { toast } from 'react-toastify'
import {
  anthropicDefaultAPIName,
  anthropicDefaultLLMs,
  openAIDefaultAPIName,
  openAIDefaultLLMs,
} from '@shared/defaultLLMs'
import { Input } from 'tamagui'
import { NativeSyntheticEvent, TextInputKeyPressEventData } from 'react-native'
import { Button } from '@/components/ui/button'
import errorToStringRendererProcess from '@/lib/error'
import { useTranslation } from '@/lib/i18n'
import {
  Dialog,
  DialogPortal,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogOverlay,
} from '@/components/ui/dialog'

export interface CloudLLMSetupModalProps {
  isOpen: boolean
  onClose: () => void
  apiInterface: APIInterface
}

const DefaultLLMAPISetupModal: React.FC<CloudLLMSetupModalProps> = ({ isOpen, onClose, apiInterface }) => {
  const [apiKey, setAPIKey] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const { t } = useTranslation()

  const LLMDisplayName = apiInterface === 'openai' ? 'OpenAI' : 'Anthropic'

  const resetForm = () => setAPIKey('')

  const handleClose = () => {
    if (isSaving) return
    resetForm()
    onClose()
  }

  const handleSave = async () => {
    if (!apiKey) return
    setIsSaving(true)
    try {
      if (apiInterface === 'openai') {
        await window.llm.addOrUpdateLLMAPIConfig({
          apiKey,
          apiInterface: 'openai',
          name: openAIDefaultAPIName,
        })
        await Promise.all(openAIDefaultLLMs.map((model) => window.llm.addOrUpdateLLMConfig(model)))
      } else {
        await window.llm.addOrUpdateLLMAPIConfig({
          apiKey,
          apiInterface: 'anthropic',
          name: anthropicDefaultAPIName,
        })
        await Promise.all(anthropicDefaultLLMs.map((model) => window.llm.addOrUpdateLLMConfig(model)))
      }
      resetForm()
      onClose()
    } catch (error) {
      toast.error(errorToStringRendererProcess(error))
    } finally {
      setIsSaving(false)
    }
  }
  const handleKeyPress = (e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
    if (e.nativeEvent.key === 'Enter') {
      handleSave()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogPortal>
        <DialogOverlay>
          <DialogContent
            className="flex max-h-[calc(100dvh-16px)] flex-col overflow-hidden p-4 sm:max-w-[425px]"
            style={{ overflow: 'hidden' }}
          >
            <DialogHeader className="shrink-0">
              <DialogTitle>{t('llm.providerSetupTitle', { name: LLMDisplayName })}</DialogTitle>
              <DialogDescription>{t('llm.apiKeyPrompt', { name: LLMDisplayName })}</DialogDescription>
            </DialogHeader>
            <div className="min-h-0 flex-1 overflow-y-auto pt-4">
              <Input
                value={apiKey}
                onChangeText={setAPIKey}
                onKeyPress={handleKeyPress}
                placeholder={t('llm.providerApiKeyPlaceholder', { name: LLMDisplayName })}
                size="$1"
                py="$3"
                px="$2"
                secureTextEntry
              />
              <p className="mt-0 text-xs text-muted-foreground">
                <i>{t('llm.apiKeySavedHint', { name: LLMDisplayName })}</i>
              </p>
            </div>
            <DialogFooter className="shrink-0 border-t border-border pt-3">
              <Button variant="secondary" onClick={handleSave} disabled={isSaving || !apiKey}>
                {t('llm.save')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </DialogOverlay>
      </DialogPortal>
    </Dialog>
  )
}

export default DefaultLLMAPISetupModal
