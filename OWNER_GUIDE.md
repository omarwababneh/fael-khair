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

## How a day goes (a short day 8 to 10 minutes; a long day longer)

1. The start screen: tap **يَلّا**.
2. The map: tap a place to play its mission. Each place plays one mission a day and takes its turn through its three missions (Petra, Umm Qais, Amman, Jerash, the Dead Sea, Aqaba; Irbid has two ordinary ones plus the secret basket). The first time round each mission is a little easier. A place already played today just says its name.
3. **Free time.** After every ordinary mission, once the father's closing line has been said, the scene stays open for a while: «معنا وقت. العب قليلاً إن أردت.» Two or three things in the scene answer a tap with a small motion and a soft sound (the same every time; nothing to win or count). Tap the home button to go back to the map whenever he likes. After 45 seconds the father asks once «هيّا نكمل الرحلة؟»; nothing forces him out. There is no free time after a quiet deed or in Wadi Rum.
4. After each mission the sun moves a step toward sunset: six steps on a long day, four on a short day. That is the only sign of progress.
5. **A day has up to six missions** on a long day (the default; four on a short day, see «طول اليوم» below). Six is never an obligation: after three missions on a long day the map shows **خلصنا لليوم؟**. If he taps it, the next place he opens plays its quiet deed, and then Wadi Rum opens.
6. **The last mission of every day is a quiet good deed** that nobody sees or thanks: in Petra the boy clears the Siq at dawn; in Umm Qais he waters a neighbor's wilting trees; in Amman he waters Mama's mint and folds the blanket before she wakes; in Irbid he leaves the secret basket; in Jerash he clears the empty plaza early in the morning; at the Dead Sea he turns off a dripping tap with nobody around; in Aqaba he clears the plastic from the empty beach at sunrise.
7. After the quiet deed, the map turns to dusk and **وادي رَمّ** glows. Tapping it opens the night ending: the stars, then «ارسم بين النجوم ما تحبّ.»: he can drag from star to star to draw glowing lines, with no shape to find and nothing judged. It ends when he taps **يلّا**, or by itself after 20 seconds without a touch (at the latest after 90 seconds). The lines fade away, then come the father's closing line, the ayah in still text (nothing moves while it shows), the goodnight line and the button **خلصنا لليوم**.
8. Starting again begins a fresh day. Nothing is lost by closing the game at any point.

## Parents' corner

Press and hold the small lock at the top left of the map for **3 seconds**. Inside:

- **طول اليوم:** **طويل** (up to six missions before Wadi Rum, the default) or **قصير** (four, as before). On a long day he can still end after three with **خلصنا لليوم؟**. The quiet deed is always the last mission of the day. A change applies at once: if he has already played more missions than the new length, the next one is the quiet deed.
- **الصوت بالخلفية:** cheerful music (the default), nature sounds only, or nothing (بدون). With music or nature sounds, **علوّ الموسيقى** sets the volume: quiet or medium.
- **سرعة الصوت:** slower, normal or faster speech. Tap one to hear a sample. It changes only the phone's own speech; the game's recorded voice files play at their own speed.
- **The phone's Arabic voice:** which one the phone has, or that it has none. A higher-quality "Enhanced" or "Premium" Arabic voice can be downloaded free in the iPhone's settings (look under Accessibility, then Spoken Content, then Voices, then Arabic), and the game will use it.
- **اختبار الصوت (voice test):** tap **جرّب الصوت**: it plays the game's own recording of the welcome line, the same way every line is played, and says **اشتغل** (played) or the exact error. Under it: how many lines use each voice source (your recording, the game's recorded voice, the phone's speech, or text only). If it says اشتغل but you heard nothing, set **الصوت مع زر الصامت** to **مطفي** and try again; that setting is remembered. The smaller row **جرّب صوت الجهاز** tests the phone's own speech, which is used only for a line with no file and no recording; under it are the phone's voice details.
- **أسئلة للحديث مع ابنك:** three questions for every mission, grouped by place, to talk through together. The third one always points to real life.
- **فكرة لليوم:** one small act of kindness to try. It is never tracked or checked.
- **دليل التسجيل:** the recording guide (see below).
- **مراجعة النصوص الدينية:** every text still waiting for your review, with its source in Arabic, where it is used, and the words the game says.
- At the bottom, in small text: the music credit, which the music license requires.

The game keeps no statistics about your son and no history of what he chose. The only things saved on the phone are the day length, the sound choice, the music volume, the voice speed, the silent-switch choice, one number per place for which mission comes next and whether he has been around once, and your own recordings (below). Nothing is sent anywhere.

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
