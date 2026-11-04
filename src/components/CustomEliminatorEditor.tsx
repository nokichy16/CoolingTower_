import type { CustomEliminator, EliminatorType } from '../lib/eliminators'
import Field from './Field'

const TYPES: { id: EliminatorType; label: string }[] = [
  { id: 'vane', label: 'Vane' },
  { id: 'honeycomb', label: 'Honeycomb' },
  { id: 'wire-mesh', label: 'Wire mesh' },
]

/**
 * Geometry of the custom eliminator. Only parameters that appear in the Ruiz
 * et al. (2019) correlations are offered.
 */
export default function CustomEliminatorEditor({
  value,
  onChange,
}: {
  value: CustomEliminator
  onChange: (next: CustomEliminator) => void
}) {
  const set = (patch: Partial<CustomEliminator>) => onChange({ ...value, ...patch })
  return (
    <section className="custom-eliminator" aria-labelledby="custom-elim-title">
      <h3 className="input-group-title" id="custom-elim-title">
        Custom eliminator
      </h3>
      <div className="stage-subtabs custom-type" role="radiogroup" aria-label="Type">
        {TYPES.map((t) => (
          <button
            type="button"
            key={t.id}
            role="radio"
            aria-checked={value.type === t.id}
            className={`stage-subtab${value.type === t.id ? ' is-selected' : ''}`}
            onClick={() => set({ type: t.id })}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="custom-fields">
        {value.type === 'vane' && (
          <>
            <Field
              label="Gap"
              sym="b"
              unit="mm"
              value={value.vaneGapMm}
              min={5}
              max={100}
              step={0.5}
              digits={1}
              onChange={(v) => set({ vaneGapMm: v })}
            />
            <Field
              label="Height"
              sym="h"
              unit="mm"
              value={value.vaneHeightMm}
              min={50}
              max={400}
              step={5}
              digits={0}
              onChange={(v) => set({ vaneHeightMm: v })}
            />
          </>
        )}
        {value.type === 'honeycomb' && (
          <Field
            label="Cell size (hydraulic diameter)"
            sym="D_h"
            unit="mm"
            value={value.cellMm}
            min={5}
            max={50}
            step={0.5}
            digits={1}
            onChange={(v) => set({ cellMm: v })}
          />
        )}
        {value.type === 'wire-mesh' && (
          <>
            <Field
              label="Characteristic length"
              sym="L"
              unit="mm"
              value={value.meshLengthMm}
              min={5}
              max={80}
              step={0.5}
              digits={2}
              onChange={(v) => set({ meshLengthMm: v })}
            />
            <div className="field">
              <span className="field-label">Turn angle θ</span>
              <div className="stage-subtabs" role="radiogroup" aria-label="Turn angle">
                {([45, 135] as const).map((deg) => (
                  <button
                    type="button"
                    key={deg}
                    role="radio"
                    aria-checked={value.meshAngleDeg === deg}
                    className={`stage-subtab${value.meshAngleDeg === deg ? ' is-selected' : ''}`}
                    onClick={() => set({ meshAngleDeg: deg })}
                  >
                    {deg}°
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
      <p className="eliminator-picker-note">
        Ruiz tested: vane b/h 1/6–1/3; honeycomb 15 mm only; wire mesh 45° and
        135° only.
      </p>
    </section>
  )
}
