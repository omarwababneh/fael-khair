// Interface chrome drawn as HTML on top of the game canvas, so it stays crisp,
// right-to-left, and inside the iPhone safe area.
import parentsJson from '../../content/parents.json';
import linesContent from '../../content/lines.json';
import { getLine, registry, type Paraphrase } from './content';
import { audio } from './audio';
import { music } from './music';
import { canRecord, recordings, startRecording } from './recordings';

// The one recording in progress (only one at a time), so it can always be
// stopped: on its own button, when the parents' corner closes, or when the app
// goes to the background. The microphone is never left on.
let stopActive: (() => Promise<void>) | null = null;
let stopPlayback: (() => void) | null = null;
export function stopRecorder(): Promise<void> {
  stopPlayback?.();
  stopPlayback = null;
  return stopActive ? stopActive() : Promise.resolve();
}
window.addEventListener('pagehide', () => void stopRecorder());
document.addEventListener('visibilitychange', () => { if (document.hidden) void stopRecorder(); });

const parentsContent = parentsJson as {
  /** Three questions for every mission, grouped by place. */
  starters: Record<string, Record<string, string[]>>;
  invitation: string;
  secret_note: { place: string; intro: string; text: string };
  music_credit: { text: string; tracks: string[] };
};

type SoundMode = 'music' | 'nature' | 'off';
type MusicVolume = 'quiet' | 'medium';
type VoiceSpeed = 'slower' | 'normal' | 'faster';
type DayLength = 'long' | 'short';
type LineSource = 'own' | 'file' | 'speech' | 'text';
const SOURCE_AR: Record<LineSource, string> = { own: 'تسجيلك', file: 'الصوت المسجّل باللعبة', speech: 'صوت الجهاز', text: 'مكتوب بس' };
interface VoiceTestInfo { speech: boolean; total: number; arabic: string[]; mode: 'voice' | 'lang' | 'text'; unlock: string; session: string | null }

const ICONS = {
  home: `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M4 15.5 16 5l12 10.5" fill="none" stroke="#4a2c17" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 13.5V27h6v-7h4v7h6V13.5" fill="#c8623a" stroke="#4a2c17" stroke-width="2.6" stroke-linejoin="round"/></svg>`,
  speaker: `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M5 12h5l7-6v20l-7-6H5z" fill="#c8623a" stroke="#4a2c17" stroke-width="2.4" stroke-linejoin="round"/><path d="M21 11.5c1.6 1.2 2.5 2.8 2.5 4.5s-.9 3.3-2.5 4.5M24.5 8c2.6 2.1 4 4.9 4 8s-1.4 5.9-4 8" fill="none" stroke="#4a2c17" stroke-width="2.4" stroke-linecap="round"/></svg>`,
  lock: `<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="4" y="9" width="12" height="9" rx="2" fill="#4a2c17"/><path d="M6.5 9V6.5a3.5 3.5 0 0 1 7 0V9" fill="none" stroke="#4a2c17" stroke-width="2"/></svg>`,
};

const PLACE_NAMES: Record<string, string> = { petra: 'البَتْرا', ummqais: 'أُمّ قَيْس', amman: 'عَمّان', irbid: 'إِرْبِد', jerash: 'جَرَش', deadsea: 'البَحْر المَيِّت', aqaba: 'العَقَبة' };

// Plain Arabic names for the review list (no file or code words).
const MISSION_AR: Record<string, string> = {
  P1: 'البترا: تنظيف الطريق', P2: 'البترا: الكيس الضايع', P3: 'البترا: تحميل العربة', 'QD-P': 'البترا: عمل الخير الخفي',
  U1: 'أم قيس: الكلب العطشان', U2: 'أم قيس: شتلات الزيتون', U3: 'أم قيس: تقسيم الزيتون', 'QD-U': 'أم قيس: عمل الخير الخفي',
  A1: 'عمّان: الجرّة المكسورة', A2: 'عمّان: برج المكعّبات', A3: 'عمّان: أغراض ماما', 'QD-A': 'عمّان: عمل الخير الخفي',
  I1: 'إربد: السلّة السرّية', I2: 'إربد: الباقي الزيادة', I3: 'إربد: الولد الجديد',
  J1: 'جرش: بعد المهرجان', J2: 'جرش: البنت الضايعة', J3: 'جرش: الأكل المنسي', 'QD-J': 'جرش: عمل الخير الخفي',
  D1: 'البحر الميت: الحنفيات', D2: 'البحر الميت: النِّعم', D3: 'البحر الميت: المشي مع جدّو', 'QD-D': 'البحر الميت: عمل الخير الخفي',
  Q1: 'العقبة: السلحفاة', Q2: 'العقبة: الميزان', Q3: 'العقبة: الوعد', 'QD-Q': 'العقبة: عمل الخير الخفي',
  WR: 'ليلة وادي رم', 'Wadi Rum closing line': 'ليلة وادي رم', 'Wadi Rum ayah': 'ليلة وادي رم',
};
const SURAH_AR: Record<string, string> = { '2': 'البقرة', '3': 'آل عمران', '4': 'النساء', '7': 'الأعراف', '14': 'إبراهيم', '17': 'الإسراء', '55': 'الرحمن' };
const PART_AR: Record<string, string> = { mount: 'مساعدة الرجل على دابّته', justice: 'العدل بين اثنين', good_word: 'الكلمة الطيبة', harm: 'إبعاد الأذى عن الطريق' };

/** "bukhari_2472" → "صحيح البخاري، حديث 2472"; "quran_3_190" → "القرآن الكريم، سورة آل عمران، آية 190". */
function referenceAr(id: string): string {
  const [book, a, b] = id.split('_');
  if (book === 'quran') return `القرآن الكريم، سورة ${SURAH_AR[a] ?? a}، آية ${b}`;
  if (book === 'bukhari') return `صحيح البخاري، حديث ${a}`;
  if (book === 'muslim') return `صحيح مسلم، حديث ${a}`;
  if (book === 'tirmidhi') return `جامع الترمذي، حديث ${a} (حسن)`;
  return id;
}
const missionsAr = (ids: string[]): string => ids.map((m) => MISSION_AR[m] ?? m).join('، ');

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
function parentSections(lineSource: (id: string) => LineSource, onSourceChange: () => void): HTMLElement[] {
  // Conversation starters: three for every mission, grouped by place.
  const talk: HTMLElement[] = [];
  for (const [id, missions] of Object.entries(parentsContent.starters)) {
    const h = el('h3', '');
    h.textContent = PLACE_NAMES[id] ?? id;
    talk.push(h);
    for (const [mission, qs] of Object.entries(missions)) {
      const m = el('h4', 'fk-mission');
      // The mission's name without the place ("البترا: الكيس الضايع" → "الكيس الضايع").
      m.textContent = (MISSION_AR[mission] ?? mission).replace(/^[^:]+:\s*/, '');
      const ul = el('ul', '');
      for (const q of qs) {
        const li = el('li', '');
        li.textContent = q;
        ul.append(li);
      }
      talk.push(m, ul);
    }
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
  // Recording guide: every line the father can record, with a recorder beside
  // each one. Recordings stay on this phone only and are never uploaded.
  const note = el('p', '');
  note.textContent = canRecord()
    ? 'سجّل كل جملة بصوتك: اكبس «سجّل»، احكي الجملة، واكبس «وقّف». التسجيل بيضل على هالجهاز بس، وما بينبعت لأي مكان. اللعبة بتشغّل تسجيلك بدل الصوت المسجّل باللعبة.'
    : 'هالجهاز ما بيقدر يسجّل من هون. بتقدر تسجّل كل جملة بملف باسمها (مثلاً start.m4a) داخل مجلد:';
  const path = el('p', 'fk-path');
  path.textContent = 'public/assets/audio/vo/';
  path.hidden = canRecord();
  const note2 = el('p', '');
  note2.textContent = 'الآية الكريمة لا تُقرأ بصوت الجهاز أبداً، ولا تُسجَّل هون.';
  const list = el('ul', 'fk-lines');
  for (const id of Object.keys(linesContent)) {
    const line = getLine(id);
    if (!line.speakable && !line.script) continue;
    if (isQuranText(id)) continue; // never offer recording for Quran text
    const li = el('li', '');
    const file = el('span', 'fk-file');
    file.textContent = `${id}.m4a`;
    const txt = el('span', '');
    txt.textContent = line.script;
    // Which voice this line uses now (it changes when he records or deletes).
    const src = el('span', 'fk-line-source');
    const showSource = () => { src.textContent = `الصوت: ${SOURCE_AR[lineSource(id)]}`; };
    showSource();
    li.append(file, txt, src);
    if (canRecord()) li.append(recorder(id, () => { showSource(); onSourceChange(); }, () => SOURCE_AR[lineSource(id)]));
    list.append(li);
  }
  // Review list: every registry entry not yet approved, with the words the
  // game uses. The father's own lines (kind father_own_words) are reviewed
  // here too and are marked as his words, not a quoted text.
  const pendingEntries = registry.filter((r) => r.approval_status !== 'approved');
  const review = el('p', '');
  review.textContent = pendingEntries.length
    ? `${pendingEntries.length} من ${registry.length} نصوص بانتظار مراجعتك:`
    : 'كل النصوص الدينية تمّت مراجعتها.';
  const reviewList = el('ul', 'fk-lines');
  for (const r of pendingEntries) {
    const li = el('li', '');
    const own = r.kind === 'father_own_words';
    if (own) {
      const mark = el('span', 'fk-review-own');
      mark.textContent = `كلام الأب نفسه، مش نص ديني (${missionsAr(r.used_in)})`;
      li.append(mark);
    } else {
      const head = el('span', 'fk-review-ref');
      head.textContent = referenceAr(r.source_id);
      const where = el('span', 'fk-review-where');
      where.textContent = missionsAr(r.used_in);
      li.append(head, where);
    }
    const texts: [string, Paraphrase][] = r.parts ? Object.entries(r.parts) : [['', r]];
    for (const [part, t] of texts) {
      const txt = el('span', 'fk-review-text');
      const words = t.child_paraphrase_script ?? t.child_paraphrase_tts;
      // An entry with no children's wording (the Wadi Rum ayah) is shown as its
      // exact text, which the owner pastes into original_arabic.
      // An ayah is shown as its exact text (never paraphrased, never spoken by the phone).
      const exact = (r as { original_arabic?: string }).original_arabic;
      txt.textContent = words ?? (exact ? `تُعرض الآية كما هي: ${exact}` : 'هذه الآية تُعرض بنصّها كما هو، ولم يُضَف نصّها بعد.');
      if (part) {
        const label = el('span', 'fk-review-where');
        label.textContent = PART_AR[part] ?? part;
        li.append(label);
      }
      li.append(txt);
    }
    reviewList.append(li);
  }
  return [
    section('أسئلة للحديث مع ابنك', ...talk),
    section('فكرة لليوم', inv),
    section('دليل التسجيل', note, path, note2, list),
    section('مراجعة النصوص الدينية', review, reviewList),
  ];
}

/** A line whose text is Quran itself (the ayah). None of the spoken lines is; this is a guard. */
function isQuranText(id: string): boolean {
  const raw = (linesContent as Record<string, { registry?: string }>)[id];
  const e = raw?.registry ? registry.find((r) => r.source_id === raw.registry) : undefined;
  return !!e && e.source_id.startsWith('quran_') && e.tts === false;
}

/** Record, play and delete buttons for one line. */
function recorder(id: string, changed: () => void, sourceNow: () => string): HTMLElement {
  const row = el('div', 'fk-rec');
  const rec = el('button', 'fk-rec-btn');
  const play = el('button', 'fk-rec-btn');
  const del = el('button', 'fk-rec-btn');
  const status = el('span', 'fk-rec-status');
  play.textContent = 'اسمع';
  del.textContent = 'احذف';
  let session: { stop: () => Promise<Blob | null> } | null = null;
  let busy = false; // asking for the microphone, or saving: ignore taps meanwhile
  const refresh = () => {
    rec.textContent = session ? 'وقّف' : recordings.has(id) ? 'سجّل من جديد' : 'سجّل';
    rec.classList.toggle('is-recording', !!session);
    rec.disabled = busy;
    play.hidden = del.hidden = !recordings.has(id) || !!session;
  };
  /** Stop and keep the recording (or drop it if it is too short). */
  const finish = async () => {
    const s = session;
    if (!s) return;
    session = null;
    stopActive = null;
    busy = true;
    refresh();
    const blob = await s.stop();
    music.duck(false);
    if (blob && blob.size > 800) {
      const ok = await recordings.put(id, blob);
      status.textContent = ok ? 'انحفظ على هالجهاز.' : 'ما قدرت أحفظ التسجيل.';
    } else status.textContent = 'التسجيل قصير كتير، جرّب مرة ثانية.';
    // Recording can change the phone's audio mode; put it back.
    audio.reapplySession();
    busy = false;
    refresh();
    changed();
  };
  rec.addEventListener('click', async () => {
    if (busy) return;
    if (session) return finish();
    busy = true;
    refresh();
    await stopRecorder(); // only one recording at a time
    try {
      status.textContent = 'عم بسجّل…';
      music.duck(true); // the music stays out of the recording
      session = await startRecording();
      stopActive = finish;
    } catch (e) {
      session = null;
      music.duck(false);
      audio.reapplySession();
      status.textContent = `ما قدرت أفتح الميكروفون: ${(e as Error).name || e}`;
    }
    busy = false;
    refresh();
  });
  play.addEventListener('click', async () => {
    const blob = await recordings.get(id);
    const buf = blob ? await audio.decodeBlob(blob) : null;
    if (!buf) {
      status.textContent = 'ما قدرت أشغّل التسجيل.';
      return;
    }
    status.textContent = '';
    stopPlayback?.(); // one at a time
    stopPlayback = audio.playVoiceBuffer(buf).stop;
  });
  del.addEventListener('click', async () => {
    await recordings.remove(id);
    status.textContent = `انحذف. هاي الجملة رح ترجع لـ: ${sourceNow()}.`;
    refresh();
    changed();
  });
  refresh();
  row.append(rec, play, del, status);
  return row;
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
    dayLength: DayLength; onDayLength: (d: DayLength) => void;
    sound: SoundMode; volume: MusicVolume; voice: string | null; speed: VoiceSpeed;
    onSound: (m: SoundMode) => void; onVolume: (v: MusicVolume) => void; onSpeed: (s: VoiceSpeed) => void; onClose: () => void;
    voiceInfo: () => VoiceTestInfo; testVoice: (report: (msg: string) => void) => void;
    testSpeech: (report: (msg: string) => void) => void; lineSource: (id: string) => LineSource;
    throughSilent: boolean; onThroughSilent: (on: boolean) => void;
  }): void {
    const wrap = el('div', 'fk-parent');
    const card = el('div', 'fk-parent-card');
    const h = el('h2', '');
    h.textContent = 'للأهل';
    // Day length: a long day (up to six missions, the default) or a short one (four).
    const dayGroup = el('div', 'fk-group');
    const dayLabel = el('span', '');
    dayLabel.textContent = 'طول اليوم';
    const day = this.options<DayLength>([['long', 'طويل'], ['short', 'قصير']], opts.dayLength, opts.onDayLength);
    const dayNote = el('p', 'fk-voice-note');
    dayNote.textContent = 'طويل: لحد ست مهمات قبل وادي رم، وبعد تلاتة بيقدر يكبس «خلصنا لليوم؟». قصير: أربع مهمات. آخر مهمة باليوم دايماً المهمة الهادية.';
    dayGroup.append(dayLabel, day, dayNote);
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
    // The built-in recordings play at their own speed; only the phone's speech follows this.
    const speedNote = el('p', 'fk-voice-note');
    speedNote.textContent = 'السرعة بتغيّر صوت الجهاز بس، مش الصوت المسجّل باللعبة.';
    const voice = el('div', 'fk-voice-status');
    const mode = opts.voiceInfo().mode;
    voice.textContent = 'اللعبة بتحكي بصوت مسجّل داخلها. صوت الجهاز احتياط بس: ' + (opts.voice
      ? `صوت الجهاز العربي: ${opts.voice}`
      : mode === 'lang'
        ? 'الجهاز ما بيعرض اسم صوت عربي؛ بيحكي بالعربي والجهاز بيختار الصوت.'
        : 'ما في صوت عربي على الجهاز.');
    // Voice test: one built-in file played now through the game's own audio, with
    // what happened; which source each line uses; and, smaller, the phone's speech.
    const test = el('div', 'fk-voice-test');
    const testTitle = el('span', 'fk-voice-test-title');
    testTitle.textContent = 'اختبار الصوت';
    const sources = el('div', 'fk-voice-facts');
    const showSources = () => {
      const n: Record<LineSource, number> = { own: 0, file: 0, speech: 0, text: 0 };
      for (const id of Object.keys(linesContent)) {
        const line = getLine(id);
        if ((!line.speakable && !line.script) || isQuranText(id)) continue;
        n[opts.lineSource(id)]++;
      }
      sources.textContent = (Object.keys(n) as LineSource[])
        .filter((k) => n[k])
        .map((k) => `${SOURCE_AR[k]}: ${n[k]} جملة`)
        .join('\n');
    };
    showSources();
    const facts = el('div', 'fk-voice-facts');
    const showFacts = () => {
      const i = opts.voiceInfo();
      const how = i.mode === 'voice' ? 'بصوت عربي من الجهاز' : i.mode === 'lang' ? 'بالعربي بدون اختيار صوت (الجهاز بيختار)' : 'مكتوب بس، بدون صوت';
      facts.textContent = [
        `الكلام: ${i.speech ? 'متوفر' : 'غير متوفر'}`,
        `عدد الأصوات: ${i.total}`,
        `الأصوات العربية: ${i.arabic.length ? i.arabic.join('، ') : 'ولا واحد ظاهر'}`,
        `صوت الجهاز بيحكي: ${how}`,
        `أول كبسة: ${i.unlock}`,
        `وضع الصوت بالمتصفح: ${i.session ?? 'غير موجود'}`,
      ].join('\n');
    };
    showFacts();
    const testBtn = el('button', 'fk-speed');
    testBtn.textContent = 'جرّب الصوت';
    const result = el('div', 'fk-voice-result');
    testBtn.addEventListener('click', () => {
      result.textContent = 'جاري…';
      opts.testVoice((msg) => { result.textContent = msg; showSources(); });
    });
    // The phone's own speech, only used when a line has no file and no recording.
    const speechRow = el('div', 'fk-voice-speech');
    const speechLabel = el('span', '');
    speechLabel.textContent = 'صوت الجهاز (احتياط)';
    const speechBtn = el('button', 'fk-speed fk-speed-small');
    speechBtn.textContent = 'جرّب صوت الجهاز';
    const speechResult = el('div', 'fk-voice-result');
    speechBtn.addEventListener('click', () => {
      speechResult.textContent = 'جاري…';
      opts.testSpeech((msg) => { speechResult.textContent = msg; showFacts(); });
    });
    speechRow.append(speechLabel, speechBtn);
    const silentRow = el('div', 'fk-row');
    const silentLabel = el('span', '');
    silentLabel.textContent = 'الصوت مع زر الصامت';
    const silent = this.options<'on' | 'off'>([['on', 'شغّال'], ['off', 'مطفي']], opts.throughSilent ? 'on' : 'off', (v) => {
      opts.onThroughSilent(v === 'on');
      showFacts();
    });
    silentRow.append(silentLabel, silent);
    const silentNote = el('p', 'fk-voice-note');
    silentNote.textContent = 'إذا قال «اشتغل» بس ما سمعت شي، جرّب «مطفي» واكبس «جرّب الصوت» مرة ثانية.';
    test.append(testTitle, testBtn, result, sources, silentRow, silentNote, speechRow, speechResult, facts);
    const close = el('button', 'fk-close');
    close.textContent = 'رجوع';
    close.addEventListener('click', () => {
      void stopRecorder(); // never leave the microphone on
      wrap.remove();
      opts.onClose();
    });
    const build = el('div', 'fk-build');
    build.textContent = `نسخة: \u2066${__BUILD__}\u2069`;
    // The music license requires this credit (MISSIONS_V2.md section 9).
    const credit = el('div', 'fk-credit');
    credit.textContent = `${parentsContent.music_credit.text} Tracks: ${parentsContent.music_credit.tracks.join(', ')}.`;
    // Everything between the title and the close button scrolls together, so on a
    // short screen nothing is squeezed out and "رجوع" always stays in reach.
    const scroll = el('div', 'fk-parent-scroll');
    scroll.append(dayGroup, soundGroup, volumeRow, speedRow, speedNote, voice, test, ...parentSections(opts.lineSource, showSources), credit, build);
    card.append(h, scroll, close);
    wrap.append(card);
    wrap.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.root.append(wrap);
  }
}

export const ui = new UI();
