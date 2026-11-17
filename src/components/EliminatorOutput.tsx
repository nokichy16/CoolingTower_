import {
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { memo, useMemo } from 'react'
import type { TowerInputs, TowerResults } from '../lib/model'
import { fmt, sig } from '../lib/format'
import {
  AXIS_STROKE,
  AXIS_TICK,
  diameterTicks,
  GRID_STROKE,
  SERIES,
  TOOLTIP_STYLE,
  xLabel,
  yLabel,
} from './chartTheme'

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
function EliminatorOutput({
  inputs,
  droplets,
}: EliminatorOutputProps) {
  const dMaxUm = inputs.dropletDMax
  const { split, driftInlet } = droplets
  // Every second class edge is enough for a smooth line.
  const data = useMemo(() => {
    const rows = []
    for (let i = 1; i < split.diameters.length; i += 2) {
      const inlet = split.inletCumulative[i]
      const escaping = split.escapingCumulative[i]
      rows.push({
        d: split.diameters[i],
        inlet: driftInlet * inlet,
        captured: driftInlet * (inlet - escaping),
        escaping: driftInlet * escaping,
      })
    }
    return rows
  }, [split, driftInlet])
  const xTicks = diameterTicks(dMaxUm)
  const show = (v: number) => `${sig(v, 3)} kg/s`

  return (
    <section className="eliminator-output" aria-labelledby="eliminator-output-title">
      <h3 className="input-group-title" id="eliminator-output-title">
        Cumulative drift mass below d
      </h3>
      <div className="chart-legend-row">
        <span><i className="is-line" style={{ color: SERIES.inlet }} />Inlet</span>
        <span><i className="is-line" style={{ color: SERIES.captured }} />Captured</span>
        <span><i className="is-line" style={{ color: SERIES.escaping }} />Escaping</span>
      </div>
      <div className="chart-box">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 16, right: 18, bottom: 8, left: 0 }}>
          <CartesianGrid stroke={GRID_STROKE} />
          <XAxis
            dataKey="d"
            type="number"
            domain={[0, dMaxUm]}
            ticks={xTicks}
            tick={AXIS_TICK}
            stroke={AXIS_STROKE}
            label={xLabel('Droplet diameter d  (µm)')}
          />
          <YAxis
            domain={[0, 'auto']}
            tick={AXIS_TICK}
            stroke={AXIS_STROKE}
            width={64}
            tickFormatter={(v: number) => fmt(v, 3)}
            label={yLabel('Drift below d  (kg/s)', 12)}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(value: number, name: string) => [
              show(value),
              name === 'inlet' ? 'Inlet' : name === 'captured' ? 'Captured' : 'Escaping',
            ]}
            labelFormatter={(d) => `Below ${fmt(Number(d), 1)} µm`}
          />
          <Line dataKey="inlet" type="monotone" stroke={SERIES.inlet} strokeWidth={2.6} dot={false} isAnimationActive={false} />
          <Line dataKey="captured" type="monotone" stroke={SERIES.captured} strokeWidth={2.6} dot={false} isAnimationActive={false} />
          <Line dataKey="escaping" type="monotone" stroke={SERIES.escaping} strokeWidth={2.6} dot={false} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
      </div>
    </section>
  )
}

// Skips re-rendering while its props are the same objects (see App: the
// graphs get deferred results, so a slider drag does not wait for them).
export default memo(EliminatorOutput)
