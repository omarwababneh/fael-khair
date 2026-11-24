# Decisions

Choices made where `GAME_SPEC.md` is silent. In each case the simpler, more conservative option was taken.

## Milestone 1

### Project and tools
1. **`Art/` renamed to `art/`.** The spec names the folder `art/`, and the build server treats upper and lower case as different folders.
2. **Versions pinned exactly:** Phaser 3.90.0 (the latest 3.x; the spec asks for Phaser 3, although Phaser 4 now exists), Vite 7.3.8, vite-plugin-pwa 1.3.0, TypeScript 5.9.3, sharp 0.35.5. Vite 8 exists, but 7 is the more mature line.
3. **Prepared art is not committed.** `npm run build` runs `npm run art` first, so adding images to `art/incoming/` and merging is enough to publish them. `public/assets/art/`, `public/icons/` and `public/assets/index.json` are generated on every build and ignored by git.
4. **`public/assets/index.json`** lists which art and audio files exist. The game reads it once, so it never asks for a file that is missing (no failed requests, nothing leaves the phone).
5. **Deploy uses `ALLOW_PLACEHOLDERS=1` during Milestone 1** (see `.github/workflows/deploy.yml`) because no art has been delivered yet. Remove that line once the art is complete.
6. **The Amiri font is not bundled yet.** It is only needed for the ayah in the night ending (Milestone 3).

### Art pipeline
7. **Sheet objects** must be at least 384 px on the long side (single sprites: 1024, as the spec says). Undersized art is a warning; only missing art stops the build.
8. **If a sheet splits into a different number of objects than `sheets.json` lists,** the whole sheet is skipped with a note, rather than risk giving objects the wrong names. Detached pieces that nearly touch are merged into one object.
9. **Files with unknown names** in `art/incoming/` are ignored with a note.
10. **The home-screen icon** is a magenta placeholder until `icon_app` arrives.
11. **Branch art:** the smooth end you hold must be on the **left** of `thorn_branch` and `big_branch`. If the art arrives the other way round, flip it horizontally before adding it.
12. **Birds** are not in the art manifest, and the spec forbids drawing creatures in code. The game uses an optional `bird` image (a small bird in flight, same style) if one is added to `art/incoming/`; until then only the birds' sound plays. A missing `bird` never shows a magenta box.

### Screen and controls
13. **Scaling:** the 390 x 844 design frame is fitted inside the screen; backgrounds are sized from the design frame (1.12 times its height, never smaller than the screen), so art and gameplay stay lined up on every iPhone. The canvas is drawn at up to 2x the screen's pixel density to keep 60 frames per second.
14. **Interface chrome** (place pill, home button, speech bubble, start button, parent lock) is HTML on top of the canvas, so the Arabic text is crisp, right-to-left, and placed with the iPhone safe-area insets.
15. **Buttons respond on touch-down** (not on release) for instant response, except the start button, which uses a full tap because iOS requires one to unlock sound and speech.

### Flow
16. **The `start` line** ("where do we go today?") plays when the map first appears after the start tap, because iOS cannot speak before the first tap. Later returns to the map use `map_next`.
17. **Tapping an adventure pin** speaks the place name, then opens the adventure when the line ends (at most 3.5 seconds).
18. **Milestone 1:** the Umm Qais, Amman and Irbid pins only say their names; their adventures come in Milestone 2. Nothing shows a lock or "coming soon". `?scene=` for a place not built yet opens the map.
19. **The day lives in memory only.** Closing or reloading the app starts a fresh day. The sun moves one step per finished adventure (once per adventure per day), with a faint warm tint on the map that deepens with each step.
20. **The map says `map_hint`** after 9 seconds without a tap.
21. **The speech bubble** stays on screen with the last line, so the "hear it again" button is always there.
22. **Parent area in Milestone 1** holds only the music switch. The lock is at the top-left of the map. The rest arrives in Milestone 3.
23. **Debug `?scene=petra`** jumps straight to the scene. Sound starts at the first touch, so the opening line may be shown silently.

### Petra
24. **Obstacle order** (nearest first): rock_a (light), rock_b, rock_c, thorn_branch, rock_d (heaviest), big_branch (largest, smallest grip). He may clear them in any order.
25. **Forgiving drops:** an obstacle goes into a nook if released within about 105 points of a free nook, or anywhere over the outer side of the path (it goes to the nearest free nook on that side). Anything else slides gently back to where it was.
26. **Thorns:** the first touch on the thorny part of each branch also plays `petra_thorn`; later touches give only the "آي!" and the wobble.
27. **Hint hand:** after 6 seconds without a touch it shows the next obstacle being dragged to the nearest free nook. The first hint on a rock also plays `petra_hint`; on a branch it plays `petra_thorn` if not heard yet.
28. **Ending order:** when the path is clear the boy and cart walk on (`petra_clear`), the screen cross-fades to the Treasury plaza, the old man arrives and says his line, then goes on his way while the camera rises over the facade and birds cross. The father's hadith line plays over the final frame, and the game returns to the map 2.6 seconds after it ends.
29. **A chime** sounds when each obstacle settles into its nook (the spec's "gentle chime for a finished step"). There is no counter.

### Sound
30. **Sound effects in Milestone 1:** rock thud, dust puff, grab, footsteps, chime, thorn prick, tap, cart creak, birds, whoosh, slide. The rest arrive with the adventures that need them.
31. **iPhone silent switch:** the game asks Safari to play through it where supported (iOS 17 and later). Older phones may stay silent while the switch is on.
32. **Voice timing:** if the phone's voice never reports that it finished, the game moves on after a safety delay based on the line's length. Without an Arabic voice, each line stays on screen for a reading time based on its length.

### Content
33. **`content/lines.json`:** each line has `tts` and `script`; religious lines hold only `{"registry": "<source_id>"}` and take their text from the registry.
34. **`content/registry.json`:** the hadith entries have empty `original_arabic` and `translation` with a `todo_owner` note. For `quran_3_190`, `child_paraphrase_tts` and `child_paraphrase_script` are `null` (not the words "not spoken synthetically"), with `"tts": false`, so code can never speak them; its translation is left empty for the owner.
35. **The registry warning** is already printed by `npm run build` (section 8), since the Petra hadith line depends on the registry.

## After Milestone 1

36. **Phone held sideways:** the game is portrait only, but iPhone home-screen apps ignore the manifest's orientation. A phone held sideways shows a full-screen "امسك التلفون واقف" picture instead of a squashed game. It returns to the game when the phone is upright again.
37. **On a computer:** the interface stays in a phone-shaped column over the game. A window shorter than 500 pixels shows a note asking for a taller window. The iPhone remains the only target.
38. **The phone's Arabic voice is looked up again before every line,** because iOS can load its voices late. The parents' corner now shows which Arabic voice the phone offers, or says that there is none. This is shown on screen only and never stored or sent.
39. **Arabic text drawn inside the game** (map names, "آي!") does not use Phaser's right-to-left option, because iPhone Safari ignores it and showed only one letter of each name. The text is drawn left-to-right, which keeps Arabic letters correctly joined and ordered, with invisible right-to-left marks so punctuation lands on the correct side.
40. **Arabic text in the game world is HTML, not canvas.** Place names on the map and the "آي!" pop are HTML laid over the canvas, in a layer scaled to the 390 x 844 design frame. Canvas text broke on iPhone Safari; HTML Arabic (like the speech bubble) displays correctly there.
41. **Voice speed is 1.0 (natural)** instead of the spec's 0.9, at the owner's request. The game prefers the phone's best Arabic voice: a Jordanian one if present, then Premium, then Enhanced, then any Arabic voice.
42. **Placeholder backgrounds** show a small "missing art: <name>" line under the place-name pill, instead of a huge name across the middle of the screen.
43. **Version stamp:** the parents' corner shows the build's commit and time, so we can tell which version a phone is running.
44. **Map picture fit:** `bg_map` is shown whole, 390 points wide, centered vertically, with its own cream color (#fae8ca) filling the space above and below. Covering the screen would have cropped the Dead Sea and Aqaba off the sides.
45. **Map pins** sit on the landmarks drawn in `bg_map` (measured from the delivered art). The place names sit beside them in the empty eastern desert so they don't cover the drawings. One tap area covers each pin and its name. If the map art changes, re-measure the positions in `PINS` (src/scenes/map/MapScene.ts).
46. **Petra layout for the delivered Siq:** the path is visible only from the middle of the screen down, so the six obstacles are piled on it in perspective (nearer ones lower, bigger, and in front). The nooks sit at the foot of the canyon walls. At the end, the boy and the cart walk away into the Siq, getting smaller, instead of up off the screen.
47. **Petra touch picking:** obstacles are picked by shape, not padded boxes. Rocks respond to an oval slightly larger than the rock, and branches to a band along the branch. Where shapes overlap, the closest fit wins. An obstacle is placed in a nook only after a real drag (at least 40 points from where it started, then within 85 points of a free nook, or well over to one side). A tap and release never places it.
48. **Map taps:** each place answers to its pin (a 56-point square) and its name's box. Where two overlap, the pin or name closest to the finger wins.
49. **Map edges:** the bands above and below the map picture use the picture's own top and bottom edge colors, so no seam shows.
50. **Petra end:** placed branches lie along the foot of the wall. The cart turns to face the way it goes as it heads into the Siq.
## Milestone 2

51. **Umm Qais:** the rope is part of the `boy_pull` art (there is no rope image, and the spec forbids drawing objects in code). The handle he drags is a glow ring at the boy's hands. The bucket is visible only above the well's mouth. Its water level shows as `bucket_full` fading over `bucket_empty`.
52. **Umm Qais pull rhythm:** a pull faster than about 700 points a second sloshes water out (560, then 520, for later buckets, so the rhythm gets stricter). A bucket never drops below 20 percent. A full bucket fills half the trough and a sloshed one less, so steady pulling needs two buckets. The third bucket always fills the trough, so nobody gets stuck.
53. **Amman ball:** the jar falls on the fourth tap, or on the first tap after 8 seconds of play if he taps faster, so the ball stays pure fun for about 10 seconds.
54. **Amman choice:** the two buttons are identical in size, color and style, and their left-right order is shuffled each time, so position hints at nothing. No hint hand appears during the choice.
55. **Amman water on the floor** is shown as water droplets (particles), since there is no puddle image. He wipes them away with the cloth.
56. **Amman ending:** both branches end the same way. Mama kneels and thanks him (`am_mama_thanks`), they sweep and wipe together, he steps into Mama's arms (the hug), and the father says `am_brave`, then the hadith line. In the hide branch, the shards come back out from under the rug once he tells the truth, so they can clean up together.
57. **Irbid watchers:** there is no curtain animation art, so "the curtain moves" is shown as the light behind the curtain brightening, with a rustle. Looks alternate between the window and a passerby. Each comes with a short warning that gets shorter as he goes. If he is seen, the passerby smiles and walks on, and the boy ducks back behind the olive tree.
58. **Irbid has no chime at all**, not even for packing or knocking, so nothing could read as a reward. The neighbor "looks left and right" by turning her image to face each way.
59. **Hint hand everywhere:** after 6 seconds without a touch, each place shows the next gesture (drag, tap, or press-and-hold).
60. **Positions** of the well, trough, shelf, rug, door, tree and window are constants at the top of each scene file, to be tuned once the backgrounds arrive.
61. **Voice speed choice (owner's option c):** the parents' corner offers slower (0.85), normal (1.0) and faster (1.15) for the phone's Arabic voice. Choosing one plays a sample line. The choice is remembered on the device, so two device settings are stored instead of the spec's one (music, voice speed). Nothing about the child is stored.
62. **Hint hand and tween chains:** a hint is stopped with `stop()`. Calling `remove()` on a tween chain threw an error and blocked every later touch.
63. **A place counts as done when its story's consequence ends,** before the closing hadith line. Tapping home during that line still moves the sun.
64. **No chime at the Amman hug,** so nothing could read as a reward for telling the truth (spec 13: when unsure, leave it out).
65. **Amman buttons** sit at 36 percent of the screen height, so the floor (shards, water, rug) stays visible while he chooses.
