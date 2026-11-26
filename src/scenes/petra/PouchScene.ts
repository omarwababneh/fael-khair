import Phaser from 'phaser';
import { fitHeight } from '../../core/assets';
import { dustPuff, glowRing, HintHand, motes } from '../../core/fx';
import { music } from '../../core/music';
import { completeMission, currentLap } from '../../core/session';
import { sfx } from '../../core/sfx';
import { ui } from '../../core/ui';
import { PIC, view } from '../../core/viewport';
import { Voice } from '../../core/voice';
import { BaseScene } from '../BaseScene';

// P2. Petra: the lost pouch (value: trust, returning what is lost to its true
// owner; source bukhari_2427). MISSIONS_V2.md section 5.
//
// He finds a pouch in the sand, looks closely at its tie-string and the small
// flower sewn on it without opening it, and takes it to the site guard, who stays with him in
// plain view the whole time. Two travelers come, each thinking of the pouch he
// lost. He gives it to the one whose picture matches. The other traveler is not
// lying: he lost a different pouch, and the guard finds it a moment later.

type Variant = 'color' | 'string' | 'leaf';
// The art key pouch_red_moon is kept from the first draft; the picture now
// carries an embroidered green leaf instead of the yellow flower.
const OTHER_POUCH: Record<Variant, string> = { color: 'pouch_blue', string: 'pouch_red_bluestring', leaf: 'pouch_red_moon' };
// On the first lap through Petra's missions the pouches differ by color (the
// easy round); on later laps they differ by the tie-string or the flower/leaf.

const GROUND = 712; // feet line on the Treasury plaza
const BOY_H = 128;
// Heights follow the art checklist (boy = 1.0): adults 1.35, the girl 0.7, the pouch 0.18.
const GUARD = { x: 165, h: 173 };
const BESIDE_GUARD = 232;
const TRAVELER_X = { left: 62, right: 330 };
const TRAVELER_H = 173;
// Larger than the checklist's 0.18: anything he must touch is at least 44 points tall.
const POUCH_H = 44;
// Where the tie-string knot and the embroidered flower are on pouch_red (fractions,
// measured on the 710 x 768 art: knot near x 490, y 235; flower head near x 335, y 440).
const KNOT = { x: 0.69, y: 0.31 };
const FLOWER = { x: 0.47, y: 0.575 };

type State = 'find' | 'look' | 'toGuard' | 'wait' | 'give' | 'end';

interface Traveler {
  img: Phaser.GameObjects.Image;
  owner: boolean;
  bubble: Phaser.GameObjects.Container;
  x: number;
}

export class PouchScene extends BaseScene {
  private state: State = 'find';
  private boy!: Phaser.GameObjects.Image;
  private guard!: Phaser.GameObjects.Image;
  private pouch!: Phaser.GameObjects.Image;
  private pouchRing: Phaser.GameObjects.Image | null = null;
  private guardRing: Phaser.GameObjects.Image | null = null;
  private travelers: Traveler[] = [];
  private hint!: HintHand;
  private walkTimer?: Phaser.Time.TimerEvent;
  private dragging = false;
  private dragId = -1;
  private seen = { knot: false, flower: false };
  private closeUp: Phaser.GameObjects.Container | null = null;
  private variant: Variant = 'color';
  private detailSay = 0;
  private hintSaid = false;

  constructor() {
    super('p2');
  }

  create(): void {
    this.setup();
    this.state = 'find';
    this.travelers = [];
    this.pouchRing = this.guardRing = null;
    this.closeUp = null;
    this.dragging = false;
    this.dragId = -1;
    this.seen = { knot: false, flower: false };
    this.detailSay = 0;
    this.hintSaid = false;
    this.walkTimer = undefined;
    this.hint = new HintHand(this);
    this.variant = currentLap() === 0 ? 'color' : Math.random() < 0.5 ? 'string' : 'leaf';

    ui.setPill('البَتْرا');
    ui.setHome(() => this.goTo('map'));
    ui.clearBubble();
    music.play('petra');

    const bg = this.addCover('bg_petra_treasury');
    this.tweens.add({ targets: bg, scale: bg.scale * 1.01, duration: 9000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    motes(this, { x: 30, y: 200, w: 330, h: 450 }, 40, 0xffd27a);

    // The site guard stands in plain view the whole time.
    this.guard = this.add.image(GUARD.x, GROUND, 'guard_stand').setOrigin(0.5, 1).setDepth(30);
    fitHeight(this.guard, GUARD.h);
    this.breathe(this.guard);

    // Small variation on replay: the boy starts on either side, the pouch lies somewhere else.
    const boyRight = Math.random() < 0.5;
    this.boy = this.add.image(boyRight ? 318 : 52, GROUND + 6, 'boy_idle').setOrigin(0.5, 1).setDepth(32);
    fitHeight(this.boy, BOY_H);
    this.breathe(this.boy);

    const px = boyRight ? Phaser.Math.Between(70, 120) : Phaser.Math.Between(250, 320);
    this.pouch = this.add.image(px, GROUND + 4, 'pouch_red').setOrigin(0.5, 1).setDepth(31).setAngle(-12);
    fitHeight(this.pouch, POUCH_H);
    this.pouchRing = glowRing(this, px, GROUND - 8, 24, 29);

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.down(p));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.move(p));
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => this.up(p));
    this.input.on('pointerupoutside', (p: Phaser.Input.Pointer) => this.up(p));
    this.events.once('shutdown', () => this.hint.clear());

    this.time.addEvent({ delay: 8000, loop: true, callback: () => Math.random() < 0.6 && sfx('birds', { volume: 0.45 }) });
    // One opening line, then straight to what to do.
    void Voice.say('p2_open').then((ended) => {
      if (!ended || !this.alive || this.state !== 'find' || this.hintSaid) return;
      this.hintSaid = true;
      void Voice.say('p2_hint');
    });
    this.setIdle(() => this.showHint());
  }

  private breathe(img: Phaser.GameObjects.Image): void {
    this.tweens.add({ targets: img, scaleY: img.scaleY * 1.015, duration: 1500 + Math.random() * 400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  private setPose(key: string, h = BOY_H): void {
    this.tweens.killTweensOf(this.boy);
    this.boy.setTexture(key);
    fitHeight(this.boy, h);
    this.breathe(this.boy);
  }

  /** The boy walks to x with the two walking pictures, facing the way he goes. */
  private walkTo(x: number, ms?: number): Promise<void> {
    const from = this.boy.x;
    const dur = ms ?? Math.max(400, Math.abs(x - from) * 9);
    this.tweens.killTweensOf(this.boy);
    let a = true;
    this.boy.setTexture('boy_walk_a').setFlipX(x < from);
    fitHeight(this.boy, BOY_H);
    this.walkTimer?.remove();
    this.walkTimer = this.time.addEvent({
      delay: 170, loop: true,
      callback: () => {
        a = !a;
        this.boy.setTexture(a ? 'boy_walk_a' : 'boy_walk_b');
        fitHeight(this.boy, BOY_H);
        sfx('step', { volume: 0.5 });
      },
    });
    return new Promise((res) => this.tweens.add({
      targets: this.boy, x, duration: dur, ease: 'Sine.easeInOut',
      onComplete: () => {
        this.walkTimer?.remove();
        this.boy.setFlipX(false);
        res();
      },
    }));
  }

  /** Where the pouch sits when the boy holds it out (boy_offer: hands at his right). */
  private handPoint(): { x: number; y: number } {
    return { x: this.boy.x + 24, y: this.boy.y - BOY_H * 0.6 };
  }

  // ---------------------------------------------------------------- input

  private down(p: Phaser.Input.Pointer): void {
    if (!this.alive) return;
    this.hint.clear();
    const x = p.worldX, y = p.worldY;
    if (this.state === 'find') {
      if (Phaser.Math.Distance.Between(x, y, this.pouch.x, this.pouch.y - POUCH_H / 2) < 48) void this.pickUp();
    } else if (this.state === 'look') {
      this.tapDetail(x, y);
    } else if (this.state === 'toGuard') {
      const hitGuard = Math.abs(x - this.guard.x) < 50 && y > GROUND - GUARD.h - 10 && y < GROUND + 10;
      const hitPouch = Phaser.Math.Distance.Between(x, y, this.pouch.x, this.pouch.y) < 44;
      if (hitGuard || hitPouch) void this.goToGuard();
    } else if (this.state === 'give') {
      if (Phaser.Math.Distance.Between(x, y, this.pouch.x, this.pouch.y - POUCH_H / 2) < 50) {
        this.dragging = true;
        this.dragId = p.id;
        this.pouch.setDepth(70);
        this.tweens.killTweensOf(this.pouch);
        this.tweens.add({ targets: this.pouch, scale: this.pouch.scale * 1.25, duration: 160, ease: 'Back.easeOut' });
        sfx('grab', { volume: 0.6 });
      }
    }
  }

  private move(p: Phaser.Input.Pointer): void {
    if (!this.dragging || p.id !== this.dragId) return;
    const v = view();
    this.pouch.setPosition(Phaser.Math.Clamp(p.worldX, v.x + 10, v.right - 10), Phaser.Math.Clamp(p.worldY + 14, 300, 760));
  }

  private up(p: Phaser.Input.Pointer): void {
    if (!this.dragging || p.id !== this.dragId) return;
    this.dragging = false;
    this.dragId = -1;
    const t = this.travelers.find((tr) => Math.abs(this.pouch.x - tr.x) < 62 && this.pouch.y > GROUND - TRAVELER_H - 70 && this.pouch.y < GROUND + 30);
    if (t && t.owner) void this.returned(t);
    else {
      if (t) void this.notMine(t);
      this.backToHands();
    }
    this.kickIdle();
  }

  private backToHands(): void {
    const h = this.handPoint();
    sfx('slide', { volume: 0.6 });
    this.tweens.add({
      targets: this.pouch, x: h.x, y: h.y, scale: this.pouchScale(), duration: 380, ease: 'Back.easeOut',
      onComplete: () => this.pouch.setDepth(34),
    });
  }

  private pouchScale(): number {
    return POUCH_H / this.pouch.frame.height;
  }

  // ---------------------------------------------------------------- steps

  /** He walks to the pouch, kneels, picks it up, and looks closely. */
  private async pickUp(): Promise<void> {
    this.state = 'look';
    this.setIdle(null);
    this.pouchRing?.destroy();
    this.pouchRing = null;
    sfx('pop', { volume: 0.5 });
    const side = this.boy.x < this.pouch.x ? -1 : 1;
    await this.walkTo(this.pouch.x + side * 34);
    if (!this.alive) return;
    this.setPose('boy_kneel', BOY_H * 0.62);
    this.boy.setFlipX(side > 0);
    dustPuff(this, this.pouch.x, this.pouch.y - 4, 6, 0xd9b98a, 33);
    sfx('grab', { volume: 0.6 });
    await this.wait(500);
    if (!this.alive) return;
    this.openCloseUp();
  }

  /** A large view of the pouch: he looks at its tie-string and its flower. He does not open it. */
  private openCloseUp(): void {
    const v = view();
    const dim = this.add.rectangle(PIC.x, PIC.y, PIC.w, PIC.h, 0x2a1a0e, 0).setOrigin(0);
    const big = this.add.image(195, 400, 'pouch_red');
    fitHeight(big, 230);
    const w = big.frame.width * big.scale, h = big.frame.height * big.scale;
    const left = big.x - w / 2, top = big.y - h / 2;
    const knot = glowRing(this, left + w * KNOT.x, top + h * KNOT.y, 40, 0);
    const flower = glowRing(this, left + w * FLOWER.x, top + h * FLOWER.y, 48, 0);
    knot.setData('kind', 'knot');
    flower.setData('kind', 'flower');
    this.closeUp = this.add.container(0, 0, [dim, big, knot, flower]).setDepth(85).setAlpha(0);
    this.tweens.add({ targets: this.closeUp, alpha: 1, duration: 450 });
    this.tweens.add({ targets: dim, fillAlpha: 0.45, duration: 450 });
    big.setScale(big.scale * 0.6);
    this.tweens.add({ targets: big, scale: big.scale / 0.6, duration: 500, ease: 'Back.easeOut' });
    this.pouch.setVisible(false);
    void Voice.say('p2_look');
    this.setIdle(() => {
      const next = [knot, flower].find((r) => r.active && r.visible && !this.seen[r.getData('kind') as 'knot' | 'flower']);
      if (next) this.hint.show('tap', { x: next.x, y: next.y }, undefined, () => this.kickIdle());
    });
  }

  private tapDetail(x: number, y: number): void {
    if (!this.closeUp) return;
    // The nearest unseen detail within reach answers (the two are close together).
    let r: Phaser.GameObjects.Image | null = null;
    let best = 60;
    for (const o of this.closeUp.list) {
      if (!(o instanceof Phaser.GameObjects.Image) || !o.getData('kind')) continue;
      if (this.seen[o.getData('kind') as 'knot' | 'flower']) continue;
      const d = Phaser.Math.Distance.Between(x, y, o.x, o.y);
      if (d <= best) { best = d; r = o; }
    }
    if (r) {
      const ring = r;
      const kind = ring.getData('kind') as 'knot' | 'flower';
      this.seen[kind] = true;
      sfx('pop', { volume: 0.5 });
      this.tweens.add({ targets: ring, scale: ring.scale * 1.5, alpha: 0, duration: 500, onComplete: () => ring.setVisible(false) });
      // Close the view only after the last detail's line has finished.
      const n = ++this.detailSay;
      void Voice.say(kind === 'knot' ? 'p2_string' : 'p2_patch').then(() => {
        if (this.alive && n === this.detailSay && this.seen.knot && this.seen.flower && this.state === 'look') void this.closeCloseUp();
      });
    }
  }

  private async closeCloseUp(): Promise<void> {
    this.state = 'wait'; // nothing to tap while the view closes
    this.setIdle(null);
    const c = this.closeUp;
    this.closeUp = null;
    if (c) this.tweens.add({ targets: c, alpha: 0, duration: 400, onComplete: () => c.destroy() });
    await this.wait(300);
    if (!this.alive) return;
    // He stands holding the pouch out in both hands.
    this.setPose('boy_offer');
    this.boy.setFlipX(false);
    const h = this.handPoint();
    this.pouch.setVisible(true).setAngle(0).setPosition(h.x, h.y).setDepth(34);
    fitHeight(this.pouch, POUCH_H);
    // Only now may he tap the guard (a tap during the pose change froze the walk).
    this.state = 'toGuard';
    await Voice.say('p2_guard');
    if (!this.alive || this.state !== 'toGuard') return;
    this.guardRing = glowRing(this, this.guard.x, GROUND - GUARD.h * 0.45, 46, 29);
    this.setIdle(() => this.hint.show('tap', { x: this.guard.x, y: GROUND - GUARD.h * 0.5 }, undefined, () => this.kickIdle()));
  }

  /** He takes it to the guard and stays beside him. */
  private async goToGuard(): Promise<void> {
    this.state = 'wait';
    this.setIdle(null);
    this.guardRing?.destroy();
    this.guardRing = null;
    sfx('pop', { volume: 0.5 });
    this.pouch.setVisible(false);
    await this.walkTo(BESIDE_GUARD);
    if (!this.alive) return;
    this.setPose('boy_offer');
    const h = this.handPoint();
    this.pouch.setVisible(true).setPosition(h.x, h.y);
    this.tweens.add({ targets: this.guard, angle: { from: -3, to: 0 }, duration: 500, ease: 'Sine.easeOut' });
    await Voice.say('p2_guard_wait');
    if (!this.alive) return;
    await this.travelersArrive();
  }

  /** Two travelers come, each thinking of the pouch he lost. */
  private async travelersArrive(): Promise<void> {
    const ownerLeft = Math.random() < 0.5;
    const v = view();
    const make = (side: 'left' | 'right', owner: boolean) => {
      const x = TRAVELER_X[side];
      const key = owner ? 'traveler_worried' : 'traveler_b';
      const img = this.add.image(side === 'left' ? v.x - 60 : v.right + 60, GROUND, key).setOrigin(0.5, 1).setDepth(30);
      fitHeight(img, TRAVELER_H);
      // Each looks toward the middle: traveler_worried faces left, traveler_b faces right.
      img.setFlipX(owner ? side === 'left' : side === 'right');
      const bubble = this.thoughtBubble(x, GROUND - TRAVELER_H - 46, owner ? 'pouch_red' : OTHER_POUCH[this.variant], side);
      const t: Traveler = { img, owner, bubble, x };
      this.travelers.push(t);
      return t;
    };
    const ts = [make('left', ownerLeft), make('right', !ownerLeft)];
    const steps = this.time.addEvent({ delay: 380, loop: true, callback: () => sfx('step', { volume: 0.4 }) });
    await Promise.all(ts.map((t, i) => new Promise<void>((res) => {
      this.tweens.add({ targets: t.img, angle: { from: -2, to: 2 }, duration: 260, yoyo: true, repeat: 4 });
      this.tweens.add({ targets: t.img, x: t.x, duration: 1800, delay: i * 300, ease: 'Sine.easeOut', onComplete: () => { t.img.setAngle(0); res(); } });
    })));
    steps.remove();
    if (!this.alive) return;
    for (const t of ts) this.breathe(t.img); // never perfectly still once they stand
    for (const t of ts) this.tweens.add({ targets: t.bubble, alpha: 1, scale: { from: 0.4, to: 1 }, duration: 450, ease: 'Back.easeOut' });
    sfx('pop', { volume: 0.5 });
    // He can give it while the father speaks.
    void Voice.say('p2_match');
    this.state = 'give';
    this.setIdle(() => {
      const owner = this.travelers.find((t) => t.owner);
      if (owner) this.hint.show('drag', { x: this.pouch.x, y: this.pouch.y - 8 }, { x: owner.x, y: GROUND - TRAVELER_H * 0.5 }, () => this.kickIdle());
    });
  }

  /** A white thought bubble (interface chrome drawn in code) with a picture of a pouch. */
  private thoughtBubble(x: number, y: number, pouchKey: string, side: 'left' | 'right'): Phaser.GameObjects.Container {
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 0.97);
    g.lineStyle(3, 0x4a2c17, 1);
    g.strokeEllipse(0, 0, 84, 70);
    g.fillEllipse(0, 0, 84, 70);
    const tail = side === 'left' ? 1 : -1;
    for (const [dx, dy, r] of [[tail * 12, 40, 7], [tail * 4, 52, 4.5]] as const) {
      g.strokeCircle(dx, dy, r);
      g.fillCircle(dx, dy, r);
    }
    const img = this.add.image(0, 2, pouchKey);
    fitHeight(img, 50);
    const c = this.add.container(x, y, [g, img]).setDepth(50).setAlpha(0);
    this.tweens.add({ targets: c, y: y - 4, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    return c;
  }

  /** Not his: he shakes his head kindly. He is not lying; he lost a different pouch. */
  private async notMine(t: Traveler): Promise<void> {
    this.tweens.add({ targets: t.img, angle: { from: -4, to: 4 }, duration: 120, yoyo: true, repeat: 2, onComplete: () => t.img.setAngle(0) });
    this.tweens.add({ targets: t.bubble, scale: { from: 1.15, to: 1 }, duration: 400, ease: 'Back.easeOut' });
    await Voice.say('p2_notmine');
  }

  /** The pouch goes back to its owner. */
  private async returned(t: Traveler): Promise<void> {
    this.state = 'end';
    this.setIdle(null);
    this.hint.clear();
    this.tweens.add({
      targets: this.pouch, x: t.x + (t.x < 195 ? 14 : -14), y: GROUND - TRAVELER_H * 0.48, scale: this.pouchScale(), duration: 360, ease: 'Sine.easeOut',
      onComplete: () => this.pouch.setVisible(false),
    });
    sfx('grab', { volume: 0.6 });
    this.setPose('boy_idle');
    await this.wait(380);
    if (!this.alive) return;
    // Relief: the worried traveler becomes the happy one, his water money back.
    this.tweens.killTweensOf(t.img);
    t.img.setTexture('traveler_happy');
    fitHeight(t.img, TRAVELER_H);
    this.breathe(t.img);
    t.img.setFlipX(t.x > 195); // traveler_happy faces right
    this.tweens.add({ targets: t.bubble, alpha: 0, scale: 0.5, duration: 300 });
    this.tweens.add({ targets: t.img, y: GROUND - 8, duration: 200, yoyo: true, ease: 'Sine.easeOut' });
    // The story's consequence is done: the place counts even if he taps home now.
    completeMission('petra');
    await Voice.say('p2_relief');
    if (!this.alive) return;
    await this.otherFound();
    if (!this.alive) return;
    await this.rideOn(t);
  }

  /** A moment later the guard finds the other traveler's pouch. */
  private async otherFound(): Promise<void> {
    const other = this.travelers.find((x) => !x.owner);
    if (!other) return;
    const spot = { x: this.guard.x - 26, y: GROUND + 4 };
    const found = this.add.image(spot.x, spot.y, OTHER_POUCH[this.variant]).setOrigin(0.5, 1).setDepth(31).setAngle(14);
    fitHeight(found, POUCH_H);
    this.tweens.add({ targets: this.guard, angle: -6, duration: 350, yoyo: true, hold: 300 });
    dustPuff(this, spot.x, spot.y - 4, 6, 0xd9b98a, 32);
    await this.wait(700);
    if (!this.alive) return;
    this.tweens.add({ targets: found, x: other.x + (other.x < 195 ? 14 : -14), y: GROUND - TRAVELER_H * 0.48, angle: 0, duration: 700, ease: 'Sine.easeInOut', onComplete: () => found.setVisible(false) });
    this.tweens.add({ targets: other.bubble, alpha: 0, scale: 0.5, duration: 300, delay: 600 });
    // His line plays while he turns to go: no wait with nothing happening.
    const said = Voice.say('p2_found_other');
    await this.wait(900);
    if (!this.alive) return;
    // He thanks the guard with a nod and goes on his way.
    const outX = other.x < 195 ? view().x - 80 : view().right + 80;
    other.img.setFlipX(outX < other.x); // traveler_b faces right; flipped, he walks left
    this.tweens.add({ targets: other.img, angle: { from: -2, to: 2 }, duration: 260, yoyo: true, repeat: 6 });
    this.tweens.add({ targets: other.img, x: outX, duration: 2600, ease: 'Sine.easeIn' });
    await said; // his line is never cut by the next one
  }

  /** His daughter runs to him, and they go on their way. */
  private async rideOn(t: Traveler): Promise<void> {
    const v = view();
    const fromRight = t.x > 195;
    const girl = this.add.image(fromRight ? v.right + 40 : v.x - 40, GROUND + 4, 'girl_happy').setOrigin(0.5, 1).setDepth(31);
    fitHeight(girl, BOY_H * 0.7);
    girl.setFlipX(fromRight); // girl_happy runs to the right
    this.tweens.add({ targets: girl, angle: { from: -3, to: 3 }, duration: 200, yoyo: true, repeat: 5 });
    await new Promise<void>((res) => this.tweens.add({ targets: girl, x: t.x + (fromRight ? 36 : -36), duration: 1300, ease: 'Sine.easeOut', onComplete: () => res() }));
    if (!this.alive) return;
    const said = Voice.say('p2_end');
    await this.wait(1500);
    if (!this.alive) return;
    // Together they walk off toward the Siq.
    const out = fromRight ? v.right + 90 : v.x - 90;
    t.img.setFlipX(out < t.x);
    girl.setFlipX(out < t.x);
    for (const img of [t.img, girl]) {
      this.tweens.add({ targets: img, angle: { from: -2, to: 2 }, duration: 280, yoyo: true, repeat: 9 });
      this.tweens.add({ targets: img, x: out + (img === girl ? (fromRight ? 30 : -30) : 0), duration: 3200, ease: 'Sine.easeIn' });
    }
    this.setPose('boy_happy');
    await Promise.all([said, this.wait(1800)]);
    if (!this.alive) return;
    await this.finishAdventure('petra', 'p2_hadith');
  }

  // ---------------------------------------------------------------- hints

  private showHint(): void {
    if (!this.alive) return;
    if (this.state === 'find') {
      this.hint.show('tap', { x: this.pouch.x, y: this.pouch.y - 10 }, undefined, () => this.kickIdle());
      if (!this.hintSaid && !Voice.busy) {
        this.hintSaid = true;
        void Voice.say('p2_hint');
      }
    }
  }
}
