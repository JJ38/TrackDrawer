# CLAUDE.md

Guidance for Claude Code (or any agent) working in this repository.

## Project

trackDrawer is a browser game inspired by "draw a perfect circle" games: the user draws a closed loop freehand, and the attempt is scored 0–100% against the outline of a real Formula 1 circuit. MVP ships with a single track (Silverstone). More tracks and modes are intentionally deferred — see `FEATURE_IDEAS.md`.

## Stack

- React + Vite, no backend — fully client-side, static hosting to be picked later.
- Plain CSS / CSS Modules for styling.
- No persistence for MVP (no localStorage, no accounts, no server).

## Code style

- No abbreviated variable or function names (e.g. `userScore` not `usrScr`, `index` not `idx`) — clarity over brevity.
- No one-liners — conditionals, loops, and function bodies always use braces across multiple lines, even for a single statement.
- Prefer traditional `for (let i = 0; i < length; i++)` loops over `.map()` / `.forEach()` / `for...of`.
- Leave one clear blank line between logical sections of code within a function or file.
- Leave two clear blank lines between function/component definitions.

## MVP mechanics (locked in — do not change without confirming with the user first)

- **Drawing**: freeform on a blank canvas, no guide/reference shown while drawing. Single continuous stroke — the pointer must not lift mid-attempt. The user can clear and redraw any number of times before clicking "Done"; only the submitted attempt is scored.
- **Loop closing**: the app auto-closes the stroke (connects the last point back to the first) once "Done" is pressed. The user never has to close it manually.
- **Scoring trigger**: an explicit "Done" button. Never on pointer-up.
- **Comparison / invariances**: shape-similarity (Procrustes-style — normalize translation, scale, and rotation, then measure residual distance between corresponding points).
  - Position, scale, and rotation do **not** matter.
  - Mirror/reflection **does** matter — a flipped (backwards) drawing should score worse, since it doesn't represent the real driving direction.
  - Start point along the loop is free; the best rotational alignment is found automatically rather than requiring the user to start at the real start/finish line.
- **Result**: a percentage score plus a visual overlay of the user's stroke against the real track outline.
- **Input**: desktop mouse only for MVP. Touch/stylus is deferred.
- **Canvas**: responsive, scales to the viewport.

## Scoring algorithm notes

- Reference geometry lives in `data/tracks/<id>.json` as points evenly resampled by arc length (see below). The user's raw stroke must be resampled the same way — same point count, evenly spaced by arc length — before comparison, otherwise the point correspondence used for Procrustes alignment is meaningless.
- Turning the raw post-alignment residual distance into a 0–100% score still needs empirical calibration once real test attempts exist. Don't treat a first-pass formula as final — flag it for tuning rather than assuming it's correct.

## Track data

- `data/tracks/silverstone.json` — the only track for MVP. Real Silverstone Grand Prix layout, traced from OpenStreetMap (relation 51160, "Silverstone Grand Prix"), assembled from its 27 connected raceway ways (pit lane excluded), resampled to 200 evenly arc-length-spaced points, normalized to a 598.8×1000 unitless coordinate space (origin top-left, y-down). Reconstructed lap length (~5880.6m) matches the official 5891m within ~0.2%, which is the fidelity check for this data. Full provenance is in the file's own `source` field.
- `data/tracks/silverstone-preview.svg` — static visual reference of the outline, for sanity-checking without running the app.
- **License obligation**: OSM data is ODbL-licensed. The app must show attribution to OpenStreetMap contributors somewhere visible (e.g. a footer/credits) before shipping — this is not optional, and isn't done yet.
- When more tracks are added later, follow the same pipeline (Overpass query for a named `type=circuit` relation → dedupe/stitch member ways → resample by arc length → normalize) rather than inventing a new format per track.

## Process

- **Every prompt** in this project gets an entry in `PROMPT_LOG.md` — the prompt text plus a summary of what changed. Update it as part of finishing the turn it belongs to, not retroactively in bulk.
- Ideas outside current MVP scope go in `FEATURE_IDEAS.md`, not into the codebase. Include an ASCII diagram for any UI-related idea logged there.
- Don't expand MVP scope (extra tracks, guide modes, touch support, backend, accounts, etc.) without explicit user confirmation — these are intentionally deferred, not forgotten.

## Structure

Scaffolded with Vite's `react` (JavaScript) template. Current layout:

```
trackDrawer/
├── data/tracks/         # track reference geometry (source of truth, framework-agnostic)
├── public/              # static assets served as-is
├── src/
│   ├── main.jsx         # React entry point
│   ├── App.jsx          # root component — will grow into components/ as the app develops
│   ├── components/      # (to add) canvas/drawing surface, results overlay, etc.
│   ├── scoring/         # (to add) resampling + Procrustes alignment + score calculation
│   └── data/            # (to add) track data consumed by the app (imported from data/tracks)
├── index.html
├── vite.config.js
├── package.json
├── CLAUDE.md
├── FEATURE_IDEAS.md
└── PROMPT_LOG.md
```

- Package manager: npm. Linter: oxlint (installed by the Vite template) — config in `.oxlintrc.json`.
- No TypeScript — plain JavaScript per project decision.
