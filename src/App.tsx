/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { FilmScanItem, HardwareEngineState, InversionSettings } from './types/film';
import { NefParser } from './engine/raw/nefParser';
import { Header } from './components/Header';
import { Viewport } from './components/Viewport';
import { FilmStrip } from './components/FilmStrip';
import { SidebarControls } from './components/SidebarControls';
import { HistogramPanel } from './components/HistogramPanel';
import { ExportModal } from './components/ExportModal';
import { InfoModal } from './components/InfoModal';
import { DesktopModal } from './components/DesktopModal';

export default function App() {
  const [filmScans, setFilmScans] = useState<FilmScanItem[]>(() => NefParser.getDefaultRoll());
  const [selectedScanId, setSelectedScanId] = useState<string>(() => filmScans[0]?.id || '');
  const [activeTab, setActiveTab] = useState<string>('inversion');
  const [isEyedropperActive, setIsEyedropperActive] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState<boolean>(false);
  const [isDesktopModalOpen, setIsDesktopModalOpen] = useState<boolean>(false);

  // Hardware Engine State
  const [hardwareState, setHardwareState] = useState<HardwareEngineState>({
    webgpuSupported: false,
    webgpuActive: false,
    gpuAdapterName: 'Initializing compute engine...',
    wasmSupported: true,
    wasmActive: true,
    executionMode: 'wasm-simd',
    renderFps: 60,
    processingTimeMs: 12
  });

  // Histogram data for active frame
  const [histogramData, setHistogramData] = useState<{
    r: Uint32Array;
    g: Uint32Array;
    b: Uint32Array;
    luma: Uint32Array;
    maxCount: number;
  } | null>(null);

  const [isIngestingRaw, setIsIngestingRaw] = useState<boolean>(false);
  const [ingestionMessage, setIngestionMessage] = useState<string>('');
  const [isDraggingFile, setIsDraggingFile] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Active scan item
  const activeScan = filmScans.find((s) => s.id === selectedScanId) || filmScans[0];

  // Update settings for current scan
  const handleUpdateSettings = useCallback((newSettings: Partial<InversionSettings>) => {
    setFilmScans((prevScans) =>
      prevScans.map((scan) => {
        if (scan.id === selectedScanId) {
          return {
            ...scan,
            settings: {
              ...scan.settings,
              ...newSettings
            }
          };
        }
        return scan;
      })
    );
  }, [selectedScanId]);

  // Handle uploaded Nikon RAW / scan files
  const handleFileUpload = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    setIsIngestingRaw(true);
    setIngestionMessage(`Decoding ${files[0].name} in WebAssembly memory...`);

    try {
      const newItems: FilmScanItem[] = [];
      for (let i = 0; i < files.length; i++) {
        setIngestionMessage(`Extracting RAW stream (${i + 1}/${files.length}): ${files[i].name}...`);
        const item = await NefParser.parseRawFile(files[i]);
        newItems.push(item);
      }

      setFilmScans((prev) => [...newItems, ...prev]);
      if (newItems.length > 0) {
        setSelectedScanId(newItems[0].id);
        setToastMessage(`Imported ${newItems[0].filename} (${(newItems[0].fileSize / (1024 * 1024)).toFixed(1)} MB · ${newItems[0].metadata.cameraModel})`);
        setTimeout(() => setToastMessage(null), 4500);
      }
    } catch (err) {
      alert(`Could not parse RAW exposure: ${(err as Error).message}`);
    } finally {
      setIsIngestingRaw(false);
      setIngestionMessage('');
    }
  };

  // Drag and Drop Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'e' || e.key === 'E') {
        setIsEyedropperActive((prev) => !prev);
      } else if (e.key === 's' || e.key === 'S') {
        handleUpdateSettings({ splitCompare: !activeScan.settings.splitCompare });
      } else if (e.key === 'c' || e.key === 'C') {
        handleUpdateSettings({ showClipping: !activeScan.settings.showClipping });
      } else if (e.key === 'h' || e.key === 'H') {
        handleUpdateSettings({ flipHorizontal: !activeScan.settings.flipHorizontal });
      } else if (e.key === 'v' || e.key === 'V') {
        handleUpdateSettings({ flipVertical: !activeScan.settings.flipVertical });
      } else if (e.key === 'r' || e.key === 'R') {
        handleUpdateSettings({ rotation: (activeScan.settings.rotation + 90) % 360 });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeScan?.settings, handleUpdateSettings]);

  if (!activeScan) return null;

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="flex flex-col h-screen w-screen bg-[#08080a] text-neutral-100 overflow-hidden font-sans select-none relative"
    >
      {/* Drag & Drop Overlay */}
      {isDraggingFile && (
        <div className="absolute inset-0 z-50 bg-amber-500/20 backdrop-blur-md border-4 border-dashed border-amber-400 flex flex-col items-center justify-center pointer-events-none">
          <div className="bg-neutral-950/90 border border-neutral-800 p-6 rounded-2xl flex flex-col items-center gap-3 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-amber-400/20 flex items-center justify-center text-amber-400 text-xl font-bold font-mono">
              RAW
            </div>
            <div className="text-sm font-semibold text-white">Drop Nikon RAW (.NEF / .NRW / .DNG) to Ingest</div>
            <div className="text-xs text-neutral-400 font-mono">100% Client-Side In-Memory Decoding</div>
          </div>
        </div>
      )}

      {/* RAW Ingestion Progress Spinner Overlay */}
      {isIngestingRaw && (
        <div className="absolute inset-0 z-50 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center">
          <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-xl flex flex-col items-center gap-4 shadow-2xl max-w-sm w-full mx-4">
            <div className="w-10 h-10 border-3 border-amber-400 border-t-transparent rounded-full animate-spin" />
            <div className="text-center">
              <h3 className="text-sm font-semibold text-white">Rodinal Studio RAW Decoder</h3>
              <p className="text-xs text-neutral-400 font-mono mt-1">{ingestionMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-40 bg-neutral-900/95 backdrop-blur-md border border-amber-500/40 px-4 py-2 rounded-lg shadow-2xl text-xs text-neutral-200 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="font-mono">{toastMessage}</span>
        </div>
      )}
      {/* 3-Zone Top Bar Navigation */}
      <Header
        hardwareState={hardwareState}
        onOpenExport={() => setIsExportModalOpen(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenInfo={() => setIsInfoModalOpen(true)}
        onOpenDesktop={() => setIsDesktopModalOpen(true)}
      />

      {/* Main Workspace */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Central Viewport */}
        <Viewport
          scan={activeScan}
          settings={activeScan.settings}
          onUpdateSettings={handleUpdateSettings}
          hardwareState={hardwareState}
          setHardwareState={setHardwareState}
          isEyedropperActive={isEyedropperActive}
          setIsEyedropperActive={setIsEyedropperActive}
          onHistogramUpdate={setHistogramData}
        />

        {/* Right Sidebar: Real-time Histogram + Tabbed Lab Controls */}
        <div className="w-84 flex flex-col bg-neutral-950 border-l border-neutral-850 shrink-0 h-full">
          {/* Histogram widget on top */}
          <div className="p-3 border-b border-neutral-850 bg-neutral-950/90">
            <HistogramPanel histogramData={histogramData} />
          </div>

          {/* Tabbed Inversion & Color Controls */}
          <div className="flex-1 overflow-hidden">
            <SidebarControls
              scan={activeScan}
              settings={activeScan.settings}
              onUpdateSettings={handleUpdateSettings}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              isEyedropperActive={isEyedropperActive}
              setIsEyedropperActive={setIsEyedropperActive}
            />
          </div>
        </div>
      </div>

      {/* Bottom Film Strip (35mm Negative Roll) */}
      <FilmStrip
        items={filmScans}
        selectedId={selectedScanId}
        onSelect={setSelectedScanId}
        onFileUpload={handleFileUpload}
      />

      {/* 16-Bit Archival Export Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        activeScan={activeScan}
        allScans={filmScans}
      />

      {/* Architecture & Hardware Diagnostics Modal */}
      <InfoModal
        isOpen={isInfoModalOpen}
        onClose={() => setIsInfoModalOpen(false)}
        hardwareState={hardwareState}
      />

      {/* Cross-Platform Desktop App Modal (Windows / macOS / Linux) */}
      <DesktopModal
        isOpen={isDesktopModalOpen}
        onClose={() => setIsDesktopModalOpen(false)}
      />
    </div>
  );
}
