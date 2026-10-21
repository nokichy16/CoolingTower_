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
 * Users enter d_min (1 % of the mass is smaller) and d_med; σg follows.
 *
 * Ruiz et al. (2013), Atmospheric Environment 69:170–181, found the
 * log-normal function fitted measured cooling-tower drift better than
 * Rosin–Rammler. A fit to their test run 1 gives the default values below. Those
 * measurements were taken at the tower exit, so using them as an eliminator
 * inlet distribution is an assumption.
 */

/**
 * Inlet distribution: one log-normal by mass, truncated at d_max.
 *
 *   F(d) = LN(d; d_med, σg) / LN(d_max; d_med, σg)   for d < d_max,
 *   F(d) = 1                                           for d ≥ d_max
 *
 * σg follows from d_min, the diameter where 1 % of the mass is smaller:
 *   σg = (d_med / d_min)^(1 / z99).
 */
export interface DropletDistributionParams {
  dMinUm: number // 1 % of mass is smaller
  dMedUm: number // mass median
  dMaxUm: number // hard upper limit: 100 % of mass is smaller
}

/** Standard normal quantile at 99 %: Φ⁻¹(0.99). */
export const Z99 = 2.3263479

/**
 * Defaults: least-squares fit of one log-normal (d_med = 35 µm, σg = 1.74)
 * to Ruiz et al. (2013) Fig. 9(a), test run 1, which was measured at the
 * tower exit (after the eliminator). Used here as an assumed inlet shape.
 * Largest error about 6.5 % (small sizes); the fit under-predicts the tail.
 */
export const RUIZ_2013_RUN1_FIT: DropletDistributionParams = {
  dMinUm: 9.6,
  dMedUm: 35,
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

export function spread(p: DropletDistributionParams): number {
  return (p.dMedUm / p.dMinUm) ** (1 / Z99)
}

export function dropletCumulative(
  diameterUm: number,
  p: DropletDistributionParams,
): number {
  if (!(diameterUm > 0)) return 0
  if (diameterUm >= p.dMaxUm) return 1
  const sg = spread(p)
  const top = logNormalCumulative(p.dMaxUm, p.dMedUm, sg)
  return top > 0
    ? Math.min(1, logNormalCumulative(diameterUm, p.dMedUm, sg) / top)
    : 0
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
    const mass = dropletCumulative(b, p) - dropletCumulative(a, p)
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

/** Diameter below which a mass fraction p of the distribution lies (bisection). */
export function massQuantile(
  fraction: number,
  p: DropletDistributionParams,
): number {
  let lo = 0.01
  let hi = p.dMaxUm
  for (let i = 0; i < 80; i += 1) {
    const mid = (lo + hi) / 2
    if (dropletCumulative(mid, p) < fraction) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

/**
 * Sauter mean diameter from the mass distribution: D32 = 1 / ∫ f(d)/d dd,
 * evaluated over fine size classes up to d_max (optionally up to a cut).
 */
export function sauterMeanDiameter(
  p: DropletDistributionParams,
  upToUm = p.dMaxUm,
): number {
  const top = Math.min(upToUm, p.dMaxUm)
  const steps = 2000
  const total = dropletCumulative(top, p)
  let sum = 0
  let prevD = 0.05
  let prevF = dropletCumulative(prevD, p)
  for (let i = 1; i <= steps; i += 1) {
    const d = 0.05 * (top / 0.05) ** (i / steps)
    const f = dropletCumulative(d, p)
    sum += (f - prevF) / Math.sqrt(d * prevD)
    prevD = d
    prevF = f
  }
  return sum > 0 ? total / sum : Number.NaN
}

/**
 * Grade-efficiency split of the inlet distribution.
 *
 *   escaping fraction = ∫₀^d_max (1 − ε(d)) dF(d)
 *   outlet F_out(d)   = ∫₀^d (1 − ε) dF / escaping fraction
 *   outlet D₃₂        = ∫(1 − ε) dF / ∫(1 − ε)/d dF
 *
 * Evaluated over equal size classes with ε at the class midpoint.
 */
export interface EfficiencySplit {
  escaping: number
  diameters: number[] // class upper edges, µm
  outletCumulative: number[] // F_out at each upper edge (0–1)
  outletSauterMean: number // µm
}

export function efficiencySplit(
  p: DropletDistributionParams,
  efficiency: (diameterUm: number) => number,
  classes = 600,
): EfficiencySplit {
  const step = p.dMaxUm / classes
  const diameters: number[] = []
  const running: number[] = []
  let escaping = 0
  let inverse = 0
  let prevF = 0
  for (let i = 1; i <= classes; i += 1) {
    const d = i * step
    const f = dropletCumulative(d, p)
    const mid = d - step / 2
    const eps = Math.min(1, Math.max(0, efficiency(mid)))
    const passed = (1 - eps) * (f - prevF)
    escaping += passed
    inverse += passed / mid
    diameters.push(d)
    running.push(escaping)
    prevF = f
  }
  return {
    escaping,
    diameters,
    outletCumulative: running.map((x) => (escaping > 0 ? x / escaping : 0)),
    outletSauterMean: inverse > 0 ? escaping / inverse : Number.NaN,
  }
}
