/* eslint-disable jsx-a11y/anchor-is-valid */
import React, { useState, useEffect, useCallback } from 'react'

import { EmbeddingModelConfig } from 'electron/main/electron-store/storeConfig'
import { XStack, YStack, SizableText } from 'tamagui'

import NewRemoteEmbeddingModelModal from './modals/NewRemoteEmbeddingModel'
import { useTranslation } from '@/lib/i18n'
import EmbeddingModelSelect from './EmbeddingModelSelect'

interface InitialEmbeddingModelSettingsProps {
  setErrorMsg: (msg: string) => void
}

const InitialEmbeddingModelSettings: React.FC<InitialEmbeddingModelSettingsProps> = ({ setErrorMsg }) => {
  const [selectedModel, setSelectedModel] = useState<string>('')
  const [embeddingModels, setEmbeddingModels] = useState<Record<string, EmbeddingModelConfig>>({})
  const [showNewEmbeddingModelModal, setShowNewEmbeddingModelModal] = useState<boolean>(false)
  const [loadError, setLoadError] = useState('')
  const { t } = useTranslation()

  const updateEmbeddingModels = useCallback(async () => {
    try {
      const storedEmbeddingModels = await window.electronStore.getEmbeddingModels()

      if (storedEmbeddingModels) {
        setEmbeddingModels(storedEmbeddingModels)
      }

      const defaultModel = await window.electronStore.getDefaultEmbeddingModel()

      if (defaultModel) {
        setSelectedModel(defaultModel)
      }
      setLoadError('')
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : String(error))
    }
  }, [])

  useEffect(() => {
    updateEmbeddingModels()
  }, [updateEmbeddingModels])

  useEffect(() => {
    if (loadError) {
      setErrorMsg(loadError)
    } else if (selectedModel) {
      setErrorMsg('')
    } else {
      setErrorMsg(t('embedding.noModel'))
    }
  }, [loadError, selectedModel, setErrorMsg, t])

  const handleChangeOnModelSelect = async (newSelectedModel: string) => {
    try {
      await window.electronStore.setDefaultEmbeddingModel(newSelectedModel)
      setLoadError('')
      setSelectedModel(newSelectedModel)
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : String(error))
    }
  }

  return (
    <XStack width="100%">
      <YStack flex={1}>
        <SizableText color="$gray13" fontWeight={600} fontSize={16}>
          {t('embedding.title')}
        </SizableText>
        <SizableText color="$gray11" fontSize={12} fontWeight={300} marginTop="$2">
          {t('embedding.defaultEmbeddingDesc')}{' '}
          <button
            type="button"
            className="cursor-pointer border-0 bg-transparent p-0 text-left text-foreground underline"
            onClick={() => setShowNewEmbeddingModelModal(true)}
          >
            {t('embedding.custom')}
          </button>
        </SizableText>
      </YStack>
      <YStack>
        <EmbeddingModelSelect
          selectedModel={selectedModel}
          embeddingModels={embeddingModels}
          onModelChange={handleChangeOnModelSelect}
        />
      </YStack>

      <NewRemoteEmbeddingModelModal
        isOpen={showNewEmbeddingModelModal}
        onClose={() => {
          setShowNewEmbeddingModelModal(false)
        }}
        handleUserHasChangedModel={() => {
          updateEmbeddingModels()
        }}
      />
    </XStack>
  )
}

export default InitialEmbeddingModelSettings
