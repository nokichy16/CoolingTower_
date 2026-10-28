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
import TowerExplorer from './components/TowerExplorer'
import StageResults from './components/StageResults'
import FanTable from './components/FanTable'
import EliminatorPicker from './components/EliminatorPicker'

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
            {selectedStage === 'droplets' && (
              <div className="side-panel">
                <EliminatorPicker
                  inputs={inputs}
                  onSelect={(id) => patch({ eliminatorId: id })}
                />
              </div>
            )}
            {selectedStage === 'fan' && (
              <FanTable
                inputs={inputs}
                onSelect={(id) => patch({ eliminatorId: id })}
              />
            )}
          </section>
          <Controls
            inputs={inputs}
            r={results}
            dryAirMassFlow={results.plume.airMassFlow}
            dryAirMassFlowMin={dryAirMassFlowAtVelocity(1)}
            dryAirMassFlowMax={dryAirMassFlowAtVelocity(100)}
            selectedStage={selectedStage}
            onChange={patch}
            onDryAirMassFlowChange={setDryAirMassFlow}
            onSelectStage={setSelectedStage}
            onReset={reset}
          />
        </div>

        <main className="main">
          <StageResults r={results} onSelect={setSelectedStage} />
        </main>
      </div>
    </div>
  )
}
