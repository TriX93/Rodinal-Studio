import React from 'react';
import { Download, Cpu, Sparkles, Layers, Info } from 'lucide-react';
import { HardwareEngineState } from '../types/film';

interface HeaderProps {
  hardwareState: HardwareEngineState;
  onOpenExport: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenInfo: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  hardwareState,
  onOpenExport,
  activeTab,
  setActiveTab,
  onOpenInfo
}) => {
  return (
    <header className="flex items-center justify-between gap-8 px-6 py-3.5 bg-neutral-950 border-b border-neutral-800/80 text-neutral-100 select-none z-30">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-7 h-7 rounded bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400 font-bold text-[11px] font-mono tracking-wider">
          R-09
        </div>
        <span className="text-base font-semibold tracking-tight text-white whitespace-nowrap">
          Rodinal Studio
        </span>
      </div>

      {/* Zone 2: 4-5 concise single-line text navigation links */}
      <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-neutral-400">
        <button
          onClick={() => setActiveTab('inversion')}
          className={`hover:text-white transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
            activeTab === 'inversion' ? 'text-amber-400 font-semibold' : ''
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Inversion Lab</span>
        </button>

        <button
          onClick={() => setActiveTab('curves')}
          className={`hover:text-white transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
            activeTab === 'curves' ? 'text-amber-400 font-semibold' : ''
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>RGB Tone Curves</span>
        </button>

        <button
          onClick={() => setActiveTab('presets')}
          className={`hover:text-white transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
            activeTab === 'presets' ? 'text-amber-400 font-semibold' : ''
          }`}
        >
          <span>Film Stocks</span>
        </button>

        <button
          onClick={() => setActiveTab('metadata')}
          className={`hover:text-white transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
            activeTab === 'metadata' ? 'text-amber-400 font-semibold' : ''
          }`}
        >
          <span>Nikon EXIF &amp; Archival</span>
        </button>

        <button
          onClick={onOpenInfo}
          className="hover:text-white transition-colors whitespace-nowrap shrink-0 flex items-center gap-1 text-neutral-500 hover:text-neutral-300"
          title="Pipeline Architecture & Specs"
        >
          <Info className="w-3.5 h-3.5" />
          <span>Engine Specs</span>
        </button>
      </nav>

      {/* Zone 3: Hardware engine badge & 1 primary action button */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Hardware Status indicator */}
        <div
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded bg-neutral-900 border border-neutral-800 text-[11px] text-neutral-300"
          title={`Compute Engine: ${hardwareState.webgpuActive ? 'Hardware WebGPU WGSL Pipeline' : 'WebAssembly SIMD Engine'}`}
        >
          <Cpu className={`w-3 h-3 ${hardwareState.webgpuActive ? 'text-emerald-400' : 'text-amber-400'}`} />
          <span className="font-mono">
            {hardwareState.webgpuActive ? 'WebGPU WGSL' : 'Wasm SIMD'}
          </span>
          <span className="text-neutral-600">·</span>
          <span className="font-mono text-neutral-400">{hardwareState.renderFps} FPS</span>
        </div>

        {/* Primary Action Button */}
        <button
          onClick={onOpenExport}
          className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-neutral-950 bg-amber-400 hover:bg-amber-300 rounded shadow-sm hover:shadow transition-colors whitespace-nowrap shrink-0 active:scale-95"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export 16-Bit TIFF</span>
        </button>
      </div>
    </header>
  );
};
