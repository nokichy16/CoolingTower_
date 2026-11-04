import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { distributionParams, type TowerInputs, type TowerResults } from '../lib/model'
import { dropletCumulative } from '../lib/droplet-distribution'
import { fmt, sig } from '../lib/format'
import { GRID_STROKE } from './DropletDistribution'

interface EliminatorOutputProps {
  inputs: TowerInputs
  droplets: TowerResults['droplets']
}

const BIN_UM = 5

/**
 * Drift eliminator output: relative number of droplets per 5 µm size class
 * entering (light) and escaping (solid) the eliminator, with the capture
 * efficiency ε(d) on the right axis.
 *   escaping mass in a class = (1 − ε(d_mid)) · inlet mass in the class
 *   count ∝ mass / d_mid³, scaled so the inlet peak is 1
 */
export default function EliminatorOutput({
  inputs,
  droplets,
}: EliminatorOutputProps) {
  const p = distributionParams(inputs)
  const bins: {
    mid: number
    inlet: number
    escaping: number
    eps: number
    escKgs: number
  }[] = []
  for (let a = 0; a < p.dMaxUm; a += BIN_UM) {
    const b = Math.min(a + BIN_UM, p.dMaxUm)
    const mid = (a + b) / 2
    const mass = dropletCumulative(b, p) - dropletCumulative(a, p)
    const eps = droplets.efficiency(mid)
    bins.push({
      mid,
      inlet: mass / mid ** 3,
      escaping: ((1 - eps) * mass) / mid ** 3,
      eps: 100 * eps,
      escKgs: droplets.driftInlet * (1 - eps) * mass,
    })
  }
  const peak = Math.max(...bins.map((x) => x.inlet)) || 1
  const data = bins.map((x) => ({ ...x, inlet: x.inlet / peak, escaping: x.escaping / peak }))
  const xTicks = Array.from(
    { length: Math.floor(p.dMaxUm / 50) + 1 },
    (_, i) => i * 50,
  )

  return (
    <section className="eliminator-output" aria-labelledby="eliminator-output-title">
      <h3 className="input-group-title" id="eliminator-output-title">
        Drift eliminator output
      </h3>
      <div className="chart-legend-row">
        <span><i style={{ background: 'rgba(19, 127, 112, 0.28)' }} />Inlet droplets</span>
        <span><i style={{ background: '#2a78d6' }} />Escaping droplets</span>
        <span><i className="is-dash is-dotted" style={{ color: '#6250d6' }} />Capture efficiency ε(d), right axis</span>
      </div>
      <ResponsiveContainer width="100%" height={440}>
        <ComposedChart
          data={data}
          margin={{ top: 16, right: 4, bottom: 8, left: -6 }}
          barGap="-100%"
          barCategoryGap={0}
        >
          <CartesianGrid stroke={GRID_STROKE} />
          <XAxis
            dataKey="mid"
            type="number"
            domain={[0, p.dMaxUm]}
            ticks={xTicks}
            tick={{ fill: '#4c4943', fontSize: 12.5 }}
            stroke="#aaa49a"
            label={{
              value: 'Droplet diameter d  (µm)',
              position: 'insideBottom',
              offset: -4,
              fill: '#4c4943',
              fontSize: 12.5,
            }}
          />
          <YAxis
            yAxisId="n"
            domain={[0, 1]}
            ticks={[0, 0.25, 0.5, 0.75, 1]}
            tick={{ fill: '#4c4943', fontSize: 12.5 }}
            stroke="#aaa49a"
            width={56}
            label={{
              value: 'Relative count',
              angle: -90,
              position: 'insideLeft',
              offset: 16,
              fill: '#4c4943',
              fontSize: 12.5,
              style: { textAnchor: 'middle' },
            }}
          />
          <YAxis
            yAxisId="e"
            orientation="right"
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            tick={{ fill: '#6250d6', fontSize: 12.5 }}
            stroke="#aaa49a"
            width={44}
            unit="%"
          />
          <Tooltip
            contentStyle={{
              background: '#fbfaf7',
              border: '1px solid #d8d3ca',
              borderRadius: 8,
              color: '#252525',
              fontSize: 13.5,
            }}
            formatter={(value: number, name: string, item) =>
              name === 'eps'
                ? [`${fmt(value, 1)} %`, 'Capture ε']
                : name === 'escaping'
                  ? [`${fmt(value, 3)}  (${sig(item.payload.escKgs, 3)} kg/s)`, 'Escaping']
                  : [fmt(value, 3), 'Inlet']
            }
            labelFormatter={(mid) =>
              `${fmt(Number(mid) - BIN_UM / 2, 0)}–${fmt(Number(mid) + BIN_UM / 2, 0)} µm`
            }
          />
          <Bar yAxisId="n" dataKey="inlet" fill="rgba(19, 127, 112, 0.28)" isAnimationActive={false} />
          <Bar yAxisId="n" dataKey="escaping" fill="#2a78d6" isAnimationActive={false} />
          <Line
            yAxisId="e"
            dataKey="eps"
            type="monotone"
            stroke="#6250d6"
            strokeWidth={2}
            strokeDasharray="2 3"
            dot={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </section>
  )
}
