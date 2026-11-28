import Phaser from 'phaser';
import { fitHeight } from '../../core/assets';
import { music, type MusicPlace } from '../../core/music';
import { debugRun, session, type Place } from '../../core/session';
import { sfx, type SfxName } from '../../core/sfx';
import { ui } from '../../core/ui';
import { PIC, view } from '../../core/viewport';
import { Voice } from '../../core/voice';
import { BaseScene } from '../BaseScene';

// The road (version 3 part B): a short drive between the map and an ordinary
// mission. The landscape scrolls past, the family car stays in view and its
// wheels turn. The boy rides in the back as a passenger: nothing lets him steer,
// stop or speed up. The father says road_look once, then three sights from that
// road's set pass by, different each trip. A touch on a sight gives a small
// friendly motion and the father names it; if he does not touch it, the father
// names it anyway as it passes. No score, no count, no "found" mark, nothing stored.
// Never before a quiet deed or before Wadi Rum (MapScene decides).

/** The northern road for Umm Qais, Irbid, Jerash and Amman; the southern for the Dead Sea, Petra and Aqaba. */
const NORTH: Place[] = ['ummqais', 'irbid', 'jerash', 'amman'];
export const roadFor = (place: Place): 'north' | 'south' => (NORTH.includes(place) ? 'north' : 'south');

// The strip (4608 x 1536, a picture joined to its mirror image) is drawn 1180
// points high with its bottom at the picture's bottom edge, so the road (0.70 to
// 0.83 of the strip's height) runs at about y 540 to 693, above the speech bubble.
const STRIP_H = 1180;
const STRIP_TOP = PIC.y + PIC.h - STRIP_H;
const ROAD_TOP = STRIP_TOP + 0.70 * STRIP_H;
/** The near lane, where the car's wheels touch the road. */
const LANE = STRIP_TOP + 0.80 * STRIP_H;
/** How fast the land goes by, in points a second. */
const SPEED = 62;

// The car (boy 1.0 = 150 points: the car is 0.9 high). Its two drawn wheels, as
// fractions of car_family_side, carry a turning car_wheel each.
const CAR = { x: 150, h: 135 };
const WHEELS = [{ fx: 117 / 768, fy: 353 / 430 }, { fx: 640 / 768, fy: 353 / 430 }];
const WHEEL_R = 72 / 430; // the drawn tyre's radius, as a fraction of the car's height

type Motion = 'hop' | 'sway' | 'nod';
interface SightDef { key: string; line: string; h: number; foot: number; motion: Motion; sound: SfxName }

// Heights are set for the distance (the land is farther away than the car); the
// smallest sights are shown at least 60 points high so they can be seen and touched.
const SIGHTS: Record<'north' | 'south', SightDef[]> = {
  north: [
    { key: 'sight_goats_shepherd', line: 'road_goats', h: 118, foot: ROAD_TOP - 4, motion: 'hop', sound: 'step' },
    { key: 'sight_olive_grove', line: 'road_olives', h: 190, foot: ROAD_TOP - 8, motion: 'sway', sound: 'rustle' },
    { key: 'sight_black_iris', line: 'road_iris', h: 62, foot: ROAD_TOP + 2, motion: 'sway', sound: 'rustle' },
    { key: 'sight_roman_column', line: 'road_column', h: 240, foot: ROAD_TOP - 10, motion: 'nod', sound: 'knock' },
    { key: 'sight_mosque', line: 'road_mosque', h: 210, foot: ROAD_TOP - 30, motion: 'nod', sound: 'knock' },
    { key: 'sight_falafel_stand', line: 'road_falafel', h: 140, foot: ROAD_TOP - 2, motion: 'nod', sound: 'knock' },
  ],
  south: [
    { key: 'sight_camel', line: 'road_camel', h: 140, foot: ROAD_TOP - 4, motion: 'hop', sound: 'step' },
    { key: 'sight_bedouin_tent', line: 'road_tent', h: 115, foot: ROAD_TOP - 14, motion: 'sway', sound: 'rustle' },
    { key: 'sight_rosefinch', line: 'road_rosefinch', h: 60, foot: ROAD_TOP + 2, motion: 'hop', sound: 'birds' },
    { key: 'sight_oryx', line: 'road_oryx', h: 105, foot: ROAD_TOP - 4, motion: 'hop', sound: 'step' },
    { key: 'sight_hot_spring', line: 'road_spring', h: 180, foot: ROAD_TOP - 10, motion: 'nod', sound: 'splash' },
    { key: 'sight_wind_turbine', line: 'road_turbine', h: 290, foot: ROAD_TOP - 60, motion: 'sway', sound: 'whoosh' },
    { key: 'sight_mosque', line: 'road_mosque', h: 210, foot: ROAD_TOP - 30, motion: 'nod', sound: 'knock' },
    { key: 'sight_falafel_stand', line: 'road_falafel', h: 140, foot: ROAD_TOP - 2, motion: 'nod', sound: 'knock' },
  ],
};

/** Last trip's sights on each road (memory only), so the next trip shows others. */
const lastTrip: Record<'north' | 'south', string[]> = { north: [], south: [] };

/** When each sight enters from the right edge (seconds after arrival). */
const SPAWN_AT = [4.5, 11.5, 18.5];
/** The father names a sight he did not touch as its middle passes this x. */
const NAME_X = 232;
/** The drive ends no sooner than this, and a moment after the last name. */
const MIN_DRIVE_MS = 27000;

interface Sight { def: SightDef; img: Phaser.GameObjects.Image; named: boolean; busyUntil: number }

export interface RoadData { next: string; place: Place }

export class RoadScene extends BaseScene {
  private next = 'map';
  private place: Place = 'petra';
  private strips: Phaser.GameObjects.Image[] = [];
  private stripW = 0;
  private car!: Phaser.GameObjects.Container;
  private wheels: Phaser.GameObjects.Image[] = [];
  private sights: Sight[] = [];
  private queue: SightDef[] = [];
  private startedAt = 0;
  private lastNamedEnds = 0;
  private ending = false;

  constructor() {
    super('road');
  }

  create(data?: Partial<RoadData>): void {
    this.setup();
    this.strips = [];
    this.wheels = [];
    this.sights = [];
    this.ending = false;
    this.lastNamedEnds = 0;
    // Debug: ?scene=road&to=petra drives to that mission.
    const to = data?.next ?? new URLSearchParams(location.search).get('to') ?? 'petra';
    if (!data?.next) session.current = debugRun(to);
    this.next = to;
    this.place = data?.place ?? session.current?.place ?? 'petra';
    const road = roadFor(this.place);

    ui.setPill(null);
    ui.setHome(() => this.goTo('map'));
    ui.clearBubble();
    music.play(this.place as MusicPlace);

    // Two copies of the strip side by side, moved left and wrapped: the picture
    // joins its mirror image, so the seam never shows.
    const key = road === 'north' ? 'bg_road_north' : 'bg_road_south';
    for (let i = 0; i < 2; i++) {
      const img = this.add.image(0, STRIP_TOP, key).setOrigin(0, 0).setDepth(0);
      img.setScale(STRIP_H / img.frame.height);
      this.strips.push(img);
    }
    this.stripW = this.strips[0].displayWidth;
    const v = view();
    this.strips[0].x = v.x;
    this.strips[1].x = v.x + this.stripW;

    // The car, with a turning wheel over each drawn wheel.
    const body = this.add.image(0, 0, 'car_family_side').setOrigin(0.5, 1);
    fitHeight(body, CAR.h);
    const cw = body.displayWidth, ch = body.displayHeight;
    const parts: Phaser.GameObjects.Image[] = [body];
    for (const w of WHEELS) {
      const wheel = this.add.image(-cw / 2 + w.fx * cw, -ch + w.fy * ch, 'car_wheel');
      wheel.setDisplaySize(2 * WHEEL_R * ch, 2 * WHEEL_R * ch);
      this.wheels.push(wheel);
      parts.push(wheel);
    }
    this.car = this.add.container(CAR.x, 0, parts).setDepth(40);
    // The wheels' lowest point rests on the lane.
    this.car.y = LANE - (WHEELS[0].fy * ch + WHEEL_R * ch - ch);
    // A gentle ride: the body rocks a point or two.
    this.tweens.add({ targets: body, y: -1.5, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // Three sights from this road's set, not the ones of last trip where possible.
    const pool = Phaser.Utils.Array.Shuffle(SIGHTS[road].slice());
    const fresh = pool.filter((s) => !lastTrip[road].includes(s.key));
    this.queue = [...fresh, ...pool.filter((s) => lastTrip[road].includes(s.key))].slice(0, 3);
    lastTrip[road] = this.queue.map((s) => s.key);

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.tap(p.worldX, p.worldY));
    this.startedAt = this.time.now;
    SPAWN_AT.forEach((t, i) => this.time.delayedCall(t * 1000, () => this.spawn(i)));
    this.time.delayedCall(1200, () => this.alive && void Voice.say('road_look'));
    this.time.addEvent({ delay: 500, loop: true, callback: () => this.maybeEnd() });
  }

  update(_t: number, dtMs: number): void {
    if (!this.alive) return;
    const dx = (SPEED * Math.min(dtMs, 100)) / 1000;
    const v = view();
    for (const s of this.strips) s.x -= dx;
    // Wrap: a strip that has gone off the left edge moves behind the other.
    for (const s of this.strips) {
      if (s.x + this.stripW < v.x) s.x = Math.max(...this.strips.map((o) => o.x)) + this.stripW;
    }
    // The wheels turn with the road: an angle of distance / radius.
    const r = this.wheels[0]?.displayWidth / 2 || 1;
    for (const w of this.wheels) w.rotation += dx / r;
    for (const s of this.sights) {
      s.img.x -= dx;
      // Named as it passes, if he has not touched it.
      if (!s.named && s.img.x <= NAME_X) this.name(s);
    }
    // Sights that have gone past the left edge are removed.
    for (const s of this.sights) if (s.img.x + s.img.displayWidth < v.x) s.img.setVisible(false);
  }

  private spawn(i: number): void {
    if (!this.alive || this.ending) return;
    const def = this.queue[i];
    if (!def) return;
    const v = view();
    const img = this.add.image(0, def.foot, def.key).setOrigin(0.5, 1).setDepth(20);
    fitHeight(img, def.h);
    img.x = v.right + img.displayWidth / 2 + 4;
    this.sights.push({ def, img, named: false, busyUntil: 0 });
  }

  /** The father names a sight once. */
  private name(s: Sight): void {
    if (s.named) return;
    s.named = true;
    const ends = Voice.say(s.def.line);
    void ends.then(() => { this.lastNamedEnds = this.time.now; });
  }

  /** A touch on a sight: a small friendly motion and its name (the same every time). */
  private tap(x: number, y: number): void {
    if (!this.alive || this.ending) return;
    let best: Sight | null = null;
    let bestD = Infinity;
    for (const s of this.sights) {
      if (!s.img.visible) continue;
      const b = s.img.getBounds();
      const w = Math.max(b.width, 56), h = Math.max(b.height, 56);
      const r = new Phaser.Geom.Rectangle(b.centerX - w / 2, b.centerY - h / 2, w, h);
      if (!r.contains(x, y)) continue;
      const d = Phaser.Math.Distance.Between(x, y, b.centerX, b.centerY);
      if (d < bestD) { bestD = d; best = s; }
    }
    if (!best || this.time.now < best.busyUntil) return;
    const s = best;
    s.busyUntil = this.time.now + 900;
    const img = s.img;
    if (s.def.motion === 'hop') {
      const y0 = s.def.foot;
      this.tweens.add({ targets: img, y: y0 - 10, duration: 170, yoyo: true, ease: 'Quad.easeOut', onComplete: () => { img.y = y0; } });
    } else {
      // A sway from its base (plants, the tent, the turbine) or a small nod (buildings, the spring).
      const deg = s.def.motion === 'sway' ? 3 : 1.5;
      this.tweens.add({ targets: img, angle: { from: 0, to: deg }, duration: 140, yoyo: true, repeat: 1, ease: 'Sine.easeInOut', onComplete: () => img.setAngle(0) });
    }
    sfx(s.def.sound, { volume: 0.3 });
    this.name(s);
  }

  /** The drive ends a moment after the last sight has been named, and no sooner than 27 seconds. */
  private maybeEnd(): void {
    if (!this.alive || this.ending) return;
    const elapsed = this.time.now - this.startedAt;
    const allNamed = this.sights.length === this.queue.length && this.sights.every((s) => s.named);
    if (elapsed < MIN_DRIVE_MS || !allNamed || Voice.busy) return;
    if (this.time.now - this.lastNamedEnds < 900) return;
    this.ending = true;
    this.goTo(this.next);
  }
}
