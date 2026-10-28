/* ИИ-Академия — логика сайта. Без сборки и без внешних библиотек. */
(function () {
  'use strict';

  var A = window.ACADEMY;
  var app = document.getElementById('app');

  /* ───────── помощники ───────── */
  function h(tag, attrs) {
    var el = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v == null || v === false) return;
        if (k === 'class') el.className = v;
        else if (k === 'html') el.innerHTML = v;
        else if (k.indexOf('on') === 0 && typeof v === 'function') el.addEventListener(k.slice(2), v);
        else el.setAttribute(k, v === true ? '' : v);
      });
    }
    add(el, Array.prototype.slice.call(arguments, 2));
    return el;
  }
  function add(el, kids) {
    (kids || []).forEach(function (c) {
      if (c == null || c === false) return;
      if (Array.isArray(c)) return add(el, c);
      el.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
    });
    return el;
  }
  function paras(text, cls) {
    return String(text).split('\n').map(function (line) { return h('p', { class: cls || null }, line); });
  }
  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); }

  /* ───────── прогресс ───────── */
  var Store = {
    key: 'ai-academy-v1',
    data: { progress: {}, sound: true },
    load: function () {
      try {
        var raw = localStorage.getItem(this.key);
        if (raw) { var d = JSON.parse(raw); if (d && typeof d === 'object') { this.data.progress = d.progress || {}; this.data.sound = d.sound !== false; } }
      } catch (e) { /* хранилище недоступно — работаем без него */ }
    },
    save: function () { try { localStorage.setItem(this.key, JSON.stringify(this.data)); } catch (e) {} },
    done: function (kid, mid) { return !!(this.data.progress[kid] && this.data.progress[kid][mid]); },
    complete: function (kid, mid) {
      if (!this.data.progress[kid]) this.data.progress[kid] = {};
      this.data.progress[kid][mid] = Date.now();
      this.save();
    },
    count: function (kid) {
      var self = this;
      return kid.missions.filter(function (m) { return self.done(kid.id, m.id); }).length;
    },
    reset: function () { this.data.progress = {}; this.save(); }
  };
  Store.load();

  /* ───────── голос (для Мирона) ───────── */
  var Voice = {
    ok: 'speechSynthesis' in window,
    voice: null,
    init: function () {
      if (!this.ok) return;
      var self = this;
      var choose = function () {
        var vs = window.speechSynthesis.getVoices() || [];
        var ru = vs.filter(function (v) { return /^ru/i.test(v.lang); });
        self.voice = ru.filter(function (v) { return /Milena|Google|Yandex|Alena|Irina|Daria/i.test(v.name); })[0] || ru[0] || null;
      };
      choose();
      try { window.speechSynthesis.addEventListener('voiceschanged', choose); } catch (e) { window.speechSynthesis.onvoiceschanged = choose; }
      // iOS разрешает речь только после первого касания — «разблокируем» её.
      var unlock = function () {
        try { var u = new SpeechSynthesisUtterance(' '); u.volume = 0; window.speechSynthesis.speak(u); } catch (e) {}
        document.removeEventListener('pointerdown', unlock);
      };
      document.addEventListener('pointerdown', unlock);
    },
    say: function (text) {
      if (!this.ok || !Store.data.sound) return;
      try {
        window.speechSynthesis.cancel();
        var clean = String(text).replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, '').replace(/[«»]/g, '');
        var u = new SpeechSynthesisUtterance(clean);
        u.lang = 'ru-RU';
        if (this.voice) u.voice = this.voice;
        u.rate = 0.92; u.pitch = 1.1;
        window.speechSynthesis.speak(u);
      } catch (e) {}
    },
    stop: function () { if (this.ok) try { window.speechSynthesis.cancel(); } catch (e) {} }
  };
  Voice.init();

  function speak(ctx, text) { if (ctx && ctx.kid && ctx.kid.voice) Voice.say(text); }
  function speakBtn(ctx, getText) {
    if (!ctx.kid.voice || !Voice.ok) return null;
    return h('button', { class: 'speak', type: 'button', 'aria-label': 'Прочитать вслух', onclick: function () { Voice.say(typeof getText === 'function' ? getText() : getText); } }, '🔊');
  }

  /* ───────── общие элементы ───────── */
  function topbar(backHref, title, extra) {
    return h('header', { class: 'topbar' },
      backHref ? h('a', { class: 'back', href: backHref, 'aria-label': 'Назад' }, '←') : h('span', { class: 'logo', 'aria-hidden': 'true' }, '✨'),
      h('div', { class: 'tb-title' }, title),
      extra || h('span', { class: 'tb-spacer' }));
  }
  function soundToggle() {
    var b = h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Звук' });
    var paint = function () { b.textContent = Store.data.sound ? '🔊' : '🔇'; b.setAttribute('aria-pressed', Store.data.sound ? 'true' : 'false'); };
    b.addEventListener('click', function () { Store.data.sound = !Store.data.sound; Store.save(); if (!Store.data.sound) Voice.stop(); paint(); });
    paint();
    return b;
  }
  function nextBtn(onClick, label) {
    return h('button', { class: 'btn primary wide', type: 'button', onclick: onClick }, label || 'Дальше →');
  }
  function adultNote(text, open) {
    if (!text) return null;
    var d = h('details', { class: 'adult' }, h('summary', null, '💬 Для взрослых'), h('p', null, text));
    if (open) d.open = true;
    return d;
  }
  function copyText(text, btn) {
    var done = function () {
      if (!btn) return;
      var old = btn.textContent; btn.textContent = 'Скопировано ✓'; btn.classList.add('copied');
      setTimeout(function () { btn.textContent = old; btn.classList.remove('copied'); }, 1600);
    };
    var fallback = function () {
      var ta = h('textarea', { readonly: true, style: 'position:fixed;top:0;left:0;opacity:0' });
      ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch (e) {}
      document.body.removeChild(ta); done();
    };
    try {
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, fallback);
      else fallback();
    } catch (e) { fallback(); }
  }
  function confetti() {
    try { if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return; } catch (e) {}
    var wrap = h('div', { class: 'confetti', 'aria-hidden': 'true' });
    var em = ['🎉', '⭐', '✨', '🌟', '🎈'];
    for (var i = 0; i < 26; i++) {
      wrap.appendChild(h('span', { style: 'left:' + (Math.random() * 100) + '%;animation-delay:' + (Math.random() * 0.6) + 's;animation-duration:' + (1.8 + Math.random() * 1.4) + 's;font-size:' + (18 + Math.random() * 18) + 'px' }, em[i % em.length]));
    }
    document.body.appendChild(wrap);
    setTimeout(function () { if (wrap.parentNode) wrap.parentNode.removeChild(wrap); }, 4200);
  }
  function feedback(kind, text) {
    var cls = kind === true ? 'ok' : kind === 'half' ? 'half' : 'bad';
    return h('div', { class: 'fb ' + cls, role: 'status' }, text);
  }

  /* ───────── шаги миссий ───────── */
  var Steps = {};

  Steps.intro = function (el, s, ctx) {
    add(el, [
      h('section', { class: 'card center' },
        s.emoji ? h('div', { class: 'hero-emoji pop' }, s.emoji) : null,
        h('div', { class: 'big-text' }, paras(s.text)),
        speakBtn(ctx, s.text)),
      ctx.first ? adultNote(ctx.mission.parent, ctx.kid.voice) : null,
      nextBtn(ctx.next, s.btn)
    ]);
    speak(ctx, s.text);
  };

  Steps.quiz = function (el, s, ctx) {
    var i = 0;
    var items = s.items;
    function opts(it) {
      if (it.options) return it.options;
      return (s.buttons || []).map(function (b, idx) { return { e: b.e, t: b.t, ok: idx === it.a }; });
    }
    function spoken(it) {
      if (it.say) return it.say;
      if (it.bubble) return 'Робот говорит: ' + it.bubble + ' ' + (s.ask || '');
      return it.q || '';
    }
    function show() {
      clear(el);
      var it = items[i];
      var list = opts(it);
      var fbBox = h('div', { class: 'fb-box' });
      var grid = h('div', { class: 'opts n' + list.length + (list.some(function (o) { return o.e; }) ? ' has-emoji' : '') });
      var card = h('section', { class: 'card center' },
        items.length > 1 ? h('div', { class: 'counter' }, (i + 1) + ' из ' + items.length) : null,
        it.emoji ? h('div', { class: 'hero-emoji pop' + (ctx.kid.voice ? ' xl' : '') }, it.emoji) : null,
        it.post ? h('div', { class: 'post' }, h('div', { class: 'post-who' }, it.post.who), h('div', { class: 'post-text' }, it.post.text)) : null,
        it.bubble ? h('div', { class: 'bubble' }, h('span', { class: 'bubble-bot' }, '🤖'), h('span', null, it.bubble)) : null,
        it.q ? h('div', { class: 'question' }, it.q) : null,
        (it.bubble && s.ask) ? h('div', { class: 'question' }, s.ask) : null,
        speakBtn(ctx, function () { return spoken(it); }));
      var buttons = list.map(function (o) {
        var b = h('button', { class: 'opt', type: 'button' }, o.e ? h('span', { class: 'opt-e' }, o.e) : null, h('span', { class: 'opt-t' }, o.t));
        b.addEventListener('click', function () {
          if (grid.classList.contains('locked')) return;
          grid.classList.add('locked');
          var res = o.ok === true ? true : o.ok === 'half' ? 'half' : false;
          b.classList.add(res === true ? 'right' : res === 'half' ? 'halfright' : 'wrong');
          if (res !== true) buttons.forEach(function (bb, k) { if (list[k].ok === true) bb.classList.add('right'); });
          var allOk = list.every(function (x) { return x.ok === true; });
          var prefix = res === true ? (allOk ? 'Подходит! ' : pick(['Верно! ', 'Правильно! ', 'Точно! '])) : res === 'half' ? 'Почти! ' : 'Не совсем. ';
          var text = prefix + (o.fb || it.x || '');
          fbBox.appendChild(feedback(res, text));
          fbBox.appendChild(nextBtn(function () { i++; if (i < items.length) show(); else ctx.next(); }, i < items.length - 1 ? 'Дальше →' : 'Готово →'));
          speak(ctx, text);
          setTimeout(function () { fbBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 60);
        });
        grid.appendChild(b);
        return b;
      });
      add(el, [card, ctx.first && i === 0 ? adultNote(ctx.mission.parent, ctx.kid.voice) : null, grid, fbBox]);
      speak(ctx, spoken(it));
    }
    show();
  };

  /* Робот и яблоко: программируем стрелками */
  Steps.robotGrid = function (el, s, ctx) {
    var L = 0;
    var DIRS = { up: [-1, 0, '⬆️'], down: [1, 0, '⬇️'], left: [0, -1, '⬅️'], right: [0, 1, '➡️'] };
    function level() {
      clear(el);
      var lv = s.levels[L];
      var prog = [];
      var running = false;
      var pos = lv.start.slice();
      var isWall = function (r, c) { return lv.walls.some(function (w) { return w[0] === r && w[1] === c; }); };
      var grid = h('div', { class: 'rgrid', style: 'grid-template-columns:repeat(' + lv.cols + ',1fr)' });
      var cells = [];
      for (var r = 0; r < lv.rows; r++) for (var c = 0; c < lv.cols; c++) { var cell = h('div', { class: 'rcell' }); cells.push(cell); grid.appendChild(cell); }
      function paint(state) {
        cells.forEach(function (cell, k) {
          var rr = Math.floor(k / lv.cols), cc = k % lv.cols;
          var t = '';
          if (isWall(rr, cc)) t = '🌳';
          else if (rr === lv.goal[0] && cc === lv.goal[1]) t = '🍎';
          var here = rr === pos[0] && cc === pos[1];
          if (here) t = state === 'bump' ? '💥' : state === 'win' ? '🤩' : '🤖';
          cell.textContent = t;
          cell.className = 'rcell' + (here ? ' bot' : '') + (here && state === 'bump' ? ' shake' : '') + (here && state === 'win' ? ' win' : '');
        });
      }
      var progBox = h('div', { class: 'prog', 'aria-live': 'polite' });
      function paintProg(active) {
        clear(progBox);
        if (!prog.length) { progBox.appendChild(h('span', { class: 'muted' }, 'Нажимай стрелки 👇')); return; }
        prog.forEach(function (d, k) { progBox.appendChild(h('span', { class: 'chip-cmd' + (k === active ? ' active' : '') }, DIRS[d][2])); });
      }
      var msg = h('div', { class: 'fb-box' });
      function setMsg(kind, text) { clear(msg); if (text) msg.appendChild(feedback(kind, text)); speak(ctx, text); }
      function arrow(d) {
        return h('button', { class: 'btn arrow', type: 'button', 'aria-label': d, onclick: function () {
          if (running || prog.length >= 12) return;
          prog.push(d); paintProg(); clear(msg);
          if (pos[0] !== lv.start[0] || pos[1] !== lv.start[1]) { pos = lv.start.slice(); paint(); }
        } }, DIRS[d][2]);
      }
      var undo = h('button', { class: 'btn arrow small', type: 'button', 'aria-label': 'Убрать последнюю', onclick: function () { if (running) return; prog.pop(); paintProg(); } }, '⌫');
      var go = h('button', { class: 'btn primary wide', type: 'button' }, '▶️ Поехали!');
      var wipe = h('button', { class: 'btn ghost wide', type: 'button', onclick: function () { if (running) return; prog = []; pos = lv.start.slice(); paint(); paintProg(); clear(msg); } }, '🗑️ Стереть всё');
      go.addEventListener('click', function () {
        if (running) return;
        if (!prog.length) { setMsg(false, 'Сначала нажми стрелки — скажи роботу, куда идти.'); return; }
        running = true; clear(msg);
        pos = lv.start.slice(); paint();
        var k = 0;
        (function tick() {
          if (k >= prog.length) {
            running = false; paintProg();
            setMsg('half', 'Робот остановился, а яблоко ещё не у него. Добавь шагов!');
            return;
          }
          var d = DIRS[prog[k]];
          var nr = pos[0] + d[0], nc = pos[1] + d[1];
          paintProg(k);
          if (nr < 0 || nc < 0 || nr >= lv.rows || nc >= lv.cols || isWall(nr, nc)) {
            paint('bump'); running = false;
            setMsg(false, 'Бум! Робот врезался. Он сделал ровно то, что ты сказал. Давай поправим!');
            return;
          }
          pos = [nr, nc];
          if (nr === lv.goal[0] && nc === lv.goal[1]) {
            paint('win'); running = false;
            setMsg(true, 'Ура! Робот нашёл яблоко!');
            msg.appendChild(nextBtn(function () { L++; if (L < s.levels.length) level(); else ctx.next(); }, L < s.levels.length - 1 ? 'Следующий уровень →' : 'Дальше →'));
            return;
          }
          paint(); k++;
          setTimeout(tick, 480);
        })();
      });
      paint(); paintProg();
      var sb = speakBtn(ctx, lv.say);
      if (sb) sb.classList.add('sm');
      add(el, [
        h('div', { class: 'counter level-row' }, h('span', null, 'Уровень ' + (L + 1) + ' из ' + s.levels.length), sb),
        h('section', { class: 'card tight' }, grid),
        progBox,
        h('div', { class: 'pad' },
          h('span', null), arrow('up'), h('span', null),
          arrow('left'), undo, arrow('right'),
          h('span', null), arrow('down'), h('span', null)),
        go, msg, wipe
      ]);
      speak(ctx, lv.say);
    }
    level();
  };

  /* Научи робота: обучение на примерах */
  Steps.teachRobot = function (el, s, ctx) {
    var FRUITS = [['🍎', 'яблоко'], ['🍌', 'банан'], ['🍐', 'груша'], ['🍊', 'апельсин'], ['🍇', 'виноград'], ['🍓', 'клубника'], ['🍉', 'арбуз'], ['🍒', 'вишня']];
    var TOYS = [['🧸', 'мишка'], ['⚽', 'мячик'], ['🎈', 'шарик'], ['🚂', 'паровозик'], ['🎲', 'кубик'], ['🚗', 'машинка'], ['🛴', 'самокат'], ['🥁', 'барабан']];
    var LABEL = { eat: { e: '😋', t: 'Скушать' }, play: { e: '🤸', t: 'Играть' } };
    function start() {
      var f = shuffle(FRUITS).map(function (x) { return { e: x[0], n: x[1], cat: 'eat' }; });
      var t = shuffle(TOYS).map(function (x) { return { e: x[0], n: x[1], cat: 'play' }; });
      var train = shuffle(f.slice(0, 3).concat(t.slice(0, 3)));
      var test = shuffle(f.slice(3, 5).concat(t.slice(3, 5)));
      var learned = [];
      var i = 0;

      function brain() {
        var shelf = function (cat) {
          return h('div', { class: 'shelf' }, h('div', { class: 'shelf-h' }, LABEL[cat].e + ' ' + LABEL[cat].t),
            h('div', { class: 'shelf-items' }, learned.filter(function (l) { return l.label === cat; }).map(function (l) { return h('span', null, l.e); })));
        };
        return h('div', { class: 'brain' }, h('div', { class: 'brain-h' }, '🤖 Память робота'), h('div', { class: 'shelves' }, shelf('eat'), shelf('play')));
      }
      function trainStep() {
        clear(el);
        var it = train[i];
        var say = 'Это ' + it.n + '. Можно скушать или с этим играть?';
        var choose = function (cat) {
          learned.push({ e: it.e, n: it.n, cat: it.cat, label: cat });
          i++;
          if (i < train.length) trainStep(); else ready();
        };
        add(el, [
          h('div', { class: 'counter center' }, 'Учим робота: ' + (i + 1) + ' из ' + train.length),
          h('section', { class: 'card center' }, h('div', { class: 'hero-emoji xl pop' }, it.e), h('div', { class: 'question' }, 'Это ' + it.n + '.'), speakBtn(ctx, say)),
          ctx.first && i === 0 ? adultNote(ctx.mission.parent, true) : null,
          h('div', { class: 'opts n2 has-emoji' },
            h('button', { class: 'opt', type: 'button', onclick: function () { choose('eat'); } }, h('span', { class: 'opt-e' }, LABEL.eat.e), h('span', { class: 'opt-t' }, 'Можно скушать')),
            h('button', { class: 'opt', type: 'button', onclick: function () { choose('play'); } }, h('span', { class: 'opt-e' }, LABEL.play.e), h('span', { class: 'opt-t' }, 'Можно играть'))),
          brain()
        ]);
        speak(ctx, say);
      }
      function ready() {
        clear(el);
        var t1 = 'Я всё запомнил! Теперь проверь меня: я буду угадывать сам.';
        add(el, [h('section', { class: 'card center' }, h('div', { class: 'hero-emoji pop' }, '🤖'), h('div', { class: 'bubble' }, h('span', null, t1)), speakBtn(ctx, t1)), brain(), nextBtn(function () { i = 0; testStep(); }, 'Проверить робота →')]);
        speak(ctx, t1);
      }
      function guess(cat) {
        var eat = 0, play = 0;
        learned.forEach(function (l) { if (l.cat === cat) { if (l.label === 'eat') eat++; else play++; } });
        if (eat === play) return cat;
        return eat > play ? 'eat' : 'play';
      }
      var robotWrong = 0;
      function testStep() {
        clear(el);
        var it = test[i];
        var g = guess(it.cat);
        var right = g === it.cat;
        if (!right) robotWrong++;
        var line = g === 'eat' ? 'Я думаю, это можно скушать!' : 'Я думаю, с этим можно играть!';
        var truth = it.cat === 'eat' ? 'это можно скушать' : 'с этим играют';
        var fbBox = h('div', { class: 'fb-box' });
        var grid = h('div', { class: 'opts n2 has-emoji' });
        var answer = function (saysRight, btn) {
          if (grid.classList.contains('locked')) return;
          grid.classList.add('locked');
          var good = saysRight === right;
          btn.classList.add(good ? 'right' : 'wrong');
          var txt;
          if (right && saysRight) txt = 'Да! Робот угадал — ты хорошо его научил.';
          else if (right) txt = 'Посмотри: ' + it.n + ' — ' + truth + '. Робот угадал правильно!';
          else if (!saysRight) txt = 'Верно, робот ошибся! Он учился на твоих примерах.';
          else txt = 'Ой, посмотри: ' + it.n + ' — ' + truth + '. Робот ошибся, он учился на твоих примерах.';
          fbBox.appendChild(feedback(good, txt));
          fbBox.appendChild(nextBtn(function () { i++; if (i < test.length) testStep(); else summary(); }));
          speak(ctx, txt);
        };
        var b1 = h('button', { class: 'opt', type: 'button' }, h('span', { class: 'opt-e' }, '👍'), h('span', { class: 'opt-t' }, 'Прав'));
        var b2 = h('button', { class: 'opt', type: 'button' }, h('span', { class: 'opt-e' }, '👎'), h('span', { class: 'opt-t' }, 'Ошибся'));
        b1.addEventListener('click', function () { answer(true, b1); });
        b2.addEventListener('click', function () { answer(false, b2); });
        add(grid, [b1, b2]);
        var say = 'Робот смотрит на картинку. ' + line + ' Робот прав?';
        add(el, [
          h('div', { class: 'counter center' }, 'Проверяем: ' + (i + 1) + ' из ' + test.length),
          h('section', { class: 'card center' }, h('div', { class: 'hero-emoji xl pop' }, it.e), h('div', { class: 'bubble' }, h('span', { class: 'bubble-bot' }, '🤖'), h('span', null, line)), h('div', { class: 'question' }, 'Робот прав?'), speakBtn(ctx, say)),
          grid, fbBox
        ]);
        speak(ctx, say);
      }
      function summary() {
        clear(el);
        var mistakes = learned.filter(function (l) { return l.label !== l.cat; });
        var txt = mistakes.length
          ? 'Смотри, в памяти робота есть ошибка: ' + mistakes.map(function (m) { return m.n; }).join(', ') + ' — не на той полке. ' + (robotWrong ? 'Поэтому робот и ошибся. ' : '') + 'Машина учится у того, кто её учит!'
          : 'Ты научил робота правильно, и он угадал сам! А если научить машину неправильно, она тоже будет ошибаться. Хочешь проверить? Научи робота нарочно с ошибками!';
        add(el, [
          h('section', { class: 'card center' }, h('div', { class: 'hero-emoji pop' }, mistakes.length ? '🤖💡' : '🤖⭐'), h('div', { class: 'big-text' }, h('p', null, txt)), speakBtn(ctx, txt)),
          brain(),
          h('button', { class: 'btn ghost wide', type: 'button', onclick: start }, '🔁 Научить заново'),
          nextBtn(ctx.next)
        ]);
        speak(ctx, txt);
      }
      trainStep();
    }
    start();
  };

  /* Сравни две просьбы */
  Steps.compare = function (el, s, ctx) {
    var i = 0;
    function show() {
      clear(el);
      var r = s.rounds[i];
      var fbBox = h('div', { class: 'fb-box' });
      var wrap = h('div', { class: 'compare' });
      var cards = ['a', 'b'].map(function (key) {
        var ans = h('div', { class: 'answer hidden' }, h('div', { class: 'answer-h' }, '🤖 Ответ ИИ'), h('div', null, key === 'a' ? r.ansA : r.ansB));
        var c = h('button', { class: 'prompt-card', type: 'button' }, h('div', { class: 'prompt-h' }, 'Просьба ' + (key === 'a' ? 'А' : 'Б')), h('div', { class: 'prompt-t' }, '«' + r[key] + '»'));
        var box = h('div', { class: 'cmp-item' }, c, ans);
        c.addEventListener('click', function () {
          if (wrap.classList.contains('locked')) return;
          wrap.classList.add('locked');
          var good = key === r.best;
          c.classList.add(good ? 'right' : 'wrong');
          cards.forEach(function (x) { x.ans.classList.remove('hidden'); if (x.key === r.best) x.box.classList.add('best'); });
          fbBox.appendChild(feedback(good, (good ? 'Точно! ' : 'Посмотри на ответы. ') + r.why));
          fbBox.appendChild(nextBtn(function () { i++; if (i < s.rounds.length) show(); else ctx.next(); }));
        });
        wrap.appendChild(box);
        return { key: key, ans: ans, box: box };
      });
      add(el, [h('div', { class: 'counter center' }, 'Раунд ' + (i + 1) + ' из ' + s.rounds.length), h('div', { class: 'question center' }, 'После какой просьбы ответ будет лучше?'), wrap, fbBox]);
    }
    show();
  };

  /* Конструктор просьбы (Яся) */
  Steps.builder = function (el, s, ctx) {
    var sel = s.groups.map(function () { return -1; });
    var free = h('input', { class: 'input', type: 'text', placeholder: s.freeHint || '', maxlength: '120' });
    var out = h('div', { class: 'prompt-out' });
    var stars = h('div', { class: 'stars' });
    var copyB = h('button', { class: 'btn', type: 'button' }, '📋 Скопировать');
    function text() {
      var parts = sel.map(function (k, g) { return k >= 0 ? s.groups[g].options[k] : null; }).filter(Boolean);
      var f = free.value.trim();
      if (f) parts.push(f.charAt(0).toUpperCase() + f.slice(1) + (/[.!?]$/.test(f) ? '' : '.'));
      return parts.join(' ');
    }
    function update() {
      var t = text();
      out.textContent = t || 'Выбирай карточки — и здесь появится твоя просьба.';
      out.classList.toggle('empty', !t);
      var n = sel.filter(function (k) { return k >= 0; }).length + (free.value.trim() ? 1 : 0);
      var msgs = ['', 'Неплохо, но ИИ придётся гадать.', 'Уже лучше!', 'Отличная просьба!', 'Суперпросьба!'];
      stars.textContent = '';
      add(stars, [h('span', { class: 'stars-row' }, '⭐'.repeat(n) + '☆'.repeat(4 - n)), h('span', null, msgs[n])]);
      copyB.disabled = sel[0] < 0;
    }
    var groups = s.groups.map(function (g, gi) {
      var chips = g.options.map(function (o, k) {
        var c = h('button', { class: 'chip', type: 'button' }, o);
        c.addEventListener('click', function () {
          sel[gi] = sel[gi] === k ? -1 : k;
          chips.forEach(function (cc, kk) { cc.classList.toggle('on', kk === sel[gi]); });
          update();
        });
        return c;
      });
      return h('div', { class: 'group' }, h('div', { class: 'group-h' }, (gi + 1) + '. ' + g.label), h('div', { class: 'chips' }, chips));
    });
    free.addEventListener('input', update);
    copyB.addEventListener('click', function () { copyText(text(), copyB); });
    add(el, [
      h('section', { class: 'card' }, groups, h('div', { class: 'group' }, h('div', { class: 'group-h' }, '4. ' + s.freeLabel), free)),
      h('section', { class: 'card' }, h('div', { class: 'group-h' }, '✨ Твоя просьба'), out, stars, copyB, s.note ? h('p', { class: 'muted small' }, s.note) : null),
      nextBtn(ctx.next)
    ]);
    update();
  };

  /* Найди ошибку в ответе ИИ */
  Steps.findError = function (el, s, ctx) {
    var i = 0;
    function show() {
      clear(el);
      var r = s.rounds[i];
      var fbBox = h('div', { class: 'fb-box' });
      var hintBox = h('div', { class: 'muted small center' }, 'Нажми на предложение с ошибкой');
      var found = false;
      var sentences = r.s.map(function (t, k) {
        var b = h('button', { class: 'sent', type: 'button' }, t);
        b.addEventListener('click', function () {
          if (found || b.classList.contains('checked')) return;
          if (k === r.wrong) {
            found = true; b.classList.add('found');
            hintBox.textContent = '';
            fbBox.appendChild(feedback(true, 'Нашла! ' + r.x));
            fbBox.appendChild(nextBtn(function () { i++; if (i < s.rounds.length) show(); else ctx.next(); }));
          } else {
            b.classList.add('checked');
            hintBox.textContent = 'Это правда ✓ Ищи дальше!';
          }
        });
        return b;
      });
      add(el, [
        h('div', { class: 'counter center' }, 'Ответ ' + (i + 1) + ' из ' + s.rounds.length),
        h('div', { class: 'chat' },
          h('div', { class: 'msg me' }, r.q),
          h('div', { class: 'msg ai' }, h('div', { class: 'msg-h' }, '🤖 ИИ'), sentences)),
        hintBox, fbBox
      ]);
    }
    show();
  };

  /* Сказка вместе (Яся) */
  Steps.story = function (el, s, ctx) {
    var HEROES = [{ e: '🐱', n: 'Кот Пушок', f: false }, { e: '🦊', n: 'Лисичка Соня', f: true }, { e: '🤖', n: 'Робот Винтик', f: false }, { e: '🧚', n: 'Фея Искорка', f: true }];
    var PLACES = [{ e: '🚀', t: 'на космическую станцию' }, { e: '🐠', t: 'в подводный город' }, { e: '🌲', t: 'в волшебный лес' }, { e: '🏰', t: 'в старинный замок' }];
    var TROUBLES = [{ e: '🎨', t: 'все краски в мире вдруг стали серыми' }, { e: '🧭', t: 'сломался волшебный компас, и все заблудились' }, { e: '🔇', t: 'у лучшего друга пропал голос' }];
    var st = {};
    var g = function (m, f) { return st.hero.f ? f : m; };
    function chooser(title, list, label, onPick) {
      clear(el);
      add(el, [
        h('div', { class: 'question center' }, title),
        h('div', { class: 'opts n2 has-emoji' }, list.map(function (x) {
          return h('button', { class: 'opt', type: 'button', onclick: function () { onPick(x); } }, h('span', { class: 'opt-e' }, x.e), h('span', { class: 'opt-t' }, label(x)));
        }))
      ]);
    }
    function stepHero() { chooser('Кто будет героем?', HEROES, function (x) { return x.n; }, function (x) { st.hero = x; stepPlace(); }); }
    function stepPlace() { chooser('Куда отправится ' + st.hero.n + '?', PLACES, function (x) { return x.t; }, function (x) { st.place = x; stepTrouble(); }); }
    function stepTrouble() { chooser('Какая случилась беда?', TROUBLES, function (x) { return x.t; }, function (x) { st.trouble = x; stepHelp(); }); }
    function stepHelp() {
      clear(el);
      var ideas = shuffle([
        st.hero.n + ' ' + g('решил', 'решила') + ' найти мудрую сову, которая знает все тайны.',
        st.hero.n + ' ' + g('собрал', 'собрала') + ' друзей, и они вместе придумали хитрый план.',
        st.hero.n + ' ' + g('нашёл', 'нашла') + ' старую карту с загадочным крестиком.'
      ]).slice(0, 2);
      var own = h('textarea', { class: 'input', rows: '3', placeholder: 'Что сделал герой? Напиши своими словами…', maxlength: '300' });
      var ownBox = h('div', { class: 'hidden' }, own, h('button', { class: 'btn primary wide', type: 'button', onclick: function () {
        var t = own.value.trim(); if (!t) { own.focus(); return; }
        st.help = { t: t, me: true }; stepEnd();
      } }, 'Готово →'));
      add(el, [
        h('section', { class: 'card' }, h('div', { class: 'msg-h' }, '🤖 Помощник предлагает:'),
          ideas.map(function (t) { return h('button', { class: 'idea', type: 'button', onclick: function () { st.help = { t: t, me: false }; stepEnd(); } }, '💡 ' + t); })),
        h('button', { class: 'btn ghost wide', type: 'button', onclick: function () { ownBox.classList.remove('hidden'); own.focus(); } }, '✍️ Придумаю сама'),
        ownBox
      ]);
    }
    function stepEnd() {
      clear(el);
      var hint = 'В конце все поняли, что вместе можно справиться с любой бедой, и устроили большой праздник.';
      var ta = h('textarea', { class: 'input', rows: '4', placeholder: 'Чем всё закончилось?', maxlength: '400' });
      add(el, [
        h('div', { class: 'question center' }, 'Чем всё закончилось? Придумай сама!'),
        ta,
        h('button', { class: 'btn ghost wide', type: 'button', onclick: function () { ta.value = hint; } }, '💡 Подсказка помощника'),
        h('button', { class: 'btn primary wide', type: 'button', onclick: function () {
          var t = ta.value.trim();
          st.end = t ? { t: t, me: t !== hint } : { t: hint, me: false };
          final();
        } }, 'Собрать сказку →')
      ]);
    }
    function final() {
      clear(el);
      var hero = st.hero;
      var parts = [
        { t: g('Жил-был', 'Жила-была') + ' ' + hero.n + '. Однажды ' + g('он', 'она') + ' ' + g('отправился', 'отправилась') + ' ' + st.place.t + '.', me: true },
        { t: 'И тут случилась беда: ' + st.trouble.t + '.', me: true },
        st.help,
        st.end
      ];
      var mine = parts.filter(function (p) { return p.me; }).length;
      var full = parts.map(function (p) { return p.t; }).join(' ');
      var copyB = h('button', { class: 'btn', type: 'button', onclick: function () { copyText(full, copyB); } }, '📋 Скопировать сказку');
      add(el, [
        h('section', { class: 'card story' }, h('div', { class: 'story-h' }, hero.e + ' ' + hero.n),
          parts.map(function (p) { return h('p', { class: p.me ? 'mine' : 'ai' }, p.t); })),
        h('div', { class: 'legend' }, h('span', { class: 'mine' }, 'твоё'), h('span', { class: 'ai' }, 'помощник')),
        feedback(true, 'Твоих идей в сказке: ' + mine + ' из ' + parts.length + '. ' + (mine >= 3 ? 'Ты настоящий автор!' : 'В следующий раз попробуй придумать ещё больше сама!')),
        copyB,
        nextBtn(ctx.next)
      ]);
    }
    stepHero();
  };

  /* Температура: как модель выбирает слово (Еся) */
  Steps.temperature = function (el, s, ctx) {
    var T = 0.8;
    var history = [];
    var modes = [{ t: '❄️ Точно', v: 0 }, { t: '🙂 Обычно', v: 0.8 }, { t: '🔥 Фантазёр', v: 1.8 }];
    var bars = h('div', { class: 'bars' });
    var sentence = h('div', { class: 'gen-sentence' });
    var hist = h('div', { class: 'hist' });
    function probs() {
      var base = s.words.map(function (w) { return w[1] / 100; });
      if (T === 0) { var mx = Math.max.apply(null, base); return base.map(function (p) { return p === mx ? 1 : 0; }); }
      var adj = base.map(function (p) { return Math.pow(p, 1 / T); });
      var sum = adj.reduce(function (a, b) { return a + b; }, 0);
      return adj.map(function (p) { return p / sum; });
    }
    function paint() {
      clear(bars);
      probs().forEach(function (p, k) {
        var pct = Math.round(p * 1000) / 10;
        bars.appendChild(h('div', { class: 'bar-row' },
          h('span', { class: 'bar-w' }, s.words[k][0]),
          h('span', { class: 'bar-track' }, h('span', { class: 'bar-fill', style: 'width:' + Math.max(p * 100, p > 0 ? 1.5 : 0) + '%' })),
          h('span', { class: 'bar-p' }, (pct < 1 && pct > 0 ? '<1' : Math.round(pct)) + '%')));
      });
    }
    function generate() {
      var ps = probs(); var r = Math.random(); var acc = 0; var k = 0;
      for (; k < ps.length; k++) { acc += ps[k]; if (r <= acc) break; }
      if (k >= ps.length) k = ps.length - 1;
      var w = s.words[k][0];
      clear(sentence); add(sentence, [s.prefix + ' ', h('b', { class: 'pop' }, w), '.']);
      history.unshift(w); if (history.length > 8) history.pop();
      clear(hist); history.forEach(function (x) { hist.appendChild(h('span', { class: 'chip small on' }, x)); });
    }
    var modeBtns = modes.map(function (m) {
      var b = h('button', { class: 'seg' + (m.v === T ? ' on' : ''), type: 'button' }, m.t);
      b.addEventListener('click', function () { T = m.v; modeBtns.forEach(function (x) { x.classList.remove('on'); }); b.classList.add('on'); paint(); });
      return b;
    });
    clear(sentence); add(sentence, [s.prefix + ' ', h('b', null, '…')]);
    add(el, [
      h('section', { class: 'card' },
        h('div', { class: 'group-h' }, 'Какое слово будет следующим?'),
        sentence,
        h('div', { class: 'muted small' }, 'Вероятности слов:'),
        bars,
        h('div', { class: 'group-h' }, 'Уровень фантазии (его называют «температура»)'),
        h('div', { class: 'segs' }, modeBtns),
        h('button', { class: 'btn primary wide', type: 'button', onclick: generate }, '🎲 Сгенерировать'),
        hist),
      h('div', { class: 'fb half' }, 'Нажми «Сгенерировать» несколько раз в каждом режиме. «Точно» — всегда одно и то же слово. «Фантазёр» — чаще выпадает странное. Так у ИИ появляются и креативные идеи, и ерунда.'),
      nextBtn(ctx.next)
    ]);
    paint();
  };

  /* Формула РКЗФ (Еся) */
  Steps.formula = function (el, s, ctx) {
    var NAMES = ['Роль', 'Контекст', 'Задача', 'Формат'];
    var i = 0;
    function show() {
      clear(el);
      var sc = s.scenarios[i];
      var sel = [-1, -1, -1, -1];
      var orders = sc.parts.map(function (p) { return shuffle(p.map(function (_, k) { return k; })); });
      var checkB = h('button', { class: 'btn primary wide', type: 'button', disabled: true }, 'Проверить');
      var fbBox = h('div', { class: 'fb-box' });
      var groupEls = sc.parts.map(function (opts, gi) {
        var whyBox = h('div', { class: 'why' });
        var chips = orders[gi].map(function (k) {
          var c = h('button', { class: 'chip block', type: 'button' }, opts[k].t);
          c.addEventListener('click', function () {
            if (checkB.dataset.done) return;
            sel[gi] = k;
            chips.forEach(function (cc) { cc.classList.remove('on'); }); c.classList.add('on');
            checkB.disabled = sel.some(function (x) { return x < 0; });
          });
          c._k = k;
          return c;
        });
        return { el: h('div', { class: 'group' }, h('div', { class: 'group-h' }, NAMES[gi]), h('div', { class: 'chips col' }, chips), whyBox), chips: chips, why: whyBox };
      });
      checkB.addEventListener('click', function () {
        if (checkB.dataset.done) return;
        checkB.dataset.done = '1'; checkB.classList.add('hidden');
        var score = 0;
        groupEls.forEach(function (g, gi) {
          var opts = sc.parts[gi];
          g.chips.forEach(function (c) {
            if (opts[c._k].ok) c.classList.add('right');
            else if (c._k === sel[gi]) c.classList.add('wrong');
          });
          if (opts[sel[gi]].ok) score++;
          else g.why.textContent = '✗ ' + opts[sel[gi]].why;
        });
        var best = sc.parts.map(function (p) { return p.filter(function (o) { return o.ok; })[0].t; }).join(' ');
        fbBox.appendChild(feedback(score === 4 ? true : score >= 2 ? 'half' : false, 'Попаданий: ' + score + ' из 4. ' + (score === 4 ? 'Ты как профи!' : 'Посмотри подсказки под карточками.')));
        fbBox.appendChild(h('div', { class: 'prompt-out' }, best));
        if (sc.note) fbBox.appendChild(h('p', { class: 'small' }, sc.note));
        fbBox.appendChild(nextBtn(function () { i++; if (i < s.scenarios.length) show(); else ctx.next(); }));
      });
      add(el, [
        h('div', { class: 'counter center' }, 'Задание ' + (i + 1) + ' из ' + s.scenarios.length),
        h('section', { class: 'card' },
          h('div', { class: 'group-h' }, '🎯 ' + sc.goal),
          h('div', { class: 'weak' }, 'Слабый запрос: «' + sc.weak + '»'),
          h('div', { class: 'muted small' }, 'Выбери лучшую карточку в каждой части:')),
        groupEls.map(function (g) { return g.el; }),
        checkB, fbBox
      ]);
    }
    show();
  };

  /* Свободный запрос по РКЗФ (Еся) */
  Steps.freeform = function (el, s, ctx) {
    var inputs = s.fields.map(function (f) { return h('textarea', { class: 'input', rows: '2', placeholder: f.hint, maxlength: '300' }); });
    var out = h('div', { class: 'prompt-out empty' }, 'Заполни поля — запрос соберётся здесь.');
    var copyB = h('button', { class: 'btn', type: 'button', disabled: true }, '📋 Скопировать');
    function text() {
      return inputs.map(function (inp) {
        var v = inp.value.trim(); if (!v) return '';
        return v + (/[.!?]$/.test(v) ? '' : '.');
      }).filter(Boolean).join(' ');
    }
    inputs.forEach(function (inp) {
      inp.addEventListener('input', function () {
        var t = text();
        out.textContent = t || 'Заполни поля — запрос соберётся здесь.';
        out.classList.toggle('empty', !t);
        copyB.disabled = !t;
      });
    });
    copyB.addEventListener('click', function () { copyText(text(), copyB); });
    add(el, [
      h('section', { class: 'card' }, h('div', { class: 'group-h' }, s.title),
        s.fields.map(function (f, k) { return h('label', { class: 'field' }, h('span', { class: 'field-l' }, f.label), inputs[k]); })),
      h('section', { class: 'card' }, h('div', { class: 'group-h' }, '✨ Твой запрос'), out, copyB, s.note ? h('p', { class: 'muted small' }, s.note) : null),
      nextBtn(ctx.next)
    ]);
  };

  /* Репетитор: наводящие вопросы (Еся) */
  Steps.tutor = function (el, s, ctx) {
    var log = h('div', { class: 'chat' });
    var input = h('input', { class: 'input', type: 'text', inputmode: 'numeric', placeholder: 'Твой ответ', autocomplete: 'off' });
    var send = h('button', { class: 'btn primary', type: 'button' }, 'Ответить');
    var row = h('div', { class: 'answer-row' }, input, send);
    var end = h('div', { class: 'fb-box' });
    var k = 0, tries = 0;
    function ai(text) { log.appendChild(h('div', { class: 'msg ai' }, h('div', { class: 'msg-h' }, '🎓 Репетитор'), text)); }
    function me(text) { log.appendChild(h('div', { class: 'msg me' }, text)); }
    function scroll() { setTimeout(function () { row.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 50); }
    function submit() {
      var v = input.value.trim().replace(',', '.');
      if (!v) { input.focus(); return; }
      me(v); input.value = '';
      var st = s.steps[k];
      if (Number(v) === st.answer) {
        k++; tries = 0;
        if (k < s.steps.length) ai(pick(['Да! ', 'Точно! ', 'Верно! ']) + s.steps[k].ask);
        else {
          ai(s.finish);
          row.classList.add('hidden');
          end.appendChild(nextBtn(ctx.next));
          confetti();
        }
      } else {
        tries++;
        if (tries < 3) ai('Хм, не совсем. Подсказка: ' + st.hint);
        else { ai('Правильно будет ' + st.answer + '. Ничего страшного — идём дальше!'); k++; tries = 0; if (k < s.steps.length) ai(s.steps[k].ask); else { ai(s.finish); row.classList.add('hidden'); end.appendChild(nextBtn(ctx.next)); } }
      }
      scroll();
    }
    send.addEventListener('click', submit);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') submit(); });
    me('Помоги решить задачу: ' + s.problem);
    ai('С удовольствием! Но решать будешь ты, а я буду задавать вопросы. ' + s.steps[0].ask);
    add(el, [log, row, end]);
  };

  /* Копируемая карточка-промпт */
  Steps.copy = function (el, s, ctx) {
    var copyB = h('button', { class: 'btn', type: 'button' }, '📋 Скопировать');
    copyB.addEventListener('click', function () { copyText(s.text, copyB); });
    add(el, [
      h('section', { class: 'card' },
        h('div', { class: 'group-h' }, (s.emoji || '📋') + ' ' + s.title),
        h('div', { class: 'prompt-out' }, s.text),
        copyB,
        s.note ? h('p', { class: 'muted small' }, s.note) : null),
      nextBtn(ctx.next)
    ]);
  };

  /* Конструктор своего помощника (Еся) */
  Steps.assistant = function (el, s, ctx) {
    var st = { name: 'Бублик', role: 0, char: 1, always: {}, never: {}, fmt: 0 };
    var nameIn = h('input', { class: 'input', type: 'text', value: st.name, maxlength: '30' });
    function single(list, key) {
      var chips = list.map(function (t, k) {
        var c = h('button', { class: 'chip' + (st[key] === k ? ' on' : ''), type: 'button' }, t);
        c.addEventListener('click', function () { st[key] = k; chips.forEach(function (x, j) { x.classList.toggle('on', j === k); }); refresh(); });
        return c;
      });
      return h('div', { class: 'chips' }, chips);
    }
    function multi(list, key) {
      return h('div', { class: 'chips col' }, list.map(function (t, k) {
        var c = h('button', { class: 'chip block check', type: 'button' }, t);
        c.addEventListener('click', function () { st[key][k] = !st[key][k]; c.classList.toggle('on', !!st[key][k]); refresh(); });
        return c;
      }));
    }
    function chosen(list, key) { return list.filter(function (_, k) { return st[key][k]; }); }
    function instruction() {
      var name = nameIn.value.trim() || 'Помощник';
      var lines = ['Ты — ' + name + ', мой ' + s.roles[st.role] + '.', 'Характер: ' + s.chars[st.char] + '.'];
      var al = chosen(s.always, 'always'), nv = chosen(s.never, 'never');
      if (al.length) { lines.push('', 'Всегда:'); al.forEach(function (t) { lines.push('— ' + t + '.'); }); }
      if (nv.length) { lines.push('', 'Никогда:'); nv.forEach(function (t) { lines.push('— ' + t + '.'); }); }
      lines.push('', 'Формат ответов: ' + s.formats[st.fmt].replace(/ 🙂$/, '') + '.');
      return lines.join('\n');
    }
    var out = h('div', { class: 'prompt-out pre' });
    var tests = h('div', { class: 'tests' });
    var copyB = h('button', { class: 'btn', type: 'button' }, '📋 Скопировать инструкцию');
    copyB.addEventListener('click', function () { copyText(instruction(), copyB); });
    function refresh() {
      out.textContent = instruction();
      clear(tests);
      var rules = chosen(s.always, 'always').concat(chosen(s.never, 'never'));
      var passed = 0;
      s.tests.forEach(function (t, k) {
        var ok = rules.indexOf(t.rule) >= 0;
        if (ok) passed++;
        tests.appendChild(h('div', { class: 'test' },
          h('div', { class: 'test-h' }, 'Тест ' + (k + 1)),
          h('div', { class: 'msg me' }, t.msg),
          h('div', { class: 'msg ai' }, h('div', { class: 'msg-h' }, '🤖 ' + (nameIn.value.trim() || 'Помощник')), ok ? t.good : t.bad),
          h('div', { class: 'verdict ' + (ok ? 'ok' : 'bad') }, ok ? '✅ Помощник справился!' : '⚠️ ' + t.warn)));
      });
      score.textContent = 'Тестов пройдено: ' + passed + ' из ' + s.tests.length + (passed === s.tests.length ? ' — помощник готов к работе! 🚀' : '');
      score.className = 'fb ' + (passed === s.tests.length ? 'ok' : 'half');
    }
    var score = h('div', { class: 'fb half' });
    nameIn.addEventListener('input', refresh);
    add(el, [
      h('section', { class: 'card' },
        h('label', { class: 'field' }, h('span', { class: 'field-l' }, '1. Имя помощника'), nameIn),
        h('div', { class: 'group' }, h('div', { class: 'group-h' }, '2. Кто он'), single(s.roles, 'role')),
        h('div', { class: 'group' }, h('div', { class: 'group-h' }, '3. Характер'), single(s.chars, 'char')),
        h('div', { class: 'group' }, h('div', { class: 'group-h' }, '4. Правила: всегда'), multi(s.always, 'always')),
        h('div', { class: 'group' }, h('div', { class: 'group-h' }, '5. Правила: никогда'), multi(s.never, 'never')),
        h('div', { class: 'group' }, h('div', { class: 'group-h' }, '6. Формат ответов'), single(s.formats, 'fmt'))),
      h('section', { class: 'card' }, h('div', { class: 'group-h' }, '📄 Инструкция (скилл)'), out, copyB),
      h('div', { class: 'group-h center' }, '🧪 Проверка на тестах'),
      h('p', { class: 'muted small center' }, 'Меняй правила выше — ответы помощника меняются.'),
      tests, score,
      nextBtn(ctx.next)
    ]);
    refresh();
  };

  /* Миссия со взрослым */
  Steps.offline = function (el, s, ctx) {
    add(el, [
      h('section', { class: 'card offline' },
        h('div', { class: 'tag' }, '🤝 Миссия со взрослым'),
        h('div', { class: 'hero-emoji pop' }, s.emoji || '🤝'),
        h('div', { class: 'group-h center' }, s.title),
        h('div', { class: 'big-text' }, paras(s.text)),
        speakBtn(ctx, s.text),
        s.link ? h('a', { class: 'btn wide', href: s.link.href, target: '_blank', rel: 'noopener' }, '↗ ' + s.link.t) : null),
      adultNote(s.adult, true),
      nextBtn(ctx.next, 'Сделали! →'),
      h('button', { class: 'btn ghost wide', type: 'button', onclick: ctx.next }, 'Сделаем потом')
    ]);
    speak(ctx, s.text);
  };

  /* Итог миссии */
  Steps.lesson = function (el, s, ctx) {
    var kid = ctx.kid, m = ctx.mission;
    var before = Store.count(kid);
    Store.complete(kid.id, m.id);
    var after = Store.count(kid);
    var all = after === kid.missions.length;
    var idx = kid.missions.indexOf(m);
    var nextM = kid.missions[idx + 1];
    add(el, [
      h('section', { class: 'card center done' },
        h('div', { class: 'star-burst pop' }, '⭐'),
        h('div', { class: 'tag' }, 'Миссия пройдена!'),
        s.emoji ? h('div', { class: 'hero-emoji' }, s.emoji) : null,
        h('div', { class: 'big-text' }, paras(s.text)),
        speakBtn(ctx, s.text)),
      (all && before < after) ? h('section', { class: 'card center badge' }, h('div', { class: 'hero-emoji pop' }, kid.badge.e), h('div', { class: 'group-h' }, 'Все миссии острова пройдены!'), h('div', null, 'Звание: «' + kid.badge.t + '»')) : null,
      nextM ? h('a', { class: 'btn primary wide', href: '#/m/' + kid.id + '/' + nextM.id }, 'Следующая миссия: ' + nextM.title + ' →') : null,
      h('a', { class: 'btn wide' + (nextM ? ' ghost' : ' primary'), href: '#/kid/' + kid.id }, 'На ' + (kid.id === 'esya' ? 'базу' : 'остров'))
    ]);
    confetti();
    speak(ctx, 'Миссия пройдена! ' + s.text);
  };

  /* ───────── экраны ───────── */
  function setTheme(t) { document.documentElement.setAttribute('data-theme', t || 'home'); }
  function kidById(id) { return A.kids.filter(function (k) { return k.id === id; })[0]; }

  /* ───────── общий вход: кто играет → куда пойдём ───────── */
  var LEVELS = [[0, 'Новичок'], [3, 'Помощник'], [8, 'Знаток'], [15, 'Мастер'], [25, 'Главный по дому'], [40, 'Волшебник']];
  function homeStars(id) {
    try { var d = JSON.parse(localStorage.getItem('vesyoly-dom-v1') || '{}'); return Object.keys((d.stars || {})[id] || {}).length; } catch (e) { return 0; }
  }
  function totalStars(k) { return Store.count(k) + homeStars(k.id); }
  function level(n) {
    var cur = LEVELS[0], next = null;
    LEVELS.forEach(function (l, i) { if (n >= l[0]) { cur = l; next = LEVELS[i + 1] || null; } });
    return { name: cur[1], from: cur[0], next: next };
  }
  function setPlayer(id) { try { localStorage.setItem('family-player', id); } catch (e) {} }

  function renderHome() {
    setTheme('home');
    document.title = 'Весёлый Дом';
    clear(app);
    add(app, [
      h('header', { class: 'home-head' },
        h('div', { class: 'home-logo pop' }, '🏠✨'),
        h('h1', null, 'Весёлый Дом'),
        h('p', { class: 'muted' }, 'Кто сегодня играет?')),
      h('div', { class: 'kids' }, A.kids.map(function (k) {
        var n = totalStars(k), lv = level(n);
        var pc = lv.next ? Math.round((n - lv.from) / (lv.next[0] - lv.from) * 100) : 100;
        return h('a', { class: 'kid-card t-' + k.theme, href: '#/hi/' + k.id },
          h('span', { class: 'kid-emoji' }, k.emoji),
          h('span', { class: 'kid-info' },
            h('span', { class: 'kid-name' }, k.short || k.name),
            h('span', { class: 'kid-island' }, 'Звание: ' + lv.name),
            h('span', { class: 'meter' }, h('span', { class: 'meter-fill', style: 'width:' + pc + '%' })),
            h('span', { class: 'kid-stars' }, '⭐ ' + n + (lv.next ? ' · до «' + lv.next[1] + '» ещё ' + (lv.next[0] - n) : ' · самое высокое звание'))),
          h('span', { class: 'kid-go', 'aria-hidden': 'true' }, '→'));
      })),
      h('a', { class: 'parents-link', href: '#/parents' }, '🏡 Для родителей: как заниматься и семейный договор'),
      h('p', { class: 'foot muted small center' }, 'Звёзды из всех миров складываются вместе. Всё хранится только на этом телефоне.')
    ]);
  }

  function renderHi(kid) {
    setTheme('home');
    setPlayer(kid.id);
    document.title = 'Куда пойдём? — Весёлый Дом';
    clear(app);
    var n = totalStars(kid), ai = Store.count(kid), dom = homeStars(kid.id);
    function world(href, cls, emoji, title, text, meta) {
      return h('a', { class: 'world-card ' + cls, href: href },
        h('span', { class: 'world-emoji' }, emoji),
        h('span', { class: 'kid-info' },
          h('span', { class: 'kid-name' }, title),
          h('span', { class: 'kid-island' }, text),
          meta ? h('span', { class: 'kid-stars' }, meta) : null),
        h('span', { class: 'kid-go', 'aria-hidden': 'true' }, '→'));
    }
    add(app, [
      topbar('#/', 'Привет, ' + (kid.short || kid.name) + '!'),
      h('section', { class: 'island-hero' },
        h('div', { class: 'island-emoji pop' }, kid.emoji),
        h('div', { class: 'big-text' }, h('p', null, 'Куда пойдём сегодня?')),
        kid.voice ? h('button', { class: 'speak', type: 'button', 'aria-label': 'Прочитать вслух', onclick: function () { Voice.say('Привет, ' + kid.name + '! Куда пойдём сегодня? В квартиру восемьдесят два или на остров роботов?'); } }, '🔊') : null,
        h('div', { class: 'kid-stars' }, '⭐ ' + n + ' · ' + level(n).name)),
      h('div', { class: 'kids' }, [
        world('dom/', 'w-dom', '🏠', 'Квартира 82', 'Учимся говорить с Алисой: свет, комнаты, задания и весёлые имена.', '⭐ ' + dom),
        world('#/kid/' + kid.id, 't-' + kid.theme, kid.emoji, 'ИИ-Академия · ' + kid.island, 'Как устроен искусственный интеллект и как с ним дружить.', '⭐ ' + ai + ' из ' + kid.missions.length),
        h('div', { class: 'world-card w-soon' },
          h('span', { class: 'world-emoji' }, '✨'),
          h('span', { class: 'kid-info' }, h('span', { class: 'kid-name' }, 'Новый мир'), h('span', { class: 'kid-island' }, 'Скоро здесь появится ещё одна игра.')))
      ])
    ]);
  }

  function renderKid(kid) {
    setTheme(kid.theme);
    document.title = kid.island + ' — ИИ-Академия';
    clear(app);
    var n = Store.count(kid), total = kid.missions.length;
    add(app, [
      topbar('#/hi/' + kid.id, kid.island, kid.voice ? soundToggle() : null),
      h('section', { class: 'island-hero' },
        h('div', { class: 'island-emoji pop' }, kid.emoji),
        h('div', { class: 'big-text' }, h('p', null, kid.hello)),
        kid.voice ? h('button', { class: 'speak', type: 'button', 'aria-label': 'Прочитать вслух', onclick: function () { Voice.say(kid.hello); } }, '🔊') : null,
        h('div', { class: 'meter big' }, h('span', { class: 'meter-fill', style: 'width:' + (n / total * 100) + '%' })),
        h('div', { class: 'kid-stars' }, '⭐ ' + n + ' из ' + total)),
      n === total ? h('section', { class: 'card center badge' }, h('div', { class: 'hero-emoji' }, kid.badge.e), h('div', { class: 'group-h' }, 'Звание: «' + kid.badge.t + '»')) : null,
      h('ol', { class: 'missions' }, kid.missions.map(function (m, i) {
        var done = Store.done(kid.id, m.id);
        return h('li', null, h('a', { class: 'mission' + (done ? ' is-done' : ''), href: '#/m/' + kid.id + '/' + m.id },
          h('span', { class: 'm-num' }, done ? '⭐' : String(i + 1)),
          h('span', { class: 'm-emoji' }, m.emoji),
          h('span', { class: 'm-info' }, h('span', { class: 'm-title' }, m.title), h('span', { class: 'm-min' }, '~' + m.min + ' мин' + (done ? ' · пройдено' : ''))),
          h('span', { class: 'kid-go', 'aria-hidden': 'true' }, '→')));
      }))
    ]);
  }

  function renderMission(kid, m) {
    setTheme(kid.theme);
    document.title = m.title + ' — ИИ-Академия';
    clear(app);
    var bar = h('div', { class: 'stepbar' }, h('span', { class: 'stepbar-fill' }));
    var stage = h('main', { class: 'stage' });
    add(app, [topbar('#/kid/' + kid.id, m.emoji + ' ' + m.title, kid.voice ? soundToggle() : null), bar, stage]);
    function go(i) {
      Voice.stop();
      clear(stage);
      bar.firstChild.style.width = ((i + 1) / m.steps.length * 100) + '%';
      var step = m.steps[i];
      var ctx = { kid: kid, mission: m, first: i === 0, next: function () { go(i + 1); } };
      var fn = Steps[step.type];
      if (fn) fn(stage, step, ctx);
      window.scrollTo(0, 0);
    }
    go(0);
  }

  function renderParents() {
    setTheme('home');
    document.title = 'Для родителей — ИИ-Академия';
    clear(app);
    var reset = h('button', { class: 'btn ghost wide', type: 'button', onclick: function () {
      if (window.confirm('Сбросить звёздочки у всех детей на этом телефоне?')) { Store.reset(); reset.textContent = 'Прогресс сброшен ✓'; }
    } }, '🔄 Сбросить прогресс на этом телефоне');
    add(app, [
      topbar('#/', 'Для родителей'),
      A.parents.map(function (p) { return h('section', { class: 'card parent' }, h('h2', null, p.t), h('div', { html: p.html })); }),
      reset
    ]);
  }

  function route() {
    Voice.stop();
    Array.prototype.slice.call(document.querySelectorAll('.confetti')).forEach(function (c) { c.parentNode.removeChild(c); });
    var parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
    var kid;
    if (parts[0] === 'hi' && (kid = kidById(parts[1]))) renderHi(kid);
    else if (parts[0] === 'kid' && (kid = kidById(parts[1]))) { setPlayer(kid.id); renderKid(kid); }
    else if (parts[0] === 'm' && (kid = kidById(parts[1]))) {
      var m = kid.missions.filter(function (x) { return x.id === parts[2]; })[0];
      if (m) renderMission(kid, m); else renderKid(kid);
    }
    else if (parts[0] === 'parents') renderParents();
    else renderHome();
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', route);
  route();
})();
