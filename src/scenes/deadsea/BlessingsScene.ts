import Phaser from 'phaser';
import { fitHeight, fitWidth } from '../../core/assets';
import { HintHand, motes } from '../../core/fx';
import { music } from '../../core/music';
import { currentLap } from '../../core/session';
import { sfx } from '../../core/sfx';
import { ui } from '../../core/ui';
import { PIC, view } from '../../core/viewport';
import { Voice } from '../../core/voice';
import { BaseScene, type FreeTarget } from '../BaseScene';
import { breathe, freeHop, freeRipple, freeWiggle } from '../kit';

// D2. The Dead Sea: seeing the blessings (value: gratitude; source quran_14_7).
// MISSIONS_V2.md section 5.
// Slow and gentle. He sits on a bench with Baba above the shore. Baba asks what
// blessings he can see; he taps things in any order. Each one glows softly and
// Baba says one short line of thanks for it. No counter, no list, no score.
// After four or five, the evening light comes and the salt sparkles. They stay
// on the viewpoint: no floating, no swimming. The lines thank; they never bargain.
//
// The sun in bg_deadsea_shore sits at the picture's far left, outside the
// portrait frame on a tall phone, so the things to tap are the sea (with its
// mountains), the water, the bread, his own hands and Baba (DECISIONS.md).

// Measured on bg_deadsea_shore (world units): the paved path starts at y = 562;
// the water lies between y = 255 and the salt edge (about y = 420 to 520).
const BENCH = { x: 196, foot: 690, w: 150 * 1.1, h: 150 * 0.45 };
const SEAT_Y = BENCH.foot - BENCH.h * 0.45; // the seat, measured on the bench art
const BOY = { x: 146, h: 150 * 0.7 };
const BABA = { x: 220, h: 150 * 0.95 };
const SEA = { top: 270, bottom: 470 };
// The salt crust along the water's edge, for the evening sparkle.
const SALT: Array<[number, number]> = [[10, 430], [80, 452], [150, 470], [230, 490], [300, 505], [370, 512]];

type Thing = 'sea' | 'water' | 'bread' | 'hands' | 'baba';
type State = 'intro' | 'look' | 'end';

export class BlessingsScene extends BaseScene {
  private state: State = 'intro';
  private boy!: Phaser.GameObjects.Image;
  private baba!: Phaser.GameObjects.Image;
  private bottle!: Phaser.GameObjects.Image;
  private bread!: Phaser.GameObjects.Image;
  private seen = new Set<Thing>();
  private speaking = false;
  private enough = 4;
  private hint!: HintHand;

  constructor() {
    super('d2');
  }

  create(): void {
    this.setup();
    this.state = 'intro';
    this.seen = new Set();
    this.speaking = false;
    this.hint = new HintHand(this);
    this.enough = currentLap() ? 5 : 4;

    ui.setPill('البَحْر المَيِّت');
    ui.setHome(() => this.goTo('map'));
    ui.clearBubble();
    music.play('deadsea');

    this.addCover('bg_deadsea_shore');
    motes(this, { x: 20, y: 200, w: 350, h: 420 }, 40);

    const bench = this.add.image(BENCH.x, BENCH.foot, 'bench').setOrigin(0.5, 1).setDepth(30);
    fitWidth(bench, BENCH.w);
    // Seated figures have no seat drawn: their seat is 0.3 of their height above their feet.
    this.boy = this.add.image(BOY.x, SEAT_Y + BOY.h * 0.3, 'boy_sit_front').setOrigin(0.5, 1).setDepth(31);
    fitHeight(this.boy, BOY.h);
    breathe(this, this.boy, 0.01);
    // baba_sit turns toward the viewer's left, toward the boy.
    this.baba = this.add.image(BABA.x, SEAT_Y + BABA.h * 0.3, 'baba_sit').setOrigin(0.5, 1).setDepth(31);
    fitHeight(this.baba, BABA.h);
    breathe(this, this.baba, 0.01);
    // The water and the bread stand on the paving on either side of the bench, well apart from his hands.
    this.bottle = this.add.image(318, 704, 'water_bottle').setOrigin(0.5, 1).setDepth(32);
    fitHeight(this.bottle, 46); // things he taps are at least 44 points tall
    this.bread = this.add.image(64, 702, 'food_bread').setOrigin(0.5, 1).setDepth(32);
    fitHeight(this.bread, 46);

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.down(p));
    this.events.once('shutdown', () => this.hint.clear());
    void this.intro();
  }

  private async intro(): Promise<void> {
    this.state = 'look';
    this.setIdle(() => this.showHint(), 8000);
    this.open('d2_open', 'd2_hint');
  }

  /** Where each thing is, for the soft glow. */
  private spot(t: Thing, x = 0, y = 0): { x: number; y: number; r: number } {
    switch (t) {
      case 'hands': return { x: this.boy.x, y: this.boy.y - BOY.h * 0.36, r: 28 };
      case 'water': return { x: this.bottle.x, y: this.bottle.y - this.bottle.displayHeight / 2, r: 28 };
      case 'bread': return { x: this.bread.x, y: this.bread.y - this.bread.displayHeight / 2, r: 34 };
      case 'baba': return { x: this.baba.x, y: this.baba.y - BABA.h * 0.6, r: 44 };
      default: return { x, y, r: 60 };
    }
  }

  private thingAt(x: number, y: number): Thing | null {
    const near = (t: Thing) => {
      const s = this.spot(t);
      return Phaser.Math.Distance.Between(x, y, s.x, s.y) < s.r + 12;
    };
    if (near('hands')) return 'hands';
    if (near('water')) return 'water';
    if (near('bread')) return 'bread';
    if (this.baba.getBounds().contains(x, y)) return 'baba';
    if (y > SEA.top - 80 && y < SEA.bottom) return 'sea'; // the sea and the mountains across it
    return null;
  }

  private down(p: Phaser.Input.Pointer): void {
    if (!this.alive || this.state !== 'look' || this.speaking) return;
    this.hint.clear();
    const t = this.thingAt(p.worldX, p.worldY);
    if (!t || this.seen.has(t)) return;
    void this.thank(t, p.worldX, p.worldY);
  }

  /** A soft glow on it, and Baba's one line of thanks. */
  private async thank(t: Thing, x: number, y: number): Promise<void> {
    this.seen.add(t);
    this.speaking = true;
    const s = this.spot(t, x, y);
    const g = this.add.image(s.x, s.y, 'fx_glow').setDisplaySize(s.r * 3, s.r * 3).setDepth(29).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: g, alpha: 0.75, duration: 500, yoyo: true, hold: 1400, onComplete: () => g.destroy() });
    sfx('twinkle', { volume: 0.35 });
    if (t === 'baba') this.tweens.add({ targets: this.baba, angle: -3, duration: 400, yoyo: true, hold: 600 });
    await Voice.say(`d2_${t}`);
    if (!this.alive) return;
    this.speaking = false;
    this.kickIdle();
    if (this.seen.size >= this.enough) void this.evening();
  }

  /** The evening light comes and the salt sparkles. */
  private async evening(): Promise<void> {
    this.state = 'end';
    this.setIdle(null);
    const warm = this.add.rectangle(PIC.x, PIC.y, PIC.w, PIC.h, 0xff9a4a, 0).setOrigin(0).setDepth(25).setBlendMode(Phaser.BlendModes.MULTIPLY);
    this.tweens.add({ targets: warm, fillAlpha: 0.35, duration: 3500, ease: 'Sine.easeInOut' });
    await this.wait(1800);
    if (!this.alive) return;
    for (let i = 0; i < 26; i++) {
      this.time.delayedCall(i * 140, () => {
        if (!this.alive) return;
        const n = Phaser.Math.Between(0, SALT.length - 2);
        const [a, b] = SALT[n];
        const [c, d] = SALT[n + 1];
        const k = Math.random();
        const sp = this.add.image(a + (c - a) * k, b + (d - b) * k + Phaser.Math.Between(-6, 6), 'fx_glow')
          .setDisplaySize(16, 16).setDepth(26).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({ targets: sp, alpha: 1, duration: 300, yoyo: true, onComplete: () => sp.destroy() });
      });
    }
    // The sparkle is silent: no sound to crown the end of the deed.
    await this.wait(2200);
    if (!this.alive) return;
    await Voice.say('d2_end');
    if (!this.alive) return;
    await this.finishAdventure('deadsea', 'd2_hadith');
  }

  /** Free time on the bench: the sea ripples where he touches it, Baba nods, the boy hops on the bench. */
  protected freeTargets(): FreeTarget[] {
    const t: FreeTarget[] = [
      { obj: this.baba, react: () => freeWiggle(this, this.baba, 'rustle', 3, 0.25) },
      { obj: this.boy, react: () => freeHop(this, this.boy, 'step', 8) },
    ];
    const sea = this.children.list.find((o): o is Phaser.GameObjects.Image => o instanceof Phaser.GameObjects.Image && o.texture.key === 'bg_deadsea_shore');
    if (sea) t.unshift({ obj: sea, area: () => this.seaArea(), react: () => this.rippleAt(this.seaArea()) });
    return t;
  }

  /** The open water, above the salt edge, inside the frame. */
  private seaArea(): Phaser.Geom.Rectangle {
    const v = view();
    const x = Math.max(v.x, 0) + 20, right = Math.min(v.right, 390) - 20;
    return new Phaser.Geom.Rectangle(x, SEA.top + 20, right - x, 115);
  }

  /** Two soft rings on the water where he touched it. */
  private rippleAt(r: Phaser.Geom.Rectangle): number {
    const p = this.input.activePointer;
    return freeRipple(this, Phaser.Math.Clamp(p.worldX, r.x, r.right), Phaser.Math.Clamp(p.worldY, r.y, r.bottom), 5, 0.3);
  }

  private showHint(): void {
    if (!this.alive || this.state !== 'look' || this.speaking) return this.kickIdle();
    const order: Thing[] = ['water', 'bread', 'hands', 'baba'];
    const t = order.find((x) => !this.seen.has(x));
    const s = t ? this.spot(t) : { x: 200, y: 360 };
    this.hint.show('tap', { x: s.x, y: s.y }, undefined, () => this.kickIdle());
  }
}
