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
  ChevronLeft,
  Play,
  RotateCw,
  Volume2,
  VolumeX,
  Waves,
  ZoomIn,
  AlertTriangle,
  FileCheck,
  Trash2,
  Maximize2,
  X,
  ArrowRight,
  ArrowDown,
  FlaskConical,
  HelpCircle,
  Lightbulb
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

interface WetBenchProps {
  devStage: DevelopingStage;
  devTimeSeconds: number;
  exposureHistorySeconds: number;
  isPaperFogged: boolean;
  isExporting: boolean;
  exportNotice: string | null;
  paperCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  onAdvanceTray: () => void;
  onRockTank: (tank: 'developer' | 'stop' | 'fix') => void;
  onTrashPaper: () => void;
  onInspect: () => void;
  onExport: () => void;
  onBackToProjection: () => void;
}

/**
 * The wet bench: three trays side by side in the classic order
 * developer -> stop bath -> fixer. The sheet travels left to right, and each
 * tank can be rocked on its own. The paper starts at the enlarger, so the
 * developer tray only fills once a sheet has actually been exposed.
 */
const WetBench: React.FC<WetBenchProps> = ({
  devStage,
  devTimeSeconds,
  exposureHistorySeconds,
  isPaperFogged,
  isExporting,
  exportNotice,
  paperCanvasRef,
  onAdvanceTray,
  onRockTank,
  onTrashPaper,
  onInspect,
  onExport,
  onBackToProjection
}) => {
  const isExposed = exposureHistorySeconds > 0;

  // Which tray the sheet currently sits in, if any. An exposed-but-undeveloped
  // sheet is still on the easel, so it counts as being in no tray yet.
  const activeTray: 'developer' | 'stop' | 'fix' | 'dry' | null =
    devStage === 'developing' ? 'developer'
      : devStage === 'stopped' ? 'stop'
        : devStage === 'fixed' ? 'fix'
          : devStage === 'finished' ? 'dry'
            : null;

  const tanks: Array<{
    id: 'developer' | 'stop' | 'fix';
    step: number;
    name: string;
    chem: string;
    accent: string;
    ring: string;
    liquid: string;
    time: string;
  }> = [
    {
      id: 'developer',
      step: 1,
      name: 'Sviluppo',
      chem: 'Kodak Dektol 1:2',
      accent: 'text-amber-400',
      ring: 'border-amber-500/70',
      liquid: 'from-amber-800/70 to-amber-950/80',
      time: '60s'
    },
    {
      id: 'stop',
      step: 2,
      name: 'Arresto',
      chem: 'Indicatore acido 2%',
      accent: 'text-yellow-300',
      ring: 'border-yellow-500/70',
      liquid: 'from-yellow-800/60 to-yellow-950/80',
      time: '30s'
    },
    {
      id: 'fix',
      step: 3,
      name: 'Fissaggio',
      chem: 'Rapid Fixer 1:4',
      accent: 'text-blue-300',
      ring: 'border-blue-500/70',
      liquid: 'from-blue-800/60 to-blue-950/80',
      time: '3 min'
    }
  ];

  const nextLabel =
    devStage === 'unexposed' || devStage === 'exposed' ? 'Sviluppa'
      : devStage === 'developing' ? 'Arresta'
        : devStage === 'stopped' ? 'Fissa'
          : devStage === 'fixed' ? 'Lava & Asciuga'
            : 'Completato';

  return (
    <div className="flex-1 flex flex-col overflow-y-auto scrollbar-thin p-6 gap-5">
      {/* Bench header with the bath temperature readout, as on a real wet bench */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-mono text-amber-400 font-bold tracking-wider text-[11px]">
            BANCO CHIMICO — PROCESSO A 3 VASCHE
          </span>
          {isPaperFogged && (
            <span className="text-[10px] font-mono text-red-400 border border-red-800 rounded px-1.5 py-0.5">
              FOGGIATA
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 font-mono text-[10.5px] text-neutral-400">
          <span>Bagno: <strong className={activeTray === 'developer' ? 'text-amber-400' : 'text-neutral-300'}>20.0&nbsp;°C</strong></span>
          <span>Tempo lastra: <strong className="text-amber-400">{devTimeSeconds}s</strong></span>
          <span className="uppercase">
            Fase: <strong className="text-white">{devStage}</strong>
          </span>
        </div>
      </div>

      {/* The three tanks, side by side, with arrows showing paper travel */}
      <div className="flex items-stretch justify-center gap-1">
        {tanks.map((tank, i) => {
          const isActive = activeTray === tank.id;
          const isDone =
            (tank.id === 'developer' && ['stopped', 'fixed', 'finished'].includes(devStage)) ||
            (tank.id === 'stop' && ['fixed', 'finished'].includes(devStage)) ||
            (tank.id === 'fix' && devStage === 'finished');
          const reachable =
            tank.id === 'developer' ? isExposed
              : tank.id === 'stop' ? ['stopped', 'fixed', 'finished'].includes(devStage)
                : ['fixed', 'finished'].includes(devStage);

          return (
            <React.Fragment key={tank.id}>
              {i > 0 && (
                <div className="flex flex-col items-center justify-center px-1">
                  <ArrowRight className={`w-6 h-6 ${reachable ? 'text-emerald-500' : 'text-neutral-800'}`} />
                </div>
              )}
              <div
                className={`w-64 rounded-xl border-2 p-4 flex flex-col gap-3 transition-colors ${
                  isActive ? `${tank.ring} bg-neutral-900/80` : 'border-neutral-850 bg-neutral-950/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className={`font-mono text-[10px] ${tank.accent}`}>VASCA {tank.step}</span>
                      {isDone && <Check className="w-3 h-3 text-emerald-500" />}
                    </div>
                    <div className="text-white font-semibold text-[13px]">{tank.name}</div>
                  </div>
                  <span className="font-mono text-[9.5px] text-neutral-500">{tank.time}</span>
                </div>

                {/* Tray basin. The sheet appears in it only when it is present. */}
                <div className={`relative h-32 rounded-lg bg-gradient-to-b ${tank.liquid} border border-black/50 overflow-hidden shadow-inner`}>
                  {/* Liquid surface highlight */}
                  <div className="absolute inset-x-0 top-0 h-3 bg-white/5" />
                  {isActive && (
                    <div className="absolute inset-3 rounded bg-neutral-100/90 shadow-lg flex items-center justify-center">
                      <span className="font-mono text-[9px] text-neutral-500 tracking-wider">LASTRA</span>
                    </div>
                  )}
                  {!isActive && !isDone && reachable && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="font-mono text-[9px] text-white/30">vuota</span>
                    </div>
                  )}
                  {isDone && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="font-mono text-[9px] text-emerald-300/70">trattata ✓</span>
                    </div>
                  )}
                </div>

                {/* Rock this specific tank */}
                <button
                  onClick={() => onRockTank(tank.id)}
                  disabled={!isActive}
                  className={`w-full py-2 rounded-lg text-[11px] font-mono font-bold flex items-center justify-center gap-1.5 transition-colors ${
                    isActive
                      ? 'bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700'
                      : 'bg-neutral-900/60 text-neutral-600 border border-neutral-850 cursor-not-allowed'
                  }`}
                >
                  <Waves className="w-3.5 h-3.5" />
                  Dondola la vasca
                </button>
              </div>
            </React.Fragment>
          );
        })}

        {/* Drying line, reached once the sheet has been fixed */}
        <div className="flex flex-col items-center justify-center px-1">
          <ArrowRight className={`w-6 h-6 ${activeTray === 'dry' ? 'text-emerald-500' : 'text-neutral-800'}`} />
        </div>
        <div
          className={`w-52 rounded-xl border-2 p-4 flex flex-col gap-3 ${
            activeTray === 'dry' ? 'border-emerald-500/70 bg-neutral-900/80' : 'border-neutral-850 bg-neutral-950/60'
          }`}
        >
          <div>
            <span className="font-mono text-[10px] text-emerald-400">LINEA DI ASCIUGATURA</span>
            <div className="text-white font-semibold text-[13px]">Stampa finita</div>
          </div>
          <div className="relative flex-1 min-h-24 rounded-lg border border-neutral-850 bg-neutral-900/40 flex items-center justify-center overflow-hidden">
            {activeTray === 'dry' ? (
              <FileCheck className="w-8 h-8 text-emerald-500" />
            ) : (
              <span className="font-mono text-[9px] text-neutral-600">in attesa</span>
            )}
          </div>
          <button
            onClick={onInspect}
            disabled={!isExposed}
            className={`w-full py-2 rounded-lg text-[11px] font-mono flex items-center justify-center gap-1.5 transition-colors ${
              isExposed
                ? 'bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700'
                : 'bg-neutral-900/60 text-neutral-600 border border-neutral-850 cursor-not-allowed'
            }`}
          >
            <Maximize2 className="w-3.5 h-3.5" />
            Ispeziona
          </button>
        </div>
      </div>

      {/* Live view of the sheet in the chemistry, plus the bench controls */}
      <div className="flex gap-5 items-start">
        <div className="flex-1 bg-neutral-950/70 border border-neutral-800/80 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] text-neutral-400 tracking-wider">LASTRA IN LAVORAZIONE</span>
            {isExposed && (
              <span className="font-mono text-[10px] text-neutral-500">clicca per ispezionare</span>
            )}
          </div>
          <div
            className={`border border-neutral-800 rounded-lg overflow-hidden bg-black p-2 flex items-center justify-center ${
              isExposed ? 'cursor-zoom-in' : ''
            }`}
            onClick={() => isExposed && onInspect()}
          >
            <canvas ref={paperCanvasRef} className="w-full h-auto rounded shadow-inner max-h-64 object-contain" />
          </div>
          {devStage === 'developing' && (
            <div className="bg-amber-950/30 border border-amber-900/60 rounded p-2 text-center">
              <div className="font-mono text-lg text-amber-400 font-bold">{devTimeSeconds}s / 60s</div>
              <div className="text-[10px] text-amber-500">Riduzione degli alogenuri d'argento nel rivelatore…</div>
            </div>
          )}
        </div>

        {/* Bench action rail: advance the sheet, bin it, export */}
        <div className="w-72 shrink-0 space-y-2.5 text-xs">
          <button
            onClick={onAdvanceTray}
            disabled={!isExposed || devStage === 'finished'}
            className="w-full py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-[12px] flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95"
          >
            <ArrowDown className="w-4 h-4" />
            {nextLabel}
          </button>

          <button
            onClick={onBackToProjection}
            className="w-full py-2 rounded-lg border border-neutral-800 text-neutral-400 hover:text-white flex items-center justify-center gap-1.5 text-[11px] font-mono transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Torna all'ingranditore
          </button>

          <button
            onClick={onTrashPaper}
            title="Getta la lastra e carica un foglio nuovo"
            className="w-full py-2 rounded-lg border border-red-900/70 text-red-400 hover:text-red-300 hover:border-red-800 flex items-center justify-center gap-1.5 text-[11px] font-mono transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Getta lastra · carica foglio nuovo
          </button>

          {(devStage === 'fixed' || devStage === 'stopped' || devStage === 'finished') && isExposed && (
            <div className="pt-1 space-y-2">
              <button
                onClick={onExport}
                disabled={isExporting}
                className="w-full py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-neutral-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95"
              >
                <Download className="w-3.5 h-3.5" />
                {isExporting ? 'Codifica stampa…' : 'Esporta stampa master'}
              </button>
              {exportNotice && (
                <div className="text-[10px] font-mono text-emerald-400 text-center">{exportNotice}</div>
              )}
            </div>
          )}

          <div className="p-3 rounded-lg bg-neutral-950/60 border border-neutral-900 text-[10.5px] text-neutral-400 leading-relaxed">
            Ogni vasca va dondolata: l'agitazione rinnova il chimico a contatto con
            l'emulsione. Troppo poco e lo sviluppo si arena, troppo e le alte luci
            salgono prima delle ombre.
          </div>
        </div>
      </div>
    </div>
  );
};

interface TutorialPanelProps {
  activeSide: 'projection' | 'chemistry';
  devStage: DevelopingStage;
  isLampOn: boolean;
  exposureHistorySeconds: number;
  yellowFilter: number;
  magentaFilter: number;
  cyanFilter: number;
  selectedGrade: MultigradeGrade;
  aperture: number;
  isColorMode: boolean;
  lastAction: { id: string; at: number } | null;
  onClose: () => void;
  onGoToSide: (side: 'projection' | 'chemistry') => void;
}

/**
 * What each control does to the finished print, phrased as a reaction to the
 * user moving it. This is the bit the static step text cannot give: the guide
 * answers "I just turned this knob - so what?".
 */
const ACTION_FEEDBACK: Record<string, { label: string; effect: string; tone: 'contrast' | 'bright' | 'colour' | 'optic' }> = {
  yellowUp: { label: 'Giallo ↑', effect: 'Meno blu in arrivo sulla carta: contrasto in calo, alte luci più morbide.', tone: 'contrast' },
  yellowDown: { label: 'Giallo ↓', effect: 'Più blu in arrivo: contrasto in salita.', tone: 'contrast' },
  magentaUp: { label: 'Magenta ↑', effect: 'Meno verde: contrasto in salita, neri più profondi.', tone: 'contrast' },
  magentaDown: { label: 'Magenta ↓', effect: 'Più verde: contrasto in calo.', tone: 'contrast' },
  cyanUp: { label: 'Cyan ↑', effect: 'Meno rosso: densità e bilanciamento del mascheramento arancione.', tone: 'colour' },
  cyanDown: { label: 'Cyan ↓', effect: 'Più rosso nella luce: utile per correggere una dominante.', tone: 'colour' },
  grade: { label: 'Grado multigrade', effect: 'Imposta i filtri Y/M per te: gradi alti = più contrasto.', tone: 'contrast' },
  apertureUp: { label: 'Diaframma ↑', effect: 'Meno luce arriva: serve più tempo, ma più profondità di fuoco.', tone: 'optic' },
  apertureDown: { label: 'Diaframma ↓', effect: 'Più luce: esposizioni brevi, ma il fuoco diventa critico.', tone: 'optic' },
  timer: { label: 'Timer', effect: 'La densità della stampa è la luce totale: tempo × apertura × filtro.', tone: 'bright' },
  magnify: { label: 'Ingrandimento', effect: 'Scala attorno all\'asse lente: ingrandendo si ritaglia, non si riempie.', tone: 'optic' },
  focus: { label: 'Messa a fuoco', effect: 'Guarda il Gran Finder: il grano è nitido solo a fuoco critico.', tone: 'optic' },
  paper: { label: 'Carta', effect: 'Cambia tono e risposta dell\'emulsione: Br/BT, RC, colore.', tone: 'colour' },
  colorMode: { label: 'Modalità', effect: 'B&N multigrade o stampa colore C-41: cambia come i filtri agiscono.', tone: 'colour' },
  exposure: { label: 'Esposizione', effect: 'Luce accumulata: poca = lastra chiara, tanta = lastra scura.', tone: 'bright' },
  devTime: { label: 'Sviluppo', effect: 'Il tempo in vasca costruisce la densità; oltre il tempo giusto sale anche il velo.', tone: 'bright' },
  agitate: { label: 'Agitazione', effect: 'Rinnova il rivelatore a contatto con l\'emulsione: sviluppo più uniforme.', tone: 'bright' },
  paperLoad: { label: 'Carta sull\'easel', effect: 'Senza carta componi sulla baseboard nuda; con la carta carica la luce espone davvero.', tone: 'colour' },
  tiltX: { label: 'Tilt verticale', effect: 'Inclina l\'asse ottico: la proiezione si deforma a trapezio (keystone verticale).', tone: 'optic' },
  tiltY: { label: 'Tilt orizzontale', effect: 'Inclina l\'asse di lato: le righe della proiezione si sfasano (keystone orizzontale).', tone: 'optic' },
  shiftX: { label: 'Shift orizzontale', effect: 'Sposta la proiezione di lato senza toccare la colonna: utile per ricomporre il taglio.', tone: 'optic' },
  shiftY: { label: 'Shift verticale', effect: 'Sposta la proiezione in alto o in basso senza muovere l\'ingranditore.', tone: 'optic' },
  headReset: { label: 'Testa azzerata', effect: 'Tilt e shift tornano neutri: proiezione di nuovo rettangolare e centrata.', tone: 'optic' },
  lampManual: { label: 'Lampada in composizione', effect: 'Accendi la lampada per comporre e mettere a fuoco: la luce proietta il negativo senza esporre la carta.', tone: 'bright' }
};

const TONE_COLOUR: Record<string, string> = {
  contrast: 'text-pink-400 border-pink-900/60 bg-pink-950/20',
  bright: 'text-amber-400 border-amber-900/60 bg-amber-950/20',
  colour: 'text-cyan-400 border-cyan-900/60 bg-cyan-950/20',
  optic: 'text-sky-400 border-sky-900/60 bg-sky-950/20'
};

/**
 * Guided walkthrough for the darkroom. The simulation hides a lot of physics
 * behind familiar darkroom controls, so this panel explains, at each stage of
 * the workflow, what the user should be doing and - crucially - how each knob
 * changes the final print.
 */
const TutorialPanel: React.FC<TutorialPanelProps> = ({
  activeSide,
  devStage,
  isLampOn,
  exposureHistorySeconds,
  yellowFilter,
  magentaFilter,
  cyanFilter,
  selectedGrade,
  aperture,
  isColorMode,
  lastAction,
  onClose,
  onGoToSide
}) => {
  const hasExposure = exposureHistorySeconds > 0;

  // Which step of the workflow the user is on. Drives the highlighted guidance.
  const step: number =
    activeSide === 'projection'
      ? isLampOn || hasExposure ? 2 : 1
      : devStage === 'unexposed' || devStage === 'exposed' ? 2
        : devStage === 'developing' ? 3
          : devStage === 'stopped' ? 4
            : devStage === 'fixed' || devStage === 'finished' ? 5
              : 1;

  // Filtration is "set" once the user has moved any dial off zero.
  const filtrationMoved = yellowFilter > 0 || magentaFilter > 0 || cyanFilter > 0;

  const steps: Array<{ n: number; title: string; body: React.ReactNode }> = [
    {
      n: 1,
      title: 'Componi l\'immagine sull\'easel',
      body: (
        <>
          Tutto avviene sul lato <strong>Proiezione</strong>. L'easel mostra il{' '}
          <strong>negativo proiettato</strong>: è normale vederlo arancione e
          invertito, è la pellicola che il lampo dell'ingranditore attraversa.
          <ul className="mt-1.5 space-y-1 list-disc list-inside text-[10.5px]">
            <li><strong>Ingrandimento</strong> — scala la proiezione attorno all'asse lente.</li>
            <li><strong>Messa a fuoco</strong> — «Critico» per una lastra nitida.</li>
            <li><strong>Colonna</strong> — non zooma, cambia solo la luce totale.</li>
            <li><strong>Tilt &amp; shift</strong> — inclina o sposta la testa: la proiezione si deforma a trapezio o si decentra.</li>
            <li><strong>Nessuna carta</strong> — spegni la carta per comporre sulla baseboard nuda senza consumare fogli.</li>
            <li><strong>Lampada in composizione</strong> — accendila a mano: proietta il negativo per inquadrare e mettere a fuoco, senza far partire il timer e senza esporre.</li>
          </ul>
        </>
      )
    },
    {
      n: 2,
      title: 'Filtra la luce e decidi l\'esposizione',
      body: (
        <>
          I filtri <strong>CMY</strong> stanno nel cammino della luce{' '}
          <em>prima</em> della pellicola: sottraggono colore alla luce, non alla
          stampa. Ecco cosa fanno al risultato finale:
          <ul className="mt-1.5 space-y-1 list-disc list-inside text-[10.5px]">
            <li><span className="text-yellow-400">Giallo</span> taglia il blu → <strong>meno contrasto</strong> (alte luci morbide).</li>
            <li><span className="text-pink-400">Magenta</span> taglia il verde → <strong>più contrasto</strong> (neri profondi).</li>
            <li><span className="text-cyan-400">Cyan</span> taglia il rosso → densità generale e bilanciamento del mascheramento arancione.</li>
          </ul>
          <p className="mt-1.5">
            In <strong>B&amp;N multigrade</strong> i gradi G00–G5 sono preset rapidi
            degli stessi filtri. Il <strong>diaframma</strong> (f/) regola quanta luce
            arriva: più chiuso = esposizione più lunga ma lastra più nitida.
          </p>
          <p className="mt-1.5">
            Premia <strong>Expose Print</strong> col timer impostato. La
            <em> esposizione accumulata</em> in alto è la tua densità: poca = lastra
            chiara, tanta = lastra scura.
          </p>
          <p className="mt-1.5">
            <strong>Test strip</strong>: attiva il generatore e vedrai un cartoncino
            nero scorrere sull'easel, banda per banda, con il tempo di ogni banda
            scritto sulla lastra. Serve a capire l'esposizione giusta senza bruciare
            un foglio intero.
          </p>
        </>
      )
    },
    {
      n: 3,
      title: 'Sviluppo',
      body: (
        <>
          Passa al lato <strong>Chimica</strong> con la freccia verde. La lastra
          esposta entra nella <strong>vasca 1 (Sviluppo)</strong>: qui l'immagine
          latente diventa visibile.
          <ul className="mt-1.5 space-y-1 list-disc list-inside text-[10.5px]">
            <li><strong>Dondola la vasca</strong> per rinnovare il rivelatore a contatto con l'emulsione: l'agitazione accelera lo sviluppo.</li>
            <li>Il tempo sull'indicatore sale mentre la densità cresce.</li>
          </ul>
          <p className="mt-1.5">
            <strong>Sviluppa troppo</strong> → la lastra si scurisce anche nelle alte
            luci; <strong>troppo poco</strong> → immagine debole e piatta.
          </p>
        </>
      )
    },
    {
      n: 4,
      title: 'Arresto',
      body: (
        <p>
          La <strong>vasca 2 (Arresto)</strong> blocca lo sviluppo: il bagno acido
          neutralizza il rivelatore rimasto sull'emulsione, altrimenti lo sviluppo
          continuerebbe fuori vasca. Anche questa va dondolata.
        </p>
      )
    },
    {
      n: 5,
      title: 'Fissaggio, lavaggio ed export',
      body: (
        <>
          La <strong>vasca 3 (Fissaggio)</strong> rende l'immagine permanente
          sciogliendo gli alogenuri non esposti — senza questo passaggio la lastra
          annerisce alla luce. Poi «Lava &amp; Asciuga» e la stampa è pronta.
          <ul className="mt-1.5 space-y-1 list-disc list-inside text-[10.5px]">
            <li><strong>Ispeziona</strong> o clicca la lastra per vederla a schermo intero.</li>
            <li>Il <strong>cestino</strong> butta la lastra e carica un foglio nuovo.</li>
            <li><strong>Esporta stampa master</strong> salva il risultato finale.</li>
          </ul>
        </>
      )
    }
  ];

  return (
    <div className="w-80 shrink-0 bg-black/60 border-l border-amber-950/60 overflow-y-auto scrollbar-thin p-5 space-y-4 text-xs">
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="font-mono text-amber-400 font-bold tracking-wider text-[11px] block">
            GUIDA AL LABORATORIO
          </span>
          <p className="text-[10.5px] text-neutral-500 mt-0.5">Passo {step} di 5</p>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white"
          title="Chiudi la guida"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Progress rail */}
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <div
            key={n}
            className={`h-1 flex-1 rounded-full ${
              n <= step ? 'bg-amber-400' : 'bg-neutral-800'
            }`}
          />
        ))}
      </div>

      {/* Current step, expanded */}
      {steps
        .filter((s) => s.n === step)
        .map((s) => (
          <div key={s.n} className="bg-neutral-950/80 border border-amber-900/50 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-400 text-neutral-950 font-bold text-[10px] flex items-center justify-center shrink-0">
                {s.n}
              </span>
              <span className="text-white font-semibold text-[12.5px]">{s.title}</span>
            </div>
            <div className="text-neutral-300 leading-relaxed text-[11px]">{s.body}</div>
            {((step === 1 && activeSide !== 'projection') ||
              (step === 2 && activeSide !== 'projection' && !hasExposure) ||
              (step >= 3 && step <= 5 && activeSide !== 'chemistry')) && (
              <button
                onClick={() => onGoToSide(step >= 3 && step <= 5 ? 'chemistry' : 'projection')}
                className="w-full mt-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] font-mono flex items-center justify-center gap-1.5"
              >
                Vai al lato {step >= 3 && step <= 5 ? 'Chimica' : 'Proiezione'}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}

      {/* Live state readout, so the user sees the numbers change as they work */}
      <div className="bg-neutral-950/80 border border-neutral-800/80 rounded-xl p-4 space-y-2">
        <span className="font-mono text-[10px] text-neutral-400 uppercase tracking-wider block">
          Stato attuale
        </span>
        <div className="grid grid-cols-2 gap-y-1 font-mono text-[10.5px]">
          <span className="text-neutral-500">Modalità</span>
          <span className="text-white text-right">{isColorMode ? 'Colore C-41' : 'B&N multigrade'}</span>
          <span className="text-neutral-500">Grado</span>
          <span className="text-white text-right">{selectedGrade === 'custom' ? 'custom' : `G${selectedGrade}`}</span>
          <span className="text-neutral-500">Diaframma</span>
          <span className="text-white text-right">f/{aperture}</span>
          <span className="text-neutral-500">Esposizione</span>
          <span className={hasExposure ? 'text-amber-400 text-right' : 'text-neutral-600 text-right'}>
            {exposureHistorySeconds.toFixed(1)}s
          </span>
          <span className="text-neutral-500">Filtri</span>
          <span className="text-white text-right">
            {filtrationMoved ? `Y${yellowFilter} M${magentaFilter} C${cyanFilter}` : 'neutri'}
          </span>
          <span className="text-neutral-500">Lastra</span>
          <span className="text-white text-right uppercase">{devStage}</span>
        </div>
      </div>

      {/* "What just changed" — reacts to the last control the user touched */}
      {lastAction && ACTION_FEEDBACK[lastAction.id] && (
        <div
          className={`rounded-xl border p-3.5 space-y-1 ${TONE_COLOUR[ACTION_FEEDBACK[lastAction.id].tone]}`}
        >
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span className="font-mono text-[10px] uppercase tracking-wider">
              Hai appena mosso: {ACTION_FEEDBACK[lastAction.id].label}
            </span>
          </div>
          <p className="text-neutral-300 text-[11px] leading-relaxed">
            {ACTION_FEEDBACK[lastAction.id].effect}
          </p>
        </div>
      )}

      {/* Remaining steps, collapsed */}
      <div className="space-y-1.5">
        <span className="font-mono text-[10px] text-neutral-500 uppercase tracking-wider block">
          Prossimi passi
        </span>
        {steps
          .filter((s) => s.n > step)
          .map((s) => (
            <div key={s.n} className="flex items-center gap-2 text-[11px] text-neutral-500">
              <span className="w-4 h-4 rounded-full border border-neutral-800 text-neutral-600 text-[9px] flex items-center justify-center shrink-0">
                {s.n}
              </span>
              <span>{s.title}</span>
            </div>
          ))}
        {step === 5 && (
          <p className="text-[10.5px] text-emerald-400">Processo completato — esporta o butta la lastra per ricominciare.</p>
        )}
      </div>

      {filtrationMoved && !isColorMode && (
        <div className="text-[10px] text-neutral-500 leading-relaxed border-t border-neutral-900 pt-3">
          Suggerimento: in B&amp;N prova prima il grado, poi regola la densità col
          tempo di esposizione e col diaframma. Filtri e tempo si compensano.
        </div>
      )}
    </div>
  );
};

export const DurstEnlargerMode: React.FC<DurstEnlargerModeProps> = ({ scan, onExit }) => {
  // Durst Enlarger Head Settings (CLS 501 Dichroic Head)
  const [yellowFilter, setYellowFilter] = useState<number>(0); // 0 - 130 (lowers contrast / yellow)
  const [magentaFilter, setMagentaFilter] = useState<number>(0); // 0 - 130 (boosts contrast / magenta)
  const [cyanFilter, setCyanFilter] = useState<number>(0); // 0 - 130 (density / color balance)
  const [selectedGrade, setSelectedGrade] = useState<MultigradeGrade>('2');
  
  // Optical adjustments
  const [aperture, setAperture] = useState<number>(8); // f/2.8, 4, 5.6, 8, 11, 16
  const [columnHeight, setColumnHeight] = useState<number>(10); // 8x10, 11x14, 16x20 inches
  /**
   * Lens magnification, decoupled from column height. Column height now governs
   * only the print size label and the delivered-light maths; this is the actual
   * projection scale on the easel.
   */
  const [magnification, setMagnification] = useState<number>(1.0); // 0.4 .. 3.0
  /**
   * Focus, modelled as a lens distance offset from the correct position.
   * 0 is critically sharp; drifting away softens the projection. Aperture
   * interacts with it - stopping down widens the depth of focus, so a small
   * error stays acceptable at f/16 and is obvious at f/2.8.
   */
  const [focusOffset, setFocusOffset] = useState<number>(0); // -1 .. 1
  /** Pivot for magnification, as normalized easel coords (the lens axis). */
  const [lensPivot, setLensPivot] = useState<{ x: number; y: number }>({ x: 0.5, y: 0.5 });
  /**
   * Head tilt and shift, in the manner of a perspective-control lens. Tilt
   * angles the optical axis so the projected rectangle becomes a keystone,
   * exactly the geometry correction (or deliberate distortion) a tilting head
   * gives. Shift slides the projection sideways without moving the enlarger.
   */
  const [headTiltX, setHeadTiltX] = useState<number>(0); // -1 .. 1, vertical tilt
  const [headTiltY, setHeadTiltY] = useState<number>(0); // -1 .. 1, horizontal tilt
  const [headShiftX, setHeadShiftX] = useState<number>(0); // -1 .. 1, normalized
  const [headShiftY, setHeadShiftY] = useState<number>(0); // -1 .. 1, normalized
  const [redSafetyFilterSwungIn, setRedSafetyFilterSwungIn] = useState<boolean>(false);
  const [testStripMode, setTestStripMode] = useState<boolean>(false);
  /**
   * Whether a sheet is actually on the easel. Composition and focusing are far
   * easier with no paper in the way, so the head can project onto the bare
   * baseboard; no paper means no exposure is recorded.
   */
  const [hasPaper, setHasPaper] = useState<boolean>(true);
  /**
   * Position of the black card during a test strip, 0..1 across the sheet.
   * Only meaningful while a strip exposure is running.
   */
  const [stripCardPos, setStripCardPos] = useState<number>(0);
  const [isStripRunning, setIsStripRunning] = useState<boolean>(false);
  const [paperType, setPaperType] = useState<PaperType>('ilford-fb-warmtone');
  const [isColorMode, setIsColorMode] = useState<boolean>(scan.settings.filmType === 'color-negative');

  // Interactive Grain Focus Finder (Paterson / Peak Grain Magnifier)
  const [showGrainScope, setShowGrainScope] = useState<boolean>(false);
  const [grainScopePos, setGrainScopePos] = useState<{ x: number; y: number }>({ x: 0.5, y: 0.5 });

  // Dodging & Burning simulation
  const [activeTool, setActiveTool] = useState<'none' | 'dodge' | 'burn' | 'pivot'>('none');
  const [dodgeBurnZones, setDodgeBurnZones] = useState<DodgeBurnZone[]>([]);

  // Safelight & Darkroom environment
  const [safelight, setSafelight] = useState<SafelightMode>('red');
  const [isPaperFogged, setIsPaperFogged] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  
  // Timer & Exposure state
  const [timerDuration, setTimerDuration] = useState<number>(6.5); // seconds
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isLampOn, setIsLampOn] = useState<boolean>(false);
  /**
   * The enlarger lamp held on by hand, with the timer idle. This is how you
   * light the negative up to compose and focus; it never records exposure.
   */
  const [isLampManualOn, setIsLampManualOn] = useState<boolean>(false);
  const [exposureHistorySeconds, setExposureHistorySeconds] = useState<number>(0);

  // Developing Tray Simulation (Wet Bench)
  const [devStage, setDevStage] = useState<DevelopingStage>('unexposed');
  const [devTimeSeconds, setDevTimeSeconds] = useState<number>(0);
  const [agitationRipples, setAgitationRipples] = useState<number>(0);

  // Export State
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // View state: the darkroom has two stations. The projection side is the
  // enlarger and easel; the chemistry side is the wet bench where the exposed
  // sheet is developed, stopped and fixed.
  const [activeSide, setActiveSide] = useState<'projection' | 'chemistry'>('projection');
  /** Full-screen loupe view of the developed sheet. */
  const [isInspecting, setIsInspecting] = useState<boolean>(false);
  /**
   * Snapshot of the developed sheet, captured from the wet-bench canvas when
   * the user opens the full-screen loupe. Keeps the loupe independent of the
   * tray canvas, which shares the same drawing routine.
   */
  const [inspectionSnapshot, setInspectionSnapshot] = useState<string | null>(null);
  /** Guided walkthrough sidebar. On by default so nobody faces a blank easel. */
  const [showTutorial, setShowTutorial] = useState<boolean>(true);
  /**
   * Last control the user touched, and when. Lets the guide say what just
   * changed and what it does to the print, without the user having to guess.
   */
  const [lastAction, setLastAction] = useState<{ id: string; at: number } | null>(null);
  const noteAction = useCallback((id: string) => {
    setLastAction({ id, at: Date.now() });
  }, []);

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
    // Only a sheet actually sitting on the easel can be fogged: with no paper
    // loaded, white inspection light has nothing to ruin.
    if (hasPaper && safelight === 'white' && devStage !== 'fixed' && devStage !== 'finished') {
      // If paper is out of black box under white room light before fixing, it fogs!
      setIsPaperFogged(true);
      playSound('fog-alarm');
    }
  }, [safelight, devStage, hasPaper, playSound]);

  // Durst Dichroic mixing head filters for Multigrade paper
  const applyMultigradeGrade = (grade: MultigradeGrade) => {
    setSelectedGrade(grade);
    noteAction('grade');
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
    setIsLampManualOn(false);
    setIsLampOn(true);
    setTimeRemaining(timerDuration);
    playSound('relay-on');
    noteAction('exposure');

    const interval = 100; // 100ms ticks
    let elapsed = 0;
    const totalMs = timerDuration * 1000;

    // A test strip sweeps a black card across the sheet in five bands. The card
    // starts fully covering the paper and is drawn back one band at a time, so
    // the user sees exactly which band is being exposed at each moment.
    if (testStripMode) {
      setIsStripRunning(true);
      setStripCardPos(0);
    }

    const timerInterval = setInterval(() => {
      elapsed += interval;
      const left = Math.max(0, (totalMs - elapsed) / 1000);
      setTimeRemaining(Number(left.toFixed(1)));

      // Drive the card across the five bands, mirroring the elapsed time.
      if (testStripMode) {
        setStripCardPos(Math.min(1, elapsed / totalMs));
      }

      if (Math.floor(elapsed / 1000) !== Math.floor((elapsed - interval) / 1000)) {
        playSound('tick');
      }

      if (elapsed >= totalMs) {
        clearInterval(timerInterval);
        setIsLampOn(false);
        setIsStripRunning(false);
        setStripCardPos(0);
        playSound('relay-off');
        playSound('beep');
        
        // If red filter was NOT swung in, the paper received photographic actinic light!
        if (!redSafetyFilterSwungIn && hasPaper) {
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

  /**
   * Move the sheet into the next tray. The darkroom has a fixed 3-tray order
   * (developer -> stop -> fix), so this advances along it and refuses to jump.
   */
  const advanceTray = () => {
    if (devStage === 'unexposed') {
      if (exposureHistorySeconds === 0) return;
      setDevStage('developing');
      setDevTimeSeconds(0);
      playSound('slosh');
      return;
    }
    if (devStage === 'exposed') {
      setDevStage('developing');
      setDevTimeSeconds(0);
      playSound('slosh');
      return;
    }
    if (devStage === 'developing') {
      setDevStage('stopped');
      playSound('slosh');
      return;
    }
    if (devStage === 'stopped') {
      setDevStage('fixed');
      playSound('slosh');
      return;
    }
    if (devStage === 'fixed') {
      setDevStage('finished');
      playSound('beep');
    }
  };

  /** Dump the sheet in the bin and pull a fresh, unexposed one from the box. */
  const handleTrashPaper = () => {
    setExposureHistorySeconds(0);
    setDevStage('unexposed');
    setDevTimeSeconds(0);
    setIsPaperFogged(false);
    setIsInspecting(false);
    setInspectionSnapshot(null);
    setHasPaper(true);
    playSound('slosh');
  };

  /** Rock a specific tray. Agitation only speeds development, but every bath reacts. */
  const handleRockTank = (tank: 'developer' | 'stop' | 'fix') => {
    setAgitationRipples(prev => prev + 1);
    playSound('slosh');
    noteAction('agitate');
    if (tank === 'developer' && devStage === 'developing') {
      setDevTimeSeconds(prev => Math.min(60, prev + 2));
    }
  };

  /**
   * Open the full-screen loupe. The tray canvas is snapshotted here so the
   * loupe shows the exact sheet that is on the bench right now, and stays
   * valid even if the chemistry keeps ticking behind it.
   */
  const openInspection = () => {
    const canvas = paperCanvasRef.current;
    if (canvas) {
      try {
        setInspectionSnapshot(canvas.toDataURL('image/png'));
      } catch {
        setInspectionSnapshot(null);
      }
    }
    setIsInspecting(true);
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

    // Placing the lens axis: magnification pivots around this point, so the
    // user can choose which part of the frame to enlarge into.
    if (activeTool === 'pivot') {
      setLensPivot({ x, y });
      setActiveTool('none');
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

    // The lamp lights the easel either because the timer is running or because
    // the user is holding it on by hand to compose. Only the timer records
    // exposure; the manual switch is purely for looking.
    const lampIlluminating = isLampOn || isLampManualOn;

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

      // With no sheet on the easel the baseboard itself is showing: a dark
      // matte surface, so composition and focusing can be checked without
      // committing (or wasting) a sheet of paper.
      if (!hasPaper) paperBaseColor = '#2a2a2e';

      // Draw paper base in easel (or the bare baseboard when no paper is loaded)
      ctx.fillStyle = paperBaseColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Easel black borders (4-bladed Saunders darkroom easel)
      ctx.fillStyle = '#18181b';
      ctx.fillRect(0, 0, canvas.width, 32);
      ctx.fillRect(0, canvas.height - 32, canvas.width, 32);
      ctx.fillRect(0, 0, 32, canvas.height);
      ctx.fillRect(canvas.width - 32, 0, 32, canvas.height);

      // Paper grain texture (only where there is actually paper)
      if (hasPaper) {
        ctx.fillStyle = 'rgba(0,0,0,0.02)';
        for (let i = 0; i < 400; i++) {
          ctx.fillRect(
            32 + Math.random() * (canvas.width - 64),
            32 + Math.random() * (canvas.height - 64),
            1.5,
            1.5
          );
        }
      }

      const printWidth = canvas.width - 64;
      const printHeight = canvas.height - 64;

      /**
       * The easel shows the projected NEGATIVE, not a finished positive.
       *
       * A real enlarger throws the film's own image onto the paper: an orange-
       * masked, inverted-looking frame. The dichroic head sits in the light path
       * BEFORE the negative, so its CMY dials attenuate the projection light,
       * not the image. Previously this loop inverted the negative into a
       * positive and then multiplied the CMY dials into it, which showed a
       * finished print under the lamp and made the filter simulation
       * meaningless - the filters appeared to tint the picture instead of
       * controlling how much blue/green/red light reached the paper.
       *
       * Here the buffer stays a negative. Filtration is applied as subtractive
       * light loss: Yellow removes blue, Magenta removes green, Cyan removes
       * red. For B&W the filtration mainly changes contrast (the paper can only
       * respond to blue/green), which is what the multigrade head actually does.
       */
      const offCanvas = document.createElement('canvas');
      offCanvas.width = printWidth;
      offCanvas.height = printHeight;
      const offCtx = offCanvas.getContext('2d');
      if (!offCtx) return;

      offCtx.drawImage(img, 0, 0, printWidth, printHeight);
      const imgData = offCtx.getImageData(0, 0, printWidth, printHeight);
      const data = imgData.data;

      // Subtractive transmission of the dichroic filters, per channel. 130 is
      // full dial; at that point the channel is heavily but not totally cut,
      // which is how a real dichroic head behaves.
      const transmR = Math.max(0.05, 1.0 - cyanFilter / 150);
      const transmG = Math.max(0.05, 1.0 - magentaFilter / 150);
      const transmB = Math.max(0.05, 1.0 - yellowFilter / 150);

      for (let i = 0; i < data.length; i += 4) {
        let r = data[i] / 255.0;
        let g = data[i + 1] / 255.0;
        let b = data[i + 2] / 255.0;

        if (isColorMode) {
          // Colour negative: keep the negative, dim it by the filter pack. The
          // orange mask deliberately stays visible - that mask is exactly what
          // the CMY dials exist to cancel during printing.
          r *= transmR;
          g *= transmG;
          b *= transmB;
        } else {
          // B&W negative: silver density is not a colour, so the filters act as
          // overall light loss with a slight contrast shift from the
          // yellow/magenta balance.
          const filtFactor = (transmR + transmG + transmB) / 3;
          const density = (0.299 * r + 0.587 * g + 0.114 * b) * filtFactor;
          r = density;
          g = density;
          b = density;

          // Test strip: stepped exposure across the sheet, shown as uneven
          // projected brightness - the five bands a test strip uses.
          if (testStripMode) {
            const pixelX = (i / 4) % printWidth;
            const stripIndex = Math.floor((pixelX / printWidth) * 5);
            const stripMult = [0.25, 0.55, 1.0, 1.6, 2.5][stripIndex];
            r = Math.min(1.0, r * stripMult);
            g = Math.min(1.0, g * stripMult);
            b = Math.min(1.0, b * stripMult);
          }
        }

        // The negative modulates the lamp: bright negative areas pass more
        // light.
        data[i] = Math.round(Math.min(1, r) * 255);
        data[i + 1] = Math.round(Math.min(1, g) * 255);
        data[i + 2] = Math.round(Math.min(1, b) * 255);
        data[i + 3] = 255;
      }
      offCtx.putImageData(imgData, 0, 0);

      /**
       * Depth of focus: a real lens has a tolerance, and stopping down widens
       * it. At f/2.8 any error is visible; at f/16 the same error is tolerable.
       * This is what makes focus a real control the user can "mess up".
       */
      const focusTolerance = 0.12 * (aperture / 8);
      const defocus = Math.max(
        0,
        (Math.abs(focusOffset) - focusTolerance) / Math.max(0.01, 1 - focusTolerance)
      );
      // Blur radius in display pixels. Bounded so a fully defocused frame stays
      // legible enough to compose and refocus.
      const blurPx = Math.round(defocus * 14);

      // Draw the projected negative through the lens: magnified about the pivot,
      // shifted, tilted (keystone) and optionally softened by defocus.
      const drawProjection = () => {
        ctx.save();
        // Clip to the paper area so magnification crops at the easel blades,
        // exactly as an enlarger's projected field is cropped by the easel.
        ctx.beginPath();
        ctx.rect(32, 32, printWidth, printHeight);
        ctx.clip();

        if (blurPx > 0) {
          ctx.filter = `blur(${blurPx}px)`;
        }

        // Magnify about the pivot: scale, then shift so the pivot stays put.
        const px = 32 + lensPivot.x * printWidth;
        const py = 32 + lensPivot.y * printHeight;
        ctx.translate(px, py);
        ctx.scale(magnification, magnification);
        ctx.translate(-px, -py);

        // Head shift: slides the whole projection across the baseboard.
        ctx.translate(headShiftX * printWidth * 0.5, headShiftY * printHeight * 0.5);

        const tiltActive = Math.abs(headTiltX) > 0.001 || Math.abs(headTiltY) > 0.001;

        if (!tiltActive) {
          ctx.drawImage(offCanvas, 32, 32);
        } else {
          /**
           * Keystone from a tilted head. Canvas 2D has no perspective matrix,
           * so the projection is drawn as a stack of horizontal slices whose
           * width varies with their height (a trapezoid). Vertical tilt makes
           * the near edge wider; horizontal tilt skews the rows sideways,
           * giving the same geometry a tilting lens produces.
           */
          const slices = 40;
          const sliceH = printHeight / slices;
          for (let s = 0; s < slices; s++) {
            const v = s / (slices - 1); // 0 at top, 1 at bottom
            // Vertical tilt: rows near one edge scale up.
            const verticalScale = 1 + headTiltX * 0.35 * (v - 0.5) * 2;
            // Horizontal tilt: rows shear sideways.
            const shearX = headTiltY * 0.35 * (v - 0.5) * 2 * printWidth;
            const srcSliceH = printHeight / slices + 1;
            const destW = printWidth * verticalScale;

            ctx.drawImage(
              offCanvas,
              0,
              s * srcSliceH,
              printWidth,
              srcSliceH,
              32 + (printWidth - destW) / 2 + shearX,
              32 + s * sliceH,
              destW,
              sliceH + 1
            );
          }
        }

        ctx.filter = 'none';
        ctx.restore();
      };

      // Projection light simulation
      if (lampIlluminating) {
        // Enlarger Lamp illuminated
        if (redSafetyFilterSwungIn) {
          // Cast deep ruby red non-actinic safety light
          drawProjection();
          ctx.fillStyle = 'rgba(239, 68, 68, 0.75)';
          ctx.fillRect(32, 32, printWidth, printHeight);
        } else {
          // Projected negative under the lamp. The dichroic pack is already in
          // the pixel math above; this is just the lamp's own warm cast.
          drawProjection();
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

      // Test-strip black card. A real test strip is made by holding a card over
      // the sheet and drawing it back a band at a time, so each band gets a
      // different slice of the total time. Here the card covers the bands not
      // yet uncovered, and the band being exposed right now is called out with
      // the seconds it is receiving.
      if (testStripMode && isStripRunning) {
        const bands = 5;
        const bandW = printWidth / bands;
        // How many whole bands have been uncovered so far, plus the fraction of
        // the current one. The card's right edge sits here.
        const uncovered = stripCardPos * bands;

        // Darkness over the still-covered bands.
        ctx.fillStyle = 'rgba(3, 3, 5, 0.94)';
        const coveredFrom = uncovered * bandW;
        if (coveredFrom < printWidth) {
          ctx.fillRect(32 + coveredFrom, 32, printWidth - coveredFrom, printHeight);
        }

        // The card itself, with a highlight edge so it reads as a physical card.
        const edgeX = 32 + uncovered * bandW;
        const cardH = printHeight + 24;
        ctx.fillStyle = '#0a0a0c';
        ctx.fillRect(edgeX, 32 - 12, printWidth - uncovered * bandW + bandW, cardH);
        ctx.fillStyle = 'rgba(120, 120, 130, 0.9)';
        ctx.fillRect(edgeX, 32 - 12, 2, cardH);
        ctx.fillStyle = 'rgba(200, 200, 210, 0.7)';
        ctx.font = '9px monospace';
        ctx.fillText('CARTONCINO NERO', edgeX + 6, 32 - 2);

        // Band dividers and per-band time labels. Drawn over the card so every
        // band's timing stays legible while the strip is being made.
        ctx.font = '10px monospace';
        for (let b = 0; b < bands; b++) {
          const bx = 32 + b * bandW;
          const bandDone = uncovered >= b + 1;
          const bandNow = !bandDone && uncovered > b;

          // Divider
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(bx, 32);
          ctx.lineTo(bx, 32 + printHeight);
          ctx.stroke();

          // Each band's slice of the total exposure. This is the number the user
          // needs: what that band will have actually received.
          const bandSeconds = (timerDuration / bands) * (b + 1);
          ctx.fillStyle = bandDone
            ? 'rgba(52, 211, 153, 0.95)'
            : bandNow
              ? 'rgba(251, 191, 36, 1)'
              : 'rgba(148, 163, 184, 0.6)';
          const label = `${bandSeconds.toFixed(1)}s`;
          ctx.fillText(label, bx + bandW / 2 - ctx.measureText(label).width / 2, 32 + printHeight - 10);
          // Small band number at the top of each column.
          const bn = `${b + 1}`;
          ctx.fillText(bn, bx + bandW / 2 - ctx.measureText(bn).width / 2, 46);
        }

        // Live banner: which band is being exposed and for how long.
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(32, 32, 240, 22);
        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 11px monospace';
        const nowBand = Math.min(bands - 1, Math.floor(uncovered));
        ctx.fillText(
          `BANDA ${nowBand + 1}/5 · ${(timerDuration / bands * (nowBand + 1)).toFixed(1)}s`,
          40,
          47
        );
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

      // Lens axis marker: the point magnification pivots around. Only shown
      // while placing it, so it does not clutter the composed frame.
      if (activeTool === 'pivot') {
        const px = 32 + lensPivot.x * printWidth;
        const py = 32 + lensPivot.y * printHeight;
        ctx.beginPath();
        ctx.arc(px, py, 12, 0, Math.PI * 2);
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(px - 20, py);
        ctx.lineTo(px + 20, py);
        ctx.moveTo(px, py - 20);
        ctx.lineTo(px, py + 20);
        ctx.stroke();
        ctx.fillStyle = '#fbbf24';
        ctx.font = '10px monospace';
        ctx.fillText('ASSE LENTE', px + 16, py - 14);
      }

      // Render Paterson Grain Focus Finder Loupe if active
      if (showGrainScope) {
        const gx = 32 + grainScopePos.x * printWidth;
        const gy = 32 + grainScopePos.y * printHeight;
        const loupeR = 48;

        // Magnified patch of the projected negative under the loupe. A real
        // finder shows image structure plus grain, not a blank disc, so the
        // patch is sampled from the same buffer the easel draws.
        ctx.save();
        ctx.beginPath();
        ctx.arc(gx, gy, loupeR, 0, Math.PI * 2);
        ctx.clip();
        const zoom = 8;
        ctx.drawImage(
          offCanvas,
          gx - 32 - (loupeR * 2) / zoom / 2,
          gy - 32 - (loupeR * 2) / zoom / 2,
          (loupeR * 2) / zoom,
          (loupeR * 2) / zoom,
          gx - loupeR,
          gy - loupeR,
          loupeR * 2,
          loupeR * 2
        );
        ctx.restore();

        // Grain field. Deliberately deterministic: the same point always shows
        // the same grain, otherwise the field twinkles and you cannot judge
        // focus at all. Each particle's size and alpha come from a hash of its
        // index, and sharpness follows the lens, so the grain snaps into
        // definition only at critical focus.
        const withinTolerance = Math.abs(focusOffset) <= focusTolerance;
        const grainSharpness = withinTolerance
          ? 1
          : Math.max(0.45, 1 - Math.min(1, Math.abs(focusOffset) / 1.0) * 0.55);

        ctx.save();
        ctx.beginPath();
        ctx.arc(gx, gy, loupeR, 0, Math.PI * 2);
        ctx.clip();

        // Hash-based pseudo random, stable for a given position and particle.
        const hash = (n: number) => {
          const s = Math.sin(n * 12.9898 + grainScopePos.x * 78.233 + grainScopePos.y * 37.719) * 43758.5453;
          return s - Math.floor(s);
        };

        // Defocused grain spreads into a soft blur; sharp grain is a crisp dot.
        const grainBlur = Math.max(0, (1 - grainSharpness) * 2.4);
        const dots = 220;
        for (let p = 0; p < dots; p++) {
          const a = hash(p * 3.1) * Math.PI * 2;
          const r = Math.sqrt(hash(p * 7.7)) * (loupeR - 6);
          const px = gx + Math.cos(a) * r;
          const py = gy + Math.sin(a) * r;
          const size = 0.9 + hash(p * 5.3) * 1.6;
          const alpha = (0.35 + hash(p * 9.9) * 0.5) * grainSharpness;

          ctx.fillStyle = `rgba(255, 255, 255, ${alpha.toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(px, py, size + grainBlur, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();

        // Angular graticule, like the etched reticle in a Paterson finder.
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(gx - loupeR, gy);
        ctx.lineTo(gx - loupeR + 16, gy);
        ctx.moveTo(gx + loupeR - 16, gy);
        ctx.lineTo(gx + loupeR, gy);
        ctx.moveTo(gx, gy - loupeR);
        ctx.lineTo(gx, gy - loupeR + 16);
        ctx.moveTo(gx, gy + loupeR - 16);
        ctx.lineTo(gx, gy + loupeR);
        ctx.stroke();

        // Lens barrel rim
        ctx.beginPath();
        ctx.arc(gx, gy, loupeR, 0, Math.PI * 2);
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 4;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(gx, gy, loupeR - 2, 0, Math.PI * 2);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Focus verdict, read off the actual bellows position.
        ctx.fillStyle = withinTolerance ? 'rgba(52, 211, 153, 0.95)' : 'rgba(251, 191, 36, 0.95)';
        ctx.font = '9px monospace';
        const verdict = withinTolerance
          ? 'GRAIN CRITICAL'
          : focusOffset > 0
            ? 'GRAIN SOFT · BACK'
            : 'GRAIN SOFT · FRONT';
        ctx.fillText(verdict, gx - ctx.measureText(verdict).width / 2, gy + loupeR + 14);

        // Aperture hint: wide stops leave little depth of focus to find it in.
        ctx.fillStyle = 'rgba(148, 163, 184, 0.8)';
        ctx.font = '8px monospace';
        const hint = `f/${aperture} · ${magnification.toFixed(2)}x`;
        ctx.fillText(hint, gx - ctx.measureText(hint).width / 2, gy + loupeR + 25);
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
    magnification,
    focusOffset,
    lensPivot,
    activeTool,
    testStripMode,
    isColorMode,
    paperType,
    showGrainScope,
    grainScopePos,
    dodgeBurnZones,
    headTiltX,
    headTiltY,
    headShiftX,
    headShiftY,
    hasPaper,
    stripCardPos,
    isStripRunning,
    isLampManualOn
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

    // Liquid ripple and chemical color. The sheet is drawn as it sits in the
    // current bath, so the liquid matches whichever tank is active.
    let liquidColor = 'rgba(217, 119, 6, 0.22)'; // Amber developer
    if (devStage === 'stopped') liquidColor = 'rgba(234, 179, 8, 0.22)'; // Yellowish stop bath
    if (devStage === 'fixed' || devStage === 'finished') liquidColor = 'rgba(59, 130, 246, 0.18)'; // Blue-clear fixer

    ctx.fillStyle = liquidColor;
    ctx.fillRect(12, 12, canvas.width - 24, canvas.height - 24);

    // Agitation ripples. Each rock of a tank bumps `agitationRipples`, so the
    // surface shows a few seconds of movement rather than a static bath.
    if (agitationRipples > 0) {
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

            // Density above the mask becomes print density (a positive). The
            // mask itself is neutralised by the same dichroic transmission the
            // lamp applies, so the CMY dials correct the orange cast the way
            // they do on a real colour head - including cyan, which previously
            // had no effect on the print at all.
            const transmR = Math.max(0.05, 1.0 - cyanFilter / 150);
            const transmG = Math.max(0.05, 1.0 - magentaFilter / 150);
            const transmB = Math.max(0.05, 1.0 - yellowFilter / 150);

            let posR = 1.0 - (r / baseR) / transmR;
            let posG = 1.0 - (g / baseG) / transmG;
            let posB = 1.0 - (b / baseB) / transmB;

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
    cyanFilter,
    magentaFilter, 
    yellowFilter, 
    isColorMode, 
    paperType, 
    agitationRipples, 
    isPaperFogged,
    // The tray canvas only exists on the chemistry side, so re-render when the
    // user switches over to it, otherwise the freshly mounted canvas stays blank.
    activeSide
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

          // Same dichroic transmission as the lamp and the tray, so the
          // exported print reproduces exactly what was composed on the easel.
          const transmR = Math.max(0.05, 1.0 - cyanFilter / 150);
          const transmG = Math.max(0.05, 1.0 - magentaFilter / 150);
          const transmB = Math.max(0.05, 1.0 - yellowFilter / 150);

          let posR = 1.0 - (r / baseR) / transmR;
          let posG = 1.0 - (g / baseG) / transmG;
          let posB = 1.0 - (b / baseB) / transmB;

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
          {/* Tutorial toggle */}
          <button
            onClick={() => setShowTutorial(!showTutorial)}
            className={`px-2.5 py-1.5 rounded text-xs font-mono flex items-center gap-1.5 transition-colors border ${
              showTutorial
                ? 'bg-amber-400 text-neutral-950 font-bold border-amber-400'
                : 'bg-black/60 border-neutral-800 text-neutral-400 hover:text-white'
            }`}
            title="Mostra o nascondi la guida passo passo"
          >
            <HelpCircle className="w-4 h-4" />
            Guida
          </button>

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
        {/* Left Column: Durst Dichroic Mixing Head Controls (projection side only) */}
        <div className={`${activeSide === 'projection' ? 'w-88' : 'hidden'} bg-black/50 border-r border-red-950/60 p-5 overflow-y-auto space-y-5 scrollbar-thin text-xs`}>
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
                onClick={() => { setIsColorMode(false); noteAction('colorMode'); }}
                className={`flex-1 py-1 rounded text-[10.5px] font-mono transition-colors ${
                  !isColorMode ? 'bg-amber-400 text-neutral-950 font-bold' : 'text-neutral-400 hover:text-white'
                }`}
              >
                Multigrade B&amp;W
              </button>
              <button
                onClick={() => { setIsColorMode(true); noteAction('colorMode'); }}
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
                  const v = parseInt(e.target.value);
                  noteAction(v >= yellowFilter ? 'yellowUp' : 'yellowDown');
                  setYellowFilter(v);
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
                  const v = parseInt(e.target.value);
                  noteAction(v >= magentaFilter ? 'magentaUp' : 'magentaDown');
                  setMagentaFilter(v);
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
                  const v = parseInt(e.target.value);
                  noteAction(v >= cyanFilter ? 'cyanUp' : 'cyanDown');
                  setCyanFilter(v);
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

            {/* Load / remove the sheet. Composition and focusing are easier on a
                bare baseboard, and there is no point wasting paper to do it. */}
            <div className="flex items-center justify-between pb-1 border-b border-neutral-850">
              <div>
                <div className="font-semibold text-white text-[11px]">Carta sull'easel</div>
                <div className="text-[10px] text-neutral-400">
                  {hasPaper ? 'Foglio caricato' : 'Baseboard nudo — solo composizione'}
                </div>
              </div>
              <button
                onClick={() => {
                  // Pulling the sheet off the easel takes any fogging with it;
                  // a fresh sheet comes out of the black box clean.
                  setHasPaper(!hasPaper);
                  setIsPaperFogged(false);
                  noteAction('paperLoad');
                }}
                className={`px-3 py-1 rounded text-[11px] font-mono transition-colors ${
                  hasPaper
                    ? 'bg-emerald-500 text-neutral-950 font-bold shadow'
                    : 'bg-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                {hasPaper ? 'CARICATA' : 'NESSUNA'}
              </button>
            </div>

            <div className={`grid grid-cols-2 gap-1.5 ${hasPaper ? '' : 'opacity-40 pointer-events-none'}`}>
              {[
                { id: 'ilford-fb-warmtone', name: 'Ilford FB Warmtone', desc: 'Baryta Fiber Base' },
                { id: 'ilford-rc-glossy', name: 'Ilford RC Deluxe', desc: 'Pearl Neutral Tone' },
                { id: 'agfa-brovira', name: 'Agfa Brovira Vintage', desc: 'Deep Silver Black' },
                { id: 'kodak-ektacolor', name: 'Kodak Ektacolor Edge', desc: 'Color Paper' }
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => { setPaperType(p.id as PaperType); noteAction('paper'); }}
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
                    onClick={() => { noteAction(f >= aperture ? 'apertureUp' : 'apertureDown'); setAperture(f); }}
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

            {/* Column Height: print size, not magnification. */}
            <div>
              <div className="flex justify-between font-mono text-[11px] mb-1">
                <span className="text-neutral-400">Column Height / Print Size</span>
                <span className="text-white font-mono">{columnHeight}×{Math.round(columnHeight * 1.25)}"</span>
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

            {/* Lens Magnification: the actual projection scale on the easel. */}
            <div>
              <div className="flex justify-between font-mono text-[11px] mb-1">
                <span className="text-neutral-400 flex items-center gap-1.5">
                  <ZoomIn className="w-3.5 h-3.5 text-amber-400" />
                  Lens Magnification
                </span>
                <span className="text-white font-mono">{magnification.toFixed(2)}×</span>
              </div>
              <input
                type="range"
                min="0.4"
                max="3"
                step="0.05"
                value={magnification}
                onChange={(e) => { noteAction('magnify'); setMagnification(parseFloat(e.target.value)); }}
                className="w-full accent-amber-400 h-1.5 bg-neutral-800 rounded"
              />
              <div className="flex justify-between font-mono text-[9.5px] text-neutral-500 mt-0.5">
                <span>0.40× (whole frame)</span>
                <span>3.00× (detail)</span>
              </div>
              <button
                onClick={() => setActiveTool(activeTool === 'pivot' ? 'none' : 'pivot')}
                className={`mt-1.5 w-full py-1 rounded text-[10px] font-mono transition-colors ${
                  activeTool === 'pivot'
                    ? 'bg-amber-400 text-neutral-950 font-bold'
                    : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white'
                }`}
                title="Click the easel to choose the point magnification centres on"
              >
                {activeTool === 'pivot' ? 'Clicca sull\'easel…' : 'Posiziona asse lente'}
              </button>
            </div>

            {/* Focusing: drift away from critical focus to soften the print. */}
            <div>
              <div className="flex justify-between font-mono text-[11px] mb-1">
                <span className="text-neutral-400">Focus (bellows)</span>
                <span
                  className={`font-mono font-bold ${
                    Math.abs(focusOffset) <= 0.12 * (aperture / 8) ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  {Math.abs(focusOffset) <= 0.12 * (aperture / 8)
                    ? 'CRITICAL'
                    : focusOffset > 0
                      ? 'BACK FOCUS'
                      : 'FRONT FOCUS'}
                </span>
              </div>
              <input
                type="range"
                min="-1"
                max="1"
                step="0.01"
                value={focusOffset}
                onChange={(e) => { noteAction('focus'); setFocusOffset(parseFloat(e.target.value)); }}
                className="w-full accent-amber-400 h-1.5 bg-neutral-800 rounded"
              />
              <div className="flex items-center justify-between mt-1">
                <div className="flex justify-between font-mono text-[9.5px] text-neutral-500 flex-1 pr-2">
                  <span>−1.0</span>
                  <span>0 (sharp)</span>
                  <span>+1.0</span>
                </div>
                <button
                  onClick={() => setFocusOffset(0)}
                  className="px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[9.5px] font-mono transition-colors"
                  title="Snap to critical focus"
                >
                  Critico
                </button>
              </div>
              <p className="text-[9.5px] text-neutral-500 mt-1 leading-snug">
                Stopping down to f/16 widens the depth of focus, so small errors stay acceptable.
              </p>
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
                <div className="text-[10px] text-neutral-400">
                  {isStripRunning ? 'Cartoncino in movimento…' : '5 bande · cartoncino nero animato'}
                </div>
              </div>
              <button
                onClick={() => setTestStripMode(!testStripMode)}
                disabled={isStripRunning}
                className={`px-3 py-1 rounded text-[11px] font-mono transition-colors ${
                  testStripMode
                    ? 'bg-amber-400 text-neutral-950 font-bold shadow'
                    : 'bg-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                {testStripMode ? 'ACTIVE' : 'OFF'}
              </button>
            </div>

            {/* Head Tilt & Shift (perspective control) */}
            <div className="pt-2 border-t border-neutral-850 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white text-[11px]">Testa basculante (tilt &amp; shift)</span>
                <button
                  onClick={() => {
                    setHeadTiltX(0); setHeadTiltY(0); setHeadShiftX(0); setHeadShiftY(0);
                    noteAction('headReset');
                  }}
                  className="px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[9.5px] font-mono transition-colors"
                  title="Riporta la testa a zero"
                >
                  Azzera
                </button>
              </div>

              {[
                { label: 'Tilt verticale', value: headTiltX, set: setHeadTiltX, id: 'tiltX' },
                { label: 'Tilt orizzontale', value: headTiltY, set: setHeadTiltY, id: 'tiltY' },
                { label: 'Shift orizzontale', value: headShiftX, set: setHeadShiftX, id: 'shiftX' },
                { label: 'Shift verticale', value: headShiftY, set: setHeadShiftY, id: 'shiftY' }
              ].map((c) => (
                <div key={c.id}>
                  <div className="flex justify-between font-mono text-[10.5px] mb-0.5">
                    <span className="text-neutral-400">{c.label}</span>
                    <span className="text-white font-mono">{c.value.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="-1"
                    max="1"
                    step="0.01"
                    value={c.value}
                    onChange={(e) => { c.set(parseFloat(e.target.value)); noteAction(c.id); }}
                    className="w-full accent-amber-400 h-1.5 bg-neutral-800 rounded"
                  />
                </div>
              ))}
              <p className="text-[9.5px] text-neutral-500 leading-snug">
                Tilt inclina l'asse ottico: la proiezione diventa un trapezio (keystone).
                Shift sposta l'immagine senza muovere la colonna. Componi senza carta per
                vedere bene la geometria.
              </p>
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
                onChange={(e) => { noteAction('timer'); setTimerDuration(parseFloat(e.target.value)); }}
                className="w-full accent-red-500 h-1.5 bg-neutral-800 rounded"
              />
            </div>

            {/* Manual lamp: light the negative to compose and focus, no timer */}
            <button
              onClick={() => { setIsLampManualOn(!isLampManualOn); noteAction('lampManual'); }}
              disabled={isLampOn}
              className={`w-full py-2 rounded-lg font-bold text-[11px] tracking-wider uppercase flex items-center justify-center gap-2 border transition-colors ${
                isLampOn
                  ? 'border-neutral-800 bg-neutral-900 text-neutral-600 cursor-not-allowed'
                  : isLampManualOn
                    ? 'border-amber-400 bg-amber-400/15 text-amber-300'
                    : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-white'
              }`}
            >
              <Lightbulb className="w-4 h-4" />
              <span>
                {isLampManualOn ? 'Lampada accesa (composizione)' : 'Accendi lampada per comporre'}
              </span>
            </button>

            {/* EXPOSE FOOT PEDAL BUTTON */}
            <button
              onClick={triggerExposure}
              disabled={isLampOn || !hasPaper}
              className={`w-full py-3 rounded-lg font-bold text-sm tracking-wider uppercase flex items-center justify-center gap-2 shadow-xl transition-transform active:scale-95 ${
                isLampOn
                  ? 'bg-yellow-400 text-neutral-950 animate-pulse'
                  : !hasPaper
                    ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                    : 'bg-red-600 hover:bg-red-500 text-white cursor-pointer'
              }`}
            >
              <Zap className="w-4 h-4" />
              <span>
                {isLampOn
                  ? 'Enlarger Lamp Active'
                  : !hasPaper
                    ? 'Nessuna carta sull\'easel'
                    : 'Expose Print (Footswitch)'}
              </span>
            </button>
            {!hasPaper && (
              <p className="text-[9.5px] text-neutral-500 text-center leading-snug">
                La baseboard è nuda per comporre: carica un foglio per esporre.
              </p>
            )}
          </div>
        </div>

        {/* Center: Enlarger Projection Paper Easel / Wet Bench */}
        <div className="flex-1 flex flex-col relative overflow-hidden">
          {/* Station toolbar: switch between the enlarger and the wet bench */}
          <div className="flex items-center gap-2 px-6 py-2.5 border-b border-neutral-900 bg-black/40">
            <span className="font-mono text-[10px] text-neutral-500 tracking-wider mr-2">DARKROOM STATION</span>
            <button
              onClick={() => setActiveSide('projection')}
              className={`px-3.5 py-1.5 rounded-lg text-[11px] font-mono flex items-center gap-1.5 transition-colors ${
                activeSide === 'projection'
                  ? 'bg-amber-400 text-neutral-950 font-bold shadow'
                  : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              Proiezione
            </button>
            <ArrowRight className="w-3.5 h-3.5 text-neutral-700" />
            <button
              onClick={() => setActiveSide('chemistry')}
              className={`px-3.5 py-1.5 rounded-lg text-[11px] font-mono flex items-center gap-1.5 transition-colors ${
                activeSide === 'chemistry'
                  ? 'bg-amber-400 text-neutral-950 font-bold shadow'
                  : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              <FlaskConical className="w-3.5 h-3.5" />
              Chimica
            </button>

            <div className="ml-auto flex items-center gap-3 text-[10.5px] font-mono text-neutral-400">
              <span>Exposure: <strong className="text-amber-400">{exposureHistorySeconds.toFixed(1)}s</strong></span>
              <span className="text-neutral-700">·</span>
              <span>f/<strong>{aperture}</strong></span>
              <span className="text-neutral-700">·</span>
              <span>G<strong>{selectedGrade}</strong></span>
              <span className="text-neutral-700">·</span>
              <span className={isPaperFogged ? 'text-red-400' : devStage === 'finished' || devStage === 'fixed' ? 'text-emerald-400' : ''}>
                {isPaperFogged ? 'FOGGED' : `SHEET: ${devStage.toUpperCase()}`}
              </span>
            </div>
          </div>

          {activeSide === 'projection' ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden">
          {/* Light cone beam animation */}
          {(isLampOn || isLampManualOn) && (
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
            <div className="absolute top-2 right-2 flex items-center gap-2">
              {!hasPaper && (
                <div className="px-2.5 py-1 bg-amber-950/90 border border-amber-800 rounded text-[10px] font-mono text-amber-300">
                  NESSUNA CARTA · COMPOSIZIONE
                </div>
              )}
              {isStripRunning && (
                <div className="px-2.5 py-1 bg-amber-400 rounded text-[10px] font-mono text-neutral-950 font-bold animate-pulse">
                  TEST STRIP IN CORSO
                </div>
              )}
              <div className="px-2.5 py-1 bg-black/80 backdrop-blur-xs rounded text-[10px] font-mono text-neutral-300">
                {isLampOn
                  ? (redSafetyFilterSwungIn ? 'RED SAFETY PROJECTION' : 'ACTINIC EXPOSURE')
                  : isLampManualOn
                    ? 'PROJECTION LAMP (COMPOSE)'
                    : hasPaper ? 'PAPER EASEL (STANDBY)' : 'BASEBOARD (STANDBY)'}
              </div>
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

          {/* Send the exposed sheet over to the wet bench */}
          <button
            onClick={() => setActiveSide('chemistry')}
            className="mt-4 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-mono font-bold flex items-center gap-2 transition-colors shadow-lg"
          >
            <FlaskConical className="w-3.5 h-3.5" />
            Esposto → Porta al banco chimico
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          </div>
          ) : (
          <WetBench
            devStage={devStage}
            devTimeSeconds={devTimeSeconds}
            exposureHistorySeconds={exposureHistorySeconds}
            isPaperFogged={isPaperFogged}
            isExporting={isExporting}
            exportNotice={exportNotice}
            paperCanvasRef={paperCanvasRef}
            onAdvanceTray={advanceTray}
            onRockTank={handleRockTank}
            onTrashPaper={handleTrashPaper}
            onInspect={openInspection}
            onExport={handleExportDevelopedPrint}
            onBackToProjection={() => setActiveSide('projection')}
          />
          )}
        </div>

        {/* Right Column: guided walkthrough */}
        {showTutorial && (
          <TutorialPanel
            activeSide={activeSide}
            devStage={devStage}
            isLampOn={isLampOn}
            exposureHistorySeconds={exposureHistorySeconds}
            yellowFilter={yellowFilter}
            magentaFilter={magentaFilter}
            cyanFilter={cyanFilter}
            selectedGrade={selectedGrade}
            aperture={aperture}
            isColorMode={isColorMode}
            lastAction={lastAction}
            onClose={() => setShowTutorial(false)}
            onGoToSide={(side) => setActiveSide(side)}
          />
        )}
      </div>

      {/* Full-screen inspection of the developed sheet */}
      {isInspecting && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-8"
          onClick={() => setIsInspecting(false)}
        >
          <div className="absolute top-4 right-5 flex items-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); handleExportDevelopedPrint(); }}
              disabled={isExporting}
              className="px-3 py-1.5 rounded bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-[11px] font-mono flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              {isExporting ? 'Encoding…' : 'Export'}
            </button>
            <button
              onClick={() => setIsInspecting(false)}
              className="p-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          {inspectionSnapshot && (
            <img
              src={inspectionSnapshot}
              alt="Developed print"
              className="max-w-full max-h-[80vh] w-auto rounded shadow-2xl border border-neutral-800"
              onClick={(e) => e.stopPropagation()}
            />
          )}
          <div className="mt-4 font-mono text-[11px] text-neutral-400">
            {devStage.toUpperCase()} · {paperType} · G{selectedGrade} · f/{aperture} · {exposureHistorySeconds.toFixed(1)}s — click anywhere to close
          </div>
        </div>
      )}
    </div>
  );
};
