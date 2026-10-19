import { distributionParams, type TowerResults } from '../lib/model'
import {
  massQuantile,
  sauterMeanDiameter,
} from '../lib/droplet-distribution'
import { RUIZ_LIMITS } from '../lib/eliminators'
import type { StageId } from '../lib/stages'
import { fmt, sig } from '../lib/format'

interface Row {
  label: string
  formula: string
  value: string
  unit: string
  kind?: 'input' | 'result'
}

interface StageBlock {
  id: StageId
  index: string
  name: string
  path: 'air' | 'liquid'
  headline: string
  rows: Row[]
  notes?: string[]
}

const input = (label: string, value: string, unit: string): Row => ({
  label,
  formula: 'input',
  value,
  unit,
  kind: 'input',
})

/**
 * Every calculated value, grouped by stage and always visible. Each row shows
 * the quantity, the formula used and the value; input rows are greyed.
 */
export default function StageResults({
  r,
  onSelect,
}: {
  r: TowerResults
  onSelect: (id: StageId) => void
}) {
  const i = r.inputs
  const d = r.droplets
  const cut = d.cutoffFound
  const p = distributionParams(i)
  const dash = (ok: boolean, v: string) => (ok ? v : '—')

  const blocks: StageBlock[] = [
    {
      id: 'plume',
      index: '1',
      name: 'Plume & airflow',
      path: 'air',
      headline: `ṁ_da ${fmt(r.plume.airMassFlow, 1)} kg/s · T_dew ${fmt(r.plume.dewPoint, 1)} °C`,
      rows: [
        input('Plume temperature T₄', fmt(i.plumeTemperature, 1), '°C'),
        input('Relative humidity RH₄', fmt(i.plumeRh, 0), '%'),
        input('Atmospheric pressure P', fmt(i.pressure / 1000, 1), 'kPa'),
        input('Flow area A', fmt(i.flowArea, 2), 'm²'),
        input('Air velocity u₄', fmt(i.plumeVelocity, 3), 'm/s'),
        { label: 'Saturation pressure', formula: 'p_sat = 610.94·exp(17.625T / (T + 243.04))', value: fmt(r.plume.omega > 0 ? (r.plume.omega * i.pressure) / (0.622 + r.plume.omega) / (i.plumeRh / 100) : 0, 0), unit: 'Pa' },
        { label: 'Vapour pressure', formula: 'p_v = RH·p_sat', value: fmt((r.plume.omega * i.pressure) / (0.622 + r.plume.omega), 0), unit: 'Pa' },
        { label: 'Humidity ratio ω₄', formula: 'ω = 0.622·p_v / (P − p_v)', value: sig(r.plume.omega, 4), unit: 'kg/kg da' },
        { label: 'Dew point', formula: 'T_dew : p_sat(T_dew) = p_v', value: fmt(r.plume.dewPoint, 1), unit: '°C' },
        { label: 'Enthalpy h₄', formula: 'h = 1.006T + ω(2501 + 1.86T)', value: fmt(r.plume.h, 1), unit: 'kJ/kg da' },
        { label: 'Moist-air density ρ', formula: 'ρ = (1 + ω)P / (R_da·T(1 + 1.608ω))', value: fmt(r.plume.rho, 3), unit: 'kg/m³' },
        { label: 'Volumetric flow V̇', formula: 'V̇ = A·u', value: fmt(r.plume.vDot, 1), unit: 'm³/s' },
        { label: 'Dry-air mass flow ṁ_da', formula: 'ṁ_da = ρV̇ / (1 + ω)', value: fmt(r.plume.airMassFlow, 1), unit: 'kg/s' },
      ],
    },
    {
      id: 'drift',
      index: '2',
      name: 'Drift droplets',
      path: 'liquid',
      headline: `ṁ_drift,in ${sig(d.driftInlet, 3)} kg/s · D₃₂ ${fmt(sauterMeanDiameter(p), 1)} µm`,
      rows: [
        input('Circulating water ṁ_circ', fmt(i.circulatingWaterFlow, 0), 'kg/s'),
        input('Inlet drift rate D_in', fmt(i.inletDriftRate, 2), '%'),
        input('d_min (1 % of main mode)', fmt(i.dropletDMin, 1), 'µm'),
        input('Main-mode median d_med', fmt(i.dropletDMedMain, 1), 'µm'),
        input('d_max (100 %)', fmt(i.dropletDMax, 0), 'µm'),
        input('Tail mass fraction w', fmt(100 * i.dropletTailFraction, 1), '%'),
        input('Tail median d_tail', fmt(i.dropletTailMedian, 0), 'µm'),
        input('Tail spread σg,tail', fmt(i.dropletTailSpread, 2), ''),
        { label: 'Drift entering eliminator', formula: 'ṁ_drift,in = ṁ_circ·D_in / 100', value: sig(d.driftInlet, 3), unit: 'kg/s' },
        { label: 'Main-mode spread σg', formula: 'σg = (d_med / d_min)^(1/2.326)', value: fmt(d.mainSpread, 2), unit: '' },
        { label: 'Inlet d₁₀ (mass)', formula: 'F(d₁₀) = 0.10', value: fmt(massQuantile(0.1, p), 1), unit: 'µm' },
        { label: 'Inlet mass median', formula: 'F(d) = 0.50', value: fmt(massQuantile(0.5, p), 1), unit: 'µm' },
        { label: 'Inlet d₉₀ (mass)', formula: 'F(d₉₀) = 0.90', value: fmt(massQuantile(0.9, p), 1), unit: 'µm' },
        { label: 'Inlet Sauter mean D₃₂', formula: 'D₃₂ = 1 / ∫ f(d)/d dd', value: fmt(sauterMeanDiameter(p), 1), unit: 'µm' },
      ],
      notes: ['Defaults are a fit to Ruiz et al. (2013) outlet data; the inlet shape and D_in are assumptions.'],
    },
    {
      id: 'droplets',
      index: '3',
      name: 'Drift eliminator',
      path: 'liquid',
      headline: cut
        ? `d₅₀ ${fmt(d.captureCutoffDiameter, 1)} µm · escaping ${sig(d.driftEscaping, 3)} kg/s`
        : 'No 50 % cutoff',
      rows: [
        input('Eliminator', `${r.eliminator.spec.id} · ${r.eliminator.spec.type}`, ''),
        { label: 'Air viscosity μ', formula: 'Sutherland: μ = 1.458e-6·T^1.5 / (T + 110.4)', value: sig(r.eliminator.dynamicViscosity, 4), unit: 'Pa·s' },
        { label: 'Reynolds number', formula: 'Re = ρuL / μ', value: fmt(r.eliminator.reynolds, 0), unit: '' },
        { label: 'Loss coefficient Kp', formula: 'Kp = f(Re, geometry)  (Ruiz 2019)', value: fmt(r.eliminator.pressureCoefficient, 2), unit: '' },
        { label: 'Pressure drop Δp', formula: 'Δp = Kp·½ρu²', value: fmt(d.pressureDrop, 1), unit: 'Pa' },
        { label: 'Stokes number at d_med', formula: 'St = ρ_w·u·d² / (18μL)', value: fmt(r.eliminator.stokes, 3), unit: '' },
        { label: 'Cutoff diameter d₅₀', formula: 'ε(St(d₅₀)) = 0.5', value: cut ? fmt(d.captureCutoffDiameter, 1) : 'None', unit: cut ? 'µm' : '' },
        { label: 'Mass fraction escaping', formula: 'F(d₅₀)', value: dash(cut, fmt(100 * d.massEscaping, 1)), unit: cut ? '%' : '' },
        { label: 'Mass fraction captured', formula: '1 − F(d₅₀)', value: dash(cut, fmt(100 * d.massCaptured, 1)), unit: cut ? '%' : '' },
        { label: 'Drift escaping', formula: 'ṁ_esc = ṁ_drift,in·F(d₅₀)', value: dash(cut, sig(d.driftEscaping, 3)), unit: cut ? 'kg/s' : '' },
        { label: 'Drift captured', formula: 'ṁ_cap = ṁ_drift,in·(1 − F(d₅₀))', value: dash(cut, sig(d.driftCaptured, 3)), unit: cut ? 'kg/s' : '' },
        { label: 'Escaping Sauter mean D₃₂', formula: 'D₃₂ of droplets < d₅₀', value: dash(cut, fmt(sauterMeanDiameter(p, d.captureCutoffDiameter), 1)), unit: cut ? 'µm' : '' },
      ],
      notes: [
        ...r.eliminator.pressureRangeIssues.map((t) => `Outside the Ruiz pressure-correlation range: ${t}.`),
        `Ruiz tested ${RUIZ_LIMITS.velocityMin}–${RUIZ_LIMITS.velocityMax} m/s and droplets ≥ ${RUIZ_LIMITS.dropletDiameterMin} µm.`,
        ...(cut ? [] : ['The Ruiz correlation stays above 50 % capture at all sizes, so no d₅₀ exists.']),
        'Ideal sharp cut at d₅₀.',
      ],
    },
    {
      id: 'fan',
      index: '4',
      name: 'Fan',
      path: 'air',
      headline: `${fmt(d.fanAirPower, 1)} kW ideal air power`,
      rows: [
        { label: 'Volumetric flow V̇', formula: 'from stage 1', value: fmt(r.plume.vDot, 1), unit: 'm³/s' },
        { label: 'Eliminator pressure drop Δp', formula: 'from stage 3', value: fmt(d.pressureDrop, 1), unit: 'Pa' },
        { label: 'Ideal fan air power', formula: 'P = V̇·Δp', value: fmt(d.fanAirPower, 2), unit: 'kW' },
      ],
      notes: ['Eliminator loss only; no fan, motor or drive efficiency.'],
    },
    {
      id: 'recovery',
      index: '5',
      name: 'Condensation recovery',
      path: 'air',
      headline: `${fmt(r.recovery.mDotCond, 2)} kg/s · ${r.recovery.feasible ? fmt(r.recovery.e, 0) : '—'} kJ/kg`,
      rows: [
        input('Cooling below dew point ΔT_dew', fmt(i.coolingBelowDewPoint, 1), '°C'),
        input('Cycles of concentration CoC', fmt(i.cyclesOfConcentration, 1), ''),
        { label: 'Recovery outlet T₅', formula: 'T₅ = T_dew − ΔT_dew  (saturated)', value: fmt(r.recovery.t, 1), unit: '°C' },
        { label: 'Outlet humidity ratio ω₅', formula: 'ω₅ = ω_sat(T₅)', value: sig(r.recovery.omega, 4), unit: 'kg/kg da' },
        { label: 'Outlet enthalpy h₅', formula: 'h₅ = h_sat(T₅)', value: fmt(r.recovery.h, 1), unit: 'kJ/kg da' },
        { label: 'Humidity condensed Δω', formula: 'Δω = ω₄ − ω₅', value: sig(r.recovery.dOmega, 4), unit: 'kg/kg da' },
        { label: 'Enthalpy removed Δh', formula: 'Δh = h₄ − h₅', value: fmt(r.recovery.dH, 1), unit: 'kJ/kg da' },
        { label: 'Water recovered', formula: 'ṁ_cond = ṁ_da·Δω', value: fmt(r.recovery.mDotCond, 3), unit: 'kg/s' },
        { label: 'Cooling duty', formula: 'Q = ṁ_da·Δh', value: fmt(r.recovery.qDuty, 0), unit: 'kW' },
        { label: 'Energy per kilogram', formula: 'e = Δh / Δω', value: r.recovery.feasible ? fmt(r.recovery.e, 0) : '—', unit: 'kJ/kg' },
        { label: 'Blowdown / evaporation', formula: 'B/E = 1 / (CoC − 1)', value: fmt(100 * r.waterBalance.blowdownToEvaporationRatio, 1), unit: '%' },
      ],
      notes: ['Theoretical condensate and air-side duty; not equipment sizing.'],
    },
  ]

  return (
    <section className="stage-results" aria-labelledby="stage-results-title">
      <div className="output-section-head">
        <h2 id="stage-results-title">All calculated values</h2>
        <span>Rows tagged “input” are set by you; every other row is calculated</span>
      </div>

      <div className="stage-result-grid">
        {blocks.map((b) => (
          <section key={b.id} className={`stage-result is-${b.path}`}>
            <header className="stage-result-head">
              <span className="stage-result-index">{b.index}</span>
              <strong>{b.name}</strong>
              <button
                type="button"
                className="stage-result-edit"
                onClick={() => onSelect(b.id)}
              >
                Edit inputs
              </button>
            </header>
            <ul className="stage-result-rows">
              {b.rows.map((row) => (
                <li key={row.label} className={row.kind === 'input' ? 'is-input' : ''}>
                  <span className="row-label">
                    <span>
                      {row.label}
                      {row.kind === 'input' && <em className="input-tag">input</em>}
                    </span>
                    {row.kind !== 'input' && <code>{row.formula}</code>}
                  </span>
                  <span className="row-value">
                    <strong>{row.value}</strong>
                    {row.unit && <small>{row.unit}</small>}
                  </span>
                </li>
              ))}
            </ul>
            {b.notes && b.notes.length > 0 && (
              <ul className="stage-result-notes">
                {b.notes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </section>
  )
}
