import assert from 'node:assert/strict'
import test from 'node:test'

import {
  erf,
  logNormalCumulative,
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

test('Ruiz 2013 run 1 defaults reproduce the reported d0.5 and d0.9', () => {
  const { medianDiameterUm: dm, geometricSpread: sg } = RUIZ_2013_RUN1
  // Table 5 run 1: d0.5 = 32.3 µm, d0.9 = 76.2 µm (measured; fit is approximate)
  assert.ok(dm > 30 && dm < 40)
  const d90 = dm * sg ** 1.2816
  assert.ok(d90 > 65 && d90 < 85)
})

test('invalid parameters return zero instead of NaN', () => {
  assert.equal(logNormalCumulative(50, 0, 1.8), 0)
  assert.equal(logNormalCumulative(50, 40, 1), 0)
  assert.equal(logNormalCumulative(-5, 40, 1.8), 0)
})
