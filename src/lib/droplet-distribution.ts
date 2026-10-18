/**
 * Inlet drift droplet-size distribution (log-normal, by mass).
 *
 * Cumulative mass fraction of droplets smaller than diameter d:
 *
 *   F(d) = ½ [1 + erf( ln(d / d_med) / (√2 · ln σg) )]
 *
 * d_med is the mass median diameter (50 % of the mass is smaller) and σg is
 * the geometric standard deviation (σg = 1 is a single size; larger is wider).
 *
 * Users enter d10 and d90 (10 % and 90 % of the mass is smaller); d_med and
 * σg follow from them.
 *
 * Ruiz et al. (2013), Atmospheric Environment 69:170–181, found the
 * log-normal function fitted measured cooling-tower drift better than
 * Rosin–Rammler. Their test run 1 gives the default values below. Those
 * measurements were taken at the tower exit, so using them as an eliminator
 * inlet distribution is an assumption.
 */

/** Ruiz et al. (2013) Table 5, test run 1: d0.1 = 0.0204 mm, d0.9 = 0.0762 mm. */
export const RUIZ_2013_RUN1 = {
  d10Um: 20.4,
  d90Um: 76.2,
} as const

/** Standard normal quantile at 90 %: Φ⁻¹(0.9). */
export const Z90 = 1.2815516

/**
 * Log-normal parameters from the 10 % and 90 % mass diameters.
 * ln d10 = ln d_med − z90·ln σg and ln d90 = ln d_med + z90·ln σg, so
 *   d_med = √(d10 · d90),  σg = (d90 / d10)^(1 / (2 · z90)).
 */
export function logNormalFromD10D90(d10Um: number, d90Um: number) {
  return {
    medianDiameterUm: Math.sqrt(d10Um * d90Um),
    geometricSpread: (d90Um / d10Um) ** (1 / (2 * Z90)),
  }
}

/** Error function, Abramowitz & Stegun 7.1.26 (|error| < 1.5e-7). */
export function erf(x: number): number {
  const sign = x < 0 ? -1 : 1
  const ax = Math.abs(x)
  const t = 1 / (1 + 0.3275911 * ax)
  const poly =
    t *
    (0.254829592 +
      t *
        (-0.284496736 +
          t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))))
  return sign * (1 - poly * Math.exp(-ax * ax))
}

export function logNormalCumulative(
  diameterUm: number,
  medianDiameterUm: number,
  geometricSpread: number,
): number {
  if (
    !Number.isFinite(diameterUm) ||
    !Number.isFinite(medianDiameterUm) ||
    !Number.isFinite(geometricSpread) ||
    diameterUm <= 0 ||
    medianDiameterUm <= 0 ||
    geometricSpread <= 1
  ) {
    return 0
  }
  const z =
    Math.log(diameterUm / medianDiameterUm) /
    (Math.SQRT2 * Math.log(geometricSpread))
  return 0.5 * (1 + erf(z))
}

/** Evenly spaced diameters for plotting the cumulative curve. */
export function linearDiameters(
  minUm: number,
  maxUm: number,
  count: number,
): number[] {
  return Array.from(
    { length: count },
    (_, index) => minUm + ((maxUm - minUm) * index) / (count - 1),
  )
}
