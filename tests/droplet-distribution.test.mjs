import assert from 'node:assert/strict'
import test from 'node:test'

import {
  distributionSplit,
  rosinRammlerCumulative,
} from '../src/lib/droplet-distribution.ts'

test('Rosin–Rammler passes through 63.2% at the characteristic diameter', () => {
  for (const n of [0.5, 1, 2, 4]) {
    assert.ok(
      Math.abs(rosinRammlerCumulative(100, 100, n) - (1 - Math.exp(-1))) <
        1e-12,
    )
  }
})

test('cumulative fraction is monotonic and bounded', () => {
  let previous = 0
  for (let d = 1; d <= 1000; d *= 1.2) {
    const f = rosinRammlerCumulative(d, 100, 2)
    assert.ok(f >= previous && f >= 0 && f <= 1)
    previous = f
  }
})

test('below, within and above fractions sum to one', () => {
  const split = distributionSplit(10, 200, 100, 2)
  assert.ok(Math.abs(split.below + split.within + split.above - 1) < 1e-12)
})

test('invalid parameters return zero instead of NaN', () => {
  assert.equal(rosinRammlerCumulative(50, 0, 2), 0)
  assert.equal(rosinRammlerCumulative(50, 100, 0), 0)
  assert.equal(rosinRammlerCumulative(-5, 100, 2), 0)
})
