# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A zero-build static web app for designing and pricing a cat wall (2D planning + Three.js 3D preview). There is **no package.json, no bundler, no test runner, and no dependencies to install**. The client is `index.html` + `styles.css` + a set of native ES modules under `src/` (entry point `src/main.js`). Three.js is pulled at runtime from a jsDelivr CDN via an ES module importmap in `index.html` — so every module can `import * as THREE from "three"` and the bare specifier resolves in the browser.

## Running & deploying

- **Run locally:** serve the repo root over HTTP (module scripts + importmap require a server, not `file://`). e.g. `python3 -m http.server` then open `http://localhost:8000/`.
- **URL presets:** `index.html?demo=1&view=3d` pre-populates a design and opens 3D. `?debug=1` installs `window.catWallDesignerDebug` (used by Playwright screenshots).
- **Deploy:** GitHub Actions (`.github/workflows/pages.yml`) copies `index.html`, `styles.css`, `README.md`, and the whole `src/` directory into a Pages artifact on every push to `main`. No build step runs — the workflow only assembles files, so **any new file under `src/` must be reachable from `src/main.js`'s import graph to ship** (there is no glob).
- **`output/playwright/`** holds committed reference screenshots. There is no test harness in-repo; these are visual snapshots.

## Architecture

The app was split from a single `app.js` into focused ES modules under `src/`. There are no classes — it's plain functions operating on shared module-level singletons. State is the single source of truth; the 2D and 3D views are projections of it.

**Singletons live in `src/state.js`** and are imported everywhere: `state` (the mutable app state), `els` (cached DOM handles), `dragState` (2D drag bookkeeping), `three` (all WebGL scene refs), and `STORAGE_KEY`. Nothing else holds module-level mutable state.

**Module map** (import direction roughly follows this list top-to-bottom; cycles exist but only through function calls, never top-level code, so they're safe):
- `state.js` — the singletons above (imports only `seed-catalog.js`).
- `seed-catalog.js` — `seedCatalog`, the real product data snapshot.
- `utils.js` — pure helpers (`clamp`, `normalizeColor`, `shadeColor`, `formatFeet`/`formatInches`, `escapeHtml`/`escapeAttribute`, `money`, …) plus `showToast`.
- `geometry.js` — wall-space math shared by both views: `getPieceMaxX`, `constrainPlacedPieces`, `getWallBounds`.
- `render.js` — **the orchestration hub.** `updateAll()` fans a state change out to `render2d` / `renderSelected` / `renderPricing` / `renderAnalysis` / `updateThreeScene` and saves. Also owns `setMode`, `syncInputs`, `syncDynamicInputs`. Most feature modules import `updateAll` from here.
- `catalog.js` — catalog panel rendering + URL import (`renderCatalog`, `addPiece`, `createPlacedPieces`/`splitPackagePrice`, `importProduct`, `findCatalogProductByUrl`).
- `view2d.js` — 2D wall stage rendering + DOM pointer dragging.
- `selection.js` — the selected-piece inspector.
- `pricing.js`, `analysis.js` — cost estimate; fit/reach analysis + `runCatSimulation`.
- `persistence.js` — localStorage save/restore + JSON export/import.
- `three-scene.js` — Three.js lifecycle, camera/orbit, `updateThreeScene`, and 3D canvas dragging (raycaster-based).
- `three-models.js` — procedural per-product mesh builders (`buildPieceModel` dispatcher + `buildFrisco*`/`buildArmarkat*`/`buildPawhut*`/… and shared `add*` detail helpers).
- `main.js` — entry point: `bindElements`, `bindEvents`, `applyUrlPreset`, `init()`, and the boot call at the bottom.

**Convention for adding cross-module code:** each module `export {…}`s its public functions at the bottom and imports named symbols from the relevant module. Keep the singletons in `state.js` — do not introduce new module-level mutable state elsewhere. After any state mutation, call `updateAll()` (or a narrower `render*`), never mutate the DOM/scene ad hoc.

**Key state shape:**
- `state.catalog` — starts as `seedCatalog`; URL imports append to it.
- `state.placed` — array of placed pieces `{ id, productId, name, type, model, x, y, width, height, depth, price, face, rotation, … }`. `x`/`y` are in **inches** on the wall.
- `state.wall` — dimensions (inches), color, material, optional right-side `corner`, `photoDataUrl` background.
- `state.cat` — length/height/weight, drives the fit/reach simulation.
- Persisted to localStorage under `STORAGE_KEY`. Bump it (and handle `upgradePlacedPiece` in `persistence.js`) if the placed-piece shape changes incompatibly.

**3D models:** each placed piece maps `piece.model` (a string id like `frisco-cushion-shelf`) to a dedicated builder via the `buildPieceModel()` dispatcher in `three-models.js`. **To add a real product with a custom 3D shape:** add the catalog entry in `seed-catalog.js`, give it a `model` id, write a matching `buildXxx()` in `three-models.js`, and wire it into `buildPieceModel()`. Products with a `packageParts` array explode into independently-movable pieces (`createPlacedPieces`).

**Dragging is dual-mode:** 2D uses DOM pointer events (`view2d.js`); 3D raycasts against a plane on the canvas (`three-scene.js`). Both write back to the same `piece.x`/`piece.y`, then call the shared update path.

## Conventions

- Vanilla ES modules, no framework. DOM is accessed through the cached `els` map, not repeated `getElementById`.
- All measurements are in **inches** internally; `formatFeet` / `formatInches` handle display.
- User-facing strings inserted as HTML go through `escapeHtml` / `escapeAttribute`.
- When editing `seedCatalog`, keep `sourceChecked` dates accurate — README documents the data snapshot and treats prices/ratings as planning data.
