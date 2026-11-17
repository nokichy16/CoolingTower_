import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
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
import StagePanel from './components/StagePanel'
import StageToggles, { STAGE_IDS } from './components/StageToggles'
import TitleBlock from './components/TitleBlock'
import TowerGraphic from './components/TowerGraphic'
import StageResults from './components/StageResults'

/** Desktop shows every stage on one page; narrow screens show one at a time. */
const DESKTOP = '(min-width: 921px)'

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const update = () => setMatches(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [query])
  return matches
}

export default function App() {
  const [inputs, setInputs] = useState<TowerInputs>(DEFAULT_INPUTS)
  const [selectedStage, setSelectedStage] = useState<StageId>('plume')
  const results = useMemo(() => solveTower(inputs), [inputs])
  const isDesktop = useMediaQuery(DESKTOP)

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

  // Desktop: the stage in the middle of the screen is the current one, and
  // selecting a stage scrolls to it. Phone: selecting a stage switches to it.
  const scrollTarget = useRef<StageId | null>(null)
  useEffect(() => {
    if (!isDesktop) return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const id = entry.target.id.replace('stage-', '') as StageId
          // While a requested scroll runs, ignore the stages it passes.
          if (scrollTarget.current && scrollTarget.current !== id) continue
          scrollTarget.current = null
          setSelectedStage(id)
        }
      },
      { rootMargin: '-35% 0px -60% 0px' },
    )
    for (const id of STAGE_IDS) {
      const el = document.getElementById(`stage-${id}`)
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [isDesktop])

  const goTo = useCallback(
    (id: StageId) => {
      setSelectedStage(id)
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const behavior: ScrollBehavior = reduce ? 'auto' : 'smooth'
      if (!isDesktop) {
        document.getElementById('stage-area')?.scrollIntoView({ behavior, block: 'start' })
        return
      }
      scrollTarget.current = id
      document.getElementById(`stage-${id}`)?.scrollIntoView({ behavior, block: 'start' })
      // Stop ignoring the observer if the scroll is cut short.
      window.setTimeout(() => {
        if (scrollTarget.current === id) scrollTarget.current = null
      }, 1500)
    },
    [isDesktop],
  )

  const shownStages = isDesktop ? STAGE_IDS : [selectedStage]

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <h1>Plume Water Recovery</h1>
        </div>
        <TitleBlock r={results} onSelect={goTo} />
        {firstWarning && (
          <div className="header-warning" role="alert">
            <strong>{firstWarning.title}</strong>
            <span>{firstWarning.message}</span>
          </div>
        )}
      </header>

      <div className="page">
        <div className="workspace">
          <section className="visual-workspace" aria-label="Cooling-tower process">
            <div className="tower-explorer">
              <TowerGraphic r={results} selected={selectedStage} onSelect={goTo} />
            </div>
            <div className="nav-row">
              <StageToggles selected={selectedStage} onSelect={goTo} />
              <button type="button" className="reset" onClick={reset}>
                Reset all
              </button>
            </div>
          </section>

          <div className="stage-stack" id="stage-area">
            {shownStages.map((id) => (
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
              />
            ))}
          </div>
        </div>

        <main className="main">
          <StageResults r={results} onSelect={goTo} />
        </main>
      </div>
    </div>
  )
}
