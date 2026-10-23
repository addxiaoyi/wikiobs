import React from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import { ReorChatMessage } from '../../../lib/llm/types'
import { getDisplayMessage } from '../../../lib/llm/chat'

interface UserMessageProps {
  message: ReorChatMessage
}

const UserMessage: React.FC<UserMessageProps> = ({ message }) => {
  const displayMessage: string | undefined = getDisplayMessage(message)

  return (
    <div className="mb-4 flex w-full justify-end select-text">
      <div className="max-w-[85%] sm:max-w-[78%] rounded-2xl rounded-tr-xs border border-border/70 bg-secondary/70 dark:bg-zinc-800/60 px-3.5 py-2 text-xs leading-relaxed text-foreground shadow-xs">
        <ReactMarkdown rehypePlugins={[rehypeRaw]} className="break-words">
          {displayMessage}
        </ReactMarkdown>
      </div>
    </div>
  )
}

export default UserMessage
