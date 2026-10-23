import React, { useState, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import hljs from 'highlight.js'
import { Copy, Check, ChevronDown, Terminal, BrainCircuit } from 'lucide-react'

interface MarkdownRendererProps {
  content: string
}

const CodeBlockWithCopy: React.FC<{ language?: string; code: string }> = ({ language, code }) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const highlightedHtml = useMemo(() => {
    if (language && hljs.getLanguage(language)) {
      try {
        return hljs.highlight(code, { language, ignoreIllegals: true }).value
      } catch {
        // fallback
      }
    }
    try {
      return hljs.highlightAuto(code).value
    } catch {
      return code
    }
  }, [code, language])

  return (
    <div className="my-3 overflow-hidden rounded-lg border border-border bg-card shadow-xl">
      <div className="flex h-8 items-center justify-between border-b border-border bg-secondary/50 px-3">
        <div className="flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground">
          <Terminal size={12} className="text-muted-foreground" />
          <span className="uppercase">{language || 'text'}</span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="flex cursor-pointer items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          title="复制代码"
        >
          {copied ? (
            <>
              <Check size={12} className="text-emerald-400" />
              <span className="text-emerald-400">已复制</span>
            </>
          ) : (
            <>
              <Copy size={12} />
              <span>复制</span>
            </>
          )}
        </button>
      </div>
      <div className="overflow-x-auto p-3 text-xs leading-relaxed font-mono">
        <pre className="!m-0 !border-0 !bg-transparent !p-0">
          <code
            className="!border-0 !bg-transparent !p-0 text-foreground"
            dangerouslySetInnerHTML={{ __html: highlightedHtml }}
          />
        </pre>
      </div>
    </div>
  )
}

const ThinkingSection: React.FC<{ thinking: string; isStreaming?: boolean }> = ({ thinking, isStreaming }) => {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="my-2 overflow-hidden rounded-lg border border-border bg-secondary/30">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full cursor-pointer items-center justify-between px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
      >
        <div className="flex items-center gap-2">
          <BrainCircuit size={14} className={isStreaming ? 'animate-pulse text-[#7b68ee]' : 'text-muted-foreground'} />
          <span className="font-medium text-foreground">思考过程</span>
          {isStreaming && <span className="text-[10px] text-muted-foreground">正在思考...</span>}
        </div>
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <span>{expanded ? '收起' : '展开'}</span>
          <ChevronDown size={13} className={`transition-transform duration-150 ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </button>
      {expanded && (
        <div className="border-t border-border bg-muted/40 p-3 text-xs font-mono leading-relaxed text-muted-foreground whitespace-pre-wrap">
          {thinking}
        </div>
      )}
    </div>
  )
}

function parseContentWithThink(rawContent: string): {
  thinking: string | null
  response: string
  isStreamingThink: boolean
} {
  if (!rawContent) return { thinking: null, response: '', isStreamingThink: false }

  const completeMatch = rawContent.match(/^<think>([\s\S]*?)<\/think>([\s\S]*)$/)
  if (completeMatch) {
    return {
      thinking: completeMatch[1].trim(),
      response: completeMatch[2].trim(),
      isStreamingThink: false,
    }
  }

  if (rawContent.startsWith('<think>')) {
    const withoutOpen = rawContent.slice(7)
    const closeIdx = withoutOpen.indexOf('</think>')
    if (closeIdx !== -1) {
      return {
        thinking: withoutOpen.slice(0, closeIdx).trim(),
        response: withoutOpen.slice(closeIdx + 8).trim(),
        isStreamingThink: false,
      }
    }
    return {
      thinking: withoutOpen.trim(),
      response: '',
      isStreamingThink: true,
    }
  }

  return { thinking: null, response: rawContent, isStreamingThink: false }
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  const { thinking, response, isStreamingThink } = useMemo(() => parseContentWithThink(content), [content])

  return (
    <div className="w-full">
      {thinking && <ThinkingSection thinking={thinking} isStreaming={isStreamingThink} />}
      {response && (
        <ReactMarkdown
          className="markdown-content overflow-hidden whitespace-normal break-words text-sm leading-relaxed"
          components={{
            pre({ children }) {
              return <>{children}</>
            },
            code({ className, children, ...props }) {
              const match = /language-(\w+)/.exec(className || '')
              const codeString = String(children).replace(/\n$/, '')
              const isBlock = match || String(children).includes('\n')

              if (!isBlock) {
                return (
                  <code
                    className="rounded border border-border bg-secondary/70 px-1.5 py-0.5 font-mono text-[13px] text-foreground"
                    {...props}
                  >
                    {children}
                  </code>
                )
              }

              return <CodeBlockWithCopy language={match ? match[1] : ''} code={codeString} />
            },
            blockquote({ children }) {
              return (
                <blockquote className="my-2 rounded-r border-l-2 border-[#7b68ee] bg-[#7b68ee]/[0.05] py-1 pl-3 italic text-muted-foreground">
                  {children}
                </blockquote>
              )
            },
            table({ children }) {
              return (
                <div className="my-3 overflow-x-auto rounded-lg border border-border">
                  <table className="w-full border-collapse text-xs text-foreground">{children}</table>
                </div>
              )
            },
            th({ children }) {
              return (
                <th className="border-b border-border bg-muted/50 px-3 py-2 text-left font-semibold text-foreground">
                  {children}
                </th>
              )
            },
            td({ children }) {
              return <td className="border-b border-border px-3 py-2 text-foreground">{children}</td>
            },
          }}
        >
          {response}
        </ReactMarkdown>
      )}
    </div>
  )
}

export default MarkdownRenderer
