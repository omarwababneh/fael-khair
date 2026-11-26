// Background sound (MISSIONS_V2.md section 9).
//
// The parents choose one of three: cheerful recorded music (default), nature
// sounds only, or nothing. Recorded tracks live at
// public/assets/audio/music/<place>.m4a. They end with a short fade, so each
// loop restarts after about one second of quiet, which makes the join sound
// intended. The old generated melody is kept only as a fallback for a track
// that fails to load; no place uses it by design. Wadi Rum has no music at all
// (its wind and crickets are sound effects, see sfx.ts).
import { audio } from './audio';
import { hasAudio } from './assets';
import { getMusicVolume, getSoundMode, setMusicVolume, setSoundMode, type MusicVolume, type SoundMode } from './settings';

export type MusicPlace = 'map' | 'petra' | 'ummqais' | 'amman' | 'irbid' | 'jerash' | 'deadsea' | 'aqaba';

/** Music bus level: medium is the level the game has always used; quiet is half. */
const LEVEL: Record<MusicVolume, number> = { medium: 0.2, quiet: 0.1 };
/** While the voice speaks, the music drops to about a third. */
const DUCK = 0.35;
const LOOP_PAUSE = 1.0; // seconds of quiet between the end of a track and its restart

// ---------------------------------------------------------------- fallback melody

interface Theme { root: number; scale: number[]; bpm: number; cutoff: number; density: number }

const THEMES: Record<MusicPlace, Theme> = {
  map: { root: 62, scale: [0, 2, 4, 7, 9], bpm: 84, cutoff: 3400, density: 0.62 },
  petra: { root: 57, scale: [0, 1, 3, 5, 7, 8, 10], bpm: 72, cutoff: 2600, density: 0.55 },
  ummqais: { root: 60, scale: [0, 2, 4, 7, 9], bpm: 76, cutoff: 3000, density: 0.55 },
  amman: { root: 64, scale: [0, 2, 4, 5, 7, 9], bpm: 80, cutoff: 3200, density: 0.58 },
  irbid: { root: 55, scale: [0, 2, 3, 5, 7, 10], bpm: 66, cutoff: 2200, density: 0.5 },
  jerash: { root: 60, scale: [0, 2, 4, 5, 7, 9], bpm: 82, cutoff: 3000, density: 0.58 },
  deadsea: { root: 58, scale: [0, 2, 4, 7, 9], bpm: 70, cutoff: 2600, density: 0.5 },
  aqaba: { root: 62, scale: [0, 2, 4, 7, 9], bpm: 86, cutoff: 3400, density: 0.6 },
};

const midiHz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

/** One place's background: a recorded track, the fallback melody, or nature sounds. */
class Track {
  out: GainNode;
  private timer = 0;
  private nextTime = 0;
  private beat = 0;
  private degree = 0;
  private nodes: AudioScheduledSourceNode[] = [];
  private stopped = false;
  private rng: () => number;

  constructor(private ctx: AudioContext, private place: MusicPlace, readonly mode: Exclude<SoundMode, 'off'>) {
    this.out = ctx.createGain();
    this.out.gain.value = 0;
    this.out.connect(audio.buses.music);
    let seed = place.split('').reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0;
    this.rng = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
  }

  start(): void {
    const t = this.ctx.currentTime;
    this.out.gain.setValueAtTime(0, t);
    this.out.gain.linearRampToValueAtTime(1, t + 1.5);
    if (this.mode === 'nature') {
      this.startNature();
      return;
    }
    if (hasAudio('music', this.place)) {
      void audio.load(`assets/audio/music/${this.place}.m4a`).then((buf) => {
        if (this.stopped) return;
        if (buf) this.loopFile(buf, this.ctx.currentTime + 0.05);
        else this.startMelody(); // the file failed to load
      });
      return;
    }
    this.startMelody(); // no file for this place
  }

  /** Play the track, then about a second of quiet, then play it again. */
  private loopFile(buf: AudioBuffer, when: number): void {
    if (this.stopped) return;
    const s = this.ctx.createBufferSource();
    s.buffer = buf;
    s.connect(this.out);
    s.start(when);
    this.nodes.push(s);
    s.onended = () => {
      this.nodes = this.nodes.filter((n) => n !== s);
      if (!this.stopped) this.loopFile(buf, this.ctx.currentTime + LOOP_PAUSE);
    };
  }

  stop(fade = 1.2): void {
    this.stopped = true;
    window.clearInterval(this.timer);
    const t = this.ctx.currentTime;
    this.out.gain.cancelScheduledValues(t);
    this.out.gain.setValueAtTime(this.out.gain.value, t);
    this.out.gain.linearRampToValueAtTime(0, t + fade);
    window.setTimeout(() => {
      for (const n of this.nodes) {
        n.onended = null;
        try { n.stop(); } catch { /* already stopped */ }
      }
      this.nodes = [];
      this.out.disconnect();
    }, fade * 1000 + 200);
  }

  // ---------------------------------------------------------------- nature sounds

  /**
   * Nature sounds only: wind, birds, water and the place's own sounds,
   * generated in code. No music.
   */
  private startNature(): void {
    const p = this.place;
    const indoor = p === 'amman';
    this.wind(indoor ? 0.08 : p === 'petra' ? 0.3 : 0.2, p === 'petra' ? 520 : 420);
    if (p === 'aqaba' || p === 'deadsea') this.waves(p === 'aqaba' ? 0.35 : 0.18);
    const birds = p === 'irbid' ? 0 : indoor ? 0.35 : 1;
    const crickets = p === 'irbid';
    const tick = () => {
      if (this.stopped || this.ctx.state !== 'running') return;
      const t = this.ctx.currentTime + 0.05;
      if (birds && this.rng() < 0.5 * birds) this.birdCall(t, indoor ? 0.12 : 0.28);
      if (crickets && this.rng() < 0.8) this.cricket(t);
      if (p === 'ummqais' && this.rng() < 0.12) this.trickle(t);
    };
    this.timer = window.setInterval(tick, 1100);
  }

  private wind(level: number, cutoff: number): void {
    const src = this.ctx.createBufferSource();
    src.buffer = audio.noiseBuffer();
    src.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = cutoff;
    const g = this.ctx.createGain();
    g.gain.value = level;
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.08;
    const lg = this.ctx.createGain();
    lg.gain.value = level * 0.5;
    lfo.connect(lg).connect(g.gain);
    src.connect(f).connect(g).connect(this.out);
    src.start();
    lfo.start();
    this.nodes.push(src, lfo);
  }

  private waves(level: number): void {
    const src = this.ctx.createBufferSource();
    src.buffer = audio.noiseBuffer();
    src.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 600;
    f.Q.value = 0.5;
    // The level swells from 0 to twice `level` and back: the base value plus a slow wave.
    const g = this.ctx.createGain();
    g.gain.value = level;
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.12; // a wave every eight seconds or so
    const lg = this.ctx.createGain();
    lg.gain.value = level;
    lfo.connect(lg).connect(g.gain);
    src.connect(f).connect(g).connect(this.out);
    src.start();
    lfo.start();
    this.nodes.push(src, lfo);
  }

  private env(g: GainNode, t: number, peak: number, attack: number, decay: number): void {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }

  private birdCall(t: number, peak: number): void {
    const n = 2 + Math.floor(this.rng() * 3);
    let tt = t;
    for (let i = 0; i < n; i++) {
      const base = 2600 + this.rng() * 1200;
      const o = this.ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(base, tt);
      o.frequency.exponentialRampToValueAtTime(base * 1.35, tt + 0.07);
      const g = this.ctx.createGain();
      this.env(g, tt, peak, 0.004, 0.07);
      o.connect(g).connect(this.out);
      o.start(tt);
      o.stop(tt + 0.12);
      tt += 0.09 + this.rng() * 0.08;
    }
  }

  private cricket(t: number): void {
    const base = 4200 + this.rng() * 600;
    for (let i = 0; i < 3; i++) {
      const o = this.ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = base;
      const g = this.ctx.createGain();
      this.env(g, t + i * 0.07, 0.09, 0.005, 0.04);
      o.connect(g).connect(this.out);
      o.start(t + i * 0.07);
      o.stop(t + i * 0.07 + 0.08);
    }
  }

  private trickle(t: number): void {
    for (let i = 0; i < 5; i++) {
      const f = 900 + this.rng() * 900;
      const o = this.ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(f, t + i * 0.09);
      o.frequency.exponentialRampToValueAtTime(f * 1.4, t + i * 0.09 + 0.05);
      const g = this.ctx.createGain();
      this.env(g, t + i * 0.09, 0.06, 0.003, 0.06);
      o.connect(g).connect(this.out);
      o.start(t + i * 0.09);
      o.stop(t + i * 0.09 + 0.1);
    }
  }

  // ---------------------------------------------------------------- fallback melody

  private startMelody(): void {
    if (this.stopped) return;
    this.startDrone();
    this.nextTime = this.ctx.currentTime + 0.3;
    this.timer = window.setInterval(() => this.schedule(), 60);
  }

  private startDrone(): void {
    const th = THEMES[this.place];
    const g = this.ctx.createGain();
    g.gain.value = 0.05;
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 0.018;
    lfo.connect(lfoGain).connect(g.gain);
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 700;
    for (const [interval, level] of [[-12, 1], [-5, 0.5]] as const) {
      const o = this.ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = midiHz(th.root + interval);
      const og = this.ctx.createGain();
      og.gain.value = level;
      o.connect(og).connect(f);
      o.start();
      this.nodes.push(o);
    }
    f.connect(g).connect(this.out);
    lfo.start();
    this.nodes.push(lfo);
  }

  private schedule(): void {
    const th = THEMES[this.place];
    const spb = 60 / th.bpm;
    while (this.nextTime < this.ctx.currentTime + 0.3) {
      const pos = this.beat % 16;
      if (pos === 0) this.degree = 0;
      const resolve = pos === 14;
      if (resolve || pos === 0 || this.rng() < th.density) {
        if (!resolve && pos !== 0) {
          const steps = [-2, -1, -1, 0, 1, 1, 2];
          this.degree += steps[Math.floor(this.rng() * steps.length)];
          this.degree = Math.max(-2, Math.min(th.scale.length + 2, this.degree));
        } else if (resolve) {
          this.degree = this.rng() < 0.5 ? 0 : th.scale.length;
        }
        const n = th.scale.length;
        const oct = Math.floor(this.degree / n);
        const idx = ((this.degree % n) + n) % n;
        const midi = th.root + 12 + th.scale[idx] + oct * 12;
        const swing = (this.rng() - 0.5) * 0.03;
        this.pluck(midiHz(midi), this.nextTime + swing, pos === 0 ? 0.11 : 0.085, th.cutoff);
        if (pos === 0 || pos === 8) this.pluck(midiHz(th.root), this.nextTime, 0.06, th.cutoff * 0.6);
      }
      this.beat++;
      this.nextTime += pos === 15 ? spb * 2 : spb;
    }
  }

  private pluck(freq: number, t: number, peak: number, cutoff: number): void {
    const ctx = this.ctx;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(cutoff, t);
    f.frequency.exponentialRampToValueAtTime(cutoff * 0.25, t + 0.9);
    const o1 = ctx.createOscillator();
    o1.type = 'triangle';
    o1.frequency.value = freq;
    const o2 = ctx.createOscillator();
    o2.type = 'sine';
    o2.frequency.value = freq * 2;
    const g2 = ctx.createGain();
    g2.gain.value = 0.3;
    o1.connect(f);
    o2.connect(g2).connect(f);
    f.connect(g).connect(this.out);
    o1.start(t);
    o2.start(t);
    o1.stop(t + 1.9);
    o2.stop(t + 1.9);
  }
}

class Music {
  private mode: SoundMode = getSoundMode();
  private volume: MusicVolume = getMusicVolume();
  private track: Track | null = null;
  private place: MusicPlace | null = null;
  private ducked = false;
  /** A quiet deed has no music: it plays the place's nature sounds instead. */
  private natureOnly = false;

  constructor() {
    audio.onUnlock(() => {
      if (this.place) this.startTrack(this.place);
    });
  }

  get soundMode(): SoundMode {
    return this.mode;
  }

  get musicVolume(): MusicVolume {
    return this.volume;
  }

  /**
   * Start a place's background. natureOnly (the quiet deeds): never music;
   * the place's nature sounds play instead, or nothing if the parents chose
   * no sound.
   */
  play(place: MusicPlace, opts: { natureOnly?: boolean } = {}): void {
    const natureOnly = !!opts.natureOnly;
    if (this.place === place && this.track && this.natureOnly === natureOnly) return;
    this.place = place;
    this.natureOnly = natureOnly;
    if (audio.ready) this.startTrack(place);
  }

  private effectiveMode(): SoundMode {
    return this.mode === 'off' ? 'off' : this.natureOnly ? 'nature' : this.mode;
  }

  private startTrack(place: MusicPlace): void {
    const ctx = audio.ctx;
    if (!ctx) return;
    this.track?.stop();
    this.track = null;
    const mode = this.effectiveMode();
    if (mode === 'off') {
      this.applyVolume(0.6);
      return;
    }
    this.track = new Track(ctx, place, mode);
    this.track.start();
    this.applyVolume(1);
  }

  /** Fade the background out completely (Wadi Rum, and before any Quran text). */
  stop(fade = 1.2): void {
    audio.ramp('music', 0, fade);
    this.track?.stop(fade);
    this.track = null;
    this.place = null;
  }

  setSoundMode(mode: SoundMode): void {
    if (mode === this.mode) return;
    this.mode = mode;
    setSoundMode(mode);
    if (this.place && audio.ready) this.startTrack(this.place);
  }

  setVolume(v: MusicVolume): void {
    this.volume = v;
    setMusicVolume(v);
    this.applyVolume(0.6);
  }

  /** Lower the background while the voice speaks. */
  duck(ducked: boolean): void {
    this.ducked = ducked;
    this.applyVolume(ducked ? 0.25 : 1.2);
  }

  private applyVolume(seconds: number): void {
    const level = this.mode === 'off' || !this.place ? 0 : LEVEL[this.volume] * (this.ducked ? DUCK : 1);
    audio.ramp('music', level, seconds);
  }
}

export const music = new Music();
