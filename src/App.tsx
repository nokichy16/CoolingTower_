import { useCallback, useDeferredValue, useMemo, useState } from 'react'
import {
  compareEliminators,
  DEFAULT_INPUTS,
  dryAirMassFlowFromVelocity,
  solveTower,
  velocityFromDryAirMassFlow,
  type SolveIssue,
  type TowerInputs,
} from './lib/model'
import { SELECTIONS, type SelectionId } from './lib/eliminators'
import type { StageId } from './lib/stages'
import StagePanel from './components/StagePanel'
import StageList from './components/StageList'
import TowerGraphic from './components/TowerGraphic'
import StageResults from './components/StageResults'

/** The stage where each warning is caused and can be fixed. */
const ISSUE_STAGE: Record<SolveIssue['code'], StageId> = {
  'flow-input-invalid': 'plume',
  'ruiz-pressure-extrapolation': 'droplets',
  'ruiz-collection-extrapolation': 'droplets',
  'recovery-temperature-limited': 'recovery',
  'no-condensation-depth': 'recovery',
  'cycles-invalid': 'recovery',
}

export default function App() {
  const [inputs, setInputs] = useState<TowerInputs>(DEFAULT_INPUTS)
  const [selectedStage, setSelectedStage] = useState<StageId>('plume')
  const results = useMemo(() => solveTower(inputs), [inputs])

  // The graphs and the comparison tables (seven extra solves) use deferred
  // copies: React draws the sliders and numbers first, then the graphs when
  // the browser is free, so dragging a slider stays smooth.
  const graphInputs = useDeferredValue(inputs)
  const graphResults = useDeferredValue(results)
  const comparison = useMemo(() => compareEliminators(graphInputs, SELECTIONS), [graphInputs])

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
    dryAirMassFlowFromVelocity(results.plume.rho, inputs.flowArea, velocity, results.plume.omega)
  const setDryAirMassFlow = (dryAirMassFlow: number) =>
    patch({
      plumeVelocity: velocityFromDryAirMassFlow(
        dryAirMassFlow,
        results.plume.rho,
        inputs.flowArea,
        results.plume.omega,
      ),
    })
  const visibleIssues = results.issues.filter((issue) => !issue.code.startsWith('ruiz-'))
  const firstWarning = visibleIssues.find((issue) => issue.severity === 'warning')

  const warningCounts = useMemo(() => {
    const counts: Record<StageId, number> = { plume: 0, drift: 0, droplets: 0, fan: 0, recovery: 0 }
    for (const issue of results.issues) counts[ISSUE_STAGE[issue.code]] += 1
    return counts
  }, [results.issues])

  // One stage is open at a time. When the stage area is scrolled away,
  // opening a stage brings its top back into view.
  const goTo = useCallback((id: StageId) => {
    setSelectedStage(id)
    const area = document.getElementById('stage-area')
    if (area && area.getBoundingClientRect().top < 0) {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      area.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
    }
  }, [])

  return (
    <div className="app side-layout">
      <aside className="sheet" aria-label="Cooling-tower process">
        <div className="sheet-head">
          <div className="brand">
            <h1>Plume Water Recovery</h1>
          </div>
          <button type="button" className="reset" onClick={reset}>
            Reset all
          </button>
        </div>
        {firstWarning && (
          <div className="header-warning" role="alert">
            <strong>{firstWarning.title}</strong>
            <span>{firstWarning.message}</span>
          </div>
        )}
        <div className="tower-explorer">
          <TowerGraphic r={results} selected={selectedStage} onSelect={goTo} />
        </div>
        <StageList r={results} selected={selectedStage} warnings={warningCounts} />
      </aside>

      <div className="content">
        <div className="stage-stack" id="stage-area">
          {[selectedStage].map((id) => (
            <StagePanel
              key={id}
              stage={id}
              inputs={inputs}
              r={results}
              graphInputs={graphInputs}
              graphResults={graphResults}
              comparison={comparison}
              dryAirMassFlowMin={dryAirMassFlowAtVelocity(1)}
              dryAirMassFlowMax={dryAirMassFlowAtVelocity(100)}
              onChange={patch}
              onDryAirMassFlowChange={setDryAirMassFlow}
              onSelectEliminator={selectEliminator}
              onSelectStage={goTo}
            />
          ))}
        </div>
        <main className="main">
          <StageResults r={results} onSelect={goTo} />
        </main>
      </div>
    </div>
  )
}
