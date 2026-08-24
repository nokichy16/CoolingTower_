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
import {
  buildPsychrometricChart,
  type PsychrometricChartData,
} from '../lib/psychrometric-chart'
import { fmt } from '../lib/format'

const AXIS = '#4c4943'
const GRID = '#d4cfc5'
const LINE = '#aaa49a'
const RH_MAIN = '#4d7fd4'
const RH_FAINT = 'rgba(37, 99, 235, 0.4)'
const ENTHALPY = 'rgba(185, 28, 28, 0.68)'
const PATH = '#111111'
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
  chart: PsychrometricChartData
}

/**
 * Only the relative-humidity curves are reported. Listing every enthalpy line
 * as well turns the tooltip into a wall of numbers for no gain.
 */
function ChartTooltip({ active, label, payload, chart }: TooltipProps) {
  if (!active || !payload?.length) return null

  const hoveredTemperature = Number(label)
  const stateThreshold = ((chart.maxT - chart.minT) / 80) * 1.25
  const nearestState = [chart.state1, chart.state2]
    .map((state, index) => ({
      state,
      index: index + 1,
      distance: Math.abs(state.t - hoveredTemperature),
    }))
    .sort((a, b) => a.distance - b.distance)[0]

  if (nearestState && nearestState.distance <= stateThreshold) {
    const { state, index } = nearestState
    const name = index === 1 ? 'Plume' : 'Recovery outlet'
    return (
      <div className="psychro-tip is-state">
        <strong>State {index} · {name}</strong>
        <span>T = {fmt(state.t, 1)} °C</span>
        <span>{fmt(state.rh, 1)}% RH · {fmt(state.w, 2)} g/kg da</span>
      </div>
    )
  }

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
      <div className="chart-title-row">
        <h4>Psychrometric process</h4>
        <div className="chart-legend" aria-label="Chart legend">
          <span><i className="is-rh" />Relative humidity</span>
          <span><i className="is-enthalpy" />Enthalpy</span>
          <span><i className="is-process" />Process path</span>
        </div>
      </div>

      <div
        className="chart"
        role="img"
        aria-label={`Psychrometric process from plume state ${fmt(c.state1.t, 1)} degrees Celsius and ${fmt(c.state1.rh, 1)} percent relative humidity to saturated recovery state ${fmt(c.state2.t, 1)} degrees Celsius. Humidity ratio decreases from ${fmt(c.state1.w, 2)} to ${fmt(c.state2.w, 2)} grams of water per kilogram of dry air.`}
      >
        <ResponsiveContainer width="100%" height={390}>
          <LineChart
            data={c.rows}
            margin={{ top: 24, right: 34, bottom: 12, left: 6 }}
          >
            <defs>
              <marker
                id="psychro-process-arrow"
                viewBox="0 0 10 10"
                refX="5"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill={PATH} />
              </marker>
            </defs>
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
            <Tooltip content={<ChartTooltip chart={c} />} />

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
                markerStart="url(#psychro-process-arrow)"
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

      <div className="psychro-table-wrap">
        <table className="psychro-table">
          <thead>
            <tr>
              <th>State</th>
              <th>Temperature</th>
              <th>Relative humidity</th>
              <th>Humidity ratio</th>
              <th>Enthalpy</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th>1 · Plume</th>
              <td>{fmt(c.state1.t, 1)} °C</td>
              <td>{fmt(c.state1.rh, 1)}%</td>
              <td>{fmt(c.state1.w, 2)} g/kg da</td>
              <td>{fmt(c.state1.h, 2)} kJ/kg da</td>
            </tr>
            <tr>
              <th>2 · Recovery outlet</th>
              <td>{fmt(c.state2.t, 1)} °C</td>
              <td>Saturated</td>
              <td>{fmt(c.state2.w, 2)} g/kg da</td>
              <td>{fmt(c.state2.h, 2)} kJ/kg da</td>
            </tr>
          </tbody>
        </table>
      </div>

    </section>
  )
}
