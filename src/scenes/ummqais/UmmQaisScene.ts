import Phaser from 'phaser';
import { fitHeight, fitWidth } from '../../core/assets';
import { droplets, glowRing, HintHand, motes, waterStream } from '../../core/fx';
import { music } from '../../core/music';
import { sfx } from '../../core/sfx';
import { ui } from '../../core/ui';
import { Voice } from '../../core/voice';
import { BaseScene } from '../BaseScene';

// Umm Qais: the thirsty dog (value: mercy to animals; source bukhari_2363).
// The boy stands beside the well and never leans over it. The rope is part of
// the boy_pull art; the handle he drags is a glow ring (interface chrome).
// Positions are in the 390 x 844 design frame; tune them once the art arrives.

// Measured on the delivered bg_ummqais_well (design frame): the well's crossbar is
// centred at x = 250, y = 385; its mouth's back rim is at y = 470; the trough's
// basin is at the far left, its water line about (62, 521).
const WELL = { x: 250, mouth: 470, bottomY: 560, topY: 426 };
const HANDLE = { x: 318, top: 566, bottom: 676 };
const BOY = { x: 340, y: 690, h: 150 };
const TROUGH = { x: 62, y: 521, w: 96 };
const DOG = { x: 196, y: 632, h: 100 };
const POUR_SPOT = { x: TROUGH.x + 40, y: TROUGH.y - 60 };

// One full pull is about four steady strokes. Pulling too fast sloshes water out.
const RISE_PER_POINT = 1 / 440;
const SPILL_SPEED = [700, 560, 520]; // points per second, per bucket: the rhythm gets stricter
const MAX_BUCKETS = 3;

type State = 'pull' | 'carry' | 'pour' | 'busy' | 'done';

/** The touch event's own time, for an accurate pull speed. */
function eventTime(p: Phaser.Input.Pointer): number {
  const e = p.event as (Event & { timeStamp?: number }) | undefined;
  return e?.timeStamp ?? performance.now();
}

export class UmmQaisScene extends BaseScene {
  private state: State = 'pull';
  private bucketNo = 1;
  private progress = 0;
  private level = 1;
  private levelAtTop = 1;
  private fill = 0;
  private spillSaid = false;
  private hintSaid = false;
  private boy!: Phaser.GameObjects.Container;
  private boyImg!: Phaser.GameObjects.Image;
  private dog!: Phaser.GameObjects.Container;
  private dogImg!: Phaser.GameObjects.Image;
  private bucket!: Phaser.GameObjects.Container;
  private bucketFull!: Phaser.GameObjects.Image;
  private handle!: Phaser.GameObjects.Image;
  private troughWater!: Phaser.GameObjects.Image;
  private troughRing: Phaser.GameObjects.Image | null = null;
  private hint!: HintHand;
  private dragging: 'handle' | 'bucket' | 'tilt' | null = null;
  private pointerId = -1;
  private lastY = 0;
  private lastT = 0;
  private speed = 0;
  private pulledSinceCreak = 0;
  private spillCooldown = 0;
  private target = new Phaser.Math.Vector2();
  private grab = new Phaser.Math.Vector2();
  private tiltStartY = 0;
  private stream: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private pourSoundAt = 0;

  constructor() {
    super('ummqais');
  }

  create(): void {
    this.setup();
    this.state = 'pull';
    this.bucketNo = 1;
    this.progress = 0;
    this.level = 1;
    this.fill = 0;
    this.spillSaid = false;
    this.hintSaid = false;
    this.dragging = null;
    this.stream = null;
    this.troughRing = null;
    this.hint = new HintHand(this);

    ui.setPill('أُمّ قَيْس');
    ui.setHome(() => this.goTo('map'));
    ui.clearBubble();
    music.play('ummqais');

    const bg = this.addCover('bg_ummqais_well');
    this.tweens.add({ targets: bg, scale: bg.scale * 1.012, duration: 8000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    motes(this, { x: 30, y: 140, w: 330, h: 520 }, 40);

    // Trough water: invisible until he pours.
    this.troughWater = this.add.image(TROUGH.x, TROUGH.y, 'trough_water').setDepth(12).setAlpha(0);
    fitWidth(this.troughWater, TROUGH.w);
    this.troughWater.setData('sy', this.troughWater.scaleY);
    this.troughWater.setScale(this.troughWater.scaleX, this.troughWater.scaleY * 0.4);
    this.tweens.add({ targets: this.troughWater, scaleX: this.troughWater.scaleX * 1.02, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // The thirsty dog pants beside the empty trough.
    this.dogImg = this.add.image(0, 0, 'dog_thirsty').setOrigin(0.5, 1);
    fitHeight(this.dogImg, DOG.h);
    this.dog = this.add.container(DOG.x, DOG.y, [this.dogImg]).setDepth(30);
    this.tweens.add({ targets: this.dog, scaleY: 1.03, duration: 320, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // The bucket, shown only above the well's mouth.
    const empty = this.add.image(0, 0, 'bucket_empty');
    fitHeight(empty, 64);
    this.bucketFull = this.add.image(0, 0, 'bucket_full');
    fitHeight(this.bucketFull, 64);
    this.bucket = this.add.container(WELL.x, WELL.bottomY, [empty, this.bucketFull]).setDepth(25);
    const maskShape = this.make.graphics({}, false);
    maskShape.fillStyle(0xffffff);
    maskShape.fillRect(-400, -400, 1200, 400 + WELL.mouth);
    this.bucket.setMask(maskShape.createGeometryMask());
    this.tweens.add({ targets: this.bucket, angle: { from: -3, to: 3 }, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // The boy beside the well.
    this.boyImg = this.add.image(0, 0, 'boy_idle').setOrigin(0.5, 1);
    fitHeight(this.boyImg, BOY.h);
    this.boy = this.add.container(BOY.x, BOY.y, [this.boyImg]).setDepth(35);
    this.tweens.add({ targets: this.boy, scaleY: 1.02, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // The rope handle: a glowing ring at his hands.
    this.handle = glowRing(this, HANDLE.x, HANDLE.top, 34, 40);
    this.handle.setInteractive(new Phaser.Geom.Circle(64, 64, 64), Phaser.Geom.Circle.Contains);
    this.handle.on('pointerdown', (p: Phaser.Input.Pointer) => this.downHandle(p));

    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.onMove(p));
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => this.onUp(p));
    this.input.on('pointerupoutside', (p: Phaser.Input.Pointer) => this.onUp(p));
    this.input.on('pointerdown', () => this.hint.clear());

    this.time.addEvent({ delay: 7000, loop: true, callback: () => Math.random() < 0.7 && sfx('birds', { volume: 0.45 }) });

    void Voice.say('uq_open');
    this.setIdle(() => this.showHint());
  }

  update(time: number, dt: number): void {
    if (this.dragging === 'bucket') {
      const k = 1 - Math.pow(1 - 0.28, dt / 16.67);
      this.bucket.x += (this.target.x - this.bucket.x) * k;
      this.bucket.y += (this.target.y - this.bucket.y) * k;
    }
    if (this.state === 'pour' && this.stream) {
      // Water flows while the bucket is tipped far enough.
      const tilt = -this.bucket.angle;
      const flowing = tilt > 35 && this.level > 0.01;
      this.stream.emitting = flowing;
      if (flowing) {
        const rate = (dt / 1000) * 0.55 * ((tilt - 35) / 55 + 0.4);
        const out = Math.min(this.level, rate);
        this.level -= out;
        this.fill = Math.min(1, this.fill + (out / Math.max(0.01, this.levelAtTop)) * this.bucketShare());
        this.drawWater();
        if (time - this.pourSoundAt > 600) {
          this.pourSoundAt = time;
          sfx('pour', { volume: 0.7 });
        }
        if (this.level <= 0.01) this.bucketEmptied();
      }
    }
  }

  /** How much of the trough this bucket fills, fixed when it reaches the trough. */
  private share = 0.5;

  private bucketShare(): number {
    return this.share;
  }

  private drawWater(): void {
    this.bucketFull.setAlpha(this.level);
    const sy = this.troughWater.getData('sy') as number;
    this.troughWater.setAlpha(Math.min(1, this.fill * 1.4));
    this.troughWater.scaleY = sy * (0.4 + 0.6 * this.fill);
  }

  // ------------------------------------------------------------ input

  private downHandle(p: Phaser.Input.Pointer): void {
    if (this.state !== 'pull' || this.dragging) return;
    this.dragging = 'handle';
    this.pointerId = p.id;
    this.lastY = p.worldY;
    this.lastT = eventTime(p);
    this.speed = 0;
    this.pose('boy_pull');
    this.tweens.killTweensOf(this.handle);
    this.handle.setScale(this.handle.getData('baseScale') * 1.15);
    sfx('grab', { volume: 0.6 });
  }

  private onMove(p: Phaser.Input.Pointer): void {
    if (p.id !== this.pointerId || !this.dragging) return;
    if (this.dragging === 'handle') {
      const now = eventTime(p);
      const dy = p.worldY - this.lastY;
      const dt = Math.max(1, now - this.lastT);
      this.lastY = p.worldY;
      this.lastT = now;
      this.handle.y = Phaser.Math.Clamp(p.worldY, HANDLE.top, HANDLE.bottom);
      if (dy <= 0 || this.handle.y >= HANDLE.bottom) return;
      // Smoothed pull speed in points per second.
      this.speed = this.speed * 0.6 + ((dy / dt) * 1000) * 0.4;
      this.raise(dy, now);
    } else if (this.dragging === 'bucket') {
      this.target.set(p.worldX + this.grab.x, Phaser.Math.Clamp(p.worldY + this.grab.y, 140, 700));
    } else if (this.dragging === 'tilt') {
      // Tilt by dragging downward.
      const t = Phaser.Math.Clamp((p.worldY - this.tiltStartY) * 0.9, 0, 95);
      this.bucket.angle = -t;
    }
  }

  private onUp(p: Phaser.Input.Pointer): void {
    if (p.id !== this.pointerId || !this.dragging) return;
    const what = this.dragging;
    this.dragging = null;
    this.pointerId = -1;
    if (what === 'handle') {
      this.pose('boy_idle');
      // The handle swings back up for the next stroke.
      this.tweens.add({
        targets: this.handle, y: HANDLE.top, duration: 260, ease: 'Back.easeOut',
        onComplete: () => this.restartRingPulse(),
      });
    } else if (what === 'bucket') {
      this.dropBucket();
    } else if (what === 'tilt') {
      this.stream && (this.stream.emitting = false);
      if (this.state === 'pour') this.tweens.add({ targets: this.bucket, angle: 0, duration: 300, ease: 'Sine.easeOut' });
    }
    this.kickIdle();
  }

  private restartRingPulse(): void {
    const base = this.handle.getData('baseScale') as number;
    this.handle.setScale(base);
    this.tweens.add({ targets: this.handle, scale: base * 1.1, alpha: { from: 0.95, to: 0.6 }, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  // ------------------------------------------------------------ pulling

  private raise(dy: number, now: number): void {
    this.progress = Math.min(1, this.progress + dy * RISE_PER_POINT);
    this.bucket.y = Phaser.Math.Linear(WELL.bottomY, WELL.topY, this.progress);
    this.pulledSinceCreak += dy;
    if (this.pulledSinceCreak > 38) {
      this.pulledSinceCreak = 0;
      sfx('rope', { volume: 0.8 });
    }
    // Too fast: water sloshes out of the bucket.
    const limit = SPILL_SPEED[Math.min(this.bucketNo, SPILL_SPEED.length) - 1];
    if (this.speed > limit && now > this.spillCooldown && this.bucket.y < WELL.mouth + 10) {
      this.spillCooldown = now + 450;
      this.level = Math.max(0.2, this.level - 0.14);
      this.drawWater();
      sfx('splash', { volume: 0.8 });
      droplets(this, this.bucket.x, this.bucket.y - 24, 14, 60);
      this.tweens.add({ targets: this.bucket, x: { from: WELL.x - 6, to: WELL.x }, duration: 260, ease: 'Elastic.easeOut' });
      if (!this.spillSaid) {
        this.spillSaid = true;
        void Voice.say('uq_spill');
      }
    }
    if (this.progress >= 1) this.bucketAtTop();
  }

  private bucketAtTop(): void {
    this.state = 'carry';
    this.dragging = null;
    this.pointerId = -1;
    this.levelAtTop = this.level;
    this.pose('boy_idle');
    this.handle.disableInteractive().setVisible(false);
    this.bucket.clearMask();
    this.tweens.killTweensOf(this.bucket);
    this.bucket.setAngle(0);
    sfx('chime', { volume: 0.5 });
    // Now the bucket can be carried to the trough.
    // For a sized container, the hit area's (0, 0) is its top-left corner.
    this.bucket.setSize(100, 110);
    this.bucket.setInteractive(new Phaser.Geom.Rectangle(0, 0, 100, 110), Phaser.Geom.Rectangle.Contains);
    this.bucket.removeAllListeners('pointerdown');
    this.bucket.on('pointerdown', (p: Phaser.Input.Pointer) => this.downBucket(p));
    this.troughRing = glowRing(this, POUR_SPOT.x, POUR_SPOT.y + 40, 50, 11);
    if (this.bucketNo === 1) void Voice.say('uq_pour');
    this.kickIdle();
  }

  private downBucket(p: Phaser.Input.Pointer): void {
    if (this.dragging) return;
    this.hint.clear();
    if (this.state === 'carry') {
      this.dragging = 'bucket';
      this.pointerId = p.id;
      this.grab.set(this.bucket.x - p.worldX, this.bucket.y - p.worldY);
      this.target.set(this.bucket.x, this.bucket.y);
      this.bucket.setDepth(60);
      this.tweens.add({ targets: this.bucket, scaleX: { from: 1.15, to: 1.04 }, scaleY: { from: 0.88, to: 1.04 }, duration: 220, ease: 'Back.easeOut' });
      sfx('grab');
      if (this.level > 0.3) droplets(this, this.bucket.x, this.bucket.y - 28, 4, 61);
    } else if (this.state === 'pour') {
      this.dragging = 'tilt';
      this.pointerId = p.id;
      this.tiltStartY = p.worldY + this.bucket.angle / 0.9; // continue from the current tilt
    }
  }

  private dropBucket(): void {
    const near = Phaser.Math.Distance.Between(this.bucket.x, this.bucket.y, POUR_SPOT.x, POUR_SPOT.y) < 120 || this.bucket.x < 170;
    if (!near) {
      sfx('slide', { volume: 0.6 });
      this.tweens.add({ targets: this.bucket, x: WELL.x, y: WELL.topY, scaleX: 1, scaleY: 1, duration: 420, ease: 'Back.easeOut' });
      return;
    }
    this.state = 'pour';
    // A full bucket fills half the trough, a sloshed one less; the last one
    // always finishes the job, so nobody is ever stuck.
    this.share = this.bucketNo >= MAX_BUCKETS ? 1 - this.fill + 0.02 : 0.25 + 0.25 * this.levelAtTop;
    this.troughRing?.destroy();
    this.troughRing = null;
    this.tweens.add({
      targets: this.bucket, x: POUR_SPOT.x, y: POUR_SPOT.y, scaleX: 1, scaleY: 1, duration: 260, ease: 'Quad.easeOut',
      onComplete: () => {
        sfx('thud', { weight: 0.1, volume: 0.5 });
        // The stream comes from the bucket's lip on the trough side.
        this.stream = waterStream(this, this.bucket.x - 30, this.bucket.y - 10, 26);
        this.stream.emitting = false;
      },
    });
    this.kickIdle();
  }

  private bucketEmptied(): void {
    this.state = 'busy';
    this.dragging = null;
    this.pointerId = -1;
    if (this.stream) {
      this.stream.emitting = false;
      const s = this.stream;
      this.time.delayedCall(700, () => s.destroy());
      this.stream = null;
    }
    this.bucket.disableInteractive();
    sfx('chime', { volume: 0.55 });
    if (this.fill >= 0.98) {
      this.fill = 1;
      this.drawWater();
      this.tweens.add({ targets: this.bucket, alpha: 0, angle: 0, duration: 500 });
      void this.dogDrinks();
      return;
    }
    // Back down the well for another bucket.
    this.tweens.add({
      targets: this.bucket, x: WELL.x, y: WELL.topY, angle: 0, duration: 600, ease: 'Sine.easeInOut',
      onComplete: () => {
        const maskShape = this.make.graphics({}, false);
        maskShape.fillStyle(0xffffff);
        maskShape.fillRect(-400, -400, 1200, 400 + WELL.mouth);
        this.bucket.setMask(maskShape.createGeometryMask());
        sfx('rope', { volume: 0.6 });
        this.tweens.add({
          targets: this.bucket, y: WELL.bottomY, duration: 700, ease: 'Sine.easeIn',
          onComplete: () => {
            sfx('splash', { volume: 0.4 });
            this.bucketNo++;
            this.progress = 0;
            this.level = 1;
            this.drawWater();
            this.state = 'pull';
            this.bucket.setDepth(25);
            this.tweens.add({ targets: this.bucket, angle: { from: -3, to: 3 }, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
            this.handle.setVisible(true).setInteractive();
            this.handle.y = HANDLE.top;
            this.restartRingPulse();
            this.kickIdle();
          },
        });
      },
    });
  }

  // ------------------------------------------------------------ the dog

  private async dogDrinks(): Promise<void> {
    this.state = 'done';
    this.setIdle(null);
    this.handle.setVisible(false);
    await this.wait(600);
    if (!this.alive) return;
    // The dog goes to the trough and drinks.
    // It walks back to the trough's right end (smaller: it is farther away) and
    // drinks with its nose in the water, in the gap between the trough and the well.
    this.tweens.add({ targets: this.dog, x: TROUGH.x + 76, y: TROUGH.y + 24, scale: 0.75, duration: 1200, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: this.dogImg, angle: { from: -2, to: 2 }, duration: 160, yoyo: true, repeat: 6 });
    await this.wait(1300);
    if (!this.alive) return;
    this.tweens.killTweensOf(this.dog);
    this.dog.setScale(1);
    this.dogImg.setTexture('dog_drinking');
    fitHeight(this.dogImg, DOG.h * 0.9);
    for (let i = 0; i < 4; i++) {
      this.time.delayedCall(i * 900, () => {
        if (!this.alive) return;
        sfx('lap', { volume: 0.9 });
        droplets(this, this.dog.x - 40, this.dog.y - 20, 4, 31, { min: 200, max: 300 });
        this.fill = Math.max(0.55, this.fill - 0.08);
        this.drawWater();
      });
    }
    await this.wait(3700);
    if (!this.alive) return;
    const done = Voice.say('uq_done');
    // Tail up, a happy stretch, a soft bark, then off to the hills.
    this.dogImg.setTexture('dog_happy');
    fitHeight(this.dogImg, DOG.h);
    const s = this.dogImg.scale;
    this.tweens.add({ targets: this.dogImg, scaleX: s * 1.18, scaleY: s * 0.84, duration: 600, yoyo: true, hold: 300, ease: 'Sine.easeInOut' });
    this.time.delayedCall(1400, () => this.alive && sfx('bark', { volume: 0.6 }));
    await Promise.all([done, this.wait(2200)]);
    if (!this.alive) return;
    this.tweens.add({ targets: this.dog, x: -120, y: 470, scale: 0.6, duration: 3600, ease: 'Sine.easeIn' });
    this.tweens.add({ targets: this.dogImg, y: { from: 0, to: -6 }, duration: 180, yoyo: true, repeat: 9 });
    for (let i = 0; i < 6; i++) this.time.delayedCall(i * 500, () => this.alive && sfx('step', { volume: 0.35 }));
    await this.wait(3800);
    if (!this.alive) return;
    await this.finishAdventure('ummqais', 'uq_hadith');
  }

  // ------------------------------------------------------------ helpers

  private pose(key: string): void {
    this.boyImg.setTexture(key);
    fitHeight(this.boyImg, BOY.h);
  }

  private showHint(): void {
    if (this.dragging) return;
    const again = () => this.kickIdle();
    if (this.state === 'pull') {
      this.hint.show('drag', { x: HANDLE.x, y: HANDLE.top }, { x: HANDLE.x, y: HANDLE.bottom }, again);
      if (!this.hintSaid) {
        this.hintSaid = true;
        void Voice.say('uq_hint');
      }
    } else if (this.state === 'carry') {
      this.hint.show('drag', { x: this.bucket.x, y: this.bucket.y }, POUR_SPOT, again);
    } else if (this.state === 'pour') {
      this.hint.show('drag', { x: this.bucket.x, y: this.bucket.y }, { x: this.bucket.x, y: this.bucket.y + 90 }, again);
    }
  }
}
