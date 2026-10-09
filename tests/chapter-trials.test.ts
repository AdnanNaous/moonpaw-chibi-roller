import { describe, expect, it } from 'vitest';
import { Game } from '../src/core';
import { createStage } from '../src/levels';
import type { InputFrame } from '../src/types';

const input = (part: Partial<InputFrame> = {}): InputFrame => ({ move: 0, jump: false, jumpPressed: false,
  dashPressed: false, pausePressed: false, confirmPressed: false, ...part });

describe('authored name trials', () => {
  it('requires a climb for every name and leaves every checkpoint on a safe floor', () => {
    for (let chapter = 0; chapter < 10; chapter++) {
      const stage = createStage(chapter);
      const floor = stage.platforms.filter(p => p.h > 1);
      stage.pickups.filter(p => p.kind === 'relic').forEach((seal, i) => {
        const ground = floor.find(p => seal.x >= p.x && seal.x < p.x + p.w)!;
        const entry = stage.platforms.find(p => p.id === `trial-${i}-entry`)!;
        const crown = stage.platforms.find(p => p.id === `trial-${i}-crown`)!;
        // A held floor jump plus the pickup reach is insufficient; shelves are gameplay.
        expect(seal.y - ground.y, `${stage.name}: floor bypass`).toBeGreaterThan(3.55);
        expect(entry.y - ground.y).toBeLessThan(1.8);
        expect(crown.y - entry.y).toBeLessThan(1.7);
        expect(seal.y - crown.y).toBeLessThan(1.4);
        expect(seal.x).toBeGreaterThan(crown.x);
        expect(seal.x).toBeLessThan(crown.x + crown.w);
      });
      for (const bell of stage.checkpoints) {
        expect(floor.some(p => bell.x >= p.x && bell.x + 1.1 < p.x + p.w)).toBe(true);
        expect(stage.hazards.some(h => h.kind === 'spikes' && bell.x + .55 >= h.x && bell.x + .55 <= h.x + h.w)).toBe(false);
      }
    }
  });

  it('provides a reachable intermediate landing in every long chasm', () => {
    for (let chapter = 0; chapter < 10; chapter++) {
      const stage = createStage(chapter), floor = stage.platforms.filter(p => p.h > 1);
      floor.slice(0, -1).forEach((p, i) => {
        const next = floor[i + 1], gap = next.x - p.x - p.w;
        if (gap < 4.5) return;
        const bridge = stage.platforms.find(p => p.id === `crossing-${i}`)!;
        expect(bridge, `${stage.name}: chasm ${i}`).toBeDefined();
        expect(bridge.x - p.x - p.w).toBeLessThan(2.2);
        expect(next.x - bridge.x - bridge.w).toBeLessThan(2.2);
        expect(bridge.y - p.y).toBeLessThan(1.7);
      });
    }
  });

  it('climbs all twenty authored shelf routes with physics inputs, including their moving and fading surfaces', () => {
    // This is a local traversal fixture, not a campaign shortcut: combat and traps
    // are tested by the full spawn-to-ending campaign test. No position is changed after setup.
    for (let chapter = 0; chapter < 10; chapter++) for (let trial = 0; trial < 2; trial++) {
      const game = new Game({ unlocked: 10, best: {} }); game.start(chapter);
      const stage = game.state.stage;
      const seal = stage.pickups.find(p => p.id === `seal-${trial}`)!;
      const entry = stage.platforms.find(p => p.id === `trial-${trial}-entry`)!;
      const crown = stage.platforms.find(p => p.id === `trial-${trial}-crown`)!;
      const ground = stage.platforms.find(p => p.h > 1 && seal.x >= p.x && seal.x < p.x + p.w)!;
      stage.platforms = [ground, entry, crown]; stage.hazards = []; stage.enemies = []; stage.arenas = [];
      stage.pickups = [seal]; stage.checkpoints = [];
      game.state.player.x = entry.x + entry.w * .5; game.state.player.y = ground.y;
      game.state.checkpoint = { x: game.state.player.x, y: ground.y };
      let held = false, highest = ground.y;
      for (let tick = 0; tick < 120 * 24 && !seal.collected; tick++) {
        const p = game.state.player;
        highest = Math.max(highest, p.y);
        const target = p.y < entry.y - .15 ? entry : crown;
        const goal = target.x + target.w * .5;
        const move = Math.abs(goal - p.x) < .08 ? 0 : Math.max(-1, Math.min(1, (goal - p.x) * 2.5));
        const wantJump = p.grounded && target.active !== false && target.y - p.y > .15 && Math.abs(goal - p.x) < 1.9;
        const jump = wantJump || p.vy > .1;
        game.update(1 / 120, input({ move, jump, jumpPressed: jump && !held }));
        held = jump;
      }
      expect(seal.collected, `${stage.name} trial ${trial}: ${game.state.player.x.toFixed(2)},${game.state.player.y.toFixed(2)}, peak=${highest.toFixed(2)}`).toBe(true);
    }
  });
});
