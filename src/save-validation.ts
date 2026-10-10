import { STAGE_INFO, createStage } from './levels';
import type { SaveData } from './types';

export const PROGRESS_LIMIT = 32_768;
export const WITNESS_IDS = STAGE_INFO.map(stage => `${stage.id}:record`);
const witnesses = new Set(WITNESS_IDS);
const stages = STAGE_INFO.map((info, index) => ({
  id: info.id, pickups: createStage(index).pickups.filter(p => !p.secret).length,
}));
const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const own = (value: Record<string, unknown>, key: string): unknown =>
  Object.hasOwn(value, key) ? value[key] : undefined;
const integer = (value: unknown, maximum: number): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= maximum;

/** Local data is untrusted input, not proof that a player earned a result. */
export function validateSave(value: unknown): SaveData {
  const safe: SaveData = { unlocked: 1, best: {}, secrets: [] };
  if (!record(value)) return safe;
  const unlocked = own(value, 'unlocked');
  if (integer(unlocked, STAGE_INFO.length) && unlocked >= 1) safe.unlocked = unlocked;
  const best = own(value, 'best');
  if (record(best)) for (const stage of stages) {
    const result = own(best, stage.id);
    if (!record(result)) continue;
    const time = own(result, 'time'), deaths = own(result, 'deaths'), collected = own(result, 'collected');
    if (typeof time !== 'number' || !Number.isFinite(time) || time <= 0 || time > 604_800 ||
      !integer(deaths, 1_000_000) || !integer(collected, stage.pickups)) continue;
    safe.best[stage.id] = { time, deaths, collected };
  }
  const secrets = own(value, 'secrets');
  if (Array.isArray(secrets)) {
    // Bound work too: a legitimate campaign has only ten witness keys.
    safe.secrets = [...new Set(secrets.slice(0, 100).filter((key): key is string =>
      typeof key === 'string' && witnesses.has(key)))];
  }
  return safe;
}
