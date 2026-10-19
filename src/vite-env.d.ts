/// <reference types="vite/client" />

interface NativeFilePayload {
  filename: string;
  filePath: string;
  size: number;
  buffer: ArrayBuffer;
}

interface ElectronAPI {
  isDesktop?: boolean;
  platform?: 'win32' | 'darwin' | 'linux';
  openRawFile?: () => Promise<NativeFilePayload[] | null>;
  saveMasterFile?: (defaultFilename: string, arrayBuffer: ArrayBuffer) => Promise<{ success: boolean; filePath?: string; canceled?: boolean }>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

declare module '*.jpg' {
  const src: string;
  export default src;
}

declare module '*.png' {
  const src: string;
  export default src;
}
