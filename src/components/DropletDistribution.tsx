import { memo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { distributionParams, type TowerInputs, type TowerResults } from '../lib/model'
import {
  countHistogram,
  massAboveCut,
  minimumFromSigma,
  sigmaFromMinimum,
} from '../lib/droplet-distribution'
import { fmt } from '../lib/format'
import Field from './Field'
import {
  AXIS_STROKE,
  AXIS_TICK,
  diameterTicks,
  GRID_STROKE,
  SERIES,
  TOOLTIP_STYLE,
  xLabel,
} from './chartTheme'

interface DropletDistributionProps {
  inputs: TowerInputs
  droplets: TowerResults['droplets']
  onChange: (patch: Partial<TowerInputs>) => void
}

const BIN_UM = 5

/**
 * Inlet drift droplets (graph 1): relative number of droplets per 5 µm size
 * class, in the style of Ruiz et al. (2013) Fig. 8. The shape comes from the
 * log-normal mass distribution set by the inputs.
 */
export default function DropletDistribution({
  inputs,
  droplets,
  onChange,
}: DropletDistributionProps) {
  const p = distributionParams(inputs)

  return (
    <section className="input-group is-wide" aria-labelledby="group-droplets">
      <h3 className="input-group-title" id="group-droplets">
        Drift droplets at the eliminator inlet
      </h3>
      <p className="stage-note">
        Liquid drift leaving the fill. Kept separate from the water vapour in
        the plume.
      </p>

      <div className="droplet-layout">
        <div className="droplet-fields">
          <Field
            label="Circulating water flow"
            sym="ṁ_circ"
            unit="kg/s"
            value={inputs.circulatingWaterFlow}
            min={1}
            max={2000}
            step={1}
            digits={0}
            onChange={(value) => onChange({ circulatingWaterFlow: value })}
          />
          <Field
            label="Drift rate at eliminator inlet"
            sym="D_in"
            unit="%"
            value={inputs.inletDriftRate}
            min={0}
            max={5}
            step={0.01}
            digits={2}
            onChange={(value) => onChange({ inletDriftRate: value })}
          />
          <dl className="droplet-derived">
            <div>
              <dt>Drift entering eliminator</dt>
              <dd>{fmt(droplets.driftInlet, 3)} kg/s</dd>
            </div>
          </dl>
          <Field
            label="Mean diameter (by mass)"
            sym="E"
            unit="µm"
            value={inputs.dropletMean}
            min={2}
            max={300}
            step={0.5}
            digits={1}
            onChange={(value) => onChange({ dropletMean: value })}
          />
          <Field
            label="Standard deviation of ln d"
            sym="σ"
            unit=""
            value={inputs.dropletSigma}
            min={0.05}
            max={1.5}
            step={0.005}
            digits={3}
            onChange={(value) => onChange({ dropletSigma: value })}
          />
          <Field
            label="Smallest droplets (1 %)"
            sym="d_min"
            unit="µm"
            value={Number(p.dMinUm.toFixed(1))}
            min={Math.max(0.1, Number(minimumFromSigma(inputs.dropletMean, 1.5).toFixed(1)))}
            max={Number(minimumFromSigma(inputs.dropletMean, 0.05).toFixed(1))}
            step={0.1}
            digits={1}
            onChange={(value) =>
              onChange({
                dropletSigma: Number(
                  sigmaFromMinimum(value, inputs.dropletMean).toFixed(4),
                ),
              })
            }
          />
          <Field
            label="Largest droplets (100 %)"
            sym="d_max"
            unit="µm"
            value={inputs.dropletDMax}
            min={10}
            max={1000}
            step={10}
            digits={0}
            onChange={(value) => onChange({ dropletDMax: value })}
          />
          <dl className="droplet-derived">
            <div>
              <dt>Median d_med = e^μ_ln</dt>
              <dd>{fmt(p.dMedUm, 1)} µm</dd>
            </div>
            <div>
              <dt>Mass removed by the cut at d_max</dt>
              <dd>{fmt(100 * massAboveCut(p), 2)} %</dd>
            </div>
          </dl>
        </div>

        <InletCountChart
          dropletMean={inputs.dropletMean}
          dropletSigma={inputs.dropletSigma}
          dropletDMax={inputs.dropletDMax}
        />
      </div>
    </section>
  )
}

/** Inlet count graph. Re-renders only when E, σ or d_max changes. */
const InletCountChart = memo(function InletCountChart(
  inputs: Pick<TowerInputs, 'dropletMean' | 'dropletSigma' | 'dropletDMax'>,
) {
  const p = distributionParams(inputs)
  const bins = countHistogram(p, BIN_UM)
  const xTicks = diameterTicks(p.dMaxUm)
  return (
    <div className="droplet-result">
      <span className="droplet-chart-title">
        Inlet: relative number of droplets per {BIN_UM} µm size class
      </span>
      <div className="chart-box">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={bins}
          margin={{ top: 12, right: 14, bottom: 8, left: -6 }}
          barCategoryGap={0}
        >
          <CartesianGrid stroke={GRID_STROKE} strokeDasharray="0" />
          <XAxis
            dataKey="mid"
            type="number"
            domain={[0, p.dMaxUm]}
            ticks={xTicks}
            tick={AXIS_TICK}
            stroke={AXIS_STROKE}
            label={xLabel('Droplet diameter d  (µm)')}
          />
          <YAxis
            domain={[0, 1]}
            ticks={[0, 0.25, 0.5, 0.75, 1]}
            tick={AXIS_TICK}
            stroke={AXIS_STROKE}
            width={60}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(value: number) => [fmt(value, 3), 'Relative count']}
            labelFormatter={(mid) =>
              `${fmt(Number(mid) - BIN_UM / 2, 0)}–${fmt(
                Number(mid) + BIN_UM / 2,
                0,
              )} µm`
            }
          />
          <Bar dataKey="count" fill={SERIES.inlet} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
      </div>
    </div>
  )
})
