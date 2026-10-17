import assert from 'node:assert/strict'
import test from 'node:test'

import {
  DEFAULT_INPUTS,
  solveTower,
  velocityFromDryAirMassFlow,
} from '../src/lib/model.ts'

const closeTo = (actual, expected, relativeTolerance = 1e-8) => {
  const scale = Math.max(1, Math.abs(expected))
  assert.ok(
    Math.abs(actual - expected) <= relativeTolerance * scale,
    `${actual} was not within ${relativeTolerance} relative tolerance of ${expected}`,
  )
}

test('selected velocity drives the Ruiz pressure loss for all six eliminators', () => {
  for (const eliminatorId of ['A', 'B', 'C', 'D', 'E', 'F']) {
    const result = solveTower({ ...DEFAULT_INPUTS, eliminatorId })
    const expectedPressure =
      result.eliminator.pressureCoefficient *
      0.5 *
      result.plume.rho *
      result.inputs.plumeVelocity ** 2

    assert.equal(result.valid, true)
    closeTo(result.eliminator.velocity, result.inputs.plumeVelocity)
    closeTo(result.droplets.pressureDrop, expectedPressure)
  }
})

test('adjustable-area plume flow conserves moist and dry-air mass', () => {
  const result = solveTower(DEFAULT_INPUTS)

  closeTo(
    result.plume.vDot,
    result.inputs.flowArea * result.inputs.plumeVelocity,
  )
  closeTo(
    result.plume.airMassFlow,
    (result.plume.rho * result.plume.vDot) / (1 + result.plume.omega),
  )
})

test('editable dry-air mass flow maps to velocity on the same fixed-area basis', () => {
  const base = solveTower(DEFAULT_INPUTS)
  const targetDryAirMassFlow = 200
  const linkedVelocity = velocityFromDryAirMassFlow(
    targetDryAirMassFlow,
    base.plume.rho,
    DEFAULT_INPUTS.flowArea,
    base.plume.omega,
  )
  const result = solveTower({
    ...DEFAULT_INPUTS,
    plumeVelocity: linkedVelocity,
  })

  closeTo(result.plume.airMassFlow, targetDryAirMassFlow)
  closeTo(result.plume.flowArea, DEFAULT_INPUTS.flowArea)
  closeTo(result.plume.velocity, linkedVelocity)
})

test('eliminator and fan outputs use the same velocity and flow basis', () => {
  const result = solveTower(DEFAULT_INPUTS)

  closeTo(result.plume.velocity, result.inputs.plumeVelocity)
  closeTo(result.droplets.equivalentArea, result.inputs.flowArea)
  closeTo(
    result.droplets.fanAirPower,
    (result.plume.vDot * result.droplets.pressureDrop) / 1000,
  )
})

test('recovery scales with dry-air flow derived from adjustable area', () => {
  const base = solveTower(DEFAULT_INPUTS)
  const doubled = solveTower({
    ...DEFAULT_INPUTS,
    flowArea: DEFAULT_INPUTS.flowArea * 2,
  })

  closeTo(doubled.plume.velocity, base.plume.velocity)
  closeTo(doubled.plume.airMassFlow, base.plume.airMassFlow * 2)
  closeTo(doubled.recovery.mDotCond, base.recovery.mDotCond * 2)
  closeTo(doubled.recovery.qDuty, base.recovery.qDuty * 2)
})

test('higher selected velocity increases pressure, power, and total recovery', () => {
  const low = solveTower({ ...DEFAULT_INPUTS, plumeVelocity: 1.5 })
  const high = solveTower({ ...DEFAULT_INPUTS, plumeVelocity: 3 })

  assert.ok(high.droplets.pressureDrop > low.droplets.pressureDrop)
  assert.ok(high.droplets.fanAirPower > low.droplets.fanAirPower)
  closeTo(high.recovery.mDotCond, low.recovery.mDotCond * 2)
})

test('cycles of concentration sets the blowdown-to-evaporation ratio', () => {
  const result = solveTower({ ...DEFAULT_INPUTS, cyclesOfConcentration: 6 })

  closeTo(result.waterBalance.blowdownToEvaporationRatio, 1 / 5)
})

test('Ruiz collection curve determines the theoretical d50 cutoff', () => {
  const result = solveTower({ ...DEFAULT_INPUTS, eliminatorId: 'A' })

  assert.equal(result.droplets.cutoffFound, true)
  assert.ok(result.droplets.captureCutoffDiameter > 25)
  assert.ok(result.droplets.captureCutoffDiameter < 200)
  closeTo(result.droplets.massEscaping + result.droplets.massCaptured, 1)
})

test('eliminators above 50 % capture at every size report no cutoff', () => {
  const result = solveTower({ ...DEFAULT_INPUTS, eliminatorId: 'B' })

  assert.equal(result.droplets.cutoffFound, false)
  assert.ok(Number.isNaN(result.droplets.massEscaping))
})

test('invalid area, velocity, or cycles are reported without negative airflow', () => {
  for (const { inputs, zeroFlow } of [
    { inputs: { ...DEFAULT_INPUTS, flowArea: -1 }, zeroFlow: true },
    { inputs: { ...DEFAULT_INPUTS, plumeVelocity: 0 }, zeroFlow: true },
    {
      inputs: { ...DEFAULT_INPUTS, cyclesOfConcentration: 1 },
      zeroFlow: false,
    },
  ]) {
    const result = solveTower(inputs)
    assert.equal(result.valid, false)
    if (zeroFlow) assert.equal(result.plume.vDot, 0)
    assert.ok(
      result.issues.some(
        (issue) =>
          issue.code === 'flow-input-invalid' || issue.code === 'cycles-invalid',
      ),
    )
  }
})
