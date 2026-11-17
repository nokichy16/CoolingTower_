import { memo, useMemo, useState } from 'react'
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
  airDynamicViscosity,
  customPressureDrop,
  resolveSpec,
  ruizPressureCoefficient,
  RUIZ_LIMITS,
  SELECTIONS,
  selectionName,
  type SelectionId,
} from '../lib/eliminators'
import { fmt } from '../lib/format'
import {
  AXIS_STROKE,
  AXIS_TICK,
  ELIMINATOR_COLORS,
  GRID_STROKE,
  TOOLTIP_STYLE,
  xLabel,
  yLabel,
} from './chartTheme'

const IDS = SELECTIONS
const U_MIN = 0.5
const STEPS = 120

/**
 * Ideal fan air power against face velocity for all Ruiz eliminators A–F,
 * P = A·u·Δp with Δp = Kp(Re)·½ρu², at the current plume state. The selected
 * eliminator is drawn bold. The legend filters the view: All, or one line
 * with its dot at the current velocity.
 */
function FanChart({
  r,
  inputs,
}: {
  r: TowerResults
  inputs: TowerInputs
}) {
  const [view, setView] = useState<'all' | SelectionId>('all')
  const { rho, t, flowArea, velocity } = r.plume
  const customDp = customPressureDrop(inputs.customPerformance)
  const selected = r.eliminator.spec.id
  const shown = view === 'all' ? IDS : [view]
  const dotId = view === 'all' ? selected : view
  // Axis covers 0.5–6 m/s, extended to include the current velocity.
  const rawMax = Math.max(6, velocity * 1.15)
  const tickStep = rawMax <= 6 ? 1 : rawMax <= 15 ? 2 : rawMax <= 40 ? 5 : 10
  const uMax = Math.ceil(rawMax / tickStep) * tickStep
  const xTicks = [U_MIN, ...Array.from({ length: uMax / tickStep }, (_, i) => (i + 1) * tickStep)]

  const { data, dotPower } = useMemo(() => {
    const mu = airDynamicViscosity(t)
    // Ideal air power P = A·u·Δp; the custom option keeps its set Δp at every u.
    const powerAt = (id: SelectionId, u: number) => {
      const dp =
        id === 'custom'
          ? customDp
          : ruizPressureCoefficient(resolveSpec(id), rho, u, mu) * 0.5 * rho * u * u
      return (flowArea * u * dp) / 1000
    }
    const rows = Array.from({ length: STEPS + 1 }, (_, i) => {
      const u = U_MIN + (i * (uMax - U_MIN)) / STEPS
      const row: Record<string, number> = { u: Number(u.toFixed(2)) }
      for (const id of IDS) row[id] = powerAt(id, u)
      return row
    })
    return { data: rows, dotPower: powerAt(dotId, velocity) }
  }, [rho, t, flowArea, velocity, customDp, uMax, dotId])

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
            {selectionName(id)} · {resolveSpec(id).type}
          </button>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={440}>
        <LineChart data={data} margin={{ top: 14, right: 18, bottom: 8, left: 0 }}>
          <CartesianGrid stroke={GRID_STROKE} />
          <XAxis
            dataKey="u"
            type="number"
            domain={[U_MIN, uMax]}
            ticks={xTicks}
            tick={AXIS_TICK}
            stroke={AXIS_STROKE}
            label={xLabel('Face velocity u  (m/s)')}
          />
          <YAxis
            tick={AXIS_TICK}
            stroke={AXIS_STROKE}
            width={72}
            tickFormatter={(v: number) => fmt(v, 0)}
            label={yLabel('Fan air power  (kW)')}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
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
          {velocity >= U_MIN && (
            <ReferenceLine x={velocity} stroke="#8a857c" strokeDasharray="4 3" />
          )}
          {velocity >= U_MIN && (
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

// Skips re-rendering while its props are the same objects (see App: the
// graphs get deferred results, so a slider drag does not wait for them).
export default memo(FanChart)
