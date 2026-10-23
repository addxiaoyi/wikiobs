/**
 * ForceGraphCanvas.tsx
 * High-performance HTML5 Canvas 2D Force-Directed Knowledge Graph engine.
 * Powered by D3 force physics, collision separation, particle flow animation,
 * interactive pointer dragging with velocity relaxation, and Retina DPI scaling.
 */

/* eslint-disable func-names -- D3 and animation callback patterns */

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import * as d3 from 'd3'
import {
  GraphNode,
  GraphLink,
  GraphPhysicsConfig,
  GraphDisplayConfig,
  FlowParticle,
  GraphTransform,
  ForceGraphCanvasProps,
  DEFAULT_PHYSICS_CONFIG,
  DEFAULT_DISPLAY_CONFIG,
} from './graph-types'
import {
  getGraphThemePalette,
  getNodeColor,
  calculateNodeRadius,
  OBSIDIAN_DARK_PALETTE,
  OBSIDIAN_LIGHT_PALETTE,
} from './graph-colors'

export const ForceGraphCanvas: React.FC<ForceGraphCanvasProps> = ({
  nodes,
  links,
  physicsConfig: customPhysics,
  displayConfig: customDisplay,
  theme: explicitTheme,
  onNodeClick,
  onNodeDoubleClick,
  onNodeHover,
  onCanvasClick,
  selectedNodeId,
  highlightedNodeIds,
  className = '',
  width: propWidth,
  height: propHeight,
  resetCameraRef,
  reheatRef,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Merged physics and display configs
  const physics = useMemo(
    () => ({ ...DEFAULT_PHYSICS_CONFIG, ...customPhysics }),
    [customPhysics],
  )
  const display = useMemo(
    () => ({ ...DEFAULT_DISPLAY_CONFIG, ...customDisplay }),
    [customDisplay],
  )

  // Active theme tracking with DOM fallback and mutation observer
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

  const palette = useMemo(() => getGraphThemePalette(activeTheme), [activeTheme])

  // Canvas viewport dimensions
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: propWidth || 800,
    height: propHeight || 600,
  })

  // ResizeObserver for responsive layout
  useEffect(() => {
    if (propWidth && propHeight) {
      setDimensions({ width: propWidth, height: propHeight })
      return
    }
    const container = containerRef.current
    if (!container) return

    const updateSize = () => {
      const rect = container.getBoundingClientRect()
      if (rect.width > 0 && rect.height > 0) {
        setDimensions({
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        })
      }
    }

    updateSize()
    const ro = new ResizeObserver(updateSize)
    ro.observe(container)
    return () => ro.disconnect()
  }, [propWidth, propHeight])

  // Canvas pan & zoom transform
  const [transform, setTransform] = useState<GraphTransform>({ x: 0, y: 0, k: 1 })
  const transformRef = useRef<GraphTransform>(transform)
  transformRef.current = transform

  // Simulation and animation references
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphLink> | null>(null)
  const animFrameIdRef = useRef<number | null>(null)
  const simNodesRef = useRef<GraphNode[]>([])
  const simLinksRef = useRef<GraphLink[]>([])
  const particlesRef = useRef<FlowParticle[]>([])
  const hoveredNodeRef = useRef<GraphNode | null>(null)

  // Drag state reference
  const dragStateRef = useRef<{
    isDown: boolean
    node: GraphNode | null
    startX: number
    startY: number
    lastWorldX: number
    lastWorldY: number
    dragVx: number
    dragVy: number
    moved: boolean
    lastClientX: number
    lastClientY: number
  } | null>(null)

  // Convert highlightedNodeIds to a Set
  const highlightSet = useMemo(() => {
    if (!highlightedNodeIds) return new Set<string>()
    return highlightedNodeIds instanceof Set
      ? highlightedNodeIds
      : new Set(highlightedNodeIds)
  }, [highlightedNodeIds])

  // Search match set
  const searchMatchSet = useMemo(() => {
    const q = display.searchQuery.trim().toLowerCase()
    if (!q) return new Set<string>()
    const set = new Set<string>()
    nodes.forEach((n) => {
      const name = (n.name || n.label || n.id).toLowerCase()
      const filePath = (n.filePath || '').toLowerCase()
      const tags = (n.tags || []).map((t) => t.toLowerCase())
      if (
        name.includes(q) ||
        filePath.includes(q) ||
        tags.some((t) => t.includes(q))
      ) {
        set.add(n.id)
      }
    })
    return set
  }, [nodes, display.searchQuery])

  // Reset Camera action
  const resetCamera = useCallback(() => {
    const { width, height } = dimensions
    if (simNodesRef.current.length === 0) {
      setTransform({ x: 0, y: 0, k: 1 })
      return
    }

    // Calculate bounding box of all active nodes
    let minX = Infinity
    let maxX = -Infinity
    let minY = Infinity
    let maxY = -Infinity

    simNodesRef.current.forEach((n) => {
      if (typeof n.x === 'number' && typeof n.y === 'number') {
        minX = Math.min(minX, n.x)
        maxX = Math.max(maxX, n.x)
        minY = Math.min(minY, n.y)
        maxY = Math.max(maxY, n.y)
      }
    })

    if (!Number.isFinite(minX)) {
      setTransform({ x: width / 2, y: height / 2, k: 1 })
      return
    }

    const bboxW = Math.max(100, maxX - minX + 120)
    const bboxH = Math.max(100, maxY - minY + 120)
    const scale = Math.max(0.2, Math.min(1.8, Math.min(width / bboxW, height / bboxH)))
    const centerX = (minX + maxX) / 2
    const centerY = (minY + maxY) / 2

    setTransform({
      x: width / 2 - centerX * scale,
      y: height / 2 - centerY * scale,
      k: scale,
    })
  }, [dimensions])

  // Reheat action
  const reheatSimulation = useCallback(() => {
    if (simulationRef.current) {
      simulationRef.current.alpha(0.35).restart()
    }
  }, [])

  // Expose reset and reheat refs to parent
  useEffect(() => {
    if (resetCameraRef) resetCameraRef.current = resetCamera
    if (reheatRef) reheatRef.current = reheatSimulation
  }, [resetCamera, reheatSimulation, resetCameraRef, reheatRef])

  // -------------------------------------------------------------
  // Data Pipeline & Force Simulation Initialization
  // -------------------------------------------------------------
  useEffect(() => {
    const { width, height } = dimensions
    if (width <= 0 || height <= 0) return

    // Calculate node degree (inDegree + outDegree)
    const degreeMap = new Map<string, { in: number; out: number }>()
    nodes.forEach((n) => degreeMap.set(n.id, { in: 0, out: 0 }))

    links.forEach((l) => {
      const sId = typeof l.source === 'object' ? l.source.id : l.source
      const tId = typeof l.target === 'object' ? l.target.id : l.target
      const sDeg = degreeMap.get(sId)
      if (sDeg) sDeg.out += 1
      const tDeg = degreeMap.get(tId)
      if (tDeg) tDeg.in += 1
    })

    // Preserve existing node positions across re-renders
    const prevPosMap = new Map<string, { x?: number; y?: number; vx?: number; vy?: number }>()
    simNodesRef.current.forEach((n) => {
      prevPosMap.set(n.id, { x: n.x, y: n.y, vx: n.vx, vy: n.vy })
    })

    // Filter nodes by display options
    const filteredNodes = nodes.filter((n) => {
      const isTag = n.isTag || n.type === 'tag'
      if (!display.showTags && isTag) return false
      const degInfo = degreeMap.get(n.id) || { in: 0, out: 0 }
      const totalDegree = degInfo.in + degInfo.out
      const isOrphan = totalDegree === 0
      if (!display.showOrphans && isOrphan) return false
      return true
    })

    const filteredNodeIds = new Set(filteredNodes.map((n) => n.id))

    // Prepare simulation nodes
    const simNodes: GraphNode[] = filteredNodes.map((n) => {
      const degInfo = degreeMap.get(n.id) || { in: 0, out: 0 }
      const totalDegree = degInfo.in + degInfo.out
      const prev = prevPosMap.get(n.id)
      const radius = calculateNodeRadius(totalDegree)

      // Fallback directory extraction if group not present
      let group = n.group
      if (!group && n.filePath) {
        const parts = n.filePath.replace(/\\/g, '/').split('/')
        if (parts.length > 1) group = parts[0]
      }

      return {
        ...n,
        inDegree: degInfo.in,
        outDegree: degInfo.out,
        degree: totalDegree,
        isOrphan: totalDegree === 0,
        radius,
        group,
        x: prev?.x ?? (width / 2 + (Math.random() - 0.5) * Math.min(width, 240)),
        y: prev?.y ?? (height / 2 + (Math.random() - 0.5) * Math.min(height, 240)),
        vx: prev?.vx ?? 0,
        vy: prev?.vy ?? 0,
      }
    })

    // Prepare simulation links (only between currently visible nodes)
    const simLinks: GraphLink[] = links
      .filter((l) => {
        const sId = typeof l.source === 'object' ? l.source.id : l.source
        const tId = typeof l.target === 'object' ? l.target.id : l.target
        return filteredNodeIds.has(sId) && filteredNodeIds.has(tId)
      })
      .map((l) => ({
        ...l,
        source: typeof l.source === 'object' ? l.source.id : l.source,
        target: typeof l.target === 'object' ? l.target.id : l.target,
      }))

    simNodesRef.current = simNodes
    simLinksRef.current = simLinks

    // Initialize or re-populate particle animation pool
    const particleCount = Math.min(60, Math.max(16, simLinks.length * 2))
    const particles: FlowParticle[] = []
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        id: i,
        linkIndex: Math.floor(Math.random() * Math.max(1, simLinks.length)),
        progress: Math.random(),
        speed: 0.004 + Math.random() * 0.008,
        size: 1.8 + Math.random() * 1.2,
      })
    }
    particlesRef.current = particles

    // Stop previous simulation
    if (simulationRef.current) {
      simulationRef.current.stop()
    }

    // Create D3 Force Simulation
    const simulation = d3
      .forceSimulation<GraphNode>(simNodes)
      .force(
        'link',
        d3
          .forceLink<GraphNode, GraphLink>(simLinks)
          .id((d) => d.id)
          .distance(physics.linkDistance)
          .strength(0.35),
      )
      .force(
        'charge',
        d3
          .forceManyBody<GraphNode>()
          .strength(physics.repelForce)
          .distanceMax(700),
      )
      .force(
        'collision',
        d3
          .forceCollide<GraphNode>()
          .radius((d) => (d.radius || 6) + physics.collisionMargin)
          .iterations(2),
      )
      .force('center', d3.forceCenter(width / 2, height / 2).strength(0.04))
      .force('x', d3.forceX(width / 2).strength(physics.centerPull))
      .force('y', d3.forceY(height / 2).strength(physics.centerPull))
      .velocityDecay(0.35)

    simulationRef.current = simulation

    // Warm up initial layout if brand new
    if (prevPosMap.size === 0) {
      simulation.alpha(1).restart()
      // Center camera on first load
      resetCamera()
    } else {
      simulation.alpha(0.2).restart()
    }

    return () => {
      simulation.stop()
    }
  }, [nodes, links, display.showTags, display.showOrphans, dimensions])

  // -------------------------------------------------------------
  // Live Physics Parameters Dynamic Tuning
  // -------------------------------------------------------------
  useEffect(() => {
    const sim = simulationRef.current
    if (!sim) return

    const linkForce = sim.force<d3.ForceLink<GraphNode, GraphLink>>('link')
    if (linkForce) linkForce.distance(physics.linkDistance)

    const chargeForce = sim.force<d3.ForceManyBody<GraphNode>>('charge')
    if (chargeForce) chargeForce.strength(physics.repelForce)

    const collisionForce = sim.force<d3.ForceCollide<GraphNode>>('collision')
    if (collisionForce) {
      collisionForce.radius((d) => (d.radius || 6) + physics.collisionMargin)
    }

    const xForce = sim.force<d3.ForceX<GraphNode>>('x')
    const yForce = sim.force<d3.ForceY<GraphNode>>('y')
    if (xForce) xForce.strength(physics.centerPull)
    if (yForce) yForce.strength(physics.centerPull)

    sim.alpha(0.25).restart()
  }, [physics])

  // -------------------------------------------------------------
  // High-Performance 60fps Continuous Canvas Render Loop
  // -------------------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) return

    const { width, height } = dimensions
    if (width <= 0 || height <= 0) return

    // Retina / High-DPI scaling
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
    canvas.width = Math.round(width * dpr)
    canvas.height = Math.round(height * dpr)
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`

    let isMounted = true

    const renderFrame = () => {
      if (!isMounted) return

      const curTransform = transformRef.current
      const curNodes = simNodesRef.current
      const curLinks = simLinksRef.current
      const hoveredNode = hoveredNodeRef.current
      const isSearchActive = searchMatchSet.size > 0

      // Compute hovered node's connected set
      let hoveredNeighborIds: Set<string> | null = null
      let hoveredLinkSet: Set<GraphLink> | null = null

      if (hoveredNode) {
        hoveredNeighborIds = new Set<string>([hoveredNode.id])
        hoveredLinkSet = new Set<GraphLink>()
        curLinks.forEach((l) => {
          const s = l.source as GraphNode
          const t = l.target as GraphNode
          if (s.id === hoveredNode.id) {
            hoveredNeighborIds?.add(t.id)
            hoveredLinkSet?.add(l)
          } else if (t.id === hoveredNode.id) {
            hoveredNeighborIds?.add(s.id)
            hoveredLinkSet?.add(l)
          }
        })
      }

      // 1. Clear background
      ctx.save()
      ctx.scale(dpr, dpr)
      ctx.fillStyle = palette.background
      ctx.fillRect(0, 0, width, height)

      // 2. Apply camera viewport transform
      ctx.save()
      ctx.translate(curTransform.x, curTransform.y)
      ctx.scale(curTransform.k, curTransform.k)

      // 3. Render Links
      curLinks.forEach((link) => {
        const s = link.source as GraphNode
        const t = link.target as GraphNode
        if (!s || !t || typeof s.x !== 'number' || typeof t.x !== 'number') return

        const isHoverConnected = hoveredLinkSet?.has(link)
        const isSearchConnected =
          isSearchActive && searchMatchSet.has(s.id) && searchMatchSet.has(t.id)

        ctx.beginPath()
        ctx.moveTo(s.x, s.y || 0)
        ctx.lineTo(t.x, t.y || 0)

        if (hoveredNode) {
          if (isHoverConnected) {
            ctx.strokeStyle = palette.linkHover
            ctx.lineWidth = 2.2 / curTransform.k
            ctx.globalAlpha = 0.95
          } else {
            ctx.strokeStyle = palette.linkDimmed
            ctx.lineWidth = 1.0 / curTransform.k
            ctx.globalAlpha = 0.04
          }
        } else if (isSearchActive) {
          if (isSearchConnected) {
            ctx.strokeStyle = palette.linkActive
            ctx.lineWidth = 2.0 / curTransform.k
            ctx.globalAlpha = 0.85
          } else {
            ctx.strokeStyle = palette.linkDimmed
            ctx.lineWidth = 0.8 / curTransform.k
            ctx.globalAlpha = 0.05
          }
        } else {
          ctx.strokeStyle = palette.linkDefault
          ctx.lineWidth = 1.2 / curTransform.k
          ctx.globalAlpha = 0.65
        }
        ctx.stroke()
      })

      // 4. Render Particle Animation Pool along links
      if (display.showParticles && curLinks.length > 0) {
        const particles = particlesRef.current
        particles.forEach((p) => {
          // If a node is hovered, bias particles along connected links
          let link = curLinks[p.linkIndex % curLinks.length]
          if (hoveredLinkSet && hoveredLinkSet.size > 0 && Math.random() < 0.7) {
            const connectedArr = Array.from(hoveredLinkSet)
            link = connectedArr[p.id % connectedArr.length]
          }

          if (!link) return
          const s = link.source as GraphNode
          const t = link.target as GraphNode
          if (!s || !t || typeof s.x !== 'number' || typeof t.x !== 'number') return

          // Advance particle progress
          p.progress += p.speed
          if (p.progress >= 1) {
            p.progress = 0
            p.linkIndex = Math.floor(Math.random() * curLinks.length)
          }

          const px = s.x + ((t.x || 0) - s.x) * p.progress
          const py = (s.y || 0) + ((t.y || 0) - (s.y || 0)) * p.progress

          ctx.beginPath()
          ctx.arc(px, py, (p.size || 2.2) / Math.sqrt(curTransform.k), 0, Math.PI * 2)
          ctx.fillStyle = palette.particleColor
          ctx.globalAlpha = 0.85
          ctx.fill()
        })
      }

      // 5. Render Nodes
      curNodes.forEach((node) => {
        if (typeof node.x !== 'number' || typeof node.y !== 'number') return

        const isHovered = hoveredNode?.id === node.id
        const isNeighbor = hoveredNeighborIds?.has(node.id)
        const isSelected = selectedNodeId === node.id
        const isSearchMatch = isSearchActive && searchMatchSet.has(node.id)
        const isManualHighlight = highlightSet.has(node.id)

        // Compute opacity based on selection / hover / search
        let alpha = 1.0
        if (hoveredNode) {
          alpha = isHovered || isNeighbor ? 1.0 : 0.12
        } else if (isSearchActive) {
          alpha = isSearchMatch ? 1.0 : 0.15
        } else if (highlightSet.size > 0) {
          alpha = isManualHighlight ? 1.0 : 0.2
        }

        ctx.globalAlpha = alpha
        const r = node.radius || 6

        // Search match active pulse ring
        if (isSearchMatch) {
          ctx.beginPath()
          ctx.arc(node.x, node.y, r + 4, 0, Math.PI * 2)
          ctx.strokeStyle = palette.searchMatchRing
          ctx.lineWidth = 2.4 / curTransform.k
          ctx.stroke()
        }

        // Selected or hovered outer ring
        if (isSelected || isHovered) {
          ctx.beginPath()
          ctx.arc(node.x, node.y, r + 3, 0, Math.PI * 2)
          ctx.strokeStyle = palette.nodeHoverStroke
          ctx.lineWidth = 2.0 / curTransform.k
          ctx.stroke()
        }

        // Node main fill
        ctx.beginPath()
        ctx.arc(node.x, node.y, r, 0, Math.PI * 2)
        ctx.fillStyle = getNodeColor(node, activeTheme)
        ctx.fill()

        // Node perimeter stroke
        ctx.strokeStyle = palette.nodeDefaultStroke
        ctx.lineWidth = 1.4 / curTransform.k
        ctx.stroke()
      })

      // 6. Render Text Labels (with background halo for maximum legibility)
      if (display.showLabels) {
        ctx.font = '500 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'

        curNodes.forEach((node) => {
          if (typeof node.x !== 'number' || typeof node.y !== 'number') return

          const isHovered = hoveredNode?.id === node.id
          const isNeighbor = hoveredNeighborIds?.has(node.id)
          const isSelected = selectedNodeId === node.id
          const isSearchMatch = isSearchActive && searchMatchSet.has(node.id)

          // Level of detail label culling
          let shouldDrawLabel = false
          if (isHovered || isNeighbor || isSelected || isSearchMatch) {
            shouldDrawLabel = true
          } else if (curTransform.k >= 0.8) {
            shouldDrawLabel = true
          } else if (curTransform.k >= 0.45) {
            shouldDrawLabel = (node.degree || 0) >= 2
          } else {
            shouldDrawLabel = (node.degree || 0) >= 5
          }

          if (!shouldDrawLabel) return

          let alpha = 1.0
          if (hoveredNode) {
            alpha = isHovered || isNeighbor ? 1.0 : 0.15
          } else if (isSearchActive) {
            alpha = isSearchMatch ? 1.0 : 0.15
          }
          ctx.globalAlpha = alpha

          const labelText = node.name || node.label || node.id
          const textY = node.y + (node.radius || 6) + 3.5

          // Halo background stroke to guarantee zero overlap text bleed
          ctx.strokeStyle = palette.textHalo
          ctx.lineWidth = 3.6 / curTransform.k
          ctx.lineJoin = 'round'
          ctx.strokeText(labelText, node.x, textY)

          // Crisp foreground text
          ctx.fillStyle = alpha < 0.4 ? palette.textDimmed : palette.textFill
          ctx.fillText(labelText, node.x, textY)
        })
      }

      ctx.restore() // restore world transform
      ctx.restore() // restore dpr scale

      // Schedule next frame
      animFrameIdRef.current = requestAnimationFrame(renderFrame)
    }

    animFrameIdRef.current = requestAnimationFrame(renderFrame)

    return () => {
      isMounted = false
      if (animFrameIdRef.current !== null) {
        cancelAnimationFrame(animFrameIdRef.current)
        animFrameIdRef.current = null
      }
    }
  }, [dimensions, palette, activeTheme, display, searchMatchSet, highlightSet, selectedNodeId])

  // -------------------------------------------------------------
  // Pointer Hit-Testing & Interactive Dragging with Velocity Relaxation
  // -------------------------------------------------------------
  const findNodeAtScreenCoords = useCallback(
    (clientX: number, clientY: number): GraphNode | null => {
      const canvas = canvasRef.current
      if (!canvas) return null
      const rect = canvas.getBoundingClientRect()
      const curTransform = transformRef.current

      const mouseX = clientX - rect.left
      const mouseY = clientY - rect.top
      const worldX = (mouseX - curTransform.x) / curTransform.k
      const worldY = (mouseY - curTransform.y) / curTransform.k

      const curNodes = simNodesRef.current
      // Iterate in reverse so topmost rendered nodes are hit first
      for (let i = curNodes.length - 1; i >= 0; i--) {
        const node = curNodes[i]
        if (typeof node.x !== 'number' || typeof node.y !== 'number') continue
        const r = (node.radius || 6) + 4 // generous 4px hit margin
        const dx = node.x - worldX
        const dy = node.y - worldY
        if (dx * dx + dy * dy <= r * r) {
          return node
        }
      }
      return null
    },
    [],
  )

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // Only handle primary button (left click)
    if (e.button !== 0) return
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.setPointerCapture(e.pointerId)
    const rect = canvas.getBoundingClientRect()
    const curTransform = transformRef.current
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    const worldX = (mouseX - curTransform.x) / curTransform.k
    const worldY = (mouseY - curTransform.y) / curTransform.k

    const hitNode = findNodeAtScreenCoords(e.clientX, e.clientY)

    dragStateRef.current = {
      isDown: true,
      node: hitNode,
      startX: e.clientX,
      startY: e.clientY,
      lastWorldX: worldX,
      lastWorldY: worldY,
      dragVx: 0,
      dragVy: 0,
      moved: false,
      lastClientX: e.clientX,
      lastClientY: e.clientY,
    }

    if (hitNode) {
      hitNode.fx = hitNode.x
      hitNode.fy = hitNode.y
      if (simulationRef.current) {
        simulationRef.current.alphaTarget(0.3).restart()
      }
    }
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dragState = dragStateRef.current

    if (!dragState || !dragState.isDown) {
      // Hover detection
      const hitNode = findNodeAtScreenCoords(e.clientX, e.clientY)
      if (hoveredNodeRef.current !== hitNode) {
        hoveredNodeRef.current = hitNode
        onNodeHover?.(hitNode)
      }
      canvas.style.cursor = hitNode ? 'pointer' : 'grab'
      return
    }

    // Active drag / pan
    const deltaDist = Math.hypot(e.clientX - dragState.startX, e.clientY - dragState.startY)
    if (deltaDist > 3) {
      dragState.moved = true
    }

    const rect = canvas.getBoundingClientRect()
    const curTransform = transformRef.current
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    const worldX = (mouseX - curTransform.x) / curTransform.k
    const worldY = (mouseY - curTransform.y) / curTransform.k

    if (dragState.node) {
      // Smooth dragging velocity calculation for inertia release
      const instVx = worldX - dragState.lastWorldX
      const instVy = worldY - dragState.lastWorldY
      dragState.dragVx = 0.6 * dragState.dragVx + 0.4 * instVx
      dragState.dragVy = 0.6 * dragState.dragVy + 0.4 * instVy
      dragState.lastWorldX = worldX
      dragState.lastWorldY = worldY

      dragState.node.fx = worldX
      dragState.node.fy = worldY
      canvas.style.cursor = 'grabbing'
    } else {
      // Pan canvas
      const dx = e.clientX - dragState.lastClientX
      const dy = e.clientY - dragState.lastClientY
      dragState.lastClientX = e.clientX
      dragState.lastClientY = e.clientY

      setTransform((prev) => ({
        ...prev,
        x: prev.x + dx,
        y: prev.y + dy,
      }))
      canvas.style.cursor = 'grabbing'
    }
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    try {
      if (canvas.hasPointerCapture(e.pointerId)) {
        canvas.releasePointerCapture(e.pointerId)
      }
    } catch {
      // ignore
    }

    const dragState = dragStateRef.current
    if (!dragState) return

    if (dragState.node) {
      const node = dragState.node
      // Release fixed position constraints
      node.fx = null
      node.fy = null

      // Authentic velocity relaxation and inertia settling:
      // Inject release momentum with smooth damping into node velocity
      node.vx = (dragState.dragVx || 0) * 0.75
      node.vy = (dragState.dragVy || 0) * 0.75

      if (simulationRef.current) {
        simulationRef.current.alphaTarget(0)
      }

      if (!dragState.moved) {
        // Pure click without dragging
        onNodeClick?.(node)
      }
    } else if (!dragState.moved) {
      // Pure click on background
      onCanvasClick?.()
    }

    dragStateRef.current = null
    const hitNode = findNodeAtScreenCoords(e.clientX, e.clientY)
    canvas.style.cursor = hitNode ? 'pointer' : 'grab'
  }

  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const hitNode = findNodeAtScreenCoords(e.clientX, e.clientY)
    if (hitNode) {
      onNodeDoubleClick?.(hitNode)
    }
  }

  // Smooth mouse wheel zoom centered at cursor
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89
    const curTransform = transformRef.current
    const newK = Math.max(0.1, Math.min(6.0, curTransform.k * zoomFactor))

    // Centered zoom calculation
    const worldX = (mouseX - curTransform.x) / curTransform.k
    const worldY = (mouseY - curTransform.y) / curTransform.k

    const newX = mouseX - worldX * newK
    const newY = mouseY - worldY * newK

    setTransform({
      x: newX,
      y: newY,
      k: newK,
    })
  }

  return (
    <div
      ref={containerRef}
      className={`relative size-full overflow-hidden select-none ${className}`}
      style={{ backgroundColor: palette.background }}
    >
      <canvas
        ref={canvasRef}
        className="block size-full touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onDoubleClick={handleDoubleClick}
        onWheel={handleWheel}
      />
    </div>
  )
}
export default ForceGraphCanvas
