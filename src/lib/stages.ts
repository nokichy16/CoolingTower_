import type { TowerResults } from './model'
import { fmt, sig } from './format'

export type StageId = 'plume' | 'droplets' | 'fan' | 'recovery'

export interface Metric {
  label: string
  value: string
  unit: string
}

export interface StageInfo {
  id: StageId
  index: string
  name: string
  accent: string
  primary: Metric[]
  supporting: Metric[]
  details: Metric[]
}

export function buildStages(r: TowerResults): StageInfo[] {
  const hasPredictedRemainingRange = r.droplets.efficiencyAtMinimum < 0.5
  const hasPredictedCapturedRange = r.droplets.efficiencyAtMaximum >= 0.5
  const predictedRemainingRange =
    hasPredictedRemainingRange
      ? `${fmt(r.inputs.dropletDiameterMin, 0)}–${fmt(
          r.droplets.captureCutoffDiameter,
          0,
        )}`
      : 'None in selected range'
  const predictedCapturedRange =
    hasPredictedCapturedRange
      ? `${fmt(r.droplets.captureCutoffDiameter, 0)}–${fmt(
          r.inputs.dropletDiameterMax,
          0,
        )}`
      : 'None in selected range'

  return [
    {
      id: 'plume',
      index: '1',
      name: 'Plume',
      accent: '#ff9f45',
      primary: [
        { label: 'Temperature', value: fmt(r.plume.t), unit: '°C' },
        {
          label: 'Relative humidity',
          value: fmt(r.plume.rh, 0),
          unit: '%',
        },
      ],
      supporting: [
        { label: 'Dew point', value: fmt(r.plume.dewPoint), unit: '°C' },
        {
          label: 'Humidity ratio',
          value: sig(r.plume.omega, 3),
          unit: 'kg/kg',
        },
        { label: 'Enthalpy', value: fmt(r.plume.h), unit: 'kJ/kg' },
        {
          label: 'Volumetric flow',
          value: fmt(r.plume.vDot),
          unit: 'm³/s',
        },
      ],
      details: [
        {
          label: 'Atmospheric pressure',
          value: fmt(r.inputs.pressure / 1000),
          unit: 'kPa',
        },
        { label: 'Air density', value: fmt(r.plume.rho, 3), unit: 'kg/m³' },
        {
          label: 'Dry-air mass flow',
          value: fmt(r.plume.airMassFlow),
          unit: 'kg/s',
        },
        {
          label: 'Plume velocity',
          value: fmt(r.plume.velocity, 3),
          unit: 'm/s',
        },
        {
          label: 'Flow area',
          value: fmt(r.plume.flowArea),
          unit: 'm²',
        },
      ],
    },
    {
      id: 'droplets',
      index: '2',
      name: 'Drift eliminator',
      accent: '#c9b568',
      primary: [
        {
          label: 'Theoretical cutoff diameter (d50)',
          value: fmt(r.droplets.captureCutoffDiameter, 0),
          unit: 'µm',
        },
      ],
      supporting: [
        {
          label: 'Predicted remaining range',
          value: predictedRemainingRange,
          unit: hasPredictedRemainingRange ? 'µm' : '',
        },
        {
          label: 'Pressure drop',
          value: fmt(r.droplets.pressureDrop),
          unit: 'Pa',
        },
      ],
      details: [
        {
          label: 'Reynolds number',
          value: fmt(r.eliminator.reynolds, 0),
          unit: '',
        },
        {
          label: 'Loss coefficient',
          value: fmt(r.eliminator.pressureCoefficient, 2),
          unit: '',
        },
        {
          label: 'Predicted captured range',
          value: predictedCapturedRange,
          unit: hasPredictedCapturedRange ? 'µm' : '',
        },
      ],
    },
    {
      id: 'fan',
      index: '3',
      name: 'Fan',
      accent: '#9c83ff',
      primary: [
        {
          label: 'Ideal fan air power',
          value: fmt(r.droplets.fanAirPower, 1),
          unit: 'kW',
        },
      ],
      supporting: [],
      details: [],
    },
    {
      id: 'recovery',
      index: '4',
      name: 'Condensation recovery',
      accent: '#5ec8ff',
      primary: [
        {
          label: 'Energy required per kilogram',
          value: r.recovery.feasible ? fmt(r.recovery.e, 0) : '—',
          unit: 'kJ/kg',
        },
      ],
      supporting: [
        {
          label: 'Theoretical recovery',
          value: fmt(r.recovery.mDotCond, 2),
          unit: 'kg/s',
        },
        {
          label: 'Cooling duty',
          value: fmt(r.recovery.qDuty, 0),
          unit: 'kW',
        },
        {
          label: 'Recovery outlet',
          value: fmt(r.recovery.t),
          unit: '°C',
        },
      ],
      details: [
        {
          label: 'Outlet humidity ratio',
          value: sig(r.recovery.omega, 3),
          unit: 'kg/kg',
        },
        {
          label: 'Outlet enthalpy',
          value: fmt(r.recovery.h),
          unit: 'kJ/kg',
        },
        {
          label: 'Humidity condensed',
          value: sig(r.recovery.dOmega, 3),
          unit: 'kg/kg',
        },
        {
          label: 'Enthalpy removed',
          value: fmt(r.recovery.dH),
          unit: 'kJ/kg',
        },
        {
          label: 'Blowdown / evaporation',
          value: fmt(r.waterBalance.blowdownToEvaporationRatio * 100, 1),
          unit: '%',
        },
      ],
    },
  ]
}
