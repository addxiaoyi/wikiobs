import React, { useCallback, useEffect, useState, useRef } from 'react'

import { streamText } from 'ai'
import { toast } from 'react-toastify'
import gsap from 'gsap'
import {
  appendStringContentToMessages,
  appendToOrCreateChat,
  removeUncalledToolsFromMessages,
} from '../../lib/llm/chat'

import '../../styles/chat.css'
import ChatMessages from './ChatMessages'
import { Chat, AgentConfig, LoadingState } from '../../lib/llm/types'
import { useChatContext } from '@/contexts/ChatContext'
import { useTranslation } from '@/lib/i18n'
import resolveLLMClient from '@/lib/llm/client'
import { appendToolCallsAndAutoExecuteTools, convertToolConfigToZodSchema } from '../../lib/llm/tools/utils'
import { Easing } from '@/lib/gsap-animations'
import errorToStringRendererProcess from '@/lib/error'

const ChatComponent: React.FC = () => {
  const [loadingState, setLoadingState] = useState<LoadingState>('idle')
  const containerRef = useRef<HTMLDivElement>(null)
  const { currentChat, setCurrentChat, saveChat } = useChatContext()
  const { t } = useTranslation()
  const abortControllerRef = useRef<AbortController | null>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const retryRequestRef = useRef<{
    chat: Chat | undefined
    llmName: string
    text?: string
    agentConfig?: AgentConfig
  } | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    abortControllerRef.current?.abort()
    setLoadingState('idle')
  }, [currentChat?.id])

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [])

  // GSAP: 聊天容器入场
  useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    const ctx = gsap.context(() => {
      const inner = container.children[0] as HTMLElement
      if (inner) {
        gsap.fromTo(
          inner,
          { autoAlpha: 0 },
          {
            autoAlpha: 1,
            duration: 0.35,
            ease: Easing.smooth,
            clearProps: 'opacity,visibility,transform',
            overwrite: 'auto',
          },
        )
      }
    }, container)

    return () => ctx.revert()
  }, [])

  // GSAP: 当消息列表变化时，为最新消息添加动画
  useEffect(() => {
    if (!messagesContainerRef.current || !currentChat?.messages?.length) return

    const container = messagesContainerRef.current
    const ctx = gsap.context(() => {
      const messages = container.querySelectorAll('.chat-message-wrapper')
      if (messages.length) {
        const lastMessage = messages[messages.length - 1] as HTMLElement
        if (lastMessage) {
          gsap.fromTo(
            lastMessage,
            { autoAlpha: 0 },
            {
              autoAlpha: 1,
              duration: 0.3,
              ease: Easing.smooth,
              clearProps: 'opacity,visibility,transform',
              overwrite: 'auto',
            },
          )
        }
      }
    }, container)

    return () => ctx.revert()
  }, [currentChat?.messages?.length])

  const handleNewChatMessage = useCallback(
    async (chat: Chat | undefined, llmName: string, userTextFieldInput?: string, agentConfig?: AgentConfig) => {
      let outputChat
      retryRequestRef.current = { chat, llmName, text: userTextFieldInput, agentConfig }
      setErrorMessage(null)
      try {
        if (!userTextFieldInput?.trim() && (!chat || chat.messages.length === 0)) {
          return
        }

        outputChat = userTextFieldInput?.trim()
          ? await appendToOrCreateChat(chat, userTextFieldInput, agentConfig)
          : chat

        if (!outputChat) {
          return
        }

        setCurrentChat(outputChat)
        await saveChat(outputChat)

        const llmClient = await resolveLLMClient(llmName)
        abortControllerRef.current = new AbortController()
        const toolsZodSchema = Object.assign({}, ...outputChat.toolDefinitions.map(convertToolConfigToZodSchema))
        setLoadingState('waiting-for-first-token')
        const { textStream, toolCalls } = await streamText({
          model: llmClient,
          messages: removeUncalledToolsFromMessages(outputChat.messages),
          tools: toolsZodSchema,
          abortSignal: abortControllerRef.current.signal,
        })

        for await (const text of textStream) {
          if (abortControllerRef.current.signal.aborted) {
            return
          }

          outputChat = {
            ...outputChat,
            messages: appendStringContentToMessages(outputChat.messages || [], text),
          }
          setCurrentChat(outputChat)
          setLoadingState('generating')
        }

        if (!abortControllerRef.current.signal.aborted) {
          if (agentConfig) {
            window.electronStore.setAgentConfig(agentConfig)
          }
          const { messages: outputMessages, allToolCallsHaveBeenExecuted } = await appendToolCallsAndAutoExecuteTools(
            outputChat.messages,
            outputChat.toolDefinitions,
            await toolCalls,
          )
          outputChat.messages = outputMessages
          setCurrentChat(outputChat)
          await saveChat(outputChat)
          if (allToolCallsHaveBeenExecuted) {
            handleNewChatMessage(outputChat, llmName, undefined, agentConfig)
          }
        }

        setLoadingState('idle')
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return
        if (error instanceof Error && error.name === 'AI_APICallError' && error.message.includes('Bad Request')) {
          if (agentConfig && agentConfig?.toolDefinitions.length > 0 && outputChat) {
            toast.info(
              <div>
                {t('chat.toolCallPrefix')}
                <a href="https://ollama.com/search?c=tools" target="_blank" rel="noopener noreferrer">
                  https://ollama.com/search?c=tools
                </a>
                {t('chat.toolCallSuffix')}
              </div>,
              {
                autoClose: false,
                closeOnClick: false,
              },
            )
            const agentWithoutTools = { ...agentConfig, toolDefinitions: [] }
            outputChat.toolDefinitions = []
            handleNewChatMessage(outputChat, llmName, undefined, agentWithoutTools)
            return
          }
        }
        setLoadingState('idle')
        // Format user-friendly error guidance while keeping retry functional
        let displayError = errorToStringRendererProcess(error)
        if (error instanceof Error && error.name === 'AI_APICallError') {
          if (error.message.includes('Not Found') || (error as any).statusCode === 404) {
            displayError = `AI 模型调用失败 (404 Not Found)：未找到模型 "${llmName}" 或 Ollama 接口路径不正确。请确认本地 Ollama 已下载该模型（终端执行: ollama pull ${llmName}），或在设置中检查配置。`
          } else if (error.message.includes('Failed to fetch') || error.message.includes('fetch failed')) {
            displayError = '无法连接到本地 Ollama 服务：请确保 Ollama 正在后台运行（默认服务端口 11434）。'
          }
        }
        setErrorMessage(displayError)
      } finally {
        abortControllerRef.current = null
      }
    },
    [saveChat, setCurrentChat, t],
  )

  const retryLastRequest = () => {
    const request = retryRequestRef.current
    if (!request) return
    handleNewChatMessage(request.chat, request.llmName, request.text, request.agentConfig)
  }

  return (
    <div ref={containerRef} className="flex size-full items-center justify-center">
      <div ref={messagesContainerRef} className="mx-auto flex size-full flex-col overflow-hidden">
        <ChatMessages
          currentChat={currentChat}
          setCurrentChat={setCurrentChat}
          loadingState={loadingState}
          errorMessage={errorMessage}
          onRetry={retryLastRequest}
          handleNewChatMessage={(llmName: string, userTextFieldInput?: string, agentConfig?: AgentConfig) =>
            handleNewChatMessage(currentChat, llmName, userTextFieldInput, agentConfig)
          }
        />
      </div>
    </div>
  )
}

export default ChatComponent
