# Plume Water-Recovery Explorer

An interactive learning and screening tool for exploring water recovery from a
cooling-tower exhaust plume.

**Live website:** https://nokichy16.github.io/CoolingTower_/

> This is a simplified engineering model. It estimates psychrometric recovery
> potential and theoretical drift-eliminator performance; it does not replace
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
- full-face flow area `A`
- air velocity after the fill `u₄`

The app does not force the plume to saturation. It calculates humidity ratio,
enthalpy, moist-air density and dew point from the selected state. Flow area and
velocity set the volumetric flow through the assessed tower.

Liquid drift is controlled separately:

- circulating-water mass flow `ṁ_circ`
- drift rate at the eliminator inlet `D_in`, an assumption
- mass-weighted mean droplet diameter `E` and the standard deviation `σ` of
  `ln d`; editing the smallest size `d_min` (the 1 % point) solves for `σ`
- largest droplet size `d_max`, which cuts the distribution
- Ruiz tested eliminator A–F, or Custom, which sets Δp and ε(d) directly

The eliminator spans the selected plume flow area and inherits the after-fill
velocity. Its Reynolds-dependent correlation calculates eliminator pressure
loss. The app does not select or model a designated fan.

Vapour recovery uses:

- cooling below the calculated dew point `ΔT_dew`
- cycles of concentration `CoC`

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

The coordinated flow basis is:

```text
u_de = u₄
V̇ = A u₄
ṁ_a = ρ₄ V̇ / (1 + ω₄)
Δp_de = K(Re(u₄)) ½ρ₄u₄²
```

The linked dry-air mass-flow input scales recovered water and cooling duty.
Editing it recalculates velocity at the selected area and plume state; editing
velocity or area updates the displayed dry-air mass flow.

### Drift droplet mass balance

```text
μ = ln E − σ²/2,  d_med = e^μ                    inlet log-normal by mass
F(d) = LN(d) / LN(d_max)                          cut at d_max
St(d) = ρ_water u_de d² / (18 μ_air L_c)
ε(d) = f(St(d), eliminator geometry)              Ruiz et al. (2019)
η_esc = ∫ (1 − ε(d)) dF(d)                        600 size classes
ṁ_drift,in = ṁ_circ · D_in / 100
ṁ_esc = ṁ_drift,in · η_esc,  ṁ_cap = ṁ_drift,in · (1 − η_esc)
P_air = V̇ Δp_de
```

Every droplet size is partly captured, by ε(d). The inlet shape and the inlet
drift rate D_in are assumptions: the default shape is a fit to Ruiz et al.
(2013) data measured at a tower exit. The custom option sets Δp and ε(d)
directly instead of using the Ruiz correlations.

The Ruiz pressure calculation retains its Reynolds-number and velocity-range
checks internally.
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

### Minimal blowdown ratio

```text
B / E = 1 / (CoC - 1)
B = E / (CoC - 1)  when the evaporation rate E is known
```

The app reports blowdown as a percentage of the known evaporation rate. It
does not add evaporation, recirculation, makeup-water, conductivity or
water-temperature inputs. The liquid-drift mass flow is calculated separately,
in the drift stage above, from circulating-water flow and the assumed inlet
drift rate. It is not part of this ratio.

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
- `src/lib/droplet-distribution.ts` — log-normal inlet distribution and the grade-efficiency split
- `src/lib/model.ts` — direct plume, droplet and recovery calculations
- `src/lib/stages.ts` — stage identity: name, path, colour, order
- `src/lib/stage-outputs.ts` — the values shown in the stage summaries
- `src/lib/formula-tex.ts` — TeX for the formulas in the values table
- `src/components/StagePanel.tsx` — bounded plume, droplet and recovery inputs, one stage at a time
- `src/components/StageList.tsx` — key outputs of every stage
- `src/components/StageResults.tsx` — every calculated value with its formula
- `src/components/DropletDistribution.tsx` — drift inputs and the inlet count graph
- `src/components/EliminatorOutput.tsx` — cumulative drift mass below `d`
- `src/components/EliminatorCount.tsx` — droplet counts per size class with ε(d)
- `src/components/EliminatorPicker.tsx` — eliminator selection, comparison and the Custom switch
- `src/components/CustomPerformanceEditor.tsx` — the custom Δp and ε bars
- `src/components/FanChart.tsx`, `src/components/FanTable.tsx` — ideal air power against velocity, and all eliminators at the selected velocity
- `src/components/TowerGraphic.tsx` — preserved cooling-tower cutaway
- `src/components/PsychrometricChart.tsx` — interactive psychrometric process graph

`docs/CODE_MAP.md` has the full file map, a flow diagram, the step-by-step
physics with sources, and the known inconsistencies.
