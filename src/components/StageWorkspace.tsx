import { lazy, Suspense } from 'react'
import type {
  EliminatorComparisonRow,
  SolveIssue,
  TowerInputs,
  TowerResults,
} from '../lib/model'
import type { SelectionId } from '../lib/eliminators'
import type { StageBlock } from '../lib/stage-values'
import { groupOf, STAGE_META, type StageId } from '../lib/stages'
import Field from './Field'
import CustomPerformanceEditor from './CustomPerformanceEditor'
import EliminatorPicker from './EliminatorPicker'
import FanTable from './FanTable'
import ValueTable from './ValueTable'

// The graphs pull in the charting library, so they load only when a stage
// that shows one is opened. The first screen (plume inputs) has no graph.
const DropletDistribution = lazy(() => import('./DropletDistribution'))
const EliminatorOutput = lazy(() => import('./EliminatorOutput'))
const EliminatorCount = lazy(() => import('./EliminatorCount'))
const FanChart = lazy(() => import('./FanChart'))
const PsychrometricChart = lazy(() => import('./PsychrometricChart'))

interface StageWorkspaceProps {
  inputs: TowerInputs
  r: TowerResults
  stage: StageId
  label: string
  block: StageBlock
  issues: SolveIssue[]
  comparison: EliminatorComparisonRow[]
  /** Deferred copies for the graphs and tables (may lag one frame). */
  graphInputs: TowerInputs
  graphResults: TowerResults
  dryAirMassFlowMin: number
  dryAirMassFlowMax: number
  onChange: (patch: Partial<TowerInputs>) => void
  onDryAirMassFlowChange: (value: number) => void
  onSelectEliminator: (id: SelectionId) => void
}

/** Inputs, graphs and calculated values for one stage. */
export default function StageWorkspace({
  inputs,
  r,
  stage,
  label,
  block,
  issues,
  comparison,
  graphInputs,
  graphResults,
  dryAirMassFlowMin,
  dryAirMassFlowMax,
  onChange,
  onDryAirMassFlowChange,
  onSelectEliminator,
}: StageWorkspaceProps) {
  const meta = STAGE_META[stage]
  const group = groupOf(stage)
  const set = (key: keyof TowerInputs) => (value: number) =>
    onChange({ [key]: value } as Partial<TowerInputs>)

  const values = (
    <section className="card" aria-labelledby={`values-${stage}`}>
      <h3 className="card-title" id={`values-${stage}`}>
        Calculated values
      </h3>
      <ValueTable block={block} />
    </section>
  )

  return (
    <section
      className={`stage is-${meta.path}`}
      id={`stage-${stage}`}
      aria-labelledby={`stage-title-${stage}`}
    >
      <header className="stage-head">
        <span className="stage-number" aria-hidden="true">{label}</span>
        <div>
          <span className="stage-kicker">
            Stage {meta.index}
            {group.stages.length > 1 ? ` · ${group.name}` : ''} ·{' '}
            {meta.path === 'air' ? 'Air and vapour path' : 'Liquid drift path'}
          </span>
          <h2 id={`stage-title-${stage}`}>{meta.name}</h2>
        </div>
      </header>

      {issues.length > 0 && (
        <ul className="stage-issues" role="status">
          {issues.map((issue) => (
            <li key={issue.title}>
              <strong>{issue.title}</strong>
              <span>{issue.message}</span>
            </li>
          ))}
        </ul>
      )}

      <Suspense fallback={<p className="stage-loading" role="status">Loading graphs…</p>}>
        {stage === 'plume' && (
          <div className="stage-grid">
            <div className="stage-col">
              <section className="card" aria-labelledby="group-plume">
                <h3 className="card-title" id="group-plume">Plume state</h3>
                <Field label="Plume temperature" sym="T₄" unit="°C" value={inputs.plumeTemperature} min={5} max={80} step={0.5} onChange={set('plumeTemperature')} />
                <Field label="Relative humidity" sym="RH₄" unit="%" value={inputs.plumeRh} min={5} max={100} step={1} digits={0} onChange={set('plumeRh')} />
                <Field label="Atmospheric pressure" sym="P" unit="kPa" value={inputs.pressure / 1000} min={80} max={105} step={0.1} onChange={(value) => onChange({ pressure: value * 1000 })} />
              </section>
              <section className="card" aria-labelledby="group-airflow">
                <h3 className="card-title" id="group-airflow">Airflow</h3>
                <Field label="Tower flow area" sym="A" unit="m²" value={inputs.flowArea} min={5} max={250} step={0.05} digits={2} onChange={set('flowArea')} />
                <Field label="Air velocity after fill" sym="u₄" unit="m/s" value={inputs.plumeVelocity} min={1} max={100} step={0.001} digits={3} onChange={set('plumeVelocity')} />
                <Field label="Dry-air mass flow" sym="ṁ_da" unit="kg/s" value={r.plume.airMassFlow} min={dryAirMassFlowMin} max={dryAirMassFlowMax} step={0.1} digits={1} onChange={onDryAirMassFlowChange} />
              </section>
            </div>
            <div className="stage-col">{values}</div>
          </div>
        )}

        {stage === 'drift' && (
          <>
            <div className="card">
              <DropletDistribution inputs={inputs} droplets={r.droplets} onChange={onChange} />
            </div>
            {values}
          </>
        )}

        {stage === 'droplets' && (
          <>
            <div className="stage-grid">
              <div className="stage-col">
                <div className="card">
                  <EliminatorPicker
                    inputs={inputs}
                    rows={comparison}
                    driftInlet={r.droplets.driftInlet}
                    onSelect={onSelectEliminator}
                  />
                </div>
                {inputs.eliminatorId === 'custom' && (
                  <div className="card">
                    <CustomPerformanceEditor
                      inputs={inputs}
                      onChange={(next) => onChange({ customPerformance: next })}
                    />
                  </div>
                )}
              </div>
              <div className="stage-col">
                <div className="card">
                  <EliminatorOutput inputs={graphInputs} droplets={graphResults.droplets} />
                </div>
                <div className="card">
                  <EliminatorCount inputs={graphInputs} droplets={graphResults.droplets} />
                </div>
              </div>
            </div>
            {values}
          </>
        )}

        {stage === 'fan' && (
          <>
            <div className="stage-grid">
              <div className="stage-col">
                <div className="card">
                  <FanTable inputs={inputs} rows={comparison} onSelect={onSelectEliminator} />
                </div>
                {values}
              </div>
              <div className="stage-col">
                <div className="card">
                  <FanChart r={graphResults} inputs={graphInputs} />
                </div>
              </div>
            </div>
          </>
        )}

        {stage === 'recovery' && (
          <>
            <div className="stage-grid">
              <div className="stage-col">
                <section className="card" aria-labelledby="group-recovery">
                  <h3 className="card-title" id="group-recovery">Recovery inputs</h3>
                  <Field label="Cooling below dew point" sym="ΔT_dew" unit="°C" value={inputs.coolingBelowDewPoint} min={0} max={25} step={0.5} onChange={set('coolingBelowDewPoint')} />
                  <Field label="Cycles of concentration" sym="CoC" unit="" value={inputs.cyclesOfConcentration} min={2} max={15} step={0.1} digits={1} onChange={set('cyclesOfConcentration')} />
                </section>
                {values}
              </div>
              <div className="stage-col">
                <div className="card">
                  <PsychrometricChart r={graphResults} />
                </div>
              </div>
            </div>
          </>
        )}
      </Suspense>
    </section>
  )
}
