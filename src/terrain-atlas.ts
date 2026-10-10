import type {AtlasCanvas,AtlasSource} from './atlas-canvas';
type AtlasContext=CanvasRenderingContext2D|OffscreenCanvasRenderingContext2D;
/** Source isolation supports OffscreenCanvas in the shared atlas worker. */
export function packTerrainAtlas<T extends AtlasCanvas=HTMLCanvasElement>(image:AtlasSource,makeCanvas:()=>T=(()=>document.createElement('canvas')) as ()=>T):T[]{
  const source=makeCanvas();source.width=image.naturalWidth??image.width;source.height=image.naturalHeight??image.height;
  const c=source.getContext('2d',{willReadFrequently:true}) as AtlasContext;c.drawImage(image,0,0);
  const pixels=c.getImageData(0,0,source.width,source.height),w=source.width,h=source.height;
  const bands=[0,.2734,.5176,.752,1].map(y=>Math.round(y*h));
  const materials:T[]=[];
  for(let row=0;row<4;row++){
    let left=w,right=0,top=h,bottom=0;
    for(let y=bands[row];y<bands[row+1];y++)for(let x=0;x<w;x++)if(pixels.data[(y*w+x)*4+3]>=180){
      left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
    }
    if(right<=left||bottom<=top)throw new Error(`Terrain material ${row} is empty`);
    const material=makeCanvas();material.width=right-left+1;material.height=bottom-top+1;
    const isolated=new ImageData(material.width,material.height);
    for(let y=0;y<material.height;y++)for(let x=0;x<material.width;x++){
      const index=((y+top)*w+x+left)*4,target=(y*material.width+x)*4;
      // Low-alpha exterior haze is omitted from runtime presentation only.
      if(pixels.data[index+3]<32)continue;
      isolated.data.set(pixels.data.subarray(index,index+4),target);
    }
    (material.getContext('2d') as AtlasContext).putImageData(isolated,0,0);materials.push(material);
  }
  return materials;
}
