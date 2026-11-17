import type { EliminatorComparisonRow, TowerInputs } from '../lib/model'
import { selectionName, type SelectionId } from '../lib/eliminators'
import { fmt } from '../lib/format'
import { ELIMINATOR_COLORS } from './chartTheme'
import { selectOnKey } from './selectOnKey'

/**
 * All eliminators at the current inputs: the full model is run once per
 * eliminator with only the eliminator changed. Select a row to use it and
 * to show its line alone on the fan graph; "All on graph" shows every line.
 */
export default function FanTable({
  inputs,
  rows,
  showAll,
  onShowAll,
  onSelect,
}: {
  inputs: TowerInputs
  rows: EliminatorComparisonRow[]
  /** whether the fan graph shows every eliminator */
  showAll: boolean
  onShowAll: (all: boolean) => void
  onSelect: (id: SelectionId) => void
}) {
  return (
    <section className="fan-table" aria-labelledby="fan-table-title">
      <div className="fan-table-head">
        <h3 className="input-group-title" id="fan-table-title">
          All eliminators at u = {fmt(inputs.plumeVelocity, 1)} m/s
        </h3>
        <button
          type="button"
          className={`show-all${showAll ? ' is-on' : ''}`}
          aria-pressed={showAll}
          onClick={() => onShowAll(!showAll)}
        >
          <span className="show-all-track" aria-hidden="true" />
          All on graph
        </button>
      </div>
      <table>
        <thead>
          <tr>
            <th scope="col">Eliminator</th>
            <th scope="col" className="num">Kp</th>
            <th scope="col" className="num">Δp (Pa)</th>
            <th scope="col" className="num">Fan air power (kW)</th>
            <th scope="col" className="num">Drift escaping (%)</th>
          </tr>
        </thead>
        <tbody role="radiogroup" aria-label="Eliminator">
          {rows.map((row) => {
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
                  <i style={{ background: ELIMINATOR_COLORS[row.id] }} />
                  {selectionName(row.id)} · {row.type}
                </th>
                <td className="num">{fmt(row.pressureCoefficient, 2)}</td>
                <td className="num">{fmt(row.pressureDrop, 1)}</td>
                <td className="num">{fmt(row.fanAirPower, 2)}</td>
                <td className="num">{fmt(100 * row.massEscaping, 1)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </section>
  )
}
