import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { TowerInputs, TowerResults } from '../lib/model'
import { parseScenarioCsv, scenarioToCsv } from '../lib/scenarios'

interface Props {
  results: TowerResults
  onLoad: (inputs: TowerInputs) => void
  /** Extra buttons shown in the same row (the "Reset all" button). */
  children?: ReactNode
}

interface Status {
  text: string
  notes: string[]
  error: boolean
  loaded?: TowerInputs
}

function stamp(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`
}

export default function ScenarioFile({ results, onLoad, children }: Props) {
  const [status, setStatus] = useState<Status | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  // The line clears when the inputs change after a load.
  useEffect(() => {
    setStatus((s) => (s && s.loaded && s.loaded !== results.inputs ? null : s))
  }, [results.inputs])

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
    setStatus(null)
  }

  const load = async (file: File | undefined) => {
    if (!file) return
    try {
      const { inputs, notes } = parseScenarioCsv(await file.text())
      onLoad(inputs)
      const count = notes.length ? `, ${notes.length} note${notes.length === 1 ? '' : 's'}` : ''
      setStatus({ text: `Loaded ${file.name}${count}`, notes, error: false, loaded: inputs })
    } catch (e) {
      const text = e instanceof Error ? e.message : 'The file could not be read.'
      setStatus({ text, notes: [], error: true })
    }
  }

  return (
    <div className="scenario-file">
      <div className="scenario-buttons">
        <button type="button" className="reset" onClick={save}>
          Save CSV
        </button>
        <button type="button" className="reset" onClick={() => fileInput.current?.click()}>
          Load CSV
        </button>
        {children}
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
      </div>
      <div role="status" className={status?.error ? 'scenario-status is-error' : 'scenario-status'}>
        {status && (
          <>
            <span title={status.notes.join('\n') || undefined}>{status.text}</span>
            {status.notes.length > 0 && (
              <ul className="scenario-notes">
                {status.notes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  )
}
