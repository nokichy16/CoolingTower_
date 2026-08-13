/**
 * Psychrometric process chart.
 *
 * Ported from the original single-file Plotly webapp. The chart content is the
 * same — relative-humidity background curves, constant-enthalpy lines, and the
 * state 1 → state 2 process path — but it is drawn with the Recharts primitives
 * this project already uses, so the app keeps one chart library and one visual
 * language. The numeric callouts that Plotly drew as paper annotations are
 * plain markup underneath the plot, where they stay legible at any width.
 */

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { TowerResults } from '../lib/model'
import { buildPsychrometricChart } from '../lib/psychrometric-chart'
import { fmt } from '../lib/format'

const AXIS = '#65615b'
const GRID = '#e8e4dd'
const LINE = '#d8d3ca'
const RH_MAIN = '#7da7ef'
const RH_FAINT = 'rgba(37, 99, 235, 0.25)'
const ENTHALPY = 'rgba(220, 38, 38, 0.52)'
const PATH = '#252525'
const STATE_1 = '#2563eb'
const STATE_2 = '#dc2626'

interface TooltipEntry {
  dataKey?: string | number
  value?: number | string
  color?: string
}

interface TooltipProps {
  active?: boolean
  label?: number | string
  payload?: TooltipEntry[]
}

/**
 * Only the relative-humidity curves are reported. Listing every enthalpy line
 * as well turns the tooltip into a wall of numbers for no gain.
 */
function ChartTooltip({ active, label, payload }: TooltipProps) {
  if (!active || !payload?.length) return null
  const rows = payload.filter(
    (entry) =>
      typeof entry.dataKey === 'string' &&
      entry.dataKey.startsWith('rh') &&
      typeof entry.value === 'number',
  )
  if (!rows.length) return null

  return (
    <div className="psychro-tip">
      <strong>T = {fmt(Number(label), 1)} °C</strong>
      {rows.map((entry) => (
        <span key={String(entry.dataKey)}>
          {String(entry.dataKey).replace('rh', '')} % RH ·{' '}
          {fmt(Number(entry.value), 2)} g/kg da
        </span>
      ))}
    </div>
  )
}

export default function PsychrometricChart({ r }: { r: TowerResults }) {
  const c = buildPsychrometricChart(r)

  return (
    <section className="card chart-card psychro-card">
      <h4>Psychrometric process chart</h4>
      <p className="card-note">
        Blue curves are relative humidity; dashed red lines are constant
        moist-air enthalpy h (kJ/kg dry air). The path runs from the prescribed
        plume to the saturated recovery outlet.
      </p>

      <div
        className="chart"
        role="img"
        aria-label={`Psychrometric process from plume state ${fmt(c.state1.t, 1)} degrees Celsius and ${fmt(c.state1.rh, 1)} percent relative humidity to saturated recovery state ${fmt(c.state2.t, 1)} degrees Celsius. Humidity ratio decreases from ${fmt(c.state1.w, 2)} to ${fmt(c.state2.w, 2)} grams of water per kilogram of dry air.`}
      >
        <ResponsiveContainer width="100%" height={440}>
          <LineChart
            data={c.rows}
            margin={{ top: 24, right: 34, bottom: 12, left: 6 }}
          >
            <CartesianGrid stroke={GRID} strokeDasharray="0" />
            <XAxis
              dataKey="t"
              type="number"
              domain={[c.minT, c.maxT]}
              allowDataOverflow
              tick={{ fill: AXIS, fontSize: 11 }}
              stroke={LINE}
              tickFormatter={(v: number) => `${fmt(v, 0)}`}
              label={{
                value: 'Dry-bulb temperature  (°C)',
                position: 'insideBottom',
                offset: -4,
                fill: AXIS,
                fontSize: 11,
              }}
            />
            <YAxis
              type="number"
              domain={[c.yMin, c.yMax]}
              allowDataOverflow
              width={62}
              tick={{ fill: AXIS, fontSize: 11 }}
              stroke={LINE}
              label={{
                value: 'W  (g water / kg dry air)',
                angle: -90,
                position: 'insideLeft',
                fill: AXIS,
                fontSize: 11,
              }}
            />
            <Tooltip content={<ChartTooltip />} />

            {c.enthalpySeries.map((s) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                stroke={ENTHALPY}
                strokeWidth={1.5}
                strokeDasharray="5 4"
                dot={false}
                activeDot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
            ))}

            {c.rhSeries.map((s) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                stroke={s.key === 'rh100' ? RH_MAIN : RH_FAINT}
                strokeWidth={s.key === 'rh100' ? 2 : 1.2}
                dot={false}
                activeDot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
            ))}

            {c.enthalpySeries.map((s) => (
              <ReferenceDot
                key={`label-${s.key}`}
                x={s.labelT}
                y={s.labelW}
                r={0}
                label={{
                  value: s.label,
                  position: 'insideBottomRight',
                  fill: '#a61f1f',
                  fontSize: 10,
                }}
              />
            ))}

            {c.rhSeries.map((s) =>
              s.label ? (
                <ReferenceDot
                  key={`label-${s.key}`}
                  x={s.labelT}
                  y={s.labelW}
                  r={0}
                  label={{
                    value: s.label,
                    position: 'insideTopLeft',
                    fill: '#4775c5',
                    fontSize: 10,
                  }}
                />
              ) : null,
            )}

            {c.hasProcess && (
              <Line
                type="monotone"
                dataKey={c.processKey}
                stroke={PATH}
                strokeWidth={3}
                dot={false}
                activeDot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
            )}

            <ReferenceDot
              x={c.state1.t}
              y={c.state1.w}
              r={7}
              fill={STATE_1}
              stroke="#ffffff"
              strokeWidth={3}
              label={{
                value: '1',
                position: 'top',
                fill: STATE_1,
                fontSize: 11,
              }}
            />
            <ReferenceDot
              x={c.state2.t}
              y={c.state2.w}
              r={7}
              fill={STATE_2}
              stroke="#ffffff"
              strokeWidth={3}
              label={{
                value: '2',
                position: 'bottom',
                fill: STATE_2,
                fontSize: 11,
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="psychro-states">
        <div className="psychro-state is-inlet">
          <span className="psychro-state-tag">State 1 · plume</span>
          <strong>
            {fmt(c.state1.t, 1)} °C · {fmt(c.state1.rh, 1)}% RH
          </strong>
          <small>
            W {fmt(c.state1.w, 2)} g/kg da · h {fmt(c.state1.h, 2)} kJ/kg da
          </small>
        </div>
        <div className="psychro-state is-outlet">
          <span className="psychro-state-tag">State 2 · recovery outlet</span>
          <strong>
            {fmt(c.state2.t, 1)} °C · saturated
          </strong>
          <small>
            W {fmt(c.state2.w, 2)} g/kg da · h {fmt(c.state2.h, 2)} kJ/kg da
          </small>
        </div>
      </div>

      <div className="psychro-chips">
        <div className="psychro-chip is-water">
          <strong>{fmt(c.condensedGrams, 3)} g</strong>
          <span>condensed water per kg dry air</span>
        </div>
        <div className="psychro-chip">
          <strong>ΔT {fmt(c.deltaT, 1)} °C</strong>
          <span>dew point {fmt(c.dewPoint, 1)} °C</span>
        </div>
        <div className="psychro-chip is-heat">
          <strong>{fmt(c.heatRemoved, 2)} kJ</strong>
          <span>heat removed per kg dry air</span>
        </div>
      </div>
    </section>
  )
}
