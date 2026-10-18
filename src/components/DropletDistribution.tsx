import {
  Line,
  LineChart,
  ReferenceArea,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { TowerInputs, TowerResults } from '../lib/model'
import {
  linearDiameters,
  logNormalCumulative,
} from '../lib/droplet-distribution'
import { fmt } from '../lib/format'
import Field from './Field'

interface DropletDistributionProps {
  inputs: TowerInputs
  droplets: TowerResults['droplets']
  onChange: (patch: Partial<TowerInputs>) => void
}

const PLOT_MIN = 0 // µm
const PLOT_MAX = 500 // µm, same span as Ruiz et al. (2013) Fig. 9

/**
 * Drift droplets entering the eliminator: log-normal cumulative mass
 * distribution over the full size range, with the eliminator d50 cutoff
 * marked. Droplets smaller than d50 escape; larger droplets are captured
 * (ideal sharp cut).
 */
export default function DropletDistribution({
  inputs,
  droplets,
  onChange,
}: DropletDistributionProps) {
  const { dropletD10: d10, dropletD90: d90 } = inputs
  const {
    cutoffFound,
    captureCutoffDiameter: d50,
    massEscaping,
    massCaptured,
    medianDiameter: dMed,
    geometricSpread: sg,
  } = droplets

  const data = linearDiameters(PLOT_MIN, PLOT_MAX, 251).map((d) => ({
    d,
    cumulative: 100 * logNormalCumulative(d, dMed, sg),
  }))
  const escapingPct = 100 * massEscaping
  const yTicks = cutoffFound
    ? [0, 100, Math.round(escapingPct)].filter(
        (v, i, all) => all.findIndex((u) => Math.abs(u - v) < 7) === i,
      ).sort((x, y) => x - y)
    : [0, 50, 100]

  return (
    <section className="input-group is-wide" aria-labelledby="group-droplets">
      <h3 className="input-group-title" id="group-droplets">
        Drift droplets
      </h3>

      <div className="droplet-layout">
        <div className="droplet-fields">
          <Field
            label="10 % mass diameter"
            sym="d₁₀"
            unit="µm"
            value={d10}
            min={1}
            max={Math.max(1, d90 - 1)}
            step={0.1}
            digits={1}
            onChange={(value) => onChange({ dropletD10: value })}
          />
          <Field
            label="90 % mass diameter"
            sym="d₉₀"
            unit="µm"
            value={d90}
            min={d10 + 1}
            max={500}
            step={0.1}
            digits={1}
            onChange={(value) => onChange({ dropletD90: value })}
          />
          <dl className="droplet-derived">
            <div>
              <dt>Mass median d_med</dt>
              <dd>{fmt(dMed, 1)} µm</dd>
            </div>
            <div>
              <dt>Geometric spread σg</dt>
              <dd>{fmt(sg, 2)}</dd>
            </div>
          </dl>
          <p className="card-note">
            Log-normal by mass, fitted through d₁₀ and d₉₀. Defaults: Ruiz et
            al. (2013), test run 1, measured at the tower exit.
          </p>
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
                domain={[PLOT_MIN, PLOT_MAX]}
                ticks={[0, 100, 200, 300, 400, 500]}
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
                labelFormatter={(value) => `${fmt(Number(value), 0)} µm`}
              />
              {cutoffFound && (
                <>
                  <ReferenceArea
                    x1={d50}
                    x2={PLOT_MAX}
                    fill="#c9b568"
                    fillOpacity={0.14}
                    stroke="none"
                    label={{
                      value: `Captured ${fmt(100 * massCaptured, 1)} %`,
                      position: 'center',
                      fill: '#252525',
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  />
                  <ReferenceLine
                    segment={[
                      { x: PLOT_MIN, y: escapingPct },
                      { x: d50, y: escapingPct },
                    ]}
                    stroke="#888780"
                    strokeDasharray="2 3"
                  />
                  <ReferenceLine
                    x={d50}
                    stroke="#b8641a"
                    strokeDasharray="4 3"
                    label={{
                      value: 'd₅₀',
                      position: 'top',
                      fill: '#b8641a',
                      fontSize: 11,
                    }}
                  />
                  <ReferenceDot
                    x={d50}
                    y={escapingPct}
                    r={3.5}
                    fill="#b8641a"
                    stroke="none"
                    label={{
                      value: `Escapes ${fmt(escapingPct, 1)} %`,
                      position: 'right',
                      offset: 8,
                      fill: '#57524a',
                      fontSize: 11,
                    }}
                  />
                </>
              )}
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

          {!cutoffFound && (
            <p className="droplet-warning" role="status">
              No 50 % cutoff for this eliminator: the Ruiz correlation stays
              above 50 % capture at all sizes. Captured mass is not shown.
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
