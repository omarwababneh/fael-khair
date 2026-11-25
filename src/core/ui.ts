// Interface chrome drawn as HTML on top of the game canvas, so it stays crisp,
// right-to-left, and inside the iPhone safe area.
import parentsJson from '../../content/parents.json';
import linesContent from '../../content/lines.json';
import { getLine, registry } from './content';

const parentsContent = parentsJson as {
  starters: Record<string, string[]>;
  invitation: string;
  secret_note: { place: string; intro: string; text: string };
  music_credit: { text: string; tracks: string[] };
};

type SoundMode = 'music' | 'nature' | 'off';
type MusicVolume = 'quiet' | 'medium';
type VoiceSpeed = 'slower' | 'normal' | 'faster';

const ICONS = {
  home: `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M4 15.5 16 5l12 10.5" fill="none" stroke="#4a2c17" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 13.5V27h6v-7h4v7h6V13.5" fill="#c8623a" stroke="#4a2c17" stroke-width="2.6" stroke-linejoin="round"/></svg>`,
  speaker: `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M5 12h5l7-6v20l-7-6H5z" fill="#c8623a" stroke="#4a2c17" stroke-width="2.4" stroke-linejoin="round"/><path d="M21 11.5c1.6 1.2 2.5 2.8 2.5 4.5s-.9 3.3-2.5 4.5M24.5 8c2.6 2.1 4 4.9 4 8s-1.4 5.9-4 8" fill="none" stroke="#4a2c17" stroke-width="2.4" stroke-linecap="round"/></svg>`,
  lock: `<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="4" y="9" width="12" height="9" rx="2" fill="#4a2c17"/><path d="M6.5 9V6.5a3.5 3.5 0 0 1 7 0V9" fill="none" stroke="#4a2c17" stroke-width="2"/></svg>`,
};

const PLACE_NAMES: Record<string, string> = { petra: 'البَتْرا', ummqais: 'أُمّ قَيْس', amman: 'عَمّان', irbid: 'إِرْبِد', jerash: 'جَرَش', deadsea: 'البَحْر المَيِّت', aqaba: 'العَقَبة' };

function section(title: string, ...children: HTMLElement[]): HTMLDetailsElement {
  const d = el('details', 'fk-section');
  const s = el('summary', '');
  s.textContent = title;
  d.append(s, ...children);
  return d;
}

/**
 * Parents' corner sections (GAME_SPEC.md section 10). Nothing here is about the
 * child: no statistics, no history of what he chose, nothing tracked.
 */
function parentSections(): HTMLElement[] {
  // Conversation starters, three per place.
  const talk: HTMLElement[] = [];
  for (const [id, qs] of Object.entries(parentsContent.starters)) {
    const h = el('h3', '');
    h.textContent = PLACE_NAMES[id] ?? id;
    const ul = el('ul', '');
    for (const q of qs) {
      const li = el('li', '');
      li.textContent = q;
      ul.append(li);
    }
    talk.push(h, ul);
    // Under Irbid: good and bad secrets, for the parent to say in his own words.
    if (id === parentsContent.secret_note.place) {
      const intro = el('p', 'fk-secret-intro');
      intro.textContent = parentsContent.secret_note.intro;
      const text = el('p', 'fk-secret');
      text.textContent = parentsContent.secret_note.text;
      talk.push(intro, text);
    }
  }
  // An optional invitation: never tracked, confirmed or tied to the game.
  const inv = el('p', 'fk-invite');
  inv.textContent = parentsContent.invitation;
  // Recording guide: every line the father can record, by file name.
  const note = el('p', '');
  note.textContent = 'سجّل كل جملة بصوتك، واحفظها باسمها (مثلاً start.m4a) داخل مجلد:';
  const path = el('p', 'fk-path');
  path.textContent = 'public/assets/audio/vo/';
  const note2 = el('p', '');
  note2.textContent = 'اللعبة بتستعمل تسجيلك تلقائياً بدل صوت الجهاز. الآية الكريمة لا تُقرأ بصوت الجهاز أبداً.';
  const list = el('ul', 'fk-lines');
  for (const id of Object.keys(linesContent)) {
    const line = getLine(id);
    if (!line.speakable && !line.script) continue;
    const li = el('li', '');
    const file = el('span', 'fk-file');
    file.textContent = `${id}.m4a`;
    const txt = el('span', '');
    txt.textContent = line.script;
    li.append(file, txt);
    list.append(li);
  }
  // Review status of the religious content registry.
  const pending = registry.filter((r) => r.approval_status !== 'approved').length;
  const review = el('p', '');
  review.textContent = pending
    ? `${pending} من ${registry.length} نصوص دينية بانتظار مراجعتك في content/registry.json.`
    : 'كل النصوص الدينية تمّت مراجعتها.';
  return [
    section('أسئلة للحديث مع ابنك', ...talk),
    section('فكرة لليوم', inv),
    section('دليل التسجيل', note, path, note2, list),
    section('مراجعة النصوص الدينية', review),
  ];
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, html = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  e.className = cls;
  if (html) e.innerHTML = html;
  return e;
}

/** Fire on pointerdown for instant response (within one frame). */
function onPress(btn: HTMLElement, fn: () => void): void {
  btn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    fn();
  });
}

class UI {
  readonly root = document.getElementById('ui') as HTMLDivElement;
  private pill = el('div', 'fk-pill');
  private home = el('button', 'fk-round fk-home', ICONS.home);
  private bubble = el('div', 'fk-bubble is-empty');
  private bubbleText = el('div', 'fk-bubble-text');
  private speaker = el('button', 'fk-round fk-speaker', ICONS.speaker);
  private onHome: (() => void) | null = null;
  private onReplay: (() => void) | null = null;

  constructor() {
    this.home.setAttribute('aria-label', 'البيت');
    this.speaker.setAttribute('aria-label', 'اسمع مرة ثانية');
    this.bubble.append(this.bubbleText, this.speaker);
    this.pill.hidden = true;
    this.home.hidden = true;
    this.root.append(this.pill, this.home, this.bubble);
    onPress(this.home, () => this.onHome?.());
    onPress(this.speaker, () => this.onReplay?.());
  }

  setPill(text: string | null): void {
    this.pill.hidden = !text;
    this.pill.textContent = text ?? '';
  }

  setHome(fn: (() => void) | null): void {
    this.onHome = fn;
    this.home.hidden = !fn;
  }

  showBubble(text: string, onReplay: () => void): void {
    this.onReplay = onReplay;
    this.bubbleText.textContent = text;
    this.bubbleText.classList.toggle('is-long', text.length > 60);
    this.bubble.classList.remove('is-empty');
  }

  setSpeaking(on: boolean): void {
    this.bubble.classList.toggle('is-speaking', on);
  }

  clearBubble(): void {
    this.onReplay = null;
    this.bubble.classList.add('is-empty');
    this.bubble.classList.remove('is-speaking');
  }

  /** Start screen: title and one big button. */
  showStart(onGo: () => void): () => void {
    const wrap = el('div', 'fk-start');
    const title = el('div', 'fk-title');
    title.textContent = 'فاعل خير';
    const go = el('button', 'fk-go');
    go.textContent = 'يَلّا';
    // click (not pointerdown) so iOS treats it as a full user gesture for audio and speech.
    go.addEventListener('click', (e) => {
      e.preventDefault();
      onGo();
    });
    wrap.append(title, go);
    this.root.append(wrap);
    return () => wrap.remove();
  }

  /**
   * Two choice buttons of identical size, color and weight (Amman). Their order
   * is shuffled each time so that position hints at nothing.
   */
  showChoice(labels: [string, string], onPick: (index: 0 | 1) => void): () => void {
    const wrap = el('div', 'fk-choice');
    const order: Array<0 | 1> = Math.random() < 0.5 ? [0, 1] : [1, 0];
    for (const i of order) {
      const b = el('button', 'fk-choice-btn');
      b.textContent = labels[i];
      b.addEventListener('click', (e) => {
        e.preventDefault();
        wrap.remove();
        onPick(i);
      });
      wrap.append(b);
    }
    this.root.append(wrap);
    return () => wrap.remove();
  }

  /** One large button above the speech bubble. */
  showAction(label: string, onTap: () => void): () => void {
    const wrap = el('div', 'fk-choice');
    const b = el('button', 'fk-choice-btn');
    b.textContent = label;
    b.addEventListener('click', (e) => {
      e.preventDefault();
      wrap.remove();
      onTap();
    });
    wrap.append(b);
    this.root.append(wrap);
    return () => wrap.remove();
  }

  /**
   * The ayah: a still, respectful text block (GAME_SPEC.md sections 2 and 4E).
   * It only fades in and out. It cannot be touched, dragged or collected.
   */
  showAyah(text: string, reference: string): { hide: (ms: number) => Promise<void> } {
    const wrap = el('div', 'fk-ayah');
    // Hidden from screen readers too: no synthetic voice may ever read the ayah.
    wrap.setAttribute('aria-hidden', 'true');
    const t = el('p', 'fk-ayah-text');
    t.textContent = text;
    const r = el('p', 'fk-ayah-ref');
    r.textContent = reference;
    wrap.append(t, r);
    this.root.append(wrap);
    requestAnimationFrame(() => wrap.classList.add('is-shown'));
    return {
      hide: (ms: number) => new Promise((res) => {
        wrap.style.transitionDuration = `${ms}ms`;
        wrap.classList.remove('is-shown');
        window.setTimeout(() => { wrap.remove(); res(); }, ms + 50);
      }),
    };
  }

  /** The closing button of the day. */
  showDone(label: string, onTap: () => void): () => void {
    const wrap = el('div', 'fk-done-wrap');
    const b = el('button', 'fk-go fk-done');
    b.textContent = label;
    b.addEventListener('click', (e) => {
      e.preventDefault();
      wrap.remove();
      onTap();
    });
    wrap.append(b);
    this.root.append(wrap);
    return () => wrap.remove();
  }

  /** Small lock button: hold for 3 seconds (a ring fills) to open the parent area. */
  showLock(onOpen: () => void): () => void {
    const btn = el('button', 'fk-lock');
    btn.setAttribute('aria-label', 'للأهل');
    const r = 24, c = 2 * Math.PI * r;
    btn.innerHTML = `<svg class="fk-lock-ring" viewBox="0 0 56 56"><circle cx="28" cy="28" r="${r}" stroke-dasharray="${c}" stroke-dashoffset="${c}"/></svg><span class="fk-lock-icon">${ICONS.lock}</span>`;
    const ring = btn.querySelector('circle') as SVGCircleElement;
    let start = 0, raf = 0;
    const reset = () => {
      cancelAnimationFrame(raf);
      start = 0;
      ring.style.strokeDashoffset = String(c);
    };
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / 3000);
      ring.style.strokeDashoffset = String(c * (1 - p));
      if (p >= 1) {
        reset();
        onOpen();
      } else raf = requestAnimationFrame(tick);
    };
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      btn.setPointerCapture?.(e.pointerId);
      start = performance.now();
      raf = requestAnimationFrame(tick);
    });
    for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) btn.addEventListener(ev, reset);
    this.root.append(btn);
    return () => { reset(); btn.remove(); };
  }

  /** A row of options: the chosen one is pressed. Tapping one calls onPick. */
  private options<T extends string>(items: Array<[T, string]>, current: T, onPick: (v: T) => void): HTMLDivElement {
    const wrap = el('div', 'fk-options');
    const btns = items.map(([key, text]) => {
      const b = el('button', 'fk-speed');
      b.textContent = text;
      b.setAttribute('aria-pressed', String(key === current));
      b.addEventListener('click', () => {
        for (const x of btns) x.setAttribute('aria-pressed', String(x === b));
        onPick(key);
      });
      return b;
    });
    wrap.append(...btns);
    return wrap;
  }

  /** Parents' corner (GAME_SPEC.md section 10). */
  openParent(opts: {
    sound: SoundMode; volume: MusicVolume; voice: string | null; speed: VoiceSpeed;
    onSound: (m: SoundMode) => void; onVolume: (v: MusicVolume) => void; onSpeed: (s: VoiceSpeed) => void; onClose: () => void;
  }): void {
    const wrap = el('div', 'fk-parent');
    const card = el('div', 'fk-parent-card');
    const h = el('h2', '');
    h.textContent = 'للأهل';
    // Sound choice: cheerful music (default), nature sounds only, or off. Plus the music volume.
    const soundGroup = el('div', 'fk-group');
    const soundLabel = el('span', '');
    soundLabel.textContent = 'الصوت بالخلفية';
    const volumeRow = el('div', 'fk-row');
    const volumeLabel = el('span', '');
    volumeLabel.textContent = 'علوّ الموسيقى';
    const volume = this.options<MusicVolume>([['quiet', 'واطي'], ['medium', 'متوسط']], opts.volume, opts.onVolume);
    volumeRow.append(volumeLabel, volume);
    const showVolume = (m: SoundMode) => { volumeRow.hidden = m === 'off'; };
    showVolume(opts.sound);
    const sound = this.options<SoundMode>(
      [['music', 'موسيقى مرحة'], ['nature', 'أصوات الطبيعة فقط'], ['off', 'بدون']],
      opts.sound,
      (m) => { showVolume(m); opts.onSound(m); },
    );
    soundGroup.append(soundLabel, sound);
    // Voice speed: tap one to hear a sample at that speed.
    const speedRow = el('div', 'fk-row');
    const speedLabel = el('span', '');
    speedLabel.textContent = 'سرعة الصوت';
    const speeds = this.options<VoiceSpeed>([['slower', 'أبطأ'], ['normal', 'عادي'], ['faster', 'أسرع']], opts.speed, opts.onSpeed);
    speedRow.append(speedLabel, speeds);
    const voice = el('div', 'fk-voice-status');
    voice.textContent = opts.voice
      ? `صوت الجهاز العربي: ${opts.voice}`
      : 'ما في صوت عربي على الجهاز. الكلام بيظهر مكتوب بس.';
    const close = el('button', 'fk-close');
    close.textContent = 'رجوع';
    close.addEventListener('click', () => {
      wrap.remove();
      opts.onClose();
    });
    const build = el('div', 'fk-build');
    build.textContent = `نسخة: \u2066${__BUILD__}\u2069`;
    // The music license requires this credit (MISSIONS_V2.md section 9).
    const credit = el('div', 'fk-credit');
    credit.textContent = `${parentsContent.music_credit.text} Tracks: ${parentsContent.music_credit.tracks.join(', ')}.`;
    // The longer sections fold away so the card stays short.
    const scroll = el('div', 'fk-parent-scroll');
    scroll.append(voice, ...parentSections());
    card.append(h, soundGroup, volumeRow, speedRow, scroll, credit, build, close);
    wrap.append(card);
    wrap.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.root.append(wrap);
  }
}

export const ui = new UI();
