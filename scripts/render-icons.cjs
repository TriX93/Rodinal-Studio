const { app, BrowserWindow, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

// Ensure destination directories exist
const publicDir = path.join(__dirname, '../public');
const buildDir = path.join(__dirname, '../build');
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
if (!fs.existsSync(buildDir)) fs.mkdirSync(buildDir, { recursive: true });

function createIcoFromPngs(pngEntries) {
  const count = pngEntries.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  let offset = headerSize + count * dirEntrySize;

  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // 1 = ICO
  header.writeUInt16LE(count, 4); // Number of images

  const entries = [];
  const buffers = [];

  for (const item of pngEntries) {
    const entry = Buffer.alloc(dirEntrySize);
    const w = item.width >= 256 ? 0 : item.width;
    const h = item.height >= 256 ? 0 : item.height;
    entry.writeUInt8(w, 0);
    entry.writeUInt8(h, 1);
    entry.writeUInt8(0, 2); // Palette
    entry.writeUInt8(0, 3); // Reserved
    entry.writeUInt16LE(1, 4); // Planes
    entry.writeUInt16LE(32, 6); // Bits per pixel
    entry.writeUInt32LE(item.buffer.length, 8); // Size
    entry.writeUInt32LE(offset, 12); // Offset

    entries.push(entry);
    buffers.push(item.buffer);
    offset += item.buffer.length;
  }

  return Buffer.concat([header, ...entries, ...buffers]);
}

app.disableHardwareAcceleration();

app.whenReady().then(async () => {
  try {
    const win = new BrowserWindow({
      width: 512,
      height: 512,
      show: false,
      frame: false,
      transparent: true,
      webPreferences: {
        offscreen: true
      }
    });

    const svgPath = path.join(publicDir, 'icon.svg');
    const svgContent = fs.readFileSync(svgPath, 'utf8');

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            html, body {
              width: 512px;
              height: 512px;
              background: transparent;
              overflow: hidden;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            svg {
              width: 512px;
              height: 512px;
            }
          </style>
        </head>
        <body>
          ${svgContent}
        </body>
      </html>
    `;

    await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

    // Give a brief moment for filters/gradients to render
    await new Promise((resolve) => setTimeout(resolve, 300));

    const masterImage = await win.webContents.capturePage({ x: 0, y: 0, width: 512, height: 512 });

    const png512 = masterImage.toPNG();
    const png256 = masterImage.resize({ width: 256, height: 256, quality: 'best' }).toPNG();
    const png128 = masterImage.resize({ width: 128, height: 128, quality: 'best' }).toPNG();
    const png64 = masterImage.resize({ width: 64, height: 64, quality: 'best' }).toPNG();
    const png48 = masterImage.resize({ width: 48, height: 48, quality: 'best' }).toPNG();
    const png32 = masterImage.resize({ width: 32, height: 32, quality: 'best' }).toPNG();
    const png16 = masterImage.resize({ width: 16, height: 16, quality: 'best' }).toPNG();

    // Write PNG files
    fs.writeFileSync(path.join(publicDir, 'icon.png'), png512);
    fs.writeFileSync(path.join(publicDir, 'icon-32.png'), png32);
    fs.writeFileSync(path.join(buildDir, 'icon.png'), png512);

    // Build multi-resolution ICO file
    const icoBuffer = createIcoFromPngs([
      { width: 256, height: 256, buffer: png256 },
      { width: 128, height: 128, buffer: png128 },
      { width: 64, height: 64, buffer: png64 },
      { width: 48, height: 48, buffer: png48 },
      { width: 32, height: 32, buffer: png32 },
      { width: 16, height: 16, buffer: png16 }
    ]);

    fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuffer);
    fs.writeFileSync(path.join(buildDir, 'icon.ico'), icoBuffer);

    console.log('Successfully generated icons:');
    console.log(' - public/icon.png (512x512)');
    console.log(' - public/icon-32.png (32x32)');
    console.log(' - public/favicon.ico (256, 128, 64, 48, 32, 16)');
    console.log(' - build/icon.png (512x512)');
    console.log(' - build/icon.ico (256, 128, 64, 48, 32, 16)');

    win.destroy();
    app.quit();
  } catch (err) {
    console.error('Failed to generate icons:', err);
    process.exit(1);
  }
});
