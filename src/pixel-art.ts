/** Original 16×24 pixel drawing. Frames are painted one opaque cell at a time. */
const MASK=[
 'D............D..',
 'DKD........DKD..',
 '.DKD......DKD...',
 '.DKKKDDDDKKKD...',
 '..DKKKKKKKKD....',
 '..DKAAAAKKKD....',
 '..DKAHAAKDKD....',
 '..DKAAAKKKKD....',
 '...DKAKKKKD.....',
 '....DKKKKD......',
 '...DRRRRRRD.....',
 '..DKDRRDDKKD....',
 '..DKKLLLLKKD....',
 '.DKKLLALALKKD...',
 '.DKKLLLLLLKKD...',
 '.DKLLLKLLLLKD...',
 '.DKLLKALLLLKD...',
 'DKLLKKLLKLLLKD..',
 'DKLKKLLLKKLLKD..',
 'DKKLLLKLLLKLLKD.',
 '.DKKKD.DKKKKD...',
 '..DKKD..DKKD....',
 '..DAAD..DAAD....',
 '.DKAAAD.DKAAAD..',
];
const COLORS:Record<string,string>={D:'#060d13',K:'#21353f',L:'#54717a',A:'#d0d0b6',H:'#edb47b',R:'#934f54'};
export function createPilgrimSprites(){
 const sheet=document.createElement('canvas');sheet.width=32*11;sheet.height=32;
 const c=sheet.getContext('2d')!;c.imageSmoothingEnabled=false;
 for(let frame=0;frame<11;frame++){
  const stride=frame>=1&&frame<=4?[-1,0,1,0][frame-1]:0;
  const jump=frame===5||frame===6;
  for(let row=0;row<MASK.length;row++)for(let col=0;col<MASK[row].length;col++){
   const color=COLORS[MASK[row][col]];if(!color)continue;
   let x=frame*32+7+col,y=5+row;
   if(row>=21){x+=col<7?stride:-stride;if(jump)y-=col<7?2:1;}
   if(row>=14&&row<21)x+=stride;
   if(frame===7){y=20+Math.floor((row-12)*.45);x=frame*32+7+Math.floor(col*.95);if(row<6)continue;}
   if(frame===10){x=frame*32+3+row;y=27+Math.floor(col*.22);}
   c.fillStyle=color;c.fillRect(x,y,1,1);
   if(row>12&&row<20&&col%4===1&&MASK[row][col]==='L'){c.fillStyle='#8eada1';c.fillRect(x,y,1,1);}
   if(row===8&&col===7){c.fillStyle='#192c37';c.fillRect(x,y,2,1);}
  }
  // A chipped blade has discrete stair-step poses, never a scaled vector line.
  c.fillStyle='#d7d7bd';
  if(frame===8)for(let k=0;k<13;k++)c.fillRect(frame*32+22+Math.floor(k*.48),23-k,1,2);
  else if(frame===9)for(let k=0;k<10;k++)c.fillRect(frame*32+22+k,18+Math.floor(k*.3),1,2);
  else if(frame!==7&&frame!==10){c.fillStyle='#88978b';c.fillRect(frame*32+23,15,1,14);c.fillStyle='#c6bd91';c.fillRect(frame*32+23,14,1,3);c.fillRect(frame*32+24,14,1,2);}
  if(frame>=1&&frame<=4){c.fillStyle='#835157';c.fillRect(frame*32+20,15+stride,4,1);}
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
