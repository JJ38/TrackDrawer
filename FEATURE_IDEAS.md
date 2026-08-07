# Feature Ideas (Deferred / Post-MVP)

MVP is locked to: **freeform drawing on a blank canvas, no guide, no reference shown while drawing.** Everything below is out of scope for v1 but worth revisiting once the core draw → score loop works.

---

## 1. Drawing Modes

### 1a. Flash-then-hide guide
Show the real track outline briefly, fade it out, then let the user draw from memory. A memorization-based difficulty step between "always guided" and pure freeform.

```
Step 1: Show track          Step 2: Track fades         Step 3: Draw from memory
+------------------+        +------------------+        +------------------+
|     ___------___ |        |     ___- - -___  |        |                  |
|    /            \|   -->  |    /    .     \  |   -->  |                  |
|   |    TRACK     ||        |   |     .      | |        |  (blank canvas) |
|    \____________/ |        |    \_ . _______/ |        |                  |
+------------------+        +------------------+        +------------------+
   (visible ~3s)               (fades out ~1s)             (user draws here)
```

### 1b. Always-on ghost guide (tracing mode)
Faint, non-interactive outline of the real track stays visible the whole time as a tracing aid. Easiest mode, good for onboarding/tutorial.

```
+--------------------------+
|     ,--------------.     |   ghost outline (faint gray, click-through)
|    /                \    |
|   |   ┈┈┈┈┈┈┈┈┈┈┈┈┈┈  |   |   user's drawn line (solid, colored)
|   |  ╱ ghost track ╲  |  |   drawn near/over the ghost
|    \ ╲____________╱  /   |
|     `--------------'     |
+--------------------------+
   Ghost stays visible at low opacity for the entire attempt
```

### 1c. Difficulty presets combining guide mode + track scope
```
             | Guide Mode           | Track Scope             |
-------------|-----------------------|--------------------------|
Easy         | Always-on ghost (1b)  | 1 fixed, iconic track    |
Medium       | Flash-then-hide (1a)  | Choose from ~8 tracks    |
Hard         | Freeform (MVP mode)   | Full calendar, randomized|
```

---

## 2. Alternative Scoring Approaches

MVP scoring approach to be decided separately (see open question in CLAUDE.md discussion). Alternatives to keep in mind:

### 3a. Pixel/area overlap scoring
Overlay the user's stroke on the real outline and score by overlap vs. miss vs. extra area. Simple to implement, but sensitive to the drawing's position/scale/rotation relative to the reference — would likely need the user's drawing auto-centered and scaled first.

```
Real track outline        User drawing              Overlay comparison
   ________                 ________                   ________
  /        \               /        \                 /▓▓▓▓▓▓▓▓\
 |          |     +       |    ..    |       =>       |▓▓..░░..▓|   ▓ = overlap (correct)
 |          |             |  ..  ..  |                 |▓..░░░..▓|   . = drawn, no track there
  \________/               \________/                  \▓▓▓▓▓▓▓▓/    ░ = track present, missed

  Score % = overlap_area / (overlap_area + missed_area + extra_area)
```

### 3b. Shape-similarity algorithm (Procrustes / Fréchet / Hausdorff distance)
Normalize the user's stroke (translate to same centroid, scale, and optimally rotate) before comparing curve shape to the reference path. More forgiving of where/how big the user draws, closer in spirit to how the original "draw a perfect circle" game scores.

```
Real track (reference)        User drawing (raw)
      curve A                       curve B
        |                              |
        v                              v
   translate to shared centroid, scale to same bounding size,
   rotate to best-fit alignment, then measure point-wise distance
   between corresponding points on A and B
```

---

## 3. Share Result Image

Let the user export/share an image combining their drawing, the real track outline, and their score — a single shareable card, generated from the same overlay already shown on the result screen (render it to an offscreen canvas, composite in the score text, produce a PNG).

```
+-----------------------------------+
|                                   |
|         ............             |
|       ..          ..             |
|      .    ______    .            |
|     .    /      \    .           |
|     .   |  ####  |   .           |
|      .   \______/   .            |
|       ..          ..             |
|         ............             |
|                                   |
|          Suzuka Circuit          |
|             94.8%                |
|          "Incredible!"           |
|                                   |
|         Drawn on TrackDrawer     |
+-----------------------------------+
        [ Share ]   [ Download ]
```

- "Share" uses the Web Share API where available (mobile/some desktop browsers) to hand the image to the OS share sheet; "Download" is the universal fallback (saves the PNG directly).
- Needs the ODbL attribution to stay visible/legible on the exported image itself, not just in the app UI, since the image leaves the app's context once shared.

---

## 4. Other future ideas (not yet scoped)
- Leaderboard / daily challenge track
- Mobile touch-drawing support
- Track packs by era or region (e.g. "Classic circuits," "Street circuits")
