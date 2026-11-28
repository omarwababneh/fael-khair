import Phaser from 'phaser';
import { fitHeight, fitWidth } from '../../core/assets';
import { dustPuff, HintHand, motes } from '../../core/fx';
import { music } from '../../core/music';
import { completeMission, currentLap } from '../../core/session';
import { sfx } from '../../core/sfx';
import { ui } from '../../core/ui';
import { Voice } from '../../core/voice';
import { BaseScene, type FreeTarget } from '../BaseScene';
import { breathe, freeBounce, freeHop, pose, stopBreathing, walkTo } from '../kit';

// I3. Irbid: the new boy (value: a kind word; including the one left out;
// source bukhari_2989, part "good_word"). MISSIONS_V2.md section 5.
// A passing game. A new boy stands by the wall, watching. Nothing forces him to
// notice; the game simply stays small. When he walks over and taps the speech
// button he says "تعال العب معنا!". The new boy joins, the passing gets livelier
// with four, and the new boy is the one who scores. Passing the ball toward him
// is not enough: he has to go to him and invite him.

// Measured on bg_irbid_alley: paving from y = 560; the chalk goal on the far wall, centre (205, 470).
const GOAL = { x: 205, y: 478 };
const BOY_H = 140;
const SPOT = { boy: { x: 205, y: 712 }, a: { x: 104, y: 640 }, b: { x: 272, y: 646 } };
const DEPTH = (y: number) => Phaser.Math.Linear(0.82, 1, Phaser.Math.Clamp((y - 590) / (712 - 590), 0, 1));

type State = 'intro' | 'play' | 'walk' | 'invite' | 'four' | 'score' | 'end';
type Who = 'boy' | 'a' | 'b' | 'new';

export class AlleyScene extends BaseScene {
  private state: State = 'intro';
  private boy!: Phaser.GameObjects.Image;
  private people: Record<Exclude<Who, 'boy'>, Phaser.GameObjects.Image> = {} as Record<Exclude<Who, 'boy'>, Phaser.GameObjects.Image>;
  private ball!: Phaser.GameObjects.Image;
  private ballAt: Who = 'boy';
  private flying = false;
  private passes = 0;
  private noticeAfter = 6;
  private newSpot = { x: 340, y: 592 };
  private dragBoy = -1;
  private lastStepX = 0;
  private stepFrame = false;
  private removeAction: (() => void) | null = null;
  private hint!: HintHand;
  private lookSaid = false;

  constructor() {
    super('i3');
  }

  create(): void {
    this.setup();
    this.state = 'intro';
    this.ballAt = 'boy';
    this.flying = false;
    this.passes = 0;
    this.dragBoy = -1;
    this.removeAction = null;
    this.lookSaid = false;
    this.hint = new HintHand(this);
    // First lap: the new boy stands closer, and the father notices him sooner.
    const lap = currentLap();
    this.noticeAfter = lap ? 9 : 6;
    this.newSpot = lap ? { x: 360, y: 584 } : { x: 354, y: 596 };

    ui.setPill('إِرْبِد');
    ui.setHome(() => this.goTo('map'));
    ui.clearBubble();
    music.play('irbid');

    this.addCover('bg_irbid_alley');
    motes(this, { x: 20, y: 160, w: 350, h: 480 }, 40);

    this.people.a = this.add.image(SPOT.a.x, SPOT.a.y, 'friend_a').setOrigin(0.5, 1).setDepth(30);
    this.people.b = this.add.image(SPOT.b.x, SPOT.b.y, 'friend_b').setOrigin(0.5, 1).setDepth(30);
    this.people.new = this.add.image(this.newSpot.x, this.newSpot.y, 'newboy_alone').setOrigin(0.5, 1).setDepth(28);
    for (const [k, img] of Object.entries(this.people)) {
      fitHeight(img, BOY_H * DEPTH(img.y));
      breathe(this, img);
      if (k === 'new') this.tweens.add({ targets: img, angle: { from: -1, to: 1 }, duration: 2400, yoyo: true, repeat: -1 });
    }
    this.boy = this.add.image(SPOT.boy.x, SPOT.boy.y, 'boy_idle').setOrigin(0.5, 1).setDepth(34);
    fitHeight(this.boy, BOY_H);
    breathe(this, this.boy);
    this.ball = this.add.image(SPOT.boy.x + 26, SPOT.boy.y, 'ball').setOrigin(0.5, 1).setDepth(35);
    fitWidth(this.ball, BOY_H * 0.26);

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.down(p));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.move(p));
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => this.up(p));
    this.input.on('pointerupoutside', (p: Phaser.Input.Pointer) => this.up(p));
    const cleanUp = () => { this.hint.clear(); this.removeAction?.(); this.removeAction = null; };
    this.events.once('leave', cleanUp);
    this.events.once('shutdown', cleanUp);

    void this.intro();
  }

  private async intro(): Promise<void> {
    this.state = 'play';
    this.open('i3_open');
    this.setIdle(() => this.showHint());
  }

  private feet(who: Who): { x: number; y: number } {
    const img = who === 'boy' ? this.boy : this.people[who];
    return { x: img.x + (who === 'b' || who === 'new' ? -22 : 22), y: img.y };
  }

  /** The ball arcs along the paving from one player to another. */
  private kick(from: Who, to: Who, fast = false): Promise<void> {
    this.flying = true;
    const a = this.feet(from), b = this.feet(to);
    if (from === 'boy') {
      pose(this, this.boy, 'boy_kick', BOY_H * DEPTH(this.boy.y));
      this.time.delayedCall(450, () => this.alive && pose(this, this.boy, 'boy_idle', BOY_H * DEPTH(this.boy.y)));
    } else {
      const img = this.people[from];
      this.tweens.add({ targets: img, angle: { from: 0, to: from === 'b' ? -8 : 8 }, duration: 160, yoyo: true });
    }
    sfx('bounce', { weight: 0.4, volume: 0.6 });
    const dur = fast ? 520 : 760;
    const base = (BOY_H * 0.26) / this.ball.frame.width;
    return new Promise((res) => {
      this.tweens.add({ targets: this.ball, x: { from: a.x, to: b.x }, duration: dur, ease: 'Linear' });
      this.tweens.add({ targets: this.ball, scale: { from: base * DEPTH(a.y), to: base * DEPTH(b.y) }, duration: dur });
      this.tweens.addCounter({
        from: 0, to: 1, duration: dur,
        onUpdate: (tw) => { const k = tw.getValue() ?? 0; this.ball.y = Phaser.Math.Linear(a.y, b.y, k) - Math.sin(k * Math.PI) * 40; this.ball.angle += 8; },
        onComplete: () => {
          this.ballAt = to;
          this.flying = false;
          sfx('bounce', { weight: 0.2, volume: 0.4 });
          res();
        },
      });
    });
  }

  // ---------------------------------------------------------------- input

  /** The player under the finger: of those it touches, the one whose middle is nearest. */
  private who(x: number, y: number): Who | null {
    let best: Who | null = null, bestD = Infinity;
    for (const k of ['a', 'b', 'new'] as const) {
      const img = this.people[k];
      const h = img.frame.height * img.scaleY;
      if (!(Math.abs(x - img.x) < 44 && y < img.y + 10 && y > img.y - h)) continue;
      const d = Math.hypot(x - img.x, y - (img.y - h / 2));
      if (d < bestD) { bestD = d; best = k; }
    }
    return best;
  }

  private down(p: Phaser.Input.Pointer): void {
    if (!this.alive) return;
    this.hint.clear();
    const x = p.worldX, y = p.worldY;
    if (this.state === 'play') {
      // Grab the boy to walk him over to someone.
      if (Math.abs(x - this.boy.x) < 40 && y > this.boy.y - BOY_H && y < this.boy.y + 10) {
        this.dragBoy = p.id;
        this.lastStepX = this.boy.x;
        stopBreathing(this, this.boy);
        return;
      }
      const w = this.who(x, y);
      if (w && this.ballAt === 'boy' && !this.flying) void this.pass(w);
    } else if (this.state === 'four') {
      const w = this.who(x, y);
      if (w === 'new' && this.ballAt === 'boy' && !this.flying) void this.score();
    }
  }

  private move(p: Phaser.Input.Pointer): void {
    if (p.id !== this.dragBoy) return;
    const x = Phaser.Math.Clamp(p.worldX, 40, 360);
    // He walks while he is drawn along (the two walking pictures, every 14 points).
    if (Math.abs(x - this.lastStepX) > 14) {
      this.stepFrame = !this.stepFrame;
      this.lastStepX = x;
      this.boy.setTexture(this.stepFrame ? 'boy_walk_a' : 'boy_walk_b').setFlipX(x < this.boy.x);
      fitHeight(this.boy, BOY_H);
      sfx('step', { volume: 0.3 });
    }
    this.boy.x = x;
  }

  private up(p: Phaser.Input.Pointer): void {
    if (p.id !== this.dragBoy) return;
    this.dragBoy = -1;
    this.boy.setFlipX(false);
    pose(this, this.boy, 'boy_idle', BOY_H);
    // Close enough to the new boy: he walks over to him.
    if (Math.abs(this.boy.x - this.newSpot.x) < 90) void this.goToNewBoy();
    else this.tweens.add({ targets: this.boy, x: SPOT.boy.x, duration: 300, ease: 'Back.easeOut' });
    this.kickIdle();
  }

  // ---------------------------------------------------------------- the small game

  private async pass(to: Who): Promise<void> {
    await this.kick('boy', to);
    if (!this.alive) return;
    this.passes++;
    await this.wait(500);
    if (!this.alive) return;
    // Passing toward the new boy is not enough: he only rolls it back, shyly.
    if (to === 'new') this.tweens.add({ targets: this.people.new, angle: { from: -4, to: 4 }, duration: 200, yoyo: true, repeat: 1 });
    await this.kick(to, 'boy');
    if (!this.alive) return;
    if (this.passes >= this.noticeAfter && !this.lookSaid) {
      // The father only says what he sees; nothing forces him.
      this.lookSaid = true;
      void Voice.say('i3_look');
    }
    this.kickIdle();
  }

  private async goToNewBoy(): Promise<void> {
    this.state = 'walk';
    this.setIdle(null);
    if (this.ballAt === 'boy') this.tweens.add({ targets: this.ball, alpha: 0, duration: 250, onComplete: () => this.ball.setVisible(false).setAlpha(1) });
    const to = { x: this.newSpot.x - 58, y: this.newSpot.y + 6 };
    await walkTo(this, this.boy, to, BOY_H * DEPTH(to.y));
    if (!this.alive) return;
    fitHeight(this.boy, BOY_H * DEPTH(to.y));
    pose(this, this.boy, 'boy_idle', BOY_H * DEPTH(to.y));
    this.state = 'invite';
    // The speech button: he says it himself.
    // The moment to invite him: the background holds still until he does.
    this.motionStill(true);
    this.removeAction = ui.showAction('تعال العب معنا!', () => {
      this.removeAction = null;
      this.motionStill(false);
      void this.invite();
    });
  }

  private async invite(): Promise<void> {
    if (!this.alive) return;
    this.state = 'score';
    pose(this, this.boy, 'boy_wave', BOY_H * DEPTH(this.boy.y));
    await Voice.say('i3_invite');
    if (!this.alive) return;
    // His face: he joins in.
    const nb = this.people.new;
    pose(this, nb, 'newboy_happy', BOY_H * DEPTH(nb.y));
    // No sound for his yes: the kindness is the point, not a reward.
    await this.wait(700);
    if (!this.alive) return;
    const join = { x: 344, y: 712 };
    this.tweens.killTweensOf(nb);
    this.tweens.add({ targets: nb, x: join.x, y: join.y, duration: 900, ease: 'Sine.easeInOut', onUpdate: () => fitHeight(nb, BOY_H * DEPTH(nb.y)), onComplete: () => fitHeight(nb, BOY_H) });
    this.tweens.add({ targets: nb, angle: { from: -2, to: 2 }, duration: 220, yoyo: true, repeat: 1, onComplete: () => nb.setAngle(0) }); // a little bob as he comes
    await walkTo(this, this.boy, SPOT.boy, BOY_H);
    if (!this.alive) return;
    pose(this, this.boy, 'boy_idle', BOY_H);
    breathe(this, nb);
    this.ball.setPosition(SPOT.boy.x + 26, SPOT.boy.y).setVisible(true).setAlpha(0);
    this.tweens.add({ targets: this.ball, alpha: 1, duration: 250 });
    this.ballAt = 'boy';
    // Four now: the passing gets livelier.
    for (const [from, to] of [['boy', 'a'], ['a', 'b'], ['b', 'new'], ['new', 'boy']] as Array<[Who, Who]>) {
      await this.kick(from, to, true);
      if (!this.alive) return;
      await this.wait(150);
    }
    this.state = 'four';
    await Voice.say('i3_pass_new');
    this.setIdle(() => this.showHint());
  }

  /** The new boy scores. */
  private async score(): Promise<void> {
    this.state = 'end';
    this.setIdle(null);
    await this.kick('boy', 'new', true);
    if (!this.alive) return;
    await this.wait(200);
    this.flying = true;
    const nb = this.people.new;
    this.tweens.add({ targets: nb, angle: { from: 0, to: -10 }, duration: 160, yoyo: true });
    sfx('bounce', { weight: 0.7 });
    sfx('whoosh');
    await new Promise<void>((res) => this.tweens.add({ targets: this.ball, x: GOAL.x, y: GOAL.y, scale: this.ball.scale * 0.6, angle: 540, duration: 900, ease: 'Quad.easeOut', onComplete: () => res() }));
    if (!this.alive) return;
    dustPuff(this, GOAL.x, GOAL.y, 8, 0xffffff, 36);
    sfx('thud', { weight: 0.3 });
    this.tweens.add({ targets: this.ball, y: 588, duration: 500, ease: 'Bounce.easeOut' });
    // Four friends instead of three.
    for (const img of [this.boy, this.people.a, this.people.b, nb]) this.tweens.add({ targets: img, y: img.y - 10, duration: 180, yoyo: true, repeat: 1 });
    pose(this, this.boy, 'boy_happy', BOY_H);
    completeMission('irbid');
    await this.wait(1400);
    if (!this.alive) return;
    await Voice.say('i3_end');
    if (!this.alive) return;
    await this.finishAdventure('irbid', 'i3_hadith');
  }

  // ---------------------------------------------------------------- free time

  /** The ball bounces where it landed; the new boy and a friend each give a small hop. */
  protected freeTargets(): FreeTarget[] {
    const list: FreeTarget[] = [];
    if (this.ball.visible) list.push({ obj: this.ball, react: () => freeBounce(this, this.ball, 26) });
    const nb = this.people.new, a = this.people.a;
    list.push({ obj: nb, react: () => freeHop(this, nb, 'step', 10) });
    list.push({ obj: a, react: () => freeHop(this, a, 'step', 10) });
    return list;
  }

  private showHint(): void {
    if (!this.alive || this.dragBoy !== -1) return this.kickIdle();
    const again = () => this.kickIdle();
    if (this.state === 'play' && this.ballAt === 'boy' && !this.flying) {
      if (this.lookSaid) this.hint.show('drag', { x: this.boy.x, y: this.boy.y - 60 }, { x: this.newSpot.x - 40, y: this.newSpot.y - 60 }, again);
      else this.hint.show('tap', { x: this.people.a.x, y: this.people.a.y - 60 }, undefined, again);
    } else if (this.state === 'four') this.hint.show('tap', { x: this.people.new.x, y: this.people.new.y - 60 }, undefined, again);
    else again();
  }
}
