/**
 * Psychrometric primitives for moist air.
 *
 * Temperatures are in °C, pressures in Pa, humidity ratio ω in
 * kg water / kg dry air, enthalpy h in kJ / kg dry air, density in kg/m³.
 *
 * These are pure functions — no state, no side effects. Everything the tower
 * model does is built on top of them.
 */

/** Ratio of the molar masses of water and dry air (M_w / M_da). */
const RATIO = 0.62198;

/** Specific gas constant of dry air, J/(kg·K). */
const R_DA = 287.055;

/** Standard atmospheric pressure, Pa. */
export const P_ATM = 101325;

/**
 * Saturation vapour pressure of water over liquid, Pa.
 * Magnus / August–Roche–Magnus form — accurate to well under 0.5 % across
 * the 0–80 °C range this tool operates in.
 */
export function pSat(tC: number): number {
  return 610.94 * Math.exp((17.625 * tC) / (tC + 243.04));
}

/** Humidity ratio ω from vapour partial pressure and total pressure. */
export function humidityRatioFromPv(pv: number, p: number): number {
  return (RATIO * pv) / (p - pv);
}

/** Humidity ratio ω from dry-bulb temperature and relative humidity (%). */
export function humidityRatio(tC: number, rhPct: number, p: number): number {
  const pv = (rhPct / 100) * pSat(tC);
  return humidityRatioFromPv(pv, p);
}

/** Saturation humidity ratio — ω of air fully saturated at temperature tC. */
export function omegaSat(tC: number, p: number): number {
  return humidityRatioFromPv(pSat(tC), p);
}

/** Specific enthalpy of moist air, kJ / kg dry air. */
export function enthalpy(tC: number, omega: number): number {
  return 1.006 * tC + omega * (2501 + 1.86 * tC);
}

/** Saturation enthalpy — enthalpy of saturated air at temperature tC. */
export function hSat(tC: number, p: number): number {
  return enthalpy(tC, omegaSat(tC, p));
}

/** Density of moist air, kg/m³, from dry-bulb, humidity ratio and pressure. */
export function density(tC: number, omega: number, p: number): number {
  const tK = tC + 273.15;
  return ((1 + omega) * p) / (R_DA * tK * (1 + 1.6078 * omega));
}

/** Latent heat of vaporisation of water, kJ/kg, near temperature tC. */
export function hfg(tC: number): number {
  return 2501 - 2.36 * tC;
}

/** Relative humidity (%) from dry-bulb, humidity ratio and pressure. */
export function relHumidity(tC: number, omega: number, p: number): number {
  const pv = (omega * p) / (RATIO + omega);
  return Math.min(100, (pv / pSat(tC)) * 100);
}

/**
 * Dew-point temperature, °C, of air with humidity ratio ω.
 * Inverts the Magnus form for the vapour partial pressure.
 */
export function dewPoint(omega: number, p: number): number {
  const pv = (omega * p) / (RATIO + omega);
  const ln = Math.log(pv / 610.94);
  return (243.04 * ln) / (17.625 - ln);
}

/**
 * Temperature of saturated air with a given enthalpy — inverts hSat.
 * Used to find the fill-exit state: we know the exit enthalpy from the energy
 * balance and that the air leaves saturated, which fixes the temperature.
 * Monotone in T, so a bisection converges cleanly.
 */
export function tSatFromH(h: number, p: number): number {
  let lo = -20;
  let hi = 90;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (hSat(mid, p) < h) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/**
 * Thermodynamic wet-bulb temperature, °C. Iterated from the adiabatic
 * saturation relation. Used for display / context, not in the core chain.
 */
export function wetBulb(tC: number, omega: number, p: number): number {
  let lo = -20;
  let hi = tC;
  for (let i = 0; i < 60; i++) {
    const tw = (lo + hi) / 2;
    const wsStar = omegaSat(tw, p);
    // Humidity ratio implied by treating tw as the adiabatic saturation temp.
    const wImplied =
      ((2501 - 2.326 * tw) * wsStar - 1.006 * (tC - tw)) /
      (2501 + 1.86 * tC - 4.186 * tw);
    if (wImplied > omega) hi = tw;
    else lo = tw;
  }
  return (lo + hi) / 2;
}
