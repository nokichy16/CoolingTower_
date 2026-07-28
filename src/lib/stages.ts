import type { TowerResults } from './model'
import { fmt, sig } from './format'

export type StageId = 'plume' | 'droplets' | 'recovery'

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
  details: Metric[]
}

export function buildStages(r: TowerResults): StageInfo[] {
  return [
    {
      id: 'plume',
      index: '1',
      name: 'Plume from fill',
      accent: '#ff9f45',
      blurb:
        'Temperature, relative humidity and pressure are prescribed directly. The plume is not forced to saturation; the psychrometric state and dew point are calculated from the selected conditions.',
      key: {
        sym: 'T_dew',
        value: fmt(r.plume.dewPoint),
        unit: '°C',
      },
      local: [
        { sym: 'T₄', value: fmt(r.plume.t), unit: '°C' },
        { sym: 'RH₄', value: fmt(r.plume.rh, 0), unit: '%' },
        { sym: 'ω₄', value: sig(r.plume.omega, 3), unit: 'kg/kg' },
        { sym: 'T_dew', value: fmt(r.plume.dewPoint), unit: '°C' },
      ],
      state: [
        { sym: 'h₄', value: fmt(r.plume.h), unit: 'kJ/kg' },
        { sym: 'ρ₄', value: fmt(r.plume.rho, 3), unit: 'kg/m³' },
        { sym: 'V̇', value: fmt(r.plume.vDot), unit: 'm³/s' },
      ],
      details: [
        { sym: 'P', value: fmt(r.inputs.pressure / 1000), unit: 'kPa' },
        { sym: 'ṁ_a', value: fmt(r.inputs.airMassFlow), unit: 'kg/s' },
      ],
    },
    {
      id: 'droplets',
      index: '2',
      name: 'Liquid droplets',
      accent: '#c9b568',
      blurb:
        'The selected eliminator estimates how many droplets of the representative size are collected. This percentage describes liquid-droplet reduction, not water-vapour condensation.',
      key: {
        sym: 'Removed',
        value: fmt(r.droplets.reductionPct, 1),
        unit: '%',
      },
      local: [
        {
          sym: 'Removed',
          value: fmt(r.droplets.reductionPct, 1),
          unit: '%',
        },
        {
          sym: 'Remaining',
          value: fmt(r.droplets.remainingPct, 1),
          unit: '%',
        },
        {
          sym: 'd_d',
          value: fmt(r.inputs.dropletDiameter, 0),
          unit: 'µm',
        },
      ],
      state: [
        {
          sym: 'St',
          value: fmt(r.eliminator.stokes, 2),
          unit: '',
        },
        {
          sym: 'Re',
          value: fmt(r.eliminator.reynolds, 0),
          unit: '',
        },
        {
          sym: 'u_de',
          value: fmt(r.inputs.eliminatorVelocity, 2),
          unit: 'm/s',
        },
      ],
      details: [
        {
          sym: 'Kp',
          value: fmt(r.eliminator.pressureCoefficient, 2),
          unit: '',
        },
        {
          sym: 'Δp_de',
          value: fmt(r.droplets.pressureDrop),
          unit: 'Pa',
        },
        {
          sym: 'P_fan',
          value: fmt(r.droplets.fanPower, 1),
          unit: 'kW',
        },
        {
          sym: 'A_eq',
          value: fmt(r.droplets.equivalentArea),
          unit: 'm²',
        },
      ],
    },
    {
      id: 'recovery',
      index: '3',
      name: 'Vapour recovery',
      accent: '#5ec8ff',
      blurb:
        'The plume is cooled to its dew point and then by the selected additional temperature difference. Vapour condenses below dew point; recovery efficiency converts theoretical condensate into estimated captured water.',
      key: {
        sym: 'ṁ_rec',
        value: r.recovery.feasible
          ? fmt(r.recovery.mDotRecovered, 2)
          : '0.00',
        unit: 'kg/s',
      },
      local: [
        {
          sym: 'ṁ_theory',
          value: fmt(r.recovery.mDotCond, 2),
          unit: 'kg/s',
        },
        {
          sym: 'ṁ_rec',
          value: fmt(r.recovery.mDotRecovered, 2),
          unit: 'kg/s',
        },
        {
          sym: 'V_day',
          value: fmt(r.recovery.volumePerDay, 0),
          unit: 'm³/day',
        },
        {
          sym: 'Q̇_cool',
          value: fmt(r.recovery.qDuty, 0),
          unit: 'kW',
        },
      ],
      state: [
        { sym: 'T₅', value: fmt(r.recovery.t), unit: '°C' },
        { sym: 'ω₅', value: sig(r.recovery.omega, 3), unit: 'kg/kg' },
        { sym: 'h₅', value: fmt(r.recovery.h), unit: 'kJ/kg' },
      ],
      details: [
        { sym: 'Δω', value: sig(r.recovery.dOmega, 3), unit: 'kg/kg' },
        { sym: 'Δh', value: fmt(r.recovery.dH), unit: 'kJ/kg' },
        { sym: 'e', value: fmt(r.recovery.e, 0), unit: 'kJ/kg water' },
      ],
    },
  ]
}
