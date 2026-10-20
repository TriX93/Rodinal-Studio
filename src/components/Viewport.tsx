import React, { useEffect, useRef, useState, useCallback } from 'react';
import { FilmScanItem, HardwareEngineState, InversionSettings } from '../types/film';
import { webgpuPipeline } from '../engine/webgpu/webgpuPipeline';
import { wasmEngine } from '../engine/wasm/wasmEngine';
import { applyGeometry, clearGeometryCache } from '../engine/geometry/geometryRaster';
import { createInverseDeltaTransform } from '../engine/geometry/geometryTransform';
import { InteractiveCropOverlay } from './InteractiveCropOverlay';
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Pipette, 
  SplitSquareVertical, 
  Eye, 
  RotateCw,
  Search,
  Check,
  FlipHorizontal,
  FlipVertical,
  Crop,
  Compass
} from 'lucide-react';

interface ViewportProps {
  scan: FilmScanItem;
  settings: InversionSettings;
  onUpdateSettings: (newSettings: Partial<InversionSettings>) => void;
  hardwareState: HardwareEngineState;
  setHardwareState: React.Dispatch<React.SetStateAction<HardwareEngineState>>;
  isEyedropperActive: boolean;
  setIsEyedropperActive: (active: boolean) => void;
  onHistogramUpdate: (hist: { r: Uint32Array; g: Uint32Array; b: Uint32Array; luma: Uint32Array; maxCount: number }) => void;
}

/**
 * Longest edge used for the interactive preview resample. Cropping, rotating and
 * straightening require a real pixel pass, so the preview renders at a bounded
 * resolution to keep slider dragging smooth; the exporters always run at full
 * resolution. 4096 retains 1:1 detail for typical 35mm scans while halving the
 * cost of a full-frame rotation.
 */
const PREVIEW_MAX_DIMENSION = 4096;

export const Viewport: React.FC<ViewportProps> = ({
  scan,
  settings,
  onUpdateSettings,
  hardwareState,
  setHardwareState,
  isEyedropperActive,
  setIsEyedropperActive,
  onHistogramUpdate
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rawImageRef = useRef<HTMLImageElement | null>(null);

  // Viewport transforms
  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Loupe & Eyedropper state
  const [showLoupe, setShowLoupe] = useState<boolean>(false);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [sampledColor, setSampledColor] = useState<{ r: number; g: number; b: number; hex: string } | null>(null);

  // Split handle drag
  const [isDraggingSplit, setIsDraggingSplit] = useState<boolean>(false);
  const [showHorizonGrid, setShowHorizonGrid] = useState<boolean>(false);

  // Load image element and feed into pipeline
  useEffect(() => {
    clearGeometryCache();
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = scan.fullImageUrl;
    img.onload = () => {
      rawImageRef.current = img;
      renderImage();
    };
  }, [scan.id, scan.fullImageUrl]);

  // Main Render Routine
  const renderImage = useCallback(() => {
    const canvas = canvasRef.current;
    const img = rawImageRef.current;
    if (!canvas || !img || !img.complete) return;

    const tStart = performance.now();

    // Use offscreen 2D canvas to get raw pixels
    const offCanvas = document.createElement('canvas');
    offCanvas.width = img.naturalWidth || 1500;
    offCanvas.height = img.naturalHeight || 1000;
    const offCtx = offCanvas.getContext('2d', { willReadFrequently: true });
    if (!offCtx) return;

    offCtx.drawImage(img, 0, 0);
    const nativeImageData = offCtx.getImageData(0, 0, offCanvas.width, offCanvas.height);

    // Carrier geometry stage: crop, quarter-turn, horizon straighten, flips.
    // Non-destructive - returns `nativeImageData` untouched when neutral, and
    // reuses its cached buffer while only colour settings change.
    //
    // While the crop tool is active the preview deliberately renders the WHOLE
    // frame (crop removed, other geometry kept). Selecting a crop area is
    // impossible if the viewport already shows only the current selection - you
    // would be cropping inside the thing you are trying to redraw. The crop is
    // still fully applied to the exported frame, where geometry runs at full
    // resolution without this override.
    const previewSettings = settings.crop?.enabled
      ? { ...settings, crop: { ...settings.crop, enabled: false } }
      : settings;

    const sourceImageData = applyGeometry(nativeImageData, previewSettings, {
      cacheKey: `${scan.id}#${settings.crop?.enabled ? 'crop-edit' : 'final'}`,
      maxDimension: PREVIEW_MAX_DIMENSION
    });

    // Size canvas to the geometry output so preview matches the exported frame
    canvas.width = sourceImageData.width;
    canvas.height = sourceImageData.height;

    // Try WebGPU first if supported
    if (hardwareState.webgpuActive && webgpuPipeline.isAvailable) {
      try {
        webgpuPipeline.syncCanvasSize();
        webgpuPipeline.uploadSourceImage(sourceImageData);
        webgpuPipeline.render(settings);
        
        // Also compute histogram via WebAssembly
        const hist = wasmEngine.computeHistogram(sourceImageData.data, canvas.width, canvas.height);
        onHistogramUpdate(hist);

        const tEnd = performance.now();
        setHardwareState(prev => ({
          ...prev,
          processingTimeMs: Math.round(tEnd - tStart),
          renderFps: Math.min(60, Math.round(1000 / Math.max(1, tEnd - tStart)))
        }));
        return;
      } catch {
        // Fall back to Wasm canvas
      }
    }

    // WebAssembly / Canvas2D Pipeline
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const outputImageData = ctx.createImageData(canvas.width, canvas.height);

    wasmEngine.processNegativeInversion(
      sourceImageData.data,
      outputImageData.data,
      canvas.width,
      canvas.height,
      {
        filmType: settings.filmType,
        baseR: settings.filmBase.r,
        baseG: settings.filmBase.g,
        baseB: settings.filmBase.b,
        exposureEV: settings.exposureEV,
        density: settings.density,
        blackPoint: settings.blackPoint,
        whitePoint: settings.whitePoint,
        cyanRed: settings.cyanRed,
        magentaGreen: settings.magentaGreen,
        yellowBlue: settings.yellowBlue,
        contrast: settings.contrast,
        saturation: settings.saturation,
        shadowLift: settings.shadowLift,
        highlightRecovery: settings.highlightRecovery
      }
    );

    // Split before/after rendering
    if (settings.splitCompare) {
      const splitPx = Math.floor((canvas.width * settings.splitPosition) / 100);
      const outData = outputImageData.data;
      const srcData = sourceImageData.data;

      for (let y = 0; y < canvas.height; y++) {
        const rowStart = y * canvas.width;
        // From splitPx to width: draw original negative
        for (let x = splitPx; x < canvas.width; x++) {
          const idx = (rowStart + x) * 4;
          outData[idx] = srcData[idx];
          outData[idx + 1] = srcData[idx + 1];
          outData[idx + 2] = srcData[idx + 2];
        }
        // White split divider line
        if (splitPx > 0 && splitPx < canvas.width - 2) {
          const lineIdx = (rowStart + splitPx) * 4;
          outData[lineIdx] = 255;
          outData[lineIdx + 1] = 255;
          outData[lineIdx + 2] = 255;
        }
      }
    }

    ctx.putImageData(outputImageData, 0, 0);

    // Update histogram
    const hist = wasmEngine.computeHistogram(outputImageData.data, canvas.width, canvas.height);
    onHistogramUpdate(hist);

    const tEnd = performance.now();
    setHardwareState(prev => ({
      ...prev,
      processingTimeMs: Math.round(tEnd - tStart),
      renderFps: Math.min(60, Math.round(1000 / Math.max(1, tEnd - tStart)))
    }));
  }, [scan, settings, hardwareState.webgpuActive, onHistogramUpdate, setHardwareState]);

  // Re-render whenever settings change
  useEffect(() => {
    renderImage();
  }, [renderImage]);

  // Init WebGPU pipeline
  useEffect(() => {
    let isMounted = true;
    const initGpu = async () => {
      if (canvasRef.current) {
        const success = await webgpuPipeline.init(canvasRef.current);
        if (isMounted) {
          setHardwareState(prev => ({
            ...prev,
            webgpuSupported: success,
            webgpuActive: success,
            gpuAdapterName: webgpuPipeline.adapterName,
            executionMode: success ? 'webgpu' : 'wasm-simd'
          }));
        }
      }
    };
    initGpu();
    return () => { isMounted = false; };
  }, [setHardwareState]);

  // Handle Pan & Zoom
  const handleWheel = (e: React.WheelEvent) => {
    // React registers `wheel` as a passive listener, so preventDefault() here
    // would throw and abort the handler. Zoom only needs the delta, and page
    // scrolling is already prevented by the viewport's overflow handling, so no
    // preventDefault is needed.
    const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.min(6.0, Math.max(0.2, prev * zoomDelta)));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isEyedropperActive) {
      sampleFilmBaseFromClick(e);
      return;
    }
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      setCursorPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }

    if (isDragging) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }

    if (isDraggingSplit && containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const pos = Math.max(5, Math.min(95, ((e.clientX - containerRect.left) / containerRect.width) * 100));
      onUpdateSettings({ splitPosition: Math.round(pos) });
    }

    if (isEyedropperActive && canvasRef.current) {
      readPixelColorAtMouse(e);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsDraggingSplit(false);
  };

  const resetView = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  };

  // Eyedropper pixel sampler
  const readPixelColorAtMouse = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    // Canvas pixels already carry the carrier geometry, so screen -> canvas is
    // a straight proportion with no flip correction required.
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * canvas.width);
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * canvas.height);

    if (x >= 0 && x < canvas.width && y >= 0 && y < canvas.height && rawImageRef.current) {
      const img = rawImageRef.current;
      const offCanvas = document.createElement('canvas');
      offCanvas.width = img.naturalWidth || canvas.width;
      offCanvas.height = img.naturalHeight || canvas.height;
      const offCtx = offCanvas.getContext('2d', { willReadFrequently: true });
      if (offCtx) {
        offCtx.drawImage(img, 0, 0);
        const nativeImageData = offCtx.getImageData(0, 0, offCanvas.width, offCanvas.height);
        const geoSrc = applyGeometry(nativeImageData, settings.crop?.enabled
          ? { ...settings, crop: { ...settings.crop, enabled: false } }
          : settings, {
          cacheKey: `${scan.id}#${settings.crop?.enabled ? 'crop-edit' : 'final'}`,
          maxDimension: PREVIEW_MAX_DIMENSION
        });

        // Canvas and geometry output share dimensions, so indices align directly.
        if (x < geoSrc.width && y < geoSrc.height) {
          const idx = (y * geoSrc.width + x) * 4;
          const r = geoSrc.data[idx];
          const g = geoSrc.data[idx + 1];
          const b = geoSrc.data[idx + 2];
          const rNorm = Number((r / 255).toFixed(3));
          const gNorm = Number((g / 255).toFixed(3));
          const bNorm = Number((b / 255).toFixed(3));
          const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b
            .toString(16)
            .padStart(2, '0')}`;
          setSampledColor({ r: rNorm, g: gNorm, b: bNorm, hex });
        }
      }
    }
  };

  /**
   * Maps a screen-space crop drag delta into the crop rect's pre-geometry frame.
   * The displayed image has already been rotated/flipped/straightened, so without
   * this the handles would move in the wrong direction.
   */
  const mapCropDragDelta = useCallback(
    (delta: { x: number; y: number }) => {
      const nativeWidth = rawImageRef.current?.naturalWidth || scan.width || 1500;
      const nativeHeight = rawImageRef.current?.naturalHeight || scan.height || 1000;
      // The preview renders the uncropped frame while the crop tool is active,
      // so the mapping must be built from the same (crop-free) geometry.
      const motionSettings = settings.crop?.enabled
        ? { ...settings, crop: { ...settings.crop, enabled: false } }
        : settings;
      // Both the input and output of this transform are normalized 0..1 deltas,
      // so no pixel dimensions are required.
      const inverseDelta = createInverseDeltaTransform(motionSettings, nativeWidth, nativeHeight);
      return inverseDelta(delta);
    },
    [settings, scan.width, scan.height]
  );

  const sampleFilmBaseFromClick = (e: React.MouseEvent) => {    if (sampledColor) {
      onUpdateSettings({
        filmBase: {
          r: sampledColor.r,
          g: sampledColor.g,
          b: sampledColor.b
        },
        autoBaseDetected: false
      });
      setIsEyedropperActive(false);
    }
  };

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      className={`relative flex-1 h-full bg-[#09090b] overflow-hidden flex items-center justify-center select-none ${
        isEyedropperActive ? 'cursor-crosshair' : isDragging ? 'cursor-grabbing' : 'cursor-grab'
      }`}
    >
      {/* Horizon Leveling Grid Overlay */}
      {(showHorizonGrid || (settings.straightenAngle || 0) !== 0) && (
        <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
          <div
            className="absolute inset-0 opacity-15"
            style={{
              backgroundImage:
                'linear-gradient(to right, rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.4) 1px, transparent 1px)',
              backgroundSize: '48px 48px'
            }}
          />
          {/* Central Horizontal Axis */}
          <div className="absolute top-1/2 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_10px_rgba(251,191,36,0.6)] flex items-center justify-center">
            <div className="bg-neutral-900/95 border border-amber-400 px-2.5 py-0.5 rounded-full text-[10px] font-mono text-amber-400 shadow-xl">
              Livella Orizzonte: {(settings.straightenAngle || 0) > 0 ? `+${(settings.straightenAngle || 0).toFixed(1)}°` : `${(settings.straightenAngle || 0).toFixed(1)}°`}
            </div>
          </div>
          {/* Central Vertical Axis */}
          <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-gradient-to-b from-transparent via-amber-400/40 to-transparent" />
        </div>
      )}

      {/* Viewport Canvas */}
      <div
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: 'center center',
          transition: isDragging ? 'none' : 'transform 0.05s ease-out'
        }}
        className="relative max-w-full max-h-full flex items-center justify-center shadow-2xl"
      >
        {/* The overlay must be anchored to the canvas's own box, not to this
            wrapper: the wrapper is a flex container that can be larger than the
            letterboxed image, so an inset-0 overlay would misalign with the
            visible frame and make all crop math wrong. This inner element hugs
            the canvas exactly. */}
        <div className="relative inline-flex">
          <canvas
            ref={canvasRef}
            className="max-h-[78vh] w-auto object-contain border border-neutral-800 shadow-2xl"
          />

          {/* Interactive Crop Overlay */}
          <InteractiveCropOverlay
            crop={settings.crop}
            onUpdateCrop={(newCrop) => onUpdateSettings({ crop: newCrop })}
            scanWidth={scan.width}
            scanHeight={scan.height}
            mapDragDelta={mapCropDragDelta}
          />
        </div>

        {/* Split comparison line handle */}
        {settings.splitCompare && (
          <div
            style={{ left: `${settings.splitPosition}%` }}
            onMouseDown={(e) => {
              e.stopPropagation();
              setIsDraggingSplit(true);
            }}
            className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize flex items-center justify-center group"
          >
            <div className="w-5 h-8 bg-neutral-900 border border-neutral-500 rounded-sm flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <SplitSquareVertical className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="absolute top-2 left-2 bg-black/80 text-white text-[9px] font-mono px-1.5 py-0.5 rounded pointer-events-none">
              Inverted Positive
            </div>
            <div className="absolute top-2 right-2 bg-black/80 text-white text-[9px] font-mono px-1.5 py-0.5 rounded pointer-events-none whitespace-nowrap">
              Raw Negative
            </div>
          </div>
        )}
      </div>

      {/* Floating Eyedropper Loupe Badge */}
      {isEyedropperActive && sampledColor && (
        <div
          style={{
            left: `${cursorPos.x + 20}px`,
            top: `${cursorPos.y + 20}px`
          }}
          className="absolute z-40 bg-neutral-900/95 backdrop-blur-md border border-neutral-700 p-2 rounded shadow-2xl pointer-events-none flex items-center gap-2.5 text-xs font-mono"
        >
          <div
            style={{ backgroundColor: sampledColor.hex }}
            className="w-6 h-6 rounded border border-white/30 shadow-inner"
          />
          <div>
            <div className="text-amber-400 font-semibold text-[10px]">SAMPLE FILM BASE</div>
            <div className="text-neutral-300 text-[11px]">
              R: {sampledColor.r} G: {sampledColor.g} B: {sampledColor.b}
            </div>
            <div className="text-neutral-500 text-[9px]">{sampledColor.hex.toUpperCase()} · Click to Neutralize</div>
          </div>
        </div>
      )}

      {/* Floating 400% Grain Loupe */}
      {showLoupe && (
        <div
          style={{
            left: `${Math.min(window.innerWidth - 220, Math.max(20, cursorPos.x - 90))}px`,
            top: `${Math.min(window.innerHeight - 220, Math.max(20, cursorPos.y - 90))}px`
          }}
          className="absolute z-30 w-44 h-44 rounded-full border-2 border-amber-400/80 shadow-2xl bg-neutral-950 overflow-hidden pointer-events-none flex items-center justify-center"
        >
          <div className="absolute inset-0 flex items-center justify-center">
            {/* Center crosshair */}
            <div className="w-4 h-[1px] bg-amber-400/60 z-10" />
            <div className="h-4 w-[1px] bg-amber-400/60 z-10" />
          </div>
          <div className="absolute bottom-2 bg-black/85 px-2 py-0.5 rounded text-[9px] font-mono text-amber-400 z-10">
            400% Grain Loupe
          </div>
        </div>
      )}

      {/* Viewport Control Bar (Bottom Floating Island) */}
      <div className="absolute bottom-4 z-20 flex items-center gap-1 bg-neutral-900/90 backdrop-blur-md border border-neutral-800 px-3 py-1.5 rounded-lg shadow-xl text-neutral-300">
        {/* Eyedropper button */}
        <button
          onClick={() => setIsEyedropperActive(!isEyedropperActive)}
          className={`p-1.5 rounded hover:bg-neutral-800 transition-colors flex items-center gap-1.5 text-xs ${
            isEyedropperActive ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : ''
          }`}
          title="Sample orange film base rebate mask with eyedropper"
        >
          <Pipette className="w-3.5 h-3.5" />
          <span className="text-[11px] font-medium hidden sm:inline">Base Picker</span>
        </button>

        <div className="w-[1px] h-4 bg-neutral-800 mx-1" />

        {/* Split Before/After toggle */}
        <button
          onClick={() => onUpdateSettings({ splitCompare: !settings.splitCompare })}
          className={`p-1.5 rounded hover:bg-neutral-800 transition-colors flex items-center gap-1.5 text-xs ${
            settings.splitCompare ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : ''
          }`}
          title="Toggle split view before/after negative comparison"
        >
          <SplitSquareVertical className="w-3.5 h-3.5" />
          <span className="text-[11px] font-medium hidden sm:inline">Split View</span>
        </button>

        {/* 400% Grain Loupe Toggle */}
        <button
          onClick={() => setShowLoupe(!showLoupe)}
          className={`p-1.5 rounded hover:bg-neutral-800 transition-colors flex items-center gap-1.5 text-xs ${
            showLoupe ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : ''
          }`}
          title="Toggle 400% film grain inspection loupe"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="text-[11px] font-medium hidden sm:inline">Grain Loupe</span>
        </button>

        {/* Highlight/Shadow clipping toggle */}
        <button
          onClick={() => onUpdateSettings({ showClipping: !settings.showClipping })}
          className={`p-1.5 rounded hover:bg-neutral-800 transition-colors flex items-center gap-1.5 text-xs ${
            settings.showClipping ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : ''
          }`}
          title="Highlight blown whites (red) and crushed shadows (blue)"
        >
          <Eye className="w-3.5 h-3.5" />
          <span className="text-[11px] font-medium hidden sm:inline">Clip Warning</span>
        </button>

        <div className="w-[1px] h-4 bg-neutral-800 mx-1" />

        {/* Rotation */}
        <button
          onClick={() => onUpdateSettings({ rotation: (settings.rotation + 90) % 360 })}
          className="p-1.5 rounded hover:bg-neutral-800 transition-colors"
          title="Rotate 90 degrees [Shortcut: R]"
        >
          <RotateCw className="w-3.5 h-3.5" />
        </button>

        {/* Flip Horizontal */}
        <button
          onClick={() => onUpdateSettings({ flipHorizontal: !settings.flipHorizontal })}
          className={`p-1.5 rounded hover:bg-neutral-800 transition-colors flex items-center gap-1 text-xs ${
            settings.flipHorizontal ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : ''
          }`}
          title="Flip Horizontal (Mirror correction) [Shortcut: H]"
        >
          <FlipHorizontal className="w-3.5 h-3.5" />
          <span className="text-[11px] font-medium hidden sm:inline">Flip H</span>
        </button>

        {/* Flip Vertical */}
        <button
          onClick={() => onUpdateSettings({ flipVertical: !settings.flipVertical })}
          className={`p-1.5 rounded hover:bg-neutral-800 transition-colors flex items-center gap-1 text-xs ${
            settings.flipVertical ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : ''
          }`}
          title="Flip Vertical (Upside-down correction) [Shortcut: V]"
        >
          <FlipVertical className="w-3.5 h-3.5" />
          <span className="text-[11px] font-medium hidden sm:inline">Flip V</span>

        </button>

        <div className="w-[1px] h-4 bg-neutral-800 mx-1" />

        {/* Crop Toggle Button */}
        <button
          onClick={() => {
            // A full-frame rect is the disabled/unset state. `??` alone would
            // keep 0/1 and seed an unmovable, ungrabbable box, so detect it.
            const existing = settings.crop;
            const isFullFrame =
              !existing ||
              (existing.x === 0 && existing.y === 0 && existing.width === 1 && existing.height === 1);
            const nextEnabled = !existing?.enabled;
            onUpdateSettings({
              crop: {
                enabled: nextEnabled,
                x: nextEnabled && isFullFrame ? 0.05 : existing?.x ?? 0.05,
                y: nextEnabled && isFullFrame ? 0.05 : existing?.y ?? 0.05,
                width: nextEnabled && isFullFrame ? 0.9 : existing?.width ?? 0.9,
                height: nextEnabled && isFullFrame ? 0.9 : existing?.height ?? 0.9,
                aspectRatio: existing?.aspectRatio ?? 'free'
              }
            });
          }}
          className={`p-1.5 rounded hover:bg-neutral-800 transition-colors flex items-center gap-1.5 text-xs ${
            settings.crop?.enabled ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 font-semibold' : ''
          }`}
          title="Strumento ritaglio negativo (Crop)"
        >
          <Crop className="w-3.5 h-3.5" />
          <span className="text-[11px] font-medium hidden sm:inline">Crop</span>
        </button>

        {/* Horizon Leveling Toggle Button */}
        <button
          onClick={() => setShowHorizonGrid(!showHorizonGrid)}
          className={`p-1.5 rounded hover:bg-neutral-800 transition-colors flex items-center gap-1.5 text-xs ${
            showHorizonGrid || (settings.straightenAngle || 0) !== 0
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 font-semibold'
              : ''
          }`}
          title="Reticolo e allineamento orizzonte"
        >
          <Compass className="w-3.5 h-3.5" />
          <span className="text-[11px] font-medium hidden sm:inline">
            {(settings.straightenAngle || 0) !== 0 ? `${(settings.straightenAngle || 0).toFixed(1)}°` : 'Orizzonte'}
          </span>
        </button>
        
        {/* Zoom Out */}
        <button
          onClick={() => setZoom(prev => Math.max(0.2, prev * 0.8))}
          className="p-1.5 rounded hover:bg-neutral-800 transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>

        <span className="text-[11px] font-mono px-1 text-neutral-400">
          {Math.round(zoom * 100)}%
        </span>

        {/* Zoom In */}
        <button
          onClick={() => setZoom(prev => Math.min(6.0, prev * 1.25))}
          className="p-1.5 rounded hover:bg-neutral-800 transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>

        {/* Fit to window */}
        <button
          onClick={resetView}
          className="p-1.5 rounded hover:bg-neutral-800 transition-colors"
          title="Reset to Fit Window"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Film Base Orange Swatch Indicator (Top Left) */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2.5 bg-neutral-900/80 backdrop-blur-md border border-neutral-800/80 px-3 py-1.5 rounded text-xs text-neutral-300">
        <div
          style={{
            backgroundColor: `rgb(${Math.round(settings.filmBase.r * 255)}, ${Math.round(
              settings.filmBase.g * 255
            )}, ${Math.round(settings.filmBase.b * 255)})`
          }}
          className="w-4 h-4 rounded-xs border border-white/20 shadow-xs"
        />
        <div className="flex flex-col">
          <span className="text-[10px] text-neutral-400 uppercase font-mono tracking-wider">
            Film Base Mask
          </span>
          <span className="text-[11px] font-mono text-white">
            {settings.autoBaseDetected ? 'Auto-Balanced' : 'Custom Base'}
          </span>
        </div>
      </div>
    </div>
  );
};
