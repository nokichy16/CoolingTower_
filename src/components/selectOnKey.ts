import type { KeyboardEvent } from 'react'

/** Key handler that makes a non-button element act on Enter and Space. */
export const selectOnKey = (action: () => void) => (event: KeyboardEvent) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    action()
  }
}
