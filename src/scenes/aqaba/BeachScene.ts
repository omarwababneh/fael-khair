import Phaser from 'phaser';
import { fitHeight } from '../../core/assets';
import { droplets, dustPuff, glowRing, HintHand, motes } from '../../core/fx';
import { music } from '../../core/music';
import { completeMission, currentLap } from '../../core/session';
import { sfx } from '../../core/sfx';
import { ui } from '../../core/ui';
import { PIC, view } from '../../core/viewport';
import { Voice } from '../../core/voice';
import { BaseScene } from '../BaseScene';
import { breathe, pose, walkTo } from '../kit';

// Q1. Aqaba: the turtle and the plastic (value: mercy to animals, keeping harm
// out of their home; source bukhari_2363). MISSIONS_V2.md section 5.
// A sea turtle on the shore is tangled in a plastic bag. He does not touch it:
// he rings the bell at the rescue hut. The marine ranger comes and frees it
// while the boy holds the ranger's bucket. Then the boy clears the plastic from
// the sand into a sack, so it cannot happen again. Safeguards: the ranger
// handles the animal; the boy picks up only safe litter.
//
// The same beach at sunrise is Aqaba's quiet deed (scene key 'aqaba-sunrise',
// MISSIONS_V2.md section 6): no turtle in trouble, no ranger, nobody there. He
// clears the plastic and goes; later a turtle crosses the clean sand to the
// water. No chime, no music, no hadith line, nobody thanks him.

// Measured on bg_aqaba_beach (world units): the sea meets the sand at y = 500;
// the rescue hut stands at the right, its bell hanging at (278, 388) and its
// door at x = 362, y = 500.
const SHORE_Y = 500;
const BELL = { x: 278, y: 390 };
const DOOR = { x: 362, foot: 506 };
const BOY = { x: 200, foot: 712, h: 150 };
const TURTLE = { x: 104, foot: 560, h: 150 * 0.3 * 1.05 };
const SACK = { x: 330, foot: 712, h: 62 }; // a drop target, larger than the checklist's 0.3
// Anything he must touch is at least 44 points tall, with a 56-point hit area.
const LITTER_H = 44;
const HIT = 34;
const RANGER_H = 150 * 1.35;

type State = 'intro' | 'bell' | 'rescue' | 'bucket' | 'clean' | 'end';

interface Litter { img: Phaser.GameObjects.Image; home: { x: number; y: number }; done: boolean }

// Where the plastic can lie: on the sand, clear of the boy (x 150 to 250) and the sack.
const SPOTS = [
  { x: 60, y: 694, key: 'plastic_bag' }, { x: 92, y: 606, key: 'litter_bottle' }, { x: 292, y: 596, key: 'plastic_bag' },
  { x: 126, y: 700, key: 'litter_paper' }, { x: 40, y: 640, key: 'plastic_bag' },
];

/** A figure's height at a foot line: the beach recedes toward the water. */
const depth = (foot: number): number => Phaser.Math.Clamp(0.82 + 0.18 * (foot - SHORE_Y) / (BOY.foot - SHORE_Y), 0.8, 1.02);

export class BeachScene extends BaseScene {
  protected quiet = false;
  private state: State = 'intro';
  private boy!: Phaser.GameObjects.Image;
  private turtle: Phaser.GameObjects.Image | null = null;
  private ranger: Phaser.GameObjects.Image | null = null;
  private bucket: Phaser.GameObjects.Image | null = null;
  private sack!: Phaser.GameObjects.Image;
  private bellRing: Phaser.GameObjects.Image | null = null;
  private litter: Litter[] = [];
  private held: Litter | null = null;
  private dragId = -1;
  private touchSaid = false;
  private hint!: HintHand;
  private dawn: Phaser.GameObjects.Rectangle | null = null;

  constructor(key = 'aqaba') {
    super(key);
  }

  create(): void {
    this.setup();
    this.quiet = this.scene.key === 'aqaba-sunrise';
    this.state = 'intro';
    this.litter = [];
    this.held = null;
    this.dragId = -1;
    this.touchSaid = false;
    this.turtle = this.ranger = this.bucket = this.bellRing = this.dawn = null;
    this.hint = new HintHand(this);
    const lap = currentLap();

    ui.setPill('العَقَبة');
    ui.setHome(() => this.goTo('map'));
    ui.clearBubble();
    music.play('aqaba', { natureOnly: this.quiet }); // a quiet deed has no music

    this.addCover('bg_aqaba_beach');
    motes(this, { x: 20, y: 200, w: 350, h: 420 }, 40, this.quiet ? 0xffe0c0 : undefined);
    // Gentle waves at the waterline.
    this.time.addEvent({ delay: 4200, loop: true, callback: () => this.alive && sfx('splash', { volume: 0.12 }) });
    if (this.quiet) this.dawn = this.add.rectangle(PIC.x, PIC.y, PIC.w, PIC.h, 0x3a3a78, 0.28).setOrigin(0).setDepth(80);

    // The plastic on the sand. The first piece lies next to the sack: an easy first win.
    const count = this.quiet ? 4 : lap ? 6 : 4;
    const spots = [{ x: 262, y: 692, key: 'plastic_bag' }, ...Phaser.Utils.Array.Shuffle(SPOTS.slice())].slice(0, count);
    for (const s of spots) {
      const img = this.add.image(s.x, s.y, s.key).setDepth(30 + s.y / 100).setAngle(Phaser.Math.Between(-20, 20));
      fitHeight(img, LITTER_H);
      this.litter.push({ img, home: { x: s.x, y: s.y }, done: false });
    }
    this.sack = this.add.image(SACK.x, SACK.foot, 'litter_sack').setOrigin(0.5, 1).setDepth(40);
    fitHeight(this.sack, SACK.h);

    if (!this.quiet) {
      // The turtle, tangled, facing the sea.
      this.turtle = this.add.image(TURTLE.x, TURTLE.foot, 'turtle_tangled').setOrigin(0.5, 1).setDepth(35);
      fitHeight(this.turtle, TURTLE.h);
      this.tweens.add({ targets: this.turtle, angle: { from: -2, to: 2 }, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }

    this.boy = this.add.image(BOY.x, BOY.foot, this.quiet ? 'boy_idle' : 'boy_worried').setOrigin(0.5, 1).setDepth(60);
    fitHeight(this.boy, BOY.h);
    breathe(this, this.boy);

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.down(p));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.move(p));
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => this.up(p));
    this.input.on('pointerupoutside', (p: Phaser.Input.Pointer) => this.up(p));
    this.events.once('shutdown', () => this.hint.clear());

    if (this.quiet) {
      // The quiet deed: he can clear the sand at once.
      this.state = 'clean';
      this.setIdle(() => this.showHint());
      this.open('qdq_open');
    } else {
      // He can ring the bell at once; the bell glows.
      this.state = 'bell';
      this.bellRing = glowRing(this, BELL.x, BELL.y, 30, 20);
      this.setIdle(() => this.showHint());
      this.open('q1_open', 'q1_bell');
    }
  }

  // ---------------------------------------------------------------- input

  private down(p: Phaser.Input.Pointer): void {
    if (!this.alive || this.held) return;
    this.hint.clear();
    const x = p.worldX, y = p.worldY;
    if (this.state === 'bell') {
      if (Phaser.Math.Distance.Between(x, y, BELL.x, BELL.y) < 40) void this.ringBell();
      else if (this.turtle && this.turtle.getBounds().contains(x, y)) void this.touchTurtle();
    } else if (this.state === 'bucket' && this.bucket && Phaser.Math.Distance.Between(x, y, this.bucket.x, this.bucket.y - this.bucket.displayHeight / 2) < 44) {
      void this.holdBucket();
    } else if (this.state === 'clean') {
      let best: Litter | null = null;
      let bestD = HIT;
      for (const l of this.litter) {
        if (l.done) continue;
        const d = Phaser.Math.Distance.Between(x, y, l.img.x, l.img.y);
        if (d < bestD) { bestD = d; best = l; }
      }
      if (!best) return;
      this.held = best;
      this.dragId = p.id;
      this.tweens.killTweensOf(best.img);
      best.img.setDepth(70).setAngle(0);
      sfx('grab', { volume: 0.6 });
      pose(this, this.boy, 'boy_lift', BOY.h * 0.8);
    }
  }

  private move(p: Phaser.Input.Pointer): void {
    if (!this.held || p.id !== this.dragId) return;
    const v = view();
    this.held.img.setPosition(Phaser.Math.Clamp(p.worldX, v.x + 16, v.right - 16), Phaser.Math.Clamp(p.worldY - 18, 540, 704));
  }

  private up(p: Phaser.Input.Pointer): void {
    if (!this.held || p.id !== this.dragId) return;
    const l = this.held;
    this.held = null;
    this.dragId = -1;
    pose(this, this.boy, 'boy_idle', BOY.h);
    const top = SACK.foot - SACK.h;
    if (Math.abs(l.img.x - SACK.x) < 52 && l.img.y > top - 50 && l.img.y < SACK.foot + 10) {
      l.done = true;
      this.tweens.add({ targets: l.img, x: SACK.x, y: top + 8, scale: l.img.scale * 0.5, alpha: 0, duration: 300, ease: 'Quad.easeIn', onComplete: () => l.img.setVisible(false) });
      this.tweens.add({ targets: this.sack, scaleY: { from: this.sack.scaleY * 0.93, to: this.sack.scaleY }, duration: 260, delay: 220, ease: 'Back.easeOut' });
      sfx('rustle', { volume: 0.5 });
      // A finished step chimes, except in a quiet deed, which has no chime at all.
      // Not on the last piece (not on the step that finishes the deed: that would be a reward sting).
      if (!this.quiet && this.litter.some((x) => !x.done)) this.time.delayedCall(240, () => sfx('chime', { volume: 0.4 }));
      if (this.litter.every((x) => x.done)) void (this.quiet ? this.quietEnding() : this.ending());
    } else {
      // Dropped on the sand: it stays where he left it.
      const y = Phaser.Math.Clamp(l.img.y, 560, 704);
      l.home = { x: l.img.x, y };
      this.tweens.add({ targets: l.img, y, duration: 180, onComplete: () => l.img.setDepth(30 + y / 100) });
    }
    this.kickIdle();
  }

  // ---------------------------------------------------------------- the turtle

  /** He does not touch it: the father says who helps a turtle. */
  private async touchTurtle(): Promise<void> {
    pose(this, this.boy, 'boy_worried', BOY.h);
    if (this.touchSaid) return;
    this.touchSaid = true;
    await Voice.say('q1_touch');
  }

  private async ringBell(): Promise<void> {
    this.state = 'rescue';
    this.setIdle(null);
    this.bellRing?.destroy();
    this.bellRing = null;
    // He runs to the hut and rings the bell.
    await walkTo(this, this.boy, { x: 246, y: 640 }, BOY.h * depth(640), undefined, 170);
    if (!this.alive) return;
    pose(this, this.boy, 'boy_wave', BOY.h * depth(640));
    this.boy.setFlipX(true); // boy_wave faces left: he faces the hut
    // The bell rings (a plain ding-dong, not the step chime): calling an adult is not rewarded with a sound.
    for (let i = 0; i < 2; i++) this.time.delayedCall(i * 320, () => this.alive && sfx('knock', { volume: 0.45 }));
    const ring = this.add.image(BELL.x, BELL.y, 'fx_glow').setDisplaySize(70, 70).setDepth(21).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: ring, alpha: 0.8, duration: 200, yoyo: true, repeat: 2, onComplete: () => ring.destroy() });
    await this.wait(900);
    if (!this.alive) return;
    // The ranger comes out of the hut and down to the turtle.
    const turtle = this.turtle as Phaser.GameObjects.Image;
    const r = this.add.image(DOOR.x, DOOR.foot, 'ranger_stand').setOrigin(0.5, 1).setDepth(34).setAlpha(0);
    fitHeight(r, RANGER_H * depth(DOOR.foot));
    this.ranger = r;
    sfx('door', { volume: 0.4 });
    this.tweens.add({ targets: r, alpha: 1, duration: 300 });
    this.boy.setFlipX(false);
    pose(this, this.boy, 'boy_idle', BOY.h * depth(640));
    await this.wait(400);
    if (!this.alive) return;
    await Voice.say('q1_ranger');
    if (!this.alive) return;
    const to = { x: turtle.x + 92, y: TURTLE.foot + 10 };
    const steps = this.time.addEvent({ delay: 340, loop: true, callback: () => sfx('step', { volume: 0.35 }) });
    this.tweens.add({ targets: r, angle: { from: -2, to: 2 }, duration: 240, yoyo: true, repeat: -1 });
    await new Promise<void>((res) => this.tweens.add({
      targets: r, x: to.x, y: to.y, scale: (RANGER_H * depth(to.y)) / r.frame.height, duration: 1900, ease: 'Sine.easeInOut', onComplete: () => res(),
    }));
    steps.remove();
    if (!this.alive) return;
    this.tweens.killTweensOf(r);
    r.setAngle(0).setTexture('ranger_kneel');
    fitHeight(r, 150 * 0.8 * depth(to.y));
    // He sets his bucket down: the boy holds it for him.
    const b = this.add.image(to.x + 34, to.y + 4, 'bucket_empty').setOrigin(0.5, 1).setDepth(37);
    fitHeight(b, 48); // he takes it: at least 44 points tall
    this.bucket = b;
    this.state = 'bucket';
    this.setIdle(() => this.showHint());
  }

  private async holdBucket(): Promise<void> {
    const b = this.bucket as Phaser.GameObjects.Image;
    const r = this.ranger as Phaser.GameObjects.Image;
    const turtle = this.turtle as Phaser.GameObjects.Image;
    this.state = 'rescue';
    this.setIdle(null);
    sfx('grab', { volume: 0.6 });
    // He stands beside the ranger, holding the bucket out.
    await walkTo(this, this.boy, { x: b.x + 48, y: TURTLE.foot + 34 }, BOY.h * depth(TURTLE.foot + 34));
    if (!this.alive) return;
    pose(this, this.boy, 'boy_offer', BOY.h * depth(TURTLE.foot + 34));
    this.boy.setFlipX(true); // he faces the ranger
    b.setDepth(61);
    this.tweens.add({ targets: b, x: this.boy.x - 24, y: this.boy.y - this.boy.displayHeight * 0.36, duration: 300 });
    await this.wait(500);
    if (!this.alive) return;
    // The ranger frees the turtle; the bag goes into the bucket.
    for (let i = 0; i < 3; i++) {
      sfx('rustle', { volume: 0.6 });
      await new Promise<void>((res) => this.tweens.add({ targets: r, angle: -4, duration: 260, yoyo: true, onComplete: () => res() }));
      if (!this.alive) return;
    }
    const bag = this.add.image(turtle.x + 10, turtle.y - 12, 'plastic_bag').setDepth(62);
    fitHeight(bag, LITTER_H * 0.8);
    this.tweens.killTweensOf(turtle);
    turtle.setAngle(0).setTexture('turtle_free');
    fitHeight(turtle, TURTLE.h);
    await new Promise<void>((res) => this.tweens.add({ targets: bag, x: b.x, y: b.y - 20, scale: bag.scale * 0.6, duration: 600, ease: 'Sine.easeInOut', onComplete: () => res() }));
    if (!this.alive) return;
    bag.destroy();
    sfx('pop', { volume: 0.5 });
    // The turtle walks back into the sea.
    this.tweens.add({ targets: turtle, y: SHORE_Y - 4, x: turtle.x - 20, scale: turtle.scale * 0.85, duration: 2600, ease: 'Sine.easeIn' });
    this.tweens.add({ targets: turtle, angle: { from: -3, to: 3 }, duration: 320, yoyo: true, repeat: 7 });
    await this.wait(2500);
    if (!this.alive) return;
    sfx('splash', { volume: 0.5 });
    droplets(this, turtle.x, SHORE_Y, 10, 36);
    this.tweens.add({ targets: turtle, alpha: 0.35, duration: 800 });
    await Voice.say('q1_free');
    if (!this.alive) return;
    // The ranger takes his bucket and goes back; now the boy clears the sand.
    r.setTexture('ranger_stand');
    fitHeight(r, RANGER_H * depth(r.y));
    breathe(this, r);
    this.boy.setFlipX(false);
    this.tweens.add({ targets: b, x: r.x - 20, y: r.y - 60, alpha: 0, duration: 400 });
    pose(this, this.boy, 'boy_idle', BOY.h * depth(this.boy.y));
    this.tweens.add({ targets: r, x: DOOR.x, y: DOOR.foot, scale: (RANGER_H * depth(DOOR.foot)) / r.frame.height, alpha: 0, delay: 500, duration: 2200, ease: 'Sine.easeInOut' });
    // Back to where he can reach the plastic.
    await walkTo(this, this.boy, { x: BOY.x, y: BOY.foot }, BOY.h);
    if (!this.alive) return;
    pose(this, this.boy, 'boy_idle', BOY.h);
    this.state = 'clean';
    this.setIdle(() => this.showHint());
    await Voice.say('q1_clean');
  }

  // ---------------------------------------------------------------- endings

  /** The turtle swims out; the water is clear behind it. */
  private async ending(): Promise<void> {
    this.state = 'end';
    this.setIdle(null);
    this.hint.clear();
    pose(this, this.boy, 'boy_happy', BOY.h);
    const turtle = this.turtle as Phaser.GameObjects.Image;
    turtle.setAlpha(0.9).setPosition(view().right + 40, 430).setDepth(5);
    fitHeight(turtle, TURTLE.h * 0.7);
    this.tweens.add({ targets: turtle, x: view().x - 60, duration: 9000, ease: 'Linear' });
    this.tweens.add({ targets: turtle, y: 436, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    await this.wait(1400);
    if (!this.alive) return;
    await Voice.say('q1_end');
    if (!this.alive) return;
    await this.finishAdventure('aqaba', 'q1_hadith');
  }

  /** He goes. The sun comes up, and a turtle crosses the clean sand to the water. */
  private async quietEnding(): Promise<void> {
    this.state = 'end';
    this.setIdle(null);
    this.hint.clear();
    await walkTo(this, this.boy, { x: view().x - 70, y: BOY.foot }, BOY.h);
    if (!this.alive) return;
    this.boy.setVisible(false);
    if (this.dawn) this.tweens.add({ targets: this.dawn, fillAlpha: 0, duration: 3000, ease: 'Sine.easeInOut' });
    sfx('birds', { volume: 0.5 });
    await this.wait(1600);
    if (!this.alive) return;
    completeMission('aqaba');
    const t = this.add.image(view().right + 40, 690, 'turtle_free').setOrigin(0.5, 1).setDepth(35);
    fitHeight(t, TURTLE.h * 1.1);
    this.tweens.add({ targets: t, angle: { from: -3, to: 3 }, duration: 330, yoyo: true, repeat: -1 });
    await new Promise<void>((res) => this.tweens.add({ targets: t, x: 150, y: SHORE_Y + 6, scale: t.scale * 0.8, duration: 6000, ease: 'Sine.easeInOut', onComplete: () => res() }));
    if (!this.alive) return;
    sfx('splash', { volume: 0.4 });
    dustPuff(this, t.x, SHORE_Y + 6, 6, 0xffffff, 36);
    this.tweens.add({ targets: t, alpha: 0, duration: 800 });
    await Voice.say('qdq_end');
    if (!this.alive) return;
    await this.finishAdventure('aqaba', null);
  }

  private showHint(): void {
    if (!this.alive || this.held) return this.kickIdle();
    const again = () => this.kickIdle();
    if (this.state === 'bell') this.hint.show('tap', { x: BELL.x, y: BELL.y }, undefined, again);
    else if (this.state === 'bucket' && this.bucket) this.hint.show('tap', { x: this.bucket.x, y: this.bucket.y - 24 }, undefined, again);
    else if (this.state === 'clean') {
      const l = this.litter.find((x) => !x.done);
      if (l) this.hint.show('drag', { x: l.img.x, y: l.img.y }, { x: SACK.x, y: SACK.foot - SACK.h / 2 }, again);
      else again();
    } else again();
  }
}

/** Aqaba's quiet deed: the same beach at sunrise (MISSIONS_V2.md section 6). */
export class AqabaSunriseScene extends BeachScene {
  constructor() {
    super('aqaba-sunrise');
  }
}
