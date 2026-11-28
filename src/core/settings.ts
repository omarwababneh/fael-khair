// Stored on the device only (GAME_SPEC.md section 2): the parents' day length and sound settings
// (sound choice, music volume, voice speed, the silent switch) and one number per place: which
// mission comes next and whether he has been around once. Nothing about what he
// chose or how he played.
// Every read and write is wrapped: without storage, settings last until the app closes.

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage unavailable: the setting lasts until the app closes */
  }
}

function remove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------- sound choice

/** "موسيقى مرحة" (default), "أصوات الطبيعة فقط", "بدون". */
export type SoundMode = 'music' | 'nature' | 'off';
export type MusicVolume = 'quiet' | 'medium';

const SOUND_KEY = 'fk.sound';
const OLD_MUSIC_KEY = 'fk.music'; // before version 2: music on or off

export function getSoundMode(): SoundMode {
  const v = read(SOUND_KEY);
  if (v === 'music' || v === 'nature' || v === 'off') return v;
  // A parent who switched the music off before version 2 keeps it off.
  return read(OLD_MUSIC_KEY) === 'off' ? 'off' : 'music';
}

export function setSoundMode(mode: SoundMode): void {
  write(SOUND_KEY, mode);
  remove(OLD_MUSIC_KEY);
}

const VOLUME_KEY = 'fk.musicVolume';

export function getMusicVolume(): MusicVolume {
  return read(VOLUME_KEY) === 'quiet' ? 'quiet' : 'medium';
}

export function setMusicVolume(v: MusicVolume): void {
  write(VOLUME_KEY, v);
}

// ---------------------------------------------------------------- voice speed

const RATE_KEY = 'fk.voiceRate';
export const VOICE_RATES = { slower: 0.85, normal: 1.0, faster: 1.15 } as const;
export type VoiceSpeed = keyof typeof VOICE_RATES;

export function getVoiceSpeed(): VoiceSpeed {
  const v = read(RATE_KEY);
  return v === 'slower' || v === 'faster' ? v : 'normal';
}

export function setVoiceSpeed(speed: VoiceSpeed): void {
  write(RATE_KEY, speed);
}

// ---------------------------------------------------------------- silent switch

/**
 * Whether sound plays even when the iPhone's silent switch is on (Safari's
 * navigator.audioSession.type = "playback"). On by default; the parents' corner
 * can turn it off if the phone's voice stays silent with it on.
 */
const THROUGH_SILENT_KEY = 'fk.throughSilent';

export function getThroughSilent(): boolean {
  return read(THROUGH_SILENT_KEY) !== 'off';
}

export function setThroughSilent(on: boolean): void {
  write(THROUGH_SILENT_KEY, on ? 'on' : 'off');
}

// ---------------------------------------------------------------- rotation

/**
 * One small number per place, 0 to 5: the mission that comes next is the number
 * modulo the place's number of missions, and a number at or past that count
 * means he has been around once (the "first lap" plays the easy version). After
 * the last value it goes back to the start of the second lap, so it never counts
 * up. Never shown, never sent anywhere.
 */
const ROT_PREFIX = 'fk.next.';

export function getNextIndex(place: string): number {
  const n = Number(read(ROT_PREFIX + place));
  return Number.isInteger(n) && n >= 0 && n <= 5 ? n : 0;
}

export function setNextIndex(place: string, n: number): void {
  if (Number.isInteger(n) && n >= 0 && n <= 5) write(ROT_PREFIX + place, String(n));
}

// ---------------------------------------------------------------- day length

/**
 * "طول اليوم": a long day (the default) has up to six missions before Wadi Rum,
 * five and then the quiet deed; a short day has four, as before version 3.
 */
export type DayLength = 'long' | 'short';
const DAY_KEY = 'fk.dayLength';

export function getDayLength(): DayLength {
  return read(DAY_KEY) === 'short' ? 'short' : 'long';
}

export function setDayLength(v: DayLength): void {
  write(DAY_KEY, v);
}
