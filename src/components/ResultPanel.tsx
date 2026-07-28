import {
  Line,
  LineChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { TowerResults } from '../lib/model'
import { hSat, omegaSat } from '../lib/psychrometrics'
import { fmt } from '../lib/format'

function recoverySweep(r: TowerResults) {
  const points: {
    depth: number
    recovered: number
    duty: number
  }[] = []

  for (let depth = 0; depth <= 25; depth += 0.5) {
    const t = Math.max(0, r.plume.dewPoint - depth)
    const dOmega = Math.max(
      0,
      r.plume.omega - omegaSat(t, r.inputs.pressure),
    )
    const dH = Math.max(0, r.plume.h - hSat(t, r.inputs.pressure))
    points.push({
      depth,
      recovered: r.inputs.airMassFlow * dOmega,
      duty: r.inputs.airMassFlow * dH,
    })
  }

  return points
}

export default function ResultPanel({ r }: { r: TowerResults }) {
  const data = recoverySweep(r)
  const visibleIssues = r.issues.filter(
    (issue) => !issue.code.startsWith('ruiz-'),
  )

  return (
    <div className="results">
      {visibleIssues.length > 0 && (
        <div className="result-alerts" role="status">
          {visibleIssues.map((issue) => (
            <div
              className={`result-alert is-${issue.severity}`}
              key={issue.code}
            >
              <strong>{issue.title}</strong>
              <span>{issue.message}</span>
            </div>
          ))}
        </div>
      )}

      <div className="result-grid">
        <section className="card droplet-card">
          <div className="result-card-head">
            <div>
              <span className="eyebrow">Drift eliminator</span>
              <h4>Droplet reduction</h4>
            </div>
            <strong className="result-hero droplet-hero">
              {fmt(r.droplets.reductionPct, 1)}%
            </strong>
          </div>

          <div
            className="reduction-comparison"
            role="img"
            aria-label={`${fmt(
              r.droplets.reductionPct,
              1,
            )} percent of selected droplets removed and ${fmt(
              r.droplets.remainingPct,
              1,
            )} percent remaining`}
          >
            <span
              className="removed"
              style={{ width: `${r.droplets.reductionPct}%` }}
            >
              Removed
            </span>
            <span
              className="remaining"
              style={{ width: `${r.droplets.remainingPct}%` }}
            >
              {r.droplets.remainingPct > 12 ? 'Remaining' : ''}
            </span>
          </div>

          <div className="compact-kpis">
            <div>
              <span>Selected size</span>
              <strong>{fmt(r.inputs.dropletDiameter, 0)} µm</strong>
            </div>
            <div>
              <span>Remaining</span>
              <strong>{fmt(r.droplets.remainingPct, 1)}%</strong>
            </div>
            <div>
              <span>Stokes number</span>
              <strong>{fmt(r.eliminator.stokes, 2)}</strong>
            </div>
            <div>
              <span>Supported size now</span>
              <strong>
                {fmt(r.droplets.supportedDiameterMin, 0)}–
                {fmt(r.droplets.supportedDiameterMax, 0)} µm
              </strong>
            </div>
          </div>
        </section>

        <section className="card recovery-card">
          <div className="result-card-head">
            <div>
              <span className="eyebrow">Condensation recovery</span>
              <h4>Energy required per kilogram</h4>
            </div>
            <strong className="result-hero">
              {r.recovery.feasible ? `${fmt(r.recovery.e, 0)} kJ/kg` : '—'}
            </strong>
          </div>

          <div className="compact-kpis">
            <div>
              <span>Theoretical recovery</span>
              <strong>{fmt(r.recovery.mDotCond, 2)} kg/s</strong>
            </div>
            <div>
              <span>Cooling duty</span>
              <strong>{fmt(r.recovery.qDuty, 0)} kW</strong>
            </div>
            <div>
              <span>Recovery outlet</span>
              <strong>{fmt(r.recovery.t)} °C</strong>
            </div>
          </div>

          <div className="state-line">
            <span>
              Exhaust <b>{fmt(r.plume.t)} °C</b>
            </span>
            <i>→</i>
            <span>
              Dew point <b>{fmt(r.plume.dewPoint)} °C</b>
            </span>
            <i>→</i>
            <span>
              Outlet <b>{fmt(r.recovery.t)} °C</b>
            </span>
          </div>
        </section>
      </div>

      <section className="card chart-card">
        <h4>Recovered water versus cooling below dew point</h4>
        <p className="card-note">
          The curve shows theoretical condensation for the selected plume and
          dry-air flow. The marker is the current setting.
        </p>
        <div className="chart">
          <ResponsiveContainer width="100%" height={250}>
            <LineChart
              data={data}
              margin={{ top: 28, right: 28, bottom: 6, left: 4 }}
            >
              <XAxis
                dataKey="depth"
                type="number"
                domain={[0, 25]}
                tick={{ fill: '#8a94a6', fontSize: 11 }}
                stroke="#2c3444"
                label={{
                  value: 'Cooling below dew point  (K)',
                  position: 'insideBottom',
                  offset: -2,
                  fill: '#8a94a6',
                  fontSize: 11,
                }}
              />
              <YAxis
                tick={{ fill: '#8a94a6', fontSize: 11 }}
                stroke="#2c3444"
                width={56}
                label={{
                  value: 'kg/s theoretical',
                  angle: -90,
                  position: 'insideLeft',
                  fill: '#8a94a6',
                  fontSize: 11,
                }}
              />
              <Tooltip
                contentStyle={{
                  background: '#141a24',
                  border: '1px solid #2c3444',
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelStyle={{ color: '#cdd6e4' }}
                formatter={(value: number, name: string) =>
                  name === 'recovered'
                    ? [`${fmt(value, 2)} kg/s`, 'Theoretical recovery']
                    : [`${fmt(value, 0)} kW`, 'Cooling duty']
                }
                labelFormatter={(value) => `${value} K below dew point`}
              />
              <ReferenceLine
                x={r.inputs.coolingBelowDewPoint}
                stroke="#ff9f45"
                strokeDasharray="4 3"
              />
              <ReferenceDot
                x={r.inputs.coolingBelowDewPoint}
                y={r.recovery.mDotCond}
                r={5}
                fill="#ff9f45"
                stroke="#0c0f14"
                strokeWidth={2}
                label={{
                  value: `${fmt(r.recovery.mDotCond, 2)} kg/s`,
                  position: 'top',
                  fill: '#ff9f45',
                  fontSize: 11,
                }}
              />
              <Line
                type="monotone"
                dataKey="recovered"
                stroke="#34d1bf"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  )
}
