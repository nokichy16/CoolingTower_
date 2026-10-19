import {
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { distributionParams, type TowerInputs, type TowerResults } from '../lib/model'
import {
  RUIZ_2013_RUN1_POINTS,
  twoModeCumulative,
} from '../lib/droplet-distribution'
import { fmt } from '../lib/format'
import { GRID_STROKE } from './DropletDistribution'

interface EliminatorOutputProps {
  inputs: TowerInputs
  droplets: TowerResults['droplets']
}

/**
 * Drift eliminator output (graph 2): cumulative mass of the inlet droplets
 * and of the droplets that escape an ideal sharp cut at d50, in the style of
 * Ruiz et al. (2013) Fig. 9. Ruiz run 1 points are outlet measurements.
 */
export default function EliminatorOutput({
  inputs,
  droplets,
}: EliminatorOutputProps) {
  const p = distributionParams(inputs)
  const { cutoffFound, captureCutoffDiameter: d50, massEscaping, massCaptured } =
    droplets
  const step = p.dMaxUm / 300
  const curve = Array.from({ length: 301 }, (_, i) => {
    const d = Math.max(0.5, i * step)
    const inlet = twoModeCumulative(d, p)
    const outlet = cutoffFound
      ? Math.min(1, twoModeCumulative(Math.min(d, d50), p) / massEscaping)
      : undefined
    return {
      d,
      inlet: 100 * inlet,
      outlet: outlet === undefined ? undefined : 100 * outlet,
    }
  })
  const points = RUIZ_2013_RUN1_POINTS.filter(([d]) => d <= p.dMaxUm).map(
    ([d, y]) => ({ d, ruiz: 100 * y }),
  )
  const xTicks = Array.from(
    { length: Math.floor(p.dMaxUm / 50) + 1 },
    (_, i) => i * 50,
  )
  const escapingPct = 100 * massEscaping

  return (
    <section className="eliminator-output" aria-labelledby="eliminator-output-title">
      <h3 className="input-group-title" id="eliminator-output-title">
        Drift eliminator output
      </h3>
      <div className="chart-legend-row">
        <span><i style={{ background: '#137f70' }} />Inlet</span>
        <span><i style={{ background: '#2a78d6' }} />Outlet (escaped droplets, rescaled to 100 %)</span>
        <span><i className="is-dot" style={{ borderColor: '#eb6834' }} />Ruiz 2013 run 1, tower exit</span>
      </div>
      <ResponsiveContainer width="100%" height={270}>
        <ComposedChart
          data={curve}
          margin={{ top: 22, right: 14, bottom: 8, left: -6 }}
        >
          <CartesianGrid stroke={GRID_STROKE} />
          <XAxis
            dataKey="d"
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
            domain={[0, 100]}
            ticks={[0, 20, 40, 60, 80, 100]}
            tick={{ fill: '#4c4943', fontSize: 10 }}
            stroke="#aaa49a"
            width={44}
            label={{
              value: 'Mass < d  (%)',
              angle: -90,
              position: 'insideLeft',
              offset: 14,
              fill: '#4c4943',
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
            formatter={(value: number, name: string) => [
              `${fmt(value, 1)} %`,
              name === 'inlet' ? 'Inlet' : name === 'outlet' ? 'Outlet' : 'Ruiz 2013',
            ]}
            labelFormatter={(value) => `${fmt(Number(value), 0)} µm`}
          />
          {cutoffFound && (
            <>
              <ReferenceLine
                x={d50}
                stroke="#b8641a"
                strokeDasharray="4 3"
                label={{ value: 'd₅₀', position: 'top', fill: '#b8641a', fontSize: 11 }}
              />
              <ReferenceDot
                x={d50}
                y={escapingPct}
                r={3.5}
                fill="#b8641a"
                stroke="none"
                label={{
                  value: `Escapes ${fmt(escapingPct, 1)} %, captured ${fmt(
                    100 * massCaptured,
                    1,
                  )} %`,
                  position: 'right',
                  offset: 8,
                  fill: '#57524a',
                  fontSize: 11,
                }}
              />
            </>
          )}
          <Line
            dataKey="inlet"
            type="monotone"
            stroke="#137f70"
            strokeWidth={2.2}
            dot={false}
            isAnimationActive={false}
          />
          {cutoffFound && (
            <Line
              dataKey="outlet"
              type="monotone"
              stroke="#2a78d6"
              strokeWidth={2.2}
              strokeDasharray="6 4"
              dot={false}
              isAnimationActive={false}
            />
          )}
          <Scatter
            data={points}
            dataKey="ruiz"
            fill="none"
            stroke="#eb6834"
            shape="circle"
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
      {!cutoffFound && (
        <p className="droplet-warning" role="status">
          No 50 % cutoff for this eliminator: the Ruiz correlation stays above
          50 % capture at all sizes. The outlet curve is not shown.
        </p>
      )}
      {cutoffFound && (
        <dl className="droplet-derived drift-flows">
          <div>
            <dt>Drift entering</dt>
            <dd>{fmt(droplets.driftInlet, 3)} kg/s</dd>
          </div>
          <div>
            <dt>Drift escaping</dt>
            <dd>{fmt(droplets.driftEscaping, 3)} kg/s</dd>
          </div>
          <div>
            <dt>Drift captured</dt>
            <dd>{fmt(droplets.driftCaptured, 3)} kg/s</dd>
          </div>
        </dl>
      )}
      <p className="card-note">
        Ideal sharp cut: droplets smaller than d₅₀ escape, larger droplets are
        captured on the vanes. Drift (kg/s) = circulating water × inlet drift
        rate × mass fraction; the inlet drift rate is an assumption. Ruiz
        points are outlet measurements, so they include large droplets that a
        sharp cut would remove.
      </p>
    </section>
  )
}
