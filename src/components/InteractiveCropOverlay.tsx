import React, { useRef, useState, useEffect } from 'react';
import { CropSettings, CropAspectRatio } from '../types/film';

interface InteractiveCropOverlayProps {
  crop: CropSettings;
  onUpdateCrop: (newCrop: CropSettings) => void;
  scanWidth: number;
  scanHeight: number;
  /**
   * Optional direction resolver. Screen-space drag deltas are expressed in the
   * DISPLAYED (post-geometry) frame; the crop rect lives in the pre-geometry
   * source frame. This maps a display-space delta vector into source space so
   * handles track the cursor under rotation/flip/straighten. Identity when
   * omitted.
   */
  mapDragDelta?: (delta: { x: number; y: number }) => { x: number; y: number };
}

type DragMode = 'move' | 'new' | 'nw' | 'ne' | 'se' | 'sw' | 'n' | 's' | 'e' | 'w' | null;

/**
 * Parses a crop preset into a pixel aspect ratio (width / height), or null for
 * "free". `original` means "match the source frame".
 */
export function resolveTargetRatio(
  aspectRatio: string | undefined,
  scanWidth: number,
  scanHeight: number
): number | null {
  if (!aspectRatio || aspectRatio === 'free') return null;
  if (aspectRatio === '1:1') return 1;
  if (aspectRatio === '3:2') return 3 / 2;
  if (aspectRatio === '4:3') return 4 / 3;
  if (aspectRatio === '16:9') return 16 / 9;
  if (aspectRatio === 'original') return (scanWidth || 1500) / (scanHeight || 1000);
  return null;
}

/**
 * Converts a pixel aspect ratio into the normalized height that pairs with a
 * given normalized width.
 *
 * The crop rect is stored in 0..1 space over the source frame, so equal
 * normalized width and height are only square when the frame itself is square.
 * Working in pixels:
 *     widthPx  = width  * scanWidth
 *     heightPx = height * scanHeight
 *     widthPx / heightPx = ratio
 * so:
 *     height = width * scanWidth / (ratio * scanHeight)
 */
function normalizedHeightForRatio(
  width: number,
  ratio: number,
  scanWidth: number,
  scanHeight: number
): number {
  return (width * (scanWidth || 1500)) / (ratio * (scanHeight || 1000));
}

/**
 * Minimum normalized crop extent. Mirrors `MIN_CROP_EXTENT` in the geometry
 * transform core so the overlay can never request a rect the renderer would
 * silently widen.
 */
const MIN_CROP_EXTENT = 0.08;

/** Grab thickness (px) of the draggable border strips that surround the crop. */
const BORDER_HIT_SIZE = 12;

/**
 * Interactive crop overlay.
 *
 * Gestures match what people expect from an image editor:
 *   - drag inside the box         -> move the crop
 *   - drag one of the 8 handles   -> resize from that corner/edge
 *   - drag on the dimmed area     -> draw a brand new crop from scratch
 */
export const InteractiveCropOverlay: React.FC<InteractiveCropOverlayProps> = ({
  crop,
  onUpdateCrop,
  scanWidth,
  scanHeight,
  mapDragDelta
}) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [dragMode, setDragMode] = useState<DragMode>(null);
  const [startPos, setStartPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [startCrop, setStartCrop] = useState<CropSettings>(crop);
  /**
   * Live rect for a draw-new-crop gesture. Mirrored into a ref so the window
   * listeners can read the latest draft without the effect re-registering on
   * every mousemove (which would drop events mid-drag).
   */
  const [draftRect, setDraftRect] = useState<CropSettings | null>(null);
  const draftRef = useRef<CropSettings | null>(null);
  draftRef.current = draftRect;

  /** Converts a client point into normalized 0..1 coordinates over the overlay. */
  const toNormalized = (clientX: number, clientY: number) => {
    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return null;
    return {
      x: (clientX - rect.left) / rect.width,
      y: (clientY - rect.top) / rect.height
    };
  };

  const startDrag = (mode: DragMode, e: React.MouseEvent) => {
    e.stopPropagation();
    // NOTE: deliberately no e.preventDefault() here. React attaches mousedown
    // listeners as passive, so calling preventDefault throws
    // "Unable to preventDefault inside passive event listener invocation" and
    // aborts this handler - which silently killed every handle drag. Text
    // selection is already suppressed by `select-none` on the overlay, so
    // nothing is needed beyond tracking the gesture.
    setDragMode(mode);
    setStartPos({ x: e.clientX, y: e.clientY });
    setStartCrop({ ...crop });

    if (mode === 'new') {
      const point = toNormalized(e.clientX, e.clientY);
      // Anchor a zero-size draft at the press point; mousemove grows it.
      setDraftRect({
        enabled: true,
        x: point ? point.x : 0,
        y: point ? point.y : 0,
        width: 0,
        height: 0,
        aspectRatio: crop.aspectRatio || 'free'
      });
    }
  };

  useEffect(() => {
    if (!dragMode) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = overlayRef.current?.getBoundingClientRect();
      if (!rect || rect.width === 0 || rect.height === 0) return;

      const rawDx = (e.clientX - startPos.x) / rect.width;
      const rawDy = (e.clientY - startPos.y) / rect.height;

      // Translate the screen-space delta into the crop rect's own frame.
      const mapped = mapDragDelta ? mapDragDelta({ x: rawDx, y: rawDy }) : { x: rawDx, y: rawDy };
      const dx = mapped.x;
      const dy = mapped.y;

      if (dragMode === 'new') {
        // Draw a fresh rect between the anchor and the current cursor.
        const anchor = toNormalized(startPos.x, startPos.y);
        const current = toNormalized(e.clientX, e.clientY);
        if (!anchor || !current) return;

        const x = Math.min(anchor.x, current.x);
        const y = Math.min(anchor.y, current.y);
        const width = Math.abs(current.x - anchor.x);
        const height = Math.abs(current.y - anchor.y);

        setDraftRect({
          enabled: true,
          x: Math.max(0, Math.min(1, x)),
          y: Math.max(0, Math.min(1, y)),
          width: Math.max(0, Math.min(1, width)),
          height: Math.max(0, Math.min(1, height)),
          aspectRatio: startCrop.aspectRatio || 'free'
        });
        return;
      }

      let { x, y, width, height, aspectRatio, enabled } = startCrop;

      if (dragMode === 'move') {
        x = Math.max(0, Math.min(1 - width, x + dx));
        y = Math.max(0, Math.min(1 - height, y + dy));
      } else {
        // Resizing handles
        if (dragMode.includes('e')) {
          width = Math.max(MIN_CROP_EXTENT, Math.min(1 - x, startCrop.width + dx));
        }
        if (dragMode.includes('s')) {
          height = Math.max(MIN_CROP_EXTENT, Math.min(1 - y, startCrop.height + dy));
        }
        if (dragMode.includes('w')) {
          const maxLeft = startCrop.x + startCrop.width - MIN_CROP_EXTENT;
          const newX = Math.max(0, Math.min(maxLeft, startCrop.x + dx));
          width = startCrop.width + (startCrop.x - newX);
          x = newX;
        }
        if (dragMode.includes('n')) {
          const maxTop = startCrop.y + startCrop.height - MIN_CROP_EXTENT;
          const newY = Math.max(0, Math.min(maxTop, startCrop.y + dy));
          height = startCrop.height + (startCrop.y - newY);
          y = newY;
        }

        // Apply aspect ratio lock if active
        const targetRatio = resolveTargetRatio(aspectRatio, scanWidth, scanHeight);
        if (targetRatio) {
          const expectedNormH = normalizedHeightForRatio(width, targetRatio, scanWidth, scanHeight);
          if (y + expectedNormH <= 1) {
            height = expectedNormH;
          } else {
            // Not enough vertical room: shrink the width to fit the remaining
            // height instead, keeping the ratio intact.
            const availableH = 1 - y;
            width = (availableH * targetRatio * (scanHeight || 1000)) / (scanWidth || 1500);
            height = availableH;
          }
        }
      }

      onUpdateCrop({
        enabled,
        x: Number(x.toFixed(4)),
        y: Number(y.toFixed(4)),
        width: Number(Math.min(1 - x, width).toFixed(4)),
        height: Number(Math.min(1 - y, height).toFixed(4)),
        aspectRatio
      });
    };

    const handleMouseUp = () => {
      // Commit a drawn rect, but ignore accidental click-without-drag so a stray
      // press on the dimmed area doesn't collapse the crop to nothing.
      const draft = draftRef.current;
      if (dragMode === 'new' && draft) {
        if (draft.width >= MIN_CROP_EXTENT && draft.height >= MIN_CROP_EXTENT) {
          onUpdateCrop({
            enabled: true,
            x: Number(draft.x.toFixed(4)),
            y: Number(draft.y.toFixed(4)),
            width: Number(draft.width.toFixed(4)),
            height: Number(draft.height.toFixed(4)),
            aspectRatio: draft.aspectRatio || 'free'
          });
        }
      }
      setDraftRect(null);
      setDragMode(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragMode, startPos, startCrop, onUpdateCrop, scanWidth, scanHeight, mapDragDelta]);

  if (!crop.enabled) return null;

  // While drawing a new crop the draft drives the visuals; otherwise the
  // committed rect does.
  const shown = dragMode === 'new' && draftRect ? draftRect : crop;

  const leftPct = `${shown.x * 100}%`;
  const topPct = `${shown.y * 100}%`;
  const widthPct = `${shown.width * 100}%`;
  const heightPct = `${shown.height * 100}%`;

  return (
    <div
      ref={overlayRef}
      className="absolute inset-0 pointer-events-none select-none z-20"
    >
      {/* Full-frame draw layer: handles the "draw a new crop" gesture anywhere
          in the viewport. It sits UNDER the handles (which are z-raised below)
          so grabbing an 8-way handle still resizes, but pressing anywhere else -
          inside the current selection included - sweeps out a fresh rect. */}
      {!dragMode && (
        <div
          onMouseDown={(e) => startDrag('new', e)}
          className="absolute inset-0 pointer-events-auto cursor-crosshair"
        />
      )}

      {/* 4 Shaded Masks Outside Crop Box */}
      {/* Top Mask */}
      <div
        style={{ height: topPct }}
        className="absolute top-0 left-0 right-0 bg-black/60 pointer-events-none"
      />
      {/* Bottom Mask */}
      <div
        style={{ top: `calc(${topPct} + ${heightPct})` }}
        className="absolute bottom-0 left-0 right-0 bg-black/60 pointer-events-none"
      />
      {/* Left Mask */}
      <div
        style={{
          top: topPct,
          height: heightPct,
          width: leftPct
        }}
        className="absolute left-0 bg-black/60 pointer-events-none"
      />
      {/* Right Mask */}
      <div
        style={{
          top: topPct,
          height: heightPct,
          left: `calc(${leftPct} + ${widthPct})`
        }}
        className="absolute right-0 bg-black/60 pointer-events-none"
      />

      {/* Draggable border strips: each edge acts as a grab handle that MOVES the
          crop selection. They are laid out INSIDE the crop bounds (not
          straddling the edge) so they stay within the canvas and remain
          reachable at full-frame size. Resizing is done with the 8 handle dots
          on the crop box below. */}
      {!dragMode && (
        <div className="absolute inset-0 pointer-events-none">
          <div
            style={{ left: leftPct, top: topPct, width: widthPct }}
            onMouseDown={(e) => startDrag('move', e)}
            className="absolute h-3 cursor-move pointer-events-auto"
          />
          <div
            style={{ left: leftPct, top: `calc(${topPct} + ${heightPct} - 12px)`, width: widthPct }}
            onMouseDown={(e) => startDrag('move', e)}
            className="absolute h-3 cursor-move pointer-events-auto"
          />
          <div
            style={{ top: topPct, left: leftPct, height: heightPct }}
            onMouseDown={(e) => startDrag('move', e)}
            className="absolute w-3 cursor-move pointer-events-auto"
          />
          <div
            style={{ top: topPct, left: `calc(${leftPct} + ${widthPct} - 12px)`, height: heightPct }}
            onMouseDown={(e) => startDrag('move', e)}
            className="absolute w-3 cursor-move pointer-events-auto"
          />
        </div>
      )}

      {/* The Active Crop Bounding Box */}
      <div
        style={{
          left: leftPct,
          top: topPct,
          width: widthPct,
          height: heightPct
        }}
        className="absolute border border-amber-400 shadow-[0_0_0_1px_rgba(0,0,0,0.85)] pointer-events-none group z-30"
      >
        {/* The interior is transparent to input: dragging anywhere in the
            viewport (inside the selection included) draws a fresh rect. The
            existing crop is repositioned via its border strips or handles. */}
        {/* Rule-of-Thirds Grid Lines */}
        <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-40 group-hover:opacity-75 transition-opacity">
          <div className="border-r border-b border-dashed border-white/60" />
          <div className="border-r border-b border-dashed border-white/60" />
          <div className="border-b border-dashed border-white/60" />
          <div className="border-r border-b border-dashed border-white/60" />
          <div className="border-r border-b border-dashed border-white/60" />
          <div className="border-b border-dashed border-white/60" />
          <div className="border-r border-dashed border-white/60" />
          <div className="border-r border-dashed border-white/60" />
          <div />
        </div>

        {/* Floating Top Indicator Badge */}
        <div className="absolute -top-7 left-0 bg-neutral-900/95 backdrop-blur-md px-2 py-0.5 rounded border border-neutral-700 shadow-md text-[9px] font-mono text-amber-400 flex items-center gap-1.5 whitespace-nowrap pointer-events-none">
          <span>{Math.round(shown.width * 100)}% × {Math.round(shown.height * 100)}%</span>
          <span className="text-neutral-500">·</span>
          <span className="text-neutral-300 uppercase">{shown.aspectRatio || 'free'}</span>
        </div>

        {/* 4 Corner Tactile Handles. Each hit box is anchored so its inner edge
            meets the crop corner, keeping the whole target inside the crop
            bounds - it therefore stays reachable (and unclipped) even when the
            crop fills the entire frame. */}
        <div
          onMouseDown={(e) => startDrag('nw', e)}
          style={{ width: BORDER_HIT_SIZE, height: BORDER_HIT_SIZE }}
          className="absolute z-40 top-0 left-0 flex items-center justify-center cursor-nwse-resize pointer-events-auto"
        >
          <span className="w-3 h-3 bg-amber-400 border border-neutral-950 rounded-xs shadow hover:scale-125 transition-transform" />
        </div>
        <div
          onMouseDown={(e) => startDrag('ne', e)}
          style={{ width: BORDER_HIT_SIZE, height: BORDER_HIT_SIZE }}
          className="absolute z-40 top-0 right-0 flex items-center justify-center cursor-nesw-resize pointer-events-auto"
        >
          <span className="w-3 h-3 bg-amber-400 border border-neutral-950 rounded-xs shadow hover:scale-125 transition-transform" />
        </div>
        <div
          onMouseDown={(e) => startDrag('se', e)}
          style={{ width: BORDER_HIT_SIZE, height: BORDER_HIT_SIZE }}
          className="absolute z-40 bottom-0 right-0 flex items-center justify-center cursor-nwse-resize pointer-events-auto"
        >
          <span className="w-3 h-3 bg-amber-400 border border-neutral-950 rounded-xs shadow hover:scale-125 transition-transform" />
        </div>
        <div
          onMouseDown={(e) => startDrag('sw', e)}
          style={{ width: BORDER_HIT_SIZE, height: BORDER_HIT_SIZE }}
          className="absolute z-40 bottom-0 left-0 flex items-center justify-center cursor-nesw-resize pointer-events-auto"
        >
          <span className="w-3 h-3 bg-amber-400 border border-neutral-950 rounded-xs shadow hover:scale-125 transition-transform" />
        </div>

        {/* 4 Edge Midpoint Handles */}
        <div
          onMouseDown={(e) => startDrag('n', e)}
          style={{ width: BORDER_HIT_SIZE + 4, height: BORDER_HIT_SIZE }}
          className="absolute z-40 top-0 left-1/2 -translate-x-1/2 flex items-center justify-center cursor-ns-resize pointer-events-auto"
        >
          <span className="w-4 h-2 bg-amber-400/90 border border-neutral-950 rounded-xs shadow" />
        </div>
        <div
          onMouseDown={(e) => startDrag('s', e)}
          style={{ width: BORDER_HIT_SIZE + 4, height: BORDER_HIT_SIZE }}
          className="absolute z-40 bottom-0 left-1/2 -translate-x-1/2 flex items-center justify-center cursor-ns-resize pointer-events-auto"
        >
          <span className="w-4 h-2 bg-amber-400/90 border border-neutral-950 rounded-xs shadow" />
        </div>
        <div
          onMouseDown={(e) => startDrag('w', e)}
          style={{ width: BORDER_HIT_SIZE, height: BORDER_HIT_SIZE + 4 }}
          className="absolute z-40 top-1/2 left-0 -translate-y-1/2 flex items-center justify-center cursor-ew-resize pointer-events-auto"
        >
          <span className="w-2 h-4 bg-amber-400/90 border border-neutral-950 rounded-xs shadow" />
        </div>
        <div
          onMouseDown={(e) => startDrag('e', e)}
          style={{ width: BORDER_HIT_SIZE, height: BORDER_HIT_SIZE + 4 }}
          className="absolute z-40 top-1/2 right-0 -translate-y-1/2 flex items-center justify-center cursor-ew-resize pointer-events-auto"
        >
          <span className="w-2 h-4 bg-amber-400/90 border border-neutral-950 rounded-xs shadow" />
        </div>
      </div>
    </div>
  );
};
