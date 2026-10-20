import React, { useEffect, useRef, useState, useCallback } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Slider from '@mui/material/Slider'
import Paper from '@mui/material/Paper'
import Chip from '@mui/material/Chip'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import gsap from 'gsap'
import { RotateCcw } from 'lucide-react'

import { Easing, staggerFadeIn, slideInRight } from '@/lib/gsap-animations'
import { useTranslation } from '@/lib/i18n'

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

    clusterMap.forEach((clusterNodes, tag) => {
      clusterList.push({
        id: tag,
        label: tag,
        color: clusterColors[colorIdx % clusterColors.length],
        nodeCount: clusterNodes.length,
      })
      colorIdx++
    })

    setClusters(clusterList)
  }, [nodes, clusterColors])

  useEffect(() => {
    performClustering()
  }, [performClustering])

  // ============================================================
  // GSAP 容器入场动画
  // ============================================================
  useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    const ctx = gsap.context(() => {
      // 画布淡入 + 轻微上移
      const canvasEl = container.querySelector('canvas') as HTMLElement
      if (canvasEl) {
        gsap.fromTo(
          canvasEl,
          { autoAlpha: 0 },
          {
            autoAlpha: 1,
            duration: 0.6,
            ease: Easing.smooth,
            clearProps: 'opacity,visibility,transform',
            overwrite: 'auto',
          },
        )
      }
    }, container)

    return () => ctx.revert()
  }, [])

  // ============================================================
  // GSAP 控制栏入场动画
  // ============================================================
  useEffect(() => {
    if (!controlBarRef.current) return

    const bar = controlBarRef.current
    const ctx = gsap.context(() => {
      gsap.fromTo(
        bar,
        { autoAlpha: 0 },
        {
          autoAlpha: 1,
          duration: 0.5,
          delay: 0.2,
          ease: Easing.smooth,
          clearProps: 'opacity,visibility,transform',
          overwrite: 'auto',
        },
      )

      const controls = bar.querySelectorAll('.MuiFormControl-root, div')
      if (controls.length) {
        staggerFadeIn(controls, 0.3, 0.05, 0.3)
      }
    }, bar)

    return () => ctx.revert()
  }, [])

  // ============================================================
  // GSAP 节点详情面板滑入
  // ============================================================
  useEffect(() => {
    if (selectedNode && detailPanelRef.current) {
      const panel = detailPanelRef.current
      const ctx = gsap.context(() => {
        slideInRight(panel, 0.35, 0)
      }, panel)
      return () => ctx.revert()
    }
  }, [selectedNode])

  // ============================================================
  // GSAP 图例入场
  // ============================================================
  useEffect(() => {
    if (!legendRef.current || clusters.length === 0) return

    const legend = legendRef.current
    const ctx = gsap.context(() => {
      gsap.fromTo(
        legend,
        { autoAlpha: 0 },
        {
          autoAlpha: 1,
          duration: 0.45,
          delay: 0.4,
          ease: Easing.smooth,
          clearProps: 'opacity,visibility,transform',
          overwrite: 'auto',
        },
      )
    }, legend)

    return () => ctx.revert()
  }, [clusters.length])

  // 过滤节点
  const filteredNodes = React.useMemo(() => {
    let result = nodes

    // 按聚类过滤
    if (selectedCluster) {
      result = result.filter((n) => (n.tags || [])[0] === selectedCluster)
    }

    // 按搜索过滤
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (n) =>
          n.label.toLowerCase().includes(query) ||
          (n.tags || []).some((tag: string) => tag.toLowerCase().includes(query)),
      )
    }

    return result
  }, [nodes, selectedCluster, searchQuery])

  // 节点数变化时的数据更新动画
  useEffect(() => {
    if (nodes.length !== prevNodeCountRef.current && containerRef.current) {
      prevNodeCountRef.current = nodes.length

      const canvasEl = containerRef.current.querySelector('canvas') as HTMLElement
      if (canvasEl) {
        const ctx = gsap.context(() => {
          gsap.fromTo(
            canvasEl,
            { autoAlpha: 0.6, scale: 0.98 },
            {
              autoAlpha: 1,
              scale: 1,
              duration: 0.3,
              ease: Easing.smooth,
              clearProps: 'opacity,visibility,transform',
              overwrite: 'auto',
            },
          )
        })
        return () => ctx.revert()
      }
    }
  }, [nodes.length, filteredNodes.length])

  // 过滤边
  const filteredEdges = React.useMemo(() => {
    const nodeIds = new Set(filteredNodes.map((n) => n.id))
    return edges.filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target))
  }, [edges, filteredNodes])

  // 计算节点位置
  const layoutNodes = React.useMemo(() => {
    const padding = 50
    const centerX = width / 2
    const centerY = height / 2
    const radius = Math.max(0, Math.min(width, height) / 2 - padding)

    if (layoutMode === 'grid') {
      const cols = Math.ceil(Math.sqrt(filteredNodes.length))
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
    ctx.strokeStyle = '#94a3b8'
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
            ctx.strokeStyle = '#888'
          } else if (edge.type === 'link') {
            ctx.strokeStyle = '#60a5fa'
          } else if (edge.type === 'mention') {
            ctx.strokeStyle = '#fb923c'
          }

          ctx.stroke()
          ctx.setLineDash([])
          ctx.strokeStyle = '#94a3b8'
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
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 3 / zoom
        ctx.stroke()
      }

      // 节点标签
      if (showLabels) {
        ctx.fillStyle = '#e2e8f0'
        ctx.font = `${Math.max(9 / zoom, 4)}px Arial`
        ctx.textAlign = 'center'
        ctx.fillText(node.label.substring(0, 15), x, y + 18 / zoom)
      }

      // 悬停/选中标签
      if ((isHovered || isSelected) && showLabels) {
        const tags = node.tags || []
        if (tags.length > 0) {
          ctx.fillStyle = '#94a3b8'
          ctx.font = `${Math.max(8 / zoom, 4)}px Arial`
          ctx.fillText(tags.slice(0, 3).join(', '), x, y + 30 / zoom)
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
    <Box ref={containerRef} sx={{ position: 'relative', width: '100%', maxWidth: '100%', height, overflow: 'hidden' }}>
      {/* 控制栏 */}
      <Paper
        ref={controlBarRef}
        sx={{
          position: 'absolute',
          top: 8,
          left: 8,
          right: 8,
          p: 1,
          zIndex: 10,
          display: { xs: 'grid', md: 'flex' },
          gridTemplateColumns: { xs: 'minmax(0, 1fr) minmax(0, 1fr)', md: 'none' },
          gap: 1,
          alignItems: 'center',
          flexWrap: 'wrap',
          '& .MuiFormControl-root': { minWidth: 0, width: { xs: '100%', sm: 'auto' } },
          '& .MuiSlider-root': { minWidth: { xs: 64, sm: 72 }, maxWidth: 100 },
          '& .MuiFormControlLabel-root': { m: 0, minWidth: 0 },
        }}
      >
        {/* 缩放控制 */}
        <Box sx={{ display: 'flex', minWidth: 0, alignItems: 'center', gap: 0.5 }}>
          <Typography variant="caption" sx={{ flexShrink: 0 }}>
            {t('graph.zoomLabel')}
          </Typography>
          <Slider
            value={zoom}
            min={0.3}
            max={3}
            step={0.1}
            onChange={(_, v) => setZoom(v as number)}
            sx={{ width: { xs: 64, sm: 100 } }}
            size="small"
            aria-label={t('graph.zoomLabel')}
          />
          <Typography variant="caption" sx={{ minWidth: 32, flexShrink: 0 }}>
            {Math.round(zoom * 100)}%
          </Typography>
        </Box>

        {/* 布局模式 */}
        <FormControl size="small" sx={{ minWidth: { xs: 88, sm: 100 } }}>
          <InputLabel>{t('graph.layoutLabel')}</InputLabel>
          <Select
            value={layoutMode}
            label={t('graph.layoutLabel')}
            onChange={(e) => setLayoutMode(e.target.value as 'radial' | 'grid')}
          >
            <MenuItem value="radial">{t('graph.radial')}</MenuItem>
            <MenuItem value="grid">{t('graph.grid')}</MenuItem>
          </Select>
        </FormControl>

        {/* 聚类筛选 */}
        <FormControl size="small" sx={{ minWidth: { xs: 104, sm: 120 } }}>
          <InputLabel>{t('graph.clusterLabel')}</InputLabel>
          <Select
            value={selectedCluster || ''}
            label={t('graph.clusterLabel')}
            onChange={(e) => setSelectedCluster(e.target.value || null)}
          >
            <MenuItem value="">{t('graph.allClusters')}</MenuItem>
            {clusters.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box
                    sx={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      bgcolor: c.color,
                    }}
                  />
                  <span>
                    {c.label} ({c.nodeCount})
                  </span>
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* 标签开关 */}
        <FormControlLabel
          control={<Switch size="small" checked={showLabels} onChange={(e) => setShowLabels(e.target.checked)} />}
          label={<Typography variant="caption">{t('graph.labels')}</Typography>}
        />

        {/* 搜索 */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            minWidth: 0,
            gridColumn: { xs: '1 / -1', md: 'auto' },
          }}
        >
          <input
            type="text"
            placeholder={t('graph.searchPlaceholder')}
            aria-label={t('graph.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              padding: '4px 8px',
              border: '1px solid #ccc',
              borderRadius: 4,
              width: 'clamp(120px, 22vw, 150px)',
              minWidth: 0,
              fontSize: 12,
            }}
          />
        </Box>

        {/* 重置视图 */}
        <Tooltip title={t('graph.resetView')}>
          <IconButton size="small" onClick={handleResetView} aria-label={t('graph.resetView')}>
            <RotateCcw size={16} aria-hidden="true" />
          </IconButton>
        </Tooltip>
      </Paper>

      {/* 图谱画布 */}
      <Box role="group" sx={{ width: '100%', outline: 'none' }}>
        <Typography
          id="graph-canvas-status"
          aria-live="polite"
          component="span"
          sx={{
            position: 'absolute',
            width: 1,
            height: 1,
            padding: 0,
            margin: -1,
            overflow: 'hidden',
            clip: 'rect(0, 0, 0, 0)',
            whiteSpace: 'nowrap',
            border: 0,
          }}
        >
          {selectedNode ? t('graph.selectedNode', { label: selectedNode.label }) : t('graph.noSelectedNode')}
        </Typography>
        <Typography
          id="graph-canvas-help"
          component="span"
          sx={{
            position: 'absolute',
            width: 1,
            height: 1,
            padding: 0,
            margin: -1,
            overflow: 'hidden',
            clip: 'rect(0, 0, 0, 0)',
            whiteSpace: 'nowrap',
            border: 0,
          }}
        >
          {t('graph.canvasHelp')}
        </Typography>
        {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */}
        <div
          role="application"
          aria-label={t('graph.canvasLabel')}
          aria-describedby="graph-canvas-help graph-canvas-status"
          // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
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
            style={{
              border: '1px solid #ddd',
              borderRadius: 4,
              cursor,
            }}
            onMouseMove={handleMouseMove}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onClick={handleClick}
            onContextMenu={handleContextMenu}
          />
        </div>
        <Box
          component="ul"
          aria-label={t('graph.nodeList')}
          sx={{
            position: 'absolute',
            width: 1,
            height: 1,
            padding: 0,
            margin: -1,
            overflow: 'hidden',
            clip: 'rect(0, 0, 0, 0)',
            whiteSpace: 'nowrap',
            border: 0,
          }}
        >
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
        </Box>
      </Box>

      {/* 图例 */}
      {layoutNodes.length < 2 && (
        <Paper
          sx={{
            position: 'absolute',
            top: 88,
            left: '50%',
            transform: 'translateX(-50%)',
            px: 1.5,
            py: 0.75,
            zIndex: 9,
            bgcolor: 'rgba(29, 33, 41, 0.86)',
            color: '#94a3b8',
            border: '1px solid rgba(148, 163, 184, 0.14)',
            borderRadius: 2,
          }}
        >
          <Typography variant="caption">{t('graph.singleNodeHint')}</Typography>
        </Paper>
      )}

      <Paper
        ref={legendRef}
        sx={{
          position: 'absolute',
          bottom: 12,
          left: 12,
          p: 1.25,
          zIndex: 10,
          bgcolor: 'rgba(29, 33, 41, 0.92)',
          color: '#e2e8f0',
          border: '1px solid rgba(148, 163, 184, 0.16)',
          borderRadius: 2,
        }}
      >
        <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
          {t('graph.clusters')}:
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
          {clusters.slice(0, 6).map((c) => (
            <Chip
              key={c.id}
              label={c.label}
              size="small"
              sx={{ bgcolor: `${c.color}40`, fontSize: 10, cursor: 'pointer' }}
              onClick={() => setSelectedCluster(selectedCluster === c.id ? null : c.id)}
            />
          ))}
          {clusters.length > 6 && (
            <Typography variant="caption" sx={{ ml: 1 }}>
              +{clusters.length - 6} more
            </Typography>
          )}
        </Box>
      </Paper>

      {/* 节点详情面板 */}
      {selectedNode && (
        <Paper
          ref={detailPanelRef}
          sx={{
            position: 'absolute',
            top: 60,
            right: 8,
            p: 2,
            zIndex: 10,
            maxWidth: 200,
          }}
        >
          <Typography variant="subtitle2">{selectedNode.label}</Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            {selectedNode.id}
          </Typography>
          {(selectedNode.tags || []).length > 0 && (
            <Box sx={{ mt: 1 }}>
              {(selectedNode.tags || []).map((tag: string) => (
                <Chip key={tag} label={tag} size="small" sx={{ mr: 0.5, mb: 0.5 }} />
              ))}
            </Box>
          )}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
            <Button size="small" variant="contained" onClick={handleOpenSelectedNode} disabled={!selectedNode.filePath}>
              {t('graph.openNote')}
            </Button>
            <Button size="small" variant="outlined" onClick={handleShowSelectedDetails}>
              {t('graph.viewDetails')}
            </Button>
            <Button size="small" variant="outlined" onClick={handleFindSelectedRelated}>
              {t('graph.findRelated')}
            </Button>
          </Box>
        </Paper>
      )}

      {/* 右键菜单 */}
      <Menu
        open={!!contextMenu}
        onClose={() => setContextMenu(null)}
        anchorReference="anchorPosition"
        anchorPosition={contextMenu ? { top: contextMenu.y, left: contextMenu.x } : undefined}
      >
        <MenuItem
          onClick={() => {
            onNodeClick?.(contextMenu!.node)
            setContextMenu(null)
          }}
        >
          {t('graph.openNote')}
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (!contextMenu) return
            setSelectedNode(contextMenu.node)
            setRelatedNodeIds([])
            setContextMenu(null)
          }}
        >
          {t('graph.viewDetails')}
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (!contextMenu) return
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
        </MenuItem>
      </Menu>
    </Box>
  )
}

export default EnhancedGraphView
