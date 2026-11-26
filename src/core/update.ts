// Keeps the installed game up to date without "open it twice".
// The game is saved on the phone for offline play. When a new version has been
// published, the phone downloads it in the background; this file then switches
// to it at a safe moment:
//  - at once if the start screen is showing (nothing to lose there);
//  - otherwise the next time the start screen appears, so a day in progress is
//    never interrupted.
// It also asks for an update each time the app comes back to the front and each
// time the start screen appears. That check goes only to the game's own address
// and carries no data; offline it simply fails and nothing happens.
import type Phaser from 'phaser';

export function setupUpdates(game: Phaser.Game): void {
  if (!('serviceWorker' in navigator)) return;
  // A takeover counts as a new version only if this page was already controlled
  // or an update arrived while another version was active. The very first
  // install is not an update; a newer version published later in that same
  // session is.
  let updateSeen = !!navigator.serviceWorker.controller;
  let waitingToReload = false;
  let reloading = false;
  const onStartScreen = () => game.scene.getScenes(true).some((s) => s.scene.key === 'start' || s.scene.key === 'boot');
  const reload = () => {
    if (reloading) return;
    reloading = true;
    location.reload();
  };

  /** A new version has taken over: switch now if the start screen shows, otherwise at the next start screen. */
  const ready = () => {
    if (!updateSeen) return;
    waitingToReload = true;
    if (onStartScreen()) reload();
  };

  navigator.serviceWorker.register('./sw.js', { scope: './' }).then((reg) => {
    const check = () => void reg.update().catch(() => undefined);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) check();
    });
    // The start screen asks too, so a version published while the app stays
    // open is found at the moment it can switch.
    game.events.on('fk-start-screen', check);
    reg.addEventListener('updatefound', () => {
      const w = reg.installing;
      if (!w || !reg.active) return; // nothing active yet: the first install, not an update
      updateSeen = true;
      // Belt and braces: once it has finished installing and taken over, it is
      // ready even if the browser's takeover event is missed.
      w.addEventListener('statechange', () => {
        if (w.state === 'activated') ready();
      });
    });
  }).catch(() => undefined);

  navigator.serviceWorker.addEventListener('controllerchange', ready);
  game.events.on('fk-start-screen', () => {
    if (waitingToReload) reload();
  });
}
