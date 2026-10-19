# Rodinal Studio

> **Hardware-accelerated, client-side digital darkroom for inverting film negatives from Nikon RAW exposures (`.NEF` / `.NRW` / `.DNG`) with 16-bit uncompressed archival TIFF and high-resolution JPEG export.**

Powered by **WebGPU (WGSL compute/fragment shaders)** and **WebAssembly (linear memory debayering)** running 100% locally in your browser. Zero cloud uploads, zero server processing, and zero telemetry.

---

## Highlights

- **WebGPU WGSL Shader Pipeline**: Real-time 60 FPS negative inversion, orange mask neutralization, per-channel color balancing, and film grain synthesis directly on the GPU.
- **WebAssembly Engine**: High-throughput CFA Bayer debayering (RGGB/BGGR), optical density transforms, and 256-bin multi-channel RGB/Luma histogram accumulation.
- **Nikon RAW Ingestion**: Full client-side parsing of Nikon `.NEF`, `.NRW`, `.DNG`, and TIFF files with automatic embedded raw preview stream extraction and MakerNote EXIF metadata preservation.
- **Orange Base Mask Neutralization**: Interactive eyedropper sampler with real-time RGB readout, auto-detect base estimation, and granular Base Red, Green, and Blue sliders.
- **Authentic Film Science**:
  - **C-41 Color Negative**: Logarithmic density inversion ($D = -\log_{10}(I / I_{\text{base}})$) with coupler mask subtraction.
  - **Silver Halide Black & White**: Transmission inversion with characteristic D-log H curve and silver density response.
  - **E-6 Slide / Positive**: Precise exposure compensation and color balance for reversal stocks.
- **Photographic Lab Controls**: Cyan–Red, Magenta–Green, and Yellow–Blue color balancing wheels, Optical Density slope, Exposure EV compensation, Shadow Lift, and Highlight Recovery.
- **Interactive RGB Tone Curves**: Custom SVG spline curves editor with draggable control points for Master, Red, Green, and Blue channels.
- **10 Classic Film Emulation Profiles**: Kodak Portra 400, Portra 160, Gold 200, Ektar 100, Fujifilm Pro 400H, Superia X-TRA 400, CineStill 800T, Kodak Tri-X 400, Ilford HP5 Plus, and Fujifilm Neopan Acros 100.
- **Laboratory Inspection Tools**: Split before/after comparison slider, 400% 1:1 grain loupe, and shadow crush / highlight blow-out clipping indicators.
- **Carrier Alignment & Orientation**: 90° rotation, Flip Horizontal (emulsion-side mirror correction), and Flip Vertical (inverted carrier correction).
- **Durst Laborator Enlarger Simulator**: Interactive analog darkroom printing simulation featuring a Durst CLS 501 Dichroic mixing head (Yellow, Magenta, Cyan filtration dials from 0–130), Ilford Multigrade contrast grade selector (Grade 00 through 5), aperture click stops (f/2.8 to f/16), optical easel projection, test strip generator, Paterson critical grain scope, red safety swing arm, digital LED exposure timer with Web Audio relay clicks and ticks, 3-tray wet chemistry bench (Dektol Developer, Stop Bath, Rapid Fixer) with fluid agitation ripples, paper fogging simulation, and archival gelatin silver master print export.
- **16-Bit Archival TIFF 6.0 Exporter**: True uncompressed 48-bit RGB TIFF masters with custom DPI tags (300, 600, or 1200 DPI archival standards), Nikon camera metadata, and batch film roll export.

---

## Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| <kbd>E</kbd> | Toggle Film Base Eyedropper Sampler |
| <kbd>S</kbd> | Toggle Split Before / After Negative Comparison |
| <kbd>C</kbd> | Toggle Shadow Crush & Highlight Blowout Warning |
| <kbd>H</kbd> | Flip Horizontal (Emulsion mirror correction) |
| <kbd>V</kbd> | Flip Vertical (Carrier inversion correction) |
| <kbd>R</kbd> | Rotate 90° Clockwise |
| <kbd>Scroll</kbd> | Viewport Zoom In / Out |
| <kbd>Drag</kbd> | Pan Canvas |

---

## Architecture

```
rodinal-studio/
├── src/
│   ├── engine/
│   │   ├── webgpu/
│   │   │   └── webgpuPipeline.ts  # WGSL shaders for real-time 60fps GPU inversion
│   │   ├── wasm/
│   │   │   └── wasmEngine.ts      # WebAssembly linear memory debayering & histogram
│   │   ├── raw/
│   │   │   └── nefParser.ts       # Nikon .NEF TIFF IFD parser & raw stream decoder
│   │   ├── export/
│   │   │   └── tiffWriter.ts      # Uncompressed 16-bit RGB TIFF 6.0 encoder
│   │   └── presets/
│   │       └── filmPresets.ts     # Laboratory film stock color profiles
│   ├── components/
│   │   ├── Header.tsx             # 3-Zone top navigation & hardware telemetry
│   │   ├── Viewport.tsx           # WebGPU canvas, pan/zoom, split slider & loupe
│   │   ├── FilmStrip.tsx          # 35mm film roll carrier strip with frame numbers
│   │   ├── SidebarControls.tsx    # Tabbed laboratory color grading controls
│   │   ├── CurvesEditor.tsx       # Draggable SVG spline RGB curves
│   │   ├── HistogramPanel.tsx     # Real-time logarithmic/linear RGB parade
│   │   ├── ExportModal.tsx        # 16-bit TIFF & High-Res JPEG export dialog
│   │   └── InfoModal.tsx          # Hardware diagnostics & engine specs
│   ├── types/
│   │   └── film.ts                # TypeScript interfaces
│   ├── App.tsx
│   └── main.tsx
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- A modern browser supporting **WebGPU** (Chrome 113+, Edge 113+, Safari 18+, or Firefox Nightly with WebGPU enabled). If WebGPU is disabled or unsupported, the app seamlessly falls back to the **WebAssembly SIMD** engine.

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/rodinal-studio.git
cd rodinal-studio

# Install dependencies
npm install

# Option A: Start Web browser version
npm run dev

# Option B: Launch Native Desktop App (Windows, macOS, Linux)
npm run desktop

# Option C: Build standalone native distribution binaries
npm run desktop:dist
```

---

## Desktop Application (Windows · macOS · Linux)

Rodinal Studio runs as a native desktop application powered by **Electron 44+** with hardware-accelerated WebGPU/Vulkan flags:

- **Windows 10 / 11** (x64 / ARM64): Native OS file picker and high-DPI display calibration.
- **macOS** (Apple Silicon M1–M4 & Intel): Native macOS menu bar shortcuts (<kbd>Cmd+O</kbd>, <kbd>Cmd+E</kbd>, <kbd>Cmd+R</kbd>).
- **Linux** (Ubuntu, Fedora, Arch, Debian): AppImage and native window manager integration.

Running as a desktop application unlocks direct local disk access for multi-gigabyte film roll batches without browser upload limits.

---

## Licensing & Asset Attribution

### Application Code
The source code of **Rodinal Studio** is licensed under the [Apache License, Version 2.0](LICENSE) (SPDX: `Apache-2.0`).

### Demo Film Negative Assets
The pre-loaded demonstration negative scans (`DSC_4821_Portra400.NEF`, `DSC_4822_TriX400.NEF`, `DSC_4823_Superia400.NEF`, and `DSC_4824_CineStill800T.NEF`) were custom-generated for this project to serve as open-source calibration and testing benchmarks for analog digitizers.

- **Status**: Public Domain Dedication ([CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/)).
- **Rights**: Free for personal, academic, and commercial use with no copyright restrictions or mandatory attribution.

### Trademark Notice
*Nikon*, *Nikkor*, *Coolscan*, *Kodak*, *Portra*, *Tri-X*, *Ektar*, *Fujifilm*, *Superia*, *CineStill*, and *Ilford* are trademarks or registered trademarks of their respective holders. Their reference herein is strictly nominative for the purpose of identifying film emulsions, scanner profiles, and camera compatibility. Rodinal Studio is an independent open-source project and is not affiliated with, endorsed by, or sponsored by any of these entities.
