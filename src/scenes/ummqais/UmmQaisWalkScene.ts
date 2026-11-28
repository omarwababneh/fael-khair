import Phaser from 'phaser';
import { fitHeight, fitWidth, hasArt } from '../../core/assets';
import { glowRing, HintHand } from '../../core/fx';
import { music } from '../../core/music';
import { sfx } from '../../core/sfx';
import { ui } from '../../core/ui';
import { DESIGN_H, DESIGN_W } from '../../core/viewport';
import { Voice } from '../../core/voice';
import { BaseScene, type FreeTarget } from '../BaseScene';
import { layersMove } from '../layers';

// The Umm Qais walk (version 3 trial; the parents switch «النسخة التجريبية» or
// ?scene=ummqais-walk). The same deed as U1, the thirsty dog (value: mercy to
// animals; source bukhari_2363), in a world about three screens wide that he
// walks through himself: he touches and holds where to go, the boy hop-walks
// there and the camera follows. On the way are small things to discover; each
// reacts when he comes near or touches it. He finds the dog by its empty trough,
// walks on to the well, raises the bucket on a rope with real weight and swing,
// carries the water back, pours it and steps back so the dog can drink. The
// rope, the bucket, the water drops and the loose stones run on the physics
// engine (Matter). Same values as U1: no praise for speed, nothing counted, the
// existing lines and the hadith line only, and no hint unless he is idle for ten
// seconds. U1 itself is unchanged.
//
// Pictures: the land is bg_road_north in two bands cut where the picture's rows
// are all the same color (the road's lower edge), so the sky, the far hills and
// the road can move slower than the ground he walks on without a visible seam. The well and the trough
// are cut out of bg_ummqais_well along their outlines. The rope is the one thing
// drawn in code (a line: no rope picture exists; see the report).

const W = 1300; // the world's width: the camera scrolls 0 .. W - 390
// The seam: the road's lower edge, where every row of the picture is one color.
const PIC = { w: 4096, h: 1365, seam: 1116 };
const FAR = { scale: 0.53, top: -51, parallax: 0.55 };
const NEAR = { top: FAR.top + PIC.seam * FAR.scale };
/** The near band reaches 895, the lowest row a tall phone can show. */
const NEAR_S = (895 - NEAR.top) / (PIC.h - PIC.seam);
// The dog and its trough are at the far end: he never walks up to them.
const LANE = { top: 668, bottom: 712, left: 40, right: 1060 };
const GROUND = 704; // the stones and the set-down bucket rest here
const BOY_H = 130;
const WALK_SPEED = 115, CARRY_SPEED = 78; // points per second
const IDLE_HINT_MS = 10000;

const GROVE = { x: 190, y: 652, w: 250 };
const HOOPOE = { x: 298, y: 643, h: 38 };
const IRIS = { x: 385, y: 718, h: 74 };
const BUTTERFLY = { x: 400, y: 652, h: 30 };
const WELL = { x: 640, y: 660, w: 200 };
const PULL_SPOT = { x: 534, y: 692 };
/** The rope handle at his hands, and how far down he pulls it. */
const HANDLE = { x: PULL_SPOT.x + 16, top: PULL_SPOT.y - 76, bottom: PULL_SPOT.y - 6 };
const SHEPHERD = { x: 870, y: 650, h: 120, from: 820, to: 960 };
const HEDGEHOG = { x: 925, y: 712, h: 30 };
const TROUGH = { x: 1085, y: 662, w: 150 };
const DOG = { x: 1215, y: 656, h: 88, drinkX: 1160 };
const STONES = [{ x: 262, r: 11, key: 'rock_a' }, { x: 455, r: 13, key: 'rock_c' }, { x: 985, r: 10, key: 'rock_d' }];

// The well and trough cut-outs: source boxes in bg_ummqais_well pixels and their outlines.
type Shape = { rect: [number, number, number, number] } | { ell: [number, number, number, number] } | { poly: Array<[number, number]> };
const WELL_CUT = {
  box: [480, 770, 420, 480] as [number, number, number, number],
  shapes: [
    { rect: [514, 781, 43, 419] }, { rect: [818, 781, 44, 419] }, { rect: [497, 803, 381, 39] },
    { ell: [522, 948, 336, 114] }, { rect: [522, 1000, 336, 200] }, { ell: [524, 1158, 332, 70] }, { rect: [652, 922, 90, 78] },
  ] as Shape[],
  pulley: { x: 687, y: 822 }, mouthY: 1023,
};
const TROUGH_CUT = {
  box: [20, 1020, 450, 245] as [number, number, number, number],
  shapes: [{ poly: [[36, 1126], [318, 1038], [400, 1040], [452, 1072], [452, 1168], [170, 1244], [112, 1247], [38, 1222]] }] as Shape[],
  water: { x: 338, y: 1062, w: 178 },
};

type State = 'find' | 'toWell' | 'pull' | 'take' | 'carry' | 'pour' | 'stepback' | 'drink' | 'done';
type MBody = MatterJS.BodyType;

interface Discovery extends FreeTarget {
  x: number;
  near: number;
  wasNear: boolean;
  until: number;
}

export class UmmQaisWalkScene extends BaseScene {
  private state: State = 'find';
  private camX = 0;
  private far!: Phaser.GameObjects.Image;
  private clouds: Array<{ img: Phaser.GameObjects.Image; x0: number }> = [];
  private boy!: Phaser.GameObjects.Image;
  private foot = new Phaser.Math.Vector2(90, 692);
  private target: Phaser.Math.Vector2 | null = null;
  private holding = -1;
  private dir: 1 | -1 = 1;
  private stepDist = 0;
  private frameA = true;
  private walking = false;
  private dog!: Phaser.GameObjects.Image;
  private dogPant: Phaser.Tweens.Tween | null = null;
  private trough!: Phaser.GameObjects.Image;
  private troughWater!: Phaser.GameObjects.Image;
  private fill = 0;
  private well!: Phaser.GameObjects.Image;
  private pulley = new Phaser.Math.Vector2();
  private mouthY = 0;
  private rope!: Phaser.GameObjects.Graphics;
  private bucket!: Phaser.GameObjects.Image;
  private bucketBody!: MBody;
  private hang!: MatterJS.ConstraintType;
  private ropeLen = 200;
  private level = 1; // water in the bucket
  private spillSaid = false;
  private hintSaid = false;
  private handle!: Phaser.GameObjects.Image;
  private pulling = -1;
  private lastPullY = 0;
  private lastPullT = 0;
  private swingSide = 1;
  private tiltId = -1;
  private tiltStartY = 0;
  private tilt = 0;
  private drops: Array<{ body: MBody; img: Phaser.GameObjects.Image; floor: number; trough: boolean }> = [];
  private stones: Array<{ body: MBody; img: Phaser.GameObjects.Image; r: number }> = [];
  private discoveries: Discovery[] = [];
  private shepherd!: Phaser.GameObjects.Image;
  private shepherdDir: 1 | -1 = 1;
  private shepherdStopUntil = 0;
  private hint!: HintHand;
  private found = false;
  private nextDropAt = 0;
  private pourSfxAt = 0;
  /** How full the bucket was when he began to pour. */
  private pourLevel = 1;
  /** He tapped the bucket from afar: he takes it when he is back at the well. */
  private takeWhenThere = false;
  private maskShape: Phaser.GameObjects.Graphics | null = null;
  private cloudDrift = 0;

  constructor() {
    super({ key: 'ummqais-walk', physics: { default: 'matter', matter: { gravity: { x: 0, y: 1 }, enableSleeping: false } } });
  }

  create(): void {
    this.far = undefined as unknown as Phaser.GameObjects.Image;
    this.setup();
    this.state = 'find';
    this.camX = 0;
    this.foot.set(90, 692);
    this.target = null;
    this.holding = -1;
    this.dir = 1;
    this.walking = false;
    this.fill = 0;
    this.ropeLen = 200;
    this.level = 1;
    this.spillSaid = false;
    this.hintSaid = false;
    this.pulling = -1;
    this.tiltId = -1;
    this.tilt = 0;
    this.drops = [];
    this.stones = [];
    this.discoveries = [];
    this.clouds = [];
    this.found = false;
    this.nextDropAt = 0;
    this.pourSfxAt = 0;
    this.takeWhenThere = false;
    this.maskShape = null;
    this.cloudDrift = 0;
    this.hint = new HintHand(this);

    ui.setPill('أُمّ قَيْس');
    ui.setHome(() => this.goTo('map'));
    ui.clearBubble();
    music.play('ummqais');

    this.buildLand();
    this.buildPlaces();
    this.buildPhysics();

    this.boy = this.add.image(this.foot.x, this.foot.y, 'boy_idle').setOrigin(0.5, 1);
    fitHeight(this.boy, BOY_H);

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.onDown(p));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.onMove(p));
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => this.onUp(p));
    this.input.on('pointerupoutside', (p: Phaser.Input.Pointer) => this.onUp(p));
    this.time.addEvent({ delay: 7000, loop: true, callback: () => Math.random() < 0.7 && sfx('birds', { volume: 0.4 }) });

    // No words and no hint at first: he looks around. Only after ten idle seconds.
    this.setIdle(() => this.showHint(), IDLE_HINT_MS, false);
    this.placeCamera();
  }

  // ------------------------------------------------------------ the world

  private buildLand(): void {
    // Far band: sky, far hills and terraces (rows above the road's top edge), slower.
    this.far = this.add.image(-120, FAR.top, 'bg_road_north').setOrigin(0, 0).setScale(FAR.scale).setDepth(0);
    this.far.setCrop(0, 0, PIC.w, PIC.seam);
    // Near band: the road and our side of it, where he walks.
    const near = this.add.image(-120, NEAR.top - PIC.seam * NEAR_S, 'bg_road_north').setOrigin(0, 0).setScale(NEAR_S).setDepth(1);
    near.setCrop(0, PIC.seam, PIC.w, PIC.h - PIC.seam);
    // Clouds drift slowest of all.
    const kinds = ['layer_cloud_large', 'layer_cloud_small', 'layer_cloud_wisp', 'layer_cloud_small', 'layer_cloud_large'];
    kinds.forEach((k, i) => {
      if (!hasArt(this, k)) return;
      const img = this.add.image(0, 22 + (i % 3) * 26, k).setDepth(0.5).setAlpha(0.9);
      fitWidth(img, k === 'layer_cloud_large' ? 150 : 90);
      this.clouds.push({ img, x0: -60 + i * 200 });
    });
  }

  /** A picture cut out of a background along its outline (existing art only). */
  private cutout(key: string, src: string, box: [number, number, number, number], shapes: Shape[]): void {
    if (this.textures.exists(key)) return;
    const source = this.textures.get(src).getSourceImage() as HTMLImageElement | HTMLCanvasElement;
    const tex = this.textures.createCanvas(key, box[2], box[3]);
    if (!tex) return;
    const ctx = tex.getContext();
    ctx.drawImage(source, -box[0], -box[1]);
    ctx.globalCompositeOperation = 'destination-in';
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    for (const s of shapes) {
      if ('rect' in s) ctx.rect(s.rect[0] - box[0], s.rect[1] - box[1], s.rect[2], s.rect[3]);
      else if ('ell' in s) {
        const [x, y, w, h] = s.ell;
        ctx.moveTo(x - box[0] + w, y - box[1] + h / 2);
        ctx.ellipse(x - box[0] + w / 2, y - box[1] + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
      } else {
        s.poly.forEach(([x, y], i) => (i ? ctx.lineTo(x - box[0], y - box[1]) : ctx.moveTo(x - box[0], y - box[1])));
        ctx.closePath();
      }
    }
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    tex.refresh();
  }

  private buildPlaces(): void {
    this.cutout('walk_well', 'bg_ummqais_well', WELL_CUT.box, WELL_CUT.shapes);
    this.cutout('walk_trough', 'bg_ummqais_well', TROUGH_CUT.box, TROUGH_CUT.shapes);

    // The well at the far end.
    this.well = this.add.image(WELL.x, WELL.y, 'walk_well').setOrigin(0.5, 1).setDepth(WELL.y).setData('noLife', true);
    const ws = fitWidth(this.well, WELL.w);
    const wellLeft = WELL.x - WELL.w / 2, wellTop = WELL.y - WELL_CUT.box[3] * ws;
    this.pulley.set(wellLeft + (WELL_CUT.pulley.x - WELL_CUT.box[0]) * ws, wellTop + (WELL_CUT.pulley.y - WELL_CUT.box[1]) * ws);
    this.mouthY = wellTop + (WELL_CUT.mouthY - WELL_CUT.box[1]) * ws;

    // The trough, empty, and its water (invisible until he pours).
    this.trough = this.add.image(TROUGH.x, TROUGH.y, 'walk_trough').setOrigin(0.5, 1).setDepth(TROUGH.y).setData('noLife', true);
    const ts = fitWidth(this.trough, TROUGH.w);
    const tLeft = TROUGH.x - TROUGH.w / 2, tTop = TROUGH.y - TROUGH_CUT.box[3] * ts;
    this.troughWater = this.add.image(tLeft + (TROUGH_CUT.water.x - TROUGH_CUT.box[0]) * ts, tTop + (TROUGH_CUT.water.y - TROUGH_CUT.box[1]) * ts + 4, 'trough_water').setDepth(TROUGH.y + 0.5).setAlpha(0);
    fitWidth(this.troughWater, TROUGH_CUT.water.w * ts);
    this.troughWater.setData('sy', this.troughWater.scaleY);

    // The thirsty dog waits beside the empty trough, facing it.
    this.dog = this.add.image(DOG.x, DOG.y, 'dog_thirsty').setOrigin(0.5, 1).setDepth(DOG.y);
    fitHeight(this.dog, DOG.h);
    this.dogPant = this.tweens.add({ targets: this.dog, scaleY: this.dog.scaleY * 1.03, duration: 320, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // Things to discover on the way.
    const grove = this.add.image(GROVE.x, GROVE.y, 'sight_olive_grove').setOrigin(0.5, 1).setDepth(GROVE.y).setData('noLife', true);
    fitWidth(grove, GROVE.w);
    this.discover(grove, GROVE.x, 150, () => this.sway(grove, 1.2, 'rustle'));

    const hoopoe = this.add.image(HOOPOE.x, HOOPOE.y, 'free_hoopoe').setOrigin(0.5, 1).setDepth(HOOPOE.y + 1);
    fitHeight(hoopoe, HOOPOE.h);
    this.discover(hoopoe, HOOPOE.x, 110, () => this.hop(hoopoe, HOOPOE.y, 'birds'));

    const iris = this.add.image(IRIS.x, IRIS.y, 'sight_black_iris').setOrigin(0.5, 1).setDepth(IRIS.y);
    fitHeight(iris, IRIS.h);
    this.discover(iris, IRIS.x, 90, () => this.sway(iris, 4, 'rustle'));

    const fly = this.add.image(BUTTERFLY.x, BUTTERFLY.y, 'free_butterfly_open').setOrigin(0.5, 1).setDepth(IRIS.y + 1);
    fitHeight(fly, BUTTERFLY.h);
    this.discover(fly, BUTTERFLY.x, 100, () => this.flutter(fly));

    this.shepherd = this.add.image(SHEPHERD.x, SHEPHERD.y, 'sight_goats_shepherd').setOrigin(0.5, 1).setDepth(SHEPHERD.y);
    fitHeight(this.shepherd, SHEPHERD.h);
    this.discover(this.shepherd, SHEPHERD.x, 130, () => this.greet());

    const hog = this.add.image(HEDGEHOG.x, HEDGEHOG.y, 'free_hedgehog').setOrigin(0.5, 1).setDepth(HEDGEHOG.y);
    fitHeight(hog, HEDGEHOG.h);
    this.discover(hog, HEDGEHOG.x, 90, () => this.curl(hog));

    // The rope (line) and the handle he pulls (a glow ring: interface chrome).
    this.rope = this.add.graphics().setDepth(WELL.y + 2);
    this.handle = glowRing(this, HANDLE.x, HANDLE.top, 30, 720).setVisible(false);
  }

  private discover(obj: Phaser.GameObjects.Image, x: number, near: number, react: () => number): void {
    this.discoveries.push({ obj, x, near, react, wasNear: false, until: 0 });
  }

  private buildPhysics(): void {
    const M = this.matter;
    M.add.rectangle(W / 2, GROUND + 20, W + 600, 40, { isStatic: true, friction: 0.9 });
    // The loose stones: light limestone (the rock pictures, their red taken out).
    for (const s of STONES) {
      const body = M.add.circle(s.x, GROUND - s.r, s.r, { friction: 0.6, frictionAir: 0.02, restitution: 0.25, density: 0.003 });
      const img = this.add.image(s.x, GROUND - s.r, s.key).setDepth(GROUND - 1).setData('noLife', true);
      fitWidth(img, s.r * 2.3);
      const cm = img.preFX?.addColorMatrix();
      cm?.saturate(-0.85);
      cm?.brightness(1.25, true);
      this.stones.push({ body, img, r: s.r });
    }
    // The bucket hangs on its rope down the well.
    const bw = 34, bh = 48;
    this.bucketBody = M.add.rectangle(this.pulley.x, this.pulley.y + this.ropeLen + bh / 2, bw, bh, { frictionAir: 0.025, density: 0.004, friction: 0.7, restitution: 0.1 });
    this.bucketBody.collisionFilter.mask = 0;
    this.hang = M.add.worldConstraint(this.bucketBody, this.ropeLen, 0.35, { pointA: { x: this.pulley.x, y: this.pulley.y }, pointB: { x: 0, y: -bh / 2 }, damping: 0.03 });
    this.bucket = this.add.image(this.pulley.x, this.pulley.y + this.ropeLen, 'bucket_full').setDepth(WELL.y + 1).setData('noLife', true);
    fitHeight(this.bucket, bh + 4);
    this.maskBucket(true);
  }

  private maskBucket(on: boolean): void {
    this.bucket.clearMask(true);
    this.maskShape?.destroy();
    this.maskShape = null;
    if (!on) return;
    const g = this.make.graphics({}, false);
    this.maskShape = g;
    g.fillStyle(0xffffff);
    g.fillRect(-1000, -1000, W + 2000, 1000 + this.mouthY);
    this.bucket.setMask(g.createGeometryMask());
  }

  // ------------------------------------------------------------ camera

  protected fit(): void {
    super.fit();
    this.placeCamera();
  }

  private placeCamera(): void {
    if (!this.far) return;
    this.cameras.main.centerOn(DESIGN_W / 2 + this.camX, DESIGN_H / 2);
    // The far land moves slower than the ground; the clouds slowest.
    this.far.x = -120 + this.camX * (1 - FAR.parallax);
    // Each cloud wraps round off screen (a span of 1000 points), so none ever jumps in view.
    for (const c of this.clouds) c.img.x = Phaser.Math.Wrap(c.x0 + this.cloudDrift, -200, 800) + this.camX * 0.8;
  }

  // ------------------------------------------------------------ touch

  private onDown(p: Phaser.Input.Pointer): void {
    if (!this.alive) return;
    this.hint.clear();
    this.kickIdle();
    const x = p.worldX, y = p.worldY;
    // The rope handle.
    if (this.state === 'pull' && this.handle.visible && Phaser.Math.Distance.Between(x, y, this.handle.x, this.handle.y) < 46) {
      this.pulling = p.id;
      this.lastPullY = y;
      this.lastPullT = performance.now();
      sfx('grab', { volume: 0.5 });
      return;
    }
    // The bucket at the top of the well: he takes it (from beside the well; from
    // farther away the boy first walks back to it). A touch area of at least 56 points.
    if (this.state === 'take' && this.bucketArea().contains(x, y)) {
      if (Math.abs(this.foot.x - PULL_SPOT.x) < 70) this.takeBucket();
      else {
        this.takeWhenThere = true;
        this.target = new Phaser.Math.Vector2(PULL_SPOT.x, PULL_SPOT.y);
      }
      return;
    }
    // Tilting the bucket over the trough.
    if (this.state === 'pour' && Phaser.Geom.Rectangle.Inflate(this.bucket.getBounds(), 24, 24).contains(x, y)) {
      this.tiltId = p.id;
      this.tiltStartY = y - this.tilt / 0.9;
      return;
    }
    // A loose stone: a little flick.
    for (const s of this.stones) {
      if (Phaser.Math.Distance.Between(x, y, s.img.x, s.img.y) < Math.max(28, s.r + 14)) {
        const M = { Body: this.matter.body };
        M.Body.setVelocity(s.body, { x: (s.img.x < this.foot.x ? -1 : 1) * 2.2, y: -3.2 });
        M.Body.setAngularVelocity(s.body, 0.12);
        sfx('slide', { volume: 0.25 });
      }
    }
    // Things to discover react to a touch (in free time the scene's own free-time touch does it).
    if (!this.inFreeTime) {
      for (const d of this.discoveries) {
        if (Phaser.Geom.Rectangle.Inflate(d.obj.getBounds(), 10, 10).contains(x, y)) this.react(d);
      }
      if (this.dog.getBounds().contains(x, y) && this.state === 'find') this.findDog();
    }
    // Anywhere else: walk there, for as long as he holds. (While he pulls, a touch
    // that just misses the handle does not walk him away from the well.)
    if (this.state === 'pull' && Math.abs(x - PULL_SPOT.x) < 80) return;
    if (this.canWalk()) {
      this.takeWhenThere = false;
      this.holding = p.id;
      this.setTarget(x, y);
    }
  }

  private onMove(p: Phaser.Input.Pointer): void {
    if (!this.alive || !p.isDown) return;
    if (p.id === this.pulling) this.pull(p);
    else if (p.id === this.tiltId) this.tiltBucket(p.worldY);
    else if (p.id === this.holding && this.canWalk()) this.setTarget(p.worldX, p.worldY);
  }

  private onUp(p: Phaser.Input.Pointer): void {
    if (p.id === this.pulling) {
      this.pulling = -1;
      this.tweens.add({ targets: this.handle, y: HANDLE.top, duration: 300, ease: 'Sine.easeOut' });
    }
    if (p.id === this.tiltId) this.tiltId = -1;
    if (p.id === this.holding) this.holding = -1;
  }

  private canWalk(): boolean {
    return this.inFreeTime || (this.state !== 'pour' && this.state !== 'done');
  }

  private setTarget(x: number, y: number): void {
    let tx = Phaser.Math.Clamp(x, LANE.left, LANE.right);
    // He never goes right up to the dog: he passes in front of it, and keeps back while it drinks.
    if (this.state === 'stepback' || this.state === 'drink') tx = Math.min(tx, TROUGH.x - 150);
    const ty = Phaser.Math.Clamp(y, LANE.top, LANE.bottom);
    this.target = new Phaser.Math.Vector2(tx, ty);
  }

  // ------------------------------------------------------------ each frame

  update(_t: number, dtMs: number): void {
    if (!this.alive) return;
    const dt = Math.min(dtMs, 50) / 1000;
    // The clouds drift only when the background may move.
    if (layersMove()) this.cloudDrift += dt * 3;
    this.walk(dt);
    // Water runs for as long as the bucket is tipped far enough.
    if (this.state === 'pour' && this.tilt > 38 && this.fill < 1) this.pourDrops();
    this.followCamera(dt);
    this.syncPhysics();
    this.drawRope();
    this.nearThings();
    this.stroll(dt);
  }

  private walk(dt: number): void {
    const t = this.target;
    const carrying = this.state === 'carry';
    if (t) {
      const dx = t.x - this.foot.x, dy = t.y - this.foot.y;
      const d = Math.hypot(dx, dy);
      const step = (carrying ? CARRY_SPEED : WALK_SPEED) * dt;
      if (d <= step || d < 1.5) {
        this.foot.set(t.x, t.y);
        if (this.holding < 0) this.target = null;
      } else {
        this.foot.x += (dx / d) * step;
        this.foot.y += (dy / d) * step;
        if (Math.abs(dx) > 2) this.dir = dx > 0 ? 1 : -1;
        this.stepDist += step;
      }
    }
    const moving = !!t && Math.hypot(t.x - this.foot.x, t.y - this.foot.y) > 1.5;
    if (moving !== this.walking) {
      this.walking = moving;
      this.boy.setData('walkTimer', moving || undefined);
      if (!moving) this.standPose();
    }
    let bob = 0;
    if (moving) {
      // A hop-walk: the two walking pictures and a small bob on every step.
      const phase = this.stepDist / 26;
      const a = Math.floor(phase) % 2 === 0;
      if (a !== this.frameA) {
        this.frameA = a;
        sfx('step', { volume: 0.3 });
      }
      this.boy.setTexture(a ? 'boy_walk_a' : 'boy_walk_b').setFlipX(this.dir < 0);
      fitHeight(this.boy, BOY_H);
      bob = Math.abs(Math.sin(phase * Math.PI)) * (carrying ? 3 : 6) * (layersMove() ? 1 : 0.5);
    }
    this.boy.setPosition(this.foot.x, this.foot.y - bob).setDepth(this.foot.y);
    // Pushing a loose stone with his feet.
    if (moving) {
      const M = { Body: this.matter.body };
      for (const s of this.stones) {
        if (Math.abs(this.foot.y - GROUND) < 16 && Math.abs(s.body.position.x - this.foot.x) < s.r + 12) {
          M.Body.setVelocity(s.body, { x: this.dir * 1.8, y: s.body.velocity.y });
          M.Body.setAngularVelocity(s.body, this.dir * 0.15);
        }
      }
    }
    // Arriving at the well with nothing in his hands: he takes the rope.
    // (Only once he has found the dog: the father says first that it is thirsty.)
    if (!moving && this.state === 'toWell' && Math.abs(this.foot.x - PULL_SPOT.x) < 60) this.atWell();
    if (this.state === 'pull' && Math.abs(this.foot.x - PULL_SPOT.x) > 60) this.leaveWell();
    if (!moving && this.state === 'take' && this.takeWhenThere && Math.abs(this.foot.x - PULL_SPOT.x) < 12) this.takeBucket();
    if (this.state === 'carry' && this.foot.x > TROUGH.x - 170 && this.foot.x < TROUGH.x - 60) this.startPour();
    if (this.state === 'stepback' && this.foot.x < TROUGH.x - 175) void this.dogDrinks();
  }

  private standPose(): void {
    if (this.state === 'pull') return;
    this.boy.setTexture('boy_idle').setFlipX(false);
    fitHeight(this.boy, BOY_H);
  }

  private followCamera(dt: number): void {
    const want = Phaser.Math.Clamp(this.foot.x - DESIGN_W / 2, 0, W - DESIGN_W);
    this.camX += (want - this.camX) * (1 - Math.exp(-dt * 3));
    this.placeCamera();
  }

  private syncPhysics(): void {
    const b = this.bucketBody;
    // Carried, the bucket hangs from his hand.
    if (this.state === 'carry') {
      this.hang.pointA.x = this.foot.x + this.dir * 12;
      this.hang.pointA.y = this.boy.y - BOY_H * 0.46;
      // A big swing sloshes some water out (no more than half the bucket).
      if (Math.abs(b.angle) > 0.75 && Math.abs(b.angularVelocity) > 0.05 && this.level > 0.6 && Math.random() < 0.2) this.spill(1);
    }
    this.bucket.setPosition(b.position.x, b.position.y + 2).setRotation(b.angle);
    if (this.state === 'carry') this.bucket.setDepth(this.foot.y + 1);
    for (const s of this.stones) s.img.setPosition(s.body.position.x, s.body.position.y).setRotation(s.body.angle);
    // Water drops: into the trough, or onto the ground with a tiny splash.
    for (const d of [...this.drops]) {
      d.img.setPosition(d.body.position.x, d.body.position.y);
      const inTrough = d.trough && d.body.position.y >= this.troughWater.y && d.body.position.x > TROUGH.x - 55 && d.body.position.x < TROUGH.x + 68;
      if (inTrough || d.body.position.y >= d.floor) {
        if (inTrough) this.fillTrough();
        this.matter.world.remove(d.body);
        d.img.destroy();
        this.drops = this.drops.filter((x) => x !== d);
      }
    }
  }

  private drawRope(): void {
    const g = this.rope;
    g.clear();
    // The rope hangs from the pulley until he takes the bucket, then from his hand; once poured, it is gone.
    if (this.state === 'pour' || this.state === 'stepback' || this.state === 'drink' || this.state === 'done') return;
    const b = this.bucketBody;
    const top = new Phaser.Math.Vector2(0, -24).rotate(b.angle).add(new Phaser.Math.Vector2(b.position.x, b.position.y));
    const from = new Phaser.Math.Vector2(this.hang.pointA.x, this.hang.pointA.y);
    const seg: Array<[Phaser.Math.Vector2, Phaser.Math.Vector2]> = [];
    if (this.state === 'carry') {
      seg.push([from, top]);
    } else {
      // Down the well: seen only above its mouth.
      const end = top.y > this.mouthY ? new Phaser.Math.Vector2(top.x, this.mouthY) : top;
      seg.push([from, end]);
      // From the pulley to his hands while he pulls (the rope in the boy_pull picture ends at its top).
      if (this.state === 'pull') {
        const w = this.boy.displayWidth;
        seg.push([from, new Phaser.Math.Vector2(this.boy.x + w * 0.42, this.boy.y - BOY_H * 0.99)]);
      }
    }
    for (const [a, c] of seg) {
      g.lineStyle(3.4, 0x5b3a1a, 1).lineBetween(a.x, a.y, c.x, c.y);
      g.lineStyle(1.8, 0xc18d4c, 1).lineBetween(a.x, a.y, c.x, c.y);
    }
  }

  private nearThings(): void {
    for (const d of this.discoveries) {
      const near = Math.abs(this.foot.x - d.x) < d.near;
      if (near && !d.wasNear && !this.inFreeTime) this.react(d);
      d.wasNear = near;
    }
    if (this.state === 'find' && this.foot.x > TROUGH.x - 140) this.findDog();
  }

  private react(d: Discovery): void {
    if (this.time.now < d.until) return;
    d.until = this.time.now + d.react();
  }

  /** The shepherd and his goats stroll to and fro, with a step's bob; nobody slides. */
  private stroll(dt: number): void {
    const s = this.shepherd;
    if (this.time.now < this.shepherdStopUntil) return;
    const d = this.discoveries.find((x) => x.obj === s);
    s.x += this.shepherdDir * 14 * dt;
    if (s.x > SHEPHERD.to) this.shepherdDir = -1;
    if (s.x < SHEPHERD.from) this.shepherdDir = 1;
    s.setFlipX(this.shepherdDir < 0);
    s.y = SHEPHERD.y - Math.abs(Math.sin(s.x / 7)) * 2.5;
    if (d) d.x = s.x;
  }

  // ------------------------------------------------------------ discoveries' reactions

  private sway(img: Phaser.GameObjects.Image, deg: number, sound: 'rustle' | 'birds'): number {
    const a = img.angle;
    this.tweens.add({ targets: img, angle: { from: a - deg, to: a + deg }, duration: 380, yoyo: true, repeat: 1, ease: 'Sine.easeInOut', onComplete: () => { img.angle = a; } });
    sfx(sound, { volume: 0.2 });
    return 1700;
  }

  private hop(img: Phaser.GameObjects.Image, y0: number, sound: 'birds'): number {
    this.tweens.chain({ targets: img, tweens: [
      { y: y0 - 12, duration: 160, ease: 'Quad.easeOut' }, { y: y0, duration: 160, ease: 'Quad.easeIn' },
      { y: y0 - 8, duration: 140, ease: 'Quad.easeOut' }, { y: y0, duration: 140, ease: 'Quad.easeIn' },
    ] });
    sfx(sound, { volume: 0.22 });
    return 1400;
  }

  private flutter(img: Phaser.GameObjects.Image): number {
    let n = 0;
    const beat = this.time.addEvent({ delay: 110, repeat: 11, callback: () => { n++; img.setTexture(n % 2 ? 'free_butterfly_closed' : 'free_butterfly_open'); fitHeight(img, BUTTERFLY.h); } });
    this.tweens.add({ targets: img, y: BUTTERFLY.y - 34, x: BUTTERFLY.x + 14, duration: 650, yoyo: true, ease: 'Sine.easeInOut', onComplete: () => { beat.remove(); img.setTexture('free_butterfly_open'); fitHeight(img, BUTTERFLY.h); img.setPosition(BUTTERFLY.x, BUTTERFLY.y); } });
    sfx('rustle', { volume: 0.12 });
    return 1600;
  }

  private greet(): number {
    // The shepherd stops and turns toward the boy; the goats look up.
    this.shepherdStopUntil = this.time.now + 2600;
    this.shepherd.setFlipX(this.foot.x < this.shepherd.x);
    const sy = this.shepherd.scaleY;
    this.tweens.add({ targets: this.shepherd, scaleY: sy * 1.03, duration: 220, yoyo: true, ease: 'Sine.easeInOut', onComplete: () => { this.shepherd.scaleY = sy; } });
    sfx('step', { volume: 0.25 });
    return 3000;
  }

  private curl(img: Phaser.GameObjects.Image): number {
    const sx = img.scaleX, sy = img.scaleY;
    this.tweens.add({ targets: img, scaleY: sy * 0.8, scaleX: sx * 1.06, duration: 260, yoyo: true, hold: 900, ease: 'Sine.easeInOut', onComplete: () => img.setScale(sx, sy) });
    sfx('rustle', { volume: 0.15 });
    return 1800;
  }

  // ------------------------------------------------------------ the deed

  private findDog(): void {
    if (this.found) return;
    this.found = true;
    this.state = 'toWell';
    void Voice.say('uq_open').then((ended) => { if (ended && this.alive && !Voice.busy) void Voice.say('bismillah'); });
    this.kickIdle();
  }

  private atWell(): void {
    this.state = 'pull';
    this.target = null;
    this.foot.set(PULL_SPOT.x, PULL_SPOT.y);
    // He stands back from the well and pulls the rope; he never leans over it.
    this.boy.setTexture('boy_pull').setFlipX(true).setPosition(this.foot.x, this.foot.y);
    fitHeight(this.boy, BOY_H);
    this.handle.setVisible(true).setPosition(HANDLE.x, HANDLE.top);
    this.kickIdle();
  }

  private leaveWell(): void {
    this.state = 'toWell';
    this.handle.setVisible(false);
    this.pulling = -1;
    if (!this.walking) this.standPose();
  }

  private bucketArea(): Phaser.Geom.Rectangle {
    const r = this.bucket.getBounds();
    return new Phaser.Geom.Rectangle(r.centerX - Math.max(r.width, 56) / 2, r.centerY - Math.max(r.height, 56) / 2, Math.max(r.width, 56), Math.max(r.height, 56));
  }

  private pull(p: Phaser.Input.Pointer): void {
    const dy = p.worldY - this.lastPullY;
    const now = performance.now();
    const speed = dy / Math.max(1, now - this.lastPullT) * 1000;
    this.lastPullY = p.worldY;
    this.lastPullT = now;
    this.handle.y = Phaser.Math.Clamp(this.handle.y + dy, HANDLE.top, HANDLE.bottom);
    if (dy <= 0 || this.handle.y >= HANDLE.bottom) return;
    // The rope shortens; the bucket's weight makes it bounce and swing on it.
    this.ropeLen = Math.max(12, this.ropeLen - dy * 0.6);
    this.hang.length = this.ropeLen;
    const M = { Body: this.matter.body };
    if (Math.random() < 0.25) {
      this.swingSide = -this.swingSide as 1 | -1;
      M.Body.applyForce(this.bucketBody, this.bucketBody.position, { x: this.swingSide * 0.0012, y: 0 });
    }
    if (Math.random() < 0.2) sfx('rope', { volume: 0.5 });
    this.boy.y = this.foot.y + 2;
    this.time.delayedCall(90, () => this.state === 'pull' && (this.boy.y = this.foot.y));
    // Pulling too fast sloshes some water out (it never empties).
    if (speed > 680 && this.level > 0.55) {
      this.spill(3);
      if (!this.spillSaid) {
        this.spillSaid = true;
        void Voice.say('uq_spill');
      }
    }
    if (this.ropeLen <= 12) this.bucketUp();
  }

  private spill(n: number): void {
    const b = this.bucketBody;
    const M = this.matter;
    const visible = b.position.y - 24 < this.mouthY || this.state === 'carry';
    this.level = Math.max(0.5, this.level - 0.03 * n);
    if (!visible) { sfx('splash', { volume: 0.25 }); return; }
    for (let i = 0; i < n; i++) {
      const x = b.position.x + Phaser.Math.Between(-12, 12), y = b.position.y - 20;
      const body = M.add.circle(x, y, 2.5, { frictionAir: 0.01, collisionFilter: { group: -1, category: 2, mask: 0 } });
      this.matter.body.setVelocity(body, { x: b.velocity.x + Phaser.Math.FloatBetween(-1, 1), y: -1.5 });
      const img = this.add.image(x, y, 'fx_dot').setTint(0x8fd3f0).setScale(0.35).setDepth(this.foot.y + 2);
      this.drops.push({ body, img, floor: this.state === 'carry' ? this.foot.y : this.mouthY + 4, trough: false });
    }
    if (this.state === 'carry' && !this.spillSaid) {
      this.spillSaid = true;
      void Voice.say('uq_spill');
    }
  }

  private bucketUp(): void {
    this.state = 'take';
    this.pulling = -1;
    this.handle.setVisible(false);
    this.maskBucket(false);
    sfx('chime', { volume: 0.45 });
    void Voice.say('uq_pour');
    this.kickIdle();
  }

  private takeBucket(): void {
    // He takes the bucket off the hook: now it hangs from his hand, and swings as he walks.
    this.state = 'carry';
    this.takeWhenThere = false;
    this.target = null;
    this.boy.setTexture('boy_idle').setFlipX(false);
    fitHeight(this.boy, BOY_H);
    this.hang.length = 2;
    this.hang.stiffness = 0.8;
    this.hang.damping = 0.08;
    this.hang.pointA.x = this.foot.x + this.dir * 12;
    this.hang.pointA.y = this.foot.y - BOY_H * 0.46;
    // It starts in his hand, still: no jump from the hook.
    const M = { Body: this.matter.body };
    M.Body.setPosition(this.bucketBody, { x: this.hang.pointA.x, y: this.hang.pointA.y + 26 });
    M.Body.setVelocity(this.bucketBody, { x: 0, y: 0 });
    M.Body.setAngularVelocity(this.bucketBody, 0);
    this.bucketBody.frictionAir = 0.05;
    sfx('grab', { volume: 0.6 });
    this.kickIdle();
  }

  private startPour(): void {
    this.state = 'pour';
    this.pourLevel = this.level;
    this.target = null;
    this.holding = -1;
    this.walking = false;
    this.boy.setData('walkTimer', undefined);
    // He sets the bucket on the trough's rim and tips it.
    this.matter.world.removeConstraint(this.hang);
    const M = { Body: this.matter.body };
    M.Body.setStatic(this.bucketBody, true);
    // He steps up to the trough's end and lifts the bucket over its rim.
    this.foot.set(TROUGH.x - 92, LANE.top);
    this.boy.setTexture('boy_offer').setFlipX(false).setPosition(this.foot.x, this.foot.y).setDepth(this.foot.y);
    fitHeight(this.boy, BOY_H);
    const spot = { x: this.foot.x + 34, y: this.troughWater.y - 4 };
    this.tweens.addCounter({
      from: 0, to: 1, duration: 320, ease: 'Quad.easeOut',
      onUpdate: (tw) => {
        const k = tw.getValue() ?? 0;
        M.Body.setPosition(this.bucketBody, { x: Phaser.Math.Linear(this.bucketBody.position.x, spot.x, k), y: Phaser.Math.Linear(this.bucketBody.position.y, spot.y, k) });
        M.Body.setAngle(this.bucketBody, Phaser.Math.Linear(this.bucketBody.angle, 0, k));
      },
      onComplete: () => sfx('thud', { weight: 0.1, volume: 0.45 }),
    });
    this.bucket.setDepth(this.foot.y + 1);
    this.kickIdle();
  }

  private tiltBucket(y: number): void {
    if (this.state !== 'pour') return;
    this.tilt = Phaser.Math.Clamp((y - this.tiltStartY) * 0.9, 0, 105);
    const M = { Body: this.matter.body };
    M.Body.setAngle(this.bucketBody, Phaser.Math.DegToRad(this.tilt));
  }

  private pourDrops(): void {
    const b = this.bucketBody;
    const now = this.time.now;
    if (now < this.nextDropAt) return;
    this.nextDropAt = now + 28;
    const lip = new Phaser.Math.Vector2(15, -22).rotate(b.angle).add(new Phaser.Math.Vector2(b.position.x, b.position.y));
    const body = this.matter.add.circle(lip.x, lip.y, 2.5, { frictionAir: 0.005, collisionFilter: { group: -1, category: 2, mask: 0 } });
    this.matter.body.setVelocity(body, { x: 0.3 + Math.random() * 0.4, y: 0.4 });
    const img = this.add.image(lip.x, lip.y, 'fx_dot').setTint(Math.random() < 0.5 ? 0x8fd3f0 : 0x5fb8e0).setScale(0.32).setDepth(TROUGH.y + 3);
    this.drops.push({ body, img, floor: TROUGH.y, trough: true });
    if (now - this.pourSfxAt > 450) { this.pourSfxAt = now; sfx('pour', { volume: 0.5 }); }
  }

  private fillTrough(): void {
    if (this.state !== 'pour') return;
    // One trip always fills the trough: even a sloshed bucket finishes the job.
    this.fill = Math.min(1, this.fill + 1 / 60);
    this.level = this.pourLevel * (1 - this.fill);
    const sy = this.troughWater.getData('sy') as number;
    this.troughWater.setAlpha(Math.min(1, 0.25 + this.fill)).setScale(this.troughWater.scaleX, sy * (0.4 + 0.6 * this.fill));
    if (this.fill >= 1) this.troughFull();
  }

  private troughFull(): void {
    this.state = 'stepback';
    this.tiltId = -1;
    this.bucket.setTexture('bucket_empty');
    fitHeight(this.bucket, 52);
    // He sets the empty bucket down beside the trough: it drops, knocks and settles.
    const M = { Body: this.matter.body };
    M.Body.setStatic(this.bucketBody, false);
    this.bucketBody.collisionFilter.mask = 0xffffffff;
    M.Body.setPosition(this.bucketBody, { x: TROUGH.x - 62, y: this.bucketBody.position.y });
    M.Body.setAngle(this.bucketBody, 0.2);
    this.time.delayedCall(420, () => this.alive && sfx('thud', { weight: 0.3, volume: 0.5 }));
    this.bucket.setDepth(GROUND);
    this.standPose();
    void Voice.say('uq_stepback');
    this.kickIdle();
  }

  private async dogDrinks(): Promise<void> {
    if (this.state !== 'stepback') return;
    this.state = 'drink';
    this.setIdle(null);
    await this.wait(400);
    if (!this.alive) return;
    // The dog steps to the trough (a bob on every step) and drinks.
    this.dogPant?.stop();
    this.tweens.add({ targets: this.dog, x: DOG.drinkX, duration: 900, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: this.dog, y: { from: DOG.y, to: DOG.y - 4 }, duration: 150, yoyo: true, repeat: 2 });
    await this.wait(950);
    if (!this.alive) return;
    this.dog.setTexture('dog_drinking').setFlipX(false);
    fitHeight(this.dog, DOG.h * 0.9);
    for (let i = 0; i < 4; i++) {
      this.time.delayedCall(i * 900, () => {
        if (!this.alive) return;
        sfx('lap', { volume: 0.9 });
        this.fill = Math.max(0.6, this.fill - 0.08);
        const sy = this.troughWater.getData('sy') as number;
        this.troughWater.setScale(this.troughWater.scaleX, sy * (0.4 + 0.6 * this.fill));
      });
    }
    await this.wait(3700);
    if (!this.alive) return;
    const done = Voice.say('uq_done');
    this.dog.setTexture('dog_happy').setFlipX(false);
    fitHeight(this.dog, DOG.h);
    const s = this.dog.scaleX;
    this.tweens.add({ targets: this.dog, scaleX: s * 1.12, scaleY: this.dog.scaleY * 0.9, duration: 600, yoyo: true, hold: 300, ease: 'Sine.easeInOut' });
    this.time.delayedCall(1400, () => this.alive && sfx('bark', { volume: 0.6 }));
    await Promise.all([done, this.wait(2200)]);
    if (!this.alive) return;
    // Off it trots, back to the hills.
    this.dog.setFlipX(true);
    this.tweens.add({ targets: this.dog, x: W + 180, duration: 3000, ease: 'Sine.easeIn' });
    this.tweens.add({ targets: this.dog, y: { from: DOG.y, to: DOG.y - 6 }, duration: 180, yoyo: true, repeat: 11 });
    for (let i = 0; i < 6; i++) this.time.delayedCall(i * 500, () => this.alive && sfx('step', { volume: 0.3 }));
    await this.wait(1500);
    if (!this.alive) return;
    this.state = 'done';
    await this.finishAdventure('ummqais', 'uq_hadith');
  }

  // ------------------------------------------------------------ free time

  /** He can still walk about; the things on the way react to a touch. */
  protected freeTargets(): FreeTarget[] {
    return this.discoveries.map((d) => ({ obj: d.obj, react: () => d.react() }));
  }

  // ------------------------------------------------------------ hints

  private showHint(): void {
    if (this.pulling >= 0 || this.tiltId >= 0) return;
    const again = () => this.kickIdle();
    const toward = (x: number) => ({ x: Phaser.Math.Clamp(x, this.camX + 30, this.camX + DESIGN_W - 30), y: this.foot.y - 30 });
    switch (this.state) {
      case 'find': this.hint.show('hold', toward(this.foot.x + 150), toward(this.foot.x + 150), again); break;
      case 'toWell': this.hint.show('hold', toward(PULL_SPOT.x), toward(PULL_SPOT.x), again); break;
      case 'pull':
        this.hint.show('drag', { x: this.handle.x, y: HANDLE.top }, { x: this.handle.x, y: HANDLE.bottom }, again);
        if (!this.hintSaid && !Voice.busy) { this.hintSaid = true; void Voice.say('uq_hint'); }
        break;
      case 'take':
        if (Math.abs(this.foot.x - PULL_SPOT.x) < 70) this.hint.show('tap', { x: this.bucket.x, y: this.bucket.y }, undefined, again);
        else this.hint.show('hold', toward(PULL_SPOT.x), toward(PULL_SPOT.x), again);
        break;
      case 'carry': this.hint.show('hold', toward(TROUGH.x - 100), toward(TROUGH.x - 100), again); break;
      case 'pour': this.hint.show('drag', { x: this.bucket.x, y: this.bucket.y }, { x: this.bucket.x, y: this.bucket.y + 90 }, again); break;
      case 'stepback': this.hint.show('hold', toward(this.foot.x - 140), toward(this.foot.x - 140), again); break;
      default: break;
    }
  }
}
