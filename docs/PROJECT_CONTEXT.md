# Plume Water-Recovery Webapp: Project Context and History

Last updated: 2026-08-21

## Why this file exists

This is the durable handoff for continuing the project on another computer or
in a new Codex task. Read it with `README.md` and `AGENTS.md` before changing
the engineering model, documentation, interface, or deployment.

The most important fact is that three related states currently exist:

1. **Published GitHub Pages version:** commit `c1ab59b` on `main`.
2. **Approved documentation direction:** later physical decisions that are not
   fully synchronized with the published code.
3. **Current Mac working copy:** additional uncommitted interface cleanup,
   documentation files, and an unresolved Qu and Li/Wang drift-source
   experiment.

Do not assume that the newest local file is automatically the approved model.

## Project description

The Webapp is a React, TypeScript, and Vite learning and screening tool for a
cooling-tower exhaust plume. Its intended stage order is:

```text
prescribed plume state
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
published code uses:

- plume temperature, `T4`
- plume relative humidity, `RH4`
- atmospheric pressure, `P`
- dry-air mass flow, `m_a`
- plume velocity after the fill, `u4`

Psychrometric functions calculate humidity ratio, enthalpy, moist-air density,
dew point, and the saturated recovery outlet.

### 2. Keep vapour and droplets separate

Water vapour and liquid drift droplets are different physical paths:

- Vapour recovery uses the humidity-ratio change:
  `m_recovered = m_a * delta_omega`.
- Liquid drift begins from a liquid-droplet loading and uses eliminator
  collection efficiency.

Their results must not be added together or described as the same form of
recovery.

### 3. Drift eliminator

The selected Ruiz eliminator A-F is evaluated using Reynolds number, Stokes
number, geometry-specific pressure correlations, and a representative droplet
diameter.

The calculated collection efficiency applies to the selected representative
diameter. It is not automatically an overall drift-removal efficiency because
the model does not integrate a measured droplet-size distribution.

The 25 micrometre lower boundary is an experimental evidence limitation from
the Ruiz measurement method, not a claim that smaller droplets cannot exist.

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

- The tower flow area is a fixed property for a chosen tower.
- Air velocity remains an independently adjustable input.
- Dry-air mass flow also remains an independently entered scaling input for
  vapour recovery. Do not silently derive it from velocity or vice versa.
- Liquid drift loading uses circulating-water mass flow and a selected drift
  rate:

```text
m_drift,in = m_circ * (drift_rate / 100)
m_collected = efficiency_used * m_drift,in
m_emitted = (1 - efficiency_used) * m_drift,in
```

- The selected drift rate must be supported by measured data, manufacturer
  information, or a clearly stated design assumption.
- Nozzle diameter, water drenching density, and the Qu and Li/Wang droplet-
  source regression were rejected from this accepted direction.
- Blowdown, evaporation, makeup, and cycles of concentration remain outside the
  direct-plume model unless a separate water-balance section is approved.

This accepted direction is not fully implemented in the published Webapp.

## Current implementation states

### Published `main` at `c1ab59b`

The deployed model prescribes dry-air mass flow and plume velocity. It derives
moist volumetric flow from dry-air mass flow and then reports an implied area:

```text
V_dot = m_a * (1 + omega4) / rho4
A_implied = V_dot / u4
```

This differs from the later fixed-area documentation direction. The published
version calculates representative-droplet removal percentage but does not
calculate incoming, collected, and emitted liquid-drift mass flows.

The published version includes the psychrometric chart added in `c1ab59b`.

### Current uncommitted Mac working copy

As of 2026-08-21, `main` still points to `c1ab59b`, but the working tree has
local changes.

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

The interface cleanup removes repeated summary values and repeated
psychrometric state cards. That cleanup is local only.

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
| 2026-08-13 | `c1ab59b` | Added the psychrometric process chart and deployed it through GitHub Pages. | Current deployed commit |
| After `c1ab59b` | Local working tree | Removed repeated UI values, created documentation artifacts, and added the unresolved Qu and Li/Wang drift-source experiment. | Not committed, pushed, or deployed |

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
- `src/lib/model.ts`: input types, model assembly, calculated results, warnings,
  and defaults.
- `src/lib/stages.ts`: values displayed at the plume, eliminator, fan, and
  recovery stations.
- `src/components/Controls.tsx`: user inputs and stage-specific explanations.
- `src/components/PsychrometricChart.tsx`: chart presentation.
- `src/components/ResultPanel.tsx`: recovery sweep and result graphs.
- `src/components/TowerGraphic.tsx`: cooling-tower cutaway visual.
- `docs/build_webapp_documentation.py`: generator for the local Word
  documentation artifact. Its statements must be checked against the chosen
  model before regeneration.

`src/lib/drift-source.ts` exists only in the current uncommitted experiment.

## Important limitations and factual boundaries

- No fill heat and mass-transfer model.
- No inlet-air or atmospheric plume-dispersion model.
- No coupled fan curve or full tower pressure balance.
- No measured droplet-size distribution.
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

## Recommended next decision

Before additional model development, decide which liquid-drift source should
be authoritative:

1. **Selected drift-rate approach:** matches the approved documentation
   direction and requires circulating-water mass flow plus an evidence-backed
   drift rate.
2. **Qu and Li/Wang regression approach:** matches the current uncommitted
   experiment but introduces nozzle and drenching-density assumptions with a
   narrow experimental basis.

After that decision, synchronize the code, README, generated documentation,
and interface. Separately confirm whether the plume airflow basis should use a
fixed tower area, an independently entered dry-air mass flow, or both as
explicitly independent screening inputs. Do not hide that choice in a derived
quantity.

## Windows handoff

After the approved local changes and these context files are committed and
pushed, clone the repository on Windows and open the cloned folder as the local
Codex project. Codex should read `AGENTS.md` automatically, and this file will
provide the durable project history.

Do not rely on local chat memory as the only project record. Update this file
when a model direction is approved, a major feature is completed, or the live
deployment changes.
