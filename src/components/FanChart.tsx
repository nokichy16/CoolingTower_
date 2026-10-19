import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { TowerResults } from '../lib/model'
import { evaluateRuizEliminator, RUIZ_LIMITS } from '../lib/eliminators'
import { fmt } from '../lib/format'
import { GRID_STROKE } from './DropletDistribution'

/**
 * Eliminator pressure drop and ideal fan air power against face velocity,
 * Δp = Kp(Re)·½ρu² and P = A·u·Δp, for the selected eliminator and plume
 * state. The shaded validity range is the Ruiz velocity range.
 */
export default function FanChart({ r }: { r: TowerResults }) {
  const { rho, t, flowArea, velocity } = r.plume
  const id = r.eliminator.spec.id
  const data = Array.from({ length: 56 }, (_, i) => {
    const u = 0.5 + i * 0.1
    const kp = evaluateRuizEliminator(id, rho, u, t, 50).pressureCoefficient
    const dp = kp * 0.5 * rho * u * u
    return { u: Number(u.toFixed(2)), dp, power: (flowArea * u * dp) / 1000 }
  })

  return (
    <section className="stage-graph" aria-labelledby="fan-chart-title">
      <h3 className="input-group-title" id="fan-chart-title">
        Eliminator pressure drop and fan air power
      </h3>
      <div className="chart-legend-row">
        <span><i style={{ background: '#6250d6' }} />Ideal fan air power (kW)</span>
        <span><i className="is-dot is-filled" style={{ background: '#b8641a' }} />Current velocity</span>
      </div>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data} margin={{ top: 14, right: 18, bottom: 8, left: -6 }}>
          <CartesianGrid stroke={GRID_STROKE} />
          <XAxis
            dataKey="u"
            type="number"
            domain={[0.5, 6]}
            ticks={[0.5, 1, 2, 3, 4, 5, 6]}
            tick={{ fill: '#4c4943', fontSize: 10 }}
            stroke="#aaa49a"
            label={{
              value: 'Face velocity u  (m/s)',
              position: 'insideBottom',
              offset: -4,
              fill: '#4c4943',
              fontSize: 10,
            }}
          />
          <YAxis
            tick={{ fill: '#4c4943', fontSize: 10 }}
            stroke="#aaa49a"
            width={48}
            label={{
              value: 'kW',
              angle: -90,
              position: 'insideLeft',
              offset: 16,
              fill: '#4c4943',
              fontSize: 10,
            }}
          />
          <Tooltip
            contentStyle={{
              background: '#fbfaf7',
              border: '1px solid #d8d3ca',
              borderRadius: 8,
              color: '#252525',
              fontSize: 11,
            }}
            formatter={(value: number, _name, item) => [
              `${fmt(value, 1)} kW  (Δp ${fmt(item.payload.dp, 1)} Pa)`,
              'Fan air power',
            ]}
            labelFormatter={(u) => `u = ${fmt(Number(u), 1)} m/s`}
          />
          <Line
            dataKey="power"
            type="monotone"
            stroke="#6250d6"
            strokeWidth={2.2}
            dot={false}
            isAnimationActive={false}
          />
          {velocity >= 0.5 && velocity <= 6 && (
            <ReferenceDot
              x={velocity}
              y={r.droplets.fanAirPower}
              r={5}
              fill="#b8641a"
              stroke="#fff"
              strokeWidth={2}
              label={{
                value: `${fmt(r.droplets.fanAirPower, 1)} kW at ${fmt(velocity, 1)} m/s`,
                position: 'left',
                offset: 10,
                fill: '#57524a',
                fontSize: 11,
              }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
      <p className="card-note">
        Δp = Kp(Re)·½ρu² from Ruiz et al. (2019); P = A·u·Δp. Ideal air power
        for the eliminator only, no fan or motor efficiency. Ruiz tested
        {` ${RUIZ_LIMITS.velocityMin}–${RUIZ_LIMITS.velocityMax}`} m/s.
      </p>
    </section>
  )
}
