import React, { useState, useEffect } from 'react'
import { YStack, XStack, ScrollView } from 'tamagui'
import { toast } from 'react-toastify'
import { BarChart3, BrainCircuit, Database, Languages, Settings2, X } from 'lucide-react'
import { Dialog, DialogClose, DialogContent, DialogOverlay, DialogPortal, DialogTitle } from '@/components/ui/dialog'

import AnalyticsSettings from './AnalyticsSettings'
import EmbeddingModelSettings from './EmbeddingSettings/EmbeddingSettings'
import EditorSettings from './GeneralSettings'
import LanguageSettings from './LanguageSettings'

import LLMSettingsContent from './LLMSettings/LLMSettingsContent'
import { useTranslation } from '@/lib/i18n'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  initialTab?: SettingsTab
}

export enum SettingsTab {
  GeneralSettingsTab = 'generalSettings',
  LLMSettingsTab = 'llmSettings',
  EmbeddingModelTab = 'embeddingModel',
  LanguageTab = 'language',
  AnalyticsTab = 'analytics',
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose: onCloseFromParent,
  initialTab = SettingsTab.GeneralSettingsTab,
}) => {
  const [willNeedToReIndex, setWillNeedToReIndex] = useState(false)
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab)
  const { t } = useTranslation()

  useEffect(() => {
    setActiveTab(initialTab)
  }, [initialTab])
  const settingsTabs = [
    { id: SettingsTab.GeneralSettingsTab, label: t('settings.editor'), icon: Settings2 },
    { id: SettingsTab.LLMSettingsTab, label: t('settings.llm'), icon: BrainCircuit },
    { id: SettingsTab.EmbeddingModelTab, label: t('settings.embedding'), icon: Database },
    { id: SettingsTab.LanguageTab, label: t('settings.language'), icon: Languages },
    { id: SettingsTab.AnalyticsTab, label: t('settings.analytics'), icon: BarChart3 },
  ] as const

  const handleTabKeyDown = (event: React.KeyboardEvent, tab: SettingsTab) => {
    const tabIndex = settingsTabs.findIndex((item) => item.id === tab)
    let nextTab
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      nextTab = settingsTabs[(tabIndex + 1) % settingsTabs.length]
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      nextTab = settingsTabs[(tabIndex - 1 + settingsTabs.length) % settingsTabs.length]
    }

    if (nextTab) {
      event.preventDefault()
      setActiveTab(nextTab.id)
      requestAnimationFrame(() => document.getElementById(`settings-tab-${nextTab.id}`)?.focus())
      return
    }

    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      const target = event.key === 'Home' ? settingsTabs[0] : settingsTabs[settingsTabs.length - 1]
      setActiveTab(target.id)
      requestAnimationFrame(() => document.getElementById(`settings-tab-${target.id}`)?.focus())
    }
  }

  const handleSave = async () => {
    try {
      if (willNeedToReIndex) {
        await window.database.indexFilesInDirectory()
      }
      onCloseFromParent()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error))
    }
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) handleSave()
      }}
    >
      <DialogPortal>
        <DialogOverlay>
          <DialogContent aria-describedby={undefined} className="p-0">
            <DialogTitle className="sr-only">{t('settings.title')}</DialogTitle>
            <DialogClose asChild>
              <button
                type="button"
                aria-label={t('button.close')}
                title={t('button.close')}
                className="absolute right-3 top-3 z-10 flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                onClick={handleSave}
              >
                <X size={16} />
              </button>
            </DialogClose>
            <ScrollView height="min(80vh, 760px)" maxHeight="calc(100vh - 32px)">
              <XStack data-settings-shell="true" minHeight="min(80vh, 760px)" width="100%">
                <YStack
                  backgroundColor="$background"
                  width="180px"
                  minWidth="180px"
                  gap="$1"
                  data-settings-nav="true"
                  role="tablist"
                  aria-label={t('settings.title')}
                  className="flex flex-col rounded-l-lg border-y-0 border-l-0 border-r border-solid border-white/10 p-2 text-white"
                >
                  {settingsTabs.map(({ id, label, icon: Icon }) => {
                    const isActive = activeTab === id
                    return (
                      <button
                        key={id}
                        type="button"
                        role="tab"
                        tabIndex={isActive ? 0 : -1}
                        id={`settings-tab-${id}`}
                        aria-selected={isActive}
                        aria-controls={`settings-panel-${id}`}
                        aria-label={label}
                        className={`settings-tab ${isActive ? 'is-active' : ''}`}
                        onClick={() => setActiveTab(id)}
                        onKeyDown={(event) => handleTabKeyDown(event, id)}
                      >
                        <Icon size={15} aria-hidden="true" />
                        <span>{label}</span>
                      </button>
                    )
                  })}
                </YStack>

                <XStack
                  data-settings-panel="true"
                  id={`settings-panel-${activeTab}`}
                  role="tabpanel"
                  aria-labelledby={`settings-tab-${activeTab}`}
                  minWidth={0}
                  maxWidth="calc(100% - 180px)"
                  flex={1}
                >
                  {activeTab === SettingsTab.GeneralSettingsTab && <EditorSettings />}
                  {activeTab === SettingsTab.LLMSettingsTab && <LLMSettingsContent />}
                  {activeTab === SettingsTab.EmbeddingModelTab && (
                    <EmbeddingModelSettings handleUserHasChangedModel={() => setWillNeedToReIndex(true)} />
                  )}
                  {activeTab === SettingsTab.LanguageTab && <LanguageSettings />}
                  {activeTab === SettingsTab.AnalyticsTab && <AnalyticsSettings />}
                </XStack>
              </XStack>
            </ScrollView>
          </DialogContent>
        </DialogOverlay>
      </DialogPortal>
    </Dialog>
  )
}

export default SettingsModal
