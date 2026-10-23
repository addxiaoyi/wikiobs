/**
 * graph-colors.ts
 * Monochrome Pure palettes and color mapping utilities for WikiOBS Force Graph.
 * Authentic Obsidian Dark (#0e1015) and Obsidian Light (#ffffff) themes.
 * Zero colorful toy clutter; pure topological minimalism.
 */

export interface GraphThemePalette {
  background: string
  gridDot: string
  nodeDefault: string
  nodeDefaultStroke: string
  nodeHoverStroke: string
  nodeSelectedStroke: string
  linkDefault: string
  linkDimmed: string
  linkActive: string
  linkHover: string
  textFill: string
  textDimmed: string
  textHalo: string
  particleColor: string
  particleGlow: string
  searchMatchRing: string
  tagColor: string
}

export const OBSIDIAN_DARK_PALETTE: GraphThemePalette = {
  background: '#0e1015',
  gridDot: 'rgba(255, 255, 255, 0.025)',
  nodeDefault: '#e4e4e7', // zinc-200, crisp cool silver
  nodeDefaultStroke: 'rgba(255, 255, 255, 0.25)',
  nodeHoverStroke: '#ffffff',
  nodeSelectedStroke: '#ffffff',
  linkDefault: 'rgba(255, 255, 255, 0.08)',
  linkDimmed: 'rgba(255, 255, 255, 0.015)',
  linkActive: 'rgba(255, 255, 255, 0.65)',
  linkHover: 'rgba(255, 255, 255, 0.95)',
  textFill: '#f4f4f5',
  textDimmed: 'rgba(244, 244, 245, 0.15)',
  textHalo: 'rgba(14, 16, 21, 0.95)',
  particleColor: '#e4e4e7',
  particleGlow: 'rgba(255, 255, 255, 0.3)',
  searchMatchRing: '#ffffff',
  tagColor: '#a1a1aa', // zinc-400, muted slate
}

export const OBSIDIAN_LIGHT_PALETTE: GraphThemePalette = {
  background: '#ffffff',
  gridDot: 'rgba(0, 0, 0, 0.025)',
  nodeDefault: '#18181b', // zinc-900, pure deep ink
  nodeDefaultStroke: 'rgba(0, 0, 0, 0.25)',
  nodeHoverStroke: '#000000',
  nodeSelectedStroke: '#000000',
  linkDefault: 'rgba(0, 0, 0, 0.08)',
  linkDimmed: 'rgba(0, 0, 0, 0.015)',
  linkActive: 'rgba(0, 0, 0, 0.65)',
  linkHover: 'rgba(0, 0, 0, 0.95)',
  textFill: '#09090b',
  textDimmed: 'rgba(9, 9, 11, 0.15)',
  textHalo: 'rgba(255, 255, 255, 0.95)',
  particleColor: '#18181b',
  particleGlow: 'rgba(0, 0, 0, 0.25)',
  searchMatchRing: '#09090b',
  tagColor: '#71717a', // zinc-500
}

/**
 * Empty category colors - Monochrome Pure uses uniform node color hierarchy.
 */
export const OBSIDIAN_CATEGORY_COLORS: string[] = []

/**
 * Hash a string into a positive integer.
 */
export function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

/**
 * Get theme palette according to theme mode.
 */
export function getGraphThemePalette(theme: 'dark' | 'light' = 'dark'): GraphThemePalette {
  return theme === 'light' ? OBSIDIAN_LIGHT_PALETTE : OBSIDIAN_DARK_PALETTE
}

/**
 * Determine node color based on tag status, explicit color, or theme default.
 * In Monochrome Pure mode, all normal nodes use the elegant silver/ink monochrome tone.
 */
export function getNodeColor(
  node: { group?: string; isTag?: boolean; color?: string; type?: string },
  theme: 'dark' | 'light' = 'dark',
): string {
  if (node.color) return node.color
  const palette = getGraphThemePalette(theme)

  if (node.isTag || node.type === 'tag') {
    return palette.tagColor
  }

  return palette.nodeDefault
}

/**
 * Calculate dynamic node radius based on connection degree.
 * R = clamp(4.5 + 2.2 * sqrt(degree), 4, 22)
 */
export function calculateNodeRadius(degree: number = 0): number {
  const safeDegree = Math.max(0, degree)
  const r = 4.5 + 2.2 * Math.sqrt(safeDegree)
  return Math.max(4, Math.min(22, Math.round(r * 10) / 10))
}
