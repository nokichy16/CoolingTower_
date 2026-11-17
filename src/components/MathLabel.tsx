import { memo } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'

/**
 * A short symbol (for example ṁ_da) shown as mathematical notation.
 * The TeX comes from our own table in stage-outputs.ts, so rendering it as
 * HTML is safe.
 */
function MathLabel({ tex, text }: { tex: string; text: string }) {
  const html = katex.renderToString(tex, { throwOnError: false, output: 'html' })
  return <span className="math-label" title={text} dangerouslySetInnerHTML={{ __html: html }} />
}

export default memo(MathLabel)
