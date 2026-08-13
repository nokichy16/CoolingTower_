# Plume Water-Recovery Explorer

An interactive learning and screening tool for exploring water recovery from a
cooling-tower exhaust plume.

**Live website:** https://nokichy16.github.io/CoolingTower_/

> This is a simplified engineering model. It estimates psychrometric recovery
> potential and single-size drift-eliminator performance; it does not replace
> tower rating, recovery-equipment selection or manufacturer data.

## Run

```bash
npm install
npm run dev
```

Then open the local URL printed by Vite.

```bash
npm run build
```

## What the user sets

The plume leaving the fill is prescribed directly:

- exhaust-plume temperature `T₄`
- exhaust relative humidity `RH₄`
- atmospheric pressure `P`
- dry-air mass flow `ṁ_a`
- air velocity after the fill `u₄`

The app does not force the plume to saturation. It calculates humidity ratio,
enthalpy, density, volumetric flow and dew point from the selected state. Plume
velocity is used with volumetric flow to calculate the implied discharge area:
`A_plume = V̇/u₄`.

Liquid-droplet performance is controlled separately:

- Ruiz tested eliminator A–F
- representative droplet diameter `d_d`

The eliminator spans the same flow area as the plume in this simplified model.
Its face velocity is therefore a read-only result equal to `u₄`, rather than a
second independent input.

Vapour recovery uses:

- cooling below the calculated dew point `ΔT_dew`

The original cooling-tower cutaway remains the visual navigation, with four
modelled stations: plume, drift eliminator, fan and condensation recovery.
The water-side hardware remains as subdued context because this version does
not calculate the fill or tower water loop.

## Calculations

### Plume state

```text
ω₄ = f(T₄, RH₄, P)
h₄ = 1.006 T₄ + ω₄(2501 + 1.86 T₄)
T_dew = f(ω₄, P)
```

Dry-air mass flow scales the state into total volumetric flow, recovered water
and cooling duty.

### Droplet reduction

```text
u_de = u₄
St = ρ_water u₄ d_d² / (18 μ Lc)
droplets removed (%) = 100 ε(St)
droplets remaining (%) = 100[1 − ε(St)]
P_air = V̇ Δp_de
```

`ε` is the Ruiz collection efficiency for the selected representative droplet
size. It is not an overall mass-removal claim for an unknown real droplet-size
distribution.

The calculation retains the paper-supported diameter and operating-range checks
internally. They are based on `0.2 ≤ St ≤ 2`, the paper's 25 µm measurement
floor, `2,000 ≤ Re ≤ 15,000` and `0.443 ≤ u_de ≤ 4.36 m/s`.
`P_air` is ideal air power for the eliminator pressure loss alone, not
electrical motor power or whole-tower fan duty.

### Vapour recovery

```text
T₅ = T_dew − ΔT_dew
T₅ ≥ 0 °C
ω₅ = ω_sat(T₅, P)

Δω = ω₄ − ω₅
ṁ_theory = ṁ_a Δω

Δh = h₄ − h₅
Q̇_cooling ≈ ṁ_a Δh
e = Δh / Δω
```

The interface reports theoretical condensate only. Cooling duty is an
approximate air-side load and should not be treated as recovery-equipment
selection. The interface labels `e` in plain language as energy required per
kilogram.

The 0 °C outlet limit keeps the recovery calculation inside the liquid-water
saturation range used by the simplified psychrometric model.

### Psychrometric process chart

The recovery panel includes the process chart carried over from the original
single-file plume-recovery Webapp. It shows 25%, 50%, 75% and 100% relative-
humidity curves, constant-enthalpy lines, and the live path from the prescribed
plume to the saturated recovery outlet. The path first cools at constant
humidity ratio to the dew point and then follows the saturation curve as water
condenses.

## Source map

- `src/lib/psychrometrics.ts` — moist-air state, saturation and dew-point functions
- `src/lib/psychrometric-chart.ts` — chart curves, enthalpy lines and process path
- `src/lib/eliminators.ts` — Ruiz A–F geometries, correlations and support checks
- `src/lib/model.ts` — direct plume, droplet and recovery calculations
- `src/lib/stages.ts` — values shown in the stage summaries
- `src/components/Controls.tsx` — bounded plume, droplet and recovery inputs
- `src/components/TowerGraphic.tsx` — preserved cooling-tower cutaway
- `src/components/PsychrometricChart.tsx` — interactive psychrometric process graph
- `src/components/ResultPanel.tsx` — percentage reduction, recovery and cooling results
