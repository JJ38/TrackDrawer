# CLAUDE.md

Guidance for Claude Code (or any agent) working in this repository.

## Project

trackDrawer is a browser game inspired by "draw a perfect circle" games: the user draws a closed loop freehand, and the attempt is scored 0–100% against the outline of a real Formula 1 circuit. The user picks a circuit from the full current F1 calendar (including races cancelled mid-season) before drawing. Other modes (guide overlays, difficulty presets) are intentionally deferred — see `FEATURE_IDEAS.md`. A minimal share feature (copy the result as an image to the clipboard) was added on 2026-08-08 on explicit user request; richer sharing (file download, Web Share API) remains deferred, see `FEATURE_IDEAS.md` #3.

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
- **Result**: a percentage score plus a visual overlay of the user's stroke against the real track outline. Two overlay modes, toggleable on the result screen (`OverlayModeToggle.jsx`): "track stays fixed" (default — the track outline stays put, the user's stroke is rotated/scaled onto it via `applyAlignment`) or "drawing stays fixed" (the user's stroke stays exactly as drawn, the track outline is rotated/scaled onto it instead via `applyInverseAlignment` — the inverse of the same rotation/scale, since reordering for start-offset/direction doesn't change either shape's position in the plane). Purely a display choice; the score itself doesn't change.
- **Sharing**: a "Copy Image" button on the result screen (`Controls.jsx`'s secondary button) renders whichever overlay mode is currently displayed, plus the track name/score/OSM attribution, to an offscreen canvas (`src/sharing/createShareImageBlob.js`) and copies the resulting PNG to the clipboard via the Clipboard API. No download/Web Share options yet — see `FEATURE_IDEAS.md` #3.
- **Input**: desktop mouse only for MVP. Touch/stylus is deferred.
- **Canvas**: responsive, expands to fill whatever space is left in the viewport after the header/controls/footer — its aspect ratio is therefore whatever the screen's own available space is (landscape on a wide monitor, portrait on mobile), not tied to the selected track's `coordinateSpace` shape. (Prior to 2026-08-08 the canvas aspect ratio was derived per-track; changed on explicit user request.)
- **Track selection**: a searchable grid (`TrackSelect.jsx`) shown before drawing. Search matches against both name and location. A "Choose a different track" link is available from the drawing and result screens to return to it.

## Scoring algorithm notes

- Reference geometry lives in `data/tracks/<id>.json` as points evenly resampled by arc length (see below). The user's raw stroke must be resampled the same way — same point count, evenly spaced by arc length — before comparison, otherwise the point correspondence used for Procrustes alignment is meaningless.
- `data/tracks/*.json` stores `points` as `[x, y]` arrays, but every scoring/geometry function takes `{x, y}` objects (matching what pointer events naturally produce). The conversion happens once, at the data-loading boundary in `src/data/tracks.js` — don't reintroduce array-shaped points into `src/scoring/` or `src/components/`.
- `findBestAlignment` (in `src/scoring/align.js`) searches every cyclic start-offset in both traversal directions and keeps the lowest residual error. Because it's a plain numeric comparison (`residualError < bestResidualError`), any `NaN` reaching it is silently ignored rather than erroring — `NaN` never satisfies `<`, so a bug that produces `NaN` residuals looks like "alignment just picked the identity transform" instead of crashing. If a future score looks suspiciously like an unaligned/untransformed user stroke, suspect a `NaN` upstream (e.g. a point-shape mismatch like the one above) before suspecting the alignment search itself.
- The raw post-alignment residual is normalized by the track's own average radius, then converted to a 0–100% score via `SCORE_SCALE_FACTOR` in `src/scoring/score.js`. That constant was calibrated against synthetic test attempts built from the real Silverstone geometry (near-perfect trace, several levels of added point noise, a crude straight-line polygon approximation, and an unrelated oval) rather than real user drawings. With the current factor (0.45), those synthetic attempts land roughly: near-perfect trace ≈99%, light hand-wobble ≈94%, moderate wobble ≈74%, heavy wobble ≈66%, a crude 10-point polygon approximation ≈58%, and a generic shape unrelated to the track's outline ≈0%. Revisit this constant once real user attempts exist — a person's actual error pattern won't exactly match synthetic per-point noise.

## Track data

- `data/tracks/<id>.json` — one file per circuit, all in the same schema as the original Silverstone file: `id`, `name`, `location`, `layout`, `source` (provenance/attribution), `coordinateSpace` (per-track width/height, origin top-left, y-down), `pointCount`, `closed`, and `points` (`[x, y]` arrays, evenly arc-length-spaced, NOT corner-preserving).
- Covers the full current F1 calendar as of 2026-08-07, including both circuits cancelled mid-season (Bahrain-Sakhir, Jeddah) per an explicit user request to keep cancelled races selectable, plus the two calendar changes since the season was announced (Madrid added replacing Imola, Sepang added as the relocated Bahrain round). One circuit is missing: **Madrid ("Madring")** has no usable OSM data yet (it's still under construction ahead of its September 2026 debut — Overpass returns essentially nothing) and was deliberately left out rather than shipping fabricated geometry. If it gets mapped later, source it the same way as the others.
- **Sourcing pipeline**: `scripts/build_track.py` (config in `scripts/circuits.json`) — the same OpenStreetMap/Overpass approach used for the original Silverstone track, generalized to a reusable script after being run across the full calendar. Read the script's own header comment before re-running it; it records real operational gotchas (which Overpass mirror to use, why to run in small foreground batches, retry/backoff behavior) that aren't worth re-discovering.
- **Known sourcing edge cases**, in case similar ones show up in future tracks:
  - OSM's `name` tag is sometimes in a local script (e.g. Arabic, Japanese) with the English name only under `int_name` or `name:en` — search all three.
  - A circuit's full lap is sometimes mapped as one single self-closed way (start node == end node) rather than many small segments (e.g. Shanghai) — only trust a self-closed way when it's clearly the dominant segment by point count, otherwise it's likely an unrelated small feature caught by the bounding box (e.g. a roundabout).
  - Two ways can share the same two endpoints while being genuinely different physical paths — a lap split into "front half"/"back half", or a short closing connector versus the long way around the rest of the lap — not OSM-edit-history duplicates of the same road. Both interpretations (keep only the longer/more-detailed one vs. keep both) are tried, and the reconstructed lap length is checked against the real-world official length to decide which is correct — geometry alone can't reliably distinguish the two cases.
  - Not every circuit has a `type=circuit` relation grouping its ways at all (e.g. Suzuka, Miami, Lusail) — the pipeline falls back to querying raw `highway=raceway` ways directly in the bounding box and stitching them the same way.
  - Real gaps exist in OSM's raceway tagging for some circuits (a public-road stretch not tagged `highway=raceway`) — Jeddah has a ~150m untagged gap, giving it a 9% reconstructed-length error. It's flagged `NEEDS_REVIEW`-equivalent in its own `source.note` field but still shipped, since the rest of the shape is correct and 9% is a usable approximation, unlike Madrid's near-total absence of data.
- `data/tracks/silverstone-preview.svg` — static visual reference of Silverstone's outline, for sanity-checking without running the app. (Not regenerated per-track; a one-off from the original single-track setup.)
- **License obligation**: OSM data is ODbL-licensed. The app must show attribution to OpenStreetMap contributors somewhere visible (e.g. a footer/credits) before shipping — this is not optional, and isn't done yet.

## Process

- **Every prompt** in this project gets an entry in `PROMPT_LOG.md` — the prompt text plus a summary of what changed. Update it as part of finishing the turn it belongs to, not retroactively in bulk.
- Ideas outside current MVP scope go in `FEATURE_IDEAS.md`, not into the codebase. Include an ASCII diagram for any UI-related idea logged there.
- Don't expand MVP scope (guide modes, touch support, backend, accounts, sharing, etc.) without explicit user confirmation — these are intentionally deferred, not forgotten.

## Structure

Scaffolded with Vite's `react` (JavaScript) template. Current layout:

```
trackDrawer/
├── data/tracks/                    # track reference geometry (source of truth, framework-agnostic)
├── scripts/
│   ├── build_track.py              # reusable OSM/Overpass sourcing pipeline for new tracks
│   └── circuits.json                # per-circuit search config (name patterns, bbox, official length)
├── public/                         # static assets served as-is
├── src/
│   ├── main.jsx                    # React entry point
│   ├── App.jsx                     # screen-state machine (selecting / drawing / result), wires everything together
│   ├── components/
│   │   ├── TrackSelect.jsx         # searchable grid for choosing a circuit
│   │   ├── DrawingCanvas.jsx       # single-stroke pointer capture, responsive canvas
│   │   ├── Controls.jsx            # Clear/Done, or Try Again/Copy Image button row
│   │   ├── ResultOverlay.jsx       # SVG comparison of user stroke vs. real track outline
│   │   └── OverlayModeToggle.jsx   # switches which shape (track or drawing) stays fixed in the overlay
│   ├── scoring/
│   │   ├── geometry.js             # shared point-math helpers (distance, centering)
│   │   ├── resample.js             # evenly resample a closed loop by arc length
│   │   ├── align.js                # rotation/scale similarity alignment, free start-offset and direction
│   │   ├── score.js                # orchestrates resample + align into a 0–100% score
│   │   └── overlayGeometry.js      # shared viewBox/path/stroke math used by both ResultOverlay.jsx and the share-image renderer
│   ├── sharing/
│   │   └── createShareImageBlob.js # composites the result overlay + track name + score + attribution into a PNG blob
│   └── data/
│       └── tracks.js               # loads all data/tracks/*.json via import.meta.glob, converts [x,y] arrays to {x,y} objects, exposes getTrackById/getAllTracks
├── index.html
├── vite.config.js
├── package.json
├── CLAUDE.md
├── FEATURE_IDEAS.md
└── PROMPT_LOG.md
```

- Package manager: npm. Linter: oxlint (installed by the Vite template) — config in `.oxlintrc.json`.
- No TypeScript — plain JavaScript per project decision.
