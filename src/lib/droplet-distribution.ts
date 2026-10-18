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

/**
 * Two-mode inlet distribution, truncated at d_max.
 *
 *   F_raw(d) = (1 − w)·LN(d; d_med, σg) + w·LN(d; d_tail, σg,tail)
 *   F(d)     = F_raw(d) / F_raw(d_max)   for d < d_max,   F(d) = 1 for d ≥ d_max
 *
 * The main mode gives the steep rise; the tail mode (mass fraction w) gives
 * the long, flat end seen in measured drift. σg of the main mode follows from
 * d_min, the diameter where 1 % of the main-mode mass is smaller:
 *   σg = (d_med / d_min)^(1 / z99).
 */
export interface DropletDistributionParams {
  dMinUm: number // 1 % of main-mode mass is smaller
  dMedMainUm: number // main-mode mass median
  tailFraction: number // w, mass fraction in the tail mode
  tailMedianUm: number
  tailSpread: number // σg of the tail mode
  dMaxUm: number // hard upper limit: 100 % of mass is smaller
}

/** Standard normal quantile at 99 %: Φ⁻¹(0.99). */
export const Z99 = 2.3263479

/**
 * Defaults: a fit by eye to Ruiz et al. (2013) Fig. 9(a), test run 1, which
 * was measured at the tower exit (after the eliminator). Used here as an
 * assumed inlet shape.
 */
export const RUIZ_2013_RUN1_FIT: DropletDistributionParams = {
  dMinUm: 11,
  dMedMainUm: 30.5,
  tailFraction: 0.135,
  tailMedianUm: 100,
  tailSpread: 2,
  dMaxUm: 300,
}

/** Ruiz et al. (2013) Fig. 9(a) run 1 points, read approximately (µm, fraction). */
export const RUIZ_2013_RUN1_POINTS: ReadonlyArray<readonly [number, number]> = [
  [20.4, 0.1],
  [32.3, 0.5],
  [76.2, 0.9],
  [100, 0.93],
  [130, 0.95],
  [160, 0.965],
  [280, 0.985],
]

export function mainSpread(p: DropletDistributionParams): number {
  return (p.dMedMainUm / p.dMinUm) ** (1 / Z99)
}

export function twoModeCumulative(
  diameterUm: number,
  p: DropletDistributionParams,
): number {
  if (!(diameterUm > 0)) return 0
  if (diameterUm >= p.dMaxUm) return 1
  const sg = mainSpread(p)
  const raw = (d: number) =>
    (1 - p.tailFraction) * logNormalCumulative(d, p.dMedMainUm, sg) +
    p.tailFraction * logNormalCumulative(d, p.tailMedianUm, p.tailSpread)
  const top = raw(p.dMaxUm)
  return top > 0 ? Math.min(1, raw(diameterUm) / top) : 0
}

/**
 * Relative droplet count per size class: mass in the class divided by the
 * mass of one droplet at the class midpoint (∝ d³). Normalised to peak = 1.
 */
export function countHistogram(
  p: DropletDistributionParams,
  binUm: number,
): { mid: number; count: number }[] {
  const bins: { mid: number; count: number }[] = []
  for (let a = 0; a < p.dMaxUm; a += binUm) {
    const b = Math.min(a + binUm, p.dMaxUm)
    const mid = (a + b) / 2
    const mass = twoModeCumulative(b, p) - twoModeCumulative(a, p)
    bins.push({ mid, count: mass / mid ** 3 })
  }
  const peak = Math.max(...bins.map((x) => x.count))
  return bins.map((x) => ({ ...x, count: peak > 0 ? x.count / peak : 0 }))
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
