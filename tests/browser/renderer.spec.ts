import {test,expect} from '@playwright/test';

test('fixed-step presentation interpolates without changing physics and snaps pause or respawn',async({page})=>{
  await page.goto('/');
  const result=await page.evaluate(async()=>{
    const corePath='/src/core.ts',rendererPath='/src/renderer.ts';
    const [{Game},{GameRenderer}]=await Promise.all([import(corePath),import(rendererPath)]);
    const game=new Game();game.start(0);
    const canvas=document.createElement('canvas');canvas.style.cssText='width:640px;height:360px';document.body.append(canvas);
    const renderer=new GameRenderer(canvas,'balanced');renderer.setStage(game.state.stage);
    let drawn=0;
    const draw=renderer.drawPilgrim.bind(renderer);
    renderer.drawPilgrim=(state:any,time:number)=>{drawn=state.player.x;draw(state,time);};
    const start=game.state.player.x;
    renderer.capturePhysics(game.state);
    game.update(1/120,{move:1,jump:false,jumpPressed:false,dashPressed:false,attackPressed:false,pausePressed:false,confirmPressed:false});
    const end=game.state.player.x,positions:number[]=[],physics:number[]=[];
    for(const alpha of [0,.5,1]){renderer.render(game.state,alpha,1,1/60);positions.push(drawn);physics.push(game.state.player.x);}
    game.pause();renderer.render(game.state,0,1,1/60);const paused=drawn;
    game.resume();game.state.player.x+=10;renderer.render(game.state,0,1,1/60);const respawn=drawn;
    renderer.dispose();canvas.remove();
    return {start,end,positions,physics,paused,respawn,actual:game.state.player.x};
  });
  expect(result.end).toBeGreaterThan(result.start);
  expect(result.positions[0]).toBe(result.start);
  expect(result.positions[1]).toBeCloseTo((result.start+result.end)/2,10);
  expect(result.positions[2]).toBe(result.end);
  expect(result.physics).toEqual([result.end,result.end,result.end]);
  expect(result.paused).toBe(result.end);
  expect(result.respawn).toBe(result.actual);
});
