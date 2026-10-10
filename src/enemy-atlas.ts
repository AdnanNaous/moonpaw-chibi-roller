/** Runtime-only isolation of the unmodified, transparent enemy source sheet.
 * Packing happens once on asset load, never inside a frame or enemy draw.
 */
import type {AtlasCanvas,AtlasSource} from './atlas-canvas';
type AtlasContext=CanvasRenderingContext2D|OffscreenCanvasRenderingContext2D;
export const ENEMY_CELL={width:192,height:192,foot:180,body:156,columns:4,rows:4} as const;
export const ENEMY_KINDS={sentinel:0,skirmisher:1,marksman:2,regent:3} as const;
export function packEnemyAtlas<T extends AtlasCanvas=HTMLCanvasElement>(image:AtlasSource,makeCanvas:()=>T=(()=>document.createElement('canvas')) as ()=>T):T{
  const source=makeCanvas();source.width=image.naturalWidth??image.width;source.height=image.naturalHeight??image.height;
  const c=source.getContext('2d',{willReadFrequently:true}) as AtlasContext;c.drawImage(image,0,0);
  const pixels=c.getImageData(0,0,source.width,source.height),w=source.width,h=source.height;
  const labels=new Int32Array(w*h),queue=new Int32Array(w*h);
  type Shape={id:number;x:number;y:number;w:number;h:number;center:number;row:number};
  const shapes:Shape[]=[],fragments:Shape[]=[];
  // Measured floor bands prevent the raised Regent axe joining the previous
  // pose. Disconnected weapons may cross nominal columns; masks isolate them.
  const bands=[0,Math.round(h*.2504),Math.round(h*.4992),Math.round(h*.7337),h];
  let id=0;
  for(let row=0;row<4;row++){
    const from=bands[row],to=bands[row+1];
    for(let p=from*w;p<to*w;p++){
      if(labels[p]||pixels.data[p*4+3]<32)continue;
      id++;let head=0,tail=1,left=w,right=0,top=h,bottom=0,sumX=0;queue[0]=p;labels[p]=id;
      while(head<tail){
        const i=queue[head++],x=i%w,y=Math.floor(i/w);sumX+=x;left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
        for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
          const xx=x+dx,yy=y+dy;if(xx<0||xx>=w||yy<from||yy>=to)continue;
          const j=yy*w+xx;if(!labels[j]&&pixels.data[j*4+3]>=32){labels[j]=id;queue[tail++]=j;}
        }
      }
      const shape={id,x:left,y:top,w:right-left+1,h:bottom-top+1,center:sumX/tail-left,row};
      if(tail>2000)shapes.push(shape);else if(tail>20)fragments.push(shape);
    }
  }
  if(shapes.length!==16)throw new Error(`Enemy atlas has ${shapes.length} drawings; expected 16`);
  shapes.sort((a,b)=>a.row-b.row||a.x-b.x);
  for(let row=0;row<4;row++)if(shapes.filter(q=>q.row===row).length!==4)throw new Error(`Enemy atlas row ${row} does not contain four drawings`);
  // Broken crown pieces and chain links intentionally contain negative space.
  // Attach nearby small components to their own figure, never a grid neighbor.
  const owners=new Int32Array(id+1);for(const q of shapes)owners[q.id]=q.id;
  for(const f of fragments){
    let nearest:Shape|undefined,best=24*24;
    for(const q of shapes){
      if(q.row!==f.row)continue;
      const dx=Math.max(0,q.x-(f.x+f.w),f.x-(q.x+q.w)),dy=Math.max(0,q.y-(f.y+f.h),f.y-(q.y+q.h));
      const distance=dx*dx+dy*dy;if(distance<best){nearest=q;best=distance;}
    }
    if(nearest){
      owners[f.id]=nearest.id;const oldLeft=nearest.x,right=Math.max(nearest.x+nearest.w,f.x+f.w),bottom=Math.max(nearest.y+nearest.h,f.y+f.h);
      nearest.x=Math.min(nearest.x,f.x);nearest.y=Math.min(nearest.y,f.y);nearest.w=right-nearest.x;nearest.h=bottom-nearest.y;nearest.center+=oldLeft-nearest.x;
    }
  }
  const cell=ENEMY_CELL,atlas=makeCanvas();atlas.width=cell.width*4;atlas.height=cell.height*4;
  const out=atlas.getContext('2d') as AtlasContext;out.imageSmoothingEnabled=false;
  const scratch=makeCanvas();
  // Each kind has one scale across every pose: a low attack doesn't stretch
  // into a tall idle figure, and recoil keeps the same anatomical proportions.
  const scales=Array.from({length:4},(_,kind)=>Math.min(...shapes.filter((_,i)=>i%4===kind).map(q=>Math.min(180/q.w,cell.body/q.h))));
  for(let frame=0;frame<16;frame++){
    const q=shapes[frame],kind=frame%4,scale=scales[kind];scratch.width=q.w;scratch.height=q.h;
    const isolated=new ImageData(q.w,q.h);
    for(let y=0;y<q.h;y++)for(let x=0;x<q.w;x++){
      const index=(q.y+y)*w+q.x+x;if(owners[labels[index]]!==q.id)continue;
      const target=(y*q.w+x)*4;isolated.data.set(pixels.data.subarray(index*4,index*4+4),target);
    }
    (scratch.getContext('2d') as AtlasContext).putImageData(isolated,0,0);
    const dw=Math.round(q.w*scale),dh=Math.round(q.h*scale);
    const dx=Math.max(4,Math.min(cell.width-dw-4,Math.round(cell.width/2-q.center*scale)));
    out.drawImage(scratch,kind*cell.width+dx,q.row*cell.height+cell.foot+1-dh,dw,dh);
  }
  return atlas;
}
