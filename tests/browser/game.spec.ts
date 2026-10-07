import {test,expect} from '@playwright/test';
test.use({hasTouch:true});
test('fullscreen button enters and exits fullscreen, and pixels use integer scaling',async({page})=>{
  await page.goto('/');await page.getByRole('button',{name:'Fullscreen',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>!!document.fullscreenElement)).toBe(true);
  await page.getByRole('button',{name:'Exit fullscreen',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>!!document.fullscreenElement)).toBe(false);
  await page.getByRole('button',{name:'Enter the crypt',exact:true}).click();await page.getByRole('button',{name:'Begin now'}).click();
  const stats=await page.evaluate(()=>(window as any).moonpaw.stats);expect(Number.isInteger(stats.pixelScale)).toBe(true);expect(stats.pixelScale).toBeGreaterThan(1);
});
test('story, gameplay input, paused journal/settings, credits and ending choices',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/');await page.getByRole('button',{name:'Enter the crypt',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Sentence of Stone'})).toBeVisible();
  await page.getByRole('button',{name:'Continue',exact:true}).click();await page.getByRole('button',{name:'Begin now'}).click();
  await page.keyboard.down('d');await page.waitForTimeout(400);await page.keyboard.up('d');
  expect(await page.evaluate(()=>(window as any).moonpaw.state.player.x)).toBeGreaterThan(3);
  await page.keyboard.press('j');await expect.poll(()=>page.evaluate(()=>(window as any).moonpaw.state.player.stamina)).toBeLessThan(85);
  await page.keyboard.press('Escape');await page.getByRole('button',{name:'Journal',exact:true}).click();
  await expect(page.getByRole('heading',{name:'The witnesses'})).toBeVisible();await page.getByRole('button',{name:'← Back'}).click();
  await expect(page.getByRole('heading',{name:'Pause',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Settings',exact:true}).click();await page.getByRole('button',{name:'Display',exact:true}).click();await page.getByLabel('Effects',{exact:true}).selectOption('balanced');
  await page.getByRole('button',{name:'← Back'}).click();await page.getByRole('button',{name:'Title',exact:true}).click();
  await page.getByRole('button',{name:'Credits',exact:true}).click();
  await expect(page.getByRole('link',{name:'GitHub ↗'})).toHaveAttribute('href','https://github.com/AdnanNaous');
  // UI fixtures only. Campaign traversal and boss windows are tested separately.
  for(const [choice,title] of [['Give your name','The Last Lantern'],['Leave alone','The Door for One'],['Name every witness','The Silence After']]){
    await page.evaluate(()=>{const save=(window as any).moonpaw.save;Object.assign(save,{unlocked:10,best:{},secrets:Array.from({length:10},(_,i)=>`fixture-${i}`)});localStorage.setItem('moonpaw-progress-v2',JSON.stringify(save));});
    await page.reload();await page.getByRole('button',{name:'Continue',exact:true}).click();await page.getByRole('button',{name:'Begin now'}).click();
    await page.evaluate(()=>{const s=(window as any).moonpaw.state;s.relicsCollected=s.relicsRequired;s.bossHealth=0;s.stage.arenas.forEach((a:any)=>a.cleared=true);s.stage.enemies.forEach((e:any)=>{e.health=0;e.phase='dead';});s.player.x=s.stage.exit.x;s.player.y=s.stage.exit.y;});
    await page.getByRole('button',{name:choice,exact:true}).click();await expect(page.getByRole('heading',{name:title,exact:true})).toBeVisible();
    await page.getByRole('button',{name:'Credits',exact:true}).click();await expect(page.getByText('Created & directed by')).toBeVisible();
  }
  expect(errors).toEqual([]);
});
test('settings persist separate sound controls and accessibility; pact selection resumes play',async({page})=>{
  await page.goto('/');await page.getByRole('button',{name:'Settings',exact:true}).click();
  await page.getByLabel('Music',{exact:true}).fill('0.45');await page.getByLabel('Effects volume',{exact:true}).fill('0.6');
  await page.getByRole('button',{name:'Controls',exact:true}).click();await page.getByLabel('Larger touch buttons').check();
  await page.getByRole('button',{name:'Display',exact:true}).click();await page.getByLabel('Reduce decorative motion').check();
  await page.reload();await page.getByRole('button',{name:'Settings',exact:true}).click();
  await expect(page.getByLabel('Music',{exact:true})).toHaveValue('0.45');await expect(page.getByLabel('Effects volume',{exact:true})).toHaveValue('0.6');
  await page.getByRole('button',{name:'Controls',exact:true}).click();await expect(page.getByLabel('Larger touch buttons')).toBeChecked();
  await page.getByRole('button',{name:'← Back'}).click();await page.getByRole('button',{name:'Enter the crypt'}).click();await page.getByRole('button',{name:'Begin now'}).click();
  // UI fixture only; earned boons and sealed fights are verified in combat tests.
  await page.evaluate(()=>{(window as any).moonpaw.state.boonOptions=['fang','ward','rush'];});
  await expect(page.getByRole('heading',{name:'Choose your pact'})).toBeVisible();
  await page.getByRole('button',{name:/Serrated Fang/}).click();
  await expect.poll(()=>page.evaluate(()=>(window as any).moonpaw.state.boon)).toBe('fang');
  await expect.poll(()=>page.evaluate(()=>(window as any).moonpaw.state.mode)).toBe('playing');
});
test('Android exit returns to title before minimizing and hardware Back pauses (simulated native bridge)',async({page})=>{
  await page.addInitScript(()=>{
    const w=window as any;w.androidBridge={};w.nativeMinimized=0;
    w.Capacitor={PluginHeaders:[{name:'App',methods:[{name:'minimizeApp',rtype:'promise'},{name:'addListener',rtype:'callback'},{name:'removeListener',rtype:'promise'}]}],nativePromise:async(_plugin:string,method:string)=>{if(method==='minimizeApp')w.nativeMinimized++;return {};},nativeCallback:(_plugin:string,_method:string,options:any,callback:any)=>{if(options.eventName==='backButton')w.nativeBack=callback;return 'fixture';}};
  });
  await page.goto('/');await page.getByRole('button',{name:'Enter the crypt'}).click();await page.getByRole('button',{name:'Begin now'}).click();
  await page.evaluate(()=>(window as any).nativeBack());await expect(page.getByRole('heading',{name:'Pause',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Exit to device',exact:true}).click();await page.getByRole('button',{name:'Exit to device',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>(window as any).nativeMinimized)).toBe(1);
  await expect(page.getByRole('heading',{name:'MOONPAW',exact:true})).toBeVisible();
  expect(await page.evaluate(()=>(window as any).moonpaw.state.mode)).toBe('menu');
});
test('controller axes adjust Settings ranges without triggering movement (simulated standard pad)',async({page})=>{
  await page.addInitScript(()=>{const w=window as any;w.fixturePad={index:0,connected:true,axes:[0,0],buttons:Array.from({length:16},()=>({pressed:false,value:0}))};Object.defineProperty(navigator,'getGamepads',{value:()=>[w.fixturePad]});});
  await page.goto('/');await page.getByRole('button',{name:'Settings',exact:true}).click();await page.getByLabel('Music',{exact:true}).focus();
  const before=Number(await page.getByLabel('Music',{exact:true}).inputValue());
  await page.evaluate(()=>(window as any).fixturePad.axes[0]=-1);
  await expect.poll(async()=>Number(await page.getByLabel('Music',{exact:true}).inputValue())).toBeLessThan(before);
  await page.evaluate(()=>(window as any).fixturePad.axes[0]=0);
  expect(await page.evaluate(()=>(window as any).moonpaw.state.mode)).toBe('menu');
});
test('real multi-touch movement survives jump release; controls stay outside the world',async({page,context})=>{
  await page.setViewportSize({width:844,height:390});await page.goto('/');
  await page.getByRole('button',{name:'Enter the crypt'}).click();await page.getByRole('button',{name:'Begin now'}).click();
  const pad=(await page.getByRole('slider',{name:'Movement'}).boundingBox())!,jump=(await page.getByRole('button',{name:'Jump',exact:true}).boundingBox())!;
  const scene=(await page.locator('#game').boundingBox())!,dock=(await page.locator('#controls').boundingBox())!;
  expect(dock.y).toBeGreaterThanOrEqual(scene.y+scene.height);
  const cdp=await context.newCDPSession(page);
  const p1={id:1,x:pad.x+pad.width/2,y:pad.y+pad.height/2},p2={id:2,x:jump.x+jump.width/2,y:jump.y+jump.height/2};
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[p1]});p1.x+=40;
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[p1]});await page.waitForTimeout(220);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[p1,p2]});await page.waitForTimeout(130);
  expect(await page.evaluate(()=>(window as any).moonpaw.state.player.y)).toBeGreaterThan(.5);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[p1]});
  const x=await page.evaluate(()=>(window as any).moonpaw.state.player.x);await page.waitForTimeout(160);
  expect(await page.evaluate(()=>(window as any).moonpaw.state.player.x)).toBeGreaterThan(x+.5);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});await page.waitForTimeout(220);
  expect(await page.getByRole('slider',{name:'Movement'}).getAttribute('aria-valuenow')).toBe('0');
  expect(Math.abs(await page.evaluate(()=>(window as any).moonpaw.state.player.vx))).toBeLessThan(.2);
  await page.screenshot({path:'docs/screenshots/mobile-landscape.png'});await page.setViewportSize({width:390,height:844});
  const portraitCanvas=(await page.locator('#game').boundingBox())!,portraitDock=(await page.locator('#controls').boundingBox())!;
  expect(portraitDock.y).toBeGreaterThanOrEqual(portraitCanvas.y+portraitCanvas.height);
  await expect(page.getByRole('button',{name:'Jump',exact:true})).toBeInViewport();await page.screenshot({path:'docs/screenshots/mobile-portrait.png'});
  await page.keyboard.press('Escape');await page.getByRole('button',{name:'Title',exact:true}).click();
  await expect(page.getByRole('button',{name:'Enter the crypt'})).toBeInViewport();await page.screenshot({path:'docs/screenshots/mobile-title.png'});
});
