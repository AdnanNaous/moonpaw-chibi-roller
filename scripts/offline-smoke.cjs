const {chromium,expect}=require('@playwright/test');
(async()=>{
  const browser=await chromium.launch();
  try {
    const context=await browser.newContext();const page=await context.newPage();
    page.on('pageerror',e=>console.error('Page error:',e.message));page.on('requestfailed',r=>console.error('Request failed:',r.url(),r.failure()));
    await page.goto('http://127.0.0.1:4173/');
    await page.evaluate(async()=>{await navigator.serviceWorker.ready;});
    await page.waitForFunction(()=>navigator.serviceWorker.controller!==null);
    const cached=await page.evaluate(async()=>{const keys=await caches.keys();return (await (await caches.open(keys.find(k=>k.startsWith('moonpaw-')))).keys()).length;});
    if(cached<25)throw new Error('Incomplete offline cache: '+cached);
    await context.setOffline(true);await page.reload();
    await expect(page.getByRole('button',{name:'Enter the afterlife ↗'})).toBeVisible();
    await page.getByRole('button',{name:'Enter the afterlife ↗'}).click();await page.getByRole('button',{name:'Skip scene'}).click();
    const sound=await page.evaluate(async()=>{const r=await fetch('./audio/chapter-01.wav');return r.ok&&(await r.arrayBuffer()).byteLength>1000000;});
    if(!sound)throw new Error('Offline sound missing');
    console.log(JSON.stringify({offlineReload:true,cachedFiles:cached,offlineSound:true}));
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
