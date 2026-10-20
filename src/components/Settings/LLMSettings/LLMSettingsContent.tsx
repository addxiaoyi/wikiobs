import React, { useState } from 'react'
import DefaultLLMSelector from './DefaultLLMSelector'
import useLLMConfigs from '../../../lib/hooks/use-llm-configs'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

import DefaultLLMAPISetupModal from './modals/DefaultLLMAPISetupModal'
import NewOllamaModelModal from './modals/NewOllamaModel'
import CustomLLMAPISetupModal from './modals/CustomLLMAPISetup'
import SettingsSection, { SettingsRow } from '../Shared/SettingsRow'
import { useTranslation } from '@/lib/i18n'

interface LLMSettingsContentProps {}

const LLMSettingsContent: React.FC<LLMSettingsContentProps> = () => {
  const { llmConfigs, defaultLLM, setDefaultLLM, fetchAndUpdateModelConfigs } = useLLMConfigs()
  const { t } = useTranslation()

  const [openModal, setOpenModal] = useState<string | null>(null)

  const closeModal = () => {
    setOpenModal(null)
    fetchAndUpdateModelConfigs()
  }

  const modalOptions = [
    { label: t('llm.openaiSetup'), value: 'openai' },
    { label: t('llm.anthropicSetup'), value: 'anthropic' },
  ]

  return (
    <SettingsSection title={t('settings.llm')}>
      <SettingsRow
        title={t('llm.default')}
        description={t('llm.defaultDesc')}
        control={<DefaultLLMSelector llmConfigs={llmConfigs} defaultLLM={defaultLLM} setDefaultLLM={setDefaultLLM} />}
      />

      <SettingsRow
        title={t('llm.local')}
        description={t('llm.localDesc')}
        control={
          <Button variant="secondary" onClick={() => setOpenModal('newLocalModel')}>
            {t('llm.attachLocal')}
          </Button>
        }
      />

      <SettingsRow
        title={t('llm.cloud')}
        description={t('llm.cloudDesc')}
        control={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary">{t('llm.attachCloud')}</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {modalOptions.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => setOpenModal(option.value)}
                  className="cursor-pointer"
                >
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      <SettingsRow
        title={t('llm.custom')}
        description={t('llm.customDesc')}
        control={
          <Button variant="secondary" onClick={() => setOpenModal('remoteLLM')}>
            {t('llm.customSetup')}
          </Button>
        }
        divider={false}
      />

      <NewOllamaModelModal isOpen={openModal === 'newLocalModel'} onClose={closeModal} />
      <CustomLLMAPISetupModal isOpen={openModal === 'remoteLLM'} onClose={closeModal} />
      <DefaultLLMAPISetupModal isOpen={openModal === 'openai'} onClose={closeModal} apiInterface="openai" />
      <DefaultLLMAPISetupModal isOpen={openModal === 'anthropic'} onClose={closeModal} apiInterface="anthropic" />
    </SettingsSection>
  )
}

export default LLMSettingsContent
