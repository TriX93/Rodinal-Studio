export interface FilmPreset {
  id: string;
  name: string;
  category: 'color-neg' | 'bw-neg' | 'slide';
  manufacturer: 'Kodak' | 'Fujifilm' | 'Ilford' | 'CineStill';
  description: string;
  iso: number;
  grainAmount: number;
  grainSize: number;
  contrast: number;
  saturation: number;
  density: number;
  cyanRed: number;
  magentaGreen: number;
  yellowBlue: number;
  shadowLift: number;
  highlightRecovery: number;
}

export const FILM_PRESETS: FilmPreset[] = [
  {
    id: 'portra400',
    name: 'Kodak Portra 400',
    category: 'color-neg',
    manufacturer: 'Kodak',
    description: 'World-standard portrait film with natural skin tones, smooth micro-contrast, and warm highlight roll-off.',
    iso: 400,
    grainAmount: 18,
    grainSize: 2,
    contrast: 4,
    saturation: 12,
    density: 1.28,
    cyanRed: 8,
    magentaGreen: -3,
    yellowBlue: 6,
    shadowLift: 8,
    highlightRecovery: 12
  },
  {
    id: 'portra160',
    name: 'Kodak Portra 160',
    category: 'color-neg',
    manufacturer: 'Kodak',
    description: 'Exceptionally fine grain with subdued, elegant color saturation and neutral tonality.',
    iso: 160,
    grainAmount: 10,
    grainSize: 1,
    contrast: 2,
    saturation: 5,
    density: 1.22,
    cyanRed: 4,
    magentaGreen: -1,
    yellowBlue: 4,
    shadowLift: 12,
    highlightRecovery: 15
  },
  {
    id: 'gold200',
    name: 'Kodak Gold 200',
    category: 'color-neg',
    manufacturer: 'Kodak',
    description: 'Iconic warm nostalgic emulsion with rich golden yellow-amber undertones and vivid primary colors.',
    iso: 200,
    grainAmount: 26,
    grainSize: 2,
    contrast: 14,
    saturation: 24,
    density: 1.34,
    cyanRed: 12,
    magentaGreen: -6,
    yellowBlue: 18,
    shadowLift: -2,
    highlightRecovery: 6
  },
  {
    id: 'ektar100',
    name: 'Kodak Ektar 100',
    category: 'color-neg',
    manufacturer: 'Kodak',
    description: 'Ultra-vivid color negative film with the world\'s finest grain, ultra-sharp acutance, and intense saturation.',
    iso: 100,
    grainAmount: 6,
    grainSize: 1,
    contrast: 18,
    saturation: 32,
    density: 1.42,
    cyanRed: 6,
    magentaGreen: 2,
    yellowBlue: 10,
    shadowLift: -6,
    highlightRecovery: 4
  },
  {
    id: 'fuji400h',
    name: 'Fujifilm Pro 400H',
    category: 'color-neg',
    manufacturer: 'Fujifilm',
    description: 'Signature Japanese pastel aesthetic with soft cool shadows, delicate magenta highlights, and vibrant greens.',
    iso: 400,
    grainAmount: 16,
    grainSize: 2,
    contrast: -2,
    saturation: 8,
    density: 1.25,
    cyanRed: -8,
    magentaGreen: 10,
    yellowBlue: -6,
    shadowLift: 16,
    highlightRecovery: 14
  },
  {
    id: 'superia400',
    name: 'Fujifilm Superia X-TRA 400',
    category: 'color-neg',
    manufacturer: 'Fujifilm',
    description: '4th color layer emulsion providing accurate fluorescent correction, deep cyan night shadows, and street punch.',
    iso: 400,
    grainAmount: 28,
    grainSize: 2,
    contrast: 16,
    saturation: 18,
    density: 1.36,
    cyanRed: -6,
    magentaGreen: 4,
    yellowBlue: -8,
    shadowLift: 2,
    highlightRecovery: 8
  },
  {
    id: 'cinestill800t',
    name: 'CineStill 800T',
    category: 'color-neg',
    manufacturer: 'CineStill',
    description: 'Remjet-free cinema stock balanced for 3200K tungsten light with iconic red halation in highlights.',
    iso: 800,
    grainAmount: 34,
    grainSize: 3,
    contrast: 12,
    saturation: 15,
    density: 1.30,
    cyanRed: 16,
    magentaGreen: -8,
    yellowBlue: -14,
    shadowLift: 4,
    highlightRecovery: 18
  },
  {
    id: 'trix400',
    name: 'Kodak Tri-X 400',
    category: 'bw-neg',
    manufacturer: 'Kodak',
    description: 'The definitive photojournalism black and white film. Uncompromising contrast, bold grain structure, and deep blacks.',
    iso: 400,
    grainAmount: 42,
    grainSize: 3,
    contrast: 26,
    saturation: 0,
    density: 1.45,
    cyanRed: 0,
    magentaGreen: 0,
    yellowBlue: 0,
    shadowLift: -8,
    highlightRecovery: 6
  },
  {
    id: 'hp5plus',
    name: 'Ilford HP5 Plus',
    category: 'bw-neg',
    manufacturer: 'Ilford',
    description: 'Legendary British silver halide emulsion. Exceptional tonal latitude, gentle highlight roll-off, and medium grain.',
    iso: 400,
    grainAmount: 30,
    grainSize: 2,
    contrast: 10,
    saturation: 0,
    density: 1.30,
    cyanRed: 0,
    magentaGreen: 0,
    yellowBlue: 0,
    shadowLift: 10,
    highlightRecovery: 16
  },
  {
    id: 'acros100',
    name: 'Fujifilm Neopan 100 Acros',
    category: 'bw-neg',
    manufacturer: 'Fujifilm',
    description: 'World\'s highest standard in fine grain and reciprocity characteristics. Ultra-sharp edges and silvery midtones.',
    iso: 100,
    grainAmount: 8,
    grainSize: 1,
    contrast: 18,
    saturation: 0,
    density: 1.38,
    cyanRed: 0,
    magentaGreen: 0,
    yellowBlue: 0,
    shadowLift: 2,
    highlightRecovery: 10
  }
];
