const { app, BrowserWindow, Menu, protocol, net, shell, ipcMain, session } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { CONTENT_POLICY, isMainDocument, isTrustedIPC, resolveAsset, allowedExternal } = require('./security.cjs');
const testing = !app.isPackaged && process.env.MOONPAW_TEST === '1';
if(testing&&process.env.MOONPAW_TEST_PROFILE)app.setPath('userData',process.env.MOONPAW_TEST_PROFILE);
protocol.registerSchemesAsPrivileged([{scheme: 'moonpaw', privileges: {standard: true, secure: true, supportFetchAPI: true, corsEnabled: true}}]);
app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  session.defaultSession.setPermissionCheckHandler(() => false);
  protocol.handle('moonpaw', async (request) => {
    if (!['GET', 'HEAD'].includes(request.method)) return new Response('Method not allowed', {status: 405});
    const resolved = resolveAsset(request.url, path.join(__dirname, '../dist'));
    if (!resolved) return new Response('Forbidden', {status: 403});
    try {
      const response = await net.fetch(pathToFileURL(resolved).toString());
      const headers = new Headers(response.headers);
      headers.set('Content-Security-Policy', CONTENT_POLICY);
      headers.set('X-Content-Type-Options', 'nosniff');
      return new Response(request.method === 'HEAD' ? null : response.body, {status: response.status, headers});
    } catch { return new Response('Not found', {status: 404}); }
  });
  Menu.setApplicationMenu(null);
  const window = new BrowserWindow({
    title: `MOONPAW — Ashen Vow ${app.getVersion()}`, width: 1440, height: 900, minWidth: 800, minHeight: 500,
    backgroundColor: '#080909', show: false, autoHideMenuBar: true,
    icon: path.join(__dirname, '../dist/icon-512.png'),
    webPreferences: {nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true,
      webviewTag: false, devTools: testing, additionalArguments: testing ? ['--moonpaw-test'] : [],
      preload:path.join(__dirname,'preload.cjs')}
  });
  window.webContents.setWindowOpenHandler(({url}) => {if(allowedExternal(url))void shell.openExternal(url).catch(()=>{});return {action:'deny'};});
  window.webContents.on('will-navigate', (event, url) => {if (!isMainDocument(url)) event.preventDefault();});
  window.webContents.on('will-frame-navigate', details => {if (!details.isMainFrame || !isMainDocument(details.url)) details.preventDefault();});
  window.webContents.on('will-redirect', (event, url) => {if (!isMainDocument(url)) event.preventDefault();});
  window.webContents.on('will-attach-webview', event => event.preventDefault());
  ipcMain.handle('moonpaw:fullscreen-state',event=>isTrustedIPC(event,window.webContents)&&window.isFullScreen());
  ipcMain.handle('moonpaw:quit',event=>{
    if(!isTrustedIPC(event,window.webContents))throw new Error('Invalid application window');
    app.quit();
  });
  ipcMain.handle('moonpaw:fullscreen-toggle',event=>{
    if(!isTrustedIPC(event,window.webContents))return false;
    window.setFullScreen(!window.isFullScreen());return window.isFullScreen();
  });
  for(const type of ['enter-full-screen','leave-full-screen'])window.on(type,()=>window.webContents.send('moonpaw:fullscreen-change',window.isFullScreen()));
  window.once('ready-to-show', () => {if(!testing)window.show();});
  window.loadURL('moonpaw://game/');
});
app.on('window-all-closed', () => app.quit());
