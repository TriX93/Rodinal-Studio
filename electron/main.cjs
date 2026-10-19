/**
 * Rodinal Studio - Native Desktop Application Main Process
 * Electron runtime for Windows (x64/arm64), macOS (Apple Silicon/Intel), and Linux.
 */

const { app, BrowserWindow, ipcMain, dialog, Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs');

// 1. Enable Hardware Acceleration & WebGPU support flags
app.commandLine.appendSwitch('enable-unsafe-webgpu');
app.commandLine.appendSwitch('enable-features', 'Vulkan,UseSkiaRenderer');
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('high-dpi-support', '1');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 720,
    backgroundColor: '#08080a',
    title: 'Rodinal Studio - RAW Film Inverter & Archiver',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    }
  });

  // Load Vite dev server if running, or production build
  const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:3000';
  const prodPath = path.join(__dirname, '../dist/index.html');

  if (fs.existsSync(prodPath) && (app.isPackaged || process.env.NODE_ENV === 'production')) {
    mainWindow.loadFile(prodPath);
  } else {
    mainWindow.loadURL(devServerUrl).catch(() => {
      // If dev server not yet responding, try loading static file or reload
      if (fs.existsSync(prodPath)) {
        mainWindow.loadFile(prodPath);
      }
    });
  }

  // Build native application menu for macOS, Windows, and Linux
  const isMac = process.platform === 'darwin';
  const menuTemplate = [
    ...(isMac
      ? [
          {
            label: 'Rodinal Studio',
            submenu: [
              { role: 'about' },
              { type: 'separator' },
              { role: 'services' },
              { type: 'separator' },
              { role: 'hide' },
              { role: 'hideOthers' },
              { role: 'unhide' },
              { type: 'separator' },
              { role: 'quit' }
            ]
          }
        ]
      : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'Open Nikon RAW / Negative...',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            const files = await handleOpenFileDialog();
            if (files && mainWindow) {
              mainWindow.webContents.send('native:filesOpened', files);
            }
          }
        },
        {
          label: 'Export Archival Master (16-Bit TIFF)...',
          accelerator: 'CmdOrCtrl+E',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('native:triggerExportModal');
            }
          }
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Rodinal Studio Documentation',
          click: async () => {
            await shell.openExternal('https://github.com/valerillo93/rodinal-studio');
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Native File Picker Dialog Handler
async function handleOpenFileDialog() {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Nikon RAW Exposure (.NEF) or High-Res Film Scan',
    properties: ['openFile', 'multiSelections'],
    filters: [
      {
        name: 'RAW Film Scans',
        extensions: ['nef', 'nrw', 'dng', 'cr2', 'arw', 'tif', 'tiff', 'jpg', 'jpeg', 'png']
      },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (result.canceled || result.filePaths.length === 0) return null;

  const filePayloads = [];
  for (const filePath of result.filePaths) {
    const buffer = await fs.promises.readFile(filePath);
    const filename = path.basename(filePath);
    filePayloads.push({
      filename,
      filePath,
      size: buffer.length,
      buffer: buffer.buffer
    });
  }
  return filePayloads;
}

// IPC Handlers
ipcMain.handle('dialog:openRawFile', async () => {
  return await handleOpenFileDialog();
});

ipcMain.handle('dialog:saveMasterFile', async (event, { defaultFilename, arrayBuffer }) => {
  if (!mainWindow) return { success: false };
  const ext = path.extname(defaultFilename).slice(1) || 'tiff';

  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Save Archival Master',
    defaultPath: defaultFilename,
    filters: [
      { name: ext.toUpperCase() === 'TIFF' ? 'Archival 16-Bit TIFF' : 'JPEG Image', extensions: [ext] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (result.canceled || !result.filePath) {
    return { success: false, canceled: true };
  }

  const nodeBuffer = Buffer.from(arrayBuffer);
  await fs.promises.writeFile(result.filePath, nodeBuffer);
  return { success: true, filePath: result.filePath };
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
