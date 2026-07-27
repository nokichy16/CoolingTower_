/**
 * Direct plume water-recovery model.
 *
 * The user prescribes the exhaust plume leaving the cooling-tower fill instead
 * of asking this app to predict it from a simplified water-side model. Liquid
 * droplets and water vapour are then evaluated separately:
 *
 *   plume state → drift-eliminator droplet reduction → vapour condensation
 *
 * Dry-air mass flow is retained because a psychrometric state alone gives only
 * per-kilogram quantities; total water (kg/s) and cooling duty (kW) need flow.
 */

import {
  density,
  dewPoint,
  enthalpy,
  hSat,
  humidityRatio,
  omegaSat,
} from './psychrometrics'
import {
  evaluateRuizEliminator,
  RUIZ_LIMITS,
  type EliminatorId,
  type RuizEliminatorResult,
} from './eliminators'

export interface SolveIssue {
  code:
    | 'ruiz-pressure-extrapolation'
    | 'ruiz-collection-extrapolation'
    | 'no-condensation-depth'
  severity: 'warning'
  title: string
  message: string
}

export interface TowerInputs {
  // Exhaust plume leaving the fill
  plumeTemperature: number // °C, dry-bulb
  plumeRh: number // %
  pressure: number // Pa
  airMassFlow: number // kg/s dry air

  // Liquid droplets / drift eliminator
  eliminatorId: EliminatorId
  dropletDiameter: number // representative diameter, µm
  eliminatorVelocity: number // m/s face velocity

  // Vapour recovery
  coolingBelowDewPoint: number // K below plume dew point
  recoveryEfficiency: number // 0–1, fraction of theoretical condensate captured
}

export interface PlumeState {
  t: number // °C
  rh: number // %
  omega: number // kg water / kg dry air
  h: number // kJ / kg dry air
  rho: number // kg moist air / m³
  dewPoint: number // °C
  vDot: number // m³/s moist air
}

export interface TowerResults {
  inputs: TowerInputs
  valid: true
  issues: SolveIssue[]
  plume: PlumeState
  eliminator: RuizEliminatorResult
  droplets: {
    reductionPct: number
    remainingPct: number
    pressureDrop: number // Pa
    equivalentArea: number // m² at the prescribed face velocity
    supportedDiameterMin: number // µm, from St ≥ 0.2 and the 25 µm floor
    supportedDiameterMax: number // µm, from St ≤ 2
  }
  recovery: {
    t: number // °C recovery outlet / coil target
    omega: number // kg/kg at saturated recovery outlet
    h: number // kJ/kg dry air at recovery outlet
    dOmega: number // kg water / kg dry air condensed
    dH: number // kJ / kg dry air removed
    e: number // kJ / kg water condensed
    mDotCond: number // kg/s theoretical condensate
    mDotRecovered: number // kg/s realistically captured
    volumePerDay: number // m³/day, using 1000 kg/m³
    qDuty: number // kW approximate air-side cooling duty
    feasible: boolean
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function supportedDropletRange(
  eliminator: RuizEliminatorResult,
  velocity: number,
): { min: number; max: number } {
  // Rearranged from St = ρw·u·d² / (18·μ·Lc).
  const diameterAt = (stokes: number) =>
    Math.sqrt(
      (18 *
        eliminator.dynamicViscosity *
        eliminator.spec.characteristicLength *
        stokes) /
        (997 * velocity),
    ) * 1e6

  return {
    min: Math.max(
      RUIZ_LIMITS.dropletDiameterMin,
      diameterAt(RUIZ_LIMITS.stokesMin),
    ),
    max: diameterAt(RUIZ_LIMITS.stokesMax),
  }
}

export function solveTower(inputs: TowerInputs): TowerResults {
  const omega4 = humidityRatio(
    inputs.plumeTemperature,
    inputs.plumeRh,
    inputs.pressure,
  )
  const h4 = enthalpy(inputs.plumeTemperature, omega4)
  const rho4 = density(inputs.plumeTemperature, omega4, inputs.pressure)
  const tDew = dewPoint(omega4, inputs.pressure)
  const vDot = (inputs.airMassFlow * (1 + omega4)) / rho4

  const eliminator = evaluateRuizEliminator(
    inputs.eliminatorId,
    rho4,
    inputs.eliminatorVelocity,
    inputs.plumeTemperature,
    inputs.dropletDiameter,
  )
  const collection = clamp(eliminator.collectionEfficiency, 0, 1)
  const pressureDrop =
    eliminator.pressureCoefficient *
    0.5 *
    rho4 *
    inputs.eliminatorVelocity ** 2
  const equivalentArea = vDot / inputs.eliminatorVelocity
  const supportedDiameter = supportedDropletRange(
    eliminator,
    inputs.eliminatorVelocity,
  )

  // Recovery temperature is expressed relative to dew point so the control
  // answers the useful question directly: how far into the condensing region
  // does the recovery device cool the plume?
  const t5 = tDew - inputs.coolingBelowDewPoint
  const omega5 = omegaSat(t5, inputs.pressure)
  const h5 = hSat(t5, inputs.pressure)
  const dOmega =
    inputs.coolingBelowDewPoint > 0
      ? Math.max(0, omega4 - omega5)
      : 0
  const dH = Math.max(0, h4 - h5)
  const feasible = inputs.coolingBelowDewPoint > 0 && dOmega > 1e-9
  const e = feasible ? dH / dOmega : 0
  const mDotCond = inputs.airMassFlow * dOmega
  const mDotRecovered = mDotCond * inputs.recoveryEfficiency
  const volumePerDay = (mDotRecovered * 86_400) / 1000
  const qDuty = inputs.airMassFlow * dH

  const issues: SolveIssue[] = []
  if (!eliminator.pressureSupported) {
    issues.push({
      code: 'ruiz-pressure-extrapolation',
      severity: 'warning',
      title: 'Eliminator pressure result is extrapolated',
      message: `${eliminator.pressureRangeIssues.join(
        '; ',
      )}. Pressure loss remains visible but is outside the paper-supported range.`,
    })
  }
  if (!eliminator.collectionSupported) {
    issues.push({
      code: 'ruiz-collection-extrapolation',
      severity: 'warning',
      title: 'Droplet reduction is extrapolated',
      message: `${eliminator.collectionRangeIssues.join(
        '; ',
      )}. The percentage remains visible but is not paper-validated here.`,
    })
  }
  if (!feasible) {
    issues.push({
      code: 'no-condensation-depth',
      severity: 'warning',
      title: 'The plume is only cooled to its dew point',
      message:
        'Increase cooling below dew point to condense water. Reaching the dew point starts condensation but does not yet produce a finite condensate flow.',
    })
  }

  return {
    inputs,
    valid: true,
    issues,
    plume: {
      t: inputs.plumeTemperature,
      rh: inputs.plumeRh,
      omega: omega4,
      h: h4,
      rho: rho4,
      dewPoint: tDew,
      vDot,
    },
    eliminator,
    droplets: {
      reductionPct: collection * 100,
      remainingPct: (1 - collection) * 100,
      pressureDrop,
      equivalentArea,
      supportedDiameterMin: supportedDiameter.min,
      supportedDiameterMax: supportedDiameter.max,
    },
    recovery: {
      t: t5,
      omega: omega5,
      h: h5,
      dOmega,
      dH,
      e,
      mDotCond,
      mDotRecovered,
      volumePerDay,
      qDuty,
      feasible,
    },
  }
}

export const DEFAULT_INPUTS: TowerInputs = {
  plumeTemperature: 40,
  plumeRh: 95,
  pressure: 101_300,
  airMassFlow: 146.5,

  eliminatorId: 'B',
  dropletDiameter: 50,
  eliminatorVelocity: 3,

  coolingBelowDewPoint: 10,
  recoveryEfficiency: 0.8,
}
