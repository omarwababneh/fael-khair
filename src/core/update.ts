// Keeps the installed game up to date without "open it twice".
// The game is saved on the phone for offline play. When a new version has been
// published, the phone downloads it in the background; this file then switches
// to it at a safe moment:
//  - at once if the start screen is showing (nothing to lose there);
//  - otherwise the next time the start screen appears, so a day in progress is
//    never interrupted.
// It also asks for an update each time the app comes back to the front. That
// check goes only to the game's own address and carries no data; offline it
// simply fails and nothing happens.
import type Phaser from 'phaser';

export function setupUpdates(game: Phaser.Game): void {
  if (!('serviceWorker' in navigator)) return;
  const hadController = !!navigator.serviceWorker.controller;
  let waitingToReload = false;
  const onStartScreen = () => game.scene.getScenes(true).some((s) => s.scene.key === 'start' || s.scene.key === 'boot');

  navigator.serviceWorker.register('./sw.js', { scope: './' }).then((reg) => {
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) void reg.update().catch(() => undefined);
    });
  }).catch(() => undefined);

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController) return; // the very first install: already the newest version
    waitingToReload = true;
    if (onStartScreen()) location.reload();
  });
  game.events.on('fk-start-screen', () => {
    if (waitingToReload) location.reload();
  });
}
