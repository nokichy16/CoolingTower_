import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import katex from 'katex'
import { FORMULA_TEX, FORMULA_NOTE } from '../src/lib/formula-tex.ts'

test('every TeX formula renders without a KaTeX error', () => {
  for (const [text, tex] of Object.entries(FORMULA_TEX)) {
    assert.doesNotThrow(() => katex.renderToString(tex, { throwOnError: true }), text)
  }
})

test('every formula in the values table has a TeX form or is plain text', () => {
  const src = fs.readFileSync(new URL('../src/components/StageResults.tsx', import.meta.url), 'utf8')
  const formulas = [...src.matchAll(/formula: '([^']*)'/g)].map((m) => m[1])
  const plainText = ['input', 'set directly (same at every velocity)', 'from stage 1 (inlet)', 'from stage 2']
  for (const f of formulas) {
    if (plainText.includes(f)) continue
    assert.ok(f in FORMULA_TEX, `no TeX for: ${f}`)
  }
  for (const key of Object.keys(FORMULA_NOTE)) assert.ok(key in FORMULA_TEX, key)
})
