# Owner guide

**Live link (after you merge the pull request):** https://omarwababneh.github.io/fael-khair/

Publishing takes about two minutes after a merge. You can watch it under the repository's **Actions** tab (a green tick means it is live).

## Install on the iPhone

1. Open the link above in **Safari** (not Chrome).
2. Tap the **Share** button (the square with an arrow pointing up).
3. Scroll down and tap **Add to Home Screen**, then **Add**.
4. **With the internet still on,** open the game once from the new home-screen icon and wait about 10 seconds on the first screen. This saves the game on the phone.
5. From then on it works with no internet, including in airplane mode.

## Sound

- If you hear nothing, check the ring/silent switch on the side of the iPhone and the volume.
- The voice is the iPhone's own Arabic voice. If the phone has none, the words still appear in the speech bubble. To add a better Arabic voice: Settings, Accessibility, Spoken Content, Voices, Arabic.

## Parents' corner

Press and hold the small lock at the top-left of the map for 3 seconds. Today it holds the music on/off switch. The rest arrives in Milestone 3.

## Adding the art

1. On GitHub, open the folder `art/incoming`.
2. Tap **Add file**, then **Upload files**, and drop in the images. Name each file exactly as in `GAME_SPEC.md` section 6.5 (for example `rock_a.png`, `bg_petra_siq.jpg`).
3. Commit to a new branch and open a pull request. Once merged, the game rebuilds with the new art.

Until an image arrives, the game shows a pink box with the image's name, so nothing missing goes unnoticed. For the two branches, the smooth end he holds must be on the **left** of the picture.

## Religious content review

Open `content/registry.json`. For each entry, paste the exact Arabic text and translation from the collection where it says `TODO owner`, check the wording, then change `"pending"` to `"approved"`.
