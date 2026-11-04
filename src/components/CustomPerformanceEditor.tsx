import {
  collectionEfficiencyAtDiameter,
  CUSTOM_SIZES_UM,
  type CustomPerformance,
  type EliminatorId,
} from '../lib/eliminators'
import { solveTower, type TowerInputs } from '../lib/model'
import Field from './Field'

const TESTED: EliminatorId[] = ['A', 'B', 'C', 'D', 'E', 'F']

/**
 * Custom performance: set Δp and ε per droplet size directly. "Start from"
 * copies a tested eliminator's Δp and ε at the current velocity and plume
 * temperature, as a starting point to change.
 */
export default function CustomPerformanceEditor({
  inputs,
  onChange,
}: {
  inputs: TowerInputs
  onChange: (next: CustomPerformance) => void
}) {
  const value = inputs.customPerformance
  const setEff = (i: number, v: number) => {
    const next = [...value.efficiencyPct]
    next[i] = Math.min(100, Math.max(0, v))
    onChange({ ...value, efficiencyPct: next })
  }
  const copyFrom = (id: EliminatorId) => {
    const u = Math.max(inputs.plumeVelocity, 1e-6)
    onChange({
      pressureDropPa: Number(
        solveTower({ ...inputs, eliminatorId: id }).droplets.pressureDrop.toFixed(1),
      ),
      efficiencyPct: CUSTOM_SIZES_UM.map((d) =>
        Number(
          (100 * collectionEfficiencyAtDiameter(id, u, inputs.plumeTemperature, d)).toFixed(1),
        ),
      ),
    })
  }

  return (
    <section className="custom-eliminator" aria-labelledby="custom-perf-title">
      <h3 className="input-group-title" id="custom-perf-title">
        Custom performance
      </h3>
      <div className="custom-copy">
        <span>Start from</span>
        {TESTED.map((id) => (
          <button type="button" key={id} className="stage-subtab" onClick={() => copyFrom(id)}>
            {id}
          </button>
        ))}
      </div>
      <Field
        label="Pressure drop"
        sym="Δp"
        unit="Pa"
        value={value.pressureDropPa}
        min={0}
        max={300}
        step={0.5}
        digits={1}
        onChange={(v) => onChange({ ...value, pressureDropPa: v })}
      />
      <div className="custom-eff" role="group" aria-label="Collection efficiency by droplet size">
        <span className="field-label">Collection efficiency ε by droplet size (%)</span>
        <div className="custom-eff-grid">
          {CUSTOM_SIZES_UM.map((d, i) => (
            <label key={d}>
              <span>{d} µm</span>
              <input
                type="number"
                min={0}
                max={100}
                step={1}
                value={value.efficiencyPct[i]}
                onChange={(e) => {
                  const v = Number(e.target.value)
                  if (Number.isFinite(v)) setEff(i, v)
                }}
              />
            </label>
          ))}
        </div>
      </div>
    </section>
  )
}
