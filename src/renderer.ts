import {createPilgrimSprites} from './pixel-art';
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
  c.fillStyle = color;
  c.fillRect(px(x - w / 2), px(foot - h * .55), px(w), px(h * .55));
  polygon(c, [x - w / 2, foot - h * .55, x, foot - h, x + w / 2, foot - h * .55], color);
}
function cross(c: G, x: number, foot: number, s: number, color: string) {
  c.fillStyle = color; c.fillRect(px(x - s * .1), px(foot - s), px(s * .2), px(s));
  c.fillRect(px(x - s * .36), px(foot - s * .72), px(s * .72), px(s * .13));
}
function ring(c: G, x: number, y: number, r: number, color: string, width = 2) {
  c.strokeStyle = color; c.lineWidth = width; c.beginPath(); c.arc(px(x), px(y), Math.max(1, px(r)), 0, Math.PI * 2); c.stroke();
}

/** An original pixel-painted, fixed-side-view renderer. Gameplay remains in x/y world coordinates. */
export class GameRenderer {
  readonly stats = { fps: 0, drawCalls: 0, triangles: 0, pixelScale:1, width:0, height:0 };
  private readonly canvas: HTMLCanvasElement;
  private readonly sprites=createPilgrimSprites();
  private pixelScale=1;
  private readonly screen: G;
  private readonly scene: HTMLCanvasElement;
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
  private media?: MediaQueryList;
  private onMotion?: (e: MediaQueryListEvent) => void;
  private fpsT = 0;
  private fpsN = 0;

  constructor(canvas: HTMLCanvasElement, quality: Quality) {
    this.canvas = canvas;
    this.quality = quality;
    const screen = canvas.getContext('2d', { alpha: false });
    if (!screen) throw new Error('Canvas 2D is unavailable');
    this.screen = screen;
    this.scene = document.createElement('canvas');
    const context = this.scene.getContext('2d', { alpha: false });
    if (!context) throw new Error('Offscreen Canvas 2D is unavailable');
    this.c = context;
    this.noise = this.makeNoise();
    if (typeof matchMedia === 'function') {
      this.media = matchMedia('(prefers-reduced-motion: reduce)');
      this.reduced = this.media.matches;
      this.onMotion = e => { this.reduced = e.matches; };
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
    // CSS owns the play viewport, including the separate mobile control strip.
    this.canvas.width = cw; this.canvas.height = ch;
    this.screen.imageSmoothingEnabled = false;
    const logicalHeight = this.quality === 'low' ? 144 : 180;
    this.pixelScale=Math.max(2,Math.round(ch/logicalHeight));
    this.height=Math.max(1,Math.floor(ch/this.pixelScale));
    this.width=Math.max(1,Math.floor(cw/this.pixelScale));
    this.scene.width = this.width; this.scene.height = this.height;
    this.c.imageSmoothingEnabled = false;
    this.unit = this.height / (cw / ch < .85 ? 9.5 : 8.0);
    this.stats.pixelScale=this.pixelScale;this.stats.width=this.width;this.stats.height=this.height;
    this.buildLayers();
  }

  setQuality(quality: Quality) { this.quality = quality; this.resize(); }

  private X(x: number) { return px(this.width * .5 + (x - this.camX) * this.unit); }
  private Y(y: number) { return px(this.height * .5 - (y - this.camY) * this.unit); }

  private buildLayers() {
    if (!this.stage) return;
    const layers: Layer[] = [];
    const tileW = Math.max(512, px(this.unit * 25));
    const specs = [{ speed: .10, opacity: .8 }, { speed: .30, opacity: .93 }, { speed: .53, opacity: .85 }];
    for (let depth = 0; depth < 3; depth++) {
      const tile = document.createElement('canvas'); tile.width = tileW; tile.height = this.height;
      const c = tile.getContext('2d'); if (!c) continue;
      c.imageSmoothingEnabled = false;
      this.paintBackdropTile(c, tileW, this.height, depth);
      layers.push({ canvas: tile, ...specs[depth] });
    }
    this.layers = layers;
  }

  private paintBackdropTile(c: G, w: number, h: number, depth: number) {
    const t = this.tone, theme = this.theme;
    const base = depth === 0 ? t.far : depth === 1 ? t.mid : t.near;
    const floor = h * (depth === 0 ? .82 : depth === 1 ? .90 : 1.02);
    const scale = depth === 0 ? .62 : depth === 1 ? .92 : 1.1;
    const cell = w / 7;
    for (let i = -1; i < 8; i++) {
      const x = i * cell + hash(i * 91 + depth * 31) * cell * .18;
      const tall = (60 + hash(i * 17 + depth * 43) * 110) * scale * h/400;
      const width = cell * (.76 + hash(i * 14 + depth) * .48);
      if (depth === 0) this.drawFar(c, theme, x, floor, width, tall, i, base);
      else if (depth === 1) this.drawMiddle(c, theme, x, floor, width, tall, i, base);
      else this.drawNear(c, theme, x, floor, width, tall, i, base);
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

  private drawFar(c: G, theme: string, x: number, floor: number, w: number, h: number, i: number, color: string) {
    c.fillStyle = color;
    switch (theme) {
      case 'crypt': case 'choir': case 'throne': case 'archives':
        arch(c, x + w * .5, floor, w * .77, h, color);
        c.fillRect(px(x + w * .45), px(floor - h * 1.24), px(w * .1), px(h * .30));
        polygon(c, [x + w * .4, floor - h * 1.2, x + w * .5, floor - h * 1.48, x + w * .6, floor - h * 1.2], color);
        if (i % 2 === 0) { arch(c, x + w * .1, floor, w * .22, h * .72, color); arch(c, x + w * .9, floor, w * .22, h * .72, color); }
        break;
      case 'foundry': case 'prison':
        c.fillRect(px(x), px(floor - h * .64), px(w), px(h * .64));
        c.fillRect(px(x + w * .16), px(floor - h * 1.32), px(w * .21), px(h * .71));
        c.fillRect(px(x + w * .66), px(floor - h * 1.07), px(w * .13), px(h * .47));
        break;
      case 'flood': case 'belfry':
        arch(c, x + w * .5, floor, w * .48, h * 1.34, color);
        c.fillRect(px(x - w * .07), px(floor - h * .42), px(w * 1.14), px(h * .42));
        break;
      case 'orchard':
        this.tree(c, x + w * .5, floor, h * 1.25, color, i); break;
      case 'abyss':
        polygon(c, [x, floor - h * .2, x + w * .18, floor - h * 1.25, x + w * .6, floor - h * .68, x + w * .9, floor - h * 1.6, x + w, floor], color); break;
      default: arch(c, x + w * .5, floor, w * .7, h, color);
    }
    if (theme === 'crypt' || theme === 'archives' || theme === 'choir' || theme === 'throne') {
      // Recessed lancets and exposed ribs break the flat roof silhouette.
      for (let n = 0; n < 3; n++) {
        const wx = x + w * (.25 + n * .25), wy = floor - h * (.39 + (n % 2) * .10);
        arch(c, wx, wy + h * .12, w * .09, h * .23, '#080b0c');
        line(c, wx, wy - h * .06, wx, wy + h * .10, '#545856', 1);
      }
      line(c, x + w * .16, floor - h * .25, x + w * .30, floor - h * .64, '#454c49');
      line(c, x + w * .84, floor - h * .25, x + w * .70, floor - h * .64, '#454c49');
      if (theme === 'crypt') { cross(c, x + w * .5, floor - h * 1.30, 12, '#656b64'); }
      if (theme === 'archives') for (let n = 0; n < 6; n++) line(c, x + w * .2, floor - h * (.16 + n * .075), x + w * .8, floor - h * (.16 + n * .075), '#555750');
      if (theme === 'choir') ring(c, x + w * .5, floor - h * .82, w * .09, '#656268');
      if (theme === 'throne') {
        polygon(c, [x + w * .16, floor - h * .73, x + w * .28, floor - h * 1.12, x + w * .35, floor - h * .73], '#242024');
        polygon(c, [x + w * .65, floor - h * .73, x + w * .72, floor - h * 1.12, x + w * .84, floor - h * .73], '#242024');
      }
    } else if (theme === 'foundry' || theme === 'prison') {
      for (let n = 0; n < 3; n++) {
        const wx = x + w * (.2 + n * .28);
        c.fillStyle = '#0b0e0e'; c.fillRect(px(wx), px(floor - h * .52), px(w * .09), px(h * .20));
        line(c, wx + w * .045, floor - h * .52, wx + w * .045, floor - h * .32, '#59605b');
      }
      if (theme === 'foundry') {
        line(c, x - 2, floor - h * .60, x + w + 2, floor - h * .60, '#5e5b51', 2);
        c.fillStyle = '#b16e43'; c.fillRect(px(x + w * .42), px(floor - h * .14), px(w * .15), 2);
      } else for (let n = 0; n < 5; n++) line(c, x + n * w / 4, floor - h * .75, x + n * w / 4, floor - h * .12, '#0d1112', 2);
    } else if (theme === 'flood' || theme === 'belfry') {
      ring(c, x + w * .5, floor - h * .77, w * .10, '#101619', 2);
      line(c, x + w * .20, floor - h * .21, x + w * .85, floor - h * .22, '#6c7776');
      if (theme === 'flood') for (let n = 0; n < 3; n++) line(c, x + w * .18, floor - h * (.08 + n * .09), x + w * .86, floor - h * (.08 + n * .09), '#4e6769');
      else { c.fillStyle = '#908778'; c.fillRect(px(x + w * .47), px(floor - h * .77), px(w * .06), px(h * .12)); }
    }
  }

  private drawMiddle(c: G, theme: string, x: number, floor: number, w: number, h: number, i: number, color: string) {
    c.fillStyle = color;
    const edge = this.tone.edge;
    if (theme === 'orchard') { this.tree(c, x + w * .5, floor, h * 1.35, color, i + 32); return; }
    if (theme === 'abyss') {
      polygon(c, [x, floor, x + w * .19, floor - h * .55, x + w * .41, floor - h * 1.2, x + w * .68, floor - h * .58, x + w, floor], color);
      for (let n = 0; n < 5; n++) line(c, x + n * w * .19, floor - h * .25, x + n * w * .19 + 10, floor - h * .65, '#657579', 1);
      return;
    }
    if (theme === 'foundry') {
      c.fillRect(px(x), px(floor - h * .7), px(w), px(h * .7));
      c.fillRect(px(x + w * .13), px(floor - h * 1.16), px(w * .12), px(h * .55));
      c.fillRect(px(x + w * .7), px(floor - h * 1.39), px(w * .15), px(h * .72));
      ring(c, x + w * .49, floor - h * .39, w * .21, '#111514', 5);
      for (let n = 0; n < 8; n++) {
        const a = n * Math.PI / 4;
        line(c, x + w * .49, floor - h * .39, x + w * .49 + Math.cos(a) * w * .20, floor - h * .39 + Math.sin(a) * w * .20, '#111514', 2);
      }
      return;
    }
    if (theme === 'prison') {
      c.fillRect(px(x), px(floor - h * .9), px(w), px(h * .9));
      for (let n = 0; n < 5; n++) { c.fillStyle = '#101415'; c.fillRect(px(x + n * w / 5 + 3), px(floor - h * .72), px(w / 8), px(h * .45)); c.fillStyle = color; }
      c.fillRect(px(x + w * .40), px(floor - h * 1.35), px(w * .2), px(h * .5));
      return;
    }
    // Buttressed cathedral, archive, drowned tower, belfry, choir and throne variations.
    c.fillRect(px(x), px(floor - h * .65), px(w), px(h * .65));
    arch(c, x + w * .5, floor - h * .35, w * .47, h * .97, '#0c1011');
    c.fillStyle = color;
    c.fillRect(px(x + w * .05), px(floor - h * .91), px(w * .14), px(h * .94));
    c.fillRect(px(x + w * .81), px(floor - h * .91), px(w * .14), px(h * .94));
    polygon(c, [x + w * .02, floor - h * .91, x + w * .12, floor - h * 1.2, x + w * .2, floor - h * .91], color);
    polygon(c, [x + w * .8, floor - h * .91, x + w * .88, floor - h * 1.2, x + w * .98, floor - h * .91], color);
    if (theme === 'archives') {
      for (let n = 0; n < 5; n++) { c.fillStyle = '#61625b'; c.fillRect(px(x + w * .31 + n * w * .075), px(floor - h * .38), px(w * .05), px(h * .28)); }
    } else if (theme === 'belfry') {
      ring(c, x + w * .5, floor - h * .73, w * .17, '#0c1011', 3);
      c.fillStyle = '#98948a'; c.fillRect(px(x + w * .46), px(floor - h * .66), px(w * .08), px(h * .11));
    } else if (theme === 'choir') {
      for (let n = 0; n < 7; n++) c.fillRect(px(x + w * .28 + n * w * .067), px(floor - h * (.46 + (n % 3) * .1)), px(w * .045), px(h * (.38 + (n % 3) * .1)));
    } else if (theme === 'throne') {
      polygon(c, [x + w * .3, floor - h * .68, x + w * .5, floor - h * 1.45, x + w * .7, floor - h * .68], '#1a1418');
    } else if (theme === 'flood') {
      line(c, x, floor - h * .33, x + w, floor - h * .35, '#7a8584', 1);
    }
    if (i % 3 === 0 && theme !== 'archives') { c.globalAlpha = .35; line(c, x + w * .22, floor - h * .52, x + w * .7, floor - h * .56, edge, 1); c.globalAlpha = 1; }
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
    if (theme === 'belfry') cross(c, x + w * .5, floor - h * .28, 20, color);
    if (theme === 'crypt' || theme === 'choir' || theme === 'throne') {
      for (let n = 0; n < 3; n++) arch(c, x + (n + .5) * w / 3, floor - h * .2, w * .16, h * .25, '#080b0c');
      if (i % 2 === 0) cross(c, x + w * .75, floor - h * .25, 15, '#272d2b');
    }
  }

  private tree(c: G, x: number, foot: number, h: number, color: string, seed: number) {
    const trunk = Math.max(3, h * .055);
    line(c, x, foot, x + h * .03, foot - h * .76, color, trunk);
    for (let i = 0; i < 5; i++) {
      const y = foot - h * (.36 + i * .105), dir = i % 2 ? 1 : -1;
      const tipX = x + dir * h * (.23 + hash(seed * 51 + i) * .15);
      const tipY = y - h * (.14 + hash(seed * 17 + i) * .13);
      line(c, x, y, tipX, tipY, color, Math.max(2, trunk * .5));
      line(c, tipX, tipY, tipX + dir * h * .09, tipY - h * .09, color, 2);
    }
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
      // The bell is the false moon; its red seam reveals the engine inside.
      polygon(c,[x-s,y+s*.7,x-s*.68,y-s*.65,x-s*.3,y-s,x+s*.3,y-s,x+s*.68,y-s*.65,x+s,y+s*.7],'#827978');
      polygon(c,[x-s*.7,y+s*.45,x-s*.48,y-s*.5,x,y-s*.75,x+s*.48,y-s*.5,x+s*.7,y+s*.45],'#191214');
      line(c,x-s,y+s*.7,x+s,y+s*.7,'#b9a9a1',3);ring(c,x,y-s*1.05,s*.19,'#7b7270',3);
      line(c,x,y-s*.65,x,y+s*.32,'#d5676a',2);c.fillStyle='#b59989';c.fillRect(px(x-4),px(y+s*.72),8,s*.3);
      this.glow(x,y,s*.65,'#bc4e59',.11);
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
    c.save(); c.globalAlpha = layer.opacity;
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
    if (p.active === false) return;
    const c = this.c, u = this.unit, x = this.X(p.x), y = this.Y(p.y), w = px(p.w * u), h = px(p.h * u);
    if (x > this.width + 20 || x + w < -20) return;
    const stone = this.tone.stone;
    c.fillStyle = '#080c0d'; c.fillRect(x - 2, y - 2, w + 4, h + 3);
    c.fillStyle = stone; c.fillRect(x, y + 3, w, h - 3);
    c.fillStyle = '#77817c'; c.fillRect(x, y, w, 3);
    c.fillStyle = this.tone.edge; c.fillRect(x, y, w, 1);
    c.fillStyle = '#171d1b';
    for (let i = 0; i < p.w * 3; i++) {
      const sx = x + px((i + .3) * u / 3);
      if (sx > x + w - 2) break;
      const crack = 3 + px(hash(i * 13 + p.x * 17) * Math.min(h - 5, 13));
      c.fillRect(sx, y + 4, 1, crack);
      if (i % 3 === 0) c.fillRect(sx + 1, y + crack + 2, 4, 1);
    }
    // Broken masonry, buttress seams and roots are authored detail, not flat boxes.
    if (h > 24) for (let i = 0; i < w / 28; i++) {
      const sx = x + i * 28 + 7;
      c.fillStyle = '#242b28'; c.fillRect(sx, y + 18, 12, 1);
      if (i % 2 === 0) { line(c, sx + 5, y + h - 2, sx - 3, y + h + 10, '#0b1010', 2); }
    }
    if (p.kind === 'crumble') {
      c.fillStyle = '#b3a99b'; c.fillRect(x + 4, y - 1, 4, 2);
      for (let i = 0; i < 3; i++) line(c, x + w * (.2 + i * .22), y + 2, x + w * (.25 + i * .22), y + h * .67, '#0d1111', 1);
    }
    if (p.kind === 'moving') {
      c.fillStyle = this.tone.accent; c.globalAlpha = .55; c.fillRect(x + 4, y + h - 4, w - 8, 2); c.globalAlpha = 1;
      ring(c, x + 7, y + h - 4, 3, '#1a2322'); ring(c, x + w - 7, y + h - 4, 3, '#1a2322');
    }
    if (p.kind === 'conveyor') {
      c.fillStyle = '#171d1b'; c.fillRect(x + 2, y + 2, w - 4, 4);
      for (let i = 0; i < w / 14; i++) {
        const sx = x + ((i * 14 + (this.reduced ? 0 : px(t * 18) % 14)) % Math.max(w, 1));
        polygon(c, [sx, y + 2, sx + 4, y + 4, sx, y + 6], '#8c948d');
      }
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
    if (item.collected) return;
    const c = this.c, x = this.X(item.x), y = this.Y(item.y) + (this.reduced ? 0 : px(Math.sin(t * 2.1 + item.x) * 2));
    if (x < -18 || x > this.width + 18) return;
    const special = Boolean((item as unknown as { relic?: boolean; secret?: boolean }).relic || item.secret);
    this.glow(x, y, special ? 18 : 12, special ? '#d6b9a0' : this.tone.accent, special ? .20 : .12);
    c.fillStyle = '#101312'; c.fillRect(x - 4, y - 8, 8, 14);
    polygon(c, [x, y - (special ? 11 : 7), x + 5, y - 1, x, y + 6, x - 5, y - 1], special ? '#d3c3ad' : '#b7c7bf');
    c.fillStyle = special ? '#7b6759' : '#587771'; c.fillRect(x - 1, y - 4, 2, 7);
    if (special) { c.fillStyle = '#f0d9b8'; c.fillRect(x - 1, y - 10, 2, 3); line(c, x - 7, y + 8, x + 7, y + 8, '#bca48c'); }
    this.stats.drawCalls++;
  }

  private drawCheckpoint(cp: Stage['checkpoints'][number], t: number) {
    const c = this.c, x = this.X(cp.x), y = this.Y(cp.y);
    if (x < -20 || x > this.width + 20) return;
    c.fillStyle = '#171d1c'; c.fillRect(x - 5, y - 26, 10, 26); c.fillRect(x - 8, y - 6, 16, 6);
    polygon(c, [x - 6, y - 25, x, y - 36, x + 6, y - 25], '#747f79');
    c.fillStyle = cp.active ? '#d2b17f' : '#697470'; c.fillRect(x - 2, y - 22, 4, 5);
    if (cp.active) this.drawFlame(x, y - 25, t, .8);
    this.stats.drawCalls++;
  }

  private drawExit(stage: Stage, t: number) {
    const c = this.c, x = this.X(stage.exit.x), y = this.Y(stage.exit.y);
    if (x < -35 || x > this.width + 35) return;
    arch(c, x, y, 35, 69, '#adb5ab'); arch(c, x, y - 2, 25, 57, '#05090a');
    c.fillStyle = '#37413e'; c.fillRect(x - 19, y - 8, 38, 8);
    ring(c, x, y - 38, 12, '#778b86', 2);
    this.glow(x, y - 35, 28, this.tone.accent, .10);
    c.fillStyle = '#c6d2c9'; c.fillRect(x - 1, y - 45, 2, 3);
    this.stats.drawCalls++;
  }

  private drawPilgrim(state:GameState,t:number){
    const c=this.c,p=state.player,x=this.X(p.x),y=this.Y(p.y);
    if(x < -40 || x > this.width+40)return;
    const run=p.grounded&&Math.abs(p.vx)>.3&&!this.reduced;
    const frame=p.deadTime>0?10:p.attackTime>0?(p.attackTime>.11?8:9):p.dashTime>0?7:!p.grounded?(p.vy>0?5:6):run?1+Math.floor(t*10)%4:0;
    const size=Math.max(24,Math.round(this.unit*1.1*32/24));
    c.fillStyle='#020606';c.fillRect(x-Math.round(this.unit*.4),y,Math.round(this.unit*.8),2);
    c.save();c.translate(x,y);if(p.facing<0)c.scale(-1,1);
    const dx=-Math.round(size/2),dy=-Math.round(size*29/32);
    if(p.dashTime>0){c.globalAlpha=.18;for(let k=1;k<3;k++)c.drawImage(this.sprites,7*32,0,32,32,dx-k*7,dy,size,size);c.globalAlpha=1;}
    c.imageSmoothingEnabled=false;c.drawImage(this.sprites,frame*32,0,32,32,dx,dy,size,size);c.restore();this.stats.drawCalls++;
  }

  private drawEnemies(state: GameState, t: number) {
    const enemies = (state as unknown as { enemies?: Array<{ x: number; y: number; active?: boolean; hp?: number; kind?: string; telegraph?: number }> }).enemies;
    if (!enemies) return;
    const c = this.c;
    for (const e of enemies) {
      if (e.active === false || (e.hp != null && e.hp <= 0)) continue;
      const x = this.X(e.x), y = this.Y(e.y);
      if (x < -30 || x > this.width + 30) continue;
      const big = /boss|warden/.test(String(e.kind));
      const height = big ? 64 : 34, width = big ? 22 : 11;
      c.fillStyle = '#020505';
      polygon(c, [x - width, y, x - width * .55, y - height * .75, x, y - height, x + width * .55, y - height * .75, x + width, y], '#030707');
      c.fillStyle = '#48514e'; c.fillRect(x - width * .4, y - height * .68, width * .8, 2);
      c.fillStyle = '#9caaa2'; c.fillRect(x - (big ? 6 : 3), y - height * .57, 2, 1); c.fillRect(x + (big ? 4 : 2), y - height * .57, 2, 1);
      if (big) { polygon(c, [x - 16, y - height, x - 10, y - height - 16, x - 2, y - height - 7, x + 7, y - height - 19, x + 18, y - height], '#3c4240'); }
      if (e.telegraph && e.telegraph > 0) { c.fillStyle = '#d6a77e'; c.globalAlpha = e.telegraph; c.fillRect(x - width, y - height - 7, width * 2 * e.telegraph, 2); c.globalAlpha = 1; }
      if (!this.reduced) c.fillRect(x - 1, y - height - 2 + px(Math.sin(t * 3 + e.x) * 2), 2, 1);
      this.stats.drawCalls++;
    }
  }

  private glow(x: number, y: number, r: number, color: string, alpha: number) {
    const c = this.c;
    c.save(); c.globalCompositeOperation = 'screen'; c.globalAlpha = alpha;
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color); g.addColorStop(.24, color); g.addColorStop(1, '#00000000');
    c.fillStyle = g; c.fillRect(px(x - r), px(y - r), px(r * 2), px(r * 2)); c.restore();
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
      const x = this.X(wx + 3), y = this.Y(0);
      if (x < -20 || x > this.width + 20) continue;
      c.fillStyle = '#0b0f0e'; c.fillRect(x - 2, y - 32, 4, 26); c.fillRect(x - 5, y - 35, 10, 3);
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

  private finishFrame(t: number) {
    const c = this.c, w = this.width, h = this.height;
    const vignette = c.createRadialGradient(w * .5, h * .45, h * .10, w * .5, h * .5, Math.max(w, h) * .68);
    vignette.addColorStop(0, '#00000000'); vignette.addColorStop(.65, '#00000020'); vignette.addColorStop(1, '#000000c0');
    c.fillStyle = vignette; c.fillRect(0, 0, w, h);
    if (this.noise) { c.save(); c.globalAlpha = this.quality === 'high' ? .10 : .06; c.fillStyle = this.noise; c.fillRect(0, 0, w, h); c.restore(); }
    // Fine scan lines belong to the low-resolution image, not to CSS.
    c.save(); c.globalAlpha = .045; c.fillStyle = '#000';
    for (let y = 1; y < h; y += 3) c.fillRect(0, y, w, 1);
    c.restore();
    this.screen.fillStyle='#080909';this.screen.fillRect(0,0,this.canvas.width,this.canvas.height);
    this.screen.imageSmoothingEnabled = false;
    const dw=this.width*this.pixelScale,dh=this.height*this.pixelScale;
    this.screen.drawImage(this.scene,Math.floor((this.canvas.width-dw)/2),Math.floor((this.canvas.height-dh)/2),dw,dh);
    void t;
  }

  render(state: GameState, _alpha: number, elapsed: number, dt: number) {
    if (!this.stage || this.stage.id !== state.stage.id || this.stage !== state.stage) this.setStage(state.stage);
    if (state.stageIndex !== this.stageIndex) {
      this.stageIndex = state.stageIndex;
      const current = String(state.stage.theme);
      if (!(current in TONES)) { this.theme = SCENES[this.stageIndex % 10]; this.tone = TONES[this.theme]; this.buildLayers(); }
    }
    const menu = state.mode === 'menu';
    const look = menu ? (this.width / this.height < .85 ? -1.0 : -2.3) : state.player.facing >= 0 ? 1.9 : -1.9;
    const nextX = state.player.x + look;
    const ground=state.stage.platforms.find(p=>p.h>1&&state.player.x>=p.x&&state.player.x<p.x+p.w)?.y??0;
    const nextY = ground+2.55+clamp(state.player.y-ground,0,3)*.35;
    const easing = menu || this.reduced ? 1 : 1 - Math.exp(-Math.max(0, dt) * 5.6);
    this.camX += (nextX - this.camX) * easing;
    this.camY += (nextY - this.camY) * easing;
    this.stats.drawCalls = 0; this.stats.triangles = 0;
    this.drawSky(elapsed);
    this.drawLayers(0); this.drawFog(elapsed, 0);
    this.drawLayers(1); this.drawWorldTorches(elapsed);
    this.drawFog(elapsed, 1); this.drawLayers(2);
    this.drawWeather(elapsed);
    const margin = this.width / this.unit + 3;
    for (const platform of state.stage.platforms) if (platform.x + platform.w > this.camX - margin && platform.x < this.camX + margin) this.drawPlatform(platform, elapsed);
    for (const hazard of state.stage.hazards) this.drawHazard(hazard, elapsed);
    for (const item of state.stage.pickups) this.drawPickup(item, elapsed);
    for (const cp of state.stage.checkpoints) this.drawCheckpoint(cp, elapsed);
    this.drawExit(state.stage, elapsed);
    this.drawEnemies(state, elapsed);
    this.drawPilgrim(state, elapsed);
    this.finishFrame(elapsed);
    this.fpsT += Math.max(0, dt); this.fpsN++;
    if (this.fpsT > .55) { this.stats.fps = Math.round(this.fpsN / this.fpsT); this.fpsT = 0; this.fpsN = 0; }
  }

  dispose() {
    if (this.media && this.onMotion) this.media.removeEventListener?.('change', this.onMotion);
    this.layers = [];
  }
}
