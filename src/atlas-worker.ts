import {packPilgrimAtlas} from './pilgrim-atlas';
import {packEnemyAtlas} from './enemy-atlas';
import {packTerrainAtlas} from './terrain-atlas';
type Job={id:number;kind:'pilgrim'|'enemies'|'terrain';image:ImageBitmap};
const worker=self as unknown as {onmessage:((event:MessageEvent<Job>)=>void)|null;postMessage:(data:unknown,transfer:Transferable[])=>void};
worker.onmessage=({data})=>{
  try{
    const make=()=>new OffscreenCanvas(1,1);
    const canvases=data.kind==='terrain'?packTerrainAtlas(data.image,make):[data.kind==='pilgrim'?packPilgrimAtlas(data.image,make):packEnemyAtlas(data.image,make)];
    const images=canvases.map(canvas=>canvas.transferToImageBitmap());
    worker.postMessage({id:data.id,images},images);
  }catch(error){worker.postMessage({id:data.id,error:error instanceof Error?error.message:'Atlas packing failed'},[]);}
  finally{data.image.close();}
};
