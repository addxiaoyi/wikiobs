import React, { useState, useEffect } from 'react'
import { LLMConfig } from 'electron/main/electron-store/storeConfig'
import posthog from 'posthog-js'
import { toast } from 'react-toastify'
import { FiTrash2 } from 'react-icons/fi'
import { Button } from '@/components/ui/button'
import errorToStringRendererProcess from '@/lib/error'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useTranslation } from '@/lib/i18n'

interface DefaultLLMSelectorProps {
  llmConfigs: LLMConfig[]
  defaultLLM: string
  setDefaultLLM: (model: string) => void
}

const DefaultLLMSelector: React.FC<DefaultLLMSelectorProps> = ({ llmConfigs, defaultLLM, setDefaultLLM }) => {
  const { t } = useTranslation()
  const [selectedLLM, setSelectedLLM] = useState(defaultLLM)

  useEffect(() => {
    setSelectedLLM(defaultLLM)
  }, [defaultLLM])

  const handleDefaultModelChange = async (modelName: string) => {
    try {
      await setDefaultLLM(modelName)
      setSelectedLLM(modelName)
      posthog.capture('change_default_llm', {
        defaultLLM: modelName,
      })
    } catch (error) {
      toast.error(errorToStringRendererProcess(error))
    }
  }

  const handleDeleteLLM = async (modelName: string) => {
    // eslint-disable-next-line no-alert
    const confirmDelete = window.confirm(t('llm.deleteModelConfirm', { name: modelName }))
    if (!confirmDelete) return

    try {
      await window.llm.deleteLLM(modelName)
      posthog.capture('delete_llm', {
        modelName,
      })
    } catch (error) {
      toast.error(errorToStringRendererProcess(error))
    }
  }

  return (
    <Select onValueChange={handleDefaultModelChange} value={selectedLLM}>
      <SelectTrigger className="w-[180px]" aria-label={t('llm.default')}>
        <SelectValue placeholder={t('llm.defaultPlaceholder')} />
      </SelectTrigger>
      <SelectContent>
        {llmConfigs.map((config) => {
          const { modelName } = config
          return (
            <div key={modelName} className="flex w-full items-center justify-between">
              <SelectItem className="cursor-pointer" value={modelName}>
                {modelName}
              </SelectItem>
              {config.apiName === 'Ollama' && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="mr-1 size-7 text-red-500 hover:text-red-600"
                  aria-label={t('button.delete')}
                  title={t('button.delete')}
                  onClick={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    handleDeleteLLM(modelName)
                  }}
                >
                  <FiTrash2 aria-hidden="true" />
                </Button>
              )}
            </div>
          )
        })}
      </SelectContent>
    </Select>
  )
}

export default DefaultLLMSelector
