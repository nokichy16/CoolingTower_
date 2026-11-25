/**
 * Save and load a scenario as a two-column CSV file (Quantity, Value).
 *
 * The file holds the inputs first, then the results. Only the inputs are read
 * back; the result rows are there for a person who opens the file in a
 * spreadsheet. The label tables below are the single source for both writing
 * and reading.
 */
import { CUSTOM_SIZES_UM, SELECTIONS, type SelectionId } from './eliminators.ts'
import {
  DEFAULT_INPUTS,
  distributionParams,
  type TowerInputs,
  type TowerResults,
} from './model.ts'

const BOM = '﻿'
const HEADER = ['Quantity', 'Value'] as const
const ELIMINATOR_LABEL = 'Eliminator'

/** One input row: how to write it and how to apply a value read from a file. */
interface InputRow {
  label: string
  /** Written, and noted as missing, only for a custom eliminator. */
  customOnly: boolean
  text: (i: TowerInputs) => string
  /** Apply the text to the inputs; false when the text is not valid. */
  apply: (i: TowerInputs, text: string) => boolean
}

function numberRow(
  label: string,
  get: (i: TowerInputs) => number,
  set: (i: TowerInputs, v: number) => void,
  customOnly = false,
): InputRow {
  return {
    label,
    customOnly,
    text: (i) => String(get(i)),
    apply: (i, text) => {
      const v = text.trim() === '' ? NaN : Number(text)
      if (!Number.isFinite(v)) return false
      set(i, v)
      return true
    },
  }
}

const INPUT_ROWS: InputRow[] = [
  numberRow('Plume temperature T₄ (°C)', (i) => i.plumeTemperature, (i, v) => { i.plumeTemperature = v }),
  numberRow('Relative humidity RH₄ (%)', (i) => i.plumeRh, (i, v) => { i.plumeRh = v }),
  numberRow('Pressure P (Pa)', (i) => i.pressure, (i, v) => { i.pressure = v }),
  numberRow('Flow area A (m²)', (i) => i.flowArea, (i, v) => { i.flowArea = v }),
  numberRow('Velocity u₄ (m/s)', (i) => i.plumeVelocity, (i, v) => { i.plumeVelocity = v }),
  numberRow('Circulating water ṁ_circ (kg/s)', (i) => i.circulatingWaterFlow, (i, v) => { i.circulatingWaterFlow = v }),
  numberRow('Inlet drift rate D_in (%)', (i) => i.inletDriftRate, (i, v) => { i.inletDriftRate = v }),
  numberRow('Mean diameter E (µm)', (i) => i.dropletMean, (i, v) => { i.dropletMean = v }),
  numberRow('σ of ln d', (i) => i.dropletSigma, (i, v) => { i.dropletSigma = v }),
  numberRow('Largest droplet d_max (µm)', (i) => i.dropletDMax, (i, v) => { i.dropletDMax = v }),
  {
    label: ELIMINATOR_LABEL,
    customOnly: false,
    text: (i) => i.eliminatorId,
    apply: (i, text) => {
      const id = text.trim() as SelectionId
      if (!SELECTIONS.includes(id)) return false
      i.eliminatorId = id
      return true
    },
  },
  numberRow('Custom Δp (Pa)', (i) => i.customPerformance.pressureDropPa, (i, v) => { i.customPerformance.pressureDropPa = v }, true),
  ...CUSTOM_SIZES_UM.map((d, k) =>
    numberRow(
      `Custom ε at ${d} µm (%)`,
      (i) => i.customPerformance.efficiencyPct[k],
      (i, v) => { i.customPerformance.efficiencyPct[k] = v },
      true,
    ),
  ),
  numberRow('Cooling below dew point ΔT_dew (°C)', (i) => i.coolingBelowDewPoint, (i, v) => { i.coolingBelowDewPoint = v }),
  numberRow('Cycles of concentration CoC', (i) => i.cyclesOfConcentration, (i, v) => { i.cyclesOfConcentration = v }),
]

/** Fixed decimals, no thousands separator; empty when not finite. */
const fixed = (v: number, k: number) => (Number.isFinite(v) ? v.toFixed(k) : '')
/** Significant figures; empty when not finite. */
const sigFig = (v: number, k = 4) => (Number.isFinite(v) ? String(Number(v.toPrecision(k))) : '')

const RESULT_ROWS: Array<[label: string, text: (r: TowerResults) => string]> = [
  ['Saturation pressure (Pa)', (r) => fixed(r.plume.pSat, 0)],
  ['Vapour pressure (Pa)', (r) => fixed(r.plume.pv, 0)],
  ['Humidity ratio ω₄ (kg/kg da)', (r) => sigFig(r.plume.omega)],
  ['Dew point (°C)', (r) => fixed(r.plume.dewPoint, 1)],
  ['Enthalpy h₄ (kJ/kg da)', (r) => fixed(r.plume.h, 1)],
  ['Density ρ (kg/m³)', (r) => fixed(r.plume.rho, 3)],
  ['Volume flow V̇ (m³/s)', (r) => fixed(r.plume.vDot, 1)],
  ['Dry-air mass flow ṁ_da (kg/s)', (r) => fixed(r.plume.airMassFlow, 1)],
  ['Drift entering (kg/s)', (r) => sigFig(r.droplets.driftInlet, 3)],
  ['Median d_med (µm)', (r) => fixed(distributionParams(r.inputs).dMedUm, 1)],
  ['Smallest d_min, 1 % point (µm)', (r) => fixed(distributionParams(r.inputs).dMinUm, 1)],
  ['Reynolds number', (r) => fixed(r.eliminator.reynolds, 0)],
  ['Loss coefficient Kp', (r) => fixed(r.eliminator.pressureCoefficient, 2)],
  ['Pressure drop Δp (Pa)', (r) => fixed(r.droplets.pressureDrop, 1)],
  ['Mass escaping (%)', (r) => fixed(100 * r.droplets.massEscaping, 1)],
  ['Drift escaping (kg/s)', (r) => sigFig(r.droplets.driftEscaping, 3)],
  ['Drift captured (kg/s)', (r) => sigFig(r.droplets.driftCaptured, 3)],
  ['Ideal air power (kW)', (r) => fixed(r.droplets.fanAirPower, 2)],
  ['Outlet T₅ (°C)', (r) => fixed(r.recovery.t, 1)],
  ['Humidity condensed Δω (kg/kg da)', (r) => sigFig(r.recovery.dOmega)],
  ['Enthalpy removed Δh (kJ/kg da)', (r) => fixed(r.recovery.dH, 1)],
  ['Water recovered (kg/s)', (r) => fixed(r.recovery.mDotCond, 3)],
  ['Cooling duty (kW)', (r) => fixed(r.recovery.qDuty, 0)],
  ['Energy per kilogram (kJ/kg)', (r) => fixed(r.recovery.e, 0)],
  ['Blowdown / evaporation (%)', (r) => fixed(100 * r.waterBalance.blowdownToEvaporationRatio, 1)],
]

function quote(field: string): string {
  return /[",\r\n]/.test(field) ? `"${field.replace(/"/g, '""')}"` : field
}

export function scenarioToCsv(results: TowerResults): string {
  const inputs = results.inputs
  const rows: string[][] = [[...HEADER]]
  for (const row of INPUT_ROWS) {
    if (row.customOnly && inputs.eliminatorId !== 'custom') continue
    rows.push([row.label, row.text(inputs)])
  }
  for (const [label, text] of RESULT_ROWS) rows.push([label, text(results)])
  return BOM + rows.map((r) => r.map(quote).join(',')).join('\r\n') + '\r\n'
}

/** Split CSV text into rows of fields. Handles quotes, CRLF and LF. */
function splitCsv(text: string, delimiter: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  for (let k = 0; k < text.length; k += 1) {
    const c = text[k]
    if (inQuotes) {
      if (c === '"') {
        if (text[k + 1] === '"') {
          field += '"'
          k += 1
        } else inQuotes = false
      } else field += c
    } else if (c === '"') inQuotes = true
    else if (c === delimiter) {
      row.push(field)
      field = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[k + 1] === '\n') k += 1
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else field += c
  }
  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

export function parseScenarioCsv(text: string): { inputs: TowerInputs; notes: string[] } {
  const clean = text.replace(/^﻿/, '')
  const firstLine = clean.split(/\r\n|\n|\r/, 1)[0] ?? ''
  const delimiter = firstLine.includes(';') && !firstLine.includes(',') ? ';' : ','
  const values = new Map<string, string>()
  for (const row of splitCsv(clean, delimiter)) {
    if (row.length < 2) continue
    const label = row[0].trim()
    if (!values.has(label)) values.set(label, row[1])
  }

  if (!INPUT_ROWS.some((row) => values.has(row.label))) {
    throw new Error('No input rows found. Use a file saved with "Save CSV".')
  }

  const inputs: TowerInputs = {
    ...DEFAULT_INPUTS,
    customPerformance: {
      ...DEFAULT_INPUTS.customPerformance,
      efficiencyPct: [...DEFAULT_INPUTS.customPerformance.efficiencyPct],
    },
  }
  const notes: string[] = []
  // The eliminator is read first: it decides whether the custom rows count.
  const ordered = [...INPUT_ROWS].sort(
    (a, b) => Number(b.label === ELIMINATOR_LABEL) - Number(a.label === ELIMINATOR_LABEL),
  )
  for (const row of ordered) {
    if (row.customOnly && inputs.eliminatorId !== 'custom') continue
    const raw = values.get(row.label)
    if (raw === undefined) {
      notes.push(`Not in the file, default used: ${row.label}`)
    } else if (!row.apply(inputs, raw)) {
      notes.push(`Not a valid value, default used: ${row.label}`)
    }
  }
  return { inputs, notes }
}
