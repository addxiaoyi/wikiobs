import React, { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import { ShieldCheck, BrainCircuit, Database, Languages, Settings2, X } from 'lucide-react'
import { Dialog, DialogClose, DialogContent, DialogTitle } from '@/components/ui/dialog'

import AnalyticsSettings from './AnalyticsSettings'
import EmbeddingModelSettings from './EmbeddingSettings/EmbeddingSettings'
import EditorSettings from './GeneralSettings'
import LanguageSettings from './LanguageSettings'
import LLMSettingsContent from './LLMSettings/LLMSettingsContent'
import { useTranslation } from '@/lib/i18n'
import { cn } from '@/lib/ui'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  initialTab?: SettingsTab
  embedded?: boolean
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
  embedded,
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
    { id: SettingsTab.AnalyticsTab, label: t('settings.analytics'), icon: ShieldCheck },
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

  if (embedded) {
    return (
      <div className="size-full flex flex-col bg-background text-foreground overflow-hidden">
        <div className="h-full flex w-full overflow-hidden">
          {/* Left Navigation Sidebar */}
          <div
            data-settings-nav="true"
            role="tablist"
            aria-label={t('settings.title')}
            className="w-56 shrink-0 flex flex-col gap-1 border-r border-border bg-secondary/30 p-4 text-foreground"
          >
            <div className="flex items-center justify-between px-2 py-2 mb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-lg bg-[#7b68ee]/20 text-[#7b68ee] dark:text-[#9d8ff5] border border-[#7b68ee]/30">
                  <Settings2 size={15} />
                </div>
                <span className="text-sm font-semibold tracking-tight text-foreground">{t('settings.title')}</span>
              </div>
              <button
                type="button"
                onClick={handleSave}
                className="flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer"
                title={t('button.close')}
              >
                <X size={14} />
              </button>
            </div>
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
                  className={cn(
                    'settings-tab group flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-medium transition-all text-left w-full cursor-pointer',
                    isActive
                      ? 'is-active bg-[#7b68ee]/15 text-[#7b68ee] dark:text-[#a29bfe] shadow-sm border border-[#7b68ee]/30 font-semibold'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/60 border border-transparent',
                  )}
                  onClick={() => setActiveTab(id)}
                  onKeyDown={(event) => handleTabKeyDown(event, id)}
                >
                  <Icon
                    size={16}
                    className={cn(
                      'transition-colors shrink-0',
                      isActive ? 'text-[#7b68ee] dark:text-[#9d8ff5]' : 'text-muted-foreground group-hover:text-foreground',
                    )}
                    aria-hidden="true"
                  />
                  <span>{label}</span>
                </button>
              )
            })}
            <div className="mt-auto pt-3 border-t border-border/40 text-[10px] text-muted-foreground/70 px-2 flex flex-col gap-0.5 select-none">
              <span className="font-medium text-foreground/85 tracking-wide">WIKIOBS</span>
              <span>Helstera 旗下产品</span>
              <span className="text-[9px] text-muted-foreground/50">v0.2.31</span>
            </div>
          </div>

          {/* Right Content Panel */}
          <div
            data-settings-panel="true"
            id={`settings-panel-${activeTab}`}
            role="tabpanel"
            aria-labelledby={`settings-tab-${activeTab}`}
            className="flex-1 min-w-0 h-full overflow-y-auto bg-background p-8 custom-scrollbar"
          >
            <div className="max-w-3xl mx-auto">
              {activeTab === SettingsTab.GeneralSettingsTab && <EditorSettings />}
              {activeTab === SettingsTab.LLMSettingsTab && <LLMSettingsContent />}
              {activeTab === SettingsTab.EmbeddingModelTab && (
                <EmbeddingModelSettings handleUserHasChangedModel={() => setWillNeedToReIndex(true)} />
              )}
              {activeTab === SettingsTab.LanguageTab && <LanguageSettings />}
              {activeTab === SettingsTab.AnalyticsTab && <AnalyticsSettings />}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) handleSave()
      }}
    >
      <DialogContent aria-describedby={undefined} className="p-0 border border-border bg-popover text-popover-foreground shadow-[0_24px_64px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.06),0_0_40px_rgba(123,104,238,0.08)] backdrop-blur-2xl rounded-2xl overflow-hidden max-w-[840px]">
        <DialogTitle className="sr-only">{t('settings.title')}</DialogTitle>
        <DialogClose asChild>
          <button
            type="button"
            aria-label={t('button.close')}
            title={t('button.close')}
            className="absolute right-3.5 top-3.5 z-20 flex size-7 items-center justify-center rounded-lg border border-transparent text-muted-foreground transition-all hover:border-border hover:bg-muted hover:text-foreground active:scale-95"
            onClick={handleSave}
          >
            <X size={15} strokeWidth={2} />
          </button>
        </DialogClose>
        <div className="h-[min(82vh,740px)] max-h-[calc(100vh-32px)] flex w-full overflow-hidden">
          {/* Left Navigation Sidebar */}
          <div
            data-settings-nav="true"
            role="tablist"
            aria-label={t('settings.title')}
            className="w-48 shrink-0 flex flex-col gap-1 border-r border-border bg-secondary/50 p-3 text-foreground"
          >
            <div className="flex items-center gap-2 px-2 py-2 mb-2 border-b border-border">
              <div className="flex size-7 items-center justify-center rounded-lg bg-[#7b68ee]/20 text-[#7b68ee] dark:text-[#9d8ff5] border border-[#7b68ee]/30">
                <Settings2 size={15} />
              </div>
              <span className="text-xs font-semibold tracking-tight text-foreground">{t('settings.title')}</span>
            </div>
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
                  className={cn(
                    'settings-tab group flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all text-left w-full cursor-pointer',
                    isActive
                      ? 'is-active bg-[#7b68ee]/15 text-[#7b68ee] dark:text-[#a29bfe] shadow-sm border border-[#7b68ee]/30 font-semibold'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/60 border border-transparent',
                  )}
                  onClick={() => setActiveTab(id)}
                  onKeyDown={(event) => handleTabKeyDown(event, id)}
                >
                  <Icon
                    size={15}
                    className={cn(
                      'transition-colors shrink-0',
                      isActive ? 'text-[#7b68ee] dark:text-[#9d8ff5]' : 'text-muted-foreground group-hover:text-foreground',
                    )}
                    aria-hidden="true"
                  />
                  <span>{label}</span>
                </button>
              )
            })}
            <div className="mt-auto pt-3 border-t border-border/40 text-[10px] text-muted-foreground/70 px-2 flex flex-col gap-0.5 select-none">
              <span className="font-medium text-foreground/85 tracking-wide">WIKIOBS</span>
              <span>Helstera 旗下产品</span>
              <span className="text-[9px] text-muted-foreground/50">v0.2.31</span>
            </div>
          </div>

          {/* Right Content Panel */}
          <div
            data-settings-panel="true"
            id={`settings-panel-${activeTab}`}
            role="tabpanel"
            aria-labelledby={`settings-tab-${activeTab}`}
            className="flex-1 min-w-0 h-full overflow-y-auto bg-background/50 custom-scrollbar"
          >
            {activeTab === SettingsTab.GeneralSettingsTab && <EditorSettings />}
            {activeTab === SettingsTab.LLMSettingsTab && <LLMSettingsContent />}
            {activeTab === SettingsTab.EmbeddingModelTab && (
              <EmbeddingModelSettings handleUserHasChangedModel={() => setWillNeedToReIndex(true)} />
            )}
            {activeTab === SettingsTab.LanguageTab && <LanguageSettings />}
            {activeTab === SettingsTab.AnalyticsTab && <AnalyticsSettings />}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default SettingsModal
