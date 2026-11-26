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
2. The map: tap a place to play its mission. Each place plays one mission a day and takes its turn through its three missions (Petra, Umm Qais, Amman, Jerash, the Dead Sea, Aqaba; Irbid has two ordinary ones plus the secret basket). The first time round each mission is a little easier. A place already played today just says its name.
3. After each mission the sun moves a step toward sunset. That is the only sign of progress.
4. **The fourth mission of every day is a quiet good deed** that nobody sees or thanks: in Petra the boy clears the Siq at dawn; in Umm Qais he waters a neighbor's wilting trees; in Amman he waters Mama's mint and folds the blanket before she wakes; in Irbid he leaves the secret basket; in Jerash he clears the empty plaza early in the morning; at the Dead Sea he turns off a dripping tap with nobody around; in Aqaba he clears the plastic from the empty beach at sunrise.
5. After four missions, the map turns to dusk and **وادي رَمّ** glows. Tapping it opens the night ending: stars, then the father's closing line, then the ayah in still text, then the goodnight line and the button **خلصنا لليوم**.
6. Starting again begins a fresh day. Nothing is lost by closing the game at any point.

## Parents' corner

Press and hold the small lock at the top left of the map for **3 seconds**. Inside:

- **الصوت بالخلفية:** cheerful music (the default), nature sounds only, or nothing (بدون). With music or nature sounds, **علوّ الموسيقى** sets the volume: quiet or medium.
- **سرعة الصوت:** slower, normal or faster speech. Tap one to hear a sample. It changes only the phone's own speech; the game's recorded voice files play at their own speed.
- **The phone's Arabic voice:** which one the phone has, or that it has none. A higher-quality "Enhanced" or "Premium" Arabic voice can be downloaded free in the iPhone's settings (look under Accessibility, then Spoken Content, then Voices, then Arabic), and the game will use it.
- **اختبار الصوت (voice test):** tap **جرّب الصوت**: it plays the game's own recording of the welcome line, the same way every line is played, and says **اشتغل** (played) or the exact error. Under it: how many lines use each voice source (your recording, the game's recorded voice, the phone's speech, or text only). If it says اشتغل but you heard nothing, set **الصوت مع زر الصامت** to **مطفي** and try again; that setting is remembered. The smaller row **جرّب صوت الجهاز** tests the phone's own speech, which is used only for a line with no file and no recording; under it are the phone's voice details.
- **أسئلة للحديث مع ابنك:** three questions for every mission, grouped by place, to talk through together. The third one always points to real life.
- **فكرة لليوم:** one small act of kindness to try. It is never tracked or checked.
- **دليل التسجيل:** the recording guide (see below).
- **مراجعة النصوص الدينية:** every text still waiting for your review, with its source in Arabic, where it is used, and the words the game says.
- At the bottom, in small text: the music credit, which the music license requires.

The game keeps no statistics about your son and no history of what he chose. The only things saved on the phone are the sound choice, the music volume, the voice speed, the silent-switch choice, one number per place for which mission comes next and whether he has been around once, and your own recordings (below). Nothing is sent anywhere.

## Recording your own voice (recommended)

The game speaks every line with its own recorded voice (made with Piper text-to-speech). Your voice replaces it line by line, with no change to the game. Each line in the recording guide shows which voice it uses now.

**On the phone (easiest).** In the parents' corner, open **دليل التسجيل**. Under each sentence there are three buttons:
1. **سجّل**: the phone asks once for the microphone. Read the sentence, then tap **وقّف**.
2. **اسمع**: plays what you recorded. **سجّل من جديد** replaces it.
3. **احذف**: removes it; that line goes back to the game's recorded voice.

These recordings stay on that phone only. They are never uploaded or sent anywhere, so they are not on another phone or in the repository. A recorded line always plays instead of the game's voice.

**For every phone (optional).** You can also add a recording to the game itself: record the sentence with **Voice Memos** (it saves `.m4a`), rename it to the file name shown above the sentence (for example `start.m4a`), and upload it to `public/assets/audio/vo` on GitHub (**Add file**, **Upload files**, commit to main). A recording made on the phone comes first; then a file in the game; then the phone's voice.

The speech bubble shows the words being said: the Jordanian sentence while your recording plays, the Standard Arabic sentence while the game's voice (or the phone's) speaks.

**The ayah** is never read by the phone's voice. If you want a recitation to play in the night ending, add it as `public/assets/audio/quran/3_190.m4a`. Without it, the ayah is shown in silence for 10 seconds.

## Adding the art

Use the art checklist spreadsheet `art/Fael_Khair_Art_Checklist.xlsx` (file names, sizes, ready-made prompts and which wave each image is needed in; the delivered images are marked done). Upload images to `art/incoming` the same way (Add file, then Upload files, then commit to main), named exactly as in the checklist. Until an image arrives, the game shows a pink box with its name, so nothing missing goes unnoticed.

## Religious content review

Open `content/registry.json`. For each entry, paste the exact Arabic text and translation from the collection where it says `TODO owner`, check the wording, then change `"pending"` to `"approved"`.

## When all the art is in

In `.github/workflows/deploy.yml`, delete the line `ALLOW_PLACEHOLDERS: '1'`. From then on, a missing image stops the publish instead of showing a pink box.
