import Phaser from 'phaser';
import { fitHeight, fitWidth } from '../../core/assets';
import { glowRing, HintHand, motes } from '../../core/fx';
import { music } from '../../core/music';
import { currentLap } from '../../core/session';
import { sfx } from '../../core/sfx';
import { ui } from '../../core/ui';
import { PIC, view } from '../../core/viewport';
import { Voice } from '../../core/voice';
import { BaseScene, type FreeTarget } from '../BaseScene';
import { breathe, CupPour, freeHop, freeRipple, freeWiggle, pose, stopBreathing } from '../kit';

// D3. The Dead Sea: walking with Grandfather (value: honoring the elderly;
// source tirmidhi_1920). MISSIONS_V2.md section 5.
// Baba supports Grandfather's arm; the boy walks beside them carrying
// Grandfather's small bag. Hold to walk, let go to wait. If he runs ahead,
// nothing bad happens: he turns and comes back. Three small stones lie on the
// path; he moves them aside before Grandfather reaches them. At the bench he
// pours Grandfather a cup of water, and Grandfather rests his hand on his head.
// Safeguards: the adult gives the physical support; they keep to the made path.

// Measured on bg_deadsea_shore (world units): the paved path starts at y = 562
// and fills the rest of the picture; the sand and salt lie above it.
const PAIR = { foot: 676, h: 150 * 1.4, startX: 36, stopX: 196 };
const BOY = { foot: 714, h: 150 };
const STONE_Y = 682;
// Pebbles at least 44 points tall: he must touch them (larger than the checklist).
const STONE_H = 44;
// The boy walks just ahead of the two men, never over them: his center stays at
// least this far ahead of theirs (their picture is about 155 wide, his about 80).
const MIN_AHEAD = 116;
// At the bench: it stands a little back so Grandfather's hand, held out at
// child-head height, comes to rest on the boy's head.
const BENCH = { x: 222, foot: 656, w: 150 * 1.1, h: 150 * 0.45 };
const SEAT_Y = BENCH.foot - BENCH.h * 0.45;
const GRANDPA = { x: 246, h: 150 * 0.95 };
const BABA = { x: 170, h: 150 * 0.95 };
// grandpa_sit holds his free hand out at (0.95, 0.35) of the picture.
const HAND = { x: 0.95, y: 0.35 };
const CLOSE = { x: 195, y: 430 };

type State = 'intro' | 'walk' | 'pour' | 'give' | 'end';

interface Stone { img: Phaser.GameObjects.Image; moved: boolean }

export class WalkScene extends BaseScene {
  private state: State = 'intro';
  private pair!: Phaser.GameObjects.Image;
  private pairBob: Phaser.Tweens.Tween | null = null;
  private boy!: Phaser.GameObjects.Image;
  private bag!: Phaser.GameObjects.Image;
  private stones: Stone[] = [];
  private holdId = -1;
  private walkFrame = 0;
  private walkT = 0;
  private stepT = 0;
  private turning = false;
  private waitSaid = false;
  private stoneSaid = false;
  private moving: Stone | null = null;
  private pairSpeed = 20;
  private dim!: Phaser.GameObjects.Rectangle;
  private pour: CupPour | null = null;
  private pourId = -1;
  private grandpa: Phaser.GameObjects.Image | null = null;
  private cup: Phaser.GameObjects.Image | null = null;
  private cupHome = { x: 0, y: 0 };
  private cupId = -1;
  private ring: Phaser.GameObjects.Image | null = null;
  private hint!: HintHand;

  constructor() {
    super('d3');
  }

  create(): void {
    this.setup();
    this.state = 'intro';
    this.stones = [];
    this.holdId = this.pourId = this.cupId = -1;
    this.walkFrame = this.walkT = this.stepT = 0;
    this.turning = this.waitSaid = this.stoneSaid = false;
    this.moving = this.pour = this.grandpa = this.cup = this.ring = null;
    this.pairBob = null;
    this.hint = new HintHand(this);
    const lap = currentLap();
    // First lap: a slow walk with the stones spread out. Later: a little quicker, the stones closer.
    this.pairSpeed = lap ? 25 : 19;

    ui.setPill('البَحْر المَيِّت');
    ui.setHome(() => this.goTo('map'));
    ui.clearBubble();
    music.play('deadsea');

    this.addCover('bg_deadsea_shore');
    motes(this, { x: 20, y: 200, w: 350, h: 420 }, 40);

    // Far enough along that he reaches the first one at once; a little closer together on a later lap.
    const xs = lap ? [214, 262, 310] : [214, 270, 326];
    for (const x of xs) {
      const img = this.add.image(x + Phaser.Math.Between(-6, 6), STONE_Y + Phaser.Math.Between(-3, 3), 'rock_a').setOrigin(0.5, 1).setDepth(40);
      fitHeight(img, STONE_H);
      this.stones.push({ img, moved: false });
    }

    // Baba and Grandfather, together in one picture, facing right.
    this.pair = this.add.image(PAIR.startX, PAIR.foot, 'grandpa_baba_walk').setOrigin(0.5, 1).setDepth(45);
    fitHeight(this.pair, PAIR.h);
    this.boy = this.add.image(PAIR.startX + MIN_AHEAD, BOY.foot, 'boy_walk_a').setOrigin(0.5, 1).setDepth(60);
    fitHeight(this.boy, BOY.h);
    this.bag = this.add.image(0, 0, 'bag_small').setOrigin(0.5, 0.2).setDepth(61);
    fitHeight(this.bag, 150 * 0.2);
    this.placeBag();

    this.dim = this.add.rectangle(PIC.x, PIC.y, PIC.w, PIC.h, 0x2a1a0e, 0).setOrigin(0).setDepth(85);

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.down(p));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.move(p));
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => this.up(p));
    this.input.on('pointerupoutside', (p: Phaser.Input.Pointer) => this.up(p));
    this.events.once('shutdown', () => this.hint.clear());
    void this.intro();
  }

  /** The bag hangs from his hand, on the side nearer the viewer. */
  private placeBag(): void {
    this.bag.setPosition(this.boy.x + (this.boy.flipX ? -14 : 14), this.boy.y - BOY.h * 0.5);
  }

  /** Where Grandfather's feet are (he walks on the right of the picture). */
  private grandpaFront(): number {
    return this.pair.x + this.pair.displayWidth * 0.36;
  }

  private async intro(): Promise<void> {
    this.pairBob = this.tweens.add({ targets: this.pair, y: PAIR.foot - 3, duration: 380, yoyo: true, repeat: -1, paused: true });
    this.state = 'walk';
    this.setIdle(() => this.showHint());
    this.open('d3_open', 'd3_hint');
  }

  update(_t: number, dt: number): void {
    if (this.state === 'pour' && this.pour) {
      if (this.pour.update(dt, 2600)) {
        this.pourId = -1;
        void this.poured();
      }
      return;
    }
    if (this.state !== 'walk') return;
    const s = dt / 1000;
    // Grandfather and Baba walk on slowly, and wait before a stone still on the path.
    const blocker = this.stones.find((x) => !x.moved && x.img.x > this.grandpaFront() - 4 && x.img.x - this.grandpaFront() < 26);
    // They also wait while he is right in front of them: he never walks over them.
    const pairMoves = !blocker && this.pair.x < PAIR.stopX && this.boy.x - this.pair.x > MIN_AHEAD + 2;
    if (pairMoves) this.pair.x = Math.min(PAIR.stopX, this.pair.x + this.pairSpeed * s);
    if (this.pairBob) {
      if (pairMoves && this.pairBob.isPaused()) {
        stopBreathing(this, this.pair);
        fitHeight(this.pair, PAIR.h);
        this.pairBob.resume();
      }
      else if (!pairMoves && !this.pairBob.isPaused()) {
        // Waiting, they are never perfectly still.
        this.pairBob.pause();
        this.pair.y = PAIR.foot;
        breathe(this, this.pair, 0.01);
      }
    }
    if (blocker && !this.stoneSaid) {
      this.stoneSaid = true;
      void Voice.say('d3_stone');
    }
    // The boy walks while he is held; he is quicker than Grandfather.
    const ahead = this.boy.x - this.pair.x;
    let boyMoves = false;
    if (this.turning) {
      boyMoves = true;
      this.boy.setFlipX(true);
      this.boy.x -= 80 * s;
      if (ahead <= MIN_AHEAD + 20) this.turning = false;
    } else if (this.holdId !== -1 && !this.moving) {
      // He stops just before a stone still on the path (so it stays in sight, in front of him).
      const next = this.stones.filter((x) => !x.moved).sort((a, b) => a.img.x - b.img.x)[0];
      const limit = next ? next.img.x - 58 : 352;
      boyMoves = this.boy.x < limit - 0.5;
      this.boy.setFlipX(false);
      // Only ever forward: never back over the two men.
      if (boyMoves) this.boy.x = Math.min(limit, this.boy.x + 66 * s);
      if (!boyMoves && next && !this.stoneSaid) {
        this.stoneSaid = true;
        void Voice.say('d3_stone');
      }
      if (ahead > MIN_AHEAD + 110) {
        // He has run ahead: nothing bad happens. He turns and comes back.
        this.turning = true;
        if (!this.waitSaid) {
          this.waitSaid = true;
          void Voice.say('d3_wait');
        }
      }
    }
    if (!this.moving) this.animateBoy(boyMoves, dt);
    this.placeBag();
    if (this.pair.x >= PAIR.stopX && this.stones.every((x) => x.moved) && !this.moving) void this.arrive();
  }

  private animateBoy(moves: boolean, dt: number): void {
    if (!moves) {
      if (this.boy.texture.key !== 'boy_idle') {
        pose(this, this.boy, 'boy_idle', BOY.h); // standing, he breathes
        if (!this.turning) this.boy.setFlipX(false);
      }
      return;
    }
    this.walkT += dt;
    if (this.walkT > 170 || this.boy.texture.key === 'boy_idle') {
      if (this.boy.texture.key === 'boy_idle') stopBreathing(this, this.boy);
      this.walkT = 0;
      this.walkFrame ^= 1;
      this.boy.setTexture(this.walkFrame ? 'boy_walk_b' : 'boy_walk_a');
      fitHeight(this.boy, BOY.h);
      this.stepT++;
      if (this.stepT % 2 === 0) sfx('step', { volume: 0.4 });
    }
  }

  // ---------------------------------------------------------------- input

  private down(p: Phaser.Input.Pointer): void {
    if (!this.alive) return;
    this.hint.clear();
    const x = p.worldX, y = p.worldY;
    if (this.state === 'walk') {
      // Only the nearest stone still on the path can be moved: he never walks past one.
      const nearest = this.stones.filter((st) => !st.moved).sort((a, b) => a.img.x - b.img.x)[0];
      const stone = nearest && Phaser.Math.Distance.Between(x, y, nearest.img.x, nearest.img.y - 20) < 36 ? nearest : undefined;
      if (stone && !this.moving) {
        void this.moveStone(stone);
        return;
      }
      this.holdId = p.id;
    } else if (this.state === 'pour' && this.pour && this.pourId === -1 && this.pour.hit(x, y)) {
      this.pourId = p.id;
      this.pour.press();
    } else if (this.state === 'give' && this.cup && Phaser.Math.Distance.Between(x, y, this.cup.x, this.cup.y - 14) < 36) {
      this.cupId = p.id;
      this.cup.setDepth(70);
      sfx('grab', { volume: 0.6 });
    }
  }

  private move(p: Phaser.Input.Pointer): void {
    if (this.cup && p.id === this.cupId) this.cup.setPosition(p.worldX, Phaser.Math.Clamp(p.worldY + 12, 540, 712));
  }

  private up(p: Phaser.Input.Pointer): void {
    if (p.id === this.holdId) this.holdId = -1;
    else if (p.id === this.pourId && this.pour) {
      this.pourId = -1;
      this.pour.release();
      if (this.pour.fill >= this.pour.target - 0.1) void this.poured();
      else if (this.pour.fill > 0.05) void Voice.say('j3_more');
    } else if (p.id === this.cupId && this.cup && this.grandpa) {
      this.cupId = -1;
      const c = this.cup;
      if (Math.abs(c.x - this.grandpa.x) < 56 && c.y > SEAT_Y - GRANDPA.h) void this.drink();
      else {
        sfx('slide', { volume: 0.4 });
        this.tweens.add({ targets: c, x: this.cupHome.x, y: this.cupHome.y, duration: 300, onComplete: () => c.setDepth(62) });
      }
    }
    this.kickIdle();
  }

  /** He steps to the stone and moves it off the path, onto the sand. */
  private async moveStone(st: Stone): Promise<void> {
    this.moving = st;
    this.holdId = -1;
    const to = Math.max(st.img.x - 50, this.pair.x + MIN_AHEAD);
    const dir = to < this.boy.x ? -1 : 1;
    this.boy.setFlipX(dir < 0);
    const steps = this.time.addEvent({ delay: 170, loop: true, callback: () => {
      this.walkFrame ^= 1;
      this.boy.setTexture(this.walkFrame ? 'boy_walk_b' : 'boy_walk_a');
      fitHeight(this.boy, BOY.h);
    } });
    await new Promise<void>((res) => this.tweens.add({ targets: this.boy, x: to, duration: Math.max(250, Math.abs(to - this.boy.x) * 9), onUpdate: () => this.placeBag(), onComplete: () => res() }));
    steps.remove();
    if (!this.alive) return;
    this.boy.setFlipX(false);
    pose(this, this.boy, 'boy_lift', BOY.h * 0.8);
    this.placeBag();
    sfx('slide', { volume: 0.6 });
    st.moved = true;
    await new Promise<void>((res) => this.tweens.add({ targets: st.img, x: st.img.x + 8, y: 560, angle: 140, duration: 520, ease: 'Sine.easeOut', onComplete: () => res() }));
    if (!this.alive) return;
    st.img.setDepth(20);
    sfx('thud', { weight: 0.1, volume: 0.5 });
    sfx('chime', { volume: 0.35 });
    this.tweens.killTweensOf(this.boy);
    pose(this, this.boy, 'boy_idle', BOY.h);
    this.moving = null;
  }

  // ---------------------------------------------------------------- at the bench

  private async arrive(): Promise<void> {
    this.state = 'end';
    this.setIdle(null);
    this.pairBob?.stop();
    // The bench; Grandfather sits down and Baba beside him.
    const bench = this.add.image(BENCH.x, BENCH.foot, 'bench').setOrigin(0.5, 1).setDepth(30).setAlpha(0);
    fitWidth(bench, BENCH.w);
    const grandpa = this.add.image(GRANDPA.x, SEAT_Y + GRANDPA.h * 0.3, 'grandpa_sit').setOrigin(0.5, 1).setDepth(31).setAlpha(0);
    fitHeight(grandpa, GRANDPA.h);
    const baba = this.add.image(BABA.x, SEAT_Y + BABA.h * 0.3, 'baba_sit').setOrigin(0.5, 1).setDepth(31).setAlpha(0);
    fitHeight(baba, BABA.h);
    this.tweens.add({ targets: this.pair, alpha: 0, duration: 600 });
    this.tweens.add({ targets: [bench, grandpa, baba], alpha: 1, duration: 600 });
    this.grandpa = grandpa;
    // The boy comes to stand by Grandfather and sets the bag down.
    this.boy.setFlipX(false);
    stopBreathing(this, this.boy);
    let f = 0;
    const frames = this.time.addEvent({ delay: 170, loop: true, callback: () => { f ^= 1; this.boy.setTexture(f ? 'boy_walk_b' : 'boy_walk_a'); fitHeight(this.boy, BOY.h); sfx('step', { volume: 0.35 }); } });
    await new Promise<void>((res) => this.tweens.add({ targets: this.boy, x: 330, duration: Math.max(300, Math.abs(330 - this.boy.x) * 9), onUpdate: () => this.placeBag(), onComplete: () => res() }));
    frames.remove();
    if (!this.alive) return;
    pose(this, this.boy, 'boy_idle', BOY.h);
    this.tweens.add({ targets: this.bag, x: 356, y: BOY.foot - 24, duration: 300 });
    breathe(this, grandpa, 0.01);
    breathe(this, baba, 0.01);
    await Voice.say('d3_water');
    if (!this.alive) return;
    this.state = 'pour';
    this.pour = new CupPour(this, CLOSE.x - 20, CLOSE.y, 200, 0.7, this.dim);
    this.setIdle(() => this.showHint());
  }

  private async poured(): Promise<void> {
    if (this.state !== 'pour') return;
    this.state = 'end';
    this.setIdle(null);
    sfx('chime', { volume: 0.4 });
    await this.wait(600);
    if (!this.alive) return;
    await this.pour?.close();
    this.pour = null;
    if (!this.alive || !this.grandpa) return;
    // The cup, by the boy, to hand to Grandfather.
    this.cupHome = { x: 312, y: 690 };
    this.cup = this.add.image(this.cupHome.x, this.cupHome.y, 'cup_full').setOrigin(0.5, 1).setDepth(62);
    fitHeight(this.cup, 44); // he hands it over: at least 44 points tall
    this.ring = glowRing(this, this.grandpa.x, SEAT_Y - GRANDPA.h * 0.2, 40, 29);
    this.state = 'give';
    this.setIdle(() => this.showHint());
  }

  private async drink(): Promise<void> {
    const g = this.grandpa;
    const c = this.cup;
    if (!g || !c) return;
    this.state = 'end';
    this.setIdle(null);
    this.ring?.destroy();
    this.ring = null;
    sfx('pop', { volume: 0.5 });
    this.tweens.add({ targets: c, x: g.x + 14, y: SEAT_Y - 8, duration: 300 });
    await this.wait(900);
    if (!this.alive) return;
    this.tweens.add({ targets: c, alpha: 0, duration: 500 });
    // Grandfather's hand comes to rest on the boy's head.
    const handX = g.x - g.displayWidth / 2 + g.displayWidth * HAND.x;
    const handY = g.y - g.displayHeight + g.displayHeight * HAND.y;
    this.tweens.add({ targets: this.bag, alpha: 0, duration: 300 });
    // He stands beside Grandfather's knee, just behind his hand: the hand is drawn over his head.
    this.boy.setDepth(30.5); // in front of the bench, behind Grandfather (31)
    this.tweens.add({ targets: this.boy, angle: { from: -2, to: 2 }, duration: 150, yoyo: true, repeat: 1, onComplete: () => this.boy.setAngle(0) }); // a step or two
    await new Promise<void>((res) => this.tweens.add({ targets: this.boy, x: handX + 6, y: handY + BOY.h - 4, duration: 600, ease: 'Sine.easeInOut', onComplete: () => res() }));
    if (!this.alive) return;
    pose(this, this.boy, 'boy_happy', BOY.h);
    await Voice.say('d3_grandpa');
    if (!this.alive) return;
    await Voice.say('d3_end');
    if (!this.alive) return;
    await this.finishAdventure('deadsea', 'd3_hadith');
  }

  /**
   * Free time at the bench: the sea ripples where he touches it, Baba nods, and
   * the boy gives a small hop under Grandfather's hand.
   */
  protected freeTargets(): FreeTarget[] {
    const t: FreeTarget[] = [];
    const sea = this.children.list.find((o): o is Phaser.GameObjects.Image => o instanceof Phaser.GameObjects.Image && o.texture.key === 'bg_deadsea_shore');
    if (sea) t.push({ obj: sea, area: () => this.seaArea(), react: () => this.rippleAt(this.seaArea()) });
    const baba = this.children.list.find((o): o is Phaser.GameObjects.Image => o instanceof Phaser.GameObjects.Image && o.texture.key === 'baba_sit');
    if (baba) t.push({ obj: baba, react: () => freeWiggle(this, baba, 'rustle', 3, 0.25) });
    t.push({ obj: this.boy, react: () => freeHop(this, this.boy, 'step', 6) });
    return t;
  }

  /** The open water, well above the path and the bench, inside the frame. */
  private seaArea(): Phaser.Geom.Rectangle {
    const v = view();
    const x = Math.max(v.x, 0) + 20, right = Math.min(v.right, 390) - 20;
    return new Phaser.Geom.Rectangle(x, 290, right - x, 115);
  }

  /** Two soft rings on the water where he touched it. */
  private rippleAt(r: Phaser.Geom.Rectangle): number {
    const p = this.input.activePointer;
    return freeRipple(this, Phaser.Math.Clamp(p.worldX, r.x, r.right), Phaser.Math.Clamp(p.worldY, r.y, r.bottom), 5, 0.3);
  }

  private showHint(): void {
    if (!this.alive) return;
    const again = () => this.kickIdle();
    if (this.holdId !== -1 || this.pourId !== -1 || this.cupId !== -1 || this.moving) return again();
    if (this.state === 'walk') {
      const st = this.stones.find((x) => !x.moved);
      if (st && this.boy.x >= st.img.x - 64) this.hint.show('tap', { x: st.img.x, y: st.img.y - 20 }, undefined, again);
      else this.hint.show('hold', { x: this.boy.x + 40, y: 600 }, { x: this.boy.x + 40, y: 600 }, again);
    } else if (this.state === 'pour') {
      this.hint.show('hold', { x: CLOSE.x + 120, y: CLOSE.y - 90 }, { x: CLOSE.x + 120, y: CLOSE.y - 90 }, again);
    } else if (this.state === 'give' && this.cup && this.grandpa) {
      this.hint.show('drag', { x: this.cup.x, y: this.cup.y - 14 }, { x: this.grandpa.x, y: SEAT_Y - 30 }, again);
    } else again();
  }
}
