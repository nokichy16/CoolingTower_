import { useMemo } from 'react'
import { solveTower, type TowerInputs } from '../lib/model'
import { ELIMINATORS, type EliminatorId } from '../lib/eliminators'
import { fmt } from '../lib/format'
import { ELIMINATOR_COLORS } from './FanChart'

/**
 * All eliminators A–F at the current inputs: the full model is run once per
 * eliminator with only the eliminator changed. Click a row to select it.
 */
export default function FanTable({
  inputs,
  onSelect,
}: {
  inputs: TowerInputs
  onSelect: (id: EliminatorId) => void
}) {
  const rows = useMemo(
    () =>
      (Object.keys(ELIMINATORS) as EliminatorId[]).map((id) => {
        const r = solveTower({ ...inputs, eliminatorId: id })
        return {
          id,
          type: ELIMINATORS[id].type,
          kp: r.eliminator.pressureCoefficient,
          dp: r.droplets.pressureDrop,
          power: r.droplets.fanAirPower,
          escaping: 100 * r.droplets.massEscaping,
        }
      }),
    [inputs],
  )

  return (
    <section className="fan-table" aria-labelledby="fan-table-title">
      <h3 className="input-group-title" id="fan-table-title">
        All eliminators at u = {fmt(inputs.plumeVelocity, 1)} m/s
      </h3>
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
        <tbody>
          {rows.map((row) => {
            const on = row.id === inputs.eliminatorId
            return (
              <tr
                key={row.id}
                className={on ? 'is-selected' : ''}
                onClick={() => onSelect(row.id)}
                aria-selected={on}
              >
                <th scope="row">
                  <i style={{ background: ELIMINATOR_COLORS[row.id] }} />
                  {row.id} · {row.type}
                </th>
                <td className="num">{fmt(row.kp, 2)}</td>
                <td className="num">{fmt(row.dp, 1)}</td>
                <td className="num">{fmt(row.power, 2)}</td>
                <td className="num">{fmt(row.escaping, 1)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </section>
  )
}
