import React from 'react';
import { HardwareEngineState } from '../types/film';
import { X, Cpu, Zap, Shield, FileCode2, Binary, Scale, Flame } from 'lucide-react';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  hardwareState: HardwareEngineState;
  onOpenLicensing?: () => void;
}

export const InfoModal: React.FC<InfoModalProps> = ({
  isOpen,
  onClose,
  hardwareState,
  onOpenLicensing
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl max-w-xl w-full overflow-hidden shadow-2xl flex flex-col text-neutral-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-amber-400" />
            <h2 className="text-sm font-semibold text-white">Engine Architecture &amp; Hardware Diagnostics</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-xs max-h-[75vh] overflow-y-auto scrollbar-thin">
          {/* Active Pipeline Status */}
          <div className="bg-neutral-950 border border-neutral-800 rounded p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-neutral-400 uppercase tracking-wider text-[11px]">
                Active Pipeline
              </span>
              <span
                className={`font-mono text-[11px] px-2 py-0.5 rounded font-semibold ${
                  hardwareState.webgpuActive
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                }`}
              >
                {hardwareState.webgpuActive ? 'WebGPU (WGSL Hardware Shaders)' : 'WebAssembly SIMD (Linear Wasm Memory)'}
              </span>
            </div>
            <div className="text-[11px] font-mono text-neutral-400 space-y-1 pt-1">
              <div className="flex justify-between">
                <span>GPU Adapter / Core:</span>
                <span className="text-white font-semibold">{hardwareState.gpuAdapterName}</span>
              </div>
              <div className="flex justify-between">
                <span>Shader Language:</span>
                <span className="text-white">WGSL (WebGPU Shading Language)</span>
              </div>
              <div className="flex justify-between">
                <span>Debayer &amp; Transform:</span>
                <span className="text-white">WebAssembly 16-Bit Linear Bytecode</span>
              </div>
              <div className="flex justify-between">
                <span>Viewport Render Latency:</span>
                <span className="text-amber-400 font-semibold">{hardwareState.processingTimeMs} ms ({hardwareState.renderFps} FPS)</span>
              </div>
            </div>
          </div>

          {/* Optical Inversion Math */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-neutral-300 font-semibold">
              <Binary className="w-4 h-4 text-amber-400" />
              <span>Film Negative Inversion Optical Science</span>
            </div>
            <p className="text-neutral-400 leading-relaxed text-[11px]">
              Unlike digital sensors which record linear luminance, color negative film (C-41) possesses an orange acetate mask created by colored coupler dyes (principally cyan and magenta couplers) to compensate for unwanted dye spectral absorption.
            </p>
            <div className="bg-neutral-950 border border-neutral-800 rounded p-2.5 font-mono text-[10.5px] text-amber-300 space-y-1">
              <div>1. Optical Density Extraction: <span className="text-neutral-300">D = -log₁₀(I / I_base)</span></div>
              <div>2. Coupler Mask Subtraction: <span className="text-neutral-300">D_corrected = D - D_mask</span></div>
              <div>3. Positive Transmission: <span className="text-neutral-300">I_pos = 10^(-D_corrected · γ)</span></div>
            </div>
          </div>

          {/* 16-Bit TIFF Archiving */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-neutral-300 font-semibold">
              <FileCode2 className="w-4 h-4 text-amber-400" />
              <span>TIFF 6.0 16-Bit Archival Export</span>
            </div>
            <p className="text-neutral-400 leading-relaxed text-[11px]">
              Exported masters are encoded in uncompressed 48-bit RGB (16 bits per channel, 0 to 65535 discrete tonal levels per color channel), adhering to the Library of Congress and FADGI 4-star archival digitizing standards with embedded DPI tags (300/600/1200 DPI) and Nikon camera metadata.
            </p>
          </div>

          {/* Open Source Licensing & Asset Attribution */}
          <div className="bg-neutral-950 border border-neutral-800 rounded p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-semibold text-neutral-200">
                <Scale className="w-4 h-4 text-amber-400" />
                <span>Licensing &amp; CC0 Benchmark Assets</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                Apache-2.0 &amp; CC0 1.0
              </span>
            </div>
            <p className="text-neutral-400 text-[11px] leading-relaxed">
              Rodinal Studio application code is licensed under Apache 2.0. All bundled demonstration negative calibration scans are dedicated to the public domain (CC0 1.0 Universal) for personal, academic, and commercial testing.
            </p>
            {onOpenLicensing && (
              <button
                onClick={() => {
                  onClose();
                  onOpenLicensing();
                }}
                className="py-1 px-2.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white text-[10.5px] font-mono transition-colors flex items-center gap-1.5"
              >
                <Scale className="w-3 h-3 text-amber-400" />
                <span>Open Full Legal Notice &amp; Attribution</span>
              </button>
            )}
          </div>

          {/* Client-Side Guarantee */}
          <div className="p-3 rounded bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5">
            <Shield className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-neutral-300 text-[11px] leading-relaxed">
              <strong>100% Client-Side Privacy:</strong> All RAW decoding, debayering, negative inversion, color balancing, and TIFF file compilation occur entirely inside your browser's WebAssembly linear memory and WebGPU compute pipeline. Zero megabytes are uploaded to any server.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-neutral-950 border-t border-neutral-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-neutral-950 bg-amber-400 hover:bg-amber-300 rounded transition-colors"
          >
            Close Diagnostics
          </button>
        </div>
      </div>
    </div>
  );
};
