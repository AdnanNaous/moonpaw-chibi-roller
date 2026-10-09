/** Locally bundled score, environments, and cues. Nothing streams during play. */
import {FoleyPalette,type Surface} from './audio-foley';
import type {GameState} from './types';
const CUES = {
  jump: { gain: .30, gap: .12 },
  dash: { gain: .42, gap: .25 },
  attack: { gain: .38, gap: .18 },
  stagger: { gain: .40, gap: .20 },
  boss_hit: { gain: .55, gap: .24 },
  boss_defeated: { gain: .55, gap: 1.2 },
  pickup: { gain: .18, gap: .45 },
  relic: { gain: .42, gap: .6 },
  checkpoint: { gain: .42, gap: 1.2 },
  death: { gain: .55, gap: .6 },
  complete: { gain: .40, gap: 1.5 },
  secret: { gain: .32, gap: .75 },
  page: { gain: .20, gap: .08 },
  parry: { gain: .46, gap: .16 },
  enemy_hit: { gain: .42, gap: .15 },
  enemy_defeated: { gain: .36, gap: .20 },
  heal: { gain: .33, gap: .60 },
} as const;
type Cue = keyof typeof CUES;
// Chamber, mechanical, and late-game arrangements share a melodic identity.
const SCORE_FAMILY = [0, 1, 0, 0, 1, 2, 1, 2, 2, 2];
const EVENT_CUES: Record<string, Cue> = {
  ending: 'complete', walljump: 'jump', guard: 'parry', hurt: 'stagger',
  enemy_attack: 'attack', boss_attack: 'attack', encounter: 'boss_defeated',
  arena_cleared: 'complete', boon: 'relic',
};

export class AudioDirector {
  private context?: AudioContext;
  private master?: GainNode;
  private musicBus?: GainNode;
  private effectsBus?: GainNode;
  private musicFilter?:BiquadFilterNode;
  private foley?:FoleyPalette;
  private titleRequested=false;
  private titlePlayback=false;
  private titleChapter=0;
  private lastMotion?:{stage:string;stride:number;grounded:boolean;fall:number;dash:boolean;dead:number};
  private cueSerial=0;
  private uiClock=-Infinity;
  private titleTellAt=0;
  private duck=1;
  private layers: { source: AudioBufferSourceNode; gain: GainNode }[] = [];
  private combatGain?: GainNode;
  private buffers = new Map<string, Promise<AudioBuffer>>();
  private lastCue = new Map<Cue, number>();
  private activeCues = 0;
  private epoch = 0;
  private disposed = false;
  muted = false;
  volume = .70;
  musicVolume = .85;
  effectsVolume = 1;
  private intensity = 0;

  unlock() {
    if (this.disposed) return;
    if (!this.context) {
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.musicBus = this.context.createGain();
      this.effectsBus = this.context.createGain();
      this.musicFilter=this.context.createBiquadFilter();this.musicFilter.type='lowpass';this.musicFilter.frequency.value=8500;
      this.musicBus.connect(this.musicFilter);this.musicFilter.connect(this.master);
      this.effectsBus.connect(this.master);
      this.foley=new FoleyPalette(this.context,this.effectsBus);
      // Catch occasional stacked transients without pumping the quiet ambience.
      const limiter = this.context.createDynamicsCompressor();
      limiter.threshold.value = -10;
      limiter.knee.value = 6;
      limiter.ratio.value = 8;
      limiter.attack.value = .003;
      limiter.release.value = .18;
      this.master.connect(limiter);
      limiter.connect(this.context.destination);
      this.setVolume(this.volume);
      this.setMusicVolume(this.musicVolume);
      this.setEffectsVolume(this.effectsVolume);
      for (const name of ['jump', 'dash', 'attack', 'boss_hit', 'death', 'checkpoint'] as Cue[]) {
        void this.load(name).catch(() => {});
      }
    }
    if (this.context.state === 'suspended') void this.context.resume().catch(() => {});
    if(this.titleRequested){this.titleRequested=false;this.start(this.titleChapter,true);}
  }

  setVolume(value: number) {
    this.volume = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : .70;
    if (this.master && this.context) this.master.gain.setTargetAtTime(this.muted ? 0 : this.volume, this.context.currentTime, .025);
  }
  setMuted(value: boolean) { this.muted = value; this.setVolume(this.volume); }
  setMusicVolume(value: number) {
    this.musicVolume = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : .85;
    if (this.musicBus && this.context) this.musicBus.gain.setTargetAtTime(this.musicVolume*this.duck, this.context.currentTime, .05);
  }
  setEffectsVolume(value: number) {
    this.effectsVolume = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 1;
    if (this.effectsBus && this.context) this.effectsBus.gain.setTargetAtTime(this.effectsVolume, this.context.currentTime, .025);
  }
  /** Beat-aligned percussion/low-string stem rises during active encounters. */
  setIntensity(value: number) {
    const next = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
    if (Math.abs(next - this.intensity) < .01) return;
    this.intensity = next;
    if (this.combatGain && this.context) {
      this.combatGain.gain.cancelAndHoldAtTime(this.context.currentTime);
      this.combatGain.gain.setTargetAtTime(next * .62, this.context.currentTime, next > 0 ? .45 : .8);
    }
  }

  enterTitle(chapter=0){
    this.titleChapter=Math.max(0,Math.min(9,chapter));this.titleRequested=true;
    if(this.context){this.titleRequested=false;this.start(this.titleChapter,true);}
  }
  ui(kind:'focus'|'confirm'|'back'){
    if(!this.context||this.muted||this.disposed)return;
    const now=this.context.currentTime;if(now-this.uiClock<(kind==='focus'?.085:.13))return;
    this.uiClock=now;this.foley?.play(kind,kind==='focus'?.65:.85);
  }
  /** Foot contacts use traveled distance, not the frame clock or key repeat. */
  tickMotion(state:GameState,dt:number){
    if(!this.context||this.disposed)return;
    const p=state.player,previous=this.lastMotion;
    const moving=state.mode==='playing'&&p.deadTime<=0;
    const target=state.mode==='paused'?.60:1;
    if(target!==this.duck){this.duck=target;this.setMusicVolume(this.musicVolume);}
    if(this.titlePlayback&&state.mode==='menu'&&this.context.currentTime>this.titleTellAt){
      this.titleTellAt=this.context.currentTime+9+(this.cueSerial++%3)*2;
      if(!this.muted)this.foley?.play('tell',.32,(this.cueSerial%2?1:-1)*.45,.85);
    }
    if(previous&&previous.stage===state.stage.id&&moving&&!this.muted){
      const surface:Surface=state.stage.theme==='flood'?'water':['foundry','prison','choir'].includes(state.stage.theme)?'iron':state.stage.theme==='archives'?'wood':'stone';
      if(p.grounded&&p.dashTime<=0&&Math.abs(p.vx)>.5&&Math.floor(p.stride/1.35)>Math.floor(previous.stride/1.35))this.foley?.play(surface,.60+(this.cueSerial++%3)*.06,0,.95+(this.cueSerial%3)*.035);
      if(p.grounded&&!previous.grounded&&previous.fall< -3)this.foley?.play('land',Math.min(1.1,.24+Math.abs(previous.fall)*.055),0,.9);
      if(p.dashTime>0&&!previous.dash)this.foley?.play('cloth',.95);
    }
    if(previous&&p.deadTime>0&&previous.dead===0)this.foley?.stop();
    this.lastMotion={stage:state.stage.id,stride:p.stride,grounded:p.grounded,fall:p.vy,dash:p.dashTime>0,dead:p.deadTime};
    void dt;
  }

  private load(name: string): Promise<AudioBuffer> {
    let pending = this.buffers.get(name);
    if (!pending) {
      pending = fetch(`./audio/${name}.wav`)
        .then(response => {
          if (!response.ok) throw new Error(`Audio ${name}: ${response.status}`);
          return response.arrayBuffer();
        })
        .then(bytes => this.context!.decodeAudioData(bytes))
        .catch(error => { this.buffers.delete(name); throw error; });
      this.buffers.set(name, pending);
    }
    return pending;
  }

  play(event: string,position:{pan?:number;strength?:number}={}) {
    const name = (EVENT_CUES[event] ?? event) as Cue;
    if (!(name in CUES) || !this.context || !this.effectsBus || this.muted || this.disposed) return;
    const cue = CUES[name];
    const now = this.context.currentTime;
    if (now - (this.lastCue.get(name) ?? -Infinity) < cue.gap || this.activeCues >= 4) return;
    this.lastCue.set(name, now);
    void this.load(name).then(buffer => {
      if (!this.context || !this.effectsBus || this.context.state !== 'running' || this.muted || this.disposed || this.activeCues >= 4) return;
      const source = this.context.createBufferSource();
      const gain = this.context.createGain();
      const pan=this.context.createStereoPanner();pan.pan.value=Math.max(-.65,Math.min(.65,position.pan??0));
      source.buffer = buffer;
      const variant=this.cueSerial++%5;
      source.playbackRate.value=['attack','enemy_hit','jump','dash'].includes(name)?.96+variant*.02:1;
      gain.gain.value = cue.gain * 2.4 * Math.max(.3,Math.min(1.2,position.strength??1));
      source.connect(gain);
      gain.connect(pan);pan.connect(this.effectsBus);
      this.activeCues++;
      source.onended = () => { this.activeCues--; source.disconnect(); gain.disconnect();pan.disconnect(); };
      source.start();
    }).catch(error => console.warn('Audio cue unavailable', name, error));
  }

  start(chapter: number,title=false) {
    if (!Number.isInteger(chapter) || chapter < 0 || chapter > 9) return;
    this.titleRequested=false;this.unlock();
    this.stop();
    this.titlePlayback=title;this.lastMotion=undefined;this.titleTellAt=(this.context?.currentTime??0)+5;
    if(this.musicFilter&&this.context)this.musicFilter.frequency.setTargetAtTime(title?1800:8500,this.context.currentTime,.8);
    this.intensity = 0;
    const token = this.epoch;
    const family = SCORE_FAMILY[chapter] + 1;
    // Keep one decoded score pair and one environment, rather than accumulating
    // every chapter's resampled float buffers on mobile.
    for (const name of this.buffers.keys()) {
      if ((name.startsWith('score-') && name !== `score-${family}`) ||
          (name.startsWith('combat-') && name !== `combat-${family}`) ||
          (name.startsWith('chapter-') && name !== `chapter-${String(chapter + 1).padStart(2, '0')}`)) this.buffers.delete(name);
    }
    void Promise.all([
      this.load(`score-${family}`),
      this.load(`combat-${family}`),
      this.load(`chapter-${String(chapter + 1).padStart(2, '0')}`),
    ]).then(buffers => {
      if (token !== this.epoch || !this.context || !this.musicBus || this.disposed) return;
      // One clock/start point preserves phase between exploration and encounter stems.
      const at = this.context.currentTime + .03;
      buffers.forEach((buffer, i) => {
        const source = this.context!.createBufferSource();
        const gain = this.context!.createGain();
        source.buffer = buffer;
        source.loop = true;
        gain.gain.setValueAtTime(0, at);
        gain.gain.linearRampToValueAtTime(i === 0 ? title?.48:.80 : i === 1 ? this.intensity * .62 : title?.21:.16, at + (title?3.5:1.5));
        source.connect(gain);
        gain.connect(this.musicBus!);
        source.start(at);
        this.layers.push({ source, gain });
        if (i === 1) this.combatGain = gain;
      });
    }).catch(error => console.warn('Chapter audio unavailable', chapter + 1, error));
  }

  stop() {
    this.epoch++;
    this.titlePlayback=false;this.titleRequested=false;this.lastMotion=undefined;this.foley?.stop();
    if (this.context) {
      const now = this.context.currentTime;
      for (const { source, gain } of this.layers) {
        gain.gain.cancelAndHoldAtTime(now);
        gain.gain.linearRampToValueAtTime(0, now + .4);
        try { source.stop(now + .41); } catch { /* already stopped */ }
        source.onended = () => { source.disconnect(); gain.disconnect(); };
      }
    }
    this.layers = [];
    this.combatGain = undefined;
  }
  suspend() { if (this.context?.state === 'running') void this.context.suspend().catch(() => {}); }
  dispose() {
    if (this.disposed) return;
    this.stop();
    this.disposed = true;
    this.buffers.clear();
    this.foley?.dispose();
    void this.context?.close().catch(() => {});
  }
}
