/**
 * Key outputs of each stage, shown in the panel under the tower drawing.
 * Display data only: every number comes from `solveTower`.
 */
import { distributionParams, type TowerResults } from './model'
import { selectionName } from './eliminators'
import type { StageId } from './stages'

export interface StageValue {
  key: string // stable id, also used to track changes
  label: string
  tex?: string // the symbol in TeX; words (for example "escaping") have none
  value: number
  unit: string
  digits: number
  from: StageId // stage that calculates it
}

/** Every value that crosses a stage boundary, plus the main results. */
export function stageValues(r: TowerResults): Record<string, StageValue> {
  const p = r.plume
  const d = r.droplets
  const dist = distributionParams(r.inputs)
  const list: StageValue[] = [
    { key: 'T4', label: 'T₄', tex: 'T_4', value: p.t, unit: '°C', digits: 1, from: 'plume' },
    { key: 'u', label: 'u₄', tex: 'u_4', value: p.velocity, unit: 'm/s', digits: 2, from: 'plume' },
    { key: 'rho', label: 'ρ₄', tex: '\\rho_4', value: p.rho, unit: 'kg/m³', digits: 3, from: 'plume' },
    { key: 'mu', label: 'μ', tex: '\\mu', value: r.eliminator.dynamicViscosity * 1e6, unit: 'µPa·s', digits: 2, from: 'plume' },
    { key: 'vdot', label: 'V̇', tex: '\\dot V', value: p.vDot, unit: 'm³/s', digits: 1, from: 'plume' },
    { key: 'omega4', label: 'ω₄', tex: '\\omega_4', value: p.omega, unit: 'kg/kg', digits: 4, from: 'plume' },
    { key: 'h4', label: 'h₄', tex: 'h_4', value: p.h, unit: 'kJ/kg', digits: 1, from: 'plume' },
    { key: 'tdew', label: 'T_dew', tex: 'T_{\\mathrm{dew}}', value: p.dewPoint, unit: '°C', digits: 1, from: 'plume' },
    { key: 'mda', label: 'ṁ_da', tex: '\\dot m_{\\mathrm{da}}', value: p.airMassFlow, unit: 'kg/s', digits: 1, from: 'plume' },
    { key: 'min', label: 'ṁ_in', tex: '\\dot m_{\\mathrm{in}}', value: d.driftInlet, unit: 'kg/s', digits: 3, from: 'drift' },
    { key: 'dmed', label: 'd_med', tex: 'd_{\\mathrm{med}}', value: dist.dMedUm, unit: 'µm', digits: 1, from: 'drift' },
    { key: 'dmax', label: 'd_max', tex: 'd_{\\mathrm{max}}', value: dist.dMaxUm, unit: 'µm', digits: 0, from: 'drift' },
    { key: 'esc', label: 'escaping', value: 100 * d.massEscaping, unit: '%', digits: 1, from: 'droplets' },
    { key: 'mesc', label: 'drift out', value: d.driftEscaping, unit: 'kg/s', digits: 3, from: 'droplets' },
    { key: 'dp', label: 'Δp', tex: '\\Delta p', value: d.pressureDrop, unit: 'Pa', digits: 1, from: 'droplets' },
    { key: 'pair', label: 'P_air', tex: 'P_{\\mathrm{air}}', value: d.fanAirPower, unit: 'kW', digits: 2, from: 'fan' },
    { key: 'mc', label: 'water', value: r.recovery.mDotCond, unit: 'kg/s', digits: 2, from: 'recovery' },
    { key: 'e', label: 'e', tex: 'e', value: r.recovery.feasible ? r.recovery.e : 0, unit: 'kJ/kg', digits: 0, from: 'recovery' },
    { key: 'q', label: 'Q', tex: 'Q', value: r.recovery.qDuty, unit: 'kW', digits: 0, from: 'recovery' },
  ]
  return Object.fromEntries(list.map((v) => [v.key, v]))
}

/** Key outputs shown for each stage in the stage list. */
export const STAGE_KEY_OUTPUTS: Record<StageId, string[]> = {
  plume: ['mda', 'vdot', 'omega4', 'tdew', 'h4', 'rho'],
  drift: ['min', 'dmed', 'dmax'],
  droplets: ['esc', 'mesc', 'dp'],
  fan: ['pair', 'dp', 'vdot'],
  recovery: ['mc', 'e', 'q'],
}

/** A short text that names the selected eliminator in the stage list. */
export const stageSubtitle = (id: StageId, r: TowerResults) =>
  id === 'droplets' ? `Eliminator ${selectionName(r.eliminator.spec.id)}` : ''
