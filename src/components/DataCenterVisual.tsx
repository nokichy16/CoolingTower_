import type { CSSProperties } from 'react'
import type { TowerResults } from '../lib/model'
import { fmt } from '../lib/format'

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

/**
 * Facility-wide view of the heat-rejection loop. All labels and motion are
 * driven by the current cooling-tower result so the picture changes with the
 * controls instead of acting as a static illustration.
 */
export default function DataCenterVisual({ r }: { r: TowerResults }) {
  const heatLoadMw = r.qReject / 1000
  const heatIntensity = clamp(r.qReject / 50_000, 0.12, 1)
  const waterIntensity = clamp(r.inputs.waterFlow / 1_500, 0.12, 1)
  const airIntensity = clamp(r.exhaust.vDot / r.inputs.fanVmax, 0.12, 1)
  const recoveryPct =
    r.water.evap > 0 ? clamp((r.condensed.mDotCond / r.water.evap) * 100, 0, 100) : 0

  const visualStyle = {
    '--fan-speed': `${(2.4 - airIntensity * 1.55).toFixed(2)}s`,
    '--air-speed': `${(3.2 - airIntensity * 1.8).toFixed(2)}s`,
    '--water-speed': `${(3.4 - waterIntensity * 1.9).toFixed(2)}s`,
    '--heat-opacity': (0.28 + heatIntensity * 0.62).toFixed(2),
  } as CSSProperties

  const rackLevels = [0.76, 0.92, 0.68, 0.84].map((factor) =>
    clamp(18 + heatIntensity * 54 * factor, 18, 72),
  )

  return (
    <div className="system-visual" style={visualStyle}>
      <div className="visual-toolbar">
        <div>
          <span className="eyebrow">Live system view</span>
          <h3>Data hall → water loop → cooling tower</h3>
        </div>
        <div className="live-state">
          <span className="live-dot" />
          Inputs linked
        </div>
      </div>

      <svg
        className="facility-svg"
        viewBox="0 0 980 510"
        role="img"
        aria-labelledby="facility-title facility-desc"
      >
        <title id="facility-title">Interactive data-center cooling system</title>
        <desc id="facility-desc">
          Server heat moves through a hot-water loop to a counterflow cooling
          tower. Cold water returns to the data hall and a recovery unit
          condenses part of the tower exhaust.
        </desc>

        <defs>
          <linearGradient id="hall-shell" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1c2633" />
            <stop offset="1" stopColor="#111923" />
          </linearGradient>
          <linearGradient id="tower-shell" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#182632" />
            <stop offset="1" stopColor="#101821" />
          </linearGradient>
          <linearGradient id="rack-heat" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#ff9f45" stopOpacity="0.3" />
            <stop offset="1" stopColor="#ff6f3c" stopOpacity="0.95" />
          </linearGradient>
          <linearGradient id="tower-air" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#4aa3ff" stopOpacity="0.08" />
            <stop offset="0.55" stopColor="#34d1bf" stopOpacity="0.18" />
            <stop offset="1" stopColor="#ff9f45" stopOpacity="0.2" />
          </linearGradient>
          <filter id="soft-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <marker
            id="hot-arrow"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#ff9f45" />
          </marker>
          <marker
            id="cold-arrow"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#4aa3ff" />
          </marker>
        </defs>

        <g className="floor-grid" aria-hidden="true">
          {[110, 155, 200, 245, 290, 335, 380, 425].map((y) => (
            <line key={`h-${y}`} x1="22" y1={y} x2="958" y2={y} />
          ))}
          {[70, 150, 230, 310, 390, 470, 550, 630, 710, 790, 870, 950].map((x) => (
            <line key={`v-${x}`} x1={x} y1="82" x2={x} y2="450" />
          ))}
        </g>

        {/* Data hall */}
        <g className="data-hall">
          <path d="M42 161 L72 122 H334 L366 161 V405 H42 Z" fill="url(#hall-shell)" />
          <path d="M72 122 H334 L366 161 H42 Z" className="building-roof" />
          <rect x="42" y="161" width="324" height="244" className="building-outline" />
          <text x="68" y="151" className="zone-kicker">DATA CENTER</text>
          <text x="68" y="184" className="zone-title">DATA HALL</text>
          <text x="68" y="204" className="zone-value">{fmt(heatLoadMw, 1)} MW thermal load</text>

          <g className="racks" transform="translate(68 233)">
            {rackLevels.map((level, index) => {
              const x = index * 66
              return (
                <g key={index} transform={`translate(${x} 0)`}>
                  <rect width="50" height="126" rx="4" className="rack-shell" />
                  <rect
                    x="5"
                    y={116 - level}
                    width="40"
                    height={level}
                    rx="2"
                    fill="url(#rack-heat)"
                    className="rack-load"
                  />
                  {[12, 31, 50, 69, 88, 107].map((y) => (
                    <g key={y}>
                      <line x1="7" y1={y} x2="43" y2={y} className="rack-slot" />
                      <circle cx="39" cy={y - 5} r="1.5" className="rack-led" />
                    </g>
                  ))}
                </g>
              )
            })}
          </g>

          <g className="heat-waves" aria-hidden="true">
            <path d="M102 226 C94 213 112 205 104 191" />
            <path d="M168 226 C160 213 178 205 170 191" />
            <path d="M234 226 C226 213 244 205 236 191" />
            <path d="M300 226 C292 213 310 205 302 191" />
          </g>

          <g transform="translate(292 326)">
            <rect width="55" height="55" rx="8" className="pump-box" />
            <circle cx="27.5" cy="27.5" r="13" className="pump-ring" />
            <path d="M24 18 L35 27.5 L24 37 Z" className="pump-impeller" />
          </g>
          <text x="319" y="396" className="component-label" textAnchor="middle">PUMP</text>
        </g>

        {/* Heat exchange module */}
        <g className="heat-exchanger">
          <rect x="424" y="188" width="142" height="142" rx="15" className="module-shell" />
          <text x="495" y="215" className="module-kicker" textAnchor="middle">HEAT TRANSFER</text>
          <path d="M450 241 C468 222 486 260 504 241 S540 260 546 241" className="coil hot-coil" />
          <path d="M450 278 C468 259 486 297 504 278 S540 297 546 278" className="coil cold-coil" />
          <circle cx="460" cy="306" r="3" className="hot-node" />
          <circle cx="530" cy="306" r="3" className="cold-node" />
          <text x="495" y="316" className="component-label" textAnchor="middle">LOOP INTERFACE</text>
        </g>

        {/* Cooling tower */}
        <g className="cooling-tower">
          <path d="M669 128 L707 100 H864 L902 128 V420 H669 Z" fill="url(#tower-shell)" />
          <path d="M669 128 L707 100 H864 L902 128" className="tower-outline" />
          <path d="M669 128 V420 H902 V128" className="tower-outline" />
          <path d="M689 394 L689 225 Q786 196 882 225 V394 Z" fill="url(#tower-air)" />
          <text x="694" y="151" className="zone-kicker">HEAT REJECTION</text>
          <text x="694" y="174" className="zone-title">COOLING TOWER</text>

          <g className="fan" transform="translate(786 107)" aria-hidden="true">
            <circle r="31" className="fan-ring" />
            <g className="fan-blades">
              <path d="M0 -4 C12 -25 29 -22 22 -9 C16 0 8 4 0 4 Z" />
              <path d="M0 -4 C12 -25 29 -22 22 -9 C16 0 8 4 0 4 Z" transform="rotate(120)" />
              <path d="M0 -4 C12 -25 29 -22 22 -9 C16 0 8 4 0 4 Z" transform="rotate(240)" />
            </g>
            <circle r="4" className="fan-hub" />
          </g>

          <g className="drift-bank" aria-hidden="true">
            {[702, 730, 758, 786, 814, 842, 870].map((x) => (
              <path key={x} d={`M${x} 195 l11 7 l-11 7`} />
            ))}
          </g>

          <g className="fill-bank" aria-hidden="true">
            <rect x="695" y="254" width="181" height="76" />
            {[266, 278, 290, 302, 314, 326].map((y) => (
              <line key={y} x1="700" y1={y} x2="871" y2={y} />
            ))}
          </g>

          <g className="water-drops" aria-hidden="true">
            {[714, 750, 786, 822, 858].map((x, index) => (
              <g key={x} style={{ animationDelay: `${index * -0.37}s` }}>
                <path d={`M${x} 221 C${x - 4} 228 ${x - 4} 233 ${x} 236 C${x + 4} 233 ${x + 4} 228 ${x} 221Z`} />
              </g>
            ))}
          </g>

          <g className="air-streams" aria-hidden="true">
            {[730, 786, 842].map((x, index) => (
              <path
                key={x}
                d={`M${x} 382 C${x - 10} 350 ${x + 12} 326 ${x} 295 C${x - 12} 266 ${x + 10} 236 ${x} 211`}
                style={{ animationDelay: `${index * -0.5}s` }}
              />
            ))}
          </g>

          <g className="ambient-arrows" aria-hidden="true">
            <path d="M638 337 H690" markerEnd="url(#cold-arrow)" />
            <path d="M933 337 H881" markerEnd="url(#cold-arrow)" />
          </g>

          <rect x="682" y="377" width="207" height="43" className="basin" />
          <path d="M690 390 Q715 382 740 390 T790 390 T840 390 T882 390" className="basin-water" />
          <text x="786" y="413" className="component-label" textAnchor="middle">COLD-WATER BASIN</text>
        </g>

        {/* Exhaust and recovery */}
        <g className="exhaust-plume" aria-hidden="true">
          <path d="M758 78 C747 58 766 49 760 28" />
          <path d="M786 75 C777 54 795 44 788 20" />
          <path d="M815 78 C806 58 824 50 818 29" />
        </g>
        <text x="786" y="18" className="plume-label" textAnchor="middle">
          {fmt(r.exhaust.t)} °C exhaust · {fmt(r.exhaust.vDot, 0)} m³/s
        </text>

        <g className={`recovery-unit ${r.condensed.feasible ? 'is-active' : 'is-idle'}`}>
          <path d="M889 72 H936 V188 H907" className="recovery-duct" />
          <rect x="879" y="157" width="76" height="72" rx="12" className="recovery-shell" />
          <path d="M898 177 H937 M898 188 H937 M898 199 H937" className="recovery-coil" />
          <path d="M917 205 C910 217 911 223 917 226 C923 223 924 217 917 205Z" className="recovery-drop" />
          <text x="917" y="248" className="component-label" textAnchor="middle">WATER RECOVERY</text>
          <text x="917" y="264" className="component-value" textAnchor="middle">
            {fmt(r.condensed.mDotCond, 2)} kg/s
          </text>
        </g>

        {/* Pipework */}
        <g className="pipework">
          <path d="M347 246 H401 Q424 246 424 223" className="pipe-underlay" />
          <path d="M347 246 H401 Q424 246 424 223" className="hot-pipe flow-line" markerEnd="url(#hot-arrow)" />
          <path d="M566 223 H624 Q650 223 669 245" className="pipe-underlay" />
          <path d="M566 223 H624 Q650 223 669 245" className="hot-pipe flow-line" markerEnd="url(#hot-arrow)" />

          <path d="M669 389 H613 Q572 389 566 309" className="pipe-underlay" />
          <path d="M669 389 H613 Q572 389 566 309" className="cold-pipe flow-line" markerEnd="url(#cold-arrow)" />
          <path d="M424 309 Q398 309 382 333 H347" className="pipe-underlay" />
          <path d="M424 309 Q398 309 382 333 H347" className="cold-pipe flow-line" markerEnd="url(#cold-arrow)" />
        </g>

        <g className="pipe-labels">
          <rect x="372" y="219" width="90" height="22" rx="11" />
          <text x="417" y="234" textAnchor="middle">HOT · {fmt(r.inputs.waterHot)} °C</text>
          <rect x="367" y="341" width="98" height="22" rx="11" />
          <text x="416" y="356" textAnchor="middle">COLD · {fmt(r.inputs.waterCold)} °C</text>
        </g>

        <g className="ambient-label">
          <rect x="692" y="348" width="188" height="24" rx="12" />
          <text x="786" y="364" textAnchor="middle">
            AMBIENT · {fmt(r.inlet.t)} °C · {fmt(r.inlet.rh, 0)}% RH
          </text>
        </g>
      </svg>

      <div className="visual-metrics">
        <div>
          <span>Thermal load</span>
          <strong>{fmt(heatLoadMw, 1)} MW</strong>
          <small>from water-side ΔT</small>
        </div>
        <div>
          <span>Loop flow</span>
          <strong>{fmt(r.inputs.waterFlow, 0)} kg/s</strong>
          <small>{fmt(r.inputs.waterHot - r.inputs.waterCold)} °C range</small>
        </div>
        <div>
          <span>Tower fan</span>
          <strong>{fmt(r.fan.power)} kW</strong>
          <small>{fmt(r.mDotAir)} kg/s dry air</small>
        </div>
        <div>
          <span>Vapour recovered</span>
          <strong>{fmt(r.condensed.mDotCond, 2)} kg/s</strong>
          <small>{fmt(recoveryPct, 0)}% of evaporation</small>
        </div>
      </div>
    </div>
  )
}
