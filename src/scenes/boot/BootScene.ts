import Phaser from 'phaser';
import { makePlaceholders, queueArt } from '../../core/assets';
import { makeFxTextures } from '../../core/fx';
import { debugRun, session } from '../../core/session';

// ?scene= names: places open their first mission; p2, p3 and petra-dawn open
// Petra's other missions and its quiet deed.
const SCENES: Record<string, string> = {
  map: 'map', petra: 'petra', p2: 'p2', p3: 'p3', 'petra-dawn': 'petra-dawn',
  ummqais: 'ummqais', u2: 'u2', u3: 'u3', 'ummqais-dusk': 'ummqais-dusk',
  amman: 'amman', a2: 'a2', a3: 'a3', 'amman-morning': 'amman-morning',
  irbid: 'irbid', i2: 'i2', i3: 'i3', wadirum: 'wadirum',
  jerash: 'jerash', j2: 'j2', j3: 'j3', 'jerash-morning': 'jerash-morning',
  deadsea: 'deadsea', d2: 'd2', d3: 'd3', 'deadsea-tap': 'deadsea-tap',
  aqaba: 'aqaba', q2: 'q2', q3: 'q3', 'aqaba-sunrise': 'aqaba-sunrise',
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
      session.current = debugRun(key, new URLSearchParams(location.search).get('lap') === '1' ? 1 : 0);
      this.scene.start(key);
    }
    else this.scene.start('start');
  }
}
