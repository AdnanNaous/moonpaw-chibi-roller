export type Quality = 'low' | 'balanced' | 'high';
export type Theme = 'crypt' | 'foundry' | 'flood' | 'archives' | 'belfry' | 'orchard' | 'prison' | 'choir' | 'abyss' | 'throne';
export type Mechanic = 'execution' | 'furnace' | 'flood' | 'memory' | 'wind' | 'stalker' | 'arrows' | 'blades' | 'darkness' | 'warden';
export interface Platform { id: string; x: number; y: number; w: number; h: number; kind: 'solid' | 'moving' | 'crumble' | 'conveyor' | 'memory'; baseX?: number; baseY?: number; phase?: number; active?: boolean; telegraph?: number; }
export interface Hazard { id: string; x: number; y: number; w: number; h: number; kind: 'spikes' | 'saw' | 'laser' | 'gate' | 'crusher' | 'tide' | 'hunter' | 'arrow' | 'blade' | 'darkness' | 'warden'; phase?: number; active?: boolean; telegraph?: number; baseX?: number; baseY?: number; }
export interface Pickup { id: string; x: number; y: number; collected: boolean; secret?: boolean; kind?: 'gem' | 'relic' | 'record'; text?: string; }
export interface Checkpoint { id: string; x: number; y: number; active: boolean; }
export type Boon = 'fang' | 'ward' | 'rush';
export interface Arena { id: string; x: number; w: number; enemyIds: string[]; cleared: boolean; }
export interface Enemy {
  id: string; kind: 'sentinel' | 'skirmisher' | 'marksman' | 'regent'; arena: string;
  x: number; y: number; w: number; h: number; spawnX: number; spawnY: number; vy: number; health: number; maxHealth: number;
  phase: 'idle' | 'windup' | 'attack' | 'recovery' | 'stagger' | 'dead';
  timer: number; telegraph: number; facing: number; attackKind: 'slash' | 'lunge' | 'shot' | 'slam';
  attackX: number; attackY: number; attackW: number; attackH: number; bossPhase: 1 | 2 | 3;
  attackCount: number; hitCooldown: number;
  dropTimer?: number; dropDirection?: number;
}
export interface Stage { id: string; name: string; subtitle: string; theme: Theme; mechanic: Mechanic; accent: string; description: string; length: number; spawn: {x: number; y: number}; exit: {x: number; y: number}; platforms: Platform[]; hazards: Hazard[]; pickups: Pickup[]; checkpoints: Checkpoint[]; wind: number; records?: string[]; enemies: Enemy[]; arenas: Arena[]; }
export interface Player { x: number; y: number; vx: number; vy: number; grounded: boolean; facing: number; dashTime: number; dashReady: boolean; deadTime: number; wall: number; stamina: number; attackTime: number; health: number; maxHealth: number; invulnerability: number; dashInvulnerability: number; combo: number; comboTime: number; }
export interface InputFrame { move: number; jump: boolean; jumpPressed: boolean; dashPressed: boolean; attackPressed?: boolean; pausePressed: boolean; confirmPressed: boolean; nav?: number; }
export type GameMode = 'menu' | 'playing' | 'paused' | 'complete' | 'ending';
export interface GameState { mode: GameMode; stageIndex: number; stage: Stage; player: Player; time: number; deaths: number; collected: number; total: number; secrets: number; checkpoint: {x: number; y: number}; event: string; eventId: number; relicsRequired: number; relicsCollected: number; bossHealth: number; warning: string; arenaActive: string | null; kills: number; boon: Boon | null; boonOptions: Boon[]; }
export interface SaveData { unlocked: number; best: Record<string, {time: number; deaths: number; collected: number}>; secrets?: string[]; }
