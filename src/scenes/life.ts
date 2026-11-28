// Life in every scene (version 3, after the owner's feedback that the game felt
// static). Everything here is applied only while a frame is drawn and undone
// right after it (the scene's PRE_RENDER and RENDER events), so it never fights
// the scene's own tweens, poses or touch logic:
//  - every person and animal breathes, shifts its weight a little, and turns
//    toward what is happening (a touch, the boy moving);
//  - nobody slides: a figure that moves without its walking pictures bobs as if
//    stepping;
//  - the camera drifts slowly and zooms in very gently, inside the portrait
//    frame, with the background moving a little less than the figures;
//  - whatever he touches squashes a little (with a soft sound if the scene made
//    none), and a dragged thing leans with its weight and settles when let go.
// It all goes still during a moral choice and the father's key lines (the scene
// calls BaseScene.motionStill, and any registry line holds it still while it is
// said), stops before the Wadi Rum ayah, and never moves when the parents switch
// «حركة الخلفية» off or the phone asks for reduced motion.
import Phaser from 'phaser';
import { isKeyLine } from '../core/content';
import { lastSfxAt, sfx } from '../core/sfx';
import { Voice } from '../core/voice';
import { layersMove } from './layers';

/** People and animals (by picture name). */
const FIGURE = /^(boy_|dog_|mama_|elder_|neighbor_|passerby_|guard_|traveler_|donkey_|girl_|friend_|sister_|cat_|baker_|newboy_|stranger_|grandpa_|mother_|visitor_|classmate_|baba_|ranger_|fisherman_|customer_|turtle_|birds_eating|free_|sight_goats_shepherd)/;
/** Pictures with their walking already drawn: they need no extra bob. */
const WALKING = /^(boy_walk_|grandpa_baba_walk|passerby_walk|free_fish_jump)/;
/** Things he can touch or drag (not backgrounds, layers or light effects). */
const TOUCHABLE = /^(?!bg_|layer_|fx_)/;

/** Side-facing figures that may turn round toward what is happening, with the way each picture faces. */
const TURNS: Record<string, 1 | -1> = {
  girl_happy: 1, traveler_b: 1, traveler_happy: 1, traveler_worried: -1, elder_stand: 1, friend_a: 1, friend_b: -1,
  sister_play: -1, newboy_happy: -1, mother_search: -1, baker_busy: -1, dog_happy: -1, dog_thirsty: -1,
  free_lizard: -1, free_hoopoe: -1, free_pigeon: -1, free_hedgehog: -1,
};
/** Figures that are tied to something (a cart, a hug, a basket, kneeling, asleep): they never turn. */
const NO_TURN = /^(elder_cart|donkey_|mother_hug|turtle_|customer_|guard_sweep|ranger_kneel|mama_kneel|cat_sleeping|stranger_rest|dog_drinking|boy_)/;

type Img = Phaser.GameObjects.Image;
/** A figure is a picture, or a container holding one (the scene moves the container). */
type Body = Img | Phaser.GameObjects.Container;
interface Saved { o: Body; face: Img; x: number; y: number; sx: number; sy: number; a: number; fx: boolean }

/** The picture that names a container's figure (its first picture of a person or animal). */
function faceOf(o: Phaser.GameObjects.GameObject): Img | null {
  if (o instanceof Phaser.GameObjects.Image) return o;
  if (o instanceof Phaser.GameObjects.Container) {
    for (const c of o.list) if (c instanceof Phaser.GameObjects.Image && c.visible && c.texture && FIGURE.test(c.texture.key)) return c;
  }
  return null;
}

/** The part of Camera.preRender that builds the matrix, the middle point and the world view. */
function rebuildMatrix(cam: Phaser.Cameras.Scene2D.Camera): void {
  const originX = cam.width * cam.originX, originY = cam.height * cam.originY;
  const midX = cam.scrollX + cam.width * 0.5, midY = cam.scrollY + cam.height * 0.5;
  cam.midPoint.set(midX, midY);
  const dw = Math.floor(cam.width / cam.zoomX + 0.5), dh = Math.floor(cam.height / cam.zoomY + 0.5);
  cam.worldView.setTo(Math.floor(midX - dw / 2 + 0.5), Math.floor(midY - dh / 2 + 0.5), dw, dh);
  const c = cam as unknown as { matrix: Phaser.GameObjects.Components.TransformMatrix; rotation: number };
  c.matrix.applyITRS(Math.floor(cam.x + originX + 0.5), Math.floor(cam.y + originY + 0.5), c.rotation, cam.zoomX, cam.zoomY);
  c.matrix.translate(-originX, -originY);
}

export class Life {
  private phase = new WeakMap<Body, number>();
  private last = new WeakMap<Body, { x: number; y: number; dist: number }>();
  private saved: Saved[] = [];
  private cam = { x: 0, y: 0, zoom: 1, active: false };
  private bgSaved: Array<{ o: Img; x: number; y: number }> = [];
  /** 0 (still) to 1 (moving), eased so stopping and starting are never abrupt. */
  private level = 1;
  private stillWanted = false;
  private attention: { x: number; y: number; at: number } | null = null;
  private squash: { o: Body; at: number } | null = null;
  private held: { o: Body; vx: number; lastX: number; x0: number; y0: number } | null = null;
  private settle: { o: Body; at: number } | null = null;
  private t0 = 0;

  constructor(private scene: Phaser.Scene, private background: () => Img[]) {
    this.t0 = scene.time.now;
    this.level = this.moving() ? 1 : 0;
    scene.events.on(Phaser.Scenes.Events.PRE_RENDER, this.before, this);
    scene.events.on(Phaser.Scenes.Events.RENDER, this.after, this);
    scene.input.on('pointerdown', this.down, this);
    scene.input.on('pointerup', this.up, this);
    scene.input.on('pointerupoutside', this.up, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.events.off(Phaser.Scenes.Events.PRE_RENDER, this.before, this);
      scene.events.off(Phaser.Scenes.Events.RENDER, this.after, this);
    });
  }

  /** Still (a moral choice, a key line, the end of a quiet deed, before the ayah) or alive again. */
  still(on: boolean): void {
    this.stillWanted = on;
    // A scene that opens on a moral choice is still from its first frame.
    if (on && this.scene.time.now - this.t0 < 500) this.level = 0;
  }

  private moving(): boolean {
    if (!layersMove() || this.stillWanted) return false;
    // A key line (any line from the reviewed registry, the father's closing words) holds everything still.
    if (Voice.busy && Voice.lastId && isKeyLine(Voice.lastId)) return false;
    return true;
  }

  // ---------------------------------------------------------------- touch

  private down(p: Phaser.Input.Pointer): void {
    this.attention = { x: p.worldX, y: p.worldY, at: this.scene.time.now };
    // No squash and no pop while everything is still (a choice, a key line, reduced motion).
    if (!this.moving()) return;
    // The topmost thing under the finger (a picture, or a container of pictures).
    const keyOf = (o: Phaser.GameObjects.GameObject): string | null => {
      if (o instanceof Phaser.GameObjects.Image) return o.texture?.key ?? null;
      if (o instanceof Phaser.GameObjects.Container) {
        const f = faceOf(o) ?? o.list.find((c): c is Img => c instanceof Phaser.GameObjects.Image && c.visible);
        return f?.texture?.key ?? null;
      }
      return null;
    };
    const hit = this.scene.children.list
      .filter((o): o is Body => (o instanceof Phaser.GameObjects.Image || o instanceof Phaser.GameObjects.Container) && o.visible && o.alpha > 0.2 && !o.getData('noLife'))
      .filter((o) => { const k = keyOf(o); return !!k && TOUCHABLE.test(k); })
      // Not the big pictures laid over the scene (a plaza, a tree in front): only things his size.
      .filter((o) => { const r = o.getBounds(); return r.width < 300 && r.height < 420 && r.contains(p.worldX, p.worldY); })
      .sort((a, b) => b.depth - a.depth)[0];
    if (!hit) return;
    this.squash = { o: hit, at: this.scene.time.now };
    if (!FIGURE.test(keyOf(hit) ?? '')) this.held = { o: hit, vx: 0, lastX: hit.x, x0: hit.x, y0: hit.y };
    // A soft sound, unless the scene answered the touch with its own.
    const at = performance.now();
    this.scene.time.delayedCall(40, () => { if (lastSfxAt() < at) sfx('pop', { volume: 0.12 }); });
  }

  private up(): void {
    // Something he dragged settles with a little squash where he let it go.
    const h = this.held;
    if (h && Math.hypot(h.o.x - h.x0, h.o.y - h.y0) > 12) this.settle = { o: h.o, at: this.scene.time.now };
    this.held = null;
  }

  // ---------------------------------------------------------------- each frame

  private before(): void {
    const now = this.scene.time.now;
    const target = this.moving() ? 1 : 0;
    this.level += (target - this.level) * 0.08;
    if (Math.abs(this.level - target) < 0.01) this.level = target;
    const lv = this.level;
    const t = (now - this.t0) / 1000;
    this.saved = [];

    // The camera: a slow drift and a very gentle zoom in (never out, so nothing outside the picture shows).
    const cam = this.scene.cameras.main;
    this.cam = { x: cam.scrollX, y: cam.scrollY, zoom: cam.zoom, active: lv > 0 };
    if (lv > 0) {
      const dx = 3 * Math.sin(t / 9) * lv, dy = 2 * Math.sin(t / 11 + 1) * lv;
      cam.scrollX += dx;
      cam.scrollY += dy;
      cam.zoom *= 1 + 0.012 * (0.5 + 0.5 * Math.sin(t / 13)) * lv;
      // The background moves a little less than the figures.
      this.bgSaved = this.background().map((o) => ({ o, x: o.x, y: o.y }));
      for (const b of this.bgSaved) { b.o.x += dx * 0.35; b.o.y += dy * 0.35; }
    }

    for (const child of this.scene.children.list) {
      if (!(child instanceof Phaser.GameObjects.Image || child instanceof Phaser.GameObjects.Container) || !child.visible) continue;
      const obj: Body = child;
      const face = faceOf(child) ?? (child instanceof Phaser.GameObjects.Container ? child.list.find((c): c is Img => c instanceof Phaser.GameObjects.Image) ?? null : null);
      if (!face || !face.texture) continue;
      const key = face.texture.key;
      const fig = FIGURE.test(key);
      const isSquash = this.squash?.o === obj, isHeld = this.held?.o === obj, isSettle = this.settle?.o === obj;
      if (!fig && !isSquash && !isHeld && !isSettle) continue;
      const s: Saved = { o: obj, face, x: obj.x, y: obj.y, sx: obj.scaleX, sy: obj.scaleY, a: obj.angle, fx: face.flipX };
      this.saved.push(s);
      if (fig) this.figure(obj, face, key, t, lv, now);
      if (isSquash && this.squash) {
        const k = (now - this.squash.at) / 220;
        if (k >= 1) this.squash = null;
        else { const e = Math.sin(k * Math.PI) * 0.09 * Math.max(lv, 0.0001); obj.scaleX *= 1 + e; obj.scaleY *= 1 - e; }
      }
      if (isHeld && this.held && lv > 0) {
        // Weight: it leans against the way it is pulled.
        const vx = obj.x - this.held.lastX;
        this.held.vx = this.held.vx * 0.8 + vx * 0.2;
        this.held.lastX = obj.x;
        obj.angle += Phaser.Math.Clamp(-this.held.vx * 1.4, -9, 9) * lv;
      }
      if (isSettle && this.settle) {
        const k = (now - this.settle.at) / 320;
        if (k >= 1) this.settle = null;
        else { const e = Math.sin(k * Math.PI) * (1 - k) * 0.08 * lv; obj.scaleX *= 1 + e; obj.scaleY *= 1 - e; }
      }
    }
  }

  private figure(o: Body, face: Img, key: string, t: number, lv: number, now: number): void {
    let ph = this.phase.get(o);
    if (ph === undefined) { ph = Math.random() * Math.PI * 2; this.phase.set(o, ph); }
    // Movement since the last frame: a figure that moves without its walking pictures steps with a bob.
    const prev = this.last.get(o) ?? { x: o.x, y: o.y, dist: 0 };
    const d = Math.hypot(o.x - prev.x, o.y - prev.y);
    const dist = prev.dist + d;
    this.last.set(o, { x: o.x, y: o.y, dist });
    const movingNow = d > 0.25;
    const tweens = this.scene.tweens.getTweensOf(o === face ? o : [o, face]).filter((tw) => tw.isPlaying());
    const tweened = (prop: string, short = false) => tweens.some((tw) => tw.data.some((x) => (x as { key?: string; duration?: number }).key === prop && (!short || ((x as { duration?: number }).duration ?? 9999) < 500)));
    if (lv <= 0) return;
    if (movingNow && !WALKING.test(key) && !face.getData('walkTimer') && !tweened('y', true)) {
      o.y -= Math.abs(Math.sin(dist / 10)) * 4 * lv;
    }
    // Breathing (unless the scene already breathes it), and a slow shift of weight.
    if (!face.getData('breath') && !tweened('scaleY')) o.scaleY *= 1 + 0.012 * Math.sin(t * 3.3 + ph) * lv;
    if (!movingNow && !tweened('angle')) o.angle += 0.9 * Math.sin(t * 1.2 + ph) * lv;
    // Turning toward what is happening: a touch in the last three and a half seconds.
    const a = this.attention;
    if (!a || now - a.at > 3500 || movingNow || NO_TURN.test(key) || o.parentContainer) return;
    const side = Math.sign(a.x - o.x);
    if (Math.abs(a.x - o.x) < 70 || Math.abs(a.y - o.y) > 420) return;
    const faces = TURNS[key];
    if (faces) {
      // A side-facing figure turns round if the touch is behind it.
      const facing = face.flipX ? -faces : faces;
      if (facing !== side) face.flipX = !face.flipX;
    } else {
      // One facing the viewer leans a little toward it.
      o.angle += side * 2.2 * lv;
    }
  }

  private after(): void {
    for (const s of this.saved) {
      s.o.x = s.x; s.o.y = s.y; s.o.scaleX = s.sx; s.o.scaleY = s.sy; s.o.angle = s.a; s.face.flipX = s.fx;
    }
    this.saved = [];
    const cam = this.scene.cameras.main;
    if (this.cam.active) {
      cam.scrollX = this.cam.x; cam.scrollY = this.cam.y; cam.zoom = this.cam.zoom;
      for (const b of this.bgSaved) { b.o.x = b.x; b.o.y = b.y; }
      // The camera's matrix was built while it drifted: rebuild it from the real
      // scroll and zoom, so a touch maps to the right world point. (Not with
      // cam.preRender(): that empties the list of drawn objects touches are tested on.)
      rebuildMatrix(cam);
    }
    this.bgSaved = [];
  }
}
