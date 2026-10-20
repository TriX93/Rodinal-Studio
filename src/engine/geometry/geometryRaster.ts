/**
 * Rodinal Studio - Carrier Geometry Raster Stage
 *
 * Applies the carrier geometry transform (crop -> quarter-turn -> horizon
 * straighten -> emulsion flips) to source pixels, producing a fresh ImageData
 * for the colour inversion engines.
 *
 * Non-destructive by construction: the source ImageData is never written to,
 * and InversionSettings is never mutated. When all geometry is neutral the
 * original object is returned by reference so callers pay nothing.
 */

import { InversionSettings } from '../../types/film';
import {
  getOutputSize,
  isGeometryIdentity,
  resolveCropRect,
  normalizeRotation
} from './geometryTransform';

export interface GeometryRasterOptions {
  /** Cache key for the resampled buffer, e.g. a scan id. */
  cacheKey?: string;
  /**
   * Downscale target for interactive work. Output is capped so the long edge
   * does not exceed this value, keeping slider dragging responsive on large
   * scans. Exporters omit this to render at full resolution.
   */
  maxDimension?: number;
}

/** Retained so a single render pass can reuse the previous resample buffer. */
let cachedSource: ImageData | null = null;
let cachedOutput: ImageData | null = null;
let cachedSignature = '';

/**
 * Signature of everything the raster stage depends on. When it changes, the
 * cached buffer is rebuilt; otherwise the previous ImageData is reused verbatim
 * so routine colour edits (exposure, base, curves) do zero geometry work.
 */
function buildSignature(
  settings: InversionSettings,
  width: number,
  height: number,
  maxDimension?: number
): string {
  const crop = resolveCropRect(settings);
  return [
    width,
    height,
    maxDimension ?? 'full',
    normalizeRotation(settings.rotation || 0),
    (settings.straightenAngle || 0).toFixed(3),
    settings.flipHorizontal ? 1 : 0,
    settings.flipVertical ? 1 : 0,
    crop.enabled ? 1 : 0,
    crop.x.toFixed(4),
    crop.y.toFixed(4),
    crop.width.toFixed(4),
    crop.height.toFixed(4)
  ].join('|');
}

/**
 * Samples a bilinear-filtered RGBA pixel from the source buffer. Edge pixels are
 * clamped, so out-of-frame reads during straightening never bleed in black.
 */
function sampleBilinear(
  source: Uint8ClampedArray,
  sourceWidth: number,
  sourceHeight: number,
  x: number,
  y: number,
  out: Uint8ClampedArray,
  outIndex: number
): void {
  const clampedX = Math.min(sourceWidth - 1, Math.max(0, x));
  const clampedY = Math.min(sourceHeight - 1, Math.max(0, y));

  const x0 = Math.floor(clampedX);
  const y0 = Math.floor(clampedY);
  const x1 = Math.min(sourceWidth - 1, x0 + 1);
  const y1 = Math.min(sourceHeight - 1, y0 + 1);

  const fx = clampedX - x0;
  const fy = clampedY - y0;

  const topLeft = (y0 * sourceWidth + x0) * 4;
  const topRight = (y0 * sourceWidth + x1) * 4;
  const bottomLeft = (y1 * sourceWidth + x0) * 4;
  const bottomRight = (y1 * sourceWidth + x1) * 4;

  const wTopLeft = (1 - fx) * (1 - fy);
  const wTopRight = fx * (1 - fy);
  const wBottomLeft = (1 - fx) * fy;
  const wBottomRight = fx * fy;

  const r =
    source[topLeft] * wTopLeft +
    source[topRight] * wTopRight +
    source[bottomLeft] * wBottomLeft +
    source[bottomRight] * wBottomRight;
  const g =
    source[topLeft + 1] * wTopLeft +
    source[topRight + 1] * wTopRight +
    source[bottomLeft + 1] * wBottomLeft +
    source[bottomRight + 1] * wBottomRight;
  const b =
    source[topLeft + 2] * wTopLeft +
    source[topRight + 2] * wTopRight +
    source[bottomLeft + 2] * wBottomLeft +
    source[bottomRight + 2] * wBottomRight;
  const a =
    source[topLeft + 3] * wTopLeft +
    source[topRight + 3] * wTopRight +
    source[bottomLeft + 3] * wBottomLeft +
    source[bottomRight + 3] * wBottomRight;

  out[outIndex] = r;
  out[outIndex + 1] = g;
  out[outIndex + 2] = b;
  out[outIndex + 3] = a;
}

/**
 * Combines crop, quarter-turns and fine straightening into a single affine
 * pass. Doing it in one loop avoids the resampling artefacts of chaining
 * separate crop/rotate/straighten stages.
 */
function resample(
  source: ImageData,
  settings: InversionSettings,
  outputSize: { width: number; height: number }
): ImageData {
  const { width: sourceWidth, height: sourceHeight } = source;
  const crop = resolveCropRect(settings);
  const rotation = normalizeRotation(settings.rotation || 0);
  const straighten = (settings.straightenAngle || 0) * (Math.PI / 180);

  // Aspect of the crop in source-normalized units, matching the transform core,
  // so the straightening rotation is Euclidean rather than a shear.
  const aspect = crop.height > 0 ? crop.width / crop.height : 1;

  const output = new ImageData(outputSize.width, outputSize.height);
  const sourceData = source.data;
  const outputData = output.data;

  const cos = straighten !== 0 ? Math.cos(straighten) : 1;
  const sin = straighten !== 0 ? Math.sin(straighten) : 0;

  for (let y = 0; y < outputSize.height; y++) {
    // Pixel-centered position in crop-local normalized space.
    const v0 = (y + 0.5) / outputSize.height;
    const rowBase = y * outputSize.width * 4;

    for (let x = 0; x < outputSize.width; x++) {
      const u0 = (x + 0.5) / outputSize.width;

      // --- Inverse of the forward unit map (kept inline for speed) ---
      let u = u0;
      let v = v0;

      // 1. Undo flips.
      if (settings.flipHorizontal) u = 1 - u;
      if (settings.flipVertical) v = 1 - v;

      // 2. Undo straightening.
      if (straighten !== 0) {
        const rx = (u - 0.5) * aspect;
        const ry = v - 0.5;
        const sx = rx * cos + ry * sin;
        const sy = -rx * sin + ry * cos;
        u = 0.5 + sx / aspect;
        v = 0.5 + sy;
      }

      // 3. Undo the quarter-turn.
      const cx = u - 0.5;
      const cy = v - 0.5;
      let qx = cx;
      let qy = cy;
      if (rotation === 90) {
        qx = cy;
        qy = -cx;
      } else if (rotation === 180) {
        qx = -cx;
        qy = -cy;
      } else if (rotation === 270) {
        qx = -cy;
        qy = cx;
      }
      u = 0.5 + qx;
      v = 0.5 + qy;

      // --- Crop-local normalized -> source pixel coordinates ---
      const sourceX = (crop.x + u * crop.width) * sourceWidth - 0.5;
      const sourceY = (crop.y + v * crop.height) * sourceHeight - 0.5;

      sampleBilinear(
        sourceData,
        sourceWidth,
        sourceHeight,
        sourceX,
        sourceY,
        outputData,
        rowBase + x * 4
      );
    }
  }

  return output;
}

/**
 * Downscales an ImageData via progressive halving, which is both faster and
 * cleaner than a single large-kernel bilinear step.
 */
function downscaleToFit(image: ImageData, maxDimension: number): ImageData {
  let current = image;
  let longest = Math.max(current.width, current.height);

  if (longest <= maxDimension) return current;

  while (longest / 2 >= maxDimension) {
    const nextWidth = Math.max(1, Math.floor(current.width / 2));
    const nextHeight = Math.max(1, Math.floor(current.height / 2));
    const next = new ImageData(nextWidth, nextHeight);

    for (let y = 0; y < nextHeight; y++) {
      const base = y * nextWidth * 4;
      const sampleXSource = Math.min(current.width - 1, Math.floor(y * 2));
      const sourceRow0 = sampleXSource * current.width * 4;
      const sourceRow1 = Math.min(current.height - 1, sampleXSource + 1) * current.width * 4;

      for (let x = 0; x < nextWidth; x++) {
        const sourceColumn = Math.min(current.width - 1, Math.floor(x * 2));
        const topLeft = sourceRow0 + sourceColumn * 4;
        const bottomLeft = sourceRow1 + sourceColumn * 4;
        const index = base + x * 4;

        next.data[index] = (current.data[topLeft] + current.data[bottomLeft]) / 2;
        next.data[index + 1] = (current.data[topLeft + 1] + current.data[bottomLeft + 1]) / 2;
        next.data[index + 2] = (current.data[topLeft + 2] + current.data[bottomLeft + 2]) / 2;
        next.data[index + 3] = (current.data[topLeft + 3] + current.data[bottomLeft + 3]) / 2;
      }
    }

    current = next;
    longest = Math.max(current.width, current.height);
  }

  return current;
}

/**
 * Applies carrier geometry to `source`, returning pixels ready for inversion.
 *
 * Returns the input reference untouched when geometry is neutral, and reuses the
 * previous buffer (via cacheKey) while the geometry signature is unchanged.
 */
export function applyGeometry(
  source: ImageData,
  settings: InversionSettings,
  options: GeometryRasterOptions = {}
): ImageData {
  if (isGeometryIdentity(settings)) {
    cachedSource = null;
    cachedOutput = null;
    cachedSignature = '';
    return source;
  }

  const signature = `${options.cacheKey ?? 'default'}#${buildSignature(
    settings,
    source.width,
    source.height,
    options.maxDimension
  )}`;

  if (cachedOutput && cachedSource === source && cachedSignature === signature) {
    return cachedOutput;
  }

  const fullSize = getOutputSize(settings, source.width, source.height);
  const targetSize =
    options.maxDimension && Math.max(fullSize.width, fullSize.height) > options.maxDimension
      ? {
          width: Math.max(
            1,
            Math.round(fullSize.width * (options.maxDimension / Math.max(fullSize.width, fullSize.height)))
          ),
          height: Math.max(
            1,
            Math.round(fullSize.height * (options.maxDimension / Math.max(fullSize.width, fullSize.height)))
          )
        }
      : fullSize;

  const resampled = resample(source, settings, targetSize);
  const finalImage = options.maxDimension ? downscaleToFit(resampled, options.maxDimension) : resampled;

  cachedSource = source;
  cachedOutput = finalImage;
  cachedSignature = signature;

  return finalImage;
}

/** Clears the retained resample buffer, e.g. when switching frames. */
export function clearGeometryCache(): void {
  cachedSource = null;
  cachedOutput = null;
  cachedSignature = '';
}
