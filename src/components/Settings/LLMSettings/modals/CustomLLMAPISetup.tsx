import React, { useState } from 'react'
import { LLMAPIConfig } from 'electron/main/electron-store/storeConfig'
import posthog from 'posthog-js'
import { toast } from 'react-toastify'
import { Settings2, Plus, X, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import ReorModal from '@/components/Common/Modal'
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

  const removeModelName = (index: number) => {
    setModelNames(modelNames.filter((_, i) => i !== index))
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addModelName()
    }
  }

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-foreground block">{t('llm.modelNames')}</label>
      <div className="flex items-center gap-2">
        <Input
          placeholder={t('llm.modelNamesPlaceholder')}
          value={newModelName}
          onChange={(e) => setNewModelName(e.target.value)}
          onKeyDown={handleKeyDown}
          className="h-8 text-xs font-mono"
        />
        <Button
          onClick={addModelName}
          type="button"
          variant="secondary"
          size="sm"
          className="h-8 px-2.5 shrink-0 gap-1 border-border"
        >
          <Plus size={13} />
          <span>{t('llm.addModel')}</span>
        </Button>
      </div>
      {modelNames.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {modelNames.map((name, index) => (
            <span
              key={`${name}-${index}`}
              className="inline-flex items-center gap-1 rounded bg-secondary border border-border px-2 py-0.5 text-[11px] font-mono text-foreground"
            >
              <span>{name}</span>
              <button
                type="button"
                onClick={() => removeModelName(index)}
                className="text-muted-foreground hover:text-foreground"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
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
    <ReorModal isOpen={isOpen} onClose={handleClose} className="max-w-[480px] p-5">
      {/* Header */}
      <div className="flex items-start gap-3 pb-3 border-b border-border">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-[#7b68ee]/30 bg-[#7b68ee]/15 text-[#7b68ee] shadow-sm shadow-[#7b68ee]/20">
          <Settings2 size={18} strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1 pr-6">
          <h2 className="text-sm font-semibold text-foreground tracking-tight">{t('llm.customSetup')}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{t('llm.customDescription')}</p>
        </div>
      </div>

      <div className="pt-3.5 space-y-3">
        {currentError && (
          <div className="flex items-start gap-2 rounded-lg border border-red-500/25 bg-red-500/10 p-2.5 text-xs text-red-600 dark:text-red-200">
            <AlertCircle size={14} className="mt-0.5 shrink-0 text-red-500" />
            <span>{currentError}</span>
          </div>
        )}

        <div className="space-y-1">
          <label htmlFor="apiUrl" className="text-xs font-medium text-foreground block">
            {t('llm.apiUrlLabel')}
          </label>
          <Input
            id="apiUrl"
            placeholder={t('llm.apiUrlPlaceholder')}
            value={apiURL}
            onChange={(e) => {
              setApiURL(e.target.value)
              setCurrentError('')
            }}
            disabled={isSaving}
            className="h-8 text-xs font-mono"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="apiName" className="text-xs font-medium text-foreground block">
            {t('llm.apiNameLabel')}
          </label>
          <Input
            id="apiName"
            placeholder="例如: Custom-OAI, Together, DeepSeek"
            value={apiName}
            onChange={(e) => {
              setApiName(e.target.value)
              setCurrentError('')
            }}
            disabled={isSaving}
            className="h-8 text-xs font-mono"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="apiKey" className="text-xs font-medium text-foreground block">
            {t('llm.apiKeyLabel')}
          </label>
          <Input
            id="apiKey"
            placeholder={t('llm.apiKeyPlaceholder')}
            value={apiKey}
            onChange={(e) => {
              setApiKey(e.target.value)
              setCurrentError('')
            }}
            type="password"
            disabled={isSaving}
            className="h-8 text-xs font-mono"
          />
        </div>

        <ModelNameInput modelNames={modelNames} setModelNames={setModelNames} />

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
          <Button variant="secondary" size="sm" onClick={handleClose} disabled={isSaving} className="text-xs">
            {t('button.cancel')}
          </Button>
          <Button
            variant="accent"
            size="sm"
            onClick={handleSave}
            disabled={isSaving || !apiName.trim() || !apiURL.trim()}
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

export default CustomLLMAPISetupModal
