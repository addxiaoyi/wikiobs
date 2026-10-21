import React, { lazy, Suspense, useEffect, useState, useRef } from 'react'

import { Portal } from '@headlessui/react'
import posthog from 'posthog-js'
import { ToastContainer, toast } from 'react-toastify'
import gsap from 'gsap'

import 'react-toastify/dist/ReactToastify.css'
import IndexingProgress from './components/Common/IndexingProgress'
import { ThemeProvider } from './contexts/ThemeContext'
import { I18nProvider } from './lib/i18n'
import { Easing } from '@/lib/gsap-animations'

const MainPageComponent = lazy(() => import('./components/MainPage'))
const InitialSetupSinglePage = lazy(() => import('./components/Settings/InitialSettingsSinglePage'))

const PageLoader = () => (
  <div className="flex h-screen items-center justify-center bg-background text-sm text-muted-foreground">
    <div className="flex items-center gap-3" role="status" aria-live="polite">
      <span className="size-2 rounded-full bg-primary" />
      <span>Loading workspace…</span>
    </div>
  </div>
)

const BrowserPreview = () => (
  <div className="flex min-h-screen bg-[#17191d] text-[#f4f5f7]">
    <aside className="hidden w-64 border-r border-white/10 bg-[#202329] p-5 md:block">
      <div className="mb-8 text-lg font-semibold tracking-tight">WIKIOBS</div>
      <div className="space-y-2 text-sm text-white/60">
        <div className="rounded-md bg-white/10 px-3 py-2 text-white">Notes</div>
        <div className="px-3 py-2">Search</div>
        <div className="px-3 py-2">Knowledge graph</div>
      </div>
    </aside>
    <main className="flex min-w-0 flex-1 flex-col">
      <header className="flex h-14 items-center justify-between border-b border-white/10 px-5">
        <span className="text-sm text-white/60">Local knowledge workspace</span>
        <button className="rounded-md border border-white/15 px-3 py-1.5 text-xs text-white/75" type="button" disabled>
          Electron preview
        </button>
      </header>
      <section className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center px-6 py-16">
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-blue-300/80">WIKIOBS</p>
        <h1 className="max-w-2xl text-3xl font-semibold tracking-tight md:text-5xl">Your notes, connected.</h1>
        <p className="mt-4 max-w-xl text-sm leading-6 text-white/55">
          The browser preview is running without Electron APIs. Launch the desktop app to open a vault, index notes, and
          use local AI.
        </p>
        <div className="mt-10 grid gap-3 sm:grid-cols-3">
          {['Wiki import', 'AI organization', 'Hybrid search'].map((feature) => (
            <div className="border border-white/10 bg-white/[0.03] p-4" key={feature}>
              <div className="text-sm font-medium">{feature}</div>
              <div className="mt-2 text-xs text-white/45">Available in the desktop runtime</div>
            </div>
          ))}
        </div>
      </section>
    </main>
  </div>
)

const calculateIndexingProgress = (update: { current: number; total: number }) => {
  if (update.total <= 0) return 0
  return update.current / update.total
}

const App: React.FC = () => {
  const [userHasConfiguredSettingsForIndexing, setUserHasConfiguredSettingsForIndexing] = useState<boolean | undefined>(
    undefined,
  )

  const [indexingProgress, setIndexingProgress] = useState<number>(0)
  const [indexingStatus, setIndexingStatus] = useState<string>('')
  const [currentStage, setCurrentStage] = useState<'loading' | 'setup' | 'indexing' | 'main'>('loading')
  const stageContainerRef = useRef<HTMLDivElement>(null)
  const stageAnimationRef = useRef<gsap.core.Tween | null>(null)

  const isElectronRuntime = typeof window !== 'undefined' && !!window.ipcRenderer

  useEffect(() => {
    if (!isElectronRuntime) return
    const handleProgressUpdate = (update: number | { current: number; total: number; status?: string }) => {
      const progress = typeof update === 'number' ? update : calculateIndexingProgress(update)
      if (typeof update !== 'number') setIndexingStatus(update.status || '')
      setIndexingProgress(Math.min(1, Math.max(0, progress)))
    }
    return window.ipcRenderer.receive('indexing-progress', handleProgressUpdate)
  }, [isElectronRuntime])

  useEffect(() => {
    if (!isElectronRuntime) {
      setUserHasConfiguredSettingsForIndexing(false)
      return
    }
    const root = window.document.documentElement
    root.classList.add('dark')
  }, [isElectronRuntime])

  useEffect(() => {
    if (!isElectronRuntime) return
    const initialisePosthog = async () => {
      try {
        if (await window.electronStore.getAnalyticsMode()) {
          const posthogKey = (typeof process !== 'undefined' && process.env ? process.env.VITE_POSTHOG_KEY : '') || ''
          posthog.init(posthogKey, {
            api_host: 'https://us.i.posthog.com',
            autocapture: false,
          })
          posthog.register({
            reorAppVersion: await window.electronUtils.getReorAppVersion(),
          })
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : String(error))
      }
    }
    initialisePosthog().catch((error) => toast.error(error instanceof Error ? error.message : String(error)))
  }, [isElectronRuntime])

  useEffect(() => {
    if (!isElectronRuntime) return
    const handleIndexingError = (error: string) => {
      toast.error(error, {
        className: 'mt-5',
        autoClose: false,
        closeOnClick: false,
        draggable: false,
      })
      setIndexingStatus('')
      setIndexingProgress(1)
    }
    return window.ipcRenderer.receive('error-to-display-in-window', handleIndexingError)
  }, [isElectronRuntime])

  useEffect(() => {
    if (!isElectronRuntime) {
      setUserHasConfiguredSettingsForIndexing(false)
      return
    }
    const fetchSettings = async () => {
      try {
        const [initialDirectory, defaultEmbedFunc] = await Promise.all([
          window.electronStore.getVaultDirectoryForWindow(),
          window.electronStore.getDefaultEmbeddingModel(),
        ])
        const configuedInitialSettings = !!(initialDirectory && defaultEmbedFunc)
        setUserHasConfiguredSettingsForIndexing(configuedInitialSettings)

        if (initialDirectory && defaultEmbedFunc) {
          await window.database.indexFilesInDirectory()
        }
      } catch (error) {
        setUserHasConfiguredSettingsForIndexing(false)
        toast.error(error instanceof Error ? error.message : String(error))
      }
    }

    fetchSettings().catch((error) => toast.error(error instanceof Error ? error.message : String(error)))
  }, [isElectronRuntime])

  // Switch stages immediately. A nested exit/enter translate made the whole workspace appear to drift.
  useEffect(() => {
    if (userHasConfiguredSettingsForIndexing === undefined) return

    let nextStage: 'setup' | 'indexing' | 'main'
    if (!userHasConfiguredSettingsForIndexing) {
      nextStage = 'setup'
    } else if (indexingProgress < 1) {
      nextStage = 'indexing'
    } else {
      nextStage = 'main'
    }

    if (nextStage === currentStage) return

    stageAnimationRef.current?.kill()
    stageAnimationRef.current = null
    setCurrentStage(nextStage)
  }, [userHasConfiguredSettingsForIndexing, indexingProgress, currentStage])

  // Fade the new stage without translating a layout root.
  useEffect(() => {
    if (currentStage === 'loading') return undefined

    const timer = window.setTimeout(() => {
      const stage = stageContainerRef.current?.firstElementChild as HTMLElement | null
      if (!stage) return

      stageAnimationRef.current?.kill()
      stageAnimationRef.current = gsap.fromTo(
        stage,
        { autoAlpha: 0 },
        {
          autoAlpha: 1,
          duration: 0.25,
          ease: Easing.smooth,
          clearProps: 'opacity,visibility,transform',
          onComplete: () => {
            stageAnimationRef.current = null
          },
        },
      )
    }, 0)

    return () => {
      window.clearTimeout(timer)
      stageAnimationRef.current?.kill()
      stageAnimationRef.current = null
    }
  }, [currentStage])

  const handleAllInitialSettingsAreReady = () => {
    window.database.indexFilesInDirectory()
  }

  return !isElectronRuntime ? (
    <BrowserPreview />
  ) : (
    <ThemeProvider>
      <I18nProvider>
        <div className="max-h-screen font-sans">
          <Portal>
            <ToastContainer
              theme="dark"
              position="bottom-right"
              autoClose={3000}
              hideProgressBar={false}
              closeOnClick
              pauseOnHover
              toastClassName="text-xs"
            />{' '}
          </Portal>

          <Suspense fallback={<PageLoader />}>
            <div ref={stageContainerRef} data-stage-container>
              {!userHasConfiguredSettingsForIndexing && userHasConfiguredSettingsForIndexing !== undefined && (
                <InitialSetupSinglePage readyForIndexing={handleAllInitialSettingsAreReady} />
              )}
              {userHasConfiguredSettingsForIndexing && indexingProgress < 1 && (
                <IndexingProgress indexingProgress={indexingProgress} status={indexingStatus} />
              )}
              {userHasConfiguredSettingsForIndexing && indexingProgress >= 1 && <MainPageComponent />}
            </div>
          </Suspense>
        </div>
      </I18nProvider>
    </ThemeProvider>
  )
}

export default App
