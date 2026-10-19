import React, { useEffect, useRef, useState } from 'react';

interface HistogramPanelProps {
  histogramData: {
    r: Uint32Array;
    g: Uint32Array;
    b: Uint32Array;
    luma: Uint32Array;
    maxCount: number;
  } | null;
}

export const HistogramPanel: React.FC<HistogramPanelProps> = ({ histogramData }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scaleMode, setScaleMode] = useState<'log' | 'linear'>('log');
  const [activeChannel, setActiveChannel] = useState<'rgb' | 'r' | 'g' | 'b' | 'luma'>('rgb');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !histogramData) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear background
    ctx.fillStyle = '#121217';
    ctx.fillRect(0, 0, width, height);

    // Subtle grid lines (25%, 50%, 75% luminance)
    ctx.strokeStyle = '#1e1e28';
    ctx.lineWidth = 1;
    [0.25, 0.5, 0.75].forEach(ratio => {
      const x = Math.round(width * ratio);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    });

    const maxVal = Math.max(1, histogramData.maxCount);
    const logMax = Math.log10(maxVal + 1);

    const getY = (val: number) => {
      if (val === 0) return height;
      if (scaleMode === 'log') {
        const norm = Math.log10(val + 1) / logMax;
        return height - norm * (height - 4);
      } else {
        const norm = val / maxVal;
        return height - norm * (height - 4);
      }
    };

    const drawChannel = (data: Uint32Array, color: string, fillStyle?: string) => {
      ctx.beginPath();
      ctx.moveTo(0, height);

      for (let i = 0; i < 256; i++) {
        const x = (i / 255) * width;
        const y = getY(data[i]);
        ctx.lineTo(x, y);
      }

      ctx.lineTo(width, height);
      ctx.closePath();

      if (fillStyle) {
        ctx.fillStyle = fillStyle;
        ctx.fill();
      }

      ctx.strokeStyle = color;
      ctx.lineWidth = 1.2;
      ctx.stroke();
    };

    ctx.globalCompositeOperation = 'screen';

    if (activeChannel === 'rgb' || activeChannel === 'r') {
      drawChannel(histogramData.r, '#ef4444', 'rgba(239, 68, 68, 0.15)');
    }
    if (activeChannel === 'rgb' || activeChannel === 'g') {
      drawChannel(histogramData.g, '#22c55e', 'rgba(34, 197, 94, 0.15)');
    }
    if (activeChannel === 'rgb' || activeChannel === 'b') {
      drawChannel(histogramData.b, '#3b82f6', 'rgba(59, 130, 246, 0.15)');
    }
    if (activeChannel === 'luma') {
      drawChannel(histogramData.luma, '#e2e8f0', 'rgba(226, 232, 240, 0.2)');
    }

    ctx.globalCompositeOperation = 'source-over';
  }, [histogramData, scaleMode, activeChannel]);

  return (
    <div className="bg-neutral-900/90 border border-neutral-800 rounded p-2.5 flex flex-col gap-2 select-none">
      <div className="flex items-center justify-between text-xs">
        <span className="font-mono text-[11px] text-neutral-400 font-semibold tracking-wider">
          HISTOGRAM
        </span>
        <div className="flex items-center gap-1 bg-neutral-950 p-0.5 rounded text-[10px]">
          <button
            onClick={() => setScaleMode('log')}
            className={`px-1.5 py-0.5 rounded transition-colors font-mono ${
              scaleMode === 'log' ? 'bg-neutral-800 text-amber-400 font-semibold' : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            LOG
          </button>
          <button
            onClick={() => setScaleMode('linear')}
            className={`px-1.5 py-0.5 rounded transition-colors font-mono ${
              scaleMode === 'linear' ? 'bg-neutral-800 text-amber-400 font-semibold' : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            LIN
          </button>
        </div>
      </div>

      <div className="relative w-full h-24 bg-neutral-950 rounded overflow-hidden border border-neutral-800/80">
        <canvas
          ref={canvasRef}
          width={280}
          height={96}
          className="w-full h-full block"
        />
        {/* Left and Right clipping indicator notches */}
        <div className="absolute bottom-0 left-0 text-[8px] font-mono px-1 bg-black/60 text-blue-400">
          0 SHADOWS
        </div>
        <div className="absolute bottom-0 right-0 text-[8px] font-mono px-1 bg-black/60 text-red-400">
          255 HIGHLIGHTS
        </div>
      </div>

      {/* Channel Selector */}
      <div className="flex items-center justify-between text-[10px] font-mono">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveChannel('rgb')}
            className={`px-1.5 py-0.5 rounded ${
              activeChannel === 'rgb' ? 'bg-neutral-800 text-white font-bold' : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            RGB
          </button>
          <button
            onClick={() => setActiveChannel('r')}
            className={`px-1.5 py-0.5 rounded ${
              activeChannel === 'r' ? 'bg-red-500/20 text-red-400 font-bold' : 'text-neutral-500 hover:text-red-400'
            }`}
          >
            R
          </button>
          <button
            onClick={() => setActiveChannel('g')}
            className={`px-1.5 py-0.5 rounded ${
              activeChannel === 'g' ? 'bg-green-500/20 text-green-400 font-bold' : 'text-neutral-500 hover:text-green-400'
            }`}
          >
            G
          </button>
          <button
            onClick={() => setActiveChannel('b')}
            className={`px-1.5 py-0.5 rounded ${
              activeChannel === 'b' ? 'bg-blue-500/20 text-blue-400 font-bold' : 'text-neutral-500 hover:text-blue-400'
            }`}
          >
            B
          </button>
          <button
            onClick={() => setActiveChannel('luma')}
            className={`px-1.5 py-0.5 rounded ${
              activeChannel === 'luma' ? 'bg-neutral-800 text-neutral-200 font-bold' : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            LUMA
          </button>
        </div>
        <span className="text-[10px] text-neutral-500">14-Bit Quantized</span>
      </div>
    </div>
  );
};
