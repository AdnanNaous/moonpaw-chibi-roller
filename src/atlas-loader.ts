import {packPilgrimAtlas} from './pilgrim-atlas';
import {packEnemyAtlas} from './enemy-atlas';
import {packTerrainAtlas} from './terrain-atlas';
type Kind='pilgrim'|'enemies'|'terrain';
type Pending={resolve:(value:HTMLCanvasElement[])=>void;reject:(reason:Error)=>void;timeout:number};
let worker:Worker|undefined,serial=0;
const jobs=new Map<number,Pending>();
function stopWorker(error:Error){for(const job of jobs.values()){clearTimeout(job.timeout);job.reject(error);}jobs.clear();worker?.terminate();worker=undefined;}
function getWorker(){
  if(worker)return worker;
  worker=new Worker(new URL('./atlas-worker.ts',import.meta.url),{type:'module'});
  worker.onerror=()=>stopWorker(new Error('Atlas worker unavailable'));
  worker.onmessage=({data}:{data:{id:number;images?:ImageBitmap[];error?:string}})=>{
    const job=jobs.get(data.id);if(!job){data.images?.forEach(image=>image.close());return;}
    jobs.delete(data.id);clearTimeout(job.timeout);
    if(data.error){job.reject(new Error(data.error));return;}
    try{
      const result=(data.images??[]).map(image=>{const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;canvas.getContext('2d')!.drawImage(image,0,0);image.close();return canvas;});
      if(!result.length)throw new Error('Atlas worker returned no drawings');job.resolve(result);
    }catch(error){data.images?.forEach(image=>image.close());job.reject(error instanceof Error?error:new Error('Atlas transfer failed'));}
  };
  return worker;
}
/** Heavy alpha isolation runs off the animation thread. No generated files are modified. */
export async function loadAtlas(image:HTMLImageElement,kind:Kind):Promise<HTMLCanvasElement[]>{
  if(typeof Worker==='undefined'||typeof OffscreenCanvas==='undefined'||typeof createImageBitmap==='undefined'){
    // Older WebViews retain the same artwork without requiring a worker API.
    await new Promise<void>(resolve=>setTimeout(resolve,0));
    return kind==='terrain'?packTerrainAtlas(image):[kind==='pilgrim'?packPilgrimAtlas(image):packEnemyAtlas(image)];
  }
  const bitmap=await createImageBitmap(image),id=++serial;
  try{
    const target=getWorker();
    return await new Promise<HTMLCanvasElement[]>((resolve,reject)=>{
      const timeout=window.setTimeout(()=>{jobs.delete(id);reject(new Error('Atlas preparation timed out'));},15000);
      jobs.set(id,{resolve,reject,timeout});
      try{target.postMessage({id,kind,image:bitmap},[bitmap]);}catch(error){jobs.delete(id);clearTimeout(timeout);bitmap.close();reject(error instanceof Error?error:new Error('Atlas transfer failed'));}
    });
  }catch(error){bitmap.close();throw error;}
}
