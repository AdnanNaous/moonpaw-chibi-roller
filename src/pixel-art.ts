/** Original articulated pixel drawing; all poses share a planted ankle origin. */
export const PILGRIM_CELL={width:48,height:64,foot:60,frames:23} as const;
export const PILGRIM_POSE={idle:0,run:2,rise:10,fall:11,roll:12,strike:16,land:19,hurt:20,dead:21,wall:22} as const;
const HERO={ink:'#07111b',shadow:'#172831',cloth:'#3a5157',fold:'#6f8580',edge:'#a4b1a0',bone:'#d4d0b4',light:'#f0e6c5',mask:'#a7ad9c',rust:'#9f685c',red:'#533c42',steel:'#8ea8aa'};
type Point=[number,number];
/** Scan-converted polygons keep every source cell opaque: no softened diagonal edges. */
function cellPolygon(c:CanvasRenderingContext2D,points:Point[],color:string){
 c.fillStyle=color;const ymin=Math.floor(Math.min(...points.map(p=>p[1]))),ymax=Math.ceil(Math.max(...points.map(p=>p[1])));
 for(let y=ymin;y<ymax;y++){const cuts:number[]=[];for(let i=0,j=points.length-1;i<points.length;j=i++){
  const a=points[j],b=points[i];if((a[1]<=y+.5&&b[1]>y+.5)||(b[1]<=y+.5&&a[1]>y+.5))cuts.push(a[0]+(y+.5-a[1])*(b[0]-a[0])/(b[1]-a[1]));
 }cuts.sort((a,b)=>a-b);for(let k=0;k<cuts.length;k+=2)c.fillRect(Math.ceil(cuts[k]),y,Math.max(1,Math.floor(cuts[k+1])-Math.ceil(cuts[k])+1),1);}
}
export function createPilgrimSprites(){
 const sheet=document.createElement('canvas');sheet.width=PILGRIM_CELL.width*PILGRIM_CELL.frames;sheet.height=PILGRIM_CELL.height;
 const atlas=sheet.getContext('2d')!;atlas.imageSmoothingEnabled=false;
 const pose=document.createElement('canvas');pose.width=80;pose.height=96;
 const c=pose.getContext('2d')!;c.imageSmoothingEnabled=false;
 const rect=(x:number,y:number,w:number,h:number,col:string)=>{c.fillStyle=col;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
 const segment=(a:Point,b:Point,width:number,col:string)=>{const n=Math.max(Math.abs(b[0]-a[0]),Math.abs(b[1]-a[1]),1);for(let i=0;i<=n;i++)rect(a[0]+(b[0]-a[0])*i/n-width/2,a[1]+(b[1]-a[1])*i/n-width/2,width,width,col);};
 const joint=(a:Point,b:Point,d:Point,col:string)=>{segment(a,b,5,HERO.ink);segment(b,d,4,HERO.ink);segment(a,b,3,col);segment(b,d,2,HERO.steel);rect(d[0]-2,d[1]-1,6,2,HERO.ink);rect(d[0],d[1]-1,4,1,HERO.edge);};
 for(let frame=0;frame<PILGRIM_CELL.frames;frame++){
  c.clearRect(0,0,pose.width,pose.height);c.save();c.translate(16,16);
  const running=frame>=2&&frame<10,phase=running?(frame-2)/8*Math.PI*2:0;
  const roll=frame>=12&&frame<16,strike=frame>=16&&frame<19,land=frame===19,air=frame===10||frame===11,wall=frame===22,dead=frame===21;
  const bob=running?Math.round(Math.abs(Math.sin(phase))*2):frame===1?1:0;
  const lean=running?2:strike?3:wall?-3:0,drop=land?7:0,hip:Point=[23+lean,43+drop-bob];
  if(dead){c.translate(24,54);c.rotate(-Math.PI/2);c.scale(.60,.60);c.translate(-24,-37);}
  if(roll){c.translate(25,46);c.rotate((frame-12)*Math.PI*.5);c.scale(.67,.67);c.translate(-25,-44);}
  const poly=(pts:Point[],col:string)=>cellPolygon(c,pts,col);
  // Split cloak: long back panel is pulled by motion, short front panel leaves knees readable.
  const flutter=running?Math.round(Math.sin(phase+.9)*3):air?-3:0;
  poly([[22+lean,29+drop-bob],[17+lean,32+drop-bob],[13+flutter,46+drop-bob],[8+flutter,52-bob],[16+flutter,54-bob],[22,48+drop-bob],[29+lean,47+drop-bob],[29+lean,32+drop-bob]],HERO.ink);
  poly([[19+lean,32+drop-bob],[16+lean,39+drop-bob],[12+flutter,49-bob],[17+flutter,50-bob],[23+lean,44+drop-bob],[26+lean,32+drop-bob]],HERO.cloth);
  segment([18+lean,34+drop-bob],[14+flutter,47-bob],1,HERO.fold);
  segment([22+lean,36+drop-bob],[19+flutter,48-bob],1,HERO.shadow);
  rect(11+flutter,51-bob,3,1,HERO.edge);
  // Eight genuine limb poses have alternating planted / tucked feet rather than sprite translation.
  let backK:Point=[22+Math.sin(phase)*5,51+drop*.3-bob],backF:Point=[20+Math.sin(phase)*9,59-Math.max(0,-Math.cos(phase))*5];
  let frontK:Point=[25-Math.sin(phase)*5,51+drop*.3-bob],frontF:Point=[27-Math.sin(phase)*9,59-Math.max(0,Math.cos(phase))*5];
  if(!running){backK=[21,51+drop*.35];backF=[18,59];frontK=[26,51+drop*.35];frontF=[29,59];}
  if(air){backK=[19,46];backF=[16,51];frontK=[28,47];frontF=frame===10?[32,53]:[28,58];}
  if(roll){backK=[20,48];backF=[28,51];frontK=[31,44];frontF=[30,50];}
  if(strike){backK=[20,51];backF=[15,59];frontK=[31,51];frontF=[34,59];}
  if(wall){backK=[22,46];backF=[16,51];frontK=[31,45];frontF=[33,51];}
  joint([hip[0]-2,hip[1]],backK,backF,HERO.shadow);
  joint([hip[0]+2,hip[1]],frontK,frontF,HERO.cloth);
  // Ribbed cuirass, oblique belt and brass fastener have a clear light-facing plane.
  poly([[21+lean,30+drop-bob],[29+lean,31+drop-bob],[29+lean,44+drop-bob],[22+lean,46+drop-bob],[18+lean,39+drop-bob]],HERO.ink);
  poly([[21+lean,32+drop-bob],[27+lean,32+drop-bob],[27+lean,43+drop-bob],[22+lean,43+drop-bob],[20+lean,38+drop-bob]],HERO.cloth);
  rect(23+lean,34+drop-bob,3,6,HERO.fold);rect(24+lean,34+drop-bob,1,3,HERO.edge);
  for(let k=0;k<3;k++)rect(20+lean,37+k*2+drop-bob,7,1,HERO.shadow);
  segment([19+lean,41+drop-bob],[29+lean,39+drop-bob],2,HERO.red);rect(25+lean,39+drop-bob,2,2,HERO.bone);
  // Recessed cat mask; lean ears belong to its worn hood, not a round toy head.
  const hx=24+lean,hy=24+drop-bob+(roll?4:0);
  poly([[hx-8,hy+2],[hx-9,hy-11],[hx-5,hy-8],[hx-3,hy-4],[hx+2,hy-5],[hx+7,hy-12],[hx+8,hy-1],[hx+6,hy+6],[hx,hy+8],[hx-6,hy+5]],HERO.ink);
  poly([[hx-7,hy-8],[hx-5,hy-5],[hx-4,hy-1],[hx+3,hy-2],[hx+6,hy-8],[hx+6,hy+2],[hx+3,hy+5],[hx-3,hy+5],[hx-6,hy+2]],HERO.cloth);
  segment([hx-7,hy-8],[hx-5,hy-2],1,HERO.fold);segment([hx+6,hy-8],[hx+5,hy-3],1,HERO.edge);
  poly([[hx-3,hy-1],[hx+5,hy-1],[hx+6,hy+2],[hx+2,hy+6],[hx-3,hy+4],[hx-4,hy+1]],HERO.mask);
  poly([[hx,hy-1],[hx+4,hy-1],[hx+5,hy+2],[hx+2,hy+4],[hx,hy+3]],HERO.bone);
  rect(hx-3,hy+1,3,1,HERO.ink);rect(hx+2,hy+1,3,1,HERO.ink);rect(hx+3,hy+1,1,1,HERO.light);rect(hx+1,hy+4,1,1,HERO.shadow);
  // Scarf ties sit behind the shoulder. Their trailing tips change with stride and jump.
  poly([[hx-6,hy+6],[hx+5,hy+6],[hx+4,hy+10],[hx-4,hy+10]],HERO.red);
  rect(hx-5,hy+6,9,2,HERO.rust);rect(hx+3,hy+6,2,1,HERO.bone);
  poly([[hx-5,hy+7],[hx-10,hy+7],[hx-16+(running?-3:0),hy+11+flutter],[hx-10,hy+12+flutter],[hx-5,hy+10]],HERO.red);
  segment([hx-7,hy+8],[hx-14+(running?-3:0),hy+10+flutter],1,HERO.rust);
  let elbow:Point=[31+lean,39+drop-bob],hand:Point=[31+lean,44+drop-bob];
  if(running){elbow=[30+Math.sin(phase)*3,38-bob];hand=[29+Math.sin(phase)*5,42-bob];}
  if(strike){elbow=frame===16?[29,29]:frame===17?[34,34]:[33,40];hand=frame===16?[33,23]:frame===17?[40,31]:[36,46];}
  if(wall){elbow=[31,32];hand=[35,26];}
  if(roll){elbow=[31,35];hand=[30,39];}
  segment([28+lean,33+drop-bob],elbow,5,HERO.ink);segment(elbow,hand,4,HERO.ink);
  segment([28+lean,33+drop-bob],elbow,3,HERO.cloth);segment(elbow,hand,2,HERO.fold);rect(hand[0]-1,hand[1]-1,3,3,HERO.bone);
  // A hooked single-edge blade. Idle rests point-down; strikes show anticipation, arc and follow-through.
  if(!roll&&!wall){const tip:Point=strike?(frame===16?[28,5]:frame===17?[47,22]:[45,55]):[hand[0]+2,58];
   segment(hand,tip,3,HERO.ink);segment(hand,tip,1,HERO.bone);
   const mid:Point=[(hand[0]+tip[0])*.5+1,(hand[1]+tip[1])*.5];segment(mid,[tip[0]+1,tip[1]-2],1,HERO.light);
   rect(hand[0]-1,hand[1]+2,2,2,HERO.rust);
  }
  if(frame===20){rect(hx-5,hy,11,1,HERO.light);}
  c.restore();
  if(roll||dead){
   // Normalize the actual raster contact, including quarter-turns, before packing the atlas.
   const pixels=c.getImageData(0,0,pose.width,pose.height).data;
   let left=pose.width,right=0,top=pose.height,bottom=0;
   for(let y=0;y<pose.height;y++)for(let x=0;x<pose.width;x++)if(pixels[(y*pose.width+x)*4+3]){
    left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
   }
   const w=right-left+1,h=bottom-top+1,fit=Math.min(1,44/w,58/h);
   const dw=Math.round(w*fit),dh=Math.round(h*fit);
   atlas.drawImage(pose,left,top,w,h,frame*48+Math.round((48-dw)/2),61-dh,dw,dh);
  }else{
   atlas.drawImage(pose,16,16,48,64,frame*48,0,48,64);
  }
 }
 return sheet;
}

/** Four original enemy drawings with plated limbs and distinctive readable silhouettes. */
export function createEnemySprites(){
 const sheet=document.createElement('canvas');sheet.width=48*4;sheet.height=64*4;
 const c=sheet.getContext('2d')!;c.imageSmoothingEnabled=false;
 const palettes=[['#273a44','#698286','#c1b99a'],['#292b42','#70718c','#beb3a1'],['#293f38','#687d65','#d2bf91'],['#362a37','#8e6571','#d7c0a0']];
 const rect=(x:number,y:number,w:number,h:number,color:string)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
 for(let kind=0;kind<4;kind++)for(let pose=0;pose<4;pose++){
  const ox=kind*48,oy=pose*64,big=kind===3,top=big?7:17,foot=60,cx=ox+23;
  const [dark,plate,edge]=palettes[kind],s=big?1.25:1;
  // Cloth has stepped folds and a torn hem, separate from the armor planes.
  for(let y=top+13;y<foot-3;y++){
   const half=Math.round((4+(y-top)*.16)*s);rect(cx-half,oy+y,half*2,1,dark);
   if(y%5===0)rect(cx+half-2,oy+y,2,1,plate);
   if(y%7===0)rect(cx-half+2,oy+y,2,1,'#17222d');
  }
  for(let k=0;k<3;k++)rect(cx-8+k*6,oy+foot-5,3,4,'#090f18');
  rect(cx-5,oy+top+2,10,12,'#090f17');rect(cx-4,oy+top+2,8,8,edge);rect(cx-4,oy+top+2,2,2,dark);rect(cx+3,oy+top+2,2,3,dark);rect(cx-3,oy+top+3,2,1,'#fff0ca');
  rect(cx-3,oy+top+7,7,3,dark);rect(cx+1,oy+top+7,3,1,pose===1?'#ffc68b':'#de8872');
  // Visors, layered shoulder plates, shin greaves and diagonal seams.
  rect(cx-8,oy+top+14,17,5,plate);rect(cx-8,oy+top+14,7,1,edge);rect(cx+5,oy+top+16,4,1,edge);
  rect(cx-4,oy+top+19,9,7,plate);
  for(let k=0;k<3;k++){rect(cx-3+k*3,oy+top+20,1,5,k%2?dark:edge);}
  for(let k=0;k<5;k++){rect(cx-6+(k%2)*3,oy+top+28+k*3,3,1,plate);}rect(cx-4,oy+top+20,2,5,edge);
  rect(cx-6,oy+foot-12,4,9,plate);rect(cx+3,oy+foot-12,4,9,dark);
  rect(cx-7,oy+foot-3,6,2,edge);rect(cx+3,oy+foot-3,7,2,plate);
  if(kind===0){
   // Sentinel wears a rectangular layered shield rather than a robe-shaped cone.
   rect(cx-14,oy+top+19,8,21,'#13252e');rect(cx-14,oy+top+19,8,2,edge);rect(cx-14,oy+top+19,1,21,plate);
   for(let k=0;k<4;k++)rect(cx-12,oy+top+22+k*4,4,1,plate);
  }else if(kind===1){
   for(let k=0;k<9;k++)rect(cx-2-k,oy+top+2+k,3,1,plate);
   rect(cx+8,oy+top+19,3,9,edge);
  }else if(kind===2){
   rect(cx+6,oy+top+19,15,3,plate);rect(cx+17,oy+top+17,3,6,edge);rect(cx+11,oy+top+22,2,8,dark);
   rect(cx-5,oy+top-2,12,3,plate);rect(cx-3,oy+top-4,7,2,dark);
  }else{
   // Regent has an asymmetric mineral mask and a broken orbit crown.
   for(let k=0;k<7;k++){rect(cx-9+k*3,oy+top-3-Math.abs(k-3),2,5,edge);}
   rect(cx-11,oy+top+15,6,9,plate);rect(cx+7,oy+top+14,6,9,plate);
   for(let k=0;k<5;k++)rect(cx-10+k*5,oy+top+26,3,7,k%2?edge:plate);
  }
  if(kind!==2){
   const reach=pose===2?22:pose===1?13:8;
   for(let k=0;k<reach;k++){const x=cx+8+k,y=oy+top+20+(pose===1?-Math.floor(k*.8):pose===2?Math.floor(k*.16):Math.floor(k*.9));rect(x,y,1,3,edge);if(k%4===0)rect(x,y+2,1,1,plate);}
  }
  if(pose===3){rect(cx-5,oy+top+18,11,1,'#ede4cb');}
 }
 return sheet;
}
