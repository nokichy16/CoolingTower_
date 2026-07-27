import { DEFAULT_INPUTS, type TowerInputs } from '../lib/model'
import type { StageId } from '../lib/stages'
import {
  ELIMINATORS,
  type EliminatorId,
} from '../lib/eliminators'
import Field from './Field'

interface ControlsProps {
  inputs: TowerInputs
  selectedStage: StageId
  onChange: (patch: Partial<TowerInputs>) => void
  onReset: () => void
}

const STAGE_META: Record<
  StageId,
  { index: string; name: string; dotClass: string; keys: (keyof TowerInputs)[] }
> = {
  inlet: {
    index: '1',
    name: 'Air inlet',
    dotClass: 'dot-air',
    keys: ['tAmbient', 'rhAmbient', 'pressure', 'aLouver', 'kLouver'],
  },
  fill: {
    index: '2',
    name: 'Fill & water side',
    dotClass: 'dot-water',
    keys: ['waterFlow', 'waterHot', 'waterCold', 'aFill', 'kFill'],
  },
  drift: {
    index: '3',
    name: 'Drift eliminator',
    dotClass: 'dot-drift',
    keys: ['eliminatorId', 'dropletDiameter', 'aDrift', 'driftPct'],
  },
  fan: {
    index: '4',
    name: 'Fan & airflow',
    dotClass: 'dot-fan',
    keys: ['airMassFlow', 'aFan', 'fanEff', 'kPlenum'],
  },
  exhaust: {
    index: '5',
    name: 'Exhaust',
    dotClass: 'dot-cond',
    keys: [],
  },
  recovery: {
    index: '6',
    name: 'Recovery',
    dotClass: 'dot-recovery',
    keys: ['tCondense'],
  },
}

/** Inputs for only the tower stage currently selected in the graphic. */
export default function Controls({
  inputs,
  selectedStage,
  onChange,
  onReset,
}: ControlsProps) {
  const stage = STAGE_META[selectedStage]
  const eliminator = ELIMINATORS[inputs.eliminatorId]
  const stageChanged = stage.keys.some(
    (key) => inputs[key] !== DEFAULT_INPUTS[key],
  )
  const set =
    (key: keyof TowerInputs) =>
    (v: number) =>
      onChange({ [key]: v } as Partial<TowerInputs>)

  return (
    <aside className="controls">
      <div className="controls-head">
        <div>
          <span className="controls-kicker">Selected stage · {stage.index}</span>
          <h2>{stage.name}</h2>
          <small className="changed-count">
            Select another tower region to change its inputs
          </small>
        </div>
        <button className="reset" onClick={onReset}>
          Reset all
        </button>
      </div>

      <div className={`stage-input-state${stageChanged ? ' is-changed' : ''}`}>
        <span>
          <i className={`dot ${stage.dotClass}`} aria-hidden="true" />
          {stageChanged ? 'This stage has changed inputs' : 'Using default inputs for this stage'}
        </span>
        {stageChanged && <em>Changed</em>}
      </div>

      <div className="stage-input-panel" key={selectedStage}>
        {selectedStage === 'inlet' && (
          <>
            <p className="stage-context-note">
              Ambient conditions set state 1; louver area and loss set the inlet
              velocity and pressure drop.
            </p>
            <Field label="Dry-bulb" sym="T₁" unit="°C" value={inputs.tAmbient}
              min={-5} max={45} step={0.5} onChange={set('tAmbient')} />
            <Field label="Relative humidity" sym="φ₁" unit="%" value={inputs.rhAmbient}
              min={5} max={100} step={1} digits={0} onChange={set('rhAmbient')} />
            <Field label="Atmospheric pressure" sym="P" unit="kPa"
              value={inputs.pressure / 1000} min={80} max={105} step={0.5}
              onChange={(v) => onChange({ pressure: v * 1000 })} />
            <Field label="Louver area" sym="A₁" unit="m²" value={inputs.aLouver}
              min={5} max={120} step={1} digits={0} onChange={set('aLouver')} />
            <div className="stage-assumption">
              <span>Tunable assumption</span>
              <Field label="Louver loss" sym="K₁" unit="" value={inputs.kLouver}
                min={0.5} max={10} step={0.1} onChange={set('kLouver')} />
            </div>
            <p className="group-note">
              Wet-bulb is calculated internally and used only as the evaporative
              cooling limit.
            </p>
          </>
        )}

        {selectedStage === 'fill' && (
          <>
            <p className="stage-context-note">
              The water-side temperatures and flow prescribe the heat load that
              the selected dry-air flow must carry.
            </p>
            <Field label="Water flow" sym="ṁ_w" unit="kg/s" value={inputs.waterFlow}
              min={50} max={2000} step={10} digits={0} onChange={set('waterFlow')} />
            <Field label="Hot water in" sym="T_hot" unit="°C" value={inputs.waterHot}
              min={25} max={55} step={0.5}
              onChange={(v) =>
                onChange({ waterHot: v, waterCold: Math.min(inputs.waterCold, v - 0.5) })
              } />
            <Field label="Cold water out" sym="T_cold" unit="°C" value={inputs.waterCold}
              min={15} max={Math.min(45, inputs.waterHot - 0.5)} step={0.5}
              onChange={set('waterCold')} />
            <Field label="Fill area" sym="A_fi" unit="m²" value={inputs.aFill}
              min={5} max={120} step={1} digits={0} onChange={set('aFill')} />
            <div className="stage-assumption">
              <span>Tunable assumption</span>
              <Field label="Fill loss" sym="K_fi" unit="" value={inputs.kFill}
                min={2} max={40} step={0.5} onChange={set('kFill')} />
            </div>
          </>
        )}

        {selectedStage === 'drift' && (
          <>
            <p className="stage-context-note">
              The Ruiz geometry, face area and representative droplet determine
              Kp, Re, St and single-size collection efficiency.
            </p>
            <label className="select-field">
              <span className="field-head">
                <span className="field-label">
                  Tested geometry
                  <span className="field-sym">A–F</span>
                </span>
              </span>
              <select
                value={inputs.eliminatorId}
                onChange={(event) =>
                  onChange({ eliminatorId: event.target.value as EliminatorId })
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
              <span>ζ measured {eliminator.measuredPressureCoefficient.toFixed(2)}</span>
            </div>
            <Field label="Representative droplet" sym="d_d" unit="µm"
              value={inputs.dropletDiameter} min={10} max={250} step={5}
              digits={0} onChange={set('dropletDiameter')} />
            <Field label="Eliminator area" sym="A_de" unit="m²" value={inputs.aDrift}
              min={5} max={120} step={1} digits={0} onChange={set('aDrift')} />
            <div className="stage-assumption">
              <span>Water-balance assumption</span>
              <Field label="Drift fraction" sym="" unit="%" value={inputs.driftPct}
                min={0.001} max={0.02} step={0.001} digits={3}
                onChange={set('driftPct')} />
              <small>
                This circulating-water fraction is separate from single-droplet
                collection efficiency.
              </small>
            </div>
          </>
        )}

        {selectedStage === 'fan' && (
          <>
            <p className="stage-context-note">
              Dry-air flow is prescribed directly. Total pressure loss and fan
              power are calculated at the stated area and efficiency.
            </p>
            <Field label="Dry-air flow" sym="ṁ_a" unit="kg/s" value={inputs.airMassFlow}
              min={50} max={800} step={5} onChange={set('airMassFlow')} />
            <Field label="Fan area" sym="A_fan" unit="m²" value={inputs.aFan}
              min={2} max={60} step={0.5} onChange={set('aFan')} />
            <Field label="Fan efficiency" sym="η" unit="%"
              value={inputs.fanEff * 100} min={40} max={90} step={1} digits={0}
              onChange={(v) => onChange({ fanEff: v / 100 })} />
            <div className="stage-assumption">
              <span>Tunable assumption</span>
              <Field label="Plenum / stack loss" sym="K_pl" unit=""
                value={inputs.kPlenum} min={0.3} max={6} step={0.1}
                onChange={set('kPlenum')} />
            </div>
          </>
        )}

        {selectedStage === 'exhaust' && (
          <>
            <p className="stage-context-note">
              The exhaust has no inputs of its own. It is the fill-exit state
              carried up through the eliminator and fan, which change pressure
              but not composition.
            </p>
            <p className="group-note">
              To change the exhaust state, change the fill or the air flow. To
              change what is recovered from it, select station 6.
            </p>
          </>
        )}

        {selectedStage === 'recovery' && (
          <>
            <p className="stage-context-note">
              The recovery target cools the saturated exhaust along the
              saturation line. Blowdown and water treatment are not included yet.
            </p>
            <Field label="Condense exhaust to" sym="T₅" unit="°C"
              value={inputs.tCondense} min={2} max={40} step={0.5}
              onChange={set('tCondense')} />
          </>
        )}
      </div>
    </aside>
  )
}
