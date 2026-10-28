import { useMemo } from 'react'
import { solveTower, type TowerInputs } from '../lib/model'
import { ELIMINATORS, type EliminatorId } from '../lib/eliminators'
import { fmt, sig } from '../lib/format'

export const ELIMINATOR_DESCRIPTIONS: Record<EliminatorId, string> = {
  A: 'Vane · 50 mm gap · 150 mm height · 54.3° direction change',
  B: 'Vane · 32 mm gap · 150 mm height · 89.4° direction change',
  C: 'Vane · 25 mm gap · 150 mm height · 36.3° direction change',
  D: 'Honeycomb · 15 mm hydraulic diameter · 165 mm height',
  E: 'Wire mesh · 34.79 mm characteristic length · 165 mm height · 45° direction change',
  F: 'Wire mesh · 34.79 mm characteristic length · 165 mm height · 135° direction change',
}

/**
 * Eliminator selection and comparison in one table. Each row is the full
 * model at the current inputs with only the eliminator changed; click a row
 * to select that eliminator.
 */
export default function EliminatorPicker({
  inputs,
  onSelect,
}: {
  inputs: TowerInputs
  onSelect: (id: EliminatorId) => void
}) {
  const driftInlet = useMemo(() => solveTower(inputs).droplets.driftInlet, [inputs])
  const rows = useMemo(
    () =>
      (Object.keys(ELIMINATORS) as EliminatorId[]).map((id) => {
        const d = solveTower({ ...inputs, eliminatorId: id }).droplets
        return {
          id,
          escaping: 100 * d.massEscaping,
          driftEscaping: d.driftEscaping,
          driftCaptured: d.driftCaptured,
          d32: d.split.outletSauterMean,
        }
      }),
    [inputs],
  )

  return (
    <section className="eliminator-table" aria-labelledby="eliminator-table-title">
      <h3 className="input-group-title" id="eliminator-table-title">
        Tested eliminator A–F
      </h3>
      <p className="eliminator-picker-note">
        Drift entering: <strong>{sig(driftInlet, 3)} kg/s</strong> (same for
        all). Select a row. Letters identify tested Ruiz configurations, not
        rankings.
      </p>
      <table>
        <thead>
          <tr>
            <th scope="col">Eliminator</th>
            <th scope="col" className="num">Escaping (%)</th>
            <th scope="col" className="num">Drift out (kg/s)</th>
            <th scope="col" className="num">Captured (kg/s)</th>
            <th scope="col" className="num">Outlet D₃₂ (µm)</th>
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
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onSelect(row.id)
                  }
                }}
              >
                <th scope="row">
                  <div className="elim-cell">
                  <span className="picker-dot" aria-hidden="true" />
                  <span className="elim-name">
                    <strong>
                      {row.id} · {ELIMINATORS[row.id].type}
                    </strong>
                    <small>
                      {ELIMINATOR_DESCRIPTIONS[row.id].split(' · ').slice(1).join(' · ')}
                    </small>
                  </span>
                  </div>
                </th>
                <td className="num">{fmt(row.escaping, 1)}</td>
                <td className="num">{sig(row.driftEscaping, 3)}</td>
                <td className="num">{sig(row.driftCaptured, 3)}</td>
                <td className="num">{fmt(row.d32, 1)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </section>
  )
}
