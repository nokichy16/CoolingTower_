import type { TowerResults } from './model'
import { fmt, sig } from './format'

/**
 * Per-stage display data for the cooling-tower air path. One place that turns a
 * solved result into the labels shown on the tower graphic and in the detail
 * panel, so the graphic and the readout can never drift apart.
 *
 * Each stage splits its outputs three ways, because they are not the same kind
 * of number and should not carry the same weight:
 *
 *   `local`   — what this station itself contributes. These are the values that
 *               move when you change this station's own inputs.
 *   `state`   — the air state leaving. From the fill onward this is *inherited*:
 *               the eliminator removes droplets and the fan moves air, neither
 *               changes composition, so states 2–5 are the same state. Stages
 *               that inherit set `stateCarriedFrom` and render it compactly
 *               rather than repeating tiles that teach nothing.
 *   `details` — solver intermediates and correlation internals. Real, but not
 *               what you reason about first, so they sit behind a disclosure.
 *
 * `key` is the single metric kept visible on the graphic at all times.
 */

export type StageId =
  | 'inlet'
  | 'fill'
  | 'drift'
  | 'fan'
  | 'exhaust'
  | 'recovery'

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
  local: Metric[]
  state: Metric[]
  /** Set when the state is inherited unchanged, e.g. '②'. */
  stateCarriedFrom?: string
  details: Metric[]
}

export function buildStages(r: TowerResults): StageInfo[] {
  // States 2–5 are one state: the eliminator removes liquid, not vapour, and
  // the fan does no work on the composition. Build it once and mark it carried.
  const carriedState: Metric[] = [
    { sym: 'T', value: fmt(r.fill.t), unit: '°C' },
    { sym: 'ω', value: sig(r.fill.omega, 3), unit: 'kg/kg' },
    { sym: 'h', value: fmt(r.fill.h), unit: 'kJ/kg' },
  ]

  return [
    {
      id: 'inlet',
      index: '1',
      name: 'Air inlet',
      accent: '#4aa3ff',
      blurb:
        'Ambient air is drawn in through the louvers; its state is fixed before it touches any water.',
      key: { sym: 'T₁', value: fmt(r.inlet.t), unit: '°C' },
      local: [
        { sym: 'u₁', value: fmt(r.inlet.u, 2), unit: 'm/s' },
        { sym: 'Δp₁', value: fmt(r.inlet.dp), unit: 'Pa' },
      ],
      state: [
        { sym: 'T₁', value: fmt(r.inlet.t), unit: '°C' },
        { sym: 'ω₁', value: sig(r.inlet.omega, 3), unit: 'kg/kg' },
        { sym: 'h₁', value: fmt(r.inlet.h), unit: 'kJ/kg' },
        { sym: 'φ₁', value: fmt(r.inlet.rh, 0), unit: '%' },
        { sym: 'T_wb', value: fmt(r.inlet.wetBulb), unit: '°C' },
      ],
      details: [
        { sym: 'ρ₁', value: fmt(r.inlet.rho, 3), unit: 'kg/m³' },
        { sym: 'V̇₁', value: fmt(r.inlet.vDot), unit: 'm³/s' },
        {
          sym: 'Approach',
          value: fmt(r.inputs.waterCold - r.inlet.wetBulb),
          unit: 'K',
        },
      ],
    },
    {
      id: 'fill',
      index: '2',
      name: 'Fill · exchange surface',
      accent: '#34d1bf',
      blurb:
        'Water sprayed over the fill meets the rising air. The only place water enters the air, so this is the one station that sets the state everything above it carries.',
      key: { sym: 'Q̇', value: fmt(r.qReject, 0), unit: 'kW' },
      local: [
        { sym: 'Q̇', value: fmt(r.qReject, 0), unit: 'kW' },
        { sym: 'u_fi', value: fmt(r.fill.u, 2), unit: 'm/s' },
        { sym: 'Δp_fi', value: fmt(r.fill.dp), unit: 'Pa' },
      ],
      state: [
        { sym: 'T₂', value: fmt(r.fill.t), unit: '°C' },
        { sym: 'ω₂', value: sig(r.fill.omega, 3), unit: 'kg/kg' },
        { sym: 'h₂', value: fmt(r.fill.h), unit: 'kJ/kg' },
      ],
      details: [
        { sym: 'ρ₂', value: fmt(r.fill.rho, 3), unit: 'kg/m³' },
        { sym: 'V̇₂', value: fmt(r.fill.vDot), unit: 'm³/s' },
      ],
    },
    {
      id: 'drift',
      index: '3',
      name: 'Drift eliminator',
      accent: '#c9b568',
      blurb: `Ruiz eliminator ${r.eliminator.spec.id} uses inertia and direction changes to collect droplets. Kp and ε are recalculated at the live face velocity. ε is a single-droplet-size efficiency for comparing geometries; ṁ_drift is a rated mass fraction for the water balance. The two answer different questions and are not converted into one another. Pressure fit: ${
        r.eliminator.pressureSupported ? 'paper-supported' : 'extrapolated'
      }; collection fit: ${
        r.eliminator.collectionSupported ? 'paper-supported' : 'extrapolated'
      }.`,
      key: { sym: 'Δp_de', value: fmt(r.drift.dp), unit: 'Pa' },
      local: [
        { sym: 'u_de', value: fmt(r.drift.u, 2), unit: 'm/s' },
        { sym: 'Δp_de', value: fmt(r.drift.dp), unit: 'Pa' },
        {
          // ε matches the Ruiz paper's notation, which is what we cite.
          sym: 'ε',
          value: fmt(r.eliminator.collectionEfficiency * 100, 1),
          unit: '%',
        },
        { sym: 'ṁ_drift', value: sig(r.drift.mDotDrift, 3), unit: 'kg/s' },
      ],
      state: carriedState,
      stateCarriedFrom: '②',
      details: [
        { sym: 'Kp', value: fmt(r.eliminator.pressureCoefficient, 2), unit: '' },
        { sym: 'Re', value: fmt(r.eliminator.reynolds, 0), unit: '' },
        { sym: 'St', value: fmt(r.eliminator.stokes, 2), unit: '' },
        { sym: 'V̇₂', value: fmt(r.drift.vDot), unit: 'm³/s' },
      ],
    },
    {
      id: 'fan',
      index: '4',
      name: 'Fan',
      accent: '#b07cff',
      blurb:
        'The prescribed air flow sets the component velocities. Total pressure loss is the static pressure the selected fan must supply; power is estimated at the stated efficiency.',
      key: { sym: 'Σ Δp', value: fmt(r.fan.dpTotal), unit: 'Pa' },
      local: [
        { sym: 'u_fan', value: fmt(r.fan.u, 2), unit: 'm/s' },
        { sym: 'Δp_pl', value: fmt(r.fan.dpPlenum), unit: 'Pa' },
        { sym: 'Σ Δp', value: fmt(r.fan.dpTotal), unit: 'Pa' },
        { sym: 'P_fan', value: fmt(r.fan.power), unit: 'kW' },
      ],
      state: carriedState,
      stateCarriedFrom: '②',
      details: [
        // ṁ_a is a prescribed input, echoed here for context, not an output.
        { sym: 'ṁ_a', value: fmt(r.mDotAir), unit: 'kg/s' },
      ],
    },
    {
      id: 'exhaust',
      index: '5',
      name: 'Exhaust',
      accent: '#ff9f45',
      blurb:
        'Near-saturated air leaves the stack. Nothing above the fill changes its composition, so this handoff state is the fill-exit state — all the recovery calculation needs.',
      key: { sym: 'T₄', value: fmt(r.exhaust.t), unit: '°C' },
      local: [{ sym: 'V̇₄', value: fmt(r.exhaust.vDot), unit: 'm³/s' }],
      state: carriedState,
      stateCarriedFrom: '②',
      details: [{ sym: 'ρ₄', value: fmt(r.exhaust.rho, 3), unit: 'kg/m³' }],
    },
    {
      id: 'recovery',
      index: '6',
      name: 'Recovery',
      accent: '#5ec8ff',
      blurb:
        'The saturated exhaust is cooled along the saturation line and vapour drops out. This is the only station that creates a new state after the fill, and the only one the headline result comes from.',
      key: {
        sym: 'e',
        value: r.condensed.feasible ? fmt(r.condensed.e, 0) : '—',
        unit: 'kJ/kg',
      },
      local: [
        { sym: 'Δω', value: sig(r.condensed.dOmega, 3), unit: 'kg/kg' },
        { sym: 'Δh', value: fmt(r.condensed.dH), unit: 'kJ/kg' },
        { sym: 'ṁ_c', value: fmt(r.condensed.mDotCond, 2), unit: 'kg/s' },
        { sym: 'Q̇_rec', value: fmt(r.condensed.qDuty, 0), unit: 'kW' },
      ],
      // A genuinely new state, so it is not carried from ②.
      state: [
        { sym: 'T₅', value: fmt(r.condensed.t), unit: '°C' },
        { sym: 'ω₅', value: sig(r.condensed.omega, 3), unit: 'kg/kg' },
        { sym: 'h₅', value: fmt(r.condensed.h), unit: 'kJ/kg' },
      ],
      details: [
        { sym: 'q_lat', value: fmt(r.condensed.qLat), unit: 'kJ/kg' },
        { sym: 'q_sen', value: fmt(r.condensed.qSen), unit: 'kJ/kg' },
      ],
    },
  ]
}
