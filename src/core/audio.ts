// One Web Audio graph for everything: music, sound effects and recorded voice.
// iOS needs the first sound to start inside a tap, so unlock() is called from
// the start-screen tap (and again from any later tap, harmlessly).
import { getThroughSilent } from './settings';

/**
 * Safari's audio session type: "playback" plays through the silent switch.
 * The parents' corner can turn it off ("auto") if the phone's voice is not
 * heard with it on (see the voice test there).
 */
export function applyAudioSession(): void {
  try {
    const nav = navigator as Navigator & { audioSession?: { type: string } };
    if (nav.audioSession) nav.audioSession.type = getThroughSilent() ? 'playback' : 'auto';
  } catch {
    /* not supported */
  }
}

/** The current audio session type, for the voice test (or null where Safari has none). */
export function audioSessionType(): string | null {
  const nav = navigator as Navigator & { audioSession?: { type: string } };
  return nav.audioSession ? nav.audioSession.type : null;
}

type Bus = 'music' | 'sfx' | 'voice';

class AudioEngine {
  ctx: AudioContext | null = null;
  master!: GainNode;
  buses!: Record<Bus, GainNode>;
  private buffers = new Map<string, Promise<AudioBuffer | null>>();
  private noise: AudioBuffer | null = null;
  private hidden = false;
  private listeners: Array<(hidden: boolean) => void> = [];
  private unlockListeners: Array<() => void> = [];

  constructor() {
    document.addEventListener('visibilitychange', () => this.onVisibility());
    window.addEventListener('pagehide', () => this.setHidden(true));
    window.addEventListener('pageshow', () => this.setHidden(document.hidden));
  }

  get ready(): boolean {
    return !!this.ctx;
  }

  /** Must run synchronously inside a user tap. */
  unlock(): void {
    if (!this.ctx) applyAudioSession();
    const first = !this.ctx;
    if (!this.ctx) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
      this.buses = {
        music: this.ctx.createGain(),
        sfx: this.ctx.createGain(),
        voice: this.ctx.createGain(),
      };
      this.buses.music.gain.value = 0;
      this.buses.sfx.gain.value = 0.9;
      this.buses.voice.gain.value = 1;
      for (const b of Object.values(this.buses)) b.connect(this.master);
    }
    if (this.ctx.state !== 'running' && !this.hidden) void this.ctx.resume().catch(() => undefined);
    // A silent buffer, started inside the tap, fully unlocks iOS.
    const buf = this.ctx.createBuffer(1, 1, 22050);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.ctx.destination);
    src.start(0);
    if (first) for (const fn of this.unlockListeners) fn();
  }

  onUnlock(fn: () => void): void {
    this.unlockListeners.push(fn);
  }

  get now(): number {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  /** Smoothly move a bus volume. */
  ramp(bus: Bus, value: number, seconds = 0.4): void {
    if (!this.ctx) return;
    const g = this.buses[bus].gain;
    const t = this.ctx.currentTime;
    g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(value, t + seconds);
  }

  noiseBuffer(): AudioBuffer | null {
    if (!this.ctx) return null;
    if (!this.noise) {
      const len = this.ctx.sampleRate * 2;
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    return this.noise;
  }

  /** Fetch and decode an audio file (served from the offline cache). */
  load(url: string): Promise<AudioBuffer | null> {
    const ctx = this.ctx;
    if (!ctx) return Promise.resolve(null);
    let p = this.buffers.get(url);
    if (!p) {
      p = fetch(url)
        .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
        .then((ab) => new Promise<AudioBuffer>((res, rej) => ctx.decodeAudioData(ab, res, rej)))
        .catch(() => null);
      this.buffers.set(url, p);
    }
    return p;
  }

  /** Put the audio session back after the microphone was used. */
  reapplySession(): void {
    applyAudioSession();
  }

  /** Decode a recording made on this phone (the parent's own voice). */
  decodeBlob(blob: Blob): Promise<AudioBuffer | null> {
    const ctx = this.ctx;
    if (!ctx) return Promise.resolve(null);
    return blob.arrayBuffer()
      .then((ab) => new Promise<AudioBuffer>((res, rej) => ctx.decodeAudioData(ab, res, rej)))
      .catch(() => null);
  }

  /** Play a decoded buffer on the voice bus. Resolves when it ends. */
  playVoiceBuffer(buf: AudioBuffer): { done: Promise<void>; stop: () => void } {
    const ctx = this.ctx as AudioContext;
    const s = ctx.createBufferSource();
    s.buffer = buf;
    s.connect(this.buses.voice);
    const done = new Promise<void>((res) => { s.onended = () => res(); });
    s.start();
    return { done, stop: () => { try { s.stop(); } catch { /* already stopped */ } } };
  }

  /** Play a file directly (not on the music or effects buses). Resolves when it ends. */
  async playFile(url: string): Promise<boolean> {
    const ctx = this.ctx;
    if (!ctx) return false;
    const buf = await this.load(url);
    if (!buf) return false;
    return new Promise((resolve) => {
      const s = ctx.createBufferSource();
      s.buffer = buf;
      s.connect(this.master);
      s.onended = () => resolve(true);
      s.start();
    });
  }

  onHiddenChange(fn: (hidden: boolean) => void): void {
    this.listeners.push(fn);
  }

  private onVisibility(): void {
    this.setHidden(document.hidden);
  }

  private setHidden(hidden: boolean): void {
    if (hidden === this.hidden) return;
    this.hidden = hidden;
    // Pause all sound when the app goes to the background.
    if (this.ctx) {
      if (hidden) void this.ctx.suspend().catch(() => undefined);
      else void this.ctx.resume().catch(() => undefined);
    }
    for (const fn of this.listeners) fn(hidden);
  }
}

export const audio = new AudioEngine();

// Any tap (re)unlocks audio: the first tap in debug mode, and after iOS
// interrupts the audio session (a phone call, for example).
window.addEventListener('pointerdown', () => audio.unlock(), { capture: true });
