/**
 * Rumah Kita — Electron Desktop Application Main Process
 *
 * Wraps the Rumah Kita local-first server inside a native cross-platform
 * desktop window (Windows, macOS, Linux) with strict context isolation,
 * sandbox protection, and automatic local port binding.
 *
 * @module main/electron-main
 * @license MIT
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { HouseholdStore } from '../core/household-store.js';
import { createRumahKitaServer } from '../server/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function bootstrapDesktopApp() {
  let electron;
  try {
    electron = await import('electron');
  } catch {
    console.log(
      '[Rumah Kita] Electron binary not detected in current environment. Falling back to Web Server mode...'
    );
    await import('../server/index.js');
    return;
  }

  const { app, BrowserWindow, shell } = electron.default || electron;

  // Store user data strictly inside isolated OS userData folder (never inside repo)
  const userDataPath = app.getPath('userData');
  const dbFilePath = path.join(userDataPath, 'rumah-kita-store.json');

  const store = new HouseholdStore({ filePath: dbFilePath });
  const { server } = createRumahKitaServer({ store });

  await app.whenReady();

  server.listen(0, '127.0.0.1', () => {
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : 3080;
    const localUrl = `http://127.0.0.1:${port}`;

    const mainWindow = new BrowserWindow({
      width: 1280,
      height: 840,
      minWidth: 960,
      minHeight: 640,
      title: 'Rumah Kita — Smart Home & Household Platform',
      backgroundColor: '#0b1120',
      autoHideMenuBar: true,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true
      }
    });

    mainWindow.loadURL(localUrl);

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      if (url.startsWith('https://github.com/')) {
        shell.openExternal(url);
      }
      return { action: 'deny' };
    });
  });

  app.on('window-all-closed', () => {
    server.close();
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}

bootstrapDesktopApp();
