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
import { omegaSat } from '../lib/psychrometrics'
import { fmt } from '../lib/format'
import PsychrometricChart from './PsychrometricChart'

function recoverySweep(r: TowerResults) {
  const points: {
    depth: number
    recovered: number
  }[] = []

  for (let depth = 0; depth <= 25; depth += 0.5) {
    const t = Math.max(0, r.plume.dewPoint - depth)
    const dOmega = Math.max(
      0,
      r.plume.omega - omegaSat(t, r.inputs.pressure),
    )
    points.push({
      depth,
      recovered: r.plume.airMassFlow * dOmega,
    })
  }

  return points
}

export default function ResultPanel({ r }: { r: TowerResults }) {
  const data = recoverySweep(r)

  return (
    <div className="results">
      <PsychrometricChart r={r} />

      <section className="card chart-card">
        <div className="chart-title-row">
          <h4>Recovered water versus cooling below dew point</h4>
        </div>
        <div className="chart">
          <ResponsiveContainer width="100%" height={390}>
            <LineChart
              data={data}
              margin={{ top: 28, right: 22, bottom: 8, left: 2 }}
            >
              <XAxis
                dataKey="depth"
                type="number"
                domain={[0, 25]}
                tick={{ fill: '#4c4943', fontSize: 10 }}
                stroke="#aaa49a"
                label={{
                  value: 'Cooling below dew point  (°C)',
                  position: 'insideBottom',
                  offset: -2,
                  fill: '#4c4943',
                  fontSize: 10,
                }}
              />
              <YAxis
                tick={{ fill: '#4c4943', fontSize: 10 }}
                stroke="#aaa49a"
                width={56}
                label={{
                  value: 'Recovered water  (kg/s)',
                  angle: -90,
                  position: 'insideLeft',
                  fill: '#137f70',
                  fontSize: 9,
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
                labelStyle={{ color: '#57524a' }}
                formatter={(value: number) => [
                  `${fmt(value, 2)} kg/s`,
                  'Theoretical recovery',
                ]}
                labelFormatter={(value) => `${value} °C below dew point`}
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
                stroke="#137f70"
                strokeWidth={2.4}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  )
}
