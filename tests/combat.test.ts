import { describe, expect, it } from 'vitest';
import { Game } from '../src/core';
import type { InputFrame } from '../src/types';

const frame = (input: Partial<InputFrame> = {}): InputFrame => ({ move: 0, jump: false, jumpPressed: false,
  dashPressed: false, attackPressed: false, pausePressed: false, confirmPressed: false, ...input });
const advance = (game: Game, seconds: number, input = frame()) => {
  for (let n = 0; n < Math.ceil(seconds * 120); n++) game.update(1 / 120, input);
};
function encounter(chapter = 0) {
  const game = new Game({ unlocked: 10, best: {} }); game.start(chapter);
  const arena = game.state.stage.arenas[0];
  game.state.player.x = arena.x + 1;
  game.update(1 / 120, frame());
  return game;
}

describe('combat encounters', () => {
  it('locks a live encounter and prevents running through untouched enemies', () => {
    const game = encounter(); const arena = game.state.stage.arenas[0];
    advance(game, 1.1, frame({ move: 1 }));
    expect(game.state.arenaActive).toBe(arena.id);
    expect(game.state.player.x).toBeLessThanOrEqual(arena.x + arena.w - .35);
    expect(arena.cleared).toBe(false);
    expect(game.state.kills).toBe(0);
  });

  it('telegraphs a committed attack and leaves a visible recovery opening', () => {
    const game = encounter(); const e = game.state.stage.enemies[0];
    game.state.player.x = e.x + e.w / 2 - 1;
    advance(game, .6);
    expect(e.phase).toBe('windup'); expect(e.telegraph).toBeGreaterThan(0);
    const lockedAim = e.attackX;
    game.state.player.x += .8; advance(game, .25);
    expect(e.attackX).toBe(lockedAim);
    advance(game, .6);
    expect(e.phase).toBe('recovery');
  });

  it('takes one hit with invulnerability and rewards a timed dodge without tanking damage', () => {
    const game = encounter(); const e = game.state.stage.enemies[0]; const p = game.state.player;
    e.phase = 'attack'; e.timer = .18; e.attackX = p.x - 1; e.attackY = 0; e.attackW = 2; e.attackH = 2;
    game.update(1 / 120, frame()); expect(p.health).toBe(4);
    advance(game, .08); expect(p.health).toBe(4);
    const dodge = encounter(); const enemy = dodge.state.stage.enemies[0]; const dodger = dodge.state.player;
    enemy.phase = 'attack'; enemy.timer = .18; enemy.attackX = dodger.x - 1; enemy.attackY = 0; enemy.attackW = 3; enemy.attackH = 2;
    dodge.update(1 / 120, frame({ dashPressed: true }));
    expect(dodger.health).toBe(5); expect(dodger.dashInvulnerability).toBeGreaterThan(0);
    expect(dodger.stamina).toBeLessThan(65);
  });

  it('damages each enemy once per swing and blocks strikes behind the player', () => {
    const game = encounter(); const e = game.state.stage.enemies[0]; const p = game.state.player;
    p.x = e.x + e.w / 2 - 1; p.facing = -1;
    game.update(1 / 120, frame({ attackPressed: true })); expect(e.health).toBe(e.maxHealth);
    advance(game, .3); p.facing = 1;
    game.update(1 / 120, frame({ attackPressed: true }));
    expect(e.health).toBe(e.maxHealth - 1);
    advance(game, .1); expect(e.health).toBe(e.maxHealth - 1);
  });

  it('offers one build decision after clearing, and rejects unearned or repeated choices', () => {
    const game = encounter(); expect(game.selectBoon('ward')).toBe(false);
    for (const e of game.state.stage.enemies.filter(e => e.arena === game.state.arenaActive)) { e.health = 0; e.phase = 'dead'; }
    game.update(1 / 120, frame());
    expect(game.state.boonOptions).toEqual(['fang', 'ward', 'rush']);
    expect(game.state.arenaActive).toBeNull();
    expect(game.selectBoon('ward')).toBe(true);
    expect(game.state.player.maxHealth).toBe(7);
    expect(game.selectBoon('fang')).toBe(false);
  });

  it('makes the combo pact reward a third strike and the mobility pact lower dodge cost', () => {
    const game = encounter(); const p = game.state.player; const e = game.state.stage.enemies[0];
    game.state.boonOptions = ['fang']; expect(game.selectBoon('fang')).toBe(true);
    e.maxHealth = 6; e.health = 6; e.phase = 'recovery'; e.timer = 2;
    p.x = e.x + e.w / 2 - 1; p.facing = 1;
    game.update(1 / 120, frame({ attackPressed: true })); advance(game, .28);
    game.update(1 / 120, frame({ attackPressed: true })); advance(game, .28);
    game.update(1 / 120, frame({ attackPressed: true }));
    expect(p.combo).toBe(3); expect(e.health).toBe(2);
    const rush = encounter(); rush.state.boonOptions = ['rush']; rush.selectBoon('rush');
    rush.update(1 / 120, frame({ dashPressed: true }));
    expect(rush.state.player.stamina).toBeCloseTo(74, 1);
  });

  it('buffers a late strike through recovery and prevents chaining continuous dodge immunity', () => {
    const game = new Game(); game.start(0); advance(game, .05);
    game.update(1 / 120, frame({ attackPressed: true })); advance(game, .19);
    game.update(1 / 120, frame({ attackPressed: true }));
    advance(game, .09);
    expect(game.state.player.combo).toBe(2);
    game.restart(); advance(game, .05);
    game.update(1 / 120, frame({ dashPressed: true }));
    advance(game, .2); const stamina = game.state.player.stamina;
    game.update(1 / 120, frame({ dashPressed: true }));
    expect(game.state.player.dashInvulnerability).toBe(0);
    expect(game.state.player.stamina).toBe(stamina);
  });

  it('restores an unfinished encounter after death while keeping pre-checkpoint clears', () => {
    const game = encounter(); const first = game.state.stage.arenas[0];
    first.cleared = true; game.state.arenaActive = null;
    game.state.checkpoint = { x: first.x + first.w + 2, y: 0 };
    const second = game.state.stage.enemies.find(e => e.arena === game.state.stage.arenas[1].id)!;
    second.health = 1;
    game.state.player.y = -6; game.update(1 / 120, frame());
    expect(first.cleared).toBe(true); expect(second.health).toBe(second.maxHealth);
    expect(game.state.player.health).toBe(5); expect(game.state.deaths).toBe(1);
  });

  it('gives the Regent three patterns, guarded windups, and real recovery damage', () => {
    const game = new Game({ unlocked: 10, best: {} }); game.start(9);
    const e = game.state.stage.enemies.find(e => e.kind === 'regent')!;
    const p = game.state.player; p.x = e.x - .5; p.y = e.y; p.facing = 1;
    game.update(1 / 120, frame());
    e.phase = 'windup'; e.timer = .6;
    game.update(1 / 120, frame({ attackPressed: true })); expect(e.health).toBe(12);
    advance(game, .3); e.phase = 'recovery'; e.timer = .7;
    game.update(1 / 120, frame({ attackPressed: true })); expect(e.health).toBe(11);
    e.health = 7; e.phase = 'idle'; e.timer = 0; e.attackCount = 2;
    game.update(1 / 120, frame()); expect(e.bossPhase).toBe(2); expect(e.attackKind).toBe('slam');
    e.health = 3; game.update(1 / 120, frame()); expect(e.bossPhase).toBe(3);
  });

  it.each([7, 3])('counters repeated jumping with a rollable high cleave at %i Regent health', (health) => {
    const highCleave = () => {
      const game = new Game({ unlocked: 10, best: {} }); game.start(9);
      const enemy = game.state.stage.enemies.find(e => e.kind === 'regent')!;
      const player = game.state.player;
      enemy.health = health; enemy.attackCount = 0; enemy.phase = 'idle'; enemy.timer = 0;
      player.x = enemy.x + enemy.w / 2 + 1.05; player.y = enemy.y; player.facing = -1;
      game.update(1 / 120, frame());
      expect(enemy.attackKind).toBe('slash');
      expect(enemy.attackY).toBeCloseTo(enemy.y + .8);
      expect(game.state.warning).toMatch(/HIGH CLEAVE/);
      return { game, enemy, player };
    };
    const jumper = highCleave();
    advance(jumper.game, jumper.enemy.timer - .3);
    jumper.game.update(1 / 120, frame({ jump: true, jumpPressed: true }));
    advance(jumper.game, .48, frame({ jump: true }));
    expect(jumper.player.health).toBe(4);
    const roller = highCleave();
    advance(roller.game, roller.enemy.timer - .02);
    roller.game.update(1 / 120, frame({ move: -1, dashPressed: true }));
    advance(roller.game, .23, frame({ move: -1 }));
    expect(roller.player.health).toBe(5);
    expect(roller.player.stamina).toBeLessThan(65);
    expect(roller.player.x).toBeLessThan(roller.enemy.attackX);
  });

  it('leaves the contrasting low shockwave avoidable by the same timed jump', () => {
    const game = new Game({ unlocked: 10, best: {} }); game.start(9);
    const enemy = game.state.stage.enemies.find(e => e.kind === 'regent')!;
    const player = game.state.player;
    enemy.health = 7; enemy.attackCount = 2; enemy.phase = 'idle'; enemy.timer = 0;
    player.x = enemy.x + enemy.w / 2 + 1.05; player.y = enemy.y;
    game.update(1 / 120, frame());
    expect(enemy.attackKind).toBe('slam');
    expect(game.state.warning).toMatch(/LOW SHOCKWAVE/);
    advance(game, enemy.timer - .3);
    game.update(1 / 120, frame({ jump: true, jumpPressed: true }));
    advance(game, .48, frame({ jump: true }));
    expect(player.health).toBe(5);
    expect(player.stamina).toBe(100);
  });
});
