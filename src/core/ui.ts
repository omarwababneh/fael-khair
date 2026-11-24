// Interface chrome drawn as HTML on top of the game canvas, so it stays crisp,
// right-to-left, and inside the iPhone safe area.

const ICONS = {
  home: `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M4 15.5 16 5l12 10.5" fill="none" stroke="#4a2c17" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 13.5V27h6v-7h4v7h6V13.5" fill="#c8623a" stroke="#4a2c17" stroke-width="2.6" stroke-linejoin="round"/></svg>`,
  speaker: `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M5 12h5l7-6v20l-7-6H5z" fill="#c8623a" stroke="#4a2c17" stroke-width="2.4" stroke-linejoin="round"/><path d="M21 11.5c1.6 1.2 2.5 2.8 2.5 4.5s-.9 3.3-2.5 4.5M24.5 8c2.6 2.1 4 4.9 4 8s-1.4 5.9-4 8" fill="none" stroke="#4a2c17" stroke-width="2.4" stroke-linecap="round"/></svg>`,
  lock: `<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="4" y="9" width="12" height="9" rx="2" fill="#4a2c17"/><path d="M6.5 9V6.5a3.5 3.5 0 0 1 7 0V9" fill="none" stroke="#4a2c17" stroke-width="2"/></svg>`,
};

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

  /** Parent area. Milestone 1 holds the music switch; the rest arrives in Milestone 3. */
  openParent(opts: { musicOn: boolean; voice: string | null; speed: 'slower' | 'normal' | 'faster'; onMusic: (on: boolean) => void; onSpeed: (s: 'slower' | 'normal' | 'faster') => void; onClose: () => void }): void {
    const wrap = el('div', 'fk-parent');
    const card = el('div', 'fk-parent-card');
    const h = el('h2', '');
    h.textContent = 'للأهل';
    const row = el('div', 'fk-row');
    const label = el('span', '');
    label.textContent = 'الموسيقى';
    const toggle = el('button', 'fk-toggle');
    const render = (on: boolean) => {
      toggle.setAttribute('aria-pressed', String(on));
      toggle.textContent = on ? 'شغّالة' : 'مطفيّة';
    };
    let on = opts.musicOn;
    render(on);
    toggle.addEventListener('click', () => {
      on = !on;
      render(on);
      opts.onMusic(on);
    });
    row.append(label, toggle);
    // Voice speed: tap one to hear a sample at that speed.
    const speedRow = el('div', 'fk-row');
    const speedLabel = el('span', '');
    speedLabel.textContent = 'سرعة الصوت';
    const speeds = el('div', 'fk-speeds');
    const options: Array<['slower' | 'normal' | 'faster', string]> = [['slower', 'أبطأ'], ['normal', 'عادي'], ['faster', 'أسرع']];
    const speedBtns = options.map(([key, text]) => {
      const b = el('button', 'fk-speed');
      b.textContent = text;
      b.setAttribute('aria-pressed', String(key === opts.speed));
      b.addEventListener('click', () => {
        for (const x of speedBtns) x.setAttribute('aria-pressed', String(x === b));
        opts.onSpeed(key);
      });
      return b;
    });
    speeds.append(...speedBtns);
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
    card.append(h, row, speedRow, voice, build, close);
    wrap.append(card);
    wrap.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.root.append(wrap);
  }
}

export const ui = new UI();
