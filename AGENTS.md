# Cooling-Tower Webapp Agent Instructions

## Project Purpose

This repository contains a learning and screening Webapp for a cooling-tower
exhaust plume, drift-eliminator performance, fan air-power requirement, and
theoretical condensation recovery.

Read `docs/PROJECT_CONTEXT.md` before making model, documentation, interface,
or deployment changes. It records the project history, physical boundaries,
accepted decisions, and the difference between the deployed version and the
current local working copy.

## Collaboration Workflow

- Explain the proposed change and its physical meaning before substantial
  model, documentation, or interface edits.
- Work one stage at a time when changing engineering assumptions.
- Do not treat discussion, explanation, or "keep that for now" as approval to
  implement a change.
- Preserve factual boundaries. Distinguish proposed, locally implemented,
  locally verified, committed, pushed, and deployed work.
- Do not overstate validation, accuracy, ownership, or completion.
- Preserve unrelated working-tree changes and stage only explicitly approved
  files.

## Engineering Rules

- Keep the calculation boundary at the prescribed plume state leaving the
  fill unless the user explicitly approves a broader tower model.
- Keep water vapour and liquid drift droplets separate. Do not add their
  recovery results together.
- Treat theoretical condensate and cooling duty as screening results, not
  recovery-equipment sizing or guaranteed performance.
- Treat Ruiz collection efficiency as a diameter-specific prediction. The
  current interface reports a theoretical d50 cutoff across a selected size
  range, not total circulating-water recovery or a drift mass balance.
- Treat the Ruiz 25 micrometre lower limit as an evidence/measurement limit,
  not a physical minimum droplet size.
- Treat eliminator fan power as ideal air power for the eliminator pressure
  loss only, not shaft power, electrical power, or total tower fan power.
- Do not add blowdown, makeup, evaporation, or cycles of concentration without
  a separately approved water-balance boundary and the necessary tower inputs.
- Do not make blowdown and cycles of concentration simultaneous independent
  inputs.
- A liquid-drift mass balance would require circulating-water mass flow and a
  supported drift rate. Neither is part of the current theoretical d50 model.
  Do not present the historical Qu and Li/Wang nozzle-and-drenching-density
  experiment as approved.
- The area/airflow basis is not yet synchronized across the deployed code and
  approved documentation direction. Confirm the intended formulation before
  changing it.

## Code Structure

- Keep psychrometrics in `src/lib/psychrometrics.ts`.
- Keep eliminator correlations in `src/lib/eliminators.ts`.
- Keep the main calculation assembly in `src/lib/model.ts`.
- Keep display-stage formatting in `src/lib/stages.ts`.
- Keep input controls in `src/components/Controls.tsx`.
- Keep the psychrometric chart calculation and rendering separated between
  `src/lib/psychrometric-chart.ts` and
  `src/components/PsychrometricChart.tsx`.
- Keep physical parameters configurable and avoid hiding consequential
  assumptions inside presentation components.

## Verification and Deployment

- Before editing or reporting deployment, run `git status --short --branch`,
  inspect the current branch and commit, and compare local changes with
  `origin/main`.
- After approved code changes, run `npm run build` and `git diff --check`.
- When interface behaviour changes, test the affected controls and outputs in
  the browser.
- A local build is not a deployment. Report the change as live only after the
  approved commit is pushed, GitHub Pages completes successfully, and the live
  site is checked.
- Do not commit generated dependencies, build output, secrets, or unrelated
  documents.
