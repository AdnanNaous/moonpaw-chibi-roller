import { createStage, STAGE_INFO } from './levels';
import type { GameState, InputFrame, Platform, Player, SaveData } from './types';

const WIDTH = .7;
const HEIGHT = 1.1;
const GRAVITY = 27;
const RUN = 6.6;
const JUMP = 10.8;
const DASH = 15;
const DASH_COST = 62;
const ATTACK_COST = 34;
const COYOTE = .105;
const BUFFER = .115;
const emptyInput: InputFrame = { move: 0, jump: false, jumpPressed: false, dashPressed: false, pausePressed: false, confirmPressed: false };
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

/** Pure gameplay state. Feed update a fixed 1/120 s step; persist `save` in the shell. */
export class Game {
  state: GameState;
  save: SaveData;
  private coyote = 0;
  private buffer = 0;
  private groundedOn = '';
  private crumble = new Map<string, number>();
  private hazardX = new Map<string, number>();
  private stun = new Map<string, number>();
  private attackCooldown = 0;
  private bossRecovery = 0;
  private bossHitCycle = -1;

  constructor(save?: SaveData) {
    // `unlocked` is a count: 1 means only stage zero is available.
    this.save = { unlocked: clamp(Math.floor(save?.unlocked ?? 1), 1, STAGE_INFO.length), best: { ...save?.best }, secrets: [...new Set(save?.secrets ?? [])] };
    const stage = createStage(0);
    this.state = {
      mode: 'menu', stageIndex: 0, stage, player: this.newPlayer(stage.spawn.x, stage.spawn.y),
      time: 0, deaths: 0, collected: 0, total: stage.pickups.filter(p => !p.secret).length, secrets: this.save.secrets!.length,
      checkpoint: { ...stage.spawn }, event: '', eventId: 0,
      relicsRequired: stage.pickups.filter(p => p.kind === 'relic').length, relicsCollected: 0, bossHealth: 3, warning: '',
    };
  }

  private newPlayer(x: number, y: number): Player {
    return { x, y, vx: 0, vy: 0, grounded: false, facing: 1, dashTime: 0, dashReady: true, deadTime: 0, wall: 0, stamina: 100, attackTime: 0 };
  }

  private emit(event: string) { this.state.event = event; this.state.eventId++; }

  start(index: number) {
    const stageIndex = clamp(Math.floor(index) || 0, 0, this.save.unlocked - 1);
    const stage = createStage(stageIndex);
    for (const p of stage.pickups) if (p.secret && this.save.secrets!.includes(`${stage.id}:${p.id}`)) p.collected = true;
    this.state = {
      mode: 'playing', stageIndex, stage, player: this.newPlayer(stage.spawn.x, stage.spawn.y),
      time: 0, deaths: 0, collected: 0, total: stage.pickups.filter(p => !p.secret).length, secrets: this.save.secrets!.length,
      checkpoint: { ...stage.spawn }, event: 'start', eventId: this.state.eventId + 1,
      relicsRequired: stage.pickups.filter(p => p.kind === 'relic').length, relicsCollected: 0, bossHealth: 3, warning: '',
    };
    this.coyote = 0; this.buffer = 0; this.groundedOn = ''; this.crumble.clear();
    this.hazardX = new Map(stage.hazards.map(h => [h.id, h.x]));
    this.stun.clear(); this.attackCooldown = 0; this.bossRecovery = 0; this.bossHitCycle = -1;
  }

  pause() { if (this.state.mode === 'playing') { this.state.mode = 'paused'; this.emit('pause'); } }
  resume() { if (this.state.mode === 'paused') { this.state.mode = 'playing'; this.emit('resume'); } }
  restart() { this.start(this.state.stageIndex); }
  menu() { this.state.mode = 'menu'; this.emit('menu'); }
  next() {
    if (this.state.mode !== 'complete') return;
    if (this.state.stageIndex === STAGE_INFO.length - 1) { this.state.mode = 'ending'; this.emit('ending'); }
    else this.start(this.state.stageIndex + 1);
  }

  update(dt: number, input: InputFrame = emptyInput) {
    if (input.pausePressed) {
      if (this.state.mode === 'paused') this.resume();
      else if (this.state.mode === 'playing') this.pause();
      return;
    }
    if (this.state.mode !== 'playing') return;
    // The caller fixes the timestep. This cap also protects against suspended-tab time jumps.
    dt = clamp(Number.isFinite(dt) ? dt : 0, 0, 1 / 30);
    if (!dt) return;
    const count = Math.ceil(dt / (1 / 180));
    const step = dt / count;
    for (let i = 0; i < count && this.state.mode === 'playing'; i++) {
      this.tick(step, i === 0 ? input : { ...input, jumpPressed: false, dashPressed: false, attackPressed: false });
    }
  }

  private tick(dt: number, input: InputFrame) {
    const s = this.state, p = s.player;
    s.time += dt;
    this.animateWorld(dt);
    if (p.deadTime > 0) { p.deadTime = Math.max(0, p.deadTime - dt); return; }
    p.stamina = Math.min(100, p.stamina + (p.grounded ? 32 : 14) * dt);
    p.attackTime = Math.max(0, p.attackTime - dt);
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);

    if (input.jumpPressed) this.buffer = BUFFER;
    else this.buffer = Math.max(0, this.buffer - dt);
    this.coyote = p.grounded ? COYOTE : Math.max(0, this.coyote - dt);
    const move = clamp(input.move || 0, -1, 1);
    if (Math.abs(move) > .12) p.facing = Math.sign(move);

    if (this.buffer > 0 && (p.grounded || this.coyote > 0 || p.wall !== 0)) {
      p.vy = JUMP;
      if (p.wall) p.vx = -p.wall * 8;
      p.grounded = false; p.wall = 0; this.groundedOn = '';
      this.buffer = 0; this.coyote = 0; this.emit('jump');
    }
    if (input.dashPressed && p.dashReady && p.stamina >= DASH_COST) {
      p.dashTime = .19; p.dashReady = false; p.stamina -= DASH_COST;
      p.vy = Math.max(p.vy, 1.1); this.emit('dash');
    }
    if (input.attackPressed && this.attackCooldown <= 0 && p.stamina >= ATTACK_COST) {
      p.stamina -= ATTACK_COST;
      p.attackTime = .23; this.attackCooldown = .44; this.emit('attack');
      for (const h of s.stage.hazards) {
        if (h.kind !== 'hunter' && h.kind !== 'warden') continue;
        const dx = h.x + h.w / 2 - p.x;
        if (dx * p.facing < -.2 || dx * p.facing > 1.65 || Math.abs(h.y - p.y) > 1.5) continue;
        if (h.kind === 'hunter' && (this.stun.get(h.id) ?? 0) <= 0) {
          this.stun.set(h.id, 1.65); h.active = false; this.emit('stagger');
        } else if (h.kind === 'warden' && (s.time + (h.phase ?? 0)) % 3.7 >= 2.2 &&
          this.bossHitCycle !== Math.floor((s.time + (h.phase ?? 0)) / 3.7) &&
          this.bossRecovery <= 0 && s.bossHealth > 0) {
          s.bossHealth--; this.bossRecovery = .7; this.emit('boss_hit');
          this.bossHitCycle = Math.floor((s.time + (h.phase ?? 0)) / 3.7);
          if (s.bossHealth === 0) { h.active = false; this.emit('boss_defeated'); }
        }
      }
    }
    if (p.dashTime > 0) {
      p.dashTime = Math.max(0, p.dashTime - dt);
      p.vx = p.facing * DASH;
    } else {
      const target = move * RUN + (p.grounded ? 0 : s.stage.wind);
      const accel = p.grounded ? 52 : 34;
      p.vx += clamp(target - p.vx, -accel * dt, accel * dt);
      p.vy -= GRAVITY * dt;
      // Releasing jump cuts upward travel; a held jump reaches full height.
      if (!input.jump && p.vy > 0) p.vy -= 22 * dt;
    }

    const oldOn = this.groundedOn;
    const carry = s.stage.platforms.find(q => q.id === oldOn && q.active !== false);
    if (p.grounded && carry?.kind === 'moving') {
      const previous = this.platformPrevious(carry);
      p.x += carry.x - previous.x;
      p.y += carry.y - previous.y;
    }
    if (p.grounded && carry?.kind === 'conveyor') p.x += (carry.phase && carry.phase < 0 ? -2.2 : 2.2) * dt;

    const previousX = p.x;
    p.x = clamp(p.x + p.vx * dt, WIDTH / 2, s.stage.length - WIDTH / 2);
    p.wall = 0;
    for (const q of s.stage.platforms) {
      // Thin ledges are one-way: the cat can rise through them and land on top.
      if (q.active === false || q.h < 1 || !this.verticalOverlap(p, q)) continue;
      const left = q.x, right = q.x + q.w;
      if (previousX + WIDTH / 2 <= left + .03 && p.x + WIDTH / 2 > left && p.vx > 0) {
        p.x = left - WIDTH / 2; p.vx = 0; p.wall = 1; p.dashTime = 0;
      } else if (previousX - WIDTH / 2 >= right - .03 && p.x - WIDTH / 2 < right && p.vx < 0) {
        p.x = right + WIDTH / 2; p.vx = 0; p.wall = -1; p.dashTime = 0;
      }
    }
    if (p.wall && p.vy < -3) p.vy = -3;

    const previousY = p.y;
    p.y += p.vy * dt;
    p.grounded = false; this.groundedOn = '';
    if (p.vy <= 0) {
      // Prefer the highest crossed surface when several platforms overlap.
      let landing: Platform | undefined;
      for (const q of s.stage.platforms) {
        if (q.active === false || p.x + WIDTH / 2 <= q.x + .04 || p.x - WIDTH / 2 >= q.x + q.w - .04) continue;
        if (previousY >= q.y - .055 && p.y <= q.y && (!landing || q.y > landing.y)) landing = q;
      }
      if (landing) {
        p.y = landing.y; p.vy = 0; p.grounded = true; p.dashReady = true; this.groundedOn = landing.id;
        if (landing.kind === 'crumble' && !this.crumble.has(landing.id)) this.crumble.set(landing.id, .48);
      }
    } else {
      for (const q of s.stage.platforms) {
        if (q.active === false || q.h < 1 || p.x + WIDTH / 2 <= q.x || p.x - WIDTH / 2 >= q.x + q.w) continue;
        const bottom = q.y - q.h;
        if (previousY + HEIGHT <= bottom + .02 && p.y + HEIGHT >= bottom) {
          p.y = bottom - HEIGHT; p.vy = 0; break;
        }
      }
    }

    if (p.y < -5 || this.hitsHazard()) { this.die(); return; }
    for (const gem of s.stage.pickups) {
      if (!gem.collected && Math.abs(gem.x - p.x) < .6 && gem.y > p.y - .2 && gem.y < p.y + HEIGHT + .35) {
        gem.collected = true;
        if (gem.secret) {
          const key = `${s.stage.id}:${gem.id}`;
          if (!this.save.secrets!.includes(key)) this.save.secrets!.push(key);
          s.secrets = this.save.secrets!.length;
          this.emit('secret');
        } else if (gem.kind === 'relic') { s.relicsCollected++; this.emit('relic'); }
        else { s.collected++; this.emit('pickup'); }
      }
    }
    for (const bell of s.stage.checkpoints) {
      if (!bell.active && p.x >= bell.x && p.x <= bell.x + 1.1 && p.y >= bell.y - .1 && p.y <= bell.y + 3.1) {
        for (const other of s.stage.checkpoints) other.active = false;
        bell.active = true; s.checkpoint = { x: bell.x + .55, y: bell.y };
        this.emit('checkpoint');
      }
    }
    if (p.x >= s.stage.exit.x - .4 && Math.abs(p.y - s.stage.exit.y) < 2) {
      if (s.relicsCollected < s.relicsRequired) s.warning = `Find ${s.relicsRequired - s.relicsCollected} remaining seal${s.relicsRequired - s.relicsCollected === 1 ? '' : 's'}`;
      else if (s.stage.mechanic === 'warden' && s.bossHealth > 0) s.warning = 'The Regent guards the door';
      else this.finish();
    }
  }

  private verticalOverlap(p: Player, q: Platform) { return p.y < q.y - .04 && p.y + HEIGHT > q.y - q.h + .04; }
  private platformPrevious(q: Platform) {
    const t = this.state.time - this.lastDt;
    return { x: (q.baseX ?? q.x) + Math.sin(t * 1.45 + (q.phase ?? 0)) * .75,
      y: (q.baseY ?? q.y) + Math.sin(t * 1.1 + (q.phase ?? 0)) * .32 };
  }
  private lastDt = 0;

  private animateWorld(dt: number) {
    const s = this.state; this.lastDt = dt;
    this.bossRecovery = Math.max(0, this.bossRecovery - dt);
    s.warning = '';
    if (s.stage.mechanic === 'wind') {
      const gustClock = s.time % 6.4;
      s.stage.wind = gustClock < 3.2 ? 1.4 : -1.4;
      if ((gustClock > 2.55 && gustClock < 3.2) || gustClock > 5.75) s.warning = 'The gust is turning';
    }
    for (const q of s.stage.platforms) {
      if (q.kind === 'moving') {
        q.x = (q.baseX ?? q.x) + Math.sin(s.time * 1.45 + (q.phase ?? 0)) * .75;
        q.y = (q.baseY ?? q.y) + Math.sin(s.time * 1.1 + (q.phase ?? 0)) * .32;
      } else if (q.kind === 'memory') {
        const period = 3.6;
        const clock = (s.time + (q.x * .17)) % period;
        q.active = clock < 2.35;
        q.telegraph = clock >= 1.7 && clock < 2.35 ? (clock - 1.7) / .65 : 0;
      } else if (q.kind === 'crumble') {
        const timer = this.crumble.get(q.id);
        if (timer !== undefined) {
          const next = timer - dt;
          if (next <= -3) { q.active = true; this.crumble.delete(q.id); }
          else { this.crumble.set(q.id, next); q.active = next > 0; }
        }
      }
    }
    for (const h of s.stage.hazards) {
      const phase = h.phase ?? 0;
      const baseX = h.baseX ?? this.hazardX.get(h.id) ?? h.x;
      const baseY = h.baseY ?? h.y;
      h.telegraph = 0;
      if (h.kind === 'laser' || h.kind === 'gate') {
        const period = h.kind === 'gate' ? 3.25 : 3.3;
        const t = (s.time + phase) % period;
        // Warning is drawn for three quarters of a second before the strike.
        h.telegraph = t < .75 ? t / .75 : 0;
        h.active = t >= .75 && t < (h.kind === 'gate' ? 1.65 : 1.9);
      } else if (h.kind === 'crusher') {
        const t = (s.time + phase) % 3.5;
        h.telegraph = t < .8 ? t / .8 : 0;
        h.active = t >= .8 && t < 1.52;
        h.y = h.active ? .05 : 3.0;
      } else if (h.kind === 'tide') {
        const t = (s.time + phase) % 5.2;
        h.telegraph = t < 1.05 ? t / 1.05 : 0;
        h.active = t >= 1.05 && t < 3.15;
        h.y = h.active ? -.18 : -1.2;
        h.h = h.active ? 1.35 : .5;
        if (s.player.x > h.x - 3 && s.player.x < h.x + h.w + 1)
          s.warning = h.active ? 'Black tide high — climb' : t < 1.05 ? 'Tide rising — climb' : 'Tide draining — move';
      } else if (h.kind === 'arrow') {
        const t = (s.time + phase) % 2.8;
        h.telegraph = t < .8 ? t / .8 : 0;
        h.active = t >= .8 && t < 1.55;
        h.x = baseX + (h.active ? (t - .8) * 6 : 0);
      } else if (h.kind === 'blade' || h.kind === 'saw') {
        h.active = true;
        h.x = baseX + Math.sin(s.time * (h.kind === 'blade' ? 2.8 : 2.1) + phase) * (h.kind === 'blade' ? 1.6 : .55);
        h.y = baseY + (h.kind === 'blade' ? .65 + Math.cos(s.time * 2.8 + phase) * .65 : 0);
      } else if (h.kind === 'darkness') {
        const t = (s.time + phase) % 4;
        h.telegraph = t < 1 ? t : 0;
        h.active = t >= 1 && t < 2.35;
      } else if (h.kind === 'hunter') {
        const remaining = Math.max(0, (this.stun.get(h.id) ?? 0) - dt);
        this.stun.set(h.id, remaining);
        h.active = remaining <= 0;
        h.x = baseX + Math.sin(s.time * 1.25 + phase) * 1.8;
      } else if (h.kind === 'warden') {
        const t = (s.time + phase) % 3.7;
        h.telegraph = t < 1 ? t : 0;
        h.active = s.bossHealth > 0 && t >= 1 && t < 2.2;
        h.x = baseX + (t >= 1 && t < 2.2 ? Math.sin((t - 1) / 1.2 * Math.PI) * 2.4 : 0);
        h.y = baseY;
        if (s.bossHealth > 0 && s.player.x > baseX - 7) s.warning = t < 1 ? 'Regent winds up' : t < 2.2 ? 'Dodge the charge' : 'Strike during recovery';
      }
    }
  }

  private hitsHazard() {
    const p = this.state.player;
    return this.state.stage.hazards.some(h => h.active !== false &&
      p.x + WIDTH * .38 > h.x && p.x - WIDTH * .38 < h.x + h.w &&
      p.y + HEIGHT * .87 > h.y && p.y + .12 < h.y + h.h);
  }

  private die() {
    const s = this.state, p = s.player;
    s.deaths++; this.emit('death');
    p.x = s.checkpoint.x; p.y = s.checkpoint.y;
    p.vx = 0; p.vy = 0; p.grounded = false; p.wall = 0; p.dashTime = 0; p.dashReady = true; p.stamina = 100; p.attackTime = 0;
    p.deadTime = .46; this.coyote = 0; this.buffer = 0; this.groundedOn = '';
  }

  private finish() {
    const s = this.state;
    s.mode = s.stageIndex === STAGE_INFO.length - 1 ? 'ending' : 'complete';
    this.emit(s.mode);
    const key = s.stage.id;
    const old = this.save.best[key];
    if (!old || s.time < old.time) this.save.best[key] = { time: s.time, deaths: s.deaths, collected: s.collected };
    this.save.unlocked = Math.max(this.save.unlocked, Math.min(STAGE_INFO.length, s.stageIndex + 2));
  }
}
