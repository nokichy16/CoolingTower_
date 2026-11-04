import { useRef } from 'react'
import { CUSTOM_SIZES_UM, type CustomPerformance } from '../lib/eliminators'
import type { TowerInputs } from '../lib/model'
import Field from './Field'

const W = 600
const H = 220
const PAD = { top: 22, right: 8, bottom: 30, left: 34 }

/**
 * Custom performance: set Δp, and drag each bar to set the collection
 * efficiency for that droplet size. Arrow keys change a focused bar by 1 %.
 */
export default function CustomPerformanceEditor({
  inputs,
  onChange,
}: {
  inputs: TowerInputs
  onChange: (next: CustomPerformance) => void
}) {
  const value = inputs.customPerformance
  const svgRef = useRef<SVGSVGElement>(null)
  const dragIndex = useRef<number | null>(null)

  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom
  const n = CUSTOM_SIZES_UM.length
  const slot = plotW / n
  const barW = slot * 0.62
  const yOf = (pct: number) => PAD.top + plotH * (1 - pct / 100)

  const setEff = (i: number, pct: number) => {
    const next = [...value.efficiencyPct]
    next[i] = Math.round(Math.min(100, Math.max(0, pct)))
    if (next[i] !== value.efficiencyPct[i]) onChange({ ...value, efficiencyPct: next })
  }
  const pctFromEvent = (e: React.PointerEvent) => {
    const svg = svgRef.current
    if (!svg) return 0
    const r = svg.getBoundingClientRect()
    const y = ((e.clientY - r.top) / r.height) * H
    return (100 * (PAD.top + plotH - y)) / plotH
  }
  const indexFromEvent = (e: React.PointerEvent) => {
    const svg = svgRef.current
    if (!svg) return -1
    const r = svg.getBoundingClientRect()
    const x = ((e.clientX - r.left) / r.width) * W
    return Math.floor((x - PAD.left) / slot)
  }

  return (
    <section className="custom-eliminator" aria-labelledby="custom-perf-title">
      <h3 className="input-group-title" id="custom-perf-title">
        Custom performance
      </h3>
      <Field
        label="Pressure drop"
        sym="Δp"
        unit="Pa"
        value={value.pressureDropPa}
        min={0}
        max={300}
        step={0.5}
        digits={1}
        onChange={(v) => onChange({ ...value, pressureDropPa: v })}
      />
      <span className="field-label">Collection efficiency ε (%) by droplet size (µm) · drag the bars</span>
      <svg
        ref={svgRef}
        className="eff-editor"
        viewBox={`0 0 ${W} ${H}`}
        role="group"
        aria-label="Collection efficiency by droplet size"
        onPointerDown={(e) => {
          const i = indexFromEvent(e)
          if (i < 0 || i >= n) return
          dragIndex.current = i
          ;(e.target as Element).setPointerCapture?.(e.pointerId)
          setEff(i, pctFromEvent(e))
        }}
        onPointerMove={(e) => {
          if (dragIndex.current !== null) setEff(dragIndex.current, pctFromEvent(e))
        }}
        onPointerUp={() => {
          dragIndex.current = null
        }}
        onPointerLeave={() => {
          dragIndex.current = null
        }}
      >
        {[0, 25, 50, 75, 100].map((g) => (
          <g key={g}>
            <line x1={PAD.left} x2={W - PAD.right} y1={yOf(g)} y2={yOf(g)} stroke="#dcd8cf" />
            <text x={PAD.left - 6} y={yOf(g) + 4} textAnchor="end" fontSize={12} fill="#4c4943">
              {g}
            </text>
          </g>
        ))}
        {CUSTOM_SIZES_UM.map((d, i) => {
          const pct = value.efficiencyPct[i]
          const x = PAD.left + i * slot + (slot - barW) / 2
          const y = yOf(pct)
          return (
            <g
              key={d}
              tabIndex={0}
              role="slider"
              aria-label={`ε at ${d} µm`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={pct}
              onKeyDown={(e) => {
                const step = e.shiftKey ? 10 : 1
                if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
                  e.preventDefault()
                  setEff(i, pct + step)
                }
                if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
                  e.preventDefault()
                  setEff(i, pct - step)
                }
              }}
              style={{ cursor: 'ns-resize' }}
            >
              <rect x={PAD.left + i * slot} y={PAD.top} width={slot} height={plotH} fill="transparent" />
              <rect x={x} y={y} width={barW} height={PAD.top + plotH - y} rx={2} fill="#6250d6" fillOpacity={0.8} />
              <rect x={x} y={y - 3} width={barW} height={6} rx={3} fill="#3d2fa8" />
              <text x={x + barW / 2} y={y - 7} textAnchor="middle" fontSize={12.5} fontWeight={600} fill="#252525">
                {pct}
              </text>
              <text x={x + barW / 2} y={H - 10} textAnchor="middle" fontSize={12} fill="#4c4943">
                {d}
              </text>
            </g>
          )
        })}
        <text x={4} y={12} fontSize={11} fill="#8a857c">
          %
        </text>
      </svg>
    </section>
  )
}
