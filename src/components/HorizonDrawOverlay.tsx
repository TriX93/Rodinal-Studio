import React, { useEffect, useRef, useState } from 'react';
import { solveHorizonAngle, HorizonLineKind } from '../engine/geometry/geometryTransform';

interface HorizonDrawOverlayProps {
  /** Whether the draw gesture is armed. When false the overlay is inert. */
  active: boolean;
  scanWidth: number;
  scanHeight: number;
  /** Receives the computed correction in degrees. */
  onApplyAngle: (angle: number) => void;
  /** Called after a completed gesture so the caller can disarm the tool. */
  onComplete: () => void;
}

interface LinePoints {
  from: { x: number; y: number };
  to: { x: number; y: number };
}

/** Minimum drag length, in normalized frame units, for a line to count. */
const MIN_LINE_LENGTH = 0.02;

/**
 * Full-frame capture layer for the "draw horizon" gesture.
 *
 * The user drags a reference line across the image - a horizon, or a vertical
 * edge such as a door frame. On release the line's slope is converted into a
 * `straightenAngle` correction and handed back. The line is expressed in PIXELS
 * because the correction is aspect-dependent (see `solveHorizonAngle`).
 *
 * The overlay is inert while `active` is false, so it never intercepts the
 * normal pan/zoom or crop gestures.
 */
export const HorizonDrawOverlay: React.FC<HorizonDrawOverlayProps> = ({
  active,
  scanWidth,
  scanHeight,
  onApplyAngle,
  onComplete
}) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [line, setLine] = useState<LinePoints | null>(null);
  /**
   * Mirror of `line` for the window listeners. Without this the effect would
   * have to list `line` in its dependencies and re-register on every mousemove,
   * which drops events mid-drag and leaves the committed line stale.
   */
  const lineRef = useRef<LinePoints | null>(null);
  lineRef.current = line;

  // Resolve a client point into normalized 0..1 within the displayed frame.
  const toNormalized = (clientX: number, clientY: number) => {
    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return null;
    return {
      x: (clientX - rect.left) / rect.width,
      y: (clientY - rect.top) / rect.height
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!active) return;
    // Keep the viewport's pan handler from also starting on this press.
    e.stopPropagation();
    const point = toNormalized(e.clientX, e.clientY);
    if (!point) return;
    setDrawing(true);
    setLine({ from: point, to: point });
  };

  useEffect(() => {
    if (!drawing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const point = toNormalized(e.clientX, e.clientY);
      if (!point) return;
      setLine((current) => (current ? { ...current, to: point } : current));
    };

    const handleMouseUp = () => {
      setDrawing(false);
      const finished = lineRef.current;

      if (finished) {
        const dx = finished.to.x - finished.from.x;
        const dy = finished.to.y - finished.from.y;
        const length = Math.hypot(dx, dy);

        // Ignore a stray click: too short to have a meaningful slope.
        if (length >= MIN_LINE_LENGTH) {
          // Convert normalized points to pixels so the aspect-dependent
          // correction is computed in the space it expects.
          const solution = solveHorizonAngle(
            { x: finished.from.x * scanWidth, y: finished.from.y * scanHeight },
            { x: finished.to.x * scanWidth, y: finished.to.y * scanHeight },
            scanWidth,
            scanHeight
          );
          if (solution) {
            onApplyAngle(solution.angle);
            onComplete();
            setLine(null);
            return;
          }
        }
      }
      setLine(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [drawing, scanWidth, scanHeight, onApplyAngle, onComplete]);

  if (!active) return null;

  // Live readout of what the current line would do, so the angle is visible
  // before committing.
  let preview: { angle: number; kind: HorizonLineKind } | null = null;
  if (line) {
    const dx = line.to.x - line.from.x;
    const dy = line.to.y - line.from.y;
    if (Math.hypot(dx, dy) >= MIN_LINE_LENGTH) {
      const solution = solveHorizonAngle(
        { x: line.from.x * scanWidth, y: line.from.y * scanHeight },
        { x: line.to.x * scanWidth, y: line.to.y * scanHeight },
        scanWidth,
        scanHeight
      );
      if (solution) preview = { angle: solution.angle, kind: solution.kind };
    }
  }

  const pct = (p: { x: number; y: number }) => ({ left: `${p.x * 100}%`, top: `${p.y * 100}%` });

  return (
    <div
      ref={overlayRef}
      onMouseDown={handleMouseDown}
      className="absolute inset-0 z-30 cursor-crosshair select-none"
      style={{ touchAction: 'none' }}
    >
      {line && (
        <>
          {/* The drawn reference line. Rendered as a rotated bar so it stays a
              constant thickness regardless of length. */}
          <div
            className="absolute h-0.5 bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.9)] pointer-events-none origin-left"
            style={{
              left: `${line.from.x * 100}%`,
              top: `${line.from.y * 100}%`,
              width: `${Math.hypot(line.to.x - line.from.x, line.to.y - line.from.y) * 100}%`,
              transform: `rotate(${
                (Math.atan2(line.to.y - line.from.y, line.to.x - line.from.x) * 180) / Math.PI
              }deg)`
            }}
          />
          {/* Endpoint dots make the gesture feel anchored. */}
          <div
            className="absolute w-2 h-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-300 border border-neutral-950 pointer-events-none"
            style={pct(line.from)}
          />
          <div
            className="absolute w-2 h-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-300 border border-neutral-950 pointer-events-none"
            style={pct(line.to)}
          />

          {/* Live readout: what releasing the line would do right now. */}
          {preview && (
            <div
              className="absolute bg-neutral-900/95 backdrop-blur-md px-2 py-1 rounded border border-neutral-700 shadow-md text-[10px] font-mono text-amber-400 whitespace-nowrap pointer-events-none"
              style={{
                left: `${line.to.x * 100}%`,
                top: `${line.to.y * 100}%`,
                transform: 'translate(12px, -50%)'
              }}
            >
              {preview.kind === 'vertical' ? 'Verticale' : 'Orizzonte'}:{' '}
              {preview.angle > 0 ? `+${preview.angle}` : preview.angle}°
            </div>
          )}
        </>
      )}

      {/* Hint shown before the gesture starts. */}
      {!line && (
        <div className="absolute inset-x-0 top-3 flex justify-center pointer-events-none">
          <div className="bg-neutral-900/90 backdrop-blur-md px-3 py-1 rounded border border-amber-500/40 shadow-md text-[10px] font-mono text-amber-400">
            Traccia una linea sull'orizzonte o su un bordo verticale
          </div>
        </div>
      )}
    </div>
  );
};
