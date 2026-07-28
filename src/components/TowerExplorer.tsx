import type { TowerResults } from '../lib/model'
import { buildStages, type Metric, type StageId } from '../lib/stages'
import TowerGraphic from './TowerGraphic'

function Tiles({
  metrics,
  className = '',
}: {
  metrics: Metric[]
  className?: string
}) {
  return (
    <div className={`metrics ${className}`.trim()}>
      {metrics.map((m) => (
        <div className="metric" key={m.label}>
          <span className="metric-label">{m.label}</span>
          <span className="metric-val">
            {m.value}
            <span className="metric-unit">{m.unit}</span>
          </span>
        </div>
      ))}
    </div>
  )
}

/** Interactive plume process plus an always-visible summary of all four steps. */
export default function TowerExplorer({
  r,
  selected,
  onSelect,
}: {
  r: TowerResults
  selected: StageId
  onSelect: (id: StageId) => void
}) {
  const stages = buildStages(r)

  return (
    <div className="tower-explorer">
      <TowerGraphic r={r} selected={selected} onSelect={onSelect} />

      <div className="stations">
        {stages.map((s) => (
          <section
            key={s.id}
            className="station"
            style={{ ['--accent' as string]: s.accent }}
          >
            <div className="station-head">
              <span className="station-index">{s.index}</span>
              <span className="station-name">{s.name}</span>
            </div>

            <Tiles metrics={s.primary} className="station-primary" />
            <Tiles metrics={s.supporting} className="station-supporting" />

            {s.details.length > 0 && (
              <details className="stage-details station-details">
                <summary>Details</summary>
                <div className="station-expand">
                  <Tiles metrics={s.details} className="station-detail-metrics" />
                </div>
              </details>
            )}
          </section>
        ))}
      </div>
    </div>
  )
}
