import Phaser from 'phaser';
import { fitHeight } from '../../core/assets';
import { glowRing, HintHand, motes } from '../../core/fx';
import { music } from '../../core/music';
import { completeMission, currentLap } from '../../core/session';
import { sfx } from '../../core/sfx';
import { ui } from '../../core/ui';
import { Voice } from '../../core/voice';
import { BaseScene } from '../BaseScene';
import { breathe, pose, stopBreathing } from '../kit';

// A3. Amman: Mama's shopping (value: kindness to parents, noticing without
// being asked; source quran_17_23). MISSIONS_V2.md section 5.
// Mama stands at the bottom of the stairs with her bags. Nobody asks him: he
// taps the bags to offer, takes the two light ones (the heavy one stays with
// Mama) and climbs by tapping left and right in step. Rest on the landing;
// higher up the steps are narrower and a cat sleeps on one, so he steps around
// it. Mama reaches the top with her hands free and her breath back.

// Measured on bg_amman_stairs: the lower flight rises from the bottom left to a
// landing at about y = 488; the narrower upper flight climbs on to the top right.
const START = { x: 150, y: 722 };
const LANDING = { x: 262, y: 488 };
const UPPER = { from: { x: 342, y: 462 }, to: { x: 358, y: 312 } };
const MAMA = { x: 70, y: 716 };
const BOY_H = 150;
const MAMA_H = BOY_H * 1.3; // art checklist
// Things farther up the stairs are farther away: smaller.
const depthScale = (y: number) => Phaser.Math.Linear(0.62, 1, Phaser.Math.Clamp((y - 300) / (722 - 300), 0, 1));

type State = 'intro' | 'offer' | 'climb' | 'rest' | 'end';
type Foot = 'left' | 'right';

interface Step { x: number; y: number; cat?: boolean }

export class StairsScene extends BaseScene {
  private state: State = 'intro';
  private boy!: Phaser.GameObjects.Image;
  private mama!: Phaser.GameObjects.Image;
  private bags: Phaser.GameObjects.Image[] = [];
  private heavy!: Phaser.GameObjects.Image;
  private cat: Phaser.GameObjects.Image | null = null;
  private steps: Step[] = [];
  private at = 0; // index of the step he stands on
  private landingAt = 0;
  private next: Foot = 'right';
  private rings: Record<Foot, Phaser.GameObjects.Image> | null = null;
  private moving = false;
  private hint!: HintHand;
  private catSaid = false;

  constructor() {
    super('a3');
  }

  create(): void {
    this.setup();
    this.state = 'intro';
    this.bags = [];
    this.cat = null;
    this.rings = null;
    this.at = 0;
    this.next = 'right';
    this.moving = false;
    this.catSaid = false;
    this.hint = new HintHand(this);
    this.buildPath(currentLap());

    ui.setPill('عَمّان');
    ui.setHome(() => this.goTo('map'));
    ui.clearBubble();
    music.play('amman');

    const bg = this.addCover('bg_amman_stairs');
    this.tweens.add({ targets: bg, scale: bg.scale * 1.01, duration: 9000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    motes(this, { x: 20, y: 160, w: 350, h: 480 }, 40);

    // The cat asleep on a step of the upper flight (on its right side).
    const c = this.steps.find((s) => s.cat) as Step;
    this.cat = this.add.image(c.x + 16, c.y + 2, 'cat_sleeping').setOrigin(0.5, 1).setDepth(25);
    fitHeight(this.cat, BOY_H * 0.2 * depthScale(c.y));
    this.tweens.add({ targets: this.cat, scaleY: this.cat.scaleY * 1.04, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    this.mama = this.add.image(MAMA.x, MAMA.y, 'mama_bags').setOrigin(0.5, 1).setDepth(30);
    fitHeight(this.mama, MAMA_H);
    breathe(this, this.mama);
    // Two light bags at her feet; she holds the heavy one.
    for (const dx of [44, 72]) {
      const b = this.add.image(MAMA.x + dx, MAMA.y + 2, 'bag_light').setOrigin(0.5, 1).setDepth(31);
      fitHeight(b, BOY_H * 0.3); // he takes them: at least 44 points tall
      this.bags.push(b);
    }
    this.heavy = this.add.image(MAMA.x + 4, MAMA.y - MAMA_H * 0.18, 'bag_heavy').setOrigin(0.5, 1).setDepth(32).setVisible(false);
    fitHeight(this.heavy, BOY_H * 0.35);

    this.boy = this.add.image(START.x + 30, START.y, 'boy_idle').setOrigin(0.5, 1).setDepth(33);
    fitHeight(this.boy, BOY_H);
    breathe(this, this.boy);

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.down(p));
    this.events.once('shutdown', () => this.hint.clear());
    this.time.addEvent({ delay: 8000, loop: true, callback: () => Math.random() < 0.6 && sfx('birds', { volume: 0.4 }) });

    void this.intro();
  }

  /** The steps he climbs: the lower flight, the landing, the narrower upper flight. */
  private buildPath(lap: 0 | 1): void {
    const lower = lap ? 10 : 8, upper = lap ? 7 : 5;
    this.steps = [{ ...START }];
    for (let i = 1; i <= lower; i++) {
      const k = i / lower;
      this.steps.push({ x: Phaser.Math.Linear(START.x, LANDING.x - 40, k), y: Phaser.Math.Linear(START.y, LANDING.y, k) });
    }
    this.steps.push({ ...LANDING });
    this.landingAt = this.steps.length - 1;
    for (let i = 0; i <= upper; i++) {
      const k = i / upper;
      this.steps.push({ x: Phaser.Math.Linear(UPPER.from.x, UPPER.to.x, k), y: Phaser.Math.Linear(UPPER.from.y, UPPER.to.y, k), cat: i === 2 });
    }
  }

  private async intro(): Promise<void> {
    // Nobody asks him: the father only says what he sees.
    this.state = 'offer';
    this.open('a3_open');
    // Nobody asks him: the hint hand waits a while before showing the bags, but
    // not so long that the first win misses ten seconds.
    this.setIdle(() => this.showHint(), 7000, false);
  }

  // ---------------------------------------------------------------- the offer

  private async offer(): Promise<void> {
    this.state = 'intro';
    this.setIdle(null);
    sfx('pop', { volume: 0.5 });
    // He takes the two light bags; the heavy one stays with Mama.
    for (const b of this.bags) this.tweens.add({ targets: b, x: this.boy.x, y: this.boy.y - BOY_H * 0.35, alpha: 0, duration: 400 });
    await this.wait(420);
    if (!this.alive) return;
    pose(this, this.boy, 'boy_carry_bags', BOY_H);
    sfx('rustle', { volume: 0.6 });
    await this.wait(300);
    if (!this.alive) return;
    this.tweens.add({ targets: this.boy, y: this.boy.y - 4, duration: 90, yoyo: true, repeat: 1 }); // a step
    await new Promise<void>((res) => this.tweens.add({ targets: this.boy, x: START.x, duration: 350, onComplete: () => res() }));
    if (!this.alive) return;
    await Voice.say('a3_climb');
    if (!this.alive) return;
    this.state = 'climb';
    this.showRings();
    this.setIdle(() => this.showHint());
  }

  // ---------------------------------------------------------------- climbing

  private showRings(): void {
    this.rings?.left.destroy();
    this.rings?.right.destroy();
    this.rings = { left: glowRing(this, 70, 650, 34, 60), right: glowRing(this, 320, 650, 34, 60) };
    this.updateRings();
  }

  private updateRings(): void {
    if (!this.rings) return;
    const cat = this.steps[this.at + 1]?.cat;
    const want: Foot = cat ? 'left' : this.next;
    this.rings.left.setAlpha(want === 'left' ? 1 : 0.25);
    this.rings.right.setAlpha(want === 'right' ? 1 : 0.25);
  }

  private stepTap(side: Foot): void {
    if (this.moving) return;
    const to = this.steps[this.at + 1];
    if (!to) return;
    // At the cat's step he steps around it, on the free side.
    const want: Foot = to.cat ? 'left' : this.next;
    if (side !== want) {
      this.tweens.add({ targets: this.boy, angle: { from: side === 'left' ? -4 : 4, to: 0 }, duration: 300, ease: 'Elastic.easeOut' });
      if (to.cat && !this.catSaid) {
        this.catSaid = true;
        void Voice.say('a3_cat');
      }
      return;
    }
    this.next = side === 'left' ? 'right' : 'left';
    this.at++;
    this.moving = true;
    const x = to.cat ? to.x - 22 : to.x;
    const h = BOY_H * depthScale(to.y);
    sfx('step', { volume: 0.6 });
    // Farther up is smaller: resize as he climbs (his breathing pauses meanwhile).
    stopBreathing(this, this.boy);
    this.tweens.add({
      targets: this.boy, x, y: to.y, duration: 260, ease: 'Sine.easeOut',
      onUpdate: () => fitHeight(this.boy, BOY_H * depthScale(this.boy.y)),
      onComplete: () => {
        this.moving = false;
        fitHeight(this.boy, h);
        breathe(this, this.boy);
        this.updateRings();
        this.mamaFollows();
        if (this.at === this.landingAt) void this.rest();
        else if (this.at === this.steps.length - 1) void this.top();
      },
    });
    // The step up: a small bob.
    this.tweens.add({ targets: this.boy, angle: { from: side === 'left' ? -3 : 3, to: 0 }, duration: 260 });
    if (to.cat && !this.catSaid) {
      this.catSaid = true;
      void Voice.say('a3_cat');
    }
  }

  /** Mama climbs a few steps behind him, with the heavy bag. */
  private mamaFollows(): void {
    if (this.at < 3) return;
    const s = this.steps[this.at - 3];
    this.moveMama(s.x - 30, s.y, 420);
  }

  /** Move Mama, resizing her for the distance (her breathing pauses meanwhile). */
  private moveMama(x: number, y: number, ms: number): Promise<void> {
    stopBreathing(this, this.mama);
    // A gentle sway as she climbs.
    const sway = this.tweens.add({ targets: this.mama, angle: { from: -2, to: 2 }, duration: 280, yoyo: true, repeat: -1 });
    return new Promise((res) => this.tweens.add({
      targets: this.mama, x, y, duration: ms, ease: 'Sine.easeInOut',
      onUpdate: () => fitHeight(this.mama, MAMA_H * depthScale(this.mama.y)),
      onComplete: () => { sway.stop(); this.mama.setAngle(0); fitHeight(this.mama, MAMA_H * depthScale(this.mama.y)); breathe(this, this.mama); res(); },
    }));
  }

  private async rest(): Promise<void> {
    this.state = 'rest';
    this.setIdle(null);
    for (const r of [this.rings?.left, this.rings?.right]) if (r) this.tweens.add({ targets: r, alpha: 0, duration: 250, onComplete: () => r.setVisible(false).setAlpha(1) });
    await Voice.say('a3_rest');
    if (!this.alive) return;
    // Mama catches up on the landing.
    const s = this.steps[this.landingAt - 1];
    await this.moveMama(s.x - 40, s.y, 1200);
    if (!this.alive) return;
    await this.wait(500);
    if (!this.alive) return;
    this.state = 'climb';
    for (const r of [this.rings?.left, this.rings?.right]) if (r) { r.setVisible(true).setAlpha(0); this.tweens.add({ targets: r, alpha: 1, duration: 250 }); }
    this.updateRings();
    this.setIdle(() => this.showHint());
  }

  private async top(): Promise<void> {
    this.state = 'end';
    this.setIdle(null);
    this.rings?.left.destroy();
    this.rings?.right.destroy();
    this.rings = null;
    // He sets the bags down by the door; Mama arrives, hands free, breath back.
    const end = this.steps[this.steps.length - 1];
    const s = this.steps[this.steps.length - 2];
    await this.moveMama(s.x - 34, s.y, 1600);
    if (!this.alive) return;
    pose(this, this.boy, 'boy_happy', BOY_H * depthScale(end.y));
    const hm = MAMA_H * depthScale(this.mama.y);
    pose(this, this.mama, 'mama_stand', hm);
    this.heavy.setPosition(this.mama.x + 22, this.mama.y + 2).setVisible(true);
    fitHeight(this.heavy, BOY_H * 0.35 * depthScale(this.mama.y));
    for (const dx of [16, 30]) {
      const b = this.add.image(end.x + dx, end.y + 2, 'bag_light').setOrigin(0.5, 1).setDepth(31);
      fitHeight(b, BOY_H * 0.2 * depthScale(end.y));
    }
    sfx('rustle', { volume: 0.6 });
    completeMission('amman');
    await Voice.say('a3_mama');
    if (!this.alive) return;
    await Voice.say('a3_end');
    if (!this.alive) return;
    await this.finishAdventure('amman', 'a3_hadith');
  }

  // ---------------------------------------------------------------- input

  private down(p: Phaser.Input.Pointer): void {
    if (!this.alive) return;
    this.hint.clear();
    if (this.state === 'offer') {
      const near = this.bags.some((b) => Phaser.Math.Distance.Between(p.worldX, p.worldY, b.x, b.y - 14) < 50)
        || (Math.abs(p.worldX - MAMA.x) < 50 && p.worldY > MAMA.y - MAMA_H && p.worldY < MAMA.y);
      if (near) void this.offer();
    } else if (this.state === 'climb') {
      this.stepTap(p.worldX < 195 ? 'left' : 'right');
    }
  }

  private showHint(): void {
    if (!this.alive) return;
    const again = () => this.kickIdle();
    if (this.state === 'offer') {
      const b = this.bags[0];
      this.hint.show('tap', { x: b.x, y: b.y - 14 }, undefined, again);
    } else if (this.state === 'climb' && this.rings) {
      const cat = this.steps[this.at + 1]?.cat;
      const r = this.rings[cat ? 'left' : this.next];
      this.hint.show('tap', { x: r.x, y: r.y }, undefined, again);
    } else again();
  }
}
