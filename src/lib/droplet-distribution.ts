/**
 * Inlet droplet-size distribution (Rosin–Rammler).
 *
 * Cumulative mass fraction of droplets smaller than diameter d:
 *
 *   F(d) = 1 − exp[−(d / dₑ)ⁿ]
 *
 * dₑ is the characteristic diameter (63.2% of the mass is smaller) and n is
 * the spread parameter (larger n = narrower distribution).
 *
 * This is an empirical form chosen as an input assumption. It is not yet
 * connected to the eliminator collection-efficiency calculation.
 */

export function rosinRammlerCumulative(
  diameterUm: number,
  characteristicDiameterUm: number,
  spread: number,
): number {
  if (
    !Number.isFinite(diameterUm) ||
    !Number.isFinite(characteristicDiameterUm) ||
    !Number.isFinite(spread) ||
    diameterUm <= 0 ||
    characteristicDiameterUm <= 0 ||
    spread <= 0
  ) {
    return 0
  }
  return 1 - Math.exp(-((diameterUm / characteristicDiameterUm) ** spread))
}

export interface DistributionSplit {
  below: number // mass fraction smaller than d_min
  within: number // mass fraction between d_min and d_max
  above: number // mass fraction larger than d_max
}

/** Mass fractions below, within, and above the selected diameter range. */
export function distributionSplit(
  diameterMinUm: number,
  diameterMaxUm: number,
  characteristicDiameterUm: number,
  spread: number,
): DistributionSplit {
  const fMin = rosinRammlerCumulative(
    diameterMinUm,
    characteristicDiameterUm,
    spread,
  )
  const fMax = rosinRammlerCumulative(
    diameterMaxUm,
    characteristicDiameterUm,
    spread,
  )
  return {
    below: fMin,
    within: Math.max(0, fMax - fMin),
    above: Math.max(0, 1 - fMax),
  }
}

/** Log-spaced diameters for plotting the cumulative curve. */
export function logSpacedDiameters(
  minUm: number,
  maxUm: number,
  count: number,
): number[] {
  const logMin = Math.log10(minUm)
  const logMax = Math.log10(maxUm)
  return Array.from({ length: count }, (_, index) =>
    10 ** (logMin + ((logMax - logMin) * index) / (count - 1)),
  )
}
