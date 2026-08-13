/**
 * Data builder for the psychrometric process chart.
 *
 * Ported from the original single-file Plotly webapp
 * (`plume_recovery_webapp.html`). The curve construction, axis-range
 * heuristics and enthalpy-line stepping are kept as they were there; only the
 * psychrometric primitives are swapped for this project's shared
 * `psychrometrics` module, which works in Pa rather than kPa.
 *
 * State 1 is the prescribed exhaust plume. State 2 is the recovery outlet,
 * which this model always treats as saturated — so the process path ends on
 * the 100 % RH curve rather than at a user-set outlet humidity.
 */

import { enthalpy, humidityRatio, omegaSat } from './psychrometrics'
import type { TowerResults } from './model'

/** Background relative-humidity curves, percent. */
export const RH_CURVES = [25, 50, 75, 100] as const

/** Number of temperature samples across the plotted range. */
const SAMPLES = 81

export interface ChartRow {
  t: number
  [series: string]: number | null
}

export interface SeriesMeta {
  /** dataKey in the row objects. */
  key: string
  /** Text drawn at the end of the curve. */
  label: string
  /** Where that text sits, in data coordinates. */
  labelT: number
  labelW: number
}

export interface StatePoint {
  t: number
  /** Humidity ratio in g water / kg dry air — the chart's y unit. */
  w: number
  rh: number
  h: number
}

export interface PsychrometricChartData {
  rows: ChartRow[]
  rhSeries: SeriesMeta[]
  enthalpySeries: SeriesMeta[]
  minT: number
  maxT: number
  yMin: number
  yMax: number
  state1: StatePoint
  state2: StatePoint
  /** g water condensed per kg dry air. */
  condensedGrams: number
  /** kJ removed per kg dry air. */
  heatRemoved: number
  deltaT: number
  dewPoint: number
  /**
   * dataKey of the cooling path drawn over the background curves: constant
   * humidity ratio down to the dew point, then along the saturation curve to
   * the recovery outlet. The original webapp drew a straight chord between the
   * two states, which was reasonable there because the outlet humidity was a
   * free input. Here the outlet is always saturated, so the real two-leg path
   * is both more correct and no harder to draw.
   */
  processKey: string
  /** False when the two states coincide — nothing to draw a path between. */
  hasProcess: boolean
}

const PROCESS_KEY = 'process'

/** ω at (T, RH) in g/kg, or null where the state is not physical. */
function wAt(t: number, rh: number, p: number): number | null {
  const omega = humidityRatio(t, rh, p)
  if (!Number.isFinite(omega) || omega <= 0) return null
  return omega * 1000
}

/** Index of the last non-null value, or -1. */
function lastVisible(values: (number | null)[]): number {
  let last = -1
  values.forEach((v, i) => {
    if (v !== null) last = i
  })
  return last
}

export function buildPsychrometricChart(
  r: TowerResults,
): PsychrometricChartData {
  const p = r.inputs.pressure

  const state1: StatePoint = {
    t: r.plume.t,
    w: r.plume.omega * 1000,
    rh: r.plume.rh,
    h: r.plume.h,
  }
  const state2: StatePoint = {
    t: r.recovery.t,
    w: r.recovery.omega * 1000,
    rh: 100,
    h: r.recovery.h,
  }

  // Axis window — same padding rules as the original chart.
  let minT = Math.max(-20, Math.floor((Math.min(state1.t, state2.t) - 7) / 2.5) * 2.5)
  let maxT = Math.min(100, Math.ceil((Math.max(state1.t, state2.t) + 9) / 2.5) * 2.5)
  if (maxT - minT < 18) maxT = Math.min(100, minT + 18)
  if (maxT <= minT) maxT = minT + 18

  const minStateW = Math.min(state1.w, state2.w)
  const maxStateW = Math.max(state1.w, state2.w)
  const yMin = Math.max(0, Math.floor((minStateW * 0.7) / 5) * 5)
  const yMax = Math.max(8, Math.ceil((maxStateW * 1.35) / 5) * 5)

  const temperatures = Array.from(
    { length: SAMPLES },
    (_, i) => minT + (i * (maxT - minT)) / (SAMPLES - 1),
  )

  const rows: ChartRow[] = temperatures.map((t) => ({ t }))
  const rhSeries: SeriesMeta[] = []
  const enthalpySeries: SeriesMeta[] = []

  // Relative-humidity curves give the familiar psychrometric background.
  for (const rh of RH_CURVES) {
    const key = `rh${rh}`
    const curve = temperatures.map((t) => {
      const w = wAt(t, rh, p)
      return w !== null && w >= yMin && w <= yMax * 1.05 ? w : null
    })
    curve.forEach((w, i) => {
      rows[i][key] = w
    })
    const last = lastVisible(curve)
    if (last >= 0) {
      rhSeries.push({
        key,
        label: `${rh}%`,
        labelT: temperatures[last],
        // Clamped so a curve that leaves through the top of the plot still
        // gets its label drawn inside the axes.
        labelW: Math.min(curve[last] as number, yMax),
      })
    } else {
      rhSeries.push({ key, label: '', labelT: minT, labelW: yMin })
    }
  }

  // Constant-enthalpy lines, from the same moist-air enthalpy equation the
  // model uses. Only the sub-saturation part of each line is drawn.
  const hMin = enthalpy(minT, 0)
  const hMax = enthalpy(maxT, yMax / 1000)
  const hSpan = hMax - hMin
  const hStep = hSpan <= 80 ? 20 : hSpan <= 160 ? 40 : hSpan <= 320 ? 60 : 100
  const firstH = Math.ceil(hMin / hStep) * hStep

  for (let h = firstH; h <= hMax; h += hStep) {
    const key = `h${h}`
    const line = temperatures.map((t) => {
      const w = (h - 1.006 * t) / (2501 + 1.86 * t)
      if (w < 0 || w * 1000 < yMin || w * 1000 > yMax) return null
      const wSat = omegaSat(t, p)
      return w <= wSat ? w * 1000 : null
    })
    const last = lastVisible(line)
    if (last < 1) continue
    line.forEach((w, i) => {
      rows[i][key] = w
    })
    enthalpySeries.push({
      key,
      label: `h = ${h}`,
      labelT: temperatures[last],
      labelW: line[last] as number,
    })
  }

  // Sensible cooling at constant W from the plume to its dew point, then
  // condensation along the saturation curve down to the recovery outlet.
  const tDew = r.plume.dewPoint
  const lo = Math.min(state2.t, tDew)
  rows.forEach((row) => {
    const t = row.t
    if (t > state1.t || t < lo) {
      row[PROCESS_KEY] = null
    } else if (t >= tDew) {
      row[PROCESS_KEY] = state1.w
    } else {
      row[PROCESS_KEY] = omegaSat(t, p) * 1000
    }
  })

  return {
    rows,
    rhSeries,
    enthalpySeries,
    minT,
    maxT,
    yMin,
    yMax,
    state1,
    state2,
    condensedGrams: r.recovery.dOmega * 1000,
    heatRemoved: r.recovery.dH,
    deltaT: state1.t - state2.t,
    dewPoint: tDew,
    processKey: PROCESS_KEY,
    hasProcess: r.recovery.feasible && Math.abs(state1.t - state2.t) > 1e-6,
  }
}
