import { useCallback, useMemo, useState } from 'react'
import {
  compareEliminators,
  DEFAULT_INPUTS,
  dryAirMassFlowFromVelocity,
  solveTower,
  velocityFromDryAirMassFlow,
  type TowerInputs,
} from './lib/model'
import { SELECTIONS, type SelectionId } from './lib/eliminators'
import type { StageId } from './lib/stages'
import Controls from './components/Controls'
import TowerGraphic from './components/TowerGraphic'
import StageResults from './components/StageResults'
import FanTable from './components/FanTable'
import EliminatorPicker from './components/EliminatorPicker'

export default function App() {
  const [inputs, setInputs] = useState<TowerInputs>(DEFAULT_INPUTS)
  const [selectedStage, setSelectedStage] = useState<StageId>('plume')
  const results = useMemo(() => solveTower(inputs), [inputs])

  // The comparison tables are shown on the eliminator and fan stages only.
  const showsComparison = selectedStage === 'droplets' || selectedStage === 'fan'
  const comparison = useMemo(
    () => (showsComparison ? compareEliminators(inputs, SELECTIONS) : []),
    [inputs, showsComparison],
  )

  const patch = useCallback(
    (p: Partial<TowerInputs>) => setInputs((prev) => ({ ...prev, ...p })),
    [],
  )
  const selectEliminator = useCallback(
    (id: SelectionId) => patch({ eliminatorId: id }),
    [patch],
  )
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
            <div className="tower-explorer">
              <TowerGraphic
                r={results}
                selected={selectedStage}
                onSelect={setSelectedStage}
              />
            </div>
            {selectedStage === 'droplets' && (
              <div className="side-panel">
                <EliminatorPicker
                  inputs={inputs}
                  rows={comparison}
                  driftInlet={results.droplets.driftInlet}
                  onSelect={selectEliminator}
                />
              </div>
            )}
            {selectedStage === 'fan' && (
              <FanTable
                inputs={inputs}
                rows={comparison}
                onSelect={selectEliminator}
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
