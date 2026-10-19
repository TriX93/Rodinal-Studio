export type FilmType = 'color-negative' | 'bw-negative' | 'slide-positive';

export interface FilmBaseRGB {
  r: number; // 0.0 - 1.0 (sampled from orange mask)
  g: number;
  b: number;
}

export interface CurvePoint {
  x: number; // 0.0 - 1.0
  y: number; // 0.0 - 1.0
}

export interface ChannelCurves {
  master: CurvePoint[];
  red: CurvePoint[];
  green: CurvePoint[];
  blue: CurvePoint[];
}

export interface InversionSettings {
  filmType: FilmType;
  filmBase: FilmBaseRGB;
  autoBaseDetected: boolean;
  
  // Exposure and Density
  exposureEV: number; // -3.0 to +3.0
  density: number; // 0.5 to 2.5 (slope)
  blackPoint: { r: number; g: number; b: number }; // 0.0 - 0.3
  whitePoint: { r: number; g: number; b: number }; // 0.7 - 1.0
  
  // Color Balance (Photographic lab color wheels)
  cyanRed: number; // -100 to +100
  magentaGreen: number; // -100 to +100
  yellowBlue: number; // -100 to +100
  
  // Tonal controls
  temperature: number; // -50 to +50
  tint: number; // -50 to +50
  shadowLift: number; // -50 to +50
  highlightRecovery: number; // -50 to +50
  contrast: number; // -50 to +50
  saturation: number; // -100 to +100
  
  // Curves
  curves: ChannelCurves;
  
  // Film Emulation
  filmPresetId: string;
  
  // Grain & Sharpening
  grainAmount: number; // 0 - 100
  grainSize: number; // 1 - 5
  grainRoughness: number; // 0 - 100
  sharpeningAmount: number; // 0 - 100
  sharpeningRadius: number; // 0.5 - 3.0
  
  // Inspection & Viewport
  showClipping: boolean;
  splitCompare: boolean;
  splitPosition: number; // 0 - 100 percentage
  rotation: number; // 0, 90, 180, 270
  flipHorizontal: boolean;
  flipVertical: boolean;
}

export interface ArchivalMetadata {
  cameraMake: string;
  cameraModel: string;
  scannerLens: string;
  iso: number;
  exposureTime: string;
  fNumber: string;
  filmStock: string;
  rollId: string;
  frameNumber: string;
  archivist: string;
  scanDate: string;
  notes: string;
}

export interface FilmScanItem {
  id: string;
  filename: string;
  fileSize: number;
  width: number;
  height: number;
  rawType: 'NEF' | 'NRW' | 'DNG' | 'TIFF' | 'SCAN_RGB';
  cfaPattern?: 'RGGB' | 'BGGR' | 'GRBG' | 'GBRG';
  bitsPerSample: number;
  thumbnailUrl: string;
  fullImageUrl: string;
  rawImageData?: ImageData;
  metadata: ArchivalMetadata;
  settings: InversionSettings;
}

export interface HardwareEngineState {
  webgpuSupported: boolean;
  webgpuActive: boolean;
  gpuAdapterName: string;
  wasmSupported: boolean;
  wasmActive: boolean;
  executionMode: 'webgpu' | 'wasm-simd' | 'wasm-canvas';
  renderFps: number;
  processingTimeMs: number;
}

export interface ExportConfiguration {
  format: 'tiff-16bit' | 'jpeg';
  dpi: 300 | 600 | 1200;
  bitDepth: 16 | 8;
  colorSpace: 'AdobeRGB' | 'sRGB' | 'ProPhotoRGB';
  scale: 1.0 | 0.75 | 0.5;
  jpegQuality: number; // 0.85 - 1.0
  includeArchivalExif: boolean;
  batchExport: boolean;
}
