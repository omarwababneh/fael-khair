// Moving layers (version 3 part B, art checklist section d): transparent pieces
// over the existing backgrounds that move gently, so a place feels alive without
// video. Scenery only. Motion is slow, small, and loops without a visible jump.
// They move on arrival and in free time; a scene makes them still during a moral
// choice, the father's key lines and a quiet deed's final moment (LayerSet.still).
// They never move when the parents switch «حركة الخلفية» off or the phone asks
// for reduced motion: then they stay in place, still.
import Phaser from 'phaser';
import { hasArt } from '../core/assets';
import { getLayersOn } from '../core/settings';
import { view } from '../core/viewport';

/** The phone's reduce-motion setting. */
export const reducedMotion = (): boolean => {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
};

/** Should layers move at all (the parents' switch and the phone's setting)? */
export const layersMove = (): boolean => getLayersOn() && !reducedMotion();

type Motion =
  | { kind: 'drift'; speed: number } // clouds: across the sky, left to right, leaving one side and coming back on the other
  | { kind: 'birds' } // the far flock: crosses now and then
  | { kind: 'sway'; deg: number; ms: number } // a branch, a sprig, grass, a frond
  | { kind: 'breathe'; from: number; to: number; ms: number } // a glow, glints
  | { kind: 'rise'; dy: number; ms: number } // steam
  | { kind: 'slide'; dy: number; ms: number } // foam
  | { kind: 'wisp'; dx: number; ms: number } // a wisp of sand
  | { kind: 'none' };

interface Spec {
  key: string;
  /** Position as fractions of the background picture (x from the left, y from the top). */
  fx: number;
  fy: number;
  /** Width in points (the height follows). */
  w: number;
  depth?: number;
  /** Origin: where it is fixed (a branch at its top, grass at its base). */
  ox?: number;
  oy?: number;
  flip?: boolean;
  alpha?: number;
  /** Repeat across the view's width (the foam line, which tiles). */
  tile?: boolean;
  motion: Motion;
}

const SKY_FULL: Spec[] = [
  { key: 'layer_cloud_wisp', fx: 0.35, fy: 0.05, w: 220, alpha: 0.8, motion: { kind: 'drift', speed: 1.5 } },
  { key: 'layer_cloud_large', fx: 0.62, fy: 0.1, w: 190, alpha: 0.9, motion: { kind: 'drift', speed: 2.5 } },
  { key: 'layer_cloud_small', fx: 0.3, fy: 0.15, w: 110, alpha: 0.95, motion: { kind: 'drift', speed: 4 } },
  { key: 'layer_birds_far', fx: 0.5, fy: 0.11, w: 46, motion: { kind: 'birds' } },
];
/** Narrow skies (the Siq, the Amman street): a wisp and the far birds only. */
const SKY_NARROW: Spec[] = [
  { key: 'layer_cloud_wisp', fx: 0.45, fy: 0.05, w: 200, alpha: 0.8, motion: { kind: 'drift', speed: 1.5 } },
  { key: 'layer_birds_far', fx: 0.5, fy: 0.08, w: 40, motion: { kind: 'birds' } },
];
const SAND: Spec = { key: 'layer_sand_wisp', fx: 0.5, fy: 0.9, w: 250, alpha: 0, depth: 2, motion: { kind: 'wisp', dx: 70, ms: 8000 } };
const GRASS = (fx: number, fy: number, w = 46, flip = false): Spec => ({ key: 'layer_grass_tuft', fx, fy, w, ox: 0.5, oy: 1, flip, depth: 2, motion: { kind: 'sway', deg: 2, ms: 3000 } });
const GLINTS = (fx: number, fy: number, w = 150): Spec => ({ key: 'layer_water_glints', fx, fy, w, alpha: 0.7, depth: 1, motion: { kind: 'breathe', from: 0.25, to: 0.85, ms: 2800 } });

/** Which layers go on which background (positions from the art checklist, checked on screen). */
const LAYERS: Record<string, Spec[]> = {
  bg_petra_siq: [...SKY_NARROW.map((s) => ({ ...s, fx: 0.52 })), SAND],
  bg_petra_tombs: [...SKY_FULL, SAND, GRASS(0.22, 0.73), GRASS(0.79, 0.71, 40, true)],
  bg_petra_treasury: [SAND],
  bg_ummqais_well: [...SKY_FULL,
    { key: 'layer_olive_branch', fx: 0.86, fy: 0.0, w: 150, ox: 1, oy: 0, depth: 4, motion: { kind: 'sway', deg: 2, ms: 4000 } },
    GRASS(0.25, 0.72), GRASS(0.78, 0.74, 40, true)],
  bg_ummqais_grove: [...SKY_FULL,
    { key: 'layer_olive_branch', fx: 0.86, fy: 0.0, w: 150, ox: 1, oy: 0, depth: 4, motion: { kind: 'sway', deg: 2, ms: 4000 } },
    GRASS(0.22, 0.6), GRASS(0.8, 0.64, 40, true)],
  bg_amman_stairs: [...SKY_NARROW,
    { key: 'layer_bougainvillea_sprig', fx: 0.86, fy: 0.6, w: 60, ox: 0.5, oy: 0, depth: 4, motion: { kind: 'sway', deg: 2, ms: 4000 } }],
  bg_irbid_alley: [
    { key: 'layer_vine_sprig', fx: 0.2, fy: 0.12, w: 70, ox: 0.5, oy: 0, depth: 4, motion: { kind: 'sway', deg: 3, ms: 3500 } },
    { key: 'layer_bougainvillea_sprig', fx: 0.8, fy: 0.24, w: 62, ox: 0.5, oy: 0, depth: 4, motion: { kind: 'sway', deg: 2, ms: 4100 } }],
  bg_irbid_bakery: [
    { key: 'layer_vine_sprig', fx: 0.2, fy: 0.1, w: 70, ox: 0.5, oy: 0, depth: 4, motion: { kind: 'sway', deg: 3, ms: 3500 } },
    { key: 'layer_glow_warm', fx: 0.56, fy: 0.31, w: 130, alpha: 0.7, depth: 1, motion: { kind: 'breathe', from: 0.55, to: 0.8, ms: 3600 } },
    { key: 'layer_oven_steam', fx: 0.37, fy: 0.22, w: 34, alpha: 0, depth: 2, motion: { kind: 'rise', dy: 20, ms: 5000 } }],
  bg_irbid_dusk: [
    { key: 'layer_vine_sprig', fx: 0.69, fy: 0.27, w: 60, ox: 0.5, oy: 0, depth: 4, motion: { kind: 'sway', deg: 3, ms: 3500 } },
    { key: 'layer_bougainvillea_sprig', fx: 0.85, fy: 0.27, w: 58, ox: 0.5, oy: 0, depth: 4, motion: { kind: 'sway', deg: 2, ms: 4100 } },
    { key: 'layer_glow_warm', fx: 0.3, fy: 0.48, w: 110, alpha: 0.75, depth: 1, motion: { kind: 'breathe', from: 0.6, to: 0.85, ms: 3800 } }],
  bg_jerash_plaza: [...SKY_FULL, GRASS(0.21, 0.36, 36), GRASS(0.8, 0.36, 34, true)],
  bg_jerash_cardo: [...SKY_FULL],
  bg_deadsea_restarea: [...SKY_FULL,
    { key: 'layer_foam_line', fx: 0.5, fy: 0.47, w: 260, tile: true, alpha: 0.85, depth: 1, motion: { kind: 'slide', dy: 6, ms: 5000 } },
    GLINTS(0.5, 0.42)],
  bg_deadsea_shore: [...SKY_FULL,
    { key: 'layer_foam_curve', fx: 0.5, fy: 0.6, w: 330, alpha: 0.85, depth: 1, motion: { kind: 'slide', dy: 5, ms: 6000 } },
    GLINTS(0.3, 0.37, 140), GLINTS(0.62, 0.45, 120)],
  bg_aqaba_beach: [...SKY_FULL,
    { key: 'layer_foam_line', fx: 0.5, fy: 0.62, w: 260, tile: true, alpha: 0.85, depth: 1, motion: { kind: 'slide', dy: 6, ms: 5000 } },
    GLINTS(0.45, 0.56, 130),
    { key: 'layer_palm_frond', fx: 0.21, fy: 0.27, w: 110, ox: 0.1, oy: 0.2, depth: 3, motion: { kind: 'sway', deg: 3, ms: 4000 } }],
  bg_aqaba_harbor: [...SKY_FULL, GLINTS(0.4, 0.55, 130), GLINTS(0.72, 0.58, 100),
    { key: 'layer_palm_frond', fx: 0.2, fy: 0.25, w: 105, ox: 0.1, oy: 0.2, depth: 3, motion: { kind: 'sway', deg: 3, ms: 4300 } }],
};

/** A set of layers on one background; still() stops (and later resumes) every motion. */
export class LayerSet {
  private items: Phaser.GameObjects.Image[] = [];
  private tweens: Phaser.Tweens.Tween[] = [];
  private timers: Phaser.Time.TimerEvent[] = [];
  private stillNow = false;
  private moving: boolean;

  constructor(private scene: Phaser.Scene, bg: Phaser.GameObjects.Image, bgKey: string) {
    this.moving = layersMove();
    const specs = LAYERS[bgKey] ?? [];
    const pic = bg.getBounds();
    for (const s of specs) {
      if (!hasArt(scene, s.key)) continue;
      const x = pic.x + s.fx * pic.width, y = pic.y + s.fy * pic.height;
      if (s.tile) {
        const v = view();
        const probe = scene.textures.getFrame(s.key);
        const h = (s.w * probe.height) / probe.width;
        for (let tx = v.x - s.w / 2; tx < v.right + s.w; tx += s.w - 1) this.add(s, tx, y, h);
      } else {
        this.add(s, x, y);
      }
    }
  }

  private add(s: Spec, x: number, y: number, tileH?: number): void {
    const img = this.scene.add.image(x, y, s.key).setDepth(s.depth ?? 1).setOrigin(s.ox ?? 0.5, s.oy ?? 0.5);
    img.setScale(s.w / img.frame.width);
    if (tileH) img.setDisplaySize(s.w, tileH);
    if (s.flip) img.setFlipX(true);
    const still = s.motion.kind === 'birds' || s.motion.kind === 'rise' || s.motion.kind === 'wisp' ? 0 : s.alpha ?? 1;
    img.setAlpha(this.moving ? s.alpha ?? 1 : still || (s.alpha ?? 1));
    // Without motion, the flock and the passing wisps of steam and sand are not shown at all.
    if (!this.moving && still === 0) img.setVisible(false);
    this.items.push(img);
    if (this.moving) this.animate(img, s);
  }

  private keep(t: Phaser.Tweens.Tween): Phaser.Tweens.Tween {
    this.tweens.push(t);
    if (this.stillNow) t.pause();
    return t;
  }

  private animate(img: Phaser.GameObjects.Image, s: Spec): void {
    const sc = this.scene;
    const m = s.motion;
    if (m.kind === 'sway') {
      this.keep(sc.tweens.add({ targets: img, angle: { from: -m.deg, to: m.deg }, duration: m.ms, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: Math.random() * 800 }));
    } else if (m.kind === 'breathe') {
      img.setAlpha(m.from);
      this.keep(sc.tweens.add({ targets: img, alpha: m.to, duration: m.ms, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: Math.random() * 1200 }));
    } else if (m.kind === 'slide') {
      this.keep(sc.tweens.add({ targets: img, y: img.y + m.dy, duration: m.ms / 2, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }));
      this.keep(sc.tweens.add({ targets: img, alpha: (s.alpha ?? 1) * 0.6, duration: m.ms / 2, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }));
    } else if (m.kind === 'rise') {
      // Rises and fades out, then starts again while invisible (no visible jump).
      const y0 = img.y;
      this.keep(sc.tweens.add({ targets: img, y: { from: y0, to: y0 - m.dy }, duration: m.ms, repeat: -1, ease: 'Linear' }));
      this.keep(sc.tweens.add({ targets: img, alpha: { from: 0, to: 0.55 }, duration: m.ms / 2, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }));
    } else if (m.kind === 'wisp') {
      const x0 = img.x;
      this.keep(sc.tweens.add({ targets: img, x: { from: x0 - m.dx / 2, to: x0 + m.dx / 2 }, duration: m.ms, repeat: -1, repeatDelay: 3000, ease: 'Linear' }));
      this.keep(sc.tweens.add({ targets: img, alpha: { from: 0, to: 0.5 }, duration: m.ms / 2, yoyo: true, repeat: -1, repeatDelay: 3000, ease: 'Sine.easeInOut' }));
    } else if (m.kind === 'drift') {
      this.drift(img, m.speed, false);
    } else if (m.kind === 'birds') {
      img.setAlpha(0);
      this.birds(img, 20000 + Math.random() * 30000);
    }
  }

  /** Across the sky to the right edge, then in again from the left (off screen, so no jump shows). */
  private drift(img: Phaser.GameObjects.Image, speed: number, fromLeft: boolean): void {
    const v = view();
    const w = img.displayWidth;
    if (fromLeft) img.x = v.x - w / 2 - 10;
    const to = v.right + w / 2 + 10;
    const ms = ((to - img.x) / speed) * 1000;
    this.keep(this.scene.tweens.add({ targets: img, x: to, duration: Math.max(ms, 1000), ease: 'Linear', onComplete: () => img.active && this.drift(img, speed, true) }));
  }

  /** The tiny far-away flock crosses right to left in about 12 seconds, then waits a minute or two. */
  private birds(img: Phaser.GameObjects.Image, wait: number): void {
    const t = this.scene.time.delayedCall(wait, () => {
      if (!img.active) return;
      const v = view();
      img.x = v.right + img.displayWidth;
      img.setAlpha(0.85);
      this.keep(this.scene.tweens.add({
        targets: img, x: v.x - img.displayWidth, duration: 12000, ease: 'Linear',
        onComplete: () => { img.setAlpha(0); this.birds(img, 60000 + Math.random() * 60000); },
      }));
    });
    this.timers = this.timers.filter((x) => x.getRemaining() > 0 && !x.hasDispatched);
    this.timers.push(t);
    if (this.stillNow) t.paused = true;
  }

  /** Still (a moral choice, a key line, a quiet deed's final moment, before the ayah) or moving again. */
  still(on: boolean): void {
    this.stillNow = on;
    this.tweens = this.tweens.filter((t) => t.isActive() || t.isPaused());
    for (const t of this.tweens) {
      if (on) t.pause();
      else t.resume();
    }
    for (const t of this.timers) t.paused = on;
  }

  get count(): number {
    return this.items.length;
  }
}
