import Phaser from 'phaser';
import { fitHeight, hasAudio } from '../../core/assets';
import { audio } from '../../core/audio';
import { registry } from '../../core/content';
import { addButton } from '../../core/labels';
import { music } from '../../core/music';
import { nightAmbience, setSfxMuted, sfx } from '../../core/sfx';
import { ui } from '../../core/ui';
import { view } from '../../core/viewport';
import { Voice } from '../../core/voice';
import { BaseScene } from '../BaseScene';

// Wadi Rum: the night sky (value: reflection on creation and gratitude;
// source quran_3_190). Slow and quiet: no goal, no count.
//
// The ayah rules (GAME_SPEC.md sections 2 and 4.4): it is shown only here, as
// still text; never animated as a prize, never draggable or collectible; never
// read by a synthetic voice. All game input and all sound effects stop before it
// appears. There is no music at all in Wadi Rum (MISSIONS_V2.md section 7):
// wind and a few crickets only, and only a soft wind stays under the ayah.
//
// Order: wr_open, then wr_draw: he can drag from star to star to draw glowing
// lines (no target shape, no judgment; a light effect only). It ends when he taps
// "يلّا", or by itself after 20 seconds without a touch, and at the latest after
// 90 seconds. Every line and effect then fades out completely -> input and sound
// effects off -> the father's closing line (quran_2_215) -> silence -> the ayah
// (nothing moves or responds while it shows) -> "تصبح على خير يا حبيبي." and the
// button "خلصنا لليوم". No summary of the day.

const BOY = { x: 195, y: 712, h: 150 };
const SKY_BOTTOM = 560; // the sky fills the upper two thirds of bg_wadirum_night
const DRAW_IDLE_MS = 20000; // the drawing ends by itself after this long without a touch
const DRAW_MAX_MS = 90000; // ...and at the latest after this long
const FADE_MS = 1600; // the lines and stars fade out completely before the closing line
const SILENT_AYAH_MS = 10000; // without a recitation file, the ayah is shown in silence
/** Touching within this many points of a star starts or joins a line there (a 60-point area). */
const STAR_HIT = 30;
// The stars to draw between: soft light points in the open sky, clear of the rocks
// (whose top runs from about y 306 at the left to 488 at the right of
// bg_wadirum_night) and of the name pill. A loose scatter, no shape in it. The
// painted sky has only two stars inside the portrait frame; one is at (119, 186).
const STARS = [
  { x: 52, y: 128 }, { x: 128, y: 112 }, { x: 210, y: 140 }, { x: 292, y: 118 }, { x: 352, y: 172 },
  { x: 30, y: 214 }, { x: 119, y: 186 }, { x: 178, y: 228 }, { x: 258, y: 206 }, { x: 334, y: 252 },
  { x: 58, y: 262 }, { x: 140, y: 296 }, { x: 222, y: 320 }, { x: 300, y: 302 }, { x: 362, y: 338 },
];

interface Star { x: number; y: number; dot: Phaser.GameObjects.Image; halo: Phaser.GameObjects.Image }

export class WadiRumScene extends BaseScene {
  private playing = false;
  private drawing = false;
  private lastTouch = 0;
  private night: ReturnType<typeof nightAmbience> | null = null;
  private removeDone: (() => void) | null = null;
  private removeGo: (() => void) | null = null;
  private lastSpark = 0;
  private stars: Star[] = [];
  private from: Star | null = null;
  private segments: Array<[Star, Star]> = [];
  private lines: Phaser.GameObjects.Graphics | null = null;
  private live: Phaser.GameObjects.Graphics | null = null;
  private twinkle: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private sparks: Phaser.GameObjects.Image[] = [];
  private calm: Phaser.Tweens.Tween[] = [];

  constructor() {
    super('wadirum');
  }

  create(): void {
    this.setup();
    this.playing = false;
    this.drawing = false;
    this.night = null;
    this.removeDone = null;
    this.removeGo = null;
    this.stars = [];
    this.from = null;
    this.segments = [];
    this.sparks = [];
    this.calm = [];

    ui.setPill('وادي رَمّ');
    ui.setHome(() => this.goTo('map'));
    ui.clearBubble();
    music.stop(1.5); // no music at all in Wadi Rum
    setSfxMuted(false, 0.3);
    this.night = nightAmbience();
    this.events.once('leave', () => this.cleanUp());
    this.events.once('shutdown', () => this.cleanUp());

    const bg = this.addCover('bg_wadirum_night');
    this.calm.push(this.tweens.add({ targets: bg, scale: bg.scale * 1.01, duration: 12000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }));

    // The boy sits on a rock, seen from behind, looking up.
    const boy = this.add.image(BOY.x, BOY.y, 'boy_sit_back').setOrigin(0.5, 1).setDepth(30);
    fitHeight(boy, BOY.h);
    this.calm.push(this.tweens.add({ targets: boy, scaleY: boy.scaleY * 1.012, duration: 2200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }));

    // Faint twinkles everywhere, so the sky is never perfectly still.
    const v = view();
    const twinkle = this.add.particles(0, 0, 'fx_dot', {
      x: { min: v.x, max: v.right },
      y: { min: v.y + 60, max: SKY_BOTTOM },
      scale: { min: 0.08, max: 0.22 },
      alpha: { onEmit: () => 0, onUpdate: (_p: unknown, _k: string, t: number) => Math.sin(t * Math.PI) * 0.8 },
      lifespan: { min: 1800, max: 3600 },
      frequency: 140,
      blendMode: Phaser.BlendModes.ADD,
    });
    twinkle.setDepth(10);
    this.twinkle = twinkle;

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.touch(p, true));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => p.isDown && this.touch(p, false));
    this.input.on('pointerup', () => this.release());
    this.input.on('pointerupoutside', () => this.release());

    this.time.addEvent({ delay: 5200, loop: true, callback: () => this.playing && Math.random() < 0.75 && this.shootingStar() });
    void this.begin();
  }

  private cleanUp(): void {
    this.night?.stop();
    this.night = null;
    this.removeDone?.();
    this.removeDone = null;
    this.removeGo?.();
    this.removeGo = null;
    setSfxMuted(false, 0.3);
  }

  private async begin(): Promise<void> {
    await this.wait(600);
    if (!this.alive) return;
    this.playing = true;
    await Voice.say('wr_open');
    if (!this.alive) return;
    await this.wait(800);
    if (!this.alive) return;
    this.startDrawing();
  }

  // ------------------------------------------------------------ star drawing

  /** wr_draw: the stars to draw between come out, with "يلّا" to finish. */
  private startDrawing(): void {
    this.drawing = true;
    // Both limits use the clock, not game time, so they hold even if frames drop.
    this.lastTouch = performance.now();
    const startedAt = performance.now();
    for (const p of STARS) {
      const halo = this.add.image(p.x, p.y, 'fx_glow').setDepth(13).setDisplaySize(34, 34).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD);
      const dot = this.add.image(p.x, p.y, 'fx_dot').setDepth(14).setScale(0.4).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({ targets: halo, alpha: 0.5, duration: 1200, delay: Math.random() * 600 });
      this.tweens.add({ targets: dot, alpha: 0.95, duration: 1200, delay: Math.random() * 600 });
      this.stars.push({ x: p.x, y: p.y, dot, halo });
    }
    this.lines = this.add.graphics().setDepth(12).setBlendMode(Phaser.BlendModes.ADD);
    this.live = this.add.graphics().setDepth(12).setBlendMode(Phaser.BlendModes.ADD);
    void Voice.say('wr_draw');
    // "يلّا" sits on the sand at the lower right: clear of the sky, the stars and the boy.
    this.removeGo = addButton('يلّا', 320, 618, 'fk-choice-btn fk-small-btn fk-narrow-btn', () => {
      this.removeGo = null;
      void this.endDrawing();
    });
    // It ends by itself after 20 seconds without a touch, and at the latest after 90.
    const check = this.time.addEvent({
      delay: 500, loop: true,
      callback: () => {
        if (!this.drawing) return check.remove();
        const now = performance.now();
        if (now - this.lastTouch > DRAW_IDLE_MS || now - startedAt > DRAW_MAX_MS) {
          check.remove();
          void this.endDrawing();
        }
      },
    });
  }

  private starAt(x: number, y: number): Star | null {
    let best: Star | null = null;
    let bestD = STAR_HIT;
    for (const s of this.stars) {
      const d = Phaser.Math.Distance.Between(x, y, s.x, s.y);
      if (d < bestD) { bestD = d; best = s; }
    }
    return best;
  }

  /** A star he reaches glows a little brighter for a moment (the same every time). */
  private glowStar(s: Star): void {
    // Stopping its tweens also stops a fade-in still under way: show it fully.
    this.tweens.killTweensOf(s.dot);
    s.dot.setScale(0.4).setAlpha(0.95);
    this.tweens.add({ targets: s.dot, scale: 0.62, duration: 160, yoyo: true, ease: 'Sine.easeOut' });
  }

  private drawLines(): void {
    const g = this.lines;
    if (!g) return;
    g.clear();
    for (const [a, b] of this.segments) {
      g.lineStyle(9, 0xfff1c4, 0.18).lineBetween(a.x, a.y, b.x, b.y);
      g.lineStyle(3, 0xffffff, 0.85).lineBetween(a.x, a.y, b.x, b.y);
    }
  }

  /**
   * His finger in the sky. From a star, a line follows the finger and joins the
   * next star it reaches; anywhere else, the sky brightens where it passes.
   */
  private touch(p: Phaser.Input.Pointer, first: boolean): void {
    if (!this.playing) return;
    this.lastTouch = performance.now();
    const x = p.worldX, y = p.worldY;
    if (this.drawing) {
      const s = this.starAt(x, y);
      if (first) {
        this.from = s;
        if (s) {
          this.glowStar(s);
          sfx('twinkle', { volume: 0.3 });
        }
      } else if (this.from && s && s !== this.from) {
        const a = this.from;
        if (!this.segments.some(([u, v]) => (u === a && v === s) || (u === s && v === a))) {
          this.segments.push([a, s]);
          this.drawLines();
        }
        this.glowStar(s);
        sfx('twinkle', { volume: 0.3 });
        this.from = s;
      }
      this.live?.clear();
      if (this.from) {
        this.live?.lineStyle(7, 0xfff1c4, 0.14).lineBetween(this.from.x, this.from.y, x, Math.min(y, SKY_BOTTOM));
        this.live?.lineStyle(2.5, 0xffffff, 0.55).lineBetween(this.from.x, this.from.y, x, Math.min(y, SKY_BOTTOM));
        return;
      }
    }
    this.sparkle(x, y);
  }

  private release(): void {
    this.from = null;
    this.live?.clear();
  }

  /** Stars brighten where his finger passes. */
  private sparkle(x: number, y: number): void {
    if (y > SKY_BOTTOM) return;
    if (this.time.now - this.lastSpark < 70) return;
    this.lastSpark = this.time.now;
    const star = this.add.image(x + Phaser.Math.Between(-10, 10), y + Phaser.Math.Between(-10, 10), 'fx_dot')
      .setDepth(12).setBlendMode(Phaser.BlendModes.ADD).setScale(0.05).setTint(Math.random() < 0.3 ? 0xfff1c4 : 0xffffff);
    this.sparks.push(star);
    this.tweens.add({ targets: star, scale: 0.55 + Math.random() * 0.35, duration: 380, ease: 'Sine.easeOut' });
    this.tweens.add({ targets: star, alpha: 0.35, scale: 0.3, delay: 900, duration: 2600, ease: 'Sine.easeInOut' });
    this.tweens.add({
      targets: star, alpha: 0, delay: 6000, duration: 4000,
      onComplete: () => { star.destroy(); this.sparks = this.sparks.filter((x) => x !== star); },
    });
    if (Math.random() < 0.35) sfx('twinkle', { volume: 0.6 });
  }

  /**
   * The drawing is over: no more touches, and every line, star and twinkle fades
   * out completely before the closing line.
   */
  private async endDrawing(): Promise<void> {
    if (!this.drawing || !this.alive) return;
    this.drawing = false;
    this.playing = false;
    this.removeGo?.();
    this.removeGo = null;
    this.input.enabled = false;
    this.release();
    this.twinkle?.stop();
    const fading = [this.lines, this.live, ...this.stars.flatMap((s) => [s.dot, s.halo]), ...this.sparks].filter(Boolean) as Phaser.GameObjects.Components.Alpha[];
    for (const o of fading) this.tweens.killTweensOf(o);
    this.tweens.add({ targets: fading, alpha: 0, duration: FADE_MS, ease: 'Sine.easeInOut' });
    await this.wait(FADE_MS + 100);
    if (!this.alive) return;
    // The last twinkles live up to 3.6 seconds; wait until the sky is still.
    for (let i = 0; i < 40 && (this.twinkle?.getAliveParticleCount() ?? 0) > 0; i++) {
      await this.wait(100);
      if (!this.alive) return;
    }
    for (const o of [this.lines, this.live, ...this.stars.flatMap((s) => [s.dot, s.halo]), ...this.sparks]) o?.destroy();
    this.lines = this.live = null;
    this.stars = [];
    this.sparks = [];
    this.segments = [];
    void this.ayah();
  }

  /** Now and then a shooting star crosses (particles). */
  private shootingStar(): void {
    const v = view();
    const x0 = Phaser.Math.Between(v.x + 80, v.right - 20), y0 = Phaser.Math.Between(v.y + 80, 260);
    const head = this.add.image(x0, y0, 'fx_dot').setDepth(11).setBlendMode(Phaser.BlendModes.ADD).setScale(0.3);
    const trail = this.add.particles(0, 0, 'fx_dot', {
      follow: head, lifespan: 500, frequency: 16, scale: { start: 0.22, end: 0 }, alpha: { start: 0.8, end: 0 }, blendMode: Phaser.BlendModes.ADD,
    }).setDepth(11);
    this.tweens.add({
      targets: head, x: x0 - 220, y: y0 + 120, alpha: 0, duration: 1100, ease: 'Sine.easeIn',
      onComplete: () => { head.destroy(); this.time.delayedCall(600, () => trail.destroy()); },
    });
  }

  private async ayah(): Promise<void> {
    if (!this.alive) return;
    this.playing = false;
    // Input off, sound effects off. The crickets stop; a soft wind stays.
    this.input.enabled = false;
    ui.setHome(null);
    ui.setPill(null);
    setSfxMuted(true, 1.2);
    this.night?.quiet();
    music.stop(1);
    await this.wait(1400);
    if (!this.alive) return;

    // The father's closing line comes before the ayah.
    await Voice.say('wr_close');
    if (!this.alive) return;
    ui.clearBubble();
    // Then silence.
    await this.wait(2600);
    if (!this.alive) return;

    // Nothing moves while the ayah is on screen.
    for (const t of this.calm) t.pause();
    const entry = registry.find((r) => r.source_id === 'quran_3_190') as { original_arabic?: string } | undefined;
    const block = ui.showAyah(entry?.original_arabic ?? '', 'آل عمران ١٩٠');
    await this.wait(2400); // let it fade in
    if (!this.alive) return block.hide(0);
    // A real recitation if the file exists; otherwise the text in silence.
    if (hasAudio('quran', '3_190') && audio.ready) {
      const played = await audio.playFile('assets/audio/quran/3_190.m4a');
      if (!played) await this.wait(SILENT_AYAH_MS);
      else await this.wait(1200);
    } else {
      await this.wait(SILENT_AYAH_MS);
    }
    if (!this.alive) return block.hide(0);
    await block.hide(1800);
    if (!this.alive) return;
    // The ayah has gone: the night breathes again, as before.
    for (const t of this.calm) t.resume();
    this.twinkle?.start();

    // The father's goodnight line, then the end of the day.
    setSfxMuted(false, 0.5);
    await Voice.say('wr_night');
    if (!this.alive) return;
    this.removeDone = ui.showDone('خلصنا لليوم', () => {
      this.removeDone = null;
      this.goTo('start'); // the start screen begins a fresh day
    });
  }
}
