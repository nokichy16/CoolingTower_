/**
 * Inlet drift droplet-size distribution: one log-normal by mass, cut at d_max.
 *
 * Inputs are the mass-weighted mean E and σ, the standard deviation of ln d:
 *
 *   μ = ln E − σ²/2,   d_med = e^μ,   d_min (1 % point) = e^(μ − 2.326σ)
 *   LN(d) = ½ [1 + erf((ln d − μ) / (√2·σ))]
 *   F(d)  = LN(d) / LN(d_max)   for d < d_max,   F(d) = 1 for d ≥ d_max
 *
 * d_max only cuts the curve; it does not move μ or σ. The parameter object
 * stores d_min and d_med, so σ = ln(d_med / d_min) / 2.326.
 *
 * Ruiz et al. (2013), Atmospheric Environment 69:170–181, found the
 * log-normal function fitted measured cooling-tower drift better than
 * Rosin–Rammler. A fit to their test run 1 gives the default values below.
 * Those measurements were taken at the tower exit, so using them as an
 * eliminator inlet distribution is an assumption.
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

/**
 * F(d) for one parameter set, with the spread and the value at d_max worked
 * out once. Use this when F is needed at many diameters.
 */
export function cumulativeFunction(
  p: DropletDistributionParams,
): (diameterUm: number) => number {
  const sg = spread(p)
  const top = logNormalCumulative(p.dMaxUm, p.dMedUm, sg)
  return (diameterUm) => {
    if (!(diameterUm > 0)) return 0
    if (diameterUm >= p.dMaxUm) return 1
    return top > 0
      ? Math.min(1, logNormalCumulative(diameterUm, p.dMedUm, sg) / top)
      : 0
  }
}

export function dropletCumulative(
  diameterUm: number,
  p: DropletDistributionParams,
): number {
  return cumulativeFunction(p)(diameterUm)
}

/** Inlet mass fraction in each size class of width binUm, up to d_max. */
export function massBins(
  p: DropletDistributionParams,
  binUm: number,
): { mid: number; mass: number }[] {
  const F = cumulativeFunction(p)
  const bins: { mid: number; mass: number }[] = []
  let prevF = 0
  for (let a = 0; a < p.dMaxUm; a += binUm) {
    const b = Math.min(a + binUm, p.dMaxUm)
    const f = F(b)
    bins.push({ mid: (a + b) / 2, mass: f - prevF })
    prevF = f
  }
  return bins
}

/**
 * Relative droplet count per size class: mass in the class divided by the
 * mass of one droplet at the class midpoint (∝ d³). Normalised to peak = 1.
 */
export function countHistogram(
  p: DropletDistributionParams,
  binUm: number,
): { mid: number; count: number }[] {
  const bins = massBins(p, binUm).map((x) => ({
    mid: x.mid,
    count: x.mass / x.mid ** 3,
  }))
  const peak = bins.reduce((m, x) => Math.max(m, x.count), 0)
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

/** Diameter below which a mass fraction p of the distribution lies (bisection). */
export function massQuantile(
  fraction: number,
  p: DropletDistributionParams,
): number {
  const F = cumulativeFunction(p)
  let lo = 0.01
  let hi = p.dMaxUm
  for (let i = 0; i < 80; i += 1) {
    const mid = (lo + hi) / 2
    if (F(mid) < fraction) lo = mid
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
  const F = cumulativeFunction(p)
  const steps = 2000
  const total = F(top)
  let sum = 0
  let prevD = 0.05
  let prevF = F(prevD)
  for (let i = 1; i <= steps; i += 1) {
    const d = 0.05 * (top / 0.05) ** (i / steps)
    const f = F(d)
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
 *
 * Evaluated over equal size classes with ε at the class midpoint.
 * `inletCumulative` and `escapingCumulative` are fractions of the inlet mass
 * below each class upper edge, so captured = inlet − escaping at every d.
 */
export interface EfficiencySplit {
  escaping: number
  diameters: number[] // class upper edges, µm
  inletCumulative: number[] // F(d) at each upper edge (0–1)
  escapingCumulative: number[] // Σ(1 − ε)ΔF up to each upper edge (0–escaping)
}

export function efficiencySplit(
  p: DropletDistributionParams,
  efficiency: (diameterUm: number) => number,
  classes = 600,
): EfficiencySplit {
  const F = cumulativeFunction(p)
  const step = p.dMaxUm / classes
  const diameters: number[] = []
  const inletCumulative: number[] = []
  const escapingCumulative: number[] = []
  let escaping = 0
  let prevF = 0
  for (let i = 1; i <= classes; i += 1) {
    const d = i * step
    const f = F(d)
    const eps = Math.min(1, Math.max(0, efficiency(d - step / 2)))
    escaping += (1 - eps) * (f - prevF)
    diameters.push(d)
    inletCumulative.push(f)
    escapingCumulative.push(escaping)
    prevF = f
  }
  return { escaping, diameters, inletCumulative, escapingCumulative }
}

/**
 * Log-normal (by mass) from its mean E and the standard deviation σ of ln d.
 * E, σ and d_min describe the curve before the cut; d_max only cuts it:
 *   μ = ln E − σ²/2,   d_med = e^μ,   d_min (1 % point) = e^(μ − 2.326σ)
 */
export function paramsFromMeanSigma(
  meanUm: number,
  sigma: number,
  dMaxUm: number,
): DropletDistributionParams {
  const s = Math.max(sigma, 0.01)
  const mu = Math.log(Math.max(meanUm, 0.1)) - (s * s) / 2
  return { dMinUm: Math.exp(mu - Z99 * s), dMedUm: Math.exp(mu), dMaxUm }
}

/** Mass fraction of the log-normal above d_max, removed by the cut. */
export function massAboveCut(p: DropletDistributionParams): number {
  return 1 - logNormalCumulative(p.dMaxUm, p.dMedUm, spread(p))
}

/**
 * σ that puts the 1 % mass point at d_min for a given mean E (exact):
 *   σ²/2 + 2.326σ + ln(d_min/E) = 0  →  σ = −2.326 + √(2.326² − 2·ln(d_min/E))
 */
export function sigmaFromMinimum(dMinUm: number, meanUm: number): number {
  const r = Math.log(Math.min(dMinUm, meanUm * 0.999) / meanUm)
  return -Z99 + Math.sqrt(Z99 * Z99 - 2 * r)
}

/** d_min (1 % point) for a given mean E and σ (exact). */
export function minimumFromSigma(meanUm: number, sigma: number): number {
  return Math.exp(Math.log(meanUm) - (sigma * sigma) / 2 - Z99 * sigma)
}
