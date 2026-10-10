interface DesktopWindow {
  readonly testing?:boolean;
  quit():Promise<void>;
  toggleFullscreen():Promise<boolean>;
  isFullscreen():Promise<boolean>;
  onFullscreenChange(callback:(active:boolean)=>void):()=>void;
}
declare global {interface Window {moonpawDesktop?:DesktopWindow}}

export class FullscreenControl {
  active=false;
  supported=!!window.moonpawDesktop||document.fullscreenEnabled;
  constructor(private changed:()=>void){
    window.addEventListener('keydown',event=>{
      if(event.key!=='F11'||event.repeat||!this.supported)return;
      event.preventDefault();void this.toggle().catch(()=>{});
    });
    document.addEventListener('fullscreenchange',()=>{this.active=!!document.fullscreenElement;changed();});
    window.moonpawDesktop?.onFullscreenChange(active=>{this.active=active;changed();});
    void window.moonpawDesktop?.isFullscreen().then(active=>{this.active=active;changed();});
  }
  async toggle(){
    if(window.moonpawDesktop)this.active=await window.moonpawDesktop.toggleFullscreen();
    else if(document.fullscreenElement)await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
    this.changed();
  }
}
