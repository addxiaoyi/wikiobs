import React, { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Loader2, Sparkles, Terminal, Wand2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { PermissionRiskBadge } from '@/components/ui/permission-badges'
import { useTranslation, type TranslationKey } from '@/lib/i18n'
import { cn } from '@/lib/ui'

export type PluginPresetKind = 'plugin' | 'llm' | 'cli'

export interface PluginPresetListing {
  id: string
  kind: PluginPresetKind
  category: string
  tags: readonly string[]
  name: string
  version: string
  description: string
  permissions: string[]
  installed: boolean
  source: string
}

interface PluginManagerPresetSectionProps {
  presets: PluginPresetListing[]
  creatingId: string | null
  open: boolean
  onToggle: () => void
  onCreate: (preset: PluginPresetListing) => void | Promise<void>
}

const KIND_ORDER: PluginPresetKind[] = ['llm', 'cli', 'plugin']

const KIND_META: Record<PluginPresetKind, { icon: typeof Sparkles; labelKey: TranslationKey }> = {
  llm: { icon: Sparkles, labelKey: 'plugin.presets.kind.llm' },
  cli: { icon: Terminal, labelKey: 'plugin.presets.kind.cli' },
  plugin: { icon: Wand2, labelKey: 'plugin.presets.kind.plugin' },
}

/**
 * 插件中心的"一键创建"区：内置预设按 LLM / CLI / 普通分组。
 * 创建后会在用户插件目录落下 manifest + 入口源码 + README，用户可以整份改写。
 */
const PluginManagerPresetSection: React.FC<PluginManagerPresetSectionProps> = ({
  presets,
  creatingId,
  open,
  onToggle,
  onCreate,
}) => {
  const { t } = useTranslation()
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const grouped = useMemo(() => {
    return KIND_ORDER.map((kind) => ({ kind, items: presets.filter((preset) => preset.kind === kind) })).filter(
      (group) => group.items.length > 0,
    )
  }, [presets])

  if (presets.length === 0) return null

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between text-left"
        aria-expanded={open}
      >
        <span className="text-xs font-semibold text-foreground">{t('plugin.presets.title')}</span>
        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
          {presets.length}
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
      </button>
      {open && (
        <div className="mt-2 space-y-3">
          <p className="text-[11px] leading-relaxed text-muted-foreground">{t('plugin.presets.desc')}</p>
          {grouped.map((group) => {
            const Icon = KIND_META[group.kind].icon
            return (
              <div key={group.kind} className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  <Icon size={11} />
                  <span>{t(KIND_META[group.kind].labelKey)}</span>
                </div>
                {group.items.map((preset) => {
                  const creating = creatingId === preset.id
                  const expanded = expandedId === preset.id
                  return (
                    <div key={preset.id} className="rounded-md border border-border bg-background p-2.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-foreground">{preset.name}</span>
                            {preset.installed && (
                              <span className="rounded border border-border bg-muted/40 px-1.5 py-0.5 text-[9px] text-muted-foreground">
                                {t('plugin.presets.created')}
                              </span>
                            )}
                          </div>
                          <div className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                            {preset.description}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-1">
                            {preset.permissions.map((permission) => (
                              <span
                                key={permission}
                                className="rounded border border-border px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground"
                              >
                                {permission}
                              </span>
                            ))}
                            <PermissionRiskBadge permissions={preset.permissions} />
                            <button
                              type="button"
                              onClick={() => setExpandedId(expanded ? null : preset.id)}
                              aria-expanded={expanded}
                              className={cn('px-0.5 text-[10px] text-muted-foreground hover:text-foreground')}
                            >
                              {t('plugin.presets.viewSource')}
                            </button>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant={preset.installed ? 'secondary' : 'accent'}
                          disabled={preset.installed || creating || creatingId !== null}
                          onClick={() => onCreate(preset)}
                          className="shrink-0 gap-1 text-xs"
                        >
                          {creating && <Loader2 size={12} className="animate-spin" />}
                          {preset.installed ? t('plugin.presets.installed') : t('plugin.presets.create')}
                        </Button>
                      </div>
                      {expanded && (
                        <pre className="mt-2 max-h-64 overflow-auto rounded border border-border bg-muted/30 p-2 font-mono text-[10px] leading-relaxed text-muted-foreground">
                          {preset.source}
                        </pre>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default PluginManagerPresetSection
