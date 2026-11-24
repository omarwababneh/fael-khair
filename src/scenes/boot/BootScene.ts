import Phaser from 'phaser';
import { makePlaceholders, queueArt } from '../../core/assets';
import { makeFxTextures } from '../../core/fx';

const SCENES: Record<string, string> = { map: 'map', petra: 'petra', ummqais: 'ummqais', amman: 'amman', irbid: 'irbid' };

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
    // Debug: ?scene=petra (or map) jumps straight to a scene.
    // Places not built yet in this milestone open the map.
    const want = new URLSearchParams(location.search).get('scene');
    if (want) this.scene.start(SCENES[want] ?? 'map');
    else this.scene.start('start');
  }
}
