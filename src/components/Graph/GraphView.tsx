/**
 * GraphView - 知识图谱可视化组件
 * 使用 D3.js 力导向图展示笔记关系
 * 支持聚类、过滤、搜索功能
 */

/* eslint-disable func-names -- D3 callback names are controlled by the library API. */

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import * as d3 from 'd3'
import { X, ZoomIn, ZoomOut, RotateCcw, Search, Layers } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'

interface GraphNode {
  id: string
  label: string
  type: 'note' | 'person' | 'place' | 'organization' | 'tag' | 'concept'
  x?: number
  y?: number
  fx?: number | null
  fy?: number | null
  tags?: string[]
  linkCount?: number
  cluster?: string
}

interface GraphEdge {
  source: string | GraphNode
  target: string | GraphNode
  type: 'links_to' | 'mentions' | 'belongs_to' | 'related_to'
  weight?: number
}

interface GraphViewProps {
  nodes: GraphNode[]
  edges: GraphEdge[]
  onNodeClick?: (node: GraphNode) => void
  onNodeDoubleClick?: (node: GraphNode) => void
  width?: number
  height?: number
  showControls?: boolean
  showLegend?: boolean
}

type ClusterAlgorithm = 'link' | 'tag' | 'type'

const GraphView: React.FC<GraphViewProps> = ({
  nodes,
  edges,
  onNodeClick,
  onNodeDoubleClick,
  width = 800,
  height = 600,
  showControls = true,
  showLegend = true,
}) => {
  const { t } = useTranslation()
  const svgRef = useRef<SVGSVGElement>(null)
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [filterType, setFilterType] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showClusters, setShowClusters] = useState(false)
  const [clusterAlgorithm, setClusterAlgorithm] = useState<ClusterAlgorithm>('link')

  const colors = useMemo(
    () => ({
      note: '#3b82f6',
      person: '#22c55e',
      place: '#f97316',
      organization: '#ef4444',
      tag: '#a855f7',
      concept: '#06b6d4',
      edge: '#6b7280',
      selected: '#fbbf24',
    }),
    [],
  )

  const clusterColors = useMemo(
    () => [
      '#3b82f6',
      '#22c55e',
      '#f97316',
      '#ef4444',
      '#a855f7',
      '#06b6d4',
      '#ec4899',
      '#84cc16',
      '#14b8a6',
      '#f59e0b',
      '#6366f1',
      '#8b5cf6',
    ],
    [],
  )

  const getClusterColor = useCallback(
    (clusterId?: string): string => {
      if (!clusterId) return '#9ca3af'
      const hash = clusterId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
      return clusterColors[hash % clusterColors.length]
    },
    [clusterColors],
  )

  // 聚类算法
  const clusterByLinks = useCallback((nodesToCluster: GraphNode[], edgeList: GraphEdge[]): Map<string, string> => {
    const nodeNeighbors = new Map<string, Set<string>>()
    nodesToCluster.forEach((n) => nodeNeighbors.set(n.id, new Set()))

    edgeList.forEach((e) => {
      const sourceId = typeof e.source === 'string' ? e.source : e.source.id
      const targetId = typeof e.target === 'string' ? e.target : e.target.id
      nodeNeighbors.get(sourceId)?.add(targetId)
      nodeNeighbors.get(targetId)?.add(sourceId)
    })

    const nodeCluster = new Map<string, string>()
    nodesToCluster.forEach((n, i) => nodeCluster.set(n.id, `cluster-${i}`))

    for (let iter = 0; iter < 3; iter++) {
      nodesToCluster.forEach((node) => {
        const neighbors = nodeNeighbors.get(node.id) || new Set()
        const clusterCounts = new Map<string, number>()

        neighbors.forEach((neighborId) => {
          const neighborCluster = nodeCluster.get(neighborId)
          if (neighborCluster) {
            clusterCounts.set(neighborCluster, (clusterCounts.get(neighborCluster) || 0) + 1)
          }
        })

        let maxCluster = nodeCluster.get(node.id)!
        let maxCount = 0
        clusterCounts.forEach((count, cluster) => {
          if (count > maxCount) {
            maxCount = count
            maxCluster = cluster
          }
        })
        nodeCluster.set(node.id, maxCluster)
      })
    }

    // 合并小聚类
    const clusterSizes = new Map<string, number>()
    nodeCluster.forEach((cluster) => {
      clusterSizes.set(cluster, (clusterSizes.get(cluster) || 0) + 1)
    })

    const finalClusters = new Map<string, string>()
    const smallClusters: string[] = []
    clusterSizes.forEach((size, cluster) => {
      if (size < 3) smallClusters.push(cluster)
      else finalClusters.set(cluster, cluster)
    })

    smallClusters.forEach((sc) => {
      nodeCluster.forEach((cluster, nodeId) => {
        if (cluster === sc) nodeCluster.set(nodeId, 'misc')
      })
      finalClusters.set('misc', 'misc')
    })

    return nodeCluster
  }, [])

  const clusterByTags = useCallback((nodesToCluster: GraphNode[]): Map<string, string> => {
    const nodeCluster = new Map<string, string>()

    nodesToCluster.forEach((node) => {
      if (node.tags && node.tags.length > 0) {
        nodeCluster.set(node.id, `tag:${node.tags[0]}`)
      } else {
        nodeCluster.set(node.id, 'untagged')
      }
    })

    return nodeCluster
  }, [])

  const clusterByType = useCallback((nodesToCluster: GraphNode[]): Map<string, string> => {
    const nodeCluster = new Map<string, string>()
    nodesToCluster.forEach((node) => {
      nodeCluster.set(node.id, `type:${node.type}`)
    })
    return nodeCluster
  }, [])

  // 计算聚类
  const clustering = useMemo(() => {
    if (!showClusters) return new Map<string, string>()

    switch (clusterAlgorithm) {
      case 'link':
        return clusterByLinks(nodes, edges)
      case 'tag':
        return clusterByTags(nodes)
      case 'type':
        return clusterByType(nodes)
      default:
        return new Map()
    }
  }, [showClusters, clusterAlgorithm, nodes, edges, clusterByLinks, clusterByTags, clusterByType])

  // 过滤和准备数据
  const { displayNodes, displayEdges } = useMemo(() => {
    let filtered = nodes.map((n) => ({ ...n, cluster: clustering.get(n.id) }))

    if (filterType) {
      filtered = filtered.filter((n) => n.type === filterType)
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter((n) => n.label.toLowerCase().includes(term))
    }

    const nodeIds = new Set(filtered.map((n) => n.id))
    const filteredEdges = edges.filter(
      (e) =>
        nodeIds.has(typeof e.source === 'string' ? e.source : e.source.id) &&
        nodeIds.has(typeof e.target === 'string' ? e.target : e.target.id),
    )

    return { displayNodes: filtered, displayEdges: filteredEdges }
  }, [nodes, edges, filterType, searchTerm, clustering])

  const drawGraph = useCallback(() => {
    if (!svgRef.current || displayNodes.length === 0) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const container = svg.append('g').attr('class', 'container')

    // 缩放
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        container.attr('transform', event.transform)
      })
    svg.call(zoom)

    // 绘制聚类背景
    if (showClusters) {
      const clusterGroups = new Map<string, GraphNode[]>()
      displayNodes.forEach((n) => {
        const clusterId = n.cluster || 'unclustered'
        const existing = clusterGroups.get(clusterId) || []
        existing.push(n)
        clusterGroups.set(clusterId, existing)
      })

      clusterGroups.forEach((cn, clusterId) => {
        if (cn.length < 2) return
        const cx = cn.reduce((sum, n) => sum + (n.x || width / 2), 0) / cn.length
        const cy = cn.reduce((sum, n) => sum + (n.y || height / 2), 0) / cn.length
        const radius = Math.sqrt(cn.length) * 40 + 30

        container
          .append('circle')
          .attr('cx', cx)
          .attr('cy', cy)
          .attr('r', radius)
          .attr('fill', getClusterColor(clusterId))
          .attr('fill-opacity', 0.1)
          .attr('stroke', getClusterColor(clusterId))
          .attr('stroke-opacity', 0.3)
          .attr('stroke-width', 2)
          .attr('stroke-dasharray', '5,5')
          .attr('pointer-events', 'none')
      })
    }

    // 力导向模拟
    const simulation = d3
      .forceSimulation<GraphNode>(displayNodes)
      .force(
        'link',
        d3
          .forceLink<GraphNode, GraphEdge>(displayEdges)
          .id((d) => d.id)
          .distance(showClusters ? 150 : 100)
          .strength(showClusters ? 0.3 : 0.5),
      )
      .force('charge', d3.forceManyBody().strength(showClusters ? -200 : -300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(30))

    // 边
    const link = container
      .append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(displayEdges)
      .enter()
      .append('line')
      .attr('stroke', colors.edge)
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', (d) => (d.weight || 1) * 2)

    // 节点组
    const nodeGroup = container
      .append('g')
      .attr('class', 'nodes')
      .selectAll<SVGGElement, GraphNode>('g')
      .data(displayNodes)
      .enter()
      .append('g')
      .attr('class', 'node')

    // 拖拽
    const dragBehavior = d3
      .drag<SVGGElement, GraphNode>()
      .on('start', (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart()
        d.fx = d.x
        d.fy = d.y
      })
      .on('drag', (event, d) => {
        d.fx = event.x
        d.fy = event.y
      })
      .on('end', (event, d) => {
        if (!event.active) simulation.alphaTarget(0)
        d.fx = null
        d.fy = null
      })

    nodeGroup.call(dragBehavior as any)

    // 节点形状
    nodeGroup.each(function (d) {
      const el = d3.select(this)
      const nodeColor =
        showClusters && d.cluster ? getClusterColor(d.cluster) : colors[d.type as keyof typeof colors] || colors.note

      if (d.type === 'note') {
        el.append('circle')
          .attr('r', 12 + (d.linkCount || 0) * 2)
          .attr('fill', nodeColor)
          .attr('stroke', '#fff')
          .attr('stroke-width', 2)
      } else if (d.type === 'tag') {
        el.append('path')
          .attr('d', 'M0,-12 L12,0 L0,12 L-12,0 Z')
          .attr('fill', nodeColor)
          .attr('stroke', '#fff')
          .attr('stroke-width', 2)
      } else {
        el.append('rect')
          .attr('x', -10)
          .attr('y', -10)
          .attr('width', 20)
          .attr('height', 20)
          .attr('rx', 3)
          .attr('fill', nodeColor)
          .attr('stroke', '#fff')
          .attr('stroke-width', 2)
      }
    })

    // 标签
    nodeGroup
      .append('text')
      .attr('dy', 25)
      .attr('text-anchor', 'middle')
      .attr('font-size', 10)
      .attr('fill', '#374151')
      .attr('pointer-events', 'none')
      .text((d) => (d.label.length > 15 ? `${d.label.slice(0, 15)}...` : d.label))

    // 交互
    nodeGroup
      .on('click', (event, d) => {
        event.stopPropagation()
        setSelectedNode(d)
        onNodeClick?.(d)
      })
      .on('dblclick', (event, d) => {
        event.stopPropagation()
        onNodeDoubleClick?.(d)
      })
      .on('mouseover', function () {
        d3.select(this).select('circle, rect, path').attr('stroke', colors.selected).attr('stroke-width', 3)
      })
      .on('mouseout', function (event, d) {
        const isSelected = selectedNode?.id === d.id
        d3.select(this)
          .select('circle, rect, path')
          .attr('stroke', isSelected ? colors.selected : '#fff')
          .attr('stroke-width', isSelected ? 3 : 2)
      })

    // 更新位置
    simulation.on('tick', () => {
      link
        .attr('x1', (d) => (d.source as GraphNode).x || 0)
        .attr('y1', (d) => (d.source as GraphNode).y || 0)
        .attr('x2', (d) => (d.target as GraphNode).x || 0)
        .attr('y2', (d) => (d.target as GraphNode).y || 0)

      nodeGroup.attr('transform', (d) => `translate(${d.x || 0},${d.y || 0})`)
    })

    return () => simulation.stop()
  }, [
    displayNodes,
    displayEdges,
    width,
    height,
    showClusters,
    colors,
    selectedNode,
    getClusterColor,
    onNodeClick,
    onNodeDoubleClick,
  ])

  useEffect(() => {
    let cleanup: (() => void) | undefined
    const result = drawGraph()
    if (typeof result === 'function') {
      cleanup = result
    }
    return () => {
      if (cleanup) cleanup()
    }
  }, [drawGraph])

  const handleZoom = (factor: number) => {
    if (!svgRef.current) return
    const svg = d3.select(svgRef.current)
    svg
      .transition()
      .duration(300)
      .call(d3.zoom<SVGSVGElement, unknown>().scaleBy as any, factor)
  }

  const handleReset = () => {
    if (!svgRef.current) return
    const svg = d3.select(svgRef.current)
    svg
      .transition()
      .duration(300)
      .call(d3.zoom<SVGSVGElement, unknown>().transform as any, d3.zoomIdentity)
  }

  return (
    <div className="relative size-full overflow-hidden rounded-lg bg-background">
      <svg ref={svgRef} width={width} height={height} className="size-full" />

      {showControls && (
        <div className="absolute right-4 top-4 flex flex-col gap-2">
          <button
            onClick={() => handleZoom(1.3)}
            className="rounded-lg border border-border bg-card/90 p-2 text-foreground shadow-md backdrop-blur-md transition-colors hover:bg-accent"
            title={t('graph.zoomIn')}
            aria-label={t('graph.zoomIn')}
          >
            <ZoomIn size={18} />
          </button>
          <button
            onClick={() => handleZoom(0.7)}
            className="rounded-lg border border-border bg-card/90 p-2 text-foreground shadow-md backdrop-blur-md transition-colors hover:bg-accent"
            title={t('graph.zoomOut')}
            aria-label={t('graph.zoomOut')}
          >
            <ZoomOut size={18} />
          </button>
          <button
            onClick={handleReset}
            className="rounded-lg border border-border bg-card/90 p-2 text-foreground shadow-md backdrop-blur-md transition-colors hover:bg-accent"
            title={t('graph.resetView')}
            aria-label={t('graph.resetView')}
          >
            <RotateCcw size={18} />
          </button>
          <button
            onClick={() => setShowClusters(!showClusters)}
            className={`rounded-lg border border-border p-2 shadow-md backdrop-blur-md transition-colors ${
              showClusters ? 'bg-[#7b68ee] text-white shadow-sm shadow-[#7b68ee]/30 font-medium' : 'bg-card/90 text-foreground hover:bg-accent'
            }`}
            title={t('graph.toggleClusters')}
            aria-label={t('graph.toggleClusters')}
          >
            <Layers size={18} />
          </button>
        </div>
      )}

      <div className="absolute left-4 top-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="搜索节点..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-48 rounded-lg border border-border bg-card/90 py-2 pl-9 pr-4 text-foreground placeholder:text-muted-foreground shadow-md backdrop-blur-md focus:border-[#7b68ee] focus:outline-none focus:ring-1 focus:ring-[#7b68ee]"
          />
        </div>
      </div>

      {showClusters && (
        <div className="absolute left-1/2 top-16 -translate-x-1/2">
          <div className="flex gap-1 rounded-lg border border-border bg-card/90 p-1 shadow-md backdrop-blur-md">
            {(['link', 'tag', 'type'] as ClusterAlgorithm[]).map((key) => (
              <button
                key={key}
                onClick={() => setClusterAlgorithm(key)}
                className={`rounded px-3 py-1 text-xs transition-colors ${
                  clusterAlgorithm === key ? 'bg-[#7b68ee] text-white font-medium shadow-sm shadow-[#7b68ee]/30' : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                }`}
              >
                By {key.charAt(0).toUpperCase() + key.slice(1)}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="absolute left-1/2 top-4 -translate-x-1/2">
        <div className="flex gap-1 rounded-lg border border-border bg-card/90 p-1 shadow-md backdrop-blur-md">
          {['note', 'person', 'place', 'tag'].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(filterType === type ? null : type)}
              className={`rounded px-3 py-1 text-sm capitalize transition-colors ${
                filterType === type ? 'bg-[#7b68ee] text-white font-medium shadow-sm shadow-[#7b68ee]/30' : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {showLegend && (
        <div className="absolute bottom-4 left-4 rounded-lg border border-border bg-card/90 p-3 shadow-md backdrop-blur-md text-card-foreground">
          <h4 className="mb-2 text-xs font-semibold text-muted-foreground">{t('graph.legend')}</h4>
          <div className="space-y-1">
            {Object.entries(colors)
              .filter(([key]) => key !== 'edge' && key !== 'selected')
              .map(([type, color]) => (
                <div key={type} className="flex items-center gap-2">
                  <div className="size-3 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-xs capitalize">{type}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {selectedNode && (
        <div className="absolute bottom-4 right-4 min-w-48 rounded-lg border border-border bg-card/95 p-4 text-card-foreground shadow-2xl backdrop-blur-xl">
          <div className="mb-2 flex items-start justify-between">
            <h4 className="font-semibold text-foreground">{selectedNode.label}</h4>
            <button
              type="button"
              onClick={() => setSelectedNode(null)}
              className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label={t('button.close')}
            >
              <X size={14} />
            </button>
          </div>
          <div className="space-y-1 text-xs text-muted-foreground">
            <p>
              Type: <span className="capitalize text-foreground">{selectedNode.type}</span>
            </p>
            <p>
              {t('graph.links')}: <span className="text-foreground">{selectedNode.linkCount || 0}</span>
            </p>
            {selectedNode.tags && selectedNode.tags.length > 0 && (
              <p>
                Tags:{' '}
                <span className="text-foreground">
                  {selectedNode.tags
                    .slice(0, 3)
                    .map((tag) => `#${tag}`)
                    .join(', ')}
                </span>
              </p>
            )}
          </div>
        </div>
      )}

      <div className="absolute bottom-4 right-48 rounded-lg border border-border bg-card/80 p-2 text-xs text-muted-foreground shadow-md backdrop-blur-md">
        {displayNodes.length} nodes, {displayEdges.length} edges
      </div>
    </div>
  )
}

export default GraphView
