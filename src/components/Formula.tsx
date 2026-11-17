import { memo } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import { FORMULA_NOTE, FORMULA_TEX } from '../lib/formula-tex'

/**
 * A formula from the values table, shown as mathematical notation.
 * Text that is not a formula stays as plain text. The TeX comes from our
 * own table (not from users), so rendering it as HTML is safe.
 */
function Formula({ text }: { text: string }) {
  const tex = FORMULA_TEX[text]
  if (!tex) return <span className="formula-text">{text}</span>
  const html = katex.renderToString(tex, { throwOnError: false, output: 'html' })
  const note = FORMULA_NOTE[text]
  return (
    <span className="formula" title={text}>
      <span dangerouslySetInnerHTML={{ __html: html }} />
      {note && <span className="formula-note">{note}</span>}
    </span>
  )
}

export default memo(Formula)
