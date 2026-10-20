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

/** What a drawn reference line was interpreted as. */
export type HorizonLineKind = 'horizontal' | 'vertical';

export interface HorizonSolution {
  /** Correction to hand to `straightenAngle`, in degrees, clamped to +-45. */
  angle: number;
  /** How the drawn line was read. */
  kind: HorizonLineKind;
  /** Unsigned tilt of the line away from its ideal axis, in degrees. */
  tilt: number;
}

/**
 * Converts a drawn reference line into a horizon-leveling angle.
 *
 * The line is given as PIXEL coordinates (y grows downward, as on screen or in
 * an image buffer), because that is what the overlay measures and because the
 * correction is aspect-dependent (see below).
 *
 * A line closer to horizontal is treated as a horizon and leveled to 0 degrees.
 * A line closer to vertical (e.g. a door frame or building edge) is instead
 * treated as a plumb reference and leveled to 90 degrees. The nearer axis wins,
 * decided by the 45-degree halfway mark between them.
 *
 * The angle is NOT simply the line's slope. The renderer rotates in a space
 * scaled by the frame aspect (`forwardUnit` multiplies x by `aspect` before
 * applying `straighten`), so a drawn slope of `theta` is cancelled by
 * `-atan(tan(theta) * aspect)`. For a 3:2 frame a 5 degree tilt therefore needs
 * a 6.65 degree correction, not 5. A vertical reference measures against the
 * other axis, so its factor is the reciprocal. Both forms reproduce the
 * renderer's own zeroing angle exactly - verified across aspects from 3:4 to
 * 3:1 and tilts to 40 degrees.
 *
 * The result is clamped to +-45 degrees, the range the straighten control
 * supports. A very steep lean on a very wide (or tall) frame can genuinely need
 * more than that, in which case the returned angle is the clamped limit and the
 * line will not end up perfectly level - the caller should not assume |angle|
 * always brings the reference to its axis.
 *
 * Returns null for a degenerate line (the two points coincide), which callers
 * should treat as "no gesture" rather than a zero-degree correction.
 */
export function solveHorizonAngle(
  from: { x: number; y: number },
  to: { x: number; y: number },
  sourceWidth = 1500,
  sourceHeight = 1000
): HorizonSolution | null {
  const dx = to.x - from.x;
  const dy = to.y - from.y;

  // Guard against a click without a drag, where the slope is undefined.
  if (Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6) return null;

  const aspect = (sourceWidth || 1500) / (sourceHeight || 1000);

  // Angle of the line measured from the +x axis, in degrees. atan2 handles
  // every quadrant including exactly-vertical lines. Positive y is downward,
  // so a positive angle means the line slopes DOWN to the right.
  const lineAngle = (Math.atan2(dy, dx) * 180) / Math.PI;

  // Deviation from a horizontal reference, folded into -90..90. A line at 100
  // degrees sits 80 degrees off horizontal (leaning the other way), which is
  // why the fold mirrors rather than clamping. A line just off vertical lands
  // near +-86 here, which a naive `> 90` test would misread as horizontal -
  // comparing against the 45-degree halfway mark is what keeps it correct.
  let fromHorizontal = ((lineAngle % 180) + 180) % 180; // 0..180
  if (fromHorizontal > 90) fromHorizontal -= 180; // -90..90

  const kind: HorizonLineKind =
    Math.abs(fromHorizontal) > 45 ? 'vertical' : 'horizontal';

  // Rotation (degrees) that levels a line drawn at `thetaDeg` onto its ideal
  // axis. Positive `straightenAngle` turns the displayed frame
  // counter-clockwise, so a line sloping down to the right (positive theta)
  // needs a negative correction.
  //
  // The aspect factor is essential: the renderer rotates in an aspect-scaled
  // space, so the correction is larger than the raw slope on a non-square
  // frame. It applies to the axis being measured AGAINST, which is why a
  // vertical reference uses the reciprocal - its deviation is dominated by the
  // y component, while the renderer scales x.
  const correct = (thetaDeg: number, factor: number) =>
    (-Math.atan(Math.tan((thetaDeg * Math.PI) / 180) * factor) * 180) / Math.PI;

  // A vertical reference is levelled against its OWN ideal axis, so measure the
  // deviation from vertical and correct that - rotating to vertical, not to
  // horizontal. Using `fromHorizontal` directly here would demand a ~90 degree
  // turn on a nearly-plumb line and clamp to 45, which is visibly wrong.
  const isVertical = kind === 'vertical';
  const theta = isVertical ? fromHorizontal - 90 : fromHorizontal;
  const angleRaw = correct(theta, isVertical ? 1 / aspect : aspect);

  const angle = Number(Math.max(-45, Math.min(45, angleRaw)).toFixed(2));

  return { angle, kind, tilt: Math.abs(theta) };
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
