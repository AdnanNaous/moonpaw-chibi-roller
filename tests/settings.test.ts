import {afterEach,expect,it,vi} from 'vitest';
import {loadSettings,storeSettings} from '../src/storage';
afterEach(()=>vi.unstubAllGlobals());
function storage(data?:object){let value=data?JSON.stringify(data):null;vi.stubGlobal('matchMedia',()=>({matches:false}));vi.stubGlobal('localStorage',{getItem:()=>value,setItem:(_key:string,next:string)=>value=next});return ()=>value;}
it('raises the previous untouched default and preserves a deliberately saved volume and mute',()=>{
  storage({volume:.32,muted:true,quality:'balanced'});expect(loadSettings()).toMatchObject({volume:.70,muted:true,quality:'balanced',musicVolume:.85,effectsVolume:1});
  const read=storage();storeSettings({...loadSettings(),volume:.32,muted:false,quality:'high'});expect(JSON.parse(read()!).audioRevision).toBe(1);expect(loadSettings().volume).toBe(.32);
  storage({volume:.15,muted:false});expect(loadSettings().volume).toBe(.15);
});
it('loads separate audio controls and clamps invalid stored levels without changing accessibility choices',()=>{
  storage({musicVolume:9,effectsVolume:-4,volume:.6,reducedMotion:true,largeTouch:true});
  expect(loadSettings()).toMatchObject({musicVolume:1,effectsVolume:0,volume:.6,reducedMotion:true,largeTouch:true});
});
