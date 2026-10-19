import React from 'react';
import { FilmScanItem, InversionSettings } from '../types/film';
import { FILM_PRESETS } from '../engine/presets/filmPresets';
import { CurvesEditor } from './CurvesEditor';
import { Pipette, Sparkles, Sliders, RefreshCw, Layers, Film, Tag, Camera, RotateCw, FlipHorizontal, FlipVertical, Scale, Flame } from 'lucide-react';

interface SidebarControlsProps {
  scan: FilmScanItem;
  settings: InversionSettings;
  onUpdateSettings: (newSettings: Partial<InversionSettings>) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isEyedropperActive: boolean;
  setIsEyedropperActive: (active: boolean) => void;
  onOpenLicensing?: () => void;
  onOpenDurstDarkroom?: () => void;
}

export const SidebarControls: React.FC<SidebarControlsProps> = ({
  scan,
  settings,
  onUpdateSettings,
  activeTab,
  setActiveTab,
  isEyedropperActive,
  setIsEyedropperActive,
  onOpenLicensing,
  onOpenDurstDarkroom
}) => {
  // Apply Film Preset
  const handleSelectPreset = (presetId: string) => {
    const preset = FILM_PRESETS.find(p => p.id === presetId);
    if (!preset) return;

    onUpdateSettings({
      filmPresetId: preset.id,
      contrast: preset.contrast,
      saturation: preset.saturation,
      density: preset.density,
      cyanRed: preset.cyanRed,
      magentaGreen: preset.magentaGreen,
      yellowBlue: preset.yellowBlue,
      shadowLift: preset.shadowLift,
      highlightRecovery: preset.highlightRecovery,
      grainAmount: preset.grainAmount,
      grainSize: preset.grainSize
    });
  };

  // Auto-detect film base
  const handleAutoDetectBase = () => {
    // Portra / Superia typical baseline
    if (settings.filmType === 'color-negative') {
      onUpdateSettings({
        filmBase: { r: 0.86, g: 0.45, b: 0.14 },
        autoBaseDetected: true
      });
    } else if (settings.filmType === 'bw-negative') {
      onUpdateSettings({
        filmBase: { r: 0.82, g: 0.82, b: 0.82 },
        autoBaseDetected: true
      });
    } else {
      onUpdateSettings({
        filmBase: { r: 1.0, g: 1.0, b: 1.0 },
        autoBaseDetected: true
      });
    }
  };

  return (
    <div className="w-80 bg-neutral-950 border-l border-neutral-850 flex flex-col h-full overflow-hidden select-none">
      {/* Tab Navigation Strip */}
      <div className="flex items-center justify-between px-2 py-2 border-b border-neutral-850 bg-neutral-900/60">
        <button
          onClick={() => setActiveTab('inversion')}
          className={`flex-1 py-1 text-[11px] font-medium text-center rounded transition-colors ${
            activeTab === 'inversion' ? 'bg-neutral-800 text-amber-400 font-semibold' : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          Base &amp; Inversion
        </button>

        <button
          onClick={() => setActiveTab('color')}
          className={`flex-1 py-1 text-[11px] font-medium text-center rounded transition-colors ${
            activeTab === 'color' ? 'bg-neutral-800 text-amber-400 font-semibold' : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          Color Balance
        </button>

        <button
          onClick={() => setActiveTab('curves')}
          className={`flex-1 py-1 text-[11px] font-medium text-center rounded transition-colors ${
            activeTab === 'curves' ? 'bg-neutral-800 text-amber-400 font-semibold' : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          Curves
        </button>

        <button
          onClick={() => setActiveTab('presets')}
          className={`flex-1 py-1 text-[11px] font-medium text-center rounded transition-colors ${
            activeTab === 'presets' ? 'bg-neutral-800 text-amber-400 font-semibold' : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          Presets
        </button>

        <button
          onClick={() => setActiveTab('metadata')}
          className={`flex-1 py-1 text-[11px] font-medium text-center rounded transition-colors ${
            activeTab === 'metadata' ? 'bg-neutral-800 text-amber-400 font-semibold' : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          EXIF
        </button>
      </div>

      {/* Tab Contents */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 scrollbar-thin text-neutral-300">
        {/* TAB 1: BASE & INVERSION */}
        {activeTab === 'inversion' && (
          <div className="space-y-4">
            {/* Film Type Selector */}
            <div>
              <label className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider block mb-1.5">
                Film Emulsion Type
              </label>
              <div className="grid grid-cols-3 gap-1 bg-neutral-900 p-1 rounded border border-neutral-800">
                <button
                  onClick={() => onUpdateSettings({ filmType: 'color-negative' })}
                  className={`py-1.5 text-[11px] font-medium rounded transition-colors ${
                    settings.filmType === 'color-negative'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  C-41 Color
                </button>
                <button
                  onClick={() => onUpdateSettings({ filmType: 'bw-negative' })}
                  className={`py-1.5 text-[11px] font-medium rounded transition-colors ${
                    settings.filmType === 'bw-negative'
                      ? 'bg-neutral-700 text-white border border-neutral-600'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  B&amp;W Halide
                </button>
                <button
                  onClick={() => onUpdateSettings({ filmType: 'slide-positive' })}
                  className={`py-1.5 text-[11px] font-medium rounded transition-colors ${
                    settings.filmType === 'slide-positive'
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  E-6 Slide
                </button>
              </div>
            </div>

            {/* Film Base Mask Neutralization */}
            <div className="bg-neutral-900/70 border border-neutral-800 rounded p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-amber-400 font-semibold tracking-wider">
                  ORANGE BASE MASK
                </span>
                <div
                  style={{
                    backgroundColor: `rgb(${Math.round(settings.filmBase.r * 255)}, ${Math.round(
                      settings.filmBase.g * 255
                    )}, ${Math.round(settings.filmBase.b * 255)})`
                  }}
                  className="w-5 h-5 rounded border border-white/20 shadow-xs"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsEyedropperActive(!isEyedropperActive)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded text-xs transition-colors ${
                    isEyedropperActive
                      ? 'bg-amber-400 text-neutral-950 font-semibold shadow'
                      : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200'
                  }`}
                >
                  <Pipette className="w-3.5 h-3.5" />
                  <span>{isEyedropperActive ? 'Click Rebate...' : 'Sample Rebate'}</span>
                </button>

                <button
                  onClick={handleAutoDetectBase}
                  className="flex items-center justify-center gap-1 py-1.5 px-2.5 rounded text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
                  title="Auto-detect orange film base"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Auto</span>
                </button>
              </div>

              {/* R, G, B Film Base Sliders */}
              <div className="space-y-1.5 pt-1 text-[11px]">
                <div className="flex items-center justify-between text-neutral-400">
                  <span className="text-red-400 font-mono">Base Red</span>
                  <span className="font-mono">{Math.round(settings.filmBase.r * 255)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.005"
                  value={settings.filmBase.r}
                  onChange={(e) =>
                    onUpdateSettings({
                      filmBase: { ...settings.filmBase, r: parseFloat(e.target.value) },
                      autoBaseDetected: false
                    })
                  }
                  className="w-full accent-red-500 h-1 bg-neutral-800 rounded"
                />

                <div className="flex items-center justify-between text-neutral-400">
                  <span className="text-green-400 font-mono">Base Green</span>
                  <span className="font-mono">{Math.round(settings.filmBase.g * 255)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.005"
                  value={settings.filmBase.g}
                  onChange={(e) =>
                    onUpdateSettings({
                      filmBase: { ...settings.filmBase, g: parseFloat(e.target.value) },
                      autoBaseDetected: false
                    })
                  }
                  className="w-full accent-green-500 h-1 bg-neutral-800 rounded"
                />

                <div className="flex items-center justify-between text-neutral-400">
                  <span className="text-blue-400 font-mono">Base Blue</span>
                  <span className="font-mono">{Math.round(settings.filmBase.b * 255)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.005"
                  value={settings.filmBase.b}
                  onChange={(e) =>
                    onUpdateSettings({
                      filmBase: { ...settings.filmBase, b: parseFloat(e.target.value) },
                      autoBaseDetected: false
                    })
                  }
                  className="w-full accent-blue-500 h-1 bg-neutral-800 rounded"
                />
              </div>
            </div>

            {/* Exposure and Optical Density */}
            <div className="space-y-3 pt-2">
              <div>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-neutral-400 font-mono">Exposure Compensation</span>
                  <span className="font-mono text-white">
                    {settings.exposureEV > 0 ? `+${settings.exposureEV.toFixed(2)}` : settings.exposureEV.toFixed(2)} EV
                  </span>
                </div>
                <input
                  type="range"
                  min="-2.5"
                  max="2.5"
                  step="0.05"
                  value={settings.exposureEV}
                  onChange={(e) => onUpdateSettings({ exposureEV: parseFloat(e.target.value) })}
                  className="w-full accent-amber-400 h-1.5 bg-neutral-800 rounded"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-neutral-400 font-mono">Optical Density Slope</span>
                  <span className="font-mono text-white">{settings.density.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.6"
                  max="2.2"
                  step="0.02"
                  value={settings.density}
                  onChange={(e) => onUpdateSettings({ density: parseFloat(e.target.value) })}
                  className="w-full accent-amber-400 h-1.5 bg-neutral-800 rounded"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-neutral-400 font-mono">Black Point Clip</span>
                  <span className="font-mono text-white">{settings.blackPoint.r.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="0.2"
                  step="0.005"
                  value={settings.blackPoint.r}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    onUpdateSettings({ blackPoint: { r: v, g: v, b: v } });
                  }}
                  className="w-full accent-neutral-400 h-1.5 bg-neutral-800 rounded"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-neutral-400 font-mono">White Point Clip</span>
                  <span className="font-mono text-white">{settings.whitePoint.r.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.8"
                  max="1.0"
                  step="0.005"
                  value={settings.whitePoint.r}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    onUpdateSettings({ whitePoint: { r: v, g: v, b: v } });
                  }}
                  className="w-full accent-neutral-400 h-1.5 bg-neutral-800 rounded"
                />
              </div>
            </div>

            {/* Carrier Orientation & Emulsion Alignment */}
            <div className="bg-neutral-900/70 border border-neutral-800 rounded p-3 space-y-2">
              <span className="text-[11px] font-mono text-amber-400 font-semibold tracking-wider block">
                CARRIER ALIGNMENT &amp; ORIENTATION
              </span>
              <div className="grid grid-cols-3 gap-1.5 pt-0.5">
                <button
                  onClick={() => onUpdateSettings({ rotation: (settings.rotation + 90) % 360 })}
                  className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs transition-colors"
                  title="Rotate 90 degrees [Shortcut: R]"
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
                  title="Flip Horizontal (Emulsion mirror correction) [Shortcut: H]"
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
                  title="Flip Vertical (Carrier inversion correction) [Shortcut: V]"
                >
                  <FlipVertical className="w-3.5 h-3.5" />
                  <span className="font-mono text-[11px]">Flip V</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: COLOR BALANCE & TONES */}
        {activeTab === 'color' && (
          <div className="space-y-4">
            <div className="bg-neutral-900/70 border border-neutral-800 rounded p-3 space-y-3.5">
              <span className="text-[11px] font-mono text-amber-400 font-semibold tracking-wider block">
                LAB COLOR BALANCING
              </span>

              {/* Cyan - Red */}
              <div>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-cyan-400 font-mono">Cyan</span>
                  <span className="font-mono text-white">
                    {settings.cyanRed > 0 ? `+${settings.cyanRed}` : settings.cyanRed}
                  </span>
                  <span className="text-red-400 font-mono">Red</span>
                </div>
                <input
                  type="range"
                  min="-60"
                  max="60"
                  value={settings.cyanRed}
                  onChange={(e) => onUpdateSettings({ cyanRed: parseInt(e.target.value) })}
                  className="w-full accent-red-400 h-1.5 bg-gradient-to-r from-cyan-600 via-neutral-700 to-red-600 rounded"
                />
              </div>

              {/* Magenta - Green */}
              <div>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-pink-400 font-mono">Magenta</span>
                  <span className="font-mono text-white">
                    {settings.magentaGreen > 0 ? `+${settings.magentaGreen}` : settings.magentaGreen}
                  </span>
                  <span className="text-emerald-400 font-mono">Green</span>
                </div>
                <input
                  type="range"
                  min="-60"
                  max="60"
                  value={settings.magentaGreen}
                  onChange={(e) => onUpdateSettings({ magentaGreen: parseInt(e.target.value) })}
                  className="w-full accent-green-400 h-1.5 bg-gradient-to-r from-pink-600 via-neutral-700 to-emerald-600 rounded"
                />
              </div>

              {/* Yellow - Blue */}
              <div>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-yellow-400 font-mono">Yellow</span>
                  <span className="font-mono text-white">
                    {settings.yellowBlue > 0 ? `+${settings.yellowBlue}` : settings.yellowBlue}
                  </span>
                  <span className="text-blue-400 font-mono">Blue</span>
                </div>
                <input
                  type="range"
                  min="-60"
                  max="60"
                  value={settings.yellowBlue}
                  onChange={(e) => onUpdateSettings({ yellowBlue: parseInt(e.target.value) })}
                  className="w-full accent-blue-400 h-1.5 bg-gradient-to-r from-yellow-500 via-neutral-700 to-blue-600 rounded"
                />
              </div>
            </div>

            {/* Tonal Controls */}
            <div className="space-y-3 pt-1">
              <div>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-neutral-400 font-mono">Contrast</span>
                  <span className="font-mono text-white">{settings.contrast}</span>
                </div>
                <input
                  type="range"
                  min="-50"
                  max="50"
                  value={settings.contrast}
                  onChange={(e) => onUpdateSettings({ contrast: parseInt(e.target.value) })}
                  className="w-full accent-amber-400 h-1.5 bg-neutral-800 rounded"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-neutral-400 font-mono">Saturation</span>
                  <span className="font-mono text-white">{settings.saturation}</span>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={settings.saturation}
                  onChange={(e) => onUpdateSettings({ saturation: parseInt(e.target.value) })}
                  className="w-full accent-amber-400 h-1.5 bg-neutral-800 rounded"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-neutral-400 font-mono">Shadow Lift</span>
                  <span className="font-mono text-white">{settings.shadowLift}</span>
                </div>
                <input
                  type="range"
                  min="-50"
                  max="50"
                  value={settings.shadowLift}
                  onChange={(e) => onUpdateSettings({ shadowLift: parseInt(e.target.value) })}
                  className="w-full accent-amber-400 h-1.5 bg-neutral-800 rounded"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-neutral-400 font-mono">Highlight Recovery</span>
                  <span className="font-mono text-white">{settings.highlightRecovery}</span>
                </div>
                <input
                  type="range"
                  min="-50"
                  max="50"
                  value={settings.highlightRecovery}
                  onChange={(e) => onUpdateSettings({ highlightRecovery: parseInt(e.target.value) })}
                  className="w-full accent-amber-400 h-1.5 bg-neutral-800 rounded"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: CURVES */}
        {activeTab === 'curves' && (
          <div className="space-y-4">
            <CurvesEditor
              curves={settings.curves}
              onChange={(curves) => onUpdateSettings({ curves })}
            />
            <div className="text-[10px] text-neutral-500 font-mono">
              Click and drag points to reshape optical transfer function. Endpoints control toe and shoulder roll-off.
            </div>
          </div>
        )}

        {/* TAB 4: FILM STOCKS & GRAIN */}
        {activeTab === 'presets' && (
          <div className="space-y-4">
            <div>
              <span className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider block mb-2">
                Iconic Film Emulations
              </span>
              <div className="space-y-1.5">
                {FILM_PRESETS.map((preset) => {
                  const isSelected = settings.filmPresetId === preset.id;
                  return (
                    <button
                      key={preset.id}
                      onClick={() => handleSelectPreset(preset.id)}
                      className={`w-full text-left p-2.5 rounded border transition-colors flex flex-col gap-1 ${
                        isSelected
                          ? 'bg-amber-500/10 border-amber-500/60 text-white'
                          : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold">{preset.name}</span>
                        <span className="text-[10px] font-mono text-amber-400">
                          ISO {preset.iso}
                        </span>
                      </div>
                      <p className="text-[10.5px] text-neutral-400 leading-snug">
                        {preset.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Grain & Sharpening */}
            <div className="bg-neutral-900/70 border border-neutral-800 rounded p-3 space-y-3">
              <span className="text-[11px] font-mono text-amber-400 font-semibold tracking-wider block">
                GRAIN &amp; ACUTANCE
              </span>

              <div>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-neutral-400 font-mono">Grain Intensity</span>
                  <span className="font-mono text-white">{settings.grainAmount}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="80"
                  value={settings.grainAmount}
                  onChange={(e) => onUpdateSettings({ grainAmount: parseInt(e.target.value) })}
                  className="w-full accent-amber-400 h-1.5 bg-neutral-800 rounded"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-neutral-400 font-mono">Micro-Sharpening</span>
                  <span className="font-mono text-white">{settings.sharpeningAmount}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="60"
                  value={settings.sharpeningAmount}
                  onChange={(e) => onUpdateSettings({ sharpeningAmount: parseInt(e.target.value) })}
                  className="w-full accent-amber-400 h-1.5 bg-neutral-800 rounded"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: ARCHIVAL EXIF METADATA */}
        {activeTab === 'metadata' && (
          <div className="space-y-3 text-xs">
            <span className="text-[11px] font-mono text-amber-400 font-semibold tracking-wider block">
              NIKON RAW SPECIFICATIONS
            </span>

            <div className="bg-neutral-900/70 border border-neutral-800 rounded p-3 space-y-2 text-[11px] font-mono">
              <div className="flex justify-between py-1 border-b border-neutral-800">
                <span className="text-neutral-500">Camera Body:</span>
                <span className="text-white font-semibold">{scan.metadata.cameraModel}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-neutral-800">
                <span className="text-neutral-500">Digitizer Lens:</span>
                <span className="text-white text-right max-w-[160px] truncate">{scan.metadata.scannerLens}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-neutral-800">
                <span className="text-neutral-500">CFA Pattern:</span>
                <span className="text-amber-400 font-semibold">{scan.cfaPattern || 'RGGB Bayer'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-neutral-800">
                <span className="text-neutral-500">Sensor Bit Depth:</span>
                <span className="text-white">{scan.bitsPerSample}-Bit Uncompressed</span>
              </div>
              <div className="flex justify-between py-1 border-b border-neutral-800">
                <span className="text-neutral-500">ISO / Exposure:</span>
                <span className="text-white">ISO {scan.metadata.iso} · {scan.metadata.exposureTime}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-neutral-500">Archival Roll / Frame:</span>
                <span className="text-white">{scan.metadata.rollId} / #{scan.metadata.frameNumber}</span>
              </div>
            </div>

            {/* Editable Archival Notes */}
            <div className="space-y-1 pt-1">
              <label className="text-[11px] font-mono text-neutral-400">
                Archivist / Colorist
              </label>
              <input
                type="text"
                value={scan.metadata.archivist}
                onChange={(e) => {
                  scan.metadata.archivist = e.target.value;
                }}
                className="w-full bg-neutral-900 border border-neutral-800 rounded px-2.5 py-1.5 text-xs text-white focus:border-amber-400 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-mono text-neutral-400">
                Archival Laboratory Notes
              </label>
              <textarea
                rows={3}
                value={scan.metadata.notes}
                onChange={(e) => {
                  scan.metadata.notes = e.target.value;
                }}
                className="w-full bg-neutral-900 border border-neutral-800 rounded px-2.5 py-1.5 text-xs text-white focus:border-amber-400 focus:outline-none resize-none"
              />
            </div>

            {/* Licensing & Legal Notice */}
            <div className="bg-neutral-900/80 border border-neutral-800 rounded-lg p-3 space-y-2 pt-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-semibold text-white text-[11px]">
                  <Scale className="w-3.5 h-3.5 text-amber-400" />
                  <span>Licensing &amp; Open Source</span>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                  Apache-2.0 · CC0
                </span>
              </div>
              <p className="text-[10.5px] text-neutral-400 leading-relaxed">
                Rodinal Studio source code is free under Apache-2.0. Demo Nikon negative scans are dedicated to CC0 Public Domain.
              </p>
              {onOpenLicensing && (
                <button
                  onClick={onOpenLicensing}
                  className="w-full py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white text-[11px] font-mono transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Scale className="w-3 h-3 text-amber-400" />
                  <span>View Licensing &amp; Legal Attribution</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
