// The world remembers (version 3 part B, art checklist section b): a place he
// has visited shows nature growing there. Which picture shows is chosen only from
// the place's stored rotation number (settings.ts); nothing else is stored. It is
// nature growing, never his achievement: no sparkle, no sound, no count, nothing
// to touch, and never in a quiet deed.
//
// The stored number runs 0, 1, 2 on the first lap of a three-mission place, then
// 3, 4, 5 and back to 3 for ever (Irbid, with two missions: 0, 1, then 2, 3, 2,
// 3...). So that a plant only ever grows, its stages follow the number like this:
//   three missions: stage 0 at 0 and 1, stage 1 at 2, stage 2 from 3 on;
//   Irbid:          stage 0 at 0, stage 1 at 1, stage 2 from 2 on.
// The father says world_grown once, on arrival, at the first bigger stage (the
// number 2, or 1 in Irbid): the only arrival that certainly is the first time a
// bigger stage shows. See DECISIONS.md.
import Phaser from 'phaser';
import { fitHeight, hasArt } from '../core/assets';
import { ROTATION_LENGTH, type Place } from '../core/session';
import { getNextIndex } from '../core/settings';

interface PlantDef { stages: [string, string, string]; h: [number, number, number] }

/** Each place's plant at its three stages, with its height on screen at each. */
const PLANTS: Partial<Record<Place, PlantDef>> = {
  petra: { stages: ['oleander_young', 'oleander_flowering', 'oleander_flowering'], h: [62, 92, 92] },
  ummqais: { stages: ['olive_age_1', 'olive_age_2', 'olive_age_3'], h: [70, 108, 150] },
  amman: { stages: ['plant_fresh', 'mint_full', 'mint_full'], h: [38, 44, 44] },
  irbid: { stages: ['jasmine_young', 'jasmine_flowering', 'jasmine_flowering'], h: [80, 112, 112] },
  jerash: { stages: ['poppies_few', 'poppies_many', 'poppies_many'], h: [34, 42, 42] },
  deadsea: { stages: ['plant_fresh', 'plant_lush', 'plant_lush'], h: [46, 54, 54] },
  aqaba: { stages: ['palm_young', 'palm_grown', 'palm_grown'], h: [70, 150, 150] },
};

/**
 * Where each ordinary mission's plant stands (its foot, in design points),
 * clear of everything he touches and of the people. Missions not listed have no
 * plant (A3 is not at home; D2 and D3 are on the open shore, with no planters).
 */
const SPOTS: Record<string, { x: number; foot: number; depth?: number; flip?: boolean }> = {
  petra: { x: 352, foot: 548, depth: 12 },
  p2: { x: 26, foot: 606, depth: 12 },
  p3: { x: 372, foot: 545, depth: 8 },
  ummqais: { x: 350, foot: 448, depth: 3 },
  u2: { x: 335, foot: 470, depth: 3 },
  u3: { x: 335, foot: 470, depth: 3 },
  amman: { x: 372, foot: 270, depth: 6 },
  a2: { x: 350, foot: 270, depth: 6 },
  i2: { x: 340, foot: 702, depth: 8 },
  i3: { x: 30, foot: 565, depth: 6 },
  jerash: { x: 40, foot: 478, depth: 8 }, // by the colonnade, away from every litter spot
  j2: { x: 340, foot: 622, depth: 8 },
  j3: { x: 330, foot: 562, depth: 8 },
  deadsea: { x: 40, foot: 466, depth: 8 }, // on the wall top, clear of the three pots he waters
  aqaba: { x: 22, foot: 472, depth: 3 },
  q2: { x: 368, foot: 470, depth: 3 },
  q3: { x: 22, foot: 472, depth: 3 },
};

/** The plant's stage from the stored rotation number alone. */
export function stageOf(place: Place): 0 | 1 | 2 {
  const n = getNextIndex(place);
  const L = ROTATION_LENGTH[place];
  return n >= L ? 2 : n >= L - 1 ? 1 : 0;
}

/** Is this arrival the first time the place shows a bigger stage? */
export const firstBiggerStage = (place: Place): boolean => getNextIndex(place) === ROTATION_LENGTH[place] - 1;

/**
 * Put this mission's plant in the scene (nothing for a quiet deed or a mission
 * without a spot). Returns whether the father should say world_grown.
 */
export function addGrowth(scene: Phaser.Scene, sceneKey: string, place: Place | undefined, quiet: boolean): boolean {
  if (quiet || !place) return false;
  const def = PLANTS[place];
  const spot = SPOTS[sceneKey];
  if (!def || !spot) return false;
  const stage = stageOf(place);
  const key = def.stages[stage];
  if (!hasArt(scene, key)) return false;
  const img = scene.add.image(spot.x, spot.foot, key).setOrigin(0.5, 1).setDepth(spot.depth ?? 6);
  fitHeight(img, def.h[stage]);
  if (spot.flip) img.setFlipX(true);
  img.setData('growth', true);
  return stage > 0 && firstBiggerStage(place);
}
