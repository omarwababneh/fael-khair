import Phaser from 'phaser';
import { motes } from '../../core/fx';
import { addButton, addLabel, replay } from '../../core/labels';
import { music } from '../../core/music';
import { applyAudioSession, audioSessionType } from '../../core/audio';
import { getLine } from '../../core/content';
import { getDayLength, getThroughSilent, getVoiceSpeed, setDayLength, setThroughSilent, setVoiceSpeed } from '../../core/settings';
import { canEndEarly, dayComplete, dayLength, missionFor, session, sunStep, type Place } from '../../core/session';
import { sfx } from '../../core/sfx';
import { ui } from '../../core/ui';
import { view } from '../../core/viewport';
import { Voice } from '../../core/voice';
import { BaseScene, onMap } from '../BaseScene';

interface Pin {
  id: string;
  name: string; // with full vowel marks
  line: string;
  x: number; // pin: on the landmark drawn in bg_map (design frame, 390 x 844)
  y: number;
  lx: number; // label centre: beside the landmark, in empty desert
  ly: number;
  /** A place with missions (all seven are open from the first second). Wadi Rum is the night ending. */
  place?: Place;
}

// Pins sit on the landmarks drawn in bg_map; names sit beside them. Measured on
// the map drawn 390 points wide (top at y = 129.5) and moved with it to its
// place inside the margin (onMap, BaseScene.ts).
const RAW_PINS: Pin[] = [
  { id: 'ummqais', name: 'أُمّ قَيْس', line: 'map_ummqais', x: 76, y: 212, lx: 162, ly: 196, place: 'ummqais' },
  { id: 'irbid', name: 'إِرْبِد', line: 'map_irbid', x: 135, y: 252, lx: 232, ly: 250, place: 'irbid' },
  { id: 'jerash', name: 'جَرَش', line: 'map_jerash', x: 118, y: 298, lx: 232, ly: 300, place: 'jerash' },
  { id: 'amman', name: 'عَمّان', line: 'map_amman', x: 125, y: 342, lx: 246, ly: 362, place: 'amman' },
  { id: 'deadsea', name: 'البَحْر المَيِّت', line: 'map_deadsea', x: 30, y: 412, lx: 118, ly: 424, place: 'deadsea' },
  { id: 'petra', name: 'البَتْرا', line: 'map_petra', x: 138, y: 482, lx: 222, ly: 482, place: 'petra' },
  { id: 'wadirum', name: 'وادي رَمّ', line: 'map_wadirum', x: 172, y: 545, lx: 290, ly: 576 },
  { id: 'aqaba', name: 'العَقَبة', line: 'map_aqaba', x: 62, y: 628, lx: 158, ly: 650, place: 'aqaba' },
];
export const PINS: Pin[] = RAW_PINS.map((p) => {
  const a = onMap(p.x, p.y), b = onMap(p.lx, p.ly);
  return { ...p, x: a.x, y: a.y, lx: b.x, ly: b.y };
});

// The sun's path across the top of the map, from morning to sunset (west).
// The day has four or six steps (the parents' "طول اليوم"); the sun goes from
// the first point to the last in that many equal steps along this path.
const SUN_PATH = [
  { x: 330, y: 112, color: 0xffd84a },
  { x: 268, y: 92, color: 0xffcc40 },
  { x: 200, y: 86, color: 0xffb93a },
  { x: 134, y: 94, color: 0xff9c38 },
  { x: 72, y: 116, color: 0xff7b36 },
].map((s) => ({ ...onMap(s.x, s.y), color: s.color }));
const WARMTH = [0, 0.05, 0.1, 0.15, 0.3];
const DAY_TINT = 0xff9a4a;
const DUSK_TINT = 0xa48ac8; // once the day's quiet deed is done, the sky turns to dusk

/** The sun at a point of the day (0: morning, 1: sunset), between the path's points. */
function sunAt(t: number): { x: number; y: number; color: number; warmth: number } {
  const f = Phaser.Math.Clamp(t, 0, 1) * (SUN_PATH.length - 1);
  const i = Math.min(Math.floor(f), SUN_PATH.length - 2);
  const k = f - i;
  const a = SUN_PATH[i], b = SUN_PATH[i + 1];
  const c = Phaser.Display.Color.Interpolate.ColorWithColor(
    Phaser.Display.Color.ValueToColor(a.color), Phaser.Display.Color.ValueToColor(b.color), 1, k);
  return {
    x: Phaser.Math.Linear(a.x, b.x, k), y: Phaser.Math.Linear(a.y, b.y, k),
    color: Phaser.Display.Color.GetColor(c.r, c.g, c.b),
    warmth: Phaser.Math.Linear(WARMTH[i], WARMTH[i + 1], k),
  };
}

/**
 * Where the sun stands now: one equal step of the day for each mission done. It
 * never goes back toward morning: if the parents make the day longer mid-day,
 * it waits where it is until the new steps pass it.
 */
const sunNow = (): number => Math.max(session.shownSunStep, dayComplete() ? 1 : sunStep() / dayLength());

export class MapScene extends BaseScene {
  private busy = false;
  private idleTimer?: Phaser.Time.TimerEvent;
  private sun!: Phaser.GameObjects.Container;
  private sunDisc!: Phaser.GameObjects.Arc;
  private tint: Phaser.GameObjects.Rectangle | null = null;
  private removeLock: (() => void) | null = null;
  private duskGlow: Phaser.GameObjects.Image | null = null;
  private removeEndEarly: (() => void) | null = null;
  private hits: Array<{ pin: Pin; c: Phaser.GameObjects.Container; label: HTMLElement; pinBox: Phaser.Geom.Rectangle; labelBox: Phaser.Geom.Rectangle }> = [];

  constructor() {
    super('map');
  }

  create(): void {
    // Fields survive a scene restart; clear references to last visit's objects.
    this.tint = null;
    this.duskGlow = null;
    this.idleTimer = undefined;
    this.hits = [];
    this.setup();
    this.busy = false;
    ui.setPill(null);
    ui.setHome(null);
    ui.clearBubble();
    music.play('map');

    const bg = this.addMapPicture('bg_map');
    this.tweens.add({ targets: bg, scale: bg.scale * 1.005, duration: 7000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const v = view();
    this.tint = this.add.rectangle(v.x, v.y, v.w, v.h, 0xff9a4a, 0).setOrigin(0).setDepth(1).setBlendMode(Phaser.BlendModes.MULTIPLY);
    motes(this, v, 2);

    this.makeSun();
    for (const p of PINS) this.makePin(p);

    this.removeLock = ui.showLock(() => this.openParent());
    this.events.once('shutdown', () => {
      this.removeLock?.();
      this.removeLock = null;
      this.removeEndEarly?.();
      this.removeEndEarly = null;
    });

    this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      this.resetIdle();
      this.tapAt(ptr.worldX, ptr.worldY);
    });
    void this.greet();
  }

  protected onLayout(): void {
    if (this.tint) {
      const v = view();
      this.tint.setPosition(v.x, v.y).setSize(v.w, v.h);
    }
  }

  private async greet(): Promise<void> {
    const target = sunNow();
    const from = session.shownSunStep;
    this.placeSun(from, false);
    await this.wait(500);
    if (!this.alive) return;
    if (target !== from) {
      // The only sign of progress: the sun moves one step toward sunset.
      this.placeSun(target, true);
      session.shownSunStep = target;
      await this.wait(1600);
      if (!this.alive) return;
    }
    this.showEndEarly();
    if (!this.busy) {
      const first = !session.greeted;
      session.greeted = true;
      await Voice.say(first ? 'start' : 'map_next');
    }
    this.resetIdle();
  }

  /**
   * A long day can end early: after three missions the map offers "خلصنا لليوم؟".
   * It is never pressed on him and nothing is said about it. If he taps it, the
   * next place he opens plays its quiet deed, and Wadi Rum opens after that.
   */
  private showEndEarly(): void {
    this.removeEndEarly?.();
    this.removeEndEarly = null;
    // Not while a place is opening (he may have tapped one during the sun's step).
    if (this.busy || !this.alive || !canEndEarly()) return;
    // In the empty desert at the lower right, clear of every place and its name,
    // and above the speech bubble.
    const at = onMap(312, 684);
    this.removeEndEarly = addButton('خلصنا لليوم؟', at.x, at.y, 'fk-choice-btn fk-small-btn', () => {
      this.removeEndEarly = null;
      if (this.busy || !this.alive) return;
      session.endEarly = true;
      sfx('pop', { volume: 0.4 });
      // The day is shorter now: the sun stands where this shorter day puts it.
      const t = sunNow();
      this.placeSun(t, true);
      session.shownSunStep = t;
      this.resetIdle();
    });
  }

  private resetIdle(): void {
    this.idleTimer?.remove();
    this.idleTimer = this.time.delayedCall(9000, () => {
      if (this.alive && !this.busy) void Voice.say('map_hint');
    });
  }

  private makeSun(): void {
    const rays = this.add.graphics();
    rays.fillStyle(0xffe27a, 0.55);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      rays.fillTriangle(
        Math.cos(a - 0.12) * 30, Math.sin(a - 0.12) * 30,
        Math.cos(a + 0.12) * 30, Math.sin(a + 0.12) * 30,
        Math.cos(a) * 46, Math.sin(a) * 46,
      );
    }
    const glow = this.add.image(0, 0, 'fx_glow').setDisplaySize(150, 150).setAlpha(0.8);
    this.sunDisc = this.add.circle(0, 0, 25, SUN_PATH[0].color).setStrokeStyle(3, 0x4a2c17);
    this.sun = this.add.container(0, 0, [glow, rays, this.sunDisc]).setDepth(3);
    this.tweens.add({ targets: rays, angle: 360, duration: 40000, repeat: -1 });
    this.tweens.add({ targets: glow, scale: glow.scale * 1.12, duration: 2200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  /** t: the point of the day, 0 (morning) to 1 (the day is done). */
  private placeSun(t: number, animate: boolean): void {
    const s = sunAt(t);
    const warmth = s.warmth;
    const done = t >= 1;
    const tint = done ? DUSK_TINT : DAY_TINT;
    if (!animate) {
      this.sun.setPosition(s.x, s.y);
      this.sunDisc.setFillStyle(s.color);
      this.tint?.setFillStyle(tint, warmth);
      if (done) this.wadiRumGlows();
      return;
    }
    // The sun moves with a soft breath of air, never a chime: a finished deed has no reward sound.
    sfx('whoosh', { volume: 0.25 });
    if (done) this.time.delayedCall(1500, () => this.alive && this.wadiRumGlows());
    this.tweens.add({ targets: this.sun, x: s.x, y: s.y, duration: 1500, ease: 'Sine.easeInOut' });
    this.tweens.addCounter({
      from: 0, to: 1, duration: 1500,
      onUpdate: (tw) => {
        const c = Phaser.Display.Color.Interpolate.ColorWithColor(
          Phaser.Display.Color.ValueToColor(this.sunDisc.fillColor),
          Phaser.Display.Color.ValueToColor(s.color), 1, tw.getValue() ?? 0);
        this.sunDisc.setFillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b));
        this.tint?.setFillStyle(tint, Phaser.Math.Linear(this.tint.fillAlpha, warmth, tw.getValue() ?? 0));
      },
    });
  }

  /** Once the day's quiet deed is done, the Wadi Rum pin glows softly: the night is ready. */
  private wadiRumGlows(): void {
    if (this.duskGlow) return;
    const p = PINS.find((x) => x.id === 'wadirum');
    if (!p) return;
    const g = this.add.image(p.x, p.y, 'fx_glow').setDisplaySize(110, 110).setDepth(9).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: g, alpha: { from: 0.45, to: 0.9 }, scale: g.scale * 1.12, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.duskGlow = g;
  }

  private makePin(p: Pin): void {
    // Every place looks the same: nothing marks what is built, locked or played.
    const big = !!p.place;
    const r = big ? 17 : 13;
    const ring = this.add.image(0, 0, 'fx_ring').setDisplaySize(r * 3.2, r * 3.2).setAlpha(big ? 0.9 : 0.6);
    const dot = this.add.circle(0, 0, r * 0.55, big ? 0xc8623a : 0xfbf1dc).setStrokeStyle(3, 0x4a2c17);
    // The place name is HTML (see core/labels.ts); the pin itself is drawn here.
    const label = addLabel(p.name, p.lx, p.ly, 'fk-pin-label');
    const lw = Math.max(56, label.offsetWidth);
    const lh = Math.max(40, label.offsetHeight);
    const c = this.add.container(p.x, p.y, [ring, dot]).setDepth(10);
    // Tap area: the pin (a 56-point square) plus the name's box. Overlaps are
    // settled by whichever pin or name is closest to the finger (see tapAt).
    this.hits.push({
      pin: p, c, label,
      pinBox: new Phaser.Geom.Rectangle(p.x - 28, p.y - 28, 56, 56),
      labelBox: new Phaser.Geom.Rectangle(p.lx - lw / 2 - 4, p.ly - lh / 2 - 4, lw + 8, lh + 8),
    });
    // Gentle life: every pin breathes a little, out of step with the others.
    this.tweens.add({ targets: ring, scale: ring.scale * 1.15, duration: 1300 + Math.random() * 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: Math.random() * 800 });

  }

  /** The place whose pin or name is closest to the finger, among those it touches. */
  private tapAt(x: number, y: number): void {
    const dist = (r: Phaser.Geom.Rectangle) => {
      const dx = Math.max(r.x - x, 0, x - r.right), dy = Math.max(r.y - y, 0, y - r.bottom);
      return Math.hypot(dx, dy) + Math.hypot(x - r.centerX, y - r.centerY) * 0.01;
    };
    let best: (typeof this.hits)[number] | null = null;
    let bestD = Infinity;
    for (const h of this.hits) {
      if (!h.pinBox.contains(x, y) && !h.labelBox.contains(x, y)) continue;
      const d = Math.min(dist(h.pinBox), dist(h.labelBox));
      if (d < bestD) { bestD = d; best = h; }
    }
    if (best) void this.tapPin(best.pin, best.c, best.label);
  }

  private async tapPin(p: Pin, c: Phaser.GameObjects.Container, label: HTMLElement): Promise<void> {
    if (this.busy) return;
    sfx('pop', { volume: 0.5 });
    this.tweens.add({ targets: c, scale: { from: 1.3, to: 1 }, duration: 450, ease: 'Back.easeOut' });
    this.tweens.add({ targets: c, y: { from: p.y - 14, to: p.y }, duration: 450, ease: 'Bounce.easeOut' });
    replay(label, 'is-bouncing');
    // Wadi Rum is scenery until the day's quiet deed is done; then it opens
    // the night ending. A place played today, or one with nothing built yet, is
    // scenery with a voice: it bounces and says its name.
    const run = p.place ? missionFor(p.place) : null;
    const scene = p.id === 'wadirum' ? (dayComplete() ? 'wadirum' : undefined) : run?.scene;
    if (!scene) {
      void Voice.say(p.line);
      return;
    }
    this.busy = true;
    this.removeEndEarly?.();
    this.removeEndEarly = null;
    session.current = run;
    sfx('whoosh');
    const said = Voice.say(p.line);
    await Promise.race([said, this.wait(3500)]);
    if (!this.alive) return;
    this.goTo(scene);
  }

  private openParent(): void {
    this.busy = true;
    Voice.stop(false);
    ui.openParent({
      dayLength: getDayLength(),
      onDayLength: (d) => setDayLength(d),
      sound: music.soundMode,
      volume: music.musicVolume,
      voice: Voice.voiceLabel,
      speed: getVoiceSpeed(),
      onSpeed: (sp) => {
        setVoiceSpeed(sp);
        void Voice.say('map_next'); // a sample at the new speed
      },
      voiceInfo: () => ({ ...Voice.info(), session: audioSessionType() }),
      // The main test plays the built-in file of the start line through the game's
      // own audio; the smaller one tries the phone's speech.
      testVoice: (report) => void Voice.testFile('start', report),
      testSpeech: (report) => Voice.test(getLine('map_next').tts, report),
      lineSource: (id) => Voice.source(id),
      throughSilent: getThroughSilent(),
      onThroughSilent: (on) => {
        setThroughSilent(on);
        applyAudioSession();
      },
      onSound: (m) => music.setSoundMode(m),
      onVolume: (v) => music.setVolume(v),
      onClose: () => {
        this.busy = false;
        // A changed day length moves the sun to where the new day puts it, and
        // shows or hides "خلصنا لليوم؟".
        const t = sunNow();
        if (t !== session.shownSunStep) {
          this.placeSun(t, true);
          session.shownSunStep = t;
        }
        this.showEndEarly();
        this.resetIdle();
      },
    });
  }
}
