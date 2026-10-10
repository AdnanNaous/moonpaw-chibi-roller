/** The same atlas algorithms run in a worker or a browser regression fixture. */
export type AtlasCanvas=HTMLCanvasElement|OffscreenCanvas;
export type AtlasSource=CanvasImageSource&{naturalWidth?:number;naturalHeight?:number;width:number;height:number};
