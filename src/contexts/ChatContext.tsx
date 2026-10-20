import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { toast } from 'react-toastify'
import { SidebarAbleToShow } from '@/components/Sidebars/MainSidebar'
import { Chat, ChatMetadata } from '@/lib/llm/types'
import errorToStringRendererProcess from '@/lib/error'

interface ChatContextType {
  currentChat: Chat | undefined
  setCurrentChat: React.Dispatch<React.SetStateAction<Chat | undefined>>
  sidebarShowing: SidebarAbleToShow | null
  setSidebarShowing: (option: SidebarAbleToShow | null) => void
  activePanel: 'chat' | 'similarFiles' | null
  setActivePanel: React.Dispatch<React.SetStateAction<'chat' | 'similarFiles' | null>>
  allChatsMetadata: ChatMetadata[]
  deleteChat: (chatID: string | undefined) => Promise<void>
  saveChat: (updatedChat: Chat) => Promise<void>
  openNewChat: (chatID?: string) => Promise<void>
}

const ChatContext = createContext<ChatContextType | undefined>(undefined)

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentChat, setCurrentChat] = useState<Chat | undefined>(undefined)
  const [sidebarShowing, setSidebarShowing] = useState<SidebarAbleToShow | null>('files')
  const [activePanel, setActivePanel] = useState<'chat' | 'similarFiles' | null>(null)
  const [allChatsMetadata, setAllChatsMetadata] = useState<ChatMetadata[]>([])

  useEffect(() => {
    const fetchChatHistories = async () => {
      try {
        const allChatsMetadataResponse = await window.electronStore.getAllChatsMetadata()
        setAllChatsMetadata(allChatsMetadataResponse)
      } catch (error) {
        toast.error(errorToStringRendererProcess(error))
      }
    }
    fetchChatHistories()
  }, [])

  const saveChat = useCallback(async (updatedChat: Chat) => {
    try {
      await window.electronStore.saveChat(updatedChat)
      const retrievedChatsMetadata = await window.electronStore.getAllChatsMetadata()
      setAllChatsMetadata(retrievedChatsMetadata)
    } catch (error) {
      toast.error(errorToStringRendererProcess(error))
    }
  }, [])

  const deleteChat = useCallback(async (chatID: string | undefined) => {
    if (!chatID) return
    try {
      await window.electronStore.deleteChat(chatID)
      const retrievedChatsMetadata = await window.electronStore.getAllChatsMetadata()
      setAllChatsMetadata(retrievedChatsMetadata)
      setCurrentChat(undefined)
    } catch (error) {
      toast.error(errorToStringRendererProcess(error))
    }
  }, [])

  const currentChatRef = React.useRef<Chat | undefined>(currentChat)
  useEffect(() => {
    currentChatRef.current = currentChat
  }, [currentChat])

  const openNewChat = useCallback(
    async (chatID?: string) => {
      try {
        const previousChat = currentChatRef.current
        if (previousChat && previousChat.id !== chatID) {
          await saveChat(previousChat)
        }
        const chat = await window.electronStore.getChat(chatID)
        setCurrentChat(chat)
        setActivePanel((prev) => (prev === 'chat' ? null : 'chat'))
        if (window.innerWidth <= 640) {
          // The history sidebar is an overlay on mobile and would block the chat composer/retry action.
          setSidebarShowing(null)
        }
      } catch (error) {
        toast.error(errorToStringRendererProcess(error))
      }
    },
    [saveChat],
  )

  const value = React.useMemo(
    () => ({
      currentChat,
      setCurrentChat,
      allChatsMetadata,
      sidebarShowing,
      setSidebarShowing,
      activePanel,
      setActivePanel,
      deleteChat,
      saveChat,
      openNewChat,
    }),
    [
      currentChat,
      setCurrentChat,
      allChatsMetadata,
      sidebarShowing,
      setSidebarShowing,
      activePanel,
      setActivePanel,
      deleteChat,
      saveChat,
      openNewChat,
    ],
  )

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}

export const useChatContext = () => {
  const context = useContext(ChatContext)
  if (context === undefined) {
    throw new Error('useChatContext must be used within a ChatProvider')
  }
  return context
}
