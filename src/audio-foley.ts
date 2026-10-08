/** Small, original contact sounds, rendered once and reused. No timers or network. */
export type Surface = 'stone' | 'iron' | 'wood' | 'water';
export type Foley = Surface | 'land' | 'cloth' | 'focus' | 'confirm' | 'back' | 'tell';

export class FoleyPalette {
  private buffers = new Map<Foley, AudioBuffer[]>();
  private voices = new Set<AudioBufferSourceNode>();
  private serial = 0;

  constructor(private context: BaseAudioContext, private output: AudioNode) {
    for (const name of ['stone', 'iron', 'wood', 'water', 'land', 'cloth', 'focus', 'confirm', 'back', 'tell'] as Foley[]) {
      this.buffers.set(name, Array.from({ length: name.length < 6 ? 4 : 2 }, (_, variation) => this.render(name, variation)));
    }
  }

  private render(kind: Foley, variation: number) {
    const duration = kind === 'tell' ? .32 : kind === 'land' ? .28 : kind === 'cloth' ? .22 : kind === 'confirm' ? .19 : .14;
    const buffer = this.context.createBuffer(1, Math.ceil(this.context.sampleRate * duration), this.context.sampleRate);
    const samples = buffer.getChannelData(0);
    let seed = 7907 + variation * 571 + kind.charCodeAt(0) * 29, low = 0, previous = 0;
    const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) | 0; return (seed >>> 0) / 2147483648 - 1; };
    const tone = 1 + (variation - 1.5) * .027;
    for (let i = 0; i < samples.length; i++) {
      const t = i / buffer.sampleRate;
      const noise = random(); low += (noise - low) * .08;
      const grit = noise - previous; previous = noise;
      const onset = Math.min(1, t / .002);
      const fade = Math.min(1, (duration - t) / .014);
      const damp = (rate: number) => Math.exp(-t * rate);
      const sine = (hz: number) => Math.sin(t * Math.PI * 2 * hz * tone);
      let value = 0;
      if (kind === 'stone') value = .44 * low * damp(35) + .19 * grit * damp(65) + .16 * sine(168) * damp(54);
      else if (kind === 'iron') value = .16 * grit * damp(58) + (.13 * sine(486) + .07 * sine(1163) + .04 * sine(2381)) * damp(28);
      else if (kind === 'wood') value = (.23 * sine(194) + .15 * sine(347)) * damp(53) + .13 * low * damp(28);
      else if (kind === 'water') value = .43 * low * damp(29) + .065 * Math.sin((710 * t - 1800 * t * t) * Math.PI * 2) * damp(33);
      else if (kind === 'land') value = .62 * low * damp(24) + .19 * sine(92) * damp(25) + .11 * grit * damp(75);
      else if (kind === 'cloth') value = .22 * low * Math.sin(Math.min(1, t / duration) * Math.PI) ** 2;
      // Menu sounds are short paper/ratchet textures; no recurring UI melody.
      else if (kind === 'focus') value = .09 * grit * damp(110) + .065 * sine(840) * damp(75);
      else if (kind === 'confirm') value = .22 * low * damp(42) + (.09 * sine(281) + .07 * sine(562)) * damp(30);
      else if (kind === 'back') value = .12 * low * damp(55) + .07 * sine(205) * damp(38);
      else value = (.12 * sine(332) + .045 * sine(701)) * Math.sin(Math.min(1, t / .055) * Math.PI / 2) * damp(13) + .04 * low * damp(12);
      samples[i] = value * onset * Math.max(0, fade);
    }
    return buffer;
  }

  play(kind: Foley, gain = 1, pan = 0, rate = 1): boolean {
    if (this.context.state !== 'running' || this.voices.size >= 6) return false;
    const variants = this.buffers.get(kind)!;
    const serial = this.serial++;
    const source = this.context.createBufferSource();
    const level = this.context.createGain();
    const stereo = this.context.createStereoPanner();
    source.buffer = variants[serial % variants.length];
    source.playbackRate.value = Math.max(.75, Math.min(1.3, rate));
    level.gain.value = Math.max(0, Math.min(2, gain));
    stereo.pan.value = Math.max(-.7, Math.min(.7, pan));
    source.connect(level); level.connect(stereo); stereo.connect(this.output);
    this.voices.add(source);
    source.onended = () => { this.voices.delete(source); source.disconnect(); level.disconnect(); stereo.disconnect(); };
    source.start();
    return true;
  }

  stop() {
    for (const source of this.voices) { try { source.stop(); } catch { /* already finished */ } }
    this.voices.clear();
  }
  dispose() { this.stop(); this.buffers.clear(); }
}
