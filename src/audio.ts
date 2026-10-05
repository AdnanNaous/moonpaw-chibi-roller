/** Original, locally bundled sound. Cues are deliberately scarce and quiet. */
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
} as const;
type Cue = keyof typeof CUES;

export class AudioDirector {
  private context?: AudioContext;
  private master?: GainNode;
  private music?: AudioBufferSourceNode;
  private musicGain?: GainNode;
  private buffers = new Map<string, Promise<AudioBuffer>>();
  private lastCue = new Map<Cue, number>();
  private activeCues = 0;
  private epoch = 0;
  private disposed = false;
  muted = false;
  volume = .55;

  unlock() {
    if (this.disposed) return;
    if (!this.context) {
      this.context = new AudioContext();
      this.master = this.context.createGain();
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
      for (const name of ['jump', 'dash', 'attack', 'boss_hit', 'death', 'checkpoint'] as Cue[]) {
        void this.load(name).catch(() => {});
      }
    }
    if (this.context.state === 'suspended') void this.context.resume().catch(() => {});
  }

  setVolume(value: number) {
    this.volume = Math.max(0, Math.min(1, value));
    if (this.master && this.context) this.master.gain.setTargetAtTime(this.muted ? 0 : this.volume, this.context.currentTime, .025);
  }
  setMuted(value: boolean) { this.muted = value; this.setVolume(this.volume); }

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

  play(event: string) {
    const name = (event === 'ending' ? 'complete' : event === 'walljump' ? 'jump' : event) as Cue;
    if (!(name in CUES) || !this.context || !this.master || this.muted || this.disposed) return;
    const cue = CUES[name];
    const now = this.context.currentTime;
    if (now - (this.lastCue.get(name) ?? -Infinity) < cue.gap || this.activeCues >= 4) return;
    this.lastCue.set(name, now);
    void this.load(name).then(buffer => {
      if (!this.context || !this.master || this.context.state !== 'running' || this.muted || this.disposed || this.activeCues >= 4) return;
      const source = this.context.createBufferSource();
      const gain = this.context.createGain();
      source.buffer = buffer;
      gain.gain.value = cue.gain;
      source.connect(gain);
      gain.connect(this.master);
      this.activeCues++;
      source.onended = () => { this.activeCues--; source.disconnect(); gain.disconnect(); };
      source.start();
    }).catch(error => console.warn('Audio cue unavailable', name, error));
  }

  start(chapter: number) {
    if (!Number.isInteger(chapter) || chapter < 0 || chapter > 9) return;
    this.unlock();
    this.stop();
    const token = this.epoch;
    void this.load(`chapter-${String(chapter + 1).padStart(2, '0')}`).then(buffer => {
      if (token !== this.epoch || !this.context || !this.master || this.disposed) return;
      const source = this.context.createBufferSource();
      const gain = this.context.createGain();
      source.buffer = buffer;
      source.loop = true;
      gain.gain.setValueAtTime(0, this.context.currentTime);
      gain.gain.linearRampToValueAtTime(.42, this.context.currentTime + 2);
      source.connect(gain);
      gain.connect(this.master);
      source.start();
      this.music = source;
      this.musicGain = gain;
    }).catch(error => console.warn('Chapter audio unavailable', chapter + 1, error));
  }

  stop() {
    this.epoch++;
    if (this.music && this.musicGain && this.context) {
      const now = this.context.currentTime;
      this.musicGain.gain.cancelScheduledValues(now);
      this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, now);
      this.musicGain.gain.linearRampToValueAtTime(0, now + .25);
      try { this.music.stop(now + .26); } catch { /* already stopped */ }
      const oldMusic = this.music, oldGain = this.musicGain;
      oldMusic.onended = () => { oldMusic.disconnect(); oldGain.disconnect(); };
    }
    this.music = undefined;
    this.musicGain = undefined;
  }
  suspend() { if (this.context?.state === 'running') void this.context.suspend().catch(() => {}); }
  dispose() {
    if (this.disposed) return;
    this.stop();
    this.disposed = true;
    this.buffers.clear();
    void this.context?.close().catch(() => {});
  }
}
