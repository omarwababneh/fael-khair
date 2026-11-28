# فاعل خير: Missions, version 2

This file extends `GAME_SPEC.md`. Read `GAME_SPEC.md`, `DECISIONS.md` and this file before you write anything.

- Every rule in section 2 of `GAME_SPEC.md` still holds. Nothing here loosens it.
- Where this file and `GAME_SPEC.md` differ on player flow, missions, music or the parents' corner, this file wins. Update `GAME_SPEC.md` so the two agree (sections 3, 4, 6.3, 6.5, 7.3, 8, 10 and 12).
- The four built adventures stay as they are. They become the first mission of their place.

## 1. What changes

1. Seven places have adventures instead of four: Petra, Umm Qais, Amman, Irbid, Jerash, the Dead Sea and Aqaba. Each place has three missions. Total: 21 missions, 4 built, 17 new.
2. A day is four missions (up to six since version 3, the parents' «طول اليوم»), then the Wadi Rum night ending (section 3).
3. The last mission of every day is a quiet good deed that nobody sees or thanks (section 6).
4. The Wadi Rum ending is built (section 7).
5. The music is recorded, cheerful and chosen for a young child. The parents' corner gets a sound choice (section 9).
6. You deliver a complete art checklist as a spreadsheet before you build anything (section 2).

## 2. Do this first, then stop: the art checklist

The art is made outside this repository. The person who makes it needs one complete list.

1. Read sections 5, 6, 7 and 11 of this file and decide the exact list of images every mission needs. Reuse existing images wherever a pose or object can serve twice. Budget: about 100 new images beyond the 52 already named in `scripts/art-lib.mjs`. Hard ceiling: 120. If you would go over, simplify the scenes, not the checklist.
2. Add every new name to `scripts/art-lib.mjs` so missing art shows as a labeled magenta placeholder.
3. Write `art/Fael_Khair_Art_Checklist.xlsx` and commit it. Use the same layout as the earlier checklist:
   - Sheet 1, "Art checklist". Columns in this order: `#`, `Priority`, `File name (exact)`, `Type`, `Used in`, `Minimum size`, `Background`, `Full prompt (paste this, then attach the reference images)`, `Attach as reference`, `Notes`, `Done? (Yes)`.
   - One row per image, for every image the full game needs. Mark rows whose file already exists in `art/incoming/` with `Yes` in the last column. All others stay empty.
   - `Priority` is the wave the image is first needed in: `Wave 1`, `Wave 2`, `Wave 3`, `Wave 4` (section 12). Sort by wave, then by place.
   - `Used in` lists the mission ids (for example `P2, P3`).
   - `Full prompt` is complete and ready to paste: the base text from section 6.7 of `GAME_SPEC.md`, the subject, and for the boy his description from 6.4 word for word.
   - `Notes` must give, for every character and object: which way it faces, where the hand-hold is if he grabs it, and its height on screen compared with the boy standing (boy = 1.0). The last checklist left out sizes, and the art had to be rescaled afterwards.
   - `Notes` also says which objects may share one sheet, with the sheet's order.
   - Sheet 2, "How to use": the same plain steps as before, updated.
4. Open a pull request that contains only the checklist, the manifest change and the `GAME_SPEC.md` update. Stop and wait.

Do not draw scenery, characters or objects in code. Code may add light, tint, particles (dust, droplets, sparkles, leaves) and motion to delivered art, as it does today.

## 3. How a day works now

1. **Map.** All seven places are open from the first second. No locks, no "coming soon", no marks showing what was played.
2. **One mission per place per day.** When he taps a place, it plays that place's next mission in its rotation (mission 1, then 2, then 3, then 1 again). A place he has played today becomes scenery with a voice for the rest of the day, the way Jerash behaves now: it bounces and says its name.
3. **Day length (version 3).** A day has up to six missions before Wadi Rum: five, then the quiet deed. The parents' corner setting «طول اليوم» chooses «طويل» (up to six, the default) or «قصير» (four, as before). Six is a maximum, never an obligation: on a long day, once he has finished three missions, the map shows a button in the choice buttons' style, «خلصنا لليوم؟». If he taps it, the father says «حسناً، مكانٌ أخير لليوم.» (`day_last`), the next place he opens plays its quiet deed, and then Wadi Rum opens as usual. Nothing presses him to use it. Only the setting is stored; the day itself lives in memory.
4. **The sun** moves one equal step after each mission: six steps on a long day, four on a short one. If he ends a long day early, the sun stands where that shorter day puts it.
5. **The last mission of the day is always the quiet deed** of whichever place he opens last (section 6): the sixth on a long day, the fourth on a short day, or the one after «خلصنا لليوم؟». It does not advance that place's rotation. If the parents switch to a shorter day after he has already played more missions, the next mission is the quiet deed.
6. **After the quiet deed** the map turns to dusk, the Wadi Rum pin glows, and the other places become scenery with a voice. Wadi Rum opens the night ending.
7. **Free time (version 3).** After every ordinary mission's closing line (never after a quiet deed, never in Wadi Rum), the scene stays open instead of returning to the map. The father says `free_open` once. Two or three things already in the scene react to a tap with a small motion and a soft sound, the same every time: no hidden surprises, nothing that grows the more he taps, no goal, no counting, no praise, no chime, nothing stored. The home button takes him to the map at any time. After 45 seconds the father says `free_invite` once; nothing forces him out.
8. **Wadi Rum before the day is done (version 3).** If he taps Wadi Rum before the day's quiet deed is done, the father says `wr_later` («نزور وادي رمّ في آخر النهار.»), so it never seems broken. If three or more missions are done, «خلصنا لليوم؟» shows right then, on a short day too. (The passive car ride between places, planned for part B, is dropped: nothing plays between the map and a mission.)
9. **The world remembers (version 3 part B).** A place he has visited shows nature growing there (an olive tree, the mint at home, oleander, poppies, jasmine, a date palm, the planter at the Dead Sea), chosen only from the place's stored rotation number. It is nature growing, never his achievement: no sparkle, no sound, no count, nothing to touch, and never in a quiet deed. The father says `world_grown` once, on arrival, the first time a place shows a bigger stage.
10. **Free-time animals and moving backgrounds (version 3 part B).** In free time, small animals of the place come out (a lizard, a butterfly, a hoopoe, a crab, a pigeon, a jumping fish, a hedgehog); each reacts to a touch with a small motion and a soft sound, the same every time, and settles; nothing lets him catch, hold or collect one. Transparent layers over the backgrounds move gently (clouds, far birds, a branch, foam, glints, a glow). **Every scene is alive (version 3):** every person and animal breathes, shifts its weight and turns toward what is happening; nobody slides: a figure that moves steps or hops with a bob; the camera drifts slowly and zooms in gently inside the portrait frame, with the background moving slightly less than the figures; whatever he can touch squashes a little with a soft sound, and a thing he drags leans with its weight and settles. All of this moves on arrival and in free time; it goes still during a moral choice, the father's key lines (every line from the registry) and every quiet deed's final moment; in Wadi Rum it stops before the ayah. It respects the phone's reduce-motion setting, and the one parents' corner switch «حركة الخلفية» stops it (on by default). Motion only: nothing new is drawn.
11. **"خلصنا لليوم"** returns to the start screen. Starting again begins a fresh day at once. There is no waiting, no daily lock and nothing lost by stopping halfway.
12. **Rotation moves by play, not by the calendar.** A place's rotation advances only when its mission is finished. Missing a day changes nothing.
13. **Small variation on replay.** Each mission has two or three light variations chosen at random: where objects lie, how many there are, which side a character stands on. The story and the value never change.
14. **The Umm Qais walk (version 3 trial).** With the parents' corner switch «النسخة التجريبية» on (off by default), or from `?scene=ummqais-walk`, U1 is played as a walk: a world about three screens wide that scrolls, on `bg_road_north`, with the sky, the far hills and the road moving slower than the ground. He moves the boy himself: he touches and holds where to go, the boy hop-walks there and the camera follows. On the way, from existing art: the olive grove, the shepherd and goats, the black irises, the hoopoe, the butterfly and the hedgehog; each reacts when he comes near or touches it. U1's deed happens inside this world: he finds the thirsty dog by its empty trough at the end of the path, walks back to the well, raises the bucket on a rope with real weight and swing, carries the water back, pours it and steps back so the dog can drink. The rope, the bucket, the water drops and the loose stones run on the physics engine. Same values rules as U1: no praise for speed, no score, U1's existing lines and the hadith line only; no hint unless he is idle for 10 seconds. The other missions, U1 included, are unchanged.

**Storage.** The game may now store, on the device only, one small number per place: which mission comes next, and (version 3) the parents' day-length, moving-background and trial settings. Nothing else about play is stored. It is never shown, never counted and never sent anywhere. Update the privacy rule in `GAME_SPEC.md` section 2 to say exactly this. (Owner, later: the parent's own recordings of the voice lines, made in the parents' corner, may also be stored on the phone. They are never uploaded or sent anywhere.)

A short day should take 8 to 10 minutes; a long day longer (see `DECISIONS.md` for the measured length). Each mission lasts 60 to 120 seconds, plus any free time he chooses.

## 4. Rules added in this version

These came out of the religious and child-safety review. They apply to every mission, old and new.

**Mercy with wisdom.** The boy helps in ways that are safe for a six-year-old to copy.
- He gets a trusted adult whenever a stranger, an animal in trouble, broken glass, a leak or a lost child is involved. Getting the adult is part of the good deed, not a failure to do it alone.
- He never goes anywhere alone with a stranger and never leaves an open, visible place.
- He never touches a wild or unfamiliar animal. He keeps a safe distance.
- He carries only light things.
- He shares food only after asking, and never shares a cup or bottle.
- A good secret is one that makes someone happy. A secret that frightens or hurts is always told to Mama and Baba. This sentence goes in the parents' corner (section 10).

**No shame.** An accident never makes a child bad. Anger is normal; what he does with it is the story. Nobody in the game scolds him.

**The father describes, he does not grade.** Father's lines say what the act did for someone else ("شوف، الطريق صار فاضي"). They never rate the boy, never promise a reward and never say Allah accepted or rewarded a deed.

**Everyday remembrance, lightly.** Without adding mechanics:
- The father opens each mission's work with "بسم الله".
- He says "الحمد لله" when the good outcome arrives, and "إن شاء الله" about anything in the future.
- Where the story fits, he ties the effort to trust in Allah (see mission U2).
- Only these fixed phrases are used freely: بسم الله، الحمد لله، إن شاء الله، ما شاء الله، سبحان الله، الله يرضى عليك. Any other religious sentence must come from `content/registry.json`.

**Quran in missions.** Missions whose source is an ayah use only the short paraphrase in section 8. The ayah text itself appears only in the Wadi Rum ending and is never spoken by a synthetic voice.

**Sound.** No victory jingle or musical sting when he makes a moral choice or finishes a good deed. The small step chime stays for mechanical steps only. Quiet deeds have no chime at all, as Irbid has none today.

**Voice lines.** Write the new lines in `content/lines.json` in the same two forms (`tts` in simple Standard Arabic, `script` in Jordanian Arabic), in the same warm, short style as the existing lines: twelve words or fewer, one idea per line. The owner reviews every line.

## 5. The missions

Each mission lists its value, its source id (section 8), the place, the play, what the good act does for others, the safeguards and suggested art. The art lists are suggestions; you settle the final names in the checklist.

### Petra

**P1. Clearing the road** (built). Value: removing harm from the path. Source: `bukhari_2472`.
Safeguard to add: the obstacles are loose stones and fallen branches only. He never moves, climbs or touches the ancient carved rock. Add one father line saying we look after the old place.

**P2. The lost pouch.** Value: trust (amanah), returning what is lost to its true owner. Source: `bukhari_2427`.
- Place: the Treasury plaza (`bg_petra_treasury`).
- Play: he spots a small cloth pouch in the sand and picks it up. He taps it to look closely: a red tie-string and a small embroidered yellow flower. He does not open it and keep anything. He carries it to the site guard, who stands in plain view. Two travelers come. Each one's thought bubble shows a picture of the pouch he lost. The boy drags the pouch to the traveler whose picture matches. The first easy round differs by color; replays differ by the string, or by a green leaf in place of the flower.
- The other traveler is not a liar. He lost a different pouch, and the guard finds it a moment later.
- Outcome: the traveler's relief; his water money is back; he and his children ride on.
- Safeguards: the trusted adult (the guard) is there for the whole return. The boy never walks off with a stranger.
- Suggested art: `pouch_red`, `pouch_blue`, `guard_stand`, `traveler_worried`, `traveler_happy`, `traveler_b`, `boy_offer` (holding something out with both hands; reused in I2 and J3).

**P3. Loading the cart.** Value: helping someone with his load. Source: `bukhari_2989` (part: helping a man with his mount).
- Place: new `bg_petra_tombs` (the Royal Tombs cliff across a wide sandy path, a low stone wall, no people).
- Play: the old man's sacks slid off his cart on a bump. The boy lifts the small sacks onto the cart, one at a time. The cart tips if he loads one side only, so he balances left and right. The last sack is one too many: the donkey's ears droop. He leaves it for the old man's next trip and brings the donkey water instead.
- Outcome: the cart rolls level; the donkey walks easily.
- Safeguards: small sacks only; the old man lifts the big one. A humane load for the animal is part of the lesson.
- Suggested art: `sack_small`, `sack_big`, `cart_empty` (donkey and empty cart, facing right), `elder_stand`, `donkey_tired`. Reuse `bucket_full`, `boy_lift`.

### Umm Qais

**U1. The thirsty dog** (built). Value: mercy to animals. Source: `bukhari_2363`.
Safeguard to add: he pours the water into the trough and steps back. He does not pet or approach the dog. The well has an iron safety grille with a small bucket hatch in the middle; the bucket passes only through the hatch, and he pulls the rope standing a step back, never leaning over the well.

**U2. The olive saplings.** Value: planting good that others enjoy later; patience; trust in Allah. Source: `muslim_1553a`.
- Place: new `bg_ummqais_grove` (a terraced olive grove among black basalt stones, the valley and the distant lake behind).
- Play: he rubs the soil to dig, sets the sapling in, presses the soil down, then tilts the watering can. Three saplings, each a little trickier (harder soil, a stone to move, a longer pour).
- Then the seasons pass in front of him: sun, rain, a dusting of snow, spring. The tree grows through three pictures. This must take a moment, so he feels the wait. Birds come and eat. An old man rests in the shade.
- Father's line, exactly: `script`: "إحنا زرعناها وسقيناها، والله هو اللي أنبتها. الحمد لله."
- Outcome: birds fed, shade for a stranger, long after the work.
- Suggested art: `sapling_small`, `olive_young`, `olive_tree_fruit`, `watering_can`, `boy_kneel` (kneeling, hands on the ground; reused in Q3), `boy_water`, `birds_eating`, `elder_rest`.

**U3. Sharing the harvest.** Value: fairness between two. Source: `bukhari_2989` (part: judging justly between two).
- Place: `bg_ummqais_grove`.
- Play: two friends picked olives together all morning. Show this first, briefly, so it is clear they did the same work and are owed the same share. The boy deals handfuls from the pile: one to this basket, one to that one, in rhythm. At the end he checks with a balance scale. If one side is low, he moves a handful across until the beam is level.
- Father's line makes the point that fair here means equal because the work was equal.
- Outcome: both friends carry a full, equal basket home.
- Suggested art: `friend_a`, `friend_b`, `olives_pile`, `olives_handful`, `scale_base`, `scale_beam`, `scale_pan` (separate parts so the beam can tilt; reused in Q2). Reuse `basket_empty`, `basket_full`.

### Amman

**A1. The broken jar** (built). Value: truthfulness. Source: `muslim_2607c`.
Safeguards to add: he does not touch the shards with his hands. He tells Mama, and she handles the sharp pieces while he sweeps with the long broom. Check that no line suggests the accident itself was a wrong.

**A2. The block tower.** Value: self-control when angry. Source: `bukhari_6114`.
- Place: `bg_amman_home`.
- Play: he stacks blocks into a tower by dropping each one at the right moment. It is fun and it gets tall. His little sister toddles in and knocks it over. His face goes hot: show it with a warm red tint at the screen edge and a short rumble.
- Calming: he presses and holds while a circle slowly grows (breathing in) and lets go while it shrinks (breathing out). Three breaths. The red fades with each one.
- Then he says how he feels, in his own voice line: he was upset because he worked hard on it. His sister says she wanted to play too.
- They rebuild together. She hands him the blocks, and the tower ends taller than before.
- The anger is never called bad. The father's line says it is normal to feel it and strong to steady it.
- Suggested art: `sister_play`, `sister_sorry`, `sister_happy`, `block_a`, `block_b`, `block_c`, `boy_angry`, `boy_breathe` (eyes closed, hand on chest).

**A3. Mama's shopping.** Value: kindness to parents, noticing without being asked. Source: `quran_17_23`.
- Place: new `bg_amman_stairs` (one of Amman's long outdoor stone stairways between pale stone houses, potted plants, a cat-sized landing halfway).
- Play: Mama stands at the bottom with her bags. Nobody asks him. The first act is his: he taps the bags to offer. He takes the two light ones; the heavy one stays with Mama. He climbs by tapping left and right in step. Rest on the landing. Higher up the steps are narrower and a cat is asleep on one, so he steps around it.
- Outcome: Mama reaches the door with her hands free and her breath back.
- Safeguards: light bags only.
- Suggested art: `bag_light_a`, `bag_light_b`, `bag_heavy`, `mama_bags`, `mama_relieved`, `boy_carry_bags`, `cat_sleeping`.

### Irbid

**I1. The secret helper** (built). Value: giving in secret. Source: `bukhari_660`.
No change to the scene. The sentence about good and bad secrets goes in the parents' corner, not in the scene.

**I2. Too much change.** Value: trust, giving people what is theirs. Source: `quran_4_58`.
- Place: new `bg_irbid_bakery` (an old-town bakery front by day, basalt and limestone, an arched opening, a counter with a tray).
- Play: Mama gave him five coins for bread. Bread costs three. The busy baker hands back four coins. On the counter are two coin-shaped outlines for his change. He places two coins in them. Two coins are left over in his hand. He drags them back to the baker's tray.
- Replays change the numbers a little. Always small enough to count on one hand.
- Outcome: the baker's surprise and warm thanks; at closing time his tray is right.
- Suggested art: `baker_busy`, `baker_smile`, `coin` (plain, no face and no writing), `bread_bag`, `coin_tray`. Reuse `boy_offer`.

**I3. The new boy.** Value: a kind word; including the one left out. Source: `bukhari_2989` (part: the good word).
- Place: new `bg_irbid_alley` (a quiet old-town lane by day with a goal chalked on a basalt wall).
- Play: a passing game. He taps a friend to pass the ball. A new boy stands by the wall, watching. Nothing forces the boy to notice him; the game simply stays small. When he walks over (drag) and taps the speech button, he says "تعال العب معنا!". The new boy joins, the passing gets livelier with four, and the new boy is the one who scores.
- He must go to him and invite him. Passing the ball in his direction is not enough.
- Outcome: the new boy's face; four friends instead of three.
- Suggested art: `newboy_alone`, `newboy_happy`, `boy_kick`, `boy_wave`. Reuse `friend_a`, `friend_b`, `ball`.

### Jerash

**J1. After the festival.** Value: removing harm from where people walk. Source: `bukhari_2989` (part: removing harm from the road).
- Place: new `bg_jerash_plaza` (the Oval Plaza: a wide paved oval ringed by tall columns).
- Play: litter is scattered after a festival. He drags each piece to the bin with the matching picture: bottles, paper, the rest. A breeze moves the paper later on. One item glints: broken glass. If he reaches for it, it does not lift, and the father says this one is for a grown-up. He taps the site guard, who sweeps it up.
- Outcome: visitors walk the clean plaza; a small child runs across it safely.
- Safeguards: safe litter only; the hazard is reported, never touched. He never picks up glass by hand, not even to carry it to the guard: the glass cannot be lifted or dragged at all, and the guard sweeps it up with his own broom and dustpan.
- Suggested art: `litter_bottle`, `litter_can`, `litter_paper`, `litter_peel`, `glass_broken`, `bin_plastic`, `bin_paper`, `bin_general` (pictures on the bins, no words), `guard_sweep`. Reuse `guard_stand`, `boy_lift`.

**J2. The lost little girl.** Value: helping someone in distress. Source: `muslim_2699a`.
- Place: new `bg_jerash_cardo` (the long colonnaded street, paved with big worn stones).
- Play: a small girl is crying beside a column. He does not lead her away. He stays with her in the open and waves to the guide, who comes over. The girl says her mother wears a green scarf. Visitors pass between the columns. He taps the mother when she appears. On replays the clue changes (a yellow bag, a blue dress).
- Outcome: the hug; the mother's thanks go to the guide and the boy together.
- Safeguards: an open, visible place the whole time; a trusted adult leads; he never goes off alone with her.
- Suggested art: `girl_crying`, `girl_happy`, `guide_stand`, `mother_search`, `mother_hug`, `visitor_a`, `visitor_b`.

**J3. The forgotten lunch.** Value: feeding others. Source: `bukhari_12`.
- Place: `bg_jerash_plaza`, on the steps at its edge.
- Play: a school trip. His classmate has no lunch. The boy asks first whether he can eat cheese. Then he draws a line across the sandwich to cut it into two fair halves, and pours water into a second cup: hold to pour, let go at the line. He hands both over.
- Outcome: two boys eating together, legs swinging.
- Safeguards: he asks before sharing food; each has his own cup.
- Suggested art: `classmate_hungry`, `classmate_happy`, `sandwich_whole`, `sandwich_half`, `cup_empty`, `cup_full`, `water_bottle`, `boy_sit_front`. Reuse `boy_offer`.

### The Dead Sea

**D1. The dripping taps.** Value: not wasting water. Source: `quran_7_31`.
- Place: new `bg_deadsea_restarea` (a shaded stone rest stop with a row of taps, the turquoise sea and hazy mountains behind).
- Play: visitors left taps dripping. He turns each one off with a circling finger. Later taps are stiffer and need a full turn. One pipe leaks at a joint; turning does nothing. He taps the attendant, who fixes it with a wrench.
- Outcome: the puddle dries; a row of thirsty potted plants gets the saved water.
- Safeguards: the leak is reported to an adult, not fixed by a child.
- Suggested art: `tap_body`, `tap_handle` (separate so it can turn), `pipe_leak`, `attendant_wrench`, `plant_dry`, `plant_fresh` (both reused in the Amman quiet deed). Reuse `guard_stand` as the attendant if the uniform fits.

**D2. Seeing the blessings.** Value: gratitude. Source: `quran_14_7`.
- Place: new `bg_deadsea_shore` (a safe viewpoint above the shore: white salt crust, still turquoise water, mountains across the water, a bench).
- Play: slow and gentle. He sits with Baba. Baba asks what blessings he can see. He taps things in the scene in any order: the sun, the water bottle, the bread, his own hands, Baba. Each one glows softly and Baba says one short line of thanks for it. No counter, no list, no end score. After four or five, the sun lowers and the salt sparkles.
- No floating and no swimming. They stay on the viewpoint.
- Never suggest that being grateful earns more things. The lines thank; they do not bargain.
- Suggested art: `baba_sit`, `bench`, `picnic_cloth`. Reuse `boy_sit_front`, `food_bread`, `water_bottle`.

**D3. Walking with Grandfather.** Value: honoring the elderly. Source: `tirmidhi_1920`.
- Place: `bg_deadsea_shore`, along the path.
- Play: Baba supports Grandfather's arm. The boy walks beside them carrying Grandfather's small bag. He holds to walk and lets go to wait. If he runs ahead, nothing bad happens: Grandfather falls behind and the boy turns and comes back. Three small stones lie on the path; he moves them aside before Grandfather reaches them. They reach the bench and he pours Grandfather a cup of water.
- Outcome: Grandfather seated, looking at the sea, his hand on the boy's head.
- Safeguards: the adult gives the physical support; they keep to the made path, off the sharp salt.
- Suggested art: `grandpa_baba_walk` (the two together, facing right), `grandpa_sit`, `bag_small`, `pebble`. Reuse `boy_walk_a`, `boy_walk_b`, `cup_full`, `bench`.

### Aqaba

**Q1. The turtle and the plastic.** Value: mercy to animals; keeping harm out of their home. Source: `bukhari_2363`.
- Place: new `bg_aqaba_beach` (golden sand, deep blue sea, palm trees, mountains across the gulf, a small rescue hut).
- Play: a sea turtle near the shore is tangled in a plastic bag. He does not touch it. He runs to the rescue hut and taps the bell. The marine ranger comes and frees the turtle while the boy holds the ranger's bucket. Then the boy clears the plastic from the sand into a sack so it cannot happen again.
- Outcome: the turtle swims out; the water is clear behind it.
- Safeguards: the ranger handles the animal; the boy picks up only safe litter.
- Suggested art: `turtle_tangled`, `turtle_free`, `ranger_stand`, `ranger_kneel`, `plastic_bag`, `litter_sack`, `rescue_bell`. Reuse the litter pieces and `boy_lift`.

**Q2. The honest scale.** Value: honest weight. Source: `quran_55_9`.
- Place: new `bg_aqaba_harbor` (a fish stall by small wooden boats, the sea behind, a tall flagpole far off with no flag detail).
- Play: the fisherman asks him to help weigh. A customer wants fish to match the weight on one pan. He adds fish to the other pan until the beam is level. Big fish first, then small ones for the fine balance. A beam that is not level stays visibly not level; he may add or take away as long as he likes.
- Outcome: the customer checks the beam, smiles, and carries dinner home to her family.
- Suggested art: `fisherman_stand`, `customer_basket`, `fish_big`, `fish_small`, `weight_iron`. Reuse the three scale parts.

**Q3. The sandcastle promise.** Value: keeping a promise. Source: `quran_17_34`.
- Place: `bg_aqaba_beach`.
- Play: he promised his sister a sandcastle. Friends call him to play ball. Two identical buttons, shuffled left and right as in Amman: build now, or go to the ball.
  - Build now: he fills the bucket with taps, flips it with a swipe, and sets shells on top. A wave takes the first tower, so they build the next one higher up the sand.
  - Go to the ball: he plays one short pass, then sees his sister waiting with her bucket. He goes back and asks her whether after the game is all right. She says yes, after the game. He plays one more pass, returns, and they build. The promise is kept because she agreed to the change.
- Both paths end at the same castle and the same happy sister. Neither path is scolded.
- Suggested art: `sister_bucket_wait`, `sand_bucket`, `sand_tower`, `shell_a`, `shell_b`. Reuse `sister_happy`, `friend_a`, `friend_b`, `ball`, `boy_kneel`, `boy_kick`.

## 6. The quiet deed (last mission of every day)

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

## 7. Wadi Rum: the night ending

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

## 8. Sources

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

`quran_14_7`: the paraphrase speaks only of thanking. It leaves out the promise of increase on purpose, so a child does not hear gratitude as a way to get more things. The owner may change this at review.

Keep the Sunnah and the story apart, as now: the closing hadith line of a mission says only what the paraphrase says. No game details in it.

## 9. Music and sound

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

## 10. Parents' corner additions

- The sound choice and the music credit (section 9).
- Conversation starters for every new mission: three short questions each, in Jordanian Arabic, in the style of the existing ones. One of the three should point to real life ("شو بنقدر نعمل بكرا؟").
- Under Irbid, add this sentence for the parent to say in his own words: "السرّ الحلو هو اللي بيفرّح الناس. وأي سرّ بيخوّفك أو بيزعّلك، بتحكيه لماما وبابا دايماً."
- The recording guide lists every new `script` line.
- Review status counts pending registry entries, as now.
- Still no statistics, no history, no record of his choices.

## 11. Art notes for the checklist

**New real-place cues** (add to `GAME_SPEC.md` section 6.3):

| Background | Must show |
|---|---|
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

Backgrounds have no people, as now. Leave calm space at the top and bottom.

**New characters** (add to section 6.4). All have full, friendly cartoon faces.
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

**Standing art rules,** unchanged: the locked storybook style of `art/reference/style_village.jpg`; no text, letters or numbers in any image (coins and bins included); no statues or carved figures; the boy drawn from the same description every time; sprites as single full figures on pure white with no shadow.

## 12. Build order

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

## 13. Reminders

- Fun first in the hands, meaning in the story. A mission that is not fun to touch teaches nothing.
- When unsure whether something rewards him for being good, leave it out.
- Never write religious text of your own. Never draw scenery or characters in code.
- The game succeeds if its effect remains after it is closed: نجاح اللعبة أن يبقى أثرها بعد إغلاقها.
