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
    <div className="group absolute right-2.5 top-2.5 z-10 opacity-0 transition-opacity duration-200 hover:opacity-100 focus-within:opacity-100">
      <div className="flex items-center gap-0.5 rounded-lg border border-white/10 bg-[#12141c]/85 p-0.5 shadow-xl backdrop-blur-xl">
        {onNewChat && (
          <button
            type="button"
            onClick={onNewChat}
            className="cursor-pointer rounded-md bg-transparent p-1.5 transition-all duration-75 hover:bg-accent hover:text-foreground focus-visible:bg-accent focus-visible:ring-1 focus-visible:ring-ring"
            title={t('chat.newChat')}
            aria-label={t('chat.newChat')}
          >
            <Plus className="size-3 text-muted-foreground hover:text-foreground" />
          </button>
        )}
        <button
          type="button"
          onClick={onMaximize}
          className="cursor-pointer rounded-md bg-transparent p-1.5 transition-all duration-75 hover:bg-accent hover:text-foreground focus-visible:bg-accent focus-visible:ring-1 focus-visible:ring-ring"
          title={t('button.maximize')}
          aria-label={t('button.maximize')}
        >
          <Maximize2 className="size-3 text-muted-foreground hover:text-foreground" />
        </button>
        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer rounded-md bg-transparent p-1.5 transition-all duration-75 hover:bg-destructive hover:text-destructive-foreground focus-visible:bg-destructive focus-visible:ring-1 focus-visible:ring-destructive"
          title={t('button.close')}
          aria-label={t('button.close')}
        >
          <X className="size-3 text-muted-foreground hover:text-destructive-foreground" />
        </button>
      </div>
    </div>
  )
}

export default WindowControls
