import React, { createContext, useContext, useEffect, useState, PropsWithChildren, FC } from 'react'
import { toast } from 'react-toastify'
import type { TamaguiThemeTypes } from 'electron/main/electron-store/storeConfig'
import { TamaguiProvider, useTheme } from 'tamagui'
import config from '../../tamagui.config'
import errorToStringRendererProcess from '@/lib/error'
import { WikiObsLogo } from '@/components/Common/WikiObsLogo'

export interface ThemeActions {
  toggle: () => void
  set: (theme: TamaguiThemeTypes) => void
  syncWithSystem: () => void
}

export interface ThemeContextValue {
  state: TamaguiThemeTypes
  actions: ThemeActions
}

/**
 * Apply the theme class and attributes to the root HTML element
 */
export const applyThemeToDOM = (theme: TamaguiThemeTypes) => {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  const body = document.body
  if (theme === 'dark') {
    root.classList.add('dark')
    root.classList.remove('light')
    root.setAttribute('data-theme', 'dark')
    root.style.colorScheme = 'dark'
    if (body) {
      body.classList.add('dark')
      body.classList.remove('light')
      body.setAttribute('data-theme', 'dark')
    }
  } else {
    root.classList.add('light')
    root.classList.remove('dark')
    root.setAttribute('data-theme', 'light')
    root.style.colorScheme = 'light'
    if (body) {
      body.classList.add('light')
      body.classList.remove('dark')
      body.setAttribute('data-theme', 'light')
    }
  }
}

// Apply default dark theme immediately upon script evaluation
if (typeof document !== 'undefined') {
  applyThemeToDOM('dark')
}

// Basic colors for manual component mapping
const styles = {
  '#f9f9f9': {
    mainColor: 'rgba(255, 255, 255, 1)',
    offsetMainColor: 'rgba(255, 255, 255, 0.6)',
    textColor: 'rgba(0, 0, 0, 1)',
    systemGray1: 'rgb(142, 142, 147)',
    systemGray2: 'rgb(174, 174, 178)',
    systemGray3: 'rgb(199, 199, 204)',
    systemGray4: 'rgb(209, 209, 214)',
    systemGray5: 'rgb(229, 229, 234)',
    systemGray6: 'rgb(242, 242, 247)',
    systemBlue: 'rgb(0, 122, 255)',
    systemBlueHover: 'rgba(10, 132, 255, 1)',
  },
  '#151515': {
    mainColor: 'rgba(0, 0, 0, 1)',
    offsetMainColor: 'rgba(0, 0, 0, 0.6)',
    textColor: 'rgba(255, 255, 255, 1)',
    systemGray1: 'rgb(142, 142, 147)',
    systemGray2: 'rgb(99, 99, 102)',
    systemGray3: 'rgb(72, 72, 74)',
    systemGray4: 'rgb(58, 58, 60)',
    systemGray5: 'rgb(44, 44, 46)',
    systemGray6: 'rgb(28, 28, 30)',
    systemBlue: 'rgb(10, 132, 255)',
    systemBlueHover: 'rgba(0, 122, 255, 1)',
  },
}

export const MantineStyleProps = () => {
  const theme = useTheme()
  const colors = styles[theme?.background?.val as keyof typeof styles] || styles['#151515']

  return {
    input: {
      backgroundColor: colors.mainColor,
      color: colors.textColor,
      '&:hover': {
        backgroundColor: colors.offsetMainColor,
      },
    },
    dropdown: {
      backgroundColor: colors.mainColor,
    },
    item: {
      color: colors.textColor,
      '&:hover': {
        backgroundColor: colors.systemBlueHover,
      },
    },
  }
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export class ThemeManager {
  private state: TamaguiThemeTypes

  private setState: (theme: TamaguiThemeTypes) => void

  constructor(initialTheme: TamaguiThemeTypes, setState: (theme: TamaguiThemeTypes) => void) {
    this.state = initialTheme
    this.setState = setState
    applyThemeToDOM(initialTheme)
  }

  private async updateTheme(newTheme: TamaguiThemeTypes) {
    try {
      applyThemeToDOM(newTheme)
      this.state = newTheme
      this.setState(newTheme)
      if (window.electronStore?.setTamaguiTheme) {
        await window.electronStore.setTamaguiTheme(newTheme)
      }
    } catch (error) {
      toast.error(errorToStringRendererProcess(error))
    }
  }

  getContextValue(): ThemeContextValue {
    return {
      state: this.state,
      actions: {
        toggle: () => {
          const newTheme = this.state === 'light' ? 'dark' : 'light'
          this.updateTheme(newTheme)
        },
        set: (theme: TamaguiThemeTypes) => {
          this.updateTheme(theme)
        },
        syncWithSystem: () => {
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
          this.updateTheme(prefersDark ? 'dark' : 'light')
        },
      },
    }
  }
}

/**
 * Stores, gets, and updates the theme across the whole application
 */
export const ThemeProvider: FC<PropsWithChildren> = ({ children }) => {
  const [theme, setTheme] = useState<TamaguiThemeTypes>('dark')
  const [manager, setManager] = useState<ThemeManager | null>(null)

  useEffect(() => {
    const initTheme = async () => {
      try {
        let initialTheme: TamaguiThemeTypes = 'dark'
        if (window.electronStore?.getTamaguiTheme) {
          const savedTheme = await window.electronStore.getTamaguiTheme()
          if (savedTheme === 'light' || savedTheme === 'dark') {
            initialTheme = savedTheme
          }
        }
        applyThemeToDOM(initialTheme)
        setTheme(initialTheme)
        setManager(new ThemeManager(initialTheme, setTheme))
      } catch (error) {
        applyThemeToDOM('dark')
        setTheme('dark')
        setManager(new ThemeManager('dark', setTheme))
      }
    }

    initTheme()
  }, [])

  if (!manager) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-[#0e1015] text-sm text-muted-foreground select-none font-sans"
        role="status"
        aria-live="polite"
      >
        <div className="flex flex-col items-center gap-3">
          <WikiObsLogo size={32} className="animate-pulse drop-shadow-[0_0_12px_rgba(123,104,238,0.5)]" />
          <span className="text-xs font-medium text-muted-foreground tracking-wider">正在初始化工作区主题…</span>
        </div>
      </div>
    )
  }

  return (
    <ThemeContext.Provider value={manager.getContextValue()}>
      <TamaguiProvider config={config} defaultTheme={theme}>
        {children}
      </TamaguiProvider>
    </ThemeContext.Provider>
  )
}

// Custom hook for components to use
export const useThemeManager = () => {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useThemeManager must be used within ThemeProvider')
  return context
}
