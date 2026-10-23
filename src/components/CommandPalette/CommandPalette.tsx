import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import {
  Search,
  FileText,
  FolderPlus,
  PenLine,
  Sparkles,
  Network,
  Globe,
  Clock,
  ArrowUpDown,
  Compass,
  Puzzle,
  Moon,
  Sun,
  Settings,
  MessageSquare,
  CornerDownLeft,
  X,
  History,
  Command,
  ChevronsDownUp,
  ChevronsUpDown,
} from 'lucide-react'
import { useModalOpeners } from '@/contexts/ModalContext'
import { useFileContext } from '@/contexts/FileContext'
import { useContentContext } from '@/contexts/ContentContext'
import { useChatContext } from '@/contexts/ChatContext'
import { useThemeManager } from '@/contexts/ThemeContext'
import { useTranslation } from '@/lib/i18n'
import { removeFileExtension } from '@/lib/file'
import ShinyText from '@/components/ui/ShinyText'

interface PaletteItem {
  id: string
  title: string
  subtitle?: string
  icon: React.ReactNode
  section: 'recent' | 'notes' | 'actions'
  shortcut?: string
  onSelect: () => void
}

const highlightMatches = (text: string, query: string) => {
  const q = query.trim()
  if (!q) return <span>{text}</span>
  try {
    const regex = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    const parts = text.split(regex)
    return (
      <span>
        {parts.map((part, i) =>
          regex.test(part) ? (
            <span key={i} className="font-semibold text-foreground underline decoration-foreground/40">
              {part}
            </span>
          ) : (
            <span key={i}>{part}</span>
          ),
        )}
      </span>
    )
  } catch {
    return <span>{text}</span>
  }
}

const CommandPalette: React.FC = () => {
  const { isCommandPaletteOpen, setIsCommandPaletteOpen } = useModalOpeners()
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const { vaultFilesFlattened, navigationHistory, collapseAllDirectories, expandAllDirectories } = useFileContext()
  const { openContent, createUntitledNote } = useContentContext()
  const { openNewChat, setActivePanel, setSidebarShowing } = useChatContext()
  const { state: theme, actions: themeActions } = useThemeManager()
  const { t } = useTranslation()

  const {
    setIsNewDirectoryModalOpen,
    setIsSettingsModalOpen,
    setIsWikiImporterOpen,
    setIsAIOrganizationOpen,
    setIsObsidianCompatOpen,
    setIsScheduledTasksOpen,
    setIsVaultManagementOpen,
    setIsExportOpen,
    setIsPluginManagerOpen,
    setIsKnowledgeGraphOpen,
  } = useModalOpeners()

  const close = useCallback(() => {
    setIsCommandPaletteOpen(false)
    setQuery('')
  }, [setIsCommandPaletteOpen])

  // Focus input when opened
  useEffect(() => {
    if (isCommandPaletteOpen) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isCommandPaletteOpen])

  // All fixed action commands
  const allActions: PaletteItem[] = useMemo(
    () => [
      {
        id: 'action-new-note',
        title: t('files.newNote') || '新建笔记',
        subtitle: '创建空白 Markdown 笔记',
        icon: <PenLine size={15} strokeWidth={1.8} />,
        section: 'actions',
        shortcut: 'Ctrl+N',
        onSelect: () => {
          close()
          createUntitledNote()
        },
      },
      {
        id: 'action-new-dir',
        title: t('sidebar.newDirectory') || '新建目录',
        subtitle: '在知识库中创建新文件夹',
        icon: <FolderPlus size={15} strokeWidth={1.8} />,
        section: 'actions',
        shortcut: 'Ctrl+D',
        onSelect: () => {
          close()
          setIsNewDirectoryModalOpen(true)
        },
      },
      {
        id: 'action-chat',
        title: t('chat.newChat') || '新建 AI 对话',
        subtitle: '打开本地大模型对话窗口',
        icon: <MessageSquare size={15} strokeWidth={1.8} />,
        section: 'actions',
        shortcut: 'Ctrl+T',
        onSelect: () => {
          close()
          setActivePanel('chat')
          openNewChat()
        },
      },
      {
        id: 'action-search',
        title: t('sidebar.semanticSearch') || '语义混合检索',
        subtitle: '在知识库中执行向量语义搜索',
        icon: <Search size={15} strokeWidth={1.8} />,
        section: 'actions',
        onSelect: () => {
          close()
          setSidebarShowing('search')
        },
      },
      {
        id: 'action-graph',
        title: t('graph.title') || '知识图谱',
        subtitle: '浏览笔记之间的双向链接网络',
        icon: <Network size={15} strokeWidth={1.8} />,
        section: 'actions',
        shortcut: 'Ctrl+G',
        onSelect: () => {
          close()
          setIsKnowledgeGraphOpen(true)
        },
      },
      {
        id: 'action-wiki-import',
        title: t('wikiImporter.title') || '维基百科导入',
        subtitle: '一键将 Wikipedia 条目导入为双链笔记',
        icon: <Globe size={15} strokeWidth={1.8} />,
        section: 'actions',
        onSelect: () => {
          close()
          setIsWikiImporterOpen(true)
        },
      },
      {
        id: 'action-ai-org',
        title: t('aiOrg.title') || 'AI 智能整理',
        subtitle: '自动聚类归纳整理杂乱笔记',
        icon: <Sparkles size={15} strokeWidth={1.8} />,
        section: 'actions',
        onSelect: () => {
          close()
          setIsAIOrganizationOpen(true)
        },
      },
      {
        id: 'action-obsidian',
        title: t('obsidianCompat.title') || 'Obsidian 兼容助手',
        subtitle: '检查并迁移 Obsidian 库语法与插件',
        icon: <Compass size={15} strokeWidth={1.8} />,
        section: 'actions',
        onSelect: () => {
          close()
          setIsObsidianCompatOpen(true)
        },
      },
      {
        id: 'action-schedule',
        title: t('scheduled.title') || '定时自动化任务',
        subtitle: '管理后台自动化索引与定期整理',
        icon: <Clock size={15} strokeWidth={1.8} />,
        section: 'actions',
        onSelect: () => {
          close()
          setIsScheduledTasksOpen(true)
        },
      },
      {
        id: 'action-export',
        title: t('export.title') || '导出笔记与知识库',
        subtitle: '导出为 PDF, HTML 或 Markdown 压缩包',
        icon: <ArrowUpDown size={15} strokeWidth={1.8} />,
        section: 'actions',
        onSelect: () => {
          close()
          setIsExportOpen(true)
        },
      },
      {
        id: 'action-vaults',
        title: t('vault.manage') || '多仓库管理',
        subtitle: '切换或添加本地知识库文件夹',
        icon: <Command size={15} strokeWidth={1.8} />,
        section: 'actions',
        onSelect: () => {
          close()
          setIsVaultManagementOpen(true)
        },
      },
      {
        id: 'action-plugins',
        title: t('plugin.title') || '插件中心',
        subtitle: '浏览与安装功能扩展插件',
        icon: <Puzzle size={15} strokeWidth={1.8} />,
        section: 'actions',
        onSelect: () => {
          close()
          setIsPluginManagerOpen(true)
        },
      },
      {
        id: 'action-reactbits-showcase',
        title: 'React Bits 组件展厅',
        subtitle: '预览与交互测试 ShinyText 与 Stepper 组件',
        icon: <Sparkles size={15} strokeWidth={1.8} />,
        section: 'actions',
        onSelect: () => {
          close()
          window.dispatchEvent(new CustomEvent('wikiobs:open-reactbits-showcase'))
        },
      },
      {
        id: 'action-collapse-dirs',
        title: '折叠全部目录',
        subtitle: '收起左侧文件树所有已展开的文件夹',
        icon: <ChevronsDownUp size={15} strokeWidth={1.8} />,
        section: 'actions',
        onSelect: () => {
          close()
          collapseAllDirectories()
        },
      },
      {
        id: 'action-expand-dirs',
        title: '展开全部目录',
        subtitle: '展开左侧文件树所有文件夹',
        icon: <ChevronsUpDown size={15} strokeWidth={1.8} />,
        section: 'actions',
        onSelect: () => {
          close()
          expandAllDirectories()
        },
      },
      {
        id: 'action-theme',
        title: theme === 'dark' ? t('theme.switchToLight') || '切换至浅色模式' : t('theme.switchToDark') || '切换至深色模式',
        subtitle: '切换应用界面高对比单色主题',
        icon: theme === 'dark' ? <Sun size={15} strokeWidth={1.8} /> : <Moon size={15} strokeWidth={1.8} />,
        section: 'actions',
        onSelect: () => {
          close()
          themeActions.toggle()
        },
      },
      {
        id: 'action-settings',
        title: t('settings.title') || '应用设置',
        subtitle: '通用首选项、模型配置与密钥管理',
        icon: <Settings size={15} strokeWidth={1.8} />,
        section: 'actions',
        shortcut: 'Ctrl+,',
        onSelect: () => {
          close()
          setIsSettingsModalOpen(true)
        },
      },
    ],
    [
      t,
      theme,
      close,
      createUntitledNote,
      setIsNewDirectoryModalOpen,
      setActivePanel,
      openNewChat,
      setSidebarShowing,
      setIsKnowledgeGraphOpen,
      setIsWikiImporterOpen,
      setIsAIOrganizationOpen,
      setIsObsidianCompatOpen,
      setIsScheduledTasksOpen,
      setIsExportOpen,
      setIsVaultManagementOpen,
      setIsPluginManagerOpen,
      themeActions,
      collapseAllDirectories,
      expandAllDirectories,
      setIsSettingsModalOpen,
    ],
  )

  // Filtered items based on query
  const items: PaletteItem[] = useMemo(() => {
    const q = query.trim().toLowerCase()

    if (!q) {
      // Recent notes (up to 5)
      const recentNotes: PaletteItem[] = (navigationHistory || [])
        .map((filePath): PaletteItem | null => {
          const file = vaultFilesFlattened.find((f) => f.path === filePath)
          if (!file) return null
          return {
            id: `recent-${file.path}`,
            title: removeFileExtension(file.name),
            subtitle: file.relativePath,
            icon: <History size={15} strokeWidth={1.8} className="text-muted-foreground" />,
            section: 'recent',
            onSelect: () => {
              close()
              openContent(file.path)
            },
          }
        })
        .filter((item): item is PaletteItem => item !== null)
        .slice(0, 5)

      return [...recentNotes, ...allActions]
    }

    // Matching notes
    const matchedNotes: PaletteItem[] = vaultFilesFlattened
      .filter((file) => {
        const name = file.name.toLowerCase()
        const rel = file.relativePath.toLowerCase()
        return name.includes(q) || rel.includes(q)
      })
      .slice(0, 8)
      .map((file) => ({
        id: `note-${file.path}`,
        title: removeFileExtension(file.name),
        subtitle: file.relativePath,
        icon: <FileText size={15} strokeWidth={1.8} className="text-foreground" />,
        section: 'notes' as const,
        onSelect: () => {
          close()
          openContent(file.path)
        },
      }))

    // Matching actions
    const matchedActions: PaletteItem[] = allActions.filter((action) => {
      return action.title.toLowerCase().includes(q) || (action.subtitle && action.subtitle.toLowerCase().includes(q))
    })

    // If query does not exactly match any existing file name, prepend a "Create Note" action
    const exactMatch = vaultFilesFlattened.some((f) => removeFileExtension(f.name).toLowerCase() === q)
    const dynamicCreate: PaletteItem[] =
      !exactMatch && q.length > 0
        ? [
            {
              id: `create-note-${q}`,
              title: `新建笔记: "${query.trim()}"`,
              subtitle: '以此名称立即创建新笔记',
              icon: <PenLine size={15} strokeWidth={1.8} className="text-foreground" />,
              section: 'actions',
              shortcut: '↵ 创建',
              onSelect: async () => {
                close()
                const dir = (await window.electronStore.getVaultDirectoryForWindow()) || ''
                const filePath = await window.path.join(dir, `${query.trim()}.md`)
                await openContent(filePath, `# ${query.trim()}\n\n`)
              },
            },
          ]
        : []

    return [...dynamicCreate, ...matchedNotes, ...matchedActions]
  }, [query, vaultFilesFlattened, navigationHistory, allActions, close, openContent, createUntitledNote])

  // Reset selected index when items change
  useEffect(() => {
    setSelectedIndex(0)
  }, [items.length, query])

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return
    const activeEl = listRef.current.querySelector('[data-selected="true"]') as HTMLElement
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedIndex])

  // Global keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => (items.length > 0 ? (prev + 1) % items.length : 0))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => (items.length > 0 ? (prev - 1 + items.length) % items.length : 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (items[selectedIndex]) {
          items[selectedIndex].onSelect()
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        close()
      }
    },
    [items, selectedIndex, close],
  )

  if (!isCommandPaletteOpen) return null

  // Group items by section
  const recentItems = items.filter((i) => i.section === 'recent')
  const noteItems = items.filter((i) => i.section === 'notes')
  const actionItems = items.filter((i) => i.section === 'actions')

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center bg-black/60 pt-[14vh] backdrop-blur-md animate-in fade-in-0 duration-100"
      onClick={close}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-label="Command Palette"
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface-1)] shadow-2xl backdrop-blur-2xl ring-1 ring-[var(--line)] text-foreground"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex h-13 items-center gap-3 border-b border-[var(--line)] px-4 bg-[var(--surface-1)]">
          <Search size={16} className="shrink-0 text-[var(--ink-muted)]" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索笔记文件、路径或执行指令..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-[var(--ink-muted)] focus:outline-none"
            aria-label="搜索指令"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="flex size-5 items-center justify-center rounded text-[var(--ink-muted)] hover:text-foreground"
            >
              <X size={14} />
            </button>
          ) : (
            <kbd className="rounded border border-[var(--line)] bg-[var(--surface-2)] px-1.5 py-0.5 text-[10px] font-mono text-[var(--ink-muted)]">
              ESC
            </kbd>
          )}
        </div>

        {/* Results List */}
        <div ref={listRef} className="max-h-[380px] overflow-y-auto p-1.5 pr-2">
          {items.length === 0 ? (
            <div className="py-10 text-center text-xs text-[var(--ink-muted)]">
              未找到匹配的笔记或指令
            </div>
          ) : (
            <>
              {recentItems.length > 0 && (
                <div className="mb-2">
                  <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--ink-muted)]">
                    最近笔记
                  </div>
                  {recentItems.map((item) => {
                    const idx = items.indexOf(item)
                    const isSelected = idx === selectedIndex
                    return (
                      <div
                        key={item.id}
                        data-selected={isSelected}
                        onClick={item.onSelect}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={`flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-xs transition-colors duration-75 ${
                          isSelected
                            ? 'bg-[var(--accent-soft)] font-medium text-foreground border-l-2 border-[#7b68ee] pl-2.5 shadow-xs'
                            : 'border-l-2 border-transparent text-[var(--ink-muted)] hover:bg-[var(--surface-2)] hover:text-foreground'
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span className={isSelected ? 'text-[#7b68ee]' : 'text-[var(--ink-muted)]'}>{item.icon}</span>
                          <span className="truncate">{highlightMatches(item.title, query)}</span>
                          {item.subtitle && (
                            <span className="truncate text-[11px] text-[var(--ink-muted)]">{item.subtitle}</span>
                          )}
                        </div>
                        {isSelected && (
                          <div className="flex shrink-0 items-center gap-1 text-[10px] text-[var(--ink-muted)]">
                            <span>打开</span>
                            <CornerDownLeft size={10} />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {noteItems.length > 0 && (
                <div className="mb-2">
                  <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--ink-muted)]">
                    匹配笔记 ({noteItems.length})
                  </div>
                  {noteItems.map((item) => {
                    const idx = items.indexOf(item)
                    const isSelected = idx === selectedIndex
                    return (
                      <div
                        key={item.id}
                        data-selected={isSelected}
                        onClick={item.onSelect}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={`flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-xs transition-colors duration-75 ${
                          isSelected
                            ? 'bg-[var(--accent-soft)] font-medium text-foreground border-l-2 border-[#7b68ee] pl-2.5 shadow-xs'
                            : 'border-l-2 border-transparent text-[var(--ink-muted)] hover:bg-[var(--surface-2)] hover:text-foreground'
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span className={isSelected ? 'text-[#7b68ee]' : 'text-[var(--ink-muted)]'}>{item.icon}</span>
                          <span className="truncate">{highlightMatches(item.title, query)}</span>
                          {item.subtitle && (
                            <span className="truncate text-[11px] text-[var(--ink-muted)]">{item.subtitle}</span>
                          )}
                        </div>
                        {isSelected && (
                          <div className="flex shrink-0 items-center gap-1 text-[10px] text-[var(--ink-muted)]">
                            <span>打开</span>
                            <CornerDownLeft size={10} />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {actionItems.length > 0 && (
                <div>
                  <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--ink-muted)]">
                    快捷指令 ({actionItems.length})
                  </div>
                  {actionItems.map((item) => {
                    const idx = items.indexOf(item)
                    const isSelected = idx === selectedIndex
                    return (
                      <div
                        key={item.id}
                        data-selected={isSelected}
                        onClick={item.onSelect}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={`flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-xs transition-colors duration-75 ${
                          isSelected
                            ? 'bg-[var(--accent-soft)] font-medium text-foreground border-l-2 border-[#7b68ee] pl-2.5 shadow-xs'
                            : 'border-l-2 border-transparent text-[var(--ink-muted)] hover:bg-[var(--surface-2)] hover:text-foreground'
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span className={isSelected ? 'text-[#7b68ee]' : 'text-[var(--ink-muted)]'}>{item.icon}</span>
                          <span className="truncate">{highlightMatches(item.title, query)}</span>
                          {item.subtitle && (
                            <span className="truncate text-[11px] text-[var(--ink-muted)]">{item.subtitle}</span>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {item.shortcut && (
                            <kbd className="rounded border border-[var(--line)] bg-[var(--surface-2)] px-1.5 py-0.5 text-[10px] font-mono text-[var(--ink-muted)]">
                              {item.shortcut}
                            </kbd>
                          )}
                          {isSelected && <CornerDownLeft size={10} className="text-[var(--ink-muted)]" />}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Shortcut Bar */}
        <div className="flex h-9 items-center justify-between border-t border-[var(--line)] bg-[var(--surface-0)] px-3.5 text-[11px] text-[var(--ink-muted)]">
          <div className="flex items-center gap-1.5">
            <Command size={12} className="text-[var(--ink-muted)]" />
            <span className="font-medium text-[var(--ink-muted)]">
              <ShinyText
                text="WIKIOBS by Helstera · 指令面板"
                color="currentColor"
                shineColor="#a29bfe"
                speed={3.5}
                shineWidth={35}
                softness={0.8}
              />
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span>
              <kbd className="rounded border border-[var(--line)] bg-[var(--surface-2)] px-1 text-[10px]">↑↓</kbd> 切换
            </span>
            <span>
              <kbd className="rounded border border-[var(--line)] bg-[var(--surface-2)] px-1 text-[10px]">↵</kbd> 执行
            </span>
            <span>
              <kbd className="rounded border border-[var(--line)] bg-[var(--surface-2)] px-1 text-[10px]">esc</kbd> 退出
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CommandPalette
