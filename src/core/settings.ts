// Stored on the device: the music on/off setting and the voice speed the parent
// chose (see DECISIONS.md). Nothing about the child.
const KEY = 'fk.music';

export function getMusicOn(): boolean {
  try {
    return localStorage.getItem(KEY) !== 'off';
  } catch {
    return true;
  }
}

export function setMusicOn(on: boolean): void {
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off');
  } catch {
    /* storage unavailable: the setting lasts until the app closes */
  }
}

const RATE_KEY = 'fk.voiceRate';
export const VOICE_RATES = { slower: 0.85, normal: 1.0, faster: 1.15 } as const;
export type VoiceSpeed = keyof typeof VOICE_RATES;

export function getVoiceSpeed(): VoiceSpeed {
  try {
    const v = localStorage.getItem(RATE_KEY);
    return v === 'slower' || v === 'faster' ? v : 'normal';
  } catch {
    return 'normal';
  }
}

export function setVoiceSpeed(speed: VoiceSpeed): void {
  try {
    localStorage.setItem(RATE_KEY, speed);
  } catch {
    /* storage unavailable: the setting lasts until the app closes */
  }
}
