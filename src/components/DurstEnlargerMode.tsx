import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FilmScanItem } from '../types/film';
import { 
  Zap, 
  RotateCcw, 
  Sparkles, 
  Eye, 
  Flame, 
  Timer, 
  Sliders, 
  Check, 
  Download, 
  Sun, 
  Moon,
  Layers,
  ChevronRight,
  Play,
  RotateCw,
  Volume2,
  VolumeX,
  Waves,
  ZoomIn,
  AlertTriangle,
  FileCheck
} from 'lucide-react';
import { TiffWriter } from '../engine/export/tiffWriter';

interface DurstEnlargerModeProps {
  scan: FilmScanItem;
  onExit: () => void;
}

type SafelightMode = 'red' | 'amber' | 'white';
type MultigradeGrade = '00' | '1' | '2' | '3' | '4' | '5' | 'custom';
type DevelopingStage = 'unexposed' | 'exposed' | 'developing' | 'stopped' | 'fixed' | 'finished';
type PaperType = 'ilford-fb-warmtone' | 'ilford-rc-glossy' | 'agfa-brovira' | 'kodak-ektacolor';

interface DodgeBurnZone {
  x: number; // 0..1
  y: number; // 0..1
  radius: number; // 0.05..0.4
  type: 'dodge' | 'burn';
}

export const DurstEnlargerMode: React.FC<DurstEnlargerModeProps> = ({ scan, onExit }) => {
  // Durst Enlarger Head Settings (CLS 501 Dichroic Head)
  const [yellowFilter, setYellowFilter] = useState<number>(0); // 0 - 130 (lowers contrast / yellow)
  const [magentaFilter, setMagentaFilter] = useState<number>(0); // 0 - 130 (boosts contrast / magenta)
  const [cyanFilter, setCyanFilter] = useState<number>(0); // 0 - 130 (density / color balance)
  const [selectedGrade, setSelectedGrade] = useState<MultigradeGrade>('2');
  
  // Optical adjustments
  const [aperture, setAperture] = useState<number>(8); // f/2.8, 4, 5.6, 8, 11, 16
  const [columnHeight, setColumnHeight] = useState<number>(10); // 8x10, 11x14, 16x20 inches
  const [redSafetyFilterSwungIn, setRedSafetyFilterSwungIn] = useState<boolean>(false);
  const [testStripMode, setTestStripMode] = useState<boolean>(false);
  const [paperType, setPaperType] = useState<PaperType>('ilford-fb-warmtone');
  const [isColorMode, setIsColorMode] = useState<boolean>(scan.settings.filmType === 'color-negative');

  // Interactive Grain Focus Finder (Paterson / Peak Grain Magnifier)
  const [showGrainScope, setShowGrainScope] = useState<boolean>(false);
  const [grainScopePos, setGrainScopePos] = useState<{ x: number; y: number }>({ x: 0.5, y: 0.5 });

  // Dodging & Burning simulation
  const [activeTool, setActiveTool] = useState<'none' | 'dodge' | 'burn'>('none');
  const [dodgeBurnZones, setDodgeBurnZones] = useState<DodgeBurnZone[]>([]);

  // Safelight & Darkroom environment
  const [safelight, setSafelight] = useState<SafelightMode>('red');
  const [isPaperFogged, setIsPaperFogged] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  
  // Timer & Exposure state
  const [timerDuration, setTimerDuration] = useState<number>(6.5); // seconds
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isLampOn, setIsLampOn] = useState<boolean>(false);
  const [exposureHistorySeconds, setExposureHistorySeconds] = useState<number>(0);

  // Developing Tray Simulation (Wet Bench)
  const [devStage, setDevStage] = useState<DevelopingStage>('unexposed');
  const [devTimeSeconds, setDevTimeSeconds] = useState<number>(0);
  const [isAgitating, setIsAgitating] = useState<boolean>(false);
  const [agitationRipples, setAgitationRipples] = useState<number>(0);

  // Export State
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const paperCanvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Darkroom sound synthesis with Web Audio API
  const playSound = useCallback((type: 'beep' | 'tick' | 'relay-on' | 'relay-off' | 'slosh' | 'fog-alarm') => {
    if (!soundEnabled) return;
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      if (type === 'tick') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1400, ctx.currentTime);
        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.03);
      } else if (type === 'beep') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.09, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.12);
      } else if (type === 'relay-on') {
        // Enlarger solenoid click
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(120, ctx.currentTime);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
      } else if (type === 'relay-off') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.06);
      } else if (type === 'slosh') {
        // Filtered white noise burst for tray rocking
        const bufferSize = ctx.sampleRate * 0.25;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          output[i] = (Math.random() * 2 - 1) * 0.5;
        }
        const whiteNoise = ctx.createBufferSource();
        whiteNoise.buffer = buffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(450, ctx.currentTime);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        whiteNoise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        whiteNoise.start();
      } else if (type === 'fog-alarm') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(350, ctx.currentTime);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      }
    } catch {
      // Audio optional
    }
  }, [soundEnabled]);

  // Handle Safelight change & accidental paper fogging under white light
  useEffect(() => {
    if (safelight === 'white' && devStage !== 'fixed' && devStage !== 'finished') {
      // If paper is out of black box under white room light before fixing, it fogs!
      setIsPaperFogged(true);
      playSound('fog-alarm');
    }
  }, [safelight, devStage, playSound]);

  // Durst Dichroic mixing head filters for Multigrade paper
  const applyMultigradeGrade = (grade: MultigradeGrade) => {
    setSelectedGrade(grade);
    switch (grade) {
      case '00': // Extra Soft
        setYellowFilter(115);
        setMagentaFilter(0);
        break;
      case '1': // Soft
        setYellowFilter(60);
        setMagentaFilter(0);
        break;
      case '2': // Normal
        setYellowFilter(0);
        setMagentaFilter(0);
        break;
      case '3': // Special Contrast
        setYellowFilter(0);
        setMagentaFilter(45);
        break;
      case '4': // Hard
        setYellowFilter(0);
        setMagentaFilter(85);
        break;
      case '5': // Ultra High Contrast
        setYellowFilter(0);
        setMagentaFilter(130);
        break;
      default:
        break;
    }
  };

  // Trigger exposure via electronic darkroom timer
  const triggerExposure = () => {
    if (isLampOn) return;
    setIsLampOn(true);
    setTimeRemaining(timerDuration);
    playSound('relay-on');

    const interval = 100; // 100ms ticks
    let elapsed = 0;
    const totalMs = timerDuration * 1000;

    const timerInterval = setInterval(() => {
      elapsed += interval;
      const left = Math.max(0, (totalMs - elapsed) / 1000);
      setTimeRemaining(Number(left.toFixed(1)));

      if (Math.floor(elapsed / 1000) !== Math.floor((elapsed - interval) / 1000)) {
        playSound('tick');
      }

      if (elapsed >= totalMs) {
        clearInterval(timerInterval);
        setIsLampOn(false);
        playSound('relay-off');
        playSound('beep');
        
        // If red filter was NOT swung in, the paper received photographic actinic light!
        if (!redSafetyFilterSwungIn) {
          const effectiveLightFactor = Math.pow(8 / aperture, 2) * Math.pow(10 / columnHeight, 1.5);
          const addedExp = timerDuration * effectiveLightFactor;
          setExposureHistorySeconds(prev => prev + addedExp);
          setDevStage('exposed');
        }
      }
    }, interval);
  };

  // Chemical tray development timer loop
  useEffect(() => {
    let devInterval: NodeJS.Timeout;
    if (devStage === 'developing') {
      devInterval = setInterval(() => {
        setDevTimeSeconds(prev => {
          const next = prev + 1;
          if (next >= 60) {
            setDevStage('stopped');
          }
          return next;
        });
      }, 1000);
    }
    return () => clearInterval(devInterval);
  }, [devStage]);

  // Agitate Chemical Tray
  const handleAgitateTray = () => {
    setIsAgitating(true);
    setAgitationRipples(prev => prev + 1);
    playSound('slosh');
    // Agitation accelerates developer diffusion to shadows and highlights
    if (devStage === 'developing') {
      setDevTimeSeconds(prev => Math.min(60, prev + 2));
    }
    setTimeout(() => setIsAgitating(false), 900);
  };

  // Handle Easel canvas click for Dodging / Burning / Grain Scope
  const handleEaselClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    if (showGrainScope) {
      setGrainScopePos({ x, y });
      return;
    }

    if (activeTool === 'dodge' || activeTool === 'burn') {
      setDodgeBurnZones(prev => [
        ...prev,
        {
          x,
          y,
          radius: 0.15,
          type: activeTool
        }
      ]);
    }
  };

  // Render optical enlarger projection on easel canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = scan.fullImageUrl;
    img.onload = () => {
      canvas.width = 960;
      canvas.height = 640;

      // Base paper color based on selected paper emulsion
      let paperBaseColor = '#f8f6f0';
      if (paperType === 'ilford-fb-warmtone') paperBaseColor = '#fcf8ee'; // rich warm fiber
      else if (paperType === 'agfa-brovira') paperBaseColor = '#f5f5f4'; // neutral cool
      else if (paperType === 'kodak-ektacolor') paperBaseColor = '#ffffff';

      // Draw paper base in easel
      ctx.fillStyle = paperBaseColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Easel black borders (4-bladed Saunders darkroom easel)
      ctx.fillStyle = '#18181b';
      ctx.fillRect(0, 0, canvas.width, 32);
      ctx.fillRect(0, canvas.height - 32, canvas.width, 32);
      ctx.fillRect(0, 0, 32, canvas.height);
      ctx.fillRect(canvas.width - 32, 0, 32, canvas.height);

      // Paper grain texture
      ctx.fillStyle = 'rgba(0,0,0,0.02)';
      for (let i = 0; i < 400; i++) {
        ctx.fillRect(
          32 + Math.random() * (canvas.width - 64),
          32 + Math.random() * (canvas.height - 64),
          1.5,
          1.5
        );
      }

      const printWidth = canvas.width - 64;
      const printHeight = canvas.height - 64;

      // Offscreen inverted positive
      const offCanvas = document.createElement('canvas');
      offCanvas.width = printWidth;
      offCanvas.height = printHeight;
      const offCtx = offCanvas.getContext('2d');
      if (!offCtx) return;

      offCtx.drawImage(img, 0, 0, printWidth, printHeight);
      const imgData = offCtx.getImageData(0, 0, printWidth, printHeight);
      const data = imgData.data;

      // Durst Filter color cast & contrast simulation
      // Yellow filter lowers contrast, Magenta increases contrast
      const contrastMultiplier = 1.0 + (magentaFilter - yellowFilter) / 75;
      const lightFactor = Math.pow(8 / aperture, 1.2);

      // Invert negative density to positive
      for (let i = 0; i < data.length; i += 4) {
        let r = data[i] / 255.0;
        let g = data[i + 1] / 255.0;
        let b = data[i + 2] / 255.0;

        if (isColorMode) {
          // C-41 color positive projection with Durst dichroic filtration
          const baseR = scan.settings.filmBase.r || 0.85;
          const baseG = scan.settings.filmBase.g || 0.45;
          const baseB = scan.settings.filmBase.b || 0.15;

          let posR = 1.0 - (r / baseR);
          let posG = 1.0 - (g / baseG);
          let posB = 1.0 - (b / baseB);

          // Apply Yellow / Magenta / Cyan filtration dials
          posR *= (1.0 - cyanFilter / 260);
          posG *= (1.0 - magentaFilter / 260);
          posB *= (1.0 - yellowFilter / 260);

          posR = Math.min(1.0, Math.max(0.0, (posR - 0.5) * contrastMultiplier + 0.5));
          posG = Math.min(1.0, Math.max(0.0, (posG - 0.5) * contrastMultiplier + 0.5));
          posB = Math.min(1.0, Math.max(0.0, (posB - 0.5) * contrastMultiplier + 0.5));

          data[i] = Math.round(posR * 255);
          data[i + 1] = Math.round(posG * 255);
          data[i + 2] = Math.round(posB * 255);
        } else {
          // Silver Halide B&W density inversion
          const invLuma = 1.0 - (0.299 * r + 0.587 * g + 0.114 * b);
          let pos = (invLuma - 0.5) * contrastMultiplier + 0.5;
          pos = Math.min(1.0, Math.max(0.0, pos * lightFactor));

          // Test strip stepped exposure mode simulation
          if (testStripMode) {
            const pixelX = (i / 4) % printWidth;
            const stripIndex = Math.floor((pixelX / printWidth) * 5);
            const stripMult = [0.25, 0.55, 1.0, 1.6, 2.5][stripIndex];
            pos = Math.min(1.0, Math.max(0.0, pos * stripMult));
          }

          data[i] = Math.round(pos * 255);
          data[i + 1] = Math.round(pos * 255);
          data[i + 2] = Math.round(pos * 255);
        }
        data[i + 3] = 255;
      }
      offCtx.putImageData(imgData, 0, 0);

      // Projection light simulation
      if (isLampOn) {
        // Enlarger Lamp illuminated
        if (redSafetyFilterSwungIn) {
          // Cast deep ruby red non-actinic safety light
          ctx.drawImage(offCanvas, 32, 32);
          ctx.fillStyle = 'rgba(239, 68, 68, 0.75)';
          ctx.fillRect(32, 32, printWidth, printHeight);
        } else {
          // Intense projection light
          ctx.drawImage(offCanvas, 32, 32);

          // Add dichroic filter glow
          if (yellowFilter > 0 || magentaFilter > 0 || cyanFilter > 0) {
            ctx.fillStyle = `rgba(${Math.round(255 - cyanFilter * 1.5)}, ${Math.round(255 - magentaFilter * 1.5)}, ${Math.round(255 - yellowFilter * 1.5)}, 0.12)`;
            ctx.fillRect(32, 32, printWidth, printHeight);
          }
        }
      } else {
        // Enlarger lamp OFF: unexposed paper sitting under safelight
        if (safelight === 'red') {
          ctx.fillStyle = '#1c0a0a';
          ctx.fillRect(32, 32, printWidth, printHeight);
        } else if (safelight === 'amber') {
          ctx.fillStyle = '#22150a';
          ctx.fillRect(32, 32, printWidth, printHeight);
        } else {
          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(32, 32, printWidth, printHeight);
        }
      }

      // Render Dodging / Burning indicator overlays
      dodgeBurnZones.forEach((zone, idx) => {
        const zx = 32 + zone.x * printWidth;
        const zy = 32 + zone.y * printHeight;
        const zr = zone.radius * printWidth;

        ctx.beginPath();
        ctx.arc(zx, zy, zr, 0, Math.PI * 2);
        ctx.strokeStyle = zone.type === 'dodge' ? '#38bdf8' : '#f97316';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = zone.type === 'dodge' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(249, 115, 22, 0.15)';
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = '10px monospace';
        ctx.fillText(`${zone.type.toUpperCase()} #${idx + 1}`, zx - 24, zy - zr - 4);
      });

      // Render Paterson Grain Focus Finder Loupe if active
      if (showGrainScope) {
        const gx = 32 + grainScopePos.x * printWidth;
        const gy = 32 + grainScopePos.y * printHeight;

        // Circular reticle
        ctx.beginPath();
        ctx.arc(gx, gy, 48, 0, Math.PI * 2);
        ctx.fillStyle = '#050505';
        ctx.fill();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Crosshairs & focal indicator
        ctx.beginPath();
        ctx.moveTo(gx - 48, gy);
        ctx.lineTo(gx + 48, gy);
        ctx.moveTo(gx, gy - 48);
        ctx.lineTo(gx, gy + 48);
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // High magnification silver halide grain particles simulation
        ctx.fillStyle = '#ffffff';
        for (let p = 0; p < 60; p++) {
          const ang = Math.random() * Math.PI * 2;
          const rad = Math.random() * 40;
          ctx.fillRect(gx + Math.cos(ang) * rad, gy + Math.sin(ang) * rad, 1.2, 1.2);
        }

        ctx.fillStyle = '#38bdf8';
        ctx.font = '9px monospace';
        ctx.fillText('CRITICAL GRAIN FOCUS', gx - 54, gy + 62);
      }
    };
  }, [
    scan, 
    isLampOn, 
    redSafetyFilterSwungIn, 
    safelight, 
    yellowFilter, 
    magentaFilter, 
    cyanFilter, 
    aperture, 
    columnHeight, 
    testStripMode,
    isColorMode,
    paperType,
    showGrainScope,
    grainScopePos,
    dodgeBurnZones
  ]);

  // Chemical Tray Developer Canvas (Wet Bench Rendering)
  useEffect(() => {
    const canvas = paperCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 440;
    canvas.height = 300;

    // Tray background (Chemical darkroom tray)
    ctx.fillStyle = '#101015';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Liquid ripple and chemical color
    let liquidColor = 'rgba(217, 119, 6, 0.22)'; // Amber developer
    if (devStage === 'stopped') liquidColor = 'rgba(234, 179, 8, 0.22)'; // Yellowish stop bath
    if (devStage === 'fixed' || devStage === 'finished') liquidColor = 'rgba(59, 130, 246, 0.18)'; // Blue-clear fixer

    ctx.fillStyle = liquidColor;
    ctx.fillRect(12, 12, canvas.width - 24, canvas.height - 24);

    // Agitation wave animation
    if (isAgitating) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.lineWidth = 2;
      for (let w = 0; w < 4; w++) {
        ctx.beginPath();
        const yOffset = 40 + w * 55 + (agitationRipples % 3) * 6;
        ctx.moveTo(20, yOffset);
        ctx.bezierCurveTo(120, yOffset - 12, 280, yOffset + 12, canvas.width - 20, yOffset);
        ctx.stroke();
      }
    }

    // Print paper in tray
    const paperW = 350;
    const paperH = 230;
    const paperX = (canvas.width - paperW) / 2;
    const paperY = (canvas.height - paperH) / 2;

    // Paper base tone
    let paperTint = '#faf8f5';
    if (paperType === 'ilford-fb-warmtone') paperTint = '#fcf8ee';
    else if (paperType === 'agfa-brovira') paperTint = '#f4f4f5';
    else if (isPaperFogged) paperTint = '#3f3f46'; // Flash fogged paper under white light!

    ctx.fillStyle = paperTint;
    ctx.fillRect(paperX, paperY, paperW, paperH);

    // White easel margin
    ctx.strokeStyle = '#e4e4e7';
    ctx.lineWidth = 1;
    ctx.strokeRect(paperX, paperY, paperW, paperH);

    // Render positive silver image development in tray
    if (exposureHistorySeconds > 0 && (devStage === 'developing' || devStage === 'stopped' || devStage === 'fixed' || devStage === 'finished')) {
      const devProgress = devStage === 'developing' ? Math.min(1.0, devTimeSeconds / 45) : 1.0;
      const opacity = devProgress * Math.min(1.0, exposureHistorySeconds / 6.5);

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = scan.fullImageUrl;
      img.onload = () => {
        const offCanvas = document.createElement('canvas');
        offCanvas.width = paperW - 24;
        offCanvas.height = paperH - 24;
        const offCtx = offCanvas.getContext('2d');
        if (!offCtx) return;

        offCtx.drawImage(img, 0, 0, offCanvas.width, offCanvas.height);
        const imgData = offCtx.getImageData(0, 0, offCanvas.width, offCanvas.height);
        const data = imgData.data;

        const contrastMultiplier = 1.0 + (magentaFilter - yellowFilter) / 75;

        // Invert negative density to positive photographic silver tones
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i] / 255.0;
          const g = data[i + 1] / 255.0;
          const b = data[i + 2] / 255.0;

          if (isColorMode) {
            const baseR = scan.settings.filmBase.r || 0.85;
            const baseG = scan.settings.filmBase.g || 0.45;
            const baseB = scan.settings.filmBase.b || 0.15;

            let posR = 1.0 - (r / baseR);
            let posG = 1.0 - (g / baseG);
            let posB = 1.0 - (b / baseB);

            posR = Math.min(1.0, Math.max(0.0, (posR - 0.5) * contrastMultiplier + 0.5));
            posG = Math.min(1.0, Math.max(0.0, (posG - 0.5) * contrastMultiplier + 0.5));
            posB = Math.min(1.0, Math.max(0.0, (posB - 0.5) * contrastMultiplier + 0.5));

            data[i] = Math.round(posR * 255);
            data[i + 1] = Math.round(posG * 255);
            data[i + 2] = Math.round(posB * 255);
          } else {
            const invLuma = 1.0 - (0.299 * r + 0.587 * g + 0.114 * b);
            let pos = (invLuma - 0.5) * contrastMultiplier + 0.5;

            // Warmtone silver toning
            if (paperType === 'ilford-fb-warmtone') {
              data[i] = Math.round(pos * 245 + 10);
              data[i + 1] = Math.round(pos * 235 + 8);
              data[i + 2] = Math.round(pos * 220 + 5);
            } else {
              const grey = Math.round(pos * 255);
              data[i] = grey;
              data[i + 1] = grey;
              data[i + 2] = grey;
            }
          }
          data[i + 3] = 255;
        }

        offCtx.putImageData(imgData, 0, 0);

        ctx.globalAlpha = opacity;
        ctx.drawImage(offCanvas, paperX + 12, paperY + 12);
        ctx.globalAlpha = 1.0;

        // If fogged by white light before fixing, render fog flash overlay
        if (isPaperFogged) {
          ctx.fillStyle = 'rgba(20, 20, 25, 0.7)';
          ctx.fillRect(paperX + 12, paperY + 12, paperW - 24, paperH - 24);
        }
      };
    }
  }, [
    devStage, 
    devTimeSeconds, 
    exposureHistorySeconds, 
    scan, 
    magentaFilter, 
    yellowFilter, 
    isColorMode, 
    paperType, 
    isAgitating, 
    agitationRipples, 
    isPaperFogged
  ]);

  // Export developed Gelatin Silver / Color Darkroom Print
  const handleExportDevelopedPrint = async () => {
    setIsExporting(true);
    setExportNotice('Encoding archival gelatin silver print...');

    try {
      // Create high-res offscreen canvas
      const printCanvas = document.createElement('canvas');
      const targetW = 2400;
      const targetH = 1600;
      printCanvas.width = targetW;
      printCanvas.height = targetH;
      const ctx = printCanvas.getContext('2d');
      if (!ctx) throw new Error('Could not allocate print canvas');

      // Authentic archival darkroom paper borders
      const borderW = 100;
      ctx.fillStyle = paperType === 'ilford-fb-warmtone' ? '#fcf8ee' : '#fafafa';
      ctx.fillRect(0, 0, targetW, targetH);

      // Load full image
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = scan.fullImageUrl;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
      });

      const innerW = targetW - borderW * 2;
      const innerH = targetH - borderW * 2;

      const subCanvas = document.createElement('canvas');
      subCanvas.width = innerW;
      subCanvas.height = innerH;
      const subCtx = subCanvas.getContext('2d');
      if (!subCtx) throw new Error('Subcanvas error');

      subCtx.drawImage(img, 0, 0, innerW, innerH);
      const imgData = subCtx.getImageData(0, 0, innerW, innerH);
      const data = imgData.data;
      const contrastMultiplier = 1.0 + (magentaFilter - yellowFilter) / 75;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i] / 255.0;
        const g = data[i + 1] / 255.0;
        const b = data[i + 2] / 255.0;

        if (isColorMode) {
          const baseR = scan.settings.filmBase.r || 0.85;
          const baseG = scan.settings.filmBase.g || 0.45;
          const baseB = scan.settings.filmBase.b || 0.15;

          let posR = 1.0 - (r / baseR);
          let posG = 1.0 - (g / baseG);
          let posB = 1.0 - (b / baseB);

          posR = Math.min(1.0, Math.max(0.0, (posR - 0.5) * contrastMultiplier + 0.5));
          posG = Math.min(1.0, Math.max(0.0, (posG - 0.5) * contrastMultiplier + 0.5));
          posB = Math.min(1.0, Math.max(0.0, (posB - 0.5) * contrastMultiplier + 0.5));

          data[i] = Math.round(posR * 255);
          data[i + 1] = Math.round(posG * 255);
          data[i + 2] = Math.round(posB * 255);
        } else {
          const invLuma = 1.0 - (0.299 * r + 0.587 * g + 0.114 * b);
          let pos = (invLuma - 0.5) * contrastMultiplier + 0.5;

          if (paperType === 'ilford-fb-warmtone') {
            data[i] = Math.round(pos * 245 + 10);
            data[i + 1] = Math.round(pos * 235 + 8);
            data[i + 2] = Math.round(pos * 220 + 5);
          } else {
            const grey = Math.round(pos * 255);
            data[i] = grey;
            data[i + 1] = grey;
            data[i + 2] = grey;
          }
        }
      }

      subCtx.putImageData(imgData, 0, 0);
      ctx.drawImage(subCanvas, borderW, borderW);

      // Add embossed laboratory stamp in bottom right paper margin
      ctx.fillStyle = '#71717a';
      ctx.font = '24px monospace';
      ctx.fillText(`DURST CLS 501 · GRADE ${selectedGrade} · f/${aperture} · ${exposureHistorySeconds.toFixed(1)}s`, borderW + 20, targetH - 40);
      ctx.fillText(`RODINAL STUDIO DARKROOM ARCHIVE · ${scan.metadata.rollId}`, targetW - borderW - 680, targetH - 40);

      // Export as High-Resolution Master
      const blob = await new Promise<Blob>((resolve, reject) => {
        printCanvas.toBlob((b) => {
          if (b) resolve(b);
          else reject(new Error('Export blob failed'));
        }, 'image/jpeg', 0.98);
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${scan.filename.replace(/\.[^/.]+$/, '')}_Durst_Darkroom_Print.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExportNotice('Darkroom Master Print Downloaded!');
      setTimeout(() => setExportNotice(null), 3000);
    } catch (err) {
      alert(`Export error: ${(err as Error).message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const safelightBgClass = 
    safelight === 'red' 
      ? 'bg-[#140606] text-red-200' 
      : safelight === 'amber' 
      ? 'bg-[#180e06] text-amber-200' 
      : 'bg-[#121216] text-neutral-200';

  return (
    <div className={`fixed inset-0 z-50 flex flex-col select-none transition-colors duration-300 ${safelightBgClass}`}>
      {/* Top Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-red-950/70 bg-black/60 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded bg-red-600/20 border border-red-500/50 flex items-center justify-center text-red-400 font-bold text-xs font-mono">
            CLS
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-tight text-white flex items-center gap-2">
              <span>Durst Laborator Enlarger Darkroom</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-red-950 border border-red-800 text-red-300">
                CLS 501 Dichroic Head
              </span>
            </h1>
            <p className="text-[11px] text-neutral-400 font-mono">
              Simulating silver halide optical printing with variable contrast filters &amp; wet chemistry
            </p>
          </div>
        </div>

        {/* Safelight, Sound & Exit */}
        <div className="flex items-center gap-4">
          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-1.5 rounded bg-black/60 border border-neutral-800 text-neutral-400 hover:text-white"
            title={soundEnabled ? 'Mute Darkroom Audio' : 'Enable Darkroom Audio'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-amber-400" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Safelight mode toggles */}
          <div className="flex items-center gap-1 bg-black/80 p-1 rounded-lg border border-neutral-800 text-xs">
            <span className="text-[10px] font-mono text-neutral-500 px-2">SAFELIGHT:</span>
            <button
              onClick={() => setSafelight('red')}
              className={`px-2.5 py-1 rounded text-xs transition-colors font-mono ${
                safelight === 'red' ? 'bg-red-950 text-red-400 font-bold border border-red-800' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Red (1A)
            </button>
            <button
              onClick={() => setSafelight('amber')}
              className={`px-2.5 py-1 rounded text-xs transition-colors font-mono ${
                safelight === 'amber' ? 'bg-amber-950 text-amber-400 font-bold border border-amber-800' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Amber (OC)
            </button>
            <button
              onClick={() => setSafelight('white')}
              className={`px-2.5 py-1 rounded text-xs transition-colors font-mono ${
                safelight === 'white' ? 'bg-neutral-800 text-white font-bold' : 'text-neutral-400 hover:text-white'
              }`}
              title="Caution: White inspection light will fog unfixed paper!"
            >
              White Inspection
            </button>
          </div>

          <button
            onClick={onExit}
            className="px-3.5 py-1.5 text-xs font-semibold text-neutral-950 bg-neutral-200 hover:bg-white rounded transition-colors"
          >
            Exit Darkroom
          </button>
        </div>
      </header>

      {/* Accidental Fog Warning Banner */}
      {isPaperFogged && (
        <div className="bg-red-600/90 text-white text-xs px-6 py-1.5 flex items-center justify-between font-mono">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 animate-bounce" />
            <span>PAPER FOGGED: White room inspection light flashed onto active photographic paper before fixing!</span>
          </div>
          <button
            onClick={() => setIsPaperFogged(false)}
            className="px-2 py-0.5 rounded bg-black/40 hover:bg-black/60 text-[10px]"
          >
            Acknowledge
          </button>
        </div>
      )}

      {/* Main Darkroom Floor */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column: Durst Dichroic Mixing Head Controls */}
        <div className="w-88 bg-black/50 border-r border-red-950/60 p-5 overflow-y-auto space-y-5 scrollbar-thin text-xs">
          {/* Dichroic Filter Wheels */}
          <div className="bg-neutral-950/80 border border-neutral-800/80 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-amber-400 font-bold tracking-wider text-[11px]">
                DURST DICHROIC FILTERS
              </span>
              <span className="text-[10px] font-mono text-neutral-500">0 - 130 Units</span>
            </div>

            {/* Mode: B&W Multigrade vs Color Printing */}
            <div className="flex rounded bg-neutral-900 p-0.5 border border-neutral-800">
              <button
                onClick={() => setIsColorMode(false)}
                className={`flex-1 py-1 rounded text-[10.5px] font-mono transition-colors ${
                  !isColorMode ? 'bg-amber-400 text-neutral-950 font-bold' : 'text-neutral-400 hover:text-white'
                }`}
              >
                Multigrade B&amp;W
              </button>
              <button
                onClick={() => setIsColorMode(true)}
                className={`flex-1 py-1 rounded text-[10.5px] font-mono transition-colors ${
                  isColorMode ? 'bg-amber-400 text-neutral-950 font-bold' : 'text-neutral-400 hover:text-white'
                }`}
              >
                C-41 Color Print
              </button>
            </div>

            {/* Yellow Dial (Contrast reduction / color pack) */}
            <div className="space-y-1.5">
              <div className="flex justify-between font-mono text-[11px]">
                <span className="text-yellow-400 font-semibold">Yellow (Y)</span>
                <span className="text-white font-bold">{yellowFilter}</span>
              </div>
              <input
                type="range"
                min="0"
                max="130"
                value={yellowFilter}
                onChange={(e) => {
                  setYellowFilter(parseInt(e.target.value));
                  setSelectedGrade('custom');
                }}
                className="w-full accent-yellow-400 h-1.5 bg-neutral-800 rounded"
              />
            </div>

            {/* Magenta Dial (Contrast boost / hard grade) */}
            <div className="space-y-1.5">
              <div className="flex justify-between font-mono text-[11px]">
                <span className="text-pink-400 font-semibold">Magenta (M)</span>
                <span className="text-white font-bold">{magentaFilter}</span>
              </div>
              <input
                type="range"
                min="0"
                max="130"
                value={magentaFilter}
                onChange={(e) => {
                  setMagentaFilter(parseInt(e.target.value));
                  setSelectedGrade('custom');
                }}
                className="w-full accent-pink-400 h-1.5 bg-neutral-800 rounded"
              />
            </div>

            {/* Cyan Dial */}
            <div className="space-y-1.5">
              <div className="flex justify-between font-mono text-[11px]">
                <span className="text-cyan-400 font-semibold">Cyan (C)</span>
                <span className="text-white font-bold">{cyanFilter}</span>
              </div>
              <input
                type="range"
                min="0"
                max="130"
                value={cyanFilter}
                onChange={(e) => {
                  setCyanFilter(parseInt(e.target.value));
                  setSelectedGrade('custom');
                }}
                className="w-full accent-cyan-400 h-1.5 bg-neutral-800 rounded"
              />
            </div>

            {/* Multigrade Quick Paper Presets */}
            {!isColorMode && (
              <div className="pt-2 border-t border-neutral-850">
                <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider block mb-1.5">
                  Multigrade Contrast Grade
                </span>
                <div className="grid grid-cols-6 gap-1">
                  {(['00', '1', '2', '3', '4', '5'] as MultigradeGrade[]).map((g) => (
                    <button
                      key={g}
                      onClick={() => applyMultigradeGrade(g)}
                      className={`py-1 rounded font-mono text-[11px] transition-colors ${
                        selectedGrade === g
                          ? 'bg-amber-400 text-neutral-950 font-bold shadow'
                          : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white'
                      }`}
                    >
                      G{g}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Paper Emulsion Selection */}
          <div className="bg-neutral-950/80 border border-neutral-800/80 rounded-xl p-4 space-y-3">
            <span className="font-mono text-amber-400 font-bold tracking-wider text-[11px] block">
              PHOTOGRAPHIC PAPER EMULSION
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: 'ilford-fb-warmtone', name: 'Ilford FB Warmtone', desc: 'Baryta Fiber Base' },
                { id: 'ilford-rc-glossy', name: 'Ilford RC Deluxe', desc: 'Pearl Neutral Tone' },
                { id: 'agfa-brovira', name: 'Agfa Brovira Vintage', desc: 'Deep Silver Black' },
                { id: 'kodak-ektacolor', name: 'Kodak Ektacolor Edge', desc: 'Color Paper' }
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPaperType(p.id as PaperType)}
                  className={`p-2 rounded text-left border transition-colors ${
                    paperType === p.id
                      ? 'border-amber-400 bg-amber-400/10 text-white'
                      : 'border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:text-white'
                  }`}
                >
                  <div className="font-semibold text-[11px] truncate">{p.name}</div>
                  <div className="text-[10px] text-neutral-500 font-mono truncate">{p.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Enlarger Lens & Column Geometry */}
          <div className="bg-neutral-950/80 border border-neutral-800/80 rounded-xl p-4 space-y-3.5">
            <span className="font-mono text-amber-400 font-bold tracking-wider text-[11px] block">
              OPTICS &amp; ENLARGER COLUMN
            </span>

            {/* Aperture Click Stops */}
            <div>
              <div className="flex justify-between font-mono text-[11px] mb-1.5">
                <span className="text-neutral-400">Lens Aperture</span>
                <span className="text-white font-bold">f/{aperture}</span>
              </div>
              <div className="grid grid-cols-6 gap-1">
                {[2.8, 4, 5.6, 8, 11, 16].map((f) => (
                  <button
                    key={f}
                    onClick={() => setAperture(f)}
                    className={`py-1 rounded font-mono text-[10.5px] transition-colors ${
                      aperture === f
                        ? 'bg-neutral-200 text-neutral-950 font-bold'
                        : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Column Height */}
            <div>
              <div className="flex justify-between font-mono text-[11px] mb-1">
                <span className="text-neutral-400">Magnification / Size</span>
                <span className="text-white font-mono">{columnHeight}×{Math.round(columnHeight * 1.25)}" print</span>
              </div>
              <input
                type="range"
                min="8"
                max="20"
                value={columnHeight}
                onChange={(e) => setColumnHeight(parseInt(e.target.value))}
                className="w-full accent-amber-400 h-1.5 bg-neutral-800 rounded"
              />
            </div>

            {/* Red Safety Swing Filter Arm */}
            <div className="pt-2 border-t border-neutral-850 flex items-center justify-between">
              <div>
                <div className="font-semibold text-white text-[11px]">Red Safety Swing Arm</div>
                <div className="text-[10px] text-neutral-400">Compose on paper without exposure</div>
              </div>
              <button
                onClick={() => setRedSafetyFilterSwungIn(!redSafetyFilterSwungIn)}
                className={`px-3 py-1 rounded text-[11px] font-mono transition-colors ${
                  redSafetyFilterSwungIn
                    ? 'bg-red-600 text-white font-bold shadow'
                    : 'bg-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                {redSafetyFilterSwungIn ? 'Swung IN (Safe)' : 'Swung OUT'}
              </button>
            </div>

            {/* Paterson Grain Scope */}
            <div className="flex items-center justify-between pt-1">
              <div>
                <div className="font-semibold text-white text-[11px]">Critical Grain Finder</div>
                <div className="text-[10px] text-neutral-400">Magnify silver halide grains</div>
              </div>
              <button
                onClick={() => setShowGrainScope(!showGrainScope)}
                className={`px-3 py-1 rounded text-[11px] font-mono transition-colors ${
                  showGrainScope
                    ? 'bg-sky-400 text-neutral-950 font-bold shadow'
                    : 'bg-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                {showGrainScope ? 'LOUPE ON' : 'OFF'}
              </button>
            </div>

            {/* Test Strip Mode Toggle */}
            <div className="flex items-center justify-between pt-1">
              <div>
                <div className="font-semibold text-white text-[11px]">Test Strip Generator</div>
                <div className="text-[10px] text-neutral-400">Split into 5 exposure steps</div>
              </div>
              <button
                onClick={() => setTestStripMode(!testStripMode)}
                className={`px-3 py-1 rounded text-[11px] font-mono transition-colors ${
                  testStripMode
                    ? 'bg-amber-400 text-neutral-950 font-bold shadow'
                    : 'bg-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                {testStripMode ? 'ACTIVE' : 'OFF'}
              </button>
            </div>
          </div>

          {/* Electronic Darkroom Exposure Timer */}
          <div className="bg-neutral-950/80 border border-neutral-800/80 rounded-xl p-4 space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-amber-400 font-bold tracking-wider text-[11px]">
                ELECTRONIC TIMER &amp; FOOTSWITCH
              </span>
              <Timer className="w-4 h-4 text-amber-400" />
            </div>

            {/* Vintage Digital LED Display */}
            <div className="bg-black border border-red-900/60 rounded-lg p-3 text-center shadow-inner">
              <div className="font-mono text-3xl font-extrabold text-red-500 tracking-widest drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]">
                {isLampOn ? timeRemaining.toFixed(1) : timerDuration.toFixed(1)} <span className="text-sm">SEC</span>
              </div>
              <div className="text-[10px] font-mono text-red-700 mt-1">
                {isLampOn ? 'EXPOSURE IN PROGRESS...' : 'STANDBY READY'}
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between font-mono text-[11px]">
                <span className="text-neutral-400">Duration</span>
                <span className="text-white">{timerDuration.toFixed(1)}s</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="30"
                step="0.5"
                value={timerDuration}
                disabled={isLampOn}
                onChange={(e) => setTimerDuration(parseFloat(e.target.value))}
                className="w-full accent-red-500 h-1.5 bg-neutral-800 rounded"
              />
            </div>

            {/* EXPOSE FOOT PEDAL BUTTON */}
            <button
              onClick={triggerExposure}
              disabled={isLampOn}
              className={`w-full py-3 rounded-lg font-bold text-sm tracking-wider uppercase flex items-center justify-center gap-2 shadow-xl transition-transform active:scale-95 ${
                isLampOn
                  ? 'bg-yellow-400 text-neutral-950 animate-pulse'
                  : 'bg-red-600 hover:bg-red-500 text-white cursor-pointer'
              }`}
            >
              <Zap className="w-4 h-4" />
              <span>{isLampOn ? 'Enlarger Lamp Active' : 'Expose Print (Footswitch)'}</span>
            </button>
          </div>
        </div>

        {/* Center: Enlarger Projection Paper Easel */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden">
          {/* Light cone beam animation */}
          {isLampOn && (
            <div
              className={`absolute inset-0 pointer-events-none transition-opacity duration-200 ${
                redSafetyFilterSwungIn
                  ? 'bg-red-600/25 shadow-[inset_0_0_120px_rgba(220,38,38,0.6)]'
                  : 'bg-yellow-100/15 shadow-[inset_0_0_150px_rgba(254,240,138,0.3)]'
              }`}
            />
          )}

          {/* Photographic Paper Easel on Baseboard */}
          <div className="relative shadow-2xl rounded-sm overflow-hidden border-8 border-neutral-900 bg-neutral-950 cursor-crosshair">
            <canvas 
              ref={canvasRef} 
              onClick={handleEaselClick}
              className="block max-h-[60vh] w-auto shadow-2xl" 
            />

            {/* Status overlay */}
            <div className="absolute top-2 right-2 px-2.5 py-1 bg-black/80 backdrop-blur-xs rounded text-[10px] font-mono text-neutral-300">
              {isLampOn ? (redSafetyFilterSwungIn ? 'RED SAFETY PROJECTION' : 'ACTINIC EXPOSURE') : 'PAPER EASEL (STANDBY)'}
            </div>

            {/* Dodging / Burning Tool selector floating pill */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/85 backdrop-blur-md px-3 py-1.5 rounded-full border border-neutral-800 flex items-center gap-2 text-xs">
              <span className="text-[10px] font-mono text-neutral-500">DARKROOM WAND:</span>
              <button
                onClick={() => setActiveTool(activeTool === 'dodge' ? 'none' : 'dodge')}
                className={`px-2 py-0.5 rounded text-[10.5px] font-mono transition-colors ${
                  activeTool === 'dodge' ? 'bg-sky-500 text-neutral-950 font-bold' : 'text-neutral-400 hover:text-white'
                }`}
              >
                Dodge Wand
              </button>
              <button
                onClick={() => setActiveTool(activeTool === 'burn' ? 'none' : 'burn')}
                className={`px-2 py-0.5 rounded text-[10.5px] font-mono transition-colors ${
                  activeTool === 'burn' ? 'bg-orange-500 text-neutral-950 font-bold' : 'text-neutral-400 hover:text-white'
                }`}
              >
                Burn Card
              </button>
              {dodgeBurnZones.length > 0 && (
                <button
                  onClick={() => setDodgeBurnZones([])}
                  className="text-[10px] text-red-400 hover:text-red-300 ml-1"
                >
                  Clear Wands
                </button>
              )}
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3 text-xs font-mono text-neutral-400">
            <span>Accumulated Exposure: <strong className="text-amber-400">{exposureHistorySeconds.toFixed(1)}s</strong></span>
            <span>·</span>
            <span>Aperture: <strong>f/{aperture}</strong></span>
            <span>·</span>
            <span>Grade: <strong>{selectedGrade}</strong></span>
            <span>·</span>
            <span>Paper: <strong>{paperType}</strong></span>
          </div>
        </div>

        {/* Right Column: Chemical Developing Trays (Wet Bench) */}
        <div className="w-88 bg-black/50 border-l border-red-950/60 p-5 overflow-y-auto space-y-4 text-xs scrollbar-thin">
          <div className="bg-neutral-950/80 border border-neutral-800/80 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-amber-400 font-bold tracking-wider text-[11px]">
                WET BENCH CHEMISTRY
              </span>
              <span className="text-[10px] font-mono text-neutral-500">3-Tray Process</span>
            </div>

            {/* Developing Tray Preview */}
            <div className="border border-neutral-800 rounded-lg overflow-hidden bg-black p-2 flex items-center justify-center">
              <canvas ref={paperCanvasRef} className="w-full h-auto rounded shadow-inner" />
            </div>

            {/* Chemical Tray Stages */}
            <div className="space-y-2 pt-1">
              <div className="flex justify-between font-mono text-[11px]">
                <span className="text-neutral-400">Tray Stage:</span>
                <span className="text-amber-400 font-bold uppercase">{devStage}</span>
              </div>

              {devStage === 'developing' && (
                <div className="bg-amber-950/30 border border-amber-900/60 rounded p-2 text-center">
                  <div className="font-mono text-lg text-amber-400 font-bold">
                    {devTimeSeconds}s / 60s
                  </div>
                  <div className="text-[10px] text-amber-500">Developing silver halides in Kodak D-72 / Dektol...</div>
                </div>
              )}

              {/* Chemical Tray Action Buttons */}
              <div className="grid grid-cols-3 gap-1 pt-1">
                <button
                  onClick={() => {
                    setDevStage('developing');
                    setDevTimeSeconds(0);
                    playSound('slosh');
                  }}
                  disabled={exposureHistorySeconds === 0}
                  className="py-1.5 px-1 rounded bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-neutral-950 font-bold text-[10px] transition-colors"
                >
                  1. Developer
                </button>
                <button
                  onClick={() => {
                    setDevStage('stopped');
                    playSound('slosh');
                  }}
                  disabled={devStage === 'unexposed'}
                  className="py-1.5 px-1 rounded bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 text-neutral-200 text-[10px] transition-colors"
                >
                  2. Stop Bath
                </button>
                <button
                  onClick={() => {
                    setDevStage('fixed');
                    playSound('slosh');
                  }}
                  disabled={devStage === 'unexposed'}
                  className="py-1.5 px-1 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-[10px] transition-colors"
                >
                  3. Rapid Fix
                </button>
              </div>

              {/* Agitate chemical tray button */}
              <button
                onClick={handleAgitateTray}
                disabled={devStage === 'unexposed'}
                className="w-full py-1.5 rounded bg-neutral-900 hover:bg-neutral-800 disabled:opacity-40 border border-neutral-800 text-neutral-300 flex items-center justify-center gap-1.5 text-[11px] transition-colors"
              >
                <Waves className="w-3.5 h-3.5 text-amber-400" />
                <span>Agitate Chemical Tray (Rock Basin)</span>
              </button>

              {/* Reset to unexposed sheet */}
              <button
                onClick={() => {
                  setExposureHistorySeconds(0);
                  setDevStage('unexposed');
                  setDevTimeSeconds(0);
                  setIsPaperFogged(false);
                }}
                className="w-full py-1.5 rounded border border-neutral-850 text-neutral-400 hover:text-white flex items-center justify-center gap-1 text-[11px] transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Load Fresh Unexposed Paper</span>
              </button>
            </div>
          </div>

          {/* Export Developed Master Print */}
          {(devStage === 'fixed' || devStage === 'stopped' || devStage === 'finished') && exposureHistorySeconds > 0 && (
            <div className="bg-neutral-950/80 border border-neutral-800/80 rounded-xl p-4 space-y-2.5">
              <div className="flex items-center gap-2 text-white font-semibold text-xs">
                <FileCheck className="w-4 h-4 text-emerald-400" />
                <span>Archival Gelatin Silver Print Ready</span>
              </div>
              <p className="text-[11px] text-neutral-400 leading-relaxed">
                Your print has completed fixing and washing. Export high-resolution master with darkroom easel border and laboratory stamp.
              </p>
              <button
                onClick={handleExportDevelopedPrint}
                disabled={isExporting}
                className="w-full py-2.5 rounded bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isExporting ? 'Encoding Print...' : 'Download Master Darkroom Print'}</span>
              </button>
              {exportNotice && (
                <div className="text-[10px] font-mono text-emerald-400 text-center">{exportNotice}</div>
              )}
            </div>
          )}

          {/* Darkroom Physics Card */}
          <div className="p-3.5 rounded-lg bg-neutral-950/60 border border-neutral-900 text-[11px] text-neutral-400 space-y-1.5">
            <div className="font-semibold text-neutral-200 text-xs">Durst Optical Science</div>
            <p className="leading-relaxed">
              Dichroic filters use interference coatings to continuously vary paper contrast. The yellow filter lowers contrast (soft highlights), while magenta intensifies deep blacks by selectively exposing the high-contrast green-sensitive emulsion layer.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
