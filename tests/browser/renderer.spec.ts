import {test,expect} from '@playwright/test';

test('painted character packs complete isolated poses and keeps a visible fallback on asset failure',async({page})=>{
  await page.goto('/');
  const packed=await page.evaluate(async()=>{
    const path='/src/pilgrim-atlas.ts';
    const {packPilgrimAtlas,PAINTED_PILGRIM_CELL:cell}=await import(path);
    const image=new Image();image.src='/art/pilgrim-v6.png';await image.decode();
    const atlas=packPilgrimAtlas(image),c=atlas.getContext('2d')!;
    const bounds=[];
    for(let f=0;f<cell.frames;f++){
      const data=c.getImageData(f*cell.width,0,cell.width,cell.height).data;
      let left=cell.width,right=-1,top=cell.height,bottom=-1,count=0;
      for(let y=0;y<cell.height;y++)for(let x=0;x<cell.width;x++)if(data[(y*cell.width+x)*4+3]){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);count++;}
      bounds.push({left,right,top,bottom,count});
    }
    const invalid=new Image();invalid.src='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"/>');await invalid.decode();
    let rejected=false;try{packPilgrimAtlas(invalid);}catch{rejected=true;}
    return {bounds,cell,rejected};
  });
  expect(packed.bounds).toHaveLength(32);expect(packed.rejected).toBe(true);
  for(const b of packed.bounds){expect(b.count).toBeGreaterThan(1000);expect(b.left).toBeGreaterThan(0);expect(b.right).toBeLessThan(packed.cell.width-1);expect(b.top).toBeGreaterThan(0);expect(b.bottom).toBeGreaterThanOrEqual(packed.cell.foot-1);expect(b.bottom).toBeLessThanOrEqual(packed.cell.foot);}
  await page.route('**/art/pilgrim-v6.png',route=>route.abort());
  const fallback=await page.evaluate(async()=>{
    const path='/src/renderer.ts';const {GameRenderer}=await import(path);
    const canvas=document.createElement('canvas');canvas.style.cssText='width:640px;height:360px';document.body.append(canvas);
    const renderer=new GameRenderer(canvas,'balanced');
    await new Promise<void>((resolve,reject)=>{const deadline=performance.now()+3000;const check=()=>{if(renderer.heroReady)resolve();else if(performance.now()>deadline)reject(Error('No asset-error fallback'));else setTimeout(check,20);};check();});
    const visible=renderer.sprites.getContext('2d').getImageData(0,0,renderer.sprites.width,renderer.sprites.height).data.some((v:number,i:number)=>i%4===3&&v>0);
    renderer.dispose();canvas.remove();return {visible,load:renderer.heroImage.onload,error:renderer.heroImage.onerror};
  });
  expect(fallback).toEqual({visible:true,load:null,error:null});
});

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
