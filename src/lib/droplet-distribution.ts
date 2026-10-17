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
 * Ruiz et al. (2013), Atmospheric Environment 69:170–181, found the
 * log-normal function fitted measured cooling-tower drift better than
 * Rosin–Rammler. Their test run 1 gives the default values below. Those
 * measurements were taken at the tower exit, so using them as an eliminator
 * inlet distribution is an assumption.
 */

/** Ruiz et al. (2013) Table 6, test run 1: λ = −3.3015 (ln mm), s = 0.5971. */
export const RUIZ_2013_RUN1 = {
  medianDiameterUm: 1000 * Math.exp(-3.3015),
  geometricSpread: Math.exp(0.5971),
} as const

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
