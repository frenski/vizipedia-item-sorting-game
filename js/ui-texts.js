/* ═══════════════════════════════════════════════════
   ui-texts.js — UI string translations
   Load BEFORE main.js in index.html.

   Every string the engine draws comes from here, so a game's
   game-config.json only ever carries its own content. Placeholders are
   written {like_this} and filled by _getUIText(key, vars).
   ═══════════════════════════════════════════════════ */

const _DEFAULT_LANG = 'en';

/* Parse the location hash (e.g. #id=demo&lang=bg) — same format as main.js */
const _parseLocHash = function () {
  if (location.hash.length < 2) return {};
  var hash = {};
  var parts = location.hash.substr(1).split('&');
  for (var i = 0; i < parts.length; i++) {
    var m = parts[i].match(/^(.+?)=(.*)$/);
    if (m) hash[m[1]] = decodeURIComponent(m[2]);
  }
  return hash;
};

/* Language priority: hash #lang= → <html lang=""> → default.
   Split on "-" so "en-us" and "en-GB" both land on "en". */
const _locHashLang = _parseLocHash();
const userLang = (_locHashLang.lang || document.documentElement.lang || _DEFAULT_LANG)
                   .toLowerCase().split('-')[0];

/* ── RTL languages ── */
const _RTL_LANGS = ['ar', 'he', 'fa', 'ur'];
const _isRTL = _RTL_LANGS.indexOf(userLang) !== -1;

document.documentElement.setAttribute('dir', _isRTL ? 'rtl' : 'ltr');
document.documentElement.setAttribute('lang', userLang);
document.documentElement.classList.toggle('rtl', _isRTL);

const _UI_TEXTS = {
  'en': {
    'loading':            'Loading game…',
    'loadingError':       'Error loading game configuration!',

    /* ── HUD ── */
    'score_label':        'Score',
    'items_counter':      '{n} / {total}',
    'items_counter_inf':  'Item {n}',

    /* ── Start screen ── */
    'btn_start':          'Start',
    'btn_skip':           'Skip',
    'hint_flick':         'Flick an item <b>up</b> or <b>down</b> to put it in your bag.',
    'hint_pass':          'Do nothing and it scrolls away. Letting something pass <b>is</b> the no.',
    'hint_tray':          'Your bag holds {n} — the counter on it tells you how full it is. Taking one more means throwing one off.',
    'hint_keys':          'Keyboard: ↑ or ↓ to take.',

    /* ── Tray ── */
    'tray_label':         'YOUR BAG',
    'tray_full_title':    'Your bag is full',
    'tray_full_hint':     'Tap one of these to throw it off — or tap the new card to let it go.',

    /* ── Life-loss toasts ── */
    'toast_wrong':        'That one did not belong.',
    'toast_missed':       'You let a good one go.',
    'toast_contradiction':'Contradiction — you took “{a}” but let “{b}” go.',
    'toast_freeze':       'Frozen — {n} items gone and your tray is still empty.',
    'toast_stall':        'You hovered over {n} in a row and took none of them.',
    'toast_life':         '−1 life',

    /* ── End of round ── */
    'gameOver':           'Game Over!',
    'roundComplete':      'Round complete!',
    'finalScore':         'Final Score:',
    'results_taken':      'What you took',
    'results_empty':      'You took nothing at all.',
    'results_mistakes':   'What cost you',
    'btn_restart':        'Play again'
  },

  'bg': {
    'loading':            'Зареждане…',
    'loadingError':       'Грешка при зареждане конфигурацията на играта!',
    'score_label':        'Точки',
    'items_counter':      '{n} / {total}',
    'items_counter_inf':  'Предмет {n}',
    'btn_start':          'Старт',
    'btn_skip':           'Пропусни',
    'hint_flick':         'Плъзни предмета <b>нагоре</b> или <b>надолу</b>, за да го сложиш в чантата.',
    'hint_pass':          'Не направиш ли нищо, той отминава. Да го пуснеш <b>е</b> отказът.',
    'hint_tray':          'В чантата има място за {n} — броячът показва колко е пълна. Още един означава да изхвърлиш нещо.',
    'hint_keys':          'Клавиатура: ↑ или ↓ за вземане.',
    'tray_label':         'ТВОЯТА ЧАНТА',
    'tray_full_title':    'Чантата е пълна',
    'tray_full_hint':     'Докосни някое от тези, за да го изхвърлиш — или докосни новата карта, за да я пуснеш.',
    'toast_wrong':        'Това не беше на място.',
    'toast_missed':       'Изпусна добър.',
    'toast_contradiction':'Противоречие — взе „{a}“, а пусна „{b}“.',
    'toast_freeze':       'Замръзна — {n} предмета минаха, а таблата е още празна.',
    'toast_stall':        'Поколеба се над {n} поред и не взе нито един.',
    'toast_life':         '−1 живот',
    'gameOver':           'Край на играта!',
    'roundComplete':      'Кръгът приключи!',
    'finalScore':         'Краен резултат:',
    'results_taken':      'Какво взе',
    'results_empty':      'Не взе нищо.',
    'results_mistakes':   'Какво ти струваше',
    'btn_restart':        'Играй пак'
  },

  'ar': {
    'loading':            'جاري تحميل اللعبة...',
    'loadingError':       'في خطأ في تحميل اللعبة!',
    'score_label':        'النقاط',
    'items_counter':      '{n} / {total}',
    'items_counter_inf':  'العنصر {n}',
    'btn_start':          'ابدأ',
    'btn_skip':           'تخطٍ',
    'hint_flick':         'اسحب العنصر <b>للأعلى</b> أو <b>للأسفل</b> لوضعه في الحقيبة.',
    'hint_pass':          'إن لم تفعل شيئًا فسيمر. تركه يمر <b>هو</b> الرفض.',
    'hint_tray':          'تتسع الحقيبة لـ {n} — والعدّاد عليها يبيّن مدى امتلائها. أخذ واحد إضافي يعني التخلص من غيره.',
    'hint_keys':          'لوحة المفاتيح: ↑ أو ↓ للأخذ.',
    'tray_label':         'حقيبتك',
    'tray_full_title':    'حقيبتك ممتلئة',
    'tray_full_hint':     'المس أحد هذه للتخلص منه — أو المس البطاقة الجديدة لتركها تمر.',
    'toast_wrong':        'هذا لم يكن في محله.',
    'toast_missed':       'تركت عنصرًا جيدًا يمر.',
    'toast_contradiction':'تناقض — أخذت «{a}» وتركت «{b}» تمر.',
    'toast_freeze':       'تجمدت — مرّ {n} عناصر وصينيتك ما زالت فارغة.',
    'toast_stall':        'ترددت أمام {n} متتالية ولم تأخذ أيًا منها.',
    'toast_life':         '−1 حياة',
    'gameOver':           'انتهت اللعبة!',
    'roundComplete':      'انتهت الجولة!',
    'finalScore':         'النتيجة النهائية:',
    'results_taken':      'ما أخذته',
    'results_empty':      'لم تأخذ شيئًا.',
    'results_mistakes':   'ما كلّفك',
    'btn_restart':        'العب مجددًا'
  }
};

/* Look up `key` in the active language, fall back to the default language,
   then to the key itself so a missing string is visible rather than blank.
   `vars` fills {placeholders}. */
function _getUIText(key, vars) {
  var pack = _UI_TEXTS[userLang] || {};
  var base = _UI_TEXTS[_DEFAULT_LANG] || {};
  var str  = (pack[key] != null) ? pack[key] : (base[key] != null ? base[key] : key);
  if (vars) {
    Object.keys(vars).forEach(function (k) {
      str = str.split('{' + k + '}').join(vars[k]);
    });
  }
  return str;
}
