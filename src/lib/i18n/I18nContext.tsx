import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { Locale, defaultLocale, t as translate, translations, TranslationKey } from './translations'

interface I18nContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: TranslationKey, params?: Record<string, string | number>) => string
  availableLocales: Locale[]
}

const I18nContext = createContext<I18nContextType | undefined>(undefined)

const STORAGE_KEY = 'reor-locale'

interface I18nProviderProps {
  children: ReactNode
}

export const I18nProvider: React.FC<I18nProviderProps> = ({ children }) => {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale)
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    const savedLocale = localStorage.getItem(STORAGE_KEY) as Locale | null
    const supportedLocales = Object.keys(translations[Object.keys(translations)[0] as TranslationKey] || {})
    let nextLocale: Locale = defaultLocale
    if (savedLocale && supportedLocales.includes(savedLocale)) {
      nextLocale = savedLocale
    } else if (navigator.language.toLowerCase().startsWith('zh')) {
      nextLocale = 'zh-CN'
    }

    setLocaleState(nextLocale)
    document.documentElement.lang = nextLocale === 'zh-CN' ? 'zh' : 'en'
    setIsInitialized(true)
  }, [])

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale)
    localStorage.setItem(STORAGE_KEY, newLocale)
    document.documentElement.lang = newLocale === 'zh-CN' ? 'zh' : 'en'
  }, [])

  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>): string => {
      let text = translate(key, locale)
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          // Use a function replacer so values containing "$" (e.g. $&, $$) are not
          // interpreted as special replacement patterns by String.prototype.replace.
          text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), () => String(v))
        })
      }
      return text
    },
    [locale],
  )

  if (!isInitialized) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground"
        role="status"
        aria-live="polite"
      >
        Loading workspace…
      </div>
    )
  }

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, availableLocales: ['en', 'zh-CN'] }}>
      {children}
    </I18nContext.Provider>
  )
}

export const useI18n = (): I18nContextType => {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider')
  }
  return context
}

export const useTranslation = () => {
  const { t, locale, setLocale, availableLocales } = useI18n()
  return { t, locale, setLocale, availableLocales }
}
