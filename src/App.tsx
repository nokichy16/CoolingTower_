import { useMemo, useState } from 'react'
import { DEFAULT_INPUTS, solveTower, type TowerInputs } from './lib/model'
import type { StageId } from './lib/stages'
import Controls from './components/Controls'
import TowerExplorer, {
  CalculatedOutputs,
} from './components/TowerExplorer'
import ResultPanel from './components/ResultPanel'

export default function App() {
  const [inputs, setInputs] = useState<TowerInputs>(DEFAULT_INPUTS)
  const [selectedStage, setSelectedStage] = useState<StageId>('plume')
  const results = useMemo(() => solveTower(inputs), [inputs])

  const patch = (p: Partial<TowerInputs>) => setInputs((prev) => ({ ...prev, ...p }))
  const reset = () => setInputs(DEFAULT_INPUTS)
  const visibleIssues = results.issues.filter(
    (issue) => !issue.code.startsWith('ruiz-'),
  )
  const firstWarning = visibleIssues.find((issue) => issue.severity === 'warning')

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <h1>Plume Water Recovery</h1>
        </div>
        {firstWarning && (
          <div className="header-warning" role="alert">
            <strong>{firstWarning.title}</strong>
            <span>{firstWarning.message}</span>
          </div>
        )}
      </header>

      <div className="page">
        <div className="workspace">
          <section
            className="visual-workspace"
            aria-label="Cooling-tower process"
          >
            <TowerExplorer
              r={results}
              selected={selectedStage}
              onSelect={setSelectedStage}
            />
          </section>
          <Controls
            inputs={inputs}
            selectedStage={selectedStage}
            onChange={patch}
            onReset={reset}
          />
          <CalculatedOutputs
            r={results}
            selected={selectedStage}
            onSelect={setSelectedStage}
          />
        </div>

        <main className="main">
          <section className="panel charts-panel">
            <div className="panel-head">
              <h2>Process charts</h2>
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
