import Phaser from 'phaser';
import { fitHeight, fitWidth } from '../../core/assets';
import { glowRing, HintHand, motes } from '../../core/fx';
import { music } from '../../core/music';
import { completeMission, currentLap } from '../../core/session';
import { sfx } from '../../core/sfx';
import { ui } from '../../core/ui';
import { PIC, view } from '../../core/viewport';
import { Voice } from '../../core/voice';
import { BaseScene } from '../BaseScene';
import { breathe, pose, walkTo } from '../kit';

// J1. Jerash: after the festival (value: removing harm from where people walk;
// source bukhari_2989, part "harm"). MISSIONS_V2.md section 5.
// Litter lies on the Oval Plaza. He drags each piece to the bin with its picture.
// One piece glints: broken glass. It cannot be lifted or dragged at all; he
// tells the site guard, who sweeps it up with his own broom and dustpan.
//
// The same plaza early in the morning is Jerash's quiet deed (scene key
// 'jerash-morning', MISSIONS_V2.md section 6): no guard, no glass, nobody there.
// He bins the litter and goes; the first visitors walk in on clean stone. No
// chime, no music, no hadith line, nobody thanks him.

// Measured on bg_jerash_plaza (world units): the column bases stand at y = 410,
// the paving runs down to the first step at y = 650, the steps end at y = 745.
const BOY = { x: 44, foot: 712, h: 150 };
const BIN_FOOT = 515;
const BIN_H = 78; // the checklist's 0.6 of a boy standing this far back
const BIN_X = [112, 196, 280];
// The litter picture sits on the bin's round label (measured on the bin art).
const LABEL = { x: 0.5, y: 0.56, d: 0.4 };
const GUARD = { x: 352, foot: 505 };
// Litter is drawn larger than the checklist: anything he must touch is at least
// 44 points tall (at the checklist's size a piece of paper would be 14 wide).
const LITTER_H = 44;
const GLASS_H = 44;
const HIT = 34;

type Kind = 'bottle' | 'paper' | 'peel';
type State = 'intro' | 'play' | 'sweep' | 'end';

interface Litter { img: Phaser.GameObjects.Image; kind: Kind; home: { x: number; y: number }; binned: boolean }
interface Bin { img: Phaser.GameObjects.Image; kind: Kind; x: number }

// Where the litter can lie: on the paving, clear of the boy and the bins.
const SPOTS = [
  { x: 120, y: 578 }, { x: 205, y: 566 }, { x: 292, y: 580 }, { x: 160, y: 628 },
  { x: 250, y: 640 }, { x: 330, y: 622 }, { x: 205, y: 690 }, { x: 300, y: 686 }, { x: 120, y: 684 },
];

/** A figure's height at a given foot line: the plaza recedes toward the columns. */
const depthScale = (foot: number): number => Phaser.Math.Clamp(0.72 + 0.28 * (foot - BIN_FOOT) / (BOY.foot - BIN_FOOT), 0.72, 1.05);

export class PlazaScene extends BaseScene {
  protected quiet = false;
  private state: State = 'intro';
  private boy!: Phaser.GameObjects.Image;
  private guard: Phaser.GameObjects.Image | null = null;
  private guardRing: Phaser.GameObjects.Image | null = null;
  private glass: Phaser.GameObjects.Image | null = null;
  private glassSeen = false;
  private swept = false;
  private litter: Litter[] = [];
  private bins: Bin[] = [];
  private held: Litter | null = null;
  private dragId = -1;
  private wrongSaid = 0;
  private breezeDone = false;
  private hint!: HintHand;
  private dawn: Phaser.GameObjects.Rectangle | null = null;

  constructor(key = 'jerash') {
    super(key);
  }

  create(): void {
    this.setup();
    this.quiet = this.scene.key === 'jerash-morning';
    this.state = 'intro';
    this.litter = [];
    this.bins = [];
    this.held = null;
    this.dragId = -1;
    this.wrongSaid = 0;
    this.breezeDone = false;
    this.glassSeen = false;
    this.swept = this.quiet; // the quiet deed has no glass
    this.guard = this.guardRing = this.glass = this.dawn = null;
    this.hint = new HintHand(this);
    const lap = currentLap();

    ui.setPill('جَرَش');
    ui.setHome(() => this.goTo('map'));
    ui.clearBubble();
    music.play('jerash', { natureOnly: this.quiet }); // a quiet deed has no music

    this.addCover('bg_jerash_plaza');
    motes(this, { x: 20, y: 160, w: 350, h: 480 }, 40, this.quiet ? 0xdfe6ff : undefined);
    if (this.quiet) this.dawn = this.add.rectangle(PIC.x, PIC.y, PIC.w, PIC.h, 0x2c3a70, 0.26).setOrigin(0).setDepth(80);

    // Three bins with a picture on each label; their order changes on replay.
    const kinds = Phaser.Utils.Array.Shuffle<Kind>(['bottle', 'paper', 'peel']);
    kinds.forEach((kind, i) => {
      const x = BIN_X[i];
      const img = this.add.image(x, BIN_FOOT, 'bin').setOrigin(0.5, 1).setDepth(20);
      fitHeight(img, BIN_H);
      const w = img.frame.width * img.scale;
      const icon = this.add.image(x - w / 2 + w * LABEL.x, BIN_FOOT - BIN_H + BIN_H * LABEL.y, `litter_${kind}`).setDepth(21);
      fitWidth(icon, w * LABEL.d * 0.82);
      if (icon.displayHeight > w * LABEL.d * 0.82) fitHeight(icon, w * LABEL.d * 0.82);
      this.bins.push({ img, kind, x });
    });

    // The litter. The first piece lies right under its own bin: an easy first win.
    const count = this.quiet ? 4 : lap ? 7 : 5;
    const pieces: Kind[] = this.quiet ? ['bottle', 'paper', 'peel', 'bottle']
      : lap ? ['bottle', 'paper', 'peel', 'bottle', 'paper', 'peel', 'bottle'] : ['bottle', 'paper', 'peel', 'bottle', 'paper'];
    const spots = Phaser.Utils.Array.Shuffle(SPOTS.slice(1));
    const first = this.bins.find((b) => b.kind === pieces[0]) as Bin;
    const places = [{ x: first.x, y: 572 }, ...spots.filter((s) => Math.abs(s.x - first.x) > 30 || s.y > 600)];
    for (let i = 0; i < count; i++) {
      const home = places[i];
      const kind = pieces[i];
      const img = this.add.image(home.x, home.y, `litter_${kind}`).setDepth(30 + home.y / 100);
      fitHeight(img, LITTER_H);
      img.setAngle(Phaser.Math.Between(-25, 25));
      this.litter.push({ img, kind, home: { ...home }, binned: false });
    }

    if (!this.quiet) {
      // The site guard stands in plain view.
      this.guard = this.add.image(GUARD.x, GUARD.foot, 'guard_stand').setOrigin(0.5, 1).setDepth(25);
      fitHeight(this.guard, BOY.h * 1.35 * depthScale(GUARD.foot));
      breathe(this, this.guard);
      // The broken glass: one tight cluster on a free spot, glinting now and then.
      // It lies away from the right edge, so the guard sweeping it stays in sight.
      const free = places.slice(count).find((s) => s.y < 660 && s.x >= 150 && s.x <= 270) ?? { x: 228, y: 612 };
      this.glass = this.add.image(free.x, free.y, 'glass_broken').setDepth(29);
      fitHeight(this.glass, GLASS_H);
      this.time.addEvent({ delay: 1900, loop: true, callback: () => this.glint() });
    }

    this.boy = this.add.image(BOY.x, BOY.foot, 'boy_idle').setOrigin(0.5, 1).setDepth(60);
    fitHeight(this.boy, BOY.h);
    breathe(this, this.boy);

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.down(p));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.move(p));
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => this.up(p));
    this.input.on('pointerupoutside', (p: Phaser.Input.Pointer) => this.up(p));
    this.events.once('shutdown', () => this.hint.clear());

    void this.intro();
  }

  private async intro(): Promise<void> {
    this.state = 'play';
    this.setIdle(() => this.showHint());
    this.open(this.quiet ? 'qdj_open' : 'j1_open', this.quiet ? undefined : 'j1_hint');
  }

  /** A short sparkle on the glass, so he notices it (the glass itself never moves). */
  private glint(): void {
    if (!this.alive || !this.glass || this.swept) return;
    const g = this.add.image(this.glass.x + 8, this.glass.y - 6, 'fx_glow').setDisplaySize(30, 30).setDepth(31).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: g, alpha: 0.9, duration: 220, yoyo: true, onComplete: () => g.destroy() });
    sfx('twinkle', { volume: 0.25 });
  }

  // ---------------------------------------------------------------- input

  private down(p: Phaser.Input.Pointer): void {
    if (!this.alive || this.state !== 'play' || this.held) return;
    this.hint.clear();
    const x = p.worldX, y = p.worldY;
    // The guard: he comes to sweep the glass.
    if (this.guard && !this.swept && this.guard.getBounds().contains(x, y)) {
      void this.callGuard();
      return;
    }
    // The nearest piece of litter within reach.
    let best: Litter | null = null;
    let bestD = HIT;
    for (const l of this.litter) {
      if (l.binned) continue;
      const d = Phaser.Math.Distance.Between(x, y, l.img.x, l.img.y);
      if (d < bestD) { bestD = d; best = l; }
    }
    const glassD = this.glass && !this.swept ? Phaser.Math.Distance.Between(x, y, this.glass.x, this.glass.y) : Infinity;
    if (glassD < HIT && glassD <= bestD) {
      void this.touchGlass();
      return;
    }
    if (!best) return;
    this.held = best;
    this.dragId = p.id;
    this.tweens.killTweensOf(best.img);
    best.img.setDepth(70).setAngle(0);
    this.tweens.add({ targets: best.img, scale: best.img.scale * 1.15, duration: 120 });
    sfx('grab', { volume: 0.6 });
    pose(this, this.boy, 'boy_lift', BOY.h * 0.8);
  }

  private move(p: Phaser.Input.Pointer): void {
    if (!this.held || p.id !== this.dragId) return;
    const v = view();
    this.held.img.setPosition(Phaser.Math.Clamp(p.worldX, v.x + 14, v.right - 14), Phaser.Math.Clamp(p.worldY - 18, 420, 700));
  }

  private up(p: Phaser.Input.Pointer): void {
    if (!this.held || p.id !== this.dragId) return;
    const l = this.held;
    this.held = null;
    this.dragId = -1;
    pose(this, this.boy, 'boy_idle', BOY.h);
    const bin = this.bins.find((b) => Math.abs(l.img.x - b.x) < 46 && l.img.y > BIN_FOOT - BIN_H - 46 && l.img.y < BIN_FOOT + 24);
    if (bin && bin.kind === l.kind) this.binIt(l, bin);
    else if (bin) {
      // Another bin: the piece slides back to where it lay. Nobody scolds.
      this.tweens.add({ targets: l.img, x: l.home.x, y: l.home.y, scale: l.img.scale / 1.15, duration: 420, ease: 'Sine.easeOut', onComplete: () => l.img.setDepth(30 + l.home.y / 100) });
      sfx('slide', { volume: 0.5 });
      if (!this.quiet && this.wrongSaid++ < 2) void Voice.say('j1_wrong');
    } else {
      // Dropped on the paving: it stays where he left it.
      const y = Phaser.Math.Clamp(l.img.y, 548, 694);
      l.home = { x: l.img.x, y };
      this.tweens.add({ targets: l.img, y, scale: l.img.scale / 1.15, duration: 200, onComplete: () => l.img.setDepth(30 + y / 100) });
    }
    this.kickIdle();
  }

  private binIt(l: Litter, bin: Bin): void {
    l.binned = true;
    const top = BIN_FOOT - BIN_H + 6;
    this.tweens.add({ targets: l.img, x: bin.x, y: top - 10, duration: 160, ease: 'Sine.easeOut', onComplete: () => {
      l.img.setDepth(19);
      this.tweens.add({ targets: l.img, y: top + 14, scale: l.img.scale * 0.6, alpha: 0, duration: 260, ease: 'Quad.easeIn', onComplete: () => l.img.setVisible(false) });
    } });
    this.tweens.add({ targets: bin.img, scaleY: { from: bin.img.scaleY * 0.94, to: bin.img.scaleY }, duration: 260, delay: 300, ease: 'Back.easeOut' });
    sfx('thud', { weight: 0.1, volume: 0.5 });
    // A finished step chimes, except in a quiet deed, which has no chime at all.
    if (!this.quiet) this.time.delayedCall(260, () => sfx('chime', { volume: 0.4 }));
    const left = this.litter.filter((x) => !x.binned).length;
    if (!this.quiet && !this.breezeDone && this.litter.length - left >= 2) this.breeze();
    this.checkDone();
  }

  /** Later on, a breeze moves a piece of paper along the paving. */
  private breeze(): void {
    const paper = this.litter.find((x) => !x.binned && x.kind === 'paper' && x !== this.held);
    if (!paper) return;
    this.breezeDone = true;
    this.time.delayedCall(700, () => {
      if (!this.alive || paper.binned || paper === this.held) return;
      const dx = paper.home.x > 195 ? -70 : 70;
      paper.home = { x: paper.home.x + dx, y: Phaser.Math.Clamp(paper.home.y - 14, 548, 694) };
      sfx('whoosh', { volume: 0.5 });
      this.tweens.add({ targets: paper.img, x: paper.home.x, y: paper.home.y, angle: paper.img.angle + dx * 3, duration: 1100, ease: 'Sine.easeOut' });
      void Voice.say('j1_breeze');
    });
  }

  // ---------------------------------------------------------------- the glass

  private async touchGlass(): Promise<void> {
    if (!this.glass) return;
    // It does not lift: a small shake where it lies, and the father explains.
    const g = this.glass;
    this.tweens.add({ targets: g, x: g.x + 2, duration: 50, yoyo: true, repeat: 3 });
    pose(this, this.boy, 'boy_worried', BOY.h);
    this.time.delayedCall(1600, () => this.alive && this.state === 'play' && !this.held && pose(this, this.boy, 'boy_idle', BOY.h));
    if (!this.glassSeen) {
      this.glassSeen = true;
      await Voice.say('j1_glass');
      // He may already have called the guard while the father spoke.
      if (!this.alive || this.swept || this.state !== 'play') return;
    }
    if (this.guard && !this.guardRing) this.guardRing = glowRing(this, this.guard.x, this.guard.y - this.guard.displayHeight * 0.55, 46, 24);
    await Voice.say('j1_tell');
  }

  private async callGuard(): Promise<void> {
    const guard = this.guard;
    const glass = this.glass;
    if (!guard || !glass) return;
    this.state = 'sweep';
    this.setIdle(null);
    this.guardRing?.destroy();
    this.guardRing = null;
    pose(this, this.boy, 'boy_idle', BOY.h);
    await Voice.say('j1_guard');
    if (!this.alive) return;
    // He walks over and sweeps it into his dustpan (guard_sweep faces left).
    const h = BOY.h * 1.35 * depthScale(glass.y + 4);
    this.tweens.killTweensOf(guard);
    const target = { x: glass.x + h * 0.3, y: glass.y + 6 };
    const steps = this.time.addEvent({ delay: 380, loop: true, callback: () => sfx('step', { volume: 0.3 }) });
    this.tweens.add({ targets: guard, angle: { from: -2, to: 2 }, duration: 260, yoyo: true, repeat: -1 });
    await new Promise<void>((res) => this.tweens.add({
      targets: guard, x: target.x, y: target.y, scale: h / guard.frame.height, duration: 1500, ease: 'Sine.easeInOut', onComplete: () => res(),
    }));
    steps.remove();
    if (!this.alive) return;
    this.tweens.killTweensOf(guard);
    guard.setAngle(0).setTexture('guard_sweep').setDepth(32);
    fitHeight(guard, h);
    for (let i = 0; i < 3; i++) {
      sfx('sweep', { volume: 0.7 });
      await new Promise<void>((res) => this.tweens.add({ targets: guard, angle: -4, duration: 240, yoyo: true, onComplete: () => res() }));
      if (!this.alive) return;
      this.tweens.add({ targets: glass, x: glass.x + 6, alpha: glass.alpha - 0.34, duration: 240 });
    }
    glass.setVisible(false);
    this.swept = true;
    guard.setTexture('guard_stand');
    fitHeight(guard, h);
    breathe(this, guard);
    this.state = 'play';
    this.setIdle(() => this.showHint());
    this.checkDone();
  }

  // ---------------------------------------------------------------- the ending

  private checkDone(): void {
    if (this.state === 'end' || !this.swept || this.litter.some((l) => !l.binned)) return;
    this.state = 'end';
    this.setIdle(null);
    this.hint.clear();
    void (this.quiet ? this.quietEnding() : this.ending());
  }

  /** People walk across a clean plaza; a small child runs over it safely. */
  private async passersBy(): Promise<void> {
    const v = view();
    const walkers: Array<[string, number, number, number, number]> = [
      // key, from x, to x, foot, delay
      ['visitor_a', v.x - 50, v.right + 60, 560, 0],
      ['visitor_b', v.right + 50, v.x - 60, 600, 900],
    ];
    if (!this.quiet) walkers.push(['girl_happy', v.x - 40, v.right + 50, 650, 2200]);
    for (const [key, from, to, foot, delay] of walkers) {
      const img = this.add.image(from, foot, key).setOrigin(0.5, 1).setDepth(30 + foot / 100);
      const adult = key !== 'girl_happy';
      fitHeight(img, BOY.h * (adult ? 1.3 : 0.7) * depthScale(foot));
      const run = !adult;
      this.tweens.add({ targets: img, y: foot - (run ? 6 : 3), duration: run ? 160 : 260, yoyo: true, repeat: -1, delay });
      this.tweens.add({ targets: img, x: to, duration: run ? 3200 : 6500, delay, ease: 'Linear', onComplete: () => img.destroy() });
    }
    const steps = this.time.addEvent({ delay: 420, loop: true, callback: () => sfx('step', { volume: 0.3 }) });
    await this.wait(4200);
    steps.remove();
  }

  private async ending(): Promise<void> {
    await walkTo(this, this.boy, { x: 150, y: BOY.foot }, BOY.h);
    if (!this.alive) return;
    pose(this, this.boy, 'boy_happy', BOY.h);
    void this.passersBy();
    await this.wait(1500);
    if (!this.alive) return;
    await Voice.say('j1_end');
    if (!this.alive) return;
    await this.finishAdventure('jerash', 'j1_hadith');
  }

  /** He simply goes. The sun comes up and the first visitors walk in. */
  private async quietEnding(): Promise<void> {
    await walkTo(this, this.boy, { x: view().x - 70, y: BOY.foot }, BOY.h);
    if (!this.alive) return;
    this.boy.setVisible(false);
    if (this.dawn) this.tweens.add({ targets: this.dawn, fillAlpha: 0, duration: 3000, ease: 'Sine.easeInOut' });
    sfx('birds', { volume: 0.6 });
    await this.wait(1800);
    if (!this.alive) return;
    completeMission('jerash');
    await this.passersBy();
    if (!this.alive) return;
    await Voice.say('qdj_end');
    if (!this.alive) return;
    await this.finishAdventure('jerash', null);
  }

  private showHint(): void {
    if (!this.alive || this.held || this.state !== 'play') return this.kickIdle();
    const again = () => this.kickIdle();
    const l = this.litter.find((x) => !x.binned);
    if (l) {
      const bin = this.bins.find((b) => b.kind === l.kind) as Bin;
      this.hint.show('drag', { x: l.img.x, y: l.img.y }, { x: bin.x, y: BIN_FOOT - BIN_H / 2 }, again);
    } else if (this.guard && !this.swept) {
      this.hint.show('tap', { x: this.guard.x, y: this.guard.y - this.guard.displayHeight * 0.5 }, undefined, again);
    } else again();
  }
}

/** Jerash's quiet deed: the same plaza early in the morning (MISSIONS_V2.md section 6). */
export class JerashMorningScene extends PlazaScene {
  constructor() {
    super('jerash-morning');
  }
}
