/**
 * Cooling-tower air-path model.
 *
 * Counterflow, induced-draft, open-circuit tower with film fill. The chain
 * follows the air upward: inlet → fill → drift eliminator → fan → exhaust,
 * then a recovery calculation (condensed state) and a water balance hung off
 * the exhaust. Every stage carries the state set upstream of it.
 *
 * The one coupled unknown is the dry-air mass flow ṁ_a: system resistance
 * rises with flow while the fan delivers less, and the operating point is
 * where the two meet. We solve that with a bisection, recomputing the whole
 * air state each iteration because density depends on the temperatures the
 * flow itself produces.
 */

import {
  density,
  enthalpy,
  hSat,
  humidityRatio,
  omegaSat,
  P_ATM,
  relHumidity,
  tSatFromH,
  wetBulb,
} from './psychrometrics'

/** Specific heat of liquid water, kJ/(kg·K). */
const CP_W = 4.186

export interface TowerInputs {
  // Ambient air
  tAmbient: number // °C, dry-bulb
  rhAmbient: number // %
  pressure: number // Pa

  // Circulating water
  waterFlow: number // kg/s
  waterHot: number // °C, entering the fill (hot)
  waterCold: number // °C, leaving to basin (cold)

  // Geometry — face areas, m²
  aLouver: number
  aFill: number
  aDrift: number
  aFan: number

  // Loss coefficients, dimensionless
  kLouver: number
  kFill: number
  kDrift: number
  kPlenum: number

  // Fan: static pressure curve Δp = dp0·(1 − (V̇/Vmax)²), plus efficiency
  fanDp0: number // Pa, static pressure at zero flow
  fanVmax: number // m³/s, free-delivery flow
  fanEff: number // 0–1

  // Recovery
  tCondense: number // °C, temperature the exhaust is cooled to

  // Water balance
  cycles: number // cycles of concentration
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

  inlet: AirState & { u: number; dp: number; wetBulb: number }
  fill: AirState & { u: number; dp: number }
  drift: AirState & { u: number; dp: number; mDotDrift: number }
  fan: {
    u: number
    dpPlenum: number
    dpTotal: number // Σ Δp
    dpFanAvail: number
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
    qLat: number // kJ / kg dry air
    qSen: number // kJ / kg dry air
    mDotCond: number // kg/s condensate
    qDuty: number // kW total cooling duty
    feasible: boolean
  }

  water: {
    evap: number // kg/s
    drift: number // kg/s
    blowdown: number // kg/s
    makeup: number // kg/s
  }
}

/** Δp = K · ½ρu²  — velocity-pressure loss across a component. */
function velocityLoss(k: number, rho: number, u: number): number {
  return k * 0.5 * rho * u * u
}

/**
 * Solve the whole air path for a trial dry-air mass flow, returning the
 * pressure residual (fan available − system demand). The bisection in
 * `solveTower` drives this to zero.
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
  const h2 = h1 + qReject / mDotAir
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

  // Drift eliminator — composition unchanged, pure pressure loss.
  const uDrift = vDot2 / inputs.aDrift
  const dpDrift = velocityLoss(inputs.kDrift, rho2, uDrift)

  // Plenum / fan approach.
  const uFan = vDot2 / inputs.aFan
  const dpPlenum = velocityLoss(inputs.kPlenum, rho2, uFan)

  const dpTotal = dp1 + dpFill + dpDrift + dpPlenum

  // Fan static pressure available at this delivery.
  const ratio = vDot2 / inputs.fanVmax
  const dpFanAvail = inputs.fanDp0 * (1 - ratio * ratio)

  return {
    residual: dpFanAvail - dpTotal,
    omega1, h1, rho1, vDot1, u1, dp1,
    t2, omega2, h2, rho2, vDot2,
    uFill, dpFill,
    uDrift, dpDrift,
    uFan, dpPlenum,
    dpTotal, dpFanAvail,
  }
}

export function solveTower(inputs: TowerInputs): TowerResults {
  const p = inputs.pressure
  const qReject = inputs.waterFlow * CP_W * (inputs.waterHot - inputs.waterCold)

  // Bisection on ṁ_a. Raising the flow raises system demand (∝ ṁ_a²) and
  // lowers fan supply, so the residual falls monotonically — bracket it and
  // squeeze. Upper bound derived so fan delivery can't exceed Vmax.
  let lo = 1e-3
  let hi = Math.max(2, (inputs.fanVmax * 1.4) )
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2
    const r = evaluate(inputs, mid, qReject).residual
    if (r > 0) lo = mid
    else hi = mid
  }
  const mDotAir = (lo + hi) / 2
  const s = evaluate(inputs, mDotAir, qReject)

  // Fan power from delivered volume against total resistance.
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
  // Sensible = cooling the gas mixture; latent = the remainder (condensation).
  const qSen = (1.006 + omega5 * 1.86) * (s.t2 - tCond)
  const qLat = Math.max(0, dH - qSen)
  const mDotCond = mDotAir * dOmega
  const qDuty = mDotAir * dH

  // Water balance, hung off the exhaust — pure accounting.
  const evap = mDotAir * (s.omega2 - s.omega1)
  const drift = (inputs.driftPct / 100) * inputs.waterFlow
  const blowdown = Math.max(0, evap / (inputs.cycles - 1) - drift)
  const makeup = evap + drift + blowdown

  return {
    inputs,
    mDotAir,
    qReject,
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
      dpFanAvail: s.dpFanAvail,
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
    water: { evap, drift, blowdown, makeup },
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

  aLouver: 40,
  aFill: 36,
  aDrift: 36,
  aFan: 12,

  kLouver: 3.0,
  kFill: 12.0,
  kDrift: 4.0,
  kPlenum: 1.5,

  fanDp0: 300,
  fanVmax: 900,
  fanEff: 0.65,

  tCondense: 20,

  cycles: 4,
  driftPct: 0.002,
}
