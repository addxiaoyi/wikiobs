import React, { useState, useEffect, useRef } from 'react'
import { ThemeProvider } from '@mui/material/styles'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import { IoChatbubbles } from 'react-icons/io5'
import { RiChatNewFill, RiArrowDownSLine } from 'react-icons/ri'
import { YStack, XStack, SizableText } from 'tamagui'
import gsap from 'gsap'
import { useChatContext } from '@/contexts/ChatContext'
import { useContentContext } from '@/contexts/ContentContext'
import { useTranslation } from '@/lib/i18n'
import { ChatMetadata } from '../../lib/llm/types'
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu'
import { staggerFadeInUp } from '@/lib/gsap-animations'
import { appMuiTheme } from '@/theme/appMuiTheme'

export interface ChatItemProps {
  chatMetadata: ChatMetadata
  onRequestDelete: (chat: ChatMetadata) => void
}

export const ChatItem: React.FC<ChatItemProps> = ({ chatMetadata, onRequestDelete }) => {
  const { currentChat } = useChatContext()
  const { openContent } = useContentContext()
  const { t } = useTranslation()

  const isSelected = chatMetadata.id === currentChat?.id
  const itemClasses = `
    flex items-center cursor-pointer py-1.5 px-2.5 rounded-lg font-sans text-xs
    transition-all duration-75
    ${isSelected ? 'text-white font-medium bg-white/[0.12] shadow-sm' : 'text-neutral-400 hover:text-white hover:bg-white/[0.05]'}
  `

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
        >
          <XStack
            backgroundColor={isSelected ? '$gray7' : undefined}
            gap="$2"
            alignItems="center"
            hoverStyle={{
              backgroundColor: '$gray7',
            }}
            onPress={() => openContent(chatMetadata.id)}
            className={itemClasses}
          >
            <IoChatbubbles />
            <SizableText fontSize={11} fontWeight={500} ellipse className="flex-1">
              {chatMetadata.displayName}
            </SizableText>
          </XStack>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={() => onRequestDelete(chatMetadata)}>{t('chat.deleteChat')}</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}

export const ChatSidebar: React.FC = () => {
  const [isRecentsOpen, setIsRecentsOpen] = useState(true)
  const [chatToDelete, setChatToDelete] = useState<ChatMetadata | null>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const { allChatsMetadata, openNewChat, deleteChat } = useChatContext()
  const { t } = useTranslation()

  const toggleRecents = () => setIsRecentsOpen((prev) => !prev)

  // GSAP: 聊天列表错位入场（替代 CSS animation-delay）
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
    <YStack backgroundColor="$gray3" className="flex h-full flex-col overflow-y-auto px-2 pb-4 pt-2.5">
      <div className="flex h-full flex-col gap-2">
        <div className="flex min-h-0 flex-1 flex-col gap-4">
          <div className="mb-2 flex flex-col gap-3">
            <button
              aria-label={t('chat.startNew')}
              className="chat-new-button flex cursor-pointer items-center justify-center gap-2 rounded-lg 
                      border border-white/10 bg-white/[0.08] py-2 text-white shadow-sm
                      transition-all duration-75 hover:bg-white/[0.14] hover:border-white/20 active:scale-[0.99]
                      focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40"
              type="button"
              onClick={() => openNewChat(undefined)}
            >
              <RiChatNewFill className="text-base" />
              <span className="text-xs font-semibold tracking-wide">{t('chat.startNew')}</span>
            </button>
          </div>

          <div className="flex-1">
            <button
              type="button"
              className="flex w-full cursor-pointer items-center justify-between border-0 bg-transparent p-1 text-left text-muted-foreground"
              onClick={toggleRecents}
              aria-expanded={isRecentsOpen}
              aria-controls="chat-recents-list"
            >
              <h4 className="mb-0 mt-1 text-xs font-medium tracking-wider">{t('chat.recents')}</h4>
              <RiArrowDownSLine
                className={`mt-1 transition-transform duration-200 ${!isRecentsOpen ? 'rotate-0' : 'rotate-180'}`}
                aria-hidden="true"
              />
            </button>
            {isRecentsOpen &&
              (allChatsMetadata.length === 0 ? (
                <div
                  id="chat-recents-list"
                  role="status"
                  className="mx-2 mt-4 rounded-md border border-dashed border-white/15 px-3 py-4 text-center text-xs text-muted-foreground"
                >
                  {t('chat.emptyHistory')}
                </div>
              ) : (
                <ul id="chat-recents-list" ref={listRef} className="m-0 flex list-none flex-col gap-0.5 p-0">
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

      <ThemeProvider theme={appMuiTheme}>
        <Dialog
          open={Boolean(chatToDelete)}
          onClose={() => setChatToDelete(null)}
          aria-labelledby="delete-chat-dialog-title"
          aria-describedby="delete-chat-dialog-description"
        >
          <DialogTitle id="delete-chat-dialog-title">{t('chat.deleteChat')}</DialogTitle>
          <DialogContent>
            <Typography id="delete-chat-dialog-description" variant="body2" color="text.secondary">
              {chatToDelete ? t('chat.deleteConfirm', { name: chatToDelete.displayName }) : ''}
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setChatToDelete(null)}>{t('button.cancel')}</Button>
            <Button
              color="error"
              variant="contained"
              onClick={() => {
                if (!chatToDelete) return
                const chatId = chatToDelete.id
                setChatToDelete(null)
                deleteChat(chatId)
              }}
            >
              {t('button.delete')}
            </Button>
          </DialogActions>
        </Dialog>
      </ThemeProvider>
    </YStack>
  )
}
