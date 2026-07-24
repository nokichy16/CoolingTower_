import type { TowerInputs } from '../lib/model'
import Field from './Field'

interface ControlsProps {
  inputs: TowerInputs
  onChange: (patch: Partial<TowerInputs>) => void
  onReset: () => void
}

/** The full input panel — every adjustable condition, grouped by stage. */
export default function Controls({ inputs, onChange, onReset }: ControlsProps) {
  const set =
    (key: keyof TowerInputs) =>
    (v: number) =>
      onChange({ [key]: v } as Partial<TowerInputs>)

  return (
    <aside className="controls">
      <div className="controls-head">
        <div>
          <span className="controls-kicker">Edit scenario</span>
          <h2>Operating data</h2>
        </div>
        <button className="reset" onClick={onReset}>
          Reset
        </button>
      </div>

      <section className="group">
        <h3>
          <span className="dot dot-air" />
          Ambient air
        </h3>
        <Field label="Dry-bulb" sym="T₁" unit="°C" value={inputs.tAmbient}
          min={-5} max={45} step={0.5} onChange={set('tAmbient')} />
        <Field label="Relative humidity" sym="φ₁" unit="%" value={inputs.rhAmbient}
          min={5} max={100} step={1} digits={0} onChange={set('rhAmbient')} />
        <Field label="Atmospheric pressure" sym="P" unit="kPa"
          value={inputs.pressure / 1000} min={80} max={105} step={0.5}
          onChange={(v) => onChange({ pressure: v * 1000 })} />
      </section>

      <section className="group">
        <h3>
          <span className="dot dot-water" />
          Data center heat loop
        </h3>
        <Field label="Water flow" sym="ṁ_w" unit="kg/s" value={inputs.waterFlow}
          min={50} max={2000} step={10} digits={0} onChange={set('waterFlow')} />
        <Field label="Hot water in" sym="T_hot" unit="°C" value={inputs.waterHot}
          min={25} max={55} step={0.5} onChange={set('waterHot')} />
        <Field label="Cold water out" sym="T_cold" unit="°C" value={inputs.waterCold}
          min={15} max={45} step={0.5} onChange={set('waterCold')} />
      </section>

      <section className="group">
        <h3>
          <span className="dot dot-geo" />
          Cooling tower geometry
        </h3>
        <Field label="Louver area" sym="A₁" unit="m²" value={inputs.aLouver}
          min={5} max={120} step={1} digits={0} onChange={set('aLouver')} />
        <Field label="Fill area" sym="A_fi" unit="m²" value={inputs.aFill}
          min={5} max={120} step={1} digits={0} onChange={set('aFill')} />
        <Field label="Drift eliminator area" sym="A_de" unit="m²" value={inputs.aDrift}
          min={5} max={120} step={1} digits={0} onChange={set('aDrift')} />
        <Field label="Fan area" sym="A_fan" unit="m²" value={inputs.aFan}
          min={2} max={60} step={0.5} onChange={set('aFan')} />
      </section>

      <section className="group">
        <h3>
          <span className="dot dot-loss" />
          Loss coefficients
        </h3>
        <Field label="Louvers" sym="K₁" unit="" value={inputs.kLouver}
          min={0.5} max={10} step={0.1} onChange={set('kLouver')} />
        <Field label="Fill" sym="K_fi" unit="" value={inputs.kFill}
          min={2} max={40} step={0.5} onChange={set('kFill')} />
        <Field label="Drift eliminator" sym="K_de" unit="" value={inputs.kDrift}
          min={1} max={15} step={0.1} onChange={set('kDrift')} />
        <Field label="Plenum / stack" sym="K_pl" unit="" value={inputs.kPlenum}
          min={0.3} max={6} step={0.1} onChange={set('kPlenum')} />
      </section>

      <section className="group">
        <h3>
          <span className="dot dot-fan" />
          Fan
        </h3>
        <Field label="Static pressure at zero flow" sym="Δp₀" unit="Pa"
          value={inputs.fanDp0} min={100} max={800} step={10} digits={0}
          onChange={set('fanDp0')} />
        <Field label="Free-delivery flow" sym="V̇max" unit="m³/s"
          value={inputs.fanVmax} min={200} max={2000} step={20} digits={0}
          onChange={set('fanVmax')} />
        <Field label="Fan efficiency" sym="η" unit="%"
          value={inputs.fanEff * 100} min={40} max={90} step={1} digits={0}
          onChange={(v) => onChange({ fanEff: v / 100 })} />
      </section>

      <section className="group">
        <h3>
          <span className="dot dot-cond" />
          Recovery
        </h3>
        <Field label="Condense exhaust to" sym="T₅" unit="°C"
          value={inputs.tCondense} min={2} max={40} step={0.5}
          onChange={set('tCondense')} />
      </section>

      <section className="group">
        <h3>
          <span className="dot dot-bal" />
          Water balance
        </h3>
        <Field label="Cycles of concentration" sym="CoC" unit="" value={inputs.cycles}
          min={1.5} max={10} step={0.1} onChange={set('cycles')} />
        <Field label="Drift fraction" sym="" unit="%" value={inputs.driftPct}
          min={0.001} max={0.02} step={0.001} digits={3} onChange={set('driftPct')} />
      </section>
    </aside>
  )
}
