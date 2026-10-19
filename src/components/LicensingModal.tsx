import React, { useState } from 'react';
import { X, Scale, Copy, Check, ShieldCheck, FileText, Heart } from 'lucide-react';

interface LicensingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LicensingModal: React.FC<LicensingModalProps> = ({ isOpen, onClose }) => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, sectionId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionId);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const apacheLicenseSnippet = `Copyright 2026 Rodinal Studio Contributors

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.`;

  const cc0Snippet = `Creative Commons Legal Code - CC0 1.0 Universal (Public Domain Dedication)
The demo negative scan assets included in Rodinal Studio (Kodak Portra 400,
Kodak Tri-X 400, Fujifilm Superia X-TRA 400, and CineStill 800T) are dedicated
to the public domain worldwide. You can copy, modify, distribute, and perform
the work, even for commercial purposes, all without asking permission.`;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl max-w-2xl w-full overflow-hidden shadow-2xl flex flex-col text-neutral-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
          <div className="flex items-center gap-2.5">
            <Scale className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-sm font-semibold text-white">Licensing, Assets &amp; Legal Notice</h2>
              <p className="text-[11px] text-neutral-400 font-mono">
                Open Source · Public Domain Benchmarks · Free for Commercial &amp; Personal Use
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
          {/* 1. App Code License */}
          <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-400" />
                <span className="font-semibold text-white text-xs">Application Software License</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-[10.5px]">
                Apache-2.0
              </span>
            </div>
            <p className="text-neutral-400 text-[11px] leading-relaxed">
              Rodinal Studio is open-source software distributed under the Apache License 2.0. You are free to inspect, modify, fork, and build upon the source code.
            </p>
            <div className="relative bg-neutral-900/90 rounded border border-neutral-800/80 p-3 font-mono text-[10px] text-neutral-300">
              <pre className="whitespace-pre-wrap leading-relaxed">{apacheLicenseSnippet}</pre>
              <button
                onClick={() => handleCopy(apacheLicenseSnippet, 'apache')}
                className="absolute top-2 right-2 px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white flex items-center gap-1 text-[10px] transition-colors"
              >
                {copiedSection === 'apache' ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy Text</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 2. Demo Negative Scans Licensing */}
          <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-emerald-400" />
                <span className="font-semibold text-white text-xs">Demo Negative Scans &amp; Test Assets</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-[10.5px]">
                CC0 1.0 Universal (Public Domain)
              </span>
            </div>
            <p className="text-neutral-400 text-[11px] leading-relaxed">
              All 4 demo negative scans (<span className="text-neutral-200">Portra 400</span>, <span className="text-neutral-200">Tri-X 400</span>, <span className="text-neutral-200">Superia 400</span>, and <span className="text-neutral-200">CineStill 800T</span>) were custom-crafted for Rodinal Studio as synthetic archival calibration test frames.
            </p>
            <div className="relative bg-neutral-900/90 rounded border border-neutral-800/80 p-3 font-mono text-[10px] text-neutral-300">
              <pre className="whitespace-pre-wrap leading-relaxed">{cc0Snippet}</pre>
              <button
                onClick={() => handleCopy(cc0Snippet, 'cc0')}
                className="absolute top-2 right-2 px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white flex items-center gap-1 text-[10px] transition-colors"
              >
                {copiedSection === 'cc0' ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy Text</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 3. Trademark Disclaimer */}
          <div className="p-3.5 rounded bg-neutral-950 border border-neutral-800/90 space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-white text-[11.5px]">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>Nominative Trademark Notice</span>
            </div>
            <p className="text-neutral-400 text-[10.5px] leading-relaxed">
              Product and company names (including <em>Nikon</em>, <em>Kodak</em>, <em>Fujifilm</em>, <em>CineStill</em>, <em>Ilford</em>, <em>Durst</em>, <em>Agfa</em>, and <em>Rodinal</em>) are trademarks or registered trademarks of their respective holders. Use of them does not imply any affiliation with or endorsement by them. They are used exclusively for nominative technical identification and analog film simulation compatibility.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-neutral-950 border-t border-neutral-800 flex justify-between items-center">
          <span className="text-[11px] font-mono text-neutral-500">SPDX-License-Identifier: Apache-2.0</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-neutral-950 bg-amber-400 hover:bg-amber-300 rounded transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
