const { app, BrowserWindow, Menu, protocol, net, shell, ipcMain } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
protocol.registerSchemesAsPrivileged([{scheme: 'moonpaw', privileges: {standard: true, secure: true, supportFetchAPI: true, corsEnabled: true}}]);
app.whenReady().then(() => {
  protocol.handle('moonpaw', (request) => {
    const url = new URL(request.url);
    const relative = decodeURIComponent(url.pathname).replace(/^\/+/, '') || 'index.html';
    const root = path.join(__dirname, '../dist');
    const resolved = path.resolve(root, relative);
    if (!resolved.startsWith(root + path.sep) && resolved !== root) return new Response('Forbidden', {status: 403});
    return net.fetch(pathToFileURL(resolved).toString());
  });
  Menu.setApplicationMenu(null);
  const window = new BrowserWindow({
    title: 'MOONPAW — Ashen Vow', width: 1440, height: 900, minWidth: 800, minHeight: 500,
    backgroundColor: '#080909', show: false, autoHideMenuBar: true,
    icon: path.join(__dirname, '../dist/icon-512.png'),
    webPreferences: {nodeIntegration: false, contextIsolation: true, sandbox: true, preload:path.join(__dirname,'preload.cjs')}
  });
  const allowedLinks=new Set(['https://adnannaous.vercel.app','https://github.com/AdnanNaous','https://x.com/vc_351','https://www.linkedin.com/in/adnan-naous/','https://linktr.ee/VC351']);
  window.webContents.setWindowOpenHandler(({url}) => {if(allowedLinks.has(url.replace(/\/$/,''))||allowedLinks.has(url))void shell.openExternal(url);return {action:'deny'};});
  window.webContents.on('will-navigate', (event, url) => {if (!url.startsWith('moonpaw://game/')) event.preventDefault();});
  ipcMain.handle('moonpaw:fullscreen-state',event=>event.sender===window.webContents&&window.isFullScreen());
  ipcMain.handle('moonpaw:fullscreen-toggle',event=>{
    if(event.sender!==window.webContents||!event.sender.getURL().startsWith('moonpaw://game/'))return false;
    window.setFullScreen(!window.isFullScreen());return window.isFullScreen();
  });
  for(const type of ['enter-full-screen','leave-full-screen'])window.on(type,()=>window.webContents.send('moonpaw:fullscreen-change',window.isFullScreen()));
  window.once('ready-to-show', () => {if(!process.env.MOONPAW_TEST)window.show();});
  window.loadURL('moonpaw://game/');
});
app.on('window-all-closed', () => app.quit());
