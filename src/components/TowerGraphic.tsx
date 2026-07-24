import type { CSSProperties } from 'react'
import type { TowerResults } from '../lib/model'
import { buildStages, type StageId } from '../lib/stages'
import { fmt } from '../lib/format'

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v))
}

// Tower body geometry (SVG user units). A trapezoid, wider at the base, with a
// fan stack on top — the induced-draft silhouette.
const TOP_Y = 112
const BOT_Y = 360
const TOP_L = 205
const TOP_R = 355
const BOT_L = 128
const BOT_R = 432
const lx = (y: number) => TOP_L + ((y - TOP_Y) / (BOT_Y - TOP_Y)) * (BOT_L - TOP_L)
const rx = (y: number) => TOP_R + ((y - TOP_Y) / (BOT_Y - TOP_Y)) * (BOT_R - TOP_R)

interface ZoneLabel {
  id: StageId
  labelY: number
  anchor: [number, number]
}

// Where each stage's leader-line label sits on the right, and the point on the
// tower it points back to.
const LABELS: ZoneLabel[] = [
  { id: 'exhaust', labelY: 40, anchor: [312, 40] },
  { id: 'fan', labelY: 96, anchor: [338, 90] },
  { id: 'drift', labelY: 150, anchor: [360, 134] },
  { id: 'fill', labelY: 220, anchor: [396, 214] },
  { id: 'inlet', labelY: 312, anchor: [420, 320] },
]

// Full-width clickable band for each stage, top→bottom down the tower.
const HOTZONES: Record<StageId, { y: number; h: number }> = {
  exhaust: { y: 8, h: 62 },
  fan: { y: 70, h: 46 },
  drift: { y: 116, h: 34 },
  fill: { y: 150, h: 118 },
  inlet: { y: 268, h: 96 },
}

export default function TowerGraphic({
  r,
  selected,
  onSelect,
}: {
  r: TowerResults
  selected: StageId
  onSelect: (id: StageId) => void
}) {
  const stages = buildStages(r)
  const byId = Object.fromEntries(stages.map((s) => [s.id, s])) as Record<StageId, (typeof stages)[number]>

  const airInt = clamp(r.exhaust.vDot / r.inputs.fanVmax, 0.12, 1)
  const waterInt = clamp(r.inputs.waterFlow / 1500, 0.12, 1)
  // Flow animation speeds scale with throughput. The fan is intentionally
  // static, so no fan-speed here.
  const style = {
    '--air-speed': `${(3.2 - airInt * 1.8).toFixed(2)}s`,
    '--water-speed': `${(3.4 - waterInt * 1.9).toFixed(2)}s`,
  } as CSSProperties

  const hotWaterColor = '#ff7a4d'
  const coldWaterColor = '#4aa3ff'

  const zone = (id: StageId) => {
    const hz = HOTZONES[id]
    const isSel = selected === id
    return (
      <g
        className={`tower-zone ${isSel ? 'is-selected' : ''}`}
        role="button"
        tabIndex={0}
        aria-label={`${byId[id].name} — select for details`}
        aria-pressed={isSel}
        onClick={() => onSelect(id)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onSelect(id)
          }
        }}
      >
        {isSel && (
          <rect
            className="zone-highlight"
            x={118}
            y={hz.y}
            width={326}
            height={hz.h}
            rx={9}
            style={{ stroke: byId[id].accent, fill: `${byId[id].accent}14` }}
          />
        )}
        <rect x={118} y={hz.y} width={326} height={hz.h} fill="transparent" />
      </g>
    )
  }

  // Leader-line label with the always-visible key metric.
  const label = (l: ZoneLabel) => {
    const s = byId[l.id]
    const isSel = selected === l.id
    const lx0 = 452
    return (
      <g
        key={l.id}
        className={`tower-label ${isSel ? 'is-selected' : ''}`}
        role="button"
        tabIndex={0}
        aria-label={`${s.name} — select for details`}
        onClick={() => onSelect(l.id)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onSelect(l.id)
          }
        }}
      >
        <path
          className="leader"
          d={`M${l.anchor[0]} ${l.anchor[1]} H${lx0 - 8}`}
          style={{ stroke: isSel ? s.accent : undefined }}
        />
        <circle cx={l.anchor[0]} cy={l.anchor[1]} r={2.4} style={{ fill: s.accent }} />
        <rect
          className="label-chip"
          x={lx0}
          y={l.labelY - 15}
          width={196}
          height={30}
          rx={7}
          style={isSel ? { stroke: s.accent } : undefined}
        />
        <circle cx={lx0 + 13} cy={l.labelY} r={3} style={{ fill: s.accent }} />
        <text className="label-name" x={lx0 + 24} y={l.labelY - 2}>
          {s.name}
        </text>
        <text className="label-metric" x={lx0 + 24} y={l.labelY + 10}>
          {s.key.sym} {s.key.value} {s.key.unit}
        </text>
      </g>
    )
  }

  return (
    <div className="tower-graphic" style={style}>
      <svg viewBox="0 0 660 470" role="img" aria-labelledby="tower-title tower-desc">
        <title id="tower-title">Induced-draft counterflow cooling tower</title>
        <desc id="tower-desc">
          Cutaway of the cooling tower. Air is drawn up through the fill by the fan
          at the top while water falls down through it; click a labelled region to
          inspect that stage.
        </desc>

        <defs>
          <linearGradient id="tg-air" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#4aa3ff" stopOpacity="0.05" />
            <stop offset="0.5" stopColor="#34d1bf" stopOpacity="0.14" />
            <stop offset="1" stopColor="#ff9f45" stopOpacity="0.16" />
          </linearGradient>
          <linearGradient id="tg-shell" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#1a2634" />
            <stop offset="1" stopColor="#0f1721" />
          </linearGradient>
          <filter id="tg-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3.2" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <marker id="tg-hot" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 z" fill={hotWaterColor} />
          </marker>
          <marker id="tg-cold" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 z" fill={coldWaterColor} />
          </marker>
        </defs>

        {/* ── shell ── */}
        <path
          className="tower-shell"
          d={`M${TOP_L} ${TOP_Y} L${BOT_L} ${BOT_Y} H${BOT_R} L${TOP_R} ${TOP_Y}`}
          fill="url(#tg-shell)"
        />
        {/* interior air tint */}
        <path
          d={`M${lx(TOP_Y + 6)} ${TOP_Y + 6} L${lx(BOT_Y)} ${BOT_Y} H${rx(BOT_Y)} L${rx(TOP_Y + 6)} ${TOP_Y + 6} Z`}
          fill="url(#tg-air)"
        />

        {/* ── fan stack (venturi) ── */}
        <path className="tower-stack" d={`M205 112 C201 92 201 78 196 60 H364 C359 78 359 92 355 112`} />
        <ellipse className="stack-rim" cx="280" cy="60" rx="84" ry="10" />

        {/* exhaust plume (rising) */}
        <g className="tower-plume" aria-hidden="true">
          <path d="M258 54 C250 34 268 24 262 6" />
          <path d="M280 52 C272 30 290 20 284 2" />
          <path d="M302 54 C294 34 312 26 306 8" />
        </g>

        {/* fan (static) */}
        <g className="tower-fan" transform="translate(280 84)" aria-hidden="true">
          <circle className="fan-ring" r="30" />
          <g className="fan-blades">
            <path d="M0 -4 C12 -24 28 -21 21 -9 C15 0 8 4 0 4 Z" />
            <path d="M0 -4 C12 -24 28 -21 21 -9 C15 0 8 4 0 4 Z" transform="rotate(120)" />
            <path d="M0 -4 C12 -24 28 -21 21 -9 C15 0 8 4 0 4 Z" transform="rotate(240)" />
          </g>
          <circle className="fan-hub" r="4" />
        </g>

        {/* ── drift eliminators ── */}
        <g className="tg-drift" aria-hidden="true">
          <path
            d={`M${lx(124) + 6} 124 H${rx(124) - 6} L${rx(146) - 6} 146 H${lx(146) + 6} Z`}
          />
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const x = 200 + i * 32
            return <path key={i} className="drift-chevron" d={`M${x} 128 l10 6 l-10 6`} />
          })}
        </g>

        {/* ── spray / water distribution nozzles ── */}
        <g className="tg-nozzles" aria-hidden="true">
          <rect x={lx(158) + 8} y={155} width={rx(158) - lx(158) - 16} height={7} rx={3} />
          {[0, 1, 2, 3, 4].map((i) => {
            const x = 200 + i * 33
            return (
              <g key={i}>
                <path d={`M${x - 7} 162 H${x + 7} L${x} 174 Z`} className="nozzle" />
              </g>
            )
          })}
        </g>

        {/* ── fill / exchange surface ── */}
        <g className="tg-fill" aria-hidden="true">
          <path
            d={`M${lx(180) + 7} 180 H${rx(180) - 7} L${rx(266) - 7} 266 H${lx(266) + 7} Z`}
          />
          {[192, 204, 216, 228, 240, 252, 264].map((y) => (
            <line key={y} className="fill-line" x1={lx(y) + 9} y1={y} x2={rx(y) - 9} y2={y} />
          ))}
        </g>

        {/* ── rain zone : falling water ── */}
        <g className="tg-water" aria-hidden="true">
          {[210, 240, 270, 300, 330].map((x, i) => (
            <line
              key={x}
              className="water-line"
              x1={x}
              y1={274}
              x2={x - 3}
              y2={340}
              style={{ animationDelay: `${i * -0.4}s` }}
            />
          ))}
        </g>

        {/* ── rising air ── */}
        <g className="tg-air" aria-hidden="true">
          {[225, 258, 291, 324].map((x, i) => (
            <line
              key={x}
              className="air-line"
              x1={x}
              y1={348}
              x2={x}
              y2={150}
              style={{ animationDelay: `${i * -0.55}s` }}
            />
          ))}
        </g>

        {/* ── louvers + air suction ── */}
        <g className="tg-louvers" aria-hidden="true">
          {[292, 306, 320, 334].map((y) => (
            <line key={`l${y}`} x1={lx(y)} y1={y} x2={lx(y) + 22} y2={y + 8} />
          ))}
          {[292, 306, 320, 334].map((y) => (
            <line key={`r${y}`} x1={rx(y)} y1={y} x2={rx(y) - 22} y2={y + 8} />
          ))}
          <path className="suction" d="M92 316 H150" markerEnd="url(#tg-cold)" />
          <path className="suction" d="M568 316 H510" markerEnd="url(#tg-cold)" />
          <text className="suction-label" x="88" y="308" textAnchor="end">air ↺</text>
        </g>

        {/* ── basin ── */}
        <g className="tg-basin" aria-hidden="true">
          <path d={`M${lx(346)} 346 H${rx(346)} L${rx(392)} 392 H${lx(392)} Z`} className="basin-shell" />
          <path
            d={`M${lx(352) + 4} 356 Q280 348 ${rx(352) - 4} 356`}
            className="basin-water"
          />
        </g>

        {/* ── outlet arrows ── */}
        <g className="tg-outlet" aria-hidden="true">
          <path d="M262 20 V2" />
          <path d="M298 20 V2" />
        </g>

        {/* ── hot water in ── */}
        <g className="tg-pipe hot">
          <path className="pipe-underlay" d="M40 158 H150" />
          <path className="pipe-flow" d="M40 158 H150" markerEnd="url(#tg-hot)" style={{ stroke: hotWaterColor }} />
          <text className="pipe-label" x="40" y="150">HOT · {fmt(r.inputs.waterHot)} °C</text>
        </g>

        {/* ── cold water out ── */}
        <g className="tg-pipe cold">
          <path className="pipe-underlay" d={`M${rx(380)} 380 H612`} />
          <path className="pipe-flow" d={`M${rx(380)} 380 H612`} markerEnd="url(#tg-cold)" style={{ stroke: coldWaterColor }} />
          <text className="pipe-label" x="612" y="372" textAnchor="end">COLD · {fmt(r.inputs.waterCold)} °C</text>
        </g>

        {/* labels + click zones on top */}
        {LABELS.map(label)}
        {(['exhaust', 'fan', 'drift', 'fill', 'inlet'] as StageId[]).map((id) => (
          <g key={id}>{zone(id)}</g>
        ))}
      </svg>
    </div>
  )
}
