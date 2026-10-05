import {afterEach,expect,it,vi} from 'vitest';
import {loadSettings,storeSettings} from '../src/storage';
afterEach(()=>vi.unstubAllGlobals());
function storage(data?:object){let value=data?JSON.stringify(data):null;vi.stubGlobal('matchMedia',()=>({matches:false}));vi.stubGlobal('localStorage',{getItem:()=>value,setItem:(_key:string,next:string)=>value=next});return ()=>value;}
it('raises the previous untouched default and preserves a deliberately saved volume and mute',()=>{
  storage({volume:.32,muted:true,quality:'balanced'});expect(loadSettings()).toEqual({volume:.70,muted:true,quality:'balanced'});
  const read=storage();storeSettings({volume:.32,muted:false,quality:'high'});expect(JSON.parse(read()!).audioRevision).toBe(1);expect(loadSettings().volume).toBe(.32);
  storage({volume:.15,muted:false});expect(loadSettings().volume).toBe(.15);
});
