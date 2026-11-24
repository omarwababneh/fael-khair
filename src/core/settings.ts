// The only thing stored on the device: the music on/off setting.
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
