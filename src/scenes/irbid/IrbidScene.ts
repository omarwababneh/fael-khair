import Phaser from 'phaser';
import { fitHeight, fitWidth } from '../../core/assets';
import { HintHand, motes } from '../../core/fx';
import { music } from '../../core/music';
import { sfx } from '../../core/sfx';
import { ui } from '../../core/ui';
import { view } from '../../core/viewport';
import { Voice } from '../../core/voice';
import { BaseScene } from '../BaseScene';

// Irbid: the secret helper (value: sincerity, doing good unseen; source bukhari_660).
// HARD RULE: no thanks to the boy, no sparkle, no cheer, no special sound, no
// badge, nothing unlocked. The only reward is watching her smile from behind the
// tree. This scene plays no chime at all. Positions are in the 390 x 844 design
// frame; tune them once the art arrives.

const FOODS = ['food_bread', 'food_olives', 'food_labneh', 'food_tomatoes', 'food_apples'];
// Measured on the delivered bg_irbid_dusk: the food waits in a row on the paving in
// front (it used to float over the wall), and the basket is about half the boy's height.
const FOOD_ROW = { y: 696, xs: [44, 166, 234, 300, 358] };
// Heights follow the art checklist (boy = 1.0): basket 0.5 empty, 0.55 full.
const BASKET = { x: 205, y: 660, h: 73, hFull: 80 };
// Where he hides: on the paving just past the end of the low basalt wall (not on it).
const TREE = { x: 94, y: 694 };
const DOOR = { x: 300, y: 560, w: 96, h: 160, step: 652 };
const STOP_X = 244; // where he stands at the door
const WINDOW = { x: 196, y: 318 };
const BOY_H = 146;
// The passerby walks along the street, farther back than the boy, so he is drawn
// smaller than the checklist's 1.35 (perspective).
const PASSERBY_H = 172;
const WALK_SPEED = 36; // points per second while tiptoeing
const STREET_Y = 612;

type State = 'pack' | 'sneak' | 'place' | 'knock' | 'hide' | 'end';
type Watch = 'none' | 'warning' | 'looking';

export class IrbidScene extends BaseScene {
  private state: State = 'pack';
  private boy!: Phaser.GameObjects.Container;
  private boyImg!: Phaser.GameObjects.Image;
  private basket!: Phaser.GameObjects.Image;
  private foods: Phaser.GameObjects.Image[] = [];
  private packed = 0;
  private dragFood: Phaser.GameObjects.Image | null = null;
  private pointerId = -1;
  private holding = false;
  private swipeStart = new Phaser.Math.Vector2();
  private watch: Watch = 'none';
  private watcher: 'window' | 'passerby' = 'window';
  private windowGlow!: Phaser.GameObjects.Image;
  private passerby: Phaser.GameObjects.Image | null = null;
  private events_: Phaser.Time.TimerEvent[] = [];
  private eventCount = 0;
  private knocks = 0;
  private stepClock = 0;
  private hint!: HintHand;

  constructor() {
    super('irbid');
  }

  create(): void {
    this.setup();
    this.state = 'pack';
    this.foods = [];
    this.packed = 0;
    this.dragFood = null;
    this.pointerId = -1;
    this.holding = false;
    this.watch = 'none';
    this.passerby = null;
    this.events_ = [];
    this.eventCount = 0;
    this.knocks = 0;
    this.hint = new HintHand(this);

    ui.setPill('إِرْبِد');
    ui.setHome(() => this.goTo('map'));
    ui.clearBubble();
    music.play('irbid', { natureOnly: true }); // I1 is Irbid's quiet deed: no music

    const bg = this.addCover('bg_irbid_dusk');
    this.tweens.add({ targets: bg, scale: bg.scale * 1.01, duration: 9000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    motes(this, { x: 30, y: 160, w: 330, h: 480 }, 40, 0xffd9a0);

    // A soft light behind the curtain: when it brightens, someone is looking out.
    this.windowGlow = this.add.image(WINDOW.x, WINDOW.y, 'fx_glow').setDisplaySize(150, 150).setDepth(5).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD);

    this.basket = this.add.image(BASKET.x, BASKET.y, 'basket_empty').setDepth(20);
    fitHeight(this.basket, BASKET.h);

    FOODS.forEach((key, i) => {
      const img = this.add.image(FOOD_ROW.xs[i], FOOD_ROW.y, key).setDepth(25);
      fitWidth(img, 58);
      img.setData('home', { x: img.x, y: img.y });
      img.setData('base', img.scale);
      this.tweens.add({ targets: img, y: img.y - 3, duration: 1200 + i * 130, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.foods.push(img);
    });

    this.boyImg = this.add.image(0, 0, 'boy_idle').setOrigin(0.5, 1);
    fitHeight(this.boyImg, BOY_H);
    this.boy = this.add.container(TREE.x + 50, TREE.y, [this.boyImg]).setDepth(30);
    this.tweens.add({ targets: this.boyImg, scaleY: this.boyImg.scaleY * 1.02, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.onDown(p));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.onMove(p));
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => this.onUp(p));
    this.input.on('pointerupoutside', (p: Phaser.Input.Pointer) => this.onUp(p));

    void Voice.say('ir_open');
    let packSaid = false;
    this.setIdle(() => {
      if (this.state === 'pack' && !packSaid) {
        packSaid = true;
        void Voice.say('ir_pack');
      }
      this.showHint();
    });
  }

  update(_t: number, dt: number): void {
    if (this.state !== 'sneak' || !this.holding) return;
    if (this.watch === 'looking') {
      this.noticed();
      return;
    }
    // Tiptoe.
    this.boy.x = Math.min(STOP_X, this.boy.x + (WALK_SPEED * dt) / 1000);
    this.stepClock += dt;
    if (this.stepClock > 340) {
      this.stepClock = 0;
      sfx('step', { volume: 0.18 });
      this.tweens.add({ targets: this.boyImg, y: { from: -4, to: 0 }, duration: 300, ease: 'Sine.easeOut' });
    }
    if (this.boy.x >= STOP_X) this.arrive();
  }

  // ------------------------------------------------------------ input

  private onDown(p: Phaser.Input.Pointer): void {
    this.hint.clear();
    this.pointerId = p.id;
    this.swipeStart.set(p.worldX, p.worldY);
    if (this.state === 'pack') {
      const f = this.foods.filter((x) => !x.getData('packed'))
        .map((x) => ({ x, d: Phaser.Math.Distance.Between(p.worldX, p.worldY, x.x, x.y) }))
        .filter((o) => o.d < 46).sort((a, b) => a.d - b.d)[0];
      if (f) {
        this.dragFood = f.x;
        this.tweens.killTweensOf(f.x);
        f.x.setDepth(60);
        const b = f.x.getData('base') as number;
        this.tweens.add({ targets: f.x, scaleX: { from: b * 1.2, to: b * 1.08 }, scaleY: { from: b * 0.86, to: b * 1.08 }, duration: 200, ease: 'Back.easeOut' });
        sfx('grab', { volume: 0.5 });
      }
    } else if (this.state === 'sneak') {
      this.holding = true;
    } else if (this.state === 'place') {
      if (Phaser.Math.Distance.Between(p.worldX, p.worldY, this.boy.x, this.boy.y - 60) < 90 ||
          Phaser.Math.Distance.Between(p.worldX, p.worldY, DOOR.x, DOOR.step) < 90) this.placeBasket();
    } else if (this.state === 'knock') {
      if (Math.abs(p.worldX - DOOR.x) < DOOR.w / 2 + 16 && Math.abs(p.worldY - DOOR.y) < DOOR.h / 2 + 16) this.knock();
    }
  }

  private onMove(p: Phaser.Input.Pointer): void {
    if (p.id !== this.pointerId) return;
    if (this.state === 'pack' && this.dragFood) this.dragFood.setPosition(p.worldX, p.worldY);
  }

  private onUp(p: Phaser.Input.Pointer): void {
    if (p.id !== this.pointerId) return;
    this.pointerId = -1;
    if (this.state === 'pack' && this.dragFood) {
      const f = this.dragFood;
      this.dragFood = null;
      if (Phaser.Math.Distance.Between(f.x, f.y, BASKET.x, BASKET.y) < 85) this.packFood(f);
      else {
        const home = f.getData('home') as { x: number; y: number };
        sfx('slide', { volume: 0.5 });
        this.tweens.add({ targets: f, x: home.x, y: home.y, scale: f.getData('base'), duration: 380, ease: 'Back.easeOut', onComplete: () => f.setDepth(25) });
      }
    } else if (this.state === 'sneak') {
      this.holding = false; // lift the finger to freeze
    } else if (this.state === 'hide') {
      // Swipe toward the olive tree to hide.
      if (p.worldX - this.swipeStart.x < -50) void this.runToTree();
    }
    this.kickIdle();
  }

  // ------------------------------------------------------------ beat 1: pack the basket

  private packFood(f: Phaser.GameObjects.Image): void {
    f.setData('packed', true);
    this.tweens.add({ targets: f, x: BASKET.x + Phaser.Math.Between(-24, 24), y: BASKET.y - 18, scale: (f.getData('base') as number) * 0.6, duration: 220, ease: 'Quad.easeIn' });
    this.tweens.add({ targets: f, alpha: 0, delay: 220, duration: 200 });
    this.tweens.add({ targets: this.basket, scaleY: { from: this.basket.scaleY * 0.9, to: this.basket.scaleY }, duration: 260, ease: 'Back.easeOut' });
    sfx('pop', { volume: 0.5 });
    this.packed++;
    if (this.packed < FOODS.length) return;
    this.time.delayedCall(450, () => {
      if (!this.alive) return;
      this.basket.setTexture('basket_full');
      fitHeight(this.basket, BASKET.hFull);
      void this.startSneak();
    });
  }

  // ------------------------------------------------------------ beat 2: sneak to the door

  private async startSneak(): Promise<void> {
    this.state = 'place'; // not interactive while he picks up the basket
    this.setIdle(null);
    await this.wait(400);
    if (!this.alive) return;
    // He picks up the basket and goes behind the olive tree.
    this.tweens.add({ targets: this.basket, alpha: 0, duration: 250 });
    this.pose('boy_carry');
    this.tweens.add({ targets: this.boy, x: TREE.x, duration: 600, ease: 'Sine.easeInOut' });
    await Voice.say('ir_sneak');
    if (!this.alive) return;
    this.state = 'sneak';
    this.holding = this.input.activePointer.isDown;
    this.setIdle(() => this.showHint());
    this.scheduleWatch(2200);
  }

  /** Someone looks: first a short warning, then a look. Freeze while they look. */
  private scheduleWatch(delay: number): void {
    const ev = this.time.delayedCall(delay, () => {
      if (!this.alive || this.state !== 'sneak') return;
      this.eventCount++;
      this.watcher = this.eventCount % 2 === 1 ? 'window' : 'passerby';
      // Rising challenge: the warning gets a little shorter each time.
      const warn = Math.max(550, 1000 - this.eventCount * 110);
      if (this.watcher === 'window') this.curtainWatch(warn);
      else this.passerbyWatch(warn);
    });
    this.events_.push(ev);
  }

  private curtainWatch(warn: number): void {
    this.watch = 'warning';
    sfx('rustle', { volume: 0.9 });
    this.tweens.add({ targets: this.windowGlow, alpha: 0.55, duration: warn, ease: 'Sine.easeIn' });
    this.events_.push(this.time.delayedCall(warn, () => {
      if (!this.alive || this.state !== 'sneak') return;
      this.watch = 'looking';
      this.tweens.add({ targets: this.windowGlow, alpha: 0.95, duration: 150 });
      this.events_.push(this.time.delayedCall(1700, () => this.endWatch()));
    }));
  }

  private passerbyWatch(warn: number): void {
    // A man walks along the street, stops, and turns his head toward the street.
    // He enters from just past the right edge of the frame (wider on some screens).
    const p = this.add.image(view().right + 70, STREET_Y, 'passerby_walk').setOrigin(0.5, 1).setDepth(24);
    fitHeight(p, PASSERBY_H);
    this.passerby = p;
    const stopX = 210;
    const walk = this.tweens.add({ targets: p, y: { from: STREET_Y, to: STREET_Y - 3 }, duration: 220, yoyo: true, repeat: -1 });
    this.tweens.add({
      targets: p, x: stopX, duration: 2600, ease: 'Linear',
      onComplete: () => {
        if (!this.alive || this.state !== 'sneak') return;
        walk.pause();
        this.watch = 'warning';
        sfx('step', { volume: 0.3 });
        this.events_.push(this.time.delayedCall(warn, () => {
          if (!this.alive || this.state !== 'sneak') return;
          this.watch = 'looking';
          p.setTexture('passerby_look');
          fitHeight(p, PASSERBY_H);
          this.events_.push(this.time.delayedCall(1700, () => {
            if (!this.alive) return;
            p.setTexture('passerby_walk');
            fitHeight(p, PASSERBY_H);
            walk.resume();
            this.passerbyLeaves(p);
            this.endWatch();
          }));
        }));
      },
    });
    this.watch = 'warning';
  }

  private passerbyLeaves(p: Phaser.GameObjects.Image): void {
    this.tweens.add({ targets: p, x: view().x - 80, duration: 3000, ease: 'Linear', onComplete: () => p.destroy() });
    if (this.passerby === p) this.passerby = null;
  }

  private endWatch(): void {
    if (!this.alive) return;
    this.watch = 'none';
    this.tweens.add({ targets: this.windowGlow, alpha: 0, duration: 600 });
    if (this.state === 'sneak') this.scheduleWatch(Phaser.Math.Between(1600, 2600));
  }

  /** He was seen: the passerby simply smiles and walks on; he ducks back behind the tree. */
  private noticed(): void {
    this.holding = false;
    this.state = 'place';
    for (const e of this.events_) e.remove();
    this.events_ = [];
    if (this.watcher === 'passerby' && this.passerby) {
      const p = this.passerby;
      p.setTexture('passerby_look');
      fitHeight(p, PASSERBY_H);
      this.time.delayedCall(900, () => {
        if (!this.alive) return;
        p.setTexture('passerby_walk');
        fitHeight(p, PASSERBY_H);
        this.passerbyLeaves(p);
      });
    }
    this.tweens.add({ targets: this.windowGlow, alpha: 0, duration: 900, delay: 500 });
    this.pose('boy_peek');
    sfx('slide', { volume: 0.4 });
    this.tweens.add({
      targets: this.boy, x: TREE.x, duration: 700, ease: 'Sine.easeInOut',
      onComplete: () => {
        if (!this.alive) return;
        this.time.delayedCall(700, () => {
          if (!this.alive) return;
          this.pose('boy_carry');
          this.watch = 'none';
          this.state = 'sneak';
          this.holding = this.input.activePointer.isDown;
          this.kickIdle();
          this.scheduleWatch(2400);
        });
      },
    });
  }

  private arrive(): void {
    this.state = 'place';
    this.holding = false;
    for (const e of this.events_) e.remove();
    this.events_ = [];
    this.watch = 'none';
    this.tweens.add({ targets: this.windowGlow, alpha: 0, duration: 400 });
    if (this.passerby) this.passerbyLeaves(this.passerby);
    void Voice.say('ir_knock');
    this.kickIdle();
  }

  // ------------------------------------------------------------ beat 3: deliver

  private placeBasket(): void {
    if (this.state !== 'place' || this.boy.x < STOP_X) return;
    this.state = 'knock';
    this.pose('boy_idle');
    this.basket.setPosition(DOOR.x - 6, DOOR.step).setAlpha(1).setDepth(26);
    sfx('thud', { weight: 0.05, volume: 0.4 });
    this.kickIdle();
  }

  private knock(): void {
    this.knocks++;
    sfx('knock');
    this.cameras.main.shake(60, 0.0015);
    if (this.knocks >= 3) {
      this.state = 'hide';
      this.kickIdle();
    }
  }

  private async runToTree(): Promise<void> {
    if (this.state !== 'hide') return;
    this.state = 'end';
    this.setIdle(null);
    // Quick, quiet steps back behind the olive tree.
    this.pose('boy_walk_a');
    let a = true;
    const steps = this.time.addEvent({ delay: 130, loop: true, callback: () => { a = !a; this.boyImg.setTexture(a ? 'boy_walk_a' : 'boy_walk_b'); fitHeight(this.boyImg, BOY_H); } });
    await new Promise<void>((res) => this.tweens.add({ targets: this.boy, x: TREE.x, duration: 900, ease: 'Sine.easeInOut', onComplete: () => res() }));
    steps.remove();
    if (!this.alive) return;
    this.pose('boy_peek');
    await this.wait(900);
    if (!this.alive) return;

    // The neighbor opens the door, looks left and right, finds the basket, smiles
    // and takes it inside. She never learns who left it. Nothing happens to him.
    sfx('door', { volume: 0.6 });
    const n = this.add.image(DOOR.x, DOOR.step, 'neighbor_basket').setOrigin(0.5, 1).setDepth(27).setAlpha(0);
    fitHeight(n, BOY_H * 1.25); // the neighbor: 1.25 of the boy (art checklist)
    this.tweens.add({ targets: n, alpha: 1, duration: 600 });
    await this.wait(800);
    if (!this.alive) return;
    this.basket.setVisible(false); // she holds it now
    for (let i = 0; i < 3; i++) {
      n.setFlipX(i % 2 === 0);
      await this.wait(650);
      if (!this.alive) return;
    }
    n.setFlipX(false);
    await this.wait(1200);
    if (!this.alive) return;
    this.tweens.add({ targets: n, alpha: 0, duration: 700 });
    await this.wait(600);
    if (!this.alive) return;
    sfx('door', { volume: 0.4 });
    await this.wait(800);
    if (!this.alive) return;
    await Voice.say('ir_secret');
    if (!this.alive) return;
    await this.finishAdventure('irbid', 'ir_hadith');
  }

  // ------------------------------------------------------------ helpers

  private pose(key: string): void {
    this.boyImg.setTexture(key);
    // Crouching to peek, he is 0.7 of his standing height (art checklist).
    fitHeight(this.boyImg, BOY_H * (key === 'boy_peek' ? 0.7 : 1));
  }

  private showHint(): void {
    const again = () => this.kickIdle();
    if (this.dragFood) return again(); // never interrupt a drag in progress
    if (this.state === 'pack') {
      const f = this.foods.find((x) => !x.getData('packed'));
      if (f) this.hint.show('drag', { x: f.x, y: f.y }, BASKET, again);
    } else if (this.state === 'sneak') {
      this.hint.show('hold', { x: 195, y: 560 }, { x: 195, y: 560 }, again);
    } else if (this.state === 'place') {
      if (this.boy.x >= STOP_X) this.hint.show('tap', { x: DOOR.x, y: DOOR.step - 10 }, undefined, again);
    } else if (this.state === 'knock') {
      this.hint.show('tap', { x: DOOR.x, y: DOOR.y }, undefined, again);
    } else if (this.state === 'hide') {
      this.hint.show('drag', { x: this.boy.x + 20, y: this.boy.y - 80 }, { x: TREE.x, y: this.boy.y - 80 }, again);
    }
  }
}
