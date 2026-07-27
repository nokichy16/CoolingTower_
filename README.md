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

The app does not force the plume to saturation. It calculates humidity ratio,
enthalpy, density, volumetric flow and dew point from the selected state.

Liquid-droplet performance is controlled separately:

- Ruiz tested eliminator A–F
- representative droplet diameter `d_d`
- eliminator face velocity `u_de`

Vapour recovery uses:

- cooling below the calculated dew point `ΔT_dew`
- condensate capture efficiency `η_rec`

The original cooling-tower cutaway remains the visual navigation. Its inlet,
fill, fan and exhaust regions open the plume inputs; the drift eliminator opens
the liquid-droplet inputs; the side recovery unit opens the condensation inputs.

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
St = ρ_water u_de d_d² / (18 μ Lc)
droplets removed (%) = 100 ε(St)
droplets remaining (%) = 100[1 − ε(St)]
```

`ε` is the Ruiz collection efficiency for the selected representative droplet
size. It is not an overall mass-removal claim for an unknown real droplet-size
distribution.

The app shows the dynamically paper-supported diameter interval for the current
velocity and eliminator. It is based on `0.2 ≤ St ≤ 2` and the paper's 25 µm
measurement floor. Ruiz pressure support is checked with
`2,000 ≤ Re ≤ 15,000` and `0.443 ≤ u_de ≤ 4.36 m/s`.

### Vapour recovery

```text
T₅ = T_dew − ΔT_dew
ω₅ = ω_sat(T₅, P)

Δω = ω₄ − ω₅
ṁ_theory = ṁ_a Δω
ṁ_recovered = η_rec ṁ_theory
V_day = 86.4 ṁ_recovered

Δh = h₄ − h₅
Q̇_cooling ≈ ṁ_a Δh
e = Δh / Δω
```

`V_day` is in m³/day using 1000 kg/m³ for liquid water. Cooling duty is an
approximate air-side load and should not be treated as recovery-equipment
selection.

## Source map

- `src/lib/psychrometrics.ts` — moist-air state, saturation and dew-point functions
- `src/lib/eliminators.ts` — Ruiz A–F geometries, correlations and support checks
- `src/lib/model.ts` — direct plume, droplet and recovery calculations
- `src/lib/stages.ts` — values shown in the stage summaries
- `src/components/Controls.tsx` — bounded plume, droplet and recovery inputs
- `src/components/TowerGraphic.tsx` — preserved cooling-tower cutaway
- `src/components/ResultPanel.tsx` — percentage reduction, recovery and cooling results
