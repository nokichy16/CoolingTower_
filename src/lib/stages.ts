import type { TowerResults } from './model'
import { fmt, sig } from './format'

/**
 * Per-stage display data for the cooling-tower air path. One place that turns a
 * solved result into the labels shown on the tower graphic and in the detail
 * panel, so the graphic and the readout can never drift apart.
 *
 * `key` is the single metric kept visible on the graphic at all times; `metrics`
 * is the full engineering set revealed when a stage is selected.
 */

export type StageId = 'inlet' | 'fill' | 'drift' | 'fan' | 'exhaust'

export interface Metric {
  sym: string
  value: string
  unit: string
}

export interface StageInfo {
  id: StageId
  index: string
  name: string
  accent: string
  blurb: string
  key: Metric
  metrics: Metric[]
}

export function buildStages(r: TowerResults): StageInfo[] {
  return [
    {
      id: 'inlet',
      index: '1',
      name: 'Air inlet',
      accent: '#4aa3ff',
      blurb:
        'Ambient air is drawn in through the louvers; its state is fixed before it touches any water.',
      key: { sym: 'T₁', value: fmt(r.inlet.t), unit: '°C' },
      metrics: [
        { sym: 'ω₁', value: sig(r.inlet.omega, 3), unit: 'kg/kg' },
        { sym: 'h₁', value: fmt(r.inlet.h), unit: 'kJ/kg' },
        { sym: 'ρ₁', value: fmt(r.inlet.rho, 3), unit: 'kg/m³' },
        { sym: 'φ₁', value: fmt(r.inlet.rh, 0), unit: '%' },
        { sym: 'T_wb', value: fmt(r.inlet.wetBulb), unit: '°C' },
        { sym: 'V̇₁', value: fmt(r.inlet.vDot), unit: 'm³/s' },
        { sym: 'u₁', value: fmt(r.inlet.u, 2), unit: 'm/s' },
        { sym: 'Δp₁', value: fmt(r.inlet.dp), unit: 'Pa' },
      ],
    },
    {
      id: 'fill',
      index: '2',
      name: 'Fill · exchange surface',
      accent: '#34d1bf',
      blurb:
        'Water sprayed over the fill meets the rising air. The only place water enters the air; exit air is taken as saturated.',
      key: { sym: 'Q̇', value: fmt(r.qReject, 0), unit: 'kW' },
      metrics: [
        { sym: 'Q̇', value: fmt(r.qReject, 0), unit: 'kW' },
        { sym: 'T₂', value: fmt(r.fill.t), unit: '°C' },
        { sym: 'ω₂', value: sig(r.fill.omega, 3), unit: 'kg/kg' },
        { sym: 'h₂', value: fmt(r.fill.h), unit: 'kJ/kg' },
        { sym: 'ρ₂', value: fmt(r.fill.rho, 3), unit: 'kg/m³' },
        { sym: 'u_fi', value: fmt(r.fill.u, 2), unit: 'm/s' },
        { sym: 'Δp_fi', value: fmt(r.fill.dp), unit: 'Pa' },
      ],
    },
    {
      id: 'drift',
      index: '3',
      name: 'Drift eliminator',
      accent: '#c9b568',
      blurb:
        'Sharp turns throw entrained droplets onto the blades. Composition is unchanged — ω is the same on both sides.',
      key: { sym: 'Δp_de', value: fmt(r.drift.dp), unit: 'Pa' },
      metrics: [
        { sym: 'V̇₂', value: fmt(r.drift.vDot), unit: 'm³/s' },
        { sym: 'u_de', value: fmt(r.drift.u, 2), unit: 'm/s' },
        { sym: 'Δp_de', value: fmt(r.drift.dp), unit: 'Pa' },
        { sym: 'ṁ_drift', value: sig(r.drift.mDotDrift, 3), unit: 'kg/s' },
      ],
    },
    {
      id: 'fan',
      index: '4',
      name: 'Fan',
      accent: '#b07cff',
      blurb:
        'The induced-draft fan pulls air through the whole tower. Σ Δp must match fan delivery, which sets the air flow.',
      key: { sym: 'ṁ_a', value: fmt(r.mDotAir), unit: 'kg/s' },
      metrics: [
        { sym: 'u_fan', value: fmt(r.fan.u, 2), unit: 'm/s' },
        { sym: 'Δp_pl', value: fmt(r.fan.dpPlenum), unit: 'Pa' },
        { sym: 'Σ Δp', value: fmt(r.fan.dpTotal), unit: 'Pa' },
        { sym: 'ṁ_a', value: fmt(r.mDotAir), unit: 'kg/s' },
        { sym: 'P_fan', value: fmt(r.fan.power), unit: 'kW' },
      ],
    },
    {
      id: 'exhaust',
      index: '5',
      name: 'Exhaust',
      accent: '#ff9f45',
      blurb:
        'Near-saturated air leaves the stack into the atmosphere. This handoff state is all the recovery calc needs.',
      key: { sym: 'T₄', value: fmt(r.exhaust.t), unit: '°C' },
      metrics: [
        { sym: 'T₄', value: fmt(r.exhaust.t), unit: '°C' },
        { sym: 'ω₄', value: sig(r.exhaust.omega, 3), unit: 'kg/kg' },
        { sym: 'h₄', value: fmt(r.exhaust.h), unit: 'kJ/kg' },
        { sym: 'ρ₄', value: fmt(r.exhaust.rho, 3), unit: 'kg/m³' },
        { sym: 'V̇₄', value: fmt(r.exhaust.vDot), unit: 'm³/s' },
      ],
    },
  ]
}
