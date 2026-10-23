import React from 'react'
import { Command, FileText, Search, Network, Keyboard, Sparkles, BookOpen, X } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { useTranslation } from '@/lib/i18n'

interface KeyboardShortcutsModalProps {
  isOpen: boolean
  onClose: () => void
}

interface ShortcutItem {
  keys: string[]
  description: string
  icon?: React.ReactNode
}

interface ShortcutCategory {
  title: string
  items: ShortcutItem[]
}

const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation()
  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform)
  const cmd = isMac ? '⌘' : 'Ctrl'

  const categories: ShortcutCategory[] = [
    {
      title: '工作区导航与检索',
      items: [
        { keys: [cmd, 'K'], description: '命令面板 / 快速跳转文件', icon: <Command size={13} className="text-[#7b68ee]" /> },
        { keys: [cmd, 'Shift', 'F'], description: '全局全文搜索与语义检索', icon: <Search size={13} className="text-[#7b68ee]" /> },
        { keys: [cmd, 'G'], description: '打开全局力导向关系图谱', icon: <Network size={13} className="text-[#7b68ee]" /> },
        { keys: [cmd, '\\'], description: '切换左侧文件资源管理器显隐', icon: <BookOpen size={13} className="text-[#7b68ee]" /> },
      ],
    },
    {
      title: '笔记创作与编辑',
      items: [
        { keys: [cmd, 'N'], description: '新建空白 Markdown 笔记', icon: <FileText size={13} className="text-[#7b68ee]" /> },
        { keys: [cmd, 'S'], description: '即时保存当前编辑文档', icon: <FileText size={13} className="text-[#7b68ee]" /> },
        { keys: ['[['], description: '插入双链引用（反向链接补全）', icon: <Sparkles size={13} className="text-[#7b68ee]" /> },
        { keys: ['/'], description: '召唤斜杠指令菜单（插入块级元素）', icon: <Command size={13} className="text-[#7b68ee]" /> },
        { keys: ['#'], description: '创建与引用知识标签 (Tag)', icon: <Sparkles size={13} className="text-[#7b68ee]" /> },
      ],
    },
    {
      title: '格式排版与交互',
      items: [
        { keys: [cmd, 'B'], description: '加粗选中文本', icon: <Keyboard size={13} className="text-muted-foreground" /> },
        { keys: [cmd, 'I'], description: '斜体选中文本', icon: <Keyboard size={13} className="text-muted-foreground" /> },
        { keys: ['Esc'], description: '关闭弹窗 / 退出全屏 / 清除选择', icon: <Keyboard size={13} className="text-muted-foreground" /> },
      ],
    },
  ]

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl rounded-2xl border border-[var(--line)] bg-[var(--surface-1)] p-0 shadow-2xl backdrop-blur-2xl overflow-hidden select-none">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--line)] bg-[var(--surface-0)]/60 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex size-7 items-center justify-center rounded-lg border border-[#7b68ee]/30 bg-[#7b68ee]/15 text-[#7b68ee] shadow-sm">
              <Keyboard size={15} />
            </div>
            <div>
              <DialogTitle className="text-sm font-semibold tracking-tight text-foreground">
                快捷键与使用指引
              </DialogTitle>
              <p className="text-[11px] text-[var(--ink-muted)]">
                快捷键操作指南
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-7 items-center justify-center rounded-md text-[var(--ink-muted)] transition-colors hover:bg-[var(--accent-soft)] hover:text-[#7b68ee] cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>

        {/* Content Body */}
        <div className="max-h-[68vh] overflow-y-auto p-5 space-y-5 scrollbar-thin">
          {categories.map((cat) => (
            <div key={cat.title} className="space-y-2">
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--ink-muted)] pl-1">
                {cat.title}
              </h4>
              <div className="grid grid-cols-1 gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--surface-2)]/60 p-2 shadow-sm backdrop-blur-md">
                {cat.items.map((item) => (
                  <div
                    key={item.description}
                    className="flex items-center justify-between rounded-lg px-2.5 py-1.5 transition-colors hover:bg-[var(--accent-soft)]/50"
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-3">
                      {item.icon}
                      <span className="truncate text-xs text-foreground/90">
                        {item.description}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {item.keys.map((k) => (
                        <kbd
                          key={k}
                          className="inline-flex min-w-[20px] items-center justify-center rounded-md border border-[var(--line)] bg-[var(--surface-1)] px-1.5 py-0.5 font-mono text-[10px] font-medium text-foreground shadow-xs"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Privacy Guarantee Footer Note */}
          <div className="rounded-xl border border-[#7b68ee]/25 bg-[#7b68ee]/5 p-3 text-center">
            <p className="text-[11px] text-[var(--ink-muted)] leading-relaxed">
              💡 <span className="font-semibold text-foreground">100% 本地纯净运行</span>：所有笔记内容、向量数据库与 AI 检索均在本地离线执行，无任何遥测与数据上传。
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default KeyboardShortcutsModal
