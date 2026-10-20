import React, { useState } from 'react'
import { toast } from 'react-toastify'
import { EmbeddingModelWithRepo } from 'electron/main/electron-store/storeConfig'
import posthog from 'posthog-js'
import { Input } from 'tamagui'
import { NativeSyntheticEvent, TextInputKeyPressEventData } from 'react-native'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogPortal,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogOverlay,
} from '@/components/ui/dialog'
import ExternalLink from '../../../Common/ExternalLink'
import { useTranslation } from '@/lib/i18n'

interface NewRemoteEmbeddingModelModalProps {
  isOpen: boolean
  onClose: () => void
  handleUserHasChangedModel?: () => void
}

const NewRemoteEmbeddingModelModal: React.FC<NewRemoteEmbeddingModelModalProps> = ({
  isOpen,
  onClose,
  handleUserHasChangedModel,
}) => {
  const [huggingfaceRepo, setHuggingfaceRepo] = useState('')
  const { t } = useTranslation()
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const resetForm = () => {
    setHuggingfaceRepo('')
    setErrorMessage('')
  }

  const handleClose = () => {
    if (isSaving) return
    resetForm()
    onClose()
  }

  const saveModelConfigToElectronStore = async () => {
    if (!huggingfaceRepo.trim()) {
      setErrorMessage('Please enter a Hugging Face model repository.')
      return
    }

    const modelObject: EmbeddingModelWithRepo = {
      type: 'repo',
      repoName: huggingfaceRepo.trim(),
    }

    setIsSaving(true)
    try {
      await window.electronStore.addNewRepoEmbeddingModel(modelObject)
      posthog.capture('save_repo_embedding_model', {
        modelRepo: huggingfaceRepo.trim(),
      })
      if (handleUserHasChangedModel) {
        handleUserHasChangedModel()
      }
      resetForm()
      onClose()
    } catch (error) {
      toast.error(String(error))
    } finally {
      setIsSaving(false)
    }
  }

  const handleKeyPress = (e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
    if (e.nativeEvent.key === 'Enter') {
      saveModelConfigToElectronStore()
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
              <DialogTitle>{t('embedding.custom')}</DialogTitle>
              <DialogDescription>{t('embedding.customDesc')}</DialogDescription>
            </DialogHeader>
            <div className="min-h-0 flex-1 overflow-y-auto py-4">
              <Input
                value={huggingfaceRepo}
                onChangeText={(value) => {
                  setHuggingfaceRepo(value)
                  setErrorMessage('')
                }}
                onKeyPress={handleKeyPress}
                placeholder="Xenova/bge-base-en-v1.5"
                size="$1"
                py="$3"
                px="$2"
              />
              <p className="text-xs italic text-muted-foreground">
                <ExternalLink href="https://huggingface.co/models?pipeline_tag=feature-extraction&sort=downloads&search=xenova">
                  Hugging Face
                </ExternalLink>{' '}
                {t('embedding.compatibleHint')}{' '}
                <ExternalLink href="https://www.reorproject.org/docs/documentation/embedding">
                  {t('embedding.guide')}
                </ExternalLink>
              </p>
              {errorMessage && <p className="text-xs text-destructive">{errorMessage}</p>}
            </div>
            <DialogFooter className="shrink-0 border-t border-border pt-3">
              <Button variant="secondary" onClick={saveModelConfigToElectronStore} disabled={isSaving}>
                {t('embedding.attach')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </DialogOverlay>
      </DialogPortal>
    </Dialog>
  )
}

export default NewRemoteEmbeddingModelModal
