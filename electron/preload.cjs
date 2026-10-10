const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('moonpawDesktop',{
  testing:process.argv.includes('--moonpaw-test'),
  quit:()=>ipcRenderer.invoke('moonpaw:quit'),
  toggleFullscreen:()=>ipcRenderer.invoke('moonpaw:fullscreen-toggle'),
  isFullscreen:()=>ipcRenderer.invoke('moonpaw:fullscreen-state'),
  onFullscreenChange:(callback)=>{
    if(typeof callback!=='function')throw new TypeError('Expected a fullscreen listener');
    const listener=(_event,value)=>{if(typeof value==='boolean')callback(value);};
    ipcRenderer.on('moonpaw:fullscreen-change',listener);
    return ()=>ipcRenderer.removeListener('moonpaw:fullscreen-change',listener);
  }
});
