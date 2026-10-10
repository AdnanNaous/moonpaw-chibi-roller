import {createPilgrimSprites, createEnemySprites, PILGRIM_CELL, PILGRIM_POSE} from './pixel-art';
import {structure,preloadStructureArt} from './structures';
import {PAINTED_PILGRIM_CELL} from './pilgrim-atlas';
import {ENEMY_CELL,ENEMY_KINDS} from './enemy-atlas';
import {loadAtlas} from './atlas-loader';
import {brokenOrbit, paintMoth, architectureDetail} from './world-art';
import type { GameState, Quality, Stage } from './types';

type G = CanvasRenderingContext2D;
type Layer = { canvas: HTMLCanvasElement; speed: number; opacity: number };
type Tone = { sky: string; horizon: string; far: string; mid: string; near: string; stone: string; edge: string; ember: string; accent: string };

const SCENES = ['crypt', 'foundry', 'flood', 'archives', 'belfry', 'orchard', 'prison', 'choir', 'abyss', 'throne'] as const;
const TONES: Record<string, Tone> = {
  crypt: { sky: '#050607', horizon: '#202326', far: '#1a1e20', mid: '#292d2d', near: '#111515', stone: '#363b39', edge: '#9da7a0', ember: '#d5a66f', accent: '#9bc7c3' },
  foundry: { sky: '#080807', horizon: '#28211b', far: '#1e1e1b', mid: '#302b25', near: '#131615', stone: '#403c34', edge: '#aaa89c', ember: '#ef8749', accent: '#d6ae79' },
  flood: { sky: '#050a0b', horizon: '#203036', far: '#182629', mid: '#273739', near: '#101a1d', stone: '#384545', edge: '#a5b6b4', ember: '#a6d7d8', accent: '#6cb7bb' },
  archives: { sky: '#080707', horizon: '#282522', far: '#1c1b1b', mid: '#302e2b', near: '#121414', stone: '#3d3d38', edge: '#b2b0a4', ember: '#d5b480', accent: '#b7bca9' },
  belfry: { sky: '#070708', horizon: '#27292c', far: '#1d2023', mid: '#313338', near: '#14171a', stone: '#40444a', edge: '#b7b9b6', ember: '#d7b081', accent: '#a6afbd' },
  orchard: { sky: '#070808', horizon: '#242a27', far: '#1c2421', mid: '#303a32', near: '#111b17', stone: '#39443b', edge: '#aeb8a8', ember: '#d5a77a', accent: '#97b59c' },
  prison: { sky: '#060708', horizon: '#25282b', far: '#1b1f22', mid: '#2e3336', near: '#101316', stone: '#393e40', edge: '#afb7b7', ember: '#df9b67', accent: '#96bac0' },
  choir: { sky: '#080708', horizon: '#2b2527', far: '#211d20', mid: '#373133', near: '#161315', stone: '#433c3d', edge: '#c1b3af', ember: '#d9b2a3', accent: '#b8b1b0' },
  abyss: { sky: '#030405', horizon: '#1a2225', far: '#111a1d', mid: '#253034', near: '#0e1518', stone: '#303e42', edge: '#9aaeb1', ember: '#91c7d2', accent: '#75bec7' },
  throne: { sky: '#070506', horizon: '#292124', far: '#20191d', mid: '#352b30', near: '#171014', stone: '#43383d', edge: '#c4b4b4', ember: '#dcb18e', accent: '#bd8390' },
};

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const hash = (n: number) => { const x = Math.sin(n * 91.713 + 17.19) * 43758.5453; return x - Math.floor(x); };
const px = (n: number) => Math.round(n);

function polygon(c: G, points: number[], fill: string) {
  c.fillStyle = fill; c.beginPath(); c.moveTo(px(points[0]), px(points[1]));
  for (let i = 2; i < points.length; i += 2) c.lineTo(px(points[i]), px(points[i + 1]));
  c.closePath(); c.fill();
}
function line(c: G, x1: number, y1: number, x2: number, y2: number, color: string, width = 1) {
  c.strokeStyle = color; c.lineWidth = width; c.beginPath(); c.moveTo(px(x1) + .5, px(y1) + .5); c.lineTo(px(x2) + .5, px(y2) + .5); c.stroke();
}
function arch(c: G, x: number, foot: number, w: number, h: number, color: string) {
  c.fillStyle=color;const radius=Math.max(2,Math.round(w/2)),top=Math.round(foot-h),shoulder=top+radius;
  c.fillRect(Math.round(x-radius),shoulder,radius*2,Math.max(0,Math.round(h)-radius));
  for(let row=0;row<radius;row++){const half=Math.floor(Math.sqrt(radius*radius-(radius-row)*(radius-row)));c.fillRect(Math.round(x-half),top+row,half*2,1);}
}
function ring(c: G, x: number, y: number, r: number, color: string, width = 2) {
  c.strokeStyle = color; c.lineWidth = width; c.beginPath(); c.arc(px(x), px(y), Math.max(1, px(r)), 0, Math.PI * 2); c.stroke();
}

/** An original pixel-painted, fixed-side-view renderer. Gameplay remains in x/y world coordinates. */
export class GameRenderer {
  readonly stats = { fps: 0, drawCalls: 0, triangles: 0, pixelScale:1, width:0, height:0 };
  private readonly canvas: HTMLCanvasElement;
  private sprites=document.createElement('canvas');
  private heroCell:{width:number;height:number;foot:number;body:number;frames:number}=PAINTED_PILGRIM_CELL;
  private readonly heroImage=new Image();
  private heroReady=false;
  private enemySprites=createEnemySprites();
  private enemyCell:{width:number;height:number;foot:number;body:number}={width:48,height:64,foot:60,body:48};
  private readonly enemyImage=new Image();
  private disposed=false;
  private structures=new Map<string,HTMLCanvasElement>();
  private titlePresentation=false;
  private previousPlayer?:{x:number;y:number;stride:number};
  private previousEnemies=new Map<string,{x:number;y:number}>();
  private previousPlatforms=new Map<string,{x:number;y:number}>();
  private renderAlpha=1;
  private enemyRim?:HTMLCanvasElement;
  private pilgrimLight?:HTMLCanvasElement;
  private foreground?:HTMLCanvasElement;
  private frameOverlay?:HTMLCanvasElement;
  private layerKey='';
  private glowTextures=new Map<string,HTMLCanvasElement>();
  private cinematic?:{chapter:number;beat:number;time:number};
  private readonly atlas=new Image();
  private backplate?:HTMLCanvasElement;
  private pixelScale=1;
  private readonly c: G;
  private readonly noise: CanvasPattern | null;
  private quality: Quality;
  private stage?: Stage;
  private stageIndex = 0;
  private theme = 'crypt';
  private tone: Tone = TONES.crypt;
  private width = 640;
  private height = 360;
  private unit = 40;
  private camX = 0;
  private camY = 2.6;
  private layers: Layer[] = [];
  private reduced = false;
  private userReduced = false;
  private media?: MediaQueryList;
  private onMotion?: (e: MediaQueryListEvent) => void;
  private fpsT = 0;
  private fpsN = 0;

  constructor(canvas: HTMLCanvasElement, quality: Quality) {
    this.canvas = canvas;
    this.quality = quality;
    const screen = canvas.getContext('2d', { alpha: false });
    if (!screen) throw new Error('Canvas 2D is unavailable');
    // Draw at the pixel grid directly; the browser compositor scales the surface.
    // Copying it into a second full-window canvas forced a synchronous raster flush.
    this.c = screen;
    this.noise = this.makeNoise();
    void preloadStructureArt().then(()=>{if(!this.disposed)this.structures.clear();}).catch(()=>{});
    const fallback=()=>{this.sprites=createPilgrimSprites();this.heroCell={...PILGRIM_CELL,body:47};this.pilgrimLight=undefined;this.heroReady=true;};
    // Keep the player visible if a run starts before the first download finishes.
    fallback();
    this.heroImage.onload=()=>{void loadAtlas(this.heroImage,'pilgrim').then(([atlas])=>{if(this.disposed)return;this.sprites=atlas;this.heroCell=PAINTED_PILGRIM_CELL;this.pilgrimLight=undefined;this.heroReady=true;}).catch(error=>{if(this.disposed)return;console.warn('The painted pilgrim could not be loaded; using the local fallback.',error);fallback();});};
    this.heroImage.onerror=fallback;
    this.heroImage.src=`${import.meta.env.BASE_URL}art/pilgrim-v6.png`;
    this.enemyImage.onload=()=>{void loadAtlas(this.enemyImage,'enemies').then(([atlas])=>{if(this.disposed)return;this.enemySprites=atlas;this.enemyCell=ENEMY_CELL;this.enemyRim=undefined;}).catch(()=>{});};
    this.enemyImage.src=`${import.meta.env.BASE_URL}art/enemies-v7.png`;
    this.atlas.onload=()=>this.buildBackplate();
    this.atlas.src=`${import.meta.env.BASE_URL}art/threshold-environments-v3.png`;
    if (typeof matchMedia === 'function') {
      this.media = matchMedia('(prefers-reduced-motion: reduce)');
      this.reduced = this.media.matches;
      this.onMotion = e => { this.reduced = e.matches || this.userReduced; };
      this.media.addEventListener?.('change', this.onMotion);
    }
    this.resize();
  }

  private makeNoise(): CanvasPattern | null {
    const tile = document.createElement('canvas'); tile.width = 96; tile.height = 96;
    const c = tile.getContext('2d'); if (!c) return null;
    for (let i = 0; i < 900; i++) {
      const x = Math.floor(hash(i * 7 + 3) * 96), y = Math.floor(hash(i * 11 + 9) * 96);
      c.fillStyle = i % 3 ? '#ffffff' : '#000000'; c.globalAlpha = .09 + hash(i * 27) * .15;
      c.fillRect(x, y, 1 + (i % 19 === 0 ? 1 : 0), 1);
    }
    c.globalAlpha = 1;
    return this.c.createPattern(tile, 'repeat');
  }

  setStage(stage: Stage) {
    this.previousPlayer=undefined;this.previousEnemies.clear();this.previousPlatforms.clear();
    this.stage = stage;
    const name = String(stage.theme);
    this.theme = name in TONES ? name : SCENES[this.stageIndex % 10];
    this.tone = TONES[this.theme];
    this.buildLayers();
    this.camX = stage.spawn.x;
    this.camY = stage.spawn.y + 2.6;
  }

  resize() {
    const cw = Math.max(1, Math.round(this.canvas.clientWidth || this.canvas.width || 640));
    const ch = Math.max(1, Math.round(this.canvas.clientHeight || this.canvas.height || 360));
    const logicalHeight = this.quality === 'low' ? 180 : this.quality === 'high' ? 320 : 270;
    const scale=Math.max(2,Math.round(ch/logicalHeight));
    const width=Math.max(1,Math.floor(cw/scale)),height=Math.max(1,Math.floor(ch/scale));
    const unit=height/(cw/ch<.85?9.0:7.5);
    if(this.width===width&&this.height===height&&this.unit===unit&&this.pixelScale===scale&&this.layers.length&&this.layerKey.endsWith(`:${this.quality}`))return;
    // CSS owns the play viewport, including the separate mobile control strip.
    this.canvas.width = width; this.canvas.height = height;
    this.pixelScale=scale;
    this.height=height;
    this.width=width;
    this.c.imageSmoothingEnabled = false;
    this.unit = unit;
    this.stats.pixelScale=this.pixelScale;this.stats.width=this.width;this.stats.height=this.height;
    this.buildFrameOverlay();
    this.buildLayers();
  }

  setPresentation(value:'title'|'game'){this.titlePresentation=value==='title';}
  setCinematic(active:boolean,chapter:number,beat:number,time:number){
    if(!active){this.cinematic=undefined;return;}
    if(!this.cinematic&&this.stage){this.camX=this.stage.spawn.x-this.width/this.unit*.16-.6;this.camY=this.stage.spawn.y+(this.width/this.height<.85?1.45:2.05);}
    this.cinematic={chapter,beat,time};
  }

  /** Snapshot the last fixed step; render interpolation never changes collisions. */
  capturePhysics(state:GameState){
    const p=state.player;this.previousPlayer={x:p.x,y:p.y,stride:p.stride};
    for(const e of state.stage.enemies){const old=this.previousEnemies.get(e.id)??{x:e.x,y:e.y};old.x=e.x;old.y=e.y;this.previousEnemies.set(e.id,old);}
    for(const q of state.stage.platforms){const old=this.previousPlatforms.get(q.id)??{x:q.x,y:q.y};old.x=q.x;old.y=q.y;this.previousPlatforms.set(q.id,old);}
  }

  private blend(old:number|undefined,current:number){return old===undefined||Math.abs(current-old)>2?current:old+(current-old)*this.renderAlpha;}

  private lampFloor(x:number){return this.stage?.platforms.find(q=>q.h>1&&x>q.x+.5&&x<q.x+q.w-.5);}

  private nearestLamp(x:number,y:number){
    let distance=Infinity,lampX=x-3;
    const consider=(tx:number,ty:number)=>{const d=Math.hypot(tx-x,ty-y);if(d<distance){distance=d;lampX=tx;}};
    for(let n=-1;n<=1;n++){const tx=Math.round((x-3)/9)*9+3+n*9;const floor=this.lampFloor(tx);if(floor)consider(tx,floor.y+.9);}
    for(const cp of this.stage?.checkpoints??[])if(cp.active)consider(cp.x+.2,cp.y+.5);
    return {distance,x:lampX};
  }

  private lightStrength(x:number,y:number){return Math.max(0,.24*(1-this.nearestLamp(x,y).distance/5));}

  private drawCastShadows(state:GameState){
    const c=this.c;
    const bodies=[state.player,...state.stage.enemies.filter(e=>e.health>0).map(e=>({
      x:this.blend(this.previousEnemies.get(e.id)?.x,e.x)+e.w*.5,
      y:this.blend(this.previousEnemies.get(e.id)?.y,e.y),
    }))];
    c.save();c.fillStyle='#010710';
    for(const b of bodies){
      const floor=state.stage.platforms.filter(q=>q.active!==false&&b.x>=q.x&&b.x<=q.x+q.w&&q.y<=b.y+.05).sort((a,b)=>b.y-a.y)[0];if(!floor)continue;
      const x=this.X(b.x),y=this.Y(floor.y),lamp=this.nearestLamp(b.x,b.y).x,away=Math.sign(b.x-lamp)||1;
      const spread=this.unit*(.65+Math.min(3,Math.abs(b.x-lamp))*.22),lift=b.y-floor.y;
      c.globalAlpha=Math.max(.08,.35-lift*.09);
      polygon(c,[x-this.unit*.2,y,x+this.unit*.2,y,x+away*spread+this.unit*.12,y+4,x+away*spread-this.unit*.15,y+4],'#010710');
    }
    c.restore();
  }

  setQuality(quality: Quality) { this.quality = quality; this.resize(); }
  setReducedMotion(value:boolean) { this.userReduced=value;this.reduced=value||Boolean(this.media?.matches); }

  private X(x: number) { return px(this.width * .5 + (x - this.camX) * this.unit); }
  private Y(y: number) { return px(this.height * .5 - (y - this.camY) * this.unit); }

  private buildLayers() {
    if (!this.stage) return;
    const key=`${this.theme}:${this.width}:${this.height}:${this.unit}:${this.quality}`;
    if(this.layerKey===key)return;
    this.layerKey=key;
    const layers: Layer[] = [];
    const tileW = Math.max(512, px(this.unit * 25));
    const specs = [{ speed: .08, opacity: .50 }, { speed: .25, opacity: .72 }, { speed: .50, opacity: .87 }];
    for (let depth = 0; depth < 3; depth++) {
      const tile = document.createElement('canvas'); tile.width = tileW; tile.height = this.height;
      const c = tile.getContext('2d'); if (!c) continue;
      c.imageSmoothingEnabled = false;
      this.paintBackdropTile(c, tileW, this.height, depth);
      layers.push({ canvas: tile, ...specs[depth] });
    }
    this.layers = layers;
    this.structures.clear();
    this.buildForeground(tileW);
    this.buildBackplate();
  }

  private paintBackdropTile(c: G, w: number, h: number, depth: number) {
    const t = this.tone, theme = this.theme;
    const base = depth === 0 ? t.far : depth === 1 ? t.mid : t.near;
    const floor = h * (depth === 0 ? .82 : depth === 1 ? .90 : 1.02);
    const scale = depth === 0 ? .62 : depth === 1 ? .92 : 1.1;
    const cells=depth===0?5:depth===1?4:7;
    const cell = w / cells;
    for (let i = -1; i < cells+1; i++) {
      const x = i * cell + hash(i * 91 + depth * 31) * cell * .18;
      const tall = (130 + hash(i * 17 + depth * 43) * 130) * scale * h/320;
      const width = cell * (.76 + hash(i * 14 + depth) * .48);
      if (depth === 0) this.drawFar(c, theme, x, floor, width, tall, i, base);
      else if (depth === 1) this.drawMiddle(c, theme, x, floor, width, tall, i, base);
      else this.drawNear(c, theme, x, floor, width, tall, i, base);
      if(depth===1&&theme!=='orchard'&&theme!=='abyss'){
        polygon(c,[x+width*.93,floor-tall*.82,x+width*1.08,floor-tall*.91,x+width*1.08,floor,x+width*.93,floor],'#080f16');
        line(c,x+width*.94,floor-tall*.80,x+width*.94,floor,'#65756c',1);
        line(c,x+width*.04,floor-tall*.89,x+width*.89,floor-tall*.89,'#8e9480',1);
      }
    }
    if (depth === 2) {
      c.fillStyle = base; c.fillRect(0, px(floor - 3), w, h - floor + 4);
      for (let i = 0; i < 33; i++) {
        const x = hash(i * 73 + 11) * w, y = floor - hash(i * 41 + 9) * 28;
        line(c, x, y, x - 3, y + 4, '#080c0c', 1);
      }
    }
    // Stable, seeded pointillism belongs to each painted plane rather than to the screen.
    c.save(); c.globalAlpha = depth === 2 ? .12 : .08;
    for (let i = 0; i < w * .9; i++) {
      const x = px(hash(i * 19 + depth * 71) * w), y = px(hash(i * 37 + 11) * h);
      c.fillStyle = i % 3 ? '#c5c5bd' : '#030506'; c.fillRect(x, y, 1, 1);
    }
    c.restore();
  }

  private buildForeground(w:number){
    const tile=document.createElement('canvas');tile.width=w;tile.height=this.height;
    const c=tile.getContext('2d')!,h=this.height; c.imageSmoothingEnabled=false;
    const organic=this.theme==='orchard'||this.theme==='abyss';
    // Close planes frame the ceiling and the ground. Never hide the central combat lane.
    if(organic){
      for(let i=0;i<12;i++){
        const x=hash(i*67)*w;
        line(c,x,0,x+6,h*(.10+hash(i*37)*.12),'#060d11',3);
        for(let k=0;k<4;k++){const y=k*h*.037;polygon(c,[x,y,x-7,y+3,x-4,y+8,x,y+6],'#111e22');}
      }
    }else{
      c.fillStyle='#030a0e';c.fillRect(0,0,w,5);
      for(let i=0;i<5;i++){
        const x=i*w/5+19,len=h*(.09+hash(i*41)*.13);
        for(let y=3;y<len;y+=4){c.fillStyle=y%8?'#26383b':'#071117';c.fillRect(px(x),px(y),2,3);}
        if(i%2){c.fillStyle='#101d22';c.fillRect(px(x-5),px(len),12,6);c.fillStyle='#647665';c.fillRect(px(x-2),px(len+3),3,1);}
      }
      // Broken, sloping corners imply an interior volume without a flat full-screen frame.
      polygon(c,[0,0,36,0,19,h*.13,9,h*.36,0,h*.42],'#050d12');
      line(c,19,h*.13,9,h*.35,'#263e40',2);
      c.fillStyle='#182c31';c.fillRect(3,4,4,Math.round(h*.24));
      for(let yy=9;yy<h*.25;yy+=11){c.fillStyle='#41524a';c.fillRect(3,yy,2,2);}
      polygon(c,[w,0,w-23,0,w-12,h*.10,w,h*.18],'#071016');
    }
    for(let i=0;i<w/55;i++){
      const x=i*55+hash(i*41)*18,r=2+hash(i*61)*6,y=h-1;
      polygon(c,[x-9,y,x-5,y-r,x+8,y-r*.4,x+18,y],'#050d12');
      if(organic){line(c,x,y,x-3,y-r-3,'#10282a',2);c.fillStyle='#384b41';c.fillRect(px(x-6),px(y-r-2),4,1);}
    }
    this.foreground=tile;
  }

  private buildBackplate(){
    if(!this.atlas.complete||!this.atlas.naturalWidth)return;
    const index=Math.max(0,SCENES.indexOf(this.theme as typeof SCENES[number]));
    const sw=this.atlas.naturalWidth/2,sh=this.atlas.naturalHeight/5;
    const h=this.height,w=Math.round(h*sw/sh);
    const tile=document.createElement('canvas');tile.width=w*2;tile.height=h;
    const c=tile.getContext('2d')!;c.imageSmoothingEnabled=false;
    c.drawImage(this.atlas,(index%2)*sw,Math.floor(index/2)*sh,sw,sh,0,0,w,h);
    // Mirrored continuations remove a hard atlas boundary during long traversal.
    c.save();c.translate(w*2,0);c.scale(-1,1);c.drawImage(tile,0,0,w,h,0,0,w,h);c.restore();
    this.backplate=tile;
  }

  private drawBackplate(){
    const tile=this.backplate;if(!tile)return false;
    const offset=((this.camX*this.unit*.13)%tile.width+tile.width)%tile.width;
    this.c.save();this.c.globalAlpha=.87;
    for(let x=-offset;x<this.width;x+=tile.width)this.c.drawImage(tile,px(x),0);
    this.c.restore();
    // A dark near-plane keeps original luminous art behind actor/hazard contrast.
    const fade=this.c.createLinearGradient(0,this.height*.40,0,this.height);
    fade.addColorStop(0,'#050d1000');fade.addColorStop(.65,'#050d1050');fade.addColorStop(1,'#050d109e');
    this.c.fillStyle=fade;this.c.fillRect(0,0,this.width,this.height);return true;
  }

  private drawForeground(){
    const tile=this.foreground;if(!tile)return;
    const offset=((this.camX*this.unit*1.24)%tile.width+tile.width)%tile.width;
    for(let x=-offset;x<this.width;x+=tile.width)this.c.drawImage(tile,px(x),0);
  }

  private drawFar(c:G,theme:string,x:number,floor:number,w:number,h:number,i:number,color:string){
    c.fillStyle=color;
    if(theme==='orchard'){this.tree(c,x+w*.5,floor,h*1.35,color,i);return;}
    if(theme==='abyss'){polygon(c,[x,floor,x+w*.18,floor-h*.6,x+w*.4,floor-h*1.6,x+w*.54,floor-h*.65,x+w*.8,floor-h*1.15,x+w,floor],color);return;}
    if(theme==='crypt'||theme==='throne'){
      // Cliff-cut ossuary and civic terraces. No steeples or religious facades.
      c.fillRect(px(x),px(floor-h*.8),px(w),px(h*.8));
      c.fillRect(px(x+w*.16),px(floor-h),px(w*.72),px(h*.25));
      for(let k=0;k<4;k++){c.fillStyle='#10171a';c.fillRect(px(x+w*(.13+k*.22)),px(floor-h*.7),px(w*.12),px(h*.29));}
      brokenOrbit(c,x+w*.5,floor-h*.92,Math.max(3,w*.085),'#67716c');
    }else if(theme==='foundry'||theme==='prison'){
      c.fillRect(px(x),px(floor-h*.65),px(w),px(h*.65));
      for(let k=0;k<3;k++)c.fillRect(px(x+w*(.12+k*.28)),px(floor-h*(.9+k*.11)),px(w*.12),px(h*.6));
      for(let k=0;k<3;k++){c.fillStyle='#69726c';c.fillRect(px(x+w*(.15+k*.28)),px(floor-h*.82),1,px(h*.68));}
    }else if(theme==='belfry'){
      c.fillRect(px(x+w*.29),px(floor-h*1.2),px(w*.43),px(h*1.2));
      for(let k=0;k<5;k++){c.fillStyle=color;c.fillRect(px(x+w*.18),px(floor-h*(.2+k*.21)),px(w*.68),3);}
      ring(c,x+w*.5,floor-h*.91,w*.13,'#475657',2);
    }else if(theme==='choir'){
      // A resonator field: enormous round drums, separated by masonry ducts.
      c.fillRect(px(x),px(floor-h*.5),px(w),px(h*.5));
      ring(c,x+w*.45,floor-h*.58,w*.31,color,Math.max(5,w*.15));
      ring(c,x+w*.45,floor-h*.58,w*.20,'#0a1013',3);
    }else if(theme==='flood'){
      c.fillRect(px(x),px(floor-h*.67),px(w),px(h*.67));
      for(let k=0;k<3;k++)arch(c,x+w*(.17+k*.34),floor-h*.15,w*.18,h*.42,'#091518');
      c.fillStyle='#718581';c.fillRect(px(x),px(floor-h*.7),px(w),2);
    }else{
      c.fillRect(px(x),px(floor-h*.83),px(w),px(h*.83));
      c.fillRect(px(x+w*.10),px(floor-h*1.08),px(w*.78),px(h*.3));
    }
    architectureDetail(c,x,floor,w,h,theme,0);
  }

  private drawMiddle(c:G,theme:string,x:number,floor:number,w:number,h:number,i:number,color:string){
    if(theme==='orchard'){this.tree(c,x+w*.5,floor,h*1.5,color,i+32);architectureDetail(c,x,floor,w,h,theme,1);return;}
    if(theme==='abyss'){polygon(c,[x,floor,x+w*.2,floor-h*.6,x+w*.38,floor-h*1.24,x+w*.5,floor-h*.98,x+w*.76,floor-h*.52,x+w,floor],color);for(let k=0;k<7;k++)line(c,x+k*w*.13,floor-h*.11,x+k*w*.13+4,floor-h*(.45+k%3*.16),'#486168');return;}
    c.fillStyle=color;c.fillRect(px(x),px(floor-h*.82),px(w),px(h*.82));
    c.fillStyle='#152127';c.fillRect(px(x+w*.08),px(floor-h*.72),px(w*.19),px(h*.62));
    c.fillRect(px(x+w*.72),px(floor-h*.72),px(w*.19),px(h*.62));
    c.fillStyle=color;c.fillRect(px(x+w*.04),px(floor-h*.89),px(w*.93),4);
    if(theme==='foundry'){
      ring(c,x+w*.5,floor-h*.53,w*.23,'#0a1112',5);ring(c,x+w*.5,floor-h*.53,w*.18,'#7a654e',2);
      for(let k=0;k<12;k++){const a=k*Math.PI/6;line(c,x+w*.5+Math.cos(a)*w*.22,floor-h*.53+Math.sin(a)*w*.22,x+w*.5+Math.cos(a)*w*.29,floor-h*.53+Math.sin(a)*w*.29,'#9b7752',2);}
      c.fillStyle='#bc6b39';c.fillRect(px(x+w*.38),px(floor-h*.16),px(w*.26),2);
    }else if(theme==='prison'){
      for(let k=0;k<6;k++){c.fillStyle='#071014';c.fillRect(px(x+w*(.12+k*.14)),px(floor-h*.69),px(w*.09),px(h*.52));line(c,x+w*(.16+k*.14),floor-h*.66,x+w*(.16+k*.14),floor-h*.2,'#728683');}
    }else if(theme==='choir'){
      ring(c,x+w*.5,floor-h*.62,w*.28,'#080e13',7);brokenOrbit(c,x+w*.5,floor-h*.62,w*.19,'#877777');
      for(let k=0;k<3;k++){c.fillStyle='#4c464e';c.fillRect(px(x+w*(.32+k*.16)),px(floor-h*.34),3,px(h*.34));}
    }else if(theme==='belfry'){
      c.fillStyle=color;c.fillRect(px(x+w*.31),px(floor-h*1.23),px(w*.38),px(h*.46));
      ring(c,x+w*.5,floor-h*.98,w*.17,'#0a1015',4);brokenOrbit(c,x+w*.5,floor-h*.98,w*.10,'#888d81');
    }else if(theme==='flood'){
      arch(c,x+w*.5,floor-h*.03,w*.50,h*.76,'#071419');ring(c,x+w*.5,floor-h*.60,w*.13,'#5c787a',3);
    }else if(theme==='archives'){
      c.fillStyle='#171c1a';c.fillRect(px(x+w*.28),px(floor-h*.68),px(w*.42),px(h*.56));
      for(let k=0;k<5;k++)line(c,x+w*.27,floor-h*(.12+k*.13),x+w*.74,floor-h*(.12+k*.13),'#777e66',2);
    }else{
      arch(c,x+w*.5,floor-h*.02,w*.37,h*.66,'#091316');
      if(i%3===0)paintMoth(c,x+w*.5,floor-h*.77,Math.max(5,w*.14),'#797d72');
      for(let k=0;k<3;k++){c.fillStyle='#778477';c.fillRect(px(x+w*.04),px(floor-h*(.2+k*.24)),2,2);}
    }
    architectureDetail(c,x,floor,w,h,theme,1);
  }

  private drawNear(c: G, theme: string, x: number, floor: number, w: number, h: number, i: number, color: string) {
    c.fillStyle = color;
    if (theme === 'orchard' || theme === 'abyss') {
      this.tree(c, x + w * .48, floor + 12, h * .78, color, i + 73);
      if (theme === 'abyss') polygon(c, [x + w * .5, floor, x + w * .86, floor - h * .45, x + w * .93, floor - h * .5, x + w * .65, floor + 10], color);
      return;
    }
    c.fillRect(px(x), px(floor - h * .25), px(w), px(h * .25 + 10));
    for (let n = 0; n < 4; n++) {
      const cx = x + (n + .5) * w / 4;
      c.fillRect(px(cx - 3), px(floor - h * .47), 6, px(h * .33));
      if (theme === 'prison') for (let k = -1; k <= 1; k++) line(c, cx + k * 5, floor - h * .35, cx + k * 5, floor - h * .18, '#050909', 2);
      if (theme === 'flood') c.fillRect(px(cx - 5), px(floor - h * .18), 12, 3);
    }
    line(c, x, floor - h * .23, x + w, floor - h * .23, '#59605e', 2);
    if (theme === 'foundry') for (let n = 0; n < 4; n++) line(c, x + n * w / 4, floor - h * .8, x + n * w / 4 + 7, floor - h * .18, '#0b0d0c', 2);
    if (theme === 'belfry') brokenOrbit(c, x + w * .5, floor - h * .45, 10, '#566868');
    if (theme === 'crypt' || theme === 'choir' || theme === 'throne') {
      for (let n = 0; n < 3; n++) arch(c, x + (n + .5) * w / 3, floor - h * .2, w * .16, h * .25, '#080b0c');
      if (i % 4 === 0) paintMoth(c, x + w * .75, floor - h * .38, 10, '#394441');
    }
  }

  private tree(c:G,x:number,foot:number,h:number,color:string,seed:number){
    const trunk=Math.max(4,h*.065);
    polygon(c,[x-trunk*.65,foot,x-trunk*.48,foot-h*.33,x-trunk*.2,foot-h*.69,x+trunk*.4,foot-h*.91,x+trunk*.72,foot-h*.51,x+trunk*.5,foot],color);
    line(c,x+trunk*.23,foot-h*.08,x+trunk*.30,foot-h*.72,'#647466',1);
    for(let k=0;k<9;k++){
      const y=foot-h*(.12+k*.078);c.fillStyle='#111d1d';c.fillRect(px(x-trunk*.35+hash(seed+k)*trunk*.4),px(y),Math.max(2,px(trunk*.5)),1);
    }
    for(let i=0;i<7;i++){
      const y=foot-h*(.28+i*.083),dir=i%2?1:-1;
      const tx=x+dir*h*(.19+hash(seed*51+i)*.17),ty=y-h*(.10+hash(seed*17+i)*.18);
      polygon(c,[x,y-trunk*.18,tx,ty,tx+dir*h*.04,ty-h*.06,tx-dir*3,ty+5,x,y+trunk*.32],color);
      line(c,x+dir*trunk*.6,y,tx-dir*3,ty+2,'#4a6256',1);
      line(c,tx,ty,tx+dir*h*.075,ty-h*.08,color,2);
      for(let k=0;k<4;k++){
        const bx=tx-dir*k*7,by=ty+k*3;c.fillStyle=k%2?color:'#243e36';
        c.fillRect(px(bx),px(by),2,4);c.fillRect(px(bx-dir*3),px(by+2),3,2);
      }
      if(i%2===0){
        line(c,tx-dir*8,ty+5,tx-dir*8,ty+h*.17,'#31463b');
        c.fillStyle='#51614c';c.fillRect(px(tx-dir*8-2),px(ty+h*.17),4,5);c.fillStyle='#a2a48a';c.fillRect(px(tx-dir*8-1),px(ty+h*.17),2,1);
      }
    }
    for(let k=0;k<4;k++)line(c,x,foot-h*.08,x+(k-1.5)*trunk*1.9,foot+3,color,2);
  }

  private drawLandmark(x:number,y:number,h:number,t:number){
    const c=this.c,s=h*.20,edge='#6b716b';c.save();
    // Each horizon bears the scar of its own chapter, rather than a repeated moon.
    if(this.theme==='foundry'){
      c.fillStyle='#0e0d0c';c.fillRect(x-s,y-s,s*2,s*2);
      ring(c,x,y,s*.67,'#4f3525',6);ring(c,x,y,s*.52,'#bd6539',2);
      for(let i=0;i<12;i++){const a=i*Math.PI/6;line(c,x+Math.cos(a)*s*.7,y+Math.sin(a)*s*.7,x+Math.cos(a)*s*.9,y+Math.sin(a)*s*.9,'#5c4a3b',3);}
      line(c,x-s*.3,y+s*.4,x-s*.3,y+s*2,'#5c4631',3);line(c,x+s*.3,y+s*.4,x+s*.3,y+s*2,'#5c4631',3);
      this.glow(x,y,s*.8,'#e07739',.13);
    }else if(this.theme==='flood'){
      arch(c,x,y+s,s*1.3,s*2,'#667d7b');arch(c,x,y+s+1,s*.95,s*1.8,'#071012');
      for(let i=0;i<7;i++)line(c,x-s*(.8-i*.025),y+s+i*4,x+s*(.8-i*.025),y+s+i*4,'#354b50');
      line(c,x,y-s,x,y+s,'#677573');ring(c,x,y,s*.13,'#86b2b4');
    }else if(this.theme==='archives'){
      polygon(c,[x-s*.7,y+s,x-s*.65,y-s*.8,x,y-s*1.25,x+s*.7,y-s*.8,x+s*.6,y+s],'#444641');
      polygon(c,[x,y-s*1.25,x+s*.7,y-s*.8,x+s*.6,y+s,x,y+s],'#232822');
      for(let i=0;i<8;i++)line(c,x-s*.45,y-s*.55+i*s*.17,x-s*.08,y-s*.50+i*s*.17,'#898c76');
      for(let i=0;i<6;i++){const dx=Math.sin(i*9)*s*.85,dy=Math.cos(i*7)*s*.8;polygon(c,[x+dx,y+dy,x+dx+6,y+dy-2,x+dx+10,y+dy+9,x+dx+3,y+dy+11],'#74776b');}
    }else if(this.theme==='orchard'){
      this.tree(c,x,y+s*1.5,s*2.4,'#4e5b50',29);
      for(let i=0;i<6;i++){const dx=(i%2?1:-1)*s*(.3+i*.055),dy=y-s*.4+i*s*.19;line(c,x+dx,dy-9,x+dx,dy+5,'#596e5d');c.fillStyle='#a8b1a1';c.fillRect(px(x+dx-2),px(dy+5),4,6);}
    }else if(this.theme==='prison'){
      c.fillStyle='#0b1012';c.fillRect(x-s*.65,y-s*1.8,s*1.3,s*3.4);
      for(let i=0;i<7;i++)line(c,x-s*.5+i*s*.16,y-s*1.8,x-s*.5+i*s*.16,y+s*1.6,'#414e50',2);
      for(let i=0;i<4;i++)line(c,x-s*.65,y-s*1.35+i*s*.8,x+s*.65,y-s*1.35+i*s*.8,'#657273',2);
      c.globalAlpha=.16;polygon(c,[x,y-s*.7,x-s*2.3,y+s*1.7,x-s*.7,y+s*1.7],'#9cbcbc');c.globalAlpha=1;
    }else if(this.theme==='choir'){
      ring(c,x,y,s*.86,'#73696b',3);ring(c,x,y,s*.65,'#403c40',2);
      for(let i=0;i<10;i++){const a=i*Math.PI/5;line(c,x,y,x+Math.cos(a)*s*.86,y+Math.sin(a)*s*.86,'#5f5b62',2);}
      ring(c,x,y,s*.20,'#b0a4a1');c.fillStyle='#0a080a';polygon(c,[x+s*.24,y-s*.9,x+s*.65,y-s*.9,x+s*.39,y+s*.4],'#08090a');
      for(let i=0;i<6;i++)line(c,x-s+i*s*.38,y+s*.85,x-s+i*s*.38,y+s*1.7,'#555359',3);
    }else if(this.theme==='abyss'){
      ring(c,x,y,s*.83,'#547179',1);c.fillStyle='#020405';c.beginPath();c.arc(x,y,s*.78,0,Math.PI*2);c.fill();
      for(let i=0;i<9;i++){const a=i*Math.PI*2/9;line(c,x+Math.cos(a)*s*.95,y+Math.sin(a)*s*.95,x+Math.cos(a)*s*1.3,y+Math.sin(a)*s*1.3,'#465b60');}
      line(c,x,y+s*.85,x,y+s*1.5,'#97c3c6');
    }else if(this.theme==='throne'){
      // The pressure engine is an octagonal vessel, with an exposed red coil.
      polygon(c,[x-s*.75,y-s*.75,x-s*.35,y-s,x+s*.42,y-s,x+s*.86,y-s*.43,x+s*.75,y+s*.61,x+s*.3,y+s*.86,x-s*.42,y+s*.86,x-s*.86,y+s*.4],'#53505b');
      polygon(c,[x-s*.52,y-s*.60,x+s*.40,y-s*.63,x+s*.63,y-s*.28,x+s*.52,y+s*.42,x-s*.37,y+s*.58,x-s*.61,y+s*.23],'#151923');
      for(let k=0;k<6;k++)line(c,x-s*.33,y-s*.38+k*s*.14,x+s*.38,y-s*.36+k*s*.14,'#b46876',2);
      for(let k=0;k<8;k++){const a=k*Math.PI/4;const dx=x+Math.cos(a)*s*.80,dy=y+Math.sin(a)*s*.8;c.fillStyle='#a8a095';c.fillRect(px(dx),px(dy),2,2);}
      brokenOrbit(c,x,y,s*.98,'#7b666f');this.glow(x,y,s*.6,'#cc647c',.12);
    }c.restore();void edge;void t;
  }

  private drawSky(t: number) {
    const c = this.c, w = this.width, h = this.height, p = this.tone;
    const sky = c.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, p.sky); sky.addColorStop(.65, p.horizon); sky.addColorStop(1, p.sky);
    c.fillStyle = sky; c.fillRect(0, 0, w, h);
    const portrait = w / h < .85;
    const moonX = w * (portrait ? .60 : .5) + ((this.stage?.spawn.x ?? 2) + 4.8 - this.camX * .14) * this.unit * (portrait ? .20 : .45);
    const moonY = h * .30;
    const r = h * (this.theme === 'abyss' ? .16 : .115);
    if(this.theme!=='crypt'&&this.theme!=='belfry'){
      this.drawLandmark(moonX,moonY,h,t);
    }else{
    c.fillStyle = '#bec2bc';
    c.beginPath(); c.arc(px(moonX), px(moonY), px(r), 0, Math.PI * 2); c.fill();
    c.fillStyle = p.sky; c.beginPath(); c.arc(px(moonX + r * .34), px(moonY - r * .18), px(r * .94), 0, Math.PI * 2); c.fill();
    }
    if (this.theme === 'flood' || this.theme === 'abyss') {
      c.globalAlpha = .13; c.fillStyle = '#a7c1c3';
      for (let i = 0; i < 20; i++) c.fillRect(px(moonX - r + hash(i * 27) * r * 2), px(moonY + r * 1.8 + i * 4), px(2 + hash(i * 19) * 17), 1);
      c.globalAlpha = 1;
    }
    if (this.theme === 'foundry') {
      for (let i = 0; i < 4; i++) {
        const x = w * (.19 + i * .22) - (this.camX * .05) % w;
        const smoke = c.createRadialGradient(x, h * .45, 2, x, h * .45, h * .3);
        smoke.addColorStop(0, '#72645420'); smoke.addColorStop(1, '#72645400');
        c.fillStyle = smoke; c.fillRect(x - h * .3, h * .15, h * .6, h * .6);
      }
    }
    // Fixed seeded stars and ash avoid frame-to-frame flicker.
    c.fillStyle = '#aebbb8';
    for (let i = 0; i < 70; i++) {
      const x = px(hash(i * 41 + 7) * w), y = px(hash(i * 29 + 5) * h * .64);
      c.globalAlpha = .12 + hash(i * 31) * .25; c.fillRect(x, y, 1, 1);
    }
    c.globalAlpha = 1;
    if (this.quality === 'high' && !this.reduced) this.drawSkyShafts(t);
  }

  private drawSkyShafts(t: number) {
    const c = this.c, h = this.height, w = this.width;
    c.save(); c.globalCompositeOperation = 'screen';
    for (let i = 0; i < 3; i++) {
      const x = w * (.17 + i * .35) + Math.sin(t * .08 + i) * 8;
      polygon(c, [x - 12, h * .22, x + 5, h * .22, x + 75, h, x - 68, h], 'rgba(185,197,192,.018)');
    }
    c.restore();
  }

  private drawLayers(depth: number) {
    const layer = this.layers[depth]; if (!layer) return;
    const c = this.c, tile = layer.canvas, offset = ((this.camX * this.unit * layer.speed) % tile.width + tile.width) % tile.width;
    c.save(); c.globalAlpha = layer.opacity*(this.backplate?(depth===0?.06:depth===1?.13:.55):1);
    for (let x = -offset - tile.width; x < this.width + tile.width; x += tile.width) c.drawImage(tile, px(x), 0);
    c.restore();
  }

  private drawFog(t: number, depth: number) {
    const c = this.c, h = this.height;
    c.save();
    for (let i = 0; i < (this.quality === 'low' ? 2 : 4); i++) {
      const y = h * (.43 + depth * .16) + i * 19 + (this.reduced ? 0 : Math.sin(t * .16 + i * 2) * 5);
      const grad = c.createLinearGradient(0, y - 13, 0, y + 17);
      grad.addColorStop(0, '#b0b8b000'); grad.addColorStop(.5, depth ? '#b0b8b00d' : '#b0b8b012'); grad.addColorStop(1, '#b0b8b000');
      c.fillStyle = grad; c.fillRect(0, px(y - 13), this.width, 31);
    }
    c.restore();
  }

  private drawPlatform(p: Stage['platforms'][number], t: number) {
    if(p.active===false)return;
    const previous=this.previousPlatforms.get(p.id);
    const c=this.c,x=this.X(this.blend(previous?.x,p.x)),y=this.Y(this.blend(previous?.y,p.y)),w=Math.max(4,px(p.w*this.unit)),h=Math.max(4,px(p.h*this.unit));
    if(x>this.width+25||x+w< -25)return;
    const key=p.id;let art=this.structures.get(key);
    if(!art){art=structure(this.stage!.theme,w,h,this.unit,p.x,p.h<1);this.structures.set(key,art);}
    c.drawImage(art,x-4,y-2);
    if(p.kind==='crumble'){
      line(c,x+w*.25,y+2,x+w*.32,y+h,'#08171d',2);line(c,x+w*.59,y+3,x+w*.55,y+h,'#08171d',2);
      c.fillStyle='#d1b49a';c.fillRect(x+5,y+1,4,1);
    }else if(p.kind==='moving'){
      brokenOrbit(c,x+8,y+h+4,3,this.tone.accent);brokenOrbit(c,x+w-9,y+h+4,3,this.tone.accent);
      this.glow(x+w*.5,y+h,25,this.tone.accent,.07);
    }else if(p.kind==='memory'){
      c.save();c.globalAlpha=.25+(p.telegraph??0)*.4;c.fillStyle='#c1b9d7';c.fillRect(x,y,w,1);c.restore();
    }else if(p.kind==='conveyor'){
      c.fillStyle='#121e23';c.fillRect(x+2,y+2,w-4,3);
      for(let i=0;i<w/15;i++){const sx=x+((i*15+(this.reduced?0:px(t*22)*(p.phase&&p.phase<0?-1:1)))%w+w)%w;c.fillStyle='#809993';c.fillRect(sx,y+2,4,1);}
    }
    this.stats.drawCalls++;
  }

  private drawHazard(h: Stage['hazards'][number], t: number) {
    const c = this.c, x = this.X(h.x), y = this.Y(h.y + h.h), w = Math.max(2, px(h.w * this.unit)), ht = Math.max(2, px(h.h * this.unit));
    if (x > this.width + 25 || x + w < -25) return;
    const kind = String(h.kind), active = h.active !== false;
    const pulse = this.reduced ? .5 : .45 + Math.sin(t * 3 + (h.phase ?? 0)) * .12;
    c.save(); c.globalAlpha = active ? 1 : .5;
    if (kind === 'spikes') {
      c.fillStyle = '#141819'; c.fillRect(x, y + ht - 3, w, 3);
      const n = Math.max(2, Math.ceil(w / 9));
      for (let i = 0; i < n; i++) {
        const sx = x + i * w / n, sw = w / n;
        polygon(c, [sx, y + ht, sx + sw * .5, y - 1, sx + sw, y + ht], i % 2 ? '#c1c6be' : '#929b95');
        line(c, sx + sw * .5, y + 2, sx + sw * .5, y + ht * .56, '#272d2a');
      }
    } else if (kind === 'arrow') {
      // The red sight line spans the actual low or high firing lane.
      const cy = y + ht * .5;
      if (h.telegraph && h.telegraph > 0) {
        c.globalAlpha = .3 + h.telegraph * .55;
        line(c, x - 38, cy, x + w + 38, cy, '#d38478', 1);
        c.globalAlpha = 1;
      }
      polygon(c, [x - 3, cy, x + 8, cy - 4, x + w, cy - 2, x + w + 4, cy, x + w, cy + 2, x + 8, cy + 4], active ? '#d7d0bc' : '#665f58');
      c.fillStyle = '#1a1b1a'; c.fillRect(x + 3, cy - 1, w - 4, 2);
      line(c, x + 8, cy - 4, x + 13, cy - 8, '#bba795');
      line(c, x + 8, cy + 4, x + 13, cy + 8, '#bba795');
    } else if (kind === 'saw' || kind === 'blade') {
      const cx = x + w / 2, cy = y + ht / 2, r = Math.max(7, Math.min(w, ht) * .5);
      c.fillStyle = '#9da6a3'; c.beginPath();
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2 + (this.reduced ? 0 : t * 2.5);
        const rr = r * (i % 2 ? .72 : 1);
        if (i === 0) c.moveTo(px(cx + Math.cos(a) * rr), px(cy + Math.sin(a) * rr));
        else c.lineTo(px(cx + Math.cos(a) * rr), px(cy + Math.sin(a) * rr));
      }
      c.closePath(); c.fill(); ring(c, cx, cy, r * .27, '#15191a', 3);
      if (kind === 'blade') {
        line(c, cx, cy - r, cx, cy - r - 22, '#68716d', 3);
        ring(c, cx, cy - r - 22, 3, '#a8ada6');
      }
    } else if (kind === 'crusher') {
      c.fillStyle = '#13191a'; c.fillRect(x + w * .38, y - 24, w * .24, 26);
      polygon(c, [x - 2, y + 3, x + w + 2, y + 3, x + w - 4, y + ht * .72, x + 4, y + ht * .72], '#737c78');
      c.fillStyle = '#aab0a7'; c.fillRect(x + 3, y + 4, w - 6, 2);
      for (let i = 0; i < 5; i++) polygon(c, [x + i * w / 5, y + ht * .7, x + (i + .5) * w / 5, y + ht, x + (i + 1) * w / 5, y + ht * .7], '#b7bcb1');
      if (h.telegraph && h.telegraph > 0) {
        c.globalAlpha = .55 * h.telegraph; c.fillStyle = '#c57961'; c.fillRect(x - 2, y + ht + 2, w + 4, 2); c.globalAlpha = 1;
      }
    } else if (kind === 'laser' || kind === 'gate') {
      const beam = this.tone.ember;
      c.fillStyle = '#121719'; c.fillRect(x - 3, y - 3, w + 6, 5); c.fillRect(x - 3, y + ht - 2, w + 6, 5);
      c.globalAlpha *= active ? .76 : pulse;
      c.fillStyle = beam;
      if (kind === 'gate') {
        for (let i = 0; i < 3; i++) c.fillRect(x + i * w / 3, y, Math.max(2, w / 5), ht);
        for (let i = 0; i < 4; i++) c.fillRect(x - 2, y + i * ht / 4, w + 4, 2);
      } else c.fillRect(x + w * .35, y, Math.max(2, w * .3), ht);
      c.globalAlpha *= .18; c.fillRect(x - 7, y, w + 14, ht);
    } else if (kind === 'darkness') {
      c.fillStyle = '#050708'; c.fillRect(x, y + ht * .45, w, ht * .55);
      for (let i = 0; i < 8; i++) {
        const sx = x + i * w / 8, rise = ht * (.25 + hash(i * 13 + h.x) * .52);
        polygon(c, [sx, y + ht * .55, sx + w / 16, y + ht * .55 - rise, sx + w / 8, y + ht * .55], '#0b1113');
      }
      c.globalAlpha = active ? .54 : .24;
      line(c, x, y + ht * .52, x + w, y + ht * .52, '#a5c0bd', 1);
    } else if (kind === 'tide') {
      c.fillStyle = '#76989b'; c.globalAlpha = active ? .62 : .25;
      c.fillRect(x, y + ht * .4, w, ht * .6);
      for (let i = 0; i < w / 11; i++) line(c, x + i * 11, y + ht * .4 + (this.reduced ? 0 : Math.sin(t * 3 + i) * 2), x + i * 11 + 7, y + ht * .4, '#b3cccc');
    } else {
      // Hunter and Warden read as upright bodies, distinct from machinery.
      const cx = x + w / 2;
      const lord = kind === 'warden';
      polygon(c, [cx - w * .52, y + ht, cx - w * .25, y + ht * .23, cx, y + ht * .13, cx + w * .23, y + ht * .22, cx + w * .53, y + ht], '#080b0c');
      polygon(c, [cx - w * .2, y + ht * .27, cx - w * .17, y + ht * .03, cx + w * .13, y + ht * .03, cx + w * .21, y + ht * .28], '#343b39');
      polygon(c, [cx - w * .2, y + ht * .07, cx - w * .28, y - ht * .10, cx - w * .05, y + ht * .05, cx + w * .16, y - ht * .10, cx + w * .22, y + ht * .07], '#a3a9a0');
      c.fillStyle = '#b9534e'; c.fillRect(cx - 3, y + ht * .17, 2, 1); c.fillRect(cx + 2, y + ht * .17, 2, 1);
      line(c, cx + w * .3, y + ht * .33, cx + w * .64, y + ht * .94, '#9da8a0', lord ? 3 : 2);
      if (lord) {
        c.fillStyle = '#5d6662'; c.fillRect(cx - w * .45, y + ht * .36, w * .16, ht * .22);
        line(c, cx - w * .52, y + ht * .27, cx - w * .66, y + ht * .78, '#b8bbb0', 3);
        this.glow(cx, y + ht * .2, 18, '#bf5c56', active ? .17 : .07);
      }
    }
    const telegraph = Number((h as unknown as { telegraph?: number }).telegraph ?? 0);
    if (telegraph > 0) {
      c.globalAlpha = .18 + telegraph * .5;
      c.fillStyle = '#e2b28f'; c.fillRect(x - 2, y - 5, Math.max(3, w * telegraph), 2);
    }
    c.restore(); this.stats.drawCalls++;
  }

  private drawPickup(item: Stage['pickups'][number], t: number) {
    if(item.collected)return;
    const c=this.c,x=this.X(item.x),y=this.Y(item.y)+(this.reduced?0:px(Math.sin(t*2+item.x)*1.5));
    if(x< -30||x>this.width+30)return;
    const relic=item.kind==='relic',record=item.secret;
    if(relic){
      // Lost names are wax-sealed vessels, distinct from loose shards.
      this.glow(x,y,25,'#d6ba85',.18);
      polygon(c,[x-7,y-11,x-3,y-15,x+3,y-15,x+7,y-11,x+6,y+8,x-6,y+8],'#0a171f');
      polygon(c,[x-5,y-9,x-2,y-13,x+2,y-13,x+5,y-9,x+4,y+6,x-4,y+6],'#64756b');
      c.fillStyle='#c6b68d';c.fillRect(x-4,y-11,8,2);c.fillRect(x-4,y+5,8,2);c.fillStyle='#1c3638';c.fillRect(x-3,y-7,6,10);
      brokenOrbit(c,x,y-2,3,'#e4d4a0');line(c,x+5,y-7,x+10,y+7,'#9a6c52');c.fillStyle='#bf8061';c.fillRect(x+8,y+6,4,5);
    }else if(record){
      this.glow(x,y,18,'#b4cfca',.09);
      polygon(c,[x-6,y-10,x+3,y-12,x+7,y-7,x+5,y+6,x-6,y+6],'#768e84');
      polygon(c,[x-4,y-8,x+2,y-9,x+5,y-6,x+3,y+4,x-4,y+4],'#202f36');
      for(let k=0;k<3;k++)line(c,x-2,y-5+k*3,x+2,y-6+k*3,'#b1c2b0');
    }else{
      this.glow(x,y,12,this.tone.accent,.12);polygon(c,[x,y-6,x+4,y-1,x,y+5,x-3,y-1],'#adcdc0');line(c,x,y-5,x,y+2,'#e1e5c7');
    }
    this.stats.drawCalls++;
  }

  private drawCheckpoint(cp:Stage['checkpoints'][number],t:number){
    const c=this.c,x=this.X(cp.x),y=this.Y(cp.y);if(x< -45||x>this.width+45)return;
    // A rest mechanism: a broken wheel, slung lamp and grounded counterweight.
    polygon(c,[x-18,y,x-14,y-5,x+15,y-5,x+19,y,x+14,y+3,x-14,y+3],'#43564f');
    line(c,x-12,y-4,x-10,y-42,'#2b4244',4);line(c,x-9,y-4,x-7,y-42,'#8aa093');
    brokenOrbit(c,x-8,y-37,11,'#73877a');brokenOrbit(c,x-8,y-37,7,'#273e43');
    line(c,x-7,y-37,x+8,y-32,'#b0a27d',2);line(c,x+8,y-32,x+8,y-18,'#797e62');
    polygon(c,[x+2,y-22,x+14,y-22,x+12,y-11,x+4,y-11],cp.active?'#a59270':'#415d59');
    c.fillStyle=cp.active?'#edcf99':'#8aa397';c.fillRect(x+6,y-20,4,7);
    line(c,x-6,y-25,x-5,y-10,'#3c5552');c.fillStyle='#162b32';c.fillRect(x-9,y-12,8,9);
    if(cp.active){this.drawFlame(x+8,y-17,t,.65);this.glow(x+5,y-13,48,'#ddb18a',.12);line(c,x-15,y-1,x+16,y-1,'#cdb990');}
    this.stats.drawCalls++;
  }

  private drawExit(state:GameState,t:number) {
    const {stage}=state,c=this.c,x=this.X(stage.exit.x),y=this.Y(stage.exit.y);
    if(x< -45||x>this.width+45)return;
    const ready=state.relicsCollected>=state.relicsRequired&&stage.arenas.every(a=>a.cleared)&&state.bossHealth<=0;
    // Two witness seals and three encounter locks belong to the actual door mechanism.
    polygon(c,[x-25,y,x-23,y-54,x-16,y-66,x,y-72,x+16,y-66,x+23,y-54,x+25,y],'#142831');
    polygon(c,[x-20,y-3,x-18,y-53,x-12,y-61,x,y-66,x+12,y-61,x+18,y-53,x+20,y-3],'#586c67');
    polygon(c,[x-14,y-4,x-14,y-51,x-8,y-57,x+8,y-57,x+14,y-51,x+14,y-4],'#07131c');
    for(const side of [-1,1]){
      const dx=x+side*(ready?17:7);
      polygon(c,[dx-6,y-5,dx-6,y-49,dx,y-55,dx+6,y-49,dx+6,y-5],'#243c43');
      line(c,dx-4,y-48,dx-4,y-8,'#81938a');
      for(let k=0;k<5;k++){line(c,dx-3,y-42+k*7,dx+4,y-42+k*7,'#10242e');c.fillStyle='#9c947a';c.fillRect(dx+2,y-41+k*7,1,1);}
      const sealed=state.relicsCollected>=(side<0?1:2);
      brokenOrbit(c,x+side*21,y-34,5,sealed?'#c6ae80':'#3b5458');
      if(sealed)this.glow(x+side*21,y-34,12,'#d0ac78',.14);
    }
    for(let k=0;k<3;k++){const xx=x+(k-1)*7,lit=stage.arenas[k]?.cleared;c.fillStyle=lit?'#b9c6aa':'#263e45';c.fillRect(xx-1,y-64,3,3);}
    line(c,x-26,y,x+26,y,'#879287',2);line(c,x-22,y+2,x+22,y+2,'#263c41',3);
    if(ready){this.glow(x,y-29,40,this.tone.accent,.22);line(c,x,y-51,x,y-8,'#b4d4c7',2);if(!this.reduced){c.fillStyle='#dce0c2';c.fillRect(x-1,y-11-px((t*.8%1)*35),2,2);}}
    this.stats.drawCalls++;
  }

  private drawPilgrim(state:GameState,t:number){
    const c=this.c,p=state.player,x=this.X(p.x),y=this.Y(p.y);if(!this.heroReady||x< -100||x>this.width+100)return;
    let frame:number=PILGRIM_POSE.idle+(this.reduced?0:Math.floor(t*.65)%2);
    if(p.deadTime>0)frame=PILGRIM_POSE.dead;
    else if(p.dashTime>0)frame=PILGRIM_POSE.roll+Math.max(0,Math.min(3,Math.floor((.22-p.dashTime)/.22*4)));
    else if(p.attackTime>0)frame=PILGRIM_POSE.strike+Math.min(2,Math.floor((.19-p.attackTime)/.19*3));
    else if(p.invulnerability>.62)frame=PILGRIM_POSE.hurt;
    else if(!p.grounded)frame=p.wall?PILGRIM_POSE.wall:p.vy>0?PILGRIM_POSE.rise:PILGRIM_POSE.fall;
    else if(p.landingTime>0)frame=PILGRIM_POSE.land;
    else if(Math.abs(p.vx)>.3)frame=PILGRIM_POSE.run+Math.floor(p.stride/2.7*16)%16;
    const cell=this.heroCell,scale=this.unit*1.28/cell.body,sw=px(cell.width*scale),sh=px(cell.height*scale),dx=-px(cell.width*.5*scale),dy=-px(cell.foot*scale);
    // Contact shadow follows the supporting plane, including air separation.
    const below=state.stage.platforms.filter(q=>q.active!==false&&p.x>=q.x&&p.x<=q.x+q.w&&q.y<=p.y+.03).sort((a,b)=>b.y-a.y)[0];
    if(below){const separation=p.y-below.y;c.save();c.globalAlpha=Math.max(.1,.55-separation*.18);c.fillStyle='#020a0e';const ww=px(this.unit*.58/(1+separation*.22));c.fillRect(x-ww/2,this.Y(below.y),ww,2);c.restore();}
    this.glow(x,y-this.unit*.6,25,this.tone.accent,.055);
    c.save();c.translate(x,y);if(p.facing<0)c.scale(-1,1);
    if(p.invulnerability>0&&(this.reduced||Math.floor(t*14)%2))c.globalAlpha=this.reduced?.8:.56;
    if(p.dashInvulnerability>0)this.glow(0,-sh*.48,22,'#8bbacf',.2);
    if(p.attackTime>0){c.save();const progress=1-p.attackTime/.19;c.globalAlpha=Math.sin(progress*Math.PI)*.65;for(let claw=0;claw<3;claw++)for(let k=0;k<12;k++){const angle=-1.5+progress*.6+k*.075,r=this.unit*(.75+claw*.1);c.fillStyle=k<4?'#ead8b0':'#8dbbb7';c.fillRect(px(Math.cos(angle)*r),px(-this.unit*.42+Math.sin(angle)*r),k<5?2:1,1);}c.restore();}
    if(p.dashTime>0&&!this.reduced){c.save();c.globalAlpha=.12;for(let k=1;k<3;k++)c.drawImage(this.sprites,frame*cell.width,0,cell.width,cell.height,dx-k*this.unit*.25,dy,sw,sh);c.restore();}
    c.drawImage(this.sprites,frame*cell.width,0,cell.width,cell.height,dx,dy,sw,sh);
    if(!this.pilgrimLight){this.pilgrimLight=document.createElement('canvas');this.pilgrimLight.width=this.sprites.width;this.pilgrimLight.height=this.sprites.height;const light=this.pilgrimLight.getContext('2d')!;light.drawImage(this.sprites,0,0);light.globalCompositeOperation='source-in';light.fillStyle='#ee9c55';light.fillRect(0,0,this.sprites.width,this.sprites.height);}
    c.save();c.globalCompositeOperation='screen';c.globalAlpha=this.lightStrength(p.x,p.y);c.drawImage(this.pilgrimLight,frame*cell.width,0,cell.width,cell.height,dx,dy,sw,sh);c.restore();c.restore();
    if(p.landingTime>.07&&!this.reduced){c.save();c.globalAlpha=p.landingTime/.12*.26;const radius=(.12-p.landingTime)*this.unit*2.7;for(let k=0;k<7;k++){c.fillStyle=this.tone.edge;c.fillRect(px(x+(k-3)*(2+radius)),y-px(Math.sin(k)*radius*.25),2,1);}c.restore();}
    this.stats.drawCalls++;
  }

  private drawTitleScene(t:number){
    // Let the approved city painting carry the title; no enlarged gameplay
    // sprite, pedestal, rings or floating fixtures behind the menu.
    const c=this.c,w=this.width,h=this.height;
    const shade=c.createLinearGradient(0,0,0,h);shade.addColorStop(0,'#00000000');shade.addColorStop(.45,'#03060830');shade.addColorStop(1,'#020508bb');
    c.fillStyle=shade;c.fillRect(0,0,w,h);void t;
  }

  private drawEnemies(state:GameState,t:number){
    type EnemyArt={id:string;x:number;y:number;w:number;h:number;kind:string;health:number;maxHealth:number;phase:string;telegraph:number;facing:number;attackX:number;attackY:number;attackW:number;attackH:number};
    const enemies=(state.stage as unknown as {enemies?:EnemyArt[]}).enemies??[];
    const c=this.c;
    for(const e of enemies){
      if(e.health<=0||e.phase==='dead')continue;
      const previous=this.previousEnemies.get(e.id);
      const x=this.X(this.blend(previous?.x,e.x)+e.w*.5),y=this.Y(this.blend(previous?.y,e.y));if(x< -90||x>this.width+90)continue;
      const kind=ENEMY_KINDS[e.kind as keyof typeof ENEMY_KINDS]??0;
      const pose=e.phase==='windup'?1:e.phase==='attack'?2:e.phase==='stagger'?3:0;
      const cell=this.enemyCell,scale=e.h*this.unit/cell.body,sizeY=px(cell.height*scale),sizeX=px(cell.width*scale),dy=-px(cell.foot*scale);
      if(e.phase==='windup'||e.phase==='attack'){
        const ax=this.X(e.attackX),ay=this.Y(e.attackY+e.attackH),aw=Math.max(2,px(e.attackW*this.unit)),ah=Math.max(2,px(e.attackH*this.unit));
        c.save();c.fillStyle=e.phase==='attack'?'#d4746550':'#e5b77b25';c.fillRect(ax,ay,aw,ah);
        c.fillStyle=e.phase==='attack'?'#efa18d':'#e4c291';
        c.fillRect(ax,ay+ah-1,aw,1);c.fillRect(ax,ay,2,3);c.fillRect(ax+aw-2,ay,2,3);
        if(e.phase==='windup')for(let k=0;k<aw;k+=7)c.fillRect(ax+k,ay+ah-3,3,1);
        c.restore();
      }
      c.fillStyle='#030a0e';c.fillRect(x-sizeX*.3,y,sizeX*.6,2);
      c.save();c.translate(x,y);if(e.facing<0)c.scale(-1,1);
      const tilt=e.phase==='attack'?2:0;
      if(!this.enemyRim){this.enemyRim=document.createElement('canvas');this.enemyRim.width=this.enemySprites.width;this.enemyRim.height=this.enemySprites.height;const rim=this.enemyRim.getContext('2d')!;rim.drawImage(this.enemySprites,0,0);rim.globalCompositeOperation='source-in';rim.fillStyle='#d5b8a4';rim.fillRect(0,0,this.enemyRim.width,this.enemyRim.height);}
      c.save();c.globalAlpha=e.phase==='windup'?.75:.46;
      for(const [rx,ry] of [[-1,0],[1,0],[0,-1]])c.drawImage(this.enemyRim,kind*cell.width,pose*cell.height,cell.width,cell.height,-px(sizeX/2)+tilt+rx,dy+ry,sizeX,sizeY);
      c.restore();
      c.drawImage(this.enemySprites,kind*cell.width,pose*cell.height,cell.width,cell.height,-px(sizeX/2)+tilt,dy,sizeX,sizeY);
      c.save();c.globalCompositeOperation='screen';c.globalAlpha=this.lightStrength(e.x,e.y);c.drawImage(this.enemyRim,kind*cell.width,pose*cell.height,cell.width,cell.height,-px(sizeX/2)+tilt,dy,sizeX,sizeY);c.restore();
      c.restore();
      if(e.phase==='stagger'){this.glow(x,y-sizeY*.5,20,'#d9c7a5',.16);for(let k=0;k<7;k++){const a=k*Math.PI*2/7; c.fillStyle=k%2?'#d7bc91':'#7cc2c4';c.fillRect(px(x+Math.cos(a)*14),px(y-sizeY*.5+Math.sin(a)*12),2,1);}}
      if(e.health<e.maxHealth||e.phase==='windup'){
        const bw=Math.min(36,sizeX),yy=y-sizeY-2;
        c.fillStyle='#071018';c.fillRect(px(x-bw*.5)-1,yy-1,bw+2,4);
        c.fillStyle='#c09d82';c.fillRect(px(x-bw*.5),yy,px(bw*e.health/e.maxHealth),2);
      }
      this.stats.drawCalls++;
    }
    const arena=(state as unknown as {arenaActive?:string|null}).arenaActive;
    if(arena){
      const a=(state.stage as unknown as {arenas?:Array<{id:string;x:number;w:number}>}).arenas?.find(a=>a.id===arena);
      if(a)for(const wx of [a.x,a.x+a.w]){
        const x=this.X(wx);if(x<0||x>this.width)continue;
        const y=this.Y(0);c.save();c.globalAlpha=.35;for(let k=0;k<7;k++)c.fillRect(x+(k%2),y-k*7,1,4);c.restore();
        brokenOrbit(c,x,y-51,4,'#a9b8a4');
      }
    }
    void t;
  }

  private glow(x: number, y: number, r: number, color: string, alpha: number) {
    const c = this.c;
    c.save(); c.globalCompositeOperation = 'screen'; c.globalAlpha = alpha;
    const radius=Math.max(1,Math.ceil(r)),key=`${radius}:${color}`;
    let tile=this.glowTextures.get(key);
    if(!tile){tile=document.createElement('canvas');tile.width=tile.height=radius*2;const context=tile.getContext('2d')!,g=context.createRadialGradient(radius,radius,0,radius,radius,radius);g.addColorStop(0,color);g.addColorStop(.24,color);g.addColorStop(1,'#00000000');context.fillStyle=g;context.fillRect(0,0,tile.width,tile.height);if(this.glowTextures.size>=64)this.glowTextures.delete(this.glowTextures.keys().next().value!);this.glowTextures.set(key,tile);}
    c.drawImage(tile,px(x-radius),px(y-radius));c.restore();
  }

  private drawFlame(x: number, y: number, t: number, power = 1) {
    const c = this.c, flicker = this.reduced ? 0 : Math.sin(t * 11 + x) * 2;
    this.glow(x, y - 3, 26 * power, this.tone.ember, .18 * power);
    polygon(c, [x - 3, y, x - 2 + flicker, y - 9 * power, x + 1, y - 13 * power, x + 4, y], this.tone.ember);
    polygon(c, [x - 1, y - 1, x, y - 8 * power, x + 2, y - 1], '#e9e0b8');
  }

  private drawWorldTorches(t: number) {
    const c = this.c;
    const first = Math.floor((this.camX - this.width / this.unit) / 9) * 9;
    for (let wx = first; wx < this.camX + this.width / this.unit + 10; wx += 9) {
      const floor=this.lampFloor(wx+3);if(!floor)continue;
      const x = this.X(wx + 3), y = this.Y(floor.y);
      if (x < -20 || x > this.width + 20) continue;
      c.fillStyle = '#0b171c'; c.fillRect(x - 2, y - 27, 4, 22);
      polygon(c,[x-5,y-31,x-3,y-36,x+3,y-36,x+5,y-31,x+3,y-28,x-3,y-28],'#4e625c');
      this.drawFlame(x, y - 37, t, .72);
      // The warm pool catches a small patch of floor; pillars and masonry stay dark.
      const pool = c.createRadialGradient(x, y - 25, 2, x, y - 25, 65);
      pool.addColorStop(0, '#df9d6130'); pool.addColorStop(.6, '#b7783510'); pool.addColorStop(1, '#00000000');
      c.fillStyle = pool; c.fillRect(x - 65, y - 90, 130, 130);
    }
  }

  private drawWeather(t: number) {
    const c = this.c, count = this.quality === 'low' ? 38 : this.quality === 'high' ? 115 : 75;
    const rain = this.theme === 'flood' || this.theme === 'prison', ash = this.theme === 'foundry' || this.theme === 'throne';
    c.save(); c.globalAlpha = rain ? .30 : .22; c.fillStyle = ash ? '#b2a393' : '#c4d0ca';
    for (let i = 0; i < count; i++) {
      const seedX = hash(i * 61 + 3) * this.width, seedY = hash(i * 17 + 8) * this.height;
      const x = ((seedX + (this.reduced ? 0 : t * (rain ? -17 : 3 + hash(i) * 5))) % this.width + this.width) % this.width;
      const y = ((seedY + (this.reduced ? 0 : t * (rain ? 85 : ash ? -10 : 7))) % this.height + this.height) % this.height;
      if (rain) c.fillRect(px(x), px(y), 1, 4 + i % 4);
      else c.fillRect(px(x), px(y), i % 13 ? 1 : 2, 1);
    }
    c.restore();
  }

  private buildFrameOverlay(){
    const tile=document.createElement('canvas');tile.width=this.width;tile.height=this.height;
    const c=tile.getContext('2d')!,w=this.width,h=this.height;
    const vignette=c.createRadialGradient(w*.5,h*.45,h*.10,w*.5,h*.5,Math.max(w,h)*.68);
    vignette.addColorStop(0, '#00000000'); vignette.addColorStop(.65, '#00000020'); vignette.addColorStop(1, '#000000c0');
    c.fillStyle = vignette; c.fillRect(0, 0, w, h);
    if (this.noise) { c.save(); c.globalAlpha = this.quality === 'high' ? .10 : .06; c.fillStyle = this.noise; c.fillRect(0, 0, w, h); c.restore(); }
    // Fine scan lines belong to the low-resolution image, not to CSS.
    c.save(); c.globalAlpha = .045; c.fillStyle = '#000';
    for (let y = 1; y < h; y += 3) c.fillRect(0, y, w, 1);
    c.restore();
    this.frameOverlay=tile;
  }

  private finishFrame(t: number) {
    if(this.frameOverlay)this.c.drawImage(this.frameOverlay,0,0);
    void t;
  }

  render(state: GameState, alpha: number, elapsed: number, dt: number) {
    if (!this.stage || this.stage.id !== state.stage.id || this.stage !== state.stage) this.setStage(state.stage);
    if (state.stageIndex !== this.stageIndex) {
      this.stageIndex = state.stageIndex;
      const current = String(state.stage.theme);
      if (!(current in TONES)) { this.theme = SCENES[this.stageIndex % 10]; this.tone = TONES[this.theme]; this.buildLayers(); }
    }
    const menu = state.mode === 'menu'||this.titlePresentation;
    this.renderAlpha=state.mode==='playing'?clamp(alpha,0,1):1;
    const previous=this.previousPlayer,p=state.player;
    const view={...state,player:{...p,x:this.blend(previous?.x,p.x),y:this.blend(previous?.y,p.y),stride:this.blend(previous?.stride,p.stride)}};
    const look = menu ? (this.width / this.height < .85 ? -1.0 : -2.3) : clamp(p.vx/5.2,-1,1)*1.05;
    const shot=this.cinematic;
    const approach=shot?clamp((shot.beat+Math.min(1,shot.time/4.5))/3,0,1):1;
    const nextX = shot?state.stage.spawn.x-this.width/this.unit*.16-.6*(1-approach):view.player.x + look;
    const ground=state.stage.platforms.find(p=>p.h>1&&state.player.x>=p.x&&state.player.x<p.x+p.w)?.y??0;
    const nextY = shot?state.stage.spawn.y+(this.width/this.height<.85?.85:1.45)+.6*(1-approach):ground+2.55+clamp(view.player.y-ground-2.2,0,4)*.45;
    const easing = menu || this.reduced ? 1 : 1 - Math.exp(-Math.max(0, dt) * 8);
    this.camX += (nextX - this.camX) * easing;
    this.camY += (nextY - this.camY) * easing;
    this.stats.drawCalls = 0; this.stats.triangles = 0;
    this.fpsT += Math.max(0, dt); this.fpsN++;
    if (this.fpsT > .55) { this.stats.fps = Math.round(this.fpsN / this.fpsT); this.fpsT = 0; this.fpsN = 0; }
    this.drawSky(elapsed);
    this.drawBackplate();
    this.drawLayers(0); this.drawFog(elapsed, 0);
    this.drawLayers(1);
    this.drawFog(elapsed, 1); this.drawLayers(2);
    this.drawWeather(elapsed);
    if(menu){this.drawTitleScene(elapsed);this.drawForeground();this.finishFrame(elapsed);return;}
    const margin = this.width / this.unit + 3;
    for (const platform of state.stage.platforms) if (platform.x + platform.w > this.camX - margin && platform.x < this.camX + margin) this.drawPlatform(platform, elapsed);
    this.drawWorldTorches(elapsed);
    for (const hazard of state.stage.hazards) this.drawHazard(hazard, elapsed);
    for (const item of state.stage.pickups) this.drawPickup(item, elapsed);
    for (const cp of state.stage.checkpoints) this.drawCheckpoint(cp, elapsed);
    this.drawExit(state, elapsed);
    this.drawCastShadows(view);
    this.drawEnemies(state, elapsed);
    this.drawPilgrim(view, elapsed);
    this.drawForeground();
    this.finishFrame(elapsed);
  }

  dispose() {
    this.disposed=true;
    if (this.media && this.onMotion) this.media.removeEventListener?.('change', this.onMotion);
    this.layers = [];this.layerKey='';this.structures.clear();this.glowTextures.clear();this.frameOverlay=undefined;this.backplate=undefined;this.atlas.onload=null;this.heroImage.onload=null;this.heroImage.onerror=null;this.enemyImage.onload=null;
  }
}
