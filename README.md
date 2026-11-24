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
