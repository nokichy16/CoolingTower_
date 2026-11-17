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
import { memo, useMemo } from 'react'
import { distributionParams, type TowerInputs, type TowerResults } from '../lib/model'
import { massBins } from '../lib/droplet-distribution'
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

const BIN_UM = 5

/**
 * Drift eliminator output: relative number of droplets per 5 µm size class
 * entering (light) and escaping (solid) the eliminator, with the capture
 * efficiency ε(d) on the right axis.
 *   escaping mass in a class = (1 − ε(d_mid)) · inlet mass in the class
 *   count ∝ mass / d_mid³, scaled so the inlet peak is 1
 */
function EliminatorCount({
  inputs,
  droplets,
}: EliminatorOutputProps) {
  const { dropletMean, dropletSigma, dropletDMax } = inputs
  const { efficiency, driftInlet } = droplets
  const data = useMemo(() => {
    const p = distributionParams({ dropletMean, dropletSigma, dropletDMax })
    const bins = massBins(p, BIN_UM).map(({ mid, mass }) => {
      // Same 0–1 clamp as the model's mass balance.
      const eps = Math.min(1, Math.max(0, efficiency(mid)))
      return {
        mid,
        inlet: mass / mid ** 3,
        escaping: ((1 - eps) * mass) / mid ** 3,
        eps: 100 * eps,
        escKgs: driftInlet * (1 - eps) * mass,
      }
    })
    const peak = bins.reduce((m, x) => Math.max(m, x.inlet), 0) || 1
    return bins.map((x) => ({ ...x, inlet: x.inlet / peak, escaping: x.escaping / peak }))
  }, [dropletMean, dropletSigma, dropletDMax, efficiency, driftInlet])
  const xTicks = diameterTicks(dropletDMax)

  return (
    <section className="stage-graph" aria-labelledby="eliminator-count-title">
      <h3 className="input-group-title" id="eliminator-count-title">
        Droplet count per 5 µm size class
      </h3>
      <div className="chart-legend-row">
        <span><i style={{ background: SERIES.inletSoft }} />Inlet</span>
        <span><i style={{ background: SERIES.escaping }} />Escaping</span>
        <span><i className="is-dash is-dotted" style={{ color: SERIES.efficiency }} />Capture ε(d), right axis</span>
      </div>
      <div className="chart-box">
      <ResponsiveContainer width="100%" height="100%">
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
            domain={[0, dropletDMax]}
            ticks={xTicks}
            tick={AXIS_TICK}
            stroke={AXIS_STROKE}
            label={xLabel('Droplet diameter d  (µm)')}
          />
          <YAxis
            yAxisId="n"
            domain={[0, 1]}
            ticks={[0, 0.25, 0.5, 0.75, 1]}
            tick={AXIS_TICK}
            stroke={AXIS_STROKE}
            width={56}
            label={yLabel('Relative count')}
          />
          <YAxis
            yAxisId="e"
            orientation="right"
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            tick={{ ...AXIS_TICK, fill: SERIES.efficiency }}
            stroke={AXIS_STROKE}
            width={44}
            unit="%"
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
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
          <Bar yAxisId="n" dataKey="inlet" fill={SERIES.inletSoft} isAnimationActive={false} />
          <Bar yAxisId="n" dataKey="escaping" fill={SERIES.escaping} isAnimationActive={false} />
          <Line
            yAxisId="e"
            dataKey="eps"
            type="monotone"
            stroke={SERIES.efficiency}
            strokeWidth={2}
            strokeDasharray="2 3"
            dot={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
      </div>
    </section>
  )
}

// Skips re-rendering while its props are the same objects (see App: the
// graphs get deferred results, so a slider drag does not wait for them).
export default memo(EliminatorCount)
