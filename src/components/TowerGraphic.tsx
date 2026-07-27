import { useState, type CSSProperties } from 'react'
import type { TowerResults } from '../lib/model'
import { buildStages, type StageId } from '../lib/stages'
import { fmt } from '../lib/format'

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

// Preserve the original induced-draft cooling-tower cutaway geometry.
const TOP_Y = 112
const BOT_Y = 360
const TOP_L = 205
const TOP_R = 355
const BOT_L = 128
const BOT_R = 432
const lx = (y: number) =>
  TOP_L + ((y - TOP_Y) / (BOT_Y - TOP_Y)) * (BOT_L - TOP_L)
const rx = (y: number) =>
  TOP_R + ((y - TOP_Y) / (BOT_Y - TOP_Y)) * (BOT_R - TOP_R)

type GraphicZoneId =
  | 'inlet'
  | 'fill'
  | 'droplets'
  | 'fan'
  | 'exhaust'
  | 'recovery'

interface ZoneLabel {
  id: Exclude<GraphicZoneId, 'recovery'>
  labelY: number
  anchor: [number, number]
}

const LABELS: ZoneLabel[] = [
  { id: 'exhaust', labelY: 40, anchor: [312, 40] },
  { id: 'fan', labelY: 96, anchor: [338, 90] },
  { id: 'droplets', labelY: 142, anchor: [360, 134] },
  { id: 'fill', labelY: 220, anchor: [396, 214] },
  { id: 'inlet', labelY: 312, anchor: [420, 320] },
]

const HOTZONES: Record<
  GraphicZoneId,
  { x: number; y: number; width: number; height: number }
> = {
  exhaust: { x: 118, y: 8, width: 326, height: 62 },
  fan: { x: 118, y: 70, width: 326, height: 46 },
  droplets: { x: 118, y: 116, width: 326, height: 38 },
  fill: { x: 118, y: 154, width: 326, height: 114 },
  inlet: { x: 118, y: 268, width: 326, height: 96 },
  recovery: { x: 16, y: 4, width: 100, height: 108 },
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
  const byId = Object.fromEntries(
    stages.map((stage) => [stage.id, stage]),
  ) as Record<StageId, (typeof stages)[number]>
  const [graphicZone, setGraphicZone] = useState<GraphicZoneId>(
    selected === 'droplets'
      ? 'droplets'
      : selected === 'recovery'
        ? 'recovery'
        : 'fill',
  )

  const graphicInfo = (id: GraphicZoneId) => {
    if (id === 'droplets') {
      return {
        name: 'Drift eliminator',
        metric: `${fmt(r.droplets.reductionPct, 1)}% removed`,
        control: 'droplets' as StageId,
        accent: byId.droplets.accent,
      }
    }
    if (id === 'recovery') {
      return {
        name: 'Recovery',
        metric: `${fmt(r.recovery.mDotRecovered, 2)} kg/s`,
        control: 'recovery' as StageId,
        accent: byId.recovery.accent,
      }
    }

    const metrics: Record<
      Exclude<GraphicZoneId, 'droplets' | 'recovery'>,
      { name: string; metric: string }
    > = {
      inlet: {
        name: 'Air inlet',
        metric: `P ${fmt(r.inputs.pressure / 1000)} kPa`,
      },
      fill: {
        name: 'Fill · plume state',
        metric: `T₄ ${fmt(r.plume.t)} °C · RH ${fmt(r.plume.rh, 0)}%`,
      },
      fan: {
        name: 'Fan',
        metric: `ṁ_a ${fmt(r.inputs.airMassFlow)} kg/s`,
      },
      exhaust: {
        name: 'Exhaust',
        metric: `T_dew ${fmt(r.plume.dewPoint)} °C`,
      },
    }

    return {
      ...metrics[id],
      control: 'plume' as StageId,
      accent: byId.plume.accent,
    }
  }

  const airIntensity = clamp(r.inputs.airMassFlow / 500, 0.12, 1)
  const style = {
    '--air-speed': `${(3.2 - airIntensity * 1.8).toFixed(2)}s`,
    '--water-speed': '2.2s',
  } as CSSProperties

  const hotWaterColor = '#ff7a4d'
  const coldWaterColor = '#4aa3ff'

  const zone = (id: GraphicZoneId) => {
    const bounds = HOTZONES[id]
    const info = graphicInfo(id)
    const isSelected = graphicZone === id
    return (
      <g
        className={`tower-zone${isSelected ? ' is-selected' : ''}`}
        role="button"
        tabIndex={0}
        aria-label={`${info.name}, select connected inputs`}
        aria-pressed={isSelected}
        onClick={() => {
          setGraphicZone(id)
          onSelect(info.control)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            setGraphicZone(id)
            onSelect(info.control)
          }
        }}
      >
        {isSelected && (
          <rect
            className="zone-highlight"
            x={bounds.x}
            y={bounds.y}
            width={bounds.width}
            height={bounds.height}
            rx={9}
            style={{
              stroke: info.accent,
              fill: `${info.accent}14`,
            }}
          />
        )}
        <rect
          x={bounds.x}
          y={bounds.y}
          width={bounds.width}
          height={bounds.height}
          fill="transparent"
        />
      </g>
    )
  }

  const label = ({ id, labelY, anchor }: ZoneLabel) => {
    const info = graphicInfo(id)
    const isSelected = graphicZone === id
    const labelX = 452
    return (
      <g
        key={id}
        className={`tower-label${isSelected ? ' is-selected' : ''}`}
        role="button"
        tabIndex={0}
        aria-label={`${info.name}, select connected inputs`}
        onClick={() => {
          setGraphicZone(id)
          onSelect(info.control)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            setGraphicZone(id)
            onSelect(info.control)
          }
        }}
      >
        <path
          className="leader"
          d={`M${anchor[0]} ${anchor[1]} H${labelX - 8}`}
          style={{ stroke: isSelected ? info.accent : undefined }}
        />
        <circle
          cx={anchor[0]}
          cy={anchor[1]}
          r={2.4}
          style={{ fill: info.accent }}
        />
        <rect
          className="label-chip"
          x={labelX}
          y={labelY - 15}
          width={196}
          height={30}
          rx={7}
          style={isSelected ? { stroke: info.accent } : undefined}
        />
        <circle
          cx={labelX + 13}
          cy={labelY}
          r={3}
          style={{ fill: info.accent }}
        />
        <text className="label-name" x={labelX + 24} y={labelY - 2}>
          {info.name}
        </text>
        <text className="label-metric" x={labelX + 24} y={labelY + 10}>
          {info.metric}
        </text>
      </g>
    )
  }

  return (
    <div className="tower-graphic" style={style}>
      <svg
        viewBox="0 0 660 470"
        role="img"
        aria-labelledby="tower-title tower-desc"
      >
        <title id="tower-title">
          Induced-draft counterflow cooling tower
        </title>
        <desc id="tower-desc">
          Original cooling-tower cutaway. Select the plume, drift eliminator or
          recovery unit to adjust the connected inputs.
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
          <marker
            id="tg-hot"
            viewBox="0 0 10 10"
            refX="7"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M0 0 L10 5 L0 10 z" fill={hotWaterColor} />
          </marker>
          <marker
            id="tg-cold"
            viewBox="0 0 10 10"
            refX="7"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M0 0 L10 5 L0 10 z" fill={coldWaterColor} />
          </marker>
        </defs>

        <path
          className="tower-shell"
          d={`M${TOP_L} ${TOP_Y} L${BOT_L} ${BOT_Y} H${BOT_R} L${TOP_R} ${TOP_Y}`}
          fill="url(#tg-shell)"
        />
        <path
          d={`M${lx(TOP_Y + 6)} ${TOP_Y + 6} L${lx(
            BOT_Y,
          )} ${BOT_Y} H${rx(BOT_Y)} L${rx(TOP_Y + 6)} ${
            TOP_Y + 6
          } Z`}
          fill="url(#tg-air)"
        />

        <path
          className="tower-stack"
          d="M205 112 C201 92 201 78 196 60 H364 C359 78 359 92 355 112"
        />
        <ellipse className="stack-rim" cx="280" cy="60" rx="84" ry="10" />

        <g
          className={`tg-recovery${
            r.recovery.feasible ? '' : ' is-idle'
          }`}
        >
          <path className="rec-duct" d="M196 40 C168 40 140 38 122 44" />
          <rect
            className="rec-shell"
            x="30"
            y="18"
            width="80"
            height="60"
            rx="9"
          />
          <path
            className="rec-coil"
            d="M42 34 H98 M42 46 H98 M42 58 H98"
          />
          <path
            className="rec-drop"
            d="M70 62 C62 74 63 82 70 85 C77 82 78 74 70 62Z"
          />
          <text className="rec-label" x="70" y="96" textAnchor="middle">
            RECOVERY
          </text>
          <text className="rec-value" x="70" y="106" textAnchor="middle">
            {r.recovery.feasible
              ? `${fmt(r.recovery.mDotRecovered, 2)} kg/s`
              : 'inactive'}
          </text>
        </g>

        <g className="tower-plume" aria-hidden="true">
          <path d="M258 54 C250 34 268 24 262 6" />
          <path d="M280 52 C272 30 290 20 284 2" />
          <path d="M302 54 C294 34 312 26 306 8" />
        </g>

        <g className="tower-fan" transform="translate(280 84)" aria-hidden="true">
          <circle className="fan-ring" r="30" />
          <g className="fan-blades">
            <path d="M0 -4 C12 -24 28 -21 21 -9 C15 0 8 4 0 4 Z" />
            <path
              d="M0 -4 C12 -24 28 -21 21 -9 C15 0 8 4 0 4 Z"
              transform="rotate(120)"
            />
            <path
              d="M0 -4 C12 -24 28 -21 21 -9 C15 0 8 4 0 4 Z"
              transform="rotate(240)"
            />
          </g>
          <circle className="fan-hub" r="4" />
        </g>

        <g className="tg-drift" aria-hidden="true">
          <path
            d={`M${lx(124) + 6} 124 H${rx(124) - 6} L${
              rx(146) - 6
            } 146 H${lx(146) + 6} Z`}
          />
          {[0, 1, 2, 3, 4, 5].map((index) => {
            const x = 200 + index * 32
            return (
              <path
                key={index}
                className="drift-chevron"
                d={`M${x} 128 l10 6 l-10 6`}
              />
            )
          })}
        </g>

        <g className="tg-nozzles" aria-hidden="true">
          <rect
            x={lx(158) + 8}
            y={155}
            width={rx(158) - lx(158) - 16}
            height={7}
            rx={3}
          />
          {[0, 1, 2, 3, 4].map((index) => {
            const x = 200 + index * 33
            return (
              <path
                key={index}
                d={`M${x - 7} 162 H${x + 7} L${x} 174 Z`}
                className="nozzle"
              />
            )
          })}
        </g>

        <g className="tg-fill" aria-hidden="true">
          <path
            d={`M${lx(180) + 7} 180 H${rx(180) - 7} L${
              rx(266) - 7
            } 266 H${lx(266) + 7} Z`}
          />
          {[192, 204, 216, 228, 240, 252, 264].map((y) => (
            <line
              key={y}
              className="fill-line"
              x1={lx(y) + 9}
              y1={y}
              x2={rx(y) - 9}
              y2={y}
            />
          ))}
        </g>

        <g className="tg-water" aria-hidden="true">
          {[210, 240, 270, 300, 330].map((x, index) => (
            <line
              key={x}
              className="water-line"
              x1={x}
              y1={274}
              x2={x - 3}
              y2={340}
              style={{ animationDelay: `${index * -0.4}s` }}
            />
          ))}
        </g>

        <g className="tg-air" aria-hidden="true">
          {[225, 258, 291, 324].map((x, index) => (
            <line
              key={x}
              className="air-line"
              x1={x}
              y1={348}
              x2={x}
              y2={150}
              style={{ animationDelay: `${index * -0.55}s` }}
            />
          ))}
        </g>

        <g className="tg-louvers" aria-hidden="true">
          {[292, 306, 320, 334].map((y) => (
            <line
              key={`left-${y}`}
              x1={lx(y)}
              y1={y}
              x2={lx(y) + 22}
              y2={y + 8}
            />
          ))}
          {[292, 306, 320, 334].map((y) => (
            <line
              key={`right-${y}`}
              x1={rx(y)}
              y1={y}
              x2={rx(y) - 22}
              y2={y + 8}
            />
          ))}
          <path
            className="suction"
            d="M92 316 H150"
            markerEnd="url(#tg-cold)"
          />
          <path
            className="suction"
            d="M568 316 H510"
            markerEnd="url(#tg-cold)"
          />
          <text className="suction-label" x="88" y="308" textAnchor="end">
            air ↺
          </text>
        </g>

        <g className="tg-basin" aria-hidden="true">
          <path
            d={`M${lx(346)} 346 H${rx(346)} L${rx(392)} 392 H${lx(
              392,
            )} Z`}
            className="basin-shell"
          />
          <path
            d={`M${lx(352) + 4} 356 Q280 348 ${rx(352) - 4} 356`}
            className="basin-water"
          />
        </g>

        <g className="tg-outlet" aria-hidden="true">
          <path d="M262 20 V2" />
          <path d="M298 20 V2" />
        </g>

        <g className="tg-pipe hot" aria-hidden="true">
          <path className="pipe-underlay" d="M40 158 H150" />
          <path
            className="pipe-flow"
            d="M40 158 H150"
            markerEnd="url(#tg-hot)"
            style={{ stroke: hotWaterColor }}
          />
          <text className="pipe-label" x="40" y="150">
            HOT WATER IN
          </text>
        </g>

        <g className="tg-pipe cold" aria-hidden="true">
          <path
            className="pipe-underlay"
            d={`M${rx(380)} 380 H612`}
          />
          <path
            className="pipe-flow"
            d={`M${rx(380)} 380 H612`}
            markerEnd="url(#tg-cold)"
            style={{ stroke: coldWaterColor }}
          />
          <text
            className="pipe-label"
            x="612"
            y="372"
            textAnchor="end"
          >
            COOLED WATER OUT
          </text>
        </g>

        {LABELS.map(label)}
        {zone('exhaust')}
        {zone('fan')}
        {zone('droplets')}
        {zone('fill')}
        {zone('inlet')}
        {zone('recovery')}
      </svg>
    </div>
  )
}
