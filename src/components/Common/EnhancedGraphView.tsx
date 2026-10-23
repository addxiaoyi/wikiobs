import React, { useEffect, useRef, useState, useCallback } from 'react'
import gsap from 'gsap'
import { RotateCcw, Search } from 'lucide-react'

import { Easing, staggerFadeIn, slideInRight } from '@/lib/gsap-animations'
import { useTranslation } from '@/lib/i18n'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/ui'

interface GraphNode {
  id: string
  label: string
  x?: number
  y?: number
  tags?: string[]
  type?: string
  filePath?: string
}

interface GraphEdge {
  source: string
  target: string
  type: 'related' | 'link' | 'mention'
  weight?: number
}

interface EnhancedGraphViewProps {
  nodes: GraphNode[]
  edges: GraphEdge[]
  onNodeClick?: (node: GraphNode) => void
  width?: number
  height?: number
}

interface ClusterInfo {
  id: string
  label: string
  color: string
  nodeCount: number
}

const CLUSTER_COLORS = [
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
  '#96CEB4',
  '#FFEAA7',
  '#DDA0DD',
  '#98D8C8',
  '#F7DC6F',
  '#BB8FCE',
  '#85C1E9',
]

const EnhancedGraphView: React.FC<EnhancedGraphViewProps> = ({
  nodes,
  edges,
  onNodeClick,
  width = 800,
  height = 600,
}) => {
  const { t } = useTranslation()
  const isDark = typeof document !== 'undefined' ? (document.documentElement.classList.contains('dark') || true) : true
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const controlBarRef = useRef<HTMLDivElement>(null)
  const legendRef = useRef<HTMLDivElement>(null)
  const detailPanelRef = useRef<HTMLDivElement>(null)
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null)
  const [clusters, setClusters] = useState<ClusterInfo[]>([])
  const [selectedCluster, setSelectedCluster] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; node: GraphNode } | null>(null)
  const [relatedNodeIds, setRelatedNodeIds] = useState<string[]>([])
  const [showLabels, setShowLabels] = useState(true)
  const [layoutMode, setLayoutMode] = useState<'radial' | 'grid'>('radial')
  const prevNodeCountRef = useRef(nodes.length)
  const activeZoomTweenRef = useRef<gsap.core.Tween | null>(null)
  let cursor = 'grab'
  if (hoveredNode) cursor = 'pointer'
  else if (isDragging) cursor = 'grabbing'

  // 聚类颜色
  const clusterColors = CLUSTER_COLORS

  // 执行简单聚类（基于标签）
  const performClustering = useCallback(() => {
    const clusterMap = new Map<string, GraphNode[]>()

    nodes.forEach((node) => {
      const tags = node.tags || []
      const primaryTag = tags[0] || 'Uncategorized'

      if (!clusterMap.has(primaryTag)) {
        clusterMap.set(primaryTag, [])
      }
      clusterMap.get(primaryTag)!.push(node)
    })

    const clusterList: ClusterInfo[] = []
    let colorIdx = 0

    clusterMap.forEach((groupNodes, tag) => {
      clusterList.push({
        id: tag,
        label: tag,
        color: clusterColors[colorIdx % clusterColors.length],
        nodeCount: groupNodes.length,
      })
      colorIdx += 1
    })

    setClusters(clusterList)
  }, [nodes, clusterColors])

  useEffect(() => {
    performClustering()
  }, [performClustering])

  // GSAP 动画：控制栏入场
  useEffect(() => {
    if (controlBarRef.current) {
      gsap.fromTo(
        controlBarRef.current,
        { y: -30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.4, ease: Easing.smooth },
      )
    }
  }, [])

  // GSAP 动画：节点详情面板滑入
  useEffect(() => {
    if (selectedNode && detailPanelRef.current) {
      slideInRight(detailPanelRef.current, 0.3)
    }
  }, [selectedNode])

  // GSAP 动画：节点新增/更新脉冲
  useEffect(() => {
    if (nodes.length > prevNodeCountRef.current && canvasRef.current) {
      gsap.fromTo(
        canvasRef.current,
        { filter: 'brightness(1.3)' },
        { filter: 'brightness(1)', duration: 0.6, ease: Easing.smooth },
      )
    }
    prevNodeCountRef.current = nodes.length
  }, [nodes.length])

  // GSAP 动画：图例入场
  useEffect(() => {
    if (legendRef.current && clusters.length > 0) {
      staggerFadeIn(legendRef.current.children, 0.3, 0.04)
    }
  }, [clusters.length])

  // 筛选节点
  const filteredNodes = nodes.filter((node) => {
    // 聚类筛选
    if (selectedCluster) {
      const tags = node.tags || []
      const primaryTag = tags[0] || 'Uncategorized'
      if (primaryTag !== selectedCluster) return false
    }
    // 搜索筛选
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      const matchLabel = node.label.toLowerCase().includes(query)
      const matchTag = (node.tags || []).some((t) => t.toLowerCase().includes(query))
      return matchLabel || matchTag
    }
    return true
  })

  // 筛选边
  const filteredEdges = edges.filter((edge) => {
    const sourceExists = filteredNodes.some((n) => n.id === edge.source)
    const targetExists = filteredNodes.some((n) => n.id === edge.target)
    return sourceExists && targetExists
  })

  // 自动布局（力导向简化版 / 网格 / 径向）
  const layoutNodes = React.useMemo(() => {
    const centerX = width / 2
    const centerY = height / 2
    const radius = Math.min(width, height) * 0.35

    if (layoutMode === 'grid') {
      const cols = Math.ceil(Math.sqrt(filteredNodes.length))
      const padding = 60
      const cellW = (width - padding * 2) / Math.max(cols, 1)
      const cellH = (height - padding * 2) / Math.max(Math.ceil(filteredNodes.length / cols), 1)

      return filteredNodes.map((node, idx) => ({
        ...node,
        x: padding + (idx % cols) * cellW + cellW / 2,
        y: padding + Math.floor(idx / cols) * cellH + cellH / 2,
      }))
    }

    // radial 模式
    const clusterPositions = new Map<string, { x: number; y: number }>()
    const clusterGroups = new Map<string, GraphNode[]>()

    filteredNodes.forEach((node) => {
      const cluster = (node.tags || [])[0] || 'Uncategorized'
      if (!clusterGroups.has(cluster)) {
        clusterGroups.set(cluster, [])
      }
      clusterGroups.get(cluster)!.push(node)
    })

    if (filteredNodes.length === 1) {
      return filteredNodes.map((node) => ({ ...node, x: centerX, y: centerY }))
    }

    let angle = 0
    const angleStep = (2 * Math.PI) / Math.max(clusterGroups.size, 1)
    const clusterRadius = clusterGroups.size === 1 ? 0 : radius * 0.65

    clusterGroups.forEach((groupNodes, cluster) => {
      const clusterX = centerX + clusterRadius * Math.cos(angle)
      const clusterY = centerY + clusterRadius * Math.sin(angle)
      clusterPositions.set(cluster, { x: clusterX, y: clusterY })
      angle += angleStep
    })

    return filteredNodes.map((node) => {
      const cluster = (node.tags || [])[0] || 'Uncategorized'
      const clusterPos = clusterPositions.get(cluster) || { x: centerX, y: centerY }
      const groupNodes = clusterGroups.get(cluster) || []
      const groupIdx = groupNodes.indexOf(node)
      const groupSize = groupNodes.length || 1

      const nodeAngle = (groupIdx / groupSize) * 2 * Math.PI
      const nodeRadius = Math.min(80, 30 + groupSize * 5)

      return {
        ...node,
        x: clusterPos.x + nodeRadius * Math.cos(nodeAngle),
        y: clusterPos.y + nodeRadius * Math.sin(nodeAngle),
      }
    })
  }, [filteredNodes, width, height, layoutMode])

  // 绘制图形
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 清除画布
    ctx.clearRect(0, 0, width, height)

    // 应用变换
    ctx.save()
    ctx.translate(pan.x, pan.y)
    ctx.scale(zoom, zoom)

    // 绘制边
    const defaultEdgeColor = isDark ? '#475569' : '#cbd5e1'
    const labelColor = isDark ? '#f8fafc' : '#0f172a'
    const subLabelColor = isDark ? '#94a3b8' : '#64748b'
    const haloColor = isDark ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255, 255, 255, 0.88)'
    const selectedStrokeColor = isDark ? '#ffffff' : '#0f172a'

    ctx.strokeStyle = defaultEdgeColor
    ctx.lineWidth = Math.max(1 / zoom, 0.5)
    layoutNodes.forEach((node) => {
      const connectedEdges = filteredEdges.filter((e) => e.source === node.id || e.target === node.id)
      connectedEdges.forEach((edge) => {
        const targetNode = layoutNodes.find((n) => n.id === (edge.source === node.id ? edge.target : edge.source))
        if (targetNode) {
          ctx.beginPath()
          ctx.moveTo(node.x || 0, node.y || 0)
          ctx.lineTo(targetNode.x || 0, targetNode.y || 0)

          // 连线样式按类型区分
          if (edge.type === 'related') {
            ctx.setLineDash([4, 4])
            ctx.strokeStyle = isDark ? '#64748b' : '#94a3b8'
          } else if (edge.type === 'link') {
            ctx.strokeStyle = isDark ? '#ffffff' : '#0f172a'
          } else if (edge.type === 'mention') {
            ctx.strokeStyle = isDark ? '#94a3b8' : '#64748b'
          }

          ctx.stroke()
          ctx.setLineDash([])
          ctx.strokeStyle = defaultEdgeColor
        }
      })
    })

    // 绘制聚类圆
    clusters.forEach((cluster) => {
      const clusterNodes = layoutNodes.filter((n) => (n.tags || [])[0] === cluster.label)
      if (clusterNodes.length === 0) return

      const avgX = clusterNodes.reduce((sum, n) => sum + (n.x || 0), 0) / clusterNodes.length
      const avgY = clusterNodes.reduce((sum, n) => sum + (n.y || 0), 0) / clusterNodes.length

      ctx.fillStyle = `${cluster.color}20`
      ctx.strokeStyle = cluster.color
      ctx.lineWidth = 2 / zoom
      ctx.beginPath()
      ctx.arc(avgX, avgY, (60 + cluster.nodeCount * 3) / zoom, 0, 2 * Math.PI)
      ctx.fill()
      ctx.stroke()
    })

    // 绘制节点
    layoutNodes.forEach((node) => {
      const x = node.x || 0
      const y = node.y || 0
      const isHovered = hoveredNode?.id === node.id
      const isSelected = selectedNode?.id === node.id
      const isRelated = relatedNodeIds.includes(node.id)
      const cluster = (node.tags || [])[0] || 'Uncategorized'
      const clusterInfo = clusters.find((c) => c.label === cluster)

      // 节点圆
      let nodeRadius = 8
      if (isHovered) nodeRadius = 12
      else if (isSelected) nodeRadius = 11
      nodeRadius /= zoom

      ctx.globalAlpha = relatedNodeIds.length > 0 && !isRelated ? 0.25 : 1
      ctx.fillStyle = clusterInfo?.color || '#999'
      ctx.beginPath()
      ctx.arc(x, y, nodeRadius, 0, 2 * Math.PI)
      ctx.fill()

      if (isSelected) {
        ctx.strokeStyle = selectedStrokeColor
        ctx.lineWidth = 3 / zoom
        ctx.stroke()
      }

      // 节点标签 (带抗遮挡光晕描边和防重叠字符截断)
      if (showLabels) {
        const maxChars = zoom < 0.6 ? 8 : zoom < 1.0 ? 14 : 22
        const displayLabel = node.label.length > maxChars ? `${node.label.slice(0, maxChars)}…` : node.label

        ctx.save()
        ctx.font = `${Math.max(9 / zoom, 4)}px sans-serif`
        ctx.textAlign = 'center'
        ctx.lineWidth = 3 / zoom
        ctx.strokeStyle = haloColor
        ctx.strokeText(displayLabel, x, y + 18 / zoom)
        ctx.fillStyle = labelColor
        ctx.fillText(displayLabel, x, y + 18 / zoom)
        ctx.restore()
      }

      // 悬停/选中标签
      if ((isHovered || isSelected) && showLabels) {
        const tags = node.tags || []
        if (tags.length > 0) {
          const subText = tags.slice(0, 3).join(', ')
          ctx.save()
          ctx.font = `${Math.max(8 / zoom, 4)}px sans-serif`
          ctx.textAlign = 'center'
          ctx.lineWidth = 2.5 / zoom
          ctx.strokeStyle = haloColor
          ctx.strokeText(subText, x, y + 30 / zoom)
          ctx.fillStyle = subLabelColor
          ctx.fillText(subText, x, y + 30 / zoom)
          ctx.restore()
        }
      }
      ctx.globalAlpha = 1
    })

    ctx.restore()
  }, [
    layoutNodes,
    filteredEdges,
    clusters,
    hoveredNode,
    selectedNode,
    zoom,
    pan,
    width,
    height,
    showLabels,
    relatedNodeIds,
    isDark,
  ])

  // 鼠标事件处理
  const getGraphPoint = (event: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return null
    return {
      x: (event.clientX - rect.left - pan.x) / zoom,
      y: (event.clientY - rect.top - pan.y) / zoom,
    }
  }

  const findNodeAt = (point: { x: number; y: number }) =>
    layoutNodes.find((node) => {
      const dx = (node.x || 0) - point.x
      const dy = (node.y || 0) - point.y
      return Math.sqrt(dx * dx + dy * dy) < 15 / zoom
    }) || null

  const handleMouseMove = (e: React.MouseEvent) => {
    const point = getGraphPoint(e)
    if (!point) return

    if (isDragging) {
      setPan({ x: pan.x + e.movementX, y: pan.y + e.movementY })
      return
    }

    setHoveredNode(findNodeAt(point))
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 && !hoveredNode) {
      setIsDragging(true)
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleClick = () => {
    if (hoveredNode) {
      setSelectedNode(hoveredNode)
      setRelatedNodeIds([])
      onNodeClick?.(hoveredNode)
    } else {
      setSelectedNode(null)
      setRelatedNodeIds([])
    }
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    const point = getGraphPoint(e)
    const node = point ? findNodeAt(point) : null
    if (node) {
      setContextMenu({ x: e.clientX, y: e.clientY, node })
    }
  }

  useEffect(() => {
    if (!contextMenu) return undefined
    const handleWindowClick = () => setContextMenu(null)
    window.addEventListener('click', handleWindowClick)
    return () => window.removeEventListener('click', handleWindowClick)
  }, [contextMenu])

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault()
      const delta = e.deltaY > 0 ? 0.9 : 1.1
      const targetZoom = Math.max(0.3, Math.min(3, zoom * delta))

      // GSAP 平滑缩放
      if (activeZoomTweenRef.current) {
        activeZoomTweenRef.current.kill()
      }
      const target = { z: zoom }
      activeZoomTweenRef.current = gsap.to(target, {
        z: targetZoom,
        duration: 0.15,
        ease: Easing.smooth,
        onUpdate: () => {
          setZoom((target as { z: number }).z)
        },
      })
    },
    [zoom],
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined

    canvas.addEventListener('wheel', handleWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', handleWheel)
  }, [handleWheel])

  const handleCanvasKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      const hadSelection = Boolean(selectedNode || contextMenu || relatedNodeIds.length)
      setSelectedNode(null)
      setRelatedNodeIds([])
      setContextMenu(null)
      if (hadSelection) {
        event.preventDefault()
        event.stopPropagation()
      }
      return
    }

    if (layoutNodes.length === 0) return

    if (
      event.key === 'ArrowRight' ||
      event.key === 'ArrowDown' ||
      event.key === 'ArrowLeft' ||
      event.key === 'ArrowUp'
    ) {
      event.preventDefault()
      const currentIndex = selectedNode ? layoutNodes.findIndex((node) => node.id === selectedNode.id) : -1
      const direction = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1
      const nextIndex = (currentIndex + direction + layoutNodes.length) % layoutNodes.length
      setSelectedNode(layoutNodes[nextIndex])
      return
    }

    if (event.key === 'Enter' && selectedNode) {
      onNodeClick?.(selectedNode)
    }
  }

  const handleResetView = () => {
    if (activeZoomTweenRef.current) {
      activeZoomTweenRef.current.kill()
    }
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }

  const handleOpenSelectedNode = () => {
    if (selectedNode) onNodeClick?.(selectedNode)
  }

  const handleShowSelectedDetails = () => {
    setRelatedNodeIds([])
  }

  const handleFindSelectedRelated = () => {
    if (!selectedNode) return
    const relatedIds = edges.reduce<string[]>(
      (ids, edge) => {
        if (edge.source === selectedNode.id) ids.push(edge.target)
        if (edge.target === selectedNode.id) ids.push(edge.source)
        return ids
      },
      [selectedNode.id],
    )
    setRelatedNodeIds([...new Set(relatedIds)])
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full max-w-full overflow-hidden select-none"
      style={{ height }}
    >
      {/* 悬浮控制栏 */}
      <div
        ref={controlBarRef}
        className="absolute top-2.5 inset-x-2.5 z-10 flex flex-wrap items-center gap-2.5 rounded-xl border border-border bg-card/90 backdrop-blur-xl px-3 py-2 text-xs shadow-xl text-card-foreground"
      >
        {/* 缩放控制 */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-muted-foreground font-medium">{t('graph.zoomLabel')}</span>
          <div className="w-20">
            <Slider
              value={[zoom]}
              min={0.3}
              max={3}
              step={0.1}
              onValueChange={(vals) => setZoom(vals[0])}
              aria-label={t('graph.zoomLabel')}
            />
          </div>
          <span className="w-9 font-mono text-[11px] text-foreground text-right">{Math.round(zoom * 100)}%</span>
        </div>

        <div className="h-4 w-px bg-border hidden sm:block" />

        {/* 布局模式 */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-muted-foreground font-medium">{t('graph.layoutLabel')}</span>
          <Select value={layoutMode} onValueChange={(v) => setLayoutMode(v as 'radial' | 'grid')}>
            <SelectTrigger className="h-7 w-24 bg-background border-border text-foreground text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-border bg-popover text-popover-foreground">
              <SelectItem value="radial" className="text-xs">{t('graph.radial')}</SelectItem>
              <SelectItem value="grid" className="text-xs">{t('graph.grid')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="h-4 w-px bg-border hidden sm:block" />

        {/* 聚类筛选 */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-muted-foreground font-medium">{t('graph.clusterLabel')}</span>
          <Select value={selectedCluster || 'ALL'} onValueChange={(v) => setSelectedCluster(v === 'ALL' ? null : v)}>
            <SelectTrigger className="h-7 w-28 bg-background border-border text-foreground text-xs truncate">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-border bg-popover text-popover-foreground max-h-56">
              <SelectItem value="ALL" className="text-xs">{t('graph.allClusters')}</SelectItem>
              {clusters.map((c) => (
                <SelectItem key={c.id} value={c.id} className="text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                    <span className="truncate">{c.label} ({c.nodeCount})</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="h-4 w-px bg-border hidden sm:block" />

        {/* 标签开关 */}
        <div className="flex items-center gap-2 shrink-0">
          <Switch
            id="graph-labels-toggle"
            checked={showLabels}
            onCheckedChange={setShowLabels}
          />
          <label htmlFor="graph-labels-toggle" className="text-xs text-foreground cursor-pointer">
            {t('graph.labels')}
          </label>
        </div>

        {/* 搜索 */}
        <div className="flex items-center gap-1.5 min-w-0 flex-1 sm:max-w-44 ml-auto">
          <div className="relative w-full">
            <Search size={12} className="absolute left-2.5 top-2 text-muted-foreground" />
            <Input
              type="text"
              placeholder={t('graph.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-7 pl-7 bg-background border-border text-foreground text-xs placeholder:text-muted-foreground w-full"
            />
          </div>
        </div>

        {/* 重置视图 */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={handleResetView}
                aria-label={t('graph.resetView')}
                className="flex size-7 items-center justify-center rounded-md border border-border bg-secondary/50 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground shrink-0"
              >
                <RotateCcw size={13} />
              </button>
            </TooltipTrigger>
            <TooltipContent className="text-xs border-border bg-popover text-popover-foreground">
              {t('graph.resetView')}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* 图谱画布 */}
      <div role="group" className="w-full outline-none">
        <span id="graph-canvas-status" aria-live="polite" className="sr-only">
          {selectedNode ? t('graph.selectedNode', { label: selectedNode.label }) : t('graph.noSelectedNode')}
        </span>
        <span id="graph-canvas-help" className="sr-only">
          {t('graph.canvasHelp')}
        </span>

        {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */}
        <div
          role="application"
          aria-label={t('graph.canvasLabel')}
          aria-describedby="graph-canvas-help graph-canvas-status"
          tabIndex={0}
          onKeyDown={handleCanvasKeyDown}
          style={{ outline: 'none' }}
        >
          <canvas
            ref={canvasRef}
            aria-hidden="true"
            tabIndex={-1}
            width={width}
            height={height}
            className="rounded-lg bg-background border border-border"
            style={{ cursor }}
            onMouseMove={handleMouseMove}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onClick={handleClick}
            onContextMenu={handleContextMenu}
          />
        </div>

        <ul aria-label={t('graph.nodeList')} className="sr-only">
          {layoutNodes.map((node) => {
            const linkCount = filteredEdges.filter((edge) => edge.source === node.id || edge.target === node.id).length
            const tags = node.tags?.length ? node.tags.join(', ') : t('graph.noTags')
            return (
              <li key={node.id}>
                <button
                  type="button"
                  aria-pressed={selectedNode?.id === node.id}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      setSelectedNode(node)
                      setRelatedNodeIds([])
                    }
                  }}
                  onClick={() => {
                    setSelectedNode(node)
                    setRelatedNodeIds([])
                  }}
                >
                  {node.label}
                </button>
                <span>{` ${node.type || t('graph.unknownType')}; ${tags}; ${linkCount} ${t('graph.links')}`}</span>
              </li>
            )
          })}
        </ul>
      </div>

      {/* 单节点提示 */}
      {layoutNodes.length < 2 && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 px-3 py-1.5 z-10 rounded-lg bg-card border border-border text-muted-foreground text-xs shadow-md">
          {t('graph.singleNodeHint')}
        </div>
      )}

      {/* 图例 */}
      <div
        ref={legendRef}
        className="absolute bottom-3 left-3 z-10 rounded-xl border border-border bg-card/92 backdrop-blur-md p-2.5 text-xs text-card-foreground shadow-xl max-w-sm"
      >
        <div className="font-semibold text-foreground mb-1.5">{t('graph.clusters')}:</div>
        <div className="flex flex-wrap gap-1">
          {clusters.slice(0, 6).map((c) => {
            const isSelected = selectedCluster === c.id
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedCluster(isSelected ? null : c.id)}
                className={cn(
                  'flex items-center gap-1 px-2 py-0.5 rounded text-[10px] transition-all border',
                  isSelected
                    ? 'border-primary/50 text-foreground font-medium shadow-sm'
                    : 'border-border text-muted-foreground hover:border-primary/30',
                )}
                style={{ backgroundColor: `${c.color}25` }}
              >
                <span className="size-1.5 rounded-full" style={{ backgroundColor: c.color }} />
                <span>{c.label}</span>
              </button>
            )
          })}
          {clusters.length > 6 && (
            <span className="text-[10px] text-muted-foreground self-center ml-1">
              +{clusters.length - 6} more
            </span>
          )}
        </div>
      </div>

      {/* 节点详情面板 */}
      {selectedNode && (
        <div
          ref={detailPanelRef}
          className="absolute top-16 right-3 z-10 w-56 rounded-xl border border-border bg-card/95 backdrop-blur-md p-3 text-card-foreground shadow-xl space-y-2"
        >
          <div>
            <div className="text-xs font-semibold text-foreground truncate">{selectedNode.label}</div>
            <div className="text-[10px] text-muted-foreground font-mono truncate">{selectedNode.id}</div>
          </div>
          {(selectedNode.tags || []).length > 0 && (
            <div className="flex flex-wrap gap-1">
              {(selectedNode.tags || []).map((tag: string) => (
                <span
                  key={tag}
                  className="rounded bg-secondary border border-border px-1.5 py-0.5 text-[10px] text-foreground"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
          <div className="flex flex-col gap-1.5 pt-1 border-t border-border">
            <Button
              size="sm"
              variant="accent"
              onClick={handleOpenSelectedNode}
              disabled={!selectedNode.filePath}
              className="h-6 text-[11px] w-full"
            >
              {t('graph.openNote')}
            </Button>
            <div className="flex gap-1.5">
              <Button
                size="sm"
                variant="secondary"
                onClick={handleShowSelectedDetails}
                className="h-6 text-[11px] flex-1"
              >
                {t('graph.viewDetails')}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={handleFindSelectedRelated}
                className="h-6 text-[11px] flex-1"
              >
                {t('graph.findRelated')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 右键菜单 */}
      {contextMenu && (
        <div
          className="fixed z-50 min-w-36 rounded-lg border border-border bg-popover p-1 text-xs text-popover-foreground shadow-2xl backdrop-blur-md"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="flex w-full items-center px-2.5 py-1.5 rounded text-left hover:bg-accent hover:text-accent-foreground transition-colors"
            onClick={() => {
              onNodeClick?.(contextMenu.node)
              setContextMenu(null)
            }}
          >
            {t('graph.openNote')}
          </button>
          <button
            type="button"
            className="flex w-full items-center px-2.5 py-1.5 rounded text-left hover:bg-accent hover:text-accent-foreground transition-colors"
            onClick={() => {
              setSelectedNode(contextMenu.node)
              setRelatedNodeIds([])
              setContextMenu(null)
            }}
          >
            {t('graph.viewDetails')}
          </button>
          <button
            type="button"
            className="flex w-full items-center px-2.5 py-1.5 rounded text-left hover:bg-accent hover:text-accent-foreground transition-colors"
            onClick={() => {
              const nodeId = contextMenu.node.id
              const relatedIds = edges.reduce<string[]>(
                (ids, edge) => {
                  if (edge.source === nodeId) ids.push(edge.target)
                  if (edge.target === nodeId) ids.push(edge.source)
                  return ids
                },
                [nodeId],
              )
              setSelectedNode(contextMenu.node)
              setRelatedNodeIds([...new Set(relatedIds)])
              setContextMenu(null)
            }}
          >
            {t('graph.findRelated')}
          </button>
        </div>
      )}
    </div>
  )
}

export default EnhancedGraphView
