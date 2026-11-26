import Phaser from 'phaser';
import { fitHeight, fitWidth } from '../../core/assets';
import { HintHand, motes } from '../../core/fx';
import { music } from '../../core/music';
import { currentLap } from '../../core/session';
import { sfx } from '../../core/sfx';
import { ui } from '../../core/ui';
import { PIC, view } from '../../core/viewport';
import { Voice } from '../../core/voice';
import { BaseScene } from '../BaseScene';
import { breathe, pose } from '../kit';

// Q2. Aqaba: the honest scale (value: honest weight; source quran_55_9).
// MISSIONS_V2.md section 5.
// The fisherman asks him to help weigh. A customer wants fish to match the iron
// weight on one pan. He adds fish to the other pan until the beam is level: big
// fish first, then small ones for the fine balance. A beam that is not level
// stays visibly not level; he may add or take away as long as he likes. The
// weighing is in a large view of the scale (as the pouch in P2 and the cup in
// J3 are), so every fish he touches is at least 44 points tall.

// Measured on bg_aqaba_harbor (world units): the stall's counter top is at
// y = 548 and runs from x = 50 to 355.
const COUNTER_Y = 548;
const BOY = { x: 84, foot: 716, h: 150 };
const FISHER = { x: 262, foot: 640, h: 150 * 1.35 * 0.9 }; // behind the stall: only what is above the counter shows
const CUSTOMER = { x: 330, foot: 716, h: 150 * 1.3 };
// The large view of the scale.
const PIVOT = { x: 195, y: 252 };
const BEAM_W = 256;
const HOOK = 0.47; // the pans hang this fraction of the beam's width either side of the pivot
const PAN_H = 150;
const BOWL = 0.86; // the bowl is this far down the pan picture
const MAX_TILT = 15;
// Weights: a big fish weighs 2, a small one 1; the iron weight 5 (later laps 7).
const BIG = 2;
const SMALL = 1;
const SUPPLY = [
  { size: BIG, x: 72, y: 586 }, { size: BIG, x: 195, y: 586 }, { size: BIG, x: 318, y: 586 },
  { size: SMALL, x: 72, y: 664 }, { size: SMALL, x: 195, y: 664 }, { size: SMALL, x: 318, y: 664 },
];

type State = 'intro' | 'weigh' | 'end';

interface Fish { img: Phaser.GameObjects.Image; size: number; home: { x: number; y: number }; inPan: boolean; base: number }

export class HarborScene extends BaseScene {
  private state: State = 'intro';
  private boy!: Phaser.GameObjects.Image;
  private customer!: Phaser.GameObjects.Image;
  private dim!: Phaser.GameObjects.Rectangle;
  private scaleView!: Phaser.GameObjects.Container;
  private beam!: Phaser.GameObjects.Image;
  private panL!: Phaser.GameObjects.Image;
  private panR!: Phaser.GameObjects.Image;
  private iron!: Phaser.GameObjects.Image;
  private fish: Fish[] = [];
  private inPan: Fish[] = [];
  private held: Fish | null = null;
  private dragId = -1;
  private target = 5;
  private heavySaid = false;
  private smallSaid = false;
  private levelTimer?: Phaser.Time.TimerEvent;
  private hint!: HintHand;

  constructor() {
    super('q2');
  }

  create(): void {
    this.setup();
    this.state = 'intro';
    this.fish = [];
    this.inPan = [];
    this.held = null;
    this.dragId = -1;
    this.heavySaid = this.smallSaid = false;
    this.levelTimer = undefined;
    this.hint = new HintHand(this);
    this.target = currentLap() ? 7 : 5;

    ui.setPill('العَقَبة');
    ui.setHome(() => this.goTo('map'));
    ui.clearBubble();
    music.play('aqaba');

    this.addCover('bg_aqaba_harbor');
    motes(this, { x: 20, y: 200, w: 350, h: 420 }, 40);
    this.time.addEvent({ delay: 5200, loop: true, callback: () => this.alive && sfx('splash', { volume: 0.1 }) });

    // The fisherman behind his stall (only what is above the counter shows).
    const fisher = this.add.image(FISHER.x, FISHER.foot, 'fisherman_stand').setOrigin(0.5, 1).setDepth(10);
    fitHeight(fisher, FISHER.h);
    fisher.setCrop(0, 0, fisher.frame.width, (COUNTER_Y + 2 - (FISHER.foot - FISHER.h)) / fisher.scaleY);
    this.tweens.add({ targets: fisher, angle: { from: -1, to: 1 }, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    // The small scale on the counter (the large view shows it close).
    const sb = this.add.image(170, COUNTER_Y + 2, 'scale_base').setOrigin(0.5, 1).setDepth(12);
    fitHeight(sb, 150 * 0.8 * 0.9);
    this.customer = this.add.image(CUSTOMER.x, CUSTOMER.foot, 'customer_basket').setOrigin(0.5, 1).setDepth(40);
    fitHeight(this.customer, CUSTOMER.h);
    breathe(this, this.customer);
    this.boy = this.add.image(BOY.x, BOY.foot, 'boy_idle').setOrigin(0.5, 1).setDepth(41);
    fitHeight(this.boy, BOY.h);
    breathe(this, this.boy);

    this.dim = this.add.rectangle(PIC.x, PIC.y, PIC.w, PIC.h, 0x1a2a3a, 0).setOrigin(0).setDepth(85);
    this.buildScale();

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.down(p));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.move(p));
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => this.up(p));
    this.input.on('pointerupoutside', (p: Phaser.Input.Pointer) => this.up(p));
    this.events.once('shutdown', () => this.hint.clear());

    // The large view opens at once: he can weigh straight away.
    this.time.delayedCall(350, () => {
      if (!this.alive) return;
      this.tweens.add({ targets: this.dim, fillAlpha: 0.5, duration: 400 });
      this.tweens.add({ targets: this.scaleView, alpha: 1, duration: 400 });
      this.state = 'weigh';
      this.setIdle(() => this.showHint());
    });
    this.open('q2_open', 'q2_hint');
  }

  /** The large scale: base, beam, two pans; the iron weight in the left pan; fish below. */
  private buildScale(): void {
    const base = this.add.image(PIVOT.x, PIVOT.y + 222, 'scale_base').setOrigin(0.5, 1);
    fitHeight(base, 232);
    this.beam = this.add.image(PIVOT.x, PIVOT.y, 'scale_beam');
    fitWidth(this.beam, BEAM_W);
    this.panL = this.add.image(0, 0, 'scale_pan').setOrigin(0.5, 0);
    this.panR = this.add.image(0, 0, 'scale_pan').setOrigin(0.5, 0);
    fitHeight(this.panL, PAN_H);
    fitHeight(this.panR, PAN_H);
    this.iron = this.add.image(0, 0, 'weight_iron').setOrigin(0.5, 1);
    fitHeight(this.iron, 56);
    this.scaleView = this.add.container(0, 0, [base, this.panL, this.panR, this.beam, this.iron]).setDepth(86).setAlpha(0);
    for (const s of SUPPLY) {
      const img = this.add.image(s.x, s.y, s.size === BIG ? 'fish_big' : 'fish_small').setDepth(88);
      // Fish he touches are at least 44 points tall; the big ones are bigger.
      const base = fitHeight(img, s.size === BIG ? 52 : 44);
      img.setAlpha(0);
      this.tweens.add({ targets: img, alpha: 1, duration: 400, delay: 350 });
      this.fish.push({ img, size: s.size, home: { x: s.x, y: s.y }, inPan: false, base });
    }
    this.placePans();
  }

  private hookPoint(side: -1 | 1): { x: number; y: number } {
    const a = Phaser.Math.DegToRad(this.beam.angle);
    const d = BEAM_W * HOOK * side;
    return { x: PIVOT.x + Math.cos(a) * d, y: PIVOT.y + Math.sin(a) * d };
  }

  /** Pans hang from the beam's ends; the weight and the fish sit in the bowls. */
  private placePans(): void {
    const l = this.hookPoint(-1), r = this.hookPoint(1);
    this.panL.setPosition(l.x, l.y);
    this.panR.setPosition(r.x, r.y);
    this.iron.setPosition(l.x, l.y + PAN_H * BOWL);
    this.inPan.forEach((f, i) => {
      if (f === this.held) return;
      f.img.setPosition(r.x + ((i % 3) - 1) * 16, r.y + PAN_H * BOWL - 8 - Math.floor(i / 3) * 12);
    });
  }

  update(): void {
    if (this.scaleView) this.placePans();
  }

  private total(): number {
    return this.inPan.reduce((a, f) => a + f.size, 0);
  }

  /** The beam settles to show the difference: the heavier side goes down. */
  private tilt(): void {
    const diff = this.total() - this.target;
    const angle = Phaser.Math.Clamp(diff * 5, -MAX_TILT, MAX_TILT);
    this.tweens.add({ targets: this.beam, angle, duration: 500, ease: 'Back.easeOut' });
    this.levelTimer?.remove();
    if (diff === 0) this.levelTimer = this.time.delayedCall(800, () => void this.level());
    else if (diff > 0 && !this.heavySaid) {
      this.heavySaid = true;
      void Voice.say('q2_heavy');
    } else if (diff === -1 && !this.smallSaid && !this.inPan.some((f) => f.size === SMALL)) {
      this.smallSaid = true;
      void Voice.say('q2_small');
    }
  }

  // ---------------------------------------------------------------- input

  private inBowl(x: number, y: number, pan: Phaser.GameObjects.Image): boolean {
    return Math.abs(x - pan.x) < 74 && y > pan.y + 30 && y < pan.y + PAN_H + 34;
  }

  private down(p: Phaser.Input.Pointer): void {
    if (!this.alive || this.state !== 'weigh' || this.held) return;
    this.hint.clear();
    const x = p.worldX, y = p.worldY;
    // A fish from the counter, nearest first.
    const f = this.fish
      .filter((k) => !k.inPan)
      .map((k) => ({ k, d: Phaser.Math.Distance.Between(x, y, k.img.x, k.img.y) }))
      .filter((o) => o.d < 40)
      .sort((a, b) => a.d - b.d)[0]?.k;
    if (f) {
      this.held = f;
      this.dragId = p.id;
      this.tweens.killTweensOf(f.img);
      f.img.setDepth(95).setAlpha(1); // (its fade-in may have been cut short)
      sfx('grab', { volume: 0.6 });
      return;
    }
    // A tap on the fish pan takes the last fish back out.
    if (this.inPan.length && this.inBowl(x, y, this.panR)) {
      const last = this.inPan.pop() as Fish;
      last.inPan = false;
      last.img.setScale(last.base * 0.5);
      this.tweens.add({ targets: last.img, x: last.home.x, y: last.home.y, scale: last.base, duration: 360, ease: 'Sine.easeOut', onComplete: () => last.img.setDepth(88) });
      sfx('slide', { volume: 0.5 });
      this.tilt();
    }
  }

  private move(p: Phaser.Input.Pointer): void {
    if (!this.held || p.id !== this.dragId) return;
    const v = view();
    this.held.img.setPosition(Phaser.Math.Clamp(p.worldX, v.x + 30, v.right - 30), Phaser.Math.Clamp(p.worldY - 14, 220, 700));
  }

  private up(p: Phaser.Input.Pointer): void {
    if (!this.held || p.id !== this.dragId) return;
    const f = this.held;
    this.held = null;
    this.dragId = -1;
    if (this.state === 'weigh' && this.inBowl(f.img.x, f.img.y, this.panR)) {
      f.inPan = true;
      this.inPan.push(f);
      // In the pan it is drawn smaller, to fit; he takes it out by tapping the pan.
      this.tweens.add({ targets: f.img, scale: f.base * 0.5, duration: 160 });
      f.img.setDepth(87);
      sfx('thud', { weight: f.size === BIG ? 0.3 : 0.15, volume: 0.5 });
      this.tilt();
    } else {
      // Anywhere else (the weight's pan included), it goes back to the counter.
      this.tweens.add({ targets: f.img, x: f.home.x, y: f.home.y, duration: 300, ease: 'Sine.easeOut', onComplete: () => f.img.setDepth(88) });
      sfx('slide', { volume: 0.4 });
    }
    this.kickIdle();
  }

  // ---------------------------------------------------------------- the end

  private async level(): Promise<void> {
    if (this.state !== 'weigh' || this.total() !== this.target) return;
    // Still holding a fish: wait until he lets go, then look again.
    if (this.held) {
      this.levelTimer = this.time.delayedCall(400, () => void this.level());
      return;
    }
    this.state = 'end';
    this.setIdle(null);
    this.hint.clear();
    // No chime for the level beam: it is the end of the deed (as in U3).
    await Voice.say('u3_level');
    if (!this.alive) return;
    // The customer checks the beam and smiles.
    await Voice.say('q2_check');
    if (!this.alive) return;
    this.tweens.add({ targets: this.dim, fillAlpha: 0, duration: 400 });
    this.tweens.add({ targets: [this.scaleView, ...this.fish.map((k) => k.img)], alpha: 0, duration: 400 });
    await this.wait(500);
    if (!this.alive) return;
    pose(this, this.boy, 'boy_happy', BOY.h);
    this.tweens.add({ targets: this.customer, y: CUSTOMER.foot - 6, duration: 200, yoyo: true, repeat: 1 });
    await this.wait(700);
    if (!this.alive) return;
    // She carries dinner home to her family.
    this.tweens.killTweensOf(this.customer);
    this.customer.setFlipX(true);
    this.tweens.add({ targets: this.customer, y: CUSTOMER.foot - 3, duration: 260, yoyo: true, repeat: -1 });
    this.tweens.add({ targets: this.customer, x: view().right + 70, duration: 3200, ease: 'Linear' });
    const steps = this.time.addEvent({ delay: 400, loop: true, callback: () => sfx('step', { volume: 0.3 }) });
    await this.wait(1600);
    steps.remove();
    if (!this.alive) return;
    await Voice.say('q2_end');
    if (!this.alive) return;
    await this.finishAdventure('aqaba', 'q2_hadith');
  }

  private showHint(): void {
    if (!this.alive || this.held || this.state !== 'weigh') return this.kickIdle();
    const again = () => this.kickIdle();
    const need = this.target - this.total();
    const bowl = { x: this.panR.x, y: this.panR.y + PAN_H * BOWL - 10 };
    if (need < 0) {
      this.hint.show('tap', bowl, undefined, again);
      return;
    }
    const want = need >= BIG ? BIG : SMALL;
    const f = this.fish.find((k) => !k.inPan && k.size === want) ?? this.fish.find((k) => !k.inPan);
    if (f) this.hint.show('drag', { x: f.img.x, y: f.img.y }, bowl, again);
    else again();
  }
}
