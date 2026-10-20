import React, { useState, useEffect, useCallback } from 'react'

import { EmbeddingModelConfig } from 'electron/main/electron-store/storeConfig'
import posthog from 'posthog-js'

import { toast } from 'react-toastify'
import ChunkSizeSettings from '../ChunkSizeSettings'
import EmbeddingModelSelect from './EmbeddingModelSelect'
import NewRemoteEmbeddingModelModal from './modals/NewRemoteEmbeddingModel'
import { Button } from '@/components/ui/button'
import SettingsSection, { SettingsRow } from '../Shared/SettingsRow'
import { useTranslation } from '@/lib/i18n'
import errorToStringRendererProcess from '@/lib/error'

interface EmbeddingModelManagerProps {
  handleUserHasChangedModel?: () => void
  userTriedToSubmit?: boolean
}

const EmbeddingModelSettings: React.FC<EmbeddingModelManagerProps> = ({
  handleUserHasChangedModel,
  userTriedToSubmit,
}) => {
  const [currentError, setCurrentError] = useState<string>('')
  const [isConextLengthModalOpen, setIsContextLengthModalOpen] = useState<boolean>(false)
  const [selectedModel, setSelectedModel] = useState<string>('')
  const [embeddingModels, setEmbeddingModels] = useState<Record<string, EmbeddingModelConfig>>({})
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
    } catch (error) {
      setCurrentError(error instanceof Error ? error.message : String(error))
    }
  }, [])

  useEffect(() => {
    updateEmbeddingModels()
  }, [updateEmbeddingModels])

  useEffect(() => {
    if (selectedModel) {
      setCurrentError('')
    } else {
      setCurrentError(t('embedding.noModel'))
    }
  }, [selectedModel, t])

  const handleChangeOnModelSelect = async (newSelectedModel: string) => {
    try {
      await window.electronStore.setDefaultEmbeddingModel(newSelectedModel)
      setSelectedModel(newSelectedModel)
      posthog.capture('change_default_embedding_model', {
        defaultEmbeddingModel: newSelectedModel,
      })
      if (handleUserHasChangedModel) handleUserHasChangedModel()
    } catch (error) {
      const message = errorToStringRendererProcess(error)
      setCurrentError(message)
      toast.error(message)
    }
  }
  return (
    <SettingsSection
      title={t('settings.embedding')}
      footnote={t('embedding.footnote')}
      error={userTriedToSubmit && !selectedModel ? currentError : ''}
    >
      <SettingsRow
        title={t('settings.embedding')}
        control={
          <EmbeddingModelSelect
            selectedModel={selectedModel}
            embeddingModels={embeddingModels}
            onModelChange={handleChangeOnModelSelect}
          />
        }
      />

      <SettingsRow
        title={t('embedding.custom')}
        description={t('embedding.customDesc')}
        control={
          <Button variant="secondary" onClick={() => setIsContextLengthModalOpen(true)}>
            {t('embedding.attach')}
          </Button>
        }
      />

      <SettingsRow
        title={t('embedding.chunkSize')}
        description={t('embedding.chunkSizeDesc')}
        control={<ChunkSizeSettings />}
        divider={false}
      />

      <NewRemoteEmbeddingModelModal
        isOpen={isConextLengthModalOpen}
        onClose={() => {
          setIsContextLengthModalOpen(false)
        }}
        handleUserHasChangedModel={() => {
          updateEmbeddingModels()
          if (handleUserHasChangedModel) {
            handleUserHasChangedModel()
          }
        }}
      />
    </SettingsSection>
  )
}

export default EmbeddingModelSettings
