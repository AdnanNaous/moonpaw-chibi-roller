/** Authored PCM soundtrack/Foley, first-party local assets. */
export class AudioDirector {
  private context?: AudioContext;
  private master?: GainNode;
  private music?: AudioBufferSourceNode;
  private musicGain?: GainNode;
  private buffers = new Map<string, Promise<AudioBuffer>>();
  private epoch = 0;
  muted = false;
  volume = .55;
  unlock() {
    if (!this.context) {
      this.context = new AudioContext(); this.master = this.context.createGain();
      this.master.connect(this.context.destination); this.setVolume(this.volume);
      for (const event of ['jump','dash','pickup','checkpoint','death','complete','step','secret','page']) void this.load(event).catch(()=>{});
    }
    if (this.context.state === 'suspended') void this.context.resume();
  }
  setVolume(value:number) { this.volume=value; if(this.master) this.master.gain.value=this.muted?0:value; }
  setMuted(value:boolean) { this.muted=value; this.setVolume(this.volume); }
  private load(name:string):Promise<AudioBuffer> {
    if(!this.buffers.has(name)) this.buffers.set(name, fetch(`./audio/${name}.wav`).then(r=>{if(!r.ok)throw new Error(`Audio ${name}: ${r.status}`);return r.arrayBuffer();}).then(b=>this.context!.decodeAudioData(b)));
    return this.buffers.get(name)!;
  }
  play(event:string) {
    const name=event==='ending'?'complete':event==='walljump'?'jump':event;
    if(!['jump','dash','pickup','checkpoint','death','complete','step','secret','page'].includes(name)||!this.context||!this.master||this.muted)return;
    void this.load(name).then(buffer=>{
      if(!this.context||this.context.state!=='running'||!this.master)return;
      const source=this.context.createBufferSource(),gain=this.context.createGain();source.buffer=buffer;
      gain.gain.value=name==='step'?.1:.55;source.connect(gain);gain.connect(this.master);source.start();
      source.onended=()=>{source.disconnect();gain.disconnect();};
    }).catch(console.warn);
  }
  start(chapter:number) {
    this.unlock();this.stop();const token=this.epoch;
    void this.load(`chapter-${(chapter+1).toString().padStart(2,'0')}`).then(buffer=>{
      if(token!==this.epoch||!this.context||!this.master)return;
      this.music=this.context.createBufferSource();this.music.buffer=buffer;this.music.loop=true;
      this.musicGain=this.context.createGain();this.musicGain.gain.setValueAtTime(0,this.context.currentTime);this.musicGain.gain.linearRampToValueAtTime(.65,this.context.currentTime+1.2);
      this.music.connect(this.musicGain);this.musicGain.connect(this.master);this.music.start();
    }).catch(console.warn);
  }
  stop() { this.epoch++;try{this.music?.stop();}catch{}this.music?.disconnect();this.musicGain?.disconnect();this.music=undefined; }
  suspend() { if(this.context?.state==='running')void this.context.suspend(); }
  dispose() { this.stop();void this.context?.close(); }
}
