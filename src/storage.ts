import type { Quality, SaveData } from './types';
export interface Settings {quality: Quality; muted: boolean; volume: number;}
export function loadSave(): SaveData {
  try {
    const data = JSON.parse(localStorage.getItem('moonpaw-progress-v1') || '{}');
    return {unlocked: Math.max(1,Math.min(10,Number(data.unlocked)||1)), best: data.best && typeof data.best==='object' ? data.best : {}, secrets: Array.isArray(data.secrets)?data.secrets.filter((s:unknown)=>typeof s==='string'):[]};
  } catch {return {unlocked: 1,best:{}};}
}
export function storeSave(data: SaveData) {try {localStorage.setItem('moonpaw-progress-v1',JSON.stringify(data));} catch {/* Storage can be unavailable in private WebViews. */}}
export function loadSettings(): Settings {
  const defaults: Settings = {quality: matchMedia('(pointer: coarse)').matches ? 'balanced' : 'high', muted: false, volume: .32};
  try {
    const data = JSON.parse(localStorage.getItem('moonpaw-settings-v1') || '{}');
    return {quality: ['low','balanced','high'].includes(data.quality) ? data.quality : defaults.quality, muted: data.muted === true, volume: Number.isFinite(data.volume) ? Math.max(0,Math.min(1,data.volume)) : defaults.volume};
  } catch {return defaults;}
}
export function storeSettings(data: Settings) {try {localStorage.setItem('moonpaw-settings-v1',JSON.stringify(data));} catch {}}
