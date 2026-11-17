import type { TowerResults } from '../lib/model'
import type { StageId } from '../lib/stages'
import { fmt, sig } from '../lib/format'

/** The four results the model exists to give. Each one opens its stage. */
export default function TitleBlock({
  r,
  onSelect,
}: {
  r: TowerResults
  onSelect: (id: StageId) => void
}) {
  const d = r.droplets
  const cells: { stage: StageId; label: string; value: string; unit: string; detail: string }[] = [
    { stage: 'droplets', label: 'Drift escaping', value: sig(d.driftEscaping, 3), unit: 'kg/s', detail: `${fmt(100 * d.massEscaping, 1)} % of inlet` },
    { stage: 'fan', label: 'Fan air power', value: fmt(d.fanAirPower, 2), unit: 'kW', detail: `Δp ${fmt(d.pressureDrop, 1)} Pa` },
    { stage: 'recovery', label: 'Water recovered', value: fmt(r.recovery.mDotCond, 2), unit: 'kg/s', detail: `outlet ${fmt(r.recovery.t, 1)} °C` },
    { stage: 'recovery', label: 'Energy per kg', value: r.recovery.feasible ? fmt(r.recovery.e, 0) : '—', unit: 'kJ/kg', detail: `duty ${fmt(r.recovery.qDuty, 0)} kW` },
  ]
  return (
    <div className="title-block" aria-label="Main results">
      {cells.map((c) => (
        <button
          type="button"
          key={c.label}
          className="tb-cell"
          onClick={() => onSelect(c.stage)}
          aria-label={`${c.label}: ${c.value} ${c.unit}. Go to this stage.`}
        >
          <span className="tb-label">{c.label}</span>
          <span className="tb-value">
            <strong>{c.value}</strong>
            <small>{c.unit}</small>
          </span>
          <span className="tb-detail">{c.detail}</span>
        </button>
      ))}
    </div>
  )
}
