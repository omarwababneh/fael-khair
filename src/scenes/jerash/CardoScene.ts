import Phaser from 'phaser';
import { fitHeight } from '../../core/assets';
import { glowRing, HintHand, motes } from '../../core/fx';
import { music } from '../../core/music';
import { currentLap } from '../../core/session';
import { sfx } from '../../core/sfx';
import { ui } from '../../core/ui';
import { view } from '../../core/viewport';
import { Voice } from '../../core/voice';
import { BaseScene } from '../BaseScene';
import { breathe, pose } from '../kit';

// J2. Jerash: the lost little girl (value: helping someone in distress; source
// muslim_2699a). MISSIONS_V2.md section 5.
// A small girl is crying beside a column. He does not lead her anywhere: he stays
// with her in the open street and waves to the guide, who comes over. The girl
// says what her mother wears. Visitors pass between the columns; he taps her
// mother when she comes. The guide calls her over, and the hug happens right
// there. Safeguards: an open, visible place the whole time; a trusted adult
// leads; he never goes off alone with her.

// Measured on bg_jerash_cardo (world units): the paving starts at y = 410 under
// the columns and runs to the bottom; the nearest columns stand at the edges.
const BOY = { x: 44, foot: 712, h: 150 };
const GIRL = { x: 108, foot: 706, h: 150 * 0.7 };
const GUIDE = { x: 342, foot: 560, h: 150 * 1.35 * 0.78 }; // further down the street
const GUIDE_NEAR = { x: 176, foot: 700, h: 150 * 1.35 };
const WALK_FOOT = 548; // visitors cross the street here, behind the children
const WALK_H = 150 * 1.3 * 0.78;

type Clue = 'scarf' | 'bag' | 'dress';
type State = 'intro' | 'call' | 'look' | 'end';

interface Walker { img: Phaser.GameObjects.Image; mother: boolean; tween: Phaser.Tweens.Tween; bob: Phaser.Tweens.Tween }

export class CardoScene extends BaseScene {
  private state: State = 'intro';
  private boy!: Phaser.GameObjects.Image;
  private girl!: Phaser.GameObjects.Image;
  private guide!: Phaser.GameObjects.Image;
  private guideRing: Phaser.GameObjects.Image | null = null;
  private walkers: Walker[] = [];
  private queue: string[] = [];
  private notSaid = 0;
  private hint!: HintHand;
  private clue: Clue = 'scarf';
  private speed = 70;

  constructor() {
    super('j2');
  }

  create(): void {
    this.setup();
    this.state = 'intro';
    this.walkers = [];
    this.queue = [];
    this.notSaid = 0;
    this.guideRing = null;
    this.hint = new HintHand(this);
    const lap = currentLap();
    // First lap: the green scarf, and her mother is the third to come. Later: another clue, more visitors.
    this.clue = lap ? (Math.random() < 0.5 ? 'bag' : 'dress') : 'scarf';
    this.speed = lap ? 85 : 70;
    this.queue = lap ? ['visitor_a', 'visitor_b', 'visitor_a', 'mother_search'] : ['visitor_b', 'visitor_a', 'mother_search'];

    ui.setPill('جَرَش');
    ui.setHome(() => this.goTo('map'));
    ui.clearBubble();
    music.play('jerash');

    this.addCover('bg_jerash_cardo');
    motes(this, { x: 20, y: 160, w: 350, h: 480 }, 40);

    this.guide = this.add.image(GUIDE.x, GUIDE.foot, 'guard_stand').setOrigin(0.5, 1).setDepth(30);
    fitHeight(this.guide, GUIDE.h);
    breathe(this, this.guide);
    this.girl = this.add.image(GIRL.x, GIRL.foot, 'girl_crying').setOrigin(0.5, 1).setDepth(61);
    fitHeight(this.girl, GIRL.h);
    breathe(this, this.girl, 0.03);
    this.boy = this.add.image(BOY.x, BOY.foot, 'boy_worried').setOrigin(0.5, 1).setDepth(62);
    fitHeight(this.boy, BOY.h);
    breathe(this, this.boy);

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.down(p));
    this.events.once('shutdown', () => this.hint.clear());
    void this.intro();
  }

  private async intro(): Promise<void> {
    sfx('rustle', { volume: 0.3 });
    await Voice.say('j2_open');
    if (!this.alive) return;
    // He stays with her and calls the guide.
    this.state = 'call';
    this.guideRing = glowRing(this, this.guide.x, this.guide.y - this.guide.displayHeight * 0.55, 44, 25);
    this.setIdle(() => this.showHint());
    await Voice.say('j2_stay');
  }

  private down(p: Phaser.Input.Pointer): void {
    if (!this.alive) return;
    this.hint.clear();
    const x = p.worldX, y = p.worldY;
    if (this.state === 'call') {
      const b = this.guide.getBounds();
      Phaser.Geom.Rectangle.Inflate(b, 20, 20);
      if (b.contains(x, y)) void this.callGuide();
    } else if (this.state === 'look') {
      // The walker under the finger, nearest first.
      const hit = this.walkers
        .filter((w) => w.img.active && w.img.getBounds().contains(x, y))
        .sort((a, b) => Math.abs(a.img.x - x) - Math.abs(b.img.x - x))[0];
      if (!hit) return;
      if (hit.mother) void this.found(hit);
      else {
        this.tweens.add({ targets: hit.img, angle: { from: -3, to: 3 }, duration: 120, yoyo: true, repeat: 1, onComplete: () => hit.img.setAngle(0) });
        if (this.notSaid++ < 2) void Voice.say('j2_notmom');
      }
    }
  }

  /** He waves; the guide waves back and comes to them. */
  private async callGuide(): Promise<void> {
    this.state = 'intro';
    this.setIdle(null);
    this.guideRing?.destroy();
    this.guideRing = null;
    this.boy.setFlipX(true); // boy_wave faces left; he waves toward the guide on the right
    pose(this, this.boy, 'boy_wave', BOY.h);
    sfx('pop', { volume: 0.4 });
    await this.wait(700);
    if (!this.alive) return;
    this.tweens.killTweensOf(this.guide);
    const steps = this.time.addEvent({ delay: 380, loop: true, callback: () => sfx('step', { volume: 0.35 }) });
    this.tweens.add({ targets: this.guide, angle: { from: -2, to: 2 }, duration: 260, yoyo: true, repeat: -1 });
    await new Promise<void>((res) => this.tweens.add({
      targets: this.guide, x: GUIDE_NEAR.x, y: GUIDE_NEAR.foot, scale: GUIDE_NEAR.h / this.guide.frame.height,
      duration: 2200, ease: 'Sine.easeInOut', onComplete: () => res(),
    }));
    steps.remove();
    if (!this.alive) return;
    this.tweens.killTweensOf(this.guide);
    this.guide.setAngle(0).setDepth(60);
    breathe(this, this.guide);
    this.boy.setFlipX(false);
    pose(this, this.boy, 'boy_idle', BOY.h);
    await Voice.say('j2_guide');
    if (!this.alive) return;
    await Voice.say(`j2_clue_${this.clue}`);
    if (!this.alive) return;
    this.state = 'look';
    this.setIdle(() => this.showHint(), 9000);
    this.nextWalker();
    await Voice.say('j2_look');
  }

  /** The next visitor crosses the street; the mother keeps coming back until he spots her. */
  private nextWalker(): void {
    if (!this.alive || this.state !== 'look') return;
    const key = this.queue.shift() ?? 'mother_search';
    // visitor_a faces right; visitor_b and the mother face left: each walks the way she faces.
    const rightward = key === 'visitor_a';
    const v = view();
    const from = rightward ? v.x - 50 : v.right + 50;
    const to = rightward ? v.right + 60 : v.x - 60;
    const img = this.add.image(from, WALK_FOOT, key).setOrigin(0.5, 1).setDepth(40);
    fitHeight(img, WALK_H);
    const mother = key === 'mother_search';
    const dur = (Math.abs(to - from) / this.speed) * 1000 * (mother ? 1.25 : 1);
    const bob = this.tweens.add({ targets: img, y: WALK_FOOT - 3, duration: 260, yoyo: true, repeat: -1 });
    const tween = this.tweens.add({
      targets: img, x: to, duration: dur, ease: 'Linear',
      onComplete: () => {
        img.destroy();
        this.walkers = this.walkers.filter((w) => w.img !== img);
        if (mother && this.state === 'look') this.queue.unshift('mother_search');
      },
    });
    this.walkers.push({ img, mother, tween, bob });
    // The next one starts when this one is about halfway across.
    this.time.delayedCall(dur * 0.55, () => this.nextWalker());
  }

  /** He spotted her. The guide calls her over and she comes to her daughter. */
  private async found(w: Walker): Promise<void> {
    this.state = 'end';
    this.setIdle(null);
    w.tween.stop();
    w.bob.stop();
    w.img.setY(WALK_FOOT);
    sfx('pop', { volume: 0.5 });
    await Voice.say('j2_call');
    if (!this.alive) return;
    // She hurries to them, coming forward along the street.
    const steps = this.time.addEvent({ delay: 300, loop: true, callback: () => sfx('step', { volume: 0.35 }) });
    this.tweens.add({ targets: w.img, angle: { from: -2, to: 2 }, duration: 200, yoyo: true, repeat: -1 });
    w.img.setDepth(63);
    await new Promise<void>((res) => this.tweens.add({
      targets: w.img, x: GIRL.x + 40, y: GIRL.foot, scale: (150 * 1.3) / w.img.frame.height,
      duration: 1600, ease: 'Sine.easeInOut', onComplete: () => res(),
    }));
    steps.remove();
    if (!this.alive) return;
    // The hug: mother and daughter in one picture.
    this.tweens.killTweensOf(w.img);
    w.img.destroy();
    this.tweens.killTweensOf(this.girl);
    this.girl.setTexture('mother_hug').setX(GIRL.x + 22);
    fitHeight(this.girl, 150 * 0.95);
    this.tweens.add({ targets: this.girl, scaleX: { from: this.girl.scaleX * 0.96, to: this.girl.scaleX }, duration: 400, ease: 'Back.easeOut' });
    pose(this, this.boy, 'boy_happy', BOY.h);
    await this.wait(900);
    if (!this.alive) return;
    await Voice.say('j2_thanks');
    if (!this.alive) return;
    await this.wait(400);
    await Voice.say('j2_end');
    if (!this.alive) return;
    await this.finishAdventure('jerash', 'j2_hadith');
  }

  private showHint(): void {
    if (!this.alive) return;
    const again = () => this.kickIdle();
    if (this.state === 'call') {
      this.hint.show('tap', { x: this.guide.x, y: this.guide.y - this.guide.displayHeight * 0.5 }, undefined, again);
    } else if (this.state === 'look') {
      const m = this.walkers.find((w) => w.mother && w.img.active);
      if (m) this.hint.show('tap', { x: m.img.x, y: m.img.y - m.img.displayHeight * 0.55 }, undefined, again);
      else again();
    }
  }
}
