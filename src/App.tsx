import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
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
import { STAGE_META, type StageId } from './lib/stages'
import TitleBlock from './components/TitleBlock'
import TowerSection from './components/TowerSection'
import StageWorkspace from './components/StageWorkspace'

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
const STAGE_LABEL: Record<StageId, string> = {
  plume: '1A',
  drift: '1B',
  droplets: '2',
  fan: '3',
  recovery: '4',
}

export default function App() {
  const [inputs, setInputs] = useState<TowerInputs>(DEFAULT_INPUTS)
  const [stage, setStage] = useState<StageId>('plume')
  const results = useMemo(() => solveTower(inputs), [inputs])
  const blocks = useMemo(() => buildStageBlocks(results), [results])

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

  // All stages are on one page. The stage in the middle of the screen is the
  // current one; selecting a stage scrolls to it.
  const scrollTarget = useRef<StageId | null>(null)
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const id = entry.target.id.replace('stage-', '') as StageId
          // While a requested scroll runs, ignore the stages it passes.
          if (scrollTarget.current && scrollTarget.current !== id) continue
          scrollTarget.current = null
          setStage(id)
        }
      },
      { rootMargin: '-35% 0px -60% 0px' },
    )
    for (const id of STAGE_IDS) {
      const el = document.getElementById(`stage-${id}`)
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [])
  const goTo = useCallback((id: StageId) => {
    setStage(id)
    scrollTarget.current = id
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    document
      .getElementById(`stage-${id}`)
      ?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
    // Stop ignoring the observer if the scroll is cut short.
    window.setTimeout(() => {
      if (scrollTarget.current === id) scrollTarget.current = null
    }, 1500)
  }, [])

  return (
    <div className="app">
      <aside className="sheet">
        <header className="sheet-head">
          <div className="brand">
            <h1>Plume Water Recovery</h1>
            <span>Cooling-tower section · screening model</span>
          </div>
          <div className="sheet-actions">
            {firstWarningStage && (
              <button type="button" className="warn-chip" onClick={() => goTo(firstWarningStage)}>
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
        <TowerSection r={results} selected={stage} warnings={warningCounts} onSelect={goTo} />
        <TitleBlock r={results} selected={stage} onSelect={goTo} />
      </aside>

      <main className="content">
        <nav className="stage-nav" aria-label="Stages">
          {STAGE_IDS.map((id) => (
            <button
              type="button"
              key={id}
              className={`stage-nav-item${id === stage ? ' is-selected' : ''}`}
              aria-current={id === stage ? 'location' : undefined}
              onClick={() => goTo(id)}
            >
              <span>{STAGE_LABEL[id]}</span>
              {STAGE_META[id].name}
            </button>
          ))}
        </nav>
        {STAGE_IDS.map((id) => (
          <StageWorkspace
            key={id}
            inputs={inputs}
            r={results}
            stage={id}
            label={STAGE_LABEL[id]}
            block={blocks.find((b) => b.id === id) ?? blocks[0]}
            issues={issuesByStage[id]}
            comparison={comparison}
            graphInputs={graphInputs}
            graphResults={graphResults}
            dryAirMassFlowMin={massFlowAt(1)}
            dryAirMassFlowMax={massFlowAt(100)}
            onChange={patch}
            onDryAirMassFlowChange={setDryAirMassFlow}
            onSelectEliminator={selectEliminator}
          />
        ))}
      </main>
    </div>
  )
}
