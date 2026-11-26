// Small shared pieces for the mission scenes: a breathing idle, a walk with the
// two walking pictures, and a watering can that pours while it is held over a plant.
import Phaser from 'phaser';
import { fitHeight } from '../core/assets';
import { waterStream } from '../core/fx';
import { sfx } from '../core/sfx';

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
  return new Promise((res) => scene.tweens.add({
    targets: img, x: to.x, y: to.y ?? img.y, duration: dur, ease: 'Sine.easeInOut',
    onComplete: () => { t.remove(); img.setFlipX(false); res(); },
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
