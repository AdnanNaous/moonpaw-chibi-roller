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
    await expect(page.getByRole('button',{name:'Enter the crypt'})).toBeVisible();
    await page.getByRole('button',{name:'Enter the crypt'}).click();await page.getByRole('button',{name:'Begin now'}).click();
    const sound=await page.evaluate(async()=>{const r=await fetch('./audio/chapter-01.wav');return r.ok&&(await r.arrayBuffer()).byteLength>1000000;});
    if(!sound)throw new Error('Offline sound missing');
    const richAssets=await page.evaluate(async()=>{
      const art=await fetch('./art/threshold-environments-v3.png');const image=await createImageBitmap(await art.blob());
      const score=await fetch('./audio/score-1.wav');const scoreBytes=(await score.arrayBuffer()).byteLength;
      return {atlas:art.ok&&image.width>1000,score:score.ok&&scoreBytes>5000000};
    });
    if(!richAssets.atlas||!richAssets.score)throw new Error('Offline remake assets missing');
    console.log(JSON.stringify({offlineReload:true,cachedFiles:cached,offlineSound:true,offlineAtlas:richAssets.atlas,offlineScore:richAssets.score}));
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
