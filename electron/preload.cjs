/**
 * Rodinal Studio - Electron Preload Script
 * Secure IPC bridge between Chromium renderer and native desktop operating system.
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isDesktop: true,
  platform: process.platform, // 'win32' | 'darwin' | 'linux'

  // Open native OS file picker for RAW exposures
  openRawFile: () => ipcRenderer.invoke('dialog:openRawFile'),

  // Save 16-bit TIFF or JPEG master directly to native filesystem
  saveMasterFile: (defaultFilename, arrayBuffer) =>
    ipcRenderer.invoke('dialog:saveMasterFile', { defaultFilename, arrayBuffer })
});
