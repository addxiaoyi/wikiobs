import React, { useRef } from 'react'
import {
  X,
  Plus,
  FileText,
  Network,
  Settings,
  Puzzle,
  Clock,
  ArrowUpDown,
  Compass,
  Sparkles,
  Globe,
  FolderGit2,
} from 'lucide-react'
import { useFileContext } from '@/contexts/FileContext'
import { useContentContext } from '@/contexts/ContentContext'
import { useTranslation } from '@/lib/i18n'

const getTabIcon = (filePath: string, isActive: boolean) => {
  if (filePath === 'graph://global') {
    return <Network size={12} className="text-[#7b68ee] shrink-0" />
  }
  if (filePath === 'wikiobs://settings') {
    return <Settings size={12} className={isActive ? 'text-[#7b68ee]' : 'text-muted-foreground'} />
  }
  if (filePath === 'wikiobs://plugins') {
    return <Puzzle size={12} className={isActive ? 'text-[#7b68ee]' : 'text-muted-foreground'} />
  }
  if (filePath === 'wikiobs://tasks') {
    return <Clock size={12} className={isActive ? 'text-[#7b68ee]' : 'text-muted-foreground'} />
  }
  if (filePath === 'wikiobs://export') {
    return <ArrowUpDown size={12} className={isActive ? 'text-[#7b68ee]' : 'text-muted-foreground'} />
  }
  if (filePath === 'wikiobs://obsidian') {
    return <Compass size={12} className={isActive ? 'text-[#7b68ee]' : 'text-muted-foreground'} />
  }
  if (filePath === 'wikiobs://ai-org') {
    return <Sparkles size={12} className={isActive ? 'text-[#7b68ee]' : 'text-muted-foreground'} />
  }
  if (filePath === 'wikiobs://wiki-importer') {
    return <Globe size={12} className={isActive ? 'text-[#7b68ee]' : 'text-muted-foreground'} />
  }
  if (filePath === 'wikiobs://vaults') {
    return <FolderGit2 size={12} className={isActive ? 'text-[#7b68ee]' : 'text-muted-foreground'} />
  }
  return <FileText size={12} className={isActive ? 'text-[#7b68ee]' : 'text-muted-foreground'} />
}

export const EditorTabsBar: React.FC = () => {
  const { openTabs, currentlyOpenFilePath, selectTab, closeTab, saveState } = useFileContext()
  const { createUntitledNote } = useContentContext()
  const { t } = useTranslation()
  const scrollRef = useRef<HTMLDivElement>(null)

  const handleWheel = (e: React.WheelEvent) => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft += e.deltaY
    }
  }

  if (openTabs.length === 0 && !currentlyOpenFilePath) {
    return null
  }

  return (
    <div
      ref={scrollRef}
      onWheel={handleWheel}
      onDoubleClick={(e) => {
        if (e.target === e.currentTarget) {
          createUntitledNote()
        }
      }}
      className="flex h-[34px] shrink-0 items-end border-b border-[var(--line)] bg-[var(--surface-0)] px-0 select-none overflow-x-auto no-scrollbar font-sans"
      role="tablist"
      aria-label="Editor tabs"
    >
      <div className="flex h-full items-end min-w-0">
        {openTabs.map((tab) => {
          const isActive = tab.filePath === currentlyOpenFilePath
          const isDirty = isActive && saveState === 'dirty'

          return (
            <div
              key={tab.id}
              role="tab"
              data-testid="editor-tab"
              aria-selected={isActive}
              onClick={() => selectTab(tab.id)}
              onAuxClick={(e) => {
                if (e.button === 1) {
                  e.preventDefault()
                  e.stopPropagation()
                  closeTab(tab.id)
                }
              }}
              title={`${tab.title}\n${tab.filePath}`}
              className={`editor-tab group relative flex h-full max-w-[200px] min-w-[110px] items-center justify-between gap-1.5 px-3 text-xs border-r border-[var(--line)] transition-all duration-100 cursor-pointer select-none ${
                isActive
                  ? 'bg-[var(--surface-1)] text-foreground font-medium border-t-2 border-t-[#7b68ee] -mb-[1px] border-b border-b-[var(--surface-1)] z-10'
                  : 'bg-[var(--surface-0)] text-muted-foreground/80 hover:text-foreground hover:bg-[var(--surface-2)] border-t-2 border-t-transparent'
              }`}
            >
              <div className="flex min-w-0 items-center gap-1.5 truncate">
                {getTabIcon(tab.filePath, isActive)}
                <span className="truncate tracking-tight text-[11px] font-normal leading-none">{tab.title}</span>
              </div>

              <div className="flex items-center shrink-0">
                {isDirty && (
                  <span
                    className="mr-1 size-1.5 rounded-full bg-[#7b68ee] shadow-[0_0_6px_rgba(123,104,238,0.7)]"
                    title={t('editor.saveDirty') || '未保存'}
                  />
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    closeTab(tab.id)
                  }}
                  className={`flex size-4.5 items-center justify-center rounded-sm text-muted-foreground transition-all hover:bg-[var(--accent-soft)] hover:text-[#7b68ee] active:scale-90 ${
                    isActive ? 'opacity-70 group-hover:opacity-100' : 'opacity-0 group-hover:opacity-100'
                  }`}
                  aria-label={t('button.close') || '关闭标签页'}
                  title={t('button.close') || '关闭标签页 (中键也可关闭)'}
                >
                  <X size={10} strokeWidth={2} />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <button
        type="button"
        onClick={() => createUntitledNote()}
        className="mx-1.5 mb-1.5 flex size-5.5 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-[var(--accent-soft)] hover:text-[#7b68ee] active:scale-90"
        title={t('files.newNote') || '新建标签页 (双击标签栏空白处也可新建)'}
        aria-label={t('files.newNote') || '新建标签页'}
      >
        <Plus size={12} strokeWidth={2} />
      </button>
    </div>
  )
}

export default EditorTabsBar
