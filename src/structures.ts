import type {Theme} from './types';
type C=CanvasRenderingContext2D;
const seed=(n:number)=>{const v=Math.sin(n*37.19+5.7)*15731.17;return v-Math.floor(v);};
const polygon=(c:C,points:number[],color:string)=>{c.fillStyle=color;c.beginPath();c.moveTo(points[0],points[1]);for(let i=2;i<points.length;i+=2)c.lineTo(points[i],points[i+1]);c.closePath();c.fill();};
const line=(c:C,x:number,y:number,xx:number,yy:number,color:string,w=1)=>{c.strokeStyle=color;c.lineWidth=w;c.beginPath();c.moveTo(Math.round(x)+.5,Math.round(y)+.5);c.lineTo(Math.round(xx)+.5,Math.round(yy)+.5);c.stroke();};

/** Foreground construction is painted once at the scene's native pixel grid. */
export function structure(theme:Theme,w:number,h:number,unit:number,id:number,ledge:boolean){
 const canvas=document.createElement('canvas');canvas.width=w+8;canvas.height=Math.ceil(ledge?h+unit*1.4:h+unit*1.6)+8;
 const c=canvas.getContext('2d')!;c.imageSmoothingEnabled=false;c.translate(4,2);
 const iron=theme==='foundry'||theme==='prison'||theme==='choir',wood=theme==='archives',root=theme==='orchard'||theme==='abyss';
 const base=iron?'#253238':wood?'#2c302e':root?'#203632':'#26363b',light=iron?'#8fa7a7':wood?'#9b9981':root?'#8aa68d':'#a2b5af';
 if(ledge){
  polygon(c,[0,0,w,0,w-3,h,w*.75,h+3,w*.2,h+3,3,h], '#08141b');
  c.fillStyle=base;c.fillRect(1,2,w-2,h-2);
  c.fillStyle='#526260';c.fillRect(0,1,w,2);c.fillStyle=light;c.fillRect(0,0,w,1);
  for(let x=6;x<w-4;x+=iron?18:13){c.fillStyle=iron?'#607875':'#425754';c.fillRect(x,4,iron?3:8,2);c.fillStyle='#0c1c23';c.fillRect(x+3,7,1,h-7);}
  if(iron){
   // Riveted trusses with deep lower chords; every shelf has a load path.
   for(let x=3;x<w-8;x+=28){line(c,x,h-1,x+13,h+15,'#121f27',3);line(c,x+13,h+15,x+27,h-1,'#121f27',3);line(c,x+1,h,x+13,h+13,'#58726c');}
   line(c,5,h+16,w-5,h+16,'#3f5454',2);
   for(const x of [7,w-8]){line(c,x,4,x,h+unit*1.2,'#192b31',2);for(let y=h+6;y<h+unit*1.2;y+=5){c.fillStyle='#54736e';c.fillRect(x,y,1,2);}}
  }else if(root){
   for(let i=0;i<4;i++){const x=seed(i+id)*w;line(c,x,h,x-7,h+unit*.55,'#324f43',4);line(c,x-7,h+unit*.55,x+6,h+unit*.9,'#152c29',2);line(c,x,h,x-5,h+unit*.5,'#60796a');}
  }else{
   // Corbels below the edge are asymmetrical stone / timber brackets.
   for(const x of [w*.16,w*.77]){polygon(c,[x,h-2,x+14,h-2,x+10,h+10,x+3,h+19,x-1,h+10],base);line(c,x+2,h,x+6,h+13,light);}
   if(wood){line(c,5,h+6,w-5,h+6,'#685e4d',2);line(c,12,h+8,w*.35,h+unit*.8,'#21302e',3);}
  }
 }else{
  // Large broken strata replace the repeating rectangular brick wall.
  const skirt=h+unit*.85;
  const contour=[0,0,w,0,w,skirt-14,w-9,skirt,w*.74,skirt-5,w*.59,skirt+unit*.32,w*.43,skirt+3,w*.27,skirt+unit*.13,7,skirt-4,0,skirt-21];
  c.save();c.beginPath();c.moveTo(contour[0],contour[1]);for(let i=2;i<contour.length;i+=2)c.lineTo(contour[i],contour[i+1]);c.closePath();c.clip();
  c.fillStyle=base;c.fillRect(0,0,w,skirt+unit);
  for(let row=0;row<Math.ceil(skirt/13);row++){
   const yy=row*13+8;
   for(let col=-1;col<Math.ceil(w/43);col++){
    const xx=col*43+(row%2?21:0),shade=seed(row*17+col*43+id);
    c.fillStyle=shade>.6?'#51646033':'#09172044';c.fillRect(xx+2,yy+2,41,11);
    line(c,xx,yy,xx+41,yy,'#12232b');line(c,xx+41,yy,xx+41,yy+13,'#14252b');
    if(shade>.4)line(c,xx+3,yy+1,xx+29,yy+1,'#80948933');
   }
  }
  // Recessed support bays give the walkway architectural mass and depth.
  for(let x=18;x<w-20;x+=Math.max(70,unit*2.2)){
   const bay=Math.min(unit*.95,w-x-7),top=20;
   polygon(c,[x,top+10,x+bay*.22,top,x+bay*.78,top,x+bay,top+10,x+bay,skirt+30,x,skirt+30],'#081721');
   line(c,x-3,top+10,x-3,skirt-10,'#52655f',2);line(c,x+bay+2,top+10,x+bay+2,skirt-7,'#1a2e35',4);
   polygon(c,[x-5,top+11,x+bay*.2-3,top-5,x+bay*.8+4,top-5,x+bay+5,top+11,x+bay+1,top+9,x+bay*.76,top+1,x+bay*.25,top+1,x-1,top+10], '#42554f');
   line(c,x+4,top+10,x+4,skirt,'#193139');
  }
  const shade=c.createLinearGradient(0,10,0,skirt);shade.addColorStop(0,'#05172000');shade.addColorStop(1,'#031019dd');c.fillStyle=shade;c.fillRect(0,10,w,skirt+unit);
  c.restore();
  // The actual collision plane is kept exact and legible. Cap stones vary below it.
  c.fillStyle='#657770';c.fillRect(0,0,w,4);c.fillStyle=light;c.fillRect(0,0,w,1);
  for(let x=0;x<w;x+=21){c.fillStyle='#13272e';c.fillRect(x+18,1,1,5);c.fillStyle='#a8b6a355';c.fillRect(x+3,1,11,1);}
  for(let i=0;i<w/44;i++){
   const x=Math.floor(i*44+seed(i+id)*10);polygon(c,[x,5,x+9,7,x+15,22,x+9,18,x+4,25,x-2,19],'#47594e');
   if(root||theme==='flood'){line(c,x,5,x+7,29,'#597763',2);line(c,x+7,29,x+4,43,'#304f43');}
  }
  if(iron){for(let x=7;x<w;x+=23){c.fillStyle='#a6a98b';c.fillRect(x,5,1,1);}c.fillStyle='#26373d';c.fillRect(0,6,w,5);}
 }
 // A few handplaced fissures, rather than a uniform noise layer.
 for(let i=0;i<w/60;i++){const x=Math.floor(seed(i*9+id)*w);line(c,x,7,x+3,15,'#0a1c22');line(c,x+3,15,x+1,23,'#0a1c22');}
 return canvas;
}
