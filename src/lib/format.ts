/** Number formatting helpers for the readouts. */

export function fmt(value: number, digits = 1): string {
  if (!isFinite(value)) return '—'
  return value.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

/** Fixed significant figures — good for small numbers like ω. */
export function sig(value: number, digits = 4): string {
  if (!isFinite(value)) return '—'
  return value.toPrecision(digits)
}
