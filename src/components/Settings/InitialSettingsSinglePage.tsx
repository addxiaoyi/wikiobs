import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Folder, Sparkles, Bot, CheckCircle2, ArrowRight, FolderPlus, Settings2, FolderCheck } from 'lucide-react'
import { toast } from 'react-toastify'
import gsap from 'gsap'

import { Button } from '@/components/ui/button'
import { WikiObsLogo } from '@/components/Common/WikiObsLogo'
import { Easing } from '@/lib/gsap-animations'
import errorToStringRendererProcess from '@/lib/error'
import { truncateName } from '@/components/Chat/MessageComponents/ChatSources'
import { EmbeddingModelConfig } from 'electron/main/electron-store/storeConfig'
import EmbeddingModelSelect from './EmbeddingSettings/EmbeddingModelSelect'
import NewRemoteEmbeddingModelModal from './EmbeddingSettings/modals/NewRemoteEmbeddingModel'
import useLLMConfigs from '@/lib/hooks/use-llm-configs'
import LLMSettingsContent from './LLMSettings/LLMSettingsContent'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import ShinyText from '@/components/ui/ShinyText'

interface InitialSetupSinglePageProps {
  readyForIndexing: () => void
  onClose?: () => void
}

const DEFAULT_RECOMMENDED_MODEL = 'Xenova/bge-small-en-v1.5'

export const InitialSetupSinglePage: React.FC<InitialSetupSinglePageProps> = ({
  readyForIndexing,
}) => {
  const [vaultDirectory, setVaultDirectory] = useState<string>('')
  const [selectedModel, setSelectedModel] = useState<string>('')
  const [embeddingModels, setEmbeddingModels] = useState<Record<string, EmbeddingModelConfig>>({})
  const [showCustomEmbeddingModal, setShowCustomEmbeddingModal] = useState<boolean>(false)
  const [showLLMModal, setShowLLMModal] = useState<boolean>(false)
  const [isInitializing, setIsInitializing] = useState<boolean>(true)
  const [isEntering, setIsEntering] = useState<boolean>(false)

  const { llmConfigs, fetchAndUpdateModelConfigs } = useLLMConfigs()
  const containerRef = useRef<HTMLDivElement>(null)

  // 1. Fetch initial vault directory and embedding models
  const refreshSettings = useCallback(async () => {
    try {
      const [savedDir, savedModel, storedModels] = await Promise.all([
        window.electronStore.getVaultDirectoryForWindow(),
        window.electronStore.getDefaultEmbeddingModel(),
        window.electronStore.getEmbeddingModels(),
      ])

      if (savedDir) {
        setVaultDirectory(savedDir)
      }

      if (storedModels && Object.keys(storedModels).length > 0) {
        setEmbeddingModels(storedModels)
      }

      const modelToUse = savedModel || DEFAULT_RECOMMENDED_MODEL
      setSelectedModel(modelToUse)

      if (!savedModel) {
        await window.electronStore.setDefaultEmbeddingModel(DEFAULT_RECOMMENDED_MODEL)
      }
    } catch (err) {
      console.error('Failed to load initial settings:', err)
    } finally {
      setIsInitializing(false)
    }
  }, [])

  useEffect(() => {
    refreshSettings()
  }, [refreshSettings])

  // 2. Directory selection via native dialog
  const handleSelectDirectory = async () => {
    try {
      const paths = await window.fileSystem.openDirectoryDialog()
      if (paths && paths[0]) {
        const dir = paths[0]
        await window.electronStore.setVaultDirectoryForWindow(dir)
        setVaultDirectory(dir)
      }
    } catch (error) {
      toast.error(errorToStringRendererProcess(error))
    }
  }

  // 2.1 One-click default directory helper
  const handleUseDefaultDirectory = async () => {
    try {
      const defaultPath = await window.electronUtils.getDefaultVaultPath()
      await window.electronStore.setVaultDirectoryForWindow(defaultPath)
      setVaultDirectory(defaultPath)
      toast.success('已设置默认笔记存储目录')
    } catch (error) {
      toast.error(errorToStringRendererProcess(error))
    }
  }

  // 3. Embedding model selection
  const handleModelChange = async (newModel: string) => {
    try {
      await window.electronStore.setDefaultEmbeddingModel(newModel)
      setSelectedModel(newModel)
    } catch (error) {
      toast.error(errorToStringRendererProcess(error))
    }
  }

  // 4. GSAP entrance animation
  useEffect(() => {
    if (!containerRef.current || isInitializing) return

    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.onboarding-hero > *',
        { opacity: 0, y: -12 },
        { opacity: 1, y: 0, duration: 0.4, stagger: 0.06, ease: Easing.smooth },
      )
      gsap.fromTo(
        '.onboarding-card',
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.4, stagger: 0.08, delay: 0.1, ease: Easing.smooth },
      )
      gsap.fromTo(
        '.onboarding-cta',
        { opacity: 0, scale: 0.96 },
        { opacity: 1, scale: 1, duration: 0.35, delay: 0.3, ease: Easing.snappy },
      )
    }, containerRef)

    return () => ctx.revert()
  }, [isInitializing])

  const canProceed = Boolean(vaultDirectory && selectedModel)

  const handleStart = async () => {
    if (!vaultDirectory) {
      toast.warn('请先选择或设置笔记存储目录')
      return
    }
    setIsEntering(true)
    readyForIndexing()
  }

  const isLLMConfigured = llmConfigs.length > 0

  return (
    <div
      ref={containerRef}
      className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-y-auto bg-background text-foreground px-4 py-10 select-none font-sans"
    >
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/3 w-[700px] h-[450px] rounded-full bg-[#7b68ee]/10 blur-[130px]" />
      </div>

      <div className="relative z-10 w-full max-w-lg mx-auto flex flex-col items-center">
        {/* Brand Header */}
        <div className="onboarding-hero flex flex-col items-center text-center mb-6">
          <div className="relative mb-3 flex items-center justify-center">
            <WikiObsLogo size={42} className="drop-shadow-[0_0_16px_rgba(123,104,238,0.5)]" />
          </div>

          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold tracking-wider text-foreground/80 font-mono">WIKIOBS</span>
            <span className="text-[10px] text-muted-foreground/75 px-1.5 py-0.5 rounded bg-muted/60 border border-border/50">
              Helstera 旗下产品
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            <ShinyText
              text="欢迎使用 WIKIOBS"
              color="currentColor"
              shineColor="#7b68ee"
              speed={2.8}
              shineWidth={45}
              softness={0.75}
            />
          </h1>
          <p className="mt-1.5 text-xs text-muted-foreground max-w-sm leading-relaxed">
            本地 Markdown 知识库工作区 · 数据完全保存在本地设备
          </p>
        </div>

        {/* Setup Cards */}
        <div className="w-full space-y-3 mb-6">
          {/* Card 1: Vault Directory */}
          <div className="onboarding-card rounded-xl border border-border/70 bg-card/70 backdrop-blur-md p-4 transition-colors hover:border-border">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#7b68ee]/15 text-[#7b68ee] border border-[#7b68ee]/30">
                  <Folder size={17} strokeWidth={2} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-foreground">笔记存储目录</span>
                    {vaultDirectory ? (
                      <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 size={11} />
                        <span>已就绪</span>
                      </span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-muted text-muted-foreground border border-border/60">
                        待选择
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    所有 Markdown 笔记存储的本地文件夹
                  </p>
                  {vaultDirectory && (
                    <div className="mt-2 flex items-center gap-1.5 rounded border border-border/60 bg-muted/40 px-2 py-0.5 text-[11px] font-mono text-muted-foreground truncate max-w-full">
                      <FolderCheck size={11} className="shrink-0 text-[#7b68ee]" />
                      <span className="truncate" title={vaultDirectory}>
                        {truncateName(vaultDirectory, 36)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                {!vaultDirectory && (
                  <button
                    type="button"
                    onClick={handleUseDefaultDirectory}
                    className="text-[11px] text-muted-foreground hover:text-foreground underline decoration-border transition-colors cursor-pointer"
                  >
                    使用默认目录
                  </button>
                )}
                <Button
                  variant={vaultDirectory ? 'secondary' : 'default'}
                  onClick={handleSelectDirectory}
                  className={`h-8 px-3 text-xs font-medium cursor-pointer transition-all ${
                    !vaultDirectory
                      ? 'bg-[#7b68ee] text-white hover:bg-[#6c58dc]'
                      : 'hover:border-[#7b68ee]/40'
                  }`}
                >
                  <FolderPlus size={13} className="mr-1.5" />
                  <span>{vaultDirectory ? '更换' : '选择目录'}</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Card 2: Embedding Model */}
          <div className="onboarding-card rounded-xl border border-border/70 bg-card/70 backdrop-blur-md p-4 transition-colors hover:border-border">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#7b68ee]/15 text-[#7b68ee] border border-[#7b68ee]/30">
                  <Sparkles size={17} strokeWidth={2} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-foreground">向量嵌入模型</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-muted text-muted-foreground border border-border/60">
                      本地运行
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    用于文档索引与双向链接关联，无需网络或 API Key
                  </p>
                  <div className="mt-1">
                    <button
                      type="button"
                      onClick={() => setShowCustomEmbeddingModal(true)}
                      className="text-[10px] text-muted-foreground hover:text-foreground underline decoration-border transition-colors cursor-pointer"
                    >
                      + 自定义模型
                    </button>
                  </div>
                </div>
              </div>

              <div className="shrink-0 self-end sm:self-center">
                <EmbeddingModelSelect
                  selectedModel={selectedModel}
                  embeddingModels={embeddingModels}
                  onModelChange={handleModelChange}
                />
              </div>
            </div>
          </div>

          {/* Card 3: LLM Model (Optional) */}
          <div className="onboarding-card rounded-xl border border-border/70 bg-card/70 backdrop-blur-md p-4 transition-colors hover:border-border">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#7b68ee]/15 text-[#7b68ee] border border-[#7b68ee]/30">
                  <Bot size={17} strokeWidth={2} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-foreground">AI 对话模型</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-muted text-muted-foreground border border-border/60">
                      可选
                    </span>
                    {isLLMConfigured && (
                      <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 size={11} />
                        <span>已配置</span>
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    支持 Ollama 或外部 API，可随时在设置中配置
                  </p>
                </div>
              </div>

              <div className="shrink-0 self-end sm:self-center">
                <Button
                  variant="secondary"
                  onClick={() => setShowLLMModal(true)}
                  className="h-8 px-3 text-xs font-medium cursor-pointer"
                >
                  <Settings2 size={12} className="mr-1.5" />
                  <span>{isLLMConfigured ? '管理' : '配置'}</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="onboarding-cta w-full flex flex-col items-center gap-2.5">
          <Button
            size="lg"
            disabled={!canProceed || isEntering}
            onClick={handleStart}
            className={`h-10 w-full rounded-lg text-xs font-medium tracking-wide transition-all ${
              canProceed
                ? 'bg-[#7b68ee] hover:bg-[#6c58dc] text-white shadow-sm cursor-pointer'
                : 'bg-muted text-muted-foreground cursor-not-allowed opacity-60'
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              <span>{isEntering ? '正在载入工作区…' : '进入工作区'}</span>
              <ArrowRight size={14} />
            </span>
          </Button>

          <p className="text-[11px] text-muted-foreground text-center">
            {!vaultDirectory
              ? '请先选择笔记目录以进入工作区'
              : '目录已就绪，点击上方按钮即可进入工作区'}
          </p>
        </div>
      </div>

      {/* Modals */}
      <NewRemoteEmbeddingModelModal
        isOpen={showCustomEmbeddingModal}
        onClose={() => {
          setShowCustomEmbeddingModal(false)
          refreshSettings()
        }}
        handleUserHasChangedModel={refreshSettings}
      />

      <Dialog
        open={showLLMModal}
        onOpenChange={(open) => {
          setShowLLMModal(open)
          if (!open) {
            fetchAndUpdateModelConfigs().catch(() => undefined)
          }
        }}
      >
        <DialogContent
          aria-describedby={undefined}
          className="p-6 border border-border bg-popover text-popover-foreground shadow-xl backdrop-blur-xl rounded-xl max-w-xl max-h-[85vh] overflow-y-auto custom-scrollbar"
        >
          <DialogTitle className="text-sm font-semibold mb-2">配置 AI 对话模型</DialogTitle>
          <LLMSettingsContent />
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default InitialSetupSinglePage
