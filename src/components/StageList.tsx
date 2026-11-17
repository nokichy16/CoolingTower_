import { lazy, Suspense } from 'react'
import type { TowerResults } from '../lib/model'
import { STAGE_IDS, STAGE_META, type StageId } from '../lib/stages'
import { STAGE_KEY_OUTPUTS, stageSubtitle, stageValues } from '../lib/stage-outputs'
import ChangeValue from './ChangeValue'
import { STAGE_LABEL } from './StagePanel'

// KaTeX loads after the first paint; the plain label shows until then.
const MathLabel = lazy(() => import('./MathLabel'))

/**
 * Every stage's key outputs, always in view under the drawing. Numbers show
 * how much they changed after an input moved. The open stage is marked.
 */
export default function StageList({
  r,
  selected,
  warnings,
}: {
  r: TowerResults
  selected: StageId
  warnings: Record<StageId, number>
}) {
  const values = stageValues(r)
  return (
    <section className="stage-list" aria-label="Key outputs of every stage">
      {STAGE_IDS.map((id) => {
        const meta = STAGE_META[id]
        const on = id === selected
        const sub = stageSubtitle(id, r)
        return (
          <div
            key={id}
            className={`sl-row is-${meta.path}${on ? ' is-selected' : ''}`}
            aria-current={on ? 'true' : undefined}
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
                    <span className="sl-label">
                      {v.tex ? (
                        <Suspense fallback={v.label}>
                          <MathLabel tex={v.tex} text={v.label} />
                        </Suspense>
                      ) : (
                        v.label
                      )}
                    </span>
                    <ChangeValue value={v.value} digits={v.digits} unit={v.unit} />
                  </span>
                )
              })}
            </span>
          </div>
        )
      })}
    </section>
  )
}
