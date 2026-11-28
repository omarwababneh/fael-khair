import Phaser from 'phaser';
import { fitHeight, fitWidth } from '../../core/assets';
import { droplets, glowRing, HintHand, motes } from '../../core/fx';
import { music } from '../../core/music';
import { completeMission, currentLap } from '../../core/session';
import { sfx } from '../../core/sfx';
import { ui } from '../../core/ui';
import { view } from '../../core/viewport';
import { Voice } from '../../core/voice';
import { BaseScene, type FreeTarget } from '../BaseScene';
import { breathe, freeHop, freeSway, freeWiggle, pose, PourCan, walkTo, type PourTarget } from '../kit';

// D1. The Dead Sea: the dripping taps (value: not wasting water; source
// quran_7_31). MISSIONS_V2.md section 5.
// Visitors left taps dripping. He turns each one off with a circling finger;
// later taps are stiffer and need a full turn. One pipe leaks at a joint:
// turning does nothing, so he tells the rest-stop attendant, who fixes it. The
// water saved goes to a row of thirsty potted plants. The leak is reported to
// an adult, never fixed by a child.
//
// The same rest stop with one dripping tap and nobody around is the Dead Sea's
// quiet deed (scene key 'deadsea-tap', MISSIONS_V2.md section 6). He turns it
// off and walks on. No chime, no music, no hadith line, nobody thanks him.

// Measured on bg_deadsea_restarea (world units): the low wall's cap is at
// y = 465 to 490, its face runs down to the paving at y = 622.
const TAP_Y = 512; // the top of each tap body, on the upper wall face
const FLOOR_Y = 628; // where drips land
const BOY = { foot: 714, h: 150 };
const ATTENDANT = { x: 360, foot: 714, h: 150 * 1.35 };
const PLANT_Y = 662;
const PLANT_H = 150 * 0.34;
// Taps and handles are drawn larger than the checklist (0.18 and 0.1 of the
// boy, about 27 and 15 points): a handle has to be big enough to turn with a finger.
const TAP_H = 62;
const HANDLE_D = 46;
// Measured on the art: tap_body's handle stem tops out at (0.48, 0.04), the
// spout opens at (0.12, 0.97); pipe_leak's drops start below 0.47 of its height.
const STEM = { x: 0.48, y: 0.04 };
const SPOUT = { x: 0.12, y: 0.97 };
const PIPE_DRY = 0.47;

type State = 'intro' | 'turn' | 'fix' | 'water' | 'end';

interface Tap {
  body: Phaser.GameObjects.Image;
  handle: Phaser.GameObjects.Image;
  cx: number; cy: number; // the handle's center
  spout: { x: number; y: number };
  need: number; // degrees of handle turn to close it
  turned: number;
  done: boolean;
  drip: Phaser.Time.TimerEvent;
}

export class TapsScene extends BaseScene {
  protected quiet = false;
  private state: State = 'intro';
  private boy!: Phaser.GameObjects.Image;
  private taps: Tap[] = [];
  private active: Tap | null = null;
  private turnId = -1;
  private lastAngle = 0;
  private stiffSaid = false;
  private pipe: Phaser.GameObjects.Image | null = null;
  private pipeDrip: Phaser.Time.TimerEvent | null = null;
  private pipeSeen = false;
  private pipeFixed = false;
  private attendant: Phaser.GameObjects.Image | null = null;
  private attendantRing: Phaser.GameObjects.Image | null = null;
  private plants: Array<{ img: Phaser.GameObjects.Image; pour: PourTarget }> = [];
  private can: PourCan | null = null;
  private canId = -1;
  private hint!: HintHand;

  constructor(key = 'deadsea') {
    super(key);
  }

  create(): void {
    this.setup();
    this.quiet = this.scene.key === 'deadsea-tap';
    this.state = 'intro';
    this.taps = [];
    this.plants = [];
    this.active = this.pipe = this.pipeDrip = this.attendant = this.attendantRing = this.can = null;
    this.turnId = this.canId = -1;
    this.stiffSaid = this.pipeSeen = false;
    this.pipeFixed = this.quiet; // the quiet deed has no leak
    this.hint = new HintHand(this);
    const lap = currentLap();

    ui.setPill('البَحْر المَيِّت');
    ui.setHome(() => this.goTo('map'));
    ui.clearBubble();
    music.play('deadsea', { natureOnly: this.quiet }); // a quiet deed has no music

    this.addCover('bg_deadsea_restarea');
    motes(this, { x: 20, y: 180, w: 350, h: 420 }, 40);

    // The taps. The first one needs half a turn (an easy first win); later ones a full turn.
    const xs = this.quiet ? [196] : lap ? [96, 168, 240] : [124, 214];
    // (The quiet deed's one tap needs a full turn: a little more to do there.)
    xs.forEach((x, i) => this.addTap(x, this.quiet ? 360 : i === 0 ? 180 : 360));

    if (!this.quiet) {
      // The leaking joint, low on the wall at the right, by the attendant.
      const px = 282;
      this.pipe = this.add.image(px, 572, 'pipe_leak').setOrigin(0.5, 0).setDepth(22);
      fitHeight(this.pipe, 46); // he touches it: at least 44 points tall
      this.pipeDrip = this.time.addEvent({ delay: 650, loop: true, callback: () => this.drip(px + 4, 572 + this.pipe!.displayHeight * 0.45) });
      // Thirsty plants along the foot of the wall.
      for (const x of [112, 184, 256]) {
        const img = this.add.image(x, PLANT_Y, 'plant_dry').setOrigin(0.5, 1).setDepth(30);
        fitHeight(img, PLANT_H);
        this.plants.push({ img, pour: { x, y: PLANT_Y - PLANT_H, progress: 0, need: 1300, done: false } });
      }
      this.attendant = this.add.image(ATTENDANT.x, ATTENDANT.foot, 'guard_stand').setOrigin(0.5, 1).setDepth(50);
      fitHeight(this.attendant, ATTENDANT.h);
      breathe(this, this.attendant);
    }

    this.boy = this.add.image(this.quiet ? 330 : 44, BOY.foot, 'boy_idle').setOrigin(0.5, 1).setDepth(60);
    fitHeight(this.boy, BOY.h);
    breathe(this, this.boy);

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.down(p));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.move(p));
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => this.up(p));
    this.input.on('pointerupoutside', (p: Phaser.Input.Pointer) => this.up(p));
    this.events.once('shutdown', () => this.hint.clear());
    void this.intro();
  }

  private addTap(x: number, need: number): void {
    const body = this.add.image(x, TAP_Y, 'tap_body').setOrigin(0.5, 0).setDepth(20);
    fitHeight(body, TAP_H);
    const w = body.displayWidth, h = body.displayHeight;
    const left = x - w / 2;
    const cx = left + w * STEM.x, cy = TAP_Y + h * STEM.y - HANDLE_D * 0.2;
    const handle = this.add.image(cx, cy, 'tap_handle').setDepth(21);
    fitWidth(handle, HANDLE_D);
    const spout = { x: left + w * SPOUT.x, y: TAP_Y + h * SPOUT.y };
    const tap: Tap = { body, handle, cx, cy, spout, need, turned: 0, done: false, drip: null as unknown as Phaser.Time.TimerEvent };
    tap.drip = this.time.addEvent({ delay: 700 + Math.random() * 200, loop: true, callback: () => !tap.done && this.drip(spout.x, spout.y, tap) });
    this.taps.push(tap);
  }

  /** One drop falls and splashes on the paving. A tap being closed drips more slowly. */
  private drip(x: number, y: number, tap?: Tap): void {
    if (!this.alive) return;
    if (tap && tap.turned / tap.need > Math.random() * 1.2) return;
    const d = this.add.image(x, y, 'fx_dot').setDepth(23).setTint(0x5fb8e0).setScale(0.32);
    this.tweens.add({
      targets: d, y: FLOOR_Y, duration: 320, ease: 'Quad.easeIn',
      onComplete: () => {
        d.destroy();
        droplets(this, x, FLOOR_Y, 3, 23, { min: 220, max: 320 });
      },
    });
    sfx('splash', { volume: 0.06 });
  }

  private async intro(): Promise<void> {
    this.state = 'turn';
    this.setIdle(() => this.showHint());
    this.open(this.quiet ? 'qdd_open' : 'd1_open', this.quiet ? undefined : 'd1_hint');
  }

  // ---------------------------------------------------------------- input

  private down(p: Phaser.Input.Pointer): void {
    if (!this.alive) return;
    this.hint.clear();
    const x = p.worldX, y = p.worldY;
    if (this.state === 'turn') {
      // The nearest open tap within reach (on later laps they stand close together).
      const tap = this.taps
        .filter((t) => !t.done && Phaser.Math.Distance.Between(x, y, t.cx, t.cy) < HANDLE_D * 0.5 + 26)
        .sort((a, b) => Phaser.Math.Distance.Between(x, y, a.cx, a.cy) - Phaser.Math.Distance.Between(x, y, b.cx, b.cy))[0];
      if (tap) {
        this.active = tap;
        this.turnId = p.id;
        this.lastAngle = Phaser.Math.Angle.Between(tap.cx, tap.cy, x, y);
        sfx('grab', { volume: 0.5 });
        if (tap.need > 180 && !this.stiffSaid && !this.quiet) {
          this.stiffSaid = true;
          void Voice.say('d1_stiff');
        }
        void this.stepTo(tap.cx - 80);
        return;
      }
      const pipeArea = this.pipe ? Phaser.Geom.Rectangle.Inflate(this.pipe.getBounds(), 8, 10) : null;
      if (this.pipe && pipeArea && !this.pipeFixed && pipeArea.contains(x, y)) {
        void this.touchPipe();
        return;
      }
      if (this.attendant && !this.pipeFixed && this.attendant.getBounds().contains(x, y)) {
        void this.callAttendant();
      }
    } else if (this.state === 'water' && this.can && this.can.hit(x, y)) {
      this.canId = p.id;
      this.can.grab(p);
      pose(this, this.boy, 'boy_water', BOY.h);
    }
  }

  private move(p: Phaser.Input.Pointer): void {
    if (this.active && p.id === this.turnId) {
      const t = this.active;
      const a = Phaser.Math.Angle.Between(t.cx, t.cy, p.worldX, p.worldY);
      if (Phaser.Math.Distance.Between(t.cx, t.cy, p.worldX, p.worldY) < 10) return;
      const d = Phaser.Math.RadToDeg(Phaser.Math.Angle.Wrap(a - this.lastAngle));
      this.lastAngle = a;
      // Either way round closes it; a stiff tap turns a little less than the finger.
      const turn = Math.abs(d) * (t.need > 180 ? 0.7 : 1);
      t.turned = Math.min(t.need, t.turned + turn);
      t.handle.angle += Math.sign(d) * turn;
      if (Math.abs(d) > 4) sfx('creak', { volume: 0.12 });
      if (t.turned >= t.need) this.closed(t);
    } else if (this.can && p.id === this.canId) {
      const v = view();
      this.can.move(p, { x: v.x + 30, right: v.right - 30, top: 520, bottom: 712 });
    }
  }

  private up(p: Phaser.Input.Pointer): void {
    if (p.id === this.turnId) {
      this.active = null;
      this.turnId = -1;
    } else if (this.can && p.id === this.canId) {
      this.can.release(p);
      this.canId = -1;
      if (this.state === 'water') pose(this, this.boy, 'boy_idle', BOY.h);
    }
    this.kickIdle();
  }

  /** The boy steps over to the tap he is closing (he stays to its left, clear of its drips). */
  private stepTo(x: number): Promise<void> {
    const to = Phaser.Math.Clamp(x, 40, 300);
    if (Math.abs(this.boy.x - to) < 20) return Promise.resolve();
    return walkTo(this, this.boy, { x: to, y: BOY.foot }, BOY.h).then(() => {
      if (this.alive && this.state === 'turn') pose(this, this.boy, 'boy_idle', BOY.h);
    });
  }

  private closed(t: Tap): void {
    t.done = true;
    t.drip.remove();
    this.active = null;
    this.turnId = -1;
    this.tweens.add({ targets: t.handle, scale: { from: t.handle.scale * 1.12, to: t.handle.scale }, duration: 260, ease: 'Back.easeOut' });
    sfx('thud', { weight: 0.05, volume: 0.4 });
    // A finished step chimes, except in a quiet deed, which has no chime at all.
    if (!this.quiet) this.time.delayedCall(220, () => sfx('chime', { volume: 0.4 }));
    this.checkTurned();
  }

  // ---------------------------------------------------------------- the leak

  private async touchPipe(): Promise<void> {
    // Turning does nothing here: it is a broken joint, a job for a grown-up.
    if (this.pipe) this.tweens.add({ targets: this.pipe, x: this.pipe.x + 2, duration: 50, yoyo: true, repeat: 3 });
    if (!this.pipeSeen) {
      this.pipeSeen = true;
      await Voice.say('d1_leak');
      // He may already have called the attendant while the father spoke.
      if (!this.alive || this.pipeFixed || this.state !== 'turn') return;
    }
    if (this.attendant && !this.attendantRing) {
      this.attendantRing = glowRing(this, this.attendant.x - 8, this.attendant.y - this.attendant.displayHeight * 0.55, 46, 49);
    }
    await Voice.say('d1_tell');
  }

  private async callAttendant(): Promise<void> {
    const a = this.attendant;
    const pipe = this.pipe;
    if (!a || !pipe) return;
    this.state = 'fix';
    this.setIdle(null);
    this.attendantRing?.destroy();
    this.attendantRing = null;
    const home = { x: a.x, y: a.y };
    this.tweens.killTweensOf(a);
    const steps = this.time.addEvent({ delay: 380, loop: true, callback: () => sfx('step', { volume: 0.35 }) });
    this.tweens.add({ targets: a, angle: { from: -2, to: 2 }, duration: 260, yoyo: true, repeat: -1 });
    await new Promise<void>((res) => this.tweens.add({ targets: a, x: pipe.x + 52, duration: Math.max(400, Math.abs(pipe.x + 52 - a.x) * 9), ease: 'Sine.easeInOut', onComplete: () => res() }));
    steps.remove();
    if (!this.alive) return;
    this.tweens.killTweensOf(a);
    a.setAngle(0);
    // He works on the joint with his wrench.
    for (let i = 0; i < 3; i++) {
      sfx('knock', { volume: 0.5 });
      await new Promise<void>((res) => this.tweens.add({ targets: a, angle: 5, duration: 220, yoyo: true, onComplete: () => res() }));
      if (!this.alive) return;
    }
    this.pipeDrip?.remove();
    pipe.setCrop(0, 0, pipe.frame.width, pipe.frame.height * PIPE_DRY);
    this.pipeFixed = true;
    await Voice.say('d1_fixed');
    if (!this.alive) return;
    // He goes back to his place.
    const back = this.time.addEvent({ delay: 380, loop: true, callback: () => sfx('step', { volume: 0.3 }) });
    const sway = this.tweens.add({ targets: a, angle: { from: -2, to: 2 }, duration: 260, yoyo: true, repeat: -1 });
    this.tweens.add({ targets: a, x: home.x, duration: 1400, ease: 'Sine.easeInOut', onComplete: () => { back.remove(); sway.stop(); a.setAngle(0); if (this.alive) breathe(this, a); } });
    this.state = 'turn';
    this.setIdle(() => this.showHint());
    this.checkTurned();
  }

  // ---------------------------------------------------------------- the plants

  private checkTurned(): void {
    if (this.state !== 'turn' || this.taps.some((t) => !t.done) || !this.pipeFixed) return;
    this.state = 'end';
    this.setIdle(null);
    void (this.quiet ? this.quietEnding() : this.toPlants());
  }

  private async toPlants(): Promise<void> {
    await this.wait(600);
    if (!this.alive) return;
    pose(this, this.boy, 'boy_idle', BOY.h);
    this.can = new PourCan(this, 150, 708, 150 * 0.3);
    this.can.img.setAlpha(0);
    this.tweens.add({ targets: this.can.img, alpha: 1, duration: 400 });
    await Voice.say('d1_plants');
    if (!this.alive) return;
    this.state = 'water';
    this.setIdle(() => this.showHint());
  }

  update(_t: number, dt: number): void {
    if (this.state !== 'water' || !this.can) return;
    const done = this.can.update(dt, this.plants.map((p) => p.pour));
    if (!done) return;
    const plant = this.plants.find((p) => p.pour === done);
    if (!plant) return;
    droplets(this, plant.img.x, PLANT_Y - 16, 6, 31);
    this.tweens.add({ targets: plant.img, alpha: 0.3, duration: 300, yoyo: true, onYoyo: () => { plant.img.setTexture('plant_fresh'); fitHeight(plant.img, PLANT_H); } });
    // Not on the last plant (not on the step that finishes the deed: that would be a reward sting).
    if (!this.plants.every((p) => p.pour.done)) sfx('chime', { volume: 0.4 });
    if (this.plants.every((p) => p.pour.done)) void this.ending();
  }

  private async ending(): Promise<void> {
    this.state = 'end';
    this.setIdle(null);
    if (this.can) {
      this.canId = -1;
      this.tweens.add({ targets: this.can.img, x: 150, y: 708, angle: 0, duration: 400 });
    }
    pose(this, this.boy, 'boy_happy', BOY.h);
    await this.wait(900);
    if (!this.alive) return;
    await Voice.say('d1_end');
    if (!this.alive) return;
    await this.finishAdventure('deadsea', 'd1_hadith');
  }

  /** He walks on. Later a visitor passes the dry paving; nobody knows. */
  private async quietEnding(): Promise<void> {
    await this.wait(500);
    if (!this.alive) return;
    await walkTo(this, this.boy, { x: view().right + 70, y: BOY.foot }, BOY.h);
    if (!this.alive) return;
    this.boy.setVisible(false);
    await this.wait(1500);
    if (!this.alive) return;
    completeMission('deadsea');
    const v = view();
    const visitor = this.add.image(v.x - 50, BOY.foot, 'visitor_a').setOrigin(0.5, 1).setDepth(60);
    fitHeight(visitor, 150 * 1.3);
    this.tweens.add({ targets: visitor, y: BOY.foot - 3, duration: 260, yoyo: true, repeat: -1 });
    this.tweens.add({ targets: visitor, x: v.right + 60, duration: 6500, ease: 'Linear' });
    const steps = this.time.addEvent({ delay: 420, loop: true, callback: () => sfx('step', { volume: 0.3 }) });
    await this.wait(3600);
    steps.remove();
    if (!this.alive) return;
    // A quiet deed's final moment: the background goes still.
    this.motionStill(true);
    await Voice.say('qdd_end');
    if (!this.alive) return;
    await this.finishAdventure('deadsea', null);
  }

  /**
   * Free time by the watered plants (never at the quiet tap: the framework skips
   * it). The middle plant sways, the attendant nods, the boy hops.
   */
  protected freeTargets(): FreeTarget[] {
    const a = this.attendant;
    const plant = this.plants[1]?.img;
    if (this.quiet || !a || !plant) return [];
    return [
      { obj: plant, react: () => freeSway(this, plant, 4, 0.3) },
      { obj: a, react: () => freeWiggle(this, a, 'step', 3) },
      { obj: this.boy, react: () => freeHop(this, this.boy, 'step', 10) },
    ];
  }

  private showHint(): void {
    if (!this.alive || this.active || this.canId !== -1) return this.kickIdle();
    const again = () => this.kickIdle();
    if (this.state === 'turn') {
      const t = this.taps.find((x) => !x.done);
      if (t) {
        // A finger going round the handle.
        this.hint.circle({ x: t.cx, y: t.cy }, 30, again);
      } else if (this.attendant && !this.pipeFixed) {
        if (this.pipeSeen) this.hint.show('tap', { x: this.attendant.x - 8, y: this.attendant.y - this.attendant.displayHeight * 0.5 }, undefined, again);
        else if (this.pipe) this.hint.show('tap', { x: this.pipe.x, y: this.pipe.y + 12 }, undefined, again);
      } else again();
    } else if (this.state === 'water' && this.can) {
      const p = this.plants.find((x) => !x.pour.done);
      if (p) this.hint.show('drag', { x: this.can.img.x, y: this.can.img.y - 20 }, { x: p.img.x - 40, y: PLANT_Y - 90 }, again);
      else again();
    }
  }
}

/** The Dead Sea's quiet deed: one dripping tap and nobody around (MISSIONS_V2.md section 6). */
export class DeadSeaTapScene extends TapsScene {
  constructor() {
    super('deadsea-tap');
  }
}
