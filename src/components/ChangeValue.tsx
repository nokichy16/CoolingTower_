import { useEffect, useRef, useState } from 'react'
import { fmt } from '../lib/format'

const SHOW_MS = 3000

/**
 * A number that shows how much it changed after an input moved.
 * The change is measured from the value before the slider drag began and
 * stays on screen for 3 s after the last change.
 */
export default function ChangeValue({
  value,
  digits,
  unit,
}: {
  value: number
  digits: number
  unit?: string
}) {
  const shown = Number.isFinite(value) ? fmt(value, digits) : '—'
  const base = useRef<number | null>(null)
  const last = useRef(value)
  const timer = useRef<number | undefined>(undefined)
  const [delta, setDelta] = useState<number | null>(null)

  useEffect(() => {
    const prev = last.current
    last.current = value
    if (!Number.isFinite(value) || !Number.isFinite(prev)) return
    // Only a change that is visible at the shown precision counts.
    if (fmt(prev, digits) === fmt(value, digits) && base.current === null) return
    if (base.current === null) base.current = prev
    const d = value - base.current
    setDelta(fmt(Math.abs(d), digits) === fmt(0, digits) ? null : d)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      base.current = null
      setDelta(null)
    }, SHOW_MS)
  }, [value, digits])

  useEffect(() => () => window.clearTimeout(timer.current), [])

  return (
    <span className="cv">
      <strong>{shown}</strong>
      {unit && <small>{unit}</small>}
      {delta !== null && (
        <em className={`cv-delta ${delta > 0 ? 'is-up' : 'is-down'}`} aria-live="polite">
          {delta > 0 ? '▲ +' : '▼ −'}
          {fmt(Math.abs(delta), digits)}
        </em>
      )}
    </span>
  )
}
