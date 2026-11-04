/**
 * Ruiz et al. (2019) drift-eliminator correlations.
 *
 * Pressure drop:
 *   Kp = f(Re, geometry)
 *   Δp = Kp · ½ρv²
 *
 * Collection efficiency is evaluated by droplet diameter; the model integrates
 * (1 − ε(d)) over the inlet droplet distribution.
 */

export type EliminatorId = 'A' | 'B' | 'C' | 'D' | 'E' | 'F'
/** A tested Ruiz eliminator, or a custom geometry using the same correlations. */
export type SelectionId = EliminatorId | 'custom'
export type EliminatorType = 'vane' | 'honeycomb' | 'wire-mesh'

export interface EliminatorSpec {
  id: SelectionId
  type: EliminatorType
  characteristicLength: number // b for vanes, hydraulic diameter otherwise (m)
  height: number // L (m)
  theta: number // cumulative change in direction (rad)
  measuredPressureCoefficient: number
}

export const RUIZ_LIMITS = {
  reynoldsMin: 2_000,
  reynoldsMax: 15_000,
  velocityMin: 0.443,
  velocityMax: 4.36,
  stokesMin: 0.2,
  stokesMax: 2,
  dropletDiameterMin: 25, // µm; measurement-method floor
  pitchRatioMin: 1 / 6,
  pitchRatioMax: 1 / 3,
  thetaMin: Math.PI / 4,
  thetaMax: (3 * Math.PI) / 4,
} as const

export const ELIMINATORS: Record<EliminatorId, EliminatorSpec> = {
  A: {
    id: 'A',
    type: 'vane',
    characteristicLength: 0.05,
    height: 0.15,
    theta: 0.3017 * Math.PI,
    measuredPressureCoefficient: 5.81,
  },
  B: {
    id: 'B',
    type: 'vane',
    characteristicLength: 0.032,
    height: 0.15,
    theta: 0.4967 * Math.PI,
    measuredPressureCoefficient: 7.2,
  },
  C: {
    id: 'C',
    type: 'vane',
    characteristicLength: 0.025,
    height: 0.15,
    theta: 0.2016 * Math.PI,
    measuredPressureCoefficient: 9.74,
  },
  D: {
    id: 'D',
    type: 'honeycomb',
    characteristicLength: 0.015,
    height: 0.165,
    theta: Math.PI,
    measuredPressureCoefficient: 4.94,
  },
  E: {
    id: 'E',
    type: 'wire-mesh',
    characteristicLength: 0.03479,
    height: 0.165,
    theta: Math.PI / 4,
    measuredPressureCoefficient: 8.77,
  },
  F: {
    id: 'F',
    type: 'wire-mesh',
    characteristicLength: 0.03479,
    height: 0.165,
    theta: (3 * Math.PI) / 4,
    measuredPressureCoefficient: 5.05,
  },
}

/**
 * Custom eliminator geometry. Only parameters that appear in the Ruiz (2019)
 * correlations can be changed:
 * - vane: gap b and height h (Kp and ε both depend on b/h);
 * - honeycomb: cell (hydraulic) diameter, via Re and St only;
 * - wire mesh: characteristic length, and turn angle 45° or 135° (ε was
 *   fitted only at those two angles, so no interpolation).
 */
export interface CustomEliminator {
  type: EliminatorType
  vaneGapMm: number
  vaneHeightMm: number
  cellMm: number
  meshLengthMm: number
  meshAngleDeg: 45 | 135
}

export const DEFAULT_CUSTOM_ELIMINATOR: CustomEliminator = {
  type: 'vane',
  vaneGapMm: 40,
  vaneHeightMm: 150,
  cellMm: 15,
  meshLengthMm: 34.79,
  meshAngleDeg: 45,
}

export function customSpec(c: CustomEliminator): EliminatorSpec {
  if (c.type === 'vane') {
    return {
      id: 'custom',
      type: 'vane',
      characteristicLength: c.vaneGapMm / 1000,
      height: c.vaneHeightMm / 1000,
      theta: Math.PI / 3,
      measuredPressureCoefficient: Number.NaN,
    }
  }
  if (c.type === 'honeycomb') {
    return {
      id: 'custom',
      type: 'honeycomb',
      characteristicLength: c.cellMm / 1000,
      height: 0.165,
      theta: Math.PI,
      measuredPressureCoefficient: Number.NaN,
    }
  }
  return {
    id: 'custom',
    type: 'wire-mesh',
    characteristicLength: c.meshLengthMm / 1000,
    height: 0.165,
    theta: (c.meshAngleDeg * Math.PI) / 180,
    measuredPressureCoefficient: Number.NaN,
  }
}

export function resolveSpec(
  id: SelectionId | EliminatorSpec,
  custom: CustomEliminator = DEFAULT_CUSTOM_ELIMINATOR,
): EliminatorSpec {
  if (typeof id !== 'string') return id
  return id === 'custom' ? customSpec(custom) : ELIMINATORS[id]
}

export interface RuizEliminatorResult {
  spec: EliminatorSpec
  velocity: number
  dynamicViscosity: number
  reynolds: number
  stokes: number
  pressureCoefficient: number
  collectionEfficiency: number
  pressureRangeIssues: string[]
  collectionRangeIssues: string[]
  pressureSupported: boolean
  collectionSupported: boolean
}

/** Dynamic viscosity of air from Sutherland's law, kg/(m·s). */
export function airDynamicViscosity(tC: number): number {
  const tK = tC + 273.15
  return (1.458e-6 * tK ** 1.5) / (tK + 110.4)
}

function pressureCoefficient(spec: EliminatorSpec, reynolds: number): number {
  if (spec.type === 'vane') {
    const pitchRatio = spec.characteristicLength / spec.height
    return 2.51 * reynolds ** -0.0106 * pitchRatio ** -0.798
  }
  if (spec.type === 'honeycomb') {
    return 6.67 * reynolds ** -0.0347
  }
  return 6 * reynolds ** 0.0308 * spec.theta ** -0.487
}

/**
 * Single-size collection efficiency fitted to Figure 8 / Table 4.
 *
 * The published typesetting around β is sign-ambiguous. These signed forms are
 * the monotonic curves consistent with the plotted fits and Table 4:
 * - vane/honeycomb: Eq. 10 with negative β;
 * - wire mesh: exponential in St using the signed negative β coefficient.
 */
export function collectionEfficiency(
  spec: EliminatorSpec,
  stokes: number,
): number {
  if (spec.type === 'wire-mesh') {
    // Fitted separately for θ = 45° (E) and 135° (F); no interpolation.
    const small = spec.theta <= Math.PI / 2
    const alpha = small ? 0.113 : 0.718
    const beta = small ? -3.96 : -6.02
    return 1 - alpha * Math.exp(beta * stokes)
  }

  const pitchRatio = spec.characteristicLength / spec.height
  const alpha =
    spec.type === 'vane' ? 2.66 * pitchRatio - 0.284 : 0.112
  const beta =
    spec.type === 'vane' ? -(2.52 - 0.702 * pitchRatio) : -3.08
  const exponent = -(stokes ** 2) * (1 - Math.exp(beta / stokes))
  return 1 - alpha * Math.exp(exponent)
}

function outside(value: number, min: number, max: number): boolean {
  return !Number.isFinite(value) || value < min || value > max
}

export function stokesNumber(
  spec: EliminatorSpec,
  velocity: number,
  dynamicViscosity: number,
  dropletDiameterUm: number,
): number {
  const dropletDiameter = dropletDiameterUm * 1e-6
  return (
    (997 * velocity * dropletDiameter ** 2) /
    (18 * dynamicViscosity * spec.characteristicLength)
  )
}

export function collectionEfficiencyAtDiameter(
  id: SelectionId | EliminatorSpec,
  velocity: number,
  tAir: number,
  dropletDiameterUm: number,
): number {
  const spec = resolveSpec(id)
  const dynamicViscosity = airDynamicViscosity(tAir)
  const stokes = stokesNumber(
    spec,
    velocity,
    dynamicViscosity,
    dropletDiameterUm,
  )
  return collectionEfficiency(spec, stokes)
}

export function evaluateRuizEliminator(
  id: SelectionId | EliminatorSpec,
  rhoAir: number,
  velocity: number,
  tAir: number,
  dropletDiameterUm: number,
): RuizEliminatorResult {
  const spec = resolveSpec(id)
  const dynamicViscosity = airDynamicViscosity(tAir)
  const reynolds =
    (rhoAir * velocity * spec.characteristicLength) / dynamicViscosity
  const stokes = stokesNumber(
    spec,
    velocity,
    dynamicViscosity,
    dropletDiameterUm,
  )
  const kp = pressureCoefficient(spec, reynolds)
  const efficiency = collectionEfficiency(spec, stokes)

  const pressureRangeIssues: string[] = []
  const collectionRangeIssues: string[] = []

  if (
    outside(
      reynolds,
      RUIZ_LIMITS.reynoldsMin,
      RUIZ_LIMITS.reynoldsMax,
    )
  ) {
    pressureRangeIssues.push(
      `Re ${reynolds.toFixed(0)} is outside 2,000–15,000`,
    )
  }
  if (
    outside(
      velocity,
      RUIZ_LIMITS.velocityMin,
      RUIZ_LIMITS.velocityMax,
    )
  ) {
    pressureRangeIssues.push(
      `face velocity ${velocity.toFixed(2)} m/s is outside 0.443–4.36 m/s`,
    )
  }
  if (outside(stokes, RUIZ_LIMITS.stokesMin, RUIZ_LIMITS.stokesMax)) {
    collectionRangeIssues.push(
      `St ${stokes.toFixed(2)} is outside 0.2–2`,
    )
  }
  if (dropletDiameterUm < RUIZ_LIMITS.dropletDiameterMin) {
    collectionRangeIssues.push(
      `droplet diameter ${dropletDiameterUm.toFixed(0)} µm is below the 25 µm measurement floor`,
    )
  }

  if (spec.type === 'vane') {
    const pitchRatio = spec.characteristicLength / spec.height
    if (
      outside(
        pitchRatio,
        RUIZ_LIMITS.pitchRatioMin - 1e-9,
        RUIZ_LIMITS.pitchRatioMax + 1e-9,
      )
    ) {
      const issue = `b/L ${pitchRatio.toFixed(3)} is outside 1/6–1/3`
      pressureRangeIssues.push(issue)
      collectionRangeIssues.push(issue)
    }
  }
  if (
    spec.type === 'wire-mesh' &&
    outside(spec.theta, RUIZ_LIMITS.thetaMin, RUIZ_LIMITS.thetaMax)
  ) {
    pressureRangeIssues.push(
      `θ ${(spec.theta / Math.PI).toFixed(3)}π is outside π/4–3π/4`,
    )
  }

  if (spec.type === 'honeycomb' && Math.abs(spec.characteristicLength - 0.015) > 1e-6) {
    const issue = `honeycomb cell ${(spec.characteristicLength * 1000).toFixed(1)} mm differs from the one tested design (15 mm)`
    pressureRangeIssues.push(issue)
    collectionRangeIssues.push(issue)
  }

  return {
    spec,
    velocity,
    dynamicViscosity,
    reynolds,
    stokes,
    pressureCoefficient: kp,
    collectionEfficiency: efficiency,
    pressureRangeIssues,
    collectionRangeIssues,
    pressureSupported: pressureRangeIssues.length === 0,
    collectionSupported: collectionRangeIssues.length === 0,
  }
}

/** All selectable eliminators: the six tested designs plus the custom one. */
export const SELECTIONS: SelectionId[] = ['A', 'B', 'C', 'D', 'E', 'F', 'custom']

export function selectionName(id: SelectionId): string {
  return id === 'custom' ? 'Custom' : id
}

export function describeSpec(spec: EliminatorSpec): string {
  const mm = (m: number) => `${Number((m * 1000).toFixed(2))} mm`
  if (spec.type === 'vane') {
    return `${mm(spec.characteristicLength)} gap · ${mm(spec.height)} height · b/h ${(spec.characteristicLength / spec.height).toFixed(3)}`
  }
  if (spec.type === 'honeycomb') return `${mm(spec.characteristicLength)} hydraulic diameter`
  return `${mm(spec.characteristicLength)} characteristic length · ${Math.round((spec.theta * 180) / Math.PI)}° turn`
}
