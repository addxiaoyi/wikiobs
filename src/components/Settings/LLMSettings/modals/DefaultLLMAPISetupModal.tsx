import React, { useState } from 'react'
import { APIInterface } from 'electron/main/electron-store/storeConfig'
import { toast } from 'react-toastify'
import {
  anthropicDefaultAPIName,
  anthropicDefaultLLMs,
  openAIDefaultAPIName,
  openAIDefaultLLMs,
} from '@shared/defaultLLMs'
import { KeyRound, Loader2, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import ReorModal from '@/components/Common/Modal'
import errorToStringRendererProcess from '@/lib/error'
import { useTranslation } from '@/lib/i18n'

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
    if (!apiKey.trim() || isSaving) return
    setIsSaving(true)
    try {
      if (apiInterface === 'openai') {
        await window.llm.addOrUpdateLLMAPIConfig({
          apiKey: apiKey.trim(),
          apiInterface: 'openai',
          name: openAIDefaultAPIName,
        })
        await Promise.all(openAIDefaultLLMs.map((model) => window.llm.addOrUpdateLLMConfig(model)))
      } else {
        await window.llm.addOrUpdateLLMAPIConfig({
          apiKey: apiKey.trim(),
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'Escape') {
      handleClose()
    }
  }

  return (
    <ReorModal isOpen={isOpen} onClose={handleClose} className="max-w-[440px] p-5">
      {/* Header */}
      <div className="flex items-start gap-3 pb-3 border-b border-border">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-[#7b68ee]/30 bg-[#7b68ee]/15 text-[#7b68ee] shadow-sm shadow-[#7b68ee]/20">
          <KeyRound size={18} strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1 pr-6">
          <h2 className="text-sm font-semibold text-foreground tracking-tight">
            {t('llm.providerSetupTitle', { name: LLMDisplayName })}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t('llm.apiKeyPrompt', { name: LLMDisplayName })}
          </p>
        </div>
      </div>

      <div className="pt-3.5 space-y-3">
        <div className="space-y-1.5">
          <Input
            value={apiKey}
            onChange={(e) => setAPIKey(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('llm.providerApiKeyPlaceholder', { name: LLMDisplayName })}
            type="password"
            autoFocus
            disabled={isSaving}
            className="h-8 text-xs font-mono"
          />
          <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <Lock size={12} className="text-muted-foreground shrink-0" />
            <span>{t('llm.apiKeySavedHint', { name: LLMDisplayName })}</span>
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
          <Button variant="secondary" size="sm" onClick={handleClose} disabled={isSaving} className="text-xs">
            {t('button.cancel')}
          </Button>
          <Button
            variant="accent"
            size="sm"
            onClick={handleSave}
            disabled={isSaving || !apiKey.trim()}
            className="text-xs shadow-md shadow-[#7b68ee]/25 gap-1.5"
          >
            {isSaving && <Loader2 size={12} className="animate-spin" />}
            <span>{t('llm.save')}</span>
          </Button>
        </div>
      </div>
    </ReorModal>
  )
}

export default DefaultLLMAPISetupModal
