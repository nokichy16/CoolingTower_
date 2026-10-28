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
import { collectionEfficiencyAtDiameter } from '../lib/eliminators'
import { fmt } from '../lib/format'
import { GRID_STROKE } from './DropletDistribution'

interface EliminatorOutputProps {
  inputs: TowerInputs
  droplets: TowerResults['droplets']
}

/**
 * Drift eliminator output (graph 2): cumulative mass of the inlet droplets
 * and of the droplets that escape, F_out(d) = ∫₀^d (1 − ε) dF / ∫(1 − ε) dF,
 * in the style of Ruiz et al. (2013) Fig. 9, plus the capture efficiency
 * ε(d).
 */
export default function EliminatorOutput({
  inputs,
  droplets,
}: EliminatorOutputProps) {
  const p = distributionParams(inputs)
  const { massEscaping, massCaptured, split } = droplets
  const curve = split.diameters
    .filter((_, i) => i % 2 === 1)
    .map((d) => {
      const i = split.diameters.indexOf(d)
      return {
        d,
        inlet: 100 * dropletCumulative(d, p),
        outlet: 100 * split.outletCumulative[i],
        eps:
          100 *
          collectionEfficiencyAtDiameter(
            inputs.eliminatorId,
            Math.max(inputs.plumeVelocity, 1e-6),
            inputs.plumeTemperature,
            d,
          ),
      }
    })
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
        <span><i style={{ background: '#137f70' }} />Inlet</span>
        <span><i style={{ background: '#2a78d6' }} />Outlet (escaped droplets, rescaled to 100 %)</span>
        <span><i style={{ background: '#6250d6' }} />Capture efficiency ε(d)</span>
      </div>
      <ResponsiveContainer width="100%" height={440}>
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
            domain={[0, 100]}
            ticks={[0, 20, 40, 60, 80, 100]}
            tick={{ fill: '#4c4943', fontSize: 12.5 }}
            stroke="#aaa49a"
            width={44}
            label={{
              value: 'Mass < d  or  ε  (%)',
              angle: -90,
              position: 'insideLeft',
              offset: 14,
              fill: '#4c4943',
              fontSize: 12.5,
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
              `${fmt(value, 1)} %`,
              name === 'inlet'
                ? 'Inlet'
                : name === 'outlet'
                  ? 'Outlet'
                  : 'Capture ε',
            ]}
            labelFormatter={(value) => `${fmt(Number(value), 0)} µm`}
          />
          <Line
            dataKey="inlet"
            type="monotone"
            stroke="#137f70"
            strokeWidth={2.2}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            dataKey="outlet"
            type="monotone"
            stroke="#2a78d6"
            strokeWidth={2.2}
            strokeDasharray="6 4"
            dot={false}
            isAnimationActive={false}
          />
          <Line
            dataKey="eps"
            type="monotone"
            stroke="#6250d6"
            strokeWidth={1.6}
            strokeDasharray="2 3"
            dot={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
      <dl className="droplet-derived drift-flows">
        <div>
          <dt>Drift entering</dt>
          <dd>{fmt(droplets.driftInlet, 3)} kg/s</dd>
        </div>
        <div>
          <dt>Drift escaping ({fmt(100 * massEscaping, 1)} %)</dt>
          <dd>{fmt(droplets.driftEscaping, 3)} kg/s</dd>
        </div>
        <div>
          <dt>Drift captured ({fmt(100 * massCaptured, 1)} %)</dt>
          <dd>{fmt(droplets.driftCaptured, 3)} kg/s</dd>
        </div>
      </dl>
      <p className="card-note">
        Each droplet size is partly captured, by ε(d) from the Ruiz et al.
        (2019) fit for the selected eliminator. Escaping fraction = ∫(1 − ε) dF.
        Drift (kg/s) = circulating water × inlet drift rate × that fraction;
        the inlet drift rate is an assumption.
      </p>
    </section>
  )
}
