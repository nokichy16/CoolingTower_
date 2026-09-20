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

Liquid-droplet performance is controlled separately:

- Ruiz tested eliminator A–F
- theoretical minimum and maximum droplet sizes

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

### Theoretical droplet prediction

```text
u_de = u₄
St(d) = ρ_water u_de d² / (18 μ L_c)
η(d) = f(St(d), eliminator geometry)
η(d50) = 0.50
predicted remaining range = d_min to d50
predicted captured range = d50 to d_max
P_air = V̇ Δp_de
```

The application evaluates the Ruiz collection curve across the selected size
limits and reports the theoretical 50% collection diameter. The two reported
ranges are screening predictions, not an exact physical separation or a
liquid-drift mass balance.

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
water-temperature inputs. No liquid-drift mass flow is calculated because
circulating-water flow is not an input to the current model.

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
- `src/components/ResultPanel.tsx` — recovery and cooling results
