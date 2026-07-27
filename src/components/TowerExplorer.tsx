import type { TowerResults } from '../lib/model'
import { buildStages, type Metric, type StageId } from '../lib/stages'
import TowerGraphic from './TowerGraphic'

function Tiles({ metrics }: { metrics: Metric[] }) {
  return (
    <div className="metrics">
      {metrics.map((m) => (
        <div className="metric" key={m.sym}>
          <span className="metric-sym">{m.sym}</span>
          <span className="metric-val">
            {m.value}
            <span className="metric-unit">{m.unit}</span>
          </span>
        </div>
      ))}
    </div>
  )
}

/** Interactive plume process plus an always-visible summary of all three steps. */
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

            {s.local.length > 0 && <Tiles metrics={s.local} />}

            <details className="stage-details station-details">
              <summary>State &amp; engineering</summary>
              <div className="station-expand">
                <p className="station-blurb">{s.blurb}</p>

                <h5 className="station-sub">State &amp; correlation values</h5>
                <Tiles metrics={s.state} />

                {s.details.length > 0 && (
                  <section className="station-engineering">
                    <h5 className="station-sub">Engineering details</h5>
                    <Tiles metrics={s.details} />
                  </section>
                )}
              </div>
            </details>
          </section>
        ))}
      </div>
    </div>
  )
}
