import type { TowerResults } from '../lib/model'
import type { StageId } from '../lib/stages'
import { fmt, sig } from '../lib/format'

/** Always-visible headline results; each tile opens its stage. */
export default function KpiStrip({
  r,
  onSelect,
}: {
  r: TowerResults
  onSelect: (id: StageId) => void
}) {
  const d = r.droplets
  const tiles: { id: StageId; label: string; value: string; unit: string }[] = [
    { id: 'recovery', label: 'Water recovered', value: fmt(r.recovery.mDotCond, 2), unit: 'kg/s' },
    { id: 'recovery', label: 'Energy per kg', value: r.recovery.feasible ? fmt(r.recovery.e, 0) : '—', unit: 'kJ/kg' },
    { id: 'droplets', label: 'Drift escaping', value: d.cutoffFound ? sig(d.driftEscaping, 3) : '—', unit: d.cutoffFound ? 'kg/s' : '' },
    { id: 'fan', label: 'Fan air power', value: fmt(d.fanAirPower, 1), unit: 'kW' },
  ]
  return (
    <div className="kpi-strip" role="list" aria-label="Key results">
      {tiles.map((t) => (
        <button
          type="button"
          role="listitem"
          className="kpi"
          key={t.label}
          onClick={() => onSelect(t.id)}
        >
          <span className="kpi-label">{t.label}</span>
          <span className="kpi-value">
            <strong>{t.value}</strong>
            {t.unit && <small>{t.unit}</small>}
          </span>
        </button>
      ))}
    </div>
  )
}
