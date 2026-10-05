import { describe, expect, it } from 'vitest';
import { Game } from '../src/core';
import { createStage, STAGE_INFO } from '../src/levels';
import type { InputFrame } from '../src/types';

const frame = (part: Partial<InputFrame> = {}): InputFrame => ({
  move: 0, jump: false, jumpPressed: false, dashPressed: false, attackPressed: false,
  pausePressed: false, confirmPressed: false, ...part,
});
function advance(game: Game, seconds: number, input = frame()) {
  for (let i = 0; i < Math.ceil(seconds * 120); i++) game.update(1 / 120, input);
}
const unlocked = () => new Game({ unlocked: 10, best: {} });

describe('chapters', () => {
  it('provides ten distinct mechanics, deep maps, reachable seals, and grounded bells', () => {
    expect(STAGE_INFO).toHaveLength(10);
    const mechanics = new Set<string>(), themes = new Set<string>();
    for (let i = 0; i < 10; i++) {
      const stage = createStage(i);
      mechanics.add(stage.mechanic); themes.add(stage.theme);
      const floor = stage.platforms.filter(p => p.h > 1);
      expect(floor.length).toBeGreaterThanOrEqual(8);
      expect(floor.slice(1).filter((p, j) => p.x - floor[j].x - floor[j].w > 1).length).toBeGreaterThanOrEqual(6);
      expect(stage.platforms.filter(p => p.h < 1).length).toBeGreaterThanOrEqual(7);
      for (const seal of stage.pickups.filter(p => p.kind === 'relic'))
        expect(floor.some(p => seal.x >= p.x + .5 && seal.x <= p.x + p.w - .5), `${stage.name} seal`).toBe(true);
      for (const bell of stage.checkpoints)
        expect(floor.some(p => bell.x >= p.x && bell.x + .55 < p.x + p.w), `${stage.name} bell`).toBe(true);
      stage.pickups[0].collected = true;
      expect(createStage(i).pickups[0].collected).toBe(false);
    }
    expect(mechanics.size).toBe(10); expect(themes.size).toBe(10);
  });

  it('warns before execution and tide strikes, and reverses the belfry wind', () => {
    const crypt = unlocked(); crypt.start(0);
    const gate = crypt.state.stage.hazards.find(h => h.kind === 'gate')!;
    advance(crypt, .35);
    expect(gate.telegraph).toBeGreaterThan(0); expect(gate.active).toBe(false);
    advance(crypt, .5);
    expect(gate.active).toBe(true);
    const flood = unlocked(); flood.start(2); flood.state.player.x = 11;
    advance(flood, .25);
    expect(flood.state.warning).toMatch(/Tide rising/);
    const tide = flood.state.stage.hazards.find(h => h.kind === 'tide')!;
    expect(tide.telegraph).toBeGreaterThan(0);
    advance(flood, 1);
    expect(tide.active).toBe(true);
    expect(flood.state.warning).toMatch(/Black tide high/);
    const wind = unlocked(); wind.start(4);
    expect(wind.state.stage.wind).toBeGreaterThan(0);
    advance(wind, 3.4);
    expect(wind.state.stage.wind).toBeLessThan(0);
  });

  it('gives timed threats warning frames and cycles the fading shelves', () => {
    const timed = [
      { stage: 1, kind: 'crusher' }, { stage: 6, kind: 'arrow' },
      { stage: 8, kind: 'darkness' }, { stage: 9, kind: 'warden' },
    ];
    for (const { stage, kind } of timed) {
      const game = unlocked(); game.start(stage);
      const hazard = game.state.stage.hazards.find(h => h.kind === kind)!;
      advance(game, .2);
      expect(hazard.telegraph, kind).toBeGreaterThan(0);
      expect(hazard.active, kind).toBe(false);
      advance(game, 1.1);
      expect(hazard.active, kind).toBe(true);
    }
    const archive = unlocked(); archive.start(3);
    const shelf = archive.state.stage.platforms.find(p => p.kind === 'memory')!;
    const states = new Set<boolean>(), warnings: number[] = [];
    for (let tick = 0; tick < 480; tick++) {
      archive.update(1 / 120, frame());
      states.add(shelf.active !== false); warnings.push(shelf.telegraph ?? 0);
    }
    expect(states.size).toBe(2);
    expect(Math.max(...warnings)).toBeGreaterThan(.5);
  });
});

describe('challenge and progress', () => {
  it('spends stamina for roll and strike and permits one air roll', () => {
    const game = new Game(); game.start(0); advance(game, .05);
    game.update(1 / 120, frame({ jump: true, jumpPressed: true }));
    game.update(1 / 120, frame({ jump: true, dashPressed: true }));
    const p = game.state.player;
    expect(p.stamina).toBeLessThan(40); expect(p.dashReady).toBe(false);
    game.update(1 / 120, frame({ jump: true, dashPressed: true, attackPressed: true }));
    expect(p.dashReady).toBe(false); expect(p.attackTime).toBeGreaterThan(0);
    advance(game, 1.2);
    expect(p.grounded).toBe(true); expect(p.dashReady).toBe(true);
    game.restart(); advance(game, .05);
    const fresh = game.state.player, before = fresh.stamina;
    game.update(1 / 120, frame({ attackPressed: true }));
    expect(fresh.attackTime).toBeGreaterThan(0);
    expect(fresh.stamina).toBeLessThan(before - 30);
  });

  it('keeps hazards lethal during a roll and lets a well timed strike stagger a hunter', () => {
    const roll = unlocked(); roll.start(0);
    roll.state.player.x = 24.8; roll.state.player.y = 0;
    roll.update(1 / 120, frame({ dashPressed: true, move: 1 }));
    expect(roll.state.deaths).toBe(1);

    const orchard = unlocked(); orchard.start(5);
    const hunter = orchard.state.stage.hazards.find(h => h.kind === 'hunter')!;
    orchard.state.player.x = hunter.x - .8; orchard.state.player.y = 0;
    orchard.state.player.facing = 1;
    orchard.update(1 / 120, frame({ attackPressed: true }));
    expect(hunter.active).toBe(false);
    advance(orchard, 1.8);
    expect(hunter.active).toBe(true);
  });

  it('blocks the exit until both seals are collected and the Regent falls', () => {
    const game = unlocked(); game.start(9);
    const s = game.state;
    s.player.x = s.stage.exit.x;
    game.update(1 / 120, frame());
    expect(s.mode).toBe('playing'); expect(s.warning).toMatch(/2 remaining seals/);
    for (const seal of s.stage.pickups.filter(p => p.kind === 'relic')) {
      s.player.x = seal.x; s.player.y = 0;
      game.update(1 / 120, frame());
    }
    expect(s.relicsCollected).toBe(2);
    s.player.x = s.stage.exit.x; s.player.y = 0;
    game.update(1 / 120, frame());
    expect(s.mode).toBe('playing'); expect(s.warning).toMatch(/Regent/);
  });

  it('rejects windup strikes and accepts only one strike per recovery', () => {
    const game = unlocked(); game.start(9);
    const s = game.state, p = s.player;
    p.x = 132.5; p.y = 0; p.facing = 1;
    advance(game, .2);
    game.update(1 / 120, frame({ attackPressed: true }));
    expect(s.bossHealth).toBe(3);
    advance(game, 2.1);
    expect(s.warning).toMatch(/recovery/);
    game.update(1 / 120, frame({ attackPressed: true }));
    expect(s.bossHealth).toBe(2);
    advance(game, .8);
    game.update(1 / 120, frame({ attackPressed: true }));
    expect(s.bossHealth).toBe(2);
  });

  it('respawns at an activated bell and restores a collected story memory', () => {
    const game = new Game(); game.start(0);
    const s = game.state;
    s.player.x = s.stage.checkpoints[0].x;
    game.update(1 / 120, frame());
    expect(s.checkpoint.x).toBeGreaterThan(s.stage.spawn.x);
    s.player.y = -6;
    game.update(1 / 120, frame());
    expect(s.deaths).toBe(1); expect(s.player.x).toBe(s.checkpoint.x);
    advance(game, .5);
    const memory = s.stage.pickups.find(p => p.secret)!;
    s.player.x = memory.x; s.player.y = memory.y - .7;
    game.update(1 / 120, frame());
    const replay = new Game(JSON.parse(JSON.stringify(game.save)));
    replay.start(0);
    expect(replay.state.stage.pickups.find(p => p.secret)?.collected).toBe(true);
    const belfry = unlocked(); belfry.start(4);
    const raisedBell = belfry.state.stage.checkpoints[1];
    expect(raisedBell.y).toBeGreaterThan(0);
    belfry.state.player.x = raisedBell.x; belfry.state.player.y = raisedBell.y + 2;
    belfry.update(1 / 120, frame());
    expect(belfry.state.checkpoint.y).toBe(raisedBell.y);
    belfry.state.player.y = -6;
    belfry.update(1 / 120, frame());
    expect(belfry.state.player.y).toBe(raisedBell.y);
  });
});

/** Uses actual update inputs from spawn through the exit; never changes position or pickup state. */
function journey(game: Game) {
  let heldJump = false, farthest = 0, relicPeak = 0;
  const deaths: string[] = [];
  const stage = game.state.stage;
  for (let tick = 0; tick < 120 * 240 && game.state.mode === 'playing'; tick++) {
    const s = game.state, p = s.player;
    farthest = Math.max(farthest, p.x); relicPeak = Math.max(relicPeak, s.relicsCollected);
    const missing = stage.pickups.filter(g => g.kind === 'relic' && !g.collected);
    const boss = stage.hazards.find(h => h.kind === 'warden');
    const bossPending = !missing.length && !!boss && s.bossHealth > 0;
    const goal = missing[0]?.x ?? (bossPending ? (boss!.baseX ?? boss!.x) - .5 : stage.exit.x);
    let move = Math.abs(goal - p.x) < .28 ? 0 : Math.sign(goal - p.x);
    if (missing.length && Math.abs(goal - p.x) < 1.1 && p.y > .7) move = Math.sign(goal - p.x) * .45;
    const floor = stage.platforms.filter(q => q.h > 1);
    const ground = floor.find(q => p.x >= q.x && p.x < q.x + q.w);
    const next = floor.find(q => q.x > (ground?.x ?? p.x));
    const edge = ground ? ground.x + ground.w - p.x : Infinity;
    const gap = ground && next ? next.x - ground.x - ground.w : 0;
    const support = stage.platforms.find(q => q.active !== false && Math.abs(p.y - q.y) < .08 && p.x >= q.x && p.x < q.x + q.w);
    const ledgeEdge = support && support.h < 1 ? support.x + support.w - p.x : Infinity;
    const ahead = stage.hazards.filter(h => h.kind !== 'warden' && h.x + h.w >= p.x && h.x - p.x < 2.6)
      .sort((a, b) => a.x - b.x)[0];
    const dx = ahead ? ahead.x - p.x : Infinity;
    if (move > 0 && ahead && ['gate', 'crusher', 'tide', 'darkness'].includes(ahead.kind) &&
      dx > .5 && dx < 2 && (ahead.active || (ahead.telegraph ?? 0) > 0)) move = 0;
    let wantJump = move > 0 && p.grounded && ((gap > .8 && edge < .78) || ledgeEdge < .6);
    if (move > 0 && p.grounded && ahead && dx > .2 && dx < 1.75 &&
      ['spikes', 'saw', 'blade', 'hunter', 'arrow'].includes(ahead.kind)) wantJump = true;
    if (move > 0 && p.grounded && ahead?.kind === 'tide' && dx < 2 && ahead.active) wantJump = true;
    const jump = wantJump || p.vy > .1;
    const dashPressed = move > 0 && p.dashReady && !p.grounded && p.vy < 2 &&
      !!next && next.x - p.x > 1.3 && next.x - p.x < 4.5 && (gap >= 3.5 || p.y < .4);
    let attackPressed = false;
    if (bossPending) {
      const t = s.time % 3.7;
      if (t >= 1 && t < 2.2 && p.x > 132.7) move = -1;
      if (t >= 2.2 && p.x >= 131.9 && p.x <= 132.75 && p.grounded) attackPressed = true;
    } else if (ahead?.kind === 'hunter' && ahead.active && dx > .35 && dx < 1.3) attackPressed = true;
    const deathCount = s.deaths;
    const before = `${p.x.toFixed(1)},${p.y.toFixed(1)} hazard=${ahead?.kind ?? '-'}:${dx.toFixed(1)} move=${move} jump=${jump}`;
    game.update(1 / 120, frame({ move, jump, jumpPressed: jump && !heldJump, dashPressed, attackPressed }));
    if (s.deaths > deathCount) deaths.push(before);
    heldJump = jump;
  }
  return { farthest, relicPeak, deaths: deaths.slice(-5) };
}

describe('campaign traversal with player inputs', () => {
  it('collects both seals and completes all ten chapters, including the final fight', () => {
    for (let index = 0; index < STAGE_INFO.length; index++) {
      const game = unlocked(); game.start(index);
      const result = journey(game);
      expect(game.state.mode, `chapter ${index + 1}: x=${result.farthest.toFixed(1)}, seals=${result.relicPeak}, deaths=${game.state.deaths}: ${result.deaths.join(' | ')}`)
        .toBe(index === 9 ? 'ending' : 'complete');
      expect(game.state.relicsCollected).toBe(game.state.relicsRequired);
      expect(game.state.deaths).toBeLessThan(24);
    }
  }, 120_000);
});
