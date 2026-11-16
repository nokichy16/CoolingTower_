import type { TowerResults } from '../lib/model'
import { selectionName } from '../lib/eliminators'
import { STAGE_GROUPS, STAGE_META, type StageId } from '../lib/stages'
import { fmt, sig } from '../lib/format'
import TowerGraphic from './TowerGraphic'

/** Left rail: the tower drawing and the stages in calculation order. */
export default function StageRail({
  r,
  selected,
  warnings,
  onSelect,
}: {
  r: TowerResults
  selected: StageId
  warnings: Record<StageId, number>
  onSelect: (id: StageId) => void
}) {
  const reading: Record<StageId, string> = {
    plume: `${fmt(r.plume.t, 1)} °C · ${fmt(r.plume.rh, 0)} % · ${fmt(r.plume.airMassFlow, 1)} kg/s`,
    drift: `${sig(r.droplets.driftInlet, 3)} kg/s entering`,
    droplets: `${selectionName(r.eliminator.spec.id)} · ${fmt(100 * r.droplets.massEscaping, 1)} % escaping`,
    fan: `${fmt(r.droplets.fanAirPower, 2)} kW`,
    recovery: `${fmt(r.recovery.mDotCond, 2)} kg/s`,
  }

  return (
    <aside className="rail">
      <div className="rail-tower">
        <TowerGraphic r={r} selected={selected} onSelect={onSelect} compact />
      </div>
      <nav className="steps" aria-label="Stages">
        {STAGE_GROUPS.map((group) => (
          <div className="step-group" key={group.key}>
            {group.stages.length > 1 && (
              <span className="step-group-name">
                <span className="step-index">{group.index}</span>
                {group.name}
              </span>
            )}
            {group.stages.map((id) => {
              const meta = STAGE_META[id]
              const on = id === selected
              return (
                <button
                  type="button"
                  key={id}
                  className={`step is-${meta.path}${on ? ' is-selected' : ''}${
                    group.stages.length > 1 ? ' is-sub' : ''
                  }`}
                  aria-current={on ? 'step' : undefined}
                  onClick={() => onSelect(id)}
                >
                  {group.stages.length === 1 && (
                    <span className="step-index">{meta.index}</span>
                  )}
                  <span className="step-text">
                    <span className="step-name">
                      {meta.name}
                      {warnings[id] > 0 && (
                        <span className="step-warn" title={`${warnings[id]} warning${warnings[id] > 1 ? 's' : ''}`}>
                          {warnings[id]}
                        </span>
                      )}
                    </span>
                    <span className="step-reading">{reading[id]}</span>
                  </span>
                  <span className="step-path">{meta.path === 'air' ? 'air' : 'liquid'}</span>
                </button>
              )
            })}
          </div>
        ))}
      </nav>
    </aside>
  )
}
