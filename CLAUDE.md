# Claude Code instructions

@AGENTS.md

Read `docs/PROJECT_CONTEXT.md` for the model boundaries, accepted decisions and
history before changing the model, documentation or interface.

## How the user wants to work

- Answers: short and focused on the one topic being decided. Write about 80 %
  of the way to ASD-STE100 (Simplified Technical English). No analogies; build
  from definitions and first principles.
- Keep established theory separate from assumptions, and say where there is
  uncertainty. Cite credible sources (for example IAPWS, Ruiz et al.).
- Use diagrams where they help. Keep notes under graphs to a minimum.
- When a request is ambiguous and expensive to redo, ask first. When the user
  says "only the first change", make only that change.

## Change workflow

1. Work on a branch, never directly on `main`.
2. Run `npm test` and `npm run build`; check affected stages in the browser
   (`npm run dev` or `npm run preview`) at phone width (375 px) and laptop
   widths (1280 × 800, 1440 × 900). Each stage should fit one screen on
   desktop, with no overlapping or sideways-scrolling text.
3. Show the user the result and wait.
4. Merge into `main` only when the user explicitly says so ("merge it").
   GitHub Pages then deploys from `main`; confirm the deployment before saying
   the change is live: https://nokichy16.github.io/CoolingTower_/

Commit messages: one line saying what changed, in plain words.

## Interface conventions

- Fonts: IBM Plex Sans (text) and IBM Plex Mono (numbers), bundled through
  `@fontsource` in `src/main.tsx`. Low-contrast sans only; a serif was tried
  and rejected. Formulas and output symbols use KaTeX (`Formula.tsx`,
  `MathLabel.tsx`, TeX in `src/lib/formula-tex.ts`).
- Text floor: 13 px for UI text, 14 px in tables.
- Desktop: tower drawing and stage outputs on the left (sticky), one stage on
  the right. Phone: one stage at a time.
- Colour only where it carries meaning (stage colours, data series).
- μ is air viscosity; the droplet log mean is μ_ln.

## Ideas discussed but not started

- Graph interaction in the style of Desmos: drag on the graph, zoom.
- Remove the hot-water inlet pipe and the faint air-inlet lines from the tower
  drawing.
- Fix the duty equation; Ruiz hybrid model.
- Connect pressure with density in the multiphase / superficial-velocity work.
- Custom eliminator results: remove the duplicate "Pressure drop Δp" and
  "Type" rows; show the ε(d) inputs as size–value pairs.
