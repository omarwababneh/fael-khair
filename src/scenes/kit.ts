// Small shared pieces for the mission scenes: a breathing idle, a walk with the
// two walking pictures, and a watering can that pours while it is held over a plant.
import Phaser from 'phaser';
import { fitHeight } from '../core/assets';
import { waterStream } from '../core/fx';
import { sfx, type SfxName } from '../core/sfx';

/** A gentle breathing motion so a standing figure is never perfectly still. */
export function breathe(scene: Phaser.Scene, img: Phaser.GameObjects.Image, amount = 0.015): Phaser.Tweens.Tween {
  stopBreathing(scene, img);
  const t = scene.tweens.add({ targets: img, scaleY: img.scaleY * (1 + amount), duration: 1400 + Math.random() * 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  img.setData('breath', t);
  return t;
}

/** Stop a figure's breathing (before resizing it as it moves, then call breathe again). */
export function stopBreathing(scene: Phaser.Scene, img: Phaser.GameObjects.Image): void {
  const t = img.getData('breath') as Phaser.Tweens.Tween | undefined;
  if (t) {
    t.stop();
    scene.tweens.remove(t);
    img.setData('breath', undefined);
  }
}

/**
 * Change a figure's picture, keeping its height on screen, and let it breathe
 * again. Only the breathing stops: a walk or any other move goes on.
 */
export function pose(scene: Phaser.Scene, img: Phaser.GameObjects.Image, key: string, h: number): void {
  stopBreathing(scene, img);
  img.setTexture(key);
  fitHeight(img, h);
  breathe(scene, img);
}

/**
 * Walk a figure to (x, y) with two walking pictures (which face right; the
 * figure is mirrored when it walks left). Resolves on arrival.
 */
export function walkTo(
  scene: Phaser.Scene, img: Phaser.GameObjects.Image, to: { x: number; y?: number }, h: number,
  frames: [string, string] = ['boy_walk_a', 'boy_walk_b'], speed = 110,
): Promise<void> {
  scene.tweens.killTweensOf(img);
  // A walk cut short by a new one must stop its own frame timer too.
  (img.getData('walkTimer') as Phaser.Time.TimerEvent | undefined)?.remove();
  const dist = Math.hypot(to.x - img.x, (to.y ?? img.y) - img.y);
  const dur = Math.max(350, (dist / speed) * 1000);
  let a = true;
  img.setTexture(frames[0]).setFlipX(to.x < img.x);
  fitHeight(img, h);
  const t = scene.time.addEvent({
    delay: 170, loop: true,
    callback: () => {
      a = !a;
      img.setTexture(a ? frames[0] : frames[1]);
      fitHeight(img, h);
      sfx('step', { volume: 0.45 });
    },
  });
  img.setData('walkTimer', t);
  return new Promise((res) => scene.tweens.add({
    targets: img, x: to.x, y: to.y ?? img.y, duration: dur, ease: 'Sine.easeInOut',
    onComplete: () => { t.remove(); img.setData('walkTimer', undefined); img.setFlipX(false); res(); },
  }));
}

export interface PourTarget {
  x: number;
  /** The top of the plant: the water falls onto it. */
  y: number;
  /** 0 to 1. */
  progress: number;
  /** How long it takes to water fully, in ms. */
  need: number;
  done: boolean;
}

/**
 * The watering can (watering_can faces right; the spout is at its top right).
 * Drag it over a plant and keep holding: it tilts and pours, a little at a time.
 * Let go and it stops; pick it up again to go on.
 */
export class PourCan {
  readonly img: Phaser.GameObjects.Image;
  private base = 1;
  private held = -1;
  private stream: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private pouringOn: PourTarget | null = null;
  private lastSound = 0;

  constructor(private scene: Phaser.Scene, x: number, y: number, h: number, depth = 40) {
    this.img = scene.add.image(x, y, 'watering_can').setOrigin(0.5, 1).setDepth(depth);
    this.base = fitHeight(this.img, h);
  }

  get holding(): boolean {
    return this.held !== -1;
  }

  /** Where the water leaves the spout, in world units. */
  private spout(): { x: number; y: number } {
    const w = this.img.frame.width * this.base, h = this.img.frame.height * this.base;
    const a = Phaser.Math.DegToRad(this.img.angle);
    const lx = w * 0.47, ly = -h * 0.8; // from the bottom centre
    return { x: this.img.x + lx * Math.cos(a) - ly * Math.sin(a), y: this.img.y + lx * Math.sin(a) + ly * Math.cos(a) };
  }

  hit(x: number, y: number): boolean {
    const w = this.img.frame.width * this.base, h = this.img.frame.height * this.base;
    return Math.abs(x - this.img.x) < w / 2 + 14 && y < this.img.y + 14 && y > this.img.y - h - 14;
  }

  grab(p: Phaser.Input.Pointer): void {
    this.held = p.id;
    this.scene.tweens.killTweensOf(this.img);
    this.img.setDepth(70);
    sfx('grab', { volume: 0.6 });
  }

  move(p: Phaser.Input.Pointer, area: { x: number; right: number; top: number; bottom: number }): void {
    if (p.id !== this.held) return;
    this.img.setPosition(Phaser.Math.Clamp(p.worldX, area.x, area.right), Phaser.Math.Clamp(p.worldY + 26, area.top, area.bottom));
  }

  release(p: Phaser.Input.Pointer): boolean {
    if (p.id !== this.held) return false;
    this.held = -1;
    this.stopPouring();
    this.img.setDepth(40);
    return true;
  }

  /** Call every frame. Pours on the target the spout is over; returns the one that just finished. */
  update(dt: number, targets: PourTarget[]): PourTarget | null {
    if (!this.holding) return null;
    const s = this.spout();
    const t = targets.find((x) => !x.done && Math.abs(s.x - x.x) < 46 && s.y < x.y + 10 && s.y > x.y - 120) ?? null;
    if (t !== this.pouringOn) {
      if (t) this.startPouring(t);
      else this.stopPouring();
    }
    if (!t) return null;
    if (this.stream) this.stream.setPosition(this.spout().x, this.spout().y);
    t.progress = Math.min(1, t.progress + dt / t.need);
    if (this.scene.time.now - this.lastSound > 700) {
      this.lastSound = this.scene.time.now;
      sfx('pour', { volume: 0.5 });
    }
    if (t.progress >= 1) {
      t.done = true;
      this.stopPouring();
      return t;
    }
    return null;
  }

  private startPouring(t: PourTarget): void {
    this.pouringOn = t;
    this.scene.tweens.add({ targets: this.img, angle: 32, duration: 220, ease: 'Sine.easeOut' });
    this.stream?.destroy();
    this.stream = waterStream(this.scene, this.spout().x, this.spout().y, 69);
  }

  private stopPouring(): void {
    this.pouringOn = null;
    this.scene.tweens.add({ targets: this.img, angle: 0, duration: 220, ease: 'Sine.easeOut' });
    if (this.stream) {
      const st = this.stream;
      st.emitting = false;
      this.scene.time.delayedCall(700, () => st.destroy());
      this.stream = null;
    }
  }
}

/**
 * A close-up for pouring water from a bottle into a cup (J3, D3). Hold to pour,
 * let go at the line. The water level is the cup_full picture revealed from the
 * bottom up over cup_empty; the fill line is interface chrome drawn in code.
 */
export class CupPour {
  readonly root: Phaser.GameObjects.Container;
  /** 0 empty to 1 full. */
  fill = 0;
  private cup: Phaser.GameObjects.Image;
  private water: Phaser.GameObjects.Image;
  private bottle: Phaser.GameObjects.Image;
  private line: Phaser.GameObjects.Graphics;
  private stream: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private pouring = false;
  private lastSound = 0;
  // Measured on cup_full: the water reaches from y 0.97 (the bottom) to 0.13 (the brim).
  private static readonly BOTTOM = 0.97;
  private static readonly BRIM = 0.13;

  /** target: the fill line (0 to 1); x, y: the center of the cup. */
  constructor(private scene: Phaser.Scene, x: number, y: number, cupH: number, readonly target: number, private dim: Phaser.GameObjects.Rectangle) {
    this.cup = scene.add.image(x, y, 'cup_empty');
    fitHeight(this.cup, cupH);
    this.water = scene.add.image(x, y, 'cup_full');
    fitHeight(this.water, cupH);
    this.bottle = scene.add.image(x + cupH * 0.75, y - cupH * 0.55, 'water_bottle');
    fitHeight(this.bottle, cupH * 1.3);
    this.line = scene.add.graphics();
    this.drawLine();
    this.root = scene.add.container(0, 0, [this.cup, this.water, this.line, this.bottle]).setDepth(86).setAlpha(0);
    this.setLevel(0);
    scene.tweens.add({ targets: this.root, alpha: 1, duration: 400 });
    scene.tweens.add({ targets: this.dim, fillAlpha: 0.45, duration: 400 });
  }

  /** Where the water level is, in world y, for a fill of f. */
  private levelY(f: number): number {
    const h = this.cup.frame.height * this.cup.scale;
    const top = this.cup.y - h / 2;
    return top + h * (CupPour.BOTTOM - f * (CupPour.BOTTOM - CupPour.BRIM));
  }

  private drawLine(): void {
    const w = this.cup.frame.width * this.cup.scale;
    const y = this.levelY(this.target);
    this.line.clear();
    this.line.lineStyle(4, 0x4a2c17, 0.85);
    for (let x = this.cup.x - w * 0.42; x < this.cup.x + w * 0.42; x += 16) this.line.lineBetween(x, y, Math.min(x + 9, this.cup.x + w * 0.42), y);
  }

  private setLevel(f: number): void {
    this.fill = f;
    const fh = this.water.frame.height;
    const top = fh * (CupPour.BOTTOM - f * (CupPour.BOTTOM - CupPour.BRIM));
    this.water.setCrop(0, top, this.water.frame.width, fh - top);
  }

  /** Is the point on the bottle or the cup (he may hold either)? */
  hit(x: number, y: number): boolean {
    const near = (img: Phaser.GameObjects.Image) => {
      const w = img.frame.width * img.scaleX, h = img.frame.height * img.scaleY;
      return Math.abs(x - img.x) < w / 2 + 30 && Math.abs(y - img.y) < h / 2 + 30;
    };
    return near(this.bottle) || near(this.cup);
  }

  press(): void {
    if (this.pouring) return;
    this.pouring = true;
    this.scene.tweens.killTweensOf(this.bottle);
    this.scene.tweens.add({ targets: this.bottle, angle: -112, x: this.cup.x + 40, y: this.cup.y - this.cupH() * 0.85, duration: 260, ease: 'Sine.easeOut' });
    this.scene.time.delayedCall(240, () => {
      if (!this.pouring) return;
      this.stream?.destroy();
      this.stream = waterStream(this.scene, this.cup.x + 6, this.cup.y - this.cupH() * 0.62, 87);
    });
  }

  private cupH(): number {
    return this.cup.frame.height * this.cup.scale;
  }

  /** Stop pouring: the bottle stands up again. */
  release(): void {
    if (!this.pouring) return;
    this.pouring = false;
    this.scene.tweens.killTweensOf(this.bottle);
    this.scene.tweens.add({ targets: this.bottle, angle: 0, x: this.cup.x + this.cupH() * 0.75, y: this.cup.y - this.cupH() * 0.55, duration: 260, ease: 'Sine.easeOut' });
    if (this.stream) {
      const st = this.stream;
      st.emitting = false;
      this.scene.time.delayedCall(600, () => st.destroy());
      this.stream = null;
    }
  }

  get isPouring(): boolean {
    return this.pouring;
  }

  /** Call every frame. Returns true when the cup has just run over the brim. */
  update(dt: number, msToFill: number): boolean {
    if (!this.pouring) return false;
    this.setLevel(Math.min(1, this.fill + dt / msToFill));
    if (this.scene.time.now - this.lastSound > 650) {
      this.lastSound = this.scene.time.now;
      sfx('pour', { volume: 0.5 });
    }
    return this.fill >= 1;
  }

  close(): Promise<void> {
    this.release();
    return new Promise((res) => {
      this.scene.tweens.add({ targets: this.dim, fillAlpha: 0, duration: 400 });
      this.scene.tweens.add({ targets: this.root, alpha: 0, duration: 400, onComplete: () => { this.root.destroy(); res(); } });
    });
  }
}

// ---------------------------------------------------------------- free time
// Reactions for free time after an ordinary mission (BaseScene.freeTime). Each
// is a small motion and a soft sound, the same every time, and returns how long
// it lasts (touches meanwhile do nothing, so nothing grows the more he taps).
// They move only what nothing else in the scene is moving at that moment
// (angle, scaleX, or a y offset when no other motion uses y).

type Moving = Phaser.GameObjects.GameObject & { x: number; y: number; angle: number; scaleX: number; scaleY: number };

/** Is any running tween on this object moving this property? */
function moves(scene: Phaser.Scene, obj: Phaser.GameObjects.GameObject, prop: string): boolean {
  return scene.tweens.getTweensOf(obj).some((t) => t.isPlaying() && t.data.some((d) => (d as { key?: string }).key === prop));
}

/** A quick wag or wiggle on its own spot (a dog wagging, a cat's flick, a figure's little sway). */
export function freeWiggle(scene: Phaser.Scene, obj: Moving, sound: SfxName | null, deg = 5, volume = 0.3): number {
  if (moves(scene, obj, 'angle')) return pulse(scene, obj, sound, volume);
  const a = obj.angle;
  scene.tweens.add({ targets: obj, angle: { from: a, to: a + deg }, duration: 110, yoyo: true, repeat: 2, ease: 'Sine.easeInOut', onComplete: () => { obj.angle = a; } });
  if (sound) sfx(sound, { volume });
  return 800;
}

/** When the angle is already moving: a small widening and back instead. */
function pulse(scene: Phaser.Scene, obj: Moving, sound: SfxName | null, volume: number): number {
  if (moves(scene, obj, 'scaleX')) return 0;
  const sx = obj.scaleX;
  scene.tweens.add({ targets: obj, scaleX: sx * 1.05, duration: 160, yoyo: true, ease: 'Sine.easeInOut', onComplete: () => { obj.scaleX = sx; } });
  if (sound) sfx(sound, { volume });
  return 500;
}

/** A small hop on the spot (a bird, a figure's happy bounce). Falls back to a wiggle if y is moving. */
export function freeHop(scene: Phaser.Scene, obj: Moving, sound: SfxName | null, h = 10, volume = 0.3): number {
  if (moves(scene, obj, 'y')) return freeWiggle(scene, obj, sound, 4, volume);
  const y = obj.y;
  scene.tweens.add({ targets: obj, y: y - h, duration: 160, yoyo: true, ease: 'Quad.easeOut', onComplete: () => { obj.y = y; } });
  if (sound) sfx(sound, { volume });
  return 500;
}

/** A ball's bounce: up and down twice, smaller the second time. */
export function freeBounce(scene: Phaser.Scene, obj: Moving, h = 34, volume = 0.35): number {
  if (moves(scene, obj, 'y')) return freeWiggle(scene, obj, 'bounce', 8, volume);
  const y = obj.y;
  scene.tweens.chain({
    targets: obj,
    tweens: [
      { y: y - h, duration: 220, ease: 'Quad.easeOut' },
      { y, duration: 220, ease: 'Quad.easeIn', onComplete: () => sfx('bounce', { volume }) },
      { y: y - h * 0.4, duration: 150, ease: 'Quad.easeOut' },
      { y, duration: 150, ease: 'Quad.easeIn', onComplete: () => { obj.y = y; sfx('bounce', { volume: volume * 0.6 }); } },
    ],
  });
  return 900;
}

/** A slow stretch (a cat stretching, a plant or a tree swelling a little in the breeze). */
export function freeStretch(scene: Phaser.Scene, obj: Moving, sound: SfxName | null, amount = 0.06, volume = 0.3): number {
  if (moves(scene, obj, 'scaleX')) return moves(scene, obj, 'angle') ? 0 : freeWiggle(scene, obj, sound, 3, volume);
  const sx = obj.scaleX;
  scene.tweens.add({ targets: obj, scaleX: sx * (1 + amount), duration: 420, yoyo: true, ease: 'Sine.easeInOut', onComplete: () => { obj.scaleX = sx; } });
  if (sound) sfx(sound, { volume });
  return 900;
}

/** A sway from its base (a tree, a plant, a flag): a few slow swings. */
export function freeSway(scene: Phaser.Scene, obj: Moving, deg = 3, volume = 0.3): number {
  if (moves(scene, obj, 'angle')) return pulse(scene, obj, 'rustle', volume);
  const a = obj.angle;
  scene.tweens.add({ targets: obj, angle: { from: a - deg, to: a + deg }, duration: 380, yoyo: true, repeat: 1, ease: 'Sine.easeInOut', onComplete: () => { obj.angle = a; } });
  sfx('rustle', { volume });
  return 1600;
}

/** Water ripples where he touched: two soft rings spreading out (a light effect, nothing drawn). */
export function freeRipple(scene: Phaser.Scene, x: number, y: number, depth = 5, volume = 0.3): number {
  for (let i = 0; i < 2; i++) {
    const r = scene.add.image(x, y, 'fx_ring').setDepth(depth).setAlpha(0).setDisplaySize(16, 8).setBlendMode(Phaser.BlendModes.ADD);
    scene.tweens.add({ targets: r, displayWidth: 110, displayHeight: 40, alpha: { from: 0.7, to: 0 }, delay: i * 260, duration: 1100, ease: 'Sine.easeOut', onComplete: () => r.destroy() });
  }
  sfx('splash', { volume });
  return 1200;
}
