/**
 * Cooling-tower air-path model.
 *
 * Counterflow, induced-draft, open-circuit tower with film fill. The chain
 * follows the air upward: inlet → fill → drift eliminator → fan → exhaust,
 * then a recovery calculation (condensed state) and a water balance hung off
 * the exhaust. Every stage carries the state set upstream of it.
 *
 * Dry-air mass flow ṁ_a is prescribed directly. This keeps the learning model
 * focused on heat, moisture, pressure loss and recovery without pretending a
 * generic two-parameter fan curve represents a selected fan.
 */

import {
  density,
  enthalpy,
  hSat,
  humidityRatio,
  hWithinSatRange,
  omegaSat,
  P_ATM,
  relHumidity,
  T_SAT_MAX,
  tSatFromH,
  wetBulb,
} from './psychrometrics'
import {
  evaluateRuizEliminator,
  type EliminatorId,
  type RuizEliminatorResult,
} from './eliminators'

/** Specific heat of liquid water, kJ/(kg·K). */
const CP_W = 4.186

/**
 * Something the solver found wrong with the scenario. An `error` means the
 * numbers that come back do not describe a physical tower and must not be
 * presented as an operating point; a `warning` means the result stands but a
 * limit was applied.
 */
export interface SolveIssue {
  code:
    | 'inverted-water-temps'
    | 'below-wet-bulb'
    | 'heat-load-unattainable'
    | 'ruiz-pressure-extrapolation'
    | 'ruiz-collection-extrapolation'
  severity: 'error' | 'warning'
  title: string
  message: string
}

export interface TowerInputs {
  // Ambient air
  tAmbient: number // °C, dry-bulb
  rhAmbient: number // %
  pressure: number // Pa

  // Circulating water
  waterFlow: number // kg/s
  waterHot: number // °C, entering the fill (hot)
  waterCold: number // °C, leaving to basin (cold)
  airMassFlow: number // kg/s dry air

  // Geometry — face areas, m²
  aLouver: number
  aFill: number
  aDrift: number
  aFan: number

  // Ruiz et al. drift eliminator
  eliminatorId: EliminatorId
  dropletDiameter: number // representative diameter, µm

  // Other loss coefficients, dimensionless
  kLouver: number
  kFill: number
  kPlenum: number

  // Fan
  fanEff: number // 0–1

  // Recovery
  tCondense: number // °C, temperature the exhaust is cooled to

  // Water balance
  driftPct: number // drift as % of circulating flow
}

export interface AirState {
  t: number // °C
  omega: number // kg/kg
  h: number // kJ/kg dry air
  rho: number // kg/m³
  rh: number // %
  vDot: number // m³/s
}

export interface TowerResults {
  inputs: TowerInputs
  mDotAir: number // kg/s dry air
  qReject: number // kW, heat rejected in the fill

  /**
   * False when no physical operating point exists. Every other field is still
   * populated so the UI has a shape to render, but the values are meaningless
   * and must not be shown as results.
   */
  valid: boolean
  issues: SolveIssue[]
  eliminator: RuizEliminatorResult

  inlet: AirState & { u: number; dp: number; wetBulb: number }
  fill: AirState & { u: number; dp: number }
  drift: AirState & { u: number; dp: number; mDotDrift: number }
  fan: {
    u: number
    dpPlenum: number
    dpTotal: number // Σ Δp
    power: number // kW
  }
  exhaust: AirState

  condensed: {
    t: number
    omega: number
    h: number
    dOmega: number // kg water / kg dry air removed
    dH: number // kJ / kg dry air removed
    e: number // kJ / kg water — the headline
    qLat: number // kJ / kg dry air — condensation share of Δh
    qSen: number // kJ / kg dry air — gas-cooling share of Δh
    mDotCond: number // kg/s condensate
    qDuty: number // kW total cooling duty
    feasible: boolean
  }

  water: {
    evap: number // kg/s
    drift: number // kg/s
    makeup: number // kg/s; evaporation + drift only, excludes blowdown
  }
}

/** Δp = K · ½ρu²  — velocity-pressure loss across a component. */
function velocityLoss(k: number, rho: number, u: number): number {
  return k * 0.5 * rho * u * u
}

/**
 * Evaluate the whole air path at the prescribed dry-air mass flow.
 */
function evaluate(inputs: TowerInputs, mDotAir: number, qReject: number) {
  const p = inputs.pressure

  // State 1 — inlet air, fixed by ambient conditions.
  const omega1 = humidityRatio(inputs.tAmbient, inputs.rhAmbient, p)
  const h1 = enthalpy(inputs.tAmbient, omega1)
  const rho1 = density(inputs.tAmbient, omega1, p)
  const vDot1 = (mDotAir * (1 + omega1)) / rho1
  const u1 = vDot1 / inputs.aLouver
  const dp1 = velocityLoss(inputs.kLouver, rho1, u1)

  // State 2 — fill exit. Energy balance sets the enthalpy; the air leaves
  // saturated, which fixes its temperature and humidity ratio.
  //
  // If that enthalpy falls outside the saturation curve we can invert, there is
  // no exit state — the air physically cannot carry this much heat at this flow.
  // tSatFromH would silently return the bracket edge, so flag it instead.
  const h2 = h1 + qReject / mDotAir
  const satSolvable = hWithinSatRange(h2, p)
  const t2 = tSatFromH(h2, p)
  const omega2 = omegaSat(t2, p)
  const rho2 = density(t2, omega2, p)
  const vDot2 = (mDotAir * (1 + omega2)) / rho2

  // Fill loss uses mean conditions across the fill.
  const rhoFill = 0.5 * (rho1 + rho2)
  const omegaFill = 0.5 * (omega1 + omega2)
  const vDotFill = (mDotAir * (1 + omegaFill)) / rhoFill
  const uFill = vDotFill / inputs.aFill
  const dpFill = velocityLoss(inputs.kFill, rhoFill, uFill)

  // Drift eliminator — Kp is recalculated from the Ruiz correlation on every
  // pressure-balance iteration because Re changes with the trial air flow.
  const uDrift = vDot2 / inputs.aDrift
  const eliminator = evaluateRuizEliminator(
    inputs.eliminatorId,
    rho2,
    uDrift,
    t2,
    inputs.dropletDiameter,
  )
  const dpDrift = velocityLoss(
    eliminator.pressureCoefficient,
    rho2,
    uDrift,
  )

  // Plenum / fan approach.
  const uFan = vDot2 / inputs.aFan
  const dpPlenum = velocityLoss(inputs.kPlenum, rho2, uFan)

  const dpTotal = dp1 + dpFill + dpDrift + dpPlenum

  return {
    satSolvable,
    omega1, h1, rho1, vDot1, u1, dp1,
    t2, omega2, h2, rho2, vDot2,
    uFill, dpFill,
    uDrift, dpDrift, eliminator,
    uFan, dpPlenum,
    dpTotal,
  }
}

export function solveTower(inputs: TowerInputs): TowerResults {
  const p = inputs.pressure
  const issues: SolveIssue[] = []

  const omegaAmbient = humidityRatio(inputs.tAmbient, inputs.rhAmbient, p)
  const tWetBulb = wetBulb(inputs.tAmbient, omegaAmbient, p)

  // ── Guard: the water must actually be cooled ─────────────────────────────
  // A non-positive range makes Q̇ negative, which then poisons h₂ and every
  // state downstream of it.
  const waterRange = inputs.waterHot - inputs.waterCold
  if (waterRange <= 0) {
    issues.push({
      code: 'inverted-water-temps',
      severity: 'error',
      title: 'Cold water is not colder than the hot water',
      message: `T_cold ${inputs.waterCold.toFixed(1)} °C must sit below T_hot ${inputs.waterHot.toFixed(
        1,
      )} °C. As set, the tower would be heating the water and the heat load is negative.`,
    })
  }

  // ── Guard: the approach cannot cross the ambient wet-bulb ────────────────
  // Wet-bulb is the floor an evaporative tower approaches and never crosses.
  if (waterRange > 0 && inputs.waterCold < tWetBulb) {
    issues.push({
      code: 'below-wet-bulb',
      severity: 'error',
      title: 'Cold water is below the ambient wet-bulb',
      message: `T_cold ${inputs.waterCold.toFixed(
        1,
      )} °C is under the ${tWetBulb.toFixed(
        1,
      )} °C wet-bulb. No evaporative tower can cool below wet-bulb — raise T_cold or lower the ambient humidity.`,
    })
  }

  // Deliberately prescribed rather than tower-rated: the simplified model
  // asks the air path to carry this load and reports an error if it cannot.
  // A real tower would instead deliver less duty as its air approached
  // saturation.
  const qReject = inputs.waterFlow * CP_W * waterRange

  const mDotAir = inputs.airMassFlow
  const s = evaluate(inputs, mDotAir, qReject)

  // ── Guard: the air cannot absorb this duty at the flow the fan can pull ──
  // The pressure balance can close perfectly while the required fill-exit
  // enthalpy sits off the top of the saturation curve. That converged ṁ_a is
  // arithmetic, not an operating point.
  if (!s.satSolvable) {
    issues.push({
      code: 'heat-load-unattainable',
      severity: 'error',
      title: 'Air flow cannot carry this heat load',
      message: `Rejecting ${(qReject / 1000).toFixed(
        1,
      )} MW into ${mDotAir.toFixed(
        1,
      )} kg/s of air needs a fill-exit state above ${T_SAT_MAX} °C saturated, which is off the saturation curve. Cut the heat load or raise the prescribed air flow.`,
    })
  }

  // ── Ruiz empirical support ranges ────────────────────────────────────────
  // These are advisories rather than clamps: the extrapolated values remain
  // visible, but must not look paper-validated outside the fitted window.
  if (!s.eliminator.pressureSupported) {
    issues.push({
      code: 'ruiz-pressure-extrapolation',
      severity: 'warning',
      title: 'Ruiz pressure correlation is extrapolated',
      message: `${s.eliminator.pressureRangeIssues.join(
        '; ',
      )}. Kp and Δp remain visible, but are not validated by the source paper here.`,
    })
  }
  if (!s.eliminator.collectionSupported) {
    issues.push({
      code: 'ruiz-collection-extrapolation',
      severity: 'warning',
      title: 'Ruiz collection correlation is extrapolated',
      message: `${s.eliminator.collectionRangeIssues.join(
        '; ',
      )}. The single-size collection efficiency remains visible, but is not validated by the source paper here.`,
    })
  }

  // Fan power estimate from the prescribed air flow against total resistance.
  // dpTotal is the static pressure the selected fan would need to supply.
  const power = (s.vDot2 * s.dpTotal) / inputs.fanEff / 1000 // kW

  // Exhaust (state 4) = fill exit carried through the eliminator and fan.
  const exhaust: AirState = {
    t: s.t2,
    omega: s.omega2,
    h: s.h2,
    rho: s.rho2,
    rh: 100,
    vDot: s.vDot2,
  }

  // Condensed state (5): cool the saturated exhaust to tCondense along the
  // saturation line. Recovery only happens if we cool below the exhaust temp.
  const tCond = inputs.tCondense
  const feasible = tCond < s.t2
  const omega5 = omegaSat(tCond, p)
  const h5 = hSat(tCond, p)
  const dOmega = Math.max(0, s.omega2 - omega5)
  const dH = Math.max(0, s.h2 - h5)
  const e = dOmega > 1e-9 ? dH / dOmega : 0

  // Latent / sensible split. Sensible is taken first because it has a clean
  // closed form — the uncondensed mixture cooled through the temperature drop,
  // at the humidity that survives to state 5. Latent is the remainder, which
  // avoids leaning on a single h_fg value while h_fg varies over that range.
  const qSen = (1.006 + omega5 * 1.86) * Math.max(0, s.t2 - tCond)
  const qLat = Math.max(0, dH - qSen)

  const mDotCond = mDotAir * dOmega
  const qDuty = mDotAir * dH

  // Simplified water balance, hung off the exhaust — pure accounting.
  // Blowdown / water-treatment losses are deliberately excluded for now.
  const evap = mDotAir * (s.omega2 - s.omega1)
  const drift = (inputs.driftPct / 100) * inputs.waterFlow
  const makeup = evap + drift

  return {
    inputs,
    mDotAir,
    qReject,
    valid: !issues.some((i) => i.severity === 'error'),
    issues,
    eliminator: s.eliminator,
    inlet: {
      t: inputs.tAmbient,
      omega: s.omega1,
      h: s.h1,
      rho: s.rho1,
      rh: relHumidity(inputs.tAmbient, s.omega1, p),
      vDot: s.vDot1,
      u: s.u1,
      dp: s.dp1,
      wetBulb: wetBulb(inputs.tAmbient, s.omega1, p),
    },
    fill: {
      t: s.t2,
      omega: s.omega2,
      h: s.h2,
      rho: s.rho2,
      rh: 100,
      vDot: s.vDot2,
      u: s.uFill,
      dp: s.dpFill,
    },
    drift: {
      t: s.t2,
      omega: s.omega2,
      h: s.h2,
      rho: s.rho2,
      rh: 100,
      vDot: s.vDot2,
      u: s.uDrift,
      dp: s.dpDrift,
      mDotDrift: drift,
    },
    fan: {
      u: s.uFan,
      dpPlenum: s.dpPlenum,
      dpTotal: s.dpTotal,
      power,
    },
    exhaust,
    condensed: {
      t: tCond,
      omega: omega5,
      h: h5,
      dOmega,
      dH,
      e,
      qLat,
      qSen,
      mDotCond,
      qDuty,
      feasible,
    },
    water: { evap, drift, makeup },
  }
}

/** Sensible defaults — a mid-size tower on a warm humid day. */
export const DEFAULT_INPUTS: TowerInputs = {
  tAmbient: 30,
  rhAmbient: 50,
  pressure: P_ATM,

  waterFlow: 500,
  waterHot: 40,
  waterCold: 32,
  airMassFlow: 146.5,

  aLouver: 40,
  aFill: 36,
  aDrift: 36,
  aFan: 12,

  eliminatorId: 'B',
  dropletDiameter: 50,

  kLouver: 3.0,
  kFill: 12.0,
  kPlenum: 1.5,

  fanEff: 0.65,

  tCondense: 20,

  driftPct: 0.002,
}
