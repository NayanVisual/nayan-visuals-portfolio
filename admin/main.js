const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const simpleGit = require('simple-git');

const STATE_PATH = path.join(app.getPath('userData'), 'window-state.json');

function findRepoRoot() {
  let dir = __dirname;
  for (let i = 0; i < 10; i++) {
    if (fs.existsSync(path.join(dir, 'data', 'portfolio.json'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return path.join(__dirname, '..');
}

const REPO_DIR = findRepoRoot();
const PORTFOLIO_PATH = path.join(REPO_DIR, 'data', 'portfolio.json');

let mainWindow;

function loadWindowState() {
  try { return JSON.parse(fs.readFileSync(STATE_PATH, 'utf-8')); }
  catch { return {}; }
}

function saveWindowState() {
  if (!mainWindow) return;
  const b = mainWindow.getBounds();
  fs.writeFileSync(STATE_PATH, JSON.stringify({ x: b.x, y: b.y, width: b.width, height: b.height }));
}

function buildMenu() {
  const isMac = process.platform === 'darwin';
  const template = [
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'hide' }, { role: 'hideOthers' }, { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ]
    }] : []),
    {
      label: 'File',
      submenu: [
        { label: 'New Entry', accelerator: 'CmdOrCtrl+N', click: () => mainWindow?.webContents.send('menu-new') },
        { type: 'separator' },
        { label: 'Save', accelerator: 'CmdOrCtrl+S', click: () => mainWindow?.webContents.send('menu-save') },
        { type: 'separator' },
        { label: 'Push to GitHub', accelerator: 'CmdOrCtrl+Return', click: () => mainWindow?.webContents.send('menu-push') },
        { type: 'separator' },
        ...(isMac ? [] : [{ role: 'quit' }]),
      ]
    },
    { label: 'Edit', submenu: [
      { role: 'undo' }, { role: 'redo' }, { type: 'separator' },
      { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' },
    ]},
    { label: 'View', submenu: [
      { role: 'reload' }, { role: 'toggleDevTools' }, { type: 'separator' },
      { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { type: 'separator' },
      { role: 'togglefullscreen' },
    ]},
    {
      label: 'Help',
      submenu: [{
        label: 'About Nayan Visuals Admin',
        click: () => dialog.showMessageBox(mainWindow, {
          type: 'info', title: 'About',
          message: 'Nayan Visuals Admin',
          detail: 'Portfolio manager for Nayan Visuals.\nVersion 1.0.0\n\nManage video entries and push to GitHub.',
        }),
      }],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function createWindow() {
  const state = loadWindowState();
  mainWindow = new BrowserWindow({
    width: state.width || 1000,
    height: state.height || 700,
    x: state.x, y: state.y,
    minWidth: 680, minHeight: 480,
    title: 'Nayan Visuals Admin',
    backgroundColor: '#0d0d14',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  mainWindow.on('resize', saveWindowState);
  mainWindow.on('move', saveWindowState);
  buildMenu();
}

ipcMain.handle('load-portfolio', async () => {
  try {
    return { success: true, data: JSON.parse(fs.readFileSync(PORTFOLIO_PATH, 'utf-8')) };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('save-portfolio', async (_, entries) => {
  try {
    fs.writeFileSync(PORTFOLIO_PATH, JSON.stringify(entries, null, 4) + '\n');
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('git-push', async (_, message) => {
  try {
    const git = simpleGit(REPO_DIR);
    const status = await git.status();
    if (status.files.length === 0) return { success: false, error: 'Nothing to commit' };
    await git.add('data/portfolio.json');
    await git.commit(message);
    const remotes = await git.getRemotes(true);
    for (const r of remotes) {
      await git.push(r.name, 'main');
    }
    return { success: true, remotes: remotes.map(r => r.name) };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('confirm-dialog', async (_, opts) => {
  const r = await dialog.showMessageBox(mainWindow, {
    type: opts.type || 'question',
    buttons: opts.buttons || ['Cancel', 'OK'],
    defaultId: opts.defaultId || 1,
    title: opts.title || 'Confirm',
    message: opts.message || '',
    detail: opts.detail || '',
  });
  return r.response;
});

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
