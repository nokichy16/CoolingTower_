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
  pSat,
  vapourPressure,
} from './psychrometrics.ts'
import {
  collectionEfficiency,
  customPressureDrop,
  evaluateRuizEliminator,
  stokesNumber,
  type EliminatorSpec,
  type SelectionId,
  type CustomPerformance,
  DEFAULT_CUSTOM_PERFORMANCE,
  customEfficiency,
  airDynamicViscosity,
  resolveSpec,
  type RuizEliminatorResult,
} from './eliminators.ts'
import {
  RUIZ_2013_RUN1_FIT,
  efficiencySplit,
  paramsFromMeanSigma,
  type DropletDistributionParams,
  type EfficiencySplit,
} from './droplet-distribution.ts'

export function distributionParams(
  inputs: Pick<TowerInputs, 'dropletMean' | 'dropletSigma' | 'dropletDMax'>,
): DropletDistributionParams {
  return paramsFromMeanSigma(
    inputs.dropletMean,
    inputs.dropletSigma,
    inputs.dropletDMax,
  )
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
  eliminatorId: SelectionId
  customPerformance: CustomPerformance
  circulatingWaterFlow: number // kg/s water through the fill
  inletDriftRate: number // % of circulating water carried as droplets into the eliminator
  dropletMean: number // mass-weighted mean diameter E = exp(μ + σ²/2), µm
  dropletSigma: number // σ, standard deviation of ln d (log-normal)
  dropletDMax: number // upper limit: no inlet droplets larger, µm

  // Vapour recovery
  coolingBelowDewPoint: number // °C temperature difference below plume dew point
  cyclesOfConcentration: number // dimensionless
}

export interface PlumeState {
  t: number // °C
  rh: number // %
  pSat: number // Pa, saturation vapour pressure at t
  pv: number // Pa, vapour partial pressure
  omega: number // kg water / kg dry air
  h: number // kJ / kg dry air
  rho: number // kg moist air / m³
  dewPoint: number // °C; NaN when the air holds no vapour
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
    split: EfficiencySplit // cumulative inlet and escaping mass by diameter
    efficiency: (dUm: number) => number // ε(d) used for the selected eliminator
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
  const eliminatorSpec: EliminatorSpec = resolveSpec(inputs.eliminatorId)
  const isCustom = inputs.eliminatorId === 'custom'
  const custom = inputs.customPerformance
  const customDp = customPressureDrop(custom)
  const dynamicViscosity = airDynamicViscosity(inputs.plumeTemperature)
  const eliminator: RuizEliminatorResult = isCustom
    ? {
        spec: eliminatorSpec,
        velocity: evaluationVelocity,
        dynamicViscosity,
        reynolds: Number.NaN,
        stokes: Number.NaN,
        // Equivalent loss coefficient of the chosen Δp at this velocity
        pressureCoefficient:
          customDp / (0.5 * rho4 * evaluationVelocity ** 2),
        collectionEfficiency: customEfficiency(distribution.dMedUm, custom),
        pressureRangeIssues: [],
        collectionRangeIssues: [],
        pressureSupported: true,
        collectionSupported: true,
      }
    : evaluateRuizEliminator(
        eliminatorSpec,
        rho4,
        evaluationVelocity,
        inputs.plumeTemperature,
        distribution.dMedUm,
      )
  // Grade efficiency: every size is partly captured, by ε(d).
  const efficiency = (d: number) =>
    isCustom
      ? customEfficiency(d, custom)
      : collectionEfficiency(
          eliminatorSpec,
          stokesNumber(eliminatorSpec, evaluationVelocity, dynamicViscosity, d),
        )
  const split = efficiencySplit(distribution, efficiency)
  const massEscaping = split.escaping
  const massCaptured = 1 - massEscaping
  // Liquid drift mass balance (kept separate from vapour recovery):
  // ṁ_drift,in = ṁ_circ · drift rate / 100
  const driftInlet =
    Math.max(0, inputs.circulatingWaterFlow) *
    (Math.max(0, inputs.inletDriftRate) / 100)
  const collectionRangeIssues = eliminator.collectionRangeIssues
  const pressureDrop = !velocityValid
    ? 0
    : isCustom
      ? customDp
      : eliminator.pressureCoefficient * 0.5 * rho4 * eliminatorFaceVelocity ** 2
  const equivalentArea = inputs.flowArea
  // Ideal air power P_air = V̇·Δp. Pressure is not fed back into the
  // psychrometrics because the eliminator loss is tiny relative to atmospheric
  // pressure. Electrical or shaft power would require a fan efficiency.
  const fanAirPower = (vDot * pressureDrop) / 1000

  // Recovery temperature is expressed relative to dew point so the control
  // answers the useful question directly: how far into the condensing region
  // does the recovery device cool the plume?
  // Air with no vapour (RH = 0) has no dew point: nothing can condense, so the
  // outlet is held at the plume temperature and Δω = Δh = 0.
  const hasDewPoint = Number.isFinite(tDew)
  const requestedT5 = hasDewPoint
    ? tDew - inputs.coolingBelowDewPoint
    : inputs.plumeTemperature
  const t5 = Math.max(0, requestedT5)
  const omega5 = omegaSat(t5, inputs.pressure)
  const h5 = hSat(t5, inputs.pressure)
  const dOmega =
    hasDewPoint && inputs.coolingBelowDewPoint > 0
      ? Math.max(0, omega4 - omega5)
      : 0
  const dH = hasDewPoint ? Math.max(0, h4 - h5) : 0
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
      pSat: pSat(inputs.plumeTemperature),
      pv: vapourPressure(omega4, inputs.pressure),
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
      efficiency,
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

export interface EliminatorComparisonRow {
  id: SelectionId
  type: EliminatorSpec['type']
  pressureCoefficient: number
  pressureDrop: number // Pa
  fanAirPower: number // kW
  massEscaping: number // fraction of inlet drift mass
  driftEscaping: number // kg/s
  driftCaptured: number // kg/s
}

/** The full model run once per eliminator, with only the eliminator changed. */
export function compareEliminators(
  inputs: TowerInputs,
  ids: readonly SelectionId[],
): EliminatorComparisonRow[] {
  return ids.map((id) => {
    const r = solveTower({ ...inputs, eliminatorId: id })
    return {
      id,
      type: r.eliminator.spec.type,
      pressureCoefficient: r.eliminator.pressureCoefficient,
      pressureDrop: r.droplets.pressureDrop,
      fanAirPower: r.droplets.fanAirPower,
      massEscaping: r.droplets.massEscaping,
      driftEscaping: r.droplets.driftEscaping,
      driftCaptured: r.droplets.driftCaptured,
    }
  })
}

export const DEFAULT_INPUTS: TowerInputs = {
  plumeTemperature: 40,
  plumeRh: 95,
  pressure: 101_300,
  flowArea: 46.55,
  plumeVelocity: 3,

  eliminatorId: 'A',
  customPerformance: DEFAULT_CUSTOM_PERFORMANCE,
  circulatingWaterFlow: 150, // placeholder, roughly L/G ≈ 1 with the default airflow
  inletDriftRate: 0.2, // placeholder assumption: drift entering the eliminator
  // One log-normal fitted to Ruiz et al. (2013) Fig. 9(a), run 1, measured
  // at the tower exit: d_med 35 µm, σ = 0.555, so E = d_med·e^(σ²/2) = 40.8 µm
  dropletMean: 40.8,
  dropletSigma: 0.555,
  dropletDMax: RUIZ_2013_RUN1_FIT.dMaxUm,

  coolingBelowDewPoint: 10,
  cyclesOfConcentration: 6,
}
