import type { CSSProperties } from 'react'
import type { TowerResults } from '../lib/model'
import { buildStages, type StageId } from '../lib/stages'
import TowerGraphic from './TowerGraphic'

interface ExplorerProps {
  r: TowerResults
  selected: StageId
  onSelect: (id: StageId) => void
}

/** Interactive cooling-tower process visual. */
export default function TowerExplorer({
  r,
  selected,
  onSelect,
}: ExplorerProps) {
  return (
    <div className="tower-explorer">
      <TowerGraphic r={r} selected={selected} onSelect={onSelect} />
    </div>
  )
}

/** Complete calculated output set displayed below the visual workbench. */
export function CalculatedOutputs({
  r,
  selected,
  onSelect,
}: ExplorerProps) {
  const stages = buildStages(r)

  return (
    <section className="all-outputs" aria-labelledby="outputs-title">
      <div className="output-section-head">
        <h2 id="outputs-title">Calculated outputs</h2>
        <span>Select a stage to change its inputs</span>
      </div>

      <div className="output-stage-grid">
        {stages.map((stage) => {
          const metrics = [
            ...stage.primary.map((metric) => ({ metric, tier: 'primary' })),
            ...stage.supporting.map((metric) => ({
              metric,
              tier: 'supporting',
            })),
            ...stage.details.map((metric) => ({ metric, tier: 'detail' })),
          ]

          return (
            <section
              className={`output-stage${
                selected === stage.id ? ' is-selected' : ''
              }`}
              key={stage.id}
              style={{ '--stage-accent': stage.accent } as CSSProperties}
            >
              <button
                type="button"
                className="output-stage-head"
                onClick={() => onSelect(stage.id)}
                aria-pressed={selected === stage.id}
              >
                <span className="output-stage-index">{stage.index}</span>
                <strong>{stage.name}</strong>
              </button>

              <div className="output-stage-metrics">
                {metrics.map(({ metric, tier }) => (
                  <button
                    type="button"
                    className={`output-metric is-${tier}`}
                    key={`${tier}-${metric.label}`}
                    onClick={() => onSelect(stage.id)}
                    aria-label={`${metric.label}. Select ${stage.name} inputs.`}
                  >
                    <span className="output-metric-label">{metric.label}</span>
                    <span className="output-metric-reading">
                      <strong>{metric.value}</strong>
                      {metric.unit && <small>{metric.unit}</small>}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </section>
  )
}
