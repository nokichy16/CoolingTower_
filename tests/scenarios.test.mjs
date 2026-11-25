import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { DEFAULT_INPUTS, solveTower } from '../src/lib/model.ts'
import { parseScenarioCsv, scenarioToCsv } from '../src/lib/scenarios.ts'

const fixture = readFileSync(new URL('./fixtures/scenario-default.csv', import.meta.url), 'utf8')
const baseCsv = scenarioToCsv(solveTower(DEFAULT_INPUTS))

const customInputs = {
  ...DEFAULT_INPUTS,
  eliminatorId: 'custom',
  customPerformance: {
    pressureDropPa: 42.5,
    efficiencyPct: [1, 12, 33, 55, 77, 88, 95, 98, 99.5, 100],
  },
}

test('default scenario matches the reference file byte for byte', () => {
  assert.equal(baseCsv, fixture)
  assert.ok(baseCsv.startsWith('﻿Quantity,Value\r\n'))
  assert.ok(baseCsv.endsWith('\r\n'))
})

test('round trip keeps the inputs', () => {
  for (const inputs of [DEFAULT_INPUTS, customInputs]) {
    const r = solveTower(inputs)
    const parsed = parseScenarioCsv(scenarioToCsv(r))
    assert.deepEqual(parsed.inputs, r.inputs)
    assert.deepEqual(parsed.notes, [])
  }
})

test('custom rows are written only for a custom eliminator', () => {
  assert.ok(!baseCsv.includes('Custom'))
  const csv = scenarioToCsv(solveTower(customInputs))
  assert.ok(csv.includes('Custom Δp (Pa),42.5'))
  assert.ok(csv.includes('Custom ε at 300 µm (%),100'))
})

test('parsing accepts a file without a BOM', () => {
  assert.deepEqual(parseScenarioCsv(baseCsv.slice(1)).inputs, DEFAULT_INPUTS)
})

test('parsing accepts LF line ends', () => {
  assert.deepEqual(parseScenarioCsv(baseCsv.replace(/\r\n/g, '\n')).inputs, DEFAULT_INPUTS)
})

test('parsing accepts a semicolon delimiter', () => {
  const lines = baseCsv.slice(1).split('\r\n').filter((l) => !l.startsWith('"'))
  const semi = lines.map((l) => l.replace(',', ';')).join('\n')
  const parsed = parseScenarioCsv(semi)
  assert.deepEqual(parsed.inputs, DEFAULT_INPUTS)
})

test('parsing ignores unknown rows and accepts any row order', () => {
  const lines = baseCsv.slice(1).split('\r\n').filter(Boolean)
  const [header, ...rows] = lines
  const shuffled = [header, 'Something else,1', ...rows.reverse(), 'Extra row,"a,b"']
  const parsed = parseScenarioCsv(shuffled.join('\n'))
  assert.deepEqual(parsed.inputs, DEFAULT_INPUTS)
  assert.deepEqual(parsed.notes, [])
})

test('a missing input row keeps the default and gives a note', () => {
  const text = baseCsv.replace(/Pressure P \(Pa\),101300\r\n/, '').replace(
    'Plume temperature T₄ (°C),40',
    'Plume temperature T₄ (°C),35',
  )
  const parsed = parseScenarioCsv(text)
  assert.equal(parsed.inputs.plumeTemperature, 35)
  assert.equal(parsed.inputs.pressure, DEFAULT_INPUTS.pressure)
  assert.deepEqual(parsed.notes, ['Not in the file, default used: Pressure P (Pa)'])
})

test('a bad number keeps the default and gives a note', () => {
  for (const bad of ['abc', '', 'Infinity']) {
    const parsed = parseScenarioCsv(baseCsv.replace('Flow area A (m²),46.55', `Flow area A (m²),${bad}`))
    assert.equal(parsed.inputs.flowArea, DEFAULT_INPUTS.flowArea)
    assert.equal(parsed.notes.length, 1)
    assert.ok(parsed.notes[0].includes('Flow area A (m²)'))
  }
})

test('an unknown eliminator keeps the default and gives a note', () => {
  const parsed = parseScenarioCsv(baseCsv.replace('Eliminator,A', 'Eliminator,Z'))
  assert.equal(parsed.inputs.eliminatorId, DEFAULT_INPUTS.eliminatorId)
  assert.equal(parsed.notes.length, 1)
})

test('a custom eliminator with missing custom rows gives notes', () => {
  const parsed = parseScenarioCsv('Quantity,Value\nEliminator,custom\n')
  assert.equal(parsed.inputs.eliminatorId, 'custom')
  assert.deepEqual(parsed.inputs.customPerformance, DEFAULT_INPUTS.customPerformance)
  assert.ok(parsed.notes.some((n) => n.includes('Custom Δp (Pa)')))
})

test('the default inputs are not changed by parsing', () => {
  parseScenarioCsv(scenarioToCsv(solveTower(customInputs)))
  assert.equal(DEFAULT_INPUTS.eliminatorId, 'A')
  assert.deepEqual(DEFAULT_INPUTS.customPerformance.efficiencyPct, [5, 15, 40, 60, 85, 95, 99, 100, 100, 100])
})

test('a file with no input rows throws', () => {
  assert.throws(() => parseScenarioCsv('Quantity,Value\r\nDew point (°C),39.0\r\n'), /No input rows/)
  assert.throws(() => parseScenarioCsv(''), /No input rows/)
})

test('result rows never change the parsed inputs', () => {
  const text = baseCsv
    .replace('Dew point (°C),39.0', 'Dew point (°C),5')
    .replace('Pressure drop Δp (Pa),27.1', 'Pressure drop Δp (Pa),999')
  assert.deepEqual(parseScenarioCsv(text).inputs, DEFAULT_INPUTS)
})

test('a number that is not finite is written as an empty field', () => {
  const r = solveTower({ ...DEFAULT_INPUTS, plumeVelocity: 0 })
  const csv = scenarioToCsv(r)
  assert.ok(!/NaN|Infinity/.test(csv))
})
