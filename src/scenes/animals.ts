// Free-time animals (version 3 part B, art checklist section c). In free time,
// small living things of the place come out where the checklist names them:
// a lizard and a butterfly in Petra, a hoopoe, a butterfly or a hedgehog in Umm
// Qais, a pigeon at the window in Amman, a hoopoe and a pigeon in Irbid and
// Jerash, a lizard at the Dead Sea, a crab and a jumping fish in Aqaba. Each
// reacts to a touch with a small motion and a soft sound, the same every time,
// then settles where it was. He watches them: nothing lets him catch, hold,
// drag or collect one, and nothing counts.
import Phaser from 'phaser';
import { fitHeight, hasArt } from '../core/assets';
import { sfx } from '../core/sfx';
import type { FreeTarget } from './BaseScene';
import { freeRipple } from './kit';

type Kind = 'lizard' | 'butterfly' | 'hoopoe' | 'crab' | 'pigeon' | 'fish' | 'hedgehog';
interface Spot { kind: Kind; x: number; y: number; flip?: boolean }

/** Heights on screen: the checklist's sizes, but at least big enough to see and touch. */
const HEIGHT: Record<Kind, number> = { lizard: 26, butterfly: 34, hoopoe: 44, crab: 26, pigeon: 38, fish: 40, hedgehog: 30 };
const PICTURE: Record<Kind, string> = {
  lizard: 'free_lizard', butterfly: 'free_butterfly_open', hoopoe: 'free_hoopoe', crab: 'free_crab',
  pigeon: 'free_pigeon', fish: 'free_fish_jump', hedgehog: 'free_hedgehog',
};

/** Where each ordinary mission's animals settle in free time (x, foot), clear of the other free-time things. */
const SPOTS: Record<string, Spot[]> = {
  petra: [{ kind: 'lizard', x: 300, y: 640 }, { kind: 'butterfly', x: 250, y: 520 }],
  p2: [{ kind: 'lizard', x: 300, y: 662 }, { kind: 'butterfly', x: 300, y: 520 }],
  p3: [{ kind: 'lizard', x: 112, y: 560 }, { kind: 'butterfly', x: 300, y: 470 }],
  ummqais: [{ kind: 'butterfly', x: 150, y: 560 }, { kind: 'hoopoe', x: 80, y: 650 }],
  u2: [{ kind: 'hoopoe', x: 60, y: 650 }, { kind: 'butterfly', x: 210, y: 560 }],
  u3: [{ kind: 'hedgehog', x: 362, y: 664 }, { kind: 'hoopoe', x: 60, y: 610 }],
  amman: [{ kind: 'pigeon', x: 140, y: 410 }],
  a2: [{ kind: 'pigeon', x: 140, y: 410 }],
  a3: [{ kind: 'butterfly', x: 330, y: 560 }, { kind: 'pigeon', x: 250, y: 650 }],
  i2: [{ kind: 'pigeon', x: 322, y: 690 }],
  i3: [{ kind: 'hoopoe', x: 330, y: 565 }, { kind: 'pigeon', x: 40, y: 650 }],
  jerash: [{ kind: 'hoopoe', x: 60, y: 565 }, { kind: 'pigeon', x: 250, y: 625 }],
  j2: [{ kind: 'pigeon', x: 300, y: 650 }, { kind: 'hoopoe', x: 60, y: 525 }],
  j3: [{ kind: 'pigeon', x: 60, y: 625 }, { kind: 'hoopoe', x: 330, y: 565 }],
  deadsea: [{ kind: 'lizard', x: 70, y: 588 }],
  d2: [{ kind: 'lizard', x: 330, y: 645 }],
  d3: [{ kind: 'lizard', x: 60, y: 645 }],
  aqaba: [{ kind: 'crab', x: 90, y: 662 }, { kind: 'fish', x: 120, y: 405 }],
  q2: [{ kind: 'fish', x: 70, y: 425 }],
  q3: [{ kind: 'crab', x: 120, y: 655 }, { kind: 'fish', x: 120, y: 405 }],
};

/**
 * Bring the scene's animals out (they come in gently) and return them as
 * free-time things. Nothing for a scene without animals.
 */
export function addAnimals(scene: Phaser.Scene, sceneKey: string): FreeTarget[] {
  const out: FreeTarget[] = [];
  for (const s of SPOTS[sceneKey] ?? []) {
    const key = PICTURE[s.kind];
    if (!hasArt(scene, key)) continue;
    if (s.kind === 'fish') {
      out.push(fish(scene, s));
      continue;
    }
    const img = scene.add.image(s.x, s.y, key).setOrigin(0.5, 1).setDepth(58).setAlpha(0);
    fitHeight(img, HEIGHT[s.kind]);
    if (s.flip) img.setFlipX(true);
    scene.tweens.add({ targets: img, alpha: 1, duration: 900, ease: 'Sine.easeOut' });
    out.push({ obj: img, react: () => react(scene, img, s) });
  }
  return out;
}

/** Each animal's one small reaction, then it settles where it was. */
function react(scene: Phaser.Scene, img: Phaser.GameObjects.Image, s: Spot): number {
  const x0 = s.x, y0 = s.y;
  switch (s.kind) {
    case 'lizard':
    case 'crab': {
      // A quick dart a little to the side, then back.
      const dx = (x0 > 195 ? -1 : 1) * 16;
      scene.tweens.add({ targets: img, x: x0 + dx, duration: 160, yoyo: true, hold: 300, ease: 'Quad.easeOut', onComplete: () => { img.x = x0; } });
      sfx('slide', { volume: 0.18 });
      return 800;
    }
    case 'butterfly': {
      // It flutters up a little and settles back: the two pictures make the wings beat.
      let n = 0;
      const beat = scene.time.addEvent({ delay: 110, repeat: 7, callback: () => { n++; img.setTexture(n % 2 ? 'free_butterfly_closed' : 'free_butterfly_open'); fitHeight(img, HEIGHT.butterfly); } });
      scene.tweens.add({ targets: img, y: y0 - 16, duration: 420, yoyo: true, ease: 'Sine.easeInOut', onComplete: () => { beat.remove(); img.setTexture('free_butterfly_open'); fitHeight(img, HEIGHT.butterfly); img.y = y0; } });
      sfx('rustle', { volume: 0.12 });
      return 1000;
    }
    case 'hoopoe':
    case 'pigeon': {
      // A little hop with a flick of the wings.
      const sx = img.scaleX;
      scene.tweens.add({ targets: img, y: y0 - 10, duration: 170, yoyo: true, ease: 'Quad.easeOut', onComplete: () => { img.y = y0; } });
      scene.tweens.add({ targets: img, scaleX: sx * 1.08, duration: 90, yoyo: true, repeat: 1, onComplete: () => { img.scaleX = sx; } });
      sfx('birds', { volume: 0.18 });
      return 700;
    }
    case 'hedgehog': {
      // It curls up a little and uncurls.
      const sx = img.scaleX, sy = img.scaleY;
      scene.tweens.add({ targets: img, scaleY: sy * 0.82, scaleX: sx * 1.06, duration: 260, yoyo: true, hold: 400, ease: 'Sine.easeInOut', onComplete: () => { img.setScale(sx, sy); } });
      sfx('rustle', { volume: 0.15 });
      return 1100;
    }
    default:
      return 0;
  }
}

/**
 * The jumping fish lives under the water: a touch on its spot (or, now and then,
 * nothing at all) and it leaps out in a small arc and drops back with a splash.
 */
function fish(scene: Phaser.Scene, s: Spot): FreeTarget {
  const zone = scene.add.zone(s.x, s.y - 20, 90, 70);
  const img = scene.add.image(s.x, s.y, 'free_fish_jump').setOrigin(0.5, 0.5).setDepth(4).setAlpha(0);
  fitHeight(img, HEIGHT.fish);
  const leap = (): number => {
    scene.tweens.killTweensOf(img);
    img.setPosition(s.x - 14, s.y).setAngle(-30).setAlpha(1);
    scene.tweens.add({ targets: img, x: s.x + 14, angle: 30, duration: 700, ease: 'Linear' });
    scene.tweens.add({ targets: img, y: s.y - 34, duration: 350, yoyo: true, ease: 'Quad.easeOut', onComplete: () => { img.setAlpha(0); freeRipple(scene, s.x + 14, s.y + 4, 4, 0.25); } });
    return 1300;
  };
  // It leaps by itself now and then, so he can see that it is there.
  scene.time.addEvent({ delay: 7000, loop: true, callback: () => { if (img.alpha === 0) leap(); } });
  return { obj: zone as unknown as FreeTarget['obj'], area: () => new Phaser.Geom.Rectangle(s.x - 45, s.y - 55, 90, 70), react: leap };
}
