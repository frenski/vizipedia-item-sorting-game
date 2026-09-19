/* ═══════════════════════════════════════════════════════════════════════════
   ItemSorting — main.js

   One item at a time travels across the screen. Flick it up or down to put
   it on your tray; do nothing and it scrolls away. There is no "no" button:
   letting something pass IS the no.

   Game data:  data/${id}/game-config.json
   All assets: assets/${id}/
   ═══════════════════════════════════════════════════════════════════════════ */
'use strict';

/* ── Resolve game ID from the URL hash: index.html#id=abc ── */
const getLocHash = function () {
  if (location.hash.length < 2) return {};
  var hash = {};
  var hashParts = location.hash.substr(1).split('&');
  for (var i = 0; i < hashParts.length; i++) {
    var kv = hashParts[i];
    if      (kv.match(/^(.+?)=(\d+)$/))      hash[RegExp.$1] = parseInt(RegExp.$2);
    else if (kv.match(/^(.+?)=(\d+\.\d+)$/)) hash[RegExp.$1] = parseFloat(RegExp.$2);
    else if (kv.match(/^(.+?)=(.*)$/))       hash[RegExp.$1] = decodeURIComponent(RegExp.$2);
    else                                      hash[RegExp.$1] = RegExp.$2;
  }
  return hash;
};

const locHash    = getLocHash();
const gameId     = (typeof GAME_ID !== 'undefined') ? GAME_ID : locHash.id;
const ASSET_BASE = `assets/${gameId}/`;

/* ── Heart markup, shared with the rest of the game family ── */
const lifeLeftHtml = '<span class="life"><svg xmlns="http://www.w3.org/2000/svg" width="26" height="22" viewBox="0 0 41 35" fill="none"><path d="M40.9661 10.5893V11.8724C40.9429 11.9485 40.9131 12.0245 40.9031 12.1006C40.5486 14.7859 39.6806 17.2927 38.2791 19.611C35.5293 24.1483 31.8815 27.8555 27.6242 30.984C25.961 32.2076 24.2018 33.2758 22.2271 33.9438C21.0543 34.3407 19.8881 34.3738 18.7252 33.9505C18.0096 33.6892 17.2939 33.418 16.6181 33.0708C13.7125 31.576 11.1912 29.552 8.84882 27.2999C6.15526 24.7072 3.77314 21.8664 2.03376 18.5329C0.903991 16.3667 0.112158 14.0749 0.00945215 11.6244C-0.2059 6.4918 3.27949 1.86519 8.32535 0.482836C9.12049 0.264568 9.94546 0.15874 10.7572 0H12.364C12.4932 0.0264566 12.6224 0.0628363 12.7517 0.0793717C15.7136 0.420001 18.2249 1.65354 20.2525 3.84944C20.3188 3.92219 20.4016 3.98503 20.4811 4.05779C22.0847 2.23889 24.0295 1.02189 26.3486 0.423305C27.0842 0.234802 27.8429 0.142202 28.5916 0.00330526H30.1985C30.6424 0.079368 31.0897 0.155432 31.5337 0.231494C36.2151 1.05165 39.9059 4.71259 40.7573 9.36895C40.8302 9.77572 40.8965 10.1825 40.9661 10.5893Z" fill="currentColor"/></svg></span>';
const lifeGoneHtml = '<span class="life gone"><svg xmlns="http://www.w3.org/2000/svg" width="26" height="22" viewBox="0 0 41 35" fill="none"><path d="M40.9661 10.5893V11.8724C40.9429 11.9485 40.9131 12.0245 40.9031 12.1006C40.5486 14.7859 39.6806 17.2927 38.2791 19.611C35.5293 24.1483 31.8815 27.8555 27.6242 30.984C25.961 32.2076 24.2018 33.2758 22.2271 33.9438C21.0543 34.3407 19.8881 34.3738 18.7252 33.9505C18.0096 33.6892 17.2939 33.418 16.6181 33.0708C13.7125 31.576 11.1912 29.552 8.84882 27.2999C6.15526 24.7072 3.77314 21.8664 2.03376 18.5329C0.903986 16.3667 0.112158 14.0749 0.00945217 11.6244C-0.2059 6.4918 3.27948 1.86519 8.32534 0.482836C9.12049 0.264568 9.94546 0.15874 10.7572 0H12.364C12.4932 0.0264566 12.6225 0.0628363 12.7517 0.0793717C15.7136 0.420001 18.2249 1.65354 20.2525 3.84944C20.3188 3.92219 20.4016 3.98503 20.4811 4.05779C22.0847 2.23889 24.0295 1.02189 26.3486 0.423305C27.0842 0.234802 27.8429 0.142202 28.5916 0.00330526H30.1985C30.6424 0.079368 31.0897 0.155432 31.5336 0.231494C36.2151 1.05165 39.9059 4.71259 40.7573 9.36895C40.8302 9.77572 40.8965 10.1825 40.9661 10.5893Z" fill="currentColor"/></svg></span>';

/* ── Boot cover ──────────────────────────────────────────────────────
   index.html paints #boot over everything before any of this runs. It
   comes off once the game is dressed, or on the error screen, which has
   to be readable. The failsafe is there so a stalled asset can never
   leave a player staring at a spinner. */
let _bootHidden = false;
function bootDone() {
  if (_bootHidden) return;
  _bootHidden = true;
  const el = document.getElementById('boot');
  if (!el) return;
  el.classList.add('boot-done');
  setTimeout(() => el.remove(), 400);
}
setTimeout(bootDone, 12000);

/* ── Defaults ────────────────────────────────────────────────────────
   Everything a game-config.json may leave out. A config that sets only
   `title` and `items` is a playable game. */
const DEFAULTS = {
  title: '',
  subTitle: '',
  mode: 'judgement',          // 'judgement' | 'consistency' — a preset for `rules`
  order: 'sequence',          // 'sequence' | 'random'
  duration: 'finite',         // 'finite' | 'infinite'
  itemDuration: 2,            // seconds for one item to cross the screen
  acceleration: 0,            // each item is this fraction faster than the last
  minItemDuration: 0.7,       // floor, so acceleration can't make it unplayable
  /* How much of the crossing speed moves out of the middle and into the
     ends, 0–1. 0 is the old flat scroll; 1 brings the item to a dead stop
     dead centre. The crossing still takes `itemDuration` either way. */
  dwell: 0.65,
  totalItems: null,           // N items per round; null = every item in the list
  gap: 0.25,                  // seconds of empty lane between items
  maxLives: 3,
  showCounter: true,
  tapToTake: false,           // a plain tap counts as a take (off: flick only)
  /* 'card' puts each item on a white plate — right for text games, where the
     plate is what makes the words readable. 'bare' drops the plate and lets
     the artwork travel on its own, much larger: for icon games whose PNGs
     have a transparent background, the plate is just a box around the art. */
  cardStyle: 'card',
  tray: {
    capacity: 6,
    label: null,              // null → the translated "YOUR TRAY"
    image: null
  },
  scoring: {
    take: 0,                  // an item with no `correct` flag and no `points`
    correct: 10,
    wrong: 0,
    missedCorrect: 0,         // subtracted when a `correct: true` item passes
    completionBonus: 0
  },
  rules: {
    /* Straightforward right/wrong games */
    wrongPickCostsLife: null,       // null → set from `mode`
    missedCorrectCostsLife: false,

    /* The consistency game: you are not judged on right answers but on
       whether your own choices hang together. */
    contradiction: { enabled: null, lives: 1 },
    freeze:        { enabled: null, afterItems: 8, lives: 1 },
    stall:         { enabled: null, streak: 3, requireHover: true, lives: 1 }
  },
  theme: {
    background:  '#14182b',
    backgroundTo:'#2a2145',
    lane:        'rgba(255,255,255,0.06)',
    card:        '#ffffff',
    cardText:    '#26262e',
    bareText:    '#ffffff',      // caption colour when there is no plate
    cardTaken:   '#ffe9b8',
    accent:      '#ffc533',
    bag:         '#e8b45f',      // procedural case, lit face…
    bagDark:     '#b5793a',      // …and its shaded base
    traySlot:    'rgba(255,255,255,0.28)',   // the bag's handle
    trayText:    '#ffffff',
    danger:      '#ff4d4d',
    /* Canvas type. A skin points these at its own webfonts, which it loads
       through the config's `fonts` array. */
    fontBody:    "'Nunito', Arial, sans-serif",
    fontDisplay: "'Nunito', Arial, sans-serif",
    cardRadius:  20,
    pixelated:   false    // nearest-neighbour scaling, for pixel-art games
  },
  /* Stylesheet URLs injected before the first frame — webfonts a skin needs */
  fonts: [],
  backgroundImage: null,
  audio: null,
  /* Optional animated prestory shown before the start card. Absent or with
     no scenes, the game opens on the start card exactly as before. */
  intro: null,
  items: []
};

/* Intro defaults, applied per game rather than merged, because `intro` is
   passed through whole (see DEFAULTS) so a scene list survives untouched. */
const INTRO_DEFAULTS = {
  sceneDuration: 3.2,     // seconds a scene holds before advancing
  transition: 'fade',     // fade | slide | zoom
  motion: 'float',        // pulse | float | spin | shake | none
  autoAdvance: true,
  skippable: true,
  skipStartCard: false,   // true = go straight into play when it ends
  music: null,

  /* How a scene's visuals arrive: 'none', 'elastic' or 'rush'. The timing
     knobs each mode uses (stagger, revealDuration, revealScale, hold,
     exitDuration, exitScale, bang) are deliberately NOT defaulted here —
     a default set here would count as "the author asked for it" and leak
     across modes, which is how a rush ended up inheriting the elastic
     line-up's 0.26s stagger. Each mode supplies its own below, and a scene
     or this block can still override any of them. */
  reveal: 'none'
};

/* Deep-merge plain objects, one level of nesting deep — enough for the
   config shape above, and it never mutates the defaults. */
function mergeConfig(base, over) {
  const out = {};
  Object.keys(base).forEach(k => {
    const b = base[k], o = over ? over[k] : undefined;
    if (b && typeof b === 'object' && !Array.isArray(b)) {
      out[k] = Object.assign({}, b, (o && typeof o === 'object' && !Array.isArray(o)) ? o : {});
      /* One more level, for rules.contradiction and friends */
      Object.keys(b).forEach(k2 => {
        const b2 = b[k2], o2 = (o && typeof o === 'object') ? o[k2] : undefined;
        if (b2 && typeof b2 === 'object' && !Array.isArray(b2)) {
          out[k][k2] = Object.assign({}, b2, (o2 && typeof o2 === 'object') ? o2 : {});
        }
      });
    } else {
      out[k] = (o !== undefined) ? o : b;
    }
  });
  /* Keys the defaults don't know about are still worth carrying through */
  if (over) Object.keys(over).forEach(k => { if (!(k in out)) out[k] = over[k]; });
  return out;
}

/* ── Theming ─────────────────────────────────────────────────────────
   A game picks its skin with a top-level "theme": "<name>" in
   game-config.json; css/themes/<name>.css is loaded before the first frame.

   That one file styles BOTH halves of the UI. The DOM chrome — HUD pills,
   popups, buttons — is ordinary CSS overriding css/main.css. The canvas,
   which CSS cannot reach, reads the --game-* custom properties the theme
   declares on :root, so a skin never has to touch JavaScript.

   Precedence, lowest to highest: the built-in DEFAULTS.theme, then the
   theme stylesheet, then a per-game "themeOverrides" block — so one game
   can retune a colour without forking the stylesheet.
   ─────────────────────────────────────────────────────────────────── */
function injectStylesheet(href) {
  return new Promise(resolve => {
    if (document.querySelector(`link[rel="stylesheet"][href="${href}"]`)) return resolve(true);
    const link = document.createElement('link');
    link.rel  = 'stylesheet';
    link.href = href;
    link.onload  = () => resolve(true);
    link.onerror = () => { console.warn(`[theme] stylesheet failed to load: ${href}`); resolve(false); };
    document.head.appendChild(link);
  });
}

/* backgroundTo → --game-background-to */
const themeToken = k => '--game-' + k.replace(/[A-Z]/g, m => '-' + m.toLowerCase());

function readTheme(base, overrides) {
  const cs  = getComputedStyle(document.documentElement);
  const out = Object.assign({}, base);
  Object.keys(base).forEach(k => {
    const raw = cs.getPropertyValue(themeToken(k)).trim();
    if (raw) out[k] = raw;
  });
  /* Two of these are not colours and come back as strings either way */
  const r = parseFloat(out.cardRadius);
  out.cardRadius = isNaN(r) ? 20 : Math.max(0, r);
  out.pixelated  = out.pixelated === true || String(out.pixelated) === '1';
  return Object.assign(out, overrides || {});
}

/* The opaque bounds of an image, as fractions of its width and height.
   Exports are routinely square canvases with the subject floating in a lot
   of transparent padding — sizing, the counter badge, the label and the
   contact shadow should all follow the artwork, not the canvas it was
   exported on. Sampled at low resolution: this decides layout, not pixels. */
function opaqueBounds(img) {
  const FULL = { x0: 0, y0: 0, x1: 1, y1: 1 };
  const S = 96;
  try {
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(img, 0, 0, S, S);
    const d = x.getImageData(0, 0, S, S).data;
    let x0 = S, y0 = S, x1 = -1, y1 = -1;
    for (let py = 0; py < S; py++) {
      for (let px = 0; px < S; px++) {
        if (d[(py * S + px) * 4 + 3] > 8) {
          if (px < x0) x0 = px;
          if (px > x1) x1 = px;
          if (py < y0) y0 = py;
          if (py > y1) y1 = py;
        }
      }
    }
    if (x1 < 0) return FULL;                     // fully transparent
    return { x0: x0 / S, y0: y0 / S, x1: (x1 + 1) / S, y1: (y1 + 1) / S };
  } catch (_) {
    return FULL;                                  // tainted canvas, or no 2d
  }
}

/* How long the bag and its counter react for when something lands. */
const BAG_POP_MS   = 260;
const BADGE_POP_MS = 320;

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const lerp  = (a, b, t)   => a + (b - a) * t;
const easeOut = t => 1 - Math.pow(1 - t, 3);

/* ── Lane easing ─────────────────────────────────────────────────────
   An item used to cross at a flat speed, which spends as long sliding on
   and off the edges as it does in the middle where the player can
   actually read it. This sweeps it in, holds it through the centre, then
   lets it go again.

     e(p) = p + a·sin(2πp)/2π      e'(p) = 1 + a·cos(2πp)

   Velocity is 1+a at the edges and 1−a at the centre, so `a` is literally
   "how much of the speed to move out of the middle and into the ends".
   Three properties earn it over a hand-rolled curve: e(0)=0, e(1)=1 and
   e(0.5)=0.5, so the item still reaches the middle at exactly half its
   time and the total crossing time is unchanged; e' is continuous, so
   there is no visible kick where the phases meet; and e' ≥ 0 for a ≤ 1,
   so it can never stall outright or drift backwards. */
const laneEase = (p, a) => p + a * Math.sin(2 * Math.PI * p) / (2 * Math.PI);

/* Overshoots its target and rings down to it — the spring at the end of a
   thing landing. Used by the intro's `reveal: "elastic"`. */
const easeOutElastic = t => {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const c4 = (2 * Math.PI) / 3;
  return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
};

/* ═══════════════════════════════════════════════════════════════════════════
   The game
   ═══════════════════════════════════════════════════════════════════════════ */
class ItemSortingGame {
  constructor(rawConfig) {
    this.config = mergeConfig(DEFAULTS, rawConfig);
    this.applyModePreset();

    this.canvas = document.getElementById('gameCanvas');
    this.ctx    = this.canvas.getContext('2d');
    /* `theme` is polymorphic: a string names a stylesheet in css/themes/,
       an object is inline colour overrides (what this engine took before
       skins existed). `themeOverrides` carries the overrides when a game
       wants both. Read off the RAW config — mergeConfig folds an object
       theme into the defaults and would lose a string one. */
    const rawTheme = rawConfig && rawConfig.theme;
    this.skin = (typeof rawTheme === 'string') ? rawTheme : null;
    this.themeOverrides = Object.assign({},
      (rawTheme && typeof rawTheme === 'object' && !Array.isArray(rawTheme)) ? rawTheme : {},
      (rawConfig && rawConfig.themeOverrides) || {});

    /* Interim palette so nothing can hit an undefined colour before the
       stylesheet lands; replaced by readTheme() once it has. */
    this.T    = Object.assign({}, DEFAULTS.theme, this.themeOverrides);
    this.bare = this.config.cardStyle === 'bare';
    /* Known before any art loads, and the swap grid's column count depends
       on it — so it is read off the config, not off the image cache. */
    this.hasIcons = this.config.items.some(it => it.image || it.type === 'image');

    /* ── Run state ── */
    this.score      = 0;
    this.lives      = this.config.maxLives;
    this.running    = false;
    this.finished   = false;
    this.queue      = [];       // item objects, in play order
    this.cursor     = 0;        // how far through `queue` we are
    this.resolved   = 0;        // items that have finished, taken or not
    this.spawned    = 0;        // drives acceleration; keeps counting in infinite mode
    this.current    = null;     // the item on the lane right now
    this.gapLeft    = 0;        // ms of empty lane before the next spawn
    this.tray       = [];
    this.flight     = null;     // card animating into the bag
    this.bagPop     = 0;        // bag squash when something lands
    this.badgePop   = 0;        // counter pop, a beat behind it
    this.pending    = null;     // taken while the tray was full — awaiting a swap
    this.toasts     = [];
    this.mistakes   = [];       // what cost the player, for the results screen

    /* ── Consistency bookkeeping ── */
    this.takenPairs  = new Map();  // pairId → the item that was taken
    this.passedPairs = new Map();  // pairId → { item, hadRoom }
    this.stallStreak = 0;
    this.freezeFired = false;

    /* ── Audio ── */
    this.isMuted      = false;
    this.audioLoaded  = false;
    this.bgMusic      = null;
    this.sounds       = {};
    this.itemSounds   = {};

    this.images = {};
    this.lastFrame = 0;

    /* Animated prestory. `introCfg` is the merged settings; `intro` is the
       runtime cursor and is null whenever one is not playing. */
    const rawIntro = this.config.intro;
    this.introCfg = (rawIntro && Array.isArray(rawIntro.scenes) && rawIntro.scenes.length)
      ? Object.assign({}, INTRO_DEFAULTS, rawIntro)
      : null;
    this.intro = null;
    this.introSounds = {};
    this.introAtlases = {};   // scene index → { frames:[{x,y,w,h,d}], total }

    this.setupMetaData();
    this.loadAssets();
  }

  /* `mode` only fills in the rule switches a config did not set itself, so
     a game can pick a preset and still override one rule. */
  applyModePreset() {
    const r = this.config.rules;
    const consistency = this.config.mode === 'consistency';
    if (r.wrongPickCostsLife === null) r.wrongPickCostsLife = !consistency;
    ['contradiction', 'freeze', 'stall'].forEach(k => {
      if (r[k].enabled === null) r[k].enabled = consistency;
    });
  }

  /* ─────────────────────────────────────────────────────────────────────
     Setup
     ───────────────────────────────────────────────────────────────────── */
  setupMetaData() {
    const set = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };
    set('title', this.config.title);
    set('subtitle', this.config.subTitle);
    set('loading', _getUIText('loading'));
    set('title-final-score', _getUIText('finalScore'));
    document.title = this.config.title || 'Item Sorting';

    /* Start-screen rules. The tray line names the real capacity, because a
       game may not use six. */
    const rules = [
      _getUIText('hint_flick'),
      _getUIText('hint_pass'),
      _getUIText('hint_tray', { n: this.config.tray.capacity })
    ];
    if (!('ontouchstart' in window)) rules.push(_getUIText('hint_keys'));
    set('startRules', rules.map(r => `<li>${r}</li>`).join(''));
  }

  async loadAssets() {
    const jobs = [];

    if (this.config.backgroundImage) {
      jobs.push(this.loadImage('background', ASSET_BASE + this.config.backgroundImage));
    }
    if (this.config.tray.image) {
      jobs.push(this.loadImage('tray', ASSET_BASE + this.config.tray.image));
    }
    this.config.items.forEach((item, i) => {
      const src = item.image || (item.type === 'image' ? item.content : null);
      if (src) jobs.push(this.loadImage(`item_${i}`, ASSET_BASE + src));
      if (item.sound) jobs.push(this.loadItemSound(i, ASSET_BASE + item.sound));
    });
    if (this.config.audio) jobs.push(this.loadAudio());

    /* Intro art. A scene may carry one `image`, several `images`, or a
       `sprite` strip — and, until the real assets land, none of them: a
       scene with no art still plays, with its line centred instead. */
    if (this.introCfg) {
      this.introCfg.scenes.forEach((sc, i) => {
        const list = sc.images || (sc.image ? [sc.image] : []);
        list.forEach((src, k) => jobs.push(this.loadImage(`intro_${i}_${k}`, ASSET_BASE + src)));
        if (sc.sprite && sc.sprite.atlas) {
          jobs.push(this.loadAtlas(i, sc.sprite));
        } else if (sc.sprite && sc.sprite.url) {
          jobs.push(this.loadImage(`introSprite_${i}`, ASSET_BASE + sc.sprite.url));
        }
        if (sc.sound) jobs.push(this.loadIntroSound(i, ASSET_BASE + sc.sound));
      });
      if (this.introCfg.music) {
        jobs.push(this.loadIntroSound('music', ASSET_BASE + this.introCfg.music));
      }
    }

    /* The skin, in order: stylesheets first (the theme may pull in its own
       webfonts), then the fonts settle, then the palette is read off :root.
       It runs alongside the artwork rather than before it, but the steps
       inside it are strictly ordered — reading the palette before the
       stylesheet lands would just return css/main.css's defaults, and
       measuring a card before the font arrives wraps it against the
       fallback face. Neither a stalled font nor a missing theme file is
       allowed to hold the start screen. */
    const fontsReady = (document.fonts && document.fonts.ready) || Promise.resolve();
    jobs.push(
      this.loadSkin()
        .then(() => Promise.race([fontsReady, new Promise(r => setTimeout(r, 1500))]))
        .then(() => { this.T = readTheme(DEFAULTS.theme, this.themeOverrides); })
        .catch(() => { this.T = readTheme(DEFAULTS.theme, this.themeOverrides); })
    );

    await Promise.all(jobs);

    this.resize();
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('orientationchange', () => setTimeout(() => this.resize(), 120));
    if (window.visualViewport) window.visualViewport.addEventListener('resize', () => this.resize());

    this.buildQueue();
    this.displayLives();
    this.updateHUD();
    this.setupControls();

    document.getElementById('loading').style.display = 'none';
    document.getElementById('gameContainer').style.display = 'block';
    bootDone();
    this.ready = true;

    if (this.introCfg) {
      this.startIntro();
    } else {
      document.getElementById('gameStart').style.display = 'block';
      /* Draw one frame behind the start popup so the lane and bag are
         already there rather than appearing at the first tap. */
      this.draw();
    }
  }

  /* A sprite sheet described by a JSON atlas (the Aseprite / ludo.ai shape:
     a `frames` map or array of {frame:{x,y,w,h}, duration}). Frames may be
     laid out in any grid — the rects say where each one is, so rows are no
     different from a strip.

     The sheet itself is taken to be `sprite.png` beside the JSON unless the
     scene names a `url`: these files carry a `meta.image` from whatever
     generated them, and in every one here it points at a filename that does
     not exist. Trusting it would break the scene for no benefit. */
  loadAtlas(i, spec) {
    const dir = spec.atlas.replace(/[^/]*$/, '');
    return fetch(ASSET_BASE + spec.atlas)
      .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(json => {
        const raw = json && json.frames;
        if (!raw) throw new Error('no frames in atlas');
        /* Aseprite emits either a keyed map or an array; the keys are
           zero-padded so sorting them keeps the frames in order. */
        const list = Array.isArray(raw) ? raw.slice()
                                        : Object.keys(raw).sort().map(k => raw[k]);
        const frames = list
          .filter(f => f && f.frame)
          .map(f => ({ x: f.frame.x, y: f.frame.y, w: f.frame.w, h: f.frame.h,
                       d: f.duration || 0 }));
        if (!frames.length) throw new Error('atlas has no usable frames');
        this.introAtlases[i] = {
          frames,
          total: frames.reduce((a, f) => a + f.d, 0)
        };
        return this.loadImage(`introSprite_${i}`, ASSET_BASE + (spec.url || dir + 'sprite.png'));
      })
      .catch(e => {
        /* A broken atlas must not take the intro down with it — the scene
           falls back to its line on its own. */
        console.warn(`[intro] atlas failed: ${spec.atlas}`, e);
      });
  }

  loadIntroSound(key, src) {
    return new Promise(resolve => {
      try {
        const a = new Audio(src);
        a.volume = (this.config.audio && this.config.audio.effectsVolume) || 0.6;
        this.introSounds[key] = a;
      } catch (e) { console.warn(`[intro] failed to load sound: ${src}`, e); }
      resolve();
    });
  }

  /* The theme stylesheet plus any webfonts the game declares. */
  loadSkin() {
    const jobs = (this.config.fonts || []).map(injectStylesheet);
    if (this.skin) jobs.push(injectStylesheet(`css/themes/${this.skin}.css`));
    return Promise.all(jobs);
  }

  loadImage(key, src) {
    return new Promise(resolve => {
      const img = new Image();
      img.onload  = () => { this.images[key] = img; resolve(); };
      img.onerror = () => { console.warn(`[assets] failed to load image: ${src}`); resolve(); };
      img.src = src;
    });
  }

  loadItemSound(index, src) {
    return new Promise(resolve => {
      try {
        const a = new Audio(src);
        a.volume = (this.config.audio && this.config.audio.effectsVolume) || 0.5;
        this.itemSounds[index] = a;
      } catch (e) { console.warn(`[assets] failed to load item sound: ${src}`, e); }
      resolve();
    });
  }

  async loadAudio() {
    const a = this.config.audio;
    const vol = a.effectsVolume != null ? a.effectsVolume : 0.5;
    try {
      if (a.backgroundMusic) {
        this.bgMusic = new Audio(ASSET_BASE + a.backgroundMusic);
        this.bgMusic.loop = true;
        this.bgMusic.volume = a.musicVolume != null ? a.musicVolume : 0.3;
      }
      [['takeSound', 'take'], ['passSound', 'pass'], ['correctSound', 'correct'],
       ['wrongSound', 'wrong'], ['lifeLostSound', 'life'], ['discardSound', 'discard']]
        .forEach(([key, name]) => {
          if (!a[key]) return;
          const s = new Audio(ASSET_BASE + a[key]);
          s.volume = vol;
          this.sounds[name] = s;
        });
      this.audioLoaded = true;
    } catch (e) { console.warn('[audio] error loading audio:', e); }
  }

  playSound(name) {
    const s = this.sounds[name];
    if (!s || this.isMuted || !this.audioLoaded) return;
    const clone = s.cloneNode();
    clone.volume = s.volume;
    clone.play().catch(() => {});
  }

  playItemSound(item) {
    const s = this.itemSounds[item.index];
    if (!s || this.isMuted) return;
    const clone = s.cloneNode();
    clone.volume = s.volume;
    clone.play().catch(() => {});
  }

  playMusic() {
    if (this.bgMusic && !this.isMuted) this.bgMusic.play().catch(() => {});
  }
  stopMusic() {
    if (this.bgMusic) { this.bgMusic.pause(); this.bgMusic.currentTime = 0; }
  }
  toggleMute() {
    this.isMuted = !this.isMuted;
    const btn = document.getElementById('muteBtn');
    if (btn) btn.textContent = this.isMuted ? '🔇' : '🔊';
    if (this.isMuted) this.stopMusic();
    else if (this.running) this.playMusic();
  }

  /* ─────────────────────────────────────────────────────────────────────
     Layout

     Drawing happens in CSS pixels: the buffer is allocated at CSS × DPR and
     the base transform scales it, so text is sharp on retina without every
     size in the file being multiplied by hand.
     ───────────────────────────────────────────────────────────────────── */
  resize() {
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    /* Mid-teardown or before the pane has a size: keep the last good layout
       rather than recomputing one from zeroes — but only once there IS one.
       Bailing on the very first call left W/H undefined, and every later
       draw fed `undefined` straight into createLinearGradient. */
    const rawW = window.innerWidth, rawH = window.innerHeight;
    if ((!rawW || !rawH) && this.L) return;
    const w = Math.max(320, rawW || 320);
    const h = Math.max(240, rawH || 240);

    this.canvas.width  = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.canvas.style.width  = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.W = w;
    this.H = h;

    /* System bars. A host WebView can pass its real insets in the hash
       (#safeTop=44&safeBottom=24); in a plain browser the page already sits
       below the browser chrome and both are 0. */
    const safeTop    = Number.isFinite(locHash.safeTop)    ? locHash.safeTop    : 0;
    const safeBottom = Number.isFinite(locHash.safeBottom) ? locHash.safeBottom : 0;
    document.documentElement.style.setProperty('--safe-top', safeTop + 'px');
    document.documentElement.style.setProperty('--safe-bottom', safeBottom + 'px');

    this.safeBottom = safeBottom;
    const hudH = 64 + safeTop;              // clears the score / lives pills
    const pad  = Math.max(12, w * 0.025);

    /* The tray is one object — a bag, a case, a wardrobe — not a shelf of
       slots. What is inside it is only ever spelled out when the player has
       to choose something to throw off. */
    const img = this.images.tray;
    if (img && !this.trayBounds) this.trayBounds = opaqueBounds(img);
    const b = (img && this.trayBounds) || { x0: 0, y0: 0, x1: 1, y1: 1 };
    const fx = b.x1 - b.x0, fy = b.y1 - b.y0;    // visible fraction of the file

    /* Everything is sized against the VISIBLE art, so a padded export and a
       tightly-cropped one come out the same size on screen. */
    const ratio = img ? (fy * img.naturalHeight) / (fx * img.naturalWidth) : 0.82;

    /* A landscape phone has barely any height to share. The bag takes a
       smaller cut there so the lane keeps enough room for a card to carry
       its picture — on a picture game the art is the content, and dropping
       it is a worse trade than a smaller bag. */
    const bagShare = h < 480 ? 0.22 : 0.30;
    const visW = clamp(Math.min(w * 0.30, h * bagShare / ratio), 96, 240);
    const visH = visW * ratio;
    const labelH = 22;

    /* The rect the whole file is drawn into, chosen so the visible art lands
       centred horizontally with its feet on the bottom margin. */
    const fullW = visW / fx, fullH = visH / fy;
    const baseline = h - safeBottom - pad - labelH;

    this.L = { pad, hudH, labelH };
    this.L.bag = {
      w: fullW, h: fullH,
      x: (w - visW) / 2 - b.x0 * fullW,
      y: baseline - b.y1 * fullH
    };
    /* What the player actually sees — the badge, the label, the shadow and
       the lane's lower edge all hang off this, not off the file's box. */
    this.L.bagVis = {
      x: (w - visW) / 2, y: baseline - visH,
      w: visW, h: visH
    };

    this.L.laneTop = hudH + 6;
    /* Never let the band invert. A pane that is briefly a few pixels tall —
       a reopening preview, a phone mid-rotation — would otherwise hand
       measureCard a negative height and it would drop every card's art. */
    this.L.laneBottom = Math.max(this.L.laneTop + 120, this.L.bagVis.y - 14);
    this.L.laneY      = this.L.laneTop + (this.L.laneBottom - this.L.laneTop) * 0.5;

    /* Card size. Wide enough to read a sentence, never more than half the
       screen or two would never be legible side by side on a tablet. With no
       plate the artwork wants the extra width. */
    this.L.cardW = this.bare ? clamp(w * 0.58, 230, 460)
                             : clamp(w * 0.46, 210, 380);
    this.L.takeDist = clamp(h * 0.09, 44, 110);   // flick distance that commits

    if (this.current) this.measureCard(this.current);
    if (this.pending) this.measureCard(this.pending);
    this.computeSwapLayout();

    /* Re-allocating the buffer wipes it. While the frame loop is idle —
       behind the start card, on the results screen — nothing else would
       ever paint it again. */
    if (this.ready && !this.loopRunning) this.draw();
  }

  /* ─────────────────────────────────────────────────────────────────────
     The queue

     `totalItems` caps the round, but a contradiction pair is worthless with
     only one half present — so the cap is applied to whole pair groups.
     ───────────────────────────────────────────────────────────────────── */
  buildQueue() {
    const items = this.config.items.map((raw, index) => Object.assign({ index }, raw));
    if (!items.length) { this.queue = []; return; }

    /* Group by pairId; an item with no pairId is a group of one. */
    const groups = [];
    const byPair = new Map();
    items.forEach(it => {
      if (it.pairId == null) { groups.push([it]); return; }
      if (!byPair.has(it.pairId)) { const g = []; byPair.set(it.pairId, g); groups.push(g); }
      byPair.get(it.pairId).push(it);
    });

    const random = this.config.order === 'random';
    let pool = random ? this.shuffle(groups.slice()) : groups.slice();

    /* Trim to N, counting items rather than groups. */
    const n = this.config.totalItems;
    if (n && n > 0) {
      const kept = [];
      let count = 0;
      for (const g of pool) {
        if (count + g.length > n) continue;   // skip a pair that doesn't fit whole
        kept.push(g);
        count += g.length;
        if (count >= n) break;
      }
      pool = kept.length ? kept : pool.slice(0, 1);
    }

    let queue = [].concat.apply([], pool);
    if (random) queue = this.spaceOutPairs(this.shuffle(queue));

    this.queue = queue;
  }

  shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /* "Comes back later" only lands if the two halves aren't neighbours. Walk
     the list and push any twin that is too close towards the back. */
  spaceOutPairs(queue) {
    const n = queue.length;
    const MIN_GAP = Math.max(3, Math.floor(n / 8));

    const positions = () => {
      const m = new Map();
      queue.forEach((it, i) => {
        if (it.pairId == null) return;
        if (!m.has(it.pairId)) m.set(it.pairId, []);
        m.get(it.pairId).push(i);
      });
      return m;
    };

    /* Re-homing one twin can land it next to another pair's half, so this
       runs in passes until nothing is too close. Bounded, because a short
       list with many pairs may simply have no room — and a round that stays
       a little clumped is still playable. */
    for (let pass = 0; pass < 12; pass++) {
      let violations = 0;
      positions().forEach(p => {
        if (p.length < 2) return;
        const [first, second] = p;
        if (second - first >= MIN_GAP) return;
        violations++;
        const far = [];
        for (let i = 0; i < n; i++) {
          if (i !== second && Math.abs(i - first) >= MIN_GAP) far.push(i);
        }
        if (!far.length) return;
        const t = far[Math.floor(Math.random() * far.length)];
        [queue[second], queue[t]] = [queue[t], queue[second]];
      });
      if (!violations) break;
    }
    return queue;
  }

  /* ═══════════════════════════════════════════════════════════════════
     Animated intro

     A list of scenes, each one line of text and a visual: a still icon
     given a bit of life (pulse, float, spin, shake), several icons
     drifting together, or a sprite strip played back at a frame rate.
     Scenes cross-fade — or slide, or zoom — and the whole thing is
     skippable.

     Drawn on the canvas rather than in the DOM: sprite frames need exact
     control, the motions are two lines of trig each, and it reuses the
     loader, the frame loop, wrapText and the theme's colours and fonts
     that are already here. The cost is that the text is canvas text, so
     a theme restyles it through THEME rather than with a CSS rule.
     ═══════════════════════════════════════════════════════════════════ */
  startIntro() {
    document.getElementById('gameStart').style.display = 'none';
    const skip = document.getElementById('introSkip');
    if (skip) {
      skip.textContent = _getUIText('btn_skip');
      skip.style.display = this.introCfg.skippable ? 'block' : 'none';
    }

    /* Score, progress and lives mean nothing yet — a title sequence should
       not be framed by an empty scoreboard. */
    document.body.classList.add('intro-playing');

    this.intro = { i: 0, t: 0, scenes: this.introCfg.scenes };
    this.playIntroSound(0);

    const music = this.introSounds.music;
    if (music && !this.isMuted) {
      music.loop = true;
      music.play().catch(() => {});
    }

    this.lastFrame = performance.now();
    if (!this.loopRunning) { this.loopRunning = true; this.loop(); }
  }

  /* Per-scene override, else the intro-wide setting. */
  sceneOpt(key) {
    const sc = this.intro.scenes[this.intro.i] || {};
    return (sc[key] !== undefined) ? sc[key] : this.introCfg[key];
  }

  sceneDuration() {
    const sc = this.intro.scenes[this.intro.i] || {};
    return ((sc.duration || this.introCfg.sceneDuration) || 3.2) * 1000;
  }

  /* Entry and exit lengths, capped so a very short scene still shows
     something solid between them rather than only transitions. */
  sceneFades() {
    const dur = this.sceneDuration();
    return { in: Math.min(450, dur * 0.3), out: Math.min(350, dur * 0.25) };
  }

  playIntroSound(i) {
    const s = this.introSounds[i];
    if (!s || this.isMuted) return;
    const clone = s.cloneNode();
    clone.volume = s.volume;
    clone.play().catch(() => {});
  }

  /* A tap does not cut straight to the next scene — it jumps to the start
     of this one's exit, so the transition still plays and the sequence
     never flickers. */
  advanceIntro() {
    const I = this.intro;
    if (!I) return;
    const dur = this.sceneDuration(), out = this.sceneFades().out;
    if (I.t < dur - out) { I.t = dur - out; return; }
    this.nextScene();
  }

  nextScene() {
    const I = this.intro;
    if (!I) return;
    if (I.i >= I.scenes.length - 1) { this.endIntro(); return; }
    I.i++;
    I.t = 0;
    this.playIntroSound(I.i);
  }

  endIntro() {
    if (!this.intro) return;
    this.intro = null;
    document.body.classList.remove('intro-playing');
    const skip = document.getElementById('introSkip');
    if (skip) skip.style.display = 'none';

    const music = this.introSounds.music;
    if (music) { music.pause(); music.currentTime = 0; }

    if (this.introCfg.skipStartCard) this.startGame();
    else document.getElementById('gameStart').style.display = 'block';
  }

  updateIntro(dt) {
    const I = this.intro;
    I.t += dt;
    if (this.introCfg.autoAdvance === false) return;
    if (I.t >= this.sceneDuration()) this.nextScene();
  }

  /* One scene: its visual, its line, and the progress dots. */
  drawIntro() {
    const ctx = this.ctx, T = this.T, I = this.intro;
    const sc = I.scenes[I.i] || {};
    const dur = this.sceneDuration();
    const f = this.sceneFades();

    /* Scene-wide alpha. With autoAdvance off there is no exit phase to
       fade through — the scene simply waits for the player. */
    let a = 1;
    if (I.t < f.in) a = I.t / f.in;
    else if (this.introCfg.autoAdvance !== false && I.t > dur - f.out) {
      a = (dur - I.t) / f.out;
    }
    a = clamp(a, 0, 1);
    const eased = easeOut(a);

    /* The transition is a transform on the whole scene; `dir` is +1 while
       it is arriving and −1 while it leaves, so slide and zoom move the
       right way at each end instead of bouncing back. */
    const leaving = I.t > dur - f.out;
    const dir = leaving ? -1 : 1;
    const trans = this.sceneOpt('transition') || 'fade';

    ctx.save();
    ctx.globalAlpha = eased;
    ctx.translate(this.W / 2, 0);
    if (trans === 'slide') ctx.translate(0, dir * (1 - eased) * 34);
    if (trans === 'zoom')  ctx.scale(lerp(0.9, 1, eased), lerp(0.9, 1, eased));

    const hasArt = this.introHasArt(I.i, sc);
    const visualY = hasArt ? this.H * 0.40 : 0;
    const textY   = hasArt ? this.H * 0.68 : this.H * 0.5;

    if (hasArt) this.drawIntroVisual(sc, I.i, visualY, I.t);

    /* The line lands a beat after the picture. */
    const textIn = clamp((I.t - 170) / f.in, 0, 1);
    ctx.save();
    ctx.globalAlpha = eased * (leaving ? 1 : easeOut(textIn));
    this.drawIntroText(sc.text || '', textY);
    ctx.restore();

    ctx.restore();

    this.drawIntroDots();
  }

  introHasArt(i, sc) {
    if (sc.sprite && this.images[`introSprite_${i}`]) return true;
    return !!this.images[`intro_${i}_0`];
  }

  /* Continuous motion, independent of the entry transition. `phase` lets a
     row of icons bob out of step with each other. */
  applyMotion(motion, t, phase) {
    const ctx = this.ctx;
    const p = phase || 0;
    switch (motion) {
      case 'pulse': {
        const s = 1 + 0.07 * Math.sin(t / 360 + p);
        ctx.scale(s, s);
        break;
      }
      case 'float': ctx.translate(0, Math.sin(t / 620 + p) * 9); break;
      case 'spin':  ctx.rotate(t / 1400 + p); break;
      case 'shake': ctx.translate(Math.sin(t / 55 + p) * 3, 0); break;
      default: break;
    }
  }

  drawIntroVisual(sc, i, cy, t) {
    const ctx = this.ctx;
    const motion = this.sceneOpt('motion') || 'none';
    const rush = (this.sceneOpt('reveal') || 'none') === 'rush';

    /* A rushing image is meant to fill the frame at full size, so it gets a
       much larger base than one sat quietly in a row — but kept clear of the
       caption underneath, including the overshoot at the bang. */
    const size = rush
      ? clamp(Math.min(this.W * 0.72, this.H * 0.48), 140, 560)
      : clamp(Math.min(this.W * 0.42, this.H * 0.34), 90, 300);

    const sprite = sc.sprite && this.images[`introSprite_${i}`];
    if (sprite) {
      const r = this.revealAt(0, t, 1);
      if (!r) return;
      ctx.save();
      ctx.globalAlpha *= r.alpha;
      ctx.translate(0, cy);
      if (r.settled) this.applyMotion(motion, r.motionT, 0);
      ctx.scale(r.scale, r.scale);
      this.drawSpriteFrame(sprite, sc.sprite, 0, 0, size, t, this.introAtlases[i]);
      ctx.restore();
      return;
    }

    /* One icon, or a row of them drifting on their own phases. */
    const imgs = [];
    for (let k = 0; ; k++) {
      const img = this.images[`intro_${i}_${k}`];
      if (!img) break;
      imgs.push(img);
    }
    if (!imgs.length) return;

    /* A rush stacks them in one place, one at a time; anything else lays
       them out in a row. */
    const each = (rush || imgs.length === 1)
      ? size
      : Math.min(size * 0.72, (this.W - 60) / imgs.length - 14);
    const step = rush ? 0 : each + 14;
    const startX = rush ? 0 : -((imgs.length - 1) * step) / 2;

    /* Depth order. In a rush the one leaving is nearest the camera and the
       one arriving is furthest away, so the new one has to be painted first
       and revealed *through* the departing one as it fades. */
    const order = imgs.map((_, k) => k);
    if (rush) order.reverse();

    order.forEach(k => {
      const img = imgs[k];
      const r = this.revealAt(k, t, imgs.length);
      if (!r) return;                      // not on screen: too early, or gone
      ctx.save();
      ctx.globalAlpha *= r.alpha;
      ctx.translate(startX + k * step, cy);
      /* Motion only once it has landed, and clocked from the landing, so
         the drift starts from zero instead of snapping to whatever phase
         the scene clock happened to be at. */
      if (r.settled) this.applyMotion(motion, r.motionT, k * 1.1);
      ctx.scale(r.scale, r.scale);
      const ratio = img.naturalWidth / img.naturalHeight;
      const h = each, w = h * ratio;
      ctx.drawImage(img, -w / 2, -h / 2, w, h);
      ctx.restore();
    });
  }

  /* Where image `k` is in its entrance at scene-time `t`.
     Returns null when it is not on screen at all — before its turn, or once
     it has gone past. Otherwise a scale, an alpha, and a clock that starts
     at zero the moment it settles. With reveal 'none' it is simply present
     from the first frame, which is the old behaviour. */
  revealAt(k, t, count) {
    const mode = this.sceneOpt('reveal') || 'none';
    if (mode === 'none') return { scale: 1, alpha: 1, settled: true, motionT: t };
    if (mode === 'rush') return this.rushAt(k, t, count || 1);

    const stagger = (this.sceneOpt('stagger')        ?? 0.26) * 1000;
    const dur     = Math.max(1, (this.sceneOpt('revealDuration') ?? 0.75) * 1000);
    const from    = this.sceneOpt('revealScale')     ?? 2.4;

    const start = k * stagger;
    const p = (t - start) / dur;
    if (p <= 0) return null;
    if (p >= 1) return { scale: 1, alpha: 1, settled: true, motionT: t - start - dur };

    /* Shrinking onto its mark, overshooting, ringing down. The fade is done
       well before the spring so the bounce is seen, not faded through. */
    return {
      scale: lerp(from, 1, easeOutElastic(p)),
      alpha: easeOut(clamp(p / 0.35, 0, 1)),
      settled: false,
      motionT: 0
    };
  }

  /* reveal: "rush" — one at a time, out of the depth and past the camera.
     Each image comes up from almost nothing at zero opacity, accelerates
     toward the viewer, punches through its full size, holds, then keeps
     growing and fades out as it passes. The next one is already rising
     behind it, so the handover happens through the departing one.

     The approach is exponential rather than linear: something travelling at
     a steady speed toward a camera grows in apparent size that way, and it
     is what makes it read as distance rather than as a scale animation. */
  rushAt(k, t, count) {
    const IN   = Math.max(1, (this.sceneOpt('revealDuration') ?? 0.65) * 1000);
    const HOLD = Math.max(0, (this.sceneOpt('hold')           ?? 0.35) * 1000);
    const OUT  = Math.max(1, (this.sceneOpt('exitDuration')   ?? 0.45) * 1000);
    /* By default the next one starts exactly as this one begins to leave. */
    const st = this.sceneOpt('stagger');
    const stagger = (st != null) ? st * 1000 : IN + HOLD;

    const from  = clamp(this.sceneOpt('revealScale') ?? 0.06, 0.001, 0.9);
    const exitS = this.sceneOpt('exitScale')         ?? 3.2;
    /* The last one is the payoff — it stays rather than flying off and
       leaving the line empty for the rest of the scene. */
    const holdLast = this.sceneOpt('holdLast') !== false;
    const isLast = k === count - 1;

    const t0 = t - k * stagger;
    if (t0 <= 0) return null;

    if (t0 < IN) {
      const p = t0 / IN;
      /* Travel, then bang. The approach reaches full size at KNEE rather
         than at the very end, and the rest of the time is the overshoot —
         otherwise the punch lands while the image is still small and is not
         seen at all. Both halves meet at exactly 1, so there is no seam. */
      const KNEE = 0.78;
      const amt = this.sceneOpt('bang') ?? 0.16;
      const scale = (p <= KNEE)
        ? from * Math.pow(1 / from, p / KNEE)
        : 1 + amt * Math.sin(Math.PI * (p - KNEE) / (1 - KNEE));
      return { scale, alpha: clamp(p / 0.55, 0, 1), settled: false, motionT: 0 };
    }

    if (t0 < IN + HOLD || (isLast && holdLast)) {
      return { scale: 1, alpha: 1, settled: true, motionT: t0 - IN };
    }

    const q = (t0 - IN - HOLD) / OUT;
    if (q >= 1) return null;                 // gone past
    const e = q * q;                         // accelerating away
    return { scale: lerp(1, exitS, e), alpha: 1 - e, settled: false, motionT: 0 };
  }

  /* One frame of a sprite: from an atlas when the scene has one, otherwise
     a horizontal strip of `frames` equal cells played at `fps`. */
  drawSpriteFrame(img, spec, x, y, h, t, atlas) {
    if (atlas && atlas.frames.length) {
      const f = this.atlasFrameAt(atlas, spec, t);
      const w = h * (f.w / f.h);
      this.ctx.drawImage(img, f.x, f.y, f.w, f.h, x - w / 2, y - h / 2, w, h);
      return;
    }
    const frames = Math.max(1, spec.frames || 1);
    const fw = spec.frameWidth || (img.naturalWidth / frames);
    const fh = img.naturalHeight;
    const fps = spec.fps || 8;
    const idx = Math.floor(t / 1000 * fps) % frames;
    const w = h * (fw / fh);
    this.ctx.drawImage(img, idx * fw, 0, fw, fh, x - w / 2, y - h / 2, w, h);
  }

  /* The atlas carries a duration per frame, so timing comes from the file
     and uneven frames play correctly. An explicit `fps` on the scene
     overrides it, for retiming art without re-exporting it. */
  atlasFrameAt(atlas, spec, t) {
    const frames = atlas.frames;
    if (spec.fps) {
      return frames[Math.floor(t / 1000 * spec.fps) % frames.length];
    }
    if (!atlas.total) return frames[Math.floor(t / 125) % frames.length];
    let u = t % atlas.total;
    for (let k = 0; k < frames.length; k++) {
      u -= frames[k].d;
      if (u < 0) return frames[k];
    }
    return frames[frames.length - 1];
  }

  drawIntroText(text, y) {
    if (!text) return;
    const ctx = this.ctx, T = this.T;
    const fs = clamp(this.W * 0.052, 18, 34);
    ctx.font = `800 ${fs}px ${T.fontDisplay}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = T.bareText || '#fff';
    ctx.shadowColor = 'rgba(0,0,0,0.85)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 2;

    const lines = this.wrapText(text, Math.min(this.W - 56, 760));
    const lh = fs * 1.32;
    const top = y - ((lines.length - 1) * lh) / 2;
    lines.forEach((line, k) => ctx.fillText(line, 0, top + k * lh));
  }

  drawIntroDots() {
    const ctx = this.ctx, T = this.T, I = this.intro;
    const n = I.scenes.length;
    if (n < 2) return;
    const s = 7, gap = 9;
    const y = this.H - this.safeBottom - 30;
    const startX = this.W / 2 - ((n - 1) * (s + gap)) / 2;
    for (let k = 0; k < n; k++) {
      ctx.globalAlpha = k === I.i ? 1 : 0.32;
      ctx.fillStyle = k === I.i ? T.accent : '#ffffff';
      ctx.beginPath();
      ctx.roundRect(startX + k * (s + gap) - s / 2, y - s / 2, s, s, 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  /* ─────────────────────────────────────────────────────────────────────
     Round flow
     ───────────────────────────────────────────────────────────────────── */
  startGame() {
    document.getElementById('gameStart').style.display = 'none';
    document.getElementById('gameOver').style.display = 'none';
    this.running  = true;
    this.finished = false;
    this.lastFrame = performance.now();
    this.playMusic();
    this.gapLeft = 250;
    /* Only ever one rAF chain: restarting must not stack a second loop on
       top of the first, which would run the clock at double speed. */
    if (!this.loopRunning) { this.loopRunning = true; this.loop(); }
  }

  restart() {
    this.score = 0;
    this.lives = this.config.maxLives;
    this.cursor = 0;
    this.resolved = 0;
    this.spawned = 0;
    this.current = null;
    this.flight = null;
    this.pending = null;
    this.bagPop = 0;
    this.badgePop = 0;
    this.tray = [];
    this.toasts = [];
    this.mistakes = [];
    this.takenPairs.clear();
    this.passedPairs.clear();
    this.stallStreak = 0;
    this.freezeFired = false;
    this.buildQueue();
    this.displayLives();
    this.updateHUD();
    this.startGame();
  }

  /* Seconds the current item gets. Acceleration compounds over every item
     spawned in the session, so an infinite round keeps tightening. */
  currentItemDuration() {
    const c = this.config;
    const d = c.itemDuration * Math.pow(1 - clamp(c.acceleration, 0, 0.5), this.spawned);
    return Math.max(c.minItemDuration, d) * 1000;
  }

  spawnNext() {
    if (this.cursor >= this.queue.length) {
      if (this.config.duration === 'infinite') {
        /* New lap. Pair memory resets with it: a twin from the previous lap
           is not a contradiction, the player has already been judged on it. */
        this.cursor = 0;
        this.takenPairs.clear();
        this.passedPairs.clear();
        if (this.config.order === 'random') this.queue = this.spaceOutPairs(this.shuffle(this.queue));
      } else {
        this.endGame(true);
        return;
      }
    }

    const item = this.queue[this.cursor++];
    const dur  = this.currentItemDuration();
    this.spawned++;

    this.current = {
      item,
      t: 0,
      duration: dur,
      dy: 0,              // how far the finger has dragged it off the lane
      grabbed: false,
      grabY: 0,
      lastY: 0,
      vy: 0,
      hoverMs: 0,
      hovered: false,
      resolved: false
    };
    this.measureCard(this.current);
    this.playItemSound(item);
    this.updateHUD();
  }

  /* ─────────────────────────────────────────────────────────────────────
     Taking, passing, and the rules that cost a life
     ───────────────────────────────────────────────────────────────────── */
  pointsForTake(item) {
    if (item.points != null) return item.points;
    if (item.correct === true)  return this.config.scoring.correct;
    if (item.correct === false) return this.config.scoring.wrong;
    return this.config.scoring.take;
  }

  takeCurrent() {
    const c = this.current;
    if (!c || c.resolved || !this.running || this.pending) return;
    c.resolved = true;

    const item = c.item;
    /* Reaching for something counts as engagement whatever happens next,
       so the hesitation streak breaks here and not at the landing. */
    this.stallStreak = 0;

    if (this.tray.length >= this.config.tray.capacity) {
      /* Nothing is decided yet: the conveyor stops and the player picks
         what to throw off — or throws this one away instead. */
      this.pending = { item, x: this.W / 2, y: this.L.laneY, t: 0,
                       fromX: this.cardX(c), fromY: this.L.laneY + c.dy };
      this.measureCard(this.pending);
      this.computeSwapLayout();
      this.pending.y = this.SW.cardY;
      this.current = null;
      this.updateHUD();
      return;
    }

    this.current = null;
    this.commitTake(item, this.tray.length, this.cardX(c), this.L.laneY + c.dy, c.h, c.imgH);
    this.afterResolve();
  }

  /* An item actually lands on the tray. Scoring, the pair record and the
     wrong-pick penalty all happen here rather than at the flick, so a card
     the player reached for and then threw away never counts as a yes. */
  commitTake(item, slot, fromX, fromY, fromH, fromImgH) {
    if (item.pairId != null) this.takenPairs.set(item.pairId, item);
    this.tray[slot] = item;

    this.score = Math.max(0, this.score + this.pointsForTake(item));

    if (item.correct === false && this.config.rules.wrongPickCostsLife) {
      this.playSound('wrong');
      this.loseLife(_getUIText('toast_wrong'), item.label || item.content);
    } else {
      this.playSound(item.correct === true ? 'correct' : 'take');
    }

    /* Everything the player keeps flies into the bag, whether it came off
       the lane or out of a swap. The bag reacts when it lands, not when the
       flick happens, so the two read as one movement. */
    /* Bare cards fly the artwork, which sits above the caption rather than
       at the card's centre — start it from where the icon actually is, or it
       visibly jumps on the first frame. */
    const startY = (this.bare && fromImgH) ? fromY - (fromH || 0) / 2 + fromImgH / 2
                                           : fromY;
    this.flight = {
      item, t: 0, dur: 300,
      fromX, fromY: startY, w: this.L.cardW, h: fromH || 80, imgH: fromImgH || 0
    };
  }

  /* The item left the screen untouched. */
  passCurrent() {
    const c = this.current;
    if (!c || c.resolved) return;
    c.resolved = true;

    const item = c.item;
    const hadRoom = this.tray.length < this.config.tray.capacity;
    if (item.pairId != null) this.passedPairs.set(item.pairId, { item, hadRoom });

    if (item.correct === true) {
      this.score = Math.max(0, this.score + this.config.scoring.missedCorrect);
      if (this.config.rules.missedCorrectCostsLife) {
        this.loseLife(_getUIText('toast_missed'), item.label || item.content);
      }
    }

    /* Running out the clock only counts against the player when they
       actually engaged with the item — a card they never touched is a clean,
       deliberate no. */
    const stall = this.config.rules.stall;
    if (stall.enabled) {
      if (!stall.requireHover || c.hovered) {
        this.stallStreak++;
        if (this.stallStreak >= stall.streak) {
          this.loseLife(_getUIText('toast_stall', { n: stall.streak }), null, stall.lives);
          this.stallStreak = 0;
        }
      } else {
        this.stallStreak = 0;
      }
    }

    this.playSound('pass');
    this.current = null;
    this.afterResolve();
  }

  /* Shared tail of take and pass: the rules that look at the round as a
     whole rather than at one item. */
  afterResolve() {
    this.resolved++;
    this.checkContradiction();
    this.checkFreeze();
    this.updateHUD();
    if (this.lives <= 0) { this.endGame(false); return; }
    this.gapLeft = this.config.gap * 1000;
  }

  /* One half taken, the other let go while there was still room on the
     tray. Evaluated whichever half resolved second, so the order the two
     wordings happen to appear in does not matter. */
  checkContradiction() {
    const rule = this.config.rules.contradiction;
    if (!rule.enabled) return;
    this.takenPairs.forEach((takenItem, pairId) => {
      const passed = this.passedPairs.get(pairId);
      if (!passed || passed.counted) return;
      passed.counted = true;
      if (!passed.hadRoom) return;      // forced by a full tray — a fair choice
      this.loseLife(
        _getUIText('toast_contradiction', {
          a: takenItem.label || takenItem.content,
          b: passed.item.label || passed.item.content
        }),
        null, rule.lives
      );
    });
  }

  /* Freezing: nothing at all on the tray once N items have gone by. */
  checkFreeze() {
    const rule = this.config.rules.freeze;
    if (!rule.enabled || this.freezeFired) return;
    if (this.resolved < rule.afterItems) return;
    this.freezeFired = true;
    if (this.tray.length === 0) {
      this.loseLife(_getUIText('toast_freeze', { n: rule.afterItems }), null, rule.lives);
    }
  }

  loseLife(reason, subject, count) {
    const n = count || 1;
    this.lives = Math.max(0, this.lives - n);
    this.displayLives();
    this.playSound('life');
    this.toast(reason, subject);
    this.mistakes.push({ reason, subject });
    if (this.lives <= 0 && this.running) this.endGame(false);
  }

  toast(text, subject) {
    this.toasts.push({ text, subject, t: 0, life: 3000 });
    if (this.toasts.length > 3) this.toasts.shift();
  }

  /* ── Swapping something off a full tray ── */
  resolvePending(slotIndex) {
    if (!this.pending) return;
    const p = this.pending, item = p.item;
    this.pending = null;

    if (slotIndex >= 0 && slotIndex < this.tray.length) {
      this.playSound('discard');
      this.commitTake(item, slotIndex, p.x, p.y, p.h, p.imgH);
    } else {
      /* The player tapped the new card: it goes, the tray is untouched.
         The tray was full, so this can never be held against them as a
         contradiction — that is the whole point of the "if the tray was
         full it doesn't count" clause. */
      if (item.pairId != null) this.passedPairs.set(item.pairId, { item, hadRoom: false });
      this.playSound('pass');
    }
    this.afterResolve();
  }

  /* ─────────────────────────────────────────────────────────────────────
     Input
     ───────────────────────────────────────────────────────────────────── */
  setupControls() {
    const cv = this.canvas;
    const pos = e => {
      const r = cv.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };

    const down = e => {
      /* Before the running guard: the intro plays while the round has not
         started, and a tap has to reach it. */
      if (this.intro) { e.preventDefault(); this.advanceIntro(); return; }
      if (!this.running) return;
      const p = pos(e);

      if (this.pending) {
        /* Tapping the pending card lets it go; tapping a slot swaps. */
        if (this.hitPending(p)) { this.resolvePending(-1); return; }
        const slot = this.hitSlot(p);
        if (slot >= 0 && slot < this.tray.length) this.resolvePending(slot);
        return;
      }

      const c = this.current;
      if (!c || c.resolved || !this.hitCard(c, p)) return;
      e.preventDefault();
      try { cv.setPointerCapture(e.pointerId); } catch (_) {}
      c.grabbed = true;
      c.hovered = true;            // a finger on the card is engagement
      c.grabY = p.y;
      c.lastY = p.y;
      c.vy = 0;
    };

    const move = e => {
      if (!this.running) return;
      const p = pos(e);
      const c = this.current;
      if (!c || c.resolved) return;

      if (c.grabbed) {
        e.preventDefault();
        c.vy = p.y - c.lastY;
        c.lastY = p.y;
        c.dy = p.y - c.grabY;
        return;
      }
      /* Desktop: dwelling over a card with no button down is hesitation
         too, which is what the stall rule is really about. */
      if (e.pointerType === 'mouse' && this.hitCard(c, p)) c.hoverPointer = true;
      else c.hoverPointer = false;
    };

    const up = e => {
      const c = this.current;
      if (!c || !c.grabbed || c.resolved) return;
      c.grabbed = false;
      try { cv.releasePointerCapture(e.pointerId); } catch (_) {}

      const flicked = Math.abs(c.dy) >= this.L.takeDist || Math.abs(c.vy) >= 14;
      const tapped  = this.config.tapToTake && Math.abs(c.dy) < 6;
      if (flicked || tapped) this.takeCurrent();
      else c.dy = 0;               // snaps back; the hover is already recorded
    };

    cv.addEventListener('pointerdown', down);
    cv.addEventListener('pointermove', move);
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', up);
    /* Safari still fires these on a canvas with touch-action: none */
    cv.addEventListener('touchmove', e => { if (this.current && this.current.grabbed) e.preventDefault(); }, { passive: false });

    document.addEventListener('keydown', e => {
      if (this.intro) {
        if (e.key === 'Escape') { e.preventDefault(); this.endIntro(); }
        else if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowRight') {
          e.preventDefault(); this.advanceIntro();
        }
        return;
      }
      if (!this.running) return;
      if (this.pending) {
        if (e.key === 'Escape') { this.resolvePending(-1); return; }
        const n = parseInt(e.key, 10);
        if (n >= 1 && n <= this.tray.length) this.resolvePending(n - 1);
        return;
      }
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault();
        const c = this.current;
        if (c && !c.resolved) {
          c.hovered = true;
          c.dy = (e.key === 'ArrowUp') ? -this.L.takeDist : this.L.takeDist;
          this.takeCurrent();
        }
      }
    });

    document.getElementById('startBtn').addEventListener('click', () => this.startGame());
    document.getElementById('restartBtn').addEventListener('click', () => this.restart());
    const mute = document.getElementById('muteBtn');
    if (mute) mute.addEventListener('click', () => this.toggleMute());
    const skip = document.getElementById('introSkip');
    if (skip) skip.addEventListener('click', e => { e.stopPropagation(); this.endIntro(); });
  }

  hitCard(c, p) {
    const x = this.cardX(c), y = this.L.laneY + c.dy;
    const w = this.L.cardW, h = c.h;
    /* Generous vertically: the card is the only thing to grab up there. */
    return p.x >= x - w / 2 - 10 && p.x <= x + w / 2 + 10 &&
           p.y >= y - h / 2 - 24 && p.y <= y + h / 2 + 24;
  }

  hitPending(p) {
    const w = this.L.cardW, h = this.pending.h;
    return p.x >= this.pending.x - w / 2 && p.x <= this.pending.x + w / 2 &&
           p.y >= this.pending.y - h / 2 && p.y <= this.pending.y + h / 2;
  }

  /* Only meaningful while the swap overlay is up — it is the only time the
     contents of the bag are laid out as anything tappable. */
  hitSlot(p) {
    if (!this.SW) return -1;
    for (let i = 0; i < this.SW.cells.length; i++) {
      const r = this.SW.cells[i];
      if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) return i;
    }
    return -1;
  }

  /* Where the swap overlay puts the new card and the grid underneath it.
     Recomputed on resize and whenever a card goes pending, because the grid
     starts below whatever height that card turned out to be. */
  computeSwapLayout() {
    const L = this.L, cap = this.config.tray.capacity;
    const cardH = this.pending ? this.pending.h : 80;

    const top    = L.laneTop + 74;                 // clears the title and hint
    const bottom = this.H - this.safeBottom - L.pad;
    const SPLIT  = 24;                             // card ↔ grid

    /* An icon eats ~38% of a cell's width, so three columns of them on a
       phone leaves the label a column of single words. Drop to two much
       sooner when the items carry artwork. */
    const narrow = this.W < (this.hasIcons ? 560 : 360);
    const cols = (cap <= 4 || narrow) ? 2 : 3;
    const rows = Math.ceil(cap / cols);
    const gap  = 10;
    const gridW = Math.min(this.W - L.pad * 2, 580);
    const cellW = (gridW - (cols - 1) * gap) / cols;

    /* Size the cells against what is left under the card, then centre card
       and grid together as one block — centring the grid alone in the
       leftover band stranded it at the bottom of a tall screen. */
    const availH = Math.max(110, bottom - (top + cardH + SPLIT));
    const cellH  = Math.min(clamp(cellW * 0.58, 52, 108),
                            (availH - (rows - 1) * gap) / rows);
    const gridH  = rows * cellH + (rows - 1) * gap;

    const blockTop = top + Math.max(0, (bottom - top - (cardH + SPLIT + gridH)) / 2);
    const cardY = blockTop + cardH / 2;
    const gx = (this.W - gridW) / 2;
    const gy = blockTop + cardH + SPLIT;

    const cells = [];
    for (let i = 0; i < cap; i++) {
      cells.push({
        x: gx + (i % cols) * (cellW + gap),
        y: gy + Math.floor(i / cols) * (cellH + gap),
        w: cellW, h: cellH
      });
    }
    this.SW = { cardY, cells, cols, rows };
  }

  /* ─────────────────────────────────────────────────────────────────────
     Update
     ───────────────────────────────────────────────────────────────────── */
  update(dt) {
    if (this.intro) { this.updateIntro(dt); return; }

    /* Toasts and the flight animation keep running while the tray prompt is
       up; the conveyor does not. */
    this.toasts.forEach(t => { t.t += dt; });
    this.toasts = this.toasts.filter(t => t.t < t.life);

    if (this.bagPop   > 0) this.bagPop   -= dt;
    if (this.badgePop > 0) this.badgePop -= dt;

    if (this.flight) {
      this.flight.t += dt;
      if (this.flight.t >= this.flight.dur) {
        this.bagPop   = BAG_POP_MS;
        this.badgePop = BADGE_POP_MS;
        this.flight = null;
      }
    }

    if (this.pending) { this.pending.t += dt; return; }
    if (!this.running) return;

    if (this.current) {
      const c = this.current;
      c.t += dt;
      if (c.hoverPointer) c.hoverMs += dt;
      if (c.hoverMs > 250) c.hovered = true;
      /* Not held: ease the card back onto the lane. */
      if (!c.grabbed && c.dy !== 0) {
        c.dy = Math.abs(c.dy) < 0.6 ? 0 : c.dy * 0.82;
      }
      if (c.t >= c.duration) this.passCurrent();
      return;
    }

    if (this.gapLeft > 0) { this.gapLeft -= dt; return; }
    if (!this.finished) this.spawnNext();
  }

  /* Where the card sits along the lane right now. It enters fully off the
     left edge and leaves fully off the right, so no item is ever half a
     decision when it appears. */
  cardX(c) {
    const w = this.L.cardW;
    const from = -w / 2 - 20;
    const to   = this.W + w / 2 + 20;
    const p = clamp(c.t / c.duration, 0, 1);
    return lerp(from, to, laneEase(p, clamp(this.config.dwell, 0, 1)));
  }

  /* ─────────────────────────────────────────────────────────────────────
     Drawing
     ───────────────────────────────────────────────────────────────────── */
  measureCard(c) {
    const ctx = this.ctx;
    const item = c.item;
    const w = this.L.cardW;
    const padX = 18;
    const hasImg = !!this.images[`item_${item.index}`];
    const text = (item.type === 'image' && !item.label) ? '' : (item.label || item.content || '');

    /* Caption size follows the lane as well as the card width: at 22px a
       two-line caption eats the whole band on a landscape phone, and the
       picture — which is the content on a picture game — loses. Tall
       screens are unaffected, the width still decides there. */
    const bandH = this.L.laneBottom - this.L.laneTop;
    const fs = clamp(Math.min(w * 0.088, bandH * 0.115), 12, 22);
    ctx.font = `700 ${fs}px ${this.T.fontBody}`;
    const lines = text ? this.wrapText(text, w - padX * 2) : [];
    const lineH = fs * 1.3;

    /* Whatever is left over after the words goes to the picture, and it
       drops out altogether rather than shrink to an unreadable smudge.
       Without a plate the art is the whole card, so it takes as much of the
       lane as it can get rather than a fixed 150px. */
    const textH = lines.length * lineH;
    const plateH = this.bare ? 8 : 30;      // padding the plate would have added
    let imgH = hasImg
      ? (this.bare ? clamp(Math.min(this.W * 0.52, bandH * 0.62), 110, 340)
                   : clamp(w * 0.42, 70, 150))
      : 0;
    if (imgH) {
      const maxH  = Math.max(90, bandH - 16);
      const spare = maxH - textH - plateH - (textH ? 10 : 0);
      if (spare < imgH) imgH = spare >= 44 ? spare : 0;
    }

    c.fontSize = fs;
    c.lines = lines;
    c.lineH = lineH;
    c.imgH  = imgH;
    c.h = Math.max(this.bare ? 48 : 64,
                   imgH + (imgH && lines.length ? 10 : 0) + textH + plateH);
  }

  wrapText(text, maxW) {
    const ctx = this.ctx;
    const words = String(text).split(/\s+/);
    const lines = [];
    let line = '';
    words.forEach(word => {
      const test = line ? line + ' ' + word : word;
      if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = word; }
      else line = test;
    });
    if (line) lines.push(line);
    return lines.slice(0, 5);
  }

  draw() {
    const ctx = this.ctx, T = this.T;
    if (!this.W || !this.H) return;   // no layout yet; nothing sane to paint
    ctx.clearRect(0, 0, this.W, this.H);
    /* Pixel-art skins want nearest-neighbour, not the browser's smoothing */
    ctx.imageSmoothingEnabled = !T.pixelated;

    /* Background */
    if (this.images.background) {
      const img = this.images.background;
      const scale = Math.max(this.W / img.naturalWidth, this.H / img.naturalHeight);
      const bw = img.naturalWidth * scale, bh = img.naturalHeight * scale;
      ctx.drawImage(img, (this.W - bw) / 2, (this.H - bh) / 2, bw, bh);
    } else {
      const g = ctx.createLinearGradient(0, 0, this.W, this.H);
      g.addColorStop(0, T.background);
      g.addColorStop(1, T.backgroundTo);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, this.W, this.H);
    }

    /* The intro plays over the game's own background and nothing else —
       no lane, no bag, no cards. */
    if (this.intro) { this.drawIntro(); return; }

    this.drawLane();
    this.drawBag();

    if (this.current && !this.current.resolved) this.drawCard(this.current);
    if (this.flight) this.drawFlight();
    if (this.pending) this.drawPendingPrompt();
    this.drawToasts();
  }

  drawLane() {
    const ctx = this.ctx, L = this.L, T = this.T;
    /* The tinted strip is the conveyor, so it has to be at least as tall as
       what is travelling on it — a bare card's artwork is far bigger than
       the old fixed 300px and was poking out of the top. */
    const cardH = (this.current && this.current.h) || 0;
    const band  = Math.max(150, L.laneBottom - L.laneTop);
    const h = clamp(Math.max(cardH + 56, this.H * 0.30), 150, band);
    ctx.fillStyle = T.lane;
    ctx.beginPath();
    ctx.roundRect(0, L.laneY - h / 2, this.W, h, 0);
    ctx.fill();

    /* Up / down hints, brightest while a card is actually held. Hidden
       during a swap — they prompt an interaction that is suspended, and
       they were faintly legible through the dim. */
    if (this.pending) return;
    const c = this.current;
    const lit = c && c.grabbed;
    const committed = lit && Math.abs(c.dy) >= L.takeDist;
    ctx.save();
    ctx.globalAlpha = lit ? (committed ? 0.95 : 0.55) : 0.16;
    ctx.fillStyle = committed ? T.accent : '#ffffff';
    const ax = this.W / 2;
    this.drawChevron(ax, L.laneY - h / 2 + 18,  1);   // top: points up
    this.drawChevron(ax, L.laneY + h / 2 - 18, -1);   // bottom: points down
    ctx.restore();
  }

  drawChevron(x, y, dir) {
    const ctx = this.ctx, s = 13;
    ctx.beginPath();
    ctx.moveTo(x - s, y + s * 0.6 * dir);
    ctx.lineTo(x, y - s * 0.6 * dir);
    ctx.lineTo(x + s, y + s * 0.6 * dir);
    ctx.lineTo(x + s, y + s * 1.25 * dir);
    ctx.lineTo(x, y + s * 0.05 * dir);
    ctx.lineTo(x - s, y + s * 1.25 * dir);
    ctx.closePath();
    ctx.fill();
  }

  drawCard(c) {
    const x = this.cardX(c);
    const y = this.L.laneY + c.dy;
    /* A card being flicked tips slightly the way it is going. */
    const tilt = clamp(c.dy / 400, -0.09, 0.09);
    this.paintCard(c, x, y, this.L.cardW, c.h, tilt, 1);
  }

  paintCard(c, x, y, w, h, tilt, alpha) {
    const ctx = this.ctx, T = this.T;
    const item = c.item;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    if (tilt) ctx.rotate(tilt);

    const committed = c.grabbed && Math.abs(c.dy) >= this.L.takeDist;

    if (!this.bare) {
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.35)';
      ctx.shadowBlur = 18;
      ctx.shadowOffsetY = 8;
      ctx.fillStyle = item.color || T.card;
      ctx.beginPath();
      ctx.roundRect(-w / 2, -h / 2, w, h, T.cardRadius);
      ctx.fill();
      ctx.restore();

      /* A committed flick highlights the edge, so the player can see the
         decision land before they let go. */
      if (committed) {
        ctx.strokeStyle = T.accent;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.roundRect(-w / 2 + 2, -h / 2 + 2, w - 4, h - 4, Math.max(0, T.cardRadius - 2));
        ctx.stroke();
      }
    }

    let cy = -h / 2 + (this.bare ? 0 : 15);
    const img = this.images[`item_${item.index}`];
    if (img && c.imgH) {
      const ratio = img.naturalWidth / img.naturalHeight;
      const inset = this.bare ? 0 : 36;
      const ih = c.imgH, iw = Math.min(w - inset, ih * ratio);
      ctx.save();
      /* With no plate the art needs its own lift off the background — the
         shadow follows the PNG's alpha, so it hugs the icon rather than
         boxing it. A committed flick swaps it for an accent glow, which is
         what the plate's edge highlight used to do. */
      if (this.bare) {
        ctx.shadowColor   = committed ? T.accent : 'rgba(0,0,0,0.55)';
        ctx.shadowBlur    = committed ? 28 : 16;
        ctx.shadowOffsetY = committed ? 0 : 8;
      }
      ctx.drawImage(img, -iw / 2, cy, iw, ih);
      ctx.restore();
      cy += ih + 10;
    }

    if (c.lines && c.lines.length) {
      ctx.save();
      if (this.bare) {
        ctx.fillStyle = committed ? T.accent : (item.textColor || T.bareText);
        ctx.shadowColor = 'rgba(0,0,0,0.9)';
        ctx.shadowBlur = 9;
        ctx.shadowOffsetY = 2;
      } else {
        ctx.fillStyle = item.textColor || T.cardText;
      }
      ctx.font = `${this.bare ? 800 : 700} ${c.fontSize}px ${this.T.fontBody}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      c.lines.forEach((line, i) => ctx.fillText(line, 0, cy + i * c.lineH + 2));
      ctx.restore();
    }
    ctx.restore();
  }

  /* The kept card shrinks into the mouth of the bag. It arcs on the way —
     a straight slide read as the card being deleted rather than packed. */
  drawFlight() {
    const f = this.flight, B = this.L.bagVis;
    const t = easeOut(clamp(f.t / f.dur, 0, 1));
    const toX = B.x + B.w / 2, toY = B.y + B.h * 0.42;
    const x = lerp(f.fromX, toX, t);
    const y = lerp(f.fromY, toY, t) - Math.sin(t * Math.PI) * 46;
    const ctx = this.ctx;
    const img = this.bare ? this.images[`item_${f.item.index}`] : null;

    ctx.save();
    ctx.globalAlpha = 1 - t * 0.55;
    ctx.translate(x, y);
    ctx.rotate(t * 0.5);

    if (img) {
      /* With no plate there is no plate to fly — the artwork itself goes in,
         so the player follows the thing they chose rather than a token. */
      const s = lerp(f.imgH || Math.min(f.w, f.h) || 120, B.w * 0.32, t);
      const ratio = img.naturalWidth / img.naturalHeight;
      const ih = s, iw = s * ratio;
      ctx.drawImage(img, -iw / 2, -ih / 2, iw, ih);
    } else {
      const w = lerp(f.w, B.w * 0.3, t);
      const h = lerp(f.h, B.h * 0.2, t);
      ctx.fillStyle = this.T.cardTaken;
      ctx.beginPath();
      ctx.roundRect(-w / 2, -h / 2, w, h, lerp(20, 6, t));
      ctx.fill();
    }
    ctx.restore();
  }

  /* ── The bag ─────────────────────────────────────────────────────
     The tray is one object on screen. What is in it is deliberately not
     listed: in the consistency games, remembering what you already took
     is the exercise, so a permanent read-out would answer the question
     the round is asking. The badge gives the one fact that is fair to
     hand over for free — how full it is. */
  drawBag() {
    const ctx = this.ctx, B = this.L.bag, V = this.L.bagVis, T = this.T;

    const pop = this.bagPop > 0 ? Math.sin((1 - this.bagPop / BAG_POP_MS) * Math.PI) * 0.09 : 0;
    const cx = V.x + V.w / 2, cy = V.y + V.h;   // scale from the base, not the middle

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1 + pop, 1 + pop);
    ctx.translate(-cx, -cy);

    /* Contact shadow, so it sits on the floor rather than floating */
    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(cx, V.y + V.h + 5, V.w * 0.42, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (this.images.tray) ctx.drawImage(this.images.tray, B.x, B.y, B.w, B.h);
    else this.paintSuitcase(V);

    ctx.restore();

    /* Label under it */
    const label = this.config.tray.label || _getUIText('tray_label');
    if (label) {
      ctx.save();
      ctx.globalAlpha = 0.72;
      ctx.fillStyle = T.trayText;
      ctx.font = `900 11px ${this.T.fontDisplay}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.letterSpacing = '0.08em';
      ctx.fillText(String(label).toUpperCase(), cx, V.y + V.h + 11);
      ctx.restore();
    }

    this.drawBagBadge(V);
  }

  /* Procedural stand-in for a missing tray.image: a small hard case. */
  paintSuitcase(B) {
    const ctx = this.ctx, T = this.T;
    const r = B.h * 0.14;

    /* Handle, behind the body */
    ctx.strokeStyle = T.traySlot;
    ctx.lineWidth = Math.max(5, B.h * 0.06);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(B.x + B.w / 2, B.y + B.h * 0.2, B.w * 0.17, Math.PI * 1.08, Math.PI * 1.92);
    ctx.stroke();

    const body = { x: B.x, y: B.y + B.h * 0.2, w: B.w, h: B.h * 0.8 };
    const g = ctx.createLinearGradient(0, body.y, 0, body.y + body.h);
    g.addColorStop(0, T.bag || '#e8b45f');
    g.addColorStop(1, T.bagDark || '#b5793a');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(body.x, body.y, body.w, body.h, r);
    ctx.fill();

    /* Strap across the middle */
    ctx.fillStyle = 'rgba(0,0,0,0.20)';
    ctx.fillRect(body.x, body.y + body.h * 0.42, body.w, body.h * 0.15);

    /* Clasps */
    ctx.fillStyle = T.accent;
    const cw = body.w * 0.1, ch = body.h * 0.12;
    [0.26, 0.64].forEach(f => {
      ctx.beginPath();
      ctx.roundRect(body.x + body.w * f, body.y + body.h * 0.44, cw, ch, 3);
      ctx.fill();
    });

    /* Top highlight */
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    ctx.beginPath();
    ctx.roundRect(body.x + 4, body.y + 4, body.w - 8, body.h * 0.22, r * 0.7);
    ctx.fill();
  }

  /* How full the bag is: a count in a circle, wrapped in an arc that
     closes as the bag fills and turns urgent on the last slot. */
  drawBagBadge(B) {
    const ctx = this.ctx, T = this.T;
    const cap = this.config.tray.capacity;
    const n   = this.tray.length;
    const rad = clamp(B.w * 0.18, 17, 27);
    const bx  = B.x + B.w - rad * 0.35;
    const by  = B.y + rad * 0.5;
    const full = n >= cap;
    const pop = this.badgePop > 0 ? Math.sin((1 - this.badgePop / BADGE_POP_MS) * Math.PI) * 0.22 : 0;

    ctx.save();
    ctx.translate(bx, by);
    ctx.scale(1 + pop, 1 + pop);

    ctx.fillStyle = 'rgba(12,14,28,0.92)';
    ctx.beginPath();
    ctx.arc(0, 0, rad, 0, Math.PI * 2);
    ctx.fill();

    /* Track, then the filled arc on top of it */
    ctx.lineWidth = Math.max(3, rad * 0.16);
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.beginPath();
    ctx.arc(0, 0, rad - ctx.lineWidth / 2 - 1, 0, Math.PI * 2);
    ctx.stroke();

    if (n > 0) {
      ctx.strokeStyle = full ? T.danger : T.accent;
      ctx.beginPath();
      ctx.arc(0, 0, rad - ctx.lineWidth / 2 - 1,
              -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (n / cap));
      ctx.stroke();
    }

    ctx.fillStyle = full ? T.danger : '#ffffff';
    ctx.font = `900 ${Math.round(rad * 1.05)}px ${this.T.fontBody}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(n), 0, 1);
    ctx.restore();
  }

  /* ── The swap grid ───────────────────────────────────────────────
     The only time the bag is unpacked on screen: the player is over
     capacity and has to name what goes. */
  drawSwapCard(item, r, i) {
    const ctx = this.ctx, T = this.T;
    const img = this.images[`item_${item.index}`];
    const text = item.short || item.label || item.content || '';

    ctx.fillStyle = T.cardTaken;
    ctx.beginPath();
    ctx.roundRect(r.x, r.y, r.w, r.h, 14);
    ctx.fill();

    ctx.strokeStyle = T.danger;
    ctx.lineWidth = 3;
    ctx.setLineDash([7, 5]);
    ctx.beginPath();
    ctx.roundRect(r.x + 1.5, r.y + 1.5, r.w - 3, r.h - 3, 13);
    ctx.stroke();
    ctx.setLineDash([]);

    /* Icon beside the wording, not instead of it. The player is choosing
       what to throw away, and they picked these things up as pictures —
       matching the artwork is faster than reading six labels. */
    const pad = 8;
    let textX = r.x + r.w / 2;
    let textW = r.w - pad * 2;
    let align = 'center';

    if (img) {
      const box   = Math.min(r.h - pad * 2, r.w * 0.38);
      const ratio = img.naturalWidth / img.naturalHeight;
      const ih = box, iw = Math.min(box, box * ratio);
      ctx.drawImage(img, r.x + pad + (box - iw) / 2, r.y + (r.h - ih) / 2, iw, ih);

      textX = r.x + pad + box + 8;
      textW = r.x + r.w - pad - textX;
      align = 'left';
    }

    const fs = clamp(textW * 0.15, 10, 15);
    ctx.font = `700 ${fs}px ${this.T.fontBody}`;
    ctx.fillStyle = '#3a3320';
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';

    const all   = this.wrapText(text, textW);
    const lines = all.slice(0, 3);
    /* Say so when a label did not fit rather than cutting it off silently */
    if (all.length > lines.length && lines.length) {
      lines[lines.length - 1] = lines[lines.length - 1].replace(/\s+\S*$/, '') + '…';
    }
    const lh  = fs * 1.2;
    const top = r.y + r.h / 2 - ((lines.length - 1) * lh) / 2;
    lines.forEach((line, k) => ctx.fillText(line, textX, top + k * lh));

    /* Doubles as the keyboard shortcut. Top-right now — the icon owns the
       left edge. */
    ctx.font = `900 11px ${this.T.fontBody}`;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText(String(i + 1), r.x + r.w - 7, r.y + 6);
  }

  /* The bag is over capacity: unpack it. This is the only screen that
     lists what is inside, and it exists because the player cannot make
     the choice without seeing the alternatives. */
  drawPendingPrompt() {
    const ctx = this.ctx, T = this.T, L = this.L;
    const SW = this.SW;

    ctx.fillStyle = 'rgba(8,10,22,0.86)';
    ctx.fillRect(0, 0, this.W, this.H);

    ctx.fillStyle = T.accent;
    ctx.font = `900 ${clamp(this.W * 0.05, 18, 26)}px ${this.T.fontDisplay}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(_getUIText('tray_full_title'), this.W / 2, L.laneTop + 22);

    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = `600 ${clamp(this.W * 0.032, 12, 15)}px ${this.T.fontBody}`;
    const hint = this.wrapText(_getUIText('tray_full_hint'), Math.min(this.W - 40, 460));
    hint.forEach((line, i) => ctx.fillText(line, this.W / 2, L.laneTop + 50 + i * 18));

    /* The new card hovers, breathing, so it reads as unresolved. */
    const p = this.pending;
    p.y = SW.cardY + Math.sin(p.t / 380) * 5;
    this.paintCard(p, p.x, p.y, L.cardW, p.h, 0, 1);

    this.tray.forEach((item, i) => {
      if (SW.cells[i]) this.drawSwapCard(item, SW.cells[i], i);
    });
  }

  drawToasts() {
    const ctx = this.ctx, L = this.L;
    const maxW = Math.min(this.W - 32, 520);
    let y = L.laneTop + 8;

    this.toasts.forEach(t => {
      const fade = t.t < 200 ? t.t / 200
                 : t.t > t.life - 400 ? (t.life - t.t) / 400 : 1;
      ctx.save();
      ctx.globalAlpha = clamp(fade, 0, 1);

      ctx.font = `800 ${clamp(this.W * 0.034, 12, 16)}px ${this.T.fontBody}`;
      const lines = this.wrapText(t.text, maxW - 28);
      const lh = 19;
      const h = lines.length * lh + 20;

      ctx.fillStyle = 'rgba(255,77,77,0.94)';
      ctx.beginPath();
      ctx.roundRect((this.W - maxW) / 2, y, maxW, h, 12);
      ctx.fill();

      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      lines.forEach((line, i) => ctx.fillText(line, this.W / 2, y + 10 + i * lh));
      ctx.restore();
      y += h + 6;
    });
  }

  /* ─────────────────────────────────────────────────────────────────────
     HUD and results
     ───────────────────────────────────────────────────────────────────── */
  updateHUD() {
    const s = document.getElementById('score');
    if (s) s.textContent = this.score;
    const p = document.getElementById('progress');
    if (p) {
      p.textContent = this.config.duration === 'infinite'
        ? _getUIText('items_counter_inf', { n: this.spawned })
        : _getUIText('items_counter', { n: Math.min(this.spawned, this.queue.length), total: this.queue.length });
    }
    const board = document.getElementById('progressBoard');
    if (board) board.style.display = this.config.showCounter ? 'block' : 'none';
  }

  displayLives() {
    const el = document.getElementById('livesBoard');
    if (!el) return;
    let html = '';
    for (let i = 0; i < this.lives; i++) html += lifeLeftHtml;
    for (let i = 0; i < this.config.maxLives - this.lives; i++) html += lifeGoneHtml;
    el.innerHTML = html;
  }

  endGame(completed) {
    if (this.finished) return;
    this.finished = true;
    this.running = false;
    this.current = null;
    this.pending = null;
    this.stopMusic();

    if (completed) this.score += this.config.scoring.completionBonus;
    this.updateHUD();   // the bonus has to show on the pill, not just here

    document.getElementById('title-game-over').textContent =
      completed ? _getUIText('roundComplete') : _getUIText('gameOver');
    document.getElementById('finalScore').textContent = this.score;

    /* The tray is the point of the exercise — the player should leave
       looking at what they chose, not at a number. */
    let html = '';
    html += `<h4>${_getUIText('results_taken')}</h4>`;
    if (this.tray.length) {
      html += '<ol class="results-list">' + this.tray.map(it =>
        `<li>${this.escape(it.label || it.content || '')}</li>`).join('') + '</ol>';
    } else {
      html += `<p class="results-empty">${_getUIText('results_empty')}</p>`;
    }
    if (this.mistakes.length) {
      html += `<h4>${_getUIText('results_mistakes')}</h4>`;
      html += '<ul class="results-list bad">' + this.mistakes.map(m =>
        `<li>${this.escape(m.reason)}${m.subject ? ' — ' + this.escape(m.subject) : ''}</li>`).join('') + '</ul>';
    }
    document.getElementById('resultsBody').innerHTML = html;
    document.getElementById('gameOver').style.display = 'block';
  }

  escape(s) {
    return String(s).replace(/[&<>"]/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }

  /* ── Frame loop ── */
  loop() {
    const now = performance.now();
    /* Clamp: a backgrounded tab returns with a huge delta and would expire
       several items at once. */
    const dt = Math.min(64, now - this.lastFrame);
    this.lastFrame = now;
    this.update(dt);
    this.draw();
    requestAnimationFrame(() => this.loop());
  }
}

/* ── Boot ── */
fetch(`data/${gameId}/game-config.json`)
  .then(r => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  })
  /* Exposed so an embedding page (and the console) can inspect a live
     round — the tray, the score, what has already gone past. */
  .then(config => { window.game = new ItemSortingGame(config); })
  .catch(err => {
    console.error('Error loading config:', err);
    const el = document.getElementById('loading');
    if (el) el.innerHTML = _getUIText('loadingError');
    bootDone();
  });
