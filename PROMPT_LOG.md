# Prompt Log

This file records every prompt given to Claude during the development of trackDrawer, along with a summary of the changes/outcomes for each one.

---

## 1. 2026-08-07

**Prompt:**
> I have an idea for a website id like to make. Its inspired by a website that allows users to draw a circle. The better the user draws the circle the higher the score they get. The score is done in percentage which I would also like to emulate. I want to create a F1 track version. The closer a user can draw an f1 track the higher their percentage score. First I want to work on project setup. This include specification clarification, setting up an appropriate claude.md and other suggestions you may have. First lets get on the same page about the project and then we can work on the claude.md and figure out an approach. Also I want to record every single prompt during this project in a md file with a summary of changes for each prompt. Start that now using this as the first entry

**Summary of changes:**
- Created `PROMPT_LOG.md` to track all prompts and their outcomes for the duration of the project.
- No code changes yet — next step is clarifying the project specification before writing `CLAUDE.md`.

---

## 2. 2026-08-07

**Prompt:**
> Free form at first but I like your other ideas. Lets include those later. Write those suggestions in a FEATURE_IDEAS.md. If ideas are UI related include a ascii diagram for clarity

**Summary of changes:**
- Confirmed MVP drawing mode: freeform, blank canvas, no guide.
- Created `FEATURE_IDEAS.md` capturing deferred ideas: alternate drawing/guide modes (flash-then-hide, always-on ghost), difficulty presets, track scope expansion (iconic set, full calendar), alternative scoring approaches (pixel overlap, shape-similarity), and misc future ideas (leaderboard, sharing, mobile, track packs). Included ASCII diagrams for UI-related ideas.
- Open item: still need to decide the MVP scoring algorithm before writing `CLAUDE.md`.

---

## 3. 2026-08-07

**Prompt:**
> Yes use the shape similarity approach.

**Summary of changes:**
- Locked in MVP scoring algorithm: shape-similarity (normalize translation/scale/rotation, then compare curve shape) rather than pixel/area overlap.
- No files changed this turn — next step is finalizing remaining spec questions (tech stack, track data source, which single track to launch with) before writing `CLAUDE.md`.

---

## 4. 2026-08-07

**Prompt:**
> Use react as the frontend and no backend for now. Use silverstone as the track for now. We'll add more later. Source the track yourself and pick/translate to the form that you think is appropiate

**Summary of changes:**
- Locked in: React frontend, no backend for v1, Silverstone as the single MVP track.
- Sourced real Silverstone Grand Prix circuit geometry from OpenStreetMap (Overpass API, relation 51160 "Silverstone Grand Prix"), assembled from its 27 connected raceway way-segments (pit lane excluded). Verified fidelity: reconstructed lap length ≈ 5880.6m vs. official 5891m (~0.2% difference).
- Converted to app-ready format: projected lat/lon to planar coordinates, resampled to 200 evenly arc-length-spaced points (required for fair shape-similarity comparison against user strokes), normalized to a 598.8×1000 unitless coordinate space (top-left origin, y-down/screen convention).
- Rendered an SVG preview and visually confirmed the traced outline matches Silverstone's real layout (recognizable Abbey/Farm Curve/Village/Loop, Hangar Straight diagonal, Maggotts/Becketts/Chapel kink, Stowe/Vale/Club, pit straight).
- Added `data/tracks/silverstone.json` (track data + source metadata) and `data/tracks/silverstone-preview.svg` (visual reference) to the repo.
- Note: OpenStreetMap data is ODbL-licensed and requires attribution — the app will need an on-screen credit (e.g. footer/credits) citing OpenStreetMap contributors. Flagged for `CLAUDE.md` / future implementation.

---

## 5. 2026-08-07

**Prompt:**
> lets nail down more of the specification first. What other things should i consider before starting?
> (followed by) Lets go through all of them one by one. Give me an option to skip or add suggestions for later as i want to focus ont he mvp for now

**Summary of changes:**
- Went through the remaining open spec questions one at a time (with a "skip/defer" option each); user accepted the recommended default on every question. No deferrals this round. Final MVP spec decisions:
  - **Drawing**: single continuous stroke (no lifting/multi-stroke); app auto-closes the loop after the stroke ends; free start point AND free direction (cw/ccw doesn't matter); clear-and-redraw allowed before submitting.
  - **Scoring**: triggered by an explicit "Done" button (not on mouse-up); comparison is rotation/position/scale-invariant but **not** mirror-invariant (a flipped drawing should score worse, since it doesn't represent the real driving direction); result view shows percentage **plus** a visual overlay of the user's drawing against the real outline.
  - **UX**: canvas is responsive (scales to viewport); desktop mouse-only input for MVP (touch/stylus stays deferred in `FEATURE_IDEAS.md`).
  - **Technical**: Vite as the build tool; plain CSS/CSS Modules for styling; deployment target left undecided until closer to shippable (no architectural impact since there's no backend).
- Open non-decision to keep in mind: the raw shape-similarity distance still needs a formula/calibration to map to a fair-feeling 0–100% score — this will likely need empirical tuning once real test drawings exist, not a yes/no spec choice.
- No code changes yet. Spec is now complete enough to write `CLAUDE.md` next.

---

## 6. 2026-08-07

**Prompt:**
> Yes

**Summary of changes:**
- Wrote `CLAUDE.md`, consolidating all decisions so far: project overview, MVP mechanics (drawing/loop-closing/scoring-trigger/invariances/result/input/canvas), scoring algorithm notes (resampling requirement, calibration caveat), track data provenance/schema and the outstanding OSM attribution obligation, process rules (update `PROMPT_LOG.md` every prompt, defer out-of-scope ideas to `FEATURE_IDEAS.md`), and the planned project structure for when the app is scaffolded.
- No app code yet — next natural step is scaffolding the Vite + React project itself.

---

## 7. 2026-08-07

**Prompt:**
> Add a code style section to claude.md. Dont use abbreviations for variable names. Avoid one liners. Prefer traditional i++ style loop, Leave sclear lines between logical sections of code. Leave two clear lines between functions

**Summary of changes:**
- Added a "Code style" section to `CLAUDE.md`: no abbreviated names, no one-liners (always braces/multi-line), prefer traditional `for (let i = 0; ...)` loops over `.map()`/`.forEach()`/`for...of`, one blank line between logical sections, two blank lines between function/component definitions.

---

## 8. 2026-08-07

**Prompt:**
> Lets start build. First lets get vite setup and installed correctly

**Summary of changes:**
- Confirmed JavaScript (not TypeScript) for the React app, per project's minimal-tooling direction.
- Scaffolded Vite + React (JS template) into a temp folder and merged the generated files (`index.html`, `package.json`, `vite.config.js`, `.gitignore`, `.oxlintrc.json`, `public/`, `src/`, `README.md`) into the project root — no conflicts with existing docs/`data/`.
- `npm install` initially failed due to a pre-existing, unrelated permissions problem: some entries under `~/.npm/_cacache` are owned by `root` (likely from a prior `sudo npm` run on this machine), blocking npm's cache writes. Worked around it by installing with a temporary `--cache` directory rather than touching root-owned files. **Flagged to user, not fixed** — the global npm cache will keep causing this for any future `npm install` on this machine outside this workaround; fixing it (e.g. `sudo chown -R $(whoami) ~/.npm`) is a system-level change outside this project's scope and needs the user's OK.
- Renamed the package from the leftover scaffold name `vite-scaffold-tmp` to `trackdrawer` in `package.json` (and resynced `package-lock.json`).
- Verified the dev server actually boots and serves (HTTP 200 on `localhost`), then stopped it.
- Updated `CLAUDE.md`'s "Structure" section from "planned" to the real scaffolded layout, and noted npm/oxlint/no-TypeScript as settled facts.
- Not yet done: default Vite boilerplate (`App.jsx`, `App.css`, default assets) is still in place — no actual drawing/scoring app code yet. `README.md` is still the generic Vite template text.

---

## 9. 2026-08-07

**Prompt:**
> Lets make a basic UI first. What do you recommend? Draw an ascii image
> (followed by, after approval) Looks good make it

**Summary of changes:**
- Proposed and got approval on a two-screen layout (drawing screen, result screen with overlay) with an ASCII mockup for each, plus a component breakdown (`App`, `DrawingCanvas`, `Controls`, `ResultOverlay`, `scoring/`).
- Built the full MVP loop:
  - `src/scoring/geometry.js`, `resample.js`, `align.js`, `score.js` — arc-length resampling, closed-form similarity (rotation + uniform scale, no reflection) alignment searched over every cyclic start-offset and both traversal directions, and a percentage score (formula still flagged as needing calibration, per `CLAUDE.md`).
  - `src/components/DrawingCanvas.jsx` — single-continuous-stroke capture via pointer events, responsive canvas sizing (with in-flight rescale of already-captured points on window resize), imperative `getPoints()`/`clear()` API.
  - `src/components/Controls.jsx`, `src/components/ResultOverlay.jsx` — buttons row and SVG comparison overlay (real track dashed, user stroke solid).
  - `src/App.jsx` — screen-state machine (`drawing` / `result`), wired Clear/Done/Try Again to the canvas ref and scoring module.
  - Removed unused default Vite template assets (`react.svg`, `vite.svg`, `hero.png`, `public/icons.svg`) and rewrote `index.css`/`App.css` for the app's own layout.
- Verified in a real browser (via the claude-in-chrome skill), not just by starting the dev server: dispatched synthetic pointer strokes, clicked through Done/Clear/Try Again, inspected console output.
- **Found and fixed two real bugs during that verification**, not just cosmetic ones:
  1. `data/tracks/silverstone.json` stores `points` as `[x, y]` arrays, but every scoring function expected `{x, y}` objects — every op against track points silently produced `NaN`. Worse, because `NaN < Infinity` is always `false`, `findBestAlignment`'s comparison never updated away from its initial identity default, so the bug didn't crash anything — it just silently returned a wrong (unaligned) result and `NaN%`. Fixed by converting the raw arrays to `{x, y}` objects once, at the data-loading boundary (`src/data/tracks.js`), rather than changing every consumer.
  2. `handleTryAgainClick` called `drawingCanvasRef.current.clear()`, but `DrawingCanvas` isn't mounted while on the result screen, so the ref is `null` there — threw on every "Try Again" click. Fixed by deleting that call entirely: a freshly remounted `DrawingCanvas` already starts empty, so it was unnecessary as well as broken.
  - Also hardened `handlePointerDown`'s `setPointerCapture` call with a try/catch after directly observing it throw (a synthetic-pointer-event quirk, not reachable from genuine mouse input, but cheap to guard against since a failure there would otherwise silently break the ability to start a stroke).
- Confirmed clean: `npx oxlint src` passes with no output, and the browser console shows zero exceptions on a fresh run after both fixes.
- MVP is now functionally complete end-to-end (draw → Done → scored result with overlay → Try Again), running at `localhost:5183`. Score calibration remains an open, explicitly-flagged item — a plain oval currently scores `0%` against Silverstone's much more complex shape, which is expected given the placeholder `SCORE_SCALE_FACTOR`, not a bug.
