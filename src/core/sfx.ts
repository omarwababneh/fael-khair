// Sound effects generated with Web Audio. A file at
// public/assets/audio/sfx/<name>.m4a replaces the generated sound.
import { audio } from './audio';
import { hasAudio } from './assets';

export type SfxName =
  | 'thud' | 'dust' | 'grab' | 'step' | 'chime' | 'prick' | 'pop'
  | 'creak' | 'birds' | 'whoosh' | 'slide'
  | 'splash' | 'pour' | 'lap' | 'bark' | 'bounce' | 'shatter' | 'sweep'
  | 'wipe' | 'knock' | 'door' | 'rustle' | 'rope' | 'twinkle';

interface Opts { weight?: number; volume?: number }

function env(g: GainNode, t: number, peak: number, attack: number, decay: number): void {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
}

function noise(ctx: AudioContext, t: number, dur: number, filter: BiquadFilterType, freq: number, q: number, peak: number, attack = 0.005): AudioNode {
  const src = ctx.createBufferSource();
  src.buffer = audio.noiseBuffer();
  src.playbackRate.value = 0.9 + Math.random() * 0.2;
  const f = ctx.createBiquadFilter();
  f.type = filter;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = ctx.createGain();
  env(g, t, peak, attack, dur);
  src.connect(f).connect(g);
  src.start(t, Math.random(), attack + dur + 0.05);
  return g;
}

function tone(ctx: AudioContext, t: number, type: OscillatorType, f0: number, f1: number, dur: number, peak: number, attack = 0.005): AudioNode {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  const g = ctx.createGain();
  env(g, t, peak, attack, dur);
  o.connect(g);
  o.start(t);
  o.stop(t + attack + dur + 0.05);
  return g;
}

const makers: Record<SfxName, (ctx: AudioContext, t: number, o: Required<Opts>) => AudioNode[]> = {
  thud: (ctx, t, o) => [
    tone(ctx, t, 'sine', 120 - o.weight * 40, 38, 0.25 + o.weight * 0.15, 0.9),
    noise(ctx, t, 0.18 + o.weight * 0.1, 'lowpass', 420, 0.7, 0.55),
  ],
  dust: (ctx, t) => [noise(ctx, t, 0.45, 'bandpass', 1100, 0.6, 0.22, 0.03)],
  grab: (ctx, t) => [noise(ctx, t, 0.12, 'bandpass', 380, 1.2, 0.35), tone(ctx, t, 'triangle', 220, 300, 0.08, 0.12)],
  step: (ctx, t) => [noise(ctx, t, 0.06, 'lowpass', 500 + Math.random() * 300, 0.8, 0.35, 0.002)],
  chime: (ctx, t) => [
    tone(ctx, t, 'sine', 1046.5, 1046.5, 1.4, 0.16),
    tone(ctx, t + 0.09, 'sine', 1568, 1568, 1.2, 0.1),
    tone(ctx, t, 'sine', 2093, 2093, 0.6, 0.04),
  ],
  prick: (ctx, t) => [tone(ctx, t, 'triangle', 2600, 1800, 0.05, 0.25, 0.001), tone(ctx, t + 0.05, 'sine', 700, 380, 0.16, 0.2)],
  pop: (ctx, t) => [tone(ctx, t, 'sine', 520, 880, 0.09, 0.3, 0.002)],
  creak: (ctx, t) => {
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(160, t);
    o.frequency.linearRampToValueAtTime(210, t + 0.18);
    o.frequency.linearRampToValueAtTime(150, t + 0.4);
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 900;
    f.Q.value = 3;
    const g = ctx.createGain();
    env(g, t, 0.08, 0.05, 0.38);
    o.connect(f).connect(g);
    o.start(t);
    o.stop(t + 0.5);
    return [g, noise(ctx, t, 0.4, 'lowpass', 240, 0.7, 0.12, 0.05)];
  },
  birds: (ctx, t) => {
    const out: AudioNode[] = [];
    const n = 2 + Math.floor(Math.random() * 3);
    let tt = t;
    for (let i = 0; i < n; i++) {
      const base = 2600 + Math.random() * 1200;
      out.push(tone(ctx, tt, 'sine', base, base * 1.35, 0.07, 0.06, 0.004));
      tt += 0.09 + Math.random() * 0.08;
    }
    return out;
  },
  whoosh: (ctx, t) => {
    const src = ctx.createBufferSource();
    src.buffer = audio.noiseBuffer();
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 1.2;
    f.frequency.setValueAtTime(300, t);
    f.frequency.exponentialRampToValueAtTime(1800, t + 0.5);
    const g = ctx.createGain();
    env(g, t, 0.18, 0.2, 0.4);
    src.connect(f).connect(g);
    src.start(t, 0, 0.7);
    return [g];
  },
  slide: (ctx, t) => [noise(ctx, t, 0.22, 'bandpass', 600, 1.0, 0.18, 0.02)],
  splash: (ctx, t) => [
    noise(ctx, t, 0.35, 'bandpass', 1800, 0.7, 0.35, 0.004),
    noise(ctx, t + 0.05, 0.25, 'highpass', 3000, 0.7, 0.12, 0.004),
  ],
  pour: (ctx, t) => {
    const out: AudioNode[] = [];
    for (let i = 0; i < 8; i++) out.push(noise(ctx, t + i * 0.11, 0.16, 'bandpass', 900 + Math.random() * 900, 1.4, 0.16, 0.02));
    return out;
  },
  lap: (ctx, t) => {
    const out: AudioNode[] = [];
    for (let i = 0; i < 4; i++) out.push(tone(ctx, t + i * 0.22, 'sine', 420, 260, 0.07, 0.12, 0.003), noise(ctx, t + i * 0.22, 0.06, 'bandpass', 1400, 1.5, 0.12, 0.002));
    return out;
  },
  bark: (ctx, t) => {
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(520, t);
    o.frequency.exponentialRampToValueAtTime(330, t + 0.14);
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 900;
    f.Q.value = 1.2;
    const g = ctx.createGain();
    env(g, t, 0.14, 0.01, 0.16);
    o.connect(f).connect(g);
    o.start(t);
    o.stop(t + 0.25);
    return [g];
  },
  bounce: (ctx, t, o) => [tone(ctx, t, 'sine', 180 + o.weight * 200, 90, 0.16, 0.5, 0.002), noise(ctx, t, 0.05, 'lowpass', 900, 0.7, 0.2, 0.001)],
  shatter: (ctx, t) => {
    const out: AudioNode[] = [noise(ctx, t, 0.5, 'highpass', 2200, 0.6, 0.5, 0.002), tone(ctx, t, 'sine', 160, 60, 0.2, 0.5, 0.002)];
    for (let i = 0; i < 6; i++) out.push(tone(ctx, t + 0.04 + Math.random() * 0.35, 'triangle', 2500 + Math.random() * 2500, 1800, 0.06, 0.08, 0.001));
    return out;
  },
  sweep: (ctx, t) => [noise(ctx, t, 0.28, 'bandpass', 2600, 0.6, 0.16, 0.06)],
  wipe: (ctx, t) => [noise(ctx, t, 0.22, 'bandpass', 1300, 0.9, 0.12, 0.05)],
  knock: (ctx, t) => [tone(ctx, t, 'sine', 210, 120, 0.12, 0.7, 0.001), noise(ctx, t, 0.06, 'bandpass', 700, 2, 0.4, 0.001)],
  door: (ctx, t) => {
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(140, t);
    o.frequency.linearRampToValueAtTime(260, t + 0.5);
    o.frequency.linearRampToValueAtTime(180, t + 0.9);
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 1100;
    f.Q.value = 4;
    const g = ctx.createGain();
    env(g, t, 0.07, 0.1, 0.85);
    o.connect(f).connect(g);
    o.start(t);
    o.stop(t + 1.05);
    return [g];
  },
  rustle: (ctx, t) => [noise(ctx, t, 0.5, 'bandpass', 3200, 0.8, 0.08, 0.15)],
  twinkle: (ctx, t) => {
    const f = 1800 + Math.random() * 1400;
    return [tone(ctx, t, 'sine', f, f * 1.02, 0.5, 0.05, 0.01), tone(ctx, t + 0.04, 'sine', f * 1.5, f * 1.5, 0.35, 0.025, 0.01)];
  },
  rope: (ctx, t) => {
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(300, t);
    o.frequency.linearRampToValueAtTime(240, t + 0.2);
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 1500;
    f.Q.value = 6;
    const g = ctx.createGain();
    env(g, t, 0.05, 0.03, 0.2);
    o.connect(f).connect(g);
    o.start(t);
    o.stop(t + 0.3);
    return [g, noise(ctx, t, 0.15, 'bandpass', 500, 2, 0.08, 0.02)];
  },
};

export function sfx(name: SfxName, opts: Opts = {}): void {
  const ctx = audio.ctx;
  if (!ctx || ctx.state !== 'running') return;
  const o = { weight: opts.weight ?? 0.5, volume: opts.volume ?? 1 };
  const out = ctx.createGain();
  out.gain.value = o.volume;
  out.connect(audio.buses.sfx);
  if (hasAudio('sfx', name)) {
    void audio.load(`assets/audio/sfx/${name}.m4a`).then((buf) => {
      if (!buf) return;
      const s = ctx.createBufferSource();
      s.buffer = buf;
      s.connect(out);
      s.start();
    });
    return;
  }
  for (const node of makers[name](ctx, ctx.currentTime + 0.005, o)) node.connect(out);
}


/** All sound effects, including night ambience, fade out or back in. */
export function setSfxMuted(muted: boolean, seconds = 0.8): void {
  audio.ramp('sfx', muted ? 0 : 0.9, seconds);
}

/**
 * Night ambience (Wadi Rum): soft wind and distant crickets, on the sound
 * effects bus. A file at sfx/night.m4a replaces it. Returns a stop function.
 */
export function nightAmbience(): () => void {
  const ctx = audio.ctx;
  if (!ctx) return () => undefined;
  const out = ctx.createGain();
  out.gain.value = 0;
  out.gain.linearRampToValueAtTime(1, ctx.currentTime + 2);
  out.connect(audio.buses.sfx);
  const nodes: AudioScheduledSourceNode[] = [];
  let timer = 0;
  if (hasAudio('sfx', 'night')) {
    void audio.load('assets/audio/sfx/night.m4a').then((buf) => {
      if (!buf) return;
      const s = ctx.createBufferSource();
      s.buffer = buf;
      s.loop = true;
      s.connect(out);
      s.start();
      nodes.push(s);
    });
  } else {
    // Wind: looping filtered noise with a slow swell.
    const wind = ctx.createBufferSource();
    wind.buffer = audio.noiseBuffer();
    wind.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 420;
    const g = ctx.createGain();
    g.gain.value = 0.05;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.09;
    const lg = ctx.createGain();
    lg.gain.value = 0.03;
    lfo.connect(lg).connect(g.gain);
    wind.connect(f).connect(g).connect(out);
    wind.start();
    lfo.start();
    nodes.push(wind, lfo);
    // Crickets: short high chirps in small groups.
    timer = window.setInterval(() => {
      if (ctx.state !== 'running') return;
      const t = ctx.currentTime;
      const base = 4200 + Math.random() * 600;
      for (let i = 0; i < 3; i++) {
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.value = base;
        const cg = ctx.createGain();
        env(cg, t + i * 0.07, 0.018, 0.005, 0.04);
        o.connect(cg).connect(out);
        o.start(t + i * 0.07);
        o.stop(t + i * 0.07 + 0.08);
      }
    }, 900 + Math.random() * 500);
  }
  return () => {
    window.clearInterval(timer);
    const t = ctx.currentTime;
    out.gain.cancelScheduledValues(t);
    out.gain.setValueAtTime(out.gain.value, t);
    out.gain.linearRampToValueAtTime(0, t + 0.8);
    window.setTimeout(() => {
      for (const n of nodes) { try { n.stop(); } catch { /* stopped */ } }
      out.disconnect();
    }, 1000);
  };
}
