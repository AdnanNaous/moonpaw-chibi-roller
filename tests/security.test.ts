import { afterEach, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import path from 'node:path';
import { loadSave, storeSave } from '../src/storage';
import { PROGRESS_LIMIT, validateSave, WITNESS_IDS } from '../src/save-validation';
const require = createRequire(import.meta.url);
const { resolveAsset, isTrustedIPC, isMainDocument, allowedExternal, CONTENT_POLICY } = require('../electron/security.cjs');
afterEach(() => vi.unstubAllGlobals());
const chapter = 'sentence-of-stone';
function storage(raw: string | null) {
  let value = raw;
  vi.stubGlobal('localStorage', { getItem: () => value, setItem: (_key: string, next: string) => { value = next; } });
  return () => value;
}

it('migrates legitimate campaign progress and exact unique witness keys without trusting extra properties', () => {
  const save = { unlocked: 10, best: { [chapter]: { time: 89.25, deaths: 4, collected: 2, script: 'bad' } },
    secrets: [...WITNESS_IDS, WITNESS_IDS[0], 'fixture-1', '<img onerror=alert(1)>'], extra: 'bad' };
  storage(JSON.stringify(save));
  expect(loadSave()).toEqual({ unlocked: 10, best: { [chapter]: { time: 89.25, deaths: 4, collected: 2 } }, secrets: WITNESS_IDS });
  const read = storage(null); storeSave(save);
  expect(JSON.parse(read()!)).toEqual(validateSave(save));
});

it('rejects malformed, oversized, fractional and nonfinite progress and impossible chapter result values', () => {
  for (const raw of ['null', '[]', '"hello"', '{', ' '.repeat(PROGRESS_LIMIT + 1)]) {
    storage(raw); expect(loadSave()).toEqual({ unlocked: 1, best: {}, secrets: [] });
  }
  for (const unlocked of [0, 1.5, 11, '10', Infinity, NaN, -1]) expect(validateSave({ unlocked }).unlocked).toBe(1);
  for (const result of [null, [], { time: -1, deaths: 0, collected: 0 }, { time: Infinity, deaths: 0, collected: 0 },
    { time: 12, deaths: .5, collected: 0 }, { time: 12, deaths: 0, collected: 999 },
    { time: 604_801, deaths: 0, collected: 0 }]) {
    expect(validateSave({ best: { [chapter]: result } }).best).toEqual({});
  }
  expect(validateSave({ secrets: Array.from({ length: 5000 }, (_, i) => `fake-${i}`) }).secrets).toEqual([]);
});

it('does not copy prototype keys, unknown chapter IDs or inherited progress into the result', () => {
  const forged = JSON.parse('{"unlocked":2,"best":{"__proto__":{"polluted":true},"constructor":{"time":1,"deaths":0,"collected":0}},"secrets":["__proto__"]}');
  expect(validateSave(forged)).toEqual({ unlocked: 2, best: {}, secrets: [] });
  expect(({} as any).polluted).toBeUndefined();
  expect(validateSave(Object.create({ unlocked: 10, secrets: WITNESS_IDS, best: { [chapter]: { time: 1, deaths: 0, collected: 0 } } }))).toEqual({ unlocked: 1, best: {}, secrets: [] });
});

it('limits the native asset protocol to the exact game host and safe packaged asset paths', () => {
  const root = path.resolve('dist');
  expect(resolveAsset('moonpaw://game/', root)).toBe(path.join(root, 'index.html'));
  expect(resolveAsset('moonpaw://game/art/pilgrim-v6.png', root)).toBe(path.join(root, 'art', 'pilgrim-v6.png'));
  for (const value of ['moonpaw://evil/index.html', 'moonpaw://game:12/index.html', 'moonpaw://user@game/index.html',
    'moonpaw://game/%', 'moonpaw://game/%00.txt', 'moonpaw://game/%2e%2e%5cpackage.json',
    'moonpaw://game/%252e%252e/package.json', 'moonpaw://game/C%3a/windows/file.txt',
    'moonpaw://game/art/a.png%3asecret', 'moonpaw://game//assets/a.js', 'file:///etc/passwd',
    'moonpaw://game/electron/main.cjs']) expect(resolveAsset(value, root), value).toBeNull();
});

it('rejects IPC from child frames, other origins, non-entry documents and other windows', () => {
  const frame = { url: 'moonpaw://game/', origin: 'moonpaw://game' };
  const contents = { isDestroyed: () => false, mainFrame: frame, getURL: () => frame.url };
  expect(isTrustedIPC({ sender: contents, senderFrame: frame }, contents)).toBe(true);
  expect(isTrustedIPC({ sender: {}, senderFrame: frame }, contents)).toBe(false);
  expect(isTrustedIPC({ sender: contents, senderFrame: { ...frame } }, contents)).toBe(false);
  expect(isTrustedIPC({ sender: contents, senderFrame: null }, contents)).toBe(false);
  frame.origin = 'null'; expect(isTrustedIPC({ sender: contents, senderFrame: frame }, contents)).toBe(false);
  frame.origin = 'moonpaw://game'; frame.url = 'moonpaw://game/assets/foreign.html';
  expect(isTrustedIPC({ sender: contents, senderFrame: frame }, contents)).toBe(false);
  for (const value of ['moonpaw://game.evil/', 'moonpaw://game/assets/a.html', 'moonpaw://game/?code=1']) expect(isMainDocument(value)).toBe(false);
});

it('opens only exact creator/license links externally and applies a script and frame restrictive CSP', () => {
  expect(allowedExternal('https://github.com/AdnanNaous')).toBe(true);
  expect(allowedExternal('https://www.linkedin.com/in/adnan-naous/')).toBe(true);
  for (const value of ['https://github.com/AdnanNaous?redirect=https://evil.example', 'https://github.com@evil.example/AdnanNaous',
    'javascript:alert(1)', 'file:///C:/Windows/notepad.exe', 'https://github.com/AdnanNaous/other']) expect(allowedExternal(value)).toBe(false);
  expect(CONTENT_POLICY).toContain("script-src 'self'"); expect(CONTENT_POLICY).toContain("frame-src 'none'");
  expect(CONTENT_POLICY).not.toContain('unsafe-eval');
});
