// The current "day" lives in memory only. Closing the app loses nothing that matters,
// and starting again begins a fresh day.
export const ADVENTURES = ['petra', 'ummqais', 'amman', 'irbid'] as const;
export type Adventure = (typeof ADVENTURES)[number];

export const session = {
  done: new Set<Adventure>(),
  /** Has the map greeted him yet today? */
  greeted: false,
  /** Sun step the map last showed, so the map can animate the next step. */
  shownSunStep: 0,
};

export function newDay(): void {
  session.done.clear();
  session.greeted = false;
  session.shownSunStep = 0;
}

export function sunStep(): number {
  return session.done.size;
}
