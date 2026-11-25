import Phaser from 'phaser';
import { makePlaceholders, queueArt } from '../../core/assets';
import { makeFxTextures } from '../../core/fx';
import { debugRun, session } from '../../core/session';

// ?scene= names: places open their first mission; p2, p3 and petra-dawn open
// Petra's other missions and its quiet deed.
const SCENES: Record<string, string> = {
  map: 'map', petra: 'petra', p2: 'p2', p3: 'p3', 'petra-dawn': 'petra-dawn',
  ummqais: 'ummqais', amman: 'amman', irbid: 'irbid', wadirum: 'wadirum',
};

export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  preload(): void {
    queueArt(this);
  }

  create(): void {
    makePlaceholders(this);
    makeFxTextures(this);
    // Debug: ?scene=petra (or map, p2, ...) jumps straight to a scene.
    // Places not built yet open the map.
    const want = new URLSearchParams(location.search).get('scene');
    if (want) {
      const key = SCENES[want] ?? 'map';
      session.current = debugRun(key);
      this.scene.start(key);
    }
    else this.scene.start('start');
  }
}
