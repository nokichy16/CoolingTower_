/** Colours and Recharts props shared by every graph, so they look the same. */
import type { CSSProperties } from 'react'
import type { SelectionId } from '../lib/eliminators'

export const GRID_STROKE = '#dcd8cf'
export const AXIS_STROKE = '#aaa49a'
export const AXIS_TEXT = '#4c4943'
export const AXIS_FONT_SIZE = 12.5

export const AXIS_TICK = { fill: AXIS_TEXT, fontSize: AXIS_FONT_SIZE }

export const TOOLTIP_STYLE: CSSProperties = {
  background: '#fbfaf7',
  border: '1px solid #d8d3ca',
  borderRadius: 8,
  color: '#252525',
  fontSize: 13.5,
}

export const SERIES = {
  inlet: '#137f70',
  inletSoft: 'rgba(19, 127, 112, 0.28)',
  captured: '#b8641a',
  escaping: '#2a78d6',
  efficiency: '#6250d6',
} as const

export const ELIMINATOR_COLORS: Record<SelectionId, string> = {
  A: '#2a78d6',
  B: '#137f70',
  C: '#6250d6',
  D: '#b8641a',
  E: '#c0397a',
  F: '#6b7a1f',
  custom: '#252525',
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
