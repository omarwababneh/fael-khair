// Voice.say(lineId):
//  1. If the parent recorded this line on the phone (parents' corner), play that.
//  2. Otherwise, if public/assets/audio/vo/<lineId>.m4a exists, play it.
//  3. Otherwise speak the line's `tts` text with the phone's Arabic voice.
//  4. Always show the text in the speech bubble at the same time.
// If the phone has no Arabic voice at all, show the text only (never another
// language's voice). On an iPhone the voice list often arrives late or stays
// empty to a web page, so while no voice is listed the line is still spoken
// with lang "ar-SA" and no voice set: iOS then picks its own Arabic voice.
import { audio } from './audio';
import { hasAudio } from './assets';
import { getLine } from './content';
import { music } from './music';
import { recordings } from './recordings';
import { ui } from './ui';
import { getVoiceSpeed, VOICE_RATES } from './settings';

const synth: SpeechSynthesis | null = 'speechSynthesis' in window ? window.speechSynthesis : null;
const APPLE = /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent) && /Apple/.test(navigator.vendor || '');
const FALLBACK_LANG = 'ar-SA';

// The owner found the spec's 0.9 too slow: natural speed by default, and the
// parent can choose slower or faster in the parents' corner.

function readingTime(text: string): number {
  return Math.max(1800, text.length * 85 + 700);
}

/** Where a line's voice comes from. */
export type VoiceSource = 'own' | 'file' | 'speech' | 'text';

/** What the voice test in the parents' corner shows. */
export interface VoiceInfo {
  speech: boolean;
  total: number;
  arabic: string[];
  chosen: string | null;
  /** How a line is spoken now: with a chosen voice, by language only (iPhone), or as text only. */
  mode: 'voice' | 'lang' | 'text';
  unlock: string;
}

class VoiceSystem {
  private voice: SpeechSynthesisVoice | null = null;
  /** The phone listed its voices and none is Arabic, or speaking by language failed. */
  private noArabic = false;
  private token = 0;
  private finishCurrent: ((natural: boolean) => void) | null = null;
  private stopSource: (() => void) | null = null;
  private utter: SpeechSynthesisUtterance | null = null;
  private timers: number[] = [];
  /** Speech has really started once inside a tap (iOS then lets the page speak). */
  private unlocked = false;
  /** An unlock word is on its way; wait for its start, end or error before trying again. */
  private unlocking = false;
  private unlockResult = 'لم يُفتح بعد';
  private decoded = new Map<string, AudioBuffer>();
  private recVersion = 0;
  private testId = 0;
  lastId: string | null = null;

  /**
   * Pick the phone's best Arabic voice: a Jordanian one if it exists, then
   * Premium, then Enhanced, then any voice whose language starts with "ar".
   * Never a voice in another language.
   */
  private pick(): void {
    if (!synth) return;
    const score = (v: SpeechSynthesisVoice) => {
      const name = v.name.toLowerCase();
      let s = 0;
      if ((v.lang || '').toLowerCase().replace('_', '-') === 'ar-jo') s += 8;
      if (name.includes('premium')) s += 4;
      if (name.includes('enhanced') || name.includes('improved')) s += 2;
      if (v.localService) s += 1;
      return s;
    };
    const all = synth.getVoices();
    const ar = all.filter((x) => (x.lang || '').toLowerCase().replace('_', '-').startsWith('ar'));
    if (!ar.length) {
      // A listed set with no Arabic voice in it means this device has none, except
      // on an iPhone, whose list can leave out voices that are installed: there
      // only a failed attempt to speak by language says so (see speak()).
      if (all.length && !APPLE) this.noArabic = true;
      return;
    }
    this.noArabic = false;
    const best = ar.reduce((a, b) => (score(b) > score(a) ? b : a));
    if (!this.voice || score(best) > score(this.voice)) this.voice = best;
  }

  constructor() {
    if (synth) {
      const pick = () => this.pick();
      pick();
      // iOS loads voices late: listen for the event and also poll for 3 seconds.
      synth.addEventListener?.('voiceschanged', pick);
      let n = 0;
      const poll = window.setInterval(() => {
        pick();
        if (this.voice || ++n >= 12) window.clearInterval(poll);
      }, 250);
    }
    audio.onHiddenChange((hidden) => {
      if (hidden) this.stop(false);
    });
    recordings.onChange(() => {
      this.recVersion++;
      this.decoded.clear();
    });
    void recordings.init();
  }

  /** How a line would be spoken right now. */
  private mode(): 'voice' | 'lang' | 'text' {
    if (!synth) return 'text';
    if (this.voice) return 'voice';
    // No voice object: on an iPhone or Mac, speak by language unless the phone
    // has shown it has no Arabic voice at all.
    return APPLE && !this.noArabic ? 'lang' : 'text';
  }

  /** An utterance in Arabic, with the chosen voice if there is one. */
  private utterance(text: string): SpeechSynthesisUtterance {
    const u = new SpeechSynthesisUtterance(text);
    if (this.voice) {
      u.voice = this.voice;
      u.lang = this.voice.lang;
    } else {
      u.lang = FALLBACK_LANG;
    }
    u.rate = VOICE_RATES[getVoiceSpeed()];
    return u;
  }

  /** For the parents' corner: which Arabic voice the phone offers, if any. */
  get voiceLabel(): string | null {
    this.pick();
    return this.voice ? `${this.voice.name} (${this.voice.lang})` : null;
  }

  info(): VoiceInfo {
    this.pick();
    const all = synth ? synth.getVoices() : [];
    return {
      speech: !!synth,
      total: all.length,
      arabic: all.filter((x) => (x.lang || '').toLowerCase().startsWith('ar')).map((x) => `${x.name || '—'} (${x.lang})`),
      chosen: this.voice ? `${this.voice.name} (${this.voice.lang})` : null,
      mode: this.mode(),
      unlock: this.unlockResult,
    };
  }

  /** Is a line being said now? (A hint's own line waits rather than cut it off.) */
  get busy(): boolean {
    return this.finishCurrent !== null;
  }

  /**
   * Inside a tap: speak a real short word ("يلّا", what the start button says),
   * at normal volume. iOS only lets a page speak after it has spoken once inside
   * a tap, and a blank utterance at zero volume does not always count. It is
   * tried on every tap (finger up and click, which iOS counts as a tap) until
   * the word has really started; after that it never speaks again.
   */
  unlock(word = 'يلّا'): void {
    if (!synth || this.unlocked || this.unlocking) return;
    this.pick();
    if (this.mode() === 'text') return;
    this.unlocking = true;
    try {
      const u = this.utterance(word);
      u.onstart = () => {
        this.unlocked = true;
        this.unlocking = false;
        this.unlockResult = 'بدأ';
      };
      u.onend = () => {
        this.unlocking = false;
        if (this.unlocked) this.unlockResult = 'بدأ وانتهى';
      };
      u.onerror = (e) => {
        this.unlocking = false;
        this.unlockResult = `خطأ: ${e.error}`;
        // No Arabic voice at all: text only from the first line on.
        if (!this.voice && (e.error === 'language-unavailable' || e.error === 'voice-unavailable')) this.noArabic = true;
      };
      this.utter = u;
      synth.speak(u);
      // If nothing at all comes back, try again on the next tap.
      window.setTimeout(() => { if (!this.unlocked) this.unlocking = false; }, 1500);
    } catch (e) {
      this.unlocking = false;
      this.unlockResult = `خطأ: ${String(e)}`;
    }
  }

  /**
   * The parents' corner voice test: speak one line now (inside the tap) and
   * report what happened: started, ended, or the error.
   */
  test(text: string, report: (msg: string) => void): void {
    this.stop(false); // also stops a file test that is still playing
    this.pick();
    if (!synth) return report('هذا المتصفح لا يدعم الكلام.');
    // Each test reports only about itself; a later tap's test replaces it.
    const id = ++this.testId;
    let started = false;
    let settled = false;
    const say = (msg: string, last = false) => {
      if (id !== this.testId || settled) return;
      if (last) settled = true;
      report(msg);
    };
    const u = this.utterance(text);
    u.onstart = () => {
      started = true;
      this.unlocked = true;
      say('بدأ الكلام…');
    };
    u.onend = () => say(started ? 'بدأ وانتهى. إذا ما سمعت شي، جرّب خيار زر الصامت تحت.' : 'انتهى بدون ما يبدأ.', true);
    u.onerror = (e) => say(`خطأ: ${e.error}`, true);
    this.utter = u;
    const go = () => {
      try {
        synth.speak(u);
      } catch (e) {
        say(`خطأ: ${String(e)}`, true);
      }
    };
    // Speak inside the tap; only after a cancel wait a moment (iOS can drop it).
    if (synth.speaking || synth.pending) {
      synth.cancel();
      window.setTimeout(go, 80);
    } else go();
    window.setTimeout(() => { if (!started) say('ما بدأ الكلام خلال ٤ ثواني.', true); }, 4000);
  }

  /** Which source a line will use now: the parent's recording, the built-in file, the phone's speech, or text only. */
  source(id: string): VoiceSource {
    const line = getLine(id);
    const canPlay = audio.ready && !!audio.ctx;
    if (canPlay && recordings.has(id)) return 'own';
    if (canPlay && hasAudio('vo', id)) return 'file';
    this.pick();
    if (synth && this.mode() !== 'text' && line.speakable && line.tts) return 'speech';
    return 'text';
  }

  /**
   * A button's label, by the same rule as the bubble: the Jordanian label when
   * the parent's own recording of the line that offers it will play, otherwise
   * the Standard Arabic label (the built-in voice and the phone speak Standard Arabic).
   */
  label(lineId: string, standard: string, jordanian: string): string {
    return this.source(lineId) === 'own' ? jordanian : standard;
  }

  /**
   * The parents' corner main voice test: play one built-in file (inside the tap)
   * through the game's own audio, the way every line is played, and report
   * "played" or the exact error.
   */
  async testFile(id: string, report: (msg: string) => void): Promise<void> {
    this.stop(false);
    const tid = ++this.testId;
    const say = (msg: string) => { if (tid === this.testId) report(msg); };
    audio.unlock(); // inside the tap: starts or resumes the game's audio
    const ctx = audio.ctx;
    if (!ctx) return say('خطأ: صوت اللعبة ما اشتغل على هالجهاز.');
    if (!hasAudio('vo', id)) return say(`خطأ: ملف الصوت ${id}.m4a مش موجود باللعبة.`);
    let buf: AudioBuffer;
    try {
      const r = await fetch(`assets/audio/vo/${id}.m4a`);
      if (!r.ok) return say(`خطأ: ما قدرت أجيب ملف الصوت (${r.status}).`);
      const ab = await r.arrayBuffer();
      buf = await new Promise<AudioBuffer>((res, rej) => {
          // Callbacks for older Safari; newer browsers also return a promise, which must not reject unhandled.
          const p = ctx.decodeAudioData(ab, res, rej) as Promise<AudioBuffer> | undefined;
          p?.catch?.(() => undefined);
        });
    } catch (e) {
      return say(`خطأ بقراءة ملف الصوت: ${(e as Error)?.name || ''} ${(e as Error)?.message || String(e)}`.trim());
    }
    if (tid !== this.testId) return;
    if (ctx.state !== 'running') {
      try { await ctx.resume(); } catch { /* reported below */ }
    }
    if (tid !== this.testId) return;
    const p = audio.playVoiceBuffer(buf);
    this.stopSource = p.stop;
    music.duck(true);
    say(`عم بشغّل الملف… (وضع الصوت: ${ctx.state})`);
    const ended = await Promise.race([
      p.done.then(() => true),
      new Promise<boolean>((res) => window.setTimeout(() => res(false), buf.duration * 1000 + 2500)),
    ]);
    // Only if nothing else has started meanwhile (a game line, a speed sample or
    // another test): their own ducking must stay as it is.
    const mine = tid === this.testId && this.stopSource === p.stop;
    if (!ended) p.stop(); // timed out: never let it start later on its own
    if (mine) {
      this.stopSource = null;
      music.duck(false);
    }
    if (ended) say(`اشتغل (${buf.duration.toFixed(1)} ثانية). إذا ما سمعت شي، جرّب خيار زر الصامت تحت.`);
    else say(`خطأ: الملف ما خلص. وضع الصوت: ${ctx.state}.`);
  }

  /**
   * Resolves when the line has finished: true if it ended by itself, false if it
   * was replaced or stopped (so a follow-up line is chained only on true).
   */
  say(id: string): Promise<boolean> {
    this.stop(false);
    this.pick(); // voices can arrive late on iOS; look again before every line
    const token = ++this.token;
    this.lastId = id;
    const line = getLine(id);
    const own = recordings.has(id);
    const recorded = own || hasAudio('vo', id);
    const canPlay = audio.ready && !!audio.ctx;
    // The bubble shows what the voice says: the parent's own recording says the
    // everyday words (`script`); the built-in file and the phone's speech say the
    // Standard Arabic `tts` text. Lines with no `tts` show `script`.
    const ttsText = line.tts || line.script;
    let text = own && canPlay ? line.script : ttsText;
    const show = (t: string) => {
      text = t;
      ui.showBubble(t, () => void this.say(id));
    };
    show(text);
    ui.setSpeaking(true);
    music.duck(true);

    return new Promise<boolean>((resolve) => {
      let done = false;
      const finish = (natural = true) => {
        if (done) return;
        done = true;
        if (token === this.token) {
          this.clearTimers();
          ui.setSpeaking(false);
          music.duck(false);
          this.finishCurrent = null;
        }
        resolve(natural);
      };
      this.finishCurrent = finish;

      const textOnly = () => this.timers.push(window.setTimeout(() => finish(), readingTime(text)));
      const speak = () => {
        const mode = this.mode();
        if (!synth || mode === 'text' || !line.speakable || !line.tts) return textOnly();
        const u = this.utterance(line.tts);
        u.onend = () => finish();
        u.onerror = (e) => {
          // Speaking by language failed: this phone has no Arabic voice. Text from now on.
          if (mode === 'lang' && (e.error === 'language-unavailable' || e.error === 'voice-unavailable')) this.noArabic = true;
          finish();
        };
        this.utter = u; // keep a reference: iOS drops events of collected utterances
        // Safety net in case the end event never arrives.
        this.timers.push(window.setTimeout(() => finish(), readingTime(line.tts) * 1.8 + 3000));
        synth.speak(u);
      };
      const playBuffer = (buf: AudioBuffer | null) => {
        if (token !== this.token || done) return;
        if (!buf) return speak();
        const p = audio.playVoiceBuffer(buf);
        this.stopSource = p.stop;
        void p.done.then(() => finish());
        this.timers.push(window.setTimeout(() => finish(), buf.duration * 1000 + 1500));
      };

      if (recorded && canPlay) {
        if (own) {
          // The parent's own recording, decoded once and kept.
          const cached = this.decoded.get(id);
          if (cached) playBuffer(cached);
          else {
            const version = this.recVersion;
            void recordings.get(id).then((blob) => (blob ? audio.decodeBlob(blob) : null)).then((buf) => {
            // Keep the decoded copy only if the recording did not change meanwhile.
            if (buf && version === this.recVersion) this.decoded.set(id, buf);
            // The recording could not be read: the built-in file or the phone says
            // the `tts` text, so the bubble shows that instead.
            if (!buf && token === this.token && !done) show(ttsText);
            if (buf || !hasAudio('vo', id)) return playBuffer(buf);
            return audio.load(`assets/audio/vo/${id}.m4a`).then(playBuffer);
            });
          }
        } else {
          void audio.load(`assets/audio/vo/${id}.m4a`).then(playBuffer);
        }
      } else if (synth && (synth.speaking || synth.pending)) {
        synth.cancel();
        // iOS can drop an utterance queued right after cancel().
        this.timers.push(window.setTimeout(() => token === this.token && speak(), 80));
      } else {
        speak();
      }
    });
  }

  /** Stop speaking at once. */
  stop(clearBubble = false): void {
    this.token++;
    this.clearTimers();
    this.stopSource?.();
    this.stopSource = null;
    if (synth && (synth.speaking || synth.pending)) synth.cancel();
    this.utter = null;
    const f = this.finishCurrent;
    this.finishCurrent = null;
    f?.(false);
    ui.setSpeaking(false);
    music.duck(false);
    if (clearBubble) ui.clearBubble();
  }

  private clearTimers(): void {
    for (const t of this.timers) window.clearTimeout(t);
    this.timers = [];
  }
}

export const Voice = new VoiceSystem();

// Speech is unlocked inside a tap. iOS counts the finger lifting (and the click
// that follows) as a tap, not the finger touching down, so try on those too,
// on every tap until it has worked (debug mode, ?scene=, has no start tap).
for (const type of ['pointerup', 'touchend', 'click']) window.addEventListener(type, () => Voice.unlock(), { capture: true });
