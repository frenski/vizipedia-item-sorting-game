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

Each row in that grid shows the item's **icon beside its `short` label** —
the player picked these things up as pictures, so matching the artwork is
faster than reading six labels. A label too long for its cell is cut at a
word and marked with an ellipsis. With artwork in play the grid drops to two
columns below 560px wide rather than 360px, because an icon takes about 38%
of a cell and three columns of them leave the label a column of single
words.

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
| `dwell` | `0.65` | how much of the crossing speed moves out of the middle and into the ends, 0–1 |

### Dwell

An item does not cross at a flat speed. It sweeps in from the edge, slows
through the centre where it can actually be read, then accelerates away:

```
e(p) = p + a·sin(2πp)/2π        e'(p) = 1 + a·cos(2πp)
```

Velocity is `1+a` at the edges and `1−a` at the centre, so `dwell` is
literally how much speed is moved out of the middle. The crossing still takes
exactly `itemDuration` — `e(0)=0`, `e(0.5)=0.5` and `e(1)=1`, so the item
reaches the centre of the screen at precisely half its time and nothing else
about the round's pacing changes. `e'` is continuous, so there is no kick
where the phases meet, and `e' ≥ 0` for any `dwell ≤ 1`, so the item can never
stall outright or drift backwards.

At the default `0.65`, an item spends **54%** of its life in the middle third
of the screen against 33% on a flat scroll — about 60% more reading time for
the same clock. Set `dwell: 0` for the old linear scroll; `1` brings the item
to a dead stop dead centre.

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
| `short` | the shorter wording used in the swap grid (falls back to `content`); the item's `image` is drawn beside it |
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

### Reactions

An item can carry a `reaction`: take it and the conveyor **stops**, someone
pops up with a speech bubble for a couple of seconds, then the flow picks up
where it left off. Items without one never interrupt anything.

```json
{
  "image": "double_text.png",
  "content": "Send a second message on top",
  "short": "Double text",
  "reaction": {
    "text": "Two messages. Now they definitely know.",
    "sprite": { "atlas": "sprite-scupid-love/sprite.json" },
    "side": "right"
  }
}
```

| Key | Default | Meaning |
|---|---|---|
| `text` | — | the line in the bubble; **a reaction without one never plays** |
| `sprite` | — | an atlas or strip, exactly as the intro takes it |
| `image` | — | a still, used when there is no `sprite` |
| `motion` | `float` | `pulse` \| `float` \| `spin` \| `shake` \| `none`, as the intro |
| `bubble` | `top` | the bubble sits `top` or `bottom` of the speaker |
| `duration` | `2.6` | seconds on screen, entrance and exit included |
| `sound` | — | played when it starts |

Shared settings go in a top-level `reactionDefaults` block with the same
keys — a single character for every reaction, say — and each item overrides
what it needs.

**It fires after the card lands in the bag**, not at the flick: the pick is
seen to happen before anyone remarks on it. If the bag was full, the swap is
resolved first and the reaction follows the item actually going in — so it
never talks over a decision the player is still making.

The dim is partial, so the bag and the lane stay legible; this is a beat in
the flow, not a modal. The character rises with a small overshoot and the
bubble arrives a beat later, which reads as them speaking rather than a
label appearing. A tap, Space, Enter or Escape jumps to the exit rather than
cutting, so it never flickers.

The speaker is centred and the bubble stacks over or under them, tail
pointing their way. The bubble is measured first and the speaker takes the
height that is left, so a long line shrinks the speaker rather than pushing
either of them out of the lane.

The bubble's corners come from the theme: `--game-bubble-radius` and
`--game-bubble-step`. With a step above 0 each corner is cut as a staircase
of whole blocks instead of an arc — the canvas equivalent of the stylesheet's
`clip-path`, which canvas has no access to — so a pixel-art skin squares the
bubble off without touching JavaScript. `neon-pixel` uses a 4px step; the
default theme leaves it at 0 and keeps the smooth curve.

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

## Intro (animated prestory)

Optional. With no `intro` block the game opens on the start card exactly as
before; with one, a sequence of scenes plays first — one line of text and a
visual each — and the start card follows when it ends.

```json
"intro": {
  "sceneDuration": 3.2,
  "transition": "fade",
  "autoAdvance": true,
  "skippable": true,
  "skipStartCard": false,
  "music": "audio/intro.mp3",
  "scenes": [
    { "text": "It's 2am. Everyone is asleep.",
      "image": "zzz.png", "motion": "pulse" },

    { "text": "Except you.",
      "sprite": { "url": "red-eyes.png", "frames": 6, "fps": 8 } },

    { "text": "You're up for something.",
      "image": "brain.png", "motion": "float" },

    { "text": "It's your choice — but you get some help.",
      "images": ["a.png", "b.png", "c.png"], "motion": "float" },

    { "text": "Nova is here to help you.",
      "sprite": { "url": "nova.png", "frames": 8, "fps": 10 },
      "transition": "zoom", "duration": 4 }
  ]
}
```

### A scene

| Key | Meaning |
|---|---|
| `text` | the one line, wrapped and centred |
| `image` | a single still icon, from `assets/<gameId>/` |
| `images` | several icons in a row, each drifting on its own phase |
| `sprite` | a sheet played on a loop — either `{ "atlas": "folder/sprite.json" }` or `{ "url", "frames", "fps" }` (see below) |
| `motion` | `pulse` \| `float` \| `spin` \| `shake` \| `none` — continuous, on top of the transition |
| `transition` | `fade` \| `slide` \| `zoom` — how the scene arrives and leaves |
| `duration` | seconds, overriding `sceneDuration` |
| `sound` | played when the scene starts |
| `reveal` | `none` (default) \| `rush` \| `elastic` — how the visuals arrive |

### `reveal: "rush"`

One image at a time, out of the depth and past the camera. Each comes up
**from almost nothing at zero opacity**, accelerates toward the viewer,
**punches through its full size** — filling the frame — holds there, then
keeps growing and fades out as it passes. The next is already rising behind
it, so the handover happens *through* the departing one.

```json
{ "text": "Scupid, Slaten and Scorny are here to help you.",
  "images": ["Scupid.png", "Slaten.png", "Scorny.png"],
  "reveal": "rush",
  "revealDuration": 0.7, "hold": 0.4, "exitDuration": 0.5,
  "revealScale": 0.05, "exitScale": 3.4,
  "motion": "float", "duration": 4.8 }
```

| Key | Default | Meaning |
|---|---|---|
| `revealDuration` | `0.65` | seconds from a speck to full size |
| `hold` | `0.35` | seconds at full size before it leaves |
| `exitDuration` | `0.45` | seconds to blow past and fade out |
| `revealScale` | `0.06` | the size it starts at, as a fraction of full |
| `exitScale` | `3.2` | how far past full size it grows on the way out |
| `bang` | `0.16` | how far it overshoots on arrival |
| `stagger` | `revealDuration + hold` | seconds between each one starting; the default has the next begin exactly as this one starts to leave |
| `holdLast` | `true` | the final image stays instead of flying off and leaving the scene empty |

The approach grows **exponentially, not linearly** — something moving at a
steady speed toward a camera gains apparent size that way, and it is what
makes it read as distance rather than as a scale animation. The travel
reaches full size at 78% of `revealDuration`; the remainder is the overshoot,
so the punch lands *at arrival* where it can be seen rather than while the
image is still small. Both halves meet at exactly 1, so there is no seam.

Images are painted in depth order — the one leaving is nearest the camera,
the one arriving is furthest — so the newcomer is revealed through the
departing one as it fades.

### `reveal: "elastic"`

Each image drops in **oversize and transparent**, fading up as it shrinks,
overshooting its mark and ringing down onto it — a spring landing rather than
a fade. With several images they arrive one after another, `stagger` seconds
apart, so a line-up assembles itself instead of appearing all at once.

```json
{ "text": "Scupid, Slaten and Scorny are here to help you.",
  "images": ["Scupid.png", "Slaten.png", "Scorny.png"],
  "reveal": "elastic", "stagger": 0.3, "revealDuration": 0.8, "revealScale": 2.6,
  "motion": "float", "duration": 5 }
```

At those numbers an image starts at 2.6×, swings down through 0.42×, springs
back through 1.14× and settles by about a third of the way in; the third one
has landed 1.4s into a 5s scene. The fade finishes well before the spring, so
the bounce is watched rather than faded through.

`motion` takes over the moment an image settles, and is **clocked from its own
landing** — so the drift starts from zero instead of snapping to whatever phase
the scene clock had reached, and a staggered row ends up naturally out of step.

Use it for a line-up that assembles itself; use `rush` for one at a time.

Leave `reveal` off and the visuals are simply present, carried in by the scene
`transition` — which is what every other scene does.

Pair it with `transition: "fade"` rather than `"zoom"`: a zoom on the whole
scene fights the per-image spring.

### Sprite sheets

Two ways to describe one.

**An atlas** — the Aseprite / ludo.ai JSON that most exporters emit:

```json
"sprite": { "atlas": "sprite-annoyed-face/sprite.json" }
```

The JSON gives a rect and a duration per frame, so the sheet can be laid out
in **any grid** — a 3×3 of nine frames is no different from a strip — and the
timing comes from the file, including uneven frames. Frames are ordered by
their keys, which exporters zero-pad.

The sheet itself is taken to be **`sprite.png` beside the JSON**. These files
carry a `meta.image` naming the sheet, but exporters fill it with a working
filename that often no longer exists (it is wrong in every atlas here), so it
is ignored. For a sheet with another name, add `"url": "path/to/sheet.png"`
next to `atlas`. An `fps` next to `atlas` overrides the file's own timing,
for retiming art without re-exporting it.

**A plain strip** — no JSON, one row of equal cells:

```json
"sprite": { "url": "eyes.png", "frames": 6, "fps": 8 }
```

`frameWidth` is only needed when the strip has padding or trailing space —
otherwise it is the image width divided by `frames`.

A broken or missing atlas is logged and the scene falls back to its line
alone, rather than taking the intro down.

> Serving note: a sprite folder has to be readable by the web server.
> Folders arriving at `700` (`drwx------`) return 403 — `chmod 755` the
> folder and `644` its files.

### The sequence

| Key | Default | Meaning |
|---|---|---|
| `sceneDuration` | `3.2` | seconds a scene holds |
| `transition` | `"fade"` | default for every scene |
| `motion` | `"float"` | default for every scene |
| `autoAdvance` | `true` | `false` waits for a tap on every scene |
| `skippable` | `true` | shows the Skip button |
| `skipStartCard` | `false` | `true` drops straight into play instead of showing the start card |
| `music` | `null` | looped under the whole intro, stopped when it ends |

A tap, click, Space, Enter or → advances; Escape or Skip ends the whole
sequence. Advancing early jumps to the start of the current scene's exit, so
the transition still plays rather than cutting. The line fades in a beat after
its picture. Progress dots sit at the bottom, and the score, counter and
hearts are hidden for the duration — an empty scoreboard around a title
sequence reads as a bug.

**A scene with no artwork still plays**, with its line centred instead of sat
under a picture. So the text and timing can be written and reviewed before any
assets exist, and the art dropped in afterwards without touching anything else.

The scenes are drawn on the canvas, not in the DOM: sprite frames need exact
control and the motions are two lines of trig each, so it reuses the loader,
the frame loop and the theme's colours and fonts. The trade-off is that the
intro text is canvas text — a theme restyles it through `--game-font-display`
and `--game-bare-text` rather than with a CSS rule.

## Look

### Themes

A game picks a skin the same way the platformer does — a top-level `theme`
naming a file in `css/themes/`:

```json
"theme": "neon-pixel",
"fonts": [
  "https://fonts.googleapis.com/css2?family=DotGothic16&family=Space+Mono:wght@400;700&display=swap"
]
```

That one file restyles **both halves** of the UI:

* the **DOM chrome** — HUD pills, popups, buttons, hearts — as ordinary CSS
  overriding `css/main.css`, which declares everything as tokens
  (`--popup-bg`, `--pill-shadow`, `--btn-bg`, `--life-full`, …);
* the **canvas**, which CSS cannot reach, through `--game-*` custom
  properties on `:root` that the engine reads at boot. Every key of the
  `theme` block below has one: `background` → `--game-background`,
  `cardText` → `--game-card-text`, and so on, plus `--game-font-body`,
  `--game-font-display`, `--game-card-radius` and `--game-pixelated`
  (`1` for nearest-neighbour scaling on pixel art).

`fonts` is a list of stylesheet URLs injected before the first frame — a
skin's webfonts. The theme loads before anything is measured or painted, so
the first card is wrapped against the real face.

**Precedence**, lowest to highest: the built-in defaults, then the theme
stylesheet, then the game's own overrides. So a skin can be retuned per game
without forking it:

```json
"theme": "neon-pixel",
"themeOverrides": { "accent": "#7ee08a" }
```

`theme` is polymorphic for compatibility: a **string** names a stylesheet, an
**object** is inline colour overrides — exactly what this engine took before
skins existed, and still the right thing for a one-off palette. A game using
the object form needs no changes and loads no extra stylesheet.

`neon-pixel` ships with the engine: near-black violet, hot pink, arcade type,
squared-off corners and glows instead of hard drop shadows — built for games
whose artwork is pixel art.

### Colours

```json
"backgroundImage": "background.jpg",
"theme": {
  "background": "#14182b", "backgroundTo": "#2a2145",
  "lane": "rgba(255,255,255,0.06)",
  "card": "#ffffff", "cardText": "#26262e", "cardTaken": "#ffe9b8",
  "accent": "#ffc533",
  "bag": "#e8b45f", "bagDark": "#b5793a",
  "traySlot": "rgba(255,255,255,0.28)",
  "trayText": "#ffffff", "danger": "#ff4d4d",
  "fontBody": "'Nunito', Arial, sans-serif",
  "fontDisplay": "'Nunito', Arial, sans-serif",
  "cardRadius": 20, "bubbleRadius": 16, "bubbleStep": 0,
  "pixelated": false
}
```

With no `backgroundImage` the two `background` colours make a gradient.
`bag` / `bagDark` colour the procedural case and `traySlot` its handle — all
three are ignored once `tray.image` is set. The swap grid is three columns
wide, dropping to two on a narrow phone or when `tray.capacity` is 4 or less.

`bubbleRadius` / `bubbleStep` shape the speech bubble (a step above 0 cuts
its corners into a staircase of blocks). `fontBody` / `fontDisplay` set the
canvas type (captions and toasts; titles
and the bag label). `cardRadius` is the plate's corner radius, `pixelated`
turns off image smoothing. All five theme entries below are also settable
from a skin as `--game-*` properties.

## Audio

Paths are relative to `assets/<gameId>/`. All of it is optional.

```json
"audio": {
  "backgroundMusic": "background-music.mp3",
  "musicVolume": 0.28,
  "effectsVolume": 0.5,
  "voiceVolume": 1.0
}
```

### Effects come from a synth

The short cues — `click`, `take`, `correct`, `pass`, `wrong`, `life`,
`discard`, `full` — are **synthesised, not loaded**, so a game only has to
ship the audio that carries meaning and still gets a pickup blip, a
wrong-answer buzz and a UI click. Square waves, which sit with pixel art
better than sampled clicks would.

Naming a file overrides the synth for that one cue, and the rest stay
procedural:

```json
"audio": { "wrongSound": "ouch.mp3", "takeSound": "pick.mp3" }
```

The keys are `takeSound`, `passSound`, `correctSound`, `wrongSound`,
`lifeLostSound` and `discardSound`. `effectsVolume` sets the level for both
files and synth.

### Voice

Three places take a voice line, all just a `sound` path:

| Where | Key |
|---|---|
| an intro scene | `intro.scenes[n].sound` |
| a reaction | `items[n].reaction.sound` |
| an item appearing | `items[n].sound` |

`voiceVolume` levels these separately from the effects, so a line can sit
above the blips without turning everything up.

**A scene or reaction is never cut off mid-line.** Both measure their audio
at load and hold for at least as long as it runs, plus a breath — the written
`duration` becomes a floor rather than a cap. A 4.2s line in a 3.6s scene
stretches the scene to 4.9s; a shorter line leaves the written timing alone.
So the script can be timed by eye first and the VO dropped in afterwards
without re-timing anything.

### Music

One track plays from the start of the intro, through the start card and into
the round, rather than restarting at kickoff.

`musicVolume` sets its level and `musicDuck` (default `0.3`) is the fraction
it drops to **under a voice line**, lifting back when the line ends. Music
that sits fine on its own still buries dialogue, and turning it down far
enough to never do that leaves it inaudible the rest of the time.

Muting **pauses**; unmuting picks up where it left off.

## Preloading

Everything a round needs is fetched before it starts — item art, tray and
background images, every sprite sheet and its atlas, and every voice line
buffered to `canplaythrough` so a line never stalls on its first play. The
boot cover shows a progress bar and a percentage. Music is the one exception:
a minutes-long track streams, and has no business holding up a loading bar.

### Why an intro with voice starts from a tap

Browsers refuse audio until the player has interacted. A voice line fired on
page load is rejected once and never heard — while looping music, retried on
the first touch, comes through fine. That asymmetry is exactly what a silent
intro over working music looks like.

So when an intro has any `sound` on a scene (or `intro.music`), the preloader
ends with a **Begin** button and the sequence starts from that tap, inside
the gesture, where audio is allowed. A game with no intro voice skips the
gate entirely and opens on the start card as before.

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
