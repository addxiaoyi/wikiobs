import React, { useState, useEffect } from 'react'
import { ProgressResponse } from 'ollama'
import posthog from 'posthog-js'
import { toast } from 'react-toastify'
import { Download, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import ReorModal from '@/components/Common/Modal'
import errorToStringRendererProcess from '@/lib/error'
import { useTranslation } from '@/lib/i18n'
import downloadPercentage from './utils'

interface NewOllamaModelModalProps {
  isOpen: boolean
  onClose: () => void
}

interface ModelDownloadStatus {
  progress: ProgressResponse
  error?: string
}

const NewOllamaModelModal: React.FC<NewOllamaModelModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation()
  const [modelNameBeingInputted, setModelNameBeingInputted] = useState('')
  const [modelNameerror, setModelNameError] = useState('')
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState<{
    [modelName: string]: ModelDownloadStatus
  }>({})

  const resetForm = () => {
    setModelNameBeingInputted('')
    setModelNameError('')
    setDownloadProgress({})
  }

  const handleClose = () => {
    if (isDownloading) return
    resetForm()
    onClose()
  }

  const downloadSelectedModel = async () => {
    if (!modelNameBeingInputted.trim()) {
      setModelNameError(t('llm.enterModelName'))
      return
    }
    setModelNameError('')
    let taggedModelName = modelNameBeingInputted.trim()
    if (!taggedModelName.includes(':')) {
      taggedModelName = `${taggedModelName}:latest`
    }
    setIsDownloading(true)
    try {
      posthog.capture('download_new_llm', {
        modelName: taggedModelName,
      })
      await window.llm.pullOllamaModel(taggedModelName)
      await window.llm.setDefaultLLM(taggedModelName)
      toast.success(t('llm.downloadComplete', { name: taggedModelName }))
    } catch (e) {
      const errorMessage = errorToStringRendererProcess(e)
      setDownloadProgress((prevProgress) => ({
        ...prevProgress,
        [taggedModelName]: {
          ...prevProgress[taggedModelName],
          error: errorMessage,
        },
      }))
    } finally {
      setIsDownloading(false)
    }
  }

  useEffect(() => {
    const updateStream = (modelName: string, progress: ProgressResponse) => {
      setDownloadProgress((prevProgress) => ({
        ...prevProgress,
        [modelName]: {
          ...prevProgress[modelName],
          progress,
        },
      }))
    }

    const removeOllamaDownloadProgressListener = window.ipcRenderer.receive('ollamaDownloadProgress', updateStream)

    return () => {
      removeOllamaDownloadProgressListener()
    }
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      downloadSelectedModel()
    } else if (e.key === 'Escape') {
      handleClose()
    }
  }

  return (
    <ReorModal isOpen={isOpen} onClose={handleClose} className="max-w-[460px] p-5">
      {/* Header */}
      <div className="flex items-start gap-3 pb-3 border-b border-border">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-[#7b68ee]/30 bg-[#7b68ee]/15 text-[#7b68ee] shadow-sm shadow-[#7b68ee]/20">
          <Download size={18} strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1 pr-6">
          <h2 className="text-sm font-semibold text-foreground tracking-tight">{t('llm.newLocalTitle')}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{t('llm.downloadDescription')}</p>
        </div>
      </div>

      <div className="pt-3.5 space-y-3">
        <div className="space-y-1">
          <label htmlFor="ollama-model-input" className="text-xs font-medium text-foreground block">
            模型名称或标签
          </label>
          <Input
            id="ollama-model-input"
            value={modelNameBeingInputted}
            onChange={(e) => {
              setModelNameBeingInputted(e.target.value)
              setModelNameError('')
            }}
            onKeyDown={handleKeyDown}
            placeholder="例如: llama3.2, qwen2.5:7b, deepseek-r1:8b"
            disabled={isDownloading}
            autoFocus
            className="h-8 text-xs font-mono"
          />
          <p className="text-[11px] text-muted-foreground leading-relaxed">{t('llm.downloadRecommendation')}</p>
          {modelNameerror && <p className="text-[11px] text-red-400">{modelNameerror}</p>}
        </div>

        {/* Download Progress Status */}
        {Object.entries(downloadProgress).map(([modelName, { progress, error }]) => (
          <div key={modelName} className="rounded-lg border border-border bg-secondary/50 p-2.5 space-y-1.5 text-xs">
            {error ? (
              <div className="flex items-center gap-1.5 text-red-600 dark:text-red-300">
                <AlertCircle size={14} className="text-red-500 shrink-0" />
                <span>
                  {modelName}: {t('llm.downloadError')} - {error}
                </span>
              </div>
            ) : progress.status === 'success' ? (
              <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>
                  {t('llm.downloadComplete', { name: modelName })} {t('llm.downloadReady')}
                </span>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-foreground">
                  <span className="font-mono">{modelName}</span>
                  <span className="font-mono text-[11px] text-muted-foreground">{downloadPercentage(progress)}</span>
                </div>
                <Progress value={undefined} className="h-1.5" />
              </div>
            )}
          </div>
        ))}

        {Object.entries(downloadProgress).length > 0 && isDownloading && (
          <p className="text-[11px] text-muted-foreground">{t('llm.closeWhileDownloading')}</p>
        )}

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
          <Button variant="secondary" size="sm" onClick={handleClose} disabled={isDownloading} className="text-xs">
            {t('button.cancel')}
          </Button>
          <Button
            variant="accent"
            size="sm"
            onClick={downloadSelectedModel}
            disabled={isDownloading || !modelNameBeingInputted.trim()}
            className="text-xs shadow-md shadow-[#7b68ee]/25 gap-1.5"
          >
            {isDownloading ? (
              <>
                <Loader2 size={12} className="animate-spin" />
                <span>下载中...</span>
              </>
            ) : (
              <>
                <Download size={13} />
                <span>{t('llm.download')}</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </ReorModal>
  )
}

export default NewOllamaModelModal
