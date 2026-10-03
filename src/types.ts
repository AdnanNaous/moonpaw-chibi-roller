export type Quality = 'low' | 'balanced' | 'high';
export type Theme = 'sakura' | 'sawmill' | 'neon' | 'sky' | 'glitch';
export interface Platform { id: string; x: number; y: number; w: number; h: number; kind: 'solid' | 'moving' | 'crumble' | 'conveyor'; baseX?: number; baseY?: number; phase?: number; active?: boolean; }
export interface Hazard { id: string; x: number; y: number; w: number; h: number; kind: 'spikes' | 'saw' | 'laser'; phase?: number; active?: boolean; }
export interface Pickup { id: string; x: number; y: number; collected: boolean; secret?: boolean; }
export interface Checkpoint { id: string; x: number; y: number; active: boolean; }
export interface Stage { id: string; name: string; subtitle: string; theme: Theme; accent: string; description: string; length: number; spawn: {x: number; y: number}; exit: {x: number; y: number}; platforms: Platform[]; hazards: Hazard[]; pickups: Pickup[]; checkpoints: Checkpoint[]; wind: number; }
export interface Player { x: number; y: number; vx: number; vy: number; grounded: boolean; facing: number; dashTime: number; dashReady: boolean; deadTime: number; wall: number; }
export interface InputFrame { move: number; jump: boolean; jumpPressed: boolean; dashPressed: boolean; pausePressed: boolean; confirmPressed: boolean; nav?: number; }
export type GameMode = 'menu' | 'playing' | 'paused' | 'complete' | 'ending';
export interface GameState { mode: GameMode; stageIndex: number; stage: Stage; player: Player; time: number; deaths: number; collected: number; total: number; secrets: number; checkpoint: {x: number; y: number}; event: string; eventId: number; }
export interface SaveData { unlocked: number; best: Record<string, {time: number; deaths: number; collected: number}>; secrets?: string[]; }
