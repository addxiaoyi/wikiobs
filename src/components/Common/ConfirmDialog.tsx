import React from 'react'
import { Trash2, HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import ReorModal from './Modal'

export interface ConfirmDialogProps {
  isOpen: boolean
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  isDestructive?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title = '确认操作',
  message,
  confirmText = '确定',
  cancelText = '取消',
  isDestructive = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null

  return (
    <ReorModal isOpen={isOpen} onClose={onCancel}>
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3.5">
          <div
            className={`flex size-10 shrink-0 items-center justify-center rounded-xl border ${
              isDestructive
                ? 'border-red-500/30 bg-red-500/10 text-red-400 shadow-sm shadow-red-500/10'
                : 'border-[#7b68ee]/30 bg-[#7b68ee]/10 text-[#7b68ee] shadow-sm shadow-[#7b68ee]/10'
            }`}
          >
            {isDestructive ? <Trash2 size={18} strokeWidth={2} /> : <HelpCircle size={18} strokeWidth={2} />}
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <h3 className="text-sm font-semibold text-foreground tracking-tight">{title}</h3>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">{message}</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border">
          <Button variant="secondary" onClick={onCancel} className="text-xs">
            {cancelText}
          </Button>
          <Button
            variant={isDestructive ? 'destructive' : 'accent'}
            onClick={onConfirm}
            className="text-xs font-medium"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </ReorModal>
  )
}

export default ConfirmDialog
