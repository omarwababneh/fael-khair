# فاعل خير (Fa'el Khair)

A private, offline web game for one young reader in Jordan. See `GAME_SPEC.md` (the single source of truth), `OWNER_GUIDE.md` (plain-language steps) and `DECISIONS.md` (choices made where the spec was silent).

```bash
npm install
npm run dev          # local development
npm run art          # prepare art from art/incoming/ and list what is missing
npm run check:art    # list missing or undersized art
npm run build        # production build (fails if required art is missing)
ALLOW_PLACEHOLDERS=1 npm run build   # build with magenta placeholders
```

Debug: add `?scene=petra` (or `map`, `p2`, `p3`, `petra-dawn`, `ummqais`, `u2`, `u3`, `ummqais-dusk`, `amman`, `a2`, `a3`, `amman-morning`, `irbid`, `i2`, `i3`, `wadirum`) to the address to jump straight to a scene; add `&lap=1` for the later-lap version.

## Music credits

The background music in `public/assets/audio/music/` is by Kevin MacLeod (incompetech.com), licensed under Creative Commons: By Attribution 4.0 (https://creativecommons.org/licenses/by/4.0/). Each file is a one-minute excerpt, converted to mono.

| File | Track |
|---|---|
| `map.m4a` | "Carefree" |
| `petra.m4a` | "Monkeys Spinning Monkeys" |
| `ummqais.m4a` | "Merry Go" |
| `amman.m4a` | "Fluffing a Duck" |
| `irbid.m4a` | "Sneaky Snitch" |
| `jerash.m4a` | "Bumbly March" |
| `deadsea.m4a` | "Wallpaper" |
| `aqaba.m4a` | "Life of Riley" |

`jerash` and `deadsea` play in their places (wave 3), `aqaba` in Aqaba (wave 4).

The license requires this credit to stay wherever the game is shared. It is also shown inside the game, at the bottom of the parents' corner.

## Voice credit

The built-in voice in `public/assets/audio/vo/` was made with Piper text-to-speech, voice ar_JO-kareem-medium (rhasspy/piper-voices). `npm run check:vo` lists spoken lines with no file and files with no line.
