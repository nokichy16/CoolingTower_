import assert from 'node:assert/strict'
import test from 'node:test'

import {
  countHistogram,
  erf,
  logNormalCumulative,
  mainSpread,
  RUIZ_2013_RUN1_FIT,
  RUIZ_2013_RUN1_POINTS,
  twoModeCumulative,
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

test('two-mode curve reaches exactly 100 % at d_max', () => {
  const p = RUIZ_2013_RUN1_FIT
  assert.equal(twoModeCumulative(p.dMaxUm, p), 1)
  assert.ok(twoModeCumulative(p.dMaxUm - 1, p) < 1)
})

test('d_min is the 1 % point of the main mode', () => {
  const p = RUIZ_2013_RUN1_FIT
  const f = logNormalCumulative(p.dMinUm, p.dMedMainUm, mainSpread(p))
  assert.ok(Math.abs(f - 0.01) < 1e-6)
})

test('default fit follows the Ruiz run 1 tail within 2 %', () => {
  for (const [d, y] of RUIZ_2013_RUN1_POINTS.filter(([d]) => d >= 76)) {
    assert.ok(Math.abs(twoModeCumulative(d, RUIZ_2013_RUN1_FIT) - y) < 0.02)
  }
})

test('count histogram peaks at small sizes', () => {
  const bins = countHistogram(RUIZ_2013_RUN1_FIT, 5)
  const peak = bins.find((b) => b.count === 1)
  assert.ok(peak && peak.mid < 30)
})

test('invalid parameters return zero instead of NaN', () => {
  assert.equal(logNormalCumulative(50, 0, 1.8), 0)
  assert.equal(logNormalCumulative(50, 40, 1), 0)
  assert.equal(logNormalCumulative(-5, 40, 1.8), 0)
})
