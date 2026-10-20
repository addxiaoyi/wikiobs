import React from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import SettingsSection, { SettingsRow } from './Shared/SettingsRow'
import { useTranslation } from '@/lib/i18n'

const LanguageSettings: React.FC = () => {
  const { locale, setLocale, t } = useTranslation()

  return (
    <SettingsSection title={t('settings.language')}>
      <SettingsRow
        title={t('language.interface')}
        description={t('language.interfaceDesc')}
        control={
          <Select value={locale} onValueChange={(value) => setLocale(value as 'en' | 'zh-CN')}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">{t('language.english')}</SelectItem>
              <SelectItem value="zh-CN">简体中文</SelectItem>
            </SelectContent>
          </Select>
        }
        divider={false}
      />
    </SettingsSection>
  )
}

export default LanguageSettings
