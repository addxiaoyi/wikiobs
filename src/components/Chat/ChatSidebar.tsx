import React, { useState, useEffect, useRef } from 'react'
import { MessageSquare, Plus, ChevronDown, Trash2, PanelLeftClose } from 'lucide-react'
import { YStack, XStack, SizableText } from 'tamagui'
import gsap from 'gsap'
import { useChatContext } from '@/contexts/ChatContext'
import { useContentContext } from '@/contexts/ContentContext'
import { useTranslation } from '@/lib/i18n'
import { ChatMetadata } from '../../lib/llm/types'
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu'
import { staggerFadeInUp } from '@/lib/gsap-animations'
import ConfirmDialog from '../Common/ConfirmDialog'

export interface ChatItemProps {
  chatMetadata: ChatMetadata
  onRequestDelete: (chat: ChatMetadata) => void
}

export const ChatItem: React.FC<ChatItemProps> = ({ chatMetadata, onRequestDelete }) => {
  const { currentChat } = useChatContext()
  const { openContent } = useContentContext()
  const { t } = useTranslation()

  const isSelected = chatMetadata.id === currentChat?.id
  const itemClasses = `group relative flex items-center justify-between cursor-pointer py-1.5 px-2.5 rounded-md font-sans text-xs transition-all duration-75 ${
    isSelected
      ? 'font-medium bg-[#7b68ee]/15 text-[#7b68ee] dark:text-[#a29bfe] border-l-2 border-[#7b68ee] shadow-sm'
      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
  }`

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <div
          role="button"
          tabIndex={0}
          aria-current={isSelected ? 'page' : undefined}
          aria-label={chatMetadata.displayName}
          onKeyDown={(event: React.KeyboardEvent<HTMLDivElement>) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              openContent(chatMetadata.id)
            }
          }}
          className={itemClasses}
          onClick={() => openContent(chatMetadata.id)}
        >
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <MessageSquare size={13} className={`shrink-0 ${isSelected ? 'text-[#7b68ee]' : 'text-muted-foreground'}`} />
            <span className="truncate text-xs font-medium">
              {chatMetadata.displayName}
            </span>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onRequestDelete(chatMetadata)
            }}
            className="flex size-5 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-red-400 group-hover:opacity-100"
            title={t('chat.deleteChat')}
            aria-label={t('chat.deleteChat')}
          >
            <Trash2 size={12} />
          </button>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={() => onRequestDelete(chatMetadata)} className="flex items-center gap-2 text-red-400">
          <Trash2 size={13} className="text-red-400" />
          <span>{t('chat.deleteChat')}</span>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}

export const ChatSidebar: React.FC = () => {
  const [isRecentsOpen, setIsRecentsOpen] = useState(true)
  const [chatToDelete, setChatToDelete] = useState<ChatMetadata | null>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const { allChatsMetadata, openNewChat, deleteChat, setSidebarShowing } = useChatContext()
  const { t } = useTranslation()

  const toggleRecents = () => setIsRecentsOpen((prev) => !prev)

  // GSAP: 聊天列表错位入场
  useEffect(() => {
    if (!listRef.current || !isRecentsOpen) return

    const list = listRef.current
    const ctx = gsap.context(() => {
      const items = list.querySelectorAll('.chat-list-item')
      if (items.length > 0) {
        staggerFadeInUp(items, 0.3, 0.03, 0.05)
      }
    }, list)

    return () => ctx.revert()
  }, [allChatsMetadata, isRecentsOpen])

  return (
    <YStack className="file-sidebar-surface flex h-full flex-col overflow-y-auto px-2.5 pb-4 pt-2.5 select-none">
      <div className="flex h-full flex-col gap-2">
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          {/* Header Action & New Chat Button */}
          <div className="flex items-center justify-between pb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t('sidebar.chatHistory')}
            </span>
            <button
              className="flex size-6 cursor-pointer items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              title="收起侧栏"
              aria-label="收起侧栏"
              onClick={() => setSidebarShowing(null)}
              type="button"
            >
              <PanelLeftClose size={13} strokeWidth={1.8} />
            </button>
          </div>

          <button
            aria-label={t('chat.startNew')}
            className="chat-new-button flex cursor-pointer items-center justify-center gap-2 rounded-md 
                    bg-[#7b68ee] hover:bg-[#6c5ce7] py-2 text-white shadow-sm
                    transition-all duration-75 active:scale-[0.99]
                    focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40"
            type="button"
            onClick={() => openNewChat(undefined)}
          >
            <Plus size={15} strokeWidth={2.2} />
            <span className="text-xs font-semibold tracking-wide">{t('chat.startNew')}</span>
          </button>

          <div className="flex-1 overflow-y-auto no-scrollbar">
            <button
              type="button"
              className="flex w-full cursor-pointer items-center justify-between border-0 bg-transparent py-1.5 text-left text-muted-foreground hover:text-foreground transition-colors"
              onClick={toggleRecents}
              aria-expanded={isRecentsOpen}
              aria-controls="chat-recents-list"
            >
              <span className="text-xs font-medium tracking-wide">{t('chat.recents')}</span>
              <ChevronDown
                size={14}
                className={`transition-transform duration-150 ${isRecentsOpen ? 'rotate-0' : '-rotate-90'}`}
                aria-hidden="true"
              />
            </button>
            {isRecentsOpen &&
              (allChatsMetadata.length === 0 ? (
                <div
                  id="chat-recents-list"
                  role="status"
                  className="mt-3 rounded-md border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground"
                >
                  {t('chat.emptyHistory')}
                </div>
              ) : (
                <ul id="chat-recents-list" ref={listRef} className="m-0 flex list-none flex-col gap-0.5 p-0 mt-1">
                  {allChatsMetadata
                    .slice()
                    .sort((a, b) => Number(b.timeOfLastMessage) - Number(a.timeOfLastMessage))
                    .map((chatMetadata) => (
                      <li key={chatMetadata.id} className="chat-list-item">
                        <ChatItem chatMetadata={chatMetadata} onRequestDelete={setChatToDelete} />
                      </li>
                    ))}
                </ul>
              ))}
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={Boolean(chatToDelete)}
        title={t('chat.deleteChat')}
        message={chatToDelete ? t('chat.deleteConfirm', { name: chatToDelete.displayName }) : ''}
        confirmText={t('button.delete')}
        cancelText={t('button.cancel')}
        isDestructive
        onConfirm={() => {
          if (!chatToDelete) return
          const chatId = chatToDelete.id
          setChatToDelete(null)
          deleteChat(chatId)
        }}
        onCancel={() => setChatToDelete(null)}
      />
    </YStack>
  )
}
