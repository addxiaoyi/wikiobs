/* eslint-disable jsx-a11y/control-has-associated-label */
import React from 'react'
import { X, Maximize2, Plus } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'

interface WindowControlsProps {
  onClose: () => void
  onMaximize: () => void
  onNewChat?: () => void
}

const WindowControls = ({ onClose, onMaximize, onNewChat }: WindowControlsProps) => {
  const { t } = useTranslation()

  return (
    <div className="group absolute right-2.5 top-2.5 z-10 transition-opacity duration-75 hover:opacity-100">
      <div className="flex items-center gap-0.5 rounded-lg border border-white/5 bg-black/20 p-0.5 backdrop-blur-md">
        {onNewChat && (
          <button
            type="button"
            onClick={onNewChat}
            className="cursor-pointer rounded-md bg-transparent p-1.5 transition-all duration-75 hover:bg-white/10 hover:text-white focus-visible:bg-white/10 focus-visible:ring-1 focus-visible:ring-white/40"
            title={t('chat.newChat')}
            aria-label={t('chat.newChat')}
          >
            <Plus className="size-3 text-muted-foreground hover:text-white" />
          </button>
        )}
        <button
          type="button"
          onClick={onMaximize}
          className="cursor-pointer rounded-md bg-transparent p-1.5 transition-all duration-75 hover:bg-white/10 hover:text-white focus-visible:bg-white/10 focus-visible:ring-1 focus-visible:ring-white/40"
          title={t('button.maximize')}
          aria-label={t('button.maximize')}
        >
          <Maximize2 className="size-3 text-muted-foreground hover:text-white" />
        </button>
        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer rounded-md bg-transparent p-1.5 transition-all duration-75 hover:bg-red-500/80 hover:text-white focus-visible:bg-red-500/80 focus-visible:ring-1 focus-visible:ring-red-400"
          title={t('button.close')}
          aria-label={t('button.close')}
        >
          <X className="size-3 text-muted-foreground hover:text-white" />
        </button>
      </div>
    </div>
  )
}

export default WindowControls
