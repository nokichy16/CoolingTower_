import { useMemo, useState } from 'react'
import { DEFAULT_INPUTS, solveTower, type TowerInputs } from './lib/model'
import { fmt } from './lib/format'
import type { StageId } from './lib/stages'
import Controls from './components/Controls'
import TowerExplorer from './components/TowerExplorer'
import ResultPanel from './components/ResultPanel'

export default function App() {
  const [inputs, setInputs] = useState<TowerInputs>(DEFAULT_INPUTS)
  const [selectedStage, setSelectedStage] = useState<StageId>('fill')
  const results = useMemo(() => solveTower(inputs), [inputs])

  const patch = (p: Partial<TowerInputs>) => setInputs((prev) => ({ ...prev, ...p }))
  const reset = () => setInputs(DEFAULT_INPUTS)
  const firstError = results.issues.find((issue) => issue.severity === 'error')
  const firstWarning = results.issues.find((issue) => issue.severity === 'warning')
  const recoveryWarning = results.valid && !results.condensed.feasible
  const statusLevel = firstError
    ? 'error'
    : firstWarning || recoveryWarning
      ? 'warning'
      : 'valid'
  const statusTitle = firstError
    ? firstError.title
    : recoveryWarning
      ? 'Recovery target needs attention'
      : firstWarning
        ? firstWarning.title
        : 'Valid operating point'
  const statusDetail = firstError
    ? 'Derived panels are dimmed until this is corrected.'
    : recoveryWarning
      ? `Set T₅ below the ${fmt(results.exhaust.t)} °C exhaust temperature.`
      : firstWarning
        ? 'The result is visible, but one empirical range is extrapolated.'
        : 'Physical guards and correlation ranges pass.'

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <h1>Data Center Cooling</h1>
          <span className="subtitle">Interactive heat-rejection and water-recovery explorer</span>
        </div>
        <div className="status-summary" role="status" aria-live="polite">
          <div className="status-primary">
            <span>Energy per kg recovered</span>
            <strong>
              {results.valid && results.condensed.feasible
                ? `e = ${fmt(results.condensed.e, 0)} kJ/kg`
                : 'e = —'}
            </strong>
          </div>
          <div className="status-stat">
            <span>Recovered water</span>
            <strong>{results.valid ? `${fmt(results.condensed.mDotCond, 2)} kg/s` : '—'}</strong>
          </div>
          <div className="status-stat">
            <span>Required static pressure</span>
            <strong>{results.valid ? `${fmt(results.fan.dpTotal, 0)} Pa` : '—'}</strong>
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

      <div className={`page${results.valid ? '' : ' is-invalid'}`}>
        {/* When there is no physical solution the stage values are arithmetic,
            not an operating point — dim them so they don't read as data. */}
        <div className="workspace">
          <section className="panel visual-panel">
            <div className="panel-head">
              <h2>Cooling-tower air path</h2>
              <span className="panel-sub">select a tower stage for its full state</span>
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
            selectedStage={selectedStage}
            onChange={patch}
            onReset={reset}
          />
        </div>

        <main className="main">
          <section className="panel">
            <div className="panel-head">
              <h2>Engineering output</h2>
              <span className="panel-sub">enthalpy, moisture and water balance</span>
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
