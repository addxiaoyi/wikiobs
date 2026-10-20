import React, { useEffect, useState } from 'react'
import Switch from '@mui/material/Switch'
import { toast } from 'react-toastify'
import SettingsSection, { SettingsRow } from './Shared/SettingsRow'
import { useTranslation } from '@/lib/i18n'
import errorToStringRendererProcess from '@/lib/error'

export const EditorSection = () => {
  const [spellCheckEnabled, setSpellCheckEnabled] = useState(false)
  const [documentStatsEnabled, setDocumentStatsEnabled] = useState(false)
  const [editorFlexCenter, setEditorFlexCenter] = useState(true)
  const { t } = useTranslation()

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
        title={t('editor.flexCenter')}
        description={t('editor.flexCenterDesc')}
        control={
          <Switch
            checked={editorFlexCenter}
            onChange={(event) => updateEditorFlexCenter(event.target.checked)}
            inputProps={{ 'aria-label': t('editor.flexCenter') }}
          />
        }
      />
      <SettingsRow
        title={t('editor.spellCheck')}
        description={t('editor.spellCheckDesc')}
        control={
          <Switch
            checked={spellCheckEnabled}
            onChange={(event) => updateSpellCheck(event.target.checked)}
            inputProps={{ 'aria-label': t('editor.spellCheck') }}
          />
        }
      />
      <SettingsRow
        title={t('editor.docStats')}
        description={t('editor.docStatsDesc')}
        control={
          <Switch
            checked={documentStatsEnabled}
            onChange={(event) => updateDocumentStats(event.target.checked)}
            inputProps={{ 'aria-label': t('editor.docStats') }}
          />
        }
        divider={false}
      />
    </SettingsSection>
  )
}

export default EditorSection
