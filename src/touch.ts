import {InputController,type TouchAction} from './input';

/** A broad, floating horizontal pad; the thumb need not find two small arrows. */
export function joystickAxis(offset:number,radius:number) {
  const scaled=Math.max(-1,Math.min(1,offset/Math.max(radius,1)));
  return Math.abs(scaled)<.12?0:Math.sign(scaled)*Math.min(1,(Math.abs(scaled)-.12)/.56);
}

export class TouchDock {
  private abort=new AbortController();
  private stickPointer=-1;
  private origin=0;
  private buttons=new Map<number,{element:HTMLElement;action:TouchAction}>();
  constructor(private dock:HTMLElement,private input:InputController){
    const signal=this.abort.signal,pad=dock.querySelector<HTMLElement>('#move-pad')!,thumb=pad.querySelector<HTMLElement>('.thumb')!;
    const move=(e:PointerEvent)=>{
      if(e.pointerId!==this.stickPointer)return;
      const radius=Math.min(42,pad.clientWidth*.22),delta=Math.max(-radius,Math.min(radius,e.clientX-this.origin));
      input.setMove(joystickAxis(delta,radius));thumb.style.transform=`translate(${delta}px,0)`;
      pad.setAttribute('aria-valuenow',String(Math.round(joystickAxis(delta,radius)*100)));
    };
    pad.addEventListener('pointerdown',e=>{
      if(this.stickPointer!==-1)return;e.preventDefault();this.stickPointer=e.pointerId;
      const rect=pad.getBoundingClientRect();this.origin=Math.max(rect.left+44,Math.min(rect.right-44,e.clientX));
      pad.style.setProperty('--origin',`${this.origin-rect.left}px`);pad.classList.add('held');pad.setPointerCapture(e.pointerId);move(e);
    },{signal});
    pad.addEventListener('pointermove',move,{signal});
    const release=(e:PointerEvent)=>{if(e.pointerId===this.stickPointer){this.stickPointer=-1;input.setMove(0);thumb.style.transform='';pad.classList.remove('held');pad.setAttribute('aria-valuenow','0');}};
    for(const type of ['pointerup','pointercancel','lostpointercapture'])pad.addEventListener(type,release as EventListener,{signal});
    dock.querySelectorAll<HTMLElement>('[data-touch]').forEach(element=>{
      element.addEventListener('pointerdown',e=>{
        e.preventDefault();const action=element.dataset.touch as TouchAction;
        this.buttons.set(e.pointerId,{element,action});element.setPointerCapture(e.pointerId);input.setTouch(action,true);element.classList.add('held');
      },{signal});
      const up=(e:PointerEvent)=>{const held=this.buttons.get(e.pointerId);if(!held)return;this.buttons.delete(e.pointerId);
        if(![...this.buttons.values()].some(b=>b.action===held.action)){input.setTouch(held.action,false);held.element.classList.remove('held');}
      };
      for(const type of ['pointerup','pointercancel','lostpointercapture'])element.addEventListener(type,up as EventListener,{signal});
    });
  }
  dispose(){this.abort.abort();this.stickPointer=-1;this.buttons.clear();this.input.reset();this.dock.querySelectorAll('.held').forEach(e=>e.classList.remove('held'));this.dock.querySelector<HTMLElement>('.thumb')?.style.removeProperty('transform');this.dock.querySelector<HTMLElement>('#move-pad')?.style.removeProperty('--origin');}
}
