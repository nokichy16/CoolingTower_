/**
 * Direct plume water-recovery model.
 *
 * The user prescribes the exhaust plume leaving the cooling-tower fill instead
 * of asking this app to predict it from a simplified water-side model. Liquid
 * droplets and water vapour are then evaluated separately:
 *
 *   plume state → drift-eliminator reduction → fan air requirement
 *   → vapour condensation
 *
 * User-selected full-face area and plume velocity determine volumetric
 * flow. Dry-air mass flow is then derived so
 * total water (kg/s), air power, and cooling duty share one flow basis.
 */

import {
  density,
  dewPoint,
  enthalpy,
  hSat,
  humidityRatio,
  omegaSat,
} from './psychrometrics.ts'
import {
  evaluateRuizEliminator,
  type EliminatorId,
  type RuizEliminatorResult,
} from './eliminators.ts'

export interface SolveIssue {
  code:
    | 'ruiz-pressure-extrapolation'
    | 'recovery-temperature-limited'
    | 'no-condensation-depth'
    | 'flow-input-invalid'
    | 'cycles-invalid'
  severity: 'warning'
  title: string
  message: string
}

export interface TowerInputs {
  // Exhaust plume leaving the fill
  plumeTemperature: number // °C, dry-bulb
  plumeRh: number // %
  pressure: number // Pa
  flowArea: number // m², selected full-face plume / eliminator area
  plumeVelocity: number // m/s selected bulk plume / eliminator face velocity

  // Liquid droplets / drift eliminator
  eliminatorId: EliminatorId
  dropletDiameterMin: number // theoretical inlet range minimum, µm
  dropletDiameterMax: number // theoretical inlet range maximum, µm
  dropletEfficiencyPct: number // theoretical largest-first mass removal, %
  driftRatePct: number // selected final design drift rate, %

  // Vapour recovery
  coolingBelowDewPoint: number // K below plume dew point
  cyclesOfConcentration: number // dimensionless
}

export interface PlumeState {
  t: number // °C
  rh: number // %
  omega: number // kg water / kg dry air
  h: number // kJ / kg dry air
  rho: number // kg moist air / m³
  dewPoint: number // °C
  vDot: number // m³/s moist air
  flowArea: number // m² selected full-face flow area
  velocity: number // m/s derived face velocity
  airMassFlow: number // kg/s dry air derived from the moist-air flow
}

export interface TowerResults {
  inputs: TowerInputs
  valid: boolean
  issues: SolveIssue[]
  plume: PlumeState
  eliminator: RuizEliminatorResult
  droplets: {
    reductionPct: number
    remainingPct: number
    pressureDrop: number // Pa
    /**
     * Ideal air power attributable to this eliminator alone. This is not
     * electrical motor power and does not represent the rest of the tower.
     */
    fanAirPower: number // kW
    equivalentArea: number // m², same flow area as the prescribed plume
    captureCutoffDiameter: number // µm
  }
  recovery: {
    t: number // °C recovery outlet / coil target
    omega: number // kg/kg at saturated recovery outlet
    h: number // kJ/kg dry air at recovery outlet
    dOmega: number // kg water / kg dry air condensed
    dH: number // kJ / kg dry air removed
    e: number // kJ / kg water theoretically condensed
    mDotCond: number // kg/s theoretical condensate
    qDuty: number // kW approximate air-side cooling duty
    feasible: boolean
  }
  waterBalance: {
    blowdownToEvaporationRatio: number // B/E = 1 / (CoC - 1)
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function dryAirMassFlowFromVelocity(
  rho: number,
  flowArea: number,
  velocity: number,
  omega: number,
): number {
  return (rho * flowArea * velocity) / (1 + omega)
}

export function velocityFromDryAirMassFlow(
  dryAirMassFlow: number,
  rho: number,
  flowArea: number,
  omega: number,
): number {
  return (dryAirMassFlow * (1 + omega)) / (rho * flowArea)
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
  const flowAreaValid = Number.isFinite(inputs.flowArea) && inputs.flowArea > 0
  const velocityValid =
    Number.isFinite(inputs.plumeVelocity) && inputs.plumeVelocity > 0
  const eliminatorFaceVelocity = velocityValid ? inputs.plumeVelocity : 0
  const evaluationVelocity = velocityValid ? inputs.plumeVelocity : 1e-6
  const vDot = (flowAreaValid ? inputs.flowArea : 0) * eliminatorFaceVelocity
  const airMassFlow = dryAirMassFlowFromVelocity(
    rho4,
    flowAreaValid ? inputs.flowArea : 0,
    eliminatorFaceVelocity,
    omega4,
  )

  const eliminator = evaluateRuizEliminator(
    inputs.eliminatorId,
    rho4,
    evaluationVelocity,
    inputs.plumeTemperature,
    (inputs.dropletDiameterMin + inputs.dropletDiameterMax) / 2,
  )
  const collection = clamp(inputs.dropletEfficiencyPct, 0, 100) / 100
  const captureCutoffDiameter =
    inputs.dropletDiameterMax -
    collection * (inputs.dropletDiameterMax - inputs.dropletDiameterMin)
  const pressureDrop = velocityValid
    ? eliminator.pressureCoefficient *
      0.5 *
      rho4 *
      eliminatorFaceVelocity ** 2
    : 0
  const equivalentArea = inputs.flowArea
  // Ideal air power P_air = V̇·Δp. Pressure is not fed back into the
  // psychrometrics because the eliminator loss is tiny relative to atmospheric
  // pressure. Electrical or shaft power would require a fan efficiency.
  const fanAirPower = (vDot * pressureDrop) / 1000

  // Recovery temperature is expressed relative to dew point so the control
  // answers the useful question directly: how far into the condensing region
  // does the recovery device cool the plume?
  const requestedT5 = tDew - inputs.coolingBelowDewPoint
  const t5 = Math.max(0, requestedT5)
  const omega5 = omegaSat(t5, inputs.pressure)
  const h5 = hSat(t5, inputs.pressure)
  const dOmega =
    inputs.coolingBelowDewPoint > 0
      ? Math.max(0, omega4 - omega5)
      : 0
  const dH = Math.max(0, h4 - h5)
  const feasible = inputs.coolingBelowDewPoint > 0 && dOmega > 1e-9
  const e = feasible ? dH / dOmega : 0
  const mDotCond = airMassFlow * dOmega
  const qDuty = airMassFlow * dH
  const cyclesValid =
    Number.isFinite(inputs.cyclesOfConcentration) &&
    inputs.cyclesOfConcentration > 1
  const blowdownToEvaporationRatio = cyclesValid
    ? 1 / (inputs.cyclesOfConcentration - 1)
    : 0

  const issues: SolveIssue[] = []
  if (!flowAreaValid) {
    issues.push({
      code: 'flow-input-invalid',
      severity: 'warning',
      title: 'Flow area is invalid',
      message: 'The full-face flow area must be a positive finite value.',
    })
  }
  if (!velocityValid) {
    issues.push({
      code: 'flow-input-invalid',
      severity: 'warning',
      title: 'Plume velocity is invalid',
      message: 'The selected plume velocity must be a positive finite value.',
    })
  }
  if (!cyclesValid) {
    issues.push({
      code: 'cycles-invalid',
      severity: 'warning',
      title: 'Cycles of concentration are invalid',
      message: 'Cycles of concentration must be greater than 1.',
    })
  }
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
  if (requestedT5 < 0) {
    issues.push({
      code: 'recovery-temperature-limited',
      severity: 'warning',
      title: 'Recovery outlet limited to 0 °C',
      message:
        'The requested cooling would go below the liquid-water range used by this model. The recovery calculation is therefore held at 0 °C.',
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
    valid: flowAreaValid && velocityValid && cyclesValid,
    issues,
    plume: {
      t: inputs.plumeTemperature,
      rh: inputs.plumeRh,
      omega: omega4,
      h: h4,
      rho: rho4,
      dewPoint: tDew,
      vDot,
      flowArea: inputs.flowArea,
      velocity: eliminatorFaceVelocity,
      airMassFlow,
    },
    eliminator,
    droplets: {
      reductionPct: collection * 100,
      remainingPct: (1 - collection) * 100,
      pressureDrop,
      fanAirPower,
      equivalentArea,
      captureCutoffDiameter,
    },
    recovery: {
      t: t5,
      omega: omega5,
      h: h5,
      dOmega,
      dH,
      e,
      mDotCond,
      qDuty,
      feasible,
    },
    waterBalance: {
      blowdownToEvaporationRatio,
    },
  }
}

export const DEFAULT_INPUTS: TowerInputs = {
  plumeTemperature: 40,
  plumeRh: 95,
  pressure: 101_300,
  flowArea: 46.55,
  plumeVelocity: 3,

  eliminatorId: 'B',
  dropletDiameterMin: 10,
  dropletDiameterMax: 200,
  dropletEfficiencyPct: 80,
  driftRatePct: 0.005,

  coolingBelowDewPoint: 10,
  cyclesOfConcentration: 6,
}
