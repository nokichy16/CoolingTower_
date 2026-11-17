/** Colours and Recharts props shared by every graph, so they look the same. */
import type { CSSProperties } from 'react'
import type { SelectionId } from '../lib/eliminators'

export const GRID_STROKE = '#d3dbe3'
export const AXIS_STROKE = '#aab6c4'
export const AXIS_TEXT = '#44546b'
export const AXIS_FONT_SIZE = 12.5

export const AXIS_TICK = { fill: AXIS_TEXT, fontSize: AXIS_FONT_SIZE }

export const TOOLTIP_STYLE: CSSProperties = {
  background: '#ffffff',
  border: '1px solid #12233b',
  borderRadius: 3,
  color: '#12233b',
  fontSize: 13.5,
}

export const SERIES = {
  // inlet = ink, captured = water kept, escaping = water lost
  inlet: '#12233b',
  inletSoft: 'rgba(18, 35, 59, 0.2)',
  captured: '#0b7cc0',
  escaping: '#d2531c',
  efficiency: '#6b4fd8',
} as const

export const ELIMINATOR_COLORS: Record<SelectionId, string> = {
  A: '#2a78d6',
  B: '#137f70',
  C: '#6250d6',
  D: '#b8641a',
  E: '#c0397a',
  F: '#6b7a1f',
  custom: '#12233b',
}

/** X-axis label under a chart. */
export const xLabel = (value: string) => ({
  value,
  position: 'insideBottom' as const,
  offset: -4,
  fill: AXIS_TEXT,
  fontSize: AXIS_FONT_SIZE,
})

/** Rotated Y-axis label. */
export const yLabel = (value: string, offset = 16) => ({
  value,
  angle: -90,
  position: 'insideLeft' as const,
  offset,
  fill: AXIS_TEXT,
  fontSize: AXIS_FONT_SIZE,
  style: { textAnchor: 'middle' as const },
})

/** Ticks every 50 µm from 0 to d_max. */
export const diameterTicks = (dMaxUm: number) =>
  Array.from({ length: Math.floor(dMaxUm / 50) + 1 }, (_, i) => i * 50)
