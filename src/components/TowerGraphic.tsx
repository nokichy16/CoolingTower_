import { useEffect, useState, type CSSProperties } from 'react'
import type { TowerResults } from '../lib/model'
import { STAGE_META, type StageId } from '../lib/stages'
import { fmt } from '../lib/format'
import { selectOnKey } from './selectOnKey'

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

type GraphicZoneId = StageId

interface ZoneLabel {
  id: GraphicZoneId
  anchor: [number, number]
}

interface GraphicInfo {
  name: string
  reading: string
  control: StageId
  accent: string
}

/** The tower is drawn this far down, so the recovery unit sits on top. */
const DY = 96
/** The tower body below the stack is drawn this much taller than it is wide. */
const SY = 1.4
/** A y position in the tower body after the vertical stretch. */
const sy = (y: number) => TOP_Y + (y - TOP_Y) * SY
const BODY = `translate(0 ${TOP_Y}) scale(1 ${SY}) translate(0 ${-TOP_Y})`

const LABELS: ZoneLabel[] = [
  { id: 'recovery', anchor: [350, 40 - DY] },
  { id: 'fan', anchor: [320, 84] },
  { id: 'droplets', anchor: [360, sy(134)] },
  { id: 'drift', anchor: [372, sy(172)] },
  { id: 'plume', anchor: [400, sy(250)] },
]

/** Stage numbers shown on the drawing; the drawing is the stage selector. */
const NUMBER: Record<GraphicZoneId, string> = {
  plume: '1A',
  drift: '1B',
  droplets: '2',
  fan: '3',
  recovery: '4',
}

const HOTZONES: Record<
  GraphicZoneId,
  { x: number; y: number; width: number; height: number }
> = {
  fan: { x: 118, y: 58, width: 326, height: 58 },
  droplets: { x: 118, y: sy(116), width: 326, height: 38 * SY },
  drift: { x: 118, y: sy(154), width: 326, height: 44 * SY },
  plume: { x: 118, y: sy(198), width: 326, height: 166 * SY },
  recovery: { x: 196, y: 2 - DY, width: 168, height: 96 },
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
  const [graphicZone, setGraphicZone] = useState<GraphicZoneId>(selected)

  useEffect(() => {
    setGraphicZone(selected)
  }, [selected])

  const info: Record<GraphicZoneId, GraphicInfo> = {
    plume: {
      name: 'Plume',
      reading: `T ${fmt(r.plume.t)}°C · RH ${fmt(r.plume.rh, 0)}%`,
      control: 'plume',
      accent: STAGE_META.plume.accent,
    },
    drift: {
      name: 'Drift droplets',
      reading: `Entering ${fmt(r.droplets.driftInlet, 3)} kg/s`,
      control: 'drift',
      accent: STAGE_META.drift.accent,
    },
    droplets: {
      name: 'Drift eliminator',
      reading: `Escaping ${fmt(100 * r.droplets.massEscaping, 1)} %`,
      control: 'droplets',
      accent: STAGE_META.droplets.accent,
    },
    fan: {
      name: 'Fan',
      reading: `Air power ${fmt(r.droplets.fanAirPower, 1)} kW`,
      control: 'fan',
      accent: STAGE_META.fan.accent,
    },
    recovery: {
      name: 'Recovery',
      reading: `Water ${fmt(r.recovery.mDotCond, 2)} kg/s`,
      control: 'recovery',
      accent: STAGE_META.recovery.accent,
    },
  }
  const graphicInfo = (id: GraphicZoneId): GraphicInfo => info[id]
  const pick = (id: GraphicZoneId) => {
    setGraphicZone(id)
    onSelect(info[id].control)
  }

  const airIntensity = clamp(r.plume.velocity / 10, 0.12, 1)
  const style = {
    '--air-speed': `${(3.2 - airIntensity * 1.8).toFixed(2)}s`,
  } as CSSProperties

  const zone = (id: GraphicZoneId) => {
    const bounds = HOTZONES[id]
    const info = graphicInfo(id)
    const isSelected = graphicZone === id
    return (
      <g
        className={`tower-zone${isSelected ? ' is-selected' : ''}`}
        role="button"
        tabIndex={0}
        aria-label={`${info.name}, ${info.reading}, select station`}
        aria-pressed={isSelected}
        onClick={() => pick(id)}
        onKeyDown={selectOnKey(() => pick(id))}
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

  const label = ({ id, anchor }: ZoneLabel) => {
    const info = graphicInfo(id)
    const isSelected = graphicZone === id
    const labelX = 440
    const labelY = anchor[1]
    return (
      <g
        key={id}
        className={`tower-label${isSelected ? ' is-selected' : ''}`}
        role="button"
        tabIndex={0}
        aria-label={`${info.name}, ${info.reading}, select station`}
        onClick={() => pick(id)}
        onKeyDown={selectOnKey(() => pick(id))}
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
          className="label-badge"
          x={labelX - 6}
          y={labelY - 11}
          width={30}
          height={20}
          rx={10}
          style={{ fill: info.accent }}
        />
        <text className="label-number" x={labelX + 9} y={labelY + 4} textAnchor="middle">
          {NUMBER[id]}
        </text>
        <text className="label-name" x={labelX + 30} y={labelY - 3}>
          {info.name}
        </text>
        <text className="label-value" x={labelX + 30} y={labelY + 13}>
          {info.reading}
        </text>
      </g>
    )
  }

  return (
    <div className="tower-graphic" style={style}>
      <svg
        viewBox="92 0 532 606"
        role="img"
        aria-labelledby="tower-title tower-desc"
      >
        <title id="tower-title">Cooling-tower plume process</title>
        <desc id="tower-desc">
          Cooling-tower cutaway. Select a part to open its stage: 1A plume,
          1B drift droplets, 2 drift eliminator, 3 fan, 4 recovery.
        </desc>

        <g
          className={`tg-recovery${r.recovery.feasible ? '' : ' is-idle'}`}
          transform={`translate(0 ${DY})`}
        >
          {/* hood from the fan stack up to the condenser */}
          <path className="rec-hood" d="M200 56 L226 -6 H334 L360 56" />
          <rect className="rec-shell" x="210" y="-88" width="140" height="82" rx="9" />
          <path className="rec-coil" d="M228 -70 H332 M228 -56 H332 M228 -42 H332" />
          <path className="rec-drop" d="M280 -36 C272 -24 274 -16 280 -12 C286 -16 288 -24 280 -36Z" />
        </g>

        <g transform={`translate(0 ${DY})`}>
        <g className="tg-body" transform={BODY}>
        <path
          className="tower-shell"
          d={`M${TOP_L} ${TOP_Y} L${BOT_L} ${BOT_Y} H${BOT_R} L${TOP_R} ${TOP_Y}`}
        />
        <path
          className="tower-context-fill"
          d={`M${lx(TOP_Y + 6)} ${TOP_Y + 6} L${lx(
            BOT_Y,
          )} ${BOT_Y} H${rx(BOT_Y)} L${rx(TOP_Y + 6)} ${
            TOP_Y + 6
          } Z`}
        />

        </g>

        <path
          className="tower-stack"
          d="M205 112 C201 92 201 78 196 60 H364 C359 78 359 92 355 112"
        />
        <ellipse className="stack-rim" cx="280" cy="60" rx="84" ry="10" />

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

        <g className="tg-body" transform={BODY}>
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
          />
          <path
            className="suction"
            d="M568 316 H510"
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
          />
          <text className="pipe-label" x="40" y="150">
            HOT WATER IN
          </text>
        </g>

        </g>

        {LABELS.map(label)}
        {zone('fan')}
        {zone('droplets')}
        {zone('drift')}
        {zone('plume')}
        {zone('recovery')}
        </g>
      </svg>
    </div>
  )
}
