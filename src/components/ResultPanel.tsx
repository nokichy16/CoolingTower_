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

/** e = Δh / Δω swept over condensing temperature, from the fixed exhaust state. */
function sweep(r: TowerResults) {
  const p = r.inputs.pressure
  const { h: h4, omega: w4, t: t4 } = r.exhaust
  const pts: { t: number; e: number }[] = []
  for (let t = 2; t < t4 - 0.5; t += 0.5) {
    const dW = w4 - omegaSat(t, p)
    const dH = h4 - hSat(t, p)
    if (dW > 1e-6) pts.push({ t, e: dH / dW })
  }
  return pts
}

function WaterBalanceFlow({ r }: { r: TowerResults }) {
  const grossMakeup = Math.max(r.water.makeup, 1e-9)
  const recoveredFromEvaporation = Math.min(r.condensed.mDotCond, r.water.evap)
  const ambientMoistureCaptured = Math.max(0, r.condensed.mDotCond - r.water.evap)
  const recoveryShare =
    r.water.evap > 0 ? (recoveredFromEvaporation / r.water.evap) * 100 : 0
  const netMakeupIfReused = Math.max(0, r.water.makeup - r.condensed.mDotCond)

  const losses = [
    { label: 'Evaporation', value: r.water.evap, className: 'flow-evap' },
    { label: 'Drift', value: r.water.drift, className: 'flow-drift' },
  ]

  return (
    <div className="card water-flow-card">
      <div className="water-flow-head">
        <div>
          <h4>Water-balance flow</h4>
          <p className="card-note">Every bar uses the same mass-flow scale.</p>
        </div>
        <div className="water-flow-kpis">
          <div>
            <span>Modeled makeup</span>
            <strong>{fmt(r.water.makeup, 2)} kg/s</strong>
            <small>evaporation + drift</small>
          </div>
          <div>
            <span>Potential net modeled makeup</span>
            <strong>{fmt(netMakeupIfReused, 2)} kg/s</strong>
            <small>if all condensate is reused</small>
          </div>
        </div>
      </div>

      <div
        className="water-flow-list"
        role="img"
        aria-label={`Modeled makeup ${fmt(r.water.makeup, 2)} kilograms per second consists of evaporation ${fmt(r.water.evap, 2)} and drift ${fmt(r.water.drift, 3)} kilograms per second. Blowdown is not included. Recovery captures ${fmt(recoveredFromEvaporation, 2)} kilograms per second from the evaporation stream.`}
      >
        {losses.map((loss) => {
          const share = Math.max(0, Math.min(100, (loss.value / grossMakeup) * 100))
          return (
            <div className="water-flow-row" key={loss.label}>
              <div className="water-flow-label">
                <span>{loss.label}</span>
                <strong>{fmt(loss.value, loss.label === 'Drift' ? 3 : 2)} kg/s</strong>
              </div>
              <div className="water-flow-track" aria-hidden="true">
                <span
                  className={`water-flow-bar ${loss.className}`}
                  style={{ width: `${share}%` }}
                >
                  {loss.label === 'Evaporation' && (
                    <span
                      className="water-flow-recovered"
                      style={{ width: `${recoveryShare}%` }}
                    />
                  )}
                </span>
              </div>
              <span className="water-flow-share">{fmt(share, 1)}%</span>
            </div>
          )
        })}
      </div>

      <div className="water-flow-legend">
        <span><i className="legend-swatch legend-recovered" />Recovered from evaporation</span>
        <span><i className="legend-swatch legend-vapour" />Unrecovered evaporation</span>
        {ambientMoistureCaptured > 1e-6 && (
          <span>+ {fmt(ambientMoistureCaptured, 2)} kg/s ambient moisture captured</span>
        )}
      </div>
      <p className="card-note">Blowdown and water-treatment losses are excluded for now.</p>
    </div>
  )
}

export default function ResultPanel({ r }: { r: TowerResults }) {
  const c = r.condensed
  const data = sweep(r)
  const latFrac = c.dH > 0 ? Math.max(0, Math.min(1, c.qLat / c.dH)) : 0

  // Solver issues first — an error there means nothing below describes a real
  // tower. The recovery-target check is local to this panel.
  type Alert = {
    code: string
    severity: 'error' | 'warning'
    title: string
    message: string
  }
  const alerts: Alert[] = [...r.issues]
  if (r.valid && !c.feasible) {
    alerts.push({
      code: 'condensation-infeasible',
      severity: 'warning',
      title: 'Condensation is not feasible',
      message: `Set the recovery target below the ${fmt(r.exhaust.t)} °C exhaust temperature.`,
    })
  }

  return (
    <div className={`results${r.valid ? '' : ' is-invalid'}`}>
      {alerts.length > 0 && (
        <div className="result-alerts" role="status">
          {alerts.map((a) => (
            <div className={`result-alert is-${a.severity}`} key={a.code}>
              <strong>{a.title}</strong>
              <span>{a.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Where Δh actually goes. Latent dominates at shallow cooling and the
          sensible share grows as you cool deeper — that shift is the reason e
          moves. The condensed-state values themselves live on station 6. */}
      {c.feasible && (
        <div className="card">
          <div className="split-head">
            <span>Δh split · station 6</span>
            <span className="split-nums">
              q_lat {fmt(c.qLat)} · q_sen {fmt(c.qSen)} kJ/kg
            </span>
          </div>
          <div
            className="split-bar"
            role="img"
            aria-label={`Latent ${Math.round(latFrac * 100)} percent, sensible ${Math.round(
              (1 - latFrac) * 100,
            )} percent of the energy released`}
          >
            <span className="split-lat" style={{ width: `${latFrac * 100}%` }}>
              {latFrac > 0.18 && `${Math.round(latFrac * 100)}% latent`}
            </span>
            <span className="split-sen" style={{ width: `${(1 - latFrac) * 100}%` }}>
              {1 - latFrac > 0.18 && `${Math.round((1 - latFrac) * 100)}% sensible`}
            </span>
          </div>
        </div>
      )}

      <WaterBalanceFlow r={r} />

      <div className="card chart-card">
        <h4>e versus condensing temperature</h4>
        <p className="card-note">
          How far you cool the exhaust sets the recovery cost. The marker is your
          current target.
        </p>
        <div className="chart">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={data} margin={{ top: 26, right: 28, bottom: 4, left: 4 }}>
              <XAxis
                dataKey="t"
                type="number"
                domain={['dataMin', 'dataMax']}
                tick={{ fill: '#8a94a6', fontSize: 11 }}
                tickFormatter={(v) => `${v}`}
                stroke="#2c3444"
                label={{ value: 'T₅  (°C)', position: 'insideBottom', offset: -2, fill: '#8a94a6', fontSize: 11 }}
              />
              <YAxis
                tick={{ fill: '#8a94a6', fontSize: 11 }}
                stroke="#2c3444"
                width={48}
                label={{ value: 'e  kJ/kg', angle: -90, position: 'insideLeft', fill: '#8a94a6', fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{ background: '#141a24', border: '1px solid #2c3444', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#cdd6e4' }}
                formatter={(v: number) => [`${fmt(v, 0)} kJ/kg`, 'e']}
                labelFormatter={(v) => `T₅ = ${v} °C`}
              />
              {c.feasible && (
                <>
                  <ReferenceLine x={c.t} stroke="#ff9f45" strokeDasharray="4 3" />
                  <ReferenceDot
                    x={c.t}
                    y={c.e}
                    r={5}
                    fill="#ff9f45"
                    stroke="#0c0f14"
                    strokeWidth={2}
                    label={{
                      value: `${fmt(c.e, 0)} kJ/kg`,
                      position: 'top',
                      fill: '#ff9f45',
                      fontSize: 11,
                    }}
                  />
                </>
              )}
              <Line type="monotone" dataKey="e" stroke="#34d1bf" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
