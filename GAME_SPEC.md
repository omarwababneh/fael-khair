# فاعل خير (Fa'el Khair): game specification for Claude Code

Read this whole file before writing any code. It is the single source of truth for the project. Where it is silent, choose the simpler, more conservative option and record the choice in `DECISIONS.md`. Do not ask the owner questions unless a step is impossible without him; the decisions are already made here.

---

## 1. What we are building

A private game for one Arabic-speaking boy in Jordan, aged 6 to 7, who is starting to read. He plays on his mother's iPhone.

- **Form:** an installable, offline Progressive Web App (PWA) hosted on GitHub Pages. His mother opens a link in Safari, taps Share, then "Add to Home Screen". No App Store.
- **Session:** a short day (four missions) takes 8 to 10 minutes; a long day (the default since version 3) has up to six. Short missions, chosen by him from seven real places in Jordan, then a calm night-sky ending in Wadi Rum. The last mission of every day is a quiet good deed that nobody sees (section 4.3). `MISSIONS_V2.md` holds the full mission designs.
- **Purpose:** to help him grow an inner disposition toward goodness, so that he does good when there is no screen, no reward and nobody watching. The game is a tool inside his father's upbringing of him. It does not replace the father.
- **Governing principle:** نجاح اللعبة أن يبقى أثرها بعد إغلاقها. The game succeeds if its benefit remains after it is turned off.

The three tests every design choice must serve:

1. **Enjoyment:** he chooses to play it without being told to.
2. **Moderation:** he can stop peacefully.
3. **Transfer:** its meaning shows up in what he says and does at home.

Never trade test 2 or 3 for test 1.

---

## 2. Rules that are never broken

### Religious
- Never depict, voice or impersonate Allah, any prophet, any companion, any angel or any holy figure. All other people are drawn normally, with full cartoon faces.
- Never invent a Quran verse, hadith or religious story. Every religious line comes from `content/registry.json` (section 8). If a line is not in the registry, it is not in the game.
- Keep the Sunnah and the fiction apart. The adventures are invented stories inspired by a hadith. The father's line that mentions the hadith states only what the hadith states, with no game details mixed in.
- Quran text is shown only in the night ending, as a still, respectful text block. It is never animated as a prize, never draggable, never collectible, never placed on the ground. It is never read by a synthetic voice. All game input and all sound effects stop while it is on screen.
- No scores for goodness: no hasanat counters, Jannah points, sin meters, faith levels, or any claim that Allah accepted a deed.
- No monuments drawn with statues or carved human or animal figures. Simplify such details to plain stone.
- No magic, no supernatural powers, no visual scenes of Jannah, Jahannam or the unseen.
- Language of love, hope and gratitude toward Allah. Never "Allah is angry with you", never shame.

### Ethical design
- Forbidden: coins, points, stars, levels-as-rank, inventories, unlockable rewards, loot boxes, random prizes, streaks, daily login pressure, countdown timers, leaderboards, social features, notifications, ads, purchases, analytics, tracking, any network request after the app is installed.
- **Coins.** The ban is on coins as a reward or currency for the player. A coin that is part of a story, which he hands back and never keeps or counts for himself (I2), is allowed. Coin art stays plain, with no face and no writing.
- No fail screens, no "wrong" buzzer, no lives. A slip is followed by a gentle retry.
- Consequences of a good act land on other characters and on the world, never on the player's status. Example: the dog drinks; the road is clear.
- The secret good deed gets no acknowledgment of any kind (section 4D).
- Never punish him for stopping or for missing a day. Nothing is lost by closing the app.
- Never teach an action that is dangerous to copy. He never climbs into the well.

### Privacy
- The repository is public. Never commit names, photos or personal details of the family.
- **Storage.** The game may store, on the device only, the day length («طول اليوم», version 3), the road and moving-background switches («الطريق»، «حركة الخلفية», version 3 part B), the sound choice, the music volume, the voice speed, whether sound plays through the silent switch, one number per place (which mission comes next and whether he has been around once), and the parent's own recordings of the voice lines made in the parents' corner. Nothing about what he chose or how he played. It is never shown, never counted and never sent anywhere; the recordings are never uploaded. (Confirmed by the owner for version 2; recordings added by the owner later.)

### Rules added by MISSIONS_V2
Every rule above still holds. `MISSIONS_V2.md` section 4 adds rules that apply to every mission, old and new: mercy with wisdom (a trusted adult whenever a stranger, an animal in trouble, broken glass, a leak or a lost child is involved; never alone with a stranger; never touching a wild or unfamiliar animal; light loads only; food shared only after asking, never a shared cup; good and bad secrets), no shame, the father describes and does not grade, everyday remembrance (only بسم الله، الحمد لله، إن شاء الله، ما شاء الله، سبحان الله، الله يرضى عليك are used freely; any other religious sentence comes from the registry), Quran in missions only as the short paraphrase, no jingle or musical sting for a moral choice or a good deed, and short two-form voice lines.

---

## 3. Player flow

1. **Start screen.** The app title "فاعل خير" over the map art, and one large button "يَلّا" (Let's go). The first tap unlocks audio (required on iOS).

From the map on, a day works as follows (copied word for word from `MISSIONS_V2.md` section 3; its storage rule is now in section 2). Section numbers inside the list refer to `MISSIONS_V2.md`.

1. **Map.** All seven places are open from the first second. No locks, no "coming soon", no marks showing what was played.
2. **One mission per place per day.** When he taps a place, it plays that place's next mission in its rotation (mission 1, then 2, then 3, then 1 again). A place he has played today becomes scenery with a voice for the rest of the day, the way Jerash behaves now: it bounces and says its name.
3. **Day length (version 3).** A day has up to six missions before Wadi Rum: five, then the quiet deed. The parents' corner setting «طول اليوم» chooses «طويل» (up to six, the default) or «قصير» (four, as before). Six is a maximum, never an obligation: on a long day, once he has finished three missions, the map shows a button in the choice buttons' style, «خلصنا لليوم؟». If he taps it, the father says «حسناً، مكانٌ أخير لليوم.» (`day_last`), the next place he opens plays its quiet deed, and then Wadi Rum opens as usual. Nothing presses him to use it. Only the setting is stored; the day itself lives in memory.
4. **The sun** moves one equal step after each mission: six steps on a long day, four on a short one. If he ends a long day early, the sun stands where that shorter day puts it.
5. **The last mission of the day is always the quiet deed** of whichever place he opens last (section 6): the sixth on a long day, the fourth on a short day, or the one after «خلصنا لليوم؟». It does not advance that place's rotation. If the parents switch to a shorter day after he has already played more missions, the next mission is the quiet deed.
6. **After the quiet deed** the map turns to dusk, the Wadi Rum pin glows, and the other places become scenery with a voice. Wadi Rum opens the night ending.
7. **Free time (version 3).** After every ordinary mission's closing line (never after a quiet deed, never in Wadi Rum), the scene stays open instead of returning to the map. The father says `free_open` once. Two or three things already in the scene react to a tap with a small motion and a soft sound, the same every time: no hidden surprises, nothing that grows the more he taps, no goal, no counting, no praise, no chime, nothing stored. The home button takes him to the map at any time. After 45 seconds the father says `free_invite` once; nothing forces him out.
8. **The road (version 3 part B).** After he taps a place and before an ordinary mission opens, a short drive of about 25 to 30 seconds: the northern road for Umm Qais, Irbid, Jerash and Amman, the southern road for the Dead Sea, Petra and Aqaba. The landscape scrolls, the family car stays in view and its wheels turn. He rides in the back as a passenger: nothing lets him steer or speed up. The father says `road_look` once, then three sights from that road's set pass by, different each trip. If he taps a sight it gives a small friendly motion and the father names it; if he does not, the father names it anyway as it passes. No score, no count, no "found" mark, nothing stored. No road before a quiet deed or before Wadi Rum. The parents' corner switch «الطريق» turns it off (on by default).
9. **The world remembers (version 3 part B).** A place he has visited shows nature growing there (an olive tree, the mint at home, oleander, poppies, jasmine, a date palm, the planter at the Dead Sea), chosen only from the place's stored rotation number. It is nature growing, never his achievement: no sparkle, no sound, no count, nothing to touch, and never in a quiet deed. The father says `world_grown` once, on arrival, the first time a place shows a bigger stage.
10. **Free-time animals and moving backgrounds (version 3 part B).** In free time, small animals of the place come out (a lizard, a butterfly, a hoopoe, a crab, a pigeon, a jumping fish, a hedgehog); each reacts to a touch with a small motion and a soft sound, the same every time, and settles; nothing lets him catch, hold or collect one. Transparent layers over the backgrounds move gently (clouds, far birds, a branch, foam, glints, a glow): on arrival and in free time; still during a moral choice, the father's key lines and every quiet deed's final moment; in Wadi Rum all motion stops before the ayah. They respect the phone's reduce-motion setting, and the parents' corner switch «حركة الخلفية» stops them (on by default).
11. **"خلصنا لليوم"** returns to the start screen. Starting again begins a fresh day at once. There is no waiting, no daily lock and nothing lost by stopping halfway.
12. **Rotation moves by play, not by the calendar.** A place's rotation advances only when its mission is finished. Missing a day changes nothing.
13. **Small variation on replay.** Each mission has two or three light variations chosen at random: where objects lie, how many there are, which side a character stands on. The story and the value never change.

**Storage.** The game may now store, on the device only, one small number per place: which mission comes next, and (version 3) the parents' day-length, road and moving-background settings. Nothing else about play is stored. It is never shown, never counted and never sent anywhere. Update the privacy rule in `GAME_SPEC.md` section 2 to say exactly this. (Owner, later: the parent's own recordings of the voice lines, made in the parents' corner, may also be stored on the phone. They are never uploaded or sent anywhere.)

A short day should take 8 to 10 minutes; a long day longer (see `DECISIONS.md` for the measured length). Each mission lasts 60 to 120 seconds, plus any free time he chooses.

A home button on every mission returns to the map at once, with no confirmation and no penalty.

**While the missions are being built** (`MISSIONS_V2.md` section 12): until a place's missions are built, that place stays scenery with a voice. Until a place's quiet deed is built, its next ordinary mission plays in the last slot. Until I2 and I3 exist, I1 plays in any slot.

---

## 4. The missions

Seven places have missions: Petra, Umm Qais, Amman, Irbid, Jerash, the Dead Sea and Aqaba, three each. Wadi Rum is the night ending. The full play, outcome, safeguards and suggested art of every mission are in `MISSIONS_V2.md` section 5; this section lists them and keeps the original descriptions of the four built missions.

Shared rules: every mission opens with one father voice line that sets the situation (his work starts with "بسم الله"), shows a moving hand hint if he does nothing for 6 seconds, and closes with the father's line from the registry over a calm final frame. Quiet deeds close differently (section 4.3). Each mission lasts 60 to 120 seconds, gives an easy first win inside 10 seconds and gets a little harder.

### 4.1 All missions

| Id | Mission | Place | Value | Source | Status |
|---|---|---|---|---|---|
| P1 | Clearing the road | Petra | removing harm from the path | `bukhari_2472` | built |
| P2 | The lost pouch | Petra | trust (amanah), returning what is lost | `bukhari_2427` | built (wave 1) |
| P3 | Loading the cart | Petra | helping someone with his load | `bukhari_2989` (mount) | built (wave 1) |
| U1 | The thirsty dog | Umm Qais | mercy to animals | `bukhari_2363` | built |
| U2 | The olive saplings | Umm Qais | planting good others enjoy later; patience; trust in Allah | `muslim_1553a` | built (wave 2) |
| U3 | Sharing the harvest | Umm Qais | fairness between two | `bukhari_2989` (justice) | built (wave 2) |
| A1 | The broken jar | Amman | truthfulness | `muslim_2607c` | built |
| A2 | The block tower | Amman | self-control when angry | `bukhari_6114` | built (wave 2) |
| A3 | Mama's shopping | Amman | kindness to parents | `quran_17_23` | built (wave 2) |
| I1 | The secret helper | Irbid | giving in secret | `bukhari_660` | built (Irbid's quiet deed) |
| I2 | Too much change | Irbid | trust, giving people what is theirs | `quran_4_58` | built (wave 2) |
| I3 | The new boy | Irbid | a kind word; including the one left out | `bukhari_2989` (good word) | built (wave 2) |
| J1 | After the festival | Jerash | removing harm from where people walk | `bukhari_2989` (harm) | built (wave 3) |
| J2 | The lost little girl | Jerash | helping someone in distress | `muslim_2699a` | built (wave 3) |
| J3 | The forgotten lunch | Jerash | feeding others | `bukhari_12` | built (wave 3) |
| D1 | The dripping taps | Dead Sea | not wasting water | `quran_7_31` | built (wave 3) |
| D2 | Seeing the blessings | Dead Sea | gratitude | `quran_14_7` | built (wave 3) |
| D3 | Walking with Grandfather | Dead Sea | honoring the elderly | `tirmidhi_1920` | built (wave 3) |
| Q1 | The turtle and the plastic | Aqaba | mercy to animals; keeping harm out of their home | `bukhari_2363` | built (wave 4) |
| Q2 | The honest scale | Aqaba | honest weight | `quran_55_9` | built (wave 4) |
| Q3 | The sandcastle promise | Aqaba | keeping a promise | `quran_17_34` | built (wave 4) |

### 4.2 The four built missions
They stay as they are and become the first mission of their place, with the safeguards `MISSIONS_V2.md` adds.

#### P1. Petra: clearing the road (formerly 4A)

- **Value:** removing harm from people's path. **Source:** `bukhari_2472`.
- **Place:** the Siq, the narrow rose-red canyon that leads into Petra. Portrait suits it: tall walls, a sandy path running up the screen.
- **Situation:** an old man with a small donkey cart cannot get through. Rocks and thorn branches block the path.
- **Play:** drag each obstacle to a glowing nook at the canyon side.
  - Rocks feel heavy: they follow the finger with a slight lag, land with a thud and a puff of dust.
  - Thorn branches must be picked up by the smooth end, which glows. Touching the thorny part makes the boy pull his hand back with a small "آي!" and a wobble. No penalty; he tries again.
  - Six obstacles in total: three rocks, a thorn branch, a rock, a larger branch.
- **Consequence:** as the path clears, the cart rolls forward behind him. When the last obstacle is gone, the boy and the cart walk on, the screen cross-fades to the Treasury plaza, and the camera rises slowly over the facade in warm light while birds cross the sky. The old man says his one line and goes on his way.
- **Ending line:** the father's hadith line.
- **Added (MISSIONS_V2):** Safeguard to add: the obstacles are loose stones and fallen branches only. He never moves, climbs or touches the ancient carved rock. Add one father line saying we look after the old place.

#### U1. Umm Qais: the thirsty dog (formerly 4B)

- **Value:** mercy to animals. **Source:** `bukhari_2363`.
- **Place:** the old hilltop village of Umm Qais: black basalt columns, a stone well, a wide view over the valley and the lake far below.
- **Situation:** a stray dog pants beside an empty stone trough.
- **Play:** a rope-and-bucket pull. The well has an iron safety grille with a small bucket hatch in the middle; the bucket passes only through the hatch. The boy pulls the rope standing a step back from the well and never leans over it.
  - Drag the rope handle downward in steady strokes to raise the bucket.
  - Pull too fast and water sloshes out (the bucket's water level visibly drops, with a splash sound). Steady pulls keep it full.
  - When the bucket reaches the top, drag it to the trough and tilt it by dragging downward to pour.
  - Two buckets fill the trough.
- **Consequence:** the dog drinks, its tail wags, it stretches, then it trots away toward the hills. It does not follow him and does not become a pet. He is not given the dog.
- **Ending line:** the father's hadith line.
- **Added (MISSIONS_V2):** Safeguard to add: he pours the water into the trough and steps back. He does not pet or approach the dog. The well stays covered by its frame, as now.

#### A1. Amman: the broken jar (formerly 4C)

- **Value:** truthfulness, then repair without shame. **Source:** `muslim_2607c`.
- **Place:** the family home in Amman. An arched window looks over the city's hills of pale stone houses, with the Citadel columns on the skyline.
- **Opening play:** he bounces a ball. Each tap bounces it higher; this part should be pure fun for 10 seconds. On the fourth bounce the ball knocks a clay jar off the shelf. It breaks and water spreads on the floor. The accident happens inside play, not through a bad choice.
- **The choice:** two buttons of identical size, color and position weight: "بَحكي لَماما" (I tell Mama) and "بَخَبّيها" (I hide it). Nothing hints at which is right.
- **If he tells:** Mama comes in, kneels to his height and thanks him calmly for telling her. Together they clean up: he sweeps the shards into a dustpan with swipes and wipes the water with a cloth. Mama hugs him.
- **If he hides:** he drags the shards under the rug. Mama comes in and asks where the jar is. A small gray cloud appears above his head and water creeps out from under the rug. The father's voice says gently that the truth rests the heart, and one button appears: "بَحكي الحَقيقة" (I tell the truth). When he taps it, the cloud dissolves and the same clean-up and hug follow. There is no scolding and no sad ending. The door back to honesty is always open; that is the lesson.
- Mama is never angry in either branch. Do not show punishment.
- **Ending line:** the father's hadith line.
- **Added (MISSIONS_V2):** Safeguards to add: he does not touch the shards with his hands. He tells Mama, and she handles the sharp pieces while he sweeps with the long broom. Check that no line suggests the accident itself was a wrong.

#### I1. Irbid: the secret helper (formerly 4D)

- **Value:** sincerity, doing good without being seen. **Source:** `bukhari_660`.
- **Place:** a street in old Irbid at dusk: dark basalt and pale limestone houses, an arched green door, an old olive tree.
- **Situation:** an elderly neighbor is unwell and cannot go to the market.
- **Play in three beats:**
  1. **Pack the basket.** Drag five Jordanian foods into it: bread, olives, labneh, tomatoes, apples.
  2. **Sneak to the door.** Hold a finger on the screen to tiptoe; lift it to freeze. Freeze when the curtain moves or a passerby turns his head. If he is noticed, the passerby simply smiles and walks on, the boy ducks back behind the tree, and he tries again.
  3. **Deliver.** Set the basket down, tap the door three times to knock, then swipe toward the olive tree to hide.
- **Consequence:** the neighbor opens the door, looks left and right, finds the basket, smiles and takes it inside. She never learns who left it.
- **Hard rule:** no thanks to the boy, no sparkle around him, no cheer, no special sound, no badge, nothing unlocked. The only reward is watching her smile from behind the tree. The return to the map looks exactly like the return from any other mission.
- **Ending line:** the father's line that nobody knew, but Allah knows; then the hadith line.
- **Added (MISSIONS_V2):** No change to the scene. The sentence about good and bad secrets goes in the parents' corner, not in the scene.

### 4.3 The quiet deed (last mission of every day)
Copied word for word from `MISSIONS_V2.md` section 6. Section numbers inside it refer to `MISSIONS_V2.md`.

The governing idea of this game is that he does good when there is no screen, no reward and nobody watching. So every day ends its missions with a good deed that nobody sees.

Rules, the same as Irbid today:
- Nobody in the story learns who did it. Nobody thanks him. He is not shown being noticed.
- No chime, no sparkle on him, no hadith line, no closing praise. The father says at most one plain line about what changed in the world, then the map.
- The world shows the result after he has gone: someone arrives and simply enjoys it.

**One exception:** Irbid's quiet deed (I1) keeps its closing hadith line (`bukhari_660`). It is the one quiet deed whose hadith is about giving in secret. Every other quiet deed ends without a hadith line.

One quiet deed per place. Keep them short (about 60 seconds) and reuse art.

| Place | Quiet deed | Reuses |
|---|---|---|
| Petra | Before sunrise the Siq is empty. He clears the fallen stones and leaves. Later a family walks through without knowing. | P1 scene, cooler dawn tint |
| Umm Qais | A neighbor's young trees are wilting. He waters them with the can while nobody is there. In the evening they stand up straight. | U2 art |
| Amman | Before Mama wakes he waters her mint pots on the windowsill and folds the blanket. She smells the mint and smiles at the window, not at him. | `bg_amman_home`, `plant_dry`, `plant_fresh`, `watering_can` |
| Irbid | The secret basket (I1 as built). On days when Irbid is opened first, second or third, it plays I2 or I3; I1 is kept for the last slot. | built |
| Jerash | Early morning, the plaza is empty. He bins the safe litter and goes. The first visitors walk in on clean stone. | J1 art, no guard, no glass |
| Dead Sea | One tap drips with nobody around. He turns it off and walks on. | D1 art |
| Aqaba | At sunrise he clears plastic from the empty beach. Later a turtle crosses the clean sand to the water. | Q1 art |

Because I1 is Irbid's quiet deed, Irbid's rotation for the first three slots is I2, I3 only. Every other place rotates through its three missions.

### 4.4 Wadi Rum: the night sky (ending; formerly 4E)
- **Value:** reflection on creation (tafakkur) and gratitude. **Source:** `quran_3_190`.
- **Place:** Wadi Rum at night: red sandstone mountains, a sky full of stars. The boy sits on a rock, seen from behind.
- **Play:** slow and quiet. He drags a finger across the sky and stars brighten where he touches. Now and then a shooting star crosses. No goal, no count.
- **Ayah:** still text with its reference "آل عمران ١٩٠". If the file `audio/quran/3_190.m4a` exists, play it; otherwise show the text in silence for 10 seconds. Never use a synthetic voice here. All input and sound effects are stopped while it shows.

Changes from `MISSIONS_V2.md` section 7, copied word for word ("section 4E" there is this section, 4.4):

Build it as `GAME_SPEC.md` section 4E describes, with these changes:

- **No music at all in Wadi Rum.** Wind and a few crickets only. Remove the generated Wadi Rum melody.
- **Star drawing (version 3).** After `wr_open`, the father says `wr_draw` and he can drag from star to star to draw glowing lines (a light effect). No target shape, no judgment. It ends when he taps «يلّا», or by itself after 20 seconds without a touch, and at the latest after 90 seconds. All the lines and effects then fade out completely before the closing line.
- Then input off, sound effects off. Nothing moves or responds to touch while the ayah is on screen.
- The father's closing line comes **before** the ayah, in his own voice or the phone's voice. `script`, exactly:
  "يا حبيبي، شوف قديش خلق الله جميل. اليوم ساعدنا ناس وحيوانات باللعبة، وبكرا إن شاء الله بنقدر نعمل خير بحياتنا. مش لازم حدا يشوفنا أو يشكرنا، الله بعرف الخير اللي بنعمله."
  This line rests on `quran_2_215` and is pending approval like every religious line. Write a simple Standard Arabic `tts` form of it.
- Then silence. The ayah `quran_3_190` fades in as still text, as specified. Recitation only if the file exists. Stars and wind.
- Then "تصبح على خير يا حبيبي." and the button "خلصنا لليوم".
- No summary of the day, no list of deeds, no completion screen, no preview of tomorrow.

---

## 5. What makes it fun (keep all of this)

The game must feel alive. This matters as much as the content.

- **Motion everywhere.** Olive leaves sway, dust motes drift in light, birds cross the sky, water ripples, the boy breathes when idle. Nothing on screen is perfectly still.
- **Juice on every touch.** Objects squash and stretch when grabbed and dropped. Every action has a sound and a small particle burst (dust, droplets, leaves).
- **Easy first win.** The first obstacle in every mission takes one obvious gesture and succeeds within 10 seconds.
- **Rising challenge.** Each mission gets slightly harder as it goes: heavier rocks, the careful grip on the thorn branch, the steady rope rhythm, the timing of the sneak.
- **Surprise in the story, never in a prize.** The Treasury reveal, the dog's stretch, Mama kneeling, the neighbor's face.
- **Responsive controls.** Touch response within one frame. Large hit areas (at least 56 points). Forgiving drag targets.
- **Short.** No mission runs past two minutes.

---

## 6. Art

### 6.1 The locked style
The style reference is `art/reference/style_village.jpg`. Every image in the game must look as if the same illustrator drew it:

- Hand-drawn children's storybook illustration.
- Clean dark-brown ink outlines of even weight.
- Flat warm colors with soft cel shading and gentle golden light.
- Palette: cream limestone, sandy ochre, olive and sage greens, terracotta, soft sky blue; rose-red sandstone for Petra and Wadi Rum; black basalt for Umm Qais and Irbid.
- Friendly rounded shapes. Full, warm cartoon faces.

### 6.2 Hard rule for Claude Code
**All scenery, characters and objects come from image files in `art/`. Never draw them with code** (no shapes, SVG or canvas drawings standing in for art). Code may draw only interface chrome: buttons, pills, glow rings, hint hand, particles, the gray cloud, the sun on the map.

- If a required image is missing, show a flat magenta box with the asset name written on it, so missing art is obvious and never mistaken for a design.
- `npm run check:art` lists every missing or undersized asset.
- `npm run build` fails when required art is missing, unless run with `ALLOW_PLACEHOLDERS=1`. Milestone 1 may use that flag for assets not yet delivered.

### 6.3 Real places
Each background must be recognizable as the real place. Cues to include:

| Place | Must show |
|---|---|
| Petra, the Siq | tall, narrow, rose-red sandstone walls with swirling bands; sandy path |
| Petra, the Treasury | the rock-cut facade with columns and pediment, seen from the plaza; no carved figures |
| Umm Qais | black basalt columns and stones, hilltop, view down to a wide valley and a distant lake |
| Amman | hills covered in pale stone box-shaped houses; the Citadel's tall standing columns on the skyline |
| Irbid | old town houses mixing dark basalt and pale limestone, arched doorways |
| Wadi Rum | towering red sandstone mountains rising from flat desert sand; clear starry sky |
| Jerash (map) | a curved row of tall stone columns around an oval plaza |
| Dead Sea (map) | still turquoise water with white salt crust at the shore |
| Aqaba (map) | deep blue sea, palm trees, coral and fish near the shore |
| `bg_petra_tombs` | the Royal Tombs: a tall rose-red cliff face with large rock-cut facades in a row, plain stone with no carved figures; wide sandy path in front |
| `bg_ummqais_grove` | terraced olive trees among black basalt blocks and a few standing basalt columns; the valley and the distant lake |
| `bg_amman_stairs` | a long outdoor stone stairway climbing between pale limestone houses, flower pots, a landing halfway, the hills of houses beyond |
| `bg_irbid_bakery` | an old Irbid shopfront in dark basalt and pale limestone with an arched opening, a counter, round flatbread on a shelf |
| `bg_irbid_alley` | a narrow old-town lane by day, basalt and limestone walls, a goal chalked on one wall |
| `bg_jerash_plaza` | the Oval Plaza: a wide stone-paved oval ringed by a curve of tall columns |
| `bg_jerash_cardo` | the long straight colonnaded street paved with large worn stones, columns on both sides |
| `bg_deadsea_restarea` | a shaded stone rest stop with a row of taps on a low wall; still turquoise water, white salt edge and hazy mountains behind |
| `bg_deadsea_shore` | a viewpoint path above the shore, white salt crust at the waterline, still turquoise water, mountains across the water, room for a bench |
| `bg_aqaba_beach` | golden sand, deep blue sea, palm trees, dry mountains across the gulf, a small rescue hut at one side |
| `bg_aqaba_harbor` | a fish stall beside small wooden boats on blue water, palms, a tall flagpole far away |

Backgrounds have no people. Leave calm space at the top and bottom.

### 6.4 Characters
- **The boy:** about 6 to 7 years old, short dark brown hair, big friendly eyes, sky-blue t-shirt, tan shorts, red sneakers. He has no name in the game, so the player sees himself in him.
- **Mama:** warm expression, long modest dress, hijab.
- **Old man (Petra):** white thobe, red-and-white shemagh with black agal, small donkey cart loaded with sacks.
- **Neighbor (Irbid):** elderly woman, traditional embroidered Jordanian dress, white headscarf.
- **Passerby (Irbid):** a man in everyday clothes carrying a bag.
- **Dog:** a slim tan stray with upright ears, friendly.

Added by `MISSIONS_V2.md` (all with full, friendly cartoon faces):
- **Baba:** in his thirties, short dark hair, short trimmed beard, plain shirt and trousers.
- **Grandfather:** white hair and beard, white thobe, walking stick.
- **Little sister:** about four, two short pigtails, yellow dress.
- **Friends (two):** boys his age in different colored t-shirts, different hair.
- **New boy:** his age, green striped shirt.
- **Site guard / guide:** khaki shirt, cap, lanyard with a plain card (no writing).
- **Baker:** apron, flour on his hands, white cap.
- **Travelers, visitors, customer, mother:** ordinary modest everyday clothes, each with one clear color so a six-year-old can tell them apart.
- **Fisherman:** sun-browned, rolled sleeves, straw hat.
- **Marine ranger:** light blue shirt, shorts, cap.
- **Turtle, cat, donkey, birds:** friendly, simple, same outline style.

The exact descriptions used for the art (clothes and colors chosen so a six-year-old can tell people apart) are in the checklist's prompts.

### 6.5 Asset manifest
Backgrounds are portrait, at least 1024 x 1536 pixels, with the important content in the middle 70 percent and calm space at the top and bottom for interface. Sprites are at least 1024 pixels on the long side (384 for an object on a sheet), full figure, no cast shadow, on a transparent or plain pure-white background. Art arrives in `art/incoming/` under these names (`.png`, `.jpg` or `.webp`).

**The full reference is `art/Fael_Khair_Art_Checklist.xlsx`:** one row per image with its wave, the missions it is used in, a ready-to-paste prompt, the references to attach, and in its notes which way it faces, where the boy holds it, its height on screen compared with the boy standing (boy = 1.0), and which objects may share a sheet. `scripts/art-lib.mjs` holds the same names. The list below is generated from the same data (161 images: 52 from the first version, 109 added by `MISSIONS_V2.md`). "Wave" is the build wave an image is first needed in; "existing" means it was in the first version.

**Backgrounds**

| File | Contents | Wave |
|---|---|---|
| `bg_map` | an illustrated map of Jordan, north at top, with small landmark drawings in their true positions: Umm Qais and Irbid in the north, Jerash and Amman below them, the Dead Sea on the west edge, Petra and Wadi Rum in the south, Aqaba at the southern tip by the sea. No text. | existing |
| `bg_petra_siq` | the Siq, the narrow canyon leading into Petra: tall, narrow, rose-red sandstone walls with swirling bands, a sandy path running up the picture. Empty path. | existing |
| `bg_petra_treasury` | the Treasury plaza in Petra: the rock-cut facade with columns and pediment, seen from the plaza, in warm light. No carved figures (simplify any to plain stone). | existing |
| `bg_ummqais_well` | the old hilltop village of Umm Qais: a stone well with a wooden frame in the foreground, its mouth covered by an iron safety grille with a small square bucket hatch in the middle, black basalt columns and stones, a view down to a wide valley and a distant lake. No bucket, no rope. An empty stone trough at left. | existing |
| `bg_amman_home` | a family home interior in Amman: an arched window looking over hills covered in pale stone box-shaped houses, with the Citadel's tall standing columns on the skyline; a wooden shelf at right, a tiled floor, a rug, a wide windowsill. | existing |
| `bg_irbid_dusk` | an old Irbid street at dusk: old town houses mixing dark basalt and pale limestone, arched doorways, a closed arched green door at center-right, an old olive tree at left, a window with a curtain. | existing |
| `bg_wadirum_night` | Wadi Rum at night: towering red sandstone mountains rising from flat desert sand; a big, empty, clear starry sky in the upper two thirds. | existing |
| `bg_petra_tombs` | the Royal Tombs in Petra: a tall rose-red cliff face with large rock-cut facades in a row, plain stone with no carved figures; a wide sandy path in front. | 1 |
| `bg_ummqais_grove` | terraced olive trees among black basalt blocks and a few standing basalt columns at Umm Qais; the valley and the distant lake below. A strip of open, bare, planting soil across the lower third. | 2 |
| `bg_amman_stairs` | a long outdoor stone stairway in Amman climbing between pale limestone houses, flower pots, a landing halfway, the hills of houses beyond. The steps rise from bottom left to top right. No animals. | 2 |
| `bg_irbid_alley` | a narrow old-town lane in Irbid by day, basalt and limestone walls, a simple goal chalked on one wall (two posts and a bar only, no letters or numbers). | 2 |
| `bg_irbid_bakery` | an old Irbid bakery shopfront by day in dark basalt and pale limestone with an arched opening, a counter at the front with an empty flat metal tray on it, round flatbread on a shelf behind. No signs or writing. | 2 |
| `bg_jerash_cardo` | the long straight colonnaded street in Jerash paved with large worn stones, columns on both sides receding into the distance. | 3 |
| `bg_jerash_plaza` | the Oval Plaza in Jerash: a wide stone-paved oval ringed by a curve of tall columns, low stone steps along the lower edge. | 3 |
| `bg_deadsea_restarea` | a shaded stone rest stop by the Dead Sea: a plain low stone wall across the front where taps will be placed (draw no taps and no plants), a shade roof, still turquoise water, a white salt edge and hazy mountains behind. | 3 |
| `bg_deadsea_shore` | a viewpoint path above the Dead Sea shore: white salt crust at the waterline, still turquoise water, mountains across the water, a flat paved path along the lower third with room for a bench (draw no bench). The sun fairly low at upper left. | 3 |
| `bg_aqaba_beach` | a beach at Aqaba: golden sand, deep blue sea, palm trees, dry mountains across the gulf, a small rescue hut with a hanging bell at the right side. No writing. | 4 |
| `bg_aqaba_harbor` | a fish stall beside small wooden boats on blue water at Aqaba, palms, a tall flagpole far away with no flag detail. The stall counter is empty (fish and the scale are separate pictures). No writing. | 4 |

**Characters** (one image per pose)

| File | Pose | Wave |
|---|---|---|
| `boy_happy` | The boy. Standing, relieved, happy face. | existing |
| `boy_idle` | The boy. Standing, relaxed, friendly smile. | existing |
| `boy_lift` | The boy. Bending to lift something heavy with both hands. | existing |
| `boy_walk_a` | The boy. Walking, first step (left foot forward). | existing |
| `boy_walk_b` | The boy. Walking, second step (right foot forward), same direction as the first walking frame. | existing |
| `boy_worried` | The boy. Standing, worried face. | existing |
| `elder_cart` | An old man in a white thobe, red-and-white shemagh with black agal, beside a small donkey cart loaded with sacks. Side view. | existing |
| `boy_pull` | The boy. Pulling a rope downward with both hands (the rope drawn in his hands, going up out of the picture). | existing |
| `dog_drinking` | A slim tan stray dog with upright ears, friendly. Head down, drinking. | existing |
| `dog_happy` | A slim tan stray dog with upright ears, friendly. Standing, tail up, happy. | existing |
| `dog_thirsty` | A slim tan stray dog with upright ears, friendly. Panting, thirsty. | existing |
| `boy_sweep` | The boy. Sweeping with a long-handled broom, both hands on the handle. | existing |
| `mama_kneel` | Mama: warm expression, long modest dress, hijab. Kneeling with open arms. | existing |
| `mama_stand` | Mama: warm expression, long modest dress, hijab. Standing. | existing |
| `boy_carry` | The boy. Carrying a basket in both arms. | existing |
| `boy_peek` | The boy. Crouching and peeking sideways, smiling. | existing |
| `neighbor_basket` | An elderly woman in a traditional embroidered Jordanian dress and a white headscarf. At her door, holding a basket, smiling, looking around. | existing |
| `passerby_look` | A man in everyday clothes carrying a bag. Head turned toward the viewer. | existing |
| `passerby_walk` | A man in everyday clothes carrying a bag. Walking, side view. | existing |
| `boy_sit_back` | The boy. Sitting on a rock, seen from behind, head tilted up toward the sky. | existing |
| `boy_kneel` | The boy. Kneeling on both knees, leaning forward, both hands flat on the ground in front of him. | 1 |
| `boy_offer` | The boy. Holding something out in front with both hands, arms forward, palms up, friendly smile. Hands empty (the game places the object in them). | 1 |
| `donkey_stand` | The same small grey donkey as in elder_cart, alone, harness on, ears up, standing. | 1 |
| `donkey_tired` | The same small grey donkey, ears drooping, head low, tired. | 1 |
| `elder_stand` | An old man in a white thobe, red-and-white shemagh with black agal, the same old man as in elder_cart, standing alone without the cart, friendly, hands ready to lift. | 1 |
| `girl_happy` | A little girl about 4 years old, short dark hair with a red hair clip, a pink dress. Happy, running with arms out. | 1 |
| `guard_stand` | A friendly site guard: a man in a khaki shirt and trousers, a cap, and a lanyard with a plain card (no writing on it). Standing, friendly, one hand slightly raised. | 1 |
| `traveler_b` | A second traveler: a man in modest everyday clothes, a bright orange shirt, a cap. Looking around, a little worried. | 1 |
| `traveler_happy` | A traveler: a man in modest everyday clothes, a blue shirt, a small backpack. Relieved and happy, walking, hands together at his chest. | 1 |
| `traveler_worried` | A traveler: a man in modest everyday clothes, a blue shirt, a small backpack. Looking at the ground, worried, hands open. | 1 |
| `birds_eating` | Three small brown birds perched close together, pecking at olives, as one group. | 2 |
| `boy_water` | The boy. Standing, tilting a small green watering can forward with both hands (no water drawn). | 2 |
| `friend_a` | A boy about 7 years old, curly black hair, an orange t-shirt, blue shorts, white sneakers. Standing, ready to play, smiling. | 2 |
| `friend_b` | A boy about 7 years old, short light-brown hair, a yellow t-shirt, grey shorts, green sneakers. Standing, ready to play, smiling. | 2 |
| `stranger_rest` | An old man, a stranger passing by (not Grandfather): grey hair, a brown jacket, a grey cap, sitting on a low basalt stone in the shade, resting peacefully, eyes half closed. | 2 |
| `boy_angry` | The boy. Standing, fists clenched, cheeks red, frowning, upset but not frightening. | 2 |
| `boy_breathe` | The boy. Standing calmly, eyes closed, one hand on his chest, breathing in. | 2 |
| `boy_carry_bags` | The boy. Climbing a step, one small light shopping bag in each hand. | 2 |
| `cat_sleeping` | A small ginger cat curled up asleep. | 2 |
| `mama_bags` | Mama: warm expression, long modest dress, hijab. Standing at the foot of the stairs holding one heavy shopping bag with both hands, a little tired, kind smile. | 2 |
| `sister_happy` | The little sister: about four years old, two short pigtails, yellow dress, full friendly face. Standing, laughing, clapping her hands. | 2 |
| `sister_play` | The little sister: about four years old, two short pigtails, yellow dress, full friendly face. Toddling forward with her arms out, playful. | 2 |
| `sister_sorry` | The little sister: about four years old, two short pigtails, yellow dress, full friendly face. Standing, small and sorry, hands together, looking up, a little sad. | 2 |
| `baker_busy` | A baker: a man in an apron with flour on his hands and a white cap. Busy, looking to the side, one hand held out to give something. | 2 |
| `baker_smile` | A baker: a man in an apron with flour on his hands and a white cap. Surprised and smiling warmly, one hand on his heart. | 2 |
| `boy_kick` | The boy. Kicking a ball (no ball drawn), right leg swinging forward, arms out for balance. | 2 |
| `boy_wave` | The boy. Standing, waving one hand high above his head, smiling, calling someone. | 2 |
| `newboy_alone` | A boy about 7 years old, short black hair, a green striped shirt, brown trousers. Standing alone by a wall, hands behind his back, shy and a little sad. | 2 |
| `newboy_happy` | A boy about 7 years old, short black hair, a green striped shirt, brown trousers. Running with arms up, a big happy smile. | 2 |
| `boy_sit_front` | The boy. Sitting on a low step, facing the viewer, legs hanging, hands on his knees, happy. | 3 |
| `classmate_happy` | A boy about 7 years old, short curly brown hair, a red t-shirt, dark shorts. Sitting on a stone step, eating half a sandwich, happy, legs swinging. | 3 |
| `classmate_hungry` | A boy about 7 years old, short curly brown hair, a red t-shirt, dark shorts. Sitting on a stone step facing the viewer, empty hands in his lap, a little sad. | 3 |
| `girl_crying` | A little girl about 4 years old, short dark hair with a red hair clip, a pink dress. Standing alone, crying, hands at her eyes. | 3 |
| `guard_sweep` | A friendly site guard: a man in a khaki shirt and trousers, a cap, and a lanyard with a plain card (no writing on it). Sweeping with a long broom into a dustpan, careful. | 3 |
| `mother_hug` | The same mother (green headscarf, long blue dress, yellow handbag), kneeling and hugging her little daughter (the girl in the pink dress with the red hair clip), both relieved and happy. Both in one picture. | 3 |
| `mother_search` | A mother in modest everyday clothes: a green headscarf, a long blue dress and a yellow handbag. Looking around, worried, searching. | 3 |
| `visitor_a` | A woman visitor in modest everyday clothes: a red headscarf, a long brown dress, no bag. Walking. | 3 |
| `visitor_b` | A man visitor in modest everyday clothes: a white shirt, grey trousers, a black backpack. Walking. | 3 |
| `baba_sit` | Baba: a man in his thirties, short dark hair, short trimmed beard, plain shirt and trousers, full friendly face. Sitting on a bench, turned slightly to his right as if talking with his son beside him, one hand open. | 3 |
| `grandpa_baba_walk` | Baba: a man in his thirties, short dark hair, short trimmed beard, plain shirt and trousers, full friendly face. Grandfather: white hair and beard, white thobe, a walking stick, full friendly face. Baba walks beside Grandfather and supports his arm; Grandfather walks slowly with his stick. Both in one picture. | 3 |
| `grandpa_sit` | Grandfather: white hair and beard, white thobe, a walking stick, full friendly face. Sitting on a bench facing the viewer, his stick leaning beside him, one hand held out to his side at child-head height (as if resting on a child's head), gentle smile. | 3 |
| `customer_basket` | A woman customer in modest everyday clothes, a purple headscarf, holding an empty basket, smiling. | 4 |
| `fisherman_stand` | A fisherman: sun-browned, sleeves rolled up, a straw hat. Standing, friendly, pointing to one side. | 4 |
| `ranger_kneel` | A marine ranger: a man in a light blue shirt, shorts and a cap. Kneeling, gently freeing something on the ground with both hands. | 4 |
| `ranger_stand` | A marine ranger: a man in a light blue shirt, shorts and a cap. Standing, friendly, empty hands. | 4 |
| `sister_bucket_wait` | The little sister: about four years old, two short pigtails, yellow dress, full friendly face. Standing on sand, holding a small red bucket with both hands, waiting, looking hopeful. | 4 |
| `turtle_free` | The same green sea turtle, free and happy, crawling. | 4 |
| `turtle_tangled` | A green sea turtle on the sand at the water's edge, a white plastic bag tangled around one front flipper, looking sad. | 4 |

**Objects**

| File | Object | Wave |
|---|---|---|
| `big_branch` | a larger dry thorny branch lying horizontally. The LEFT end is smooth bare wood with no thorns; thorns cover the rest. | existing |
| `bird` | a small bird in flight, wings spread. | existing |
| `rock_a` | a small rounded rose-red sandstone rock. | existing |
| `rock_b` | a medium rounded rose-red sandstone rock. | existing |
| `rock_c` | a larger rounded rose-red sandstone rock. | existing |
| `rock_d` | a big, heavy rounded rose-red sandstone rock. | existing |
| `thorn_branch` | a dry thorn branch lying horizontally. The LEFT end is smooth bare wood with no thorns (where a child would hold it); thorns cover the rest. | existing |
| `bucket_empty` | an empty wooden well bucket with a rope handle. | existing |
| `bucket_full` | the same wooden well bucket, full of water. | existing |
| `trough_water` | the surface of water only, as it would fill a long stone trough, seen from slightly above. | existing |
| `ball` | a child's colorful ball. | existing |
| `cloth` | a cleaning cloth. | existing |
| `dustpan` | a small dustpan. | existing |
| `jar_whole` | a clay water jar (terracotta). | existing |
| `shard_a` | one broken shard of a terracotta clay jar. | existing |
| `shard_b` | another broken shard of a terracotta clay jar, different shape. | existing |
| `shard_c` | a third broken shard of a terracotta clay jar, different shape. | existing |
| `basket_empty` | an empty woven basket with a handle. | existing |
| `basket_full` | the same woven basket, full of bread, olives, labneh, tomatoes and apples. | existing |
| `food_apples` | a few red apples. | existing |
| `food_bread` | round Arabic flatbread. | existing |
| `food_labneh` | a small bowl of labneh. | existing |
| `food_olives` | a small bowl of olives. | existing |
| `food_tomatoes` | a few red tomatoes. | existing |
| `cart_empty` | the same small wooden two-wheeled cart as in elder_cart, empty, without the donkey. Side view. | 1 |
| `pouch_blue` | the same small cloth pouch in blue, with a blue tie-string and a small embroidered yellow flower. | 1 |
| `pouch_red` | a small cloth pouch, red, tied at the top with a red tie-string, a small yellow flower embroidered on the front. | 1 |
| `pouch_red_bluestring` | the same red cloth pouch with the embroidered yellow flower, but tied with a blue tie-string instead of a red one. | 1 |
| `pouch_red_moon` | the same red cloth pouch with a red tie-string, but a small embroidered green leaf instead of the flower (the key keeps its first-draft name). | 1 |
| `sack_big` | a big, heavy, bulging burlap sack tied at the top. | 1 |
| `sack_small` | a small, light burlap sack tied at the top. | 1 |
| `basket_olives` | the woven basket (same as basket_empty) full of green and black olives. | 2 |
| `olive_tree_fruit` | a grown olive tree heavy with olives, with a wide shady crown. | 2 |
| `olive_young` | a young olive tree, healthy and upright. | 2 |
| `olive_young_wilt` | the same young olive tree, wilting, leaves drooping. | 2 |
| `olives_pile` | a heap of green and black olives. | 2 |
| `sapling_small` | a small olive sapling with a few leaves and a small root ball. | 2 |
| `scale_base` | the stand of an old-fashioned balance scale: a wooden base and an upright post with a pivot at the top (no beam, no pans). | 2 |
| `scale_beam` | the horizontal metal beam of the balance scale, a hook at each end and a hole at the centre. | 2 |
| `scale_pan` | one hanging pan of the balance scale with its three chains joined at the top. | 2 |
| `soil_mound` | a small mound of freshly dug brown soil. | 2 |
| `watering_can` | a small green metal watering can. | 2 |
| `bag_heavy` | a big full cloth shopping bag with handles, heavy. | 2 |
| `bag_light` | a small light cloth shopping bag with handles, a few vegetables peeking out. | 2 |
| `blanket_folded` | the same striped wool blanket, neatly folded. | 2 |
| `blanket_messy` | a crumpled striped wool blanket lying on a sofa cushion. | 2 |
| `block` | a plain wooden toy building block (a cube), no letters, no numbers. | 2 |
| `plant_dry` | a clay pot with a mint plant, wilted and dry. | 2 |
| `plant_fresh` | the same clay pot with the mint plant fresh and green. | 2 |
| `bread_bag` | a paper bag with round flatbread showing at the top, no writing. | 2 |
| `coin` | a plain round gold-coloured coin with a simple rim, no face, no writing, no numbers. | 2 |
| `bin` | a plain grey recycling bin with an open top and a blank round label area on the front (left empty). | 3 |
| `cup_empty` | a simple clear plastic cup, empty. | 3 |
| `cup_full` | the same clear cup, full of water. | 3 |
| `glass_broken` | a few pieces of broken green glass lying close together on the ground, glinting. | 3 |
| `litter_bottle` | an empty plastic water bottle lying on its side. | 3 |
| `litter_paper` | a crumpled paper wrapper. | 3 |
| `litter_peel` | a banana peel. | 3 |
| `sandwich_half` | half of the same sandwich. | 3 |
| `sandwich_whole` | a round flatbread sandwich with white cheese, whole. | 3 |
| `water_bottle` | a reusable blue water bottle with a cap. | 3 |
| `bag_small` | Grandfather's small cloth shoulder bag. | 3 |
| `bench` | a simple wooden bench, three-quarter view. | 3 |
| `pipe_leak` | a short metal pipe with a joint, leaking a few drops of water. | 3 |
| `tap_body` | an old brass water tap without its handle, spout pointing down, side view, on a short pipe stub. | 3 |
| `tap_handle` | the separate round cross-shaped handle of that brass tap, seen from the front. | 3 |
| `fish_big` | a large silver fish. | 4 |
| `fish_small` | a small silver fish. | 4 |
| `litter_sack` | an open cloth litter sack with its top folded down, empty, standing on the sand. | 4 |
| `plastic_bag` | a crumpled white plastic bag. | 4 |
| `sand_bucket` | a small red plastic beach bucket, empty. | 4 |
| `sand_tower` | a sandcastle tower shaped by a bucket, golden sand. | 4 |
| `shell` | a small pinkish scallop shell. | 4 |
| `weight_iron` | an old black iron weight with a ring handle on top, no numbers. | 4 |

**Icon:** `icon_app` (1024 x 1024: the boy's smiling face on a warm sand background, no text).

Objects may arrive as sheets (several objects on one white image). Support an optional `art/incoming/sheets.json` that maps a sheet file to the ordered list of object names, read left to right, top to bottom. The checklist lists the agreed sheets and their order.

### 6.6 Art preparation script
Write `scripts/prepare-art.mjs` (run by `npm run art`):

1. Read every file in `art/incoming/`.
2. For sprites without transparency, remove the flat background: flood-fill from the four corners with a small color tolerance, then soften the edge by one pixel.
3. For sheets, split into separate sprites by finding connected non-background regions, and name them from `sheets.json`.
4. Trim empty margins. Resize: backgrounds to 1170 pixels wide, sprites to at most 768 pixels on the long side.
5. Write WebP files to `public/assets/art/`.
6. Print a table of what was produced and what is still missing.

### 6.7 Image-generation prompt (for whoever makes the art)
Attach `style_village.jpg` and, for places, a real photo of the place as a reference. Use this base text, then add the subject from the manifest:

> Hand-drawn children's storybook illustration that matches the attached style reference exactly: clean dark-brown ink outlines of even weight, flat warm colors with soft cel shading, gentle golden light, friendly rounded shapes. Original characters. No text, letters, numbers, logos or interface elements. No statues and no carved human or animal figures. Subject: [SUBJECT].

For sprites add: "Single full figure, centered, plain pure-white background, no shadow, no ground."
For the boy add his description from 6.4 word for word every time.

---

## 7. Sound

### 7.1 Voice
Phase 1 uses the phone's built-in Arabic voice. Phase 2 swaps in the father's own recordings with no code change.

Build one `Voice.say(lineId)` function:

1. If `public/assets/audio/vo/<lineId>.m4a` exists, play it.
2. Otherwise speak the line's `tts` text with `speechSynthesis`, using the first available voice whose language starts with `ar`, at rate 0.9.
3. Always show the line's text in the speech bubble at the same time, so the game still works if no voice is available.

Notes for iOS:
- Voices load late. Wait for the `voiceschanged` event and also poll for up to 3 seconds.
- Speech must first be triggered inside a user tap. Speak one silent utterance on the start-screen tap.
- If the device has no Arabic voice, do not speak with another language's voice. Show the text only.
- Lines flagged `"tts": false` in the data are never spoken synthetically.

The built-in voice reads Standard Arabic, so each line has two texts: `tts` in simple Standard Arabic for the phone's voice, and `script` in Jordanian Arabic for the father to record. The speech bubble shows the text the voice is saying: `script` while the parent's own recording plays, `tts` while a built-in file in `public/assets/audio/vo/` or the phone's speech plays (the built-in files speak `tts`).

### 7.2 Voice lines
Store these in `content/lines.json`. Religious lines (marked R) take their text from the registry.

| id | When | `tts` (Standard Arabic) | `script` (father records, Jordanian) |
|---|---|---|---|
| `start` | start screen | أهلاً يا حبيبي! إلى أين نذهب اليوم؟ | أهلين يا حبيبي! وين بدّك تروح اليوم؟ |
| `map_hint` | idle on map | اضغط على المكان الذي تريده. | اكبس عالمكان اللي بدّك إياه. |
| `map_next` | back on map | إلى أين نذهب الآن؟ | وين نروح هلأ؟ |
| `map_petra` | tap Petra | هذه البتراء، المدينة الوردية. | هاي البترا، المدينة الوردية. |
| `map_ummqais` | tap Umm Qais | هذه أم قيس، في شمال الأردن. | هاي أم قيس، بشمال الأردن. |
| `map_amman` | tap Amman | هذه عمّان، وهنا بيتنا. | هاي عمّان، وهون بيتنا. |
| `map_irbid` | tap Irbid | هذه إربد، عروس الشمال. | هاي إربد، عروس الشمال. |
| `map_jerash` | tap Jerash | هذه جرش، مدينة الأعمدة. | هاي جرش، مدينة الأعمدة. |
| `map_deadsea` | tap Dead Sea | هذا البحر الميت، أخفض مكان على الأرض. | هاد البحر الميت، أوطى مكان عالأرض. |
| `map_aqaba` | tap Aqaba | هذه العقبة، على البحر الأحمر. | هاي العقبة، عالبحر الأحمر. |
| `map_wadirum` | tap Wadi Rum | هذا وادي رم. تعال نشاهد النجوم. | هاد وادي رم. تعال نتفرّج عالنجوم. |
| `petra_open` | Petra start | الطريق مغلق بالحجارة، والعمّ يريد أن يمرّ بعربته. هل تساعده؟ | الطريق مسكّرة بالحجار، وعمّو بدّه يمرق بعربيّته. بتساعده؟ |
| `petra_hint` | idle | اسحب الحجر إلى جانب الطريق. | اسحب الحجر عَ جنب الطريق. |
| `petra_thorn` | thorn touched | انتبه للشوك! أمسك الغصن من طرفه. | دير بالك من الشوك! امسك الغصن من طرفه. |
| `petra_clear` | path clear | أصبح الطريق آمناً للجميع. | هيك صارت الطريق آمنة للكل. |
| `petra_elder` | old man passes | بارك الله فيك يا بنيّ. | الله يرضى عليك يا ابني. |
| `petra_hadith` R | ending | registry `bukhari_2472` | registry `bukhari_2472` |
| `uq_open` | Umm Qais start | هذا الكلب عطشان جداً. هيّا نسقيه. | الكلب عطشان كثير. يلّا نسقيه. |
| `uq_hint` | idle | اسحب الحبل بهدوء. | اسحب الحبل شوي شوي. |
| `uq_spill` | water spills | على مهلك، الماء ينسكب. | عَ مهلك، الميّ بتنكبّ. |
| `uq_pour` | bucket up | اسكب الماء في الحوض. | كبّ الميّ بالحوض. |
| `uq_done` | dog drinks | شرب الكلب وارتاح. الحمد لله. | شرب الكلب وارتاح. الحمد لله. |
| `uq_hadith` R | ending | registry `bukhari_2363` | registry `bukhari_2363` |
| `am_open` | Amman start | هيّا نلعب بالكرة! | يلّا نلعب بالطابة! |
| `am_choice` | jar breaks | انكسرت الجرّة. ماذا ستفعل؟ | انكسرت الجرّة. شو بدّك تعمل؟ |
| `am_mama_thanks` | he tells | شكراً لأنك أخبرتني يا حبيبي. تعال ننظّف معاً. | شكراً إنك حكيتلي يا حبيبي. تعال ننظّف سوا. |
| `am_mama_asks` | he hid it | أين الجرّة؟ | وين الجرّة؟ |
| `am_heart` | cloud appears | قلبك ليس مرتاحاً. الصدق يريح القلب. | قلبك مش مرتاح. الصدق بريّح القلب. |
| `am_brave` | after telling | قلتَ الحقيقة. هذا يحتاج إلى شجاعة. | حكيت الحقيقة. هاي بدها شجاعة. |
| `am_hadith` R | ending | registry `muslim_2607c` | registry `muslim_2607c` |
| `ir_open` | Irbid start | جارتنا متعبة هذه الأيام وترتاح في البيت. هيّا نجهّز لها سلّة. | جارتنا تعبانة هالأيام وبترتاح بالبيت. يلّا نجهّزلها سلّة. |
| `ir_pack` | idle, packing | ضع الطعام في السلّة. | حطّ الأكل بالسلّة. |
| `ir_sneak` | sneak begins | امشِ بهدوء، وقِف عندما ينظر أحد. | امشي عَ رواق، ووقّف لمّا حدا يطّلع. |
| `ir_knock` | at the door | ضع السلّة، اطرق الباب، واختبئ! | حطّ السلّة، دقّ الباب، وتخبّى! |
| `ir_secret` | she goes in | لم يعرف أحد من فعل الخير. لكنّ الله يعلم. | ما حدا عرف مين عمل الخير. بس الله بيعرف. |
| `ir_hadith` R | ending | registry `bukhari_660` | registry `bukhari_660` |
| `wr_open` | night start | انظر إلى النجوم. من خلق كلّ هذا؟ | شوف النجوم. مين اللي خلق كل هاد؟ |
| `wr_close` R | after stars, before the ayah | registry `quran_2_215` | registry `quran_2_215` |
| `wr_night` | close | تصبح على خير يا حبيبي. | تصبح على خير يا حبيبي. |
| `wr_draw` | star drawing (version 3) | ارسم بين النجوم ما تحبّ. | ارسم بين النجوم اللي بتحبّه. |
| `free_open` | free time starts (version 3) | معنا وقت. العب قليلاً إن أردت. | معنا وقت. العب شوي إذا بدّك. |
| `free_invite` | 45 s into free time (version 3) | هيّا نكمل الرحلة؟ | يلّا نكمّل الرحلة؟ |
| `day_last` | «خلصنا لليوم؟» tapped (part B) | حسناً، مكانٌ أخير لليوم. | ماشي، آخر مكان لليوم. |
| `road_look` | the road starts (part B) | انظر من النافذة. ماذا ترى؟ | اطّلع من الشبّاك. شو شايف؟ |
| `road_camel` | a sight: camel | هذا جمل. يمشي في الصحراء أياماً دون ماء. | هاد جمل. بيمشي بالصحرا أيام بدون ميّ. |
| `road_goats` | a sight: shepherd and goats | هذا راعٍ مع ماعزه. | هاد راعي مع معزاته. |
| `road_olives` | a sight: olive grove | هذه أشجار زيتون، وبعضها قديم جداً. | هدول شجر زيتون، وبعضهم قديم كتير. |
| `road_tent` | a sight: Bedouin tent | هذا بيت شَعر، يسكنه أهل البادية. | هاد بيت شَعر، بيسكنوه أهل البادية. |
| `road_iris` | a sight: black iris | هذه السوسنة السوداء، زهرة الأردن. | هاي السوسنة السودا، زهرة الأردن. |
| `road_rosefinch` | a sight: Sinai rosefinch | هذا العصفور الوردي، طائر الأردن. | هاد العصفور الوردي، طير الأردن. |
| `road_oryx` | a sight: Arabian oryx | هذا المها العربي. انظر إلى قرنيه الطويلين. | هاد المها العربي. شوف قرونه الطوال. |
| `road_column` | a sight: Roman column | هذا عمود قديم جداً، بناه الناس قبل ألفي سنة. | هاد عمود قديم كتير، بنوه الناس قبل ألفين سنة. |
| `road_mosque` | a sight: village mosque | هذا مسجد القرية. | هاد جامع القرية. |
| `road_falafel` | a sight: falafel stand | هذا كشك الفلافل. ما أطيب رائحته! | هاد كشك الفلافل. ما أطيب ريحته! |
| `road_spring` | a sight: hot spring | هذا ماء ساخن يخرج من الأرض. سبحان الله! | هاي ميّ سخنة بتطلع من الأرض. سبحان الله! |
| `road_turbine` | a sight: wind turbine | هذه مروحة كبيرة تصنع الكهرباء من الريح. | هاي مروحة كبيرة بتعمل كهربا من الهوا. |
| `world_grown` | a plant has grown (part B) | انظر كم كبرت! ما شاء الله. | شوف قدّيش كبرت! ما شاء الله. |
| `qdp_open` | Petra quiet deed start | ما زال الفجر، والطريق فارغ. سقطت حجارة في الليل. بسم الله. | لسّا الفجر، والطريق فاضية. وقعت حجار بالليل. بسم الله. |
| `qdp_end` | after the family passes | مرّت العائلة، والطريق نظيف. | مرقت العيلة، والطريق نظيفة. |
| `p2_open` | P2 start | بسم الله. انظر، هناك شيء على الرمل! | بسم الله. شوف، في إشي عالرمل! |
| `p2_hint` | idle, pouch in the sand | اضغط على الكيس. | اكبس عالكيس. |
| `p2_look` | close-up of the pouch | لا نفتحه. ننظر إلى رباطه وعلامته. | ما بنفتحه. بنطّلع على رباطه وعلامته. |
| `p2_string` | taps the tie-string | رباط أحمر. | رباط أحمر. |
| `p2_patch` | taps the flower | وعليه وردة صفراء. | وعليه وردة صفرا. |
| `p2_guard` | after looking | نعطيه لحارس المكان، وننتظر صاحبه عنده. | بنعطيه لحارس المكان، وبنستنّى صاحبه عنده. |
| `p2_guard_wait` | guard, boy beside him | لننتظر صاحبه هنا معاً. | خلّينا نستنّى صاحبه هون سوا. |
| `p2_match` | travelers arrive | لمن هذا الكيس؟ انظر إلى الصور. | لمين هالكيس؟ طلّع عالصور. |
| `p2_notmine` | wrong traveler | لا، كيسي ليس هذا. | لا، كيسي مش هاد. |
| `p2_relief` | right traveler | الحمد لله! هذا ثمن الماء لأولادي. | الحمد لله! هاد حقّ الميّ لولادي. |
| `p2_found_other` | guard finds the other pouch | وهذا كيسك، وجدتُه هنا. | وهاد كيسك، لقيته هون. |
| `p2_end` | they walk on | عاد الكيس إلى صاحبه، وأكمل طريقه مع أولاده. | رجع الكيس لصاحبه، وكمّل طريقه مع ولاده. |
| `p2_hadith` R | P2 ending | registry `bukhari_2427` | registry `bukhari_2427` |
| `p3_open` | P3 start | بسم الله. سقطت أكياس العمّ عن عربته. هيّا نساعده. | بسم الله. وقعت أكياس عمّو عن عربيّته. يلّا نساعده. |
| `p3_big` | old man lifts the big sack | الكيس الكبير ثقيل، أنا أرفعه. | الكيس الكبير تقيل، أنا بشيله. |
| `p3_hint` | loading | اسحب كيساً صغيراً إلى العربة. | اسحب كيس زغير عالعربيّة. |
| `p3_balance` | the cart tips | مالت العربة! ضع الكيس على الجهة الأخرى. | مالت العربيّة! حطّ الكيس عالجهة الثانية. |
| `p3_toomuch` | one sack too many | انظر إلى الحمار. هذا الكيس كثير عليه. | شوف الحمار. هالكيس كتير عليه. |
| `p3_nexttrip` | old man | آخذه في المرّة القادمة إن شاء الله. | بوخذه المشوار الجاي إن شاء الله. |
| `p3_water` | bucket appears | الحمار عطشان. أعطه ماءً. | الحمار عطشان. اسقيه ميّ. |
| `p3_end` | the cart rolls on | العربة مستوية، والحمار يمشي مرتاحاً. الحمد لله. | العربيّة مستوية، والحمار ماشي مرتاح. الحمد لله. |
| `p3_hadith` R | P3 ending | registry `bukhari_2989`, part `mount` | registry `bukhari_2989`, part `mount` |
| `bismillah` | as the work starts (P1, U1, A1) | بسم الله. | بسم الله. |
| `petra_care` | P1, after the opening | بسم الله. نُبعد الحجارة والأغصان، ونحافظ على المكان القديم. | بسم الله. بنشيل الحجار والأغصان، وبنحافظ عالمكان القديم. |
| `uq_stepback` | U1, after pouring | ونبتعد قليلاً، حتى يشرب براحته. | وبنبعد شوي، عشان يشرب على راحته. |
| `am_mama_sharp` | A1, cleaning up | أنا أرفع القطع الحادّة، وأنت اكنس الصغيرة بالمكنسة. | أنا بشيل القطع الحادّة، وإنت اكنس الزغار بالمكنسة. |
| `u2_open` | U2 start | بسم الله. سنزرع اليوم ثلاث شجرات زيتون. | بسم الله. اليوم بنزرع تلات شجرات زيتون. |
| `u2_dig` | first hole | افرك التراب لتحفر حفرة. | افرك التراب عشان تحفر حفرة. |
| `u2_hard` | second hole | هذا التراب أقسى قليلاً. | هاد التراب أقسى شوي. |
| `u2_stone` | third hole | هنا حجر. اسحبه جانباً. | هون في حجر. اسحبه عَ جنب. |
| `u2_plant` | hole dug | ضع الشجرة في الحفرة. | حطّ الشجرة بالحفرة. |
| `u2_press` | sapling in | اضغط التراب حولها. | اكبس التراب حواليها. |
| `u2_water` | soil pressed | اسقها بالماء. | اسقيها ميّ. |
| `u2_wait` | the seasons begin | والآن ننتظر. الشجر يحتاج إلى وقت. | وهلأ بنستنّى. الشجر بدّه وقت. |
| `u2_trust` R | the trees have grown (MISSIONS_V2 exact script; the father's own words, registry `father_u2` so it is reviewed with the religious texts) | نحن زرعناها وسقيناها، والله هو الذي أنبتها. الحمد لله. | إحنا زرعناها وسقيناها، والله هو اللي أنبتها. الحمد لله. |
| `u2_end` | birds and the stranger | صار هنا ظلّ للناس وطعام للطيور. | صار هون فيّ للناس وأكل للطيور. |
| `qdu_open` | Umm Qais quiet deed start | بسم الله. أشجار الجار عطشى، ولا أحد هنا. | بسم الله. شجرات الجار عطشانين، وما في حدا هون. |
| `qdu_end` | evening | في المساء، وقفت الأشجار من جديد. | بالمسا، وقفوا الشجرات من جديد. |
| `u3_open` | U3 start | بسم الله. قطف الصديقان الزيتون معاً منذ الصباح. | بسم الله. الصاحبين قطفوا الزيتون سوا من الصبح. |
| `u3_deal` | dealing | وزّع الزيتون: حفنة هنا، وحفنة هناك. | وزّع الزيتون: حفنة لهون، وحفنة لهون. |
| `u3_check` | the scale comes | لنتأكّد بالميزان. | خلّينا نتأكّد بالميزان. |
| `u3_move` | not level | جهة أثقل من الأخرى. انقل حفنة. | جهة أتقل من التانية. انقل حفنة. |
| `u3_level` | level | الميزان مستوٍ. | الميزان مستوي. |
| `u3_end` | friends walk home | تعبا التعب نفسه، فأخذا الحصّة نفسها. | تعبوا نفس التعب، فأخدوا نفس الحصّة. |
| `a2_open` | A2 start | بسم الله. هيّا نبني برجاً عالياً! | بسم الله. يلّا نبني برج عالي! |
| `a2_hot` | the tower falls | وقع البرج. أنت غاضب، وهذا طبيعي. | وقع البرج. إنت معصّب، وهاد طبيعي. |
| `a2_breathe` | breathing | اضغط مطوّلاً وتنفّس ببطء، ثلاث مرّات. | اكبس وطوّل وتنفّس عَ مهل، تلات مرّات. |
| `a2_feel` | the boy, after three breaths | زعلت لأني تعبت على البرج كثيراً. | زعلت لأني تعبت عالبرج كتير. |
| `a2_sister` | his sister | كنت أريد أن ألعب معك. | كان بدّي ألعب معك. |
| `a2_together` | rebuilding | هيّا نبنيه معاً! | يلّا نبنيه سوا! |
| `a2_end` | taller tower | الغضب شعور طبيعي، والقويّ يهدّئ نفسه. | طبيعي الواحد يعصّب، والقوي اللي بيهدّي حاله. |
| `a3_open` | A3 start | بسم الله. عادت ماما من السوق، ومعها أكياس كثيرة. | بسم الله. ماما رجعت من السوق، ومعها أكياس كتير. |
| `a3_climb` | bags taken | اصعد درجة درجة: يمين، يسار. | اطلع درجة درجة: يمين، شمال. |
| `a3_rest` | the landing | لنرتح قليلاً هنا. | خلّينا نرتاح شوي هون. |
| `a3_cat` | the cat step | قطّة نائمة! امشِ بجانبها بهدوء. | في بسّة نايمة! امشي من جنبها عَ رواق. |
| `a3_mama` | Mama at the top | الحمد لله، وصلنا وأنا مرتاحة. | الحمد لله، وصلنا وأنا مرتاحة. |
| `a3_end` | ending | وصلت ماما، ويداها فارغتان، ونفَسها مرتاح. | وصلت ماما وإيديها فاضيات، ونفَسها مرتاح. |
| `qda_open` | Amman quiet deed start | بسم الله. ما زالت ماما نائمة، ونعناعها عطشان. | بسم الله. ماما لسّا نايمة، والنعنع تبعها عطشان. |
| `qda_end` | Mama at the window | استيقظت ماما، والنعناع أخضر. | صحيت ماما، والنعنع أخضر. |
| `i2_open_5_3` | I2 start (first lap) | بسم الله. معك خمس قطع، والخبز بثلاث. | بسم الله. معك خمس قطع، والخبز بتلاتة. |
| `i2_open_5_2` | I2 start (later lap) | بسم الله. معك خمس قطع، والخبز بقطعتين. | بسم الله. معك خمس قطع، والخبز بقطعتين. |
| `i2_open_4_2` | I2 start (later lap) | بسم الله. معك أربع قطع، والخبز بقطعتين. | بسم الله. معك أربع قطع، والخبز بقطعتين. |
| `i2_change_2` | change outlines (2) | هذا الباقي. ضع قطعتين في مكانهما. | هاد الباقي. حطّ قطعتين بمكانهم. |
| `i2_change_3` | change outlines (3) | هذا الباقي. ضع ثلاث قطع في أماكنها. | هاد الباقي. حطّ تلات قطع بمكانهم. |
| `i2_extra_2` | two left over | بقيت قطعتان زائدتان. لمن هما؟ | ضلّ قطعتين زيادة. لمين هدول؟ |
| `i2_extra_1` | one left over | بقيت قطعة زائدة. لمن هي؟ | ضلّت قطعة زيادة. لمين هاي؟ |
| `i2_baker` | the baker | لم أنتبه! شكراً لك يا حبيبي. | ما انتبهت! يسلموا إيديك يا حبيبي. |
| `i2_end` | closing time | في آخر النهار، كان حساب الخبّاز صحيحاً. | آخر النهار، حساب الخبّاز طلع مزبوط. |
| `i3_open` | I3 start | بسم الله. هيّا نلعب بالكرة، مرّر لأصدقائك! | بسم الله. يلّا نلعب طابة، مرّر لصحابك! |
| `i3_look` | after some passes | انظر، هناك ولد جديد واقف وحده. | شوف، في ولد جديد واقف لحاله. |
| `i3_invite` | the boy, at the speech button | تعال العب معنا! | تعال العب معنا! |
| `i3_pass_new` | four players | مرّر له الكرة! | مرّرله الطابة! |
| `i3_end` | the new boy scores | صاروا أربعة أصدقاء بدل ثلاثة. | صاروا أربع صحاب بدل تلاتة. |
| `u2_hadith` R | ending | registry `muslim_1553a` | registry `muslim_1553a` |
| `u3_hadith` R | ending | registry `bukhari_2989`, part `justice` | registry `bukhari_2989`, part `justice` |
| `a2_hadith` R | ending | registry `bukhari_6114` | registry `bukhari_6114` |
| `a3_hadith` R | ending | registry `quran_17_23` | registry `quran_17_23` |
| `i2_hadith` R | ending | registry `quran_4_58` | registry `quran_4_58` |
| `i3_hadith` R | ending | registry `bukhari_2989`, part `good_word` | registry `bukhari_2989`, part `good_word` |
| `j1_open` | J1 start | بسم الله. بعد المهرجان بقيت أوساخ كثيرة في الساحة. | بسم الله. بعد المهرجان ضلّ وساخة كتير بالساحة. |
| `j1_hint` | how to bin | ضع كل شيء في السلّة التي عليها صورته. | حطّ كل إشي بالسلّة اللي عليها صورته. |
| `j1_wrong` | another bin | هذه سلّة أخرى. انظر إلى الصورة. | هاي سلّة ثانية. طلّع عالصورة. |
| `j1_glass` | he touches the glass | هذا زجاج مكسور. هذا لشخص كبير، لا نلمسه. | هاد قزاز مكسور. هاد لواحد كبير، ما بنلمسه. |
| `j1_tell` | tell the guard | نخبر حارس المكان. اضغط عليه. | بنحكي لحارس المكان. اكبس عليه. |
| `j1_guard` | the guard | شكراً لأنك أخبرتني. أنا أكنسه. | يسلموا إنك حكيتلي. أنا بكنسه. |
| `j1_breeze` | a breeze moves the paper | طارت الورقة! الحقها. | طارت الورقة! إلحقها. |
| `j1_end` | people cross the plaza | الحمد لله، صارت الساحة نظيفة وآمنة للجميع. | الحمد لله، صارت الساحة نظيفة وآمنة للكل. |
| `qdj_open` | Jerash quiet deed start | بسم الله. الصباح باكر، والساحة فارغة. | بسم الله. الصبح بكّير، والساحة فاضية. |
| `qdj_end` | the first visitors walk in | دخل الزوّار، ومشوا على حجارة نظيفة. | دخلوا الزوّار، ومشيوا على حجار نظيفة. |
| `j2_open` | J2 start | بسم الله. هناك بنت صغيرة تبكي وحدها. | بسم الله. في بنت زغيرة بتعيّط لحالها. |
| `j2_stay` | he stays and waves | نبقى معها هنا، وننادي المرشد. لوّح له. | بنضلّ معها هون، وبننادي المرشد. لوّحله. |
| `j2_guide` | the guide | لا تخافي، سنجد ماما معاً إن شاء الله. | لا تخافي، رح نلاقي ماما سوا إن شاء الله. |
| `j2_clue_scarf` | the girl (first lap) | ماما تلبس شالاً أخضر. | ماما لابسة شال أخضر. |
| `j2_clue_bag` | the girl (later lap) | مع ماما حقيبة صفراء. | ماما معها شنطة صفرا. |
| `j2_clue_dress` | the girl (later lap) | ماما تلبس فستاناً أزرق. | ماما لابسة فستان أزرق. |
| `j2_look` | visitors pass | انظر إلى الناس. اضغط على ماما عندما تراها. | طلّع عالناس. اكبس على ماما لمّا تشوفها. |
| `j2_notmom` | he taps a visitor | هذه ليست ماما. ننتظر قليلاً. | هاي مش ماما. بنستنّى شوي. |
| `j2_call` | the guide calls her | يا أختي! بنتك هنا! | يا أختي! بنتك هون! |
| `j2_thanks` | the mother, to both | الحمد لله! شكراً لكما. | الحمد لله! يسلموا إيديكم. |
| `j2_end` | the hug | رجعت البنت إلى أمّها، والحمد لله. | رجعت البنت لإمّها، الحمد لله. |
| `j3_open` | J3 start | بسم الله. رحلة المدرسة! صاحبك نسي طعامه. | بسم الله. رحلة المدرسة! صاحبك نسي أكله. |
| `j3_ask` | the boy asks first | هل تحبّ الجبنة؟ هل يمكنك أن تأكلها؟ | بتحبّ الجبنة؟ بتقدر تاكلها؟ |
| `j3_yes` | the classmate | نعم، أحبّها كثيراً! | آه، بحبّها كتير! |
| `j3_cut` | the sandwich close-up | ارسم خطاً في الوسط لتقسمها نصفين. | ارسم خط بالنص عشان تقسمها نصّين. |
| `j3_middle` | the cut is off the middle | أقرب إلى الوسط، ليكون النصفان متساويين. | أقرب عالنص، عشان يطلعوا النصّين متساويين. |
| `j3_pour` | the cup close-up | اضغط لتسكب الماء، واترك عند الخط. | اكبس عشان تكبّ الميّ، واترك عند الخط. |
| `j3_more` | let go below the line | قليلاً بعد. | كمان شوي. |
| `j3_spill` | over the brim | انسكب قليلاً، لا بأس. | انكبّ شوي، مش مشكلة. |
| `j3_give` | hand both over | أعطه نصف الشطيرة، وكأسه. | أعطيه نصّ السندويشة، وكاسته. |
| `j3_thanks` | the classmate | شكراً يا صاحبي! | يسلموا يا صاحبي! |
| `j3_end` | eating together | الحمد لله، أكلا معاً وشبعا. | الحمد لله، أكلوا سوا وشبعوا. |
| `d1_open` | D1 start | بسم الله. الحنفيات تنقّط، والماء يضيع. | بسم الله. الحنفيات بتنقّط، والميّ بتروح عالفاضي. |
| `d1_hint` | how to turn | أدِر رأس الحنفية بإصبعك. | لفّ راس الحنفية بإصبعك. |
| `d1_stiff` | a stiffer tap | هذه أقسى. أدِرها لفّة كاملة. | هاي أقسى. لفّها لفّة كاملة. |
| `d1_leak` | he touches the leak | هذا الأنبوب مكسور. هذا لشخص كبير. | هاي الماسورة مكسورة. هاي لواحد كبير. |
| `d1_tell` | tell the attendant | نخبر عامل الاستراحة. اضغط عليه. | بنحكي لعامل الاستراحة. اكبس عليه. |
| `d1_fixed` | the attendant | أصلحتها. شكراً لأنك أخبرتني. | صلّحتها. يسلموا إنك حكيتلي. |
| `d1_plants` | the plants | والماء الذي وفّرناه نسقي به الزرع. | والميّ اللي وفّرناها بنسقي فيها الزرعات. |
| `d1_end` | the plants are watered | الحمد لله، لم يعد الماء يضيع، وشرب الزرع. | الحمد لله، الميّ ما عادت تروح، والزرعات شربت. |
| `qdd_open` | Dead Sea quiet deed start | بسم الله. حنفية تنقّط، ولا أحد هنا. | بسم الله. حنفية بتنقّط، وما في حدا هون. |
| `qdd_end` | a visitor walks by | لم تعد الحنفية تنقّط. | الحنفية ما عادت تنقّط. |
| `d2_open` | D2 start (Baba) | بسم الله. ما النعم التي تراها حولنا؟ | بسم الله. شو النعم اللي بتشوفها حوالينا؟ |
| `d2_hint` | how to play | اضغط على أي شيء تراه نعمة. | اكبس على أي إشي بتشوفه نعمة. |
| `d2_water` | he taps the water | الحمد لله على الماء. | الحمد لله على الميّ. |
| `d2_bread` | he taps the bread | الحمد لله على الخبز. | الحمد لله على الخبز. |
| `d2_hands` | he taps his hands | الحمد لله على يديك. | الحمد لله على إيديك. |
| `d2_baba` | he taps Baba | والحمد لله أننا معاً. | والحمد لله إنّا سوا. |
| `d2_sea` | he taps the sea | سبحان الله، ما أجمل البحر والجبال! | سبحان الله، شو حلو البحر والجبال! |
| `d2_end` | the evening light | الحمد لله على كل النعم. | الحمد لله على كل النعم. |
| `d3_open` | D3 start | بسم الله. نمشي مع جدّو إلى المقعد. | بسم الله. بنمشي مع جدّو للمقعد. |
| `d3_hint` | how to walk | اضغط لتمشي، واترك لتنتظر. | اكبس عشان تمشي، واترك عشان تستنّى. |
| `d3_wait` | he ran ahead | جدّو يمشي على مهله. ننتظره. | جدّو بيمشي على مهله. بنستنّاه. |
| `d3_stone` | a stone on the path | حجر على الطريق! أبعده قبل أن يصل جدّو. | في حجر عالطريق! بعّده قبل ما يوصل جدّو. |
| `d3_water` | at the bench | اسكب لجدّو كأس ماء. | كبّ لجدّو كاسة ميّ. |
| `d3_grandpa` | Grandfather | الله يرضى عليك يا حبيبي. | الله يرضى عليك يا حبيبي. |
| `d3_end` | Grandfather rests | الحمد لله، جلس جدّو مرتاحاً ينظر إلى البحر. | الحمد لله، قعد جدّو مرتاح بيطلّع عالبحر. |
| `j1_hadith` R | ending | registry `bukhari_2989`, part `harm` | registry `bukhari_2989`, part `harm` |
| `j2_hadith` R | ending | registry `muslim_2699a` | registry `muslim_2699a` |
| `j3_hadith` R | ending | registry `bukhari_12` | registry `bukhari_12` |
| `d1_hadith` R | ending | registry `quran_7_31` | registry `quran_7_31` |
| `d2_hadith` R | ending | registry `quran_14_7` | registry `quran_14_7` |
| `d3_hadith` R | ending | registry `tirmidhi_1920` | registry `tirmidhi_1920` |
| `q1_open` | Q1 start | بسم الله. هناك سلحفاة عالقة في كيس بلاستيك! | بسم الله. في سلحفاة علقانة بكيس نايلون! |
| `q1_bell` | ring the bell | لا نلمسها. اضغط الجرس، فيأتي حارس البحر. | ما بنلمسها. اكبس الجرس، وبيجي حارس البحر. |
| `q1_touch` | he touches the turtle | هذه لحارس البحر. هو يعرف كيف يساعدها. | هاي لحارس البحر. هو بيعرف كيف يساعدها. |
| `q1_ranger` | the ranger | شكراً لأنك ناديتني. أمسك الدلو من فضلك. | يسلموا إنك ناديتني. امسك الدلو لو سمحت. |
| `q1_free` | the turtle is free | الحمد لله، عادت السلحفاة إلى البحر. | الحمد لله، رجعت السلحفاة عالبحر. |
| `q1_clean` | clear the sand | لنجمع البلاستيك عن الرمل، كي لا يؤذي أحداً. | خلّينا نلمّ البلاستيك عن الرمل، عشان ما يأذي حدا. |
| `q1_end` | the turtle swims out | صار الشاطئ نظيفاً، والماء صافياً للسلاحف. | صار الشط نظيف، والميّ صافية للسلاحف. |
| `qdq_open` | Aqaba quiet deed start | بسم الله. الصباح باكر، وهناك بلاستيك على الشاطئ. | بسم الله. الصبح بكّير، وفي بلاستيك عالشط. |
| `qdq_end` | a turtle crosses the sand | عبرت سلحفاة الرمل النظيف إلى البحر. | مرقت سلحفاة عالرمل النظيف للبحر. |
| `q2_open` | Q2 start (the fisherman) | بسم الله. ساعدني نزن للزبونة سمكاً بوزن هذه الحديدة. | بسم الله. ساعدني نوزن للزبونة سمك بوزن هالحديدة. |
| `q2_hint` | how to weigh | ضع سمكاً في الكفة الأخرى حتى يستوي الميزان. | حطّ سمك بالكفّة الثانية لحد ما يستوي الميزان. |
| `q2_heavy` | too much fish | مالت كفة السمك. اضغط على الكفة لتزيل سمكة. | مالت كفّة السمك. اكبس عالكفّة لتشيل سمكة. |
| `q2_small` | one short | جرّب سمكة صغيرة للوزن الدقيق. | جرّب سمكة زغيرة للوزن الدقيق. |
| `q2_check` | the customer checks | مستوٍ تماماً، شكراً لك! | مستوي تمام، يسلموا إيديك! |
| `q2_end` | she goes home | أخذت عشاءها لعائلتها، والوزن عادل. | أخدت عشاها لأهلها، والوزن عادل. |
| `q3_open` | Q3 start | بسم الله. وعدت أختك أن تبني معها قلعة رمل. | بسم الله. وعدت أختك تبني معها قلعة رمل. |
| `q3_friends` | the friends call | تعال نلعب بالكرة! | تعال نلعب طابة! |
| `q3_pass` | pass the ball | مرّر الكرة لصديقك. | مرّر الطابة لصاحبك. |
| `q3_sister_wait` | his sister waits | انظر، أختك تنتظر مع دلوها. | شوف، أختك مستنّية مع دلوها. |
| `q3_ask` | the boy asks her | نبني بعد اللعبة، اتفقنا؟ | بنبني بعد اللعبة، ماشي؟ |
| `q3_yes` | the sister | حسناً، بعد اللعبة! | ماشي، بعد اللعبة! |
| `q3_back` | back to her | هيّا نعود إلى أختك. | يلّا نرجع لأختك. |
| `q3_fill` | fill the bucket | اضغط على الدلو لتملأه بالرمل. | اكبس عالدلو عشان تعبّيه رمل. |
| `q3_flip` | flip it | اقلب الدلو: اسحب إلى الأسفل. | اقلب الدلو: اسحب لتحت. |
| `q3_shells` | the shells | ضع الأصداف فوق البرج. | حطّ الصدف فوق البرج. |
| `q3_wave` | a wave takes the tower | أخذت الموجة البرج! نبني أعلى على الرمل. | أخدت الموجة البرج! بنبني فوق عالرمل. |
| `q3_end` | the castle | صارت القلعة جاهزة، وأختك فرحة. | صارت القلعة جاهزة، وأختك فرحانة. |
| `q1_hadith` R | ending | registry `bukhari_2363` | registry `bukhari_2363` |
| `q2_hadith` R | ending | registry `quran_55_9` | registry `quran_55_9` |
| `q3_hadith` R | ending | registry `quran_17_34` | registry `quran_17_34` |

### 7.3 Music
Copied word for word from `MISSIONS_V2.md` section 9 (its point 9 is carried out by this section):

The slow plucked melody is retired. Recorded tracks are already in the repository, one per place, at `public/assets/audio/music/<place>.m4a`: `map`, `petra`, `ummqais`, `amman`, `irbid`, `jerash`, `deadsea`, `aqaba`. Credits are in `README.md`.

1. Add `jerash`, `deadsea` and `aqaba` to the music places. Wadi Rum has no music (section 7).
2. Keep the generated melody only as a fallback for a file that fails to load. No place should use it by design.
3. The tracks end with a short fade. Loop them with a pause of about one second between the fade-out and the restart, so the join sounds intended.
4. **Parents' corner sound choice,** remembered on the device, three options:
   - "موسيقى مرحة" cheerful music (default)
   - "أصوات الطبيعة فقط" nature sounds only: birds, wind, water, the place's own sounds; no music
   - "بدون" off
   Plus a music volume choice: quiet, medium (default), with medium no louder than today's level.
5. Music keeps lowering under the voice, as now.
6. Music is silent in Wadi Rum and never plays under Quran text or recitation.
7. No jingle, fanfare or musical sting for a moral choice, a finished good deed or a quiet deed (section 4).
8. **Credit.** The license requires it. Show this at the bottom of the parents' corner, in small text: "Music: Kevin MacLeod (incompetech.com), licensed under Creative Commons: By Attribution 4.0." with the track titles from `README.md`.
9. Rewrite `GAME_SPEC.md` section 7.3 to match.

### 7.4 Sound effects
Generate with Web Audio as well: rock thud, dust puff, rope creak, water splash and pour, dog lapping and a soft happy bark, ball bounce, jar breaking, sweeping, footsteps, knock on wood, door creak, birds by day, crickets and soft wind at night, a gentle chime for a finished step. A file at `public/assets/audio/sfx/<name>.m4a` overrides the generated sound.

---

## 8. Religious content registry

Create `content/registry.json` exactly from this table. Every entry starts with `"approval_status": "pending"`. The owner changes it to `"approved"` after review. `npm run build` prints a clear warning listing every pending entry; it does not block the build.

Fields: `source_id`, `reference`, `original_arabic`, `translation`, `child_paraphrase_tts`, `child_paraphrase_script`, `fictional_adaptation`, `approval_status`, and (since MISSIONS_V2) `used_in` and `kind` (section 8.1).

| source_id | Reference | `child_paraphrase_tts` | `child_paraphrase_script` | Fictional adaptation |
|---|---|---|---|---|
| `bukhari_2472` | Sahih al-Bukhari 2472 | أخبرنا نبيّنا محمد صلى الله عليه وسلم عن رجل وجد غصن شوك في الطريق فأبعده، فشكر الله له وغفر له. | نبيّنا محمد صلى الله عليه وسلم حكالنا عن رجل لقى غصن شوك بالطريق فشاله، فشكر الله له وغفر له. | A boy clears rocks and branches in the Siq for a man with a cart. Invented. |
| `bukhari_2363` | Sahih al-Bukhari 2363 | أخبرنا نبيّنا محمد صلى الله عليه وسلم عن رجل رأى كلباً عطشان جداً، فسقاه ماءً، فغفر الله له. | نبيّنا محمد صلى الله عليه وسلم حكالنا عن رجل شاف كلب عطشان كثير، فسقاه ميّ، فغفر الله له. | A boy draws water with a rope and bucket for a stray dog. Invented. |
| `muslim_2607c` | Sahih Muslim 2607c | علّمنا نبيّنا محمد صلى الله عليه وسلم أن الصدق يهدي إلى البرّ، وأن البرّ يهدي إلى الجنة. | نبيّنا محمد صلى الله عليه وسلم علّمنا إنّه الصدق بيوصّل للخير، والخير بيوصّل للجنة. | A boy breaks a jar and tells his mother. Invented. |
| `bukhari_660` | Sahih al-Bukhari 660 | أخبرنا نبيّنا محمد صلى الله عليه وسلم أن من الذين يُظلّهم الله في ظلّه يوم القيامة رجلاً تصدّق بصدقة فأخفاها. | نبيّنا محمد صلى الله عليه وسلم حكالنا إنّه من الناس اللي الله بيظلّهم بظلّه يوم القيامة واحد تصدّق وخبّى صدقته. | A boy leaves a food basket at a neighbor's door unseen. Invented. |
| `quran_3_190` | Quran, Al 'Imran 3:190 | not spoken synthetically | not paraphrased | The night-sky ending. |

For `quran_3_190`, `original_arabic` is:

إِنَّ فِي خَلْقِ السَّمَاوَاتِ وَالْأَرْضِ وَاخْتِلَافِ اللَّيْلِ وَالنَّهَارِ لَآيَاتٍ لِأُولِي الْأَلْبَابِ

Leave `original_arabic` and `translation` empty for the four hadith entries, with a `TODO owner` note. Do not fill them from memory. The owner will paste the exact text from the collection.

Display the ayah in the Amiri typeface, bundled locally.

### 8.1 Sources added by MISSIONS_V2
Copied word for word from `MISSIONS_V2.md` section 8. The entries go into `content/registry.json` in wave 1.

Add these to `content/registry.json`. Every entry starts `"approval_status": "pending"`. Leave `original_arabic` and `translation` empty with the same `TODO owner` note; do not fill them from memory. Copy the paraphrases below exactly; write the Jordanian `child_paraphrase_script` in the pattern of the existing entries.

Add two fields to every entry, old and new: `used_in` (list of mission ids) and `kind`, which is `direct` when the text teaches this very act, or `application` when the mission applies a broader teaching. One source may be used by several missions. `bukhari_2989` has four parts; store one paraphrase per part.

| source_id | Reference | Used in | Kind | `child_paraphrase_tts` |
|---|---|---|---|---|
| `bukhari_2472` | Sahih al-Bukhari 2472 | P1 | direct | (existing) |
| `bukhari_2427` | Sahih al-Bukhari 2427 | P2 | direct | علّمنا نبيّنا محمد صلى الله عليه وسلم أن من وجد شيئاً ضائعاً يعرف وعاءه ورباطه، ويسأل عن صاحبه، فإذا جاء صاحبه أعطاه إياه. |
| `bukhari_2989` part `mount` | Sahih al-Bukhari 2989 | P3 | direct | علّمنا نبيّنا محمد صلى الله عليه وسلم أن من يساعد رجلاً فيرفع له متاعه على دابّته، فذلك صدقة. |
| `bukhari_2989` part `justice` | Sahih al-Bukhari 2989 | U3 | direct | علّمنا نبيّنا محمد صلى الله عليه وسلم أن العدل بين اثنين صدقة. |
| `bukhari_2989` part `good_word` | Sahih al-Bukhari 2989 | I3 | application | علّمنا نبيّنا محمد صلى الله عليه وسلم أن الكلمة الطيبة صدقة. |
| `bukhari_2989` part `harm` | Sahih al-Bukhari 2989 | J1 | direct | علّمنا نبيّنا محمد صلى الله عليه وسلم أن إبعاد الأذى عن الطريق صدقة. |
| `bukhari_2363` | Sahih al-Bukhari 2363 | U1, Q1 | direct for U1, application for Q1 | (existing) |
| `muslim_1553a` | Sahih Muslim 1553a | U2 | direct | أخبرنا نبيّنا محمد صلى الله عليه وسلم أن المسلم إذا زرع شجرة فأكل منها إنسان أو طير أو حيوان، كان ذلك له صدقة. |
| `muslim_2607c` | Sahih Muslim 2607c | A1 | direct | (existing) |
| `bukhari_6114` | Sahih al-Bukhari 6114 | A2 | direct | علّمنا نبيّنا محمد صلى الله عليه وسلم أن القويّ ليس من يغلب الناس، بل القويّ من يملك نفسه عند الغضب. |
| `quran_17_23` | Quran, Al-Isra 17:23 | A3 | application | أمرنا الله أن نُحسن إلى الوالدين. |
| `bukhari_660` | Sahih al-Bukhari 660 | I1 | direct | (existing) |
| `quran_4_58` | Quran, An-Nisa 4:58 | I2 | application | أمرنا الله أن نردّ الأمانات إلى أصحابها. |
| `muslim_2699a` | Sahih Muslim 2699a | J2 | application | علّمنا نبيّنا محمد صلى الله عليه وسلم أن الله في عون العبد ما دام العبد في عون أخيه. |
| `bukhari_12` | Sahih al-Bukhari 12 | J3 | direct | سُئل نبيّنا محمد صلى الله عليه وسلم: أيّ الإسلام خير؟ فقال: أن تُطعم الطعام، وتسلّم على من عرفت ومن لم تعرف. |
| `quran_7_31` | Quran, Al-A'raf 7:31 | D1 | application | علّمنا الله أن نأكل ونشرب دون إسراف. |
| `quran_14_7` | Quran, Ibrahim 14:7 | D2 | direct | علّمنا الله أن نشكره على نعمه. |
| `tirmidhi_1920` | Jami' at-Tirmidhi 1920 (graded hasan) | D3 | direct | علّمنا نبيّنا محمد صلى الله عليه وسلم أن نرحم الصغير ونعرف قدر الكبير. |
| `quran_55_9` | Quran, Ar-Rahman 55:9 | Q2 | direct | أمرنا الله أن نزن بالعدل ولا ننقص الميزان. |
| `quran_17_34` | Quran, Al-Isra 17:34 | Q3 | direct | أمرنا الله أن نوفي بالعهد. |
| `quran_2_215` | Quran, Al-Baqarah 2:215 | Wadi Rum closing line | direct | (the closing line in section 7) |
| `quran_3_190` | Quran, Al 'Imran 3:190 | Wadi Rum ayah | direct | not spoken synthetically |
| `father_u2` | The father's own words (not a quoted text) | U2 | father_own_words | نحن زرعناها وسقيناها، والله هو الذي أنبتها. الحمد لله. |

`quran_14_7`: the paraphrase speaks only of thanking. It leaves out the promise of increase on purpose, so a child does not hear gratitude as a way to get more things. The owner may change this at review.

Keep the Sunnah and the story apart, as now: the closing hadith line of a mission says only what the paraphrase says. No game details in it.

---

## 9. Text on screen

He is starting to read, so short words help him; long text does not.

- Buttons and place names: one to three words, large (at least 22 points), with full vowel marks (tashkeel) on place names: البَتْرا، أُمّ قَيْس، عَمّان، إِرْبِد، جَرَش، البَحْر المَيِّت، العَقَبة، وادي رَمّ.
- The speech bubble shows the current voice line in one or two lines.
- Everything is right-to-left. Typeface: Baloo Bhaijaan 2, bundled locally (no web font requests).
- Interface layout on every mission screen: place name in a rounded pill at top center; round home button at top right; speech bubble with a round "hear it again" speaker button along the bottom.

---

## 10. Parent area

Opened by holding the small lock button on the map for 3 seconds (a ring fills while holding). Contents:

- **Day length (version 3):** «طول اليوم»: «طويل» (up to six missions before Wadi Rum, the default) or «قصير» (four). Section 3.
- **The road and moving backgrounds (version 3 part B):** «الطريق» (the short drive before an ordinary mission) and «حركة الخلفية» (the gently moving layers), each «شغّال» (the default) or «مطفي». Section 3.
- **Sound:** the sound choice and music volume (section 7.3), and the voice speed.
- **Conversation starters:** after each mission, three questions for father and son to talk through (text below).
- **An optional invitation:** one small real-life act of kindness. It is never tracked, confirmed, reported or tied to anything in the game.
- **Recording guide:** the list of `script` lines, with a note that recordings named `<lineId>.m4a` go in the `vo` folder.
- **Review status:** how many registry entries are still pending.

No statistics about the child. No history of what he chose.

Conversation starters (the first sets, one per place; since wave 4 there are three for every mission, 27 in all, in `content/parents.json`, grouped by place and mission; the sets below became P1, U1, A1 and I1):

- **Petra:** شو الإشي اللي ممكن يأذي الناس بطريقنا؟ / ليش شال الحجار مع إنه ما حدا طلب منه؟ / شو بنقدر نشيل عن الطريق سوا بكرا؟
- **Umm Qais:** كيف عرفنا إنه الكلب عطشان؟ / مين كمان بيحتاج رحمتنا؟ / شو بنعمل لو شفنا قطة جوعانة؟
- **Amman:** لو كنت مكانه، شو كنت رح تعمل؟ / ليش أحياناً بنخاف نحكي الحقيقة؟ / لو كسرت إشي بالبيت، بتقدر تحكيلي؟
- **Irbid:** ليش ما حكينا للجارة مين جاب السلّة؟ / كيف حسّيت لمّا ما حدا عرف؟ / مين بنقدر نفرّحه بالسرّ هالأسبوع؟

Invitation text: اعملوا إشي حلو لحدا اليوم، بدون ما تحكوا لحدا.

**Added by MISSIONS_V2** (copied word for word from its section 10; section numbers inside it refer to `MISSIONS_V2.md`):

- The sound choice and the music credit (section 9).
- Conversation starters for every new mission: three short questions each, in Jordanian Arabic, in the style of the existing ones. One of the three should point to real life ("شو بنقدر نعمل بكرا؟").
- Under Irbid, add this sentence for the parent to say in his own words: "السرّ الحلو هو اللي بيفرّح الناس. وأي سرّ بيخوّفك أو بيزعّلك، بتحكيه لماما وبابا دايماً."
- The recording guide lists every new `script` line.
- Review status counts pending registry entries, as now.
- Still no statistics, no history, no record of his choices.

---

## 11. Technology

- **Stack:** Phaser 3 (latest stable 3.x, exact version pinned), TypeScript, Vite, `vite-plugin-pwa`.
- **Offline:** precache every file. After the first load the game runs with no connection. No request leaves the device after install.
- **Hosting path:** the site is served from `https://<owner>.github.io/<repo>/`. Use relative paths everywhere (`base: './'`), including the manifest `start_url` and `scope`.
- **iPhone details:**
  - Portrait only. Design at 390 x 844 logical points; scale to fit any iPhone, with backgrounds covering the screen and interface kept inside the safe area (`viewport-fit=cover`, `env(safe-area-inset-*)`). Backgrounds are drawn at one fixed scale and everything is placed in the picture's coordinates; a wider screen shows a centered portrait frame with plain bars (DECISIONS.md 95).
  - `apple-mobile-web-app-capable`, a 180 x 180 `apple-touch-icon` made from `icon_app`, `display: standalone`.
  - Disable page zoom, text selection, long-press callouts, pull-to-refresh and rubber-band scrolling.
  - Unlock Web Audio and speech on the first tap.
  - Pause all sound when the app goes to the background.
- **Storage:** only what section 2 allows (the parents' sound settings and one rotation number per place), in `localStorage`, wrapped in try/catch.
- **Performance:** steady 60 frames per second on an iPhone from the last five years. Total download under 25 MB.
- **Debug:** `?scene=petra` (or `ummqais`, `amman`, `irbid`, `wadirum`, `map`) jumps straight to a scene. Version 2 adds `p2`, `p3`, `petra-dawn`, `u2`, `u3`, `ummqais-dusk`, `a2`, `a3`, `amman-morning`, `i2`, `i3`, `jerash`, `j2`, `j3`, `jerash-morning`, `deadsea`, `d2`, `d3`, `deadsea-tap`, `aqaba`, `q2`, `q3` and `aqaba-sunrise` (the quiet deeds are `petra-dawn`, `ummqais-dusk`, `amman-morning`, `jerash-morning`, `deadsea-tap`, `aqaba-sunrise`; Irbid's is `irbid`); add `&lap=1` to play a later lap. Debug runs never move a rotation. Remove nothing from production; it is harmless.

### Repository layout

```
GAME_SPEC.md            this file
DECISIONS.md            choices made where the spec was silent
OWNER_GUIDE.md          plain-language steps for the owner (no jargon)
art/reference/          style_village.jpg
art/incoming/           raw art from the image tool
content/lines.json      voice lines
content/registry.json   religious content registry
scripts/                prepare-art.mjs, check-art.mjs
src/                    game code, one folder per scene
public/assets/          prepared art, audio, fonts
.github/workflows/      deploy.yml
```

### Publishing
- `.github/workflows/deploy.yml` builds and deploys to GitHub Pages on every push to `main`, using the official `configure-pages`, `upload-pages-artifact` and `deploy-pages` actions.
- The owner has set Settings, Pages, Source to "GitHub Actions".
- Work on a branch and open a pull request for each milestone, with a short plain-language summary. The owner merges it; the merge publishes the game.
- After each deploy, write the live link and the install steps at the top of `OWNER_GUIDE.md`.

---

## 12. Milestones

Stop at the end of each milestone (and each wave of version 2), open the pull request, and wait.

### Milestone 1: playable on the phone
- Project setup, PWA, offline cache, deploy workflow, art pipeline with placeholders, voice system with the built-in Arabic voice, generated music with its switch.
- Start screen and the map with all pins and landmark voice lines.
- **Petra, complete and polished.** This is the proof that the game is fun. Spend the effort here.
- Acceptance: installs from the link on an iPhone, opens full screen, works in airplane mode after the first load, Petra plays start to finish with sound.

### Milestone 2: three more places
- Umm Qais, Amman (both branches), Irbid.
- Acceptance: all four playable in any order; the sun moves; the Irbid ending has no acknowledgment of any kind; the Amman hide branch always leads back to honesty without shame.

### Milestone 3: ending and parent area
- Wadi Rum night ending, parent area, registry warnings, `OWNER_GUIDE.md`, final polish pass on motion and sound.
- Acceptance: a full session runs about 10 minutes; replay starts a fresh day; no network request after install (verify and state how it was verified).

For each milestone, list in the pull request what was tested and how, and what could not be tested in this environment and needs checking on the real phone.

Milestones 1 to 3 are done.

### Version 2: missions (MISSIONS_V2)
Copied word for word from `MISSIONS_V2.md` section 12. Section numbers inside it refer to `MISSIONS_V2.md`.

Work in waves. Each wave is one pull request. At the end of each, list what you tested and how, and what needs checking on the real phone. Then stop and wait.

- **Step 0:** the art checklist (section 2). Stop.
- **Wave 1:** the new day (section 3), the quiet-deed slot (section 6) with Petra's and Irbid's quiet deeds, the sound choice and credit (section 9), the Wadi Rum ending (section 7), and Petra P2 and P3. Petra's art exists, so Petra is where the new framework is proven.
- **Wave 2:** U2, U3, A2, A3, I2, I3, the quiet deeds for Umm Qais and Amman, and the safeguard changes to P1, U1 and A1.
- **Wave 3:** Jerash (J1, J2, J3) and the Dead Sea (D1, D2, D3) with their quiet deeds.
- **Wave 4:** Aqaba (Q1, Q2, Q3) with its quiet deed, all conversation starters, a full pass on motion, sound and pacing.

Until a place's missions are built, that place stays scenery with a voice, as Jerash is now. Until a place's quiet deed is built, its next ordinary mission plays in the last slot. Until I2 and I3 exist, I1 plays in any slot.

Acceptance for every wave:
- Each new mission has an easy first win inside 10 seconds, gets a little harder, and ends inside two minutes.
- The good act visibly changes something for someone else. Nothing changes for the player's status.
- Every safeguard listed for the mission is in the scene.
- The last mission of a day is always a quiet deed, with no acknowledgment of any kind.
- A day of four missions plus Wadi Rum runs 8 to 10 minutes (a short day; version 3 adds the long day of up to six).
- No network request after install. No new stored data beyond section 3.
- `npm run build` passes with placeholders; `npm run check:art` lists what is still missing.

---

## 13. Reminders

- Fun first in the hands, meaning in the story. If Petra is not fun, nothing else matters.
- When unsure whether a feature rewards the player for being good, leave it out.
- Never add anything from the forbidden list in section 2, even as a small convenience.
- Never write religious text of your own.
- Never draw scenery or characters in code.
