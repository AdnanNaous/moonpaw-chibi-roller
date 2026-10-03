const { _electron, expect } = require('@playwright/test');
const path = require('node:path');
const fs = require('node:fs/promises');
(async()=>{
  const root=path.resolve(__dirname,'..');
  const packaged=process.env.MOONPAW_EXECUTABLE;
  const application=await _electron.launch({executablePath:packaged||path.join(root,'node_modules/electron/dist/electron.exe'),args:packaged?[]:['.'],cwd:root,env:{...process.env,MOONPAW_TEST:'1'}});
  try{
    const page=await application.firstWindow();const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await application.evaluate(({BrowserWindow})=>{const w=BrowserWindow.getAllWindows()[0];w.show();w.focus();});
    await expect(page.getByRole('button',{name:'Enter the afterlife ↗'})).toBeVisible();
    await page.getByRole('button',{name:'Enter the afterlife ↗'}).click();
    await expect(page.getByRole('heading',{name:'The Last Platform'})).toBeVisible();
    await page.getByRole('button',{name:'Listen →'}).click();
    await expect(page.getByText('THE PLATFORM',{exact:true})).toBeVisible();
    await page.getByRole('button',{name:'Skip scene'}).click();
    await page.keyboard.down('d');await page.waitForTimeout(400);await page.keyboard.up('d');
    const moved=await page.evaluate(()=>window.moonpaw.state.player.x);if(moved<3)throw new Error('Movement did not advance: '+JSON.stringify(await page.evaluate(()=>({mode:window.moonpaw.state.mode,hidden:document.hidden,x:window.moonpaw.state.player.x}))));
    await page.keyboard.down('Space');await page.waitForTimeout(100);
    const airborne=await page.evaluate(()=>window.moonpaw.state.player.y);await page.keyboard.up('Space');
    if(airborne<=0)throw new Error('Jump did not leave floor');
    await page.keyboard.press('Escape');await expect(page.getByRole('heading',{name:'Hold your breath.'})).toBeVisible();
    await page.getByRole('button',{name:'Return to title'}).click();
    await page.getByRole('button',{name:'Credits',exact:true}).click();
    await expect(page.getByRole('link',{name:'X · @vc_351 ↗'})).toHaveAttribute('href','https://x.com/vc_351');
    await page.getByRole('button',{name:'← Back'}).click();
    await fs.mkdir(path.join(root,'docs/screenshots'),{recursive:true});
    await page.screenshot({path:path.join(root,'docs/screenshots/windows-title.png')});
    const report={platform:packaged?'Windows packaged executable':'Windows Electron development shell',checks:['custom protocol','title','story advance/skip','keyboard movement','jump','pause','credits links'],moved,airborne,errors};
    await fs.writeFile(path.join(root,'docs/app-smoke.json'),JSON.stringify(report,null,2));
    if(errors.length)throw new Error(errors.join('\n'));
    console.log(JSON.stringify(report));
  }finally{await application.close();}
})().catch(e=>{console.error(e);process.exit(1);});
