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

Debug: add `?scene=petra` or `?scene=map` to the address to jump straight to a scene.

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

The last three are ready for places that are not built yet. They play once those places exist under the keys `jerash`, `deadsea` and `aqaba`.

The license requires this credit to stay wherever the game is shared. It must also be shown inside the game, in the parents' corner.
