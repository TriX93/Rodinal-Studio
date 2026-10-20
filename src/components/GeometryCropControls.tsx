import React from 'react';
import { FilmScanItem, InversionSettings, CropAspectRatio, CropSettings } from '../types/film';
import { RotateCw, FlipHorizontal, FlipVertical, Compass, Crop, RotateCcw, Grid3X3 } from 'lucide-react';

interface GeometryCropControlsProps {
  scan: FilmScanItem;
  settings: InversionSettings;
  onUpdateSettings: (newSettings: Partial<InversionSettings>) => void;
}

export const GeometryCropControls: React.FC<GeometryCropControlsProps> = ({
  scan,
  settings,
  onUpdateSettings
}) => {
  const crop = settings.crop || {
    enabled: false,
    x: 0,
    y: 0,
    width: 1,
    height: 1,
    aspectRatio: 'free'
  };

  /**
   * Seeds the rect used when crop is switched on. A disabled crop carries
   * x:0/y:0/width:1/height:1, which would produce a full-frame box that can
   * neither be moved nor grabbed (its handles sit on the image edge). So a
   * full-frame rect is treated as "nothing chosen yet" and replaced with an
   * inset default.
   */
  const seedCrop = (source: CropSettings) => {
    const isFullFrame =
      source.x === 0 && source.y === 0 && source.width === 1 && source.height === 1;
    return {
      enabled: true,
      x: isFullFrame ? 0.05 : source.x,
      y: isFullFrame ? 0.05 : source.y,
      width: isFullFrame ? 0.9 : source.width,
      height: isFullFrame ? 0.9 : source.height,
      aspectRatio: source.aspectRatio || 'free'
    };
  };

  const handleToggleCrop = () => {
    const nextEnabled = !crop.enabled;
    onUpdateSettings({
      crop: nextEnabled
        ? seedCrop(crop)
        : { enabled: false, x: 0, y: 0, width: 1, height: 1, aspectRatio: crop.aspectRatio || 'free' }
    });
  };

  const handleSelectAspectRatio = (ratio: CropAspectRatio) => {
    const scanW = scan.width || 1500;
    const scanH = scan.height || 1000;

    // Work in PIXELS, then convert back to the normalized crop space. The crop
    // rect is normalized over the source frame, so equal normalized width and
    // height are not square unless the frame is square - doing the maths in
    // normalized units is what previously made "1:1" come out rectangular.
    let targetRatio: number | null = null;
    if (ratio === '1:1') targetRatio = 1;
    else if (ratio === '3:2') targetRatio = 3 / 2;
    else if (ratio === '4:3') targetRatio = 4 / 3;
    else if (ratio === '16:9') targetRatio = 16 / 9;
    else if (ratio === 'original') targetRatio = scanW / scanH;

    const curW = crop.width || 1;
    const curH = crop.height || 1;
    let newW = curW;
    let newH = curH;

    if (targetRatio) {
      // Keep the current pixel width and derive the height that satisfies the
      // ratio, then clamp into the frame without breaking the ratio.
      newH = (curW * scanW) / (targetRatio * scanH);
      if (newH > 1) {
        newH = 1;
        newW = (newH * targetRatio * scanH) / scanW;
      }
      if (newW > 1) {
        newW = 1;
        newH = (newW * scanW) / (targetRatio * scanH);
      }
    }

    // Re-centre the new rect inside the frame so it never overflows.
    const finalW = Math.max(0.1, Math.min(1, newW));
    const finalH = Math.max(0.1, Math.min(1, newH));

    onUpdateSettings({
      crop: {
        ...crop,
        enabled: true,
        x: Math.max(0, Math.min(1 - finalW, (1 - finalW) / 2)),
        y: Math.max(0, Math.min(1 - finalH, (1 - finalH) / 2)),
        width: finalW,
        height: finalH,
        aspectRatio: ratio
      }
    });
  };

  const handleResetCrop = () => {
    onUpdateSettings({
      crop: {
        enabled: false,
        x: 0,
        y: 0,
        width: 1,
        height: 1,
        aspectRatio: 'free'
      }
    });
  };

  return (
    <div className="bg-neutral-900/70 border border-neutral-800 rounded p-3 space-y-3.5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-mono text-amber-400 font-semibold tracking-wider">
          GEOMETRY, HORIZON &amp; CROP
        </span>
        <span
          className={`text-[9.5px] font-mono px-1.5 py-0.5 rounded ${
            crop.enabled
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 font-semibold'
              : 'text-neutral-500'
          }`}
        >
          {crop.enabled ? 'CROP ATTIVO' : 'FULL FRAME'}
        </span>
      </div>

      {/* 90-degree Rotation & Flips */}
      <div className="grid grid-cols-3 gap-1.5">
        <button
          onClick={() => onUpdateSettings({ rotation: (settings.rotation + 90) % 360 })}
          className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs transition-colors"
          title="Ruota di 90 gradi in senso orario [Shortcut: R]"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span className="font-mono text-[11px]">{settings.rotation}°</span>
        </button>

        <button
          onClick={() => onUpdateSettings({ flipHorizontal: !settings.flipHorizontal })}
          className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded text-xs transition-colors ${
            settings.flipHorizontal
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 font-semibold'
              : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200'
          }`}
          title="Specchia orizzontale (emulsione invertita) [Shortcut: H]"
        >
          <FlipHorizontal className="w-3.5 h-3.5" />
          <span className="font-mono text-[11px]">Flip H</span>
        </button>

        <button
          onClick={() => onUpdateSettings({ flipVertical: !settings.flipVertical })}
          className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded text-xs transition-colors ${
            settings.flipVertical
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 font-semibold'
              : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200'
          }`}
          title="Specchia verticale (capovolgimento) [Shortcut: V]"
        >
          <FlipVertical className="w-3.5 h-3.5" />
          <span className="font-mono text-[11px]">Flip V</span>
        </button>
      </div>

      {/* Horizon Leveling / Straighten */}
      <div className="space-y-1.5 pt-2 border-t border-neutral-800/80">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-neutral-300 font-mono flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-amber-400" />
            <span>Allineamento Orizzonte</span>
          </span>
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-white font-semibold">
              {(settings.straightenAngle || 0) > 0
                ? `+${(settings.straightenAngle || 0).toFixed(1)}°`
                : `${(settings.straightenAngle || 0).toFixed(1)}°`}
            </span>
            {(settings.straightenAngle || 0) !== 0 && (
              <button
                onClick={() => onUpdateSettings({ straightenAngle: 0 })}
                className="text-[10px] font-mono text-neutral-400 hover:text-amber-400 underline ml-0.5"
                title="Azzera allineamento"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        <input
          type="range"
          min="-45"
          max="45"
          step="0.1"
          value={settings.straightenAngle || 0}
          onChange={(e) => onUpdateSettings({ straightenAngle: parseFloat(e.target.value) })}
          className="w-full accent-amber-400 h-1.5 bg-neutral-800 rounded"
        />

        <div className="flex items-center justify-between text-[10px] font-mono text-neutral-500">
          <button
            onClick={() =>
              onUpdateSettings({
                straightenAngle: Math.max(-45, Number(((settings.straightenAngle || 0) - 1.0).toFixed(1)))
              })
            }
            className="hover:text-neutral-300 px-1 py-0.5 rounded bg-neutral-800/50"
          >
            -1.0°
          </button>
          <button
            onClick={() =>
              onUpdateSettings({
                straightenAngle: Math.max(-45, Number(((settings.straightenAngle || 0) - 0.1).toFixed(1)))
              })
            }
            className="hover:text-neutral-300 px-1 py-0.5 rounded bg-neutral-800/50"
          >
            -0.1°
          </button>
          <span className="text-neutral-600">|</span>
          <button
            onClick={() =>
              onUpdateSettings({
                straightenAngle: Math.min(45, Number(((settings.straightenAngle || 0) + 0.1).toFixed(1)))
              })
            }
            className="hover:text-neutral-300 px-1 py-0.5 rounded bg-neutral-800/50"
          >
            +0.1°
          </button>
          <button
            onClick={() =>
              onUpdateSettings({
                straightenAngle: Math.min(45, Number(((settings.straightenAngle || 0) + 1.0).toFixed(1)))
              })
            }
            className="hover:text-neutral-300 px-1 py-0.5 rounded bg-neutral-800/50"
          >
            +1.0°
          </button>
        </div>
      </div>

      {/* Crop Tool & Aspect Ratios */}
      <div className="space-y-2 pt-2 border-t border-neutral-800/80">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-neutral-300 font-mono flex items-center gap-1.5">
            <Crop className="w-3.5 h-3.5 text-amber-400" />
            <span>Ritaglio Negativo (Crop)</span>
          </span>
          <button
            onClick={handleToggleCrop}
            className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
              crop.enabled
                ? 'bg-amber-400 text-neutral-950 font-bold shadow'
                : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
            }`}
          >
            {crop.enabled ? 'Crop Attivo' : 'Abilita Crop'}
          </button>
        </div>

        {crop.enabled && (
          <div className="space-y-2 pt-1 bg-black/40 p-2 rounded border border-neutral-800">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-neutral-400">PROPORZIONI:</span>
              <span className="text-[9.5px] font-mono text-amber-400 uppercase">
                {crop.aspectRatio || 'free'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1">
              {[
                { id: 'free', label: 'Libero' },
                { id: 'original', label: 'Originale' },
                { id: '3:2', label: '3:2 (35mm)' },
                { id: '1:1', label: '1:1 (Quad)' },
                { id: '4:3', label: '4:3 (645)' },
                { id: '16:9', label: '16:9 (Cine)' }
              ].map((r) => (
                <button
                  key={r.id}
                  onClick={() => handleSelectAspectRatio(r.id as CropAspectRatio)}
                  className={`py-1 px-1 rounded text-[10px] font-mono text-center transition-colors ${
                    crop.aspectRatio === r.id
                      ? 'bg-amber-400 text-neutral-950 font-bold'
                      : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-neutral-850 text-[10px] font-mono">
              <span className="text-neutral-500">
                {Math.round((crop.width || 1) * 100)}% × {Math.round((crop.height || 1) * 100)}%
              </span>
              <button
                onClick={handleResetCrop}
                className="text-neutral-400 hover:text-red-400 flex items-center gap-1 transition-colors"
              >
                <RotateCcw className="w-2.5 h-2.5" />
                <span>Ripristina</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
