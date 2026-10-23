import React, { useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import { ReorChatMessage } from '../../lib/llm/types'
import { convertMessageToString } from '../../lib/llm/chat'
import { useTranslation } from '@/lib/i18n'

interface ConversationHistoryProps {
  history: ReorChatMessage[]
  streamingMessage: string
  // markdownMaxHeight: string | number
  customPrompt: string
  setCustomPrompt: (value: string) => void
  handleCustomPrompt: () => void
  displayPrompt: string
  currentIndex: number
  onNavigate: (direction: 'prev' | 'next') => void
  getLLMResponse: (prompt: string) => void
  insertAfterHighlightedText: () => void
  copyToClipboard: () => void
  replaceHighlightedText: () => void
  isNewConversation: boolean
  // prompts: { option?: string; customPromptInput?: string }[]
  loadingResponse: boolean
}

const ConversationHistory: React.FC<ConversationHistoryProps> = ({
  history,
  streamingMessage,
  // markdownMaxHeight,
  customPrompt,
  setCustomPrompt,
  handleCustomPrompt,
  displayPrompt,
  currentIndex,
  onNavigate,
  getLLMResponse,
  insertAfterHighlightedText,
  copyToClipboard,
  replaceHighlightedText,
  isNewConversation,
  // prompts,
  loadingResponse,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null)
  const { t } = useTranslation()
  // const [currentPrompt, setCurrentPrompt] = useState<{ option?: string; customPromptInput?: string }>({})

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [history, streamingMessage, currentIndex])

  // useEffect(() => {
  //   setCurrentPrompt(prompts[currentIndex / 2])
  //   bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  // }, [prompts, currentIndex])

  const currentConversation = isNewConversation
    ? [history[history.length - 1]]
    : history.slice(currentIndex, currentIndex + 2)

  return (
    <div className="flex flex-col" style={{ height: '400px' }}>
      <div className="mb-2 flex justify-between">
        <button
          onClick={() => onNavigate('prev')}
          disabled={currentIndex === 0 || isNewConversation}
          className="rounded-md border border-border bg-secondary/50 px-2.5 py-1 text-xs text-foreground hover:bg-secondary disabled:opacity-40 transition-colors"
          type="button"
        >
          Previous
        </button>
        <button
          onClick={() => onNavigate('next')}
          disabled={currentIndex >= history.length - 2 || isNewConversation}
          className="rounded-md border border-border bg-secondary/50 px-2.5 py-1 text-xs text-foreground hover:bg-secondary disabled:opacity-40 transition-colors"
          type="button"
        >
          Next
        </button>
      </div>
      <div className="grow overflow-y-auto pr-2 no-scrollbar">
        {currentConversation.map(
          (message, idx) =>
            message.role === 'assistant' && (
              <div key={idx} className="mb-2 rounded-md border border-border bg-card p-3 text-xs text-foreground">
                <ReactMarkdown rehypePlugins={[rehypeRaw]} className="markdown-content break-words">
                  {convertMessageToString(message)}
                </ReactMarkdown>
              </div>
            ),
        )}
        {streamingMessage && (
          <div className="mb-2 rounded-md border border-border bg-card p-3 text-xs text-foreground">
            <ReactMarkdown rehypePlugins={[rehypeRaw]} className="markdown-content break-words">
              {streamingMessage}
            </ReactMarkdown>
          </div>
        )}
        {!streamingMessage && loadingResponse && (
          <div className="mb-2 rounded-md border border-border bg-muted/50 p-2.5 text-xs italic text-muted-foreground">{t('writing.generating')}</div>
        )}
        <div ref={bottomRef} />
      </div>
      <input
        type="text"
        value={customPrompt}
        onChange={(e) => setCustomPrompt(e.target.value)}
        placeholder="追问..."
        className="mt-2 w-full rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            handleCustomPrompt()
            setCustomPrompt('')
          }
        }}
      />
      <div className="mt-2 flex justify-between gap-1">
        <button
          className="mr-1 flex cursor-pointer items-center rounded-md border border-border bg-secondary/50 px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
          onClick={() => getLLMResponse(displayPrompt)}
          type="button"
        >
          Re-run
        </button>
        <button
          className="mr-1 flex cursor-pointer items-center rounded-md border border-border bg-secondary/50 px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
          onClick={insertAfterHighlightedText}
          type="button"
        >
          Insert
        </button>
        <button
          className="mr-1 flex cursor-pointer items-center rounded-md border border-border bg-secondary/50 px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
          onClick={copyToClipboard}
          type="button"
        >
          Copy
        </button>
        <button
          className="flex cursor-pointer items-center rounded-md bg-[#7b68ee] px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-[#6c5ce7]"
          onClick={replaceHighlightedText}
          type="button"
        >
          Replace
        </button>
      </div>
    </div>
  )
}

export default ConversationHistory
