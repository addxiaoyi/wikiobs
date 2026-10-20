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
    <div className="group absolute right-2 top-2 z-10 transition-opacity hover:opacity-100">
      <div className="flex">
        {onNewChat && (
          <button
            type="button"
            onClick={onNewChat}
            className="cursor-pointer rounded bg-transparent p-1.5 transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:ring-2 focus-visible:ring-primary"
            title={t('chat.newChat')}
            aria-label={t('chat.newChat')}
          >
            <Plus className="size-3 text-neutral-400 hover:text-neutral-300" />
          </button>
        )}
        <button
          type="button"
          onClick={onMaximize}
          className="cursor-pointer rounded bg-transparent p-1.5 transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:ring-2 focus-visible:ring-primary"
          title={t('button.maximize')}
          aria-label={t('button.maximize')}
        >
          <Maximize2 className="size-3 text-neutral-400 hover:text-neutral-300" />
        </button>
        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer rounded bg-transparent p-1.5 transition-colors hover:bg-destructive/80 focus-visible:bg-destructive/80 focus-visible:ring-2 focus-visible:ring-destructive"
          title={t('button.close')}
          aria-label={t('button.close')}
        >
          <X className="size-3 text-neutral-400 hover:text-neutral-300" />
        </button>
      </div>
    </div>
  )
}

export default WindowControls
