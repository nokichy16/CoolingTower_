import { useEffect, useState } from 'react'

interface FieldProps {
  label: string
  sym?: string
  unit: string
  value: number
  min: number
  max: number
  step: number
  digits?: number
  onChange: (v: number) => void
}

/** A labelled slider + numeric readout used throughout the control panel. */
export default function Field({
  label,
  sym,
  unit,
  value,
  min,
  max,
  step,
  digits = 1,
  onChange,
}: FieldProps) {
  const formatDraft = (next: number) =>
    Number.isFinite(next) ? String(Number(next.toFixed(digits))) : ''

  const [draft, setDraft] = useState(formatDraft(value))
  const [invalid, setInvalid] = useState(false)

  useEffect(() => {
    setDraft(formatDraft(value))
    setInvalid(false)
  }, [value, digits])

  const commitDraft = () => {
    if (draft.trim() === '') {
      setDraft(formatDraft(value))
      setInvalid(false)
      return
    }

    const parsed = Number(draft)
    if (!Number.isFinite(parsed)) {
      setDraft(formatDraft(value))
      setInvalid(false)
      return
    }

    const clamped = Math.min(max, Math.max(min, parsed))
    const rounded = Number(clamped.toFixed(digits))
    setDraft(formatDraft(rounded))
    setInvalid(false)
    onChange(rounded)
  }

  return (
    <label className="field">
      <div className="field-head">
        <span className="field-label">
          {label}
          {sym && <span className="field-sym">{sym}</span>}
        </span>
        <span className="field-number">
          <input
            className={`field-value-input${invalid ? ' is-invalid' : ''}`}
            type="number"
            aria-label={`${label} value, allowed from ${min} to ${max}${unit ? ` ${unit}` : ''}`}
            aria-invalid={invalid}
            min={min}
            max={max}
            step={step}
            value={draft}
            onChange={(e) => {
              const raw = e.target.value
              const next = Number(raw)
              const isValid =
                raw.trim() !== '' &&
                Number.isFinite(next) &&
                next >= min &&
                next <= max

              setDraft(raw)
              setInvalid(!isValid)
              if (isValid) onChange(next)
            }}
            onBlur={commitDraft}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur()
              if (e.key === 'Escape') {
                setDraft(formatDraft(value))
                setInvalid(false)
                e.currentTarget.blur()
              }
            }}
          />
          <span className="field-unit">{unit}</span>
        </span>
      </div>
      <input
        type="range"
        aria-label={`${label} slider`}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </label>
  )
}
