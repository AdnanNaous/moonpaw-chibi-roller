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
  await page.getByRole('button',{name:'Settings',exact:true}).click();await page.getByLabel('Effects').selectOption('balanced');
  await page.getByRole('button',{name:'← Back'}).click();await page.getByRole('button',{name:'Title',exact:true}).click();
  await page.getByRole('button',{name:'Credits',exact:true}).click();
  await expect(page.getByRole('link',{name:'GitHub ↗'})).toHaveAttribute('href','https://github.com/AdnanNaous');
  // UI fixtures only. Campaign traversal and boss windows are tested separately.
  for(const [choice,title] of [['Give your name','The Last Lantern'],['Leave alone','The Door for One'],['Name every witness','The Silence After']]){
    await page.evaluate(()=>{const save=(window as any).moonpaw.save;Object.assign(save,{unlocked:10,best:{},secrets:Array.from({length:10},(_,i)=>`fixture-${i}`)});localStorage.setItem('moonpaw-progress-v2',JSON.stringify(save));});
    await page.reload();await page.getByRole('button',{name:'Continue',exact:true}).click();await page.getByRole('button',{name:'Begin now'}).click();
    await page.evaluate(()=>{const s=(window as any).moonpaw.state;s.relicsCollected=s.relicsRequired;s.bossHealth=0;s.player.x=s.stage.exit.x;s.player.y=s.stage.exit.y;});
    await page.getByRole('button',{name:choice,exact:true}).click();await expect(page.getByRole('heading',{name:title,exact:true})).toBeVisible();
    await page.getByRole('button',{name:'Credits',exact:true}).click();await expect(page.getByText('Created & directed by')).toBeVisible();
  }
  expect(errors).toEqual([]);
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
