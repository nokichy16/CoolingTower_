import { STAGE_META, type StageId } from '../lib/stages'
import { STAGE_LABEL } from './StagePanel'

export const STAGE_IDS: StageId[] = ['plume', 'drift', 'droplets', 'fan', 'recovery']

/** The five stage toggles, 1A to 4. */
export default function StageToggles({
  selected,
  onSelect,
}: {
  selected: StageId
  onSelect: (id: StageId) => void
}) {
  return (
    <nav className="stage-tabs" aria-label="Stages">
      {STAGE_IDS.map((id) => {
        const on = id === selected
        return (
          <button
            type="button"
            key={id}
            className={`stage-tab is-${STAGE_META[id].path}${on ? ' is-selected' : ''}`}
            aria-current={on ? 'true' : undefined}
            onClick={() => onSelect(id)}
          >
            <span>{STAGE_LABEL[id]}</span>
            {STAGE_META[id].name}
          </button>
        )
      })}
    </nav>
  )
}
