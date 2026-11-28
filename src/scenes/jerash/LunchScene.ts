import Phaser from 'phaser';
import { fitHeight, fitWidth } from '../../core/assets';
import { droplets, glowRing, HintHand, motes } from '../../core/fx';
import { music } from '../../core/music';
import { currentLap } from '../../core/session';
import { sfx } from '../../core/sfx';
import { ui } from '../../core/ui';
import { PIC } from '../../core/viewport';
import { Voice } from '../../core/voice';
import { BaseScene, type FreeTarget } from '../BaseScene';
import { breathe, CupPour, freeHop, freeWiggle } from '../kit';

// J3. Jerash: the forgotten lunch (value: feeding others; source bukhari_12).
// MISSIONS_V2.md section 5.
// On a school trip, his classmate has no lunch. The boy asks first whether he
// can eat cheese. He draws a line across his sandwich to cut two fair halves,
// pours water into a second cup (hold to pour, let go at the line), and hands
// both over. Safeguards: he asks before sharing food; each has his own cup.

// Measured on bg_jerash_plaza (world units): the upper step's edge is at y = 681,
// the lower step's tread at y = 712. Seated figures have no seat drawn: their
// seat is 0.3 of their height above their feet (measured on boy_sit_front).
const SEAT_FOOT = 712;
const KID_H = 150 * 0.7;
const BOY_X = 132;
const MATE_X = 262;
const STEP_Y = 676; // where things are set down on the step, between the two boys
const CLOSE = { x: 195, y: 410 };

type State = 'intro' | 'ask' | 'cut' | 'pour' | 'give' | 'end';

export class LunchScene extends BaseScene {
  private state: State = 'intro';
  private boy!: Phaser.GameObjects.Image;
  private mate!: Phaser.GameObjects.Image;
  private dim!: Phaser.GameObjects.Rectangle;
  private whole: Phaser.GameObjects.Image | null = null;
  private trail!: Phaser.GameObjects.Graphics;
  private guide: Phaser.GameObjects.Graphics | null = null;
  private stroke: Phaser.Math.Vector2[] = [];
  private strokeId = -1;
  private pour: CupPour | null = null;
  private pourId = -1;
  private gifts: Phaser.GameObjects.Image[] = [];
  private given = 0;
  private held: Phaser.GameObjects.Image | null = null;
  private heldHome = { x: 0, y: 0 };
  private dragId = -1;
  private mateRing: Phaser.GameObjects.Image | null = null;
  private hint!: HintHand;
  private cutTol = 0.14;
  private pourTol = 0.1;

  constructor() {
    super('j3');
  }

  create(): void {
    this.setup();
    this.state = 'intro';
    this.whole = this.guide = this.pour = this.held = this.mateRing = null;
    this.stroke = [];
    this.strokeId = this.pourId = this.dragId = -1;
    this.gifts = [];
    this.given = 0;
    this.hint = new HintHand(this);
    const lap = currentLap();
    // First lap: a forgiving cut and pour. Later: a little nearer the middle and the line.
    this.cutTol = lap ? 0.08 : 0.14;
    this.pourTol = lap ? 0.06 : 0.1;

    ui.setPill('جَرَش');
    ui.setHome(() => this.goTo('map'));
    ui.clearBubble();
    music.play('jerash');

    this.addCover('bg_jerash_plaza');
    motes(this, { x: 20, y: 160, w: 350, h: 480 }, 40);

    // The two boys sit side by side on the step. His own bottle and cup are beside him.
    this.boy = this.add.image(BOY_X, SEAT_FOOT, 'boy_sit_front').setOrigin(0.5, 1).setDepth(40);
    fitHeight(this.boy, KID_H);
    breathe(this, this.boy, 0.01);
    this.mate = this.add.image(MATE_X, SEAT_FOOT, 'classmate_hungry').setOrigin(0.5, 1).setDepth(40);
    fitHeight(this.mate, KID_H);
    breathe(this, this.mate, 0.01);
    const bottle = this.add.image(BOY_X - 66, STEP_Y, 'water_bottle').setOrigin(0.5, 1).setDepth(41);
    fitHeight(bottle, 150 * 0.22);
    const myCup = this.add.image(BOY_X - 46, STEP_Y + 2, 'cup_full').setOrigin(0.5, 1).setDepth(42);
    fitHeight(myCup, 150 * 0.12);
    this.whole = this.add.image(BOY_X + 52, STEP_Y, 'sandwich_whole').setOrigin(0.5, 1).setDepth(41);
    fitWidth(this.whole, 150 * 0.3);

    this.dim = this.add.rectangle(PIC.x, PIC.y, PIC.w, PIC.h, 0x2a1a0e, 0).setOrigin(0).setDepth(85);
    this.trail = this.add.graphics().setDepth(90);

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.down(p));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.move(p));
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => this.up(p));
    this.input.on('pointerupoutside', (p: Phaser.Input.Pointer) => this.up(p));
    this.events.once('shutdown', () => this.hint.clear());
    void this.intro();
  }

  update(_t: number, dt: number): void {
    if (this.state !== 'pour' || !this.pour) return;
    if (this.pour.update(dt, 2600)) {
      // Over the brim: a little spills. That is all right.
      const p = this.pour;
      p.release();
      this.pourId = -1;
      droplets(this, CLOSE.x, CLOSE.y - 100, 10, 88);
      sfx('splash', { volume: 0.4 });
      void Voice.say('j3_spill').then(() => { if (this.alive) void this.poured(); });
      this.state = 'intro';
    }
  }

  /** His first action is to ask: he taps his classmate (who glows) and asks about cheese. */
  private async intro(): Promise<void> {
    this.state = 'ask';
    this.mateRing = glowRing(this, this.mate.x, SEAT_FOOT - KID_H * 0.45, 40, 39);
    this.setIdle(() => this.showHint());
    this.open('j3_open');
  }

  private async ask(): Promise<void> {
    this.state = 'intro';
    this.setIdle(null);
    this.mateRing?.destroy();
    this.mateRing = null;
    sfx('pop', { volume: 0.4 });
    await Voice.say('j3_ask');
    if (!this.alive) return;
    this.tweens.add({ targets: this.mate, y: SEAT_FOOT - 5, duration: 160, yoyo: true, repeat: 1 });
    await Voice.say('j3_yes');
    if (!this.alive) return;
    this.openCut();
  }

  // ---------------------------------------------------------------- cutting

  private openCut(): void {
    if (!this.whole) return;
    this.state = 'cut';
    this.tweens.add({ targets: this.dim, fillAlpha: 0.45, duration: 400 });
    const w = this.whole;
    w.setOrigin(0.5).setPosition(CLOSE.x, CLOSE.y).setDepth(86);
    fitWidth(w, 270);
    w.setScale(w.scale * 0.6);
    this.tweens.add({ targets: w, scale: w.scale / 0.6, duration: 450, ease: 'Back.easeOut' });
    void Voice.say('j3_cut');
    this.setIdle(() => this.showHint());
  }

  private sandwichBox(): { x: number; y: number; w: number; h: number } {
    const w = this.whole as Phaser.GameObjects.Image;
    return { x: w.x, y: w.y, w: w.frame.width * w.scaleX, h: w.frame.height * w.scaleY };
  }

  private finishStroke(): void {
    const box = this.sandwichBox();
    const pts = this.stroke;
    this.stroke = [];
    this.time.delayedCall(250, () => { if (this.strokeId === -1) this.trail.clear(); });
    if (pts.length < 2) return;
    const ys = pts.map((p) => p.y);
    // A cut goes across the sandwich, from above it to below it (or back).
    if (Math.min(...ys) > box.y - box.h * 0.3 || Math.max(...ys) < box.y + box.h * 0.3) return;
    // Where the line crosses the middle of the sandwich.
    let cutX = pts[0].x;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i];
      if ((a.y - box.y) * (b.y - box.y) <= 0 && a.y !== b.y) {
        cutX = a.x + ((box.y - a.y) / (b.y - a.y)) * (b.x - a.x);
        break;
      }
    }
    if (Math.abs(cutX - box.x) > box.w * this.cutTol) {
      // Not quite fair yet: a soft guide shows the middle. Nobody scolds.
      this.showMiddle(box);
      void Voice.say('j3_middle');
      return;
    }
    void this.cut(box);
  }

  private showMiddle(box: { x: number; y: number; w: number; h: number }): void {
    this.guide?.destroy();
    const g = this.add.graphics().setDepth(89);
    g.lineStyle(4, 0xffffff, 0.9);
    for (let y = box.y - box.h * 0.7; y < box.y + box.h * 0.7; y += 16) g.lineBetween(box.x, y, box.x, Math.min(y + 9, box.y + box.h * 0.7));
    g.setAlpha(0);
    this.tweens.add({ targets: g, alpha: 1, duration: 300, yoyo: true, hold: 1600, onComplete: () => g.destroy() });
    this.guide = g;
  }

  private async cut(box: { x: number; y: number; w: number; h: number }): Promise<void> {
    this.state = 'intro';
    this.setIdle(null);
    sfx('slide', { volume: 0.6 });
    const whole = this.whole as Phaser.GameObjects.Image;
    whole.setVisible(false);
    // Two fair halves: the same half picture, one of them mirrored.
    const halves = [-1, 1].map((side) => {
      const h = this.add.image(box.x + side * box.w * 0.22, box.y, 'sandwich_half').setDepth(86).setFlipX(side > 0);
      fitHeight(h, box.h * 1.35);
      this.tweens.add({ targets: h, x: h.x + side * 26, duration: 400, ease: 'Sine.easeOut' });
      return h;
    });
    // No chime for the fair cut: fairness is the point, not a reward (as in U3).
    await this.wait(1300);
    if (!this.alive) return;
    // The halves go down to the step (they travel there, not a jump); then the pour.
    for (const h of halves) this.tweens.add({ targets: h, alpha: 0, scale: h.scale * 0.4, y: STEP_Y - 20, duration: 350, ease: 'Sine.easeIn', onComplete: () => h.destroy() });
    // His own half by his side; his friend's half, the one he hands over, at least 44 points tall.
    const mine = this.add.image(BOY_X - 24, STEP_Y, 'sandwich_half').setOrigin(0.5, 1).setDepth(41).setAlpha(0);
    fitHeight(mine, 150 * 0.18);
    const his = this.add.image(BOY_X + 48, STEP_Y, 'sandwich_half').setOrigin(0.5, 1).setDepth(42).setFlipX(true).setAlpha(0);
    fitHeight(his, 44);
    this.tweens.add({ targets: [mine, his], alpha: 1, y: { from: STEP_Y - 16, to: STEP_Y }, duration: 300, delay: 250, ease: 'Sine.easeOut' });
    this.gifts.push(his);
    this.openPour();
  }

  // ---------------------------------------------------------------- pouring

  private openPour(): void {
    this.state = 'pour';
    this.pour = new CupPour(this, CLOSE.x - 20, CLOSE.y + 30, 210, 0.7, this.dim);
    void Voice.say('j3_pour');
    this.setIdle(() => this.showHint());
  }

  /** He let go. Below the line: a little more. At or above it: done. */
  private released(): void {
    const p = this.pour;
    if (!p) return;
    p.release();
    if (p.fill < p.target - this.pourTol) {
      if (p.fill > 0.05) void Voice.say('j3_more');
      return;
    }
    this.state = 'intro';
    void this.poured();
  }

  private async poured(): Promise<void> {
    this.setIdle(null);
    sfx('chime', { volume: 0.4 });
    await this.wait(700);
    if (!this.alive) return;
    await this.pour?.close();
    this.pour = null;
    if (!this.alive) return;
    const cup = this.add.image(BOY_X + 94, STEP_Y + 2, 'cup_full').setOrigin(0.5, 1).setDepth(42).setAlpha(0);
    this.tweens.add({ targets: cup, alpha: 1, y: { from: STEP_Y - 16, to: STEP_Y + 2 }, duration: 300, ease: 'Sine.easeOut' });
    fitHeight(cup, 44);
    this.gifts.push(cup);
    // He hands both over.
    this.state = 'give';
    this.mateRing = glowRing(this, this.mate.x, SEAT_FOOT - KID_H * 0.45, 40, 39);
    void Voice.say('j3_give');
    this.setIdle(() => this.showHint());
  }

  // ---------------------------------------------------------------- input

  private down(p: Phaser.Input.Pointer): void {
    if (!this.alive) return;
    this.hint.clear();
    if (this.state === 'ask') {
      if (this.mate.getBounds().contains(p.worldX, p.worldY) || Phaser.Math.Distance.Between(p.worldX, p.worldY, this.mate.x, SEAT_FOOT - KID_H * 0.5) < 60) void this.ask();
    } else if (this.state === 'cut' && this.strokeId === -1) {
      this.strokeId = p.id;
      this.stroke = [new Phaser.Math.Vector2(p.worldX, p.worldY)];
      this.trail.clear();
    } else if (this.state === 'pour' && this.pour && this.pourId === -1 && this.pour.hit(p.worldX, p.worldY)) {
      this.pourId = p.id;
      this.pour.press();
    } else if (this.state === 'give' && !this.held) {
      const g = this.gifts.find((x) => x.active && Phaser.Math.Distance.Between(p.worldX, p.worldY, x.x, x.y - x.displayHeight / 2) < 34);
      if (!g) return;
      this.held = g;
      this.heldHome = { x: g.x, y: g.y };
      this.dragId = p.id;
      g.setDepth(70);
      sfx('grab', { volume: 0.6 });
    }
  }

  private move(p: Phaser.Input.Pointer): void {
    if (this.state === 'cut' && p.id === this.strokeId) {
      const last = this.stroke[this.stroke.length - 1];
      const pt = new Phaser.Math.Vector2(p.worldX, p.worldY);
      if (last && last.distance(pt) < 4) return;
      this.stroke.push(pt);
      this.trail.lineStyle(5, 0xffffff, 0.9);
      if (last) this.trail.lineBetween(last.x, last.y, pt.x, pt.y);
    } else if (this.held && p.id === this.dragId) {
      this.held.setPosition(p.worldX, Phaser.Math.Clamp(p.worldY + 12, 560, 700));
    }
  }

  private up(p: Phaser.Input.Pointer): void {
    if (this.state === 'cut' && p.id === this.strokeId) {
      this.strokeId = -1;
      this.finishStroke();
    } else if (this.state === 'pour' && p.id === this.pourId) {
      this.pourId = -1;
      this.released();
    } else if (this.held && p.id === this.dragId) {
      const g = this.held;
      this.held = null;
      this.dragId = -1;
      if (Math.abs(g.x - this.mate.x) < 50 && g.y > SEAT_FOOT - KID_H - 20) this.handOver(g);
      else {
        sfx('slide', { volume: 0.4 });
        this.tweens.add({ targets: g, x: this.heldHome.x, y: this.heldHome.y, duration: 300, ease: 'Sine.easeOut', onComplete: () => g.setDepth(42) });
      }
    }
    this.kickIdle();
  }

  private handOver(g: Phaser.GameObjects.Image): void {
    sfx('pop', { volume: 0.5 });
    // It goes into his hands (the step in front of him).
    this.tweens.add({ targets: g, x: this.mate.x + (this.given ? 16 : -14), y: SEAT_FOOT - KID_H * 0.28, duration: 260, ease: 'Sine.easeOut', onComplete: () => g.setDepth(43) });
    g.setActive(false);
    this.given++;
    if (this.given >= 2) void this.ending();
  }

  // ---------------------------------------------------------------- the ending

  private async ending(): Promise<void> {
    this.state = 'end';
    this.setIdle(null);
    this.mateRing?.destroy();
    this.mateRing = null;
    await this.wait(500);
    if (!this.alive) return;
    for (const g of this.gifts) this.tweens.add({ targets: g, alpha: 0, duration: 400 });
    this.tweens.killTweensOf(this.mate);
    this.mate.setTexture('classmate_happy');
    fitHeight(this.mate, KID_H);
    await Voice.say('j3_thanks');
    if (!this.alive) return;
    // Two boys eating together, legs swinging.
    for (const k of [this.boy, this.mate]) {
      this.tweens.killTweensOf(k);
      this.tweens.add({ targets: k, angle: { from: -1.5, to: 1.5 }, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    await this.wait(1200);
    if (!this.alive) return;
    await Voice.say('j3_end');
    if (!this.alive) return;
    await this.finishAdventure('jerash', 'j3_hadith');
  }

  /** Free time on the step: each boy gives a small hop, his water bottle sloshes. */
  protected freeTargets(): FreeTarget[] {
    const t: FreeTarget[] = [
      { obj: this.boy, react: () => freeHop(this, this.boy, 'step', 8) },
      { obj: this.mate, react: () => freeHop(this, this.mate, 'pop', 8) },
    ];
    const bottle = this.bottle();
    if (bottle) t.push({ obj: bottle, react: () => freeWiggle(this, bottle, 'lap', 5) });
    return t;
  }

  /** His own water bottle on the step (looked up, not stored: the mission code is unchanged). */
  private bottle(): Phaser.GameObjects.Image | undefined {
    return this.children.list.find((o): o is Phaser.GameObjects.Image => o instanceof Phaser.GameObjects.Image && o.texture.key === 'water_bottle');
  }

  private showHint(): void {
    if (!this.alive) return;
    const again = () => this.kickIdle();
    if (this.state === 'ask') {
      this.hint.show('tap', { x: this.mate.x, y: SEAT_FOOT - KID_H * 0.5 }, undefined, again);
    } else if (this.state === 'cut' && this.whole) {
      const b = this.sandwichBox();
      this.hint.show('drag', { x: b.x, y: b.y - b.h * 0.8 }, { x: b.x, y: b.y + b.h * 0.8 }, again);
    } else if (this.state === 'pour') {
      this.hint.show('hold', { x: CLOSE.x + 130, y: CLOSE.y - 80 }, { x: CLOSE.x + 130, y: CLOSE.y - 80 }, again);
    } else if (this.state === 'give') {
      const g = this.gifts.find((x) => x.active);
      if (g) this.hint.show('drag', { x: g.x, y: g.y - 10 }, { x: this.mate.x, y: SEAT_FOOT - KID_H * 0.4 }, again);
      else again();
    }
  }
}
