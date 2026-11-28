import Phaser from 'phaser';
import { fitHeight } from '../../core/assets';
import { dustPuff, glowRing, HintHand, motes } from '../../core/fx';
import { music } from '../../core/music';
import { currentLap } from '../../core/session';
import { sfx } from '../../core/sfx';
import { ui } from '../../core/ui';
import { vp } from '../../core/viewport';
import { Voice } from '../../core/voice';
import { BaseScene, type FreeTarget } from '../BaseScene';
import { breathe, freeBounce, freeHop, freeRipple, pose, walkTo } from '../kit';

// Q3. Aqaba: the sandcastle promise (value: keeping a promise; source
// quran_17_34). MISSIONS_V2.md section 5.
// He promised his sister a sandcastle. Friends call him to play ball. Two
// identical buttons, shuffled left and right as in Amman: build now, or go to
// the ball.
//  - Build now: he fills the bucket with taps, flips it with a swipe and sets
//    shells on top. A wave takes the first tower, so they build the next one
//    higher up the sand.
//  - Go to the ball: one short pass; he sees his sister waiting with her bucket;
//    he goes back and asks whether after the game is all right; she says yes.
//    One more pass, he returns, and they build.
// Both paths end at the same castle and the same happy sister. Neither path is
// scolded. While they build, the camera moves in, so the bucket and the shells
// he touches are at least 44 points tall on the screen.

// Measured on bg_aqaba_beach (world units): the sea meets the sand at y = 500.
const SHORE_Y = 500;
const BOY = { x: 196, foot: 716, h: 150 };
const SISTER = { x: 300, foot: 660, h: 150 * 0.75 };
const FRIENDS = { a: { x: 44, foot: 568 }, b: { x: 112, foot: 556 } };
const FRIEND_H = 150 * 0.86; // a little farther back
// Where they build: the first tower near the water (the wave reaches it), the next higher up the sand.
const SPOTS = [{ x: 246, y: 586 }, { x: 236, y: 664 }];
const ZOOM = 1.5;
const BUCKET_H = 40; // 60 points on screen
const TOWER_H = 48;
const SHELL_H = 30; // 45 points on screen

type State = 'choose' | 'pass' | 'toSister' | 'pass2' | 'fill' | 'flip' | 'shells' | 'busy' | 'end';

export class CastleScene extends BaseScene {
  private state: State = 'choose';
  private boy!: Phaser.GameObjects.Image;
  private sister!: Phaser.GameObjects.Image;
  private friends: Phaser.GameObjects.Image[] = [];
  private ball!: Phaser.GameObjects.Image;
  private bucket: Phaser.GameObjects.Image | null = null;
  private tower: Phaser.GameObjects.Image | null = null;
  private shells: Array<{ img: Phaser.GameObjects.Image; home: { x: number; y: number }; done: boolean }> = [];
  private ring: Phaser.GameObjects.Image | null = null;
  private removeChoice: (() => void) | null = null;
  private path: 'build' | 'ball' = 'build';
  private spot = 0;
  private fills = 0;
  private needFills = 3;
  private needShells = 2;
  private swipeFrom: { x: number; y: number } | null = null;
  private held: (typeof this.shells)[number] | null = null;
  private dragId = -1;
  private framing: { x: number; y: number; zoom: number } | null = null;
  private hint!: HintHand;

  constructor() {
    super('q3');
  }

  create(): void {
    // The scene object is reused: a visit left mid-build must not open zoomed in.
    this.framing = null;
    this.setup();
    this.state = 'choose';
    this.friends = [];
    this.shells = [];
    this.bucket = this.tower = this.ring = null;
    this.removeChoice = null;
    this.spot = this.fills = 0;
    this.swipeFrom = null;
    this.held = null;
    this.dragId = -1;
    this.framing = null;
    this.hint = new HintHand(this);
    const lap = currentLap();
    this.needFills = lap ? 4 : 3;
    this.needShells = lap ? 3 : 2;

    ui.setPill('العَقَبة');
    ui.setHome(() => this.goTo('map'));
    ui.clearBubble();
    music.play('aqaba');

    this.addCover('bg_aqaba_beach');
    motes(this, { x: 20, y: 200, w: 350, h: 420 }, 40);
    this.time.addEvent({ delay: 4200, loop: true, callback: () => this.alive && sfx('splash', { volume: 0.12 }) });

    const fa = this.add.image(FRIENDS.a.x, FRIENDS.a.foot, 'friend_a').setOrigin(0.5, 1).setDepth(30);
    const fb = this.add.image(FRIENDS.b.x, FRIENDS.b.foot, 'friend_b').setOrigin(0.5, 1).setDepth(30);
    for (const f of [fa, fb]) { fitHeight(f, FRIEND_H); breathe(this, f); }
    this.friends = [fa, fb];
    this.ball = this.add.image(FRIENDS.b.x + 26, FRIENDS.b.foot - 8, 'ball').setDepth(31);
    fitHeight(this.ball, 26);
    this.sister = this.add.image(SISTER.x, SISTER.foot, 'sister_bucket_wait').setOrigin(0.5, 1).setDepth(40);
    fitHeight(this.sister, SISTER.h);
    breathe(this, this.sister);
    this.boy = this.add.image(BOY.x, BOY.foot, 'boy_idle').setOrigin(0.5, 1).setDepth(60);
    fitHeight(this.boy, BOY.h);
    breathe(this, this.boy);

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.down(p));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.move(p));
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => this.up(p));
    this.input.on('pointerupoutside', (p: Phaser.Input.Pointer) => this.up(p));
    this.events.once('shutdown', () => {
      this.hint.clear();
      this.removeChoice?.();
    });

    // The choice is there at once, while the father and the friends speak.
    // Standard Arabic labels with the built-in voice, Jordanian with the parent's own recording of q3_open.
    this.removeChoice = ui.showChoice([
      Voice.label('q3_open', 'نبني القلعة الآن', 'بنبني القلعة هلأ'),
      Voice.label('q3_open', 'نلعب بالكرة', 'بنروح عالطابة'),
    ], (i) => {
      this.removeChoice = null;
      this.layers?.still(false);
      if (i === 0) void this.buildNow();
      else void this.toBall();
    });
    // A moral choice: the background holds still until he chooses.
    this.layers?.still(true);
    void this.sayOpening('q3_open').then((ended) => { if (ended && this.alive && this.state === 'choose') void Voice.say('q3_friends'); });
  }

  /** The camera keeps its framing after a resize. */
  protected onLayout(): void {
    if (!this.framing) return;
    const cam = this.cameras.main;
    cam.setZoom(vp.zoom * this.framing.zoom);
    cam.centerOn(this.framing.x, this.framing.y);
  }

  private camera(f: { x: number; y: number; zoom: number } | null): Promise<void> {
    this.framing = f;
    const t = f ?? { x: 195, y: 422, zoom: 1 };
    const cam = this.cameras.main;
    return new Promise((res) => {
      cam.pan(t.x, t.y, 700, 'Sine.easeInOut');
      // On arrival, settle exactly (a resize during the move would leave the old zoom).
      cam.zoomTo(vp.zoom * t.zoom, 700, 'Sine.easeInOut', false, (_c, p) => { if (p === 1) { this.onLayout(); res(); } });
    });
  }

  // ---------------------------------------------------------------- the ball path

  private async toBall(): Promise<void> {
    this.path = 'ball';
    this.state = 'busy';
    pose(this, this.boy, 'boy_happy', BOY.h);
    await walkTo(this, this.boy, { x: 214, y: 610 }, BOY.h * 0.9);
    if (!this.alive) return;
    pose(this, this.boy, 'boy_idle', BOY.h * 0.9);
    this.state = 'pass';
    this.ringOn(this.friends[1].x, this.friends[1].y - FRIEND_H * 0.5);
    this.setIdle(() => this.showHint());
    void Voice.say('q3_pass');
  }

  /** One short pass: he kicks to a friend, who kicks it back. */
  private async pass(): Promise<void> {
    const was = this.state;
    this.state = 'busy';
    this.ringOff();
    this.setIdle(null);
    pose(this, this.boy, 'boy_kick', BOY.h * 0.9);
    sfx('bounce', { volume: 0.6 });
    const f = this.friends[1];
    const at = { x: this.boy.x + 20, y: this.boy.y - 8 };
    this.ball.setPosition(at.x, at.y);
    await new Promise<void>((res) => this.tweens.add({ targets: this.ball, x: f.x + 20, y: f.y - 8, duration: 600, ease: 'Sine.easeOut', onComplete: () => res() }));
    if (!this.alive) return;
    sfx('bounce', { volume: 0.5 });
    await new Promise<void>((res) => this.tweens.add({ targets: this.ball, x: at.x, y: at.y, duration: 650, ease: 'Sine.easeIn', onComplete: () => res() }));
    if (!this.alive) return;
    pose(this, this.boy, 'boy_idle', BOY.h * 0.9);
    if (was === 'pass') {
      // He sees his sister waiting with her bucket.
      await Voice.say('q3_sister_wait');
      if (!this.alive) return;
      this.state = 'toSister';
      this.ringOn(this.sister.x, this.sister.y - SISTER.h * 0.5);
      this.setIdle(() => this.showHint());
    } else {
      // Back to her, as they agreed.
      await Voice.say('q3_back');
      if (!this.alive) return;
      await walkTo(this, this.boy, { x: SPOTS[1].x - 70, y: SPOTS[1].y + 12 }, BOY.h * 0.95);
      if (!this.alive) return;
      void this.startBuild(1);
    }
  }

  /** He asks her whether after the game is all right. She says yes. */
  private async askSister(): Promise<void> {
    this.state = 'busy';
    this.ringOff();
    this.setIdle(null);
    await walkTo(this, this.boy, { x: SISTER.x - 70, y: SISTER.foot + 30 }, BOY.h * 0.95);
    if (!this.alive) return;
    pose(this, this.boy, 'boy_idle', BOY.h * 0.95);
    await Voice.say('q3_ask');
    if (!this.alive) return;
    this.tweens.add({ targets: this.sister, y: SISTER.foot - 6, duration: 160, yoyo: true, repeat: 1 });
    await Voice.say('q3_yes');
    if (!this.alive) return;
    // One more pass, then back to build.
    await walkTo(this, this.boy, { x: 214, y: 610 }, BOY.h * 0.9);
    if (!this.alive) return;
    pose(this, this.boy, 'boy_idle', BOY.h * 0.9);
    this.state = 'pass2';
    this.ringOn(this.friends[1].x, this.friends[1].y - FRIEND_H * 0.5);
    this.setIdle(() => this.showHint());
  }

  // ---------------------------------------------------------------- building

  private async buildNow(): Promise<void> {
    this.path = 'build';
    this.state = 'busy';
    await walkTo(this, this.boy, { x: SPOTS[0].x - 70, y: SPOTS[0].y + 12 }, BOY.h * 0.9);
    if (!this.alive) return;
    void this.startBuild(0);
  }

  /** The camera moves in to the spot; the bucket waits to be filled. */
  private async startBuild(i: number): Promise<void> {
    this.spot = i;
    this.fills = 0;
    this.state = 'busy';
    const s = SPOTS[i];
    pose(this, this.boy, 'boy_kneel', BOY.h * 0.65);
    this.boy.setPosition(s.x - 70, s.y + 12);
    this.tweens.add({ targets: this.sister, x: s.x + 74, y: s.y + 14, duration: 700, ease: 'Sine.easeInOut' });
    this.sister.setTexture('sister_happy');
    fitHeight(this.sister, SISTER.h);
    breathe(this, this.sister);
    await this.camera({ x: s.x - 10, y: s.y - 40, zoom: ZOOM });
    if (!this.alive) return;
    this.bucket?.destroy();
    this.bucket = this.add.image(s.x, s.y + 6, 'sand_bucket').setOrigin(0.5, 1).setDepth(50);
    fitHeight(this.bucket, BUCKET_H);
    this.state = 'fill';
    this.setIdle(() => this.showHint());
    void Voice.say('q3_fill');
  }

  private fill(): void {
    const b = this.bucket as Phaser.GameObjects.Image;
    this.fills++;
    sfx('sweep', { volume: 0.5 });
    dustPuff(this, b.x, b.y - BUCKET_H * 0.9, 6, 0xe8c27a, 51);
    this.tweens.add({ targets: b, scaleY: { from: b.scaleY * 0.92, to: b.scaleY }, duration: 200, ease: 'Back.easeOut' });
    if (this.fills >= this.needFills) {
      sfx('chime', { volume: 0.35 });
      this.state = 'flip';
      void Voice.say('q3_flip');
    }
  }

  /** A swipe down flips the bucket; lifting it leaves a tower. */
  private async flip(): Promise<void> {
    const b = this.bucket as Phaser.GameObjects.Image;
    this.state = 'busy';
    this.setIdle(null);
    sfx('whoosh', { volume: 0.5 });
    await new Promise<void>((res) => this.tweens.add({ targets: b, angle: 180, y: b.y - BUCKET_H, duration: 300, ease: 'Sine.easeInOut', onComplete: () => res() }));
    if (!this.alive) return;
    sfx('thud', { weight: 0.2, volume: 0.5 });
    const s = SPOTS[this.spot];
    this.tower = this.add.image(s.x, s.y + 6, 'sand_tower').setOrigin(0.5, 1).setDepth(49).setAlpha(0);
    fitHeight(this.tower, TOWER_H);
    await new Promise<void>((res) => this.tweens.add({ targets: b, y: b.y - 40, alpha: 0, duration: 400, onComplete: () => res() }));
    if (!this.alive) return;
    this.tower.setAlpha(1);
    dustPuff(this, s.x, s.y + 4, 8, 0xe8c27a, 50);
    this.tweens.add({ targets: this.tower, scaleY: { from: this.tower.scaleY * 0.85, to: this.tower.scaleY }, duration: 300, ease: 'Back.easeOut' });
    if (this.path === 'build' && this.spot === 0) {
      void this.wave();
      return;
    }
    this.layShells();
  }

  /** A wave takes the first tower: they build the next one higher up the sand. */
  private async wave(): Promise<void> {
    await this.wait(700);
    if (!this.alive) return;
    const s = SPOTS[0];
    sfx('splash', { volume: 0.7 });
    // Foam runs up the sand to the tower (particles over the picture's own sea).
    const foam = this.add.particles(0, 0, 'fx_dot', {
      x: { min: s.x - 90, max: s.x + 90 }, y: SHORE_Y, speedY: { min: 90, max: 140 }, lifespan: 900,
      scale: { start: 0.5, end: 0.2 }, alpha: { start: 0.9, end: 0 }, tint: [0xffffff, 0xd8f1ff], frequency: 18,
    }).setDepth(52);
    this.time.delayedCall(800, () => { foam.emitting = false; });
    this.time.delayedCall(2000, () => foam.destroy());
    await this.wait(700);
    if (!this.alive) return;
    const t = this.tower as Phaser.GameObjects.Image;
    this.tweens.add({ targets: t, scaleY: t.scaleY * 0.2, alpha: 0, duration: 600, ease: 'Quad.easeIn', onComplete: () => t.destroy() });
    this.tower = null;
    await Voice.say('q3_wave');
    if (!this.alive) return;
    await this.camera(null);
    if (!this.alive) return;
    await walkTo(this, this.boy, { x: SPOTS[1].x - 70, y: SPOTS[1].y + 12 }, BOY.h * 0.95);
    if (!this.alive) return;
    void this.startBuild(1);
  }

  /** Shells on the sand beside the tower: he sets them on top. */
  private layShells(): void {
    const s = SPOTS[this.spot];
    const xs = [s.x + 36, s.x + 70, s.x + 4];
    for (let i = 0; i < this.needShells; i++) {
      const home = { x: xs[i], y: s.y + 34 + (i % 2) * 8 };
      const img = this.add.image(home.x, home.y, 'shell').setDepth(55).setAngle(Phaser.Math.Between(-25, 25));
      fitHeight(img, SHELL_H);
      if (i === 1) img.setTint(0xffe2c4);
      if (i === 2) img.setTint(0xe8f0ff);
      this.shells.push({ img, home, done: false });
    }
    this.state = 'shells';
    this.setIdle(() => this.showHint());
    void Voice.say('q3_shells');
  }

  // ---------------------------------------------------------------- input

  private down(p: Phaser.Input.Pointer): void {
    if (!this.alive || this.held) return;
    this.hint.clear();
    const x = p.worldX, y = p.worldY;
    const near = (img: Phaser.GameObjects.Image, r: number) => Phaser.Math.Distance.Between(x, y, img.x, img.y - img.displayHeight / 2) < r;
    if ((this.state === 'pass' || this.state === 'pass2') && this.friends.some((f) => f.getBounds().contains(x, y))) void this.pass();
    else if (this.state === 'toSister' && (this.sister.getBounds().contains(x, y) || near(this.sister, 50))) void this.askSister();
    else if (this.state === 'fill' && this.bucket && near(this.bucket, 40)) this.fill();
    else if (this.state === 'flip' && this.bucket && near(this.bucket, 40)) this.swipeFrom = { x, y };
    else if (this.state === 'shells') {
      const sh = this.shells.filter((k) => !k.done).map((k) => ({ k, d: Phaser.Math.Distance.Between(x, y, k.img.x, k.img.y) })).filter((o) => o.d < 28).sort((a, b) => a.d - b.d)[0]?.k;
      if (!sh) return;
      this.held = sh;
      this.dragId = p.id;
      sh.img.setDepth(70);
      sfx('grab', { volume: 0.5 });
    }
  }

  private move(p: Phaser.Input.Pointer): void {
    if (this.state === 'flip' && this.swipeFrom && p.worldY - this.swipeFrom.y > 24) {
      this.swipeFrom = null;
      void this.flip();
      return;
    }
    if (this.held && p.id === this.dragId) this.held.img.setPosition(p.worldX, p.worldY - 10);
  }

  private up(p: Phaser.Input.Pointer): void {
    this.swipeFrom = null;
    if (!this.held || p.id !== this.dragId) return;
    const sh = this.held;
    this.held = null;
    this.dragId = -1;
    const t = this.tower as Phaser.GameObjects.Image;
    const topY = t.y - t.displayHeight;
    if (Math.abs(sh.img.x - t.x) < 40 && Math.abs(sh.img.y - topY) < 34) {
      sh.done = true;
      const placed = this.shells.filter((k) => k.done).length;
      const spots = [-14, 14, 0];
      this.tweens.add({ targets: sh.img, x: t.x + spots[(placed - 1) % 3], y: topY - 4 - (placed === 3 ? 10 : 0), angle: 0, scale: sh.img.scale * 0.8, duration: 160 });
      sfx('pop', { volume: 0.5 });
      if (this.shells.every((k) => k.done)) void this.ending();
    } else {
      this.tweens.add({ targets: sh.img, x: sh.home.x, y: sh.home.y, duration: 260, onComplete: () => sh.img.setDepth(55) });
    }
    this.kickIdle();
  }

  private ringOn(x: number, y: number): void {
    this.ringOff();
    this.ring = glowRing(this, x, y, 40, 39);
  }

  private ringOff(): void {
    this.ring?.destroy();
    this.ring = null;
  }

  // ---------------------------------------------------------------- the castle

  private async ending(): Promise<void> {
    this.state = 'end';
    this.setIdle(null);
    this.hint.clear();
    await this.wait(500);
    if (!this.alive) return;
    pose(this, this.boy, 'boy_happy', BOY.h * 0.95);
    this.tweens.add({ targets: this.sister, y: this.sister.y - 10, duration: 180, yoyo: true, repeat: 3 });
    await this.camera(null);
    if (!this.alive) return;
    await Voice.say('q3_end');
    if (!this.alive) return;
    await this.finishAdventure('aqaba', 'q3_hadith');
  }

  /** Free time: the ball bounces, the sister gives a small hop, the sea ripples. */
  protected freeTargets(): FreeTarget[] {
    const sea = this.children.list.find((o) => o instanceof Phaser.GameObjects.Image && o.texture.key === 'bg_aqaba_beach') as Phaser.GameObjects.Image | undefined;
    const t: FreeTarget[] = [
      { obj: this.ball, react: () => freeBounce(this, this.ball, 24) },
      { obj: this.sister, react: () => freeHop(this, this.sister, 'step', 8) },
    ];
    if (sea) t.push({ obj: sea, area: () => new Phaser.Geom.Rectangle(150, 400, 70, 70), react: () => freeRipple(this, 185, 435, 5) });
    return t;
  }

  private showHint(): void {
    if (!this.alive || this.held) return this.kickIdle();
    const again = () => this.kickIdle();
    if ((this.state === 'pass' || this.state === 'pass2') && this.friends[1]) {
      this.hint.show('tap', { x: this.friends[1].x, y: this.friends[1].y - FRIEND_H * 0.5 }, undefined, again);
    } else if (this.state === 'toSister') {
      this.hint.show('tap', { x: this.sister.x, y: this.sister.y - SISTER.h * 0.5 }, undefined, again);
    } else if (this.state === 'fill' && this.bucket) {
      this.hint.show('tap', { x: this.bucket.x, y: this.bucket.y - BUCKET_H / 2 }, undefined, again);
    } else if (this.state === 'flip' && this.bucket) {
      this.hint.show('drag', { x: this.bucket.x, y: this.bucket.y - BUCKET_H }, { x: this.bucket.x, y: this.bucket.y + 30 }, again);
    } else if (this.state === 'shells' && this.tower) {
      const sh = this.shells.find((k) => !k.done);
      if (sh) this.hint.show('drag', { x: sh.img.x, y: sh.img.y }, { x: this.tower.x, y: this.tower.y - this.tower.displayHeight }, again);
      else again();
    } else again();
  }
}

