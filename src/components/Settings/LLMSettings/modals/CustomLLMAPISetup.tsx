/* eslint-disable jsx-a11y/label-has-associated-control */
import React, { useState } from 'react'
import { LLMAPIConfig } from 'electron/main/electron-store/storeConfig'
import posthog from 'posthog-js'
import { toast } from 'react-toastify'
import { Input, XStack, YStack } from 'tamagui'
import { Button } from '@/components/ui/button'
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
import ExternalLink from '../../../Common/ExternalLink'
import errorToStringRendererProcess from '@/lib/error'
import { useTranslation } from '@/lib/i18n'

interface RemoteLLMModalProps {
  isOpen: boolean
  onClose: () => void
}

interface ModelNameInputProps {
  modelNames: string[]
  setModelNames: React.Dispatch<React.SetStateAction<string[]>>
}

const ModelNameInput: React.FC<ModelNameInputProps> = ({ modelNames, setModelNames }) => {
  const { t } = useTranslation()
  const [newModelName, setNewModelName] = useState('')

  const addModelName = () => {
    if (newModelName.trim() !== '') {
      setModelNames([...modelNames, newModelName.trim()])
      setNewModelName('')
    }
  }

  return (
    <YStack className="">
      <h4 className="mb-1 font-medium">{t('llm.modelNames')}</h4>
      <XStack flex={1} gap="$2">
        <Input
          className="mt-0 w-full"
          placeholder={t('llm.modelNamesPlaceholder')}
          value={newModelName}
          onChangeText={setNewModelName}
          size="$1"
          py="$4"
          px="$2"
        />
        <Button onClick={addModelName} type="button" variant="secondary">
          {t('llm.addModel')}
        </Button>
      </XStack>
      <div className="flex flex-wrap gap-2">
        {modelNames.map((name, index) => (
          // eslint-disable-next-line react/no-array-index-key
          <span key={index} className="rounded bg-secondary px-2 py-1 text-sm">
            {name}
          </span>
        ))}
      </div>
    </YStack>
  )
}

const CustomLLMAPISetupModal: React.FC<RemoteLLMModalProps> = ({ isOpen, onClose: parentOnClose }) => {
  const [apiName, setApiName] = useState<string>('')
  const { t } = useTranslation()
  const [apiURL, setApiURL] = useState<string>('')
  const [apiKey, setApiKey] = useState<string>('')
  const [modelNames, setModelNames] = useState<string[]>([])
  const [currentError, setCurrentError] = useState<string>('')
  const [isSaving, setIsSaving] = useState(false)

  const resetForm = () => {
    setApiName('')
    setApiURL('')
    setApiKey('')
    setModelNames([])
    setCurrentError('')
  }

  const handleSave = async () => {
    if (!apiName.trim() || !apiURL.trim()) {
      setCurrentError(`${t('llm.apiNameLabel')} and ${t('llm.apiUrlLabel')} are required`)
      return
    }
    const apiConfig: LLMAPIConfig = {
      name: apiName.trim(),
      apiInterface: 'openai',
      apiURL: apiURL.trim(),
      apiKey,
    }
    posthog.capture('save_remote_llm', {
      modelName: apiName,
      modelCount: modelNames.length,
    })
    setIsSaving(true)
    try {
      await window.llm.addOrUpdateLLMAPIConfig(apiConfig)
      await Promise.all(
        modelNames.map((modelName) =>
          window.llm.addOrUpdateLLMConfig({
            modelName,
            apiName,
          }),
        ),
      )
      resetForm()
      parentOnClose()
    } catch (error) {
      const message = errorToStringRendererProcess(error)
      setCurrentError(message)
      toast.error(message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleClose = () => {
    if (isSaving) return
    resetForm()
    parentOnClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogPortal>
        <DialogOverlay>
          <DialogContent
            className="flex max-h-[calc(100dvh-16px)] flex-col overflow-hidden p-4 sm:max-w-[525px]"
            style={{ overflow: 'hidden' }}
          >
            <DialogHeader className="shrink-0">
              <DialogTitle>{t('llm.customSetup')}</DialogTitle>
              <DialogDescription>
                {t('llm.customDescription')}{' '}
                <ExternalLink href="https://www.reorproject.org/docs/documentation/openai-like-api">
                  {t('llm.docs')}
                </ExternalLink>
              </DialogDescription>
            </DialogHeader>
            <div className="min-h-0 flex-1 overflow-y-auto py-4">
              <div className="grid gap-2">
                <div className="grid gap-1">
                  <label htmlFor="apiUrl">{t('llm.apiUrlLabel')}</label>
                  <Input
                    id="apiUrl"
                    placeholder={t('llm.apiUrlPlaceholder')}
                    value={apiURL}
                    onChangeText={(value) => {
                      setApiURL(value)
                      setCurrentError('')
                    }}
                    size="$1"
                    py="$4"
                    px="$2"
                  />
                  <p className="mt-0 text-xs text-muted-foreground">{t('llm.apiUrlHint')}</p>
                </div>
                <div className="grid gap-1">
                  <label htmlFor="apiName">{t('llm.apiNameLabel')}</label>
                  <Input
                    id="apiName"
                    placeholder={t('llm.apiNamePlaceholder')}
                    value={apiName}
                    onChangeText={(value) => {
                      setApiName(value)
                      setCurrentError('')
                    }}
                    size="$1"
                    py="$4"
                    px="$2"
                  />
                  <p className="mt-0 text-xs text-muted-foreground">{t('llm.apiNameHint')}</p>
                </div>
                <div className="grid gap-1">
                  <label htmlFor="apiKey">{t('llm.optionalApiKeyLabel')}</label>
                  <Input
                    id="apiKey"
                    placeholder={t('llm.apiKeyPlaceholder')}
                    value={apiKey}
                    onChangeText={(value) => {
                      setApiKey(value)
                      setCurrentError('')
                    }}
                    size="$1"
                    py="$4"
                    px="$2"
                  />
                  <p className="mt-0 text-xs text-muted-foreground">{t('llm.apiKeyHint')}</p>
                </div>
                <ModelNameInput modelNames={modelNames} setModelNames={setModelNames} />
                {currentError && <p className="text-xs text-destructive">{currentError}</p>}
              </div>
            </div>
            <DialogFooter className="shrink-0 border-t border-border pt-3">
              <Button variant="secondary" onClick={handleSave} disabled={isSaving}>
                {t('llm.save')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </DialogOverlay>
      </DialogPortal>
    </Dialog>
  )
}

export default CustomLLMAPISetupModal
