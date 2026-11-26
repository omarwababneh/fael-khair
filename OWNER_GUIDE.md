# Owner guide

**Live link:** https://omarwababneh.github.io/fael-khair/

Every change merged into the project publishes itself in about 2 minutes. The repository's **Actions** tab shows a green tick when it is live.

## Install on the iPhone

1. Open the link above in **Safari** (not Chrome).
2. Tap **Share** (the square with an arrow pointing up), scroll down, tap **Add to Home Screen**, then **Add**.
3. **With the internet still on,** open the game once from the new home-screen icon and wait about 10 seconds. This saves the whole game on the phone.
4. From then on it works with no internet, including in airplane mode.

**On a computer or a tablet** the game shows in a portrait frame in the middle of the window, with plain bars at the sides.

**Updates install themselves.** When a new version is published, the game switches to it the next time the start screen shows, never in the middle of a day. The version line in the parents' corner shows which version the phone has. (Only a device that still runs a version from before 24 November 2026 needs one manual refresh: close and reopen the game twice on the iPhone, or press Ctrl+Shift+R on a computer.)

## How a day goes (8 to 10 minutes)

1. The start screen: tap **يَلّا**.
2. The map: tap a place to play its mission. Each place plays one mission a day and takes its turn through its missions (Petra now has three; the other places get theirs in the next waves). A place already played today, or one not built yet (Jerash, the Dead Sea, Aqaba), just says its name.
3. After each mission the sun moves a step toward sunset. That is the only sign of progress.
4. **The fourth mission of every day is a quiet good deed** that nobody sees or thanks: in Petra the boy clears the Siq at dawn; in Irbid he leaves the secret basket.
5. After four missions, the map turns to dusk and **وادي رَمّ** glows. Tapping it opens the night ending: stars, then the father's closing line, then the ayah in still text, then the goodnight line and the button **خلصنا لليوم**.
6. Starting again begins a fresh day. Nothing is lost by closing the game at any point.

## Parents' corner

Press and hold the small lock at the top left of the map for **3 seconds**. Inside:

- **الصوت بالخلفية:** cheerful music (the default), nature sounds only, or nothing (بدون). With music or nature sounds, **علوّ الموسيقى** sets the volume: quiet or medium.
- **سرعة الصوت:** slower, normal or faster speech. Tap one to hear a sample.
- **The phone's Arabic voice:** which one the phone has, or that it has none. A higher-quality "Enhanced" or "Premium" Arabic voice can be downloaded free in the iPhone's settings (look under Accessibility, then Spoken Content, then Voices, then Arabic), and the game will use it.
- **أسئلة للحديث مع ابنك:** three questions for each place, to talk through together.
- **فكرة لليوم:** one small act of kindness to try. It is never tracked or checked.
- **دليل التسجيل:** the recording guide (see below).
- **مراجعة النصوص الدينية:** how many religious texts still wait for your review.
- At the bottom, in small text: the music credit, which the music license requires.

The game keeps no statistics about your son and no history of what he chose. The only things saved on the phone are the sound choice, the music volume, the voice speed, and one number per place for which mission comes next.

## Recording your own voice (recommended)

The game speaks with the phone's built-in voice until your recordings are added. Your voice replaces it line by line, with no change to the game.

1. In the parents' corner, open **دليل التسجيل**. Each line shows a file name (for example `start.m4a`) and the Jordanian sentence to read.
2. Record each sentence with the iPhone's **Voice Memos** app. It saves `.m4a` files.
3. Rename each recording to its file name.
4. On GitHub, open the folder `public/assets/audio/vo`, tap **Add file**, then **Upload files**, and commit to the main branch.

Once a recording exists, the speech bubble shows the Jordanian sentence you recorded.

**The ayah** is never read by the phone's voice. If you want a recitation to play in the night ending, add it as `public/assets/audio/quran/3_190.m4a`. Without it, the ayah is shown in silence for 10 seconds.

## Adding the art

Use the art checklist spreadsheet `art/Fael_Khair_Art_Checklist.xlsx` (file names, sizes, ready-made prompts and which wave each image is needed in; the delivered images are marked done). Upload images to `art/incoming` the same way (Add file, then Upload files, then commit to main), named exactly as in the checklist. Until an image arrives, the game shows a pink box with its name, so nothing missing goes unnoticed.

## Religious content review

Open `content/registry.json`. For each entry, paste the exact Arabic text and translation from the collection where it says `TODO owner`, check the wording, then change `"pending"` to `"approved"`.

## When all the art is in

In `.github/workflows/deploy.yml`, delete the line `ALLOW_PLACEHOLDERS: '1'`. From then on, a missing image stops the publish instead of showing a pink box.
