import Phaser from 'phaser';
import { fitHeight, fitWidth } from '../../core/assets';
import { droplets, HintHand, motes } from '../../core/fx';
import { music } from '../../core/music';
import { completeMission } from '../../core/session';
import { sfx } from '../../core/sfx';
import { ui } from '../../core/ui';
import { PIC, view } from '../../core/viewport';
import { Voice } from '../../core/voice';
import { BaseScene } from '../BaseScene';
import { breathe, pose, PourCan, walkTo, type PourTarget } from '../kit';

// Amman's quiet deed (MISSIONS_V2.md section 6): before Mama wakes he waters her
// mint pots on the windowsill and folds the blanket, then goes. She smells the
// mint and smiles at the window, not at him. No chime, no hadith line, nobody
// thanks him, he is not there to be noticed.

// Measured on bg_amman_home: the windowsill's top is at y = 506, from x = 15 to 290.
const SILL_Y = 506;
const POTS = [92, 206];
const WALL_FOOT = 640; // where the floor meets the wall, under the window
const BOY_H = 145;
const BLANKET = { x: 262, y: 716 };
const CAN_REST = { x: 52, y: 700 };

type State = 'intro' | 'work' | 'end';

interface Pot { img: Phaser.GameObjects.Image; pour: PourTarget }

export class MorningScene extends BaseScene {
  private state: State = 'intro';
  private boy!: Phaser.GameObjects.Image;
  private can!: PourCan;
  private pots: Pot[] = [];
  private blanket!: Phaser.GameObjects.Image;
  private folded = false;
  private foldFrom: number | null = null;
  private drag: 'can' | 'blanket' | null = null;
  private dragId = -1;
  private hint!: HintHand;
  private dim!: Phaser.GameObjects.Rectangle;

  constructor() {
    super('amman-morning');
  }

  create(): void {
    this.setup();
    this.state = 'intro';
    this.pots = [];
    this.folded = false;
    this.foldFrom = null;
    this.drag = null;
    this.dragId = -1;
    this.hint = new HintHand(this);

    ui.setPill('عَمّان');
    ui.setHome(() => this.goTo('map'));
    ui.clearBubble();
    music.play('amman', { natureOnly: true }); // a quiet deed has no music

    this.addCover('bg_amman_home');
    motes(this, { x: 20, y: 160, w: 350, h: 480 }, 40, 0xdfe6ff);
    // Early morning: a soft, cool light (code may tint delivered art).
    this.dim = this.add.rectangle(PIC.x, PIC.y, PIC.w, PIC.h, 0x2c3a70, 0.3).setOrigin(0).setDepth(80);

    for (const x of POTS) {
      const img = this.add.image(x, SILL_Y, 'plant_dry').setOrigin(0.5, 1).setDepth(20);
      fitHeight(img, BOY_H * 0.3);
      this.pots.push({ img, pour: { x, y: SILL_Y - BOY_H * 0.3, progress: 0, need: 1500, done: false } });
    }
    this.blanket = this.add.image(BLANKET.x, BLANKET.y, 'blanket_messy').setOrigin(0.5, 1).setDepth(22);
    fitWidth(this.blanket, BOY_H * 0.6);

    this.boy = this.add.image(150, WALL_FOOT, 'boy_idle').setOrigin(0.5, 1).setDepth(30);
    fitHeight(this.boy, BOY_H);
    breathe(this, this.boy);
    this.can = new PourCan(this, CAN_REST.x, CAN_REST.y, BOY_H * 0.34); // at least 44 points tall

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.down(p));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.move(p));
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => this.up(p));
    this.input.on('pointerupoutside', (p: Phaser.Input.Pointer) => this.up(p));
    this.events.once('shutdown', () => this.hint.clear());

    void this.intro();
  }

  update(_t: number, dt: number): void {
    if (this.state !== 'work') return;
    const done = this.can.update(dt, this.pots.map((p) => p.pour));
    if (done) {
      const pot = this.pots.find((p) => p.pour === done) as Pot;
      droplets(this, pot.img.x, SILL_Y - 20, 6, 30);
      this.tweens.add({ targets: pot.img, alpha: 0.3, duration: 300, yoyo: true, onYoyo: () => { pot.img.setTexture('plant_fresh'); fitHeight(pot.img, BOY_H * 0.3); } });
      sfx('rustle', { volume: 0.4 }); // no chime: a quiet deed has none
      this.checkDone();
    }
  }

  private async intro(): Promise<void> {
    this.state = 'work';
    this.open('qda_open');
    this.setIdle(() => this.showHint());
  }

  private checkDone(): void {
    if (this.folded && this.pots.every((p) => p.pour.done)) void this.leave();
  }

  // ---------------------------------------------------------------- input

  private down(p: Phaser.Input.Pointer): void {
    if (!this.alive || this.state !== 'work' || this.drag) return;
    this.hint.clear();
    if (this.can.hit(p.worldX, p.worldY)) {
      this.drag = 'can';
      this.can.grab(p);
      pose(this, this.boy, 'boy_water', BOY_H);
    } else if (!this.folded && Math.abs(p.worldX - this.blanket.x) < 60 && Math.abs(p.worldY - (BLANKET.y - 22)) < 40) {
      this.drag = 'blanket';
      this.foldFrom = p.worldX;
    }
    if (this.drag) this.dragId = p.id;
  }

  private move(p: Phaser.Input.Pointer): void {
    if (p.id !== this.dragId) return;
    const v = view();
    if (this.drag === 'can') this.can.move(p, { x: v.x + 30, right: v.right - 30, top: 420, bottom: CAN_REST.y });
    else if (this.drag === 'blanket' && this.foldFrom !== null && Math.abs(p.worldX - this.foldFrom) > 60) this.fold();
  }

  private up(p: Phaser.Input.Pointer): void {
    if (p.id !== this.dragId) return;
    if (this.drag === 'can') {
      this.can.release(p);
      if (this.state === 'work') pose(this, this.boy, 'boy_idle', BOY_H);
    }
    this.drag = null;
    this.dragId = -1;
    this.foldFrom = null;
    this.kickIdle();
  }

  /** One swipe across the blanket folds it neatly. */
  private fold(): void {
    this.folded = true;
    this.drag = null;
    sfx('rustle', { volume: 0.6 });
    this.tweens.add({
      targets: this.blanket, scaleX: this.blanket.scaleX * 0.5, duration: 260, ease: 'Sine.easeIn',
      onComplete: () => {
        this.blanket.setTexture('blanket_folded');
        fitWidth(this.blanket, BOY_H * 0.35);
        this.tweens.add({ targets: this.blanket, scaleY: { from: this.blanket.scaleY * 0.8, to: this.blanket.scaleY }, duration: 300, ease: 'Back.easeOut' });
      },
    });
    this.checkDone();
  }

  // ---------------------------------------------------------------- after he has gone

  private async leave(): Promise<void> {
    this.state = 'end';
    this.setIdle(null);
    this.hint.clear();
    this.tweens.add({ targets: this.can.img, x: CAN_REST.x, y: CAN_REST.y, angle: 0, duration: 400 });
    await this.wait(600);
    if (!this.alive) return;
    // He goes out quietly.
    await walkTo(this, this.boy, { x: view().x - 70, y: WALL_FOOT }, BOY_H);
    if (!this.alive) return;
    this.boy.setVisible(false);
    // The morning light comes in; Mama wakes and comes to the window.
    this.tweens.add({ targets: this.dim, fillAlpha: 0, duration: 2500 });
    sfx('birds', { volume: 0.6 });
    await this.wait(1600);
    if (!this.alive) return;
    const mama = this.add.image(view().right + 60, WALL_FOOT, 'mama_stand').setOrigin(0.5, 1).setDepth(30);
    fitHeight(mama, BOY_H * 1.3);
    sfx('door', { volume: 0.4 });
    this.tweens.add({ targets: mama, angle: { from: -2, to: 2 }, duration: 300, yoyo: true, repeat: 4 });
    await new Promise<void>((res) => this.tweens.add({ targets: mama, x: POTS[1] + 34, duration: 2400, ease: 'Sine.easeOut', onComplete: () => res() }));
    if (!this.alive) return;
    mama.setAngle(0);
    // She leans in to smell the mint, and smiles at the window; then she breathes, at ease.
    this.tweens.add({ targets: mama, angle: -5, y: WALL_FOOT + 2, duration: 700, yoyo: true, hold: 1200, ease: 'Sine.easeInOut', onComplete: () => this.alive && breathe(this, mama) });
    completeMission('amman');
    await this.wait(1800);
    if (!this.alive) return;
    // A quiet deed's final moment: the background goes still.
    this.layers?.still(true);
    await Voice.say('qda_end');
    if (!this.alive) return;
    await this.finishAdventure('amman', null);
  }

  private showHint(): void {
    if (!this.alive || this.drag) return this.kickIdle();
    const again = () => this.kickIdle();
    const pot = this.pots.find((p) => !p.pour.done);
    if (pot) this.hint.show('drag', { x: this.can.img.x, y: this.can.img.y - 20 }, { x: pot.img.x - 40, y: SILL_Y - 70 }, again);
    else if (!this.folded) this.hint.show('drag', { x: this.blanket.x - 40, y: BLANKET.y - 22 }, { x: this.blanket.x + 40, y: BLANKET.y - 22 }, again);
    else again();
  }
}
