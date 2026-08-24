import type { TowerInputs } from '../lib/model'
import type { StageId } from '../lib/stages'
import { ELIMINATORS, type EliminatorId } from '../lib/eliminators'
import Field from './Field'

interface ControlsProps {
  inputs: TowerInputs
  selectedStage: StageId
  onChange: (patch: Partial<TowerInputs>) => void
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
  selectedStage,
  onChange,
  onReset,
}: ControlsProps) {
  const stage = STAGE_META[selectedStage]
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
          <>
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
          </>
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

            <Field
              label="Representative droplet"
              sym="d_d"
              unit="µm"
              value={inputs.dropletDiameter}
              min={25}
              max={250}
              step={5}
              digits={0}
              onChange={set('dropletDiameter')}
            />
            <Field
              label="Selected drift rate"
              sym="r_d"
              unit="%"
              value={inputs.driftRatePct}
              min={0.001}
              max={0.02}
              step={0.001}
              digits={3}
              onChange={set('driftRatePct')}
            />
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
              unit="K"
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
