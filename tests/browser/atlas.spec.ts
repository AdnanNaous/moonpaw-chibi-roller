import {test,expect} from '@playwright/test';

test('atlas worker matches direct RGBA packing and isolates all character and enemy poses',async({page})=>{
  const workers:string[]=[];page.on('worker',worker=>workers.push(worker.url()));
  await page.goto('/');
  const result=await page.evaluate(async()=>{
    const paths=['/src/atlas-loader.ts','/src/pilgrim-atlas.ts','/src/enemy-atlas.ts','/src/terrain-atlas.ts'];
    const [{loadAtlas},{packPilgrimAtlas,PAINTED_PILGRIM_CELL:heroCell},{packEnemyAtlas,ENEMY_CELL:enemyCell},{packTerrainAtlas}]=await Promise.all(paths.map(path=>import(path)));
    const load=async(path:string)=>{const image=new Image();image.src=path;await image.decode();return image;};
    const [hero,enemies,terrain]=await Promise.all(['/art/pilgrim-v6.png','/art/enemies-v7.png','/art/terrain-v7.png'].map(load));
    const [workerHero,workerEnemies,workerTerrain]=await Promise.all([loadAtlas(hero,'pilgrim'),loadAtlas(enemies,'enemies'),loadAtlas(terrain,'terrain')]);
    const pixels=(canvas:HTMLCanvasElement)=>canvas.getContext('2d')!.getImageData(0,0,canvas.width,canvas.height).data;
    const identical=(a:HTMLCanvasElement,b:HTMLCanvasElement)=>{
      if(a.width!==b.width||a.height!==b.height)return false;
      const x=pixels(a),y=pixels(b);for(let i=0;i<x.length;i++)if(x[i]!==y[i])return false;return true;
    };
    const bounds=(atlas:HTMLCanvasElement,width:number,height:number,cols:number,rows:number)=>{
      const c=atlas.getContext('2d')!,frames=[];
      for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
        const data=c.getImageData(col*width,row*height,width,height).data;
        let left=width,right=-1,top=height,bottom=-1,count=0;
        for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(data[(y*width+x)*4+3]){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);count++;}
        frames.push({left,right,top,bottom,count});
      }
      return frames;
    };
    const transparency=[hero,enemies,terrain].map(image=>{
      const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;canvas.getContext('2d')!.drawImage(image,0,0);
      const data=pixels(canvas);let clear=0;for(let i=3;i<data.length;i+=4)if(data[i]===0)clear++;return clear/(data.length/4);
    });
    const directTerrain=packTerrainAtlas(terrain);
    return {
      matches:[identical(workerHero[0],packPilgrimAtlas(hero)),identical(workerEnemies[0],packEnemyAtlas(enemies)),...workerTerrain.map((canvas:HTMLCanvasElement,i:number)=>identical(canvas,directTerrain[i]))],
      hero:bounds(workerHero[0],heroCell.width,heroCell.height,heroCell.frames,1),
      enemies:bounds(workerEnemies[0],enemyCell.width,enemyCell.height,enemyCell.columns,enemyCell.rows),
      heroCell,enemyCell,transparency,terrainSizes:workerTerrain.map((canvas:HTMLCanvasElement)=>({width:canvas.width,height:canvas.height,opaque:pixels(canvas).some((v,i)=>i%4===3&&v>0)})),
    };
  });
  expect(workers.some(url=>url.includes('atlas-worker'))).toBe(true);
  expect(result.matches).toEqual([true,true,true,true,true,true]);
  for(const fraction of result.transparency)expect(fraction).toBeGreaterThan(.25);
  expect(result.hero).toHaveLength(32);expect(result.enemies).toHaveLength(16);
  for(const [frames,cell] of [[result.hero,result.heroCell],[result.enemies,result.enemyCell]] as const)for(const frame of frames){
    expect(frame.count).toBeGreaterThan(1000);expect(frame.left).toBeGreaterThan(0);expect(frame.right).toBeLessThan(cell.width-1);expect(frame.top).toBeGreaterThan(0);
    expect(frame.bottom).toBeGreaterThanOrEqual(cell.foot-1);expect(frame.bottom).toBeLessThanOrEqual(cell.foot);
  }
  expect(result.terrainSizes).toHaveLength(4);for(const size of result.terrainSizes){expect(size.opaque).toBe(true);expect(size.width).toBeGreaterThan(1400);expect(size.height).toBeGreaterThan(150);}
});

test('same-size resize and same-theme chapter setup retain painted caches while quality invalidates them',async({page})=>{
  await page.goto('/');
  const result=await page.evaluate(async()=>{
    const paths=['/src/core.ts','/src/renderer.ts','/src/structures.ts'];const [{Game},{GameRenderer},{preloadStructureArt}]=await Promise.all(paths.map(path=>import(path)));
    const game=new Game();game.start(0);await preloadStructureArt();
    const canvas=document.createElement('canvas');canvas.style.cssText='width:960px;height:540px';document.body.append(canvas);
    const renderer=new GameRenderer(canvas,'balanced');await renderer.atlas.decode();
    renderer.setStage(game.state.stage);renderer.render(game.state,1,0,1/60);
    const layers=renderer.layers,foreground=renderer.foreground,overlay=renderer.frameOverlay,backplate=renderer.backplate;
    const painted=[...renderer.structures.entries()];
    const create=document.createElement.bind(document);let createdCanvases=0;
    document.createElement=((...args:Parameters<typeof document.createElement>)=>{if(args[0]==='canvas')createdCanvases++;return create(...args);}) as typeof document.createElement;
    try{for(let i=0;i<5;i++){renderer.resize();renderer.setStage({...game.state.stage});}}finally{document.createElement=create;}
    const reused={layers:renderer.layers===layers,foreground:renderer.foreground===foreground,overlay:renderer.frameOverlay===overlay,backplate:renderer.backplate===backplate,structures:painted.length>0&&painted.every(([id,art]:[string,HTMLCanvasElement])=>renderer.structures.get(id)===art)};
    renderer.setQuality('high');
    const invalidated={layers:renderer.layers!==layers,foreground:renderer.foreground!==foreground,overlay:renderer.frameOverlay!==overlay,backplate:renderer.backplate!==backplate,structures:renderer.structures.size===0};
    renderer.render(game.state,1,1,1/60);const rebuilt=painted.every(([id,art]:[string,HTMLCanvasElement])=>renderer.structures.get(id)!==art);
    // The narrow-screen world scale changes at .85 even if rounded pixel
    // dimensions do not. Its platform and background caches must invalidate.
    canvas.style.cssText='width:338px;height:398px';renderer.resize();renderer.render(game.state,1,2,1/60);
    const narrow={width:renderer.width,height:renderer.height,unit:renderer.unit,layers:renderer.layers,foreground:renderer.foreground};
    canvas.style.width='339px';renderer.resize();
    const aspect={samePixels:renderer.width===narrow.width&&renderer.height===narrow.height,changedUnit:renderer.unit!==narrow.unit,layers:renderer.layers!==narrow.layers,foreground:renderer.foreground!==narrow.foreground,structures:renderer.structures.size===0};
    renderer.dispose();canvas.remove();return {reused,invalidated,rebuilt,createdCanvases,aspect};
  });
  expect(result.reused).toEqual({layers:true,foreground:true,overlay:true,backplate:true,structures:true});
  expect(result.invalidated).toEqual({layers:true,foreground:true,overlay:true,backplate:true,structures:true});expect(result.rebuilt).toBe(true);expect(result.createdCanvases).toBe(0);
  expect(result.aspect).toEqual({samePixels:true,changedUnit:true,layers:true,foreground:true,structures:true});
});

test('disposed renderer ignores in-flight worker artwork instead of reviving its caches',async({page})=>{
  await page.goto('/');
  const result=await page.evaluate(async()=>{
    const paths=['/src/renderer.ts','/src/atlas-loader.ts'];const [{GameRenderer},{loadAtlas}]=await Promise.all(paths.map(path=>import(path)));
    const nativeBitmap=window.createImageBitmap.bind(window),releases:Array<()=>Promise<void>>=[];
    // Hold decoded bitmap jobs so disposal reliably occurs before worker output.
    window.createImageBitmap=((...args:Parameters<typeof createImageBitmap>)=>new Promise<ImageBitmap>((resolve,reject)=>{
      releases.push(async()=>{try{resolve(await (nativeBitmap as any)(...args));}catch(error){reject(error);}});
    })) as typeof createImageBitmap;
    const canvas=document.createElement('canvas');canvas.style.cssText='width:640px;height:360px';document.body.append(canvas);
    const renderer=new GameRenderer(canvas,'balanced');
    try{
      await Promise.all([renderer.heroImage.decode(),renderer.enemyImage.decode()]);
      const hero=renderer.sprites,enemies=renderer.enemySprites;renderer.dispose();
      window.createImageBitmap=nativeBitmap;
      const held=releases.length;await Promise.all(releases.map(release=>release()));
      // These jobs finish after the held jobs, providing a real worker barrier.
      await Promise.all([loadAtlas(renderer.heroImage,'pilgrim'),loadAtlas(renderer.enemyImage,'enemies')]);
      return {held,heroUnchanged:renderer.sprites===hero,enemiesUnchanged:renderer.enemySprites===enemies,layers:renderer.layers.length,structures:renderer.structures.size,overlay:renderer.frameOverlay===undefined,backplate:renderer.backplate===undefined,callbacks:[renderer.heroImage.onload,renderer.heroImage.onerror,renderer.enemyImage.onload]};
    }finally{window.createImageBitmap=nativeBitmap;renderer.dispose();canvas.remove();}
  });
  expect(result.held).toBeGreaterThanOrEqual(2);expect(result.heroUnchanged).toBe(true);expect(result.enemiesUnchanged).toBe(true);
  expect(result.layers).toBe(0);expect(result.structures).toBe(0);expect(result.overlay).toBe(true);expect(result.backplate).toBe(true);expect(result.callbacks).toEqual([null,null,null]);
});
