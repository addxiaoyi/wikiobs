import React from 'react'
import { FileInfoWithContent } from 'electron/main/filesystem/types'
import { DBEntry } from 'electron/main/vector-database/schema'
import { FileText, Sparkles, ExternalLink } from 'lucide-react'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'
import { useContentContext } from '@/contexts/ContentContext'
import { useTranslation } from '@/lib/i18n'

interface ChatSourcesProps {
  contextItems: FileInfoWithContent[] | DBEntry[]
}

export const truncateName = (name: string, maxLength = 26): string => {
  if (name.length <= maxLength) return name
  return `${name.slice(0, maxLength - 3)}...`
}

const cleanSnippet = (content?: string, maxLength = 220): string => {
  if (!content) return ''
  return content
    .replace(/^#+\s+/gm, '') // remove markdown headings
    .replace(/\[\[(.*?)\]\]/g, '$1') // unwrap wikilinks
    .replace(/[*_~`]/g, '') // remove markdown marks
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength)
}

const ChatSources: React.FC<ChatSourcesProps> = ({ contextItems }) => {
  const { openContent } = useContentContext()
  const { t } = useTranslation()

  const isDBEntry = (item: FileInfoWithContent | DBEntry): item is DBEntry => {
    return 'notepath' in item
  }

  const getItemName = (item: FileInfoWithContent | DBEntry): string => {
    if (isDBEntry(item)) {
      return item.notepath.replace(/\\/g, '/').split('/').pop() || ''
    }
    return item.name
  }

  const getItemPath = (item: FileInfoWithContent | DBEntry): string => {
    return isDBEntry(item) ? item.notepath : item.path
  }

  const getItemContent = (item: FileInfoWithContent | DBEntry): string => {
    return item.content || ''
  }

  const handleOpenContent = (path: string) => {
    openContent(path)
  }

  if (contextItems.length === 0) {
    return null
  }

  return (
    <div className="my-2.5 flex flex-col gap-1.5 select-none" data-testid="chat-sources-container">
      {/* Refined Obsidian Source Header */}
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground/80">
        <FileText size={12} className="text-muted-foreground shrink-0" />
        <span>{t('chat.sources')}</span>
        <span className="rounded-full bg-secondary px-1.5 py-0.2 font-mono text-[10px] text-muted-foreground">
          {contextItems.length}
        </span>
      </div>

      {/* Obsidian-grade Reference Pills (Flex Wrap - No horizontal scrollbar) */}
      <div className="flex flex-wrap items-center gap-1.5">
        <TooltipProvider delayDuration={150}>
          {contextItems.map((contextItem) => {
            const name = getItemName(contextItem)
            const path = getItemPath(contextItem)
            const content = getItemContent(contextItem)
            const snippet = cleanSnippet(content)

            return (
              <Tooltip key={path}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => handleOpenContent(path)}
                    className="group inline-flex h-6.5 max-w-[220px] cursor-pointer items-center gap-1.5 rounded-md border border-border/70 bg-secondary/40 px-2 py-0.5 text-xs text-muted-foreground shadow-xs transition-all duration-150 hover:border-foreground/30 hover:bg-secondary hover:text-foreground active:scale-[0.98]"
                    aria-label={`打开来源文件: ${name}`}
                  >
                    <FileText
                      size={12}
                      className="shrink-0 text-muted-foreground/70 transition-colors group-hover:text-foreground"
                    />
                    <span className="truncate font-mono text-[11px] font-medium tracking-tight">
                      {truncateName(name, 22)}
                    </span>
                    <ExternalLink
                      size={10}
                      className="shrink-0 text-muted-foreground/40 opacity-0 transition-opacity group-hover:opacity-100"
                    />
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  align="start"
                  className="max-w-sm rounded-lg border border-border bg-popover/95 p-2.5 text-xs shadow-xl backdrop-blur-md"
                >
                  <div className="mb-1 flex items-center gap-1.5 font-semibold text-foreground">
                    <FileText size={12} className="shrink-0 text-muted-foreground" />
                    <span className="truncate font-mono text-xs">{name}</span>
                  </div>
                  {snippet && (
                    <p className="line-clamp-4 font-sans text-[11px] leading-relaxed text-muted-foreground whitespace-pre-wrap">
                      {snippet}
                    </p>
                  )}
                  <div className="mt-2 flex items-center justify-between border-t border-border/50 pt-1.5 text-[10px] text-muted-foreground/80">
                    <span>在工作区编辑器中打开</span>
                    <span className="font-mono text-foreground/80">点击跳转 ↗</span>
                  </div>
                </TooltipContent>
              </Tooltip>
            )
          })}
        </TooltipProvider>
      </div>
    </div>
  )
}

export default ChatSources
