import { useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { TowerInputs, TowerResults } from '../lib/model'
import {
  evaluateRuizEliminator,
  resolveSpec,
  RUIZ_LIMITS,
  SELECTIONS,
  selectionName,
  type SelectionId,
} from '../lib/eliminators'
import { fmt } from '../lib/format'
import { GRID_STROKE } from './DropletDistribution'

const IDS = SELECTIONS
export const ELIMINATOR_COLORS: Record<SelectionId, string> = {
  A: '#2a78d6',
  B: '#137f70',
  C: '#6250d6',
  D: '#b8641a',
  E: '#c0397a',
  F: '#6b7a1f',
  custom: '#252525',
}

/**
 * Ideal fan air power against face velocity for all Ruiz eliminators A–F,
 * P = A·u·Δp with Δp = Kp(Re)·½ρu², at the current plume state. The selected
 * eliminator is drawn bold. The legend filters the view: All, or one line
 * with its dot at the current velocity.
 */
export default function FanChart({
  r,
  inputs,
}: {
  r: TowerResults
  inputs: TowerInputs
}) {
  const [view, setView] = useState<'all' | SelectionId>('all')
  const specs = Object.fromEntries(
    IDS.map((id) => [id, resolveSpec(id)]),
  ) as Record<SelectionId, ReturnType<typeof resolveSpec>>
  const { rho, t, flowArea, velocity } = r.plume
  const selected = r.eliminator.spec.id as SelectionId
  const shown = view === 'all' ? IDS : [view]
  const dotId = view === 'all' ? selected : view
  // Axis covers 0.5–6 m/s, extended to include the current velocity.
  const rawMax = Math.max(6, velocity * 1.15)
  const tickStep = rawMax <= 6 ? 1 : rawMax <= 15 ? 2 : rawMax <= 40 ? 5 : 10
  const uMax = Math.ceil(rawMax / tickStep) * tickStep
  const xTicks = [0.5, ...Array.from({ length: uMax / tickStep }, (_, i) => (i + 1) * tickStep)]
  // Ideal air power P = A·u·Δp; the custom option keeps its set Δp at every u.
  const powerAt = (id: SelectionId, u: number) => {
    const dp =
      id === 'custom'
        ? inputs.customPerformance.pressureDropPa
        : evaluateRuizEliminator(specs[id], rho, u, t, 50).pressureCoefficient * 0.5 * rho * u * u
    return (flowArea * u * dp) / 1000
  }
  const dotPower = powerAt(dotId, velocity)
  const steps = 120
  const data = Array.from({ length: steps + 1 }, (_, i) => {
    const u = 0.5 + (i * (uMax - 0.5)) / steps
    const row: Record<string, number> = { u: Number(u.toFixed(2)) }
    for (const id of IDS) {
      row[id] = powerAt(id, u)
    }
    return row
  })

  return (
    <section className="stage-graph" aria-labelledby="fan-chart-title">
      <h3 className="input-group-title" id="fan-chart-title">
        Ideal fan air power{view === 'all' ? ', eliminators A–F and custom' : ` · ${selectionName(view)}`}
      </h3>
      <div className="chart-legend-row" role="radiogroup" aria-label="Show">
        <button
          type="button"
          role="radio"
          aria-checked={view === 'all'}
          className={`legend-pick${view === 'all' ? ' is-selected' : ''}`}
          onClick={() => setView('all')}
        >
          All
        </button>
        {IDS.map((id) => (
          <button
            type="button"
            role="radio"
            aria-checked={view === id}
            key={id}
            className={`legend-pick${view === id ? ' is-selected' : ''}`}
            onClick={() => setView(id)}
          >
            <i style={{ background: ELIMINATOR_COLORS[id] }} />
            {selectionName(id)} · {specs[id].type}
          </button>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={440}>
        <LineChart data={data} margin={{ top: 14, right: 18, bottom: 8, left: 0 }}>
          <CartesianGrid stroke={GRID_STROKE} />
          <XAxis
            dataKey="u"
            type="number"
            domain={[0.5, uMax]}
            ticks={xTicks}
            tick={{ fill: '#4c4943', fontSize: 12.5 }}
            stroke="#aaa49a"
            label={{
              value: 'Face velocity u  (m/s)',
              position: 'insideBottom',
              offset: -4,
              fill: '#4c4943',
              fontSize: 12.5,
            }}
          />
          <YAxis
            tick={{ fill: '#4c4943', fontSize: 12.5 }}
            stroke="#aaa49a"
            width={72}
            tickFormatter={(v: number) => fmt(v, 0)}
            label={{
              value: 'Fan air power  (kW)',
              angle: -90,
              position: 'insideLeft',
              offset: 16,
              style: { textAnchor: 'middle' },
              fill: '#4c4943',
              fontSize: 12.5,
            }}
          />
          <Tooltip
            contentStyle={{
              background: '#fbfaf7',
              border: '1px solid #d8d3ca',
              borderRadius: 8,
              color: '#252525',
              fontSize: 13.5,
            }}
            formatter={(value: number, name: string) => [`${fmt(value, 2)} kW`, name]}
            labelFormatter={(u) => `u = ${fmt(Number(u), 1)} m/s`}
            itemSorter={(item) => -(item.value as number)}
          />
          {shown.map((id) => (
            <Line
              key={id}
              dataKey={id}
              type="monotone"
              stroke={ELIMINATOR_COLORS[id]}
              strokeWidth={id === selected || view !== 'all' ? 3.2 : 2}
              strokeOpacity={id === selected || view !== 'all' ? 1 : 0.75}
              dot={false}
              isAnimationActive={false}
            />
          ))}
          {velocity >= 0.5 && (
            <ReferenceLine x={velocity} stroke="#8a857c" strokeDasharray="4 3" />
          )}
          {velocity >= 0.5 && (
            <ReferenceDot
              x={velocity}
              y={dotPower}
              r={5}
              fill={ELIMINATOR_COLORS[dotId]}
              stroke="#fff"
              strokeWidth={2}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
      <p className="card-note">
        No inputs here: velocity is from stage 1, the eliminator from stage 2.
        P = A·u·Δp, Δp = Kp(Re)·½ρu² (Ruiz et al., 2019). Ideal air power for
        the eliminator only. Ruiz tested {RUIZ_LIMITS.velocityMin}–
        {RUIZ_LIMITS.velocityMax} m/s.
      </p>
    </section>
  )
}
