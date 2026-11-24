// Light background music, generated in code: a slow, soft plucked-string
// melody over a quiet sustained note, in a calm scale. It is scheduled note by
// note, so it loops forever without a seam. A file at
// public/assets/audio/music/<place>.m4a replaces the generated music for that place.
import { audio } from './audio';
import { hasAudio } from './assets';
import { getMusicOn, setMusicOn } from './settings';

export type Place = 'map' | 'petra' | 'ummqais' | 'amman' | 'irbid' | 'wadirum';

interface Theme {
  root: number; // MIDI note
  scale: number[];
  bpm: number;
  cutoff: number;
  density: number;
}

// One gentle variation per place: brighter for the map, slower for Wadi Rum.
const THEMES: Record<Place, Theme> = {
  map: { root: 62, scale: [0, 2, 4, 7, 9], bpm: 84, cutoff: 3400, density: 0.62 },
  petra: { root: 57, scale: [0, 1, 3, 5, 7, 8, 10], bpm: 72, cutoff: 2600, density: 0.55 },
  ummqais: { root: 60, scale: [0, 2, 4, 7, 9], bpm: 76, cutoff: 3000, density: 0.55 },
  amman: { root: 64, scale: [0, 2, 4, 5, 7, 9], bpm: 80, cutoff: 3200, density: 0.58 },
  irbid: { root: 55, scale: [0, 2, 3, 5, 7, 10], bpm: 66, cutoff: 2200, density: 0.5 },
  wadirum: { root: 52, scale: [0, 2, 3, 7, 8], bpm: 54, cutoff: 1700, density: 0.42 },
};

const VOLUME = 0.2;
const DUCKED = 0.07;
const midiHz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

class Track {
  out: GainNode;
  private timer = 0;
  private nextTime = 0;
  private beat = 0;
  private degree = 0;
  private nodes: AudioScheduledSourceNode[] = [];
  private rng: () => number;

  constructor(private ctx: AudioContext, private place: Place) {
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
    if (hasAudio('music', this.place)) {
      void audio.load(`assets/audio/music/${this.place}.m4a`).then((buf) => {
        if (!buf || this.stopped) return;
        const s = this.ctx.createBufferSource();
        s.buffer = buf;
        s.loop = true;
        s.connect(this.out);
        s.start();
        this.nodes.push(s);
      });
      return;
    }
    this.startDrone();
    this.nextTime = t + 0.3;
    this.timer = window.setInterval(() => this.schedule(), 60);
  }

  private stopped = false;

  stop(fade = 1.2): void {
    this.stopped = true;
    window.clearInterval(this.timer);
    const t = this.ctx.currentTime;
    this.out.gain.cancelScheduledValues(t);
    this.out.gain.setValueAtTime(this.out.gain.value, t);
    this.out.gain.linearRampToValueAtTime(0, t + fade);
    window.setTimeout(() => {
      for (const n of this.nodes) {
        try { n.stop(); } catch { /* already stopped */ }
      }
      this.out.disconnect();
    }, fade * 1000 + 200);
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
      // Long notes at the phrase end give the melody room to breathe.
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
  private on = getMusicOn();
  private track: Track | null = null;
  private place: Place | null = null;
  private ducked = false;

  constructor() {
    audio.onUnlock(() => {
      if (this.place) this.startTrack(this.place);
    });
  }

  get isOn(): boolean {
    return this.on;
  }

  play(place: Place): void {
    if (this.place === place && this.track) return;
    this.place = place;
    if (audio.ready) this.startTrack(place);
  }

  private startTrack(place: Place): void {
    const ctx = audio.ctx;
    if (!ctx) return;
    this.track?.stop();
    this.track = new Track(ctx, place);
    this.track.start();
    this.applyVolume(1);
  }

  /** Fade the music out completely (the track and the music level itself). */
  stop(fade = 1.2): void {
    audio.ramp('music', 0, fade);
    this.track?.stop(fade);
    this.track = null;
    this.place = null;
  }

  setOn(on: boolean): void {
    this.on = on;
    setMusicOn(on);
    this.applyVolume(0.6);
  }

  /** Lower the music while the voice speaks. */
  duck(ducked: boolean): void {
    this.ducked = ducked;
    this.applyVolume(ducked ? 0.25 : 1.2);
  }

  private applyVolume(seconds: number): void {
    audio.ramp('music', this.on ? (this.ducked ? DUCKED : VOLUME) : 0, seconds);
  }
}

export const music = new Music();
