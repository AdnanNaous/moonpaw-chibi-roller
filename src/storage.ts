import type { Quality, SaveData } from './types';
import { PROGRESS_LIMIT, validateSave } from './save-validation';
export interface Settings {quality: Quality; muted: boolean; volume: number; musicVolume:number; effectsVolume:number; reducedMotion:boolean; largeTouch:boolean;}
export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem('moonpaw-progress-v2') || '{}';
    return validateSave(raw.length <= PROGRESS_LIMIT ? JSON.parse(raw) : undefined);
  } catch {return validateSave(undefined);}
}
export function storeSave(data: SaveData) {try {localStorage.setItem('moonpaw-progress-v2',JSON.stringify(validateSave(data)));} catch {/* Storage can be unavailable in private WebViews. */}}
export function loadSettings(): Settings {
  const defaults: Settings = {quality: matchMedia('(pointer: coarse)').matches ? 'balanced' : 'high', muted: false, volume: .70, musicVolume:.85, effectsVolume:1, reducedMotion:false, largeTouch:false};
  try {
    const data = JSON.parse(localStorage.getItem('moonpaw-settings-v2') || '{}');
    const level=(value:unknown,fallback:number)=>typeof value==='number'&&Number.isFinite(value)?Math.max(0,Math.min(1,value)):fallback;
    return {quality: ['low','balanced','high'].includes(data.quality) ? data.quality : defaults.quality, muted: data.muted === true, volume: Number.isFinite(data.volume) && (data.audioRevision===1 || Math.abs(data.volume-.32)>.001) ? level(data.volume,defaults.volume) : defaults.volume, musicVolume:level(data.musicVolume,defaults.musicVolume), effectsVolume:level(data.effectsVolume,defaults.effectsVolume), reducedMotion:data.reducedMotion===true,largeTouch:data.largeTouch===true};
  } catch {return defaults;}
}
export function storeSettings(data: Settings) {try {localStorage.setItem('moonpaw-settings-v2',JSON.stringify({...data,audioRevision:1}));} catch {}}
