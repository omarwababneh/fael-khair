import Phaser from 'phaser';
import { fitHeight, fitWidth, hasArt } from '../../core/assets';
import { dustPuff, glowRing, motes } from '../../core/fx';
import { addLabel } from '../../core/labels';
import { music } from '../../core/music';
import { completeMission } from '../../core/session';
import { sfx } from '../../core/sfx';
import { ui } from '../../core/ui';
import { DESIGN_H, PIC, view } from '../../core/viewport';
import { Voice } from '../../core/voice';
import { BaseScene, type FreeTarget } from '../BaseScene';
import { freeHop } from '../kit';

// Petra: clearing the road (P1; value: removing harm from people's path; source bukhari_2472).
//
// The same scene at dawn is Petra's quiet deed (scene key 'petra-dawn',
// MISSIONS_V2.md section 6): before sunrise the Siq is empty; he clears the
// fallen stones and leaves; later a family walks through without knowing. No
// chime, no sparkle on him, no closing hadith line, nobody thanks him.

interface ObstacleDef {
  key: string;
  kind: 'rock' | 'branch';
  x: number;
  y: number;
  /** displayed width in design points */
  w: number;
  /** how quickly it follows the finger each frame (lower = heavier) */
  follow: number;
  weight: number;
  /** branches: fraction of the width, from the left, that is the smooth end to hold */
  grip?: number;
}

interface Obstacle extends ObstacleDef {
  img: Phaser.GameObjects.Image;
  base: number;
  placed: boolean;
  ring?: Phaser.GameObjects.Image;
  thornSaid: boolean;
}

interface Nook { x: number; y: number; used: boolean; ring: Phaser.GameObjects.Image }

// Six obstacles: three rocks, a thorn branch, a rock, a larger branch.
// Each one is a little heavier or needs a little more care than the one before.
// Branch art: the smooth end to hold is on the LEFT (see DECISIONS.md).
// Laid out on the path in bg_petra_siq (visible from about y = 480 down):
// nearer obstacles lower and bigger, farther ones higher and smaller.
const OBSTACLES: ObstacleDef[] = [
  { key: 'rock_a', kind: 'rock', x: 184, y: 656, w: 60, follow: 0.5, weight: 0.15 },
  { key: 'rock_b', kind: 'rock', x: 168, y: 608, w: 62, follow: 0.33, weight: 0.35 },
  { key: 'rock_c', kind: 'rock', x: 236, y: 584, w: 66, follow: 0.24, weight: 0.55 },
  { key: 'thorn_branch', kind: 'branch', x: 192, y: 556, w: 142, follow: 0.3, weight: 0.25, grip: 0.3 },
  { key: 'rock_d', kind: 'rock', x: 170, y: 528, w: 74, follow: 0.12, weight: 1 },
  { key: 'big_branch', kind: 'branch', x: 210, y: 500, w: 140, follow: 0.2, weight: 0.6, grip: 0.27 },
];

// Glowing nooks at the foot of the canyon walls. Any obstacle fits any free nook.
const NOOKS = [
  { x: 36, y: 604 }, { x: 358, y: 524 }, { x: 56, y: 544 },
  { x: 330, y: 490 }, { x: 82, y: 492 }, { x: 302, y: 460 },
];

const BOY = { x: 108, y: 706, h: 128 };
// The old man with his donkey cart: 1.6 times the boy's height wide (art checklist).
const CART = { x: 268, y: 718, w: 205 };
const STEP = 10; // how far the boy and cart move up after each cleared obstacle
const VANISH = { x: 200, y: 482 }; // where the path disappears into the Siq
const HINT_AFTER = 6000;

// The quiet deed: four fallen stones, no branches, no cart.
const DAWN_ROCKS = OBSTACLES.filter((o) => o.kind === 'rock');
const DAWN_TINT = 0x27346e; // cool blue light before sunrise, laid over the art

export class PetraScene extends BaseScene {
  private obstacles: Obstacle[] = [];
  private nooks: Nook[] = [];
  private boy!: Phaser.GameObjects.Container;
  private boyImg!: Phaser.GameObjects.Image;
  private cart!: Phaser.GameObjects.Container;
  private cartImg!: Phaser.GameObjects.Image;
  private dragging: Obstacle | null = null;
  private dragPointer = -1;
  private target = new Phaser.Math.Vector2();
  private grabOffset = new Phaser.Math.Vector2();
  private lastX = 0;
  private idleTimer?: Phaser.Time.TimerEvent;
  private hint: Phaser.GameObjects.Image | null = null;
  private hintTweens: Phaser.Tweens.BaseTween[] = [];
  private hintCount = 0;
  /** He has cleared his first stone or branch. */
  private placedOne = false;
  private finished = false;
  private walkTimer?: Phaser.Time.TimerEvent;
  private poseTimer?: Phaser.Time.TimerEvent;
  /** The dawn quiet deed rather than P1. */
  private quiet = false;
  private dawn: Phaser.GameObjects.Rectangle | null = null;
  /** The Treasury plaza at the end of P1 (it rises over the facade), and the boy on it. */
  private plaza: Phaser.GameObjects.Container | null = null;
  private plazaBoy: Phaser.GameObjects.Image | null = null;

  constructor(key = 'petra') {
    super(key);
  }

  create(): void {
    this.quiet = this.scene.key === 'petra-dawn';
    this.dawn = null;
    this.setup();
    this.obstacles = [];
    this.nooks = [];
    this.dragging = null;
    this.dragPointer = -1;
    this.hint = null;
    this.hintTweens = [];
    this.hintCount = 0;
    this.placedOne = false;
    this.finished = false;
    this.idleTimer = this.walkTimer = this.poseTimer = undefined;

    ui.setPill('البَتْرا');
    ui.setHome(() => this.goTo('map'));
    ui.clearBubble();
    music.play('petra', { natureOnly: this.quiet }); // a quiet deed has no music

    const bg = this.addCover('bg_petra_siq');
    // A very slow breath on the canyon so the frame is never perfectly still.
    this.tweens.add({ targets: bg, scale: bg.scale * 1.012, duration: 8000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    motes(this, { x: 60, y: 120, w: 270, h: 560 }, 40, this.quiet ? 0xcfd8ff : undefined);
    if (this.quiet) {
      // Before sunrise: a cool, dim light over the canyon (code may tint delivered art).
      const v = view();
      this.dawn = this.add.rectangle(PIC.x - 20, PIC.y - 20, PIC.w + 40, PIC.h + 40, DAWN_TINT, 0.4)
        .setOrigin(0).setDepth(80);
    }

    for (const n of NOOKS) {
      this.nooks.push({ ...n, used: false, ring: glowRing(this, n.x, n.y, 32, 5) });
    }

    // The cart behind the boy, the boy on the path. At dawn the Siq is empty: no cart.
    this.cartImg = this.add.image(0, 0, 'elder_cart').setOrigin(0.5, 1);
    fitWidth(this.cartImg, CART.w);
    this.cart = this.add.container(CART.x, CART.y, [this.cartImg]).setDepth(32).setVisible(!this.quiet);
    this.tweens.add({ targets: this.cartImg, scaleY: this.cartImg.scaleY * 1.012, duration: 1900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    this.boyImg = this.add.image(0, 0, 'boy_idle').setOrigin(0.5, 1);
    fitHeight(this.boyImg, BOY.h);
    this.boy = this.add.container(BOY.x, BOY.y, [this.boyImg]).setDepth(30);
    // The boy breathes when idle.
    this.tweens.add({ targets: this.boy, scaleY: 1.02, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    if (this.quiet) {
      // Small variation on replay: the stones lie a little differently each time.
      const mirror = Math.random() < 0.5;
      for (const d of DAWN_ROCKS) {
        this.makeObstacle({ ...d, x: (mirror ? 396 - d.x : d.x) + Phaser.Math.Between(-8, 8), y: d.y + Phaser.Math.Between(-4, 4) });
      }
    } else {
      for (const def of OBSTACLES) this.makeObstacle(def);
    }

    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.onMove(p));
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => this.onUp(p));
    this.input.on('pointerupoutside', (p: Phaser.Input.Pointer) => this.onUp(p));
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.resetIdle();
      this.pickAt(p);
    });

    // Birds by day, now and then.
    this.time.addEvent({ delay: 7000, loop: true, callback: () => Math.random() < 0.7 && sfx('birds', { volume: 0.5 }) });

    // P1 safeguard: only loose stones and fallen branches; the carved rock is never touched.
    if (this.quiet) void Voice.say('qdp_open');
    // One opening line, then straight to what to do; the care line comes after his first stone.
    else void Voice.say('petra_open').then((ended) => { if (ended && this.alive && !this.finished && !this.placedOne) void Voice.say('petra_hint'); });
    this.resetIdle();
  }

  update(_t: number, dt: number): void {
    const o = this.dragging;
    if (!o) return;
    // Heavy things lag behind the finger.
    const k = 1 - Math.pow(1 - o.follow, dt / 16.67);
    o.img.x += (this.target.x - o.img.x) * k;
    o.img.y += (this.target.y - o.img.y) * k;
    // Lean a little in the direction of travel.
    const vx = o.img.x - this.lastX;
    this.lastX = o.img.x;
    const lean = Phaser.Math.Clamp(vx * 0.03, -0.2, 0.2);
    o.img.rotation += (lean - o.img.rotation) * 0.2;
  }

  // ---------------------------------------------------------------- obstacles

  private makeObstacle(def: ObstacleDef): void {
    // Nearer obstacles (lower on screen) are drawn in front.
    const img = this.add.image(def.x, def.y, def.key).setDepth(20 + def.y / 1000);
    const base = fitWidth(img, def.w);
    const o: Obstacle = { ...def, img, base, placed: false, thornSaid: false };
    if (def.kind === 'branch' && def.grip) {
      // The smooth end glows, so he knows where to hold it.
      o.ring = glowRing(this, this.gripPoint(o).x, this.gripPoint(o).y, 26, 21);
    }
    this.obstacles.push(o);
  }

  /**
   * Which obstacle did he touch? Rocks answer to an oval a little larger than
   * the rock; branches to a band along the branch. Overlaps go to the closest
   * fit, so a thin branch no longer steals touches meant for the rock behind it.
   */
  private pickAt(p: Phaser.Input.Pointer): void {
    if (this.finished || this.dragging) return;
    let best: Obstacle | null = null;
    let bestScore = Infinity;
    for (const o of this.obstacles) {
      if (o.placed) continue;
      const w = o.img.frame.width * o.base, h = o.img.frame.height * o.base;
      const dx = p.worldX - o.img.x, dy = p.worldY - o.img.y;
      let score = Infinity;
      if (o.kind === 'rock') {
        const d = (dx / (w / 2 + 12)) ** 2 + (dy / (h / 2 + 12)) ** 2;
        if (d <= 1) score = d;
      } else {
        const band = Math.max(28, h / 2 + 8); // at least 56 points tall
        if (Math.abs(dx) <= w / 2 + 12 && Math.abs(dy) <= band) score = 0.25 * (dy / band) ** 2;
      }
      if (score < bestScore) { bestScore = score; best = o; }
    }
    if (!best) return;
    const w = best.img.frame.width * best.base;
    const localX = ((p.worldX - (best.img.x - w / 2)) / w) * best.img.frame.width;
    this.onDown(best, p, localX);
  }

  private gripPoint(o: Obstacle): Phaser.Math.Vector2 {
    const w = o.img.frame.width * o.base;
    return new Phaser.Math.Vector2(o.img.x - w / 2 + w * (o.grip ?? 0.5) * 0.5, o.img.y);
  }

  private onDown(o: Obstacle, p: Phaser.Input.Pointer, localX: number): void {
    if (this.finished || o.placed || this.dragging) return;
    this.clearHint();
    if (o.kind === 'branch' && o.grip) {
      const frac = localX / o.img.frame.width;
      if (frac > o.grip + 0.06) {
        this.ouch(o);
        return;
      }
    }
    this.dragging = o;
    this.dragPointer = p.id;
    this.grabOffset.set(o.img.x - p.worldX, o.img.y - p.worldY);
    this.target.set(o.img.x, o.img.y);
    this.lastX = o.img.x;
    o.img.setDepth(60);
    o.ring?.setVisible(false);
    // Squash on grab, then hold slightly lifted.
    this.tweens.killTweensOf(o.img);
    this.tweens.add({
      targets: o.img,
      scaleX: { from: o.base * 1.18, to: o.base * 1.06 },
      scaleY: { from: o.base * 0.86, to: o.base * 1.06 },
      duration: 220,
      ease: 'Back.easeOut',
    });
    sfx('grab', { volume: 0.6 });
    dustPuff(this, o.img.x, o.img.y + 18, 5 + Math.round(o.weight * 6), 0xd9b98a, 19);
    this.pose('boy_lift');
    this.tweens.add({ targets: this.boy, x: BOY.x + 6, duration: 160, yoyo: true });
  }

  private onMove(p: Phaser.Input.Pointer): void {
    if (!this.dragging || p.id !== this.dragPointer) return;
    const v = view();
    this.target.set(
      Phaser.Math.Clamp(p.worldX + this.grabOffset.x, v.x + 10, v.right - 10),
      Phaser.Math.Clamp(p.worldY + this.grabOffset.y, 110, 700),
    );
  }

  private onUp(p: Phaser.Input.Pointer): void {
    const o = this.dragging;
    if (!o || p.id !== this.dragPointer) return;
    this.dragging = null;
    this.dragPointer = -1;
    this.pose('boy_idle');
    const nook = this.pickNook(o);
    if (nook) this.place(o, nook);
    else this.returnHome(o);
    this.resetIdle();
  }

  private pickNook(o: Obstacle): Nook | null {
    const free = this.nooks.filter((n) => !n.used);
    if (!free.length) return null;
    const x = o.img.x, y = o.img.y;
    // He has to actually drag it: a tap-and-release never places an obstacle.
    if (Phaser.Math.Distance.Between(x, y, o.x, o.y) < 40) return null;
    const dist = (n: Nook) => Phaser.Math.Distance.Between(x, y, n.x, n.y);
    const nearest = free.reduce((a, b) => (dist(a) <= dist(b) ? a : b));
    if (dist(nearest) < 85) return nearest;
    // Forgiving: anything dragged well over to a side goes to that side's nearest nook.
    const side = x < 115 ? 'L' : x > 275 ? 'R' : null;
    if (!side) return null;
    const sameSide = free.filter((n) => (side === 'L' ? n.x < 195 : n.x > 195));
    const pool = sameSide.length ? sameSide : free;
    return pool.reduce((a, b) => (dist(a) <= dist(b) ? a : b));
  }

  private returnHome(o: Obstacle): void {
    // A gentle slide back to where it was: no buzzer, he simply tries again.
    sfx('slide', { volume: 0.7 });
    this.tweens.killTweensOf(o.img);
    this.tweens.add({
      targets: o.img,
      x: o.x, y: o.y, rotation: 0, scaleX: o.base, scaleY: o.base,
      duration: 420,
      ease: 'Back.easeOut',
      onComplete: () => {
        o.img.setDepth(20 + o.y / 1000);
        if (o.ring) {
          const g = this.gripPoint(o);
          o.ring.setPosition(g.x, g.y).setVisible(true);
        }
      },
    });
  }

  private place(o: Obstacle, nook: Nook): void {
    nook.used = true;
    o.placed = true;
    o.img.disableInteractive();
    o.ring?.destroy();
    o.ring = undefined;
    this.tweens.killTweensOf(o.img);
    const left = nook.x < 195;
    const end = o.kind === 'branch'
      ? { rotation: left ? 0.22 : -0.22, scale: o.base * 0.62 }
      : { rotation: (left ? -1 : 1) * 0.12, scale: o.base * 0.88 };
    this.tweens.add({
      targets: o.img,
      x: nook.x, y: nook.y, rotation: end.rotation, scaleX: end.scale, scaleY: end.scale,
      duration: 200 + o.weight * 120,
      ease: 'Quad.easeIn',
      onComplete: () => {
        o.img.setDepth(15);
        this.land(o, nook, end.scale);
      },
    });
  }

  private land(o: Obstacle, nook: Nook, s: number): void {
    // Thud, a puff of dust, a squash; heavy rocks shake the ground a little.
    sfx('thud', { weight: o.kind === 'branch' ? 0.1 : o.weight, volume: o.kind === 'branch' ? 0.6 : 1 });
    sfx('dust');
    dustPuff(this, nook.x, nook.y + 20, 10 + Math.round(o.weight * 14));
    this.tweens.add({
      targets: o.img,
      scaleX: { from: s * 1.2, to: s },
      scaleY: { from: s * 0.78, to: s },
      duration: 320,
      ease: 'Back.easeOut',
    });
    if (o.weight > 0.5) this.cameras.main.shake(160, 0.003 + o.weight * 0.004);
    this.tweens.add({ targets: nook.ring, alpha: 0, scale: nook.ring.scale * 1.6, duration: 500, onComplete: () => nook.ring.destroy() });
    // A finished step chimes, except in a quiet deed, which has no chime at all,
    // and not on the last one (not on the step that finishes the deed: that would be a reward sting).
    if (!this.quiet && this.obstacles.some((x) => !x.placed)) this.time.delayedCall(260, () => sfx('chime', { volume: 0.55 }));
    // After his first stone: we look after the old place (P1 safeguard).
    if (!this.placedOne && !this.quiet) this.time.delayedCall(500, () => this.alive && !this.finished && Voice.say('petra_care'));
    this.placedOne = true;

    const remaining = this.obstacles.filter((x) => !x.placed).length;
    if (remaining === 0) void this.finale();
    else this.advance();
  }

  /** As the path clears, the boy steps forward and the cart rolls on behind him. */
  private advance(): void {
    this.walk(true);
    this.tweens.add({ targets: this.boy, y: this.boy.y - STEP, duration: 650, ease: 'Sine.easeInOut', onComplete: () => this.walk(false) });
    if (this.quiet) return; // no cart at dawn
    this.time.delayedCall(250, () => {
      sfx('creak', { volume: 0.8 });
      this.tweens.add({ targets: this.cart, y: this.cart.y - STEP, duration: 800, ease: 'Sine.easeInOut' });
      this.tweens.add({ targets: this.cartImg, angle: { from: -1.5, to: 1.5 }, duration: 200, yoyo: true, repeat: 1 });
    });
  }

  // ---------------------------------------------------------------- the boy

  private pose(key: string, holdMs = 0): void {
    this.poseTimer?.remove();
    this.boyImg.setTexture(key);
    // The lifting picture shows him bent over, about 0.81 of his standing
    // height, so it is drawn shorter. Otherwise he would grow while lifting.
    fitHeight(this.boyImg, BOY.h * (key === 'boy_lift' ? 0.81 : 1));
    if (holdMs) this.poseTimer = this.time.delayedCall(holdMs, () => this.pose('boy_idle'));
  }

  private walk(on: boolean): void {
    this.walkTimer?.remove();
    if (!on) {
      this.pose('boy_idle');
      return;
    }
    let a = true;
    this.pose('boy_walk_a');
    this.walkTimer = this.time.addEvent({
      delay: 170,
      loop: true,
      callback: () => {
        a = !a;
        this.boyImg.setTexture(a ? 'boy_walk_a' : 'boy_walk_b');
        fitHeight(this.boyImg, BOY.h);
        sfx('step', { volume: 0.6 });
      },
    });
  }

  /** Touching the thorny part: the boy pulls his hand back with a small "آي!". No penalty. */
  private ouch(o: Obstacle): void {
    sfx('prick');
    this.pose('boy_worried', 900);
    this.tweens.add({ targets: this.boy, x: { from: BOY.x - 10, to: BOY.x }, duration: 420, ease: 'Elastic.easeOut' });
    this.tweens.add({ targets: this.boy, angle: { from: -7, to: 0 }, duration: 520, ease: 'Elastic.easeOut' });
    this.tweens.add({ targets: o.img, angle: { from: 5, to: 0 }, duration: 480, ease: 'Elastic.easeOut' });
    const t = addLabel('آي!', this.boy.x + 18, this.boy.y - BOY.h - 14, 'fk-ouch');
    this.time.delayedCall(1200, () => t.remove());
    if (o.ring) this.tweens.add({ targets: o.ring, scale: o.ring.scale * 1.5, duration: 260, yoyo: true, repeat: 1 });
    if (!o.thornSaid) {
      o.thornSaid = true;
      void Voice.say('petra_thorn');
    }
  }

  // ---------------------------------------------------------------- hint hand

  private resetIdle(): void {
    this.idleTimer?.remove();
    if (this.finished) return;
    // The first hint comes sooner, before anything is cleared.
    this.idleTimer = this.time.delayedCall(this.placedOne ? HINT_AFTER : 3000, () => this.showHint());
  }

  private clearHint(): void {
    // A tween chain must be stopped, not removed: chain.remove() expects a child
    // tween and threw, which blocked every touch once the hint had appeared.
    const ts = this.hintTweens;
    this.hintTweens = [];
    for (const t of ts) t.stop();
    this.hint?.destroy();
    this.hint = null;
  }

  private showHint(): void {
    if (this.finished || this.dragging || !this.alive) return;
    const o = this.obstacles.find((x) => !x.placed);
    if (!o) return;
    const free = this.nooks.filter((n) => !n.used);
    const from = o.kind === 'branch' ? this.gripPoint(o) : new Phaser.Math.Vector2(o.img.x, o.img.y);
    const to = free.reduce((a, b) =>
      Phaser.Math.Distance.Between(from.x, from.y, a.x, a.y) <= Phaser.Math.Distance.Between(from.x, from.y, b.x, b.y) ? a : b);
    this.clearHint();
    const hand = this.add.image(from.x, from.y, 'fx_hand').setOrigin(0.37, 0.05).setDepth(90).setAlpha(0);
    hand.setDisplaySize(58, 72);
    const s = hand.scale;
    this.hint = hand;
    this.hintTweens.push(this.tweens.chain({
      targets: hand,
      loop: 1,
      tweens: [
        { x: from.x, y: from.y, alpha: 1, scale: s, duration: 300 },
        { scale: s * 0.85, duration: 180 },
        { x: to.x, y: to.y, duration: 1100, ease: 'Sine.easeInOut' },
        { scale: s, alpha: 0, duration: 300 },
      ],
      onComplete: () => {
        this.clearHint();
        this.resetIdle();
      },
    }));
    this.hintCount++;
    if (this.hintCount === 1 && o.kind === 'rock' && this.placedOne && !Voice.busy) void Voice.say('petra_hint');
    else if (o.kind === 'branch' && !o.thornSaid) {
      o.thornSaid = true;
      void Voice.say('petra_thorn');
    }
  }

  // ---------------------------------------------------------------- ending

  private async finale(): Promise<void> {
    this.finished = true;
    this.idleTimer?.remove();
    this.clearHint();
    await this.wait(700);
    if (!this.alive) return;
    if (this.quiet) return this.dawnEnding();
    const said = Voice.say('petra_clear');

    // The boy and the cart walk on up the cleared path.
    this.walk(true);
    this.tweens.add({ targets: this.boy, y: VANISH.y + 10, x: VANISH.x - 12, scale: 0.3, alpha: { from: 1, to: 0 }, duration: 4200, ease: 'Sine.easeIn' });
    this.time.delayedCall(500, () => {
      if (!this.alive) return;
      this.cartImg.setFlipX(true); // the cart heads left, into the Siq
      this.tweens.add({ targets: this.cart, y: VANISH.y + 14, x: VANISH.x + 14, scale: 0.3, alpha: { from: 1, to: 0 }, duration: 4400, ease: 'Sine.easeIn' });
      this.tweens.add({ targets: this.cartImg, angle: { from: -1.2, to: 1.2 }, duration: 260, yoyo: true, repeat: -1 });
      this.time.addEvent({ delay: 900, repeat: 4, callback: () => sfx('creak', { volume: 0.6 }) });
    });
    await Promise.all([said, this.wait(3400)]);
    if (!this.alive) return;
    await this.treasury();
  }

  private async treasury(): Promise<void> {
    this.walk(false);
    const v = view();
    const plaza = this.add.container(0, 0).setDepth(100).setAlpha(0);

    // Background taller than the screen so the camera can rise over the facade.
    const bg = this.add.image(195, v.bottom + 10, 'bg_petra_treasury').setOrigin(0.5, 1);
    // A fixed scale (never from the screen), so the old man and the boy stand
    // on the same spot of the plaza on every screen.
    const s = (DESIGN_H * 1.4) / bg.frame.height;
    bg.setScale(s);
    const bgH = bg.frame.height * s;

    const ground = v.bottom - 150;
    // Fixed spots on the plaza (the picture is centred on x = 195), never from the screen edge.
    const boy = this.add.image(70, ground + 8, 'boy_happy').setOrigin(0.5, 1);
    fitHeight(boy, 138);
    const elder = this.add.image(v.x - 140, ground, 'elder_cart').setOrigin(0.5, 1);
    fitWidth(elder, 138 * 1.6); // the old man's cart: 1.6 times the boy wide (art checklist)
    plaza.add([bg, boy, elder]);
    this.plaza = plaza;
    this.plazaBoy = boy;
    this.tweens.add({ targets: boy, scaleY: boy.scaleY * 1.02, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // Warm light over the plaza.
    const warm = this.add.rectangle(PIC.x, PIC.y, PIC.w, PIC.h, 0xffa84a, 0).setOrigin(0).setDepth(101).setBlendMode(Phaser.BlendModes.ADD);
    const m = motes(this, v, 102, 0xffd27a);

    sfx('whoosh');
    this.tweens.add({ targets: plaza, alpha: 1, duration: 1000, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: warm, fillAlpha: 0.13, duration: 2500 });
    await this.wait(900);
    if (!this.alive) return;

    // The old man arrives with his cart.
    const bob = this.tweens.add({ targets: elder, angle: { from: -1.2, to: 1.2 }, duration: 260, yoyo: true, repeat: -1 });
    const creak = this.time.addEvent({ delay: 900, loop: true, callback: () => sfx('creak', { volume: 0.6 }) });
    await new Promise<void>((res) => this.tweens.add({ targets: elder, x: 228, duration: 2600, ease: 'Sine.easeOut', onComplete: () => res() }));
    if (!this.alive) return;
    bob.pause();
    creak.paused = true;
    elder.setAngle(0);
    // He is never perfectly still while he speaks.
    const talk = this.tweens.add({ targets: elder, scaleY: elder.scaleY * 1.015, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    await Promise.race([Voice.say('petra_elder'), this.wait(6000)]);
    talk.stop();
    if (!this.alive) return;

    // He goes on his way; the camera rises slowly over the facade while birds cross the sky.
    bob.resume();
    creak.paused = false;
    this.tweens.add({ targets: elder, x: v.right + 160, duration: 4800, ease: 'Sine.easeIn', onComplete: () => { creak.remove(); bob.stop(); } });
    const rise = Math.max(0, bgH - v.h - 20);
    this.tweens.add({ targets: plaza, y: rise, duration: 9000, ease: 'Sine.easeInOut', delay: 600 });
    this.time.delayedCall(2200, () => this.birds(v));
    // The father's hadith line comes while the camera is still rising (it used to wait 9.8 s).
    await this.wait(3000);
    if (!this.alive) return;
    m.frequency = 400;
    // The story's consequence is done: the place counts even if he taps home now.
    completeMission('petra');
    await Promise.all([Voice.say('petra_hadith'), this.wait(6600)]);
    if (!this.alive) return;
    // Free time (BaseScene.afterClosing), or the map.
    await this.afterClosing(1800);
  }

  /**
   * The quiet deed's ending: he simply walks away up the Siq. The sun comes up.
   * Later a family walks through on the clear path without knowing anyone
   * helped. One plain line about what changed, then the map.
   */
  private async dawnEnding(): Promise<void> {
    // The spare nooks stop glowing: there is nothing left to do.
    for (const n of this.nooks) if (!n.used && n.ring.active) this.tweens.add({ targets: n.ring, alpha: 0, duration: 600, onComplete: () => n.ring.destroy() });
    this.walk(true);
    this.tweens.add({ targets: this.boy, y: VANISH.y + 10, x: VANISH.x - 12, scale: 0.3, alpha: { from: 1, to: 0 }, duration: 4200, ease: 'Sine.easeIn' });
    await this.wait(4300);
    if (!this.alive) return;
    this.walk(false);
    // Sunrise: the cool light lifts.
    if (this.dawn) this.tweens.add({ targets: this.dawn, fillAlpha: 0, duration: 3500, ease: 'Sine.easeInOut' });
    this.time.delayedCall(1200, () => this.alive && sfx('birds', { volume: 0.6 }));
    await this.wait(2600);
    if (!this.alive) return;
    // The place counts now: the world has changed, and he is not there to see it noticed.
    completeMission('petra');
    // A father and his daughter walk up the path, chatting, without stopping.
    const v = view();
    const dad = this.add.image(v.x - 50, v.bottom + 20, 'traveler_happy').setOrigin(0.5, 1).setDepth(31);
    fitHeight(dad, BOY.h * 1.35); // art checklist: adults 1.35, the girl 0.7
    const girl = this.add.image(v.x - 100, v.bottom + 26, 'girl_happy').setOrigin(0.5, 1).setDepth(32);
    fitHeight(girl, BOY.h * 0.7);
    const steps = this.time.addEvent({ delay: 420, loop: true, callback: () => sfx('step', { volume: 0.35 }) });
    for (const [img, dx, delay] of [[dad, 6, 0], [girl, -18, 500]] as const) {
      this.tweens.add({ targets: img, angle: { from: -2, to: 2 }, duration: 300, yoyo: true, repeat: -1 });
      this.tweens.add({ targets: img, x: VANISH.x + dx, y: VANISH.y + 8, scale: img.scale * 0.3, alpha: { from: 1, to: 0 }, delay, duration: 7000, ease: 'Sine.easeIn' });
    }
    await this.wait(3000);
    if (!this.alive) return;
    await Voice.say('qdp_end');
    if (!this.alive) return;
    await this.wait(1500);
    steps.remove();
    if (!this.alive) return;
    this.goTo('map');
  }

  /**
   * Free time over the Treasury: by then the camera has risen over the facade
   * and nobody is in the frame, so the old stone itself answers: the urn on top
   * and a column each give a soft knock and a faint ring where he touched.
   */
  /**
   * Free time after P1: the view eases back down from the facade to the plaza,
   * where the boy stands. He hops when touched; a touch on the Treasury's doorway
   * gives a soft echo, and he turns to look at it.
   */
  protected onFreeTime(): number {
    if (this.quiet || !this.plaza) return 0;
    this.tweens.killTweensOf(this.plaza);
    this.tweens.add({ targets: this.plaza, y: 0, duration: 2600, ease: 'Sine.easeInOut' });
    return 2700;
  }

  protected freeTargets(): FreeTarget[] {
    const boy = this.plazaBoy;
    const plaza = this.plaza;
    if (this.quiet || !boy || !plaza) return [];
    // The doorway of bg_petra_treasury, at the foot of the facade (as fractions of the picture).
    const door = (): Phaser.Geom.Rectangle => {
      const bg = plaza.list[0] as Phaser.GameObjects.Image;
      const b = bg.getBounds();
      return new Phaser.Geom.Rectangle(b.x + b.width * 0.5 - 40, b.y + plaza.y + b.height * 0.68 - 70, 80, 140);
    };
    return [
      { obj: boy, area: () => { const b = boy.getBounds(); return new Phaser.Geom.Rectangle(b.x, b.y + plaza.y, b.width, b.height); }, react: () => freeHop(this, boy, 'step', 10) },
      {
        obj: boy, area: door,
        react: () => {
          // A soft knock comes back off the rock, and the boy turns toward the door, then back.
          sfx('knock', { volume: 0.3 });
          this.time.delayedCall(320, () => this.alive && sfx('knock', { volume: 0.12 }));
          boy.setFlipX(true);
          this.time.delayedCall(1100, () => this.alive && boy.setFlipX(false));
          return 1300;
        },
      },
    ];
  }

  /** Birds crossing the sky. Uses the optional `bird` art; without it, only their sound. */
  private birds(v: ReturnType<typeof view>): void {
    if (!this.alive) return;
    sfx('birds', { volume: 0.7 });
    this.time.delayedCall(700, () => sfx('birds', { volume: 0.5 }));
    if (!hasArt(this, 'bird')) return;
    const flock = [[0, 0], [34, -18], [34, 18], [68, -34], [68, 34]];
    for (const [dx, dy] of flock) {
      const b = this.add.image(v.right + 40 + dx, v.y + 170 + dy, 'bird').setDepth(103);
      fitWidth(b, 30);
      this.tweens.add({ targets: b, scaleY: b.scaleY * 0.6, duration: 180 + Math.random() * 60, yoyo: true, repeat: -1 });
      this.tweens.add({ targets: b, x: v.x - 120 + dx, y: b.y - 60, duration: 7500, ease: 'Linear', onComplete: () => b.destroy() });
    }
  }
}

/** Petra's quiet deed: the same Siq before sunrise (MISSIONS_V2.md section 6). */
export class PetraDawnScene extends PetraScene {
  constructor() {
    super('petra-dawn');
  }
}
