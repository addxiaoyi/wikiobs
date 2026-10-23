import React from 'react'
import { Check, Loader2, FileCode, Share2, PanelRightClose, PanelRightOpen } from 'lucide-react'
import { useFileContext } from '@/contexts/FileContext'
import { useChatContext } from '@/contexts/ChatContext'
import { useTranslation } from '@/lib/i18n'

export const StatusBar: React.FC = () => {
  const { noteStats, saveState, currentlyOpenFilePath, openOrCreateFile } = useFileContext()
  const { activePanel, setActivePanel } = useChatContext()
  const { t } = useTranslation()

  const toggleRightPanel = () => {
    setActivePanel((prev) => (prev ? null : 'chat'))
  }

  return (
    <footer
      className="flex h-6 w-full shrink-0 items-center justify-between border-t border-[var(--line)] bg-[var(--surface-0)]/90 backdrop-blur-xl px-3 text-[11px] text-[var(--ink-muted)] select-none font-sans z-20 transition-colors"
      aria-label="Status Bar"
    >
      {/* Left items: Sync & System Status & Knowledge Graph Shortcut */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-[var(--ink-muted)]">
          <span className="size-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]" />
          <span>{t('titlebar.synced') || '知识库已就绪'}</span>
        </div>

        <button
          type="button"
          onClick={() => openOrCreateFile('graph://global')}
          className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[var(--ink-muted)] transition-colors hover:bg-[var(--accent-soft)] hover:text-[var(--ink)] cursor-pointer"
          title="打开全局关系图 (Ctrl+G)"
        >
          <Share2 size={11} className="text-[#7b68ee]" />
          <span>图谱视图</span>
        </button>
      </div>

      {/* Right items: Note Stats & Save Status & Encoding & Panel Toggle */}
      <div className="flex items-center gap-3">
        {currentlyOpenFilePath && (
          <>
            <div className="flex items-center gap-1.5 text-[var(--ink)]">
              <span className="cursor-default" title="词数统计">{noteStats.words} 词</span>
              <span className="text-[var(--ink-muted)]/30">|</span>
              <span className="cursor-default" title="字符统计">{noteStats.characters} 字符</span>
            </div>

            <div className="flex items-center gap-1.5">
              {saveState === 'saving' ? (
                <>
                  <Loader2 size={11} className="animate-spin text-[#7b68ee]" />
                  <span className="text-[#7b68ee]">保存中…</span>
                </>
              ) : saveState === 'dirty' ? (
                <>
                  <span className="size-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.5)]" />
                  <span className="text-[var(--ink-muted)]">未保存</span>
                </>
              ) : (
                <>
                  <Check size={11} className="text-emerald-500" />
                  <span className="text-[var(--ink-muted)]">已保存</span>
                </>
              )}
            </div>
          </>
        )}

        <div className="flex items-center gap-1 text-[var(--ink-muted)]">
          <FileCode size={11} />
          <span>Markdown</span>
        </div>

        <span className="text-[var(--ink-muted)]/30">|</span>

        <span className="text-[10px] font-mono text-[var(--ink-muted)]">UTF-8</span>

        <button
          type="button"
          onClick={toggleRightPanel}
          className={`flex size-5 items-center justify-center rounded transition-colors cursor-pointer ${
            activePanel ? 'text-[#7b68ee] bg-[#7b68ee]/15' : 'text-[var(--ink-muted)] hover:bg-[var(--accent-soft)] hover:text-[var(--ink)]'
          }`}
          title={activePanel ? '折叠右侧助手' : '展开右侧助手'}
          aria-label="切换右侧助手分栏"
        >
          {activePanel ? <PanelRightClose size={12} /> : <PanelRightOpen size={12} />}
        </button>
      </div>
    </footer>
  )
}

export default StatusBar
