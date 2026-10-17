import type { TowerInputs } from '../lib/model'
import type { StageId } from '../lib/stages'
import { ELIMINATORS, type EliminatorId } from '../lib/eliminators'
import Field from './Field'
import DropletDistribution from './DropletDistribution'

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
  dryAirMassFlow: number
  dryAirMassFlowMin: number
  dryAirMassFlowMax: number
  selectedStage: StageId
  onChange: (patch: Partial<TowerInputs>) => void
  onDryAirMassFlowChange: (value: number) => void
  onReset: () => void
}

const STAGE_META: Record<
  StageId,
  {
    index: string
    name: string
  }
> = {
  plume: {
    index: '1',
    name: 'Plume & airflow',
  },
  droplets: {
    index: '2',
    name: 'Drift eliminator',
  },
  fan: {
    index: '3',
    name: 'Fan',
  },
  recovery: {
    index: '4',
    name: 'Recovery & CoC',
  },
}

export default function Controls({
  inputs,
  dryAirMassFlow,
  dryAirMassFlowMin,
  dryAirMassFlowMax,
  selectedStage,
  onChange,
  onDryAirMassFlowChange,
  onReset,
}: ControlsProps) {
  const stage = STAGE_META[selectedStage]
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
            Selected section · {stage.index}
          </span>
          <h2>{stage.name}</h2>
        </div>
        <button className="reset" onClick={onReset}>
          Reset all
        </button>
      </div>

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

            <DropletDistribution inputs={inputs} onChange={onChange} />
          </div>
        )}

        {selectedStage === 'droplets' && (
          <>
            <label className="select-field">
              <span className="field-head">
                <span className="field-label">
                  Tested eliminator
                  <span className="field-sym">A–F</span>
                </span>
              </span>
              <select
                value={inputs.eliminatorId}
                onChange={(event) =>
                  onChange({
                    eliminatorId: event.target.value as EliminatorId,
                  })
                }
              >
                {Object.values(ELIMINATORS).map((spec) => (
                  <option value={spec.id} key={spec.id}>
                    {spec.id} · {spec.type}
                  </option>
                ))}
              </select>
            </label>

            <div className="eliminator-design-summary" aria-live="polite">
              <strong>
                Design {selectedEliminator.id} · {selectedEliminator.type}
              </strong>
              <span>{ELIMINATOR_DESCRIPTIONS[selectedEliminator.id]}</span>
            </div>

            <details className="eliminator-comparison">
              <summary>Compare designs A–F</summary>
              <p>The letters identify tested Ruiz configurations, not performance rankings.</p>
              <div className="eliminator-comparison-list">
                {Object.values(ELIMINATORS).map((spec) => (
                  <div
                    className={spec.id === selectedEliminator.id ? 'is-selected' : ''}
                    key={spec.id}
                  >
                    <strong>{spec.id}</strong>
                    <span>{ELIMINATOR_DESCRIPTIONS[spec.id]}</span>
                  </div>
                ))}
              </div>
            </details>

          </>
        )}

        {selectedStage === 'fan' && (
          <div className="no-stage-inputs">No independent inputs</div>
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
          </>
        )}
      </div>
    </aside>
  )
}
