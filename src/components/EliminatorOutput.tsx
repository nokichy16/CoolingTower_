import {
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

/**
 * Drift eliminator output: cumulative drift mass below each diameter for the
 * inlet, the captured part and the escaping part, all on the same basis (no
 * rescaling), so captured + escaping = inlet at every d.
 *   inlet(d)    = ṁ_drift,in · F(d)
 *   escaping(d) = ṁ_drift,in · Σ (1 − ε) ΔF   up to d
 *   captured(d) = inlet(d) − escaping(d) = ṁ_drift,in · Σ ε ΔF
 * Shown in kg/s.
 */
export default function EliminatorOutput({
  inputs,
  droplets,
}: EliminatorOutputProps) {
  const p = distributionParams(inputs)
  const { split, driftInlet } = droplets
  const scale = driftInlet
  const data = split.diameters
    .filter((_, i) => i % 2 === 1)
    .map((d) => {
      const i = split.diameters.indexOf(d)
      const inlet = dropletCumulative(d, p)
      const escaping = split.outletCumulative[i] * split.escaping
      return {
        d,
        inlet: scale * inlet,
        captured: scale * (inlet - escaping),
        escaping: scale * escaping,
      }
    })
  const xTicks = Array.from(
    { length: Math.floor(p.dMaxUm / 50) + 1 },
    (_, i) => i * 50,
  )
  const show = (v: number) => `${sig(v, 3)} kg/s`

  return (
    <section className="eliminator-output" aria-labelledby="eliminator-output-title">
      <h3 className="input-group-title" id="eliminator-output-title">
        Cumulative drift mass below d
      </h3>
      <div className="chart-legend-row">
        <span><i className="is-line" style={{ color: '#137f70' }} />Inlet</span>
        <span><i className="is-line" style={{ color: '#b8641a' }} />Captured</span>
        <span><i className="is-line" style={{ color: '#2a78d6' }} />Escaping</span>
      </div>
      <ResponsiveContainer width="100%" height={440}>
        <ComposedChart data={data} margin={{ top: 16, right: 18, bottom: 8, left: 0 }}>
          <CartesianGrid stroke={GRID_STROKE} />
          <XAxis
            dataKey="d"
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
            domain={[0, 'auto']}
            tick={{ fill: '#4c4943', fontSize: 12.5 }}
            stroke="#aaa49a"
            width={64}
            tickFormatter={(v: number) => fmt(v, 3)}
            label={{
              value: 'Drift below d  (kg/s)',
              angle: -90,
              position: 'insideLeft',
              offset: 12,
              fill: '#4c4943',
              fontSize: 12.5,
              style: { textAnchor: 'middle' },
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
            formatter={(value: number, name: string) => [
              show(value),
              name === 'inlet' ? 'Inlet' : name === 'captured' ? 'Captured' : 'Escaping',
            ]}
            labelFormatter={(d) => `Below ${fmt(Number(d), 1)} µm`}
          />
          <Line dataKey="inlet" type="monotone" stroke="#137f70" strokeWidth={2.6} dot={false} isAnimationActive={false} />
          <Line dataKey="captured" type="monotone" stroke="#b8641a" strokeWidth={2.6} dot={false} isAnimationActive={false} />
          <Line dataKey="escaping" type="monotone" stroke="#2a78d6" strokeWidth={2.6} dot={false} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </section>
  )
}
