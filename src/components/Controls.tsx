import type { TowerInputs, TowerResults } from '../lib/model'
import type { StageId } from '../lib/stages'
import { ELIMINATORS, type EliminatorId } from '../lib/eliminators'
import Field from './Field'
import DropletDistribution from './DropletDistribution'
import EliminatorOutput from './EliminatorOutput'
import FanChart from './FanChart'
import PsychrometricChart from './PsychrometricChart'

const ELIMINATOR_DESCRIPTIONS: Record<EliminatorId, string> = {
  A: 'Vane · 50 mm gap · 150 mm height · 54.3° direction change',
  B: 'Vane · 32 mm gap · 150 mm height · 89.4° direction change',
  C: 'Vane · 25 mm gap · 150 mm height · 36.3° direction change',
  D: 'Honeycomb · 15 mm hydraulic diameter · 165 mm height',
  E: 'Wire mesh · 34.79 mm characteristic length · 165 mm height · 45° direction change',
  F: 'Wire mesh · 34.79 mm characteristic length · 165 mm height · 135° direction change',
}

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

const STAGE_META: Record<
  StageId,
  {
    index: string
    name: string
    path: 'air' | 'liquid'
  }
> = {
  plume: { index: '1', name: 'Plume & airflow', path: 'air' },
  drift: { index: '1', name: 'Drift droplets', path: 'liquid' },
  droplets: { index: '2', name: 'Drift eliminator', path: 'liquid' },
  fan: { index: '3', name: 'Fan', path: 'air' },
  recovery: { index: '4', name: 'Condensation recovery', path: 'air' },
}

/** Top-level stages; the inlet has two sub-stages. */
const STAGE_GROUPS: {
  key: string
  index: string
  name: string
  path: 'air' | 'liquid'
  stages: StageId[]
}[] = [
  { key: 'inlet', index: '1', name: 'Inlet', path: 'air', stages: ['plume', 'drift'] },
  { key: 'droplets', index: '2', name: 'Drift eliminator', path: 'liquid', stages: ['droplets'] },
  { key: 'fan', index: '3', name: 'Fan', path: 'air', stages: ['fan'] },
  { key: 'recovery', index: '4', name: 'Condensation recovery', path: 'air', stages: ['recovery'] },
]

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
  const group =
    STAGE_GROUPS.find((g) => g.stages.includes(selectedStage)) ?? STAGE_GROUPS[0]
  const selectedEliminator = ELIMINATORS[inputs.eliminatorId]
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
        <button className="reset" onClick={onReset}>
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
            <fieldset className="eliminator-picker">
              <legend className="field-label">
                Tested eliminator <span className="field-sym">A–F</span>
              </legend>
              <p className="eliminator-picker-note">
                Select a design. The letters identify tested Ruiz
                configurations, not performance rankings.
              </p>
              <div className="eliminator-picker-list" role="radiogroup">
                {Object.values(ELIMINATORS).map((spec) => {
                  const on = spec.id === selectedEliminator.id
                  return (
                    <button
                      type="button"
                      role="radio"
                      aria-checked={on}
                      className={on ? 'is-selected' : ''}
                      key={spec.id}
                      onClick={() => onChange({ eliminatorId: spec.id as EliminatorId })}
                    >
                      <span className="picker-dot" aria-hidden="true" />
                      <strong>{spec.id}</strong>
                      <span>{ELIMINATOR_DESCRIPTIONS[spec.id]}</span>
                    </button>
                  )
                })}
              </div>
            </fieldset>

            <EliminatorOutput inputs={inputs} droplets={droplets} />

          </>
        )}

        {selectedStage === 'fan' && (
          <>
            <div className="no-stage-inputs">
              No independent inputs. Velocity comes from stage 1 (inlet); the
              eliminator comes from stage 2.
            </div>
            <FanChart
              r={r}
              onSelect={(id) => onChange({ eliminatorId: id })}
            />
          </>
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
      </div>
    </aside>
  )
}
