import { useMemo, useState } from 'react'
import {
  DEFAULT_INPUTS,
  dryAirMassFlowFromVelocity,
  solveTower,
  velocityFromDryAirMassFlow,
  type TowerInputs,
} from './lib/model'
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
  const dryAirMassFlowAtVelocity = (velocity: number) =>
    dryAirMassFlowFromVelocity(
      results.plume.rho,
      inputs.flowArea,
      velocity,
      results.plume.omega,
    )
  const setDryAirMassFlow = (dryAirMassFlow: number) =>
    patch({
      plumeVelocity: velocityFromDryAirMassFlow(
        dryAirMassFlow,
        results.plume.rho,
        inputs.flowArea,
        results.plume.omega,
      ),
    })
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
            droplets={results.droplets}
            dryAirMassFlow={results.plume.airMassFlow}
            dryAirMassFlowMin={dryAirMassFlowAtVelocity(1)}
            dryAirMassFlowMax={dryAirMassFlowAtVelocity(100)}
            selectedStage={selectedStage}
            onChange={patch}
            onDryAirMassFlowChange={setDryAirMassFlow}
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
              <h2>Process chart</h2>
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
