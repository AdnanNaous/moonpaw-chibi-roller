type G = CanvasRenderingContext2D;
const seed = (n:number) => { const v=Math.sin(n*83.17+11.9)*43521.1; return v-Math.floor(v); };

/** Small, opaque material cells. Generated once per chapter, never every frame. */
export function createMaterial(theme:string, stone:string, edge:string) {
 const tile=document.createElement('canvas');tile.width=96;tile.height=64;
 const c=tile.getContext('2d')!;c.fillStyle=stone;c.fillRect(0,0,96,64);
 const metal=theme==='foundry'||theme==='prison';
 const organic=theme==='orchard'||theme==='abyss',timber=theme==='archives';
 const blockH=metal?16:organic?5:timber?12:8;
 for(let row=0;row<Math.ceil(64/blockH);row++)for(let col=-1;col<5;col++){
  const x=col*24+(row%2?12:0),y=row*blockH;
  if(organic){
   c.fillStyle=row%2?'#09181865':'#79847119';c.fillRect(x,y,24,1);
   for(let k=0;k<3;k++){c.fillStyle='#172c2c60';c.fillRect(x+k*6,y+k%2,4,2);}
   continue;
  }
  c.fillStyle=seed(row*17+col*19)>.5?'#ffffff09':'#00000013';c.fillRect(x+1,y+1,23,blockH-1);
  c.fillStyle='#09100f80';c.fillRect(x,y,24,1);c.fillRect(x,y,1,blockH);
  c.fillStyle='#b0bbb31a';c.fillRect(x+2,y+1,19,1);
  if(metal){
   for(const rx of [3,20])for(const ry of [3,12]){c.fillStyle='#8f9b87';c.fillRect(x+rx,y+ry,1,1);c.fillStyle='#071012';c.fillRect(x+rx+1,y+ry+1,1,1);}
   c.fillStyle='#bf7b4626';c.fillRect(x+8,y+7,5,2);c.fillRect(x+12,y+9,4,1);
  }
  if(timber){c.fillStyle='#b0a57e23';c.fillRect(x+4,y+4,15,1);c.fillRect(x+7,y+7,12,1);c.fillStyle='#111d18';c.fillRect(x+14,y+8,3,1);}
 }
 for(let i=0;i<190;i++){
  const x=Math.floor(seed(i*13)*96),y=Math.floor(seed(i*31)*64);
  c.fillStyle=i%3?'#c5d0bd14':'#00000036';c.fillRect(x,y,1+i%2,1);
 }
 for(let i=0;i<7;i++){
  const x=Math.floor(seed(i*49)*90),y=Math.floor(seed(i*73)*58);
  c.fillStyle='#08100f';for(let k=0;k<5;k++)c.fillRect(x+Math.floor(k*.5),y+k,1,2);
 }
 if(theme==='orchard'||theme==='flood')for(let i=0;i<22;i++){
  c.fillStyle=i%2?'#60705c55':'#172e254a';const x=Math.floor(seed(i*47)*96),y=Math.floor(seed(i*23)*64);c.fillRect(x,y,3,2);c.fillRect(x+2,y+1,2,3);
 }
 return tile;
}

/** Draws a broken orbit, an original setting glyph without a central stem or bar. */
export function brokenOrbit(c:G,x:number,y:number,r:number,color:string){
 c.fillStyle=color;
 for(let i=0;i<32;i++){
  if(i>=3&&i<=8||i>=20&&i<=22)continue;
  const a=i*Math.PI/16;c.fillRect(Math.round(x+Math.cos(a)*r),Math.round(y+Math.sin(a)*r),2,2);
 }
 c.fillRect(Math.round(x-r*.32),Math.round(y-r*.10),2,2);
 c.fillRect(Math.round(x+r*.35),Math.round(y+r*.15),1,1);
}

export function paintMoth(c:G,x:number,y:number,size:number,color:string){
 c.fillStyle=color;
 for(let row=0;row<size;row++){
  const span=Math.max(1,Math.floor(Math.sin(row/size*Math.PI)*size*.56));
  c.fillRect(Math.round(x-span),Math.round(y+row-size*.5),span-1,1);
  c.fillRect(Math.round(x+2),Math.round(y+row-size*.5),span-1,1);
 }
 c.fillStyle='#080e10';c.fillRect(Math.round(x-size*.22),Math.round(y),2,2);c.fillRect(Math.round(x+size*.22),Math.round(y),2,2);
}

export function architectureDetail(c:G,x:number,floor:number,w:number,h:number,theme:string,depth:number){
 c.save();c.globalCompositeOperation='source-atop';c.globalAlpha=depth===0?.15:.27;
 c.fillStyle='#090e10';
 for(let row=0;row<Math.ceil(h/9);row++){
  const y=Math.round(floor-row*9);c.fillRect(Math.round(x),y,Math.round(w),1);
  for(let col=0;col<w/17;col++)c.fillRect(Math.round(x+col*17+(row%2?8:0)),y-8,1,8);
 }
 c.globalAlpha=depth===0?.16:.35;c.fillStyle='#a7b9ad';
 for(let col=0;col<w/23;col++)c.fillRect(Math.round(x+col*23+2),Math.round(floor-h*.60),1,Math.round(h*.58));
 c.restore();
 if(theme==='archives'){
  c.fillStyle='#858575';for(let shelf=0;shelf<4;shelf++)for(let book=0;book<9;book++){
   if(seed(book*9+shelf*23)<.17)continue;
   c.globalAlpha=.25+seed(book+shelf)*.24;c.fillRect(Math.round(x+w*.18+book*w*.064),Math.round(floor-h*.2-shelf*9-6),2,5+book%3);
  }c.globalAlpha=1;
 }
 if(theme==='orchard'){
  c.fillStyle='#718476';for(let i=0;i<18;i++)c.fillRect(Math.round(x+seed(i*31)*w),Math.round(floor-seed(i*57)*h),2,1);
 }
}
