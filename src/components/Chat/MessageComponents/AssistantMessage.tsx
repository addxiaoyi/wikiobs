import React, { useCallback, useMemo, useState } from 'react'
import { Copy, Check, PenLine } from 'lucide-react'
import { toast } from 'react-toastify'
import { ToolCallPart } from 'ai'
import { Chat, ReorChatMessage } from '../../../lib/llm/types'
import { extractMessagePartsFromAssistantMessage, findToolResultMatchingToolCall } from '../../../lib/llm/chat'
import { ToolCallComponent } from './ToolCalls'
import { useContentContext } from '@/contexts/ContentContext'
import { useChatContext } from '@/contexts/ChatContext'
import { useTranslation } from '@/lib/i18n'
import MarkdownRenderer from '@/components/Common/MarkdownRenderer'
import { makeAndAddToolResultToMessages } from '../../../lib/llm/tools/utils'

interface AssistantMessageProps {
  message: ReorChatMessage
  setCurrentChat: React.Dispatch<React.SetStateAction<Chat | undefined>>
  currentChat: Chat
}

const AssistantMessage: React.FC<AssistantMessageProps> = ({ message, setCurrentChat, currentChat }) => {
  if (message.role !== 'assistant') {
    throw new Error('Message is not an assistant message')
  }
  const { openContent } = useContentContext()
  const { saveChat } = useChatContext()
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)

  const { textParts, toolCalls } = useMemo(() => {
    return extractMessagePartsFromAssistantMessage(message)
  }, [message])

  const copyToClipboard = () => {
    const content = typeof message.content === 'string' ? message.content : JSON.stringify(message.content, null, 2)
    navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success(t('chat.copied'))
  }

  const createNewNoteFromMessage = async () => {
    const content = typeof message.content === 'string' ? message.content : JSON.stringify(message.content, null, 2)
    const title = `${content.substring(0, 20)}...`
    openContent(title, content)
  }

  const executeToolCall = useCallback(
    async (toolCallPart: ToolCallPart) => {
      const existingToolResult = findToolResultMatchingToolCall(toolCallPart.toolCallId, currentChat.messages)
      if (existingToolResult) {
        toast.error(t('chat.toolCallExists'))
        return
      }

      const updatedMessages = await makeAndAddToolResultToMessages(currentChat.messages, toolCallPart, message)

      setCurrentChat((prevChat) => {
        if (!prevChat) return prevChat
        const updatedChat = {
          ...prevChat,
          messages: updatedMessages,
        }
        saveChat(updatedChat)
        return updatedChat
      })
    },
    [currentChat, setCurrentChat, saveChat, message, t],
  )

  const renderContent = () => {
    return (
      <>
        {textParts.map((text, index) => (
          <div key={`text-part-${index}`} className="mb-2">
            <div className="prose prose-sm dark:prose-invert max-w-none text-foreground leading-relaxed">
              <MarkdownRenderer content={text} />
            </div>
            <div className="mt-2 flex items-center gap-1.5 opacity-60 transition-opacity hover:opacity-100 select-none">
              <button
                type="button"
                onClick={copyToClipboard}
                className="flex cursor-pointer items-center gap-1 rounded-md border border-border/50 bg-secondary/30 px-2 py-0.5 text-[11px] text-muted-foreground transition-all duration-150 hover:border-border hover:bg-secondary hover:text-foreground active:scale-95"
                title={t('chat.copy')}
              >
                {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                <span>{copied ? '已复制' : '复制'}</span>
              </button>
              <button
                type="button"
                onClick={createNewNoteFromMessage}
                className="flex cursor-pointer items-center gap-1 rounded-md border border-border/50 bg-secondary/30 px-2 py-0.5 text-[11px] text-muted-foreground transition-all duration-150 hover:border-border hover:bg-secondary hover:text-foreground active:scale-95"
                title={t('files.newNote')}
              >
                <PenLine size={12} />
                <span>转为笔记</span>
              </button>
            </div>
          </div>
        ))}
        {toolCalls.map((toolCall) => (
          <ToolCallComponent
            key={toolCall.toolCallId}
            toolCallPart={toolCall}
            currentChat={currentChat}
            executeToolCall={executeToolCall}
          />
        ))}
      </>
    )
  }

  return (
    <div className="mb-5 flex w-full flex-col items-start gap-1">
      <div className="w-full text-left leading-relaxed text-foreground">{renderContent()}</div>
    </div>
  )
}

export default AssistantMessage
