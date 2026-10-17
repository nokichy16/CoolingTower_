import {
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { TowerInputs } from '../lib/model'
import {
  distributionSplit,
  logSpacedDiameters,
  rosinRammlerCumulative,
} from '../lib/droplet-distribution'
import { fmt } from '../lib/format'
import Field from './Field'

interface DropletDistributionProps {
  inputs: TowerInputs
  onChange: (patch: Partial<TowerInputs>) => void
}

const PLOT_MIN = 1 // µm
const PLOT_MAX = 1000 // µm

/**
 * Drift droplets entering the eliminator: selected diameter range and
 * Rosin–Rammler inlet distribution, shown as cumulative mass fraction with
 * the range marked on the curve. The distribution is an input assumption and
 * is not yet linked to the eliminator collection calculation.
 */
export default function DropletDistribution({
  inputs,
  onChange,
}: DropletDistributionProps) {
  const {
    dropletCharacteristicDiameter: dE,
    dropletSpread: n,
    dropletDiameterMin: dMin,
    dropletDiameterMax: dMax,
  } = inputs

  const data = logSpacedDiameters(PLOT_MIN, PLOT_MAX, 160).map((d) => ({
    d,
    cumulative: 100 * rosinRammlerCumulative(d, dE, n),
  }))
  const split = distributionSplit(dMin, dMax, dE, n)
  const rangeValid = dMin < dMax

  return (
    <section className="input-group is-wide" aria-labelledby="group-droplets">
      <h3 className="input-group-title" id="group-droplets">
        Drift droplets
      </h3>

      <div className="droplet-layout">
        <div className="droplet-fields">
          <Field
            label="Minimum droplet size"
            sym="d_min"
            unit="µm"
            value={dMin}
            min={1}
            max={dMax - 1}
            step={1}
            digits={0}
            onChange={(value) => onChange({ dropletDiameterMin: value })}
          />
          <Field
            label="Maximum droplet size"
            sym="d_max"
            unit="µm"
            value={dMax}
            min={dMin + 1}
            max={1000}
            step={1}
            digits={0}
            onChange={(value) => onChange({ dropletDiameterMax: value })}
          />
          <Field
            label="Characteristic diameter"
            sym="dₑ"
            unit="µm"
            value={dE}
            min={5}
            max={500}
            step={1}
            digits={0}
            onChange={(value) =>
              onChange({ dropletCharacteristicDiameter: value })
            }
          />
          <Field
            label="Spread"
            sym="n"
            unit=""
            value={n}
            min={0.5}
            max={6}
            step={0.1}
            digits={1}
            onChange={(value) => onChange({ dropletSpread: value })}
          />
        </div>

        <div className="droplet-result">
          <div className="droplet-chart">
            <span className="droplet-chart-title">
              Cumulative mass smaller than d
            </span>
            <ResponsiveContainer width="100%" height={190}>
              <LineChart
                data={data}
                margin={{ top: 18, right: 14, bottom: 6, left: -8 }}
              >
                <XAxis
                  dataKey="d"
                  type="number"
                  scale="log"
                  domain={[PLOT_MIN, PLOT_MAX]}
                  ticks={[1, 10, 100, 1000]}
                  tick={{ fill: '#4c4943', fontSize: 10 }}
                  stroke="#aaa49a"
                  label={{
                    value: 'd  (µm)',
                    position: 'insideBottom',
                    offset: -2,
                    fill: '#4c4943',
                    fontSize: 10,
                  }}
                />
                <YAxis
                  domain={[0, 100]}
                  ticks={[0, 50, 100]}
                  tick={{ fill: '#4c4943', fontSize: 10 }}
                  stroke="#aaa49a"
                  width={44}
                  label={{
                    value: '%',
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
                    `${fmt(value, 1)} %`,
                    'Cumulative mass',
                  ]}
                  labelFormatter={(value) => `${fmt(Number(value), 1)} µm`}
                />
                {rangeValid && (
                  <ReferenceArea
                    x1={dMin}
                    x2={dMax}
                    fill="#ff9f45"
                    fillOpacity={0.12}
                    stroke="none"
                  />
                )}
                <ReferenceLine
                  x={dMin}
                  stroke="#ff9f45"
                  strokeDasharray="4 3"
                  label={{
                    value: `d_min ${fmt(dMin, 0)}`,
                    position: 'insideTopLeft',
                    fill: '#b8641a',
                    fontSize: 10,
                  }}
                />
                <ReferenceLine
                  x={dMax}
                  stroke="#ff9f45"
                  strokeDasharray="4 3"
                  label={{
                    value: `d_max ${fmt(dMax, 0)}`,
                    position: 'insideBottomRight',
                    fill: '#b8641a',
                    fontSize: 10,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="cumulative"
                  stroke="#137f70"
                  strokeWidth={2.4}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="droplet-checks" aria-live="polite">
            <div className={`droplet-check${rangeValid ? '' : ' is-bad'}`}>
              <span>Range</span>
              <strong>
                {rangeValid
                  ? `${fmt(dMin, 0)}–${fmt(dMax, 0)} µm`
                  : 'd_min ≥ d_max'}
              </strong>
            </div>
            <div className="droplet-check">
              <span>Below d_min</span>
              <strong>{fmt(split.below * 100, 1)} %</strong>
            </div>
            <div className="droplet-check">
              <span>Within range</span>
              <strong>{fmt(split.within * 100, 1)} %</strong>
            </div>
            <div className="droplet-check">
              <span>Above d_max</span>
              <strong>{fmt(split.above * 100, 1)} %</strong>
            </div>
          </div>
        </div>
      </div>

      <p className="card-note">
        Rosin–Rammler form F(d) = 1 − exp[−(d/dₑ)ⁿ]. dₑ and n are placeholder
        inputs, not measured data. This distribution is not yet used in the
        eliminator capture calculation.
      </p>
    </section>
  )
}
