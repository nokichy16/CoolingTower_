import type { TowerResults } from '../lib/model'
import { fmt, sig } from '../lib/format'

interface Step {
  step: string
  formula: string
  value: string
  unit: string
}

/**
 * Calculation sequence for both paths, in calculation order, with the
 * formula used at each step. No input values are repeated here.
 */
export default function CalculationSequence({ r }: { r: TowerResults }) {
  const d = r.droplets
  const cut = d.cutoffFound
  const air: Step[] = [
    { step: 'Humidity ratio', formula: 'ω₄ = 0.622·p_v / (P − p_v)', value: sig(r.plume.omega, 4), unit: 'kg/kg da' },
    { step: 'Dew point', formula: 'T_dew : p_sat(T_dew) = p_v', value: fmt(r.plume.dewPoint, 1), unit: '°C' },
    { step: 'Moist-air density', formula: 'ρ = (1 + ω)·P / (R_da·T·(1 + 1.608ω))', value: fmt(r.plume.rho, 3), unit: 'kg/m³' },
    { step: 'Volumetric flow', formula: 'V̇ = A·u', value: fmt(r.plume.vDot, 1), unit: 'm³/s' },
    { step: 'Dry-air mass flow', formula: 'ṁ_da = ρ·V̇ / (1 + ω)', value: fmt(r.plume.airMassFlow, 1), unit: 'kg/s' },
    { step: 'Reynolds number', formula: 'Re = ρ·u·L / μ', value: fmt(r.eliminator.reynolds, 0), unit: '' },
    { step: 'Loss coefficient', formula: 'Kp = f(Re, geometry)  (Ruiz 2019)', value: fmt(r.eliminator.pressureCoefficient, 2), unit: '' },
    { step: 'Pressure drop', formula: 'Δp = Kp·½ρu²', value: fmt(d.pressureDrop, 1), unit: 'Pa' },
    { step: 'Ideal fan air power', formula: 'P = V̇·Δp', value: fmt(d.fanAirPower, 1), unit: 'kW' },
    { step: 'Recovery outlet', formula: 'T₅ = T_dew − ΔT_dew  (saturated)', value: fmt(r.recovery.t, 1), unit: '°C' },
    { step: 'Humidity condensed', formula: 'Δω = ω₄ − ω_sat(T₅)', value: sig(r.recovery.dOmega, 3), unit: 'kg/kg da' },
    { step: 'Water recovered', formula: 'ṁ_cond = ṁ_da·Δω', value: fmt(r.recovery.mDotCond, 2), unit: 'kg/s' },
    { step: 'Cooling duty', formula: 'Q = ṁ_da·Δh', value: fmt(r.recovery.qDuty, 0), unit: 'kW' },
    { step: 'Energy per kilogram', formula: 'e = Δh / Δω', value: r.recovery.feasible ? fmt(r.recovery.e, 0) : '—', unit: 'kJ/kg' },
  ]
  const liquid: Step[] = [
    { step: 'Drift entering eliminator', formula: 'ṁ_drift,in = ṁ_circ·D_in / 100', value: sig(d.driftInlet, 3), unit: 'kg/s' },
    { step: 'Spread', formula: 'σg = (d_med / d_min)^(1/2.326)', value: fmt(d.spread, 2), unit: '' },
    { step: 'Cutoff diameter', formula: 'd₅₀ : ε(St(d₅₀)) = 0.5  (Ruiz 2019)', value: cut ? fmt(d.captureCutoffDiameter, 1) : 'None', unit: cut ? 'µm' : '' },
    { step: 'Mass fraction escaping', formula: 'F(d₅₀), log-normal, cut at d_max', value: cut ? fmt(100 * d.massEscaping, 1) : '—', unit: cut ? '%' : '' },
    { step: 'Drift escaping', formula: 'ṁ_esc = ṁ_drift,in·F(d₅₀)', value: cut ? sig(d.driftEscaping, 3) : '—', unit: cut ? 'kg/s' : '' },
    { step: 'Drift captured', formula: 'ṁ_cap = ṁ_drift,in·(1 − F(d₅₀))', value: cut ? sig(d.driftCaptured, 3) : '—', unit: cut ? 'kg/s' : '' },
    { step: 'Blowdown / evaporation', formula: 'B/E = 1 / (CoC − 1)', value: fmt(100 * r.waterBalance.blowdownToEvaporationRatio, 1), unit: '%' },
  ]

  const table = (title: string, rows: Step[], accent: string) => (
    <div className="calc-block">
      <h3 className="calc-title" style={{ borderColor: accent }}>{title}</h3>
      <table className="calc-table">
        <thead>
          <tr>
            <th>Step</th>
            <th>Formula</th>
            <th className="num">Value</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.step}>
              <th>{row.step}</th>
              <td className="formula">{row.formula}</td>
              <td className="num">
                <strong>{row.value}</strong>
                {row.unit && <small>{row.unit}</small>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  return (
    <section className="calc-sequence" aria-labelledby="calc-title">
      <div className="output-section-head">
        <h2 id="calc-title">Calculation sequence</h2>
        <span>Water vapour and liquid drift are separate paths</span>
      </div>
      <div className="calc-grid">
        {table('Air and water-vapour path', air, '#ff9f45')}
        {table('Liquid drift path', liquid, '#c9b568')}
      </div>
    </section>
  )
}
