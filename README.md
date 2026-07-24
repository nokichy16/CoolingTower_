# Data Center Cooling · Water-Recovery Explorer

An interactive data-center heat-rejection assessment tool built around a
**counterflow, induced-draft, open-circuit cooling tower with film fill**. Adjust
any ambient, water-loop, geometry, loss, fan, or recovery condition and watch it
ripple through the facility graphic and the whole tower air path in real time.

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
- **Drift eliminator (3)** — composition unchanged; a pressure loss plus drift removal.
- **Fan (4)** — the pressure balance closes here. System resistance rises with
  flow while the fan delivers less; the dry-air mass flow `ṁ_a` is solved by
  bisection at the point where `Σ Δp` equals fan delivery.
- **Exhaust (5)** — the saturated handoff state; all the recovery calc needs.
- **Condensed state** — cool the exhaust to `T₅` along the saturation line;
  `Δω`, `Δh`, and the headline `e`, split into latent and sensible duty.
- **Water balance** — evaporation, drift, blowdown and makeup, hung off the exhaust.

## Layout

- `src/lib/psychrometrics.ts` — pure moist-air functions (pSat, ω, h, ρ, dew point,
  wet bulb, saturation-enthalpy inversion). No state.
- `src/lib/model.ts` — the tower chain and the coupled fan/pressure solve.
- `src/components/DataCenterVisual.tsx` — live facility, water-loop, cooling-tower,
  and exhaust-recovery graphic.
- `src/components/TowerExplorer.tsx` — compact selectable air-path stage explorer.
- `src/components/Field.tsx` — linked sliders and bounded exact-value inputs.
- `src/components/ResultPanel.tsx` — recovery result, proportional water-balance
  flow, operating-point chart, and model-boundary warnings.
- `src/components/` — controls, staged air-path readouts, system graphic, result panel.
