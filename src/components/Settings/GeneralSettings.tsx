import React, { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { Moon, Sun } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import SettingsSection, { SettingsRow } from './Shared/SettingsRow'
import { useTranslation } from '@/lib/i18n'
import { useThemeManager } from '@/contexts/ThemeContext'
import errorToStringRendererProcess from '@/lib/error'

export const EditorSection = () => {
  const [spellCheckEnabled, setSpellCheckEnabled] = useState(false)
  const [documentStatsEnabled, setDocumentStatsEnabled] = useState(false)
  const [editorFlexCenter, setEditorFlexCenter] = useState(true)
  const { t } = useTranslation()
  const { state: currentTheme, actions: themeActions } = useThemeManager()

  useEffect(() => {
    const fetchParams = async () => {
      try {
        const [spellCheck, documentStats, flexCenter] = await Promise.all([
          window.electronStore.getSpellCheckMode(),
          window.electronStore.getDocumentStats(),
          window.electronStore.getEditorFlexCenter(),
        ])
        setSpellCheckEnabled(spellCheck)
        setDocumentStatsEnabled(documentStats)
        setEditorFlexCenter(flexCenter)
      } catch (error) {
        toast.error(errorToStringRendererProcess(error))
      }
    }

    fetchParams()
  }, [])

  const updateSpellCheck = async (enabled: boolean) => {
    try {
      await window.electronStore.setSpellCheckMode(enabled)
      setSpellCheckEnabled(enabled)
    } catch (error) {
      toast.error(errorToStringRendererProcess(error))
    }
  }

  const updateDocumentStats = async (enabled: boolean) => {
    try {
      await window.electronStore.setDocumentStats(enabled)
      setDocumentStatsEnabled(enabled)
    } catch (error) {
      toast.error(errorToStringRendererProcess(error))
    }
  }

  const updateEditorFlexCenter = async (enabled: boolean) => {
    try {
      await window.electronStore.setEditorFlexCenter(enabled)
      setEditorFlexCenter(enabled)
    } catch (error) {
      toast.error(errorToStringRendererProcess(error))
    }
  }

  return (
    <SettingsSection title={t('settings.editor')}>
      <SettingsRow
        title={t('settings.theme')}
        description="选择 Obsidian 深色黑曜石主题或明亮纯净主题"
        control={
          <div className="flex items-center rounded-lg border border-border bg-muted/40 p-0.5">
            <button
              type="button"
              data-testid="theme-btn-dark"
              onClick={() => themeActions.set('dark')}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                currentTheme === 'dark'
                  ? 'bg-[#7b68ee] text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Moon size={13} />
              <span>深色</span>
            </button>
            <button
              type="button"
              data-testid="theme-btn-light"
              onClick={() => themeActions.set('light')}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                currentTheme === 'light'
                  ? 'bg-[#7b68ee] text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Sun size={13} />
              <span>明亮</span>
            </button>
          </div>
        }
      />
      <SettingsRow
        title={t('editor.flexCenter')}
        description={t('editor.flexCenterDesc')}
        control={
          <Switch
            checked={editorFlexCenter}
            onCheckedChange={(checked) => updateEditorFlexCenter(checked)}
            aria-label={t('editor.flexCenter')}
          />
        }
      />
      <SettingsRow
        title={t('editor.spellCheck')}
        description={t('editor.spellCheckDesc')}
        control={
          <Switch
            checked={spellCheckEnabled}
            onCheckedChange={(checked) => updateSpellCheck(checked)}
            aria-label={t('editor.spellCheck')}
          />
        }
      />
      <SettingsRow
        title={t('editor.docStats')}
        description={t('editor.docStatsDesc')}
        control={
          <Switch
            checked={documentStatsEnabled}
            onCheckedChange={(checked) => updateDocumentStats(checked)}
            aria-label={t('editor.docStats')}
          />
        }
        divider={false}
      />
    </SettingsSection>
  )
}

export default EditorSection
