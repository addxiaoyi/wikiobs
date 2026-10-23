import React from 'react'
import type { FC } from 'react'

interface Props {
  promptText: string
  onClick?: () => void
}

const PromptSuggestion: FC<Props> = ({ promptText, onClick }: Props) => (
  <button
    className="m-1 flex min-h-[72px] max-w-[200px] cursor-pointer flex-col justify-between rounded-xl border border-border bg-card p-3 text-left text-xs text-foreground shadow-sm backdrop-blur-md transition-all duration-75 hover:border-[#7b68ee]/50 hover:bg-[#7b68ee]/10 hover:scale-[1.02] active:scale-[0.98]"
    onClick={onClick}
    type="button"
  >
    <span className="line-clamp-3 leading-relaxed">{promptText}</span>
  </button>
)

export default PromptSuggestion
