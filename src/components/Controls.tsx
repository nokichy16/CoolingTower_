import { lazy, Suspense } from 'react'
import type { TowerInputs, TowerResults } from '../lib/model'
import { groupOf, STAGE_GROUPS, STAGE_META, type StageId } from '../lib/stages'
import Field from './Field'
import CustomPerformanceEditor from './CustomPerformanceEditor'

// The graphs pull in the charting library, so they load only when a stage
// that shows one is opened. The first screen (plume inputs) has no graph.
const DropletDistribution = lazy(() => import('./DropletDistribution'))
const EliminatorOutput = lazy(() => import('./EliminatorOutput'))
const EliminatorCount = lazy(() => import('./EliminatorCount'))
const FanChart = lazy(() => import('./FanChart'))
const PsychrometricChart = lazy(() => import('./PsychrometricChart'))

interface ControlsProps {
  inputs: TowerInputs
  r: TowerResults
  dryAirMassFlow: number
  dryAirMassFlowMin: number
  dryAirMassFlowMax: number
  selectedStage: StageId
  onChange: (patch: Partial<TowerInputs>) => void
  onDryAirMassFlowChange: (value: number) => void
  onSelectStage: (id: StageId) => void
  onReset: () => void
}

export default function Controls({
  inputs,
  r,
  dryAirMassFlow,
  dryAirMassFlowMin,
  dryAirMassFlowMax,
  selectedStage,
  onChange,
  onDryAirMassFlowChange,
  onSelectStage,
  onReset,
}: ControlsProps) {
  const droplets = r.droplets
  const stage = STAGE_META[selectedStage]
  const group = groupOf(selectedStage)
  const set =
    (key: keyof TowerInputs) =>
    (value: number) =>
      onChange({ [key]: value } as Partial<TowerInputs>)

  return (
    <aside className="controls">
      <div className="controls-head">
        <div>
          <span className="controls-kicker">
            Stage {stage.index}
            {group.stages.length > 1 ? ` · ${group.name}` : ''} ·{' '}
            {stage.path === 'air' ? 'Air and vapour path' : 'Liquid drift path'}
          </span>
          <h2>{stage.name}</h2>
        </div>
        <button type="button" className="reset" onClick={onReset}>
          Reset all
        </button>
      </div>

      <nav className="stage-tabs" aria-label="Stages">
        {STAGE_GROUPS.map((g) => {
          const on = g.key === group.key
          return (
            <button
              type="button"
              key={g.key}
              className={`stage-tab is-${g.path}${on ? ' is-selected' : ''}`}
              aria-pressed={on}
              onClick={() => {
                if (!on) onSelectStage(g.stages[0])
              }}
            >
              <span>{g.index}</span>
              {g.name}
            </button>
          )
        })}
      </nav>
      {group.stages.length > 1 && (
        <nav className="stage-subtabs" aria-label={`${group.name} sections`}>
          {group.stages.map((id) => (
            <button
              type="button"
              key={id}
              className={`stage-subtab is-${STAGE_META[id].path}${
                id === selectedStage ? ' is-selected' : ''
              }`}
              aria-pressed={id === selectedStage}
              onClick={() => onSelectStage(id)}
            >
              {STAGE_META[id].name}
            </button>
          ))}
        </nav>
      )}

      <div className="stage-input-panel" key={selectedStage}>
        <Suspense fallback={<p className="stage-loading" role="status">Loading graphs…</p>}>
        {selectedStage === 'plume' && (
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

        {selectedStage === 'drift' && (
          <DropletDistribution
            inputs={inputs}
            droplets={droplets}
            onChange={onChange}
          />
        )}

        {selectedStage === 'droplets' && (
          <>
            {inputs.eliminatorId === 'custom' && (
              <CustomPerformanceEditor
                inputs={inputs}
                onChange={(next) => onChange({ customPerformance: next })}
              />
            )}
            <EliminatorOutput inputs={inputs} droplets={droplets} />
            <EliminatorCount inputs={inputs} droplets={droplets} />
          </>
        )}

        {selectedStage === 'fan' && (
          <FanChart r={r} inputs={inputs} />
        )}

        {selectedStage === 'recovery' && (
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
              <PsychrometricChart r={r} />
            </div>
          </>
        )}
        </Suspense>
      </div>
    </aside>
  )
}
