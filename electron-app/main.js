const { app, BrowserWindow, Menu, shell, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const XLSX = require('xlsx');
const chokidar = require('chokidar');


const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
}


const APP_DIR = path.join(__dirname, 'app');
const DATA_DIR = path.join(app.getPath('documents'), 'ClinicInventory');
const EXCEL_PATH = path.join(DATA_DIR, 'inventory.xlsx');
const JSON_PATH = path.join(APP_DIR, 'data.json');
const PORT = 5501;

let splashWindow = null;
let mainWindow = null;
let server = null;


function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(EXCEL_PATH)) {
  
    const packagedTemplate = app.isPackaged
      ? path.join(process.resourcesPath, 'inventory-template.xlsx')
      : path.join(APP_DIR, 'inventory.xlsx');
    if (fs.existsSync(packagedTemplate)) {
      fs.copyFileSync(packagedTemplate, EXCEL_PATH);
    }
  }
}


function excelToJson(excelPath) {
  const wb = XLSX.readFile(excelPath, { cellDates: false });
  const allRows = [];

  wb.SheetNames.forEach(sheetName => {
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    if (rows.length < 2) return;

    const rawHeaders = rows[0];
    const headers = {};
    rawHeaders.forEach((h, idx) => {
      if (h !== null && h !== undefined && String(h).trim() !== '') {
        headers[String(h).trim().toLowerCase()] = idx;
      }
    });

    const getCol = (row, ...names) => {
      for (const n of names) {
        const idx = headers[n.toLowerCase()];
        if (idx !== undefined && idx < row.length) {
          const v = row[idx];
          return v === null || v === undefined ? '' : v;
        }
      }
      return '';
    };

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const name = String(getCol(row, 'name', 'medicinename')).trim();
      const company = String(getCol(row, 'company')).trim();
      if (!name || !company) continue;

      const price = parseFloat(getCol(row, 'price')) || 0;
      const stock = parseInt(getCol(row, 'stock'), 10) || 0;

      allRows.push({
        Category: sheetName.trim(),
        Company: company,
        Disease: String(getCol(row, 'disease')).trim(),
        MedicineName: name,
        Salt: String(getCol(row, 'salt', 'formula')).trim(),
        Weight: String(getCol(row, 'weight')).trim(),
        Price: price,
        Stock: stock
      });
    }
  });

  return allRows;
}

function writeJson(data) {
  const tmp = JSON_PATH + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify({ updated: Date.now() / 1000, data }, null, 2), 'utf-8');
  fs.renameSync(tmp, JSON_PATH);
}

function refreshData() {
  try {
    if (!fs.existsSync(EXCEL_PATH)) return;
    const data = excelToJson(EXCEL_PATH);
    writeJson(data);
    console.log(`[Clinic Inventory] data.json updated - ${data.length} medicines`);
  } catch (err) {
    console.error('[Clinic Inventory] Failed to read Excel:', err.message);
  }
}


const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png'
};

function startServer() {
  server = http.createServer((req, res) => {
    let urlPath = decodeURIComponent(req.url.split('?')[0]);
    if (urlPath === '/') urlPath = '/main.html';
    const filePath = path.join(APP_DIR, urlPath);

  
    if (!filePath.startsWith(APP_DIR)) {
      res.writeHead(403); res.end('Forbidden'); return;
    }

    fs.readFile(filePath, (err, content) => {
      if (err) { res.writeHead(404); res.end('Not found'); return; }
      const ext = path.extname(filePath);
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      res.end(content);
    });
  });
  server.listen(PORT, '127.0.0.1');
}


function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 420, height: 460,
    frame: false, resizable: false, movable: true,
    transparent: true, backgroundColor: '#00000000',
    center: true, show: false, skipTaskbar: false,
    webPreferences: { contextIsolation: true }
  });
  splashWindow.loadFile(path.join(__dirname, 'splash.html'));
  splashWindow.once('ready-to-show', () => splashWindow.show());
}

function createMainWindow() {
 
  const work = screen.getPrimaryDisplay().workArea;

  mainWindow = new BrowserWindow({
    x: work.x, y: work.y,
    width: work.width, height: work.height,
    minWidth: 1024, minHeight: 640,
    show: false,
    resizable: true,
    backgroundColor: '#F7F8FA',
    icon: path.join(__dirname, 'build', 'icon.ico'),
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false
    }
  });
  Menu.setApplicationMenu(null);
  mainWindow.loadURL(`http://127.0.0.1:${PORT}/main.html`);

 
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.once('ready-to-show', () => {
   
    const elapsed = Date.now() - global.__bootStart;
    const remaining = Math.max(0, 2500 - elapsed);
    setTimeout(() => {
      mainWindow.show();
      if (splashWindow) { splashWindow.close(); splashWindow = null; }
    }, remaining);
  });

 
  const ZOOM_MIN = 0.7;
  const ZOOM_MAX = 1.6;
  const ZOOM_STEP = 0.1;

  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.setZoomFactor(1);
  });


  mainWindow.webContents.setVisualZoomLevelLimits(1, 1);

  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown' || !(input.control || input.meta)) return;

    const zoomInKeys = ['+', '=', 'Add', 'NumpadAdd'];
    const zoomOutKeys = ['-', 'Subtract', 'NumpadSubtract'];
    const zoomResetKeys = ['0'];

    const current = mainWindow.webContents.getZoomFactor();

    if (zoomInKeys.includes(input.key)) {
      event.preventDefault();
      mainWindow.webContents.setZoomFactor(Math.min(ZOOM_MAX, +(current + ZOOM_STEP).toFixed(2)));
    } else if (zoomOutKeys.includes(input.key)) {
      event.preventDefault();
      mainWindow.webContents.setZoomFactor(Math.max(ZOOM_MIN, +(current - ZOOM_STEP).toFixed(2)));
    } else if (zoomResetKeys.includes(input.key)) {
      event.preventDefault();
      mainWindow.webContents.setZoomFactor(1);
    }
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

/* ============================================================
   APP LIFECYCLE
============================================================ */
app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

app.whenReady().then(() => {
  global.__bootStart = Date.now();
  createSplashWindow();

  ensureDataFile();
  refreshData();
  startServer();

  const watcher = chokidar.watch(EXCEL_PATH, { ignoreInitial: true, awaitWriteFinish: { stabilityThreshold: 400, pollInterval: 100 } });
  watcher.on('change', refreshData);
  watcher.on('add', refreshData);

  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (server) server.close();
  if (process.platform !== 'darwin') app.quit();
});