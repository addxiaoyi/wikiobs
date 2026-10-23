/**
 * graph-types.ts
 * Type definitions and contracts for WikiOBS Force-Directed Knowledge Graph.
 */

import type * as d3 from 'd3'

/**
 * Node representation in the force graph.
 * Compatible with d3.SimulationNodeDatum.
 */
export interface GraphNode extends d3.SimulationNodeDatum {
  id: string
  name: string
  label?: string
  filePath?: string
  degree?: number
  inDegree?: number
  outDegree?: number
  group?: string // directory or primary tag
  isTag?: boolean
  isOrphan?: boolean
  radius?: number
  color?: string
  tags?: string[]
  type?: string
  aliases?: string[]
  // D3 simulation coordinates
  x?: number
  y?: number
  vx?: number
  vy?: number
  fx?: number | null
  fy?: number | null
}

/**
 * Link representation in the force graph.
 * Compatible with d3.SimulationLinkDatum.
 */
export interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  id?: string
  source: string | GraphNode
  target: string | GraphNode
  value?: number
  weight?: number
  type?: string
}

/**
 * Configurable physical simulation parameters.
 */
export interface GraphPhysicsConfig {
  /** Repulsion strength (ManyBody charge), typically negative e.g. -250 */
  repelForce: number
  /** Preferred spring distance between linked nodes, e.g. 100 */
  linkDistance: number
  /** Gravitational pull toward center, e.g. 0.06 */
  centerPull: number
  /** Safety collision padding added around node radius to prevent overlap, e.g. 8 */
  collisionMargin: number
}

export const DEFAULT_PHYSICS_CONFIG: GraphPhysicsConfig = {
  repelForce: -250,
  linkDistance: 100,
  centerPull: 0.06,
  collisionMargin: 8,
}

/**
 * Visual display & filtering options.
 */
export interface GraphDisplayConfig {
  showTags: boolean
  showOrphans: boolean
  showLabels: boolean
  showParticles: boolean
  searchQuery: string
}

export const DEFAULT_DISPLAY_CONFIG: GraphDisplayConfig = {
  showTags: true,
  showOrphans: true,
  showLabels: true,
  showParticles: false,
  searchQuery: '',
}

/**
 * Particle entity animating along active links.
 */
export interface FlowParticle {
  id: number
  linkIndex: number
  progress: number // 0.0 to 1.0
  speed: number
  color?: string
  size?: number
}

/**
 * 2D Canvas viewport transform (pan & zoom).
 */
export interface GraphTransform {
  x: number
  y: number
  k: number
}

/**
 * Props for ForceGraphCanvas engine.
 */
export interface ForceGraphCanvasProps {
  nodes: GraphNode[]
  links: GraphLink[]
  physicsConfig?: Partial<GraphPhysicsConfig>
  displayConfig?: Partial<GraphDisplayConfig>
  theme?: 'dark' | 'light'
  onNodeClick?: (node: GraphNode) => void
  onNodeDoubleClick?: (node: GraphNode) => void
  onNodeHover?: (node: GraphNode | null) => void
  onCanvasClick?: () => void
  selectedNodeId?: string | null
  highlightedNodeIds?: Set<string> | string[]
  className?: string
  width?: number
  height?: number
  resetCameraRef?: React.MutableRefObject<(() => void) | null>
  reheatRef?: React.MutableRefObject<(() => void) | null>
}

/**
 * Props for GraphHUD floating control pill.
 */
export interface GraphHUDProps {
  physicsConfig: GraphPhysicsConfig
  displayConfig: GraphDisplayConfig
  onPhysicsChange: (newConfig: Partial<GraphPhysicsConfig>) => void
  onDisplayChange: (newConfig: Partial<GraphDisplayConfig>) => void
  matchCount?: number
  totalNodes?: number
  theme?: 'dark' | 'light'
  onResetView?: () => void
  onReheatSimulation?: () => void
  className?: string
}
