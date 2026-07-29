import {
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
import { hSat, omegaSat } from '../lib/psychrometrics'
import { fmt } from '../lib/format'

function recoverySweep(r: TowerResults) {
  const points: {
    depth: number
    recovered: number
    duty: number
  }[] = []

  for (let depth = 0; depth <= 25; depth += 0.5) {
    const t = Math.max(0, r.plume.dewPoint - depth)
    const dOmega = Math.max(
      0,
      r.plume.omega - omegaSat(t, r.inputs.pressure),
    )
    const dH = Math.max(0, r.plume.h - hSat(t, r.inputs.pressure))
    points.push({
      depth,
      recovered: r.inputs.airMassFlow * dOmega,
      duty: r.inputs.airMassFlow * dH,
    })
  }

  return points
}

export default function ResultPanel({ r }: { r: TowerResults }) {
  const data = recoverySweep(r)

  return (
    <div className="results">
      <section className="card chart-card">
        <h4>Recovered water versus cooling below dew point</h4>
        <p className="card-note">
          The curve shows theoretical condensation for the selected plume and
          dry-air flow. The marker is the current setting.
        </p>
        <div className="chart">
          <ResponsiveContainer width="100%" height={250}>
            <LineChart
              data={data}
              margin={{ top: 28, right: 28, bottom: 6, left: 4 }}
            >
              <XAxis
                dataKey="depth"
                type="number"
                domain={[0, 25]}
                tick={{ fill: '#8a94a6', fontSize: 11 }}
                stroke="#2c3444"
                label={{
                  value: 'Cooling below dew point  (K)',
                  position: 'insideBottom',
                  offset: -2,
                  fill: '#8a94a6',
                  fontSize: 11,
                }}
              />
              <YAxis
                tick={{ fill: '#8a94a6', fontSize: 11 }}
                stroke="#2c3444"
                width={56}
                label={{
                  value: 'kg/s theoretical',
                  angle: -90,
                  position: 'insideLeft',
                  fill: '#8a94a6',
                  fontSize: 11,
                }}
              />
              <Tooltip
                contentStyle={{
                  background: '#141a24',
                  border: '1px solid #2c3444',
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelStyle={{ color: '#cdd6e4' }}
                formatter={(value: number, name: string) =>
                  name === 'recovered'
                    ? [`${fmt(value, 2)} kg/s`, 'Theoretical recovery']
                    : [`${fmt(value, 0)} kW`, 'Cooling duty']
                }
                labelFormatter={(value) => `${value} K below dew point`}
              />
              <ReferenceLine
                x={r.inputs.coolingBelowDewPoint}
                stroke="#ff9f45"
                strokeDasharray="4 3"
              />
              <ReferenceDot
                x={r.inputs.coolingBelowDewPoint}
                y={r.recovery.mDotCond}
                r={5}
                fill="#ff9f45"
                stroke="#0c0f14"
                strokeWidth={2}
                label={{
                  value: `${fmt(r.recovery.mDotCond, 2)} kg/s`,
                  position: 'top',
                  fill: '#ff9f45',
                  fontSize: 11,
                }}
              />
              <Line
                type="monotone"
                dataKey="recovered"
                stroke="#34d1bf"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  )
}
