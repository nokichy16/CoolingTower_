import type { TowerResults } from '../lib/model'
import { STAGE_META, type StageId } from '../lib/stages'
import {
  STAGE_IN,
  STAGE_OUT,
  STAGE_RESULTS,
  stageValues,
  type Link,
} from '../lib/stage-outputs'
import { fmt } from '../lib/format'
import { STAGE_LABEL } from './StagePanel'

/**
 * The values that come into a stage from earlier stages (top), or that it
 * sends on (bottom). Select a link to open that stage.
 */
export default function StageFlow({
  stage,
  direction,
  r,
  onSelect,
}: {
  stage: StageId
  direction: 'in' | 'out'
  r: TowerResults
  onSelect: (id: StageId) => void
}) {
  const links: Link[] = direction === 'in' ? STAGE_IN[stage] : STAGE_OUT[stage]
  const results = direction === 'out' ? STAGE_RESULTS[stage] : []
  if (links.length === 0 && results.length === 0) return null
  const values = stageValues(r)
  const show = (k: string) => {
    const v = values[k]
    return (
      <span className="sf-value" key={k}>
        {v.label} <strong>{Number.isFinite(v.value) ? fmt(v.value, v.digits) : '—'}</strong>
        <small>{v.unit}</small>
      </span>
    )
  }

  return (
    <div className={`stage-flow is-${direction}`}>
      <span className="sf-title">{direction === 'in' ? 'Comes in' : 'Goes out'}</span>
      <div className="sf-links">
        {links.map((link) => (
          <button
            type="button"
            key={link.stage}
            className="sf-link"
            onClick={() => onSelect(link.stage)}
            title={`Open stage ${STAGE_LABEL[link.stage]}`}
          >
            <span className="sf-stage">
              {direction === 'in' ? 'from' : 'to'} {STAGE_LABEL[link.stage]} {STAGE_META[link.stage].name}
            </span>
            <span className="sf-values">{link.keys.map(show)}</span>
          </button>
        ))}
        {results.length > 0 && (
          <div className="sf-link is-result">
            <span className="sf-stage">result</span>
            <span className="sf-values">{results.map(show)}</span>
          </div>
        )}
      </div>
    </div>
  )
}
