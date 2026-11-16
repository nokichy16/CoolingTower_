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

/** Vapour partial pressure, Pa, of air with humidity ratio ω. */
export function vapourPressure(omega: number, p: number): number {
  return (omega * p) / (RATIO + omega);
}

/**
 * Dew-point temperature, °C, of air with humidity ratio ω.
 * Inverts the Magnus form for the vapour partial pressure.
 */
export function dewPoint(omega: number, p: number): number {
  const ln = Math.log(vapourPressure(omega, p) / 610.94);
  return (243.04 * ln) / (17.625 - ln);
}
