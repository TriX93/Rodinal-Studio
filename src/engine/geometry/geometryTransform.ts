/**
 * Rodinal Studio - Carrier Geometry Transform Core
 *
 * Single source of truth for how carrier geometry (crop, 90-degree rotation,
 * fine horizon straightening, and emulsion flips) maps source pixels onto
 * output pixels. Consumed by BOTH the interactive WebGPU/WASM viewport preview
 * and the archival TIFF/JPEG exporters so that what you see is what you get.
 *
 * The transform is non-destructive: it never mutates the source buffers or the
 * InversionSettings. It only produces a normalized mapping that consumers apply.
 *
 * Coordinate spaces
 * -----------------
 *   SOURCE space : normalized 0..1 over the FULL original frame.
 *   OUTPUT space : normalized 0..1 over the final (cropped + turned) frame.
 *
 * All math below is done in those unit spaces; pixel scaling happens only at the
 * very last step. Keeping a single consistent space is what makes the forward
 * and inverse maps exact inverses of one another.
 */

import { InversionSettings } from '../../types/film';

export interface NormalizedPoint {
  x: number;
  y: number;
}

export interface OutputSize {
  width: number;
  height: number;
}

/** Minimum normalized crop extent, mirrors the overlay's 8% handle floor. */
const MIN_CROP_EXTENT = 0.08;

/**
 * Resolves a settings object into a safe crop rect. Drafts created by older
 * builds may lack `crop` or carry inverted extents, so everything is clamped.
 */
export function resolveCropRect(settings: InversionSettings): {
  x: number;
  y: number;
  width: number;
  height: number;
  enabled: boolean;
} {
  const crop = settings.crop;
  if (!crop || !crop.enabled) {
    return { x: 0, y: 0, width: 1, height: 1, enabled: false };
  }

  const width = Math.min(1, Math.max(MIN_CROP_EXTENT, crop.width || 1));
  const height = Math.min(1, Math.max(MIN_CROP_EXTENT, crop.height || 1));

  return {
    x: Math.min(1 - width, Math.max(0, crop.x || 0)),
    y: Math.min(1 - height, Math.max(0, crop.y || 0)),
    width,
    height,
    enabled: true
  };
}

/** True when the settings request no geometric change at all. */
export function isGeometryIdentity(settings: InversionSettings): boolean {
  const crop = resolveCropRect(settings);
  const rotation = normalizeRotation(settings.rotation || 0);
  const straighten = settings.straightenAngle || 0;
  return (
    !crop.enabled &&
    rotation === 0 &&
    Math.abs(straighten) < 0.001 &&
    !settings.flipHorizontal &&
    !settings.flipVertical
  );
}

/** Snap an arbitrary angle onto the 0/90/180/270 quadrant. */
export function normalizeRotation(rotation: number): number {
  const snapped = Math.round((rotation || 0) / 90) * 90;
  return ((snapped % 360) + 360) % 360;
}

/** Swaps width/height for the odd quadrants. */
function swapAxes(rotation: number): boolean {
  return rotation === 90 || rotation === 270;
}

/**
 * Output pixel dimensions for a given source size: crop box, then quarter-turn
 * axis swap. Fine straightening deliberately does NOT expand the frame - it
 * rotates within the crop bounds so preview and export agree exactly.
 */
export function getOutputSize(
  settings: InversionSettings,
  sourceWidth: number,
  sourceHeight: number
): OutputSize {
  const crop = resolveCropRect(settings);
  const rotation = normalizeRotation(settings.rotation || 0);

  let width = Math.max(1, Math.round(sourceWidth * crop.width));
  let height = Math.max(1, Math.round(sourceHeight * crop.height));

  if (swapAxes(rotation)) {
    const previousWidth = width;
    width = height;
    height = previousWidth;
  }

  return { width, height };
}

/**
 * Aspect ratio (width / height) of the crop box expressed in source-normalized
 * units. Needed wherever a rotation swaps the axes so that angles and handedness
 * stay geometrically true rather than being distorted by the 0..1 squash.
 */
function cropSpaceAspect(crop: { width: number; height: number; enabled: boolean }): number {
  const width = crop.enabled ? crop.width : 1;
  const height = crop.enabled ? crop.height : 1;
  // Guard against degenerate rects from malformed drafts.
  return height > 0 ? width / height : 1;
}

/**
 * The core affine stage description shared by the forward, inverse and delta
 * maps. Everything is a rotation about the center of a unit square plus a
 * potential axis swap, which keeps all derived maps exactly consistent.
 */
interface Stage {
  crop: { x: number; y: number; width: number; height: number; enabled: boolean };
  rotation: number;
  straighten: number;
  swapped: boolean;
  /** Aspect of the source-space crop, so rotation is a true Euclidean rotation. */
  aspect: number;
}

function describeStage(settings: InversionSettings): Stage {
  const crop = resolveCropRect(settings);
  const rotation = normalizeRotation(settings.rotation || 0);
  return {
    crop,
    rotation,
    straighten: (settings.straightenAngle || 0) * (Math.PI / 180),
    swapped: swapAxes(rotation),
    aspect: cropSpaceAspect(crop)
  };
}

/**
 * Forward map in NORMALIZED unit space: source 0..1 -> crop-local 0..1 (after
 * turn, straighten and flips). No pixel scaling is applied here.
 *
 * Viewer-facing pixel scaling is layered on top by `createForwardTransform`.
 */
function forwardUnit(
  stage: Stage,
  settings: InversionSettings,
  u: number,
  v: number
): NormalizedPoint {
  // 1. Quarter-turn about the crop center. Positive angles are CLOCKWISE on
  //    screen (matching the RotateCw control and the old CSS preview), which in
  //    these y-down normalized coordinates maps source top-left -> top-right.
  const cx = u - 0.5;
  const cy = v - 0.5;

  let qx = cx;
  let qy = cy;
  if (stage.rotation === 90) {
    qx = -cy;
    qy = cx;
  } else if (stage.rotation === 180) {
    qx = -cx;
    qy = -cy;
  } else if (stage.rotation === 270) {
    qx = cy;
    qy = -cx;
  }
  u = 0.5 + qx;
  v = 0.5 + qy;

  // 2. Fine straightening about the center, as a true Euclidean rotation scaled
  //    by the crop aspect so the horizon tilts visually rather than shearing.
  if (stage.straighten !== 0) {
    const cos = Math.cos(stage.straighten);
    const sin = Math.sin(stage.straighten);
    const rx = (u - 0.5) * stage.aspect;
    const ry = v - 0.5;
    const sx = rx * cos - ry * sin;
    const sy = rx * sin + ry * cos;
    u = 0.5 + sx / stage.aspect;
    v = 0.5 + sy;
  }

  // 3. Emulsion-side flips.
  if (settings.flipHorizontal) u = 1 - u;
  if (settings.flipVertical) v = 1 - v;

  return { x: u, y: v };
}

/**
 * Exact inverse of `forwardUnit`: crop-local 0..1 -> source 0..1.
 */
function inverseUnit(
  stage: Stage,
  settings: InversionSettings,
  u: number,
  v: number
): NormalizedPoint {
  // 1. Undo flips (self-inverse).
  if (settings.flipHorizontal) u = 1 - u;
  if (settings.flipVertical) v = 1 - v;

  // 2. Undo straightening.
  if (stage.straighten !== 0) {
    const cos = Math.cos(stage.straighten);
    const sin = Math.sin(stage.straighten);
    const rx = (u - 0.5) * stage.aspect;
    const ry = v - 0.5;
    const sx = rx * cos + ry * sin;
    const sy = -rx * sin + ry * cos;
    u = 0.5 + sx / stage.aspect;
    v = 0.5 + sy;
  }

  // 3. Undo the quarter-turn.
  const cx = u - 0.5;
  const cy = v - 0.5;
  let qx = cx;
  let qy = cy;
  if (stage.rotation === 90) {
    qx = cy;
    qy = -cx;
  } else if (stage.rotation === 180) {
    qx = -cx;
    qy = -cy;
  } else if (stage.rotation === 270) {
    qx = -cy;
    qy = cx;
  }

  return { x: 0.5 + qx, y: 0.5 + qy };
}

/**
 * Builds the forward map: normalized source coords (0..1, pre-geometry, full
 * frame) -> normalized output coords (0..1, post-geometry).
 *
 * Used by the crop overlay so drag deltas are interpretable while the preview
 * is rotated or flipped.
 */
export function createForwardTransform(
  settings: InversionSettings,
  sourceWidth: number,
  sourceHeight: number,
  outputSize?: OutputSize
): (point: NormalizedPoint) => NormalizedPoint {
  const stage = describeStage(settings);
  const out = outputSize || getOutputSize(settings, sourceWidth, sourceHeight);

  return (point: NormalizedPoint): NormalizedPoint => {
    // Source-normalized -> crop-local normalized.
    const localX = (point.x - stage.crop.x) / stage.crop.width;
    const localY = (point.y - stage.crop.y) / stage.crop.height;

    const local = forwardUnit(stage, settings, localX, localY);
    return { x: local.x * out.width, y: local.y * out.height };
  };
}

/**
 * Inverse of `createForwardTransform`: normalized output coords -> normalized
 * source coords. Exact algebraic inverse, verified by round-trip tests.
 */
export function createInverseTransform(
  settings: InversionSettings,
  sourceWidth: number,
  sourceHeight: number,
  outputSize?: OutputSize
): (point: NormalizedPoint) => NormalizedPoint {
  const stage = describeStage(settings);
  const out = outputSize || getOutputSize(settings, sourceWidth, sourceHeight);

  return (point: NormalizedPoint): NormalizedPoint => {
    // Output pixels -> crop-local normalized.
    const local = inverseUnit(stage, settings, point.x / out.width, point.y / out.height);

    // Crop-local normalized -> source-normalized.
    return {
      x: stage.crop.x + local.x * stage.crop.width,
      y: stage.crop.y + local.y * stage.crop.height
    };
  };
}

/**
 * Direction-only variant: maps a normalized display-space delta vector into
 * normalized source-space units.
 *
 * Used by the interactive crop overlay so drag gestures stay under the cursor
 * when the preview is rotated or flipped. The input is a fraction of the
 * displayed frame (0..1), matching how the overlay measures pointer movement,
 * and the output is a fraction of the source frame (0..1) - the same space the
 * crop rect lives in.
 */
export function createInverseDeltaTransform(
  settings: InversionSettings,
  sourceWidth: number,
  sourceHeight: number,
  outputSize?: OutputSize
): (delta: NormalizedPoint) => NormalizedPoint {
  const stage = describeStage(settings);
  void outputSize;

  // The crop rect is normalized over the FULL source frame, and the display
  // delta is normalized over the displayed frame. A display step of 1 therefore
  // corresponds to a source-normalized step of crop.width (rotations swap the
  // axes and flips the signs, handled below).
  return (delta: NormalizedPoint): NormalizedPoint => {
    let u = delta.x;
    let v = delta.y;

    // Undo flips.
    if (settings.flipHorizontal) u = -u;
    if (settings.flipVertical) v = -v;

    // Undo straightening (linear part only, no translation).
    if (stage.straighten !== 0) {
      const cos = Math.cos(stage.straighten);
      const sin = Math.sin(stage.straighten);
      const rx = u * stage.aspect;
      const ry = v;
      const sx = rx * cos + ry * sin;
      const sy = -rx * sin + ry * cos;
      u = sx / stage.aspect;
      v = sy;
    }

    // Undo quarter-turn (linear part only).
    let qx = u;
    let qy = v;
    if (stage.rotation === 90) {
      qx = v;
      qy = -u;
    } else if (stage.rotation === 180) {
      qx = -u;
      qy = -v;
    } else if (stage.rotation === 270) {
      qx = -v;
      qy = u;
    }

    // Display-normalized -> source-normalized.
    return { x: qx * stage.crop.width, y: qy * stage.crop.height };
  };
}
