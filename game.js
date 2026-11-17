'use strict';
const $ = id => document.getElementById(id);
const cv = $('c'), ctx = cv.getContext('2d'), TAU = Math.PI * 2;
let W, H, cx, cy, R, S = null, last = 0, flashT = 0;
let best = 0;
try { best = +localStorage.pvoBest || 0; } catch (e) {}

function resize() {
  const d = devicePixelRatio || 1;
  W = innerWidth; H = innerHeight;
  cv.width = W * d; cv.height = H * d;
  ctx.setTransform(d, 0, 0, d, 0, 0);
  cx = W / 2; cy = H * 0.4; R = Math.min(W * 0.46, H * 0.28);
}
addEventListener('resize', resize); resize();

// n/ne — названия (ru/en), kmh — реальная скорость (прибл.), v — скорость в игре, p — базовый шанс попадания,
// r — награда, dmg — урон базе, t0 — с какой секунды появляется, w — частота, bal — 1 баллистика, 2 гиперзвук
const TYPES = {
  orlan:    { n: 'Орлан-10',      ne: 'Orlan-10',      v: .03,  kmh: 150,   p: .45, r: 3e5,   dmg: 4,  t0: 20,   w: 2, recon: 1 },
  shahed:   { n: 'Шахед-136',     ne: 'Shahed-136',    v: .035, kmh: 185,   p: .40, r: 4e5,   dmg: 8,  t0: 0,   w: 3 },
  kalibr:   { n: 'Калибр',        ne: 'Kalibr',        v: .085, kmh: 860,   p: .75, r: 1e6,   dmg: 20, t0: 15,  w: 2, big: 1 },
  kh55:     { n: 'Х-55',          ne: 'Kh-55',         v: .08,  kmh: 830,   p: .75, r: 9e5,   dmg: 18, t0: 20,  w: 1.5, big: 1 },
  tb2:      { n: 'Байрактар TB2', ne: 'Bayraktar TB2', v: .04,  kmh: 222,   p: .45, r: 6e5,   dmg: 8,  t0: 25,  w: 1.5, recon: 1, big: 1 },
  tomahawk: { n: 'Томагавк',      ne: 'Tomahawk',      v: .085, kmh: 880,   p: .75, r: 1e6,   dmg: 20, t0: 30,  w: 1.2, big: 1 },
  grad:     { n: 'Град (ракета)', ne: 'Grad rocket',   v: .11,  kmh: 2500,  p: .55, r: 5e5,   dmg: 6,  t0: 35,  w: 1.5 },
  kh101:    { n: 'Х-101',         ne: 'Kh-101',        v: .09,  kmh: 900,   p: .75, r: 1.1e6, dmg: 20, t0: 40,  w: 1.5, big: 1 },
  geran3:   { n: 'Герань-3',      ne: 'Geran-3',       v: .05,  kmh: 300,   p: .40, r: 5e5,   dmg: 10, t0: 45,  w: 1.5 },
  storm:    { n: 'Storm Shadow',  ne: 'Storm Shadow',  v: .095, kmh: 1000,  p: .70, r: 1.3e6, dmg: 22, t0: 60,  w: 1, big: 1 },
  atacms:   { n: 'ATACMS',        ne: 'ATACMS',        v: .13,  kmh: 3700,  p: .78, r: 2e6,   dmg: 30, t0: 70,  w: .9, bal: 1 },
  geran5:   { n: 'Герань-5',      ne: 'Geran-5',       v: .065, kmh: 500,   p: .45, r: 7e5,   dmg: 12, t0: 80,  w: 1.5 },
  kh22:     { n: 'Х-22',          ne: 'Kh-22',         v: .13,  kmh: 3700,  p: .60, r: 1.8e6, dmg: 28, t0: 90,  w: .8, big: 1 },
  iskander: { n: 'Искандер-М',    ne: 'Iskander-M',    v: .17,  kmh: 7000,  p: .80, r: 2.2e6, dmg: 35, t0: 100, w: .9, bal: 1 },
  kinzhal:  { n: 'Кинжал',        ne: 'Kinzhal',       v: .22,  kmh: 12000, p: .55, r: 4e6,   dmg: 50, t0: 130, w: .6, bal: 2 },
  zircon:   { n: 'Циркон',        ne: 'Zircon',        v: .2,   kmh: 10000, p: .50, r: 3.5e6, dmg: 45, t0: 150, w: .6, bal: 2 }
};
// price — цена; km, mis, kmh — реальные (приблизительные) данные; range/cap/cd/acc/bm/svc/ms — параметры игры
// bm — множитель шанса против баллистики (0 = не берёт), svc — множитель стоимости обслуживания, ms — скорость ракеты в игре
const SYS = {
  osa:     { lang: 'ru', ne: 'OSA', me: '9M33', n: 'ОСА',           fl: '🇷🇺', price: 0,     km: 15,  mis: '9М33',              kmh: 3000,  range: .45, cap: 12, cd: .7,  acc: -.05, bm: 0,   svc: 1,   ms: .7 },
  s300:    { lang: 'ru', ne: 'S-300', me: '5V55 / 48N6', n: 'С-300',         fl: '🇷🇺', price: 0,     km: 150, mis: '5В55 / 48Н6',       kmh: 7200,  range: .85, cap: 8,  cd: 1.6, acc: .05,  bm: .6,  svc: 1,   ms: 1.3 },
  pantsir: { lang: 'ru', ne: 'Pantsir-S1', me: '57E6', n: 'Панцирь-С1',    fl: '🇷🇺', price: 6e6,   km: 20,  mis: '57Э6',              kmh: 4700,  range: .5,  cap: 12, cd: .5,  acc: .08,  bm: .15, svc: 1.5, ms: .9 },
  tor:     { lang: 'ru', ne: 'Tor-M2', me: '9M338', n: 'Тор-М2',        fl: '🇷🇺', price: 1e7,   km: 12,  mis: '9М338',             kmh: 3600,  range: .5,  cap: 8,  cd: .6,  acc: .08,  bm: .3,  svc: 1.5, ms: .8 },
  buk:     { lang: 'ru', ne: 'Buk-M3', me: '9M317M', n: 'Бук-М3',        fl: '🇷🇺', price: 2e7,   km: 70,  mis: '9М317М',            kmh: 4300,  range: .75, cap: 12, cd: 1,   acc: .06,  bm: .5,  svc: 2,   ms: 1 },
  iron:    { lang: 'en', n: 'Iron Dome',     fl: '🇮🇱', price: 2.8e7, km: 70,  mis: 'Tamir',             kmh: 2700,  range: .55, cap: 20, cd: .6,  acc: .04,  bm: .1,  svc: 1.2, ms: .8 },
  nasams:  { lang: 'en', n: 'NASAMS',        fl: '🇳🇴', price: 4.5e7, km: 40,  mis: 'AIM-120 AMRAAM',    kmh: 4900,  range: .7,  cap: 12, cd: 1,   acc: .07,  bm: .35, svc: 3,   ms: 1.1 },
  iris:    { lang: 'en', n: 'IRIS-T SLM',    fl: '🇩🇪', price: 6.5e7, km: 40,  mis: 'IRIS-T SLM',        kmh: 3600,  range: .7,  cap: 16, cd: .9,  acc: .1,   bm: .5,  svc: 3.5, ms: 1.1 },
  patriot: { lang: 'en', n: 'Patriot PAC-3', fl: '🇺🇸', price: 1.1e8, km: 160, mis: 'PAC-3 MSE / GEM-T', kmh: 5000,  range: .85, cap: 16, cd: 1.2, acc: .12,  bm: 1,   svc: 6,   ms: 1.5 },
  s400:    { lang: 'ru', ne: 'S-400', me: '40N6 / 48N6', n: 'С-400',         fl: '🇷🇺', price: 1.6e8, km: 400, mis: '40Н6 / 48Н6',       kmh: 17000, range: 1,   cap: 16, cd: 1.4, acc: .1,   bm: .9,  svc: 5,   ms: 1.8 }
};

// ---- язык: авто (по системе ПВО) / ru / en ----
let setLang = 'auto', shown = '';
try { setLang = localStorage.pvoLang || 'auto'; } catch (e) {}
const L = () => setLang !== 'auto' ? setLang : (S ? SYS[S.lang].lang : (/^(ru|uk|be)/i.test(navigator.language || '') ? 'ru' : 'en'));
const I = {
  ru: { title: 'AIR DEFENSE SIMULATOR', intro: 'Радар засекает цели. Нажми на метку, чтобы выпустить ракету.<br>Следи за боезапасом и чистотой труб.',
    d_osa: 'ближний радиус, 12 ракет, быстрый пуск, не берёт баллистику', d_s300: 'дальний радиус, 8 ракет, медленный пуск, точнее',
    best: 'Рекорд: ', over: 'БАЗА УНИЧТОЖЕНА', kills: 'Сбито целей: ', earned: 'Заработано: ', again: 'Заново',
    svcH: 'Обслуживание', upg: 'Улучшения', shop: 'Магазин ПВО', close: 'Закрыть', set: 'Настройки', setB: '⚙ Настройки',
    lang: 'Язык', auto: 'Авто (по системе ПВО)', km: 'км', kmh: 'км/ч', hit: 'шанс ', strike: 'УДАР −', miss: 'ПРОМАХ',
    reload: 'Перезарядка…', noAmmo: 'Нет снарядов!', noBal: ' не берёт баллистику', range: 'Цель вне зоны ПВО',
    ammo: 'Боезапас', cleak: 'clean', repair: 'Ремонт базы', wear: 'износ ', lvl: 'ур.', max: 'МАКС',
    u_rs: 'Скорость радара', u_range: 'Дальность радара', u_acc: 'Наведение', u_cap: 'Боезапас +2', u_cd: 'Скорость пуска',
    missileL: 'Ракета: ', rangeL: 'Дальность: ', cap: ' · боезапас ', fire: ' · пуск ', sec: ' с', balL: 'Баллистика: ',
    acc: ' · точность ', svcx: 'Обслуживание ×', active: 'Активна', pick: 'Выбрать', buy: 'Купить · ',
    b0: 'не берёт', b1: 'слабо', b2: 'средне', b3: 'отлично' },
  en: { title: 'AIR DEFENSE SIMULATOR', intro: 'The radar spots targets. Tap a blip to fire a missile.<br>Watch your ammo and keep the launch tubes clean.',
    d_osa: 'short range, 12 missiles, fast fire, cannot hit ballistic', d_s300: 'long range, 8 missiles, slow fire, more accurate',
    best: 'Best: ', over: 'BASE DESTROYED', kills: 'Targets shot down: ', earned: 'Earned: ', again: 'Play again',
    svcH: 'Maintenance', upg: 'Upgrades', shop: 'Air Defense Shop', close: 'Close', set: 'Settings', setB: '⚙ Settings',
    lang: 'Language', auto: 'Auto (by air defense system)', km: 'km', kmh: 'km/h', hit: 'hit ', strike: 'HIT −', miss: 'MISS',
    reload: 'Reloading…', noAmmo: 'Out of ammo!', noBal: ' cannot hit ballistic', range: 'Target out of range',
    ammo: 'Ammo', clean: 'Clean tubes', repair: 'Repair base', wear: 'wear ', lvl: 'lv.', max: 'MAX',
    u_rs: 'Radar speed', u_range: 'Radar range', u_acc: 'Guidance', u_cap: 'Ammo +2', u_cd: 'Fire rate',
    missileL: 'Missile: ', rangeL: 'Range: ', cap: ' · ammo ', fire: ' · cooldown ', sec: ' s', balL: 'Ballistic: ',
    acc: ' · accuracy ', svcx: 'Upkeep ×', active: 'Active', pick: 'Select', buy: 'Buy · ',
    b0: 'cannot hit', b1: 'weak', b2: 'medium', b3: 'excellent' }
};
Object.assign(I.ru, { spotted: 'Вас засекли! Минута под ударом', exp: '👁 Засечены: ', obs: 'наблюдает ', lostFx: ' УНИЧТОЖЕНА!',
  dead: 'Уничтожена', restore: 'Восстановить · ', deadFire: 'Установка уничтожена, восстанови её в магазине', lostAll: 'ПВО ПОТЕРЯНА' });
Object.assign(I.en, { spotted: "You've been spotted! One minute under fire", exp: '👁 Spotted: ', obs: 'observing ', lostFx: ' DESTROYED!',
  dead: 'Destroyed', restore: 'Restore · ', deadFire: 'Launcher destroyed, restore it in the shop', lostAll: 'AIR DEFENSE LOST' });
Object.assign(I.ru, {"diffT": "Сложность", "d1": "Лёгкая", "d2": "Нормальная", "d3": "Тяжёлая", "d4": "Почти невозможная", "autoB": "Авто", "pass": "ПРОЛЕТЕЛА СКВОЗЬ", "units": "в строю: ", "full": "Макс. установок", "eulaT": "Соглашение", "eulaX": "<b>Пользовательское соглашение</b><br><br>1. «Air Defense Simulator» — компьютерная игра, созданная только для развлечения. Все события, цифры, цены, шансы, характеристики и механики в игре вымышлены или сильно упрощены и не являются военными, техническими или справочными данными. Игра не предназначена для обучения реальной боевой работе.<br><br>2. Названия техники, вооружения и организаций используются только для узнаваемости. Все торговые марки принадлежат их владельцам. Игра не связана с производителями, армиями, государствами и другими организациями и не выражает никакой политической позиции.<br><br>3. Любые совпадения с реальными событиями, людьми, обстоятельствами или конфликтами случайны.<br><br>4. Игра предоставляется «как есть». Автор игры не несёт ответственности за любые последствия её использования, включая восприятие содержания, неточности и совпадения с реальностью.<br><br>5. Нажимая «Принимаю», ты подтверждаешь, что прочитал это соглашение и согласен с ним.", "eulaOk": "Принимаю", "eulaBtn": "Соглашение"});
Object.assign(I.en, {"diffT": "Difficulty", "d1": "Easy", "d2": "Normal", "d3": "Hard", "d4": "Nearly impossible", "autoB": "Auto", "pass": "FLEW THROUGH", "units": "deployed: ", "full": "Max units", "eulaT": "Agreement", "eulaX": "<b>User Agreement</b><br><br>1. “Air Defense Simulator” is a video game made for entertainment only. All events, numbers, prices, chances, specifications and mechanics in the game are fictional or heavily simplified and are not military, technical or reference data. The game is not intended for training in real combat operations.<br><br>2. Names of equipment, weapons and organizations are used only for recognizability. All trademarks belong to their owners. The game is not affiliated with any manufacturers, armed forces, governments or other organizations and does not express any political position.<br><br>3. Any resemblance to real events, people, circumstances or conflicts is purely coincidental.<br><br>4. The game is provided “as is”. The author of the game bears no responsibility for any consequences of using it, including how its content is perceived, inaccuracies, or coincidences with reality.<br><br>5. By tapping “I agree” you confirm that you have read this agreement and accept it.", "eulaOk": "I agree", "eulaBtn": "Agreement"});
Object.assign(I.ru, { botNote: 'Купленные установки автономны: сами ищут цели и стреляют, даже когда «Авто» выключено. Боезапас и чистку оплачиваешь ты.' });
Object.assign(I.en, { botNote: 'Purchased launchers are autonomous: they find targets and fire on their own even when Auto is off. You still pay for ammo and cleaning.' });
Object.assign(I.ru, { colorT: 'Цвет интерфейса', styleT: 'Стиль оформления', st_radar: 'Радар', st_camo: 'Камуфляж', st_staff: 'Штабной', st_desert: 'Пустыня', st_crt: 'Ретро ЭЛТ' });
Object.assign(I.en, { colorT: 'Interface color', styleT: 'Visual style', st_radar: 'Radar', st_camo: 'Camo', st_staff: 'Command HQ', st_desert: 'Desert', st_crt: 'Retro CRT' });
const tr = k => I[L()][k];

const nm = s => L() === 'en' && s.ne ? s.ne : s.n;
const mn = s => L() === 'en' && s.me ? s.me : s.mis;
const tn = T => L() === 'en' ? T.ne : T.n;
function applyLang() {
  const l = shown = L();
  document.documentElement.lang = l;
  document.querySelectorAll('[data-t]').forEach(e => e.innerHTML = I[l][e.dataset.t]);
  for (const k of ['osa', 's300']) $(k === 'osa' ? 'mOsa' : 'mS300').innerHTML = '<b>' + nm(SYS[k]) + '</b><small>' + I[l]['d_' + k] + '</small>';
  $('best').textContent = best ? I[l].best + fmt(best) : '';
  markDiff();
  if (!$('shop').hidden) buildShop();
}


const fmt = n => L() === 'en' ? (n >= 1e6 ? +(n / 1e6).toFixed(2) + 'M' : Math.round(n / 1e3) + 'k')
  : (n >= 1e6 ? +(n / 1e6).toFixed(2) + ' млн' : Math.round(n / 1e3) + ' тыс');
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ---- цвет интерфейса ----
const THEMES = { green: { h: 120, s: 1 }, cyan: { h: 185, s: 1 }, blue: { h: 215, s: 1 }, purple: { h: 280, s: 1 },
                 amber: { h: 38, s: 1 }, red: { h: 0, s: 1 }, white: { h: 0, s: 0 } };
let theme = 'green', CV = {};
try { if (THEMES[localStorage.pvoColor]) theme = localStorage.pvoColor; } catch (e) {}
const hs = (l, sat, a) => 'hsla(' + THEMES[theme].h + ',' + Math.round(sat * THEMES[theme].s) + '%,' + l + '%,' + (a === undefined ? 1 : a) + ')';
// ---- стиль оформления: radar и crt (цвет выбирается), camo, staff, desert (палитра задана стилем) ----
const STYLES = { radar: 1, crt: 1, camo: 0, staff: 0, desert: 0 };
let style = 'radar';
try { if (STYLES[localStorage.pvoStyle] !== undefined) style = localStorage.pvoStyle; } catch (e) {}
const MONO = 'ui-monospace,Menlo,Consolas,monospace';
const FIXED = {
  camo: { font: "Impact,'Arial Narrow','Roboto Condensed',sans-serif-condensed,sans-serif",
    v: { bg: '#2a3120', c: '#e2e3c0', c2: '#efedc8', c3: '#b3b68f', c4: '#cdd0aa', c5: '#bcbf97', bd: '#757a4b', bd2: '#dcb860', act: '#505a33', btn: '#38412a', pic: '#303824',
         glow: 'transparent', glow6: 'rgba(0,0,0,.35)', panel: 'rgba(32,39,24,.96)', ovbg: 'rgba(24,30,17,.95)', alert: '#ff7a5c', warn: '#ffd24a', alertg: 'transparent' },
    cv: { bg: null, disc: 'rgba(16,22,10,.8)', ring: 'rgba(226,227,192,.28)', rng: '#dcb860', rng2: '#b3b68f', line: '#e6e8a8', main: '#d4e08a', shot: '#fff6d0',
          sw: '200,224,110', bl: '222,236,124', alert: '#ff7a5c', warn: '#ffd24a', good: '#b6e36a', pass: '#b6e36a', cool: '#f0e27a', alertRgb: '255,122,92' } },
  staff: { font: "Georgia,'Times New Roman',serif",
    v: { bg: '#e7e1cc', c: '#222a30', c2: '#17283a', c3: '#4b585e', c4: '#33414a', c5: '#56636a', bd: '#7d8a8f', bd2: '#1b5e9e', act: '#c7d4db', btn: '#f3efe0', pic: '#d9d4bf',
         glow: 'transparent', glow6: 'rgba(30,60,90,.25)', panel: 'rgba(238,233,216,.97)', ovbg: 'rgba(231,225,204,.97)', alert: '#c0221b', warn: '#a65b00', alertg: 'transparent' },
    cv: { bg: null, disc: 'rgba(222,234,230,.8)', ring: 'rgba(40,70,90,.35)', rng: '#1b5e9e', rng2: '#4d6f8a', line: '#1b3a5c', main: '#1b5e9e', shot: '#111',
          sw: '30,110,180', bl: '190,30,30', alert: '#c0221b', warn: '#a65b00', good: '#1f7a2e', pass: '#1f7a2e', cool: '#b8860b', alertRgb: '192,34,27' } },
  desert: { font: "'Courier New',Courier," + MONO,
    v: { bg: '#2b140a', c: '#ffd9a0', c2: '#ffe8c4', c3: '#d1a574', c4: '#e9c08c', c5: '#d8ab74', bd: '#a8642a', bd2: '#ffb347', act: '#6e3b14', btn: '#3e2412', pic: '#46290f',
         glow: '#ff8a1f', glow6: 'rgba(255,138,31,.35)', panel: 'rgba(40,22,10,.95)', ovbg: 'rgba(30,16,7,.94)', alert: '#ff6b5a', warn: '#ffd24a', alertg: '#f00' },
    cv: { bg: null, disc: 'rgba(28,14,7,.72)', ring: 'rgba(255,200,130,.26)', rng: '#ffb347', rng2: '#cf9a5a', line: '#ffd08a', main: '#ffc266', shot: '#fff',
          sw: '255,170,60', bl: '255,218,130', alert: '#ff6b5a', warn: '#ffd24a', good: '#a8e063', pass: '#a8e063', cool: '#ffe27a', alertRgb: '255,107,90' } }
};
function applyTheme() {
  let v, cv, font = MONO;
  if (STYLES[style]) {      // палитра строится от выбранного цвета
    v = { bg: hs(3, 60), c: hs(67, 100), c2: hs(70, 100), c3: hs(65, 35), c4: hs(70, 40), c5: hs(60, 35), bd: hs(38, 70), bd2: hs(75, 100),
          act: hs(14, 65), btn: hs(6, 70), pic: hs(9, 65), glow: hs(50, 100), glow6: hs(50, 100, .4), panel: hs(4, 70, .95), ovbg: hs(2, 100, .93),
          alert: '#f55', warn: '#fb3', alertg: '#f00' };
    cv = { bg: v.bg, disc: v.bg, ring: hs(20, 80), rng: hs(60, 100), rng2: hs(45, 50), line: hs(75, 100), main: hs(65, 100), shot: hs(85, 100),
           sweep: a => hs(58, 100, a), blip: a => hs(65, 100, a), alert: '#f55', warn: '#fb3', good: '#7f7', pass: '#9f9', cool: '#ee5', alertRgb: '255,70,70' };
  } else {
    const f = FIXED[style]; v = Object.assign({}, f.v); font = f.font;
    cv = Object.assign({}, f.cv, { sweep: a => 'rgba(' + f.cv.sw + ',' + a + ')', blip: a => 'rgba(' + f.cv.bl + ',' + a + ')' });
  }
  v.font = font; cv.font = font; CV = cv;
  const st = document.documentElement.style;
  if (st && st.setProperty) for (const k in v) st.setProperty('--' + k, v[k]);
  if (document.body) document.body.className = 'st-' + style;
  const cb = $('colorBox'); if (cb) cb.hidden = !STYLES[style];
}
const markTheme = () => document.querySelectorAll('#swatches .sw').forEach(b => b.classList.toggle('cur', b.dataset.c === theme));
function buildSwatches() {
  const box = $('swatches'); box.innerHTML = '';
  for (const k in THEMES) {
    const t = THEMES[k], b = document.createElement('button'); b.className = 'sw'; b.dataset.c = k; b.title = k;
    b.style.background = 'hsl(' + t.h + ',' + (t.s ? 100 : 0) + '%,' + (t.s ? 55 : 80) + '%)';
    b.onclick = () => { theme = k; try { localStorage.pvoColor = k; } catch (e) {} applyTheme(); markTheme(); };
    box.append(b);
  }
  markTheme();
}

// ---- сложность 1–4 ----
const DIFF = [
  { sp: 1.5, spd: .8,   hit: .1,   money: 3e6,   rew: 1.3, cost: .8,  t0: 1.5, obs: 7, loss: .5 },
  { sp: 1,   spd: 1,    hit: 0,    money: 1.5e6, rew: 1,   cost: 1,   t0: 1,   obs: 5, loss: .7 },
  { sp: .7,  spd: 1.15, hit: -.08, money: 1e6,   rew: .85, cost: 1.2, t0: .7,  obs: 4, loss: 1.1 },
  { sp: .45, spd: 1.3,  hit: -.18, money: 5e5,   rew: .7,  cost: 1.5, t0: .4,  obs: 3, loss: 1.5 }
];
let diff = 2, autoOn = true;
try { diff = clamp(+localStorage.pvoDiff || 2, 1, 4); autoOn = localStorage.pvoAuto !== '0'; } catch (e) {}

// ---- установки ----
const MAXU = 6, EXPO = 60, STARTER_VAL = { osa: 3e6, s300: 8e6 };
const price = id => (SYS[id].price || STARTER_VAL[id]) * S.d.cost;
const rcost = id => Math.round(price(id) * .7 / 1e5) * 1e5;
const capOf = u => SYS[u.id].cap + S.capUp;
const lossChance = T => clamp(((T.dmg - 8) / 55 + .05) * S.d.loss, 0, .85);
const sum = f => S.units.reduce((a, u) => a + (u.dead ? 0 : f(u)), 0);
const addUnit = (id, bot) => { S.units.push({ id, bot, ammo: SYS[id].cap + S.capUp, foul: 0, cd: 0, dead: 0 }); S.lang = id; };

function newGame(k) {
  const d = DIFF[diff - 1];
  S = { d, units: [], lang: k, capUp: 0, cdMul: 1, exposed: 0, money: d.money, hp: 100, kills: 0, earned: 0,
        rs: 1.6, range: .6, acc: 0, sweep: 0, t: 0, spawn: 2, auto: autoOn,
        targets: [], shots: [], fx: [], lv: { rs: 0, range: 0, acc: 0, cap: 0, cd: 0 }, over: false };
  addUnit(k);
  $('menu').hidden = true; $('over').hidden = true; $('shop').hidden = true; upd();
}

// шанс попадания установки u по цели T: крупные цели (big) сбиваются на 100%
function chance(T, u) {
  if (T.big) return 1;
  const s = SYS[u.id], pen = u.foul > 40 ? (u.foul - 40) / 60 * .4 : 0;
  if (T.bal && s.bm <= 0) return 0;          // эта система не берёт баллистику вообще
  let c = T.p + s.acc + S.acc + S.d.hit - pen;
  if (T.bal) c *= s.bm * (T.bal === 2 ? .7 : 1);
  return clamp(c, .05, .97);
}
const bestCh = T => Math.max(0, ...S.units.filter(u => !u.dead).map(u => chance(T, u)));

// ---- обслуживание и улучшения (действуют на все установки) ----
const SV = [
  { k: 'ammo', cost: () => sum(u => u.ammo < capOf(u) ? 5e5 * SYS[u.id].svc * S.d.cost : 0),
    no: () => !S.units.some(u => !u.dead && u.ammo < capOf(u)), sub: () => sum(u => u.ammo) + '/' + sum(capOf),
    do: () => S.units.forEach(u => { if (!u.dead) u.ammo = capOf(u); }) },
  { k: 'clean', cost: () => sum(u => u.foul > 0 ? 1e5 * SYS[u.id].svc * S.d.cost : 0),
    no: () => !S.units.some(u => !u.dead && u.foul > 0), sub: () => tr('wear') + Math.round(Math.max(0, ...S.units.map(u => u.foul))) + '%',
    do: () => S.units.forEach(u => { if (!u.dead) u.foul = 0; }) },
  { k: 'repair', cost: () => 3e5 * S.d.cost, no: () => S.hp >= 100, sub: () => Math.round(S.hp) + '%', do: () => S.hp = Math.min(100, S.hp + 30) }
];
const up = (k, base, max, f) => ({
  k: 'u_' + k, cost: () => base * 1.6 ** S.lv[k] * S.d.cost, no: () => S.lv[k] >= max,
  sub: () => S.lv[k] >= max ? tr('max') : tr('lvl') + S.lv[k] + '/' + max, do: () => { S.lv[k]++; f(); }
});
const UP = [
  up('rs', 8e5, 5, () => S.rs += .45),
  up('range', 1e6, 4, () => S.range = Math.min(1, S.range + .1)),
  up('acc', 1.5e6, 5, () => S.acc += .04),
  up('cap', 7e5, 5, () => { S.capUp += 2; S.units.forEach(u => u.ammo += 2); }),
  up('cd', 9e5, 4, () => S.cdMul *= .85)
];
const items = [];
function mk(box, o) {
  const b = document.createElement('button');
  b.onclick = () => { if (!S || S.over || o.no() || S.money < o.cost()) return; S.money -= o.cost(); o.do(); upd(); };
  box.append(b); items.push([b, o]);
}
SV.forEach(o => mk($('sv'), o)); UP.forEach(o => mk($('up'), o));

function upd() {
  if (!S) return;
  if (shown !== L()) applyLang();
  const al = S.units.filter(u => !u.dead);
  $('money').textContent = '💰 ' + fmt(S.money);
  $('hp').textContent = '🛡 ' + Math.max(0, Math.round(S.hp)) + '%';
  $('ammo').textContent = '🚀 ' + sum(u => u.ammo) + '/' + sum(capOf);
  $('foul').textContent = '🔧 ' + Math.round(100 - Math.max(0, ...al.map(u => u.foul))) + '%';
  $('expo').textContent = S.exposed > 0 ? tr('exp') + Math.ceil(S.exposed) + tr('sec') : '';
  $('kills').textContent = '✔ ' + S.kills;
  $('shopBtn').innerHTML = '<b>🛒 ' + tr('shop') + '</b><span>' + S.units.length + '/' + MAXU + '</span>';
  $('auto').textContent = tr('autoB') + (S.auto ? ' ✔' : ' ✘');
  for (const [b, o] of items) {
    const m = o.no(), c = o.cost();
    b.disabled = m || S.money < c;
    b.innerHTML = '<b>' + tr(o.k) + '</b><small>' + (m ? '' : fmt(c) + ' · ') + o.sub() + '</small>';
  }
  updShop();
}
function flash(t) { $('msg').textContent = t; clearTimeout(flashT); flashT = setTimeout(() => $('msg').textContent = '', 1200); }

// ---- логика ----
function spawn() {
  const pool = Object.values(TYPES).filter(q => S.t >= q.t0 * S.d.t0);
  let w = Math.random() * pool.reduce((s, q) => s + q.w, 0), T = pool[0];
  for (const q of pool) { if ((w -= q.w) <= 0) { T = q; break; } }
  const a = Math.random() * TAU, v = T.v * S.d.spd, x = Math.cos(a) * 1.05, y = Math.sin(a) * 1.05;
  const dx = (Math.random() - .5) * .1 - x, dy = (Math.random() - .5) * .1 - y, d = Math.hypot(dx, dy);
  S.targets.push({ T, v, x, y, vx: dx / d * v, vy: dy / d * v, px: x, py: y, seen: false, ping: 0 });
}
const inSweep = (a0, a1, x) => a1 >= a0 ? x >= a0 && x <= a1 : x >= a0 || x <= a1;
const addFx = (x, y, col, txt) => S.fx.push({ x, y, col, txt, t: 0 });

function destroyVehicle() {
  const al = S.units.filter(u => !u.dead); if (!al.length) return;
  const u = al[Math.random() * al.length | 0]; u.dead = 1; u.ammo = 0;
  const m = nm(SYS[u.id]) + tr('lostFx'); addFx(0, 0, CV.alert, m); flash(m); navigator.vibrate && navigator.vibrate(300);
}

const ready = u => !u.dead && u.cd <= 0 && u.ammo > 0;
const canHit = (u, t) => Math.hypot(t.x, t.y) <= SYS[u.id].range && chance(t.T, u) > 0;
function launch(u, t) {
  const s = SYS[u.id];
  u.ammo--; u.cd = s.cd * S.cdMul; u.foul = Math.min(100, u.foul + 7);
  S.shots.push({ x: 0, y: 0, t, ch: chance(t.T, u), ms: s.ms });
}
function fire(t) {               // ручной выстрел: выбирается лучшая готовая установка
  let u = null, bc = -1;
  for (const x of S.units) if (ready(x) && canHit(x, t)) { const c = chance(t.T, x); if (c > bc) { bc = c; u = x; } }
  if (u) { launch(u, t); return upd(); }
  const al = S.units.filter(x => !x.dead), am = al.filter(x => x.ammo > 0);
  if (!al.length) return flash(tr('deadFire'));
  if (!am.length) return flash(tr('noAmmo'));
  if (!am.some(x => canHit(x, t))) return flash(am.every(x => !chance(t.T, x)) ? tr('noBal').trim() : tr('range'));
  flash(tr('reload'));
}
function autoFire() {            // авто-наводка: каждая готовая установка берёт ближайшую цель
  const cand = S.targets.filter(t => t.seen && !t.dead && !t.pass).sort((a, b) => Math.hypot(a.x, a.y) - Math.hypot(b.x, b.y));
  for (const u of S.units) {
    if (!ready(u) || !(S.auto || u.bot)) continue;   // автономные стреляют всегда, стартовая по кнопке «Авто»
    for (const t of cand) {
      const n = S.shots.reduce((c, s) => c + (s.t === t), 0);
      if (n >= (chance(t.T, u) >= .8 ? 1 : 2) || !canHit(u, t)) continue;
      launch(u, t); break;
    }
  }
}

function step(dt) {
  S.t += dt; S.exposed = Math.max(0, S.exposed - dt);
  for (const u of S.units) u.cd = Math.max(0, u.cd - dt);
  autoFire();
  const pa = S.sweep; S.sweep = (S.sweep + S.rs * dt) % TAU;
  S.spawn -= dt;
  if (S.spawn <= 0) { spawn(); S.spawn = Math.max(.55, 3.2 - S.t * .02) * S.d.sp * (.7 + Math.random() * .6) * (S.exposed > 0 ? .6 : 1); }
  for (const t of S.targets) {
    if (t.T.recon && (t.orb || Math.hypot(t.x, t.y) <= .4)) {   // наблюдатель кружит вокруг базы
      if (!t.orb) { t.orb = 1; t.oa = Math.atan2(t.y, t.x); }
      t.oa += t.v / .4 * dt; t.x = Math.cos(t.oa) * .4; t.y = Math.sin(t.oa) * .4;
      t.obs = (t.obs || 0) + dt;
      if (t.obs >= S.d.obs && S.exposed <= 0) { S.exposed = EXPO; t.obs = 0; addFx(0, 0, CV.alert, tr('spotted')); flash(tr('spotted')); }
    } else { t.x += t.vx * dt; t.y += t.vy * dt; }
    const d = Math.hypot(t.x, t.y), ang = (Math.atan2(t.y, t.x) + TAU) % TAU;
    if (d <= S.range && inSweep(pa, S.sweep, ang)) { t.px = t.x; t.py = t.y; t.ping = S.t; t.seen = true; }
    if (!t.pass && !t.dead && d < .05) {
      if (Math.random() < .25) { t.pass = 1; addFx(0, 0, CV.pass, tr('pass')); }   // 25%: цель просто пролетает сквозь
      else {
        t.dead = 1; S.hp -= t.T.dmg; addFx(0, 0, CV.alert, tr('strike') + t.T.dmg + '%'); navigator.vibrate && navigator.vibrate(120);
        if (S.exposed > 0 && Math.random() < lossChance(t.T)) destroyVehicle();
        if (S.hp <= 0) return end();
      }
    }
    if (d > 1.3) t.dead = 1;
  }
  for (const s of S.shots) {
    if (s.t.dead) { s.done = 1; continue; }
    const dx = s.t.x - s.x, dy = s.t.y - s.y, d = Math.hypot(dx, dy), m = s.ms * dt;
    if (d <= m + .02) {
      s.done = 1;
      if (Math.random() < s.ch) {
        const rw = s.t.T.r * S.d.rew; s.t.dead = 1; S.kills++; S.money += rw; S.earned += rw;
        addFx(s.t.x, s.t.y, CV.good, '+' + fmt(rw));
      } else addFx(s.t.x, s.t.y, CV.warn, tr('miss'));
    } else { s.x += dx / d * m; s.y += dy / d * m; }
  }
  S.targets = S.targets.filter(t => !t.dead); S.shots = S.shots.filter(s => !s.done);
  for (const f of S.fx) f.t += dt;
  S.fx = S.fx.filter(f => f.t < 1.2);
  if (S.units.every(u => u.dead) && S.money < Math.min(...S.units.map(u => rcost(u.id)))) end('lostAll');
}

function end(k) {
  S.over = true;
  const h = $('over').querySelector('h1'); h.dataset.t = k || 'over'; h.innerHTML = tr(k || 'over');
  if (S.earned > best) { best = S.earned; try { localStorage.pvoBest = best; } catch (e) {} }
  $('stats').innerHTML = tr('kills') + S.kills + '<br>' + tr('earned') + fmt(S.earned) + '<br>' + tr('best') + fmt(best);
  $('over').hidden = false;
}

// ---- отрисовка ----
function draw() {
  if (CV.bg) { ctx.fillStyle = CV.bg; ctx.fillRect(0, 0, W, H); } else ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = CV.disc; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill();
  ctx.strokeStyle = CV.ring; ctx.lineWidth = 1;
  for (let i = 1; i <= 4; i++) { ctx.beginPath(); ctx.arc(cx, cy, R * i / 4, 0, TAU); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(cx - R, cy); ctx.lineTo(cx + R, cy); ctx.moveTo(cx, cy - R); ctx.lineTo(cx, cy + R); ctx.stroke();
  if (!S) return;
  ctx.strokeStyle = CV.rng; ctx.beginPath(); ctx.arc(cx, cy, R * S.range, 0, TAU); ctx.stroke();
  ctx.setLineDash([4, 6]); ctx.strokeStyle = CV.rng2;
  for (const r of new Set(S.units.filter(u => !u.dead).map(u => SYS[u.id].range))) { ctx.beginPath(); ctx.arc(cx, cy, R * r, 0, TAU); ctx.stroke(); }
  ctx.setLineDash([]);
  for (let i = 0; i < 24; i++) {
    ctx.fillStyle = CV.sweep(.28 * (1 - i / 24));
    ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, R * S.range, S.sweep - (i + 1) * .03, S.sweep - i * .03); ctx.fill();
  }
  ctx.strokeStyle = CV.line; ctx.beginPath(); ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(S.sweep) * R * S.range, cy + Math.sin(S.sweep) * R * S.range); ctx.stroke();
  ctx.fillStyle = CV.main; ctx.fillRect(cx - 4, cy - 4, 8, 8);
  if (S.exposed > 0) { ctx.strokeStyle = 'rgba(' + CV.alertRgb + ',' + (.55 + .4 * Math.sin(S.t * 6)) + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, 14, 0, TAU); ctx.stroke(); ctx.lineWidth = 1; }
  S.units.forEach((u, i) => {       // установки: зелёная готова, жёлтая перезаряжается, оранжевая без снарядов, красная уничтожена
    const a = i / S.units.length * TAU - Math.PI / 2, x = cx + Math.cos(a) * 22, y = cy + Math.sin(a) * 22;
    ctx.fillStyle = u.dead ? CV.alert : !u.ammo ? CV.warn : u.cd > 0 ? CV.cool : CV.main; ctx.fillRect(x - 3, y - 3, 6, 6);
    if (u.bot) ctx.strokeRect(x - 5, y - 5, 10, 10);   // рамка у автономных
  });

  ctx.font = '10px ' + CV.font; ctx.textAlign = 'center';
  for (const t of S.targets) {
    if (!t.seen) continue;
    const a = 1 - .65 * Math.min(1, (S.t - t.ping) * S.rs / TAU), x = cx + t.px * R, y = cy + t.py * R;
    ctx.fillStyle = CV.blip(a);
    ctx.beginPath(); ctx.arc(x, y, 4, 0, TAU); ctx.fill();
    ctx.fillText(tn(t.T), x, y + 15);
    ctx.fillText(t.T.kmh + ' ' + tr('kmh'), x, y + 26);
    ctx.fillText(tr('hit') + Math.round(bestCh(t.T) * 100) + '%', x, y + 37);
    if (t.obs > 0) ctx.fillText(tr('obs') + Math.min(S.d.obs, t.obs | 0) + '/' + S.d.obs, x, y + 48);
  }
  ctx.fillStyle = CV.shot;
  for (const s of S.shots) { ctx.beginPath(); ctx.arc(cx + s.x * R, cy + s.y * R, 2.5, 0, TAU); ctx.fill(); }
  ctx.font = 'bold 12px ' + CV.font;
  for (const f of S.fx) {
    const x = cx + f.x * R, y = cy + f.y * R - f.t * 25;
    ctx.globalAlpha = 1 - f.t / 1.2; ctx.strokeStyle = f.col; ctx.fillStyle = f.col;
    ctx.beginPath(); ctx.arc(x, y + f.t * 25, 6 + f.t * 22, 0, TAU); ctx.stroke();
    ctx.fillText(f.txt, x, y - 8); ctx.globalAlpha = 1;
  }
}

// ---- магазин: можно купить несколько установок (до MAXU), даже одинаковых ----
const bmTxt = v => tr(v <= 0 ? 'b0' : v <= .35 ? 'b1' : v <= .7 ? 'b2' : 'b3');
let shopBtns = [];
function buildShop() {
  const box = $('slist'); box.innerHTML = ''; shopBtns = [];
  for (const id in SYS) {
    const s = SYS[id], c = document.createElement('div'); c.className = 'card';
    c.innerHTML = '<img class="pic" src="img/' + id + '.jpg" alt=""><div class="inf"><h3>' + s.fl + ' ' + nm(s) + ' <small class="cnt"></small></h3>' +
      tr('missileL') + mn(s) + ' · ~' + s.kmh + ' ' + tr('kmh') + '<br>' + tr('rangeL') + s.km + ' ' + tr('km') + tr('cap') + s.cap + tr('fire') + s.cd + tr('sec') + '<br>' +
      tr('balL') + bmTxt(s.bm) + tr('acc') + (s.acc >= 0 ? '+' : '') + Math.round(s.acc * 100) + '%<br>' + tr('svcx') + s.svc + '</div>';
    const im = c.querySelector('img');
    im.onerror = () => { const d = document.createElement('div'); d.className = 'pic'; d.textContent = s.fl; im.replaceWith(d); };
    const b = document.createElement('button'), r = document.createElement('button');
    b.onclick = () => buy(id); r.onclick = () => restore(id);
    c.querySelector('.inf').append(b, r); box.append(c); shopBtns.push([c, b, r, c.querySelector('.cnt'), id]);
  }
  updShop();
}
function updShop() {
  if (!S || $('shop').hidden) return;
  $('smoney').textContent = '💰 ' + fmt(S.money) + ' · ' + S.units.length + '/' + MAXU;
  for (const [c, b, r, cnt, id] of shopBtns) {
    const mine = S.units.filter(u => u.id === id), nd = mine.filter(u => u.dead).length, p = price(id), rc = rcost(id), full = S.units.length >= MAXU;
    cnt.textContent = mine.length ? '· ' + tr('units') + mine.length : '';
    c.classList.toggle('cur', mine.length > nd); c.classList.toggle('dead', nd > 0);
    b.disabled = full || S.money < p; b.textContent = full ? tr('full') : tr('buy') + fmt(p);
    r.hidden = !nd; r.disabled = S.money < rc; r.textContent = tr('restore') + fmt(rc) + (nd > 1 ? ' (' + nd + ')' : '');
  }
}
function buy(id) {
  if (S.units.length >= MAXU || S.money < price(id)) return;
  S.money -= price(id); addUnit(id, 1); upd();   // купленные установки автономны
}
function restore(id) {
  const u = S.units.find(x => x.id === id && x.dead), c = rcost(id);
  if (!u || S.money < c) return;
  S.money -= c; Object.assign(u, { dead: 0, ammo: capOf(u), foul: 0, cd: 0 }); upd();
}
$('shopBtn').onclick = () => { if (S && !S.over) { $('shop').hidden = false; buildShop(); } };
$('sclose').onclick = () => { $('shop').hidden = true; };
$('auto').onclick = () => {
  if (!S) return;
  S.auto = autoOn = !S.auto; try { localStorage.pvoAuto = S.auto ? '1' : '0'; } catch (e) {}
  upd();
};

let acc = 0;
function loop(ts) {
  const dt = Math.min(.05, (ts - last) / 1000 || 0); last = ts;
  if (S && !S.over && $('shop').hidden && $('set').hidden && $('eula').hidden) { step(dt); acc += dt; if (acc > .2) { acc = 0; upd(); } }
  draw(); requestAnimationFrame(loop);
}

cv.addEventListener('pointerdown', e => {
  if (!S || S.over) return;
  const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
  let pick = null, bd = 45;
  for (const t of S.targets) {
    if (!t.seen) continue;
    const d = Math.hypot(cx + t.px * R - x, cy + t.py * R - y);
    if (d < bd) { bd = d; pick = t; }
  }
  if (pick) fire(pick);
});
document.querySelectorAll('#menu button[data-k]').forEach(b => b.onclick = () => newGame(b.dataset.k));
const markDiff = () => {
  document.querySelectorAll('#diff [data-d]').forEach(b => b.classList.toggle('cur', +b.dataset.d === diff));
  $('dname').textContent = tr('d' + diff);
};
document.querySelectorAll('#diff [data-d]').forEach(b => b.onclick = () => { diff = +b.dataset.d; try { localStorage.pvoDiff = diff; } catch (e) {} markDiff(); });
$('again').onclick = () => { $('over').hidden = true; $('menu').hidden = false; };
const markLang = () => document.querySelectorAll('[data-l]').forEach(b => b.classList.toggle('cur', b.dataset.l === setLang));
$('gear').onclick = $('gearM').onclick = () => { $('set').hidden = false; markLang(); };
$('setClose').onclick = () => { $('set').hidden = true; };
document.querySelectorAll('[data-l]').forEach(b => b.onclick = () => {
  setLang = b.dataset.l; try { localStorage.pvoLang = setLang; } catch (e) {}
  applyLang(); upd(); markLang();
});
// ---- соглашение: показывается при первом запуске, потом доступно в настройках ----
let agreed = false;
try { agreed = localStorage.pvoAgree === '1'; } catch (e) {}
$('eulaOk').onclick = () => { try { localStorage.pvoAgree = '1'; } catch (e) {} $('eula').hidden = true; };
$('eulaBtn').onclick = () => { $('set').hidden = true; $('eula').hidden = false; markLang(); };
if (!agreed) $('eula').hidden = false;
const markStyle = () => document.querySelectorAll('#styles [data-st]').forEach(b => b.classList.toggle('cur', b.dataset.st === style));
document.querySelectorAll('#styles [data-st]').forEach(b => b.onclick = () => {
  style = b.dataset.st; try { localStorage.pvoStyle = style; } catch (e) {}
  applyTheme(); markStyle();
});
applyTheme(); buildSwatches(); markStyle();
applyLang();
requestAnimationFrame(loop);
