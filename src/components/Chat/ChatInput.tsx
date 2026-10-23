import React from 'react'
import { ArrowUp, Sparkles } from 'lucide-react'
import { AgentConfig, LoadingState } from '../../lib/llm/types'
import { Button } from '../ui/button'
import LLMSelectOrButton from '../Settings/LLMSettings/LLMSelectOrButton'
import { useTranslation } from '@/lib/i18n'

interface ChatInputProps {
  userTextFieldInput: string
  setUserTextFieldInput: (value: string) => void
  handleSubmitNewMessage: () => void
  loadingState: LoadingState
  selectedLLM: string | undefined
  setSelectedLLM: (value: string | undefined) => void
  agentConfig: AgentConfig | undefined
  setAgentConfig: React.Dispatch<React.SetStateAction<AgentConfig | undefined>>
}

const ChatInput: React.FC<ChatInputProps> = ({
  userTextFieldInput,
  setUserTextFieldInput,
  handleSubmitNewMessage,
  loadingState,
  selectedLLM,
  setSelectedLLM,
  agentConfig,
  setAgentConfig,
}) => {
  const { t } = useTranslation()
  const isComposingRef = React.useRef(false)

  const handleDbSearchToggle = (checked: boolean) => {
    setAgentConfig((prevConfig) => {
      if (!prevConfig) throw new Error('Agent config must be initialized before setting db search filters')
      return {
        ...prevConfig,
        dbSearchFilters: checked
          ? {
              limit: 22,
              minDate: undefined,
              maxDate: undefined,
              passFullNoteIntoContext: true,
            }
          : undefined,
      }
    })
  }

  return (
    <div className="flex w-full">
      <div className="z-50 flex w-full flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm backdrop-blur-md transition-all duration-75 focus-within:border-foreground/30 focus-within:ring-1 focus-within:ring-foreground/10">
        <textarea
          value={userTextFieldInput}
          onCompositionStart={() => {
            isComposingRef.current = true
          }}
          onCompositionEnd={() => {
            isComposingRef.current = false
          }}
          onKeyDown={(e) => {
            if (!e.shiftKey && e.key === 'Enter') {
              if (isComposingRef.current) return
              e.preventDefault()
              handleSubmitNewMessage()
            }
          }}
          placeholder={t('chat.inputPlaceholder')}
          aria-label={t('chat.inputPlaceholder')}
          onChange={(e) => setUserTextFieldInput(e.target.value)}
          autoFocus
          rows={3}
          className="w-full resize-none border-0 bg-transparent p-3.5 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-0 leading-relaxed font-sans"
        />
        <div className="mx-auto h-px w-[96%] bg-border/60" />
        <div className="flex min-h-[40px] items-center justify-between gap-2 px-3 py-1.5">
          <div className="flex items-center gap-2">
            <LLMSelectOrButton selectedLLM={selectedLLM} setSelectedLLM={setSelectedLLM} />
          </div>

          <div className="flex items-center gap-2">
            {/* Obsidian-Style RAG Knowledge Search Pill */}
            <button
              type="button"
              onClick={() => handleDbSearchToggle(!agentConfig?.dbSearchFilters)}
              aria-pressed={!!agentConfig?.dbSearchFilters}
              title={agentConfig?.dbSearchFilters ? '知识库参考检索: 已开启 (点击关闭)' : '知识库参考检索: 已关闭 (点击开启)'}
              className={`flex h-7 shrink-0 whitespace-nowrap cursor-pointer items-center gap-1.5 rounded-md border px-2 text-xs font-medium transition-all duration-150 select-none ${
                agentConfig?.dbSearchFilters
                  ? 'border-foreground/40 bg-foreground/10 text-foreground hover:bg-foreground/15 shadow-2xs'
                  : 'border-border/60 bg-secondary/30 text-muted-foreground hover:bg-secondary hover:text-foreground'
              }`}
            >
              <Sparkles
                size={12}
                className={agentConfig?.dbSearchFilters ? 'text-foreground shrink-0' : 'text-muted-foreground shrink-0'}
              />
              <span className="text-[11px] whitespace-nowrap">知识参考</span>
              <span
                className={`rounded px-1 py-0.2 font-mono text-[9px] font-semibold shrink-0 ${
                  agentConfig?.dbSearchFilters
                    ? 'bg-foreground/15 text-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {agentConfig?.dbSearchFilters ? 'ON' : 'OFF'}
              </span>
            </button>

            <Button
              className="flex size-7 items-center justify-center rounded-lg bg-foreground p-0 text-background transition-all duration-75 hover:bg-foreground/90 active:scale-[0.95] disabled:opacity-20 cursor-pointer"
              onClick={handleSubmitNewMessage}
              disabled={loadingState !== 'idle' || !userTextFieldInput.trim()}
              aria-label={t('chat.send')}
            >
              <ArrowUp className="size-4" strokeWidth={2.2} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ChatInput
