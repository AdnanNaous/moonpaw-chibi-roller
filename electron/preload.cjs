const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('moonpawDesktop',{
  toggleFullscreen:()=>ipcRenderer.invoke('moonpaw:fullscreen-toggle'),
  isFullscreen:()=>ipcRenderer.invoke('moonpaw:fullscreen-state'),
  onFullscreenChange:(callback)=>{
    const listener=(_event,value)=>callback(value);
    ipcRenderer.on('moonpaw:fullscreen-change',listener);
    return ()=>ipcRenderer.removeListener('moonpaw:fullscreen-change',listener);
  }
});
