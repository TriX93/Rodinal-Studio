import React from 'react';
import { X, Monitor, Terminal, Laptop, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { getElectronAPI } from '../types/film';


interface DesktopModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DesktopModal: React.FC<DesktopModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const electronApi = getElectronAPI();
  const isDesktop = Boolean(electronApi?.isDesktop);
  const platform = electronApi?.platform;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl max-w-xl w-full overflow-hidden shadow-2xl flex flex-col text-neutral-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
          <div className="flex items-center gap-2.5">
            <Monitor className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-sm font-semibold text-white">Desktop Application Suite</h2>
              <p className="text-[11px] text-neutral-400 font-mono">
                Windows · macOS · Linux (Electron Desktop Engine)
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

        {/* Content */}
        <div className="p-6 space-y-5 text-xs max-h-[75vh] overflow-y-auto scrollbar-thin">
          {/* Active status */}
          <div className="bg-neutral-950 border border-neutral-800 rounded p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Laptop className="w-6 h-6 text-amber-400" />
              <div>
                <div className="font-semibold text-white text-[12px]">
                  {isDesktop ? `Running Native Desktop App (${platform?.toUpperCase()})` : 'Desktop Engine Configured'}
                </div>
                <div className="text-neutral-400 text-[11px]">
                  Cross-platform desktop runner configured in package.json
                </div>
              </div>
            </div>
            <div className="px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-[10.5px]">
              Ready to Run
            </div>
          </div>

          {/* Quick Start Commands */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 font-semibold text-white">
              <Terminal className="w-4 h-4 text-amber-400" />
              <span>How to Launch as Desktop App</span>
            </div>
            <p className="text-neutral-400 leading-relaxed text-[11px]">
              You can run Rodinal Studio natively on your machine with access to native file dialogs and WebGPU acceleration:
            </p>
            <div className="bg-neutral-950 border border-neutral-800 rounded p-3 font-mono text-[11px] text-amber-300 space-y-2">
              <div className="text-neutral-500 text-[10px]"># 1. Launch native desktop window (with hot-reload)</div>
              <div className="text-white select-all">npm run desktop</div>

              <div className="text-neutral-500 text-[10px] pt-1"># 2. Build standalone desktop binary (.exe / .dmg / .AppImage)</div>
              <div className="text-white select-all">npm run desktop:dist</div>
            </div>
          </div>

          {/* Platform Specifics */}
          <div className="grid grid-cols-3 gap-2.5 pt-1">
            <div className="bg-neutral-950 border border-neutral-800 p-3 rounded space-y-1">
              <div className="font-semibold text-white text-[11.5px]">Windows</div>
              <div className="text-neutral-400 text-[10px] leading-snug">
                Windows 10 / 11 (x64 / ARM64). Native file explorer picker &amp; high-DPI scaling.
              </div>
            </div>

            <div className="bg-neutral-950 border border-neutral-800 p-3 rounded space-y-1">
              <div className="font-semibold text-white text-[11.5px]">macOS</div>
              <div className="text-neutral-400 text-[10px] leading-snug">
                Apple Silicon (M1–M4) &amp; Intel. Integrated Cmd+O/Cmd+E menu shortcuts.
              </div>
            </div>

            <div className="bg-neutral-950 border border-neutral-800 p-3 rounded space-y-1">
              <div className="font-semibold text-white text-[11.5px]">Linux</div>
              <div className="text-neutral-400 text-[10px] leading-snug">
                Ubuntu, Fedora, Arch, Debian. AppImage and standard desktop package support.
              </div>
            </div>
          </div>

          {/* Privacy & Performance notice */}
          <div className="p-3 rounded bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-neutral-300 text-[11px] leading-relaxed">
              <strong>Native GPU &amp; Local Disk Speed:</strong> Running as a desktop application unlocks direct disk I/O, removing browser sandbox upload size thresholds for multi-gigabyte film roll batches.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-neutral-950 border-t border-neutral-800 flex justify-between items-center">
          <span className="text-[10px] font-mono text-neutral-500">Electron 44.9+ · Chromium GPU Flags Active</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-neutral-950 bg-amber-400 hover:bg-amber-300 rounded transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
