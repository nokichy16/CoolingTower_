import assert from 'node:assert/strict'
import test from 'node:test'

import {
  countHistogram,
  erf,
  logNormalCumulative,
  spread,
  RUIZ_2013_RUN1_FIT,
  RUIZ_2013_RUN1_POINTS,
  dropletCumulative,
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

test('curve reaches exactly 100 % at d_max', () => {
  const p = RUIZ_2013_RUN1_FIT
  assert.equal(dropletCumulative(p.dMaxUm, p), 1)
  assert.ok(dropletCumulative(p.dMaxUm - 1, p) < 1)
})

test('d_min is the 1 % point', () => {
  const p = RUIZ_2013_RUN1_FIT
  const f = logNormalCumulative(p.dMinUm, p.dMedUm, spread(p))
  assert.ok(Math.abs(f - 0.01) < 1e-6)
})

test('default fit follows all Ruiz run 1 points within 7 %', () => {
  for (const [d, y] of RUIZ_2013_RUN1_POINTS) {
    assert.ok(Math.abs(dropletCumulative(d, RUIZ_2013_RUN1_FIT) - y) < 0.07)
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

test('mass quantiles and Sauter mean are ordered and consistent', async () => {
  const { massQuantile, sauterMeanDiameter, dropletCumulative, RUIZ_2013_RUN1_FIT: p } =
    await import('../src/lib/droplet-distribution.ts')
  const d10 = massQuantile(0.1, p)
  const d50 = massQuantile(0.5, p)
  const d90 = massQuantile(0.9, p)
  assert.ok(d10 < d50 && d50 < d90)
  assert.ok(Math.abs(dropletCumulative(d50, p) - 0.5) < 1e-6)
  const d32 = sauterMeanDiameter(p)
  assert.ok(d32 > 0 && d32 < d50)
})

test('D32 input: truncated D32 matches and d_min stays the 1 % point', async () => {
  const { paramsFromSauterMean, sauterMeanDiameter, spread, logNormalCumulative } =
    await import('../src/lib/droplet-distribution.ts')
  for (const [dMin, d32, dMax] of [[9.6, 30, 300], [5, 20, 100], [20, 60, 500]]) {
    const p = paramsFromSauterMean(dMin, d32, dMax)
    assert.ok(Math.abs(sauterMeanDiameter(p) - d32) < 0.01 * d32)
    assert.ok(Math.abs(logNormalCumulative(dMin, p.dMedUm, spread(p)) - 0.01) < 1e-6)
    assert.ok(p.dMedUm > d32)
  }
})
