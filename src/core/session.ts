// The day (MISSIONS_V2.md section 3). The day itself lives in memory only:
// closing the app loses nothing that matters, and starting again begins a fresh
// day. The only thing kept on the device is one number per place, which of its
// missions comes next (see settings.ts).
import { getNextIndex, setNextIndex } from './settings';

export const PLACES = ['petra', 'ummqais', 'amman', 'irbid', 'jerash', 'deadsea', 'aqaba'] as const;
export type Place = (typeof PLACES)[number];

/** Missions in a day before the Wadi Rum night ending. */
export const MISSIONS_PER_DAY = 4;

export interface MissionDef {
  id: string;
  /** Phaser scene key. */
  scene: string;
}

/** What the map opened, so the scene knows how to end. */
export interface MissionRun extends MissionDef {
  place: Place;
  /** The fourth mission of the day: no acknowledgment of any kind (section 6). */
  quiet: boolean;
  /** Position in the place's rotation, for ordinary missions. */
  index?: number;
}

// Each place's ordinary missions in rotation order. null: not built yet (a later wave).
const ROTATION: Record<Place, Array<MissionDef | null>> = {
  petra: [{ id: 'P1', scene: 'petra' }, { id: 'P2', scene: 'p2' }, { id: 'P3', scene: 'p3' }],
  ummqais: [{ id: 'U1', scene: 'ummqais' }, null, null],
  amman: [{ id: 'A1', scene: 'amman' }, null, null],
  // I1 is Irbid's quiet deed, so Irbid's ordinary rotation is I2 and I3 only.
  irbid: [null, null],
  jerash: [null, null, null],
  deadsea: [null, null, null],
  aqaba: [null, null, null],
};

// Each place's quiet deed (the fourth mission of the day). null: not built yet.
const QUIET: Record<Place, MissionDef | null> = {
  petra: { id: 'QD-P', scene: 'petra-dawn' },
  ummqais: null,
  amman: null,
  irbid: { id: 'I1', scene: 'irbid' },
  jerash: null,
  deadsea: null,
  aqaba: null,
};

export const session = {
  /** Places finished today, in order. The sun moves one step for each. */
  done: new Set<Place>(),
  /** The mission being played now. */
  current: null as MissionRun | null,
  /** Has the map greeted him yet today? */
  greeted: false,
  /** Sun step the map last showed, so the map can animate the next step. */
  shownSunStep: 0,
};

export function newDay(): void {
  session.done.clear();
  session.current = null;
  session.greeted = false;
  session.shownSunStep = 0;
}

export function sunStep(): number {
  return session.done.size;
}

export const dayComplete = (): boolean => session.done.size >= MISSIONS_PER_DAY;

/**
 * What tapping a place opens today, or null when the place is scenery with a
 * voice: already played today, the day's four missions are done, or nothing is
 * built there yet.
 */
export function missionFor(place: Place): MissionRun | null {
  if (session.done.has(place) || dayComplete()) return null;
  const fourth = session.done.size === MISSIONS_PER_DAY - 1;
  const quiet = QUIET[place];
  if (fourth && quiet) return { ...quiet, place, quiet: true };
  // The ordinary rotation. Until a place's quiet deed is built, its next
  // ordinary mission plays in the fourth slot (section 12).
  const list = ROTATION[place];
  const start = getNextIndex(place) % list.length;
  for (let k = 0; k < list.length; k++) {
    const i = (start + k) % list.length;
    const def = list[i];
    if (def) return { ...def, place, quiet: false, index: i };
  }
  // Until I2 and I3 exist, I1 plays in any slot (section 12).
  if (place === 'irbid' && quiet) return { ...quiet, place, quiet: fourth };
  return null;
}

/**
 * The story's consequence is done: the place counts for today (even if he taps
 * home during the closing line), and an ordinary mission moves the place's
 * rotation on. A quiet deed does not move the rotation.
 */
export function completeMission(place: Place): void {
  session.done.add(place);
  const run = session.current;
  if (run && run.place === place && !run.quiet && run.index !== undefined) {
    setNextIndex(place, (run.index + 1) % ROTATION[place].length);
  }
}

/** For ?scene= debugging: the run a scene key would be opened with. It never moves a rotation. */
export function debugRun(scene: string): MissionRun | null {
  for (const place of PLACES) {
    const q = QUIET[place];
    if (q && q.scene === scene && q.id !== 'I1') return { ...q, place, quiet: true };
    const i = ROTATION[place].findIndex((d) => d?.scene === scene);
    if (i >= 0) return { ...(ROTATION[place][i] as MissionDef), place, quiet: false };
  }
  if (scene === 'irbid') return { ...(QUIET.irbid as MissionDef), place: 'irbid', quiet: false };
  return null;
}
