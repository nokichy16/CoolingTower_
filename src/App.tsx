import { useMemo, useState } from 'react'
import { DEFAULT_INPUTS, solveTower, type TowerInputs } from './lib/model'
import { fmt } from './lib/format'
import type { StageId } from './lib/stages'
import Controls from './components/Controls'
import TowerExplorer from './components/TowerExplorer'
import ResultPanel from './components/ResultPanel'

export default function App() {
  const [inputs, setInputs] = useState<TowerInputs>(DEFAULT_INPUTS)
  const [selectedStage, setSelectedStage] = useState<StageId>('plume')
  const results = useMemo(() => solveTower(inputs), [inputs])

  const patch = (p: Partial<TowerInputs>) => setInputs((prev) => ({ ...prev, ...p }))
  const reset = () => setInputs(DEFAULT_INPUTS)
  const firstWarning = results.issues.find((issue) => issue.severity === 'warning')
  const statusLevel = firstWarning ? 'warning' : 'valid'
  const statusTitle = firstWarning
    ? firstWarning.title
    : 'Inputs within supported ranges'
  const statusDetail = firstWarning
    ? 'The result remains visible; review the warning below.'
    : 'Plume state, condensation and Ruiz checks pass.'

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <h1>Plume Water Recovery</h1>
          <span className="subtitle">
            Adjustable exhaust, droplet reduction and condensation
          </span>
        </div>
        <div className="status-summary" role="status" aria-live="polite">
          <div className="status-primary">
            <span>Estimated recovered water</span>
            <strong>
              {`${fmt(results.recovery.mDotRecovered, 2)} kg/s`}
            </strong>
          </div>
          <div className="status-stat">
            <span>Droplets removed</span>
            <strong>{fmt(results.droplets.reductionPct, 1)}%</strong>
          </div>
          <div className="status-stat">
            <span>Approx. cooling duty</span>
            <strong>{fmt(results.recovery.qDuty, 0)} kW</strong>
          </div>
          <div className={`status-state is-${statusLevel}`}>
            <i aria-hidden="true" />
            <div>
              <strong>{statusTitle}</strong>
              <small>{statusDetail}</small>
            </div>
          </div>
        </div>
      </header>

      <div className="page">
        <div className="workspace">
          <section className="panel visual-panel">
            <div className="panel-head">
              <h2>Plume-to-water process</h2>
              <span className="panel-sub">
                select a section to change its inputs
              </span>
            </div>
            <div className="panel-body">
              <TowerExplorer
                r={results}
                selected={selectedStage}
                onSelect={setSelectedStage}
              />
            </div>
          </section>
          <Controls
            inputs={inputs}
            results={results}
            selectedStage={selectedStage}
            onChange={patch}
            onReset={reset}
          />
        </div>

        <main className="main">
          <section className="panel">
            <div className="panel-head">
              <h2>Engineering output</h2>
              <span className="panel-sub">
                droplet reduction and vapour recovery
              </span>
            </div>
            <div className="panel-body">
              <ResultPanel r={results} />
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}
