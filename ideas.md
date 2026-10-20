# Durst Darkroom Lab — ideas & next steps

Planning notes for future sessions. Nothing here is implemented. Ordered roughly by
effort/impact; each item has a *minimal* analysis only, not a design.

Branch: `feature/durst-darkroom-lab` · last pushed `b88371d`

---

## (bug) Enlargement / compose geometry is ignored in the developed image

**Symptoms.** The easel composes with lens magnification, pivot, focus (defocus blur),
and head tilt & shift — but the developed print, the chemistry-side tray, and the
exported TIFF/PNG do **not** reflect any of it. The print you "develop" is always the
straight, unmagnified, untilted negative.

**Where.** `src/components/DurstEnlargerMode.tsx`

- Easel draw effect (~line 1107): applies `magnification`, `lensPivot`, `focusOffset`
  → `blurPx`, `headTiltX/Y` (keystone slices), `headShiftX/Y`, and the CMY filtration.
- Print/tray render effect (~line 1596): applies filtration/tone only. Reads none of
  the geometry state.
- `handleExportDevelopedPrint` (~line 1764): draws `scan.fullImageUrl` into a fresh
  2400×1600 canvas with a paper border — no geometry at all.

**Why it happens.** The geometry is expressed as Canvas 2D *draw-time transforms* on
the easel only. There is no shared "compose the projected image" function, so every
other consumer re-derives the image from scratch and silently drops the transform.

**Minimal fix direction.** Extract one pure function, e.g.
`renderProjection(src, opts) -> ImageBitmap/canvas`, taking
`{ magnification, pivot, focus/blur, tilt, shift, filtration, paper, grade }` and used
by easel, tray, and export. That function is also the natural seam for a future GPU
engine (see below).

---

## (feature) Proper paper response: curves + base tone

Today paper is a label plus a base colour and a few tints. Real paper has:

- a **characteristic curve** (toe / straight-line / shoulder), not a linear map;
- **grade/contrast** (paper grade or MG filtration) that changes the curve *slope*,
  not just a global multiplier;
- **base tone** — warm baryta vs. cool RC vs. chloro-bromide green-black; paper white
  itself (Dmin) varies, and warmtone keeps highlights creamy;
- **Dmax** limits (blacks are not pure black on all stocks);
- **reciprocity / exposure→density** conversion (time and aperture combine into
  exposure, then through the curve).

**Research needed (do this before coding).** Find published characteristic curves /
sensitometry for the stocks we already name (Ilford FB Warmtone, Ilford RC Deluxe,
Agfa Brovira, Kodak Ektacolor) — datasheets, Henney & Dudley, Kodak/Ilford technical
pubs. Capture for each: Dmin, Dmax, curve shape (or an approximate gamma toe/shoulder
model), colour of base.

**Minimal direction.** Per-stock data table (`engine/paper/paperStocks.ts`) →
per-pixel pipeline: `exposure → curve(stock, grade) → base tint → Dmin/Dmax clamp`.
Keep it declarative so a GPU port is a data swap.

---

## (feature) Larger development result + grain loupe

The developed print is shown small on the chemistry side. Wanted:

- a **bigger dry-side / print view** (the print as it would hang), and
- a **loupe** to inspect grain and micro-contrast at real magnification.

Mostly UI: enlarge the print canvas and add a magnifier overlay (reuse the existing
grain-scope pattern, or a circular `<canvas>` sampling the print at zoom). The full-
screen inspection already exists as a snapshot loupe — extend rather than duplicate.

**Caveat.** A grain loupe is only meaningful once grain is actually in the image
(next item). Until then it magnifies a clean digital gradient.

---

## (feature) Bake grain into the final image

The easel shows a deterministic "grain" texture, but the developed/exported print is
grain-free. Real prints carry film grain (from the negative) *and* paper texture.

**Minimal direction.** Generate grain once per render at output resolution, seeded
deterministically (same seed → same grain, so it is stable across re-renders and
exports), sized to the final pixel grid, and mixed by partition (shadows grain more
than highlights). This composes naturally with the shared `renderProjection` seam.

---

## (feature) WebGPU engine for Durst mode (shared with the main pipeline)

Goal: a single high-quality engine serving **both** the main inversion pipeline and
Durst mode. Today Durst is CPU Canvas 2D; main is WebGPU/WGSL with a JS fallback.

**Minimal direction.** Define an `EnlargerEngine` interface (render + histogram +
curve LUT) implemented first in WGSL (reusing `engine/webgpu/webgpuPipeline.ts`
patterns), with the Canvas 2D path kept as fallback. Durst-specific passes (filtration,
paper curve, grain, tilt/keystone as a perspective sample) become shader uniforms —
which also *fixes the geometry bug for free* if the shared function is the seam.

**Open question.** Where does the negative→positive model live? Durst deliberately
projects the *true negative*; the main pipeline inverts. The shared engine needs a
"projection mode" flag rather than a second engine.

---

## (maybe) Rust → WASM core

If the WGSL engine's *core math* (curves, LUTs, grain, sampling) is worth sharing with
browsers lacking good WebGPU, compile that core from Rust to WASM and keep WGSL as the
fast path. This replaces the current `wasmEngine.ts` stub (which is JS typed arrays
with a fake `WebAssembly.Memory` — not real WASM).

**Trade-off.** Adds a Rust toolchain + build step to a project that currently has
`npm run build` as the only build. Only worth it if the CPU fallback becomes a real
product concern, not a stub.

---

## (maybe) Migrate whole stack to Tauri + Rust backend

Electron 44 (currently `npm run desktop`) → Tauri, with an event-driven bridge between
the UI and a Rust backend.

**Minimal analysis.** Big blast radius: replaces `electron/main.cjs` +
`preload.cjs` + `window.electronAPI` (used via `getElectronAPI()` in `src/types/film.ts`)
and the release workflow. Tauri gives smaller binaries and a Rust core shared with the
WASM engine. But this is a *platform* decision to make once the engine direction is
settled — doing it before the engine exists risks two rewrites. Keep as a "later/last".

---

## Suggested order

1. **Fix the geometry bug** (small, high value) — and do it by extracting the shared
   projection function, which pays off for everything below.
2. **Paper curves + base tone** (research first).
3. **Bigger print view + grain loupe**, then **bake grain**.
4. **WebGPU engine** behind the shared seam.
5. WASM / Tauri only if the product direction calls for them.

---

## Repo hygiene notes

- `AGENTS.md` and `src/engine/export/pdfWriter.ts` are untracked on purpose
  (`pdfWriter.ts` has no importers).
- Only automated check is `npm run lint` (`tsc --noEmit`) + `npm run build`.
- Durst UI strings are Italian by existing convention.
