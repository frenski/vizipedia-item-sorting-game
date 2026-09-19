# Vizipedia — Item Sorting

One item at a time travels across the screen, left to right. Flick it **up**
or **down** to put it on your tray. Do nothing and it scrolls away — there is
no "no" button, because letting something pass **is** the no.

Same shape as `vizipedia-falling-categoriser`: a static page driven entirely
by one JSON file.

```
index.html
css/main.css
js/main.js
js/ui-texts.js          ← every UI string, en / bg / ar
data/<gameId>/game-config.json
assets/<gameId>/        ← images and audio for that game
```

Open a game by id:

```
index.html#id=demo-judgement
index.html#id=demo-consistency&lang=bg
```

`#lang=` picks the UI language, `#safeTop=44&#safeBottom=24` hand the page a
host WebView's real system-bar insets. A page that inlines `GAME_ID` uses that
instead of the hash.

Two demos ship with the engine: **demo-judgement** (right and wrong answers)
and **demo-consistency** (no right answers — you are judged on whether your
own choices hang together).

---

## How a round plays

1. Items pass one at a time, `itemDuration` seconds each.
2. Flick up or down to take one. A flick is a drag of `takeDist` (about 9% of
   the screen height) or a fast swipe; ↑ / ↓ / Space do the same.
3. Touching a card and letting it go anyway is a **hover** — the engine
   remembers it, because hesitating is not the same as a clean no.
4. What you take flies into **the bag** at the bottom of the screen — one
   object, not a shelf of slots, with a counter on it showing how full it is.
5. The bag holds `tray.capacity` (default 6). Taking one more freezes the
   conveyor and **unpacks the bag on screen** so you can name what goes;
   tapping the new card instead lets it go.
6. `totalItems` items pass, then the round ends — or it loops forever and
   speeds up, in `infinite` mode.

### Why the bag stays shut

What is in the bag is deliberately not listed during play. In the consistency
games, remembering what you already took **is** the exercise — a permanent
read-out would answer the question the round is asking. The counter gives the
one fact that is fair to hand over for free: how full it is. The contents
appear only when the player is over capacity and genuinely cannot choose
without seeing the alternatives.

---

## game-config.json

Everything is optional except `items`. A config with a title and a list of
items is already playable.

```json
{
  "title": "What You'd Actually Eat",
  "subTitle": "Thirty options, room for six.",

  "mode": "consistency",
  "order": "random",
  "duration": "finite",

  "itemDuration": 2.4,
  "acceleration": 0.012,
  "minItemDuration": 1.1,
  "gap": 0.3,
  "totalItems": 30,

  "maxLives": 3,
  "tray": { "capacity": 6, "label": "TONIGHT", "image": "bag.png" },

  "items": [ … ]
}
```

### The bag

| Key | Default | Meaning |
|---|---|---|
| `tray.capacity` | `6` | how many fit before a swap is forced |
| `tray.label` | the translated "YOUR BAG" | small caps under the graphic; `""` hides it |
| `tray.image` | `null` | the graphic, from `assets/<gameId>/` — a bag, a suitcase, a wardrobe, a shopping trolley, whatever the round is about |

`tray.image` is drawn at its own aspect ratio, sized to about 30% of the
screen. With no image the engine draws a small hard case from the theme's
`bag` / `bagDark` / `accent` colours, so a game is playable before the art
exists. The counter sits on the bag's top corner: a number, ringed by an arc
that closes as the bag fills and turns `danger` red on the last slot.

### Pacing

| Key | Default | Meaning |
|---|---|---|
| `itemDuration` | `2` | seconds for one item to cross the screen |
| `acceleration` | `0` | each item is this fraction faster than the last; compounds over the whole session |
| `minItemDuration` | `0.7` | floor, so acceleration can't outrun a human |
| `gap` | `0.25` | seconds of empty lane between items |

At `itemDuration: 2.4` and `acceleration: 0.03`, item 1 gets 2.40 s, item 10
gets 1.82 s, item 30 gets 0.99 s, and from item ~37 on everything sits at the
`minItemDuration` floor.

### Order and length

| Key | Values | Meaning |
|---|---|---|
| `order` | `"sequence"` \| `"random"` | play the JSON order, or shuffle |
| `duration` | `"finite"` \| `"infinite"` | end when the list runs out, or loop forever and keep accelerating |
| `totalItems` | number \| `null` | N items per round; `null` uses the whole list |

`totalItems` never splits a contradiction pair — the cap is applied to whole
pairs, so a half-pair can never reach the lane on its own. Under `random`,
pair halves are also pushed at least a few items apart, so the second wording
genuinely "comes back later".

In `infinite` mode the list loops and pair memory resets on each lap: a twin
from the previous lap is not a contradiction, the player was already judged
on it.

### Items

```json
{
  "content": "Cold pizza from the fridge",
  "short":   "Cold pizza",
  "pairId":  "pizza",
  "correct": true,
  "points":  10,
  "image":   "pizza.png",
  "sound":   "audio/ping.mp3",
  "color":   "#fff",
  "textColor": "#26262e"
}
```

| Key | Meaning |
|---|---|
| `content` | the wording on the card, and in the end-of-round list |
| `short` | the shorter wording used in the swap grid (falls back to `content`) |
| `pairId` | two items sharing one are the same thing said twice |
| `correct` | `true` / `false` for right-and-wrong games; omit where there is no right answer |
| `points` | overrides the `scoring` table for this item |
| `image` | drawn above the text, from `assets/<gameId>/` |
| `sound` | played when the item appears |

A card sizes itself to the lane: the caption shrinks with the band and the
picture takes whatever height is left, dropping out below 44px rather than
shrinking to a smudge. That only bites on a short landscape phone, and only
for long captions — keep captions to a line or two and the art survives
everywhere.

### `cardStyle`

| Value | What travels down the lane |
|---|---|
| `"card"` (default) | a white plate carrying the picture and the caption |
| `"bare"` | no plate: the artwork itself, much larger, with the caption under it in `theme.bareText` |

`"bare"` is for icon games whose PNGs have a **transparent background** — with
those, the plate is just a box drawn around art that does not need one. It
gives the picture up to 62% of the lane instead of a flat 150px (about 270px
on a desktop screen, against 150 before), widens the text column, and flies
the artwork itself into the bag rather than a blank token. The committed-flick
cue moves from a border highlight to an accent glow around the icon.

Check the art before switching: a PNG with an opaque white background will
show as a white square with no plate to explain it. The engine cannot tell the
difference.

A `"bare"` item with no image is just floating text — legible, thanks to a
heavy shadow, but a game that mixes picture and text-only items reads more
evenly on `"card"`.

Images are drawn at about 270px at most, so there is nothing to gain from
source art much above 600px square.

### Scoring

```json
"scoring": {
  "take": 0,              // taking an item with no `correct` flag
  "correct": 10,          // taking a `correct: true` item
  "wrong": 0,             // taking a `correct: false` item (may be negative)
  "missedCorrect": 0,     // letting a `correct: true` item pass
  "completionBonus": 0    // finishing a finite round
}
```

Score floors at 0. Points land when a card **reaches the tray** — reaching for
something and then throwing it away instead never scores.

---

## Losing a life

`mode` is only a preset: it fills in the switches below that the config does
not set itself, so a game can pick a preset and still override one rule.
`"judgement"` turns on `wrongPickCostsLife`; `"consistency"` turns on the
three consistency rules.

```json
"rules": {
  "wrongPickCostsLife": true,
  "missedCorrectCostsLife": false,

  "contradiction": { "enabled": true, "lives": 1 },
  "freeze":        { "enabled": true, "afterItems": 8, "lives": 1 },
  "stall":         { "enabled": true, "streak": 3, "requireHover": true, "lives": 1 }
}
```

Every rule is independent, so a game can mix right-and-wrong scoring with the
consistency rules.

**`wrongPickCostsLife`** — taking a `correct: false` item costs a life.

**`missedCorrectCostsLife`** — letting a `correct: true` item pass costs a
life. Off by default: in most of these games passing is a legitimate answer.

**`contradiction`** — two items sharing a `pairId` are the same thing said
twice. Take one and let the other pass, and that is a life. **Unless the tray
was full when the second one went by** — that is a fair choice, not a
contradiction. Evaluated on whichever half resolves second, so the order the
two wordings happen to appear in makes no difference. The toast names both
wordings, which is where the point of the exercise actually lands.

A card taken while the tray was full and then thrown away instead is recorded
as a pass with no room — so it can never be held against the player either.

**`freeze`** — an empty tray once `afterItems` items have gone by. Fires once
per round.

**`stall`** — `streak` items in a row that the player *hovered over and took
nothing from*. With `requireHover: true` (the default) a card the player never
touched does not count: letting something pass untouched is a deliberate no,
and the rule is about dithering, not about saying no. Set `requireHover:
false` to count every consecutive pass.

Discarding something from the tray later does not rewrite the contradiction
record: the rule is about the decision at the moment it was made.

---

## Look

```json
"backgroundImage": "background.jpg",
"theme": {
  "background": "#14182b", "backgroundTo": "#2a2145",
  "lane": "rgba(255,255,255,0.06)",
  "card": "#ffffff", "cardText": "#26262e", "cardTaken": "#ffe9b8",
  "accent": "#ffc533",
  "bag": "#e8b45f", "bagDark": "#b5793a",
  "traySlot": "rgba(255,255,255,0.28)",
  "trayText": "#ffffff", "danger": "#ff4d4d"
}
```

With no `backgroundImage` the two `background` colours make a gradient.
`bag` / `bagDark` colour the procedural case and `traySlot` its handle — all
three are ignored once `tray.image` is set. The swap grid is three columns
wide, dropping to two on a narrow phone or when `tray.capacity` is 4 or less.

## Audio

Paths are relative to `assets/<gameId>/`. All optional.

```json
"audio": {
  "backgroundMusic": "../common/bgmusic5.mp3",
  "takeSound": "take.mp3",
  "passSound": "whoosh.mp3",
  "correctSound": "../common/correct.mp3",
  "wrongSound": "../common/wrong.mp3",
  "lifeLostSound": "ouch.mp3",
  "discardSound": "drop.mp3",
  "musicVolume": 0.4,
  "effectsVolume": 0.5
}
```

## Other keys

| Key | Default | Meaning |
|---|---|---|
| `maxLives` | `3` | hearts in the HUD |
| `cardStyle` | `"card"` | `"card"` or `"bare"` — see above |
| `showCounter` | `true` | the `n / total` pill (the bag's own counter is always on) |
| `tapToTake` | `false` | a plain tap also takes. Off by default: with it on, touching a card to think about it takes it, and the `stall` rule has nothing left to measure |

## Notes

* Bump the `?v=` on the `<script>` and `<link>` tags in `index.html` after
  editing `js/` or `css/` — Apache sends no `Cache-Control` for these files.
* A live round is on `window.game`, for an embedding page or the console.
