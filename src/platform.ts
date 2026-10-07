import {Capacitor} from '@capacitor/core';
import {App} from '@capacitor/app';

export const android=Capacitor.getPlatform()==='android';
export const canExit=!!window.moonpawDesktop||android;
export const exitLabel=android?'Exit to device':'Exit game';
export async function exitApplication(){
  if(window.moonpawDesktop)await window.moonpawDesktop.quit();
  else if(android)await App.minimizeApp();
}
export function onAndroidBack(callback:()=>void){
  if(android)void App.addListener('backButton',callback);
}
