import React, { lazy, Suspense, useEffect, useState, useRef } from 'react'

import { Portal } from '@headlessui/react'
import { ToastContainer, toast } from 'react-toastify'
import gsap from 'gsap'

import 'react-toastify/dist/ReactToastify.css'
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles'
import { appMuiTheme } from '@/theme/appMuiTheme'
import IndexingProgress from './components/Common/IndexingProgress'
import { ThemeProvider, useThemeManager } from './contexts/ThemeContext'
import { I18nProvider } from './lib/i18n'
import { Easing } from '@/lib/gsap-animations'
import ErrorBoundary from './components/Common/ErrorBoundary'
import { WikiObsLogo } from './components/Common/WikiObsLogo'
import ReactBitsShowcase from './components/Showcase/ReactBitsShowcase'

const MainPageComponent = lazy(() => import('./components/MainPage'))
const InitialSetupSinglePage = lazy(() => import('./components/Settings/InitialSettingsSinglePage'))

const PageLoader = () => (
  <div className="flex h-screen w-full flex-col items-center justify-center bg-[var(--surface-0)] text-[var(--ink)] select-none font-sans">
    <div className="flex flex-col items-center gap-3.5" role="status" aria-live="polite">
      <WikiObsLogo size={36} className="animate-pulse" />
      <span className="text-xs font-medium text-muted-foreground tracking-wider">正在加载 WikiOBS 工作区…</span>
    </div>
  </div>
)

const ThemedToasts = () => {
  const { state } = useThemeManager()
  return (
    <ToastContainer
      theme={state}
      position="bottom-right"
      autoClose={3000}
      hideProgressBar={false}
      closeOnClick
      pauseOnHover
      toastClassName="text-xs"
    />
  )
}

const BrowserPreview = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'components'>('overview')

  return (
    <div className="flex min-h-screen bg-[var(--surface-0)] text-[var(--ink)] font-sans selection:bg-brand/30">
      <aside className="hidden w-64 border-r border-[var(--line)] bg-[var(--surface-1)] p-5 md:block">
        <div className="mb-8 flex items-center gap-2 text-sm font-semibold tracking-wide text-foreground">
          <WikiObsLogo size={20} />
          <span className="text-foreground">WIKIOBS</span>
        </div>
        <div className="space-y-1.5 text-xs text-muted-foreground">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`w-full text-left rounded-lg px-3 py-2 font-medium transition-colors ${
              activeTab === 'overview'
                ? 'bg-brand/15 text-foreground border border-brand/30'
                : 'hover:text-foreground hover:bg-[var(--surface-2)]'
            }`}
          >
            笔记与工作区
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('components')}
            className={`w-full text-left rounded-lg px-3 py-2 font-medium transition-colors ${
              activeTab === 'components'
                ? 'bg-brand/15 text-foreground border border-brand/30'
                : 'hover:text-foreground hover:bg-[var(--surface-2)]'
            }`}
          >
            React Bits 组件展厅
          </button>
        </div>
      </aside>
      <main className="flex min-w-0 flex-1 flex-col bg-[var(--surface-0)] overflow-y-auto">
        <header className="flex h-12 items-center justify-between border-b border-[var(--line)] px-5 bg-[var(--surface-1)] sticky top-0 z-10">
          <span className="text-xs text-muted-foreground">本地知识库工作区 · 纯净离线版</span>
          <span className="rounded-full border border-[var(--line)] bg-[var(--surface-2)] px-3 py-1 text-[11px] text-muted-foreground">
            {activeTab === 'components' ? 'React Bits Showcase' : '桌面预览环境'}
          </span>
        </header>

        {activeTab === 'components' ? (
          <div className="p-8 max-w-5xl mx-auto w-full">
            <ReactBitsShowcase />
          </div>
        ) : (
          <section className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center px-6 py-16">
            <div className="mb-4 inline-flex size-14 items-center justify-center rounded-2xl border border-brand/30 bg-brand/10 text-brand">
              <WikiObsLogo size={32} />
            </div>
            <h1 className="max-w-2xl text-2xl font-bold tracking-tight text-foreground md:text-4xl">
              <span className="text-foreground">WIKIOBS 本地知识库工作区</span>
            </h1>
            <p className="mt-3 max-w-xl text-xs leading-relaxed text-muted-foreground sm:text-sm">
              检测到您正在外部浏览器中访问开发端口。WIKIOBS 为纯本地 Electron 桌面知识库应用，请双击项目根目录下的{' '}
              <code className="rounded bg-[var(--surface-3)] px-1.5 py-0.5 font-mono text-xs text-brand">launch.bat</code>{' '}
              启动完整的桌面端体验。
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                { title: '双向链接关联', desc: '原生支持 [[WikiLinks]] 双向链接' },
                { title: '动态力导向图谱', desc: '基于关系网的局部与全局图谱视图' },
                { title: '本地向量模型', desc: '本地离线隐私保障，零数据上传' },
              ].map((feature) => (
                <div
                  className="rounded-xl border border-[var(--line)] bg-[var(--surface-1)] p-4"
                  key={feature.title}
                >
                  <div className="text-xs font-semibold text-foreground">{feature.title}</div>
                  <div className="mt-1.5 text-[11px] text-muted-foreground leading-normal">{feature.desc}</div>
                </div>
              ))}
            </div>

            <div className="mt-10">
              <ReactBitsShowcase />
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

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
    }
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
          setIndexingProgress(1)
          window.database.indexFilesInDirectory().catch(() => undefined)
        }
      } catch (error) {
        setUserHasConfiguredSettingsForIndexing(false)
        toast.error(error instanceof Error ? error.message : String(error))
      }
    }

    fetchSettings().catch((error) => toast.error(error instanceof Error ? error.message : String(error)))
  }, [isElectronRuntime])

  useEffect(() => {
    if (userHasConfiguredSettingsForIndexing === undefined) return
    setCurrentStage(userHasConfiguredSettingsForIndexing ? 'main' : 'setup')
  }, [userHasConfiguredSettingsForIndexing])

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
    setUserHasConfiguredSettingsForIndexing(true)
    setCurrentStage('main')
    setIndexingProgress(1)
    window.database.indexFilesInDirectory().catch((err) => {
      console.warn('Indexing error:', err)
    })
  }

  return !isElectronRuntime ? (
    <BrowserPreview />
  ) : (
    <ErrorBoundary>
      <ThemeProvider>
        <I18nProvider>
          <MuiThemeProvider theme={appMuiTheme}>
            <div className="max-h-screen font-sans">
              <Portal>
                <ThemedToasts />{' '}
              </Portal>

              <Suspense fallback={<PageLoader />}>
                <div ref={stageContainerRef} data-stage-container>
                  {userHasConfiguredSettingsForIndexing === undefined && <PageLoader />}
                  {!userHasConfiguredSettingsForIndexing && userHasConfiguredSettingsForIndexing !== undefined && (
                    <InitialSetupSinglePage readyForIndexing={handleAllInitialSettingsAreReady} />
                  )}
                  {userHasConfiguredSettingsForIndexing && <MainPageComponent />}
                </div>
              </Suspense>
            </div>
          </MuiThemeProvider>
        </I18nProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}

export default App
