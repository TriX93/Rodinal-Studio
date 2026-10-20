import React, { useState } from 'react';
import { ExportConfiguration, FilmScanItem, InversionSettings } from '../types/film';
import { TiffWriter } from '../engine/export/tiffWriter';
import { wasmEngine } from '../engine/wasm/wasmEngine';
import { applyGeometry, clearGeometryCache } from '../engine/geometry/geometryRaster';
import { getOutputSize } from '../engine/geometry/geometryTransform';
import { X, Download, HardDrive, CheckCircle2, ShieldCheck, Loader2 } from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeScan: FilmScanItem;
  allScans: FilmScanItem[];
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  activeScan,
  allScans
}) => {
  const [config, setConfig] = useState<ExportConfiguration>({
    format: 'tiff-16bit',
    dpi: 600,
    bitDepth: 16,
    colorSpace: 'AdobeRGB',
    scale: 1.0,
    jpegQuality: 0.98,
    includeArchivalExif: true,
    batchExport: false
  });

  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<number>(0);
  const [exportSuccess, setExportSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  // Calculate estimated file size from the geometry-adjusted archival frame
  const geoSize = getOutputSize(activeScan.settings, activeScan.width, activeScan.height);
  const targetWidth = Math.max(1, Math.round(geoSize.width * config.scale));
  const targetHeight = Math.max(1, Math.round(geoSize.height * config.scale));
  const estimatedBytes =
    config.format === 'tiff-16bit'
      ? targetWidth * targetHeight * 6 // 48-bit RGB uncompressed
      : targetWidth * targetHeight * 0.45; // JPEG approximate
  const estimatedMB = (estimatedBytes / (1024 * 1024)).toFixed(1);

  const handleExport = async () => {
    setIsExporting(true);
    setExportProgress(10);
    setExportSuccess(false);

    try {
      const scansToProcess = config.batchExport ? allScans : [activeScan];

      for (let i = 0; i < scansToProcess.length; i++) {
        const item = scansToProcess[i];
        setExportProgress(Math.round(((i + 0.3) / scansToProcess.length) * 100));

        // Load image to offscreen canvas at native resolution
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = reject;
          img.src = item.fullImageUrl;
        });

        const nativeCanvas = document.createElement('canvas');
        nativeCanvas.width = img.naturalWidth || item.width;
        nativeCanvas.height = img.naturalHeight || item.height;
        const nativeCtx = nativeCanvas.getContext('2d', { willReadFrequently: true });
        if (!nativeCtx) throw new Error('Canvas 2D context error');

        nativeCtx.drawImage(img, 0, 0);
        const nativeData = nativeCtx.getImageData(0, 0, nativeCanvas.width, nativeCanvas.height);

        // Single carrier geometry pass at FULL resolution: crop, quarter-turn,
        // horizon straighten and emulsion flips. Identical code path to the
        // viewport preview, so exports match what was on screen.
        clearGeometryCache();
        const geoSrc = applyGeometry(nativeData, item.settings);

        const frameWidth = Math.max(1, Math.round(geoSrc.width * config.scale));
        const frameHeight = Math.max(1, Math.round(geoSrc.height * config.scale));

        setExportProgress(Math.round(((i + 0.7) / scansToProcess.length) * 100));

        if (config.format === 'tiff-16bit') {
          // Generate 16-bit uncompressed TIFF master. TiffWriter re-samples the
          // geometry-corrected frame to `config.scale`.
          const tiffBlob = TiffWriter.create16BitTiff(
            geoSrc,
            item.settings,
            item.metadata,
            config
          );

          const baseName = item.filename.replace(/\.[^/.]+$/, '');
          const filename = `${baseName}_Inverted_${config.dpi}DPI_16bit.tiff`;
          TiffWriter.triggerDownload(tiffBlob, filename);
        } else {
          // Process the positive at FULL geometry resolution first, so the
          // inversion buffer always matches the pixel count it is told about.
          const fullCanvas = document.createElement('canvas');
          fullCanvas.width = geoSrc.width;
          fullCanvas.height = geoSrc.height;
          const fullCtx = fullCanvas.getContext('2d');
          if (!fullCtx) throw new Error('Canvas 2D context error');

          const positiveData = fullCtx.createImageData(geoSrc.width, geoSrc.height);
          wasmEngine.processNegativeInversion(
            geoSrc.data,
            positiveData.data,
            geoSrc.width,
            geoSrc.height,
            {
              filmType: item.settings.filmType,
              baseR: item.settings.filmBase.r,
              baseG: item.settings.filmBase.g,
              baseB: item.settings.filmBase.b,
              exposureEV: item.settings.exposureEV,
              density: item.settings.density,
              blackPoint: item.settings.blackPoint,
              whitePoint: item.settings.whitePoint,
              cyanRed: item.settings.cyanRed,
              magentaGreen: item.settings.magentaGreen,
              yellowBlue: item.settings.yellowBlue,
              contrast: item.settings.contrast,
              saturation: item.settings.saturation,
              shadowLift: item.settings.shadowLift,
              highlightRecovery: item.settings.highlightRecovery
            }
          );
          fullCtx.putImageData(positiveData, 0, 0);

          // Apply the requested resolution scale on the way out (1:1 when 100%).
          const outCanvas = document.createElement('canvas');
          outCanvas.width = frameWidth;
          outCanvas.height = frameHeight;
          const outCtx = outCanvas.getContext('2d');
          if (!outCtx) throw new Error('Canvas 2D context error');
          outCtx.drawImage(fullCanvas, 0, 0, frameWidth, frameHeight);

          const jpegBlob = await TiffWriter.createJpeg(outCanvas, config.jpegQuality);
          const baseName = item.filename.replace(/\.[^/.]+$/, '');
          const filename = `${baseName}_Inverted_Archival.jpg`;
          TiffWriter.triggerDownload(jpegBlob, filename);
        }
      }

      setExportProgress(100);
      setExportSuccess(true);
      setTimeout(() => {
        setIsExporting(false);
      }, 1500);
    } catch (err) {
      setIsExporting(false);
      alert(`Export error: ${(err as Error).message}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col text-neutral-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
          <div className="flex items-center gap-2.5">
            <HardDrive className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-sm font-semibold text-white">Archival Master Export</h2>
              <p className="text-[11px] text-neutral-400 font-mono">
                100% Client-Side Inversion · Zero Cloud Processing
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 text-xs">
          {/* Output Format */}
          <div>
            <label className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider block mb-2">
              Archival Format &amp; Bit Depth
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setConfig({ ...config, format: 'tiff-16bit', bitDepth: 16 })}
                className={`p-3 rounded border text-left flex flex-col gap-1 transition-colors ${
                  config.format === 'tiff-16bit'
                    ? 'bg-amber-500/10 border-amber-500/80 text-white'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-white">16-Bit TIFF</span>
                  <span className="text-[10px] font-mono text-amber-400">48-bit RGB</span>
                </div>
                <span className="text-[10.5px] text-neutral-400 leading-snug">
                  Uncompressed TIFF 6.0 with full dynamic range for museum &amp; darkroom archiving.
                </span>
              </button>

              <button
                onClick={() => setConfig({ ...config, format: 'jpeg', bitDepth: 8 })}
                className={`p-3 rounded border text-left flex flex-col gap-1 transition-colors ${
                  config.format === 'jpeg'
                    ? 'bg-amber-500/10 border-amber-500/80 text-white'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-white">High-Res JPEG</span>
                  <span className="text-[10px] font-mono text-neutral-400">98% Quality</span>
                </div>
                <span className="text-[10.5px] text-neutral-400 leading-snug">
                  Lightweight distribution &amp; web presentation with preserved EXIF headers.
                </span>
              </button>
            </div>
          </div>

          {/* Archival DPI & Resolution */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider block mb-1.5">
                Archival Scan DPI
              </label>
              <div className="grid grid-cols-3 gap-1 bg-neutral-950 p-1 rounded border border-neutral-800">
                {[300, 600, 1200].map((dpiVal) => (
                  <button
                    key={dpiVal}
                    onClick={() => setConfig({ ...config, dpi: dpiVal as 300 | 600 | 1200 })}
                    className={`py-1 text-[11px] font-mono rounded transition-colors ${
                      config.dpi === dpiVal
                        ? 'bg-neutral-800 text-amber-400 font-bold'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    {dpiVal}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider block mb-1.5">
                Color Space Tag
              </label>
              <select
                value={config.colorSpace}
                onChange={(e) =>
                  setConfig({ ...config, colorSpace: e.target.value as 'AdobeRGB' | 'sRGB' | 'ProPhotoRGB' })
                }
                className="w-full bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-amber-400"
              >
                <option value="AdobeRGB">Adobe RGB (1998) - Wide Gamut</option>
                <option value="ProPhotoRGB">ProPhoto RGB - Archival</option>
                <option value="sRGB">sRGB - Standard Web</option>
              </select>
            </div>
          </div>

          {/* Resolution Scaling */}
          <div>
            <label className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider block mb-1.5">
              Export Resolution
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setConfig({ ...config, scale: 1.0 })}
                className={`py-1.5 px-2 rounded border text-center font-mono text-[11px] transition-colors ${
                  config.scale === 1.0
                    ? 'bg-neutral-800 border-amber-500/80 text-amber-400 font-semibold'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                100% Native ({targetWidth} × {targetHeight})
              </button>
              <button
                onClick={() => setConfig({ ...config, scale: 0.75 })}
                className={`py-1.5 px-2 rounded border text-center font-mono text-[11px] transition-colors ${
                  config.scale === 0.75
                    ? 'bg-neutral-800 border-amber-500/80 text-amber-400 font-semibold'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                75% Scale
              </button>
              <button
                onClick={() => setConfig({ ...config, scale: 0.5 })}
                className={`py-1.5 px-2 rounded border text-center font-mono text-[11px] transition-colors ${
                  config.scale === 0.5
                    ? 'bg-neutral-800 border-amber-500/80 text-amber-400 font-semibold'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                50% Scale
              </button>
            </div>
          </div>

          {/* Batch or Single frame */}
          <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.batchExport}
                onChange={(e) => setConfig({ ...config, batchExport: e.target.checked })}
                className="rounded bg-neutral-950 border-neutral-700 text-amber-500 accent-amber-500"
              />
              <span className="text-neutral-300 font-medium">
                Batch export entire roll ({allScans.length} frames)
              </span>
            </label>

            <div className="text-[11px] font-mono text-neutral-400">
              Est. File Size: <span className="text-amber-400 font-semibold">{estimatedMB} MB</span>
            </div>
          </div>

          {/* Progress bar */}
          {isExporting && (
            <div className="space-y-1.5 pt-2">
              <div className="flex justify-between text-[11px] font-mono">
                <span className="text-amber-400 flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Generating 16-Bit TIFF Master...
                </span>
                <span>{exportProgress}%</span>
              </div>
              <div className="w-full h-1.5 bg-neutral-950 rounded-full overflow-hidden">
                <div
                  style={{ width: `${exportProgress}%` }}
                  className="h-full bg-amber-400 transition-all duration-200"
                />
              </div>
            </div>
          )}

          {exportSuccess && (
            <div className="flex items-center gap-2 p-2.5 rounded bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Archival files generated and downloaded to your disk successfully!</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-neutral-950 border-t border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-neutral-500 text-[11px] font-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Encrypted local storage · No telemetry</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={isExporting}
              className="px-4 py-2 text-xs font-medium text-neutral-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-neutral-950 bg-amber-400 hover:bg-amber-300 rounded shadow-sm hover:shadow transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{config.batchExport ? `Export All ${allScans.length} Frames` : 'Export Frame'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
