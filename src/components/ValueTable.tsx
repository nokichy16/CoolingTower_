import type { StageBlock } from '../lib/stage-values'

/** One stage's inputs and calculated values: quantity, formula, value. */
export default function ValueTable({ block }: { block: StageBlock }) {
  return (
    <div className="value-table-wrap">
      <table className="value-table">
        <thead>
          <tr>
            <th scope="col">Quantity</th>
            <th scope="col" className="formula">Formula</th>
            <th scope="col" className="num">Value</th>
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row) => (
            <tr key={row.label} className={row.kind === 'input' ? 'is-input' : ''}>
              <th scope="row">{row.label}</th>
              <td className="formula">
                {row.kind === 'input' ? <span className="input-chip">input</span> : <code>{row.formula}</code>}
              </td>
              <td className="num">
                <strong>{row.value}</strong>
                {row.unit && <small>{row.unit}</small>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {block.notes && block.notes.length > 0 && (
        <ul className="value-notes">
          {block.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
