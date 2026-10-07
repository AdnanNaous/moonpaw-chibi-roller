/** Locally bundled score, environments, and cues. Nothing streams during play. */
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
      this.musicBus.connect(this.master);
      this.effectsBus.connect(this.master);
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
  }

  setVolume(value: number) {
    this.volume = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : .70;
    if (this.master && this.context) this.master.gain.setTargetAtTime(this.muted ? 0 : this.volume, this.context.currentTime, .025);
  }
  setMuted(value: boolean) { this.muted = value; this.setVolume(this.volume); }
  setMusicVolume(value: number) {
    this.musicVolume = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : .85;
    if (this.musicBus && this.context) this.musicBus.gain.setTargetAtTime(this.musicVolume, this.context.currentTime, .05);
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
      source.buffer = buffer;
      gain.gain.value = cue.gain * 2.4;
      source.connect(gain);
      gain.connect(this.effectsBus);
      this.activeCues++;
      source.onended = () => { this.activeCues--; source.disconnect(); gain.disconnect(); };
      source.start();
    }).catch(error => console.warn('Audio cue unavailable', name, error));
  }

  start(chapter: number) {
    if (!Number.isInteger(chapter) || chapter < 0 || chapter > 9) return;
    this.unlock();
    this.stop();
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
        gain.gain.linearRampToValueAtTime(i === 0 ? .80 : i === 1 ? this.intensity * .62 : .16, at + 1.5);
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
    void this.context?.close().catch(() => {});
  }
}
