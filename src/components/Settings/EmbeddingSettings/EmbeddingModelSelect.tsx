import React from 'react'
import { EmbeddingModelConfig } from 'electron/main/electron-store/storeConfig'
import { useTranslation } from '@/lib/i18n'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface EmbeddingModelSelectProps {
  selectedModel: string
  embeddingModels: Record<string, EmbeddingModelConfig>
  onModelChange: (newSelectedModel: string) => void
}

const EmbeddingModelSelect: React.FC<EmbeddingModelSelectProps> = ({
  selectedModel,
  embeddingModels,
  onModelChange,
}) => {
  const { t } = useTranslation()

  return (
    <div className="w-[150px]">
      <Select value={selectedModel} onValueChange={onModelChange}>
        <SelectTrigger aria-label={t('settings.embedding')}>
          <SelectValue placeholder={t('embedding.title')} />
        </SelectTrigger>
        <SelectContent position="popper" align="center" className="max-h-[300px] max-w-[250px] overflow-y-auto">
          {Object.entries(embeddingModels).map(([model, config]) => (
            <SelectItem key={model} value={model}>
              <div>
                <div>{config.readableName || model}</div>
                <div className="text-xs text-muted-foreground">{config.description}</div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export default EmbeddingModelSelect
