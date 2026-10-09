import { createStage, STAGE_INFO } from './levels';
import type { Boon, Enemy, GameState, InputFrame, Platform, Player, SaveData } from './types';

const WIDTH = .7;
const HEIGHT = 1.1;
const GRAVITY = 30;
const FALL_GRAVITY = 40;
const RUN = 5.2;
const RUSH_RUN = 5.65;
// Keep the vertical reach of the old jump while shortening its floating descent.
const JUMP = 11.4;
const DASH = 12;
const DASH_DURATION = .22;
const DASH_COST = 36;
const ATTACK_COST = 16;
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
  private attackCooldown = 0;
  private attackBuffer = 0;
  private dashCooldown = 0;
  private staminaDelay = 0;
  private attackHits = new Set<string>();
  private boonOffered = false;
  private jumpAge = 0;
  private jumpCut = false;
  private wallKick = 0;
  private dashDirection = 1;

  constructor(save?: SaveData) {
    // `unlocked` is a count: 1 means only stage zero is available.
    this.save = { unlocked: clamp(Math.floor(save?.unlocked ?? 1), 1, STAGE_INFO.length), best: { ...save?.best }, secrets: [...new Set(save?.secrets ?? [])] };
    const stage = createStage(0);
    this.state = {
      mode: 'menu', stageIndex: 0, stage, player: this.newPlayer(stage.spawn.x, stage.spawn.y),
      time: 0, deaths: 0, collected: 0, total: stage.pickups.filter(p => !p.secret).length, secrets: this.save.secrets!.length,
      checkpoint: { ...stage.spawn }, event: '', eventId: 0,
      relicsRequired: stage.pickups.filter(p => p.kind === 'relic').length, relicsCollected: 0, bossHealth: stage.enemies.find(e => e.kind === 'regent')?.health ?? 0, warning: '',
      arenaActive: null, kills: 0, boon: null, boonOptions: [],
    };
  }

  private newPlayer(x: number, y: number): Player {
    return { x, y, vx: 0, vy: 0, grounded: false, facing: 1, dashTime: 0, dashReady: true, deadTime: 0, wall: 0, stamina: 100, attackTime: 0, health: 5, maxHealth: 5, invulnerability: 0, dashInvulnerability: 0, combo: 0, comboTime: 0, stride:0, landingTime:0 };
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
      relicsRequired: stage.pickups.filter(p => p.kind === 'relic').length, relicsCollected: 0, bossHealth: stage.enemies.find(e => e.kind === 'regent')?.health ?? 0, warning: '',
      arenaActive: null, kills: 0, boon: null, boonOptions: [],
    };
    this.coyote = 0; this.buffer = 0; this.groundedOn = ''; this.crumble.clear();
    this.hazardX = new Map(stage.hazards.map(h => [h.id, h.x]));
    this.attackCooldown = 0; this.attackBuffer = 0; this.dashCooldown = 0; this.staminaDelay = 0; this.attackHits.clear(); this.boonOffered = false;
    this.jumpAge=0;this.jumpCut=false;this.wallKick=0;this.dashDirection=1;
  }

  pause() { if (this.state.mode === 'playing') { this.state.mode = 'paused'; this.emit('pause'); } }
  resume() { if (this.state.mode === 'paused') { this.state.mode = 'playing'; this.emit('resume'); } }
  restart() { this.start(this.state.stageIndex); }
  menu() { this.state.mode = 'menu'; this.emit('menu'); }
  selectBoon(boon: Boon): boolean {
    const s = this.state;
    if (!s.boonOptions.includes(boon)) return false;
    s.boon = boon; s.boonOptions = [];
    if (boon === 'ward') { s.player.maxHealth = 7; s.player.health = Math.min(7, s.player.health + 2); }
    this.emit('boon');
    return true;
  }
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
    p.landingTime=Math.max(0,p.landingTime-dt);
    this.jumpAge+=dt;this.wallKick=Math.max(0,this.wallKick-dt);
    p.invulnerability = Math.max(0, p.invulnerability - dt);
    p.dashInvulnerability = Math.max(0, p.dashInvulnerability - dt);
    p.comboTime = Math.max(0, p.comboTime - dt);
    if (!p.comboTime) p.combo = 0;
    this.staminaDelay = Math.max(0, this.staminaDelay - dt);
    if (!this.staminaDelay) p.stamina = Math.min(100, p.stamina + (p.grounded ? 34 : 22) * dt);
    p.attackTime = Math.max(0, p.attackTime - dt);
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    this.dashCooldown = Math.max(0, this.dashCooldown - dt);
    this.attackBuffer = input.attackPressed ? .13 : Math.max(0, this.attackBuffer - dt);

    if (input.jumpPressed) this.buffer = BUFFER;
    else this.buffer = Math.max(0, this.buffer - dt);
    this.coyote = p.grounded ? COYOTE : Math.max(0, this.coyote - dt);
    const move = clamp(input.move || 0, -1, 1);
    if (Math.abs(move) > .12 && p.dashTime<=0 && this.wallKick<=0) p.facing = Math.sign(move);

    if (this.buffer > 0 && (p.grounded || this.coyote > 0 || p.wall !== 0)) {
      p.vy = JUMP;
      if (p.wall) {p.vx = -p.wall * 8;p.facing=-p.wall;this.wallKick=.13;}
      p.grounded = false; p.wall = 0; this.groundedOn = '';
      this.jumpAge=0;this.jumpCut=false;p.landingTime=0;
      this.buffer = 0; this.coyote = 0; this.emit('jump');
    }
    const dashCost = s.boon === 'rush' ? 26 : DASH_COST;
    if (input.dashPressed && p.dashReady && this.dashCooldown <= 0 && p.stamina >= dashCost) {
      p.dashTime = DASH_DURATION; p.dashInvulnerability = .16; p.dashReady = false; p.stamina -= dashCost; this.staminaDelay = .48;
      this.dashDirection=p.facing;
      this.dashCooldown = .36;
      this.emit('dash');
    }
    const attackCost = s.boon === 'ward' ? 20 : ATTACK_COST;
    if (this.attackBuffer > 0 && this.attackCooldown <= 0 && p.stamina >= attackCost && p.dashTime <= 0) {
      p.stamina -= attackCost; this.staminaDelay = .38;
      this.attackBuffer = 0;
      p.combo = p.comboTime > 0 ? p.combo % 3 + 1 : 1; p.comboTime = .95;
      p.attackTime = .19; this.attackCooldown = p.combo === 3 ? .4 : .27; this.attackHits.clear(); this.emit('attack');
    }
    if (p.dashTime > 0) {
      p.dashTime = Math.max(0, p.dashTime - dt);
      const progress = 1 - p.dashTime / DASH_DURATION;
      const rollSpeed = DASH * (.62 + .38 * Math.sin(progress * Math.PI));
      p.vx = p.dashTime > 0 ? this.dashDirection * rollSpeed : move * (s.boon === 'rush' ? RUSH_RUN : RUN);
    } else {
      const target = move * (s.boon === 'rush' ? RUSH_RUN : RUN) + (p.grounded ? 0 : s.stage.wind);
      const braking=Math.abs(move)<.12||move*p.vx<0;
      const accel = p.grounded ? braking ? 60 : 38 : braking ? 22 : 28;
      if(this.wallKick<=0)p.vx += clamp(target - p.vx, -accel * dt, accel * dt);
    }

    // Rolling changes horizontal motion only: ground contact and gravity remain real.
    // A heavier descent removes the long hover at the apex without sacrificing reach.
    p.vy -= (p.vy > 0 ? GRAVITY : FALL_GRAVITY) * dt;
    // One intentional release cut gives a predictable short hop rather than
    // continuously changing gravity after a finger leaves the button.
    if (!input.jump && !this.jumpCut && this.jumpAge >= .055 && p.vy > 0) { p.vy *= .48; this.jumpCut = true; }

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

    const previousY = p.y, wasGrounded=p.grounded,fallSpeed=p.vy;
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
        if(!wasGrounded&&fallSpeed< -3)p.landingTime=.12;
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

    // Distance-based animation keeps foot contacts aligned at every speed.
    if(p.grounded&&p.dashTime<=0)p.stride+=Math.abs(p.x-previousX);

    this.updateCombat(dt);
    const arena = s.stage.arenas.find(a => a.id === s.arenaActive);
    if (arena && !arena.cleared) p.x = clamp(p.x, arena.x + WIDTH / 2, arena.x + arena.w - WIDTH / 2);
    if (p.y < -5) { this.die(); return; }
    const hazard = this.hitsHazard();
    if (hazard) this.hurt(hazard.kind === 'spikes' || hazard.kind === 'crusher' ? 2 : 1, hazard.x + hazard.w / 2, false);
    if (p.deadTime > 0) return;
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
        p.health = p.maxHealth; p.stamina = 100;
        this.emit('checkpoint');
      }
    }
    if (p.x >= s.stage.exit.x - .4 && Math.abs(p.y - s.stage.exit.y) < 2) {
      if (s.relicsCollected < s.relicsRequired) s.warning = `Find ${s.relicsRequired - s.relicsCollected} remaining seal${s.relicsRequired - s.relicsCollected === 1 ? '' : 's'}`;
      else if (s.stage.arenas.some(a => !a.cleared)) s.warning = s.bossHealth > 0 ? 'The Regent guards the door' : 'The hunt is unfinished';
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
      } else if (h.kind === 'hunter' || h.kind === 'warden') {
        // Old orbiting hazard actors are replaced by living encounter enemies.
        h.active = false;
      }
    }
  }

  private hitsHazard() {
    const p = this.state.player;
    return this.state.stage.hazards.find(h => h.active !== false &&
      p.x + WIDTH * .38 > h.x && p.x - WIDTH * .38 < h.x + h.w &&
      p.y + HEIGHT * .87 > h.y && p.y + .12 < h.y + h.h);
  }

  private updateCombat(dt: number) {
    const s = this.state, p = s.player;
    if (!s.arenaActive) {
      const entering = s.stage.arenas.find(a => !a.cleared && p.x >= a.x && p.x <= a.x + a.w);
      if (entering) { s.arenaActive = entering.id; this.emit('encounter'); }
    }
    const arena = s.stage.arenas.find(a => a.id === s.arenaActive);
    if (!arena) return;
    for (const e of s.stage.enemies.filter(e => e.arena === arena.id && e.health > 0)) {
      e.hitCooldown = Math.max(0, e.hitCooldown - dt);
      e.timer = Math.max(0, e.timer - dt);
      e.bossPhase = e.health > e.maxHealth * .66 ? 1 : e.health > e.maxHealth * .33 ? 2 : 3;
      const dx = p.x - (e.x + e.w / 2);
      const previousY = e.y;
      e.vy -= GRAVITY * dt; e.y += e.vy * dt;
      let landed = false;
      let standingOn: Platform | undefined;
      if (e.vy <= 0) {
        let support: Platform | undefined;
        for (const q of s.stage.platforms) if (q.active !== false && e.x + e.w > q.x && e.x < q.x + q.w &&
          previousY >= q.y - .055 && e.y <= q.y && (!support || q.y > support.y)) support = q;
        if (support) { e.y = support.y; e.vy = 0; landed = true; standingOn = support; }
      }
      if (e.phase === 'idle') {
        e.facing = dx >= 0 ? 1 : -1;
        const range = e.kind === 'marksman' ? 9 : e.kind === 'regent' ? 4.4 : e.kind === 'skirmisher' ? 3.2 : 2.1;
        e.dropTimer = Math.max(0, (e.dropTimer ?? 0) - dt);
        if (landed && standingOn && standingOn.h < 1 && p.y < e.y - .8) {
          e.dropDirection = e.x + e.w / 2 - standingOn.x < standingOn.x + standingOn.w - e.x - e.w / 2 ? -1 : 1;
          e.dropTimer = .45;
        }
        if ((e.dropTimer ?? 0) > 0) e.x = clamp(e.x + (e.dropDirection ?? 1) * 3.8 * dt, arena.x + .4, arena.x + arena.w - e.w - .4);
        else if (Math.abs(dx) > range - .25 && e.kind !== 'marksman') {
          const speed = e.kind === 'skirmisher' ? 3.5 : e.kind === 'regent' ? 2.5 : 2.3;
          e.x = clamp(e.x + e.facing * speed * dt, arena.x + .4, arena.x + arena.w - e.w - .4);
        }
        if (landed && p.y > e.y + .8 && Math.abs(dx) < 4.5 && e.kind !== 'marksman') e.vy = 10.5;
        if (!e.timer && Math.abs(dx) < range && (e.kind === 'marksman' || Math.abs(p.y - e.y) < 1.25)) this.prepareAttack(e);
      } else if (e.phase === 'windup') {
        const duration = this.windupDuration(e);
        e.telegraph = clamp(1 - e.timer / duration, .05, 1);
        if (!e.timer) {
          e.phase = 'attack'; e.telegraph = 1;
          e.timer = e.attackKind === 'lunge' ? .24 : e.attackKind === 'shot' ? .15 : .18;
          this.emit(e.kind === 'regent' ? 'boss_attack' : 'enemy_attack');
        }
      } else if (e.phase === 'attack' && !e.timer) {
        e.phase = 'recovery'; e.telegraph = 0;
        e.timer = e.kind === 'regent' ? (e.bossPhase === 3 ? .64 : .86) : e.kind === 'skirmisher' ? .48 : .75;
      } else if ((e.phase === 'recovery' || e.phase === 'stagger') && !e.timer) {
        e.phase = 'idle'; e.timer = e.kind === 'regent' ? .18 : .24;
      }
      // Each committed player swing can hit an enemy only once. Facing and height matter.
      if (p.attackTime > .035 && !this.attackHits.has(e.id) && e.hitCooldown <= 0) {
        const forward = (e.x + e.w / 2 - p.x) * p.facing;
        if (forward > -.3 && forward < 1.8 && p.y < e.y + e.h && p.y + HEIGHT > e.y + .15) {
          this.attackHits.add(e.id);
          const guarded = e.kind === 'regent' && e.phase !== 'recovery' && e.phase !== 'stagger';
          if (guarded) this.emit('guard');
          else {
            const damage = s.boon === 'fang' && p.combo === 3 ? 2 : 1;
            e.health = Math.max(0, e.health - damage); e.hitCooldown = .2;
            this.emit(e.kind === 'regent' ? 'boss_hit' : 'enemy_hit');
            if (!e.health) {
              e.phase = 'dead'; e.telegraph = 0; s.kills++; p.stamina = Math.min(100, p.stamina + 12);
              this.emit(e.kind === 'regent' ? 'boss_defeated' : 'enemy_defeated');
            } else if (p.combo === 3 && e.kind !== 'regent') {
              e.phase = 'stagger'; e.timer = .34; e.telegraph = 0; this.emit('stagger');
            }
          }
        }
      }
      if (e.health > 0 && e.phase === 'attack' && p.x + WIDTH * .4 > e.attackX && p.x - WIDTH * .4 < e.attackX + e.attackW &&
        p.y + HEIGHT * .9 > e.attackY && p.y + .12 < e.attackY + e.attackH) {
        this.hurt(e.kind === 'regent' && e.attackKind === 'slam' ? 2 : 1, e.x + e.w / 2, true);
        if (p.deadTime > 0) return;
      }
      if (e.kind === 'regent') s.bossHealth = e.health;
    }
    if (arena.enemyIds.every(id => s.stage.enemies.find(e => e.id === id)!.health <= 0)) {
      arena.cleared = true; s.arenaActive = null;
      if (!this.boonOffered) { this.boonOffered = true; s.boonOptions = ['fang', 'ward', 'rush']; }
      this.emit('arena_cleared');
    } else if (s.bossHealth > 0 && s.stage.enemies.some(e => e.arena === arena.id && e.kind === 'regent')) {
      const boss = s.stage.enemies.find(e => e.kind === 'regent')!;
      const tell = boss.attackKind === 'slam' ? 'LOW SHOCKWAVE — jump' :
        boss.attackKind === 'slash' && boss.attackY > boss.y + .5 ? 'HIGH CLEAVE — roll through or retreat' :
          `${boss.attackKind.toUpperCase()} — read the amber tell`;
      s.warning = boss.phase === 'recovery' ? 'Regent exposed — strike' : boss.phase === 'windup' ? tell : `Regent · phase ${boss.bossPhase}`;
    } else s.warning = 'Hunt sealed · clear the sentries';
  }

  private windupDuration(e: Enemy) {
    return e.kind === 'regent' ? (e.attackKind === 'slam' ? .85 : e.bossPhase === 3 ? .48 : .65) :
      e.kind === 'marksman' ? .8 : e.kind === 'skirmisher' ? .6 : .72;
  }

  private prepareAttack(e: Enemy) {
    const p = this.state.player;
    e.attackCount++;
    e.attackKind = e.kind === 'marksman' ? 'shot' : e.kind === 'skirmisher' ? 'lunge' : e.kind === 'regent' ?
      (e.bossPhase >= 2 && e.attackCount % 3 === 0 ? 'slam' : e.attackCount % 2 ? 'slash' : 'lunge') : 'slash';
    // Later phases answer habitual jumps with a high blade. Its raised,
    // committed tell makes rolling through or retreating the safe response;
    // the low shockwave still rewards jumping instead.
    const highCleave = e.kind === 'regent' && e.bossPhase >= 2 && e.attackKind === 'slash';
    e.facing = p.x >= e.x + e.w / 2 ? 1 : -1;
    e.phase = 'windup'; e.timer = this.windupDuration(e); e.telegraph = .05;
    e.attackW = e.attackKind === 'shot' ? Math.max(2, Math.abs(p.x - e.x) + 1.1) : e.attackKind === 'slam' ? 5.5 : e.attackKind === 'lunge' ? 3.65 : 2.35;
    e.attackH = e.attackKind === 'shot' ? .36 : e.attackKind === 'slam' ? .6 : highCleave ? 2.25 : 1.45;
    e.attackX = e.attackKind === 'slam' ? e.x + e.w / 2 - e.attackW / 2 : e.facing > 0 ? e.x + e.w / 2 : e.x + e.w / 2 - e.attackW;
    e.attackY = e.attackKind === 'shot' ? p.y + .46 : e.y + (highCleave ? .8 : 0);
  }

  private hurt(damage: number, origin: number, combat: boolean) {
    const p = this.state.player;
    if (p.invulnerability > 0 || (combat && p.dashInvulnerability > 0)) return;
    p.health = Math.max(0, p.health - damage);
    if (!p.health) { this.die(); return; }
    p.invulnerability = .78;
    p.vx = p.x >= origin ? 6 : -6; p.vy = Math.max(p.vy, 3.8); p.dashTime = 0;
    this.emit('hurt');
  }

  private die() {
    const s = this.state, p = s.player;
    s.deaths++; this.emit('death');
    p.x = s.checkpoint.x; p.y = s.checkpoint.y;
    p.vx = 0; p.vy = 0; p.grounded = false; p.wall = 0; p.dashTime = 0; p.dashReady = true; p.stamina = 100; p.attackTime = 0;
    p.deadTime = .46; this.coyote = 0; this.buffer = 0; this.groundedOn = ''; this.attackBuffer = 0; this.dashCooldown = 0;
    this.wallKick=0;this.jumpCut=false;this.jumpAge=0;p.stride=0;p.landingTime=0;
    p.health = p.maxHealth; p.invulnerability = .8; p.dashInvulnerability = 0; p.combo = 0; p.comboTime = 0;
    s.arenaActive = null;
    for (const arena of s.stage.arenas) {
      if (arena.x + arena.w < s.checkpoint.x) continue;
      arena.cleared = false;
      for (const e of s.stage.enemies.filter(e => e.arena === arena.id)) {
        e.health = e.maxHealth; e.phase = 'idle'; e.timer = .6; e.x = e.spawnX; e.y = e.spawnY; e.vy = 0; e.telegraph = 0; e.hitCooldown = 0; e.attackCount = 0;
        if (e.kind === 'regent') s.bossHealth = e.health;
      }
    }
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
