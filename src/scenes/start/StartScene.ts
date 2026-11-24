import { audio } from '../../core/audio';
import { motes } from '../../core/fx';
import { music } from '../../core/music';
import { newDay } from '../../core/session';
import { sfx } from '../../core/sfx';
import { ui } from '../../core/ui';
import { view } from '../../core/viewport';
import { Voice } from '../../core/voice';
import { BaseScene } from '../BaseScene';

/** The app title over the map art, and one big button. */
export class StartScene extends BaseScene {
  constructor() {
    super('start');
  }

  create(): void {
    this.setup();
    ui.setPill(null);
    ui.setHome(null);
    ui.clearBubble();
    newDay();
    const bg = this.addMapPicture('bg_map');
    // Slow drift so nothing is perfectly still.
    this.tweens.add({ targets: bg, scale: bg.scale * 1.04, duration: 9000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const v = view();
    motes(this, v, 10);

    const remove = ui.showStart(() => {
      // First tap: unlock Web Audio and speech (required on iOS), inside the tap.
      audio.unlock();
      Voice.unlock();
      music.play('map');
      sfx('pop');
      remove();
      this.goTo('map');
    });
    this.events.once('shutdown', remove);
  }
}
