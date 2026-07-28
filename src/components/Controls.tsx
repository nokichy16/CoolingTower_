import {
  type TowerInputs,
  type TowerResults,
} from '../lib/model'
import type { StageId } from '../lib/stages'
import { ELIMINATORS, type EliminatorId } from '../lib/eliminators'
import { fmt, sig } from '../lib/format'
import Field from './Field'

interface ControlsProps {
  inputs: TowerInputs
  results: TowerResults
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
    name: 'Plume',
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
    name: 'Condensation recovery',
  },
}

function DerivedValue({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

export default function Controls({
  inputs,
  results,
  selectedStage,
  onChange,
  onReset,
}: ControlsProps) {
  const stage = STAGE_META[selectedStage]
  const eliminator = ELIMINATORS[inputs.eliminatorId]
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
          <small className="changed-count">
            Select another region in the visual to edit it
          </small>
        </div>
        <button className="reset" onClick={onReset}>
          Reset all
        </button>
      </div>

      <div className="stage-input-panel" key={selectedStage}>
        {selectedStage === 'plume' && (
          <>
            <p className="stage-context-note">
              Set the plume leaving the fill directly. Relative humidity remains
              fully adjustable; the model does not force saturation.
            </p>
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
              label="Dry-air mass flow"
              sym="ṁ_a"
              unit="kg/s"
              value={inputs.airMassFlow}
              min={10}
              max={1000}
              step={0.5}
              onChange={set('airMassFlow')}
            />
            <Field
              label="Plume velocity"
              sym="u₄"
              unit="m/s"
              value={inputs.plumeVelocity}
              min={0.5}
              max={20}
              step={0.1}
              onChange={set('plumeVelocity')}
            />

            <div className="derived-strip plume-derived-strip">
              <DerivedValue
                label="Humidity ratio"
                value={`${sig(results.plume.omega, 3)} kg/kg`}
              />
              <DerivedValue
                label="Dew point"
                value={`${fmt(results.plume.dewPoint)} °C`}
              />
              <DerivedValue
                label="Enthalpy"
                value={`${fmt(results.plume.h)} kJ/kg`}
              />
              <DerivedValue
                label="Implied flow area"
                value={`${fmt(results.plume.flowArea)} m²`}
              />
            </div>
            <div className="calculation-scope">
              Plume velocity sets the implied discharge area from A = V̇ / u₄.
              It is separate from the drift-eliminator face velocity.
            </div>
          </>
        )}

        {selectedStage === 'droplets' && (
          <>
            <p className="stage-context-note">
              Droplet size feeds the source Stokes-number correlation. The result
              is the percentage of droplets of that representative size removed
              by the selected eliminator.
            </p>
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

            <div className="geometry-note">
              <span>
                {eliminator.type === 'vane' ? 'b' : 'Dₕ'}{' '}
                {(eliminator.characteristicLength * 1000).toFixed(2)} mm
              </span>
              <span>L {(eliminator.height * 1000).toFixed(0)} mm</span>
              <span>
                ζ measured{' '}
                {eliminator.measuredPressureCoefficient.toFixed(2)}
              </span>
            </div>

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
              label="Eliminator face velocity"
              sym="u_de"
              unit="m/s"
              value={inputs.eliminatorVelocity}
              min={0.443}
              max={4.36}
              step={0.001}
              digits={3}
              onChange={set('eliminatorVelocity')}
            />

            <div className="droplet-reduction">
              <div>
                <span>Droplets removed</span>
                <strong>{fmt(results.droplets.reductionPct, 1)}%</strong>
              </div>
              <div className="reduction-track" aria-hidden="true">
                <span
                  style={{ width: `${results.droplets.reductionPct}%` }}
                />
              </div>
              <small>
                {fmt(results.droplets.remainingPct, 1)}% remain after the
                eliminator.
              </small>
            </div>
          </>
        )}

        {selectedStage === 'fan' && (
          <>
            <p className="stage-context-note">
              The fan requirement is calculated from the current plume flow and
              the pressure drop across the selected drift eliminator.
            </p>

            <div className="derived-strip">
              <DerivedValue
                label="Required pressure"
                value={`${fmt(results.droplets.pressureDrop)} Pa`}
              />
              <DerivedValue
                label="Volumetric airflow"
                value={`${fmt(results.plume.vDot)} m³/s`}
              />
              <DerivedValue
                label="Ideal air power"
                value={`${fmt(results.droplets.fanAirPower, 1)} kW`}
              />
            </div>

            <div className="calculation-scope">
              This is the ideal air power needed to overcome the eliminator
              only. It is not whole-tower or electrical fan power.
            </div>
          </>
        )}

        {selectedStage === 'recovery' && (
          <>
            <p className="stage-context-note">
              The plume first cools from {fmt(results.plume.t)} °C to its{' '}
              {fmt(results.plume.dewPoint)} °C dew point. Additional cooling
              below dew point produces condensate.
            </p>

            <div className="derived-strip recovery-state-strip">
              <DerivedValue
                label="Exhaust"
                value={`${fmt(results.plume.t)} °C`}
              />
              <DerivedValue
                label="Dew point"
                value={`${fmt(results.plume.dewPoint)} °C`}
              />
              <DerivedValue
                label="Recovery outlet"
                value={`${fmt(results.recovery.t)} °C`}
              />
            </div>

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

            <div className="recovery-preview">
              <span>Energy required per kilogram</span>
              <strong>{fmt(results.recovery.e, 0)} kJ/kg</strong>
              <small>
                {fmt(results.recovery.mDotCond, 2)} kg/s theoretical recovery ·{' '}
                {fmt(results.recovery.qDuty, 0)} kW cooling duty
              </small>
            </div>
          </>
        )}
      </div>
    </aside>
  )
}
