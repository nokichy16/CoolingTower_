import assert from 'node:assert/strict'
import test from 'node:test'

import {
  erf,
  logNormalCumulative,
  logNormalFromD10D90,
  RUIZ_2013_RUN1,
} from '../src/lib/droplet-distribution.ts'

test('erf matches reference values', () => {
  assert.ok(Math.abs(erf(0)) < 1e-7)
  assert.ok(Math.abs(erf(1) - 0.8427007929) < 2e-7)
  assert.ok(Math.abs(erf(-0.5) + 0.5204998778) < 2e-7)
})

test('log-normal passes through 50 % at the median diameter', () => {
  for (const sg of [1.2, 1.8, 3]) {
    assert.ok(Math.abs(logNormalCumulative(40, 40, sg) - 0.5) < 1e-7)
  }
})

test('one geometric standard deviation above the median gives 84.1 %', () => {
  const f = logNormalCumulative(40 * 1.8, 40, 1.8)
  assert.ok(Math.abs(f - 0.8413447) < 1e-6)
})

test('cumulative fraction is monotonic and bounded', () => {
  let previous = 0
  for (let d = 1; d <= 1000; d *= 1.2) {
    const f = logNormalCumulative(d, 37, 1.8)
    assert.ok(f >= previous && f >= 0 && f <= 1)
    previous = f
  }
})

test('d10 and d90 inputs give a curve through 10 % and 90 %', () => {
  const { d10Um, d90Um } = RUIZ_2013_RUN1
  const { medianDiameterUm: dm, geometricSpread: sg } = logNormalFromD10D90(
    d10Um,
    d90Um,
  )
  assert.ok(Math.abs(logNormalCumulative(d10Um, dm, sg) - 0.1) < 1e-6)
  assert.ok(Math.abs(logNormalCumulative(d90Um, dm, sg) - 0.9) < 1e-6)
  // Ruiz run 1 measured d0.5 = 32.3 µm; the two-point fit gives about 39 µm.
  assert.ok(dm > 35 && dm < 42)
})

test('invalid parameters return zero instead of NaN', () => {
  assert.equal(logNormalCumulative(50, 0, 1.8), 0)
  assert.equal(logNormalCumulative(50, 40, 1), 0)
  assert.equal(logNormalCumulative(-5, 40, 1.8), 0)
})
