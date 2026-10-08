import {describe,it,expect} from 'vitest';
import {Game} from '../src/core';
import type {InputFrame} from '../src/types';
const input=(part:Partial<InputFrame>={}):InputFrame=>({move:0,jump:false,jumpPressed:false,dashPressed:false,pausePressed:false,confirmPressed:false,...part});
const run=(g:Game,seconds:number,part:Partial<InputFrame>={})=>{for(let i=0;i<Math.ceil(seconds*120);i++)g.update(1/120,input(part));};
const ready=()=>{const g=new Game();g.start(0);run(g,.05);return g;};
describe('precise movement',()=>{
 it('distinguishes a tapped hop from a held jump',()=>{
  const peak=(held:boolean)=>{const g=ready();g.update(1/120,input({jump:true,jumpPressed:true}));let top=0;for(let i=0;i<110;i++){g.update(1/120,input({jump:held}));top=Math.max(top,g.state.player.y);}return top;};
  const hop=peak(false),full=peak(true);expect(hop).toBeGreaterThan(.5);expect(hop).toBeLessThan(1.1);expect(full).toBeGreaterThan(1.9);expect(full-hop).toBeGreaterThan(1);
 });
 it('stops promptly and changes direction without a long skid',()=>{
  const g=ready();run(g,.2,{move:1});expect(g.state.player.vx).toBeGreaterThan(6);const x=g.state.player.x;run(g,.1);expect(g.state.player.vx).toBe(0);expect(g.state.player.x-x).toBeLessThan(.32);run(g,.15,{move:-1});expect(g.state.player.vx).toBeLessThan(-6);
 });
 it('locks a committed dodge direction while accepting later steering',()=>{
  const g=ready();g.update(1/120,input({move:1,dashPressed:true}));const x=g.state.player.x;run(g,.10,{move:-1});expect(g.state.player.x).toBeGreaterThan(x+1);expect(g.state.player.facing).toBe(1);run(g,.25,{move:-1});expect(g.state.player.vx).toBeLessThan(0);expect(g.state.player.facing).toBe(-1);
 });
 it('holds a wall kick away from the wall long enough to gain separation',()=>{
  const g=ready(),p=g.state.player;p.grounded=false;p.wall=1;p.y=1;
  g.update(1/120,input({move:1,jump:true,jumpPressed:true}));const x=p.x;run(g,.08,{move:1,jump:true});expect(p.x).toBeLessThan(x-.5);expect(p.facing).toBe(-1);
 });
 it('buffers a jump just before landing and advances foot poses by distance',()=>{
  const g=ready(),p=g.state.player;p.grounded=false;p.y=.13;p.vy=-5;g.update(1/120,input({jump:true,jumpPressed:true}));run(g,.12,{jump:true});expect(p.y).toBeGreaterThan(.5);expect(p.vy).toBeGreaterThan(0);
  const walk=ready();run(walk,.3,{move:.5});const before=walk.state.player.stride;expect(before).toBeGreaterThan(.5);run(walk,.2);const stopped=walk.state.player.stride;run(walk,.2);expect(walk.state.player.stride).toBe(stopped);expect(stopped).toBeGreaterThan(before);
 });
});
