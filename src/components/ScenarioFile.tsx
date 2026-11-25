import { useEffect, useRef, useState } from 'react'
import type { TowerInputs, TowerResults } from '../lib/model'
import { parseScenarioCsv, scenarioToCsv } from '../lib/scenarios'

interface Props {
  results: TowerResults
  onLoad: (inputs: TowerInputs) => void
  onReset: () => void
}

interface Status {
  text: string
  notes: string[]
  error: boolean
}

/** Message time on screen, ms. An error stays until it is closed. */
const SHOW_MS = 6000

function stamp(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`
}

/**
 * One "Scenario" menu in the sheet head: Save CSV, Load CSV and Reset all.
 * The menu and the message float over the page, so the head keeps its height
 * and the tower drawing keeps its space.
 */
export default function ScenarioFile({ results, onLoad, onReset }: Props) {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<Status | null>(null)
  const root = useRef<HTMLDivElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  // Close the menu on a click outside it or on Escape.
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  // A plain success message goes after a few seconds. A message with notes
  // or an error stays until it is closed, so it can be read.
  useEffect(() => {
    if (!status || status.error || status.notes.length > 0) return
    const t = window.setTimeout(() => setStatus(null), SHOW_MS)
    return () => window.clearTimeout(t)
  }, [status])

  const save = () => {
    const blob = new Blob([scenarioToCsv(results)], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `scenario-${stamp(new Date())}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    setOpen(false)
    setStatus({ text: `Saved ${a.download}`, notes: [], error: false })
  }

  const load = async (file: File | undefined) => {
    if (!file) return
    try {
      const { inputs, notes } = parseScenarioCsv(await file.text())
      onLoad(inputs)
      setStatus({ text: `Loaded ${file.name}`, notes, error: false })
    } catch (e) {
      const text = e instanceof Error ? e.message : 'The file could not be read.'
      setStatus({ text, notes: [], error: true })
    }
  }

  return (
    <div className="scenario-file" ref={root}>
      <button
        type="button"
        className="reset scenario-toggle"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        Scenario ▾
      </button>
      {open && (
        <div className="scenario-menu" role="menu">
          <button type="button" role="menuitem" onClick={save}>
            Save CSV
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              fileInput.current?.click()
            }}
          >
            Load CSV
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              setStatus(null)
              onReset()
            }}
          >
            Reset all
          </button>
        </div>
      )}
      <input
        ref={fileInput}
        className="visually-hidden"
        type="file"
        accept=".csv,text/csv"
        tabIndex={-1}
        aria-label="Load scenario CSV file"
        onChange={(e) => {
          void load(e.target.files?.[0])
          e.target.value = ''
        }}
      />
      <div role="status" aria-live="polite" className="scenario-status-slot">
        {status && (
          <div className={`scenario-status${status.error ? ' is-error' : ''}`}>
            <span>{status.text}</span>
            {status.notes.length > 0 && status.notes.length <= 3 && (
              <ul className="scenario-notes">
                {status.notes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            )}
            {status.notes.length > 3 && (
              <details className="scenario-notes-more">
                <summary>{status.notes.length} inputs used their default value</summary>
                <ul className="scenario-notes">
                  {status.notes.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              </details>
            )}
            <button type="button" className="scenario-close" aria-label="Close message" onClick={() => setStatus(null)}>
              ×
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
