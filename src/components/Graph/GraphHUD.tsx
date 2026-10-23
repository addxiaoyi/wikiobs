/**
 * GraphHUD.tsx
 * Obsidian-grade collapsible HUD control panel for Force-Directed Knowledge Graph.
 * Defaults to a compact 28x28px frosted acrylic trigger button in the top-right corner.
 * Clicking expands into a sleek monochrome floating card with real-time text search,
 * display/filter toggles, and live D3 physics parameter sliders.
 */

import React, { useState, useEffect } from 'react'
import {
  Search,
  X,
  Sliders,
  RotateCcw,
  RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/ui'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { GraphHUDProps } from './graph-types'

export const GraphHUD: React.FC<GraphHUDProps> = ({
  physicsConfig,
  displayConfig,
  onPhysicsChange,
  onDisplayChange,
  matchCount = 0,
  totalNodes = 0,
  theme: explicitTheme,
  onResetView,
  onReheatSimulation,
  className = '',
}) => {
  // Default to collapsed for 100% clean canvas view
  const [isCollapsed, setIsCollapsed] = useState(true)

  // Detect theme
  const [activeTheme, setActiveTheme] = useState<'dark' | 'light'>(() => {
    if (explicitTheme) return explicitTheme
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('light') ? 'light' : 'dark'
    }
    return 'dark'
  })

  useEffect(() => {
    if (explicitTheme) {
      setActiveTheme(explicitTheme)
      return
    }
    if (typeof document === 'undefined') return
    const updateTheme = () => {
      const isLight = document.documentElement.classList.contains('light')
      setActiveTheme(isLight ? 'light' : 'dark')
    }
    updateTheme()
    const observer = new MutationObserver(updateTheme)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme'],
    })
    return () => observer.disconnect()
  }, [explicitTheme])

  const isDark = activeTheme === 'dark'
  const isSearchActive = displayConfig.searchQuery.trim().length > 0

  // Collapsed: 28x28px frosted trigger button in the top right
  if (isCollapsed) {
    return (
      <div className={cn('absolute top-3.5 right-3.5 z-20 select-none', className)}>
        <button
          type="button"
          onClick={() => setIsCollapsed(false)}
          title="打开图谱设置"
          className={cn(
            'relative flex size-7 items-center justify-center rounded-lg transition-all duration-150 cursor-pointer shadow-md backdrop-blur-md',
            isDark
              ? 'bg-[#10121a]/80 hover:bg-[#181a24] text-slate-300 hover:text-white border border-white/10 hover:border-white/25 shadow-black/40'
              : 'bg-white/80 hover:bg-white text-slate-700 hover:text-slate-950 border border-slate-200/90 hover:border-slate-300 shadow-slate-900/5',
          )}
        >
          <Sliders size={13} strokeWidth={1.8} />
          {isSearchActive && (
            <span
              className={cn(
                'absolute -top-1 -right-1 size-2 rounded-full',
                isDark ? 'bg-white' : 'bg-slate-900',
              )}
            />
          )}
        </button>
      </div>
    )
  }

  // Expanded: Obsidian-style compact floating card
  return (
    <div
      className={cn(
        'absolute top-3.5 right-3.5 z-20 w-72 sm:w-80 select-none transition-all duration-150',
        'backdrop-blur-xl border rounded-xl overflow-hidden shadow-2xl',
        isDark
          ? 'bg-[#10121a]/90 border-white/10 text-slate-200 shadow-black/60'
          : 'bg-white/90 border-slate-200/90 text-slate-800 shadow-slate-900/10',
        className,
      )}
    >
      {/* Header Bar */}
      <div
        className={cn(
          'flex items-center justify-between px-3 py-2 border-b transition-colors',
          isDark ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200/80 bg-slate-50/50',
        )}
      >
        <div className="flex items-center gap-1.5 text-xs font-medium tracking-wide">
          <Sliders size={12} className={isDark ? 'text-slate-400' : 'text-slate-500'} />
          <span>图谱设置</span>
          {isSearchActive && (
            <span
              className={cn(
                'ml-1 rounded px-1.5 py-0.2 text-[10px] font-mono leading-tight',
                isDark ? 'bg-white/10 text-white' : 'bg-slate-200 text-slate-900',
              )}
            >
              {matchCount}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {onReheatSimulation && (
            <button
              type="button"
              onClick={onReheatSimulation}
              title="重新计算布局"
              className={cn(
                'rounded-md p-1 transition-colors cursor-pointer',
                isDark ? 'hover:bg-white/10 text-slate-400 hover:text-white' : 'hover:bg-slate-200 text-slate-500 hover:text-slate-900',
              )}
            >
              <RefreshCw size={12} />
            </button>
          )}

          {onResetView && (
            <button
              type="button"
              onClick={onResetView}
              title="重置居中视角"
              className={cn(
                'rounded-md p-1 transition-colors cursor-pointer',
                isDark ? 'hover:bg-white/10 text-slate-400 hover:text-white' : 'hover:bg-slate-200 text-slate-500 hover:text-slate-900',
              )}
            >
              <RotateCcw size={12} />
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsCollapsed(true)}
            title="收起设置面板"
            className={cn(
              'rounded-md p-1 transition-colors cursor-pointer ml-0.5',
              isDark ? 'hover:bg-white/10 text-slate-400 hover:text-white' : 'hover:bg-slate-200 text-slate-500 hover:text-slate-900',
            )}
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Controls Body */}
      <div className="flex flex-col gap-3 p-3 text-xs">
        {/* Real-time Search Input */}
        <div className="relative flex items-center">
          <Search
            size={12}
            className={cn(
              'absolute left-2.5 pointer-events-none',
              isDark ? 'text-slate-400' : 'text-slate-500',
            )}
          />
          <Input
            type="text"
            placeholder="搜索节点或标签..."
            value={displayConfig.searchQuery}
            onChange={(e) => onDisplayChange({ searchQuery: e.target.value })}
            className={cn(
              'pl-7 pr-14 h-7 text-xs rounded-lg transition-all',
              isDark
                ? 'bg-black/30 border-white/10 focus:border-white/30 text-white placeholder:text-slate-500'
                : 'bg-white border-slate-200 focus:border-slate-400 text-slate-900 placeholder:text-slate-400',
            )}
          />
          {isSearchActive && (
            <div className="absolute right-1.5 flex items-center gap-1">
              <span
                className={cn(
                  'px-1.5 py-0.5 rounded text-[10px] font-mono leading-none',
                  isDark ? 'bg-white/10 text-slate-300' : 'bg-slate-100 text-slate-700',
                )}
              >
                {matchCount}/{totalNodes || matchCount}
              </span>
              <button
                type="button"
                onClick={() => onDisplayChange({ searchQuery: '' })}
                className={cn(
                  'p-0.5 rounded transition-colors',
                  isDark ? 'hover:bg-white/20 text-slate-400' : 'hover:bg-slate-200 text-slate-500',
                )}
              >
                <X size={11} />
              </button>
            </div>
          )}
        </div>

        {/* Display & Filter Toggles */}
        <div className="flex flex-col gap-1.5 pt-0.5">
          <span
            className={cn(
              'text-[10px] font-medium tracking-wider uppercase',
              isDark ? 'text-slate-400' : 'text-slate-500',
            )}
          >
            显示与过滤配置
          </span>

          <div className="grid grid-cols-2 gap-2">
            {/* Show Tags */}
            <label className="flex items-center justify-between cursor-pointer group py-0.5">
              <span
                className={cn(
                  'text-[11px] transition-colors',
                  isDark ? 'text-slate-300 group-hover:text-white' : 'text-slate-700 group-hover:text-slate-900',
                )}
              >
                标签节点
              </span>
              <Switch
                checked={displayConfig.showTags}
                onCheckedChange={(checked) => onDisplayChange({ showTags: checked })}
              />
            </label>

            {/* Show Orphans */}
            <label className="flex items-center justify-between cursor-pointer group py-0.5">
              <span
                className={cn(
                  'text-[11px] transition-colors',
                  isDark ? 'text-slate-300 group-hover:text-white' : 'text-slate-700 group-hover:text-slate-900',
                )}
              >
                孤立笔记
              </span>
              <Switch
                checked={displayConfig.showOrphans}
                onCheckedChange={(checked) => onDisplayChange({ showOrphans: checked })}
              />
            </label>

            {/* Show Labels */}
            <label className="flex items-center justify-between cursor-pointer group py-0.5">
              <span
                className={cn(
                  'text-[11px] transition-colors',
                  isDark ? 'text-slate-300 group-hover:text-white' : 'text-slate-700 group-hover:text-slate-900',
                )}
              >
                显示标签
              </span>
              <Switch
                checked={displayConfig.showLabels}
                onCheckedChange={(checked) => onDisplayChange({ showLabels: checked })}
              />
            </label>

            {/* Show Particles */}
            <label className="flex items-center justify-between cursor-pointer group py-0.5">
              <span
                className={cn(
                  'text-[11px] transition-colors',
                  isDark ? 'text-slate-300 group-hover:text-white' : 'text-slate-700 group-hover:text-slate-900',
                )}
              >
                连线粒子
              </span>
              <Switch
                checked={displayConfig.showParticles}
                onCheckedChange={(checked) => onDisplayChange({ showParticles: checked })}
              />
            </label>
          </div>
        </div>

        {/* Physics Parameters Sliders */}
        <div
          className={cn(
            'flex flex-col gap-2 pt-2 border-t',
            isDark ? 'border-white/10' : 'border-slate-200/80',
          )}
        >
          <span
            className={cn(
              'text-[10px] font-medium tracking-wider uppercase',
              isDark ? 'text-slate-400' : 'text-slate-500',
            )}
          >
            物理模拟参数
          </span>

          {/* Repel Force Slider */}
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>
                节点斥力 (Repulsion)
              </span>
              <span className={cn('font-mono text-[10px]', isDark ? 'text-slate-400' : 'text-slate-600')}>
                {physicsConfig.repelForce}
              </span>
            </div>
            <Slider
              value={[physicsConfig.repelForce]}
              min={-500}
              max={-30}
              step={10}
              onValueChange={([val]) => onPhysicsChange({ repelForce: val })}
              className="py-1"
            />
          </div>

          {/* Link Distance Slider */}
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>
                连线长度 (Distance)
              </span>
              <span className={cn('font-mono text-[10px]', isDark ? 'text-slate-400' : 'text-slate-600')}>
                {physicsConfig.linkDistance}px
              </span>
            </div>
            <Slider
              value={[physicsConfig.linkDistance]}
              min={30}
              max={260}
              step={5}
              onValueChange={([val]) => onPhysicsChange({ linkDistance: val })}
              className="py-1"
            />
          </div>

          {/* Center Pull Slider */}
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>
                中心引力 (Center Pull)
              </span>
              <span className={cn('font-mono text-[10px]', isDark ? 'text-slate-400' : 'text-slate-600')}>
                {Math.round(physicsConfig.centerPull * 100) / 100}
              </span>
            </div>
            <Slider
              value={[Math.round(physicsConfig.centerPull * 100)]}
              min={1}
              max={25}
              step={1}
              onValueChange={([val]) => onPhysicsChange({ centerPull: val / 100 })}
              className="py-1"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default GraphHUD
