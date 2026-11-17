import type { TowerResults } from '../lib/model'
import { STAGE_IDS, STAGE_META, type StageId } from '../lib/stages'
import { STAGE_KEY_OUTPUTS, stageSubtitle, stageValues } from '../lib/stage-outputs'
import ChangeValue from './ChangeValue'
import { STAGE_LABEL } from './StagePanel'

/**
 * Every stage with its key outputs, always in view. Select a row to open
 * the stage. Numbers show how much they changed after an input moved.
 */
export default function StageList({
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
  const values = stageValues(r)
  return (
    <nav className="stage-list" aria-label="Stages and their outputs">
      {STAGE_IDS.map((id) => {
        const meta = STAGE_META[id]
        const on = id === selected
        const sub = stageSubtitle(id, r)
        return (
          <button
            type="button"
            key={id}
            className={`sl-row is-${meta.path}${on ? ' is-selected' : ''}`}
            aria-current={on ? 'true' : undefined}
            onClick={() => onSelect(id)}
          >
            <span className="sl-index">{STAGE_LABEL[id]}</span>
            <span className="sl-name">
              {meta.name}
              {sub && <small>{sub}</small>}
              {warnings[id] > 0 && (
                <span className="sl-warn" title="Warning on this stage">
                  !
                </span>
              )}
            </span>
            <span className="sl-values">
              {STAGE_KEY_OUTPUTS[id].map((k) => {
                const v = values[k]
                return (
                  <span className="sl-value" key={k}>
                    <span className="sl-label">{v.label}</span>
                    <ChangeValue value={v.value} digits={v.digits} unit={v.unit} />
                  </span>
                )
              })}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
