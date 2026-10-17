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
  const fMaxPct = 100 * (split.below + split.within)

  // Y ticks: 0 and 100 plus F(d_min) and F(d_max), skipping any that would
  // sit on top of another label.
  const yTicks = [0, 100, 100 * split.below, fMaxPct]
    .map((v) => Math.round(v))
    .filter((v, i, all) => all.findIndex((u) => Math.abs(u - v) < 7) === i)
    .sort((x, y) => x - y)

  // Place each share label away from the curve: below it where the curve
  // runs high through the region, above it where the curve runs low.
  const regionLabel = (
    fraction: number,
    x1: number,
    x2: number,
    emphasis = false,
  ) => {
    const curveAtMiddle = rosinRammlerCumulative(Math.sqrt(x1 * x2), dE, n)
    return {
      value: `${fmt(fraction * 100, 1)} %`,
      position: curveAtMiddle > 0.5 ? 'insideBottom' : 'insideTop',
      offset: 14,
      fill: emphasis ? '#252525' : '#57524a',
      fontSize: emphasis ? 13 : 11,
      fontWeight: emphasis ? 600 : 400,
    } as const
  }

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
          <ResponsiveContainer width="100%" height={250}>
            <LineChart
              data={data}
              margin={{ top: 22, right: 14, bottom: 8, left: -6 }}
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
                  value: 'Droplet diameter d  (µm)',
                  position: 'insideBottom',
                  offset: -4,
                  fill: '#4c4943',
                  fontSize: 10,
                }}
              />
              <YAxis
                domain={[0, 100]}
                ticks={yTicks}
                tick={{ fill: '#4c4943', fontSize: 10 }}
                stroke="#aaa49a"
                width={44}
                label={{
                  value: 'Mass < d  (%)',
                  angle: -90,
                  position: 'insideLeft',
                  offset: 14,
                  fill: '#137f70',
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
                labelStyle={{ color: '#57524a' }}
                formatter={(value: number) => [
                  `${fmt(value, 1)} %`,
                  'Cumulative mass',
                ]}
                labelFormatter={(value) => `${fmt(Number(value), 1)} µm`}
              />
              {rangeValid && (
                <>
                  <ReferenceArea
                    x1={PLOT_MIN}
                    x2={dMin}
                    fill="none"
                    stroke="none"
                    label={regionLabel(split.below, PLOT_MIN, dMin)}
                  />
                  <ReferenceArea
                    x1={dMin}
                    x2={dMax}
                    fill="#ff9f45"
                    fillOpacity={0.12}
                    stroke="none"
                    label={regionLabel(split.within, dMin, dMax, true)}
                  />
                  <ReferenceArea
                    x1={dMax}
                    x2={PLOT_MAX}
                    fill="none"
                    stroke="none"
                    label={regionLabel(split.above, dMax, PLOT_MAX)}
                  />
                  <ReferenceLine
                    segment={[
                      { x: PLOT_MIN, y: 100 * split.below },
                      { x: dMin, y: 100 * split.below },
                    ]}
                    stroke="#888780"
                    strokeDasharray="2 3"
                    ifOverflow="extendDomain"
                  />
                  <ReferenceLine
                    segment={[
                      { x: PLOT_MIN, y: fMaxPct },
                      { x: dMax, y: fMaxPct },
                    ]}
                    stroke="#888780"
                    strokeDasharray="2 3"
                    ifOverflow="extendDomain"
                  />
                </>
              )}
              <ReferenceLine
                x={dMin}
                stroke="#ff9f45"
                strokeDasharray="4 3"
                label={{
                  value: 'd_min',
                  position: 'top',
                  fill: '#b8641a',
                  fontSize: 10,
                }}
              />
              <ReferenceLine
                x={dMax}
                stroke="#ff9f45"
                strokeDasharray="4 3"
                label={{
                  value: 'd_max',
                  position: 'top',
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

          {!rangeValid && (
            <p className="droplet-warning" role="alert">
              d_min must be smaller than d_max.
            </p>
          )}
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
