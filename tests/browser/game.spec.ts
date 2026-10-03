import {test,expect} from '@playwright/test';
test.use({hasTouch:true});
test('story, movement, settings, credits and all three ending screens',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/');await page.getByRole('button',{name:'Enter the afterlife ↗'}).click();
  await expect(page.getByRole('heading',{name:'The Last Platform'})).toBeVisible();
  await page.getByRole('button',{name:'Skip scene'}).click();
  await page.keyboard.down('d');await page.waitForTimeout(500);await page.keyboard.up('d');
  expect(await page.evaluate(()=>(window as any).moonpaw.state.player.x)).toBeGreaterThan(4);
  await page.keyboard.press('Escape');await page.getByRole('button',{name:'Return to title'}).click();
  await page.getByRole('button',{name:'Settings',exact:true}).click();await page.getByLabel('Graphics').selectOption('balanced');
  await page.getByRole('button',{name:'← Back'}).click();await page.getByRole('button',{name:'Credits',exact:true}).click();
  await expect(page.getByRole('link',{name:'GitHub ↗'})).toHaveAttribute('href','https://github.com/AdnanNaous');
  // Test ending UI with a dedicated fixture save; gameplay traversal has separate no-teleport tests.
  for(const [choice,title] of [['Give the city your name','The Little Lantern'],['Keep your name. Go home.','Nine Lives, One Shadow'],['Remember every name','Every Name, Remembered']]){
    await page.evaluate((allMemories)=>{
      const save=(window as any).moonpaw.save;
      save.unlocked=10;save.best={};save.secrets=allMemories?Array.from({length:10},(_,i)=>`chapter-${i}:memory`):[];
      localStorage.setItem('moonpaw-progress-v1',JSON.stringify(save));
    },choice==='Remember every name');
    await page.reload();await page.getByRole('button',{name:'Continue the story ↗'}).click();await page.getByRole('button',{name:'Skip scene'}).click();
    await page.evaluate(()=>{const s=(window as any).moonpaw.state;s.player.x=s.stage.exit.x;s.player.y=s.stage.exit.y;});
    await page.getByRole('button',{name:choice,exact:true}).click();await expect(page.getByRole('heading',{name:title,exact:true})).toBeVisible();
    await page.getByRole('button',{name:'The people behind the light →'}).click();await expect(page.getByText('Created & directed by Adnan Naous')).toBeVisible();
  }
  expect(errors).toEqual([]);
});
test('mobile landscape touch input and portrait layout',async({page})=>{
  await page.setViewportSize({width:844,height:390});
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/');await page.getByRole('button',{name:'Enter the afterlife ↗'}).click();await page.getByRole('button',{name:'Skip scene'}).click();
  await page.getByRole('button',{name:'Move right',exact:true}).hover();await page.mouse.down();
  await page.waitForTimeout(300);
  await page.mouse.up();
  expect(await page.evaluate(()=>(window as any).moonpaw.state.player.x)).toBeGreaterThan(2.5);
  await page.keyboard.press('Escape');await page.getByRole('button',{name:'Return to title'}).click();
  await page.setViewportSize({width:390,height:844});await expect(page.getByRole('button',{name:'Enter the afterlife ↗'})).toBeInViewport();
  await page.screenshot({path:'docs/screenshots/mobile-title.png'});
});
