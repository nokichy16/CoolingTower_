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
import type { TowerResults } from '../lib/model'
import {
  ELIMINATORS,
  evaluateRuizEliminator,
  RUIZ_LIMITS,
  type EliminatorId,
} from '../lib/eliminators'
import { fmt } from '../lib/format'
import { GRID_STROKE } from './DropletDistribution'

const IDS = Object.keys(ELIMINATORS) as EliminatorId[]
export const ELIMINATOR_COLORS: Record<EliminatorId, string> = {
  A: '#2a78d6',
  B: '#137f70',
  C: '#6250d6',
  D: '#b8641a',
  E: '#c0397a',
  F: '#6b7a1f',
}

/**
 * Ideal fan air power against face velocity for all Ruiz eliminators A–F,
 * P = A·u·Δp with Δp = Kp(Re)·½ρu², at the current plume state. The selected
 * eliminator is drawn bold with a dot at the current velocity. Click a legend
 * item to select that eliminator.
 */
export default function FanChart({
  r,
  onSelect,
}: {
  r: TowerResults
  onSelect?: (id: EliminatorId) => void
}) {
  const { rho, t, flowArea, velocity } = r.plume
  const selected = r.eliminator.spec.id
  const data = Array.from({ length: 56 }, (_, i) => {
    const u = 0.5 + i * 0.1
    const row: Record<string, number> = { u: Number(u.toFixed(2)) }
    for (const id of IDS) {
      const kp = evaluateRuizEliminator(id, rho, u, t, 50).pressureCoefficient
      row[id] = (flowArea * u * kp * 0.5 * rho * u * u) / 1000
    }
    return row
  })

  return (
    <section className="stage-graph" aria-labelledby="fan-chart-title">
      <h3 className="input-group-title" id="fan-chart-title">
        Ideal fan air power, eliminators A–F
      </h3>
      <div className="chart-legend-row" role="radiogroup" aria-label="Eliminator">
        {IDS.map((id) => (
          <button
            type="button"
            role="radio"
            aria-checked={id === selected}
            key={id}
            className={`legend-pick${id === selected ? ' is-selected' : ''}`}
            onClick={() => onSelect?.(id)}
          >
            <i style={{ background: ELIMINATOR_COLORS[id] }} />
            {id} · {ELIMINATORS[id].type}
          </button>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={440}>
        <LineChart data={data} margin={{ top: 14, right: 18, bottom: 8, left: 0 }}>
          <CartesianGrid stroke={GRID_STROKE} />
          <XAxis
            dataKey="u"
            type="number"
            domain={[0.5, 6]}
            ticks={[0.5, 1, 2, 3, 4, 5, 6]}
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
            width={58}
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
          {IDS.map((id) => (
            <Line
              key={id}
              dataKey={id}
              type="monotone"
              stroke={ELIMINATOR_COLORS[id]}
              strokeWidth={id === selected ? 3.2 : 2}
              strokeOpacity={id === selected ? 1 : 0.75}
              dot={false}
              isAnimationActive={false}
            />
          ))}
          {velocity >= 0.5 && velocity <= 6 && (
            <ReferenceLine x={velocity} stroke="#8a857c" strokeDasharray="4 3" />
          )}
          {velocity >= 0.5 && velocity <= 6 && (
            <ReferenceDot
              x={velocity}
              y={r.droplets.fanAirPower}
              r={5}
              fill={ELIMINATOR_COLORS[selected]}
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
