import type { EliminatorComparisonRow, TowerInputs } from '../lib/model'
import {
  selectionName,
  type EliminatorId,
  type SelectionId,
} from '../lib/eliminators'
import type { ReactNode } from 'react'
import { fmt, sig } from '../lib/format'
import { selectOnKey } from './selectOnKey'

const ELIMINATOR_GEOMETRY: Record<EliminatorId, string> = {
  A: '50 mm gap · 150 mm height · 54.3° direction change',
  B: '32 mm gap · 150 mm height · 89.4° direction change',
  C: '25 mm gap · 150 mm height · 36.3° direction change',
  D: '15 mm hydraulic diameter · 165 mm height',
  E: '34.79 mm characteristic length · 165 mm height · 45° direction change',
  F: '34.79 mm characteristic length · 165 mm height · 135° direction change',
}

/**
 * Eliminator selection and comparison in one table. Each row is the full
 * model at the current inputs with only the eliminator changed; click a row
 * to select that eliminator. The Custom switch replaces the table with the
 * custom performance editor (children).
 */
export default function EliminatorPicker({
  inputs,
  rows,
  driftInlet,
  onSelect,
  onCustom,
  children,
}: {
  inputs: TowerInputs
  rows: EliminatorComparisonRow[]
  driftInlet: number
  onSelect: (id: SelectionId) => void
  onCustom: (on: boolean) => void
  children?: ReactNode
}) {
  const custom = inputs.eliminatorId === 'custom'
  return (
    <section className="eliminator-table" aria-labelledby="eliminator-table-title">
      <div className="fan-table-head">
        <h3 className="input-group-title" id="eliminator-table-title">
          {custom ? 'Custom eliminator' : 'Eliminator A–F'}
        </h3>
        <button
          type="button"
          className={`show-all${custom ? ' is-on' : ''}`}
          aria-pressed={custom}
          onClick={() => onCustom(!custom)}
        >
          <span className="show-all-track" aria-hidden="true" />
          Custom
        </button>
      </div>
      <p className="eliminator-picker-note">
        Drift entering: <strong>{sig(driftInlet, 3)} kg/s</strong>
        {custom
          ? '. Set Δp, then drag the bars to set ε for each droplet size.'
          : ' (same for all). Select a row. Letters identify tested Ruiz configurations, not rankings.'}
      </p>
      {custom ? children : (
      <table>
        <thead>
          <tr>
            <th scope="col">Eliminator</th>
            <th scope="col" className="num">Escaping (%)</th>
            <th scope="col" className="num">Drift out (kg/s)</th>
            <th scope="col" className="num">Captured (kg/s)</th>
          </tr>
        </thead>
        <tbody role="radiogroup" aria-label="Eliminator">
          {rows.filter((row) => row.id !== 'custom').map((row) => {
            const on = row.id === inputs.eliminatorId
            return (
              <tr
                key={row.id}
                className={on ? 'is-selected' : ''}
                role="radio"
                aria-checked={on}
                tabIndex={0}
                onClick={() => onSelect(row.id)}
                onKeyDown={selectOnKey(() => onSelect(row.id))}
              >
                <th scope="row">
                  <div className="elim-cell">
                  <span className="picker-dot" aria-hidden="true" />
                  <span className="elim-name">
                    <strong>
                      {selectionName(row.id)} · {row.type}
                    </strong>
                    <small title={ELIMINATOR_GEOMETRY[row.id as EliminatorId]}>
                      {ELIMINATOR_GEOMETRY[row.id as EliminatorId]}
                    </small>
                  </span>
                  </div>
                </th>
                <td className="num">{fmt(100 * row.massEscaping, 1)}</td>
                <td className="num">{sig(row.driftEscaping, 3)}</td>
                <td className="num">{sig(row.driftCaptured, 3)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      )}
    </section>
  )
}
