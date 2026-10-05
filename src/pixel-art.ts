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
const COLORS:Record<string,string>={D:'#080d13',K:'#26343a',L:'#667775',A:'#bdc4ae',H:'#dc885e',R:'#835157'};
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
  }
  // A chipped blade has discrete stair-step poses, never a scaled vector line.
  c.fillStyle='#d7d7bd';
  if(frame===8)for(let k=0;k<13;k++)c.fillRect(frame*32+22+Math.floor(k*.48),23-k,1,2);
  else if(frame===9)for(let k=0;k<10;k++)c.fillRect(frame*32+22+k,18+Math.floor(k*.3),1,2);
  else if(frame!==7&&frame!==10){c.fillStyle='#88978b';c.fillRect(frame*32+23,15,1,14);c.fillStyle='#c6bd91';c.fillRect(frame*32+22,14,3,2);}
  if(frame>=1&&frame<=4){c.fillStyle='#835157';c.fillRect(frame*32+20,15+stride,4,1);}
 }
 return sheet;
}
