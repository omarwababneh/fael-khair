import Phaser from 'phaser';
import { fitHeight, fitWidth } from '../../core/assets';
import { droplets, dustPuff, grayCloud, HintHand, motes } from '../../core/fx';
import { music } from '../../core/music';
import { sfx } from '../../core/sfx';
import { ui } from '../../core/ui';
import { view } from '../../core/viewport';
import { Voice } from '../../core/voice';
import { BaseScene } from '../BaseScene';

// Amman: the broken jar (value: truthfulness, then repair without shame;
// source muslim_2607c). The accident happens inside play, not through a bad
// choice. Mama is never angry in either branch, and the door back to honesty is
// always open. Positions are in the 390 x 844 design frame; tune with the art.

const FLOOR = 700;
const BOY = { x: 150, h: 150 };
const BALL = { x: 238, d: 46 };
// The jar stands on the shelf of the delivered bg_amman_home (its top plank is at y = 316).
const JAR = { x: 334, y: 280, h: 74 };
const SHARDS = [{ x: 290, y: 692 }, { x: 322, y: 704 }, { x: 350, y: 690 }];
const SHARD_KEYS = ['shard_a', 'shard_b', 'shard_c'];
const PUDDLE = { x: 318, y: 704, rx: 58, ry: 14 };
const RUG = { x: 92, y: 676 };
const DUSTPAN = { x: 214, y: 706, w: 74 };
// Heights follow the art checklist (boy = 1.0): Mama standing 1.3, kneeling 0.95.
const MAMA = { x: 74, h: 195, kneelH: 142 };
const GRAVITY = 1500;
const FUN_MS = 8000; // the ball is pure fun for about 10 seconds before the jar falls

type State = 'play' | 'falling' | 'choice' | 'hide' | 'talk' | 'sweep' | 'wipe' | 'end';

interface Shard { img: Phaser.GameObjects.Image; done: boolean }

export class AmmanScene extends BaseScene {
  private state: State = 'play';
  private boy!: Phaser.GameObjects.Container;
  private boyImg!: Phaser.GameObjects.Image;
  private ball!: Phaser.GameObjects.Image;
  private ballBase = 1;
  private vy = 0;
  private resting = true;
  private taps = 0;
  private playStart = 0;
  private jar!: Phaser.GameObjects.Image;
  private shards: Shard[] = [];
  private water: Phaser.GameObjects.Image[] = [];
  private wiped = new Set<Phaser.GameObjects.Image>();
  private mama: Phaser.GameObjects.Image | null = null;
  private dustpan: Phaser.GameObjects.Image | null = null;
  private cloth: Phaser.GameObjects.Image | null = null;
  private cloud: Phaser.GameObjects.Container | null = null;
  private hint!: HintHand;
  private pointerId = -1;
  private lastPoint = new Phaser.Math.Vector2();
  private lastSound = 0;
  private removeButtons: (() => void) | null = null;

  constructor() {
    super('amman');
  }

  create(): void {
    this.setup();
    this.state = 'play';
    this.vy = 0;
    this.resting = true;
    this.taps = 0;
    this.shards = [];
    this.water = [];
    this.wiped = new Set();
    this.mama = this.dustpan = this.cloth = null;
    this.cloud = null;
    this.pointerId = -1;
    this.removeButtons = null;
    this.hint = new HintHand(this);

    ui.setPill('عَمّان');
    ui.setHome(() => this.goTo('map'));
    ui.clearBubble();
    music.play('amman');
    this.events.once('leave', () => this.removeButtons?.());
    this.events.once('shutdown', () => this.removeButtons?.());

    const bg = this.addCover('bg_amman_home');
    this.tweens.add({ targets: bg, scale: bg.scale * 1.01, duration: 9000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    motes(this, { x: 40, y: 160, w: 310, h: 480 }, 40);

    this.jar = this.add.image(JAR.x, JAR.y, 'jar_whole').setDepth(20);
    fitHeight(this.jar, JAR.h);

    this.boyImg = this.add.image(0, 0, 'boy_happy').setOrigin(0.5, 1);
    fitHeight(this.boyImg, BOY.h);
    this.boy = this.add.container(BOY.x, FLOOR, [this.boyImg]).setDepth(30);
    this.tweens.add({ targets: this.boy, scaleY: 1.02, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    this.ball = this.add.image(BALL.x, FLOOR - BALL.d / 2, 'ball').setDepth(40);
    this.ballBase = fitWidth(this.ball, BALL.d);

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.onDown(p));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.onMove(p));
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => this.onUp(p));
    this.input.on('pointerupoutside', (p: Phaser.Input.Pointer) => this.onUp(p));

    this.playStart = this.time.now;
    void Voice.say('am_open');
    this.setIdle(() => this.showHint());
  }

  update(_t: number, dt: number): void {
    if (this.state !== 'play' || this.resting) return;
    const s = dt / 1000;
    this.vy += GRAVITY * s;
    this.ball.y += this.vy * s;
    this.ball.angle += this.vy * s * 0.4;
    const floorY = FLOOR - BALL.d / 2;
    if (this.ball.y >= floorY) {
      this.ball.y = floorY;
      const impact = Math.abs(this.vy);
      this.squashBall(impact);
      this.vy = -impact * 0.62;
      if (impact < 220) {
        this.vy = 0;
        this.resting = true;
      }
    }
  }

  private squashBall(impact: number): void {
    const k = Math.min(1, impact / 1400);
    sfx('bounce', { weight: k, volume: 0.4 + 0.6 * k });
    if (k > 0.3) dustPuff(this, this.ball.x, FLOOR, 4, 0xe8d8b8, 35);
    this.tweens.add({
      targets: this.ball,
      scaleX: { from: this.ballBase * (1 + 0.3 * k), to: this.ballBase },
      scaleY: { from: this.ballBase * (1 - 0.3 * k), to: this.ballBase },
      duration: 220, ease: 'Back.easeOut',
    });
  }

  // ------------------------------------------------------------ input

  private onDown(p: Phaser.Input.Pointer): void {
    this.hint.clear();
    if (this.state === 'play') return this.tapBall();
    if (this.state === 'hide' || this.state === 'sweep') {
      this.pointerId = p.id;
      this.lastPoint.set(p.worldX, p.worldY);
      // He never touches the shards with his hands: hiding or cleaning, he uses the broom.
      if (this.state === 'hide' || this.state === 'sweep') this.pose('boy_sweep');
    }
    if (this.state === 'wipe' && this.cloth) {
      this.pointerId = p.id;
      this.cloth.setPosition(p.worldX, p.worldY - 10);
    }
  }

  private onMove(p: Phaser.Input.Pointer): void {
    if (p.id !== this.pointerId) return;
    if (this.state === 'hide') {
      this.sweepAlong(p, { x: RUG.x, y: RUG.y }, (s) => this.tuckUnderRug(s));
    } else if (this.state === 'sweep') {
      this.sweepAlong(p, { x: DUSTPAN.x, y: DUSTPAN.y - 14 }, (s) => this.intoPan(s));
    } else if (this.state === 'wipe' && this.cloth) {
      this.cloth.setPosition(p.worldX, p.worldY - 10);
      this.wipeAt(this.cloth.x, this.cloth.y + 10);
    }
    this.lastPoint.set(p.worldX, p.worldY);
  }

  private onUp(p: Phaser.Input.Pointer): void {
    if (p.id !== this.pointerId) return;
    this.pointerId = -1;
    if (this.state === 'sweep' || this.state === 'hide') this.pose('boy_sweep');
    this.kickIdle();
  }

  // ------------------------------------------------------------ the ball

  private tapBall(): void {
    this.taps++;
    const funOver = this.time.now - this.playStart > FUN_MS;
    if (this.taps >= 4 && funOver) return this.knockJar();
    // Each tap bounces it higher.
    this.resting = false;
    const wanted = 620 + Math.min(this.taps, 4) * 150;
    const maxUp = Math.sqrt(2 * GRAVITY * Math.max(0, this.ball.y - 170)); // apex stays below y = 170
    this.vy = -Math.min(wanted, maxUp);
    this.boyImg.setTexture('boy_happy');
    this.tweens.add({ targets: this.boy, y: { from: FLOOR - 8, to: FLOOR }, duration: 260, ease: 'Bounce.easeOut' });
    sfx('pop', { volume: 0.5 });
  }

  private knockJar(): void {
    this.state = 'falling';
    this.setIdle(null);
    this.resting = true;
    // The highest bounce yet, curving over to the shelf.
    sfx('pop', { volume: 0.5 });
    this.tweens.add({ targets: this.ball, x: JAR.x - 10, duration: 620, ease: 'Sine.easeOut' });
    this.tweens.add({
      targets: this.ball, y: JAR.y + 6, angle: this.ball.angle + 300, duration: 620, ease: 'Quad.easeOut',
      onComplete: () => {
        sfx('bounce', { weight: 0.6, volume: 0.8 });
        // The ball drops back down; the jar topples off the shelf.
        this.tweens.add({ targets: this.ball, x: BALL.x - 46, duration: 800, ease: 'Linear' }); // rests between the boy and the shards
        this.tweens.add({ targets: this.ball, y: FLOOR - BALL.d / 2, duration: 800, ease: 'Bounce.easeOut' });
        this.tweens.add({ targets: this.jar, x: JAR.x + 4, angle: 28, duration: 260, ease: 'Sine.easeOut' });
        this.tweens.add({ targets: this.jar, y: FLOOR - 26, angle: 150, x: SHARDS[1].x, duration: 520, delay: 260, ease: 'Quad.easeIn', onComplete: () => this.breakJar() });
      },
    });
  }

  private breakJar(): void {
    if (!this.alive) return;
    sfx('shatter');
    this.cameras.main.shake(180, 0.006);
    this.jar.setVisible(false);
    droplets(this, PUDDLE.x, PUDDLE.y - 10, 26, 50, { min: 190, max: 350 });
    dustPuff(this, PUDDLE.x, PUDDLE.y, 8, 0xd9a37a, 45);
    this.shards = SHARD_KEYS.map((key, i) => {
      const img = this.add.image(SHARDS[1].x, FLOOR - 20, key).setDepth(22);
      // At least 44 points tall (he drags or sweeps them), and bigger than the small bits.
      fitHeight(img, 54);
      this.tweens.add({ targets: img, x: SHARDS[i].x, y: SHARDS[i].y, angle: Phaser.Math.Between(-40, 40), duration: 380, ease: 'Quad.easeOut' });
      return { img, done: false };
    });
    // Water spreads across the floor (water droplets, as particles).
    for (let i = 0; i < 34; i++) {
      const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random());
      const d = this.add.image(PUDDLE.x, PUDDLE.y, 'fx_dot').setDepth(18).setTint(0x8fd3f0).setAlpha(0.85).setScale(0.5 + Math.random() * 0.5);
      this.tweens.add({ targets: d, x: PUDDLE.x + Math.cos(a) * PUDDLE.rx * r, y: PUDDLE.y + Math.sin(a) * PUDDLE.ry * r, duration: 900 + Math.random() * 700, ease: 'Sine.easeOut' });
      this.water.push(d);
    }
    this.pose('boy_worried');
    this.time.delayedCall(900, () => void this.choose());
  }

  // ------------------------------------------------------------ the choice

  private async choose(): Promise<void> {
    if (!this.alive) return;
    this.state = 'choice';
    await Voice.say('am_choice');
    if (!this.alive) return;
    // Two buttons of identical size, color and weight. Nothing hints at which is right.
    this.removeButtons = ui.showChoice(['بَحكي لَماما', 'بَخَبّيها'], (i) => {
      this.removeButtons = null;
      sfx('pop', { volume: 0.5 });
      if (i === 0) void this.tell();
      else this.startHiding();
    });
  }

  private startHiding(): void {
    this.state = 'hide';
    this.setIdle(() => this.showHint());
  }

  private tuckUnderRug(s: Shard): void {
    if (s.done) return;
    s.done = true;
    sfx('slide', { volume: 0.6 });
    this.tweens.add({ targets: s.img, x: RUG.x + Phaser.Math.Between(-30, 30), y: RUG.y, scale: s.img.scale * 0.7, alpha: 0, duration: 400, ease: 'Sine.easeIn' });
    if (this.shards.every((x) => x.done)) void this.mamaAsks();
  }

  /** He hid it: Mama asks, a small gray cloud, water creeps out. No scolding. */
  private async mamaAsks(): Promise<void> {
    this.state = 'talk';
    this.setIdle(null);
    await this.wait(500);
    if (!this.alive) return;
    this.mamaEnters();
    await this.wait(1300);
    if (!this.alive) return;
    await Voice.say('am_mama_asks');
    if (!this.alive) return;
    this.cloud = grayCloud(this, BOY.x, FLOOR - BOY.h - 34, 70);
    this.pose('boy_worried');
    // Water creeps out from under the rug.
    for (let i = 0; i < 10; i++) {
      const d = this.add.image(RUG.x + 90, RUG.y + 12, 'fx_dot').setDepth(18).setTint(0x8fd3f0).setAlpha(0).setScale(0.6);
      this.tweens.add({ targets: d, x: RUG.x + 112 + i * 6, y: RUG.y + 22 + Math.random() * 10, alpha: 0.85, duration: 1600, delay: i * 180, ease: 'Sine.easeOut' });
      this.water.push(d);
    }
    await this.wait(900);
    if (!this.alive) return;
    await Voice.say('am_heart');
    if (!this.alive) return;
    // The door back to honesty is always open.
    this.removeButtons = ui.showAction('بَحكي الحَقيقة', () => {
      this.removeButtons = null;
      sfx('pop', { volume: 0.5 });
      void this.tellTruth();
    });
  }

  private async tellTruth(): Promise<void> {
    if (this.cloud) {
      const c = this.cloud;
      this.cloud = null;
      dustPuff(this, c.x, c.y, 10, 0xd8d8de, 71);
      this.tweens.add({ targets: c, alpha: 0, scale: 1.5, duration: 700, onComplete: () => c.destroy() });
    }
    this.pose('boy_idle');
    // The shards come back out from under the rug, ready to clean up together.
    this.shards.forEach((s, i) => {
      s.done = false;
      this.tweens.add({ targets: s.img, x: SHARDS[i].x, y: SHARDS[i].y, alpha: 1, scale: s.img.scale / 0.7, duration: 700, delay: i * 120, ease: 'Sine.easeOut' });
      this.time.delayedCall(800, () => s.img.setDepth(22));
    });
    await this.wait(900);
    if (!this.alive) return;
    await this.mamaThanks();
  }

  private async tell(): Promise<void> {
    this.state = 'talk';
    this.pose('boy_idle');
    this.mamaEnters();
    await this.wait(1400);
    if (!this.alive) return;
    await this.mamaThanks();
  }

  private mamaEnters(): void {
    if (this.mama) return;
    this.mama = this.add.image(view().x - 70, FLOOR, 'mama_stand').setOrigin(0.5, 1).setDepth(28);
    fitHeight(this.mama, MAMA.h);
    sfx('door', { volume: 0.5 });
    this.tweens.add({ targets: this.mama, x: MAMA.x, duration: 1200, ease: 'Sine.easeOut' });
    for (let i = 0; i < 4; i++) this.time.delayedCall(i * 280, () => this.alive && sfx('step', { volume: 0.4 }));
  }

  /** Mama kneels to his height and thanks him calmly. Then they clean up together. */
  private async mamaThanks(): Promise<void> {
    if (!this.mama) return;
    this.mama.setTexture('mama_kneel');
    fitHeight(this.mama, MAMA.kneelH);
    this.tweens.add({ targets: this.mama, scaleY: { from: this.mama.scaleY * 0.92, to: this.mama.scaleY }, duration: 400, ease: 'Back.easeOut' });
    await Voice.say('am_mama_thanks');
    if (!this.alive) return;
    void this.startSweep();
  }

  // ------------------------------------------------------------ cleaning up

  /**
   * Cleaning up (A1 safeguard, MISSIONS_V2.md section 5): Mama picks up the big,
   * sharp pieces herself; he sweeps the small bits with the long broom.
   */
  private async startSweep(): Promise<void> {
    this.state = 'talk';
    const big = [this.shards[0], this.shards[2]];
    const said = Voice.say('am_mama_sharp');
    await this.wait(600);
    if (!this.alive || !this.mama) return;
    for (const [i, s] of big.entries()) {
      s.done = true;
      this.tweens.add({ targets: s.img, x: this.mama.x + 24, y: FLOOR - MAMA.kneelH * 0.45, scale: s.img.scale * 0.8, duration: 600, delay: i * 700, ease: 'Sine.easeInOut' });
      this.tweens.add({ targets: s.img, alpha: 0, duration: 300, delay: i * 700 + 700 });
    }
    // Two small bits that broke off, beside the middle piece, for him to sweep.
    const mid = this.shards[1];
    for (const dx of [-26, 24]) {
      const img = this.add.image(mid.img.x + dx, mid.img.y + Phaser.Math.Between(-4, 6), SHARD_KEYS[1]).setDepth(22).setAngle(Phaser.Math.Between(-60, 60));
      fitHeight(img, 44); // he sweeps them: at least 44 points tall
      this.shards.push({ img, done: false });
    }
    await said;
    if (!this.alive) return;
    await Voice.say('bismillah');
    if (!this.alive) return;
    this.state = 'sweep';
    this.pose('boy_sweep');
    this.dustpan = this.add.image(DUSTPAN.x, DUSTPAN.y, 'dustpan').setOrigin(0.5, 1).setDepth(21).setAlpha(0);
    fitWidth(this.dustpan, DUSTPAN.w);
    this.tweens.add({ targets: this.dustpan, alpha: 1, y: { from: DUSTPAN.y - 20, to: DUSTPAN.y }, duration: 400, ease: 'Back.easeOut' });
    this.setIdle(() => this.showHint());
  }

  /** Swipes of the broom push each shard toward a target (the dustpan, or under the rug). */
  private sweepAlong(p: Phaser.Input.Pointer, target: { x: number; y: number }, arrive: (s: Shard) => void): void {
    const dx = p.worldX - this.lastPoint.x, dy = p.worldY - this.lastPoint.y;
    if (Math.hypot(dx, dy) < 2) return;
    for (const s of this.shards) {
      if (s.done) continue;
      if (Phaser.Math.Distance.Between(p.worldX, p.worldY, s.img.x, s.img.y) > 46) continue;
      const toPan = new Phaser.Math.Vector2(target.x - s.img.x, target.y - s.img.y);
      const step = Math.min(toPan.length(), 34);
      toPan.normalize().scale(step);
      this.tweens.add({ targets: s.img, x: s.img.x + toPan.x, y: s.img.y + toPan.y, angle: s.img.angle + 25, duration: 160, ease: 'Sine.easeOut' });
      if (this.time.now - this.lastSound > 140) {
        this.lastSound = this.time.now;
        sfx('sweep', { volume: 0.7 });
        dustPuff(this, s.img.x, s.img.y + 6, 3, 0xe8d8b8, 23);
      }
      if (Phaser.Math.Distance.Between(s.img.x + toPan.x, s.img.y + toPan.y, target.x, target.y) < (this.state === 'hide' ? 60 : 30)) arrive(s);
    }
    if (this.state === 'sweep' && this.shards.every((s) => s.done)) this.startWipe();
  }

  private intoPan(s: Shard): void {
    s.done = true;
    this.tweens.add({ targets: s.img, x: DUSTPAN.x, y: DUSTPAN.y - 12, scale: s.img.scale * 0.6, alpha: 0, duration: 260, delay: 160 });
    this.time.delayedCall(420, () => this.alive && sfx('chime', { volume: 0.4 }));
  }

  private startWipe(): void {
    if (this.state !== 'sweep') return;
    this.state = 'wipe';
    this.pose('boy_idle');
    this.cloth = this.add.image(PUDDLE.x + 10, PUDDLE.y - 60, 'cloth').setDepth(55).setAlpha(0);
    fitWidth(this.cloth, 56);
    this.tweens.add({ targets: this.cloth, alpha: 1, duration: 300 });
    if (this.dustpan) this.tweens.add({ targets: this.dustpan, alpha: 0, duration: 500 });
    this.kickIdle();
  }

  private wipeAt(x: number, y: number): void {
    let wiped = false;
    for (const d of this.water) {
      if (this.wiped.has(d)) continue;
      if (Phaser.Math.Distance.Between(x, y, d.x, d.y) < 34) {
        this.wiped.add(d);
        wiped = true;
        this.tweens.add({ targets: d, alpha: 0, scale: 0.1, duration: 220, onComplete: () => d.setVisible(false) });
      }
    }
    if (wiped && this.time.now - this.lastSound > 160) {
      this.lastSound = this.time.now;
      sfx('wipe', { volume: 0.7 });
    }
    if (this.water.every((d) => this.wiped.has(d))) void this.hug();
  }

  // ------------------------------------------------------------ ending

  private async hug(): Promise<void> {
    if (this.state !== 'wipe') return;
    this.state = 'end';
    this.setIdle(null);
    this.pointerId = -1;
    if (this.cloth) this.tweens.add({ targets: this.cloth, alpha: 0, duration: 300 });
    await this.wait(400);
    if (!this.alive || !this.mama) return;
    // Mama hugs him.
    this.pose('boy_happy');
    this.tweens.add({ targets: this.boy, x: MAMA.x + 34, duration: 700, ease: 'Sine.easeInOut' });
    await this.wait(750);
    if (!this.alive) return;
    this.tweens.add({ targets: [this.boy, this.mama], scaleX: '*=1.04', scaleY: '*=1.04', duration: 500, yoyo: true, ease: 'Sine.easeInOut' });
    await this.wait(1200);
    if (!this.alive) return;
    await Voice.say('am_brave');
    if (!this.alive) return;
    await this.finishAdventure('amman', 'am_hadith');
  }

  // ------------------------------------------------------------ helpers

  private pose(key: string): void {
    this.boyImg.setTexture(key);
    fitHeight(this.boyImg, BOY.h);
  }

  private showHint(): void {
    const again = () => this.kickIdle();
    // Never interrupt a drag that is in progress.
    if (this.pointerId !== -1) return again();
    if (this.state === 'play') {
      this.hint.show('tap', { x: this.ball.x, y: this.ball.y }, undefined, again);
    } else if (this.state === 'hide') {
      const s = this.shards.find((x) => !x.done);
      if (s) this.hint.show('drag', { x: s.img.x + 30, y: s.img.y }, RUG, again);
    } else if (this.state === 'sweep') {
      const s = this.shards.find((x) => !x.done);
      if (s) this.hint.show('drag', { x: s.img.x + 30, y: s.img.y }, { x: DUSTPAN.x, y: DUSTPAN.y - 14 }, again);
    } else if (this.state === 'wipe' && this.cloth) {
      const d = this.water.find((x) => !this.wiped.has(x));
      if (d) this.hint.show('drag', { x: this.cloth.x, y: this.cloth.y }, { x: d.x, y: d.y }, again);
    }
  }
}
