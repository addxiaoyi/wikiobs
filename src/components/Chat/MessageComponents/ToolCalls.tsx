import { CoreToolMessage, ToolCallPart } from 'ai'
import React, { useState } from 'react'
import { FileInfoWithContent } from 'electron/main/filesystem/types'
import { ChevronDown, ChevronUp, Wrench, CheckCircle2, Terminal } from 'lucide-react'
import { Chat } from '../../../lib/llm/types'
import ChatSources from './ChatSources'
import { findToolResultMatchingToolCall } from '../../../lib/llm/chat'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import MarkdownRenderer from '@/components/Common/MarkdownRenderer'

interface ToolCallComponentProps {
  toolCallPart: ToolCallPart
  currentChat: Chat
  executeToolCall: (toolCall: ToolCallPart) => Promise<void>
}

interface ToolRendererProps {
  toolCallPart: ToolCallPart
  existingToolResult: CoreToolMessage | undefined
  executeToolCall: (toolCall: ToolCallPart) => Promise<void>
}

const SearchToolRenderer: React.FC<ToolRendererProps> = ({ existingToolResult }) => {
  const parseResult = (): FileInfoWithContent[] | null => {
    if (!existingToolResult || !existingToolResult.content[0].result) return null

    try {
      const result = existingToolResult.content[0].result as FileInfoWithContent[]
      if (!Array.isArray(result)) throw new Error('Result is not an array')
      return result
    } catch {
      return null
    }
  }

  const parsedResult = parseResult()

  if (!existingToolResult) return null

  return (
    <div className="my-1.5 w-full">
      {parsedResult ? (
        <ChatSources contextItems={parsedResult} />
      ) : (
        <div className="rounded-lg border border-border/60 bg-muted/30 p-2.5 font-mono text-xs text-muted-foreground">
          <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-foreground/80">
            <Terminal size={12} className="text-[#7b68ee]" />
            <span>执行结果</span>
          </div>
          <pre className="overflow-x-auto text-[11px] leading-relaxed">
            <code>{JSON.stringify(existingToolResult.content[0].result, null, 2)}</code>
          </pre>
        </div>
      )}
    </div>
  )
}

const DefaultToolRenderer: React.FC<ToolRendererProps> = ({ toolCallPart, existingToolResult, executeToolCall }) => {
  const [isOpen, setIsOpen] = useState(false)

  const renderValue = (value: unknown): string => {
    if (typeof value === 'string') {
      return value
    }
    return JSON.stringify(value, null, 2)
  }

  const isCompleted = !!existingToolResult

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="my-1.5 w-full rounded-lg border border-border/70 bg-card/60 shadow-sm backdrop-blur-sm transition-all"
    >
      <div className="flex items-center justify-between px-3 py-1.5">
        <div className="flex items-center gap-2">
          {isCompleted ? (
            <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
          ) : (
            <Wrench size={13} className="text-[#7b68ee] shrink-0" />
          )}
          <span className="font-mono text-xs font-medium text-foreground">
            工具调用: <span className="text-[#7b68ee]">{toolCallPart.toolName}</span>
          </span>
          <span className="rounded bg-secondary/80 px-1.5 py-0.2 font-mono text-[10px] text-muted-foreground">
            {isCompleted ? '已完成' : '待执行'}
          </span>
        </div>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="size-6 p-0 text-muted-foreground hover:text-foreground">
            {isOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </Button>
        </CollapsibleTrigger>
      </div>

      <CollapsibleContent>
        <div className="border-t border-border/50 bg-muted/20 px-3 py-2 text-xs">
          <div className="mb-1 text-[11px] font-medium text-muted-foreground">参数 (Arguments):</div>
          <div className="space-y-1">
            {Object.entries(toolCallPart.args as Record<string, unknown>).map(([key, value]) => (
              <div key={key} className="rounded bg-background/50 p-1.5 text-xs">
                <span className="font-mono font-medium text-[#7b68ee]">{key}:</span>{' '}
                <span className="text-foreground/90">{renderValue(value)}</span>
              </div>
            ))}
          </div>

          {existingToolResult && (
            <div className="mt-2.5 border-t border-border/40 pt-2">
              <div className="mb-1 text-[11px] font-medium text-muted-foreground">输出结果 (Result):</div>
              <div className="rounded bg-background/60 p-2 font-mono text-[11px] text-foreground/90 overflow-x-auto max-h-48">
                <MarkdownRenderer content={renderValue(existingToolResult.content[0].result)} />
              </div>
            </div>
          )}

          {!existingToolResult && (
            <div className="mt-2 pt-2 border-t border-border/40">
              <Button
                onClick={() => executeToolCall(toolCallPart)}
                size="sm"
                className="h-7 w-full bg-[#7b68ee] text-xs text-white hover:bg-[#6c5ce7]"
              >
                执行工具
              </Button>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

export const ToolCallComponent: React.FC<ToolCallComponentProps> = ({ toolCallPart, currentChat, executeToolCall }) => {
  const existingToolResult = findToolResultMatchingToolCall(toolCallPart.toolCallId, currentChat.messages)

  return (
    <>
      {toolCallPart.toolName === 'search' && (
        <SearchToolRenderer
          toolCallPart={toolCallPart}
          existingToolResult={existingToolResult}
          executeToolCall={executeToolCall}
        />
      )}
      {toolCallPart.toolName !== 'search' && (
        <DefaultToolRenderer
          toolCallPart={toolCallPart}
          existingToolResult={existingToolResult}
          executeToolCall={executeToolCall}
        />
      )}
    </>
  )
}

export default ToolCallComponent
