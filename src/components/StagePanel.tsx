import { lazy, Suspense, useState } from 'react'
import type { EliminatorComparisonRow, TowerInputs, TowerResults } from '../lib/model'
import type { SelectionId } from '../lib/eliminators'
import { groupOf, STAGE_META, type StageId } from '../lib/stages'
import Field from './Field'
import CustomPerformanceEditor from './CustomPerformanceEditor'
import EliminatorPicker from './EliminatorPicker'
import FanTable from './FanTable'

// The graphs pull in the charting library, so they load only when a stage
// that shows one is opened. The first screen (plume inputs) has no graph.
const DropletDistribution = lazy(() => import('./DropletDistribution'))
const EliminatorOutput = lazy(() => import('./EliminatorOutput'))
const EliminatorCount = lazy(() => import('./EliminatorCount'))
const FanChart = lazy(() => import('./FanChart'))
const PsychrometricChart = lazy(() => import('./PsychrometricChart'))

/** Short stage labels used on the toggles: the inlet has two parts. */
export const STAGE_LABEL: Record<StageId, string> = {
  plume: '1A',
  drift: '1B',
  droplets: '2',
  fan: '3',
  recovery: '4',
}

interface StagePanelProps {
  stage: StageId
  inputs: TowerInputs
  r: TowerResults
  /** Deferred copies for the graphs (they may lag one frame while dragging). */
  graphInputs: TowerInputs
  graphResults: TowerResults
  comparison: EliminatorComparisonRow[]
  dryAirMassFlowMin: number
  dryAirMassFlowMax: number
  onChange: (patch: Partial<TowerInputs>) => void
  onDryAirMassFlowChange: (value: number) => void
  onSelectEliminator: (id: SelectionId) => void
}

/** One stage: its heading, inputs, tables and graphs. */
export default function StagePanel({
  stage,
  inputs,
  r,
  graphInputs,
  graphResults,
  comparison,
  dryAirMassFlowMin,
  dryAirMassFlowMax,
  onChange,
  onDryAirMassFlowChange,
  onSelectEliminator,
}: StagePanelProps) {
  const meta = STAGE_META[stage]
  // Fan graph: every eliminator, or the selected one alone.
  const [fanShowAll, setFanShowAll] = useState(true)
  const group = groupOf(stage)
  const dryAirMassFlow = r.plume.airMassFlow
  const set =
    (key: keyof TowerInputs) =>
    (value: number) =>
      onChange({ [key]: value } as Partial<TowerInputs>)

  return (
    <section className={`controls stage-panel stage-${stage} is-${meta.path}`} id={`stage-${stage}`} aria-labelledby={`stage-title-${stage}`}>
      <div className="controls-head">
        <div>
          <span className="controls-kicker">
            Stage {STAGE_LABEL[stage]}
            {group.stages.length > 1 ? ` · ${group.name}` : ''} ·{' '}
            {meta.path === 'air' ? 'Air and vapour path' : 'Liquid drift path'}
          </span>
          <h2 id={`stage-title-${stage}`}>{meta.name}</h2>
        </div>
      </div>

      <div className="stage-input-panel">
        <Suspense fallback={<p className="stage-loading" role="status">Loading graphs…</p>}>
        {stage === 'plume' && (
          <div className="inlet-layout">
            <section className="input-group" aria-labelledby="group-plume">
            <h3 className="input-group-title" id="group-plume">
              Plume state
            </h3>
            <Field
              label="Plume temperature"
              sym="T₄"
              unit="°C"
              value={inputs.plumeTemperature}
              min={5}
              max={80}
              step={0.5}
              onChange={set('plumeTemperature')}
            />
            <Field
              label="Relative humidity"
              sym="RH₄"
              unit="%"
              value={inputs.plumeRh}
              min={5}
              max={100}
              step={1}
              digits={0}
              onChange={set('plumeRh')}
            />
            <Field
              label="Atmospheric pressure"
              sym="P"
              unit="kPa"
              value={inputs.pressure / 1000}
              min={80}
              max={105}
              step={0.1}
              onChange={(value) => onChange({ pressure: value * 1000 })}
            />
            </section>

            <section className="input-group" aria-labelledby="group-airflow">
            <h3 className="input-group-title" id="group-airflow">
              Airflow
            </h3>
            <Field
              label="Tower flow area"
              sym="A"
              unit="m²"
              value={inputs.flowArea}
              min={5}
              max={250}
              step={0.05}
              digits={2}
              onChange={set('flowArea')}
            />
            <Field
              label="Air velocity after fill"
              sym="u₄"
              unit="m/s"
              value={inputs.plumeVelocity}
              min={1}
              max={100}
              step={0.001}
              digits={3}
              onChange={set('plumeVelocity')}
            />
            <Field
              label="Dry-air mass flow"
              sym="ṁ_da"
              unit="kg/s"
              value={dryAirMassFlow}
              min={dryAirMassFlowMin}
              max={dryAirMassFlowMax}
              step={0.1}
              digits={1}
              onChange={onDryAirMassFlowChange}
            />
            </section>

          </div>
        )}

        {stage === 'drift' && (
          <DropletDistribution
            inputs={inputs}
            droplets={r.droplets}
            onChange={onChange}
          />
        )}

        {stage === 'droplets' && (
          <>
            <EliminatorOutput inputs={graphInputs} droplets={graphResults.droplets} />
            <EliminatorCount inputs={graphInputs} droplets={graphResults.droplets} />
            <div className="stage-table">
              <EliminatorPicker
                inputs={inputs}
                rows={comparison}
                driftInlet={r.droplets.driftInlet}
                onSelect={onSelectEliminator}
              />
            </div>
            {inputs.eliminatorId === 'custom' && (
              <CustomPerformanceEditor
                inputs={inputs}
                onChange={(next) => onChange({ customPerformance: next })}
              />
            )}
          </>
        )}

        {stage === 'fan' && (
          <>
            <FanChart r={graphResults} inputs={graphInputs} showAll={fanShowAll} />
            <div className="stage-table">
              <FanTable
                inputs={inputs}
                rows={comparison}
                showAll={fanShowAll}
                onShowAll={setFanShowAll}
                onSelect={(id) => {
                  onSelectEliminator(id)
                  setFanShowAll(false)
                }}
              />
            </div>
          </>
        )}

        {stage === 'recovery' && (
          <>
            <Field
              label="Cooling below dew point"
              sym="ΔT_dew"
              unit="°C"
              value={inputs.coolingBelowDewPoint}
              min={0}
              max={25}
              step={0.5}
              onChange={set('coolingBelowDewPoint')}
            />
            <Field
              label="Cycles of concentration"
              sym="CoC"
              unit=""
              value={inputs.cyclesOfConcentration}
              min={2}
              max={15}
              step={0.1}
              digits={1}
              onChange={set('cyclesOfConcentration')}
            />
            <div className="stage-graph">
              <PsychrometricChart r={graphResults} />
            </div>
          </>
        )}
        </Suspense>
      </div>
    </section>
  )
}
