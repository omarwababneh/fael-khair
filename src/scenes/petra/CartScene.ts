import Phaser from 'phaser';
import { fitHeight, fitWidth } from '../../core/assets';
import { droplets, dustPuff, glowRing, HintHand, motes } from '../../core/fx';
import { music } from '../../core/music';
import { completeMission } from '../../core/session';
import { sfx } from '../../core/sfx';
import { ui } from '../../core/ui';
import { view } from '../../core/viewport';
import { Voice } from '../../core/voice';
import { BaseScene } from '../BaseScene';

// P3. Petra: loading the cart (value: helping someone with his load; source
// bukhari_2989, part "mount"). MISSIONS_V2.md section 5.
//
// The old man's sacks slid off his cart. The old man lifts the big sack; the
// boy lifts only the small ones, one at a time, onto the cart. The cart tips if
// one side is loaded more, so he balances left and right. The last sack is one
// too many: the donkey's ears droop. He leaves it for the old man's next trip
// and brings the donkey water instead. A humane load is part of the lesson.

// cart_empty (768 x 371): the wheel hub is at (210, 230), the wheel's bottom at
// y = 365, the bed's top rim at y = 15 to 60, the shaft tips at x = 760.
const CART_ART = { hubX: 210, hubY: 230, wheelBottom: 365, rimY: 60 };
// Sizes follow the art checklist (boy = 1.0): cart 1.3 wide, old man 1.3, donkey 1.0
// (0.9 tired), small sack 0.3, big sack 0.5, bucket 0.43.
const CART_W = 161;
const AXLE = { x: 170, y: 652 };
const CART_S = CART_W / 768;
const GROUND = AXLE.y + (CART_ART.wheelBottom - CART_ART.hubY) * CART_S; // under the wheel
// The donkey stands at the shaft tips (hub to tip: 550 px of the cart art).
const DONKEY = { x: AXLE.x + Math.round(550 * CART_S) + 12, h: 124, tiredH: 112 };
const ELDER = { x: 68, h: 161 };
const BOY = { x: 262, y: 726, h: 124 };
const SMALL_H = 44; // a small sack on the ground (at least 44 points: he must touch it)
const BED_SMALL_H = 44;
const BED_BIG_H = 56;
// Where sacks sit in the bed, relative to the axle (x), bottoms hidden behind the rim.
const BED_BOTTOM = -(CART_ART.hubY - 75) * CART_S;
const SLOTS = { left: [-22, -35, -9], right: [26, 39, 13] };
const BED_CENTER = 4;
const TILT_PER_SACK = 4; // degrees
// Their bottoms stay above y = 716: on a 375 x 667 phone the speech bubble's top
// edge is at about y = 731 (DECISIONS.md 92).
const GROUND_SPOTS = [
  { x: 36, y: 708 }, { x: 96, y: 716 }, { x: 150, y: 706 }, { x: 206, y: 716 },
  { x: 322, y: 716 }, { x: 368, y: 706 }, { x: 124, y: 692 },
];
const WALL_SPOT = { x: 28, y: 640 }; // where the extra sack waits for the next trip
const BUCKET_SPOT = { x: 112, y: 708 };

type State = 'intro' | 'load' | 'extra' | 'water' | 'end';
type Side = 'left' | 'right';

interface Sack {
  img: Phaser.GameObjects.Image;
  home: { x: number; y: number };
  side: Side | null;
  base: number;
}

export class CartScene extends BaseScene {
  private state: State = 'intro';
  private cart!: Phaser.GameObjects.Container;
  private cartImg!: Phaser.GameObjects.Image;
  private donkey!: Phaser.GameObjects.Image;
  private donkeyScale = 1;
  private elder!: Phaser.GameObjects.Image;
  private boy!: Phaser.GameObjects.Image;
  private sacks: Sack[] = [];
  private bucket: Phaser.GameObjects.Image | null = null;
  private bucketRing: Phaser.GameObjects.Image | null = null;
  private dragging: Sack | null = null;
  private draggingBucket = false;
  private dragId = -1;
  private hint!: HintHand;
  private toLoad = 4; // balanced sacks; one more is too many
  private loaded = { left: 0, right: 0 };
  private tipSaid = false;
  private bucketScale = 1;
  /** A sack is on its way into the bed: no new grab until it has landed and been judged. */
  private landing = false;
  private introDone = false;

  constructor() {
    super('p3');
  }

  create(): void {
    this.setup();
    this.state = 'intro';
    this.sacks = [];
    this.bucket = this.bucketRing = null;
    this.dragging = null;
    this.draggingBucket = false;
    this.dragId = -1;
    this.loaded = { left: 0, right: 0 };
    this.tipSaid = false;
    this.landing = false;
    this.introDone = false;
    this.hint = new HintHand(this);
    // Small variation on replay: four or six sacks to balance, lying in different places.
    this.toLoad = Math.random() < 0.5 ? 4 : 6;

    ui.setPill('البَتْرا');
    ui.setHome(() => this.goTo('map'));
    ui.clearBubble();
    music.play('petra');

    const bg = this.addCover('bg_petra_tombs');
    this.tweens.add({ targets: bg, scale: bg.scale * 1.01, duration: 9000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    motes(this, { x: 20, y: 160, w: 350, h: 480 }, 40);

    // The cart, tipping about its wheel hub. Sacks in the bed are drawn behind its front rim.
    this.cartImg = this.add.image(0, 0, 'cart_empty').setOrigin(CART_ART.hubX / 768, CART_ART.hubY / 371);
    fitWidth(this.cartImg, CART_W);
    this.cart = this.add.container(AXLE.x, AXLE.y, [this.cartImg]).setDepth(30);

    // The donkey, hitched at the end of the shafts (drawn in front of them).
    this.donkey = this.add.image(DONKEY.x, GROUND + 2, 'donkey_stand').setOrigin(0.5, 1).setDepth(31);
    this.donkeyScale = fitHeight(this.donkey, DONKEY.h);
    this.tweens.add({ targets: this.donkey, scaleY: this.donkey.scaleY * 1.012, duration: 1700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    this.elder = this.add.image(ELDER.x, GROUND + 8, 'elder_stand').setOrigin(0.5, 1).setDepth(33);
    fitHeight(this.elder, ELDER.h);
    this.tweens.add({ targets: this.elder, scaleY: this.elder.scaleY * 1.012, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    this.boy = this.add.image(BOY.x, BOY.y, 'boy_idle').setOrigin(0.5, 1).setDepth(36);
    fitHeight(this.boy, BOY.h);

    // The sacks that slid off: the big one beside the old man, the small ones around.
    const spots = Phaser.Utils.Array.Shuffle(GROUND_SPOTS.slice()).slice(0, this.toLoad + 1);
    for (const spot of spots) {
      const img = this.add.image(spot.x, spot.y, 'sack_small').setOrigin(0.5, 1).setDepth(34 + spot.y / 1000).setAngle(Phaser.Math.Between(-8, 8));
      const base = fitHeight(img, SMALL_H);
      this.sacks.push({ img, home: spot, side: null, base });
    }
    const big = this.add.image(ELDER.x + 46, GROUND + 22, 'sack_big').setOrigin(0.5, 1).setDepth(34.7).setAngle(-6);
    fitHeight(big, BOY.h * 0.5);

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.down(p));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.move(p));
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => this.up(p));
    this.input.on('pointerupoutside', (p: Phaser.Input.Pointer) => this.up(p));
    this.events.once('shutdown', () => this.hint.clear());
    this.time.addEvent({ delay: 7500, loop: true, callback: () => Math.random() < 0.6 && sfx('birds', { volume: 0.45 }) });

    // He may start loading at once (an easy first win inside 10 seconds),
    // while the old man lifts the big sack.
    this.state = 'load';
    // The hint hand is ready at once (it shows after 3 seconds if he has not touched anything).
    this.setIdle(() => this.showHint());
    void this.intro(big);
  }

  /** The old man lifts the big sack himself (the boy carries only light things). */
  private async intro(big: Phaser.GameObjects.Image): Promise<void> {
    await Voice.say('p3_open');
    if (!this.alive) return;
    const said = Voice.say('p3_big');
    this.tweens.add({ targets: this.elder, angle: -5, duration: 400, yoyo: true, hold: 500 });
    sfx('grab');
    await new Promise<void>((res) => this.tweens.add({ targets: big, x: ELDER.x + 30, y: GROUND - 60, angle: 0, duration: 700, ease: 'Sine.easeOut', onComplete: () => res() }));
    if (!this.alive) return;
    // Into the middle of the bed, over the wheel: it does not tip the cart.
    big.destroy();
    const inBed = this.add.image(BED_CENTER, BED_BOTTOM + 4, 'sack_big').setOrigin(0.5, 1);
    fitHeight(inBed, BED_BIG_H);
    const world = { x: AXLE.x + BED_CENTER, y: AXLE.y + BED_BOTTOM };
    this.cart.addAt(inBed, 0);
    inBed.setPosition(ELDER.x + 30 - AXLE.x, GROUND - 60 - AXLE.y);
    await new Promise<void>((res) => this.tweens.add({ targets: inBed, x: world.x - AXLE.x, y: world.y - AXLE.y + 4, duration: 600, ease: 'Quad.easeIn', onComplete: () => res() }));
    if (!this.alive) return;
    sfx('thud', { weight: 0.6 });
    dustPuff(this, AXLE.x, AXLE.y - 40, 8, 0xd9b98a, 35);
    this.tweens.add({ targets: this.cart, y: AXLE.y + 2, duration: 120, yoyo: true });
    await said;
    if (!this.alive) return;
    this.introDone = true;
    if (this.state !== 'load') return;
    if (this.loaded.left + this.loaded.right === 0 && !Voice.busy) void Voice.say('p3_hint');
  }

  // ---------------------------------------------------------------- input

  private down(p: Phaser.Input.Pointer): void {
    if (!this.alive || this.dragging || this.draggingBucket || this.landing) return;
    this.hint.clear();
    const x = p.worldX, y = p.worldY;
    if (this.state === 'load') {
      let best: Sack | null = null, bestD = 44;
      for (const s of this.sacks) {
        if (s.side) continue;
        const d = Phaser.Math.Distance.Between(x, y, s.img.x, s.img.y - SMALL_H / 2);
        if (d < bestD) { bestD = d; best = s; }
      }
      if (!best) return;
      this.dragging = best;
      this.dragId = p.id;
      best.img.setDepth(70);
      this.tweens.killTweensOf(best.img);
      this.tweens.add({ targets: best.img, scaleX: { from: best.base * 1.15, to: best.base * 1.05 }, scaleY: { from: best.base * 0.88, to: best.base * 1.05 }, angle: 0, duration: 200, ease: 'Back.easeOut' });
      sfx('grab');
      this.boy.setTexture('boy_lift');
      fitHeight(this.boy, BOY.h * 0.81);
    } else if (this.state === 'water' && this.bucket) {
      if (Phaser.Math.Distance.Between(x, y, this.bucket.x, this.bucket.y - 20) < 46) {
        this.draggingBucket = true;
        this.dragId = p.id;
        this.bucket.setDepth(70);
        this.bucketRing?.setVisible(false);
        sfx('grab');
      }
    }
  }

  private move(p: Phaser.Input.Pointer): void {
    if (p.id !== this.dragId) return;
    const v = view();
    const x = Phaser.Math.Clamp(p.worldX, v.x + 10, v.right - 10), y = Phaser.Math.Clamp(p.worldY + 16, 300, 770);
    if (this.dragging) this.dragging.img.setPosition(x, y);
    else if (this.draggingBucket && this.bucket) this.bucket.setPosition(x, y);
  }

  private up(p: Phaser.Input.Pointer): void {
    if (p.id !== this.dragId) return;
    this.dragId = -1;
    this.boy.setTexture('boy_idle');
    fitHeight(this.boy, BOY.h);
    if (this.dragging) {
      const s = this.dragging;
      this.dragging = null;
      const x = s.img.x, y = s.img.y;
      const overBed = x > AXLE.x - 75 && x < AXLE.x + 85 && y > AXLE.y - 130 && y < AXLE.y + 10;
      if (overBed) this.loadSack(s, x < AXLE.x + BED_CENTER ? 'left' : 'right');
      else this.sendHome(s);
    } else if (this.draggingBucket && this.bucket) {
      this.draggingBucket = false;
      const head = this.donkeyHead();
      if (Phaser.Math.Distance.Between(this.bucket.x, this.bucket.y, head.x, head.y + 30) < 80) void this.water();
      else {
        sfx('slide', { volume: 0.6 });
        this.tweens.add({ targets: this.bucket, x: BUCKET_SPOT.x, y: BUCKET_SPOT.y, duration: 380, ease: 'Back.easeOut', onComplete: () => this.bucketRing?.setVisible(true) });
      }
    }
    this.kickIdle();
  }

  private sendHome(s: Sack): void {
    sfx('slide', { volume: 0.6 });
    this.tweens.add({
      targets: s.img, x: s.home.x, y: s.home.y, scaleX: s.base, scaleY: s.base, angle: Phaser.Math.Between(-6, 6), duration: 400, ease: 'Back.easeOut',
      onComplete: () => s.img.setDepth(34 + s.home.y / 1000),
    });
  }

  // ---------------------------------------------------------------- loading and balance

  private tiltAngle(): number {
    return (this.loaded.right - this.loaded.left) * TILT_PER_SACK;
  }

  /** Put a sack into the bed on one side. */
  private loadSack(s: Sack, side: Side): void {
    this.landing = true;
    const slot = SLOTS[side][this.loaded[side] % SLOTS[side].length];
    s.side = side;
    this.loaded[side]++;
    // Move the image into the cart container, keeping where it is on screen.
    const local = this.toCart(s.img.x, s.img.y);
    s.img.setPosition(local.x, local.y).setDepth(0).setAngle(-this.cart.angle);
    this.cart.addAt(s.img, 0);
    const scale = BED_SMALL_H / s.img.frame.height;
    this.tweens.add({
      targets: s.img, x: slot + Phaser.Math.Between(-3, 3), y: BED_BOTTOM - (this.loaded[side] > 1 ? 4 : 0), scaleX: scale, scaleY: scale, angle: Phaser.Math.Between(-5, 5),
      duration: 260, ease: 'Quad.easeIn',
      onComplete: () => this.landed(s),
    });
  }

  private toCart(x: number, y: number): { x: number; y: number } {
    const a = -this.cart.rotation;
    const dx = x - this.cart.x, dy = y - this.cart.y;
    return { x: dx * Math.cos(a) - dy * Math.sin(a), y: dx * Math.sin(a) + dy * Math.cos(a) };
  }

  private landed(s: Sack): void {
    sfx('thud', { weight: 0.3, volume: 0.8 });
    sfx('creak', { volume: 0.6 });
    // Judged with the count and the balance read together, after the sack is in.
    const count = this.loaded.left + this.loaded.right;
    const diff = this.loaded.left - this.loaded.right;
    if (Math.abs(diff) >= 2) {
      void this.tipOver(s);
      return;
    }
    if (count > this.toLoad) {
      void this.tooMuch(s);
      return;
    }
    this.landing = false;
    this.settle();
    // A finished step chimes (a mechanical step, not a moral choice).
    this.time.delayedCall(240, () => sfx('chime', { volume: 0.4 }));
  }

  private settle(extra = 0): void {
    this.tweens.add({ targets: this.cart, angle: this.tiltAngle() + extra, duration: 500, ease: 'Back.easeOut' });
  }

  /** Too much on one side: the cart tips and the last sack slides back down. */
  private async tipOver(s: Sack): Promise<void> {
    const dir = this.loaded.left > this.loaded.right ? -1 : 1;
    sfx('creak', { volume: 0.9 });
    this.tweens.add({ targets: this.cart, angle: dir * 11, duration: 380, ease: 'Quad.easeOut' });
    this.cameras.main.shake(140, 0.003);
    await this.wait(450);
    if (!this.alive) return;
    // The sack slides off and goes back to where it lay.
    this.unload(s);
    this.settle();
    this.landing = false;
    if (!this.tipSaid) {
      this.tipSaid = true;
      void Voice.say('p3_balance');
    }
  }

  /** Take a sack out of the bed and put it back on the ground (where it lay, or by the wall). */
  private unload(s: Sack, to = s.home): void {
    if (s.side) this.loaded[s.side]--;
    s.side = null;
    const m = s.img.getWorldTransformMatrix();
    this.cart.remove(s.img); // back on the scene's display list
    s.img.setPosition(m.tx, m.ty).setAngle(Phaser.Math.RadToDeg(m.rotation)).setScale(BED_SMALL_H / s.img.frame.height).setDepth(34 + to.y / 1000);
    sfx('slide', { volume: 0.7 });
    this.tweens.add({ targets: s.img, x: to.x, y: to.y, angle: 6, scaleX: s.base, scaleY: s.base, duration: 650, ease: 'Sine.easeInOut' });
    s.home = to;
  }

  /** One sack too many: the donkey's ears droop. It waits for the next trip. */
  private async tooMuch(s: Sack): Promise<void> {
    this.state = 'extra';
    this.setIdle(null);
    this.settle(0);
    this.tweens.add({ targets: this.cart, y: AXLE.y + 3, duration: 300 });
    this.donkeyPose('donkey_tired');
    sfx('creak', { volume: 0.8 });
    await this.wait(600);
    if (!this.alive) return;
    await Voice.say('p3_toomuch');
    if (!this.alive) return;
    // He takes it back down; it waits by the wall for the old man's next trip.
    this.unload(s, WALL_SPOT);
    this.tweens.add({ targets: this.cart, y: AXLE.y, angle: this.tiltAngle(), duration: 500 });
    await Voice.say('p3_nexttrip');
    if (!this.alive) return;
    // Water for the donkey instead.
    this.bucket = this.add.image(BUCKET_SPOT.x, BUCKET_SPOT.y, 'bucket_full').setOrigin(0.5, 1).setDepth(35);
    this.bucketScale = fitHeight(this.bucket, BOY.h * 0.43);
    this.bucket.setScale(0.01);
    this.tweens.add({ targets: this.bucket, scale: this.bucketScale, duration: 400, ease: 'Back.easeOut' });
    this.bucketRing = glowRing(this, BUCKET_SPOT.x, BUCKET_SPOT.y - 22, 30, 34);
    this.state = 'water';
    this.landing = false;
    this.setIdle(() => this.showHint());
    await Voice.say('p3_water');
  }

  private donkeyPose(key: 'donkey_stand' | 'donkey_tired'): void {
    this.tweens.killTweensOf(this.donkey);
    this.donkey.setTexture(key);
    if (key === 'donkey_tired') fitHeight(this.donkey, DONKEY.tiredH);
    else this.donkey.setScale(this.donkeyScale);
    // The tired picture leans its head forward: keep the body over the same spot.
    this.donkey.setX(key === 'donkey_tired' ? DONKEY.x + 12 : DONKEY.x);
    this.tweens.add({ targets: this.donkey, scaleY: this.donkey.scaleY * 1.012, duration: 1700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  /** Where the donkey's head is, for the bucket. */
  private donkeyHead(): { x: number; y: number } {
    const w = this.donkey.frame.width * this.donkey.scaleX;
    const h = this.donkey.frame.height * this.donkey.scaleY;
    return { x: this.donkey.x + w * 0.38, y: this.donkey.y - h * 0.55 };
  }

  /** The donkey drinks, and the cart can go. */
  private async water(): Promise<void> {
    if (!this.bucket) return;
    this.state = 'end';
    this.setIdle(null);
    this.bucketRing?.destroy();
    this.bucketRing = null;
    const head = this.donkeyHead();
    this.tweens.add({ targets: this.bucket, x: head.x + 4, y: GROUND + 10, scale: this.bucketScale, duration: 300, ease: 'Sine.easeOut' });
    await this.wait(400);
    if (!this.alive) return;
    sfx('lap');
    droplets(this, head.x + 4, GROUND - 24, 8, 60);
    this.time.delayedCall(800, () => this.alive && sfx('lap'));
    await this.wait(1800);
    if (!this.alive) return;
    this.donkeyPose('donkey_stand');
    this.tweens.add({ targets: this.donkey, y: GROUND - 6, duration: 180, yoyo: true });
    // The story's consequence is done: the place counts even if he taps home now.
    completeMission('petra');
    await this.wait(500);
    if (!this.alive) return;
    // The cart rolls on, level; the donkey walks easily; the old man walks beside it.
    const said = Voice.say('p3_end');
    const v = view();
    const dist = v.right + 260 - AXLE.x;
    const creak = this.time.addEvent({ delay: 800, loop: true, callback: () => sfx('creak', { volume: 0.5 }) });
    this.tweens.add({ targets: this.cart, angle: 0, duration: 300 });
    this.tweens.add({ targets: [this.cart, this.donkey], x: `+=${dist}`, duration: 6000, ease: 'Sine.easeIn', delay: 300 });
    this.tweens.add({ targets: this.cartImg, angle: { from: -1, to: 1 }, duration: 240, yoyo: true, repeat: 12, delay: 300 });
    this.tweens.add({ targets: this.elder, angle: { from: -2, to: 2 }, duration: 300, yoyo: true, repeat: 10, delay: 900 });
    this.tweens.add({ targets: this.elder, x: v.right + 60, duration: 6500, ease: 'Sine.easeIn', delay: 900 });
    this.boy.setTexture('boy_happy');
    fitHeight(this.boy, BOY.h);
    await Promise.all([said, this.wait(5000)]);
    creak.remove();
    if (!this.alive) return;
    await this.finishAdventure('petra', 'p3_hadith');
  }

  // ---------------------------------------------------------------- hints

  private showHint(): void {
    if (!this.alive) return;
    if (this.state === 'load') {
      const s = this.sacks.find((x) => !x.side && x.home !== WALL_SPOT);
      if (!s) return;
      const side: Side = this.loaded.left <= this.loaded.right ? 'left' : 'right';
      const to = { x: AXLE.x + (side === 'left' ? -30 : 40), y: AXLE.y - 50 };
      this.hint.show('drag', { x: s.img.x, y: s.img.y - SMALL_H / 2 }, to, () => this.kickIdle());
    } else if (this.state === 'water' && this.bucket) {
      const head = this.donkeyHead();
      this.hint.show('drag', { x: this.bucket.x, y: this.bucket.y - 20 }, { x: head.x, y: head.y + 20 }, () => this.kickIdle());
    }
  }
}
