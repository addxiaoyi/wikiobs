import React, { useState, useRef, useEffect, useCallback } from 'react'
import { toast } from 'react-toastify'
import '../../styles/chat.css'
import { Loader2, Sparkles } from 'lucide-react'
import { WikiObsLogo } from '../Common/WikiObsLogo'
import { Chat, AgentConfig, LoadingState, ReorChatMessage } from '../../lib/llm/types'
import ChatInput from './ChatInput'
import UserMessage from './MessageComponents/UserMessage'
import AssistantMessage from './MessageComponents/AssistantMessage'
import SystemMessage from './MessageComponents/SystemMessage'
import ChatSources from './MessageComponents/ChatSources'
import useLLMConfigs from '@/lib/hooks/use-llm-configs'
import useAgentConfig from '@/lib/hooks/use-agent-configs'
import { useChatContext } from '@/contexts/ChatContext'
import { useContentContext } from '@/contexts/ContentContext'
import { useTranslation } from '@/lib/i18n'

interface MessageProps {
  message: ReorChatMessage
  index: number
  currentChat: Chat
  setCurrentChat: React.Dispatch<React.SetStateAction<Chat | undefined>>
}

const Message: React.FC<MessageProps> = ({ message, index, currentChat, setCurrentChat }) => {
  return (
    <>
      {!message.hideMessage && (
        <>
          {message.role === 'user' && <UserMessage key={`user-${index}`} message={message} />}
          {message.role === 'assistant' && (
            <AssistantMessage
              key={`assistant-${index}`}
              message={message}
              setCurrentChat={setCurrentChat}
              currentChat={currentChat}
            />
          )}
          {message.role === 'system' && <SystemMessage key={`system-${index}`} message={message} />}
        </>
      )}
      {message.context && <ChatSources key={`context-${index}`} contextItems={message.context} />}
    </>
  )
}

interface ChatMessagesProps {
  currentChat: Chat | undefined
  setCurrentChat: React.Dispatch<React.SetStateAction<Chat | undefined>>
  loadingState: LoadingState
  errorMessage: string | null
  onRetry: () => void
  handleNewChatMessage: (llmName: string, userTextFieldInput?: string, agentConfig?: AgentConfig) => void
}

const ChatMessages: React.FC<ChatMessagesProps> = ({
  currentChat,
  setCurrentChat,
  handleNewChatMessage,
  loadingState,
  errorMessage,
  onRetry,
}) => {
  const { agentConfig, setAgentConfig } = useAgentConfig()
  const [userTextFieldInput, setUserTextFieldInput] = useState<string | undefined>()
  const { defaultLLM, setDefaultLLM } = useLLMConfigs()
  const [selectedLLM, setSelectedLLM] = useState<string>()
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const lastMessageRef = useRef<HTMLDivElement>(null)
  const { showEditor } = useContentContext()
  const { activePanel } = useChatContext()
  const { t } = useTranslation()

  useEffect(() => {
    setSelectedLLM(defaultLLM)
  }, [defaultLLM])

  const scrollToBottom = useCallback(() => {
    if (chatContainerRef.current) {
      const { scrollHeight, clientHeight } = chatContainerRef.current
      chatContainerRef.current.scrollTop = scrollHeight - clientHeight
    }
  }, [])

  useEffect(() => {
    if (shouldAutoScroll) {
      scrollToBottom()
    }
  }, [currentChat?.messages, loadingState, shouldAutoScroll, scrollToBottom])

  const handleScroll = () => {
    if (chatContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current
      const isScrolledToBottom = Math.abs(scrollHeight - scrollTop - clientHeight) < 1
      setShouldAutoScroll(isScrolledToBottom)
    }
  }

  const handleSubmitNewMessage = async () => {
    if (userTextFieldInput) {
      if (!selectedLLM) {
        toast.error(t('chat.selectModel'))
        return
      }
      setDefaultLLM(selectedLLM)
      handleNewChatMessage(selectedLLM, userTextFieldInput, agentConfig)
      setUserTextFieldInput('')
      setShouldAutoScroll(true)
    }
  }

  useEffect(() => {
    const observer = new MutationObserver(() => {
      if (shouldAutoScroll) {
        scrollToBottom()
      }
    })

    if (lastMessageRef.current) {
      observer.observe(lastMessageRef.current, { childList: true, subtree: true, characterData: true })
    }

    return () => observer.disconnect()
  }, [shouldAutoScroll, scrollToBottom])

  const hasMessages = currentChat && currentChat.messages && currentChat.messages.length > 0

  return (
    <div className="flex h-full flex-1 flex-col bg-background">
      <div className="grow overflow-auto" ref={chatContainerRef} onScroll={handleScroll}>
        <div className="flex flex-col items-center gap-3 p-4 min-h-full">
          {/* Empty Conversation Welcome Hero */}
          {!hasMessages && (
            <div className="my-auto flex max-w-md flex-col items-center justify-center py-12 text-center select-none">
              <div className="mb-3 flex size-12 items-center justify-center rounded-2xl border border-[#7b68ee]/30 bg-[#7b68ee]/10 shadow-lg shadow-[#7b68ee]/15 backdrop-blur-md">
                <WikiObsLogo size={24} className="drop-shadow-[0_0_8px_rgba(123,104,238,0.5)]" />
              </div>
              <h3 className="text-sm font-semibold tracking-tight text-foreground">
                WIKIOBS 本地智能助理
              </h3>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed max-w-xs">
                基于本地模型与知识图谱的隐私离线推理
              </p>

              <div className="mt-6 flex flex-col gap-2 w-full text-left">
                {[
                  '总结当前知识库的核心主题脉络',
                  '帮我检索库中关联的关键笔记',
                  '基于当前笔记提出后续拓展思考',
                ].map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => {
                      setUserTextFieldInput(prompt)
                    }}
                    className="flex items-center gap-2 rounded-lg border border-border/60 bg-card/60 px-3 py-2 text-xs text-muted-foreground shadow-sm transition-all duration-150 hover:border-[#7b68ee]/50 hover:bg-[#7b68ee]/10 hover:text-foreground active:scale-[0.99] cursor-pointer"
                  >
                    <Sparkles size={12} className="text-[#7b68ee] shrink-0" />
                    <span className="truncate">{prompt}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Active Messages List */}
          {hasMessages && (
            <div className="w-full max-w-3xl">
              {currentChat.messages.map((message, index) => (
                // eslint-disable-next-line react/no-array-index-key
                <div key={index} ref={index === currentChat.messages.length - 1 ? lastMessageRef : null}>
                  <Message message={message} index={index} currentChat={currentChat} setCurrentChat={setCurrentChat} />
                </div>
              ))}
            </div>
          )}

          {errorMessage && loadingState === 'idle' && (
            <div className="chat-error-state flex items-center justify-between gap-3 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-600 dark:text-red-300" role="alert">
              <span>{errorMessage}</span>
              <button
                type="button"
                onClick={onRetry}
                className="rounded-md border border-red-500/30 bg-red-500/20 px-2.5 py-1 text-xs font-medium text-red-600 dark:text-red-200 transition-colors hover:bg-red-500/30 active:scale-95 cursor-pointer"
              >
                {t('chat.retry')}
              </button>
            </div>
          )}

          {loadingState === 'waiting-for-first-token' && (
            <div className="my-2 flex w-full max-w-3xl items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground">
              <Loader2 size={13} className="animate-spin text-[#7b68ee]" />
              <span className="font-mono text-[11px]">{t('chat.thinking')}...</span>
            </div>
          )}
        </div>
      </div>

      <div className="w-full p-4 pt-1">
        <ChatInput
          userTextFieldInput={userTextFieldInput ?? ''}
          setUserTextFieldInput={setUserTextFieldInput}
          handleSubmitNewMessage={handleSubmitNewMessage}
          loadingState={loadingState}
          selectedLLM={selectedLLM}
          setSelectedLLM={setSelectedLLM}
          agentConfig={agentConfig}
          setAgentConfig={setAgentConfig}
        />
      </div>
    </div>
  )
}

export default ChatMessages
