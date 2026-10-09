/** Pack the disconnected drawings in the source sheet into isolated animation cells.
 * The source is kept intact; cell masks prevent a neighboring tail from bleeding in.
 */
export const PAINTED_PILGRIM_CELL={width:192,height:160,foot:146,body:100,frames:32} as const;
export function packPilgrimAtlas(image:HTMLImageElement){
  const source=document.createElement('canvas');source.width=image.naturalWidth;source.height=image.naturalHeight;
  const c=source.getContext('2d',{willReadFrequently:true})!;c.drawImage(image,0,0);
  const pixels=c.getImageData(0,0,source.width,source.height),w=source.width,h=source.height;
  const labels=new Int32Array(w*h),queue=new Int32Array(w*h);
  const shapes:Array<{id:number;x:number;y:number;w:number;h:number;count:number;center:number}>=[];
  let id=0;
  for(let p=0;p<labels.length;p++){
    if(labels[p]||pixels.data[p*4+3]<32)continue;
    id++;let head=0,tail=1,left=w,right=0,top=h,bottom=0,sumX=0;queue[0]=p;labels[p]=id;
    while(head<tail){
      const i=queue[head++],x=i%w,y=Math.floor(i/w);sumX+=x;left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
        const xx=x+dx,yy=y+dy;if(xx<0||xx>=w||yy<0||yy>=h)continue;
        const j=yy*w+xx;if(!labels[j]&&pixels.data[j*4+3]>=32){labels[j]=id;queue[tail++]=j;}
      }
    }
    if(tail>2000)shapes.push({id,x:left,y:top,w:right-left+1,h:bottom-top+1,count:tail,center:sumX/tail-left});
  }
  if(shapes.length!==32)throw new Error(`Pilgrim atlas has ${shapes.length} drawings; expected 32`);
  // Use the drawings' floor bands rather than equal grid rows: tall wall and
  // jump poses reach above their row, and long tails cross nominal columns.
  const row=(q:typeof shapes[number])=>{const foot=(q.y+q.h)/h;return foot<.31?0:foot<.54?1:foot<.77?2:3;};
  shapes.sort((a,b)=>row(a)-row(b)||a.x-b.x);
  const cell=PAINTED_PILGRIM_CELL,atlas=document.createElement('canvas');atlas.width=cell.width*cell.frames;atlas.height=cell.height;
  const out=atlas.getContext('2d')!;out.imageSmoothingEnabled=false;
  const scratch=document.createElement('canvas');
  for(let frame=0;frame<shapes.length;frame++){
    const q=shapes[frame];scratch.width=q.w;scratch.height=q.h;
    const isolated=new ImageData(q.w,q.h);
    for(let y=0;y<q.h;y++)for(let x=0;x<q.w;x++){
      const index=(q.y+y)*w+q.x+x;if(labels[index]!==q.id)continue;
      const target=(y*q.w+x)*4;isolated.data.set(pixels.data.subarray(index*4,index*4+4),target);
    }
    scratch.getContext('2d')!.putImageData(isolated,0,0);
    const scale=.64,dw=Math.round(q.w*scale),dh=Math.round(q.h*scale);
    // Anchor the opaque body mass, rather than the bounding box of a long tail.
    // Bound the offset so even the extended claw pose keeps its full silhouette.
    const dx=Math.max(3,Math.min(cell.width-dw-3,Math.round(cell.width/2-q.center*scale)));
    out.drawImage(scratch,frame*cell.width+dx,cell.foot+1-dh,dw,dh);
  }
  return atlas;
}
