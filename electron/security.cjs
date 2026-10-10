const path = require('node:path');
const APP_ORIGIN = 'moonpaw://game';
const CONTENT_POLICY = "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; media-src 'self'; connect-src 'self'; worker-src 'self'; manifest-src 'self'; object-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'none'";
const EXTENSIONS = new Set(['.html','.js','.css','.png','.webp','.jpg','.svg','.ico','.woff','.woff2','.wav','.ogg','.mp3','.txt','.webmanifest','.json']);
const EXTERNAL_LINKS = new Set([
  'https://adnannaous.vercel.app/', 'https://github.com/AdnanNaous', 'https://x.com/vc_351',
  'https://www.linkedin.com/in/adnan-naous', 'https://linktr.ee/VC351', 'https://github.com/mrbumpy409/GeneralUser-GS',
]);
function applicationURL(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'moonpaw:' && url.hostname === 'game' && !url.port && !url.username && !url.password ? url : null;
  } catch { return null; }
}
function isMainDocument(value) {
  const url = applicationURL(value);
  return !!url && (url.pathname === '/' || url.pathname === '/index.html') && !url.search;
}
function isTrustedIPC(event, contents) {
  return !!contents && !contents.isDestroyed() && event.sender === contents &&
    !!event.senderFrame && event.senderFrame === contents.mainFrame &&
    event.senderFrame.origin === APP_ORIGIN && isMainDocument(event.senderFrame.url) &&
    isMainDocument(contents.getURL());
}
function resolveAsset(value, root) {
  const url = applicationURL(value);
  if (!url) return null;
  let relative;
  try { relative = decodeURIComponent(url.pathname).replace(/^\//, '') || 'index.html'; }
  catch { return null; }
  // Never interpret alternate separators, drive names, encoded second passes or Windows streams.
  if (/[\\:%\x00-\x1f]/.test(relative) || relative.split('/').some(p => p === '..' || p === '.' || !p)) return null;
  const absoluteRoot = path.resolve(root), resolved = path.resolve(absoluteRoot, relative);
  if (!resolved.startsWith(absoluteRoot + path.sep) || !EXTENSIONS.has(path.extname(resolved).toLowerCase())) return null;
  return resolved;
}
function allowedExternal(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.port || url.search || url.hash) return false;
    const normal = url.toString();
    return EXTERNAL_LINKS.has(normal) || EXTERNAL_LINKS.has(normal.replace(/\/$/, ''));
  } catch { return false; }
}
module.exports = { CONTENT_POLICY, isMainDocument, isTrustedIPC, resolveAsset, allowedExternal };
