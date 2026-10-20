import React, { useState, useEffect } from 'react'
import { ProgressResponse } from 'ollama'
import posthog from 'posthog-js'
import { toast } from 'react-toastify'
import { Input } from 'tamagui'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogPortal,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogOverlay,
} from '@/components/ui/dialog'
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
    if (!modelNameBeingInputted) {
      setModelNameError(t('llm.enterModelName'))
      return
    }
    setModelNameError('')
    let taggedModelName = modelNameBeingInputted
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogPortal>
        <DialogOverlay>
          <DialogContent
            className="flex max-h-[calc(100dvh-16px)] flex-col overflow-hidden p-4 sm:max-w-[525px]"
            style={{ overflow: 'hidden' }}
          >
            <DialogHeader className="shrink-0">
              <DialogTitle>{t('llm.newLocalTitle')}</DialogTitle>
              <DialogDescription>{t('llm.downloadDescription')} </DialogDescription>
            </DialogHeader>
            <div className="min-h-0 flex-1 overflow-y-auto py-4">
              <Input
                value={modelNameBeingInputted}
                onChangeText={(value) => {
                  setModelNameBeingInputted(value)
                  setModelNameError('')
                }}
                placeholder="llama3.2"
                size="$1"
                py="$3"
                px="$2"
              />
              <p className="text-xs italic text-muted-foreground">{t('llm.downloadRecommendation')}</p>
              {modelNameerror && <p className="text-xs text-destructive">{modelNameerror}</p>}
              {Object.entries(downloadProgress).map(([modelName, { progress, error }]) => (
                <div key={modelName}>
                  {(() => {
                    if (error) {
                      return (
                        <p className="text-sm text-destructive">{`${modelName}: ${t('llm.downloadError')} - ${error}`}</p>
                      )
                    }
                    if (progress.status === 'success') {
                      return (
                        <p className="text-sm text-muted-foreground">
                          {`${t('llm.downloadComplete', { name: modelName })} ${t('llm.downloadReady')}`}
                        </p>
                      )
                    }
                    return (
                      <p className="text-sm text-muted-foreground">
                        {`${modelName}: ${t('llm.downloadProgress')} - ${downloadPercentage(progress)}`}
                      </p>
                    )
                  })()}
                </div>
              ))}
              {Object.entries(downloadProgress).length > 0 && (
                <p className="text-xs text-muted-foreground">{t('llm.closeWhileDownloading')}</p>
              )}
            </div>
            <DialogFooter className="shrink-0 border-t border-border pt-3">
              <Button variant="secondary" onClick={downloadSelectedModel} disabled={isDownloading}>
                {t('llm.download')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </DialogOverlay>
      </DialogPortal>
    </Dialog>
  )
}

export default NewOllamaModelModal
