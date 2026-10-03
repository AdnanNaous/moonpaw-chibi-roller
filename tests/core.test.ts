import { describe, expect, it } from 'vitest';
import { Game } from '../src/core';
import { createStage, STAGE_INFO } from '../src/levels';
import type { InputFrame } from '../src/types';

const frame = (overrides: Partial<InputFrame> = {}): InputFrame => ({
  move: 0, jump: false, jumpPressed: false, dashPressed: false, pausePressed: false, confirmPressed: false, ...overrides,
});
const advance = (game: Game, seconds: number, input = frame()) => {
  for (let i = 0; i < seconds * 120; i++) game.update(1 / 120, input);
};

describe('stages', () => {
  it('provides ten independent, traversable layouts and fresh mutable entities', () => {
    expect(STAGE_INFO).toHaveLength(10);
    expect(STAGE_INFO.map(s => s.length)).toEqual([166, 172, 178, 184, 190, 196, 202, 208, 216, 224]);
    for (let i = 0; i < 10; i++) {
      const stage = createStage(i);
      expect(stage.length).toBeGreaterThan(70);
      expect(stage.platforms[0].x).toBeLessThan(stage.spawn.x);
      expect(stage.platforms.some(p => p.x <= stage.exit.x && p.x + p.w >= stage.exit.x)).toBe(true);
      expect(stage.checkpoints.length).toBeGreaterThan(0);
      expect(stage.platforms.filter(p => p.h < 1).length).toBeGreaterThanOrEqual(10);
      const rests = [stage.spawn.x, ...stage.checkpoints.map(p => p.x), stage.exit.x];
      expect(rests.every((x, j) => j === 0 || x - rests[j - 1] <= 60)).toBe(true);
      expect(stage.pickups.filter(p => p.secret)).toHaveLength(1);
      expect(stage.platforms.filter(p => p.h < 1).every(p => (p.baseY ?? p.y) <= 1.9)).toBe(true);
      stage.pickups[0].collected = true;
      expect(createStage(i).pickups[0].collected).toBe(false);
    }
  });
});

describe('Game', () => {
  it('starts, pauses, resumes and restarts without advancing while paused', () => {
    const game = new Game(); game.start(0);
    advance(game, .25);
    const time = game.state.time;
    game.pause(); advance(game, 1);
    expect(game.state.time).toBe(time);
    game.resume(); game.update(1 / 120, frame());
    expect(game.state.time).toBeGreaterThan(time);
    game.restart();
    expect(game.state.time).toBe(0);
  });

  it('buffers jump shortly before landing and gives one air dash', () => {
    const game = new Game(); game.start(0);
    advance(game, .08);
    game.update(1 / 120, frame({ jump: true, jumpPressed: true }));
    expect(game.state.player.vy).toBeGreaterThan(0);
    advance(game, .14, frame({ jump: true }));
    game.update(1 / 120, frame({ dashPressed: true }));
    expect(game.state.player.dashTime).toBeGreaterThan(0);
    expect(game.state.player.dashReady).toBe(false);
    advance(game, 1.1);
    expect(game.state.player.grounded).toBe(true);
    expect(game.state.player.dashReady).toBe(true);
  });

  it('accepts a buffered jump before touching down', () => {
    const game = new Game(); game.start(0);
    const p = game.state.player;
    p.x = 4; p.y = .22; p.vy = -5; p.grounded = false;
    game.update(1 / 120, frame({ jump: true, jumpPressed: true }));
    expect(p.vy).toBeLessThan(0);
    advance(game, .11, frame({ jump: true }));
    expect(p.vy).toBeGreaterThan(0);
    expect(p.y).toBeGreaterThan(0);
  });

  it('slides down a wall and jumps back from it', () => {
    const game = new Game(); game.start(0);
    let touchedWall = false;
    for (let tick = 0; tick < 120 * 5; tick++) {
      game.update(1 / 120, frame({ move: 1 }));
      if (game.state.player.wall) { touchedWall = true; break; }
    }
    expect(touchedWall).toBe(true);
    const before = game.state.player.y;
    game.update(1 / 120, frame({ move: 1, jump: true, jumpPressed: true }));
    expect(game.state.player.vy).toBeGreaterThan(0);
    expect(game.state.player.y).toBeGreaterThan(before);
  });

  it('recovers at checkpoint and records completion progress', () => {
    const game = new Game(); game.start(0);
    const s = game.state;
    s.player.x = s.stage.checkpoints[0].x;
    game.update(1 / 120, frame());
    expect(s.checkpoint.x).toBeGreaterThan(s.stage.spawn.x);
    s.player.y = -6;
    game.update(1 / 120, frame());
    expect(s.deaths).toBe(1);
    expect(s.player.x).toBe(s.checkpoint.x);
    advance(game, .5);
    s.player.x = s.stage.exit.x;
    s.player.y = 0;
    game.update(1 / 120, frame());
    expect(s.mode).toBe('complete');
    expect(game.save.unlocked).toBe(2);
    expect(game.save.best[s.stage.id].deaths).toBe(1);
    game.next();
    expect(game.state.stageIndex).toBe(1);
  });

  it('treats unlocked as stage count and closes the final stage with the ending', () => {
    const fresh = new Game();
    expect(fresh.save.unlocked).toBe(1);
    fresh.start(4);
    expect(fresh.state.stageIndex).toBe(0);

    const game = new Game({ unlocked: 10, best: {} });
    game.start(9);
    expect(game.state.stageIndex).toBe(9);
    game.state.player.x = game.state.stage.exit.x;
    game.update(1 / 120, frame());
    expect(game.state.mode).toBe('ending');
    expect(game.save.unlocked).toBe(10);
    expect(game.save.best[game.state.stage.id]).toBeDefined();
  });

  it('keeps the fastest saved result after replay', () => {
    const game = new Game({ unlocked: 2, best: {} });
    game.start(1);
    game.state.player.x = game.state.stage.exit.x;
    game.update(1 / 120, frame());
    const record = { ...game.save.best[game.state.stage.id] };
    game.restart();
    advance(game, 1);
    game.state.player.x = game.state.stage.exit.x;
    game.update(1 / 120, frame());
    expect(game.save.best[game.state.stage.id]).toEqual(record);
    expect(game.save.unlocked).toBe(3);
  });

  it('records a memory once and restores its collected state on replay', () => {
    const game = new Game(); game.start(0);
    const memory = game.state.stage.pickups.find(p => p.secret)!;
    game.state.player.x = memory.x;
    game.state.player.y = memory.y - .7;
    game.update(1 / 120, frame());
    expect(game.state.event).toBe('secret');
    expect(game.state.secrets).toBe(1);
    expect(game.state.collected).toBe(0);
    const saved = JSON.parse(JSON.stringify(game.save));
    const replay = new Game(saved);
    replay.start(0);
    expect(replay.state.stage.pickups.find(p => p.secret)?.collected).toBe(true);
    expect(replay.state.secrets).toBe(1);
  });
});

describe('campaign traversal', () => {
  it('can finish every stage by moving, jumping and waiting for beams', () => {
    for (let index = 0; index < STAGE_INFO.length; index++) {
      const game = new Game({ unlocked: STAGE_INFO.length, best: {} });
      game.start(index);
      let heldJump = false;
      let farthest = 0;
      for (let tick = 0; tick < 120 * 150 && game.state.mode === 'playing'; tick++) {
        const { player: p, stage } = game.state;
        farthest = Math.max(farthest, p.x);
        const grounds = stage.platforms.filter(q => q.h > 1 && q.active !== false);
        const under = grounds.find(q => p.x >= q.x && p.x < q.x + q.w);
        const nextGround = under && grounds.find(q => q.x > under.x + under.w);
        const gap = under && nextGround ? nextGround.x - (under.x + under.w) : 0;
        const edge = under ? under.x + under.w - p.x : Infinity;
        const support = stage.platforms.find(q => q.active !== false && Math.abs(p.y - q.y) < .07 && p.x >= q.x && p.x < q.x + q.w);
        const ledgeEdge = support && support.h < 1 ? support.x + support.w - p.x : Infinity;
        const threat = stage.hazards.find(h => h.kind !== 'laser' && h.x - p.x > -.4 && h.x - p.x < 1.75);
        const laser = stage.hazards.find(h => h.kind === 'laser' && h.x - p.x > -.5 && h.x - p.x < 3.2);
        const phase = laser ? (game.state.time + (laser.phase ?? 0)) % 3.3 : 0;
        const stop = !!laser && p.x < laser.x - 1.15 && (phase < 1.9 || phase > 2.3);
        const wantJump = p.grounded && ((gap > 1.2 && edge < 1.2) || ledgeEdge < .9 || !!threat);
        const jump = wantJump || p.vy > .1;
        const upcoming = grounds.find(q => q.x > p.x);
        const needDash = !under && !p.grounded && p.dashReady && p.vy < 0 && p.y < -.2 && !!upcoming && upcoming.x - p.x < 2.8;
        game.update(1 / 120, frame({ move: stop ? 0 : 1, jump, jumpPressed: jump && !heldJump, dashPressed: needDash }));
        heldJump = jump;
      }
      expect(game.state.mode, `stage ${index + 1}: reached ${farthest.toFixed(1)}/${game.state.stage.length}, deaths ${game.state.deaths}`).toBe(index === STAGE_INFO.length - 1 ? 'ending' : 'complete');
      expect(game.state.deaths, `stage ${index + 1} caused repeated failures`).toBeLessThan(20);
    }
  });
});
