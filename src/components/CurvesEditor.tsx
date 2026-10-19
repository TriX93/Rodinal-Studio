import React, { useState, useRef } from 'react';
import { ChannelCurves, CurvePoint } from '../types/film';
import { RotateCcw } from 'lucide-react';

interface CurvesEditorProps {
  curves: ChannelCurves;
  onChange: (curves: ChannelCurves) => void;
}

export const CurvesEditor: React.FC<CurvesEditorProps> = ({ curves, onChange }) => {
  const [activeChannel, setActiveChannel] = useState<'master' | 'red' | 'green' | 'blue'>('master');
  const svgRef = useRef<SVGSVGElement>(null);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);

  const currentPoints = curves[activeChannel];

  const handleMouseDown = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setDraggingIdx(idx);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggingIdx === null || !svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / rect.height));

    const updated = [...currentPoints];
    // Keep first point at x=0, last point at x=1
    if (draggingIdx === 0) {
      updated[0] = { x: 0, y };
    } else if (draggingIdx === updated.length - 1) {
      updated[updated.length - 1] = { x: 1, y };
    } else {
      updated[draggingIdx] = { x, y };
    }

    onChange({
      ...curves,
      [activeChannel]: updated
    });
  };

  const handleMouseUp = () => {
    setDraggingIdx(null);
  };

  const resetActiveCurve = () => {
    onChange({
      ...curves,
      [activeChannel]: [{ x: 0, y: 0 }, { x: 0.5, y: 0.5 }, { x: 1, y: 1 }]
    });
  };

  // Convert points to SVG spline path (cubic Bezier smoothing)
  const pathData = () => {
    if (currentPoints.length < 2) return '';
    const w = 240;
    const h = 180;
    let d = `M ${currentPoints[0].x * w} ${(1 - currentPoints[0].y) * h}`;

    for (let i = 1; i < currentPoints.length; i++) {
      const p0 = currentPoints[i - 1];
      const p1 = currentPoints[i];
      const cx1 = (p0.x + (p1.x - p0.x) * 0.5) * w;
      const cy1 = (1 - p0.y) * h;
      const cx2 = cx1;
      const cy2 = (1 - p1.y) * h;
      d += ` C ${cx1} ${cy1}, ${cx2} ${cy2}, ${p1.x * w} ${(1 - p1.y) * h}`;
    }
    return d;
  };

  const channelColor =
    activeChannel === 'red'
      ? '#ef4444'
      : activeChannel === 'green'
      ? '#22c55e'
      : activeChannel === 'blue'
      ? '#3b82f6'
      : '#f59e0b';

  return (
    <div className="flex flex-col gap-2 select-none">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveChannel('master')}
            className={`px-2 py-0.5 rounded text-[11px] font-mono ${
              activeChannel === 'master' ? 'bg-amber-500/20 text-amber-400 font-semibold' : 'text-neutral-400 hover:text-white'
            }`}
          >
            RGB
          </button>
          <button
            onClick={() => setActiveChannel('red')}
            className={`px-2 py-0.5 rounded text-[11px] font-mono ${
              activeChannel === 'red' ? 'bg-red-500/20 text-red-400 font-semibold' : 'text-neutral-400 hover:text-red-400'
            }`}
          >
            Red
          </button>
          <button
            onClick={() => setActiveChannel('green')}
            className={`px-2 py-0.5 rounded text-[11px] font-mono ${
              activeChannel === 'green' ? 'bg-green-500/20 text-green-400 font-semibold' : 'text-neutral-400 hover:text-green-400'
            }`}
          >
            Green
          </button>
          <button
            onClick={() => setActiveChannel('blue')}
            className={`px-2 py-0.5 rounded text-[11px] font-mono ${
              activeChannel === 'blue' ? 'bg-blue-500/20 text-blue-400 font-semibold' : 'text-neutral-400 hover:text-blue-400'
            }`}
          >
            Blue
          </button>
        </div>

        <button
          onClick={resetActiveCurve}
          className="text-neutral-500 hover:text-neutral-300 p-1 rounded"
          title="Reset curve"
        >
          <RotateCcw className="w-3 h-3" />
        </button>
      </div>

      <div className="relative w-full h-[180px] bg-neutral-950 rounded border border-neutral-800 overflow-hidden">
        <svg
          ref={svgRef}
          viewBox="0 0 240 180"
          className="w-full h-full cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Diagonal reference line */}
          <line x1="0" y1="180" x2="240" y2="0" stroke="#262626" strokeDasharray="3 3" />
          
          {/* Grid lines */}
          <line x1="60" y1="0" x2="60" y2="180" stroke="#1c1c1f" />
          <line x1="120" y1="0" x2="120" y2="180" stroke="#1c1c1f" />
          <line x1="180" y1="0" x2="180" y2="180" stroke="#1c1c1f" />
          <line x1="0" y1="45" x2="240" y2="45" stroke="#1c1c1f" />
          <line x1="0" y1="90" x2="240" y2="90" stroke="#1c1c1f" />
          <line x1="0" y1="135" x2="240" y2="135" stroke="#1c1c1f" />

          {/* Spline curve */}
          <path d={pathData()} fill="none" stroke={channelColor} strokeWidth="2" />

          {/* Draggable control points */}
          {currentPoints.map((pt, i) => (
            <circle
              key={i}
              cx={pt.x * 240}
              cy={(1 - pt.y) * 180}
              r={i === draggingIdx ? 6 : 4.5}
              fill={channelColor}
              stroke="#0a0a0c"
              strokeWidth="1.5"
              className="cursor-pointer hover:scale-125 transition-transform"
              onMouseDown={(e) => handleMouseDown(i, e)}
            />
          ))}
        </svg>
      </div>
    </div>
  );
};
