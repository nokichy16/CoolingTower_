import { useCallback, useMemo, useState } from 'react'
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
import { buildStageBlocks } from './lib/stage-values'
import type { StageId } from './lib/stages'
import KpiBar from './components/KpiBar'
import StageRail from './components/StageRail'
import StageWorkspace from './components/StageWorkspace'
import ValueTable from './components/ValueTable'

/** The stage where each warning is caused and can be fixed. */
const ISSUE_STAGE: Record<SolveIssue['code'], StageId> = {
  'flow-input-invalid': 'plume',
  'ruiz-pressure-extrapolation': 'droplets',
  'ruiz-collection-extrapolation': 'droplets',
  'recovery-temperature-limited': 'recovery',
  'no-condensation-depth': 'recovery',
  'cycles-invalid': 'recovery',
}

const STAGE_IDS: StageId[] = ['plume', 'drift', 'droplets', 'fan', 'recovery']

export default function App() {
  const [inputs, setInputs] = useState<TowerInputs>(DEFAULT_INPUTS)
  const [stage, setStage] = useState<StageId>('plume')
  const results = useMemo(() => solveTower(inputs), [inputs])
  const blocks = useMemo(() => buildStageBlocks(results), [results])

  // The comparison tables are shown on the eliminator and fan stages only.
  const showsComparison = stage === 'droplets' || stage === 'fan'
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
  const { rho, omega } = results.plume
  const massFlowAt = (velocity: number) =>
    dryAirMassFlowFromVelocity(rho, inputs.flowArea, velocity, omega)
  const setDryAirMassFlow = (dryAirMassFlow: number) =>
    patch({
      plumeVelocity: velocityFromDryAirMassFlow(dryAirMassFlow, rho, inputs.flowArea, omega),
    })

  const issuesByStage = useMemo(() => {
    const map: Record<StageId, SolveIssue[]> = {
      plume: [], drift: [], droplets: [], fan: [], recovery: [],
    }
    for (const issue of results.issues) map[ISSUE_STAGE[issue.code]].push(issue)
    return map
  }, [results.issues])
  const warningCounts = Object.fromEntries(
    STAGE_IDS.map((id) => [id, issuesByStage[id].length]),
  ) as Record<StageId, number>
  const firstWarningStage = STAGE_IDS.find((id) => warningCounts[id] > 0)
  const isDefault = inputs === DEFAULT_INPUTS

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <h1>Plume Water Recovery</h1>
          <span>Cooling-tower screening model</span>
        </div>
        <KpiBar r={results} selected={stage} onSelect={setStage} />
        <div className="topbar-actions">
          {firstWarningStage && (
            <button
              type="button"
              className="warn-chip"
              onClick={() => setStage(firstWarningStage)}
            >
              {results.issues.length} warning{results.issues.length > 1 ? 's' : ''}
            </button>
          )}
          <button
            type="button"
            className="reset"
            onClick={() => setInputs(DEFAULT_INPUTS)}
            disabled={isDefault}
          >
            Reset all
          </button>
        </div>
      </header>

      <div className="shell">
        <StageRail r={results} selected={stage} warnings={warningCounts} onSelect={setStage} />
        <div className="content">
        <StageWorkspace
          inputs={inputs}
          r={results}
          stage={stage}
          block={blocks.find((b) => b.id === stage) ?? blocks[0]}
          issues={issuesByStage[stage]}
          comparison={comparison}
          dryAirMassFlowMin={massFlowAt(1)}
          dryAirMassFlowMax={massFlowAt(100)}
          onChange={patch}
          onDryAirMassFlowChange={setDryAirMassFlow}
          onSelectEliminator={selectEliminator}
        />
        <details className="all-values">
          <summary>All calculated values, every stage</summary>
          <div className="all-values-grid">
            {blocks.map((b) => (
              <section className="card" key={b.id}>
                <h3 className="card-title">
                  {b.index} · {b.name}
                </h3>
                <ValueTable block={b} />
              </section>
            ))}
          </div>
        </details>
        </div>
      </div>
    </div>
  )
}
