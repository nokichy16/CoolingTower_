import { useMemo, useState } from 'react'
import { DEFAULT_INPUTS, solveTower, type TowerInputs } from './lib/model'
import { fmt } from './lib/format'
import Controls from './components/Controls'
import TowerExplorer from './components/TowerExplorer'
import ResultPanel from './components/ResultPanel'
import DataCenterVisual from './components/DataCenterVisual'

export default function App() {
  const [inputs, setInputs] = useState<TowerInputs>(DEFAULT_INPUTS)
  const results = useMemo(() => solveTower(inputs), [inputs])

  const patch = (p: Partial<TowerInputs>) => setInputs((prev) => ({ ...prev, ...p }))
  const reset = () => setInputs(DEFAULT_INPUTS)

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <h1>Data Center Cooling</h1>
          <span className="subtitle">Interactive heat-rejection and water-recovery explorer</span>
        </div>
        <div className="topline">
          <div className="topstat">
            <span>Thermal load</span>
            <b>{fmt(results.qReject / 1000)} MW</b>
          </div>
          <div className="topstat">
            <span>Recovered water</span>
            <b>{fmt(results.condensed.mDotCond, 2)} kg/s</b>
          </div>
          <div className="topstat">
            <span>Tower fan</span>
            <b>{fmt(results.fan.power)} kW</b>
          </div>
        </div>
      </header>

      <div className="layout">
        <Controls inputs={inputs} onChange={patch} onReset={reset} />
        <main className="main">
          <section className="panel overview-panel">
            <div className="panel-head">
              <h2>Facility cooling overview</h2>
              <span className="panel-sub">every label responds to the scenario inputs</span>
            </div>
            <div className="panel-body">
              <DataCenterVisual r={results} />
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <h2>Cooling-tower air path</h2>
              <span className="panel-sub">click a stage on the tower to inspect it</span>
            </div>
            <div className="panel-body">
              <TowerExplorer r={results} />
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <h2>Condensed state &amp; recovery</h2>
              <span className="panel-sub">the headline result</span>
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
