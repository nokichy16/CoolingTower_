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
  collectionEfficiencyAtDiameter,
  evaluateRuizEliminator,
  type EliminatorId,
  type RuizEliminatorResult,
} from './eliminators.ts'
import {
  spread,
  RUIZ_2013_RUN1_FIT,
  efficiencySplit,
  type DropletDistributionParams,
  type EfficiencySplit,
} from './droplet-distribution.ts'

export function distributionParams(
  inputs: TowerInputs,
): DropletDistributionParams {
  return {
    dMinUm: inputs.dropletDMin,
    dMedUm: inputs.dropletDMed,
    dMaxUm: inputs.dropletDMax,
  }
}

export interface SolveIssue {
  code:
    | 'ruiz-pressure-extrapolation'
    | 'ruiz-collection-extrapolation'
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
  plumeTemperature: number // °C
  plumeRh: number // %
  pressure: number // Pa
  flowArea: number // m², selected full-face plume / eliminator area
  plumeVelocity: number // m/s selected bulk plume / eliminator face velocity

  // Liquid droplets / drift eliminator
  eliminatorId: EliminatorId
  circulatingWaterFlow: number // kg/s water through the fill
  inletDriftRate: number // % of circulating water carried as droplets into the eliminator
  dropletDMin: number // 1 % of mass is smaller, µm
  dropletDMed: number // mass median, µm
  dropletDMax: number // upper limit: no inlet droplets larger, µm

  // Vapour recovery
  coolingBelowDewPoint: number // °C temperature difference below plume dew point
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
    pressureDrop: number // Pa
    /**
     * Ideal air power attributable to this eliminator alone. This is not
     * electrical motor power and does not represent the rest of the tower.
     */
    fanAirPower: number // kW
    equivalentArea: number // m², same flow area as the prescribed plume
    massEscaping: number // ∫(1 − ε) dF, inlet mass fraction that escapes
    massCaptured: number // ∫ε dF
    split: EfficiencySplit // outlet curve and outlet D32
    spread: number // σg derived from d_min and d_med
    driftInlet: number // kg/s liquid drift entering the eliminator
    driftEscaping: number // kg/s
    driftCaptured: number // kg/s
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

  const distribution = distributionParams(inputs)
  // Pressure loss depends only on Reynolds; the representative droplet size
  // (inlet mass median) only sets the reported Stokes number.
  const eliminator = evaluateRuizEliminator(
    inputs.eliminatorId,
    rho4,
    evaluationVelocity,
    inputs.plumeTemperature,
    inputs.dropletDMed,
  )
  // Grade efficiency: every size is partly captured, by ε(d) from Ruiz.
  const split = efficiencySplit(distribution, (d) =>
    collectionEfficiencyAtDiameter(
      inputs.eliminatorId,
      evaluationVelocity,
      inputs.plumeTemperature,
      d,
    ),
  )
  const massEscaping = split.escaping
  const massCaptured = 1 - massEscaping
  // Liquid drift mass balance (kept separate from vapour recovery):
  // ṁ_drift,in = ṁ_circ · drift rate / 100
  const driftInlet =
    Math.max(0, inputs.circulatingWaterFlow) *
    (Math.max(0, inputs.inletDriftRate) / 100)
  const collectionRangeIssues = eliminator.collectionRangeIssues
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
  if (collectionRangeIssues.length > 0) {
    issues.push({
      code: 'ruiz-collection-extrapolation',
      severity: 'warning',
      title: 'Droplet prediction is extrapolated',
      message: `${collectionRangeIssues.join(
        '; ',
      )}. The result remains visible but is outside the paper-supported range.`,
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
      pressureDrop,
      fanAirPower,
      equivalentArea,
      massEscaping,
      massCaptured,
      split,
      spread: spread(distribution),
      driftInlet,
      driftEscaping: driftInlet * massEscaping,
      driftCaptured: driftInlet * massCaptured,
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

  eliminatorId: 'A',
  circulatingWaterFlow: 150, // placeholder, roughly L/G ≈ 1 with the default airflow
  inletDriftRate: 0.2, // placeholder assumption: drift entering the eliminator
  // One log-normal fitted to Ruiz et al. (2013) Fig. 9(a), run 1, measured at the tower exit
  dropletDMin: RUIZ_2013_RUN1_FIT.dMinUm,
  dropletDMed: RUIZ_2013_RUN1_FIT.dMedUm,
  dropletDMax: RUIZ_2013_RUN1_FIT.dMaxUm,

  coolingBelowDewPoint: 10,
  cyclesOfConcentration: 6,
}
