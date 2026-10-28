import { ELIMINATORS, type EliminatorId } from '../lib/eliminators'

export const ELIMINATOR_DESCRIPTIONS: Record<EliminatorId, string> = {
  A: 'Vane · 50 mm gap · 150 mm height · 54.3° direction change',
  B: 'Vane · 32 mm gap · 150 mm height · 89.4° direction change',
  C: 'Vane · 25 mm gap · 150 mm height · 36.3° direction change',
  D: 'Honeycomb · 15 mm hydraulic diameter · 165 mm height',
  E: 'Wire mesh · 34.79 mm characteristic length · 165 mm height · 45° direction change',
  F: 'Wire mesh · 34.79 mm characteristic length · 165 mm height · 135° direction change',
}

/** Selectable list of the tested Ruiz eliminators A–F. */
export default function EliminatorPicker({
  selected,
  onSelect,
}: {
  selected: EliminatorId
  onSelect: (id: EliminatorId) => void
}) {
  return (
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
          const on = spec.id === selected
          return (
            <button
              type="button"
              role="radio"
              aria-checked={on}
              className={on ? 'is-selected' : ''}
              key={spec.id}
              onClick={() => onSelect(spec.id as EliminatorId)}
            >
              <span className="picker-dot" aria-hidden="true" />
              <strong>{spec.id}</strong>
              <span>{ELIMINATOR_DESCRIPTIONS[spec.id]}</span>
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
