import { useState } from 'react'
import type { TowerResults } from '../lib/model'
import { buildStages, type StageId } from '../lib/stages'
import TowerGraphic from './TowerGraphic'

/**
 * The cooling-tower air path as an interactive cutaway. The illustrated tower
 * carries one key metric per stage; selecting a stage (on the tower or its
 * label) opens its full engineering readout beside it.
 */
export default function TowerExplorer({ r }: { r: TowerResults }) {
  const [selected, setSelected] = useState<StageId>('fill')
  const stages = buildStages(r)
  const stage = stages.find((s) => s.id === selected)!

  return (
    <div className="tower-explorer">
      <TowerGraphic r={r} selected={selected} onSelect={setSelected} />

      <div className="stage-detail" style={{ ['--accent' as string]: stage.accent }}>
        <div className="stage-detail-head">
          <span className="stage-detail-index">{stage.index}</span>
          <div>
            <h4>{stage.name}</h4>
            <div className="stage-tabs">
              {stages.map((s) => (
                <button
                  key={s.id}
                  className={`stage-tab ${s.id === selected ? 'is-active' : ''}`}
                  style={{ ['--accent' as string]: s.accent }}
                  onClick={() => setSelected(s.id)}
                  aria-label={`Show ${s.name}`}
                >
                  {s.index}
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="stage-detail-blurb">{stage.blurb}</p>

        <div className="metrics">
          {stage.metrics.map((m) => (
            <div className="metric" key={m.sym}>
              <span className="metric-sym">{m.sym}</span>
              <span className="metric-val">
                {m.value}
                <span className="metric-unit">{m.unit}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
