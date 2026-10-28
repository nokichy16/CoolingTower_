# Plume Water-Recovery Webapp: Project Context and History

Last updated: 2026-10-22

## Why this file exists

This is the durable handoff for continuing the project on another computer or
in a new Codex task. Read it with `README.md` and `AGENTS.md` before changing
the engineering model, documentation, interface, or deployment.

The current source implements the approved coordinated area-and-velocity flow
basis, the minimal blowdown ratio, and the streamlined technical interface.
GitHub Pages deployment follows pushes to `main` and must be checked separately
before describing a source change as live. The earlier uncommitted Mac drift-
source experiment remains historical context and is not part of this source.

## Project description

The Webapp is a React, TypeScript, and Vite learning and screening tool for a
cooling-tower exhaust plume. Its intended stage order is:

```text
prescribed plume state
-> drift droplets at the eliminator inlet
-> liquid-droplet / drift-eliminator analysis
-> ideal fan air-power requirement
-> water-vapour condensation recovery
```

The model begins at the plume leaving the fill. It does not currently solve the
inlet-air process, fill heat and mass transfer, circulating-water thermal
balance, hot- and cold-water temperatures, atmospheric dispersion, or a full
tower pressure balance.

The tool is for learning and comparative screening. It does not replace tower
rating software, manufacturer data, experimental validation, or recovery-
equipment design.

Live site: <https://nokichy16.github.io/CoolingTower_/>

GitHub repository: <https://github.com/nokichy16/CoolingTower_>

## Physical interpretation

### 1. Prescribed plume

The plume state is prescribed instead of predicted from the water side. The
current source uses:

- plume temperature, `T4`
- plume relative humidity, `RH4`
- atmospheric pressure, `P`
- full-face flow area, `A`
- plume velocity after the fill, `u4`

Psychrometric functions calculate humidity ratio, enthalpy, moist-air density,
dew point, and the saturated recovery outlet.

### 2. Keep vapour and droplets separate

Water vapour and liquid drift droplets are different physical paths:

- Vapour recovery uses the humidity-ratio change:
  `m_recovered = m_a * delta_omega`.
- Liquid drift uses a separate, provisional size-dependent capture assumption.

Their results must not be added together or described as the same form of
recovery.

### 3. Drift droplets and drift eliminator

Liquid drift entering the eliminator (inputs, both assumptions):

```text
m_drift,in = m_circ * D_in / 100
```

Inlet droplet sizes are one log-normal by mass, truncated at d_max:

```text
LN(d; d_med, sg) = 0.5 * [1 + erf( ln(d/d_med) / (sqrt(2) * ln sg) )]
F(d)  = LN(d) / LN(d_max)        for d < d_max,  F = 1 above
sg    = (d_med / d_min)^(1 / 2.3263)   (d_min = 1 % mass point)
```

Defaults are a least-squares fit to Ruiz et al. (2013) Fig. 9(a), test run 1:
d_med = 35 um, sg = 1.74 (d_min = 9.6 um), d_max = 300 um. Ruiz measured at
the tower exit (after the eliminator), so using this shape at the eliminator
inlet is an assumption. Fit error is up to about 6.5 %, and the fit has less
mass above 100 um than Ruiz measured. A two-mode fit was tried and removed.

Capture uses the Ruiz et al. (2019) single-size fits at every droplet size:

```text
St    = rho_w * u * d^2 / (18 * mu * L)
eps   = 1 - a * exp(-St^2 * (1 - exp(b / St)))   (vane, honeycomb)
eps   = 1 - a * exp(b * St)                       (wire mesh)
eta_esc = integral over 0..d_max of (1 - eps(d)) dF(d)
m_escaping = m_drift,in * eta_esc
m_captured = m_drift,in * (1 - eta_esc)
```

The integral is evaluated over 600 equal size classes with eps at each class
midpoint. The outlet curve is the running integral divided by eta_esc. The
d50 cutoff and the Ruiz 2013 comparison points were removed from the app
(Oct 2026); neither is used in the drift result.

Approved assumptions and limits (user decisions, Oct 2026):

- The Ruiz fits are used as published at every size, including St below the
  tested 0.2-2 range. The fits do not go to eps = 0 for very small droplets,
  so small-droplet capture is likely overstated. The app does not state this;
  the user documents it separately.
- No re-entrainment model. Options (Souders-Brown onset warning, a
  re-entrainment fraction input) are pending the user's research.
- Inlet drift rate D_in and the inlet distribution are assumptions until
  measured; the user plans visual experiments.

### 4. Fan result

The model reports:

```text
P_air = volumetric_flow * eliminator_pressure_drop
```

This is ideal power delivered to the air to overcome the selected eliminator
only. It excludes fan efficiency, motor and drive efficiency, fill, louvers,
ducts, and other tower losses.

### 5. Condensation recovery

The recovery outlet is cooled below the plume dew point and treated as
saturated. The principal outputs are:

```text
m_theory = m_a * delta_omega
Q_cooling = m_a * delta_h
energy_per_kg = delta_h / delta_omega
```

These are theoretical condensate and approximate air-side thermal duty. They
are not equipment-selection or electrical-energy predictions.

## Accepted documentation direction

The following decisions were approved during the later documentation work:

- Full-face flow area and after-fill air velocity are adjustable assessment
  inputs; the area remains constant within each calculation.
- Volumetric flow is `A u`, and dry-air mass flow is derived from moist-air
  density so pressure loss, ideal air power and vapour recovery use one basis.
- Eliminator pressure loss is calculated from the Ruiz Reynolds-dependent
  correlation at the selected velocity. No designated fan is selected.
- A future liquid-drift mass balance would require circulating-water mass flow
  and a supported drift rate:

```text
m_drift,in = m_circ * (drift_rate / 100)
m_collected = efficiency_used * m_drift,in
m_emitted = (1 - efficiency_used) * m_drift,in
```

- Any future drift rate must be supported by measured data, manufacturer
  information, or a clearly stated design assumption.
- Nozzle diameter, water drenching density, and the Qu and Li/Wang droplet-
  source regression were rejected from this accepted direction.
- Circulating-water flow and inlet drift rate are now inputs (Oct 2026). The
  drift rate is labelled as an assumption in the interface.

This accepted direction is implemented in the current source.

### Current coordinated implementation

The current implementation replaces independent dry-air-flow scaling
with adjustable full-face area and after-fill velocity inputs. It derives
`V̇ = A u` and `ṁ_a = ρV̇/(1+ω)`, then calculates Ruiz eliminator pressure loss
and ideal eliminator-only air power at that velocity. Eliminator performance,
air power and condensation recovery all use the same derived flow basis. It
exposes dry-air mass flow as a linked input: editing it recalculates velocity,
while editing velocity or area updates dry-air mass flow. It is not a third
independent flow constraint. The implementation calculates the
blowdown-to-evaporation ratio:

```text
B / E = 1 / (CoC - 1)
```

Evaporation remains an externally known quantity, so no absolute blowdown,
makeup-water or recirculation rate is calculated. Liquid drift mass is
calculated in the drift stage (section 3).
This is the approved current source direction.

## Current implementation states

### Previous published model at `c1ab59b`

That earlier deployed model prescribed dry-air mass flow and plume velocity. It
moist volumetric flow from dry-air mass flow and then reports an implied area:

```text
V_dot = m_a * (1 + omega4) / rho4
A_implied = V_dot / u4
```

This differed from the coordinated area-and-velocity direction. That version
calculated representative-droplet removal percentage but did not calculate
incoming, collected, and emitted liquid-drift mass flows.

The version included the psychrometric chart added in `c1ab59b`.

### Historical uncommitted Mac experiment

Before the coordinated Windows implementation, a Mac working tree contained
the following local changes and an unresolved drift-source experiment.

Modified tracked files:

- `src/App.tsx`
- `src/components/Controls.tsx`
- `src/components/PsychrometricChart.tsx`
- `src/lib/model.ts`
- `src/lib/stages.ts`
- `src/styles.css`

Untracked project files include:

- `src/lib/drift-source.ts`
- `docs/`
- `Concise_Calculation_Sequence_Plume_Water_Recovery.docx`
- `Technical_Report_Plume_Water_Recovery.docx`

The interface cleanup removed repeated summary values and repeated
psychrometric state cards.

The local model experiment adds circulating-water flow, reflection-nozzle
diameter, water drenching density, and a Qu and Li/Wang no-eliminator droplet-
source regression. It then applies Ruiz representative-droplet collection
efficiency to estimate incoming, collected, and emitted drift mass.

This experiment conflicts with the accepted selected-drift-rate direction. It
must remain labelled unresolved until the user explicitly chooses whether to
discard it, revise it, or approve it.

## History

| Date | Commit or state | What changed | Status |
|---|---|---|---|
| 2026-07-24 | `a8a119e` | Published the first data-center cooling explorer with the tower visual and broader water-balance concepts. | Historical |
| 2026-07-27 | `9445a73` | Updated tower controls and recovery outputs. | Deployed history |
| 2026-07-27 | `28b96cb` | Simplified the plume recovery model and refreshed the design. | Deployed history |
| 2026-07-27 | `749736b` | Simplified the interface and kept source details internal. | Deployed history |
| 2026-07-28 | `d1db7a9` | Refined recovery presentation and added plume velocity. | Deployed history |
| 2026-07-28 | `afdbce3` | Removed a second independent eliminator velocity and inherited face velocity from plume velocity. | Deployed history |
| 2026-08-13 | `c1ab59b` | Added the psychrometric process chart and deployed it through GitHub Pages. | Deployed history |
| After `c1ab59b` | Local working tree | Removed repeated UI values, created documentation artifacts, and added the unresolved Qu and Li/Wang drift-source experiment. | Not committed, pushed, or deployed |
| 2026-08-23 | Current coordinated source change | Added the unified area-and-velocity flow basis, minimal blowdown ratio, model tests, and streamlined interface and charts. | Approved for `main`; live deployment requires verification |
| 2026-09-20 | `f4294d1` | Replaced user-selected efficiency and drift-rate controls with Ruiz diameter-by-diameter evaluation and a theoretical d50 cutoff. | Deployed history |
| 2026-10-17 | PR #2, #3 | Inlet droplet distribution graph, wider inlet layout, graph clean-up. | Deployed history |
| 2026-10-18 | PR #5 | Redesign: stage tabs (plume and airflow, drift droplets, eliminator, fan, recovery), two-mode inlet distribution, circulating-water and inlet-drift-rate inputs, inlet count and inlet/outlet cumulative graphs, fan power chart, "All calculated values" section. | Deployed history |
| 2026-10-18 | PR #6, #7 | Larger text and graphs; eliminator picker as one selectable list. | Deployed history |
| 2026-10-21 | PR #8 | Single log-normal inlet; sharp d50 cut replaced by the grade-efficiency integral. | Deployed |
| 2026-10-22 | Tidy-up | Removed unused CalculationSequence and KPI code; updated this file. | See git log |

Earlier commit `a8a119e` contained a cycles-derived water balance. That model is
historical and is not part of the current direct-plume boundary. If a future
water-balance section is approved, do not expose blowdown and cycles of
concentration as independent inputs at the same time. A consistent historical
form was:

```text
drift = circulating_flow * drift_rate / 100
blowdown = evaporation / (cycles - 1) - drift
makeup = evaporation + drift + blowdown
```

If blowdown is measured directly, calculate implied cycles instead of also
asking the user to specify cycles independently.

## Source map

- `src/lib/psychrometrics.ts`: saturation pressure, humidity ratio, enthalpy,
  density, dew point, and saturated-state functions.
- `src/lib/psychrometric-chart.ts`: chart curves, constant-enthalpy lines, and
  process-path data.
- `src/lib/eliminators.ts`: Ruiz A-F geometries, pressure correlations,
  collection correlations, and supported-range checks.
- `src/lib/droplet-distribution.ts`: log-normal inlet distribution, count
  histogram, mass quantiles, Sauter mean, and the grade-efficiency split.
- `src/lib/model.ts`: input types, model assembly, calculated results, warnings,
  and defaults.
- `src/lib/stages.ts`: values displayed at the plume, eliminator, fan, and
  recovery stations.
- `src/components/Controls.tsx`: stage tabs, user inputs, eliminator picker.
- `src/components/DropletDistribution.tsx`: drift inputs and inlet count graph.
- `src/components/EliminatorOutput.tsx`: inlet/outlet cumulative graph, eps(d)
  and drift flows.
- `src/components/FanChart.tsx`: ideal fan air power against face velocity.
- `src/components/StageResults.tsx`: "All calculated values", every input and
  calculated value with its formula, by stage.
- `src/components/PsychrometricChart.tsx`: chart presentation.
- `src/components/TowerGraphic.tsx`: cooling-tower cutaway visual.
- `docs/build_webapp_documentation.py`: generator for the local Word
  documentation artifact. Its statements must be checked against the chosen
  model before regeneration.

`src/lib/drift-source.ts` existed only in the historical uncommitted experiment.

## Important limitations and factual boundaries

- No fill heat and mass-transfer model.
- No inlet-air or atmospheric plume-dispersion model.
- No coupled fan curve or full tower pressure balance.
- No measured inlet droplet-size distribution; the default is fitted to
  outlet data from one tower (Ruiz 2013).
- No re-entrainment model.
- No equipment effectiveness, condensate capture loss, fouling, freezing,
  bypass, COP, or electrical-energy model for condensation recovery.
- Ruiz A-F are tested specimens and empirical branches, not generic efficiency
  grades or manufacturer-certified selections.
- Support-range warnings do not make extrapolated results validated.
- Theoretical recovery is not the same as demonstrated water recovery.

## Local development

Requirements:

- Git
- Node.js LTS and npm

Commands:

```bash
npm install
npm run dev
npm run build
git diff --check
```

The project uses React 18, TypeScript, Vite, and Recharts. Vite uses a relative
base path so the static build works on GitHub Pages.

## Deployment

GitHub Pages deployment is configured in
`.github/workflows/deploy-pages.yml`.

A change is not live merely because `npm run build` succeeds locally. The safe
sequence is:

1. Inspect the working tree and approve the exact files.
2. Run the build and targeted browser checks.
3. Commit only approved files.
4. Push the approved commit.
5. Confirm the GitHub Pages workflow succeeds.
6. Open the live site and verify the affected behaviour.

## Current liquid-water scope

The coordinated implementation deliberately keeps the water-side addition
minimal. The user selects cycles of concentration, and the app reports
`B/E = 1/(CoC - 1)` because evaporation is known outside the app. A later full
water balance would need explicit circulating-water, drift-rate, and
evaporation inputs before calculating drift mass, absolute blowdown, or makeup
water.

## Windows handoff

Clone the repository on Windows and open the cloned folder as the local Codex
project. Codex should read `AGENTS.md` automatically, and this file will provide
the durable project history.

Do not rely on local chat memory as the only project record. Update this file
when a model direction is approved, a major feature is completed, or the live
deployment changes.
