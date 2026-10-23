import React, { useState } from 'react'
import { toast } from 'react-toastify'
import { EmbeddingModelWithRepo } from 'electron/main/electron-store/storeConfig'
import posthog from 'posthog-js'
import { Database, Loader2, Sparkles, ExternalLink as ExternalLinkIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import ReorModal from '@/components/Common/Modal'
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      saveModelConfigToElectronStore()
    } else if (e.key === 'Escape') {
      handleClose()
    }
  }

  return (
    <ReorModal isOpen={isOpen} onClose={handleClose} className="max-w-[440px] p-5">
      {/* Header */}
      <div className="flex items-start gap-3 pb-3 border-b border-border">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-[#7b68ee]/30 bg-[#7b68ee]/15 text-[#7b68ee] shadow-sm shadow-[#7b68ee]/20">
          <Database size={18} strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1 pr-6">
          <h2 className="text-sm font-semibold text-foreground tracking-tight">{t('embedding.custom')}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{t('embedding.customDesc')}</p>
        </div>
      </div>

      <div className="pt-3.5 space-y-3">
        <div className="space-y-1.5">
          <Input
            value={huggingfaceRepo}
            onChange={(e) => {
              setHuggingfaceRepo(e.target.value)
              setErrorMessage('')
            }}
            onKeyDown={handleKeyDown}
            placeholder="Xenova/bge-base-en-v1.5"
            autoFocus
            disabled={isSaving}
            className="h-8 text-xs font-mono"
          />
          <div className="text-[11px] text-muted-foreground leading-relaxed space-y-1 pt-1">
            <p className="flex items-center gap-1.5">
              <ExternalLink href="https://huggingface.co/models?pipeline_tag=feature-extraction&sort=downloads&search=xenova" className="text-[#7b68ee] hover:underline inline-flex items-center gap-1">
                <span>Hugging Face</span>
                <ExternalLinkIcon size={10} />
              </ExternalLink>{' '}
              <span>{t('embedding.compatibleHint')}</span>
            </p>
          </div>
          {errorMessage && <p className="text-xs text-red-400 font-medium">{errorMessage}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
          <Button variant="secondary" size="sm" onClick={handleClose} disabled={isSaving} className="text-xs">
            {t('button.cancel')}
          </Button>
          <Button
            variant="accent"
            size="sm"
            onClick={saveModelConfigToElectronStore}
            disabled={isSaving || !huggingfaceRepo.trim()}
            className="text-xs shadow-md shadow-[#7b68ee]/25 gap-1.5"
          >
            {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            <span>{t('embedding.attach')}</span>
          </Button>
        </div>
      </div>
    </ReorModal>
  )
}

export default NewRemoteEmbeddingModelModal
