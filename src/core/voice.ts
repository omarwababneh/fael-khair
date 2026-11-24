// Voice.say(lineId):
//  1. If public/assets/audio/vo/<lineId>.m4a exists, play it.
//  2. Otherwise speak the line's `tts` text with the phone's Arabic voice (rate 0.9).
//  3. Always show the text in the speech bubble at the same time.
// If the phone has no Arabic voice, show the text only (never another language's voice).
import { audio } from './audio';
import { hasAudio } from './assets';
import { getLine } from './content';
import { music } from './music';
import { ui } from './ui';

const synth: SpeechSynthesis | null = 'speechSynthesis' in window ? window.speechSynthesis : null;

function readingTime(text: string): number {
  return Math.max(1800, text.length * 85 + 700);
}

class VoiceSystem {
  private voice: SpeechSynthesisVoice | null = null;
  private token = 0;
  private finishCurrent: (() => void) | null = null;
  private source: AudioBufferSourceNode | null = null;
  private utter: SpeechSynthesisUtterance | null = null;
  private timers: number[] = [];
  lastId: string | null = null;

  /** Find the first voice whose language starts with "ar". */
  private pick(): void {
    if (this.voice || !synth) return;
    const v = synth.getVoices().find((x) => (x.lang || '').toLowerCase().startsWith('ar'));
    if (v) this.voice = v;
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
  }

  /** For the parents' corner: which Arabic voice the phone offers, if any. */
  get voiceLabel(): string | null {
    this.pick();
    return this.voice ? `${this.voice.name} (${this.voice.lang})` : null;
  }

  /** Speak one silent utterance inside the first tap, which unlocks speech on iOS. */
  unlock(): void {
    if (!synth) return;
    try {
      const u = new SpeechSynthesisUtterance(' ');
      u.volume = 0;
      if (this.voice) u.voice = this.voice;
      synth.speak(u);
    } catch {
      /* ignore */
    }
  }

  /** Resolves when the line has finished (or was replaced or stopped). */
  say(id: string): Promise<void> {
    this.stop(false);
    this.pick(); // voices can arrive late on iOS; look again before every line
    const token = ++this.token;
    this.lastId = id;
    const line = getLine(id);
    const recorded = hasAudio('vo', id);
    const text = recorded ? line.script : line.tts;
    ui.showBubble(text, () => void this.say(id));
    ui.setSpeaking(true);
    music.duck(true);

    return new Promise<void>((resolve) => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        if (token === this.token) {
          this.clearTimers();
          ui.setSpeaking(false);
          music.duck(false);
          this.finishCurrent = null;
        }
        resolve();
      };
      this.finishCurrent = finish;

      const textOnly = () => this.timers.push(window.setTimeout(finish, readingTime(text)));
      const speak = () => {
        if (!synth || !this.voice || !line.speakable || !line.tts) return textOnly();
        const u = new SpeechSynthesisUtterance(line.tts);
        u.voice = this.voice;
        u.lang = this.voice.lang;
        u.rate = 0.9;
        u.onend = finish;
        u.onerror = finish;
        this.utter = u; // keep a reference: iOS drops events of collected utterances
        // Safety net in case the end event never arrives.
        this.timers.push(window.setTimeout(finish, readingTime(line.tts) * 1.8 + 3000));
        synth.speak(u);
      };

      if (recorded && audio.ready && audio.ctx) {
        const ctx = audio.ctx;
        void audio.load(`assets/audio/vo/${id}.m4a`).then((buf) => {
          if (token !== this.token || done) return;
          if (!buf) return speak();
          const src = ctx.createBufferSource();
          src.buffer = buf;
          src.connect(audio.buses.voice);
          src.onended = finish;
          this.source = src;
          src.start();
          this.timers.push(window.setTimeout(finish, buf.duration * 1000 + 1500));
        });
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
    if (this.source) {
      try { this.source.stop(); } catch { /* already stopped */ }
      this.source = null;
    }
    if (synth && (synth.speaking || synth.pending)) synth.cancel();
    this.utter = null;
    const f = this.finishCurrent;
    this.finishCurrent = null;
    f?.();
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
