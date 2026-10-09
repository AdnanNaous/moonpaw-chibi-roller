import type {Theme} from './types';

type C = CanvasRenderingContext2D;
type Palette = {body:string; face:string; light:string; dark:string; seam:string; deposit:string};
const palettes:Record<Theme,Palette> = {
  crypt:    {body:'#253035',face:'#39464a',light:'#9ca59d',dark:'#111c23',seam:'#0d171e',deposit:'#565f50'},
  foundry:  {body:'#25292c',face:'#424044',light:'#b39b7c',dark:'#10191e',seam:'#10181c',deposit:'#785447'},
  flood:    {body:'#1d3035',face:'#31474b',light:'#8aabac',dark:'#0d1c25',seam:'#101f25',deposit:'#385955'},
  archives: {body:'#2e2b2b',face:'#49413b',light:'#a69a80',dark:'#161d22',seam:'#11191e',deposit:'#6c5944'},
  belfry:   {body:'#2b323b',face:'#424b55',light:'#a3aabc',dark:'#141f2b',seam:'#101b27',deposit:'#696665'},
  orchard:  {body:'#28362e',face:'#40503e',light:'#a0ab89',dark:'#101e1c',seam:'#12231f',deposit:'#53634a'},
  prison:   {body:'#252f33',face:'#3f4a4e',light:'#96a7a8',dark:'#121a21',seam:'#0e171d',deposit:'#655744'},
  choir:    {body:'#302d37',face:'#494453',light:'#b0a5b9',dark:'#181a28',seam:'#151823',deposit:'#695569'},
  abyss:    {body:'#233236',face:'#3a4949',light:'#98b4ac',dark:'#0f1d22',seam:'#102026',deposit:'#456358'},
  throne:   {body:'#302f35',face:'#49454d',light:'#aca1a9',dark:'#191924',seam:'#151621',deposit:'#65545e'},
};
const seed=(n:number)=>{const v=Math.sin(n*37.19+5.7)*15731.17;return v-Math.floor(v);};

function polygon(c:C,points:number[],color:string){
  c.fillStyle=color;
  const ys=points.filter((_,i)=>i%2===1), min=Math.floor(Math.min(...ys)),max=Math.ceil(Math.max(...ys));
  for(let y=min;y<max;y++){
    const cuts:number[]=[];
    for(let i=0;i<points.length;i+=2){
      const j=(i+2)%points.length,x1=points[i],y1=points[i+1],x2=points[j],y2=points[j+1];
      if((y1<=y+.5&&y2>y+.5)||(y2<=y+.5&&y1>y+.5))cuts.push(x1+(y+.5-y1)*(x2-x1)/(y2-y1));
    }
    cuts.sort((a,b)=>a-b);
    for(let i=0;i+1<cuts.length;i+=2){const x=Math.ceil(cuts[i]);c.fillRect(x,y,Math.max(0,Math.ceil(cuts[i+1])-x),1);}
  }
}
function line(c:C,x:number,y:number,xx:number,yy:number,color:string,width=1){
  x=Math.round(x);y=Math.round(y);xx=Math.round(xx);yy=Math.round(yy);
  const dx=Math.abs(xx-x),dy=-Math.abs(yy-y),sx=x<xx?1:-1,sy=y<yy?1:-1;
  let error=dx+dy;c.fillStyle=color;
  for(;;){c.fillRect(x,y,width,width);if(x===xx&&y===yy)break;const e=error*2;if(e>=dy){error+=dy;x+=sx;}if(e<=dx){error+=dx;y+=sy;}}
}

function fracture(c:C,x:number,y:number,depth:number,p:Palette,r:number){
  const bend=x+(r-.5)*12, tip=bend+(seed(r*83)-.5)*10;
  line(c,x,y,bend,y+depth*.38,p.seam,2);
  line(c,bend,y+depth*.38,tip,y+depth,p.seam);
  line(c,x+2,y+1,bend+2,y+depth*.35,p.face);
  if(depth>22)line(c,bend,y+depth*.38,bend-8,y+depth*.63,p.seam);
}

/** Painted once at the native pixel grid, with collision y=0 and padding 4×2. */
export function structure(theme:Theme,w:number,h:number,unit:number,id:number,ledge:boolean){
  const canvas=document.createElement('canvas');
  canvas.width=Math.ceil(w)+8;
  canvas.height=Math.ceil(h+unit*(ledge?1.4:1.6))+8;
  const c=canvas.getContext('2d')!;c.imageSmoothingEnabled=false;c.translate(4,2);
  const p=palettes[theme], iron=theme==='foundry'||theme==='prison'||theme==='choir';
  const timber=theme==='archives', root=theme==='orchard'||theme==='abyss';
  const variation=(i:number)=>seed(id*11.31+i*7.07+w*.017);
  const skirt=h+(ledge?0:unit*.88);

  // The walkable edge is continuous; its broken mass is not a tiled brick wall.
  const shape:number[]=[0,0,w,0,w,Math.max(4,skirt-3)];
  let edge=w;
  while(edge>0){
    const span=Math.max(8,unit*(.35+variation(edge)*.7));edge=Math.max(0,edge-span);
    shape.push(edge,Math.max(5,skirt+(variation(edge+3)-.25)*unit*(ledge?.15:.34)));
  }
  shape.push(0,3);
  polygon(c,shape,p.body);
  c.save();c.beginPath();c.moveTo(shape[0],shape[1]);
  for(let i=2;i<shape.length;i+=2)c.lineTo(shape[i],shape[i+1]);c.closePath();c.clip();

  if(iron){
    // Unequal overlapping plates follow bent seams, instead of repeated trusses.
    let x=-4,i=0;
    while(x<w){
      const span=unit*(1.1+variation(i)*2.2), bottom=ledge?h:Math.min(skirt,h+unit*(.28+variation(i+4)*.65));
      polygon(c,[x,4,x+span,5,x+span-4,bottom-6,x+span*.7,bottom,x+4,bottom-3],i%3===0?p.face:p.body);
      line(c,x+span-4,7,x+span-8,bottom-8,p.dark,2);
      line(c,x+5,7,x+span-7,8,p.face);
      const rivetY=Math.min(bottom-4,12);
      for(const rx of [x+7,x+span-9]){c.fillStyle=p.dark;c.fillRect(Math.round(rx),Math.round(rivetY),3,3);c.fillStyle=p.light;c.fillRect(Math.round(rx),Math.round(rivetY),1,1);}
      if(theme==='foundry')polygon(c,[x+span*.56,8,x+span*.69,10,x+span*.64,bottom-7,x+span*.59,bottom-12],p.deposit);
      x+=span;i++;
    }
    if(!ledge){
      // A single torn service cavity has a load-bearing, offset outer face.
      const left=w*(.24+variation(14)*.22),width=Math.min(w*.25,unit*(1.6+variation(15)));
      if(w>unit*4){polygon(c,[left,unit*.55,left+width*.65,unit*.46,left+width,unit*.74,left+width-7,skirt+3,left-3,skirt+3],p.dark);line(c,left-2,unit*.55,left-4,skirt-6,p.face,2);}
    }
  }else if(timber){
    // Long splintered beams carry grain and staggered broken joints.
    const beamHeight=Math.max(8,unit*.26);
    for(let y=3,row=0;y<skirt;y+=beamHeight,row++){
      polygon(c,[0,y,w,y+variation(row)*2,w-2,y+beamHeight-2,w*.73,y+beamHeight-1,0,y+beamHeight-3],row%3===0?p.face:p.body);
      line(c,0,y+beamHeight-2,w,y+beamHeight-1,p.dark,2);
      const knot=w*(.16+variation(row+7)*.68);
      line(c,knot-10,y+3,knot+3,y+5,p.deposit);line(c,knot+3,y+5,knot+14,y+3,p.deposit);
      const split=w*variation(row+19);line(c,split,y+2,split+unit*.7,y+4,p.dark);
      if(row===0||row===2)polygon(c,[w-12,y+2,w,y,w,y+beamHeight-3,w-4,y+beamHeight-6,w-8,y+beamHeight-2],p.dark);
    }
  }else{
    // Broad geological planes use different widths, heights and fracture lines.
    let x=-5,i=0;
    while(x<w){
      const span=unit*(.9+variation(i)*2.1),rise=4+variation(i+5)*Math.min(unit*.4,skirt*.4);
      const low=skirt*(.62+variation(i+12)*.3);
      polygon(c,[x,4,x+span*.76,3,x+span,rise,x+span-5,low,x+span*.7,skirt,x+span*.24,skirt-3,x,low],i%3===0?p.face:p.body);
      polygon(c,[x+span*.76,3,x+span,rise,x+span-5,low,x+span*.7,skirt,x+span*.76,low],variation(i+17)>.65?p.dark:p.body);
      line(c,x+5,8,x+span*.72,5,p.face);
      if(skirt>unit*.8){
        const y=unit*(.44+variation(i+12)*.56);
        polygon(c,[x,y,x+span*.47,y-4,x+span-3,y+3,x+span*.83,y+unit*.19,x+span*.3,y+unit*.12,x+1,y+unit*.15],i%2===0?p.face:p.body);
        line(c,x+3,y+unit*.15,x+span*.3,y+unit*.12,p.dark);
        line(c,x+span*.3,y+unit*.12,x+span*.83,y+unit*.19,p.dark);
      }
      fracture(c,x+span*.64,8,Math.min(skirt-8,unit*(.35+variation(i+23))),p,variation(i+2));
      x+=span;i++;
    }
    if(!ledge&&w>unit*5){
      const x0=w*(.25+variation(33)*.42),y0=unit*(.46+variation(34)*.6);
      polygon(c,[x0,y0,x0+unit*.45,y0+unit*.2,x0+unit*.7,skirt+9,x0-unit*.12,skirt+9,x0+unit*.16,y0+unit*.4],p.dark);
      line(c,x0-2,y0,x0+unit*.12,y0+unit*.36,p.face,2);
    }
  }

  if(root||theme==='flood'){
    // Deposits follow cracks and gravity, rather than uniformly coating the slab.
    const count=Math.max(1,Math.ceil(w/(unit*3.5)));
    for(let i=0;i<count;i++){
      const x=w*(.1+variation(61+i)*.8),length=Math.min(skirt,unit*(.4+variation(72+i)*.7));
      polygon(c,[x-7,4,x+8,4,x+4,13,x+2,length,x-1,length-4,x-3,15],p.deposit);
      line(c,x,8,x+2,length,p.face);
    }
  }
  if(!ledge){
    const shade=c.createLinearGradient(0,Math.min(skirt*.5,unit),0,skirt+unit*.25);
    shade.addColorStop(0,'#06111b00');shade.addColorStop(1,'#06111bcb');c.fillStyle=shade;c.fillRect(0,0,w,skirt+unit);
  }
  c.restore();

  // Unequal eroded capstones have no regular picket pattern below their top.
  let x=0,i=0;
  while(x<w){
    const span=Math.min(w-x,unit*(.42+variation(101+i)*1.25)),depth=4+variation(111+i)*Math.min(8,h*.4);
    polygon(c,[x,0,x+span,0,x+span-1,depth-2,x+span*.7,depth,x+span*.33,depth-1,x+2,depth+2,x,depth-1],iron?p.face:variation(121+i)>.66?p.face:p.body);
    line(c,x+1,1,x+span-2,1,p.light);
    if(span>10)line(c,x+span-2,2,x+span-4,depth-1,p.dark);
    x+=span;i++;
  }
  c.fillStyle=p.light;c.fillRect(0,0,w,1);

  if(ledge){
    if(iron){
      // Asymmetrical cantilever and tension stay make the shelf carry weight.
      const support=w*(.2+variation(142)*.32),end=w-5,drop=Math.min(unit*.65,w*.32);
      polygon(c,[3,h-2,end,h-2,end-5,h+4,support,h+drop,3,h+3],p.dark);
      line(c,4,h,end-6,h,p.face,2);line(c,support,h+drop,end-6,h+2,p.face,2);
      line(c,5,h+2,support,h+drop,p.body,3);
      const chainX=variation(151)>.5?w-8:8;
      for(let y=h+4;y<h+unit*.86;y+=5){c.fillStyle=p.dark;c.fillRect(chainX-1,y,3,4);c.fillStyle=p.face;c.fillRect(chainX,y,1,2);}
    }else if(timber){
      line(c,w*.17,h-1,w*.38,h+unit*.72,p.dark,5);line(c,w*.17+1,h,w*.38+1,h+unit*.65,p.deposit,2);
      polygon(c,[w*.71,h-1,w*.78,h-1,w*.61,h+unit*.39,w*.51,h+unit*.52],p.dark);
      line(c,w*.74,h,w*.57,h+unit*.43,p.face);
    }else if(root){
      const rootX=w*(.3+variation(161)*.35);
      polygon(c,[rootX-8,h-2,rootX+9,h-2,rootX+4,h+unit*.25,rootX-9,h+unit*.55,rootX-5,h+unit*.83,rootX-11,h+unit*.68,rootX-14,h+unit*.46,rootX-5,h+unit*.2],p.dark);
      line(c,rootX-2,h,rootX-8,h+unit*.48,p.deposit,2);line(c,rootX-8,h+unit*.48,rootX-6,h+unit*.7,p.face);
      line(c,rootX-8,h+unit*.4,rootX+unit*.38,h+unit*.63,p.dark,3);
    }else{
      const tooth=w*(.2+variation(171)*.5),width=Math.min(unit*.7,w*.38);
      polygon(c,[tooth-width*.5,h-2,tooth+width*.5,h-2,tooth+width*.27,h+unit*.16,tooth-2,h+unit*.48,tooth-8,h+unit*.35],p.body);
      polygon(c,[tooth-width*.5,h-2,tooth-1,h+unit*.12,tooth-8,h+unit*.35,tooth-width*.5,h+unit*.11],p.face);
      line(c,tooth-width*.5+1,h,tooth-4,h+unit*.22,p.light);
    }
  }
  return canvas;
}
