# Data Center Cooling · Water-Recovery Explorer

An interactive data-center heat-rejection assessment tool built around a
**counterflow, induced-draft, open-circuit cooling tower with film fill**. Adjust
the main ambient, water-loop, air-flow and recovery conditions, with geometry,
loss and water-balance assumptions retained under Engineering settings.

**Live website:** https://nokichy16.github.io/CoolingTower_/

> This is a simplified engineering screening and learning tool. Its results
> depend on the stated model assumptions and should not replace a detailed
> tower design or manufacturer performance rating.

The headline output is **e = Δh / Δω** — the energy that must leave the exhaust
per kilogram of water condensed back out of it. That number is what lets you judge
whether a given recovery method is worth using.

## Run

```bash
npm install
npm run dev
```

Then open the URL Vite prints (default http://localhost:5173).

```bash
npm run build   # type-check + production bundle into dist/
```

## How it works

The model walks the air upward, each stage carrying the state set upstream:

**inlet → fill → drift eliminator → fan → exhaust → condensed state → water balance**

- **Inlet (1)** — ambient air state fixed from dry-bulb, RH and pressure.
- **Fill (2)** — the only place water enters the air. An energy balance
  (`Q̇ = ṁ_w·cp·ΔT_water`) sets the exit enthalpy; the exit air is taken as
  saturated, which fixes its temperature and humidity ratio.
- **Drift eliminator (3)** — choose one of the six Ruiz et al. tested
  geometries. The app calculates `Re`, `St`, `Kp`, pressure drop and indicative
  single-droplet collection efficiency at the live face velocity.
- **Fan (4)** — dry-air mass flow `ṁ_a` is prescribed directly. The app
  calculates total system pressure loss and the estimated fan power needed at
  the selected efficiency.
- **Exhaust (5)** — the saturated handoff state; all the recovery calc needs.
- **Condensed state** — cool the exhaust to `T₅` along the saturation line and
  calculate `Δω`, total `Δh`, and the headline `e`.
- **Water balance** — evaporation, drift and modeled makeup, hung off the exhaust.
  Blowdown and water-treatment losses are intentionally excluded for now.

## Layout

The desktop interface uses an always-visible result/status bar, a wider tower
workspace beside the input panel, and full-width engineering output below.
The tower graphic is also the input navigation: selecting inlet, fill, drift
eliminator, fan or exhaust shows only that stage's editable inputs on the right.
The selected stage receives a `Changed` marker when any of its inputs differs
from the default. Tunable loss assumptions are highlighted within their
corresponding stage and remain visually distinct from measured Ruiz geometry.

- `src/lib/psychrometrics.ts` — pure moist-air functions (pSat, ω, h, ρ, dew point,
  wet bulb, saturation-enthalpy inversion). No state.
- `src/lib/model.ts` — the tower chain, pressure losses and recovery calculation.
- `src/lib/eliminators.ts` — Ruiz eliminator A–F library, correlations and
  validity-range checks.
- `src/components/TowerExplorer.tsx` — compact selectable air-path stage explorer.
- `src/components/Field.tsx` — linked sliders and bounded exact-value inputs.
- `src/components/ResultPanel.tsx` — recovery result, proportional water-balance
  flow, operating-point chart, and model-boundary warnings.
- `src/components/` — controls, staged air-path readouts, system graphic, result panel.

## Ruiz correlation limits

The app keeps extrapolated values visible but marks them amber when the paper
does not support the operating point: `2,000 ≤ Re ≤ 15,000`,
`0.443 ≤ v ≤ 4.36 m/s`, `0.2 ≤ St ≤ 2`, `d_d ≥ 25 µm`, plus the published
vane `b/L` and mesh-angle ranges. Collection efficiency is for the selected
representative droplet size and is deliberately not converted into drift as a
percentage of circulating water.
