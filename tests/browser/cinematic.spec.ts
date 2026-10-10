import {test,expect} from '@playwright/test';

test('all ten chapter films preserve story, pause physics and fit small landscape',async({page})=>{
  await page.setViewportSize({width:844,height:390});
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.addInitScript(()=>localStorage.setItem('moonpaw-progress-v2',JSON.stringify({unlocked:10,best:{},secrets:[]})));
  await page.goto('/');
  for(let index=0;index<10;index++){
    await page.getByRole('button',{name:'Chapters',exact:true}).click();
    await page.locator(`[data-stage="${index}"]`).click();
    const film=page.locator(`.chapter-film[data-chapter="${index+1}"]`);
    await expect(film).toBeVisible();
    const initial=await page.evaluate(()=>{const s=(window as any).moonpaw.state;return {x:s.player.x,y:s.player.y,stamina:s.player.stamina,time:s.time};});
    await page.keyboard.down('d');await page.keyboard.down('Space');await page.keyboard.down('j');await page.waitForTimeout(140);
    await page.keyboard.up('d');await page.keyboard.up('Space');await page.keyboard.up('j');
    expect(await page.evaluate(()=>{const s=(window as any).moonpaw.state;return {x:s.player.x,y:s.player.y,stamina:s.player.stamina,time:s.time};})).toEqual(initial);
    for(let beat=0;beat<(index===9?4:3);beat++){
      await expect(film).toHaveAttribute('data-shot',String(beat+1));
      await expect(page.locator('.film-dialogue .story-text')).not.toBeEmpty();
      for(const selector of ['.film-heading','.film-caption','.film-controls']){
        const box=await page.locator(selector).boundingBox();expect(box).not.toBeNull();
        expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.y).toBeGreaterThanOrEqual(0);
        expect(box!.x+box!.width).toBeLessThanOrEqual(844);expect(box!.y+box!.height).toBeLessThanOrEqual(390);
      }
      expect(await page.locator('.film-prop').evaluate(el=>getComputedStyle(el).animationName)).toBe('none');
      await page.getByRole('button',{name:beat===(index===9?3:2)?'Begin':'Continue',exact:true}).click();
    }
    await expect.poll(()=>page.evaluate(()=>(window as any).moonpaw.state.mode)).toBe('playing');
    await expect(page.locator('.chapter-film')).toHaveCount(0);
    await page.keyboard.press('Escape');await page.getByRole('button',{name:'Title',exact:true}).click();
  }
});

test('chapter skip clears held input and controller confirmation never repeats through shots',async({page})=>{
  await page.addInitScript(()=>{const w=window as any;w.fixturePad={index:0,connected:true,axes:[0,0],buttons:Array.from({length:16},()=>({pressed:false,value:0}))};Object.defineProperty(navigator,'getGamepads',{value:()=>[w.fixturePad]});});
  await page.goto('/');await page.getByRole('button',{name:'Enter the crypt',exact:true}).click();
  await page.keyboard.down('Space');await page.keyboard.down('j');
  await page.getByRole('button',{name:'Begin now'}).click();
  await page.waitForTimeout(80);
  expect(await page.evaluate(()=>{const p=(window as any).moonpaw.state.player;return [p.attackTime,p.dashTime,p.vy];})).toEqual([0,0,0]);
  await page.keyboard.up('Space');await page.keyboard.up('j');
  await page.keyboard.press('Escape');await page.getByRole('button',{name:'Restart',exact:true}).click();
  await page.evaluate(()=>(window as any).fixturePad.buttons[0].pressed=true);
  await expect(page.locator('.chapter-film')).toHaveAttribute('data-shot','2');
  await page.waitForTimeout(350);await expect(page.locator('.chapter-film')).toHaveAttribute('data-shot','2');
  await page.evaluate(()=>(window as any).fixturePad.buttons[0].pressed=false);await page.waitForTimeout(40);
  await page.evaluate(()=>(window as any).fixturePad.buttons[9].pressed=true);
  await expect(page.locator('.chapter-film')).toHaveCount(0);
  await page.waitForTimeout(120);
  expect(await page.evaluate(()=>(window as any).moonpaw.state.mode)).toBe('playing');
  await page.evaluate(()=>(window as any).fixturePad.buttons[9].pressed=false);
});
