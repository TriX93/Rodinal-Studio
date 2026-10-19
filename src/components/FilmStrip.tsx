import React, { useRef } from 'react';
import { FilmScanItem } from '../types/film';
import { Plus, Camera, FileCheck, Scale } from 'lucide-react';

interface FilmStripProps {
  items: FilmScanItem[];
  selectedId: string;
  onSelect: (id: string) => void;
  onFileUpload: (files: FileList) => void;
  onOpenLicensing?: () => void;
}

export const FilmStrip: React.FC<FilmStripProps> = ({
  items,
  selectedId,
  onSelect,
  onFileUpload,
  onOpenLicensing
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileUpload(e.target.files);
      e.target.value = '';
    }
  };

  return (
    <div className="bg-neutral-950 border-t border-neutral-850 px-4 py-2.5 flex items-center gap-4 overflow-x-auto select-none scrollbar-thin">
      <div className="flex items-center gap-2 shrink-0 pr-2 border-r border-neutral-850">
        <input
          ref={fileInputRef}
          type="file"
          accept=".nef,.nrw,.dng,.cr2,.arw,.tif,.tiff,.jpg,.jpeg,.png"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex flex-col items-center justify-center w-24 h-20 rounded border border-dashed border-neutral-700 hover:border-amber-500/80 bg-neutral-900/60 hover:bg-neutral-900 text-neutral-400 hover:text-amber-400 transition-colors group cursor-pointer"
          title="Import Nikon RAW (.NEF) or high-res scan files"
        >
          <Plus className="w-5 h-5 mb-1 text-neutral-500 group-hover:text-amber-400 transition-colors" />
          <span className="text-[10px] font-medium tracking-tight">Import RAW</span>
          <span className="text-[9px] text-neutral-600 group-hover:text-neutral-400 font-mono">.NEF / .DNG</span>
        </button>
      </div>

      {/* 35mm Film Negative Frame Strip */}
      <div className="flex items-center gap-3">
        {items.map((item, idx) => {
          const isSelected = item.id === selectedId;
          return (
            <div
              key={item.id}
              onClick={() => onSelect(item.id)}
              className={`relative flex flex-col shrink-0 cursor-pointer rounded transition-all duration-150 ${
                isSelected
                  ? 'ring-2 ring-amber-500/90 shadow-lg shadow-amber-500/10'
                  : 'opacity-70 hover:opacity-100 ring-1 ring-neutral-800'
              }`}
            >
              {/* 35mm Sprocket Hole Bar Top */}
              <div className="h-2.5 bg-neutral-900/90 rounded-t flex items-center justify-between px-1.5 border-b border-neutral-800">
                <div className="w-2 h-1 bg-black rounded-xs" />
                <span className="text-[8px] font-mono text-neutral-500 tracking-wider">
                  {item.metadata.filmStock.split(' ')[0]} {item.metadata.frameNumber}
                </span>
                <div className="w-2 h-1 bg-black rounded-xs" />
              </div>

              {/* Negative Thumbnail Viewport */}
              <div className="relative w-32 h-20 bg-neutral-900 overflow-hidden flex items-center justify-center">
                <img
                  src={item.thumbnailUrl}
                  alt={item.filename}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />

                {/* Film Type Tag */}
                <div className="absolute bottom-1 left-1.5 bg-black/75 backdrop-blur-xs px-1 py-0.2 rounded text-[8px] font-mono text-neutral-300">
                  {item.rawType} · {item.bitsPerSample}b
                </div>

                {isSelected && (
                  <div className="absolute top-1 right-1 bg-amber-500 text-neutral-950 p-0.5 rounded-full shadow">
                    <FileCheck className="w-2.5 h-2.5" />
                  </div>
                )}
              </div>

              {/* 35mm Sprocket Hole Bar Bottom */}
              <div className="h-2.5 bg-neutral-900/90 rounded-b flex items-center justify-between px-1.5 border-t border-neutral-800">
                <div className="w-2 h-1 bg-black rounded-xs" />
                <span className="text-[7.5px] font-mono text-amber-500/80">
                  {item.metadata.cameraModel.replace('NIKON ', '')}
                </span>
                <div className="w-2 h-1 bg-black rounded-xs" />
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-2 text-[11px] text-neutral-500 font-mono shrink-0 pl-2">
        <span>{items.length} RAW frames</span>
        <span>·</span>
        {onOpenLicensing && (
          <button
            onClick={onOpenLicensing}
            className="text-neutral-500 hover:text-amber-400 transition-colors flex items-center gap-1 cursor-pointer"
            title="View Demo Scans CC0 License and Attribution"
          >
            <Scale className="w-3 h-3 text-amber-400" />
            <span>CC0 Test Assets</span>
          </button>
        )}
      </div>
    </div>
  );
};
