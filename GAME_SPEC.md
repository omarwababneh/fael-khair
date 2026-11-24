# فاعل خير (Fa'el Khair): game specification for Claude Code

Read this whole file before writing any code. It is the single source of truth for the project. Where it is silent, choose the simpler, more conservative option and record the choice in `DECISIONS.md`. Do not ask the owner questions unless a step is impossible without him; the decisions are already made here.

---

## 1. What we are building

A private game for one Arabic-speaking boy in Jordan, aged 6 to 7, who is starting to read. He plays on his mother's iPhone.

- **Form:** an installable, offline Progressive Web App (PWA) hosted on GitHub Pages. His mother opens a link in Safari, taps Share, then "Add to Home Screen". No App Store.
- **Session:** about 10 minutes. Four short adventures in four real places in Jordan, then a calm night-sky ending.
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
- No fail screens, no "wrong" buzzer, no lives. A slip is followed by a gentle retry.
- Consequences of a good act land on other characters and on the world, never on the player's status. Example: the dog drinks; the road is clear.
- The secret good deed gets no acknowledgment of any kind (section 4D).
- Never punish him for stopping or for missing a day. Nothing is lost by closing the app.
- Never teach an action that is dangerous to copy. He never climbs into the well.

### Privacy
- The repository is public. Never commit names, photos or personal details of the family. Nothing about the child is stored except a local music on/off setting.

---

## 3. Player flow

1. **Start screen.** The app title "فاعل خير" over the map art, and one large button "يَلّا" (Let's go). The first tap unlocks audio (required on iOS).
2. **Map of Jordan (the hub).** An illustrated map with landmark pins. Four pins have adventures: Petra, Umm Qais, Amman, Irbid. He may play them in any order.
3. **Other landmarks** on the map (Jerash, the Dead Sea, Aqaba, Wadi Rum before the ending) are tappable too. A tap makes the landmark bounce and plays one voice line naming the place. They are scenery with a voice, not locked content. Show no locks and no "coming soon".
4. **Each adventure** lasts 60 to 120 seconds and ends by returning to the map.
5. **The sun** on the map moves one step toward sunset after each adventure. This is the only sign of progress. No checkmarks, no counters.
6. **After all four,** the sky on the map turns to dusk and the Wadi Rum pin glows softly. Tapping it opens the night ending.
7. **Night ending,** then a button "خلصنا لليوم" (Done for today) returns to the start screen.
8. **Replay any time.** Starting again begins a fresh day. There is no daily lock.

A home button on every adventure returns to the map at once, with no confirmation and no penalty.

---

## 4. The adventures

Shared rules: every adventure opens with one father voice line that sets the situation, shows a moving hand hint if he does nothing for 6 seconds, and closes with the father's hadith line (from the registry) over a calm final frame.

### A. Petra: clearing the road
- **Value:** removing harm from people's path. **Source:** `bukhari_2472`.
- **Place:** the Siq, the narrow rose-red canyon that leads into Petra. Portrait suits it: tall walls, a sandy path running up the screen.
- **Situation:** an old man with a small donkey cart cannot get through. Rocks and thorn branches block the path.
- **Play:** drag each obstacle to a glowing nook at the canyon side.
  - Rocks feel heavy: they follow the finger with a slight lag, land with a thud and a puff of dust.
  - Thorn branches must be picked up by the smooth end, which glows. Touching the thorny part makes the boy pull his hand back with a small "آي!" and a wobble. No penalty; he tries again.
  - Six obstacles in total: three rocks, a thorn branch, a rock, a larger branch.
- **Consequence:** as the path clears, the cart rolls forward behind him. When the last obstacle is gone, the boy and the cart walk on, the screen cross-fades to the Treasury plaza, and the camera rises slowly over the facade in warm light while birds cross the sky. The old man says his one line and goes on his way.
- **Ending line:** the father's hadith line.

### B. Umm Qais: the thirsty dog
- **Value:** mercy to animals. **Source:** `bukhari_2363`.
- **Place:** the old hilltop village of Umm Qais: black basalt columns, a stone well, a wide view over the valley and the lake far below.
- **Situation:** a stray dog pants beside an empty stone trough.
- **Play:** a rope-and-bucket pull. The boy stands beside the well and never leans over it.
  - Drag the rope handle downward in steady strokes to raise the bucket.
  - Pull too fast and water sloshes out (the bucket's water level visibly drops, with a splash sound). Steady pulls keep it full.
  - When the bucket reaches the top, drag it to the trough and tilt it by dragging downward to pour.
  - Two buckets fill the trough.
- **Consequence:** the dog drinks, its tail wags, it stretches, then it trots away toward the hills. It does not follow him and does not become a pet. He is not given the dog.
- **Ending line:** the father's hadith line.

### C. Amman: the broken jar
- **Value:** truthfulness, then repair without shame. **Source:** `muslim_2607c`.
- **Place:** the family home in Amman. An arched window looks over the city's hills of pale stone houses, with the Citadel columns on the skyline.
- **Opening play:** he bounces a ball. Each tap bounces it higher; this part should be pure fun for 10 seconds. On the fourth bounce the ball knocks a clay jar off the shelf. It breaks and water spreads on the floor. The accident happens inside play, not through a bad choice.
- **The choice:** two buttons of identical size, color and position weight: "بَحكي لَماما" (I tell Mama) and "بَخَبّيها" (I hide it). Nothing hints at which is right.
- **If he tells:** Mama comes in, kneels to his height and thanks him calmly for telling her. Together they clean up: he sweeps the shards into a dustpan with swipes and wipes the water with a cloth. Mama hugs him.
- **If he hides:** he drags the shards under the rug. Mama comes in and asks where the jar is. A small gray cloud appears above his head and water creeps out from under the rug. The father's voice says gently that the truth rests the heart, and one button appears: "بَحكي الحَقيقة" (I tell the truth). When he taps it, the cloud dissolves and the same clean-up and hug follow. There is no scolding and no sad ending. The door back to honesty is always open; that is the lesson.
- Mama is never angry in either branch. Do not show punishment.
- **Ending line:** the father's hadith line.

### D. Irbid: the secret helper
- **Value:** sincerity, doing good without being seen. **Source:** `bukhari_660`.
- **Place:** a street in old Irbid at dusk: dark basalt and pale limestone houses, an arched green door, an old olive tree.
- **Situation:** an elderly neighbor is unwell and cannot go to the market.
- **Play in three beats:**
  1. **Pack the basket.** Drag five Jordanian foods into it: bread, olives, labneh, tomatoes, apples.
  2. **Sneak to the door.** Hold a finger on the screen to tiptoe; lift it to freeze. Freeze when the curtain moves or a passerby turns his head. If he is noticed, the passerby simply smiles and walks on, the boy ducks back behind the tree, and he tries again.
  3. **Deliver.** Set the basket down, tap the door three times to knock, then swipe toward the olive tree to hide.
- **Consequence:** the neighbor opens the door, looks left and right, finds the basket, smiles and takes it inside. She never learns who left it.
- **Hard rule:** no thanks to the boy, no sparkle around him, no cheer, no special sound, no badge, nothing unlocked. The only reward is watching her smile from behind the tree. The return to the map looks exactly like the return from any other adventure.
- **Ending line:** the father's line that nobody knew, but Allah knows; then the hadith line.

### E. Wadi Rum: the night sky (ending)
- **Value:** reflection on creation (tafakkur) and gratitude. **Source:** `quran_3_190`.
- **Place:** Wadi Rum at night: red sandstone mountains, a sky full of stars. The boy sits on a rock, seen from behind.
- **Play:** slow and quiet. He drags a finger across the sky and stars brighten where he touches. Now and then a shooting star crosses. No goal, no count.
- **Then:** after about 30 seconds, or when he stops, input is disabled, sound effects stop and the music fades out. The ayah fades in as still text with its reference "آل عمران ١٩٠". If the file `audio/quran/3_190.m4a` exists, play it; otherwise show the text in silence for 10 seconds. Never use a synthetic voice here.
- **Close:** the father's goodnight line, then the button "خلصنا لليوم".

---

## 5. What makes it fun (keep all of this)

The game must feel alive. This matters as much as the content.

- **Motion everywhere.** Olive leaves sway, dust motes drift in light, birds cross the sky, water ripples, the boy breathes when idle. Nothing on screen is perfectly still.
- **Juice on every touch.** Objects squash and stretch when grabbed and dropped. Every action has a sound and a small particle burst (dust, droplets, leaves).
- **Easy first win.** The first obstacle in every adventure takes one obvious gesture and succeeds within 10 seconds.
- **Rising challenge.** Each adventure gets slightly harder as it goes: heavier rocks, the careful grip on the thorn branch, the steady rope rhythm, the timing of the sneak.
- **Surprise in the story, never in a prize.** The Treasury reveal, the dog's stretch, Mama kneeling, the neighbor's face.
- **Responsive controls.** Touch response within one frame. Large hit areas (at least 56 points). Forgiving drag targets.
- **Short.** No adventure runs past two minutes.

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
| Jerash (map only) | a curved row of tall stone columns around an oval plaza |
| Dead Sea (map only) | still turquoise water with white salt crust at the shore |
| Aqaba (map only) | deep blue sea, palm trees, coral and fish near the shore |

### 6.4 Characters
- **The boy:** about 6 to 7 years old, short dark brown hair, big friendly eyes, sky-blue t-shirt, tan shorts, red sneakers. He has no name in the game, so the player sees himself in him.
- **Mama:** warm expression, long modest dress, hijab.
- **Old man (Petra):** white thobe, red-and-white shemagh with black agal, small donkey cart loaded with sacks.
- **Neighbor (Irbid):** elderly woman, traditional embroidered Jordanian dress, white headscarf.
- **Passerby (Irbid):** a man in everyday clothes carrying a bag.
- **Dog:** a slim tan stray with upright ears, friendly.

### 6.5 Asset manifest
Backgrounds are portrait, at least 1024 x 1536 pixels, with the important content in the middle 70 percent and calm space at the top and bottom for interface. Sprites are at least 1024 pixels on the long side, full figure, no cast shadow, on a transparent or plain pure-white background. Art arrives in `art/incoming/` under these names (`.png`, `.jpg` or `.webp`).

**Backgrounds**

| File | Contents |
|---|---|
| `bg_map` | illustrated map of Jordan, north at top, with small landmark drawings in their true positions: Umm Qais and Irbid in the north, Jerash and Amman below them, the Dead Sea on the west edge, Petra and Wadi Rum in the south, Aqaba at the southern tip by the sea. No text. |
| `bg_petra_siq` | the Siq, empty path, no people |
| `bg_petra_treasury` | the Treasury plaza, warm light, no people |
| `bg_ummqais_well` | stone well with wooden frame in the foreground, basalt columns, valley view; no bucket, no rope, empty stone trough at left |
| `bg_amman_home` | home interior, arched window with the Amman view, a wooden shelf at right, tiled floor, a rug |
| `bg_irbid_dusk` | old Irbid street at dusk, closed arched green door at center-right, olive tree at left, a window with a curtain |
| `bg_wadirum_night` | Wadi Rum at night, big empty starry sky in the upper two thirds |

**Characters** (one image per pose)

| File | Pose |
|---|---|
| `boy_idle`, `boy_walk_a`, `boy_walk_b` | standing; two walking frames |
| `boy_lift` | bending to lift something heavy |
| `boy_pull` | pulling a rope downward with both hands |
| `boy_carry` | carrying a basket in both arms |
| `boy_peek` | crouching and peeking sideways, smiling |
| `boy_worried`, `boy_happy` | worried face; relieved, happy face |
| `boy_sweep` | sweeping with a small broom |
| `boy_sit_back` | sitting, seen from behind, head tilted up |
| `dog_thirsty`, `dog_drinking`, `dog_happy` | panting; head down drinking; standing, tail up |
| `elder_cart` | the old man beside his donkey cart, side view |
| `mama_stand`, `mama_kneel` | standing; kneeling with open arms |
| `neighbor_basket` | at her door, holding the basket, smiling, looking around |
| `passerby_walk`, `passerby_look` | walking; head turned toward the viewer |

**Objects**

`rock_a`, `rock_b`, `rock_c`, `rock_d`, `thorn_branch`, `big_branch`, `bucket_empty`, `bucket_full`, `trough_water` (the water surface only), `jar_whole`, `shard_a`, `shard_b`, `shard_c`, `ball`, `dustpan`, `cloth`, `basket_empty`, `basket_full`, `food_bread`, `food_olives`, `food_labneh`, `food_tomatoes`, `food_apples`, `icon_app` (1024 x 1024: the boy's smiling face on a warm sand background, no text).

Objects may arrive as sheets (several objects on one white image). Support an optional `art/incoming/sheets.json` that maps a sheet file to the ordered list of object names, read left to right, top to bottom.

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

The built-in voice reads Standard Arabic, so each line has two texts: `tts` in simple Standard Arabic for the phone's voice, and `script` in Jordanian Arabic for the father to record. The speech bubble shows `tts` in phase 1 and `script` once a recording exists.

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
| `petra_open` | Petra start | الطريق مغلق، والعمّ لا يستطيع المرور. هل تساعده؟ | الطريق مسكّرة وعمّو مش قادر يمرق. بتساعده؟ |
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
| `ir_open` | Irbid start | جارتنا متعبة ولا تستطيع الذهاب إلى السوق. هيّا نجهّز لها سلّة. | جارتنا تعبانة ومش قادرة تروح عالسوق. يلّا نجهّزلها سلّة. |
| `ir_pack` | idle, packing | ضع الطعام في السلّة. | حطّ الأكل بالسلّة. |
| `ir_sneak` | sneak begins | امشِ بهدوء، وقِف عندما ينظر أحد. | امشي عَ رواق، ووقّف لمّا حدا يطّلع. |
| `ir_knock` | at the door | ضع السلّة، اطرق الباب، واختبئ! | حطّ السلّة، دقّ الباب، وتخبّى! |
| `ir_secret` | she goes in | لم يعرف أحد من فعل الخير. لكنّ الله يعلم. | ما حدا عرف مين عمل الخير. بس الله بيعرف. |
| `ir_hadith` R | ending | registry `bukhari_660` | registry `bukhari_660` |
| `wr_open` | night start | انظر إلى النجوم. من خلق كلّ هذا؟ | شوف النجوم. مين اللي خلق كل هاد؟ |
| `wr_subhan` | after stars | سبحان الله. | سبحان الله. |
| `wr_night` | close | تصبح على خير يا حبيبي. | تصبح على خير يا حبيبي. |

### 7.3 Music
Light background music is wanted, with a switch in the parent area to turn it off (the setting is remembered).

- No music files can be downloaded during the build, so generate the music in code with the Web Audio API: a slow, soft plucked-string melody over a quiet sustained note, in a calm scale, looping without an audible seam. One gentle variation per place (brighter for the map, slower for Wadi Rum).
- Keep it quiet, well under the voice. Lower it further whenever the voice speaks.
- Fade it out fully before the ayah appears. Never play music under Quran text or recitation.
- Structure the audio code so a real music file dropped at `public/assets/audio/music/<place>.m4a` replaces the generated music for that place.

### 7.4 Sound effects
Generate with Web Audio as well: rock thud, dust puff, rope creak, water splash and pour, dog lapping and a soft happy bark, ball bounce, jar breaking, sweeping, footsteps, knock on wood, door creak, birds by day, crickets and soft wind at night, a gentle chime for a finished step. A file at `public/assets/audio/sfx/<name>.m4a` overrides the generated sound.

---

## 8. Religious content registry

Create `content/registry.json` exactly from this table. Every entry starts with `"approval_status": "pending"`. The owner changes it to `"approved"` after review. `npm run build` prints a clear warning listing every pending entry; it does not block the build.

Fields: `source_id`, `reference`, `original_arabic`, `translation`, `child_paraphrase_tts`, `child_paraphrase_script`, `fictional_adaptation`, `approval_status`.

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

---

## 9. Text on screen

He is starting to read, so short words help him; long text does not.

- Buttons and place names: one to three words, large (at least 22 points), with full vowel marks (tashkeel) on place names: البَتْرا، أُمّ قَيْس، عَمّان، إِرْبِد، جَرَش، البَحْر المَيِّت، العَقَبة، وادي رَمّ.
- The speech bubble shows the current voice line in one or two lines.
- Everything is right-to-left. Typeface: Baloo Bhaijaan 2, bundled locally (no web font requests).
- Interface layout on every adventure screen: place name in a rounded pill at top center; round home button at top right; speech bubble with a round "hear it again" speaker button along the bottom.

---

## 10. Parent area

Opened by holding the small lock button on the map for 3 seconds (a ring fills while holding). Contents:

- **Music:** on or off.
- **Conversation starters:** after each adventure, three questions for father and son to talk through (text below).
- **An optional invitation:** one small real-life act of kindness. It is never tracked, confirmed, reported or tied to anything in the game.
- **Recording guide:** the list of `script` lines, with a note that recordings named `<lineId>.m4a` go in the `vo` folder.
- **Review status:** how many registry entries are still pending.

No statistics about the child. No history of what he chose.

Conversation starters:

- **Petra:** شو الإشي اللي ممكن يأذي الناس بطريقنا؟ / ليش شال الحجار مع إنه ما حدا طلب منه؟ / شو بنقدر نشيل عن الطريق سوا بكرا؟
- **Umm Qais:** كيف عرفنا إنه الكلب عطشان؟ / مين كمان بيحتاج رحمتنا؟ / شو بنعمل لو شفنا قطة جوعانة؟
- **Amman:** لو كنت مكانه، شو كنت رح تعمل؟ / ليش أحياناً بنخاف نحكي الحقيقة؟ / لو كسرت إشي بالبيت، بتقدر تحكيلي؟
- **Irbid:** ليش ما حكينا للجارة مين جاب السلّة؟ / كيف حسّيت لمّا ما حدا عرف؟ / مين بنقدر نفرّحه بالسرّ هالأسبوع؟

Invitation text: اعملوا إشي حلو لحدا اليوم، بدون ما تحكوا لحدا.

---

## 11. Technology

- **Stack:** Phaser 3 (latest stable 3.x, exact version pinned), TypeScript, Vite, `vite-plugin-pwa`.
- **Offline:** precache every file. After the first load the game runs with no connection. No request leaves the device after install.
- **Hosting path:** the site is served from `https://<owner>.github.io/<repo>/`. Use relative paths everywhere (`base: './'`), including the manifest `start_url` and `scope`.
- **iPhone details:**
  - Portrait only. Design at 390 x 844 logical points; scale to fit any iPhone, with backgrounds covering the screen and interface kept inside the safe area (`viewport-fit=cover`, `env(safe-area-inset-*)`).
  - `apple-mobile-web-app-capable`, a 180 x 180 `apple-touch-icon` made from `icon_app`, `display: standalone`.
  - Disable page zoom, text selection, long-press callouts, pull-to-refresh and rubber-band scrolling.
  - Unlock Web Audio and speech on the first tap.
  - Pause all sound when the app goes to the background.
- **Storage:** only the music setting, in `localStorage`, wrapped in try/catch.
- **Performance:** steady 60 frames per second on an iPhone from the last five years. Total download under 25 MB.
- **Debug:** `?scene=petra` (or `ummqais`, `amman`, `irbid`, `wadirum`, `map`) jumps straight to a scene. Remove nothing from production; it is harmless.

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

Stop at the end of each milestone, open the pull request, and wait.

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

---

## 13. Reminders

- Fun first in the hands, meaning in the story. If Petra is not fun, nothing else matters.
- When unsure whether a feature rewards the player for being good, leave it out.
- Never add anything from the forbidden list in section 2, even as a small convenience.
- Never write religious text of your own.
- Never draw scenery or characters in code.
