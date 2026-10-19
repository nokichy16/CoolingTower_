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
import { countHistogram } from '../lib/droplet-distribution'
import { fmt } from '../lib/format'
import Field from './Field'

interface DropletDistributionProps {
  inputs: TowerInputs
  droplets: TowerResults['droplets']
  onChange: (patch: Partial<TowerInputs>) => void
}

export const GRID_STROKE = '#dcd8cf'
const BIN_UM = 5

/**
 * Inlet drift droplets (graph 1): relative number of droplets per 5 µm size
 * class, in the style of Ruiz et al. (2013) Fig. 8. The shape comes from the
 * two-mode mass distribution set by the inputs.
 */
export default function DropletDistribution({
  inputs,
  droplets,
  onChange,
}: DropletDistributionProps) {
  const p = distributionParams(inputs)
  const bins = countHistogram(p, BIN_UM)
  const xTicks = Array.from(
    { length: Math.floor(p.dMaxUm / 50) + 1 },
    (_, i) => i * 50,
  )

  return (
    <section className="input-group is-wide" aria-labelledby="group-droplets">
      <h3 className="input-group-title" id="group-droplets">
        Drift droplets at the eliminator inlet
      </h3>

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
            label="Smallest droplets (1 %)"
            sym="d_min"
            unit="µm"
            value={inputs.dropletDMin}
            min={1}
            max={Math.max(1, inputs.dropletDMedMain - 1)}
            step={0.5}
            digits={1}
            onChange={(value) => onChange({ dropletDMin: value })}
          />
          <Field
            label="Main-mode median"
            sym="d_med"
            unit="µm"
            value={inputs.dropletDMedMain}
            min={inputs.dropletDMin + 1}
            max={200}
            step={0.5}
            digits={1}
            onChange={(value) => onChange({ dropletDMedMain: value })}
          />
          <Field
            label="Largest droplets (100 %)"
            sym="d_max"
            unit="µm"
            value={inputs.dropletDMax}
            min={Math.ceil(inputs.dropletDMedMain + 10)}
            max={1000}
            step={10}
            digits={0}
            onChange={(value) => onChange({ dropletDMax: value })}
          />
          <Field
            label="Tail mass fraction"
            sym="w"
            unit="%"
            value={inputs.dropletTailFraction * 100}
            min={0}
            max={40}
            step={0.5}
            digits={1}
            onChange={(value) => onChange({ dropletTailFraction: value / 100 })}
          />
          <Field
            label="Tail median"
            sym="d_tail"
            unit="µm"
            value={inputs.dropletTailMedian}
            min={20}
            max={Math.max(20, inputs.dropletDMax)}
            step={5}
            digits={0}
            onChange={(value) => onChange({ dropletTailMedian: value })}
          />
          <Field
            label="Tail spread"
            sym="σg,tail"
            unit=""
            value={inputs.dropletTailSpread}
            min={1.1}
            max={3}
            step={0.05}
            digits={2}
            onChange={(value) => onChange({ dropletTailSpread: value })}
          />
          <dl className="droplet-derived">
            <div>
              <dt>Main-mode spread σg</dt>
              <dd>{fmt(droplets.mainSpread, 2)}</dd>
            </div>
          </dl>
        </div>

        <div className="droplet-result">
          <span className="droplet-chart-title">
            Inlet: relative number of droplets per {BIN_UM} µm size class
          </span>
          <ResponsiveContainer width="100%" height={250}>
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
                tick={{ fill: '#4c4943', fontSize: 10 }}
                stroke="#aaa49a"
                label={{
                  value: 'Droplet diameter d  (µm)',
                  position: 'insideBottom',
                  offset: -4,
                  fill: '#4c4943',
                  fontSize: 10,
                }}
              />
              <YAxis
                domain={[0, 1]}
                ticks={[0, 0.25, 0.5, 0.75, 1]}
                tick={{ fill: '#4c4943', fontSize: 10 }}
                stroke="#aaa49a"
                width={52}
              />
              <Tooltip
                contentStyle={{
                  background: '#fbfaf7',
                  border: '1px solid #d8d3ca',
                  borderRadius: 8,
                  color: '#252525',
                  fontSize: 11,
                }}
                formatter={(value: number) => [fmt(value, 3), 'Relative count']}
                labelFormatter={(mid) =>
                  `${fmt(Number(mid) - BIN_UM / 2, 0)}–${fmt(
                    Number(mid) + BIN_UM / 2,
                    0,
                  )} µm`
                }
              />
              <Bar dataKey="count" fill="#137f70" isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
          <p className="card-note">
            Two log-normal modes by mass, cut at d_max. Defaults: fit to Ruiz et
            al. (2013) Fig. 9(a), run 1, measured at the tower exit. The inlet
            shape is therefore an assumption.
          </p>
        </div>
      </div>
    </section>
  )
}
