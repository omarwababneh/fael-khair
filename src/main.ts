import './style.css';
import Phaser from 'phaser';
import { loadIndex } from './core/assets';
import { measure, vp } from './core/viewport';
import { BootScene } from './scenes/boot/BootScene';
import { StartScene } from './scenes/start/StartScene';
import { MapScene } from './scenes/map/MapScene';
import { PetraScene } from './scenes/petra/PetraScene';

// No page zoom, no pinch, no double-tap zoom, no long-press callouts, no pull-to-refresh.
const block = (e: Event) => e.preventDefault();
document.addEventListener('gesturestart', block, { passive: false });
document.addEventListener('dblclick', block, { passive: false });
document.addEventListener('contextmenu', block);
document.addEventListener('touchmove', block, { passive: false });

async function boot(): Promise<void> {
  measure();
  // Fonts are bundled locally; wait for them so canvas text draws in the right face.
  await Promise.all([
    loadIndex(),
    document.fonts?.load('700 24px "Baloo Bhaijaan 2"', 'فاعل خير').catch(() => undefined),
    document.fonts?.load('500 24px "Baloo Bhaijaan 2"', 'فاعل خير').catch(() => undefined),
  ]);

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: '#f3dfb4',
    banner: false,
    scale: { mode: Phaser.Scale.NONE, width: vp.w, height: vp.h, zoom: 1 / vp.dpr },
    render: { antialias: true, powerPreference: 'high-performance' },
    input: { activePointers: 2 },
    fps: { target: 60 },
    scene: [BootScene, StartScene, MapScene, PetraScene],
  });

  let pending = 0;
  const onResize = () => {
    cancelAnimationFrame(pending);
    pending = requestAnimationFrame(() => {
      measure();
      game.scale.setZoom(1 / vp.dpr);
      game.scale.resize(vp.w, vp.h);
      game.events.emit('fk-resize');
    });
  };
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', () => setTimeout(onResize, 250));

  // Harmless debug handle for testing in a desktop browser.
  (window as unknown as { fk: unknown }).fk = { game };
}

void boot();
