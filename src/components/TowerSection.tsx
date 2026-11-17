import type { CSSProperties } from 'react'
import type { TowerResults } from '../lib/model'
import { selectionName } from '../lib/eliminators'
import { STAGE_META, type StageId } from '../lib/stages'
import { fmt, sig } from '../lib/format'
import { selectOnKey } from './selectOnKey'

/**
 * Section drawing of an induced-draft counterflow tower. Air moves up the
 * sheet in calculation order: fill (1) → drift eliminator (2) → fan (3) →
 * recovery condenser (4). The parts are the stage buttons.
 *
 * The drawing follows the results:
 *   droplets passing the eliminator  ∝ escaping mass fraction
 *   fan blade speed                  ∝ face velocity
 *   condensate drops and tank level  ∝ Δω / ω₄ (share of the vapour condensed)
 *   plume above the condenser        fades by the same share
 */

const DROPLETS = 20
const DRIPS = 6
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
/** Repeatable scatter so the droplets do not move between renders. */
const scatter = (i: number, salt: number) => {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453
  return x - Math.floor(x)
}

interface Tag {
  id: StageId
  y: number // tag top
  anchor: [number, number] // point on the drawing the leader ends at
}

const TAG_X = 500
const TAG_W = 300
const TAG_H = 56
const TAGS: Tag[] = [
  { id: 'recovery', y: 64, anchor: [352, 104] },
  { id: 'fan', y: 180, anchor: [338, 208] },
  { id: 'droplets', y: 296, anchor: [392, 345] },
  { id: 'drift', y: 366, anchor: [330, 398] },
  { id: 'plume', y: 436, anchor: [392, 470] },
]

export default function TowerSection({
  r,
  selected,
  warnings,
  onSelect,
}: {
  r: TowerResults
  selected: StageId
  warnings: Record<StageId, number>
  onSelect: (id: StageId) => void
}) {
  const escaping = clamp(r.droplets.massEscaping, 0, 1)
  const passing = Math.round(DROPLETS * escaping)
  const condensed = r.plume.omega > 0 ? clamp(r.recovery.dOmega / r.plume.omega, 0, 1) : 0
  const drips = r.recovery.feasible ? Math.max(1, Math.round(DRIPS * condensed)) : 0
  const spin = clamp(2.6 - r.plume.velocity * 0.28, 0.45, 2.6)

  const reading: Record<StageId, string> = {
    plume: `${fmt(r.plume.t, 1)} °C · RH ${fmt(r.plume.rh, 0)} % · ${fmt(r.plume.airMassFlow, 0)} kg/s`,
    drift: `${sig(r.droplets.driftInlet, 3)} kg/s entering`,
    droplets: `${selectionName(r.eliminator.spec.id)} · ${fmt(100 * escaping, 1)} % escaping`,
    fan: `${fmt(r.droplets.fanAirPower, 2)} kW · Δp ${fmt(r.droplets.pressureDrop, 1)} Pa`,
    recovery: `${fmt(r.recovery.mDotCond, 2)} kg/s · ${fmt(100 * condensed, 0)} % of vapour`,
  }
  const label: Record<StageId, string> = {
    plume: '1A',
    drift: '1B',
    droplets: '2',
    fan: '3',
    recovery: '4',
  }

  const style = {
    '--spin': `${spin.toFixed(2)}s`,
    '--vapour': (0.2 + 0.6 * (r.plume.rh / 100)).toFixed(2),
    '--plume-out': (0.75 * (1 - condensed)).toFixed(2),
  } as CSSProperties

  /** A drawn part that selects its stage. */
  const part = (id: StageId, x: number, y: number, w: number, h: number) => (
    <rect
      className={`ts-hit${selected === id ? ' is-selected' : ''}`}
      x={x}
      y={y}
      width={w}
      height={h}
      rx={4}
      onClick={() => onSelect(id)}
    />
  )

  return (
    <svg className="tower-section" viewBox="34 14 776 740" style={style} role="group" aria-label="Cooling-tower section. Select a part to open its stage.">
      <defs>
        <pattern id="ts-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="7" className="ts-hatch-line" />
        </pattern>
        <pattern id="ts-fill" width="14" height="14" patternUnits="userSpaceOnUse">
          <path d="M0 14 L7 0 L14 14" className="ts-fill-line" />
        </pattern>
        <clipPath id="ts-tank">
          <rect x="424" y="640" width="52" height="58" />
        </clipPath>
      </defs>

      {/* ground and basin */}
      <line className="ts-ground" x1="40" y1="700" x2="480" y2="700" />
      <path className="ts-wall" d="M112 648 H128 V692 H392 V648 H408 V700 H112 Z" />
      <rect className="ts-water" x="128" y="668" width="264" height="24" />
      <path className="ts-water-line" d="M128 668 q11 -5 22 0 t22 0 t22 0 t22 0 t22 0 t22 0 t22 0 t22 0 t22 0 t22 0 t22 0 t22 0" />

      {/* casing walls (cut in section), with air inlets at the bottom */}
      <path className="ts-wall" d="M128 250 H140 V426 H128 Z M128 438 H140 V580 H128 Z" />
      <rect className="ts-wall" x="380" y="250" width="12" height="330" />
      <g className="ts-louvres">
        {[596, 614, 632].map((y) => (
          <g key={y}>
            <line x1="126" y1={y + 8} x2="142" y2={y} />
            <line x1="394" y1={y + 8} x2="378" y2={y} />
          </g>
        ))}
      </g>
      <g className="ts-air-in">
        <path d="M58 618 H112 M100 610 l12 8 l-12 8" />
        <path d="M462 618 H408 M420 610 l-12 8 l12 8" />
        <text x="58" y="604">air in</text>
      </g>

      {/* fill pack and rain */}
      <rect className="ts-fill" x="140" y="470" width="240" height="96" fill="url(#ts-fill)" />
      <g className="ts-rain">
        {Array.from({ length: 9 }, (_, i) => (
          <line key={i} x1={158 + i * 26} y1={578} x2={158 + i * 26} y2={590} style={{ animationDelay: `${(i % 4) * -0.3}s` }} />
        ))}
      </g>

      {/* hot water distribution */}
      <path className="ts-pipe" d="M52 432 H370" />
      <g className="ts-nozzles">
        {[170, 215, 260, 305, 350].map((x) => (
          <path key={x} d={`M${x} 434 v6 M${x - 9} 452 L${x} 440 L${x + 9} 452`} />
        ))}
      </g>
      <text className="ts-note" x="50" y="422">
        ṁ_circ
      </text>
      <text className="ts-note" x="50" y="450">
        {fmt(r.inputs.circulatingWaterFlow, 0)} kg/s
      </text>

      {/* rising vapour */}
      <g className="ts-vapour" aria-hidden="true">
        {[176, 226, 294, 344].map((x, i) => (
          <path key={x} d={`M${x} 462 q-9 -22 0 -44 t0 -44 t0 -44`} style={{ animationDelay: `${i * -0.9}s` }} />
        ))}
      </g>

      {/* drift droplets: some stop at the eliminator, the rest pass */}
      <g className="ts-drift" aria-hidden="true">
        {Array.from({ length: DROPLETS }, (_, i) => (
          <circle
            key={i}
            className={i < passing ? 'is-passing' : 'is-caught'}
            cx={152 + scatter(i, 1) * 216}
            cy={428}
            r={1.6 + scatter(i, 2) * 1.8}
            style={{ animationDelay: `${(-scatter(i, 3) * 4).toFixed(2)}s` }}
          />
        ))}
      </g>

      {/* drift eliminator */}
      <g className="ts-eliminator">
        {Array.from({ length: 12 }, (_, i) => (
          <path key={i} d={`M${148 + i * 20} 362 l8 -10 l-8 -10 l8 -10`} />
        ))}
      </g>

      {/* fan deck, stack and fan */}
      <path className="ts-wall" d="M128 250 H196 V262 H128 Z M324 250 H392 V262 H324 Z" />
      <path className="ts-wall" d="M196 262 V176 L184 150 H194 L206 176 V262 Z M324 262 V176 L336 150 H326 L314 176 V262 Z" />
      <g className="ts-fan">
        <line className="ts-shaft" x1="260" y1="208" x2="260" y2="236" />
        <rect className="ts-motor" x="250" y="232" width="20" height="14" rx="2" />
        <g className="ts-blades">
          <ellipse cx="234" cy="208" rx="24" ry="5.5" />
          <ellipse cx="286" cy="208" rx="24" ry="5.5" />
        </g>
        <circle className="ts-hub" cx="260" cy="208" r="6" />
      </g>
      <g className="ts-velocity">
        <path d="M260 316 V282 M252 292 l8 -10 l8 10" />
        <text x="272" y="304">u₄ {fmt(r.plume.velocity, 2)} m/s</text>
      </g>

      {/* recovery condenser over the stack outlet */}
      <path className="ts-recovery-shell" d="M168 142 V74 H352 V142" />
      <path className="ts-coil" d="M184 92 H336 M184 106 H336 M184 120 H336 M336 92 a7 7 0 0 1 0 14 M184 106 a7 7 0 0 0 0 14" />
      <g className="ts-drips" aria-hidden="true">
        {Array.from({ length: drips }, (_, i) => (
          <path key={i} d={`M${352 - 6} ${126} q-3 6 0 8 q3 -2 0 -8`} transform={`translate(${-i * 26} 0)`} style={{ animationDelay: `${i * -0.35}s` }} />
        ))}
      </g>
      <path className="ts-gutter" d="M160 142 H200 M320 142 H366" />
      <path className="ts-drain" d="M366 142 H450 V640" />
      <g className="ts-plume-out" aria-hidden="true">
        {[214, 260, 306].map((x, i) => (
          <path key={x} d={`M${x} 66 q-10 -14 0 -28 t0 -28`} style={{ animationDelay: `${i * -1.1}s` }} />
        ))}
      </g>

      {/* recovered-water tank: level = share of the vapour condensed */}
      <rect className="ts-tank-water" x="424" y={698 - 58 * condensed} width="52" height={58 * condensed} clipPath="url(#ts-tank)" />
      <rect className="ts-tank" x="424" y="640" width="52" height="58" />
      <text className="ts-note" x="450" y="722" textAnchor="middle">recovered</text>

      {/* flow area, shown as a dimension line */}
      <g className="ts-dimension">
        <path d="M140 740 H380 M140 733 V747 M380 733 V747" />
        <text x="260" y="734" textAnchor="middle">
          A {fmt(r.plume.flowArea, 2)} m²
        </text>
      </g>

      {/* parts that select a stage */}
      {part('recovery', 160, 66, 200, 82)}
      {part('fan', 186, 150, 148, 104)}
      {part('droplets', 140, 326, 240, 42)}
      {part('drift', 140, 372, 240, 52)}
      {part('plume', 140, 462, 240, 110)}

      {/* stage tags */}
      {TAGS.map(({ id, y, anchor }) => {
        const on = selected === id
        const midY = y + TAG_H / 2
        return (
          <g
            key={id}
            className={`ts-tag is-${STAGE_META[id].path}${on ? ' is-selected' : ''}`}
            role="button"
            tabIndex={0}
            aria-pressed={on}
            aria-label={`Stage ${label[id]}, ${STAGE_META[id].name}: ${reading[id]}`}
            onClick={() => onSelect(id)}
            onKeyDown={selectOnKey(() => onSelect(id))}
          >
            <path className="ts-leader" d={`M${anchor[0]} ${anchor[1]} L${TAG_X - 26} ${midY} H${TAG_X}`} />
            <circle className="ts-anchor" cx={anchor[0]} cy={anchor[1]} r="3.5" />
            <rect className="ts-tag-box" x={TAG_X} y={y} width={TAG_W} height={TAG_H} rx="3" />
            <rect className="ts-tag-index" x={TAG_X} y={y} width="40" height={TAG_H} rx="3" />
            <text className="ts-tag-number" x={TAG_X + 20} y={midY + 7} textAnchor="middle">
              {label[id]}
            </text>
            <text className="ts-tag-name" x={TAG_X + 52} y={y + 23}>
              {STAGE_META[id].name}
            </text>
            <text className="ts-tag-reading" x={TAG_X + 52} y={y + 43}>
              {reading[id]}
            </text>
            {warnings[id] > 0 && (
              <g className="ts-tag-warn">
                <circle cx={TAG_X + TAG_W - 16} cy={y + 16} r="9" />
                <text x={TAG_X + TAG_W - 16} y={y + 20} textAnchor="middle">!</text>
              </g>
            )}
          </g>
        )
      })}
    </svg>
  )
}
