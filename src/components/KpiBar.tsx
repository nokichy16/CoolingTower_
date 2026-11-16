import type { TowerResults } from '../lib/model'
import { selectionName } from '../lib/eliminators'
import type { StageId } from '../lib/stages'
import { fmt, sig } from '../lib/format'

interface Kpi {
  stage: StageId
  label: string
  value: string
  unit: string
  detail: string
}

/** The four results the model exists to give. Each one opens its stage. */
export default function KpiBar({
  r,
  selected,
  onSelect,
}: {
  r: TowerResults
  selected: StageId
  onSelect: (id: StageId) => void
}) {
  const d = r.droplets
  const kpis: Kpi[] = [
    {
      stage: 'droplets',
      label: 'Drift escaping',
      value: sig(d.driftEscaping, 3),
      unit: 'kg/s',
      detail: `${fmt(100 * d.massEscaping, 1)} % of inlet drift · eliminator ${selectionName(r.eliminator.spec.id)}`,
    },
    {
      stage: 'fan',
      label: 'Fan air power',
      value: fmt(d.fanAirPower, 2),
      unit: 'kW',
      detail: `Δp ${fmt(d.pressureDrop, 1)} Pa at ${fmt(r.plume.velocity, 2)} m/s`,
    },
    {
      stage: 'recovery',
      label: 'Water recovered',
      value: fmt(r.recovery.mDotCond, 2),
      unit: 'kg/s',
      detail: `outlet ${fmt(r.recovery.t, 1)} °C · duty ${fmt(r.recovery.qDuty, 0)} kW`,
    },
    {
      stage: 'recovery',
      label: 'Energy per kg water',
      value: r.recovery.feasible ? fmt(r.recovery.e, 0) : '—',
      unit: 'kJ/kg',
      detail: `Δh ${fmt(r.recovery.dH, 1)} kJ/kg da`,
    },
  ]

  return (
    <div className="kpi-bar" aria-label="Main results">
      {kpis.map((k) => (
        <button
          type="button"
          key={k.label}
          className={`kpi is-${k.stage}${selected === k.stage ? ' is-current' : ''}`}
          onClick={() => onSelect(k.stage)}
          aria-label={`${k.label}: ${k.value} ${k.unit}. Open this stage.`}
        >
          <span className="kpi-label">{k.label}</span>
          <span className="kpi-value">
            <strong>{k.value}</strong>
            <small>{k.unit}</small>
          </span>
          <span className="kpi-detail">{k.detail}</span>
        </button>
      ))}
    </div>
  )
}
