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
  orlan:    { n: 'Орлан-10',      ne: 'Orlan-10',      v: .03,  kmh: 150,   p: .45, r: 3e5,   dmg: 4,  t0: 0,   w: 2, recon: 1 },
  shahed:   { n: 'Шахед-136',     ne: 'Shahed-136',    v: .035, kmh: 185,   p: .40, r: 4e5,   dmg: 8,  t0: 0,   w: 3 },
  kalibr:   { n: 'Калибр',        ne: 'Kalibr',        v: .085, kmh: 860,   p: .75, r: 1e6,   dmg: 20, t0: 15,  w: 2 },
  kh55:     { n: 'Х-55',          ne: 'Kh-55',         v: .08,  kmh: 830,   p: .75, r: 9e5,   dmg: 18, t0: 20,  w: 1.5 },
  tb2:      { n: 'Байрактар TB2', ne: 'Bayraktar TB2', v: .04,  kmh: 222,   p: .45, r: 6e5,   dmg: 8,  t0: 25,  w: 1.5, recon: 1 },
  tomahawk: { n: 'Томагавк',      ne: 'Tomahawk',      v: .085, kmh: 880,   p: .75, r: 1e6,   dmg: 20, t0: 30,  w: 1.2 },
  grad:     { n: 'Град (ракета)', ne: 'Grad rocket',   v: .11,  kmh: 2500,  p: .55, r: 5e5,   dmg: 6,  t0: 35,  w: 1.5 },
  kh101:    { n: 'Х-101',         ne: 'Kh-101',        v: .09,  kmh: 900,   p: .75, r: 1.1e6, dmg: 20, t0: 40,  w: 1.5 },
  geran3:   { n: 'Герань-3',      ne: 'Geran-3',       v: .05,  kmh: 300,   p: .40, r: 5e5,   dmg: 10, t0: 45,  w: 1.5 },
  storm:    { n: 'Storm Shadow',  ne: 'Storm Shadow',  v: .095, kmh: 1000,  p: .70, r: 1.3e6, dmg: 22, t0: 60,  w: 1 },
  atacms:   { n: 'ATACMS',        ne: 'ATACMS',        v: .13,  kmh: 3700,  p: .78, r: 2e6,   dmg: 30, t0: 70,  w: .9, bal: 1 },
  geran5:   { n: 'Герань-5',      ne: 'Geran-5',       v: .065, kmh: 500,   p: .45, r: 7e5,   dmg: 12, t0: 80,  w: 1.5 },
  kh22:     { n: 'Х-22',          ne: 'Kh-22',         v: .13,  kmh: 3700,  p: .60, r: 1.8e6, dmg: 28, t0: 90,  w: .8 },
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
const sy = () => SYS[S.cur], F = () => S.fleet[S.cur], capOf = () => sy().cap + S.capUp;

// ---- язык: авто (по системе ПВО) / ru / en ----
let setLang = 'auto', shown = '';
try { setLang = localStorage.pvoLang || 'auto'; } catch (e) {}
const L = () => setLang !== 'auto' ? setLang : (S ? sy().lang : 'ru');
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
const tr = k => I[L()][k];

// ---- засветка наблюдательными дронами и потеря установки ----
const OBS = 5, EXPO = 60, STARTER_VAL = { osa: 3e6, s300: 8e6 };
const restoreCost = id => Math.round((SYS[id].price || STARTER_VAL[id]) * .7 / 1e5) * 1e5;
const lossChance = T => clamp((T.dmg - 8) / 55 + .05, 0, .8);
function destroyVehicle() {
  const f = F(); f.dead = 1; f.ammo = 0;
  const m = nm(sy()) + tr('lostFx'); addFx(0, 0, '#f55', m); flash(m); navigator.vibrate && navigator.vibrate(300);
}
const nm = s => L() === 'en' && s.ne ? s.ne : s.n;
const mn = s => L() === 'en' && s.me ? s.me : s.mis;
const tn = T => L() === 'en' ? T.ne : T.n;
function applyLang() {
  const l = shown = L();
  document.documentElement.lang = l;
  document.querySelectorAll('[data-t]').forEach(e => e.innerHTML = I[l][e.dataset.t]);
  for (const k of ['osa', 's300']) $(k === 'osa' ? 'mOsa' : 'mS300').innerHTML = '<b>' + nm(SYS[k]) + '</b><small>' + I[l]['d_' + k] + '</small>';
  $('best').textContent = best ? I[l].best + fmt(best) : '';
  if (!$('shop').hidden) buildShop();
}


const fmt = n => L() === 'en' ? (n >= 1e6 ? +(n / 1e6).toFixed(2) + 'M' : Math.round(n / 1e3) + 'k')
  : (n >= 1e6 ? +(n / 1e6).toFixed(2) + ' млн' : Math.round(n / 1e3) + ' тыс');
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function newGame(k) {
  S = { cur: k, own: { [k]: 1 }, fleet: { [k]: { ammo: SYS[k].cap, foul: 0 } }, capUp: 0, cdMul: 1,
        exposed: 0, money: 1.5e6, hp: 100, kills: 0, earned: 0, cd: 0,
        rs: 1.6, range: .6, acc: 0, sweep: 0, t: 0, spawn: 1.5,
        targets: [], shots: [], fx: [], lv: { rs: 0, range: 0, acc: 0, cap: 0, cd: 0 }, over: false };
  $('menu').hidden = true; $('over').hidden = true; $('shop').hidden = true; upd();
}

// шанс попадания: база цели + система + улучшения - штраф за грязные трубы
function chance(T) {
  const s = sy(), f = F(), pen = f.foul > 40 ? (f.foul - 40) / 60 * .4 : 0;
  let c = T.p + s.acc + S.acc - pen;
  if (T.bal) c *= s.bm * (T.bal === 2 ? .7 : 1);
  return c <= 0 ? 0 : clamp(c, .05, .97);
}

// ---- обслуживание и улучшения ----
const SV = [
  { k: 'ammo',    cost: () => 5e5 * sy().svc, no: () => F().dead || F().ammo >= capOf(), sub: () => F().ammo + '/' + capOf(), do: () => F().ammo = capOf() },
  { n: 'Чистка труб', cost: () => 1e5 * sy().svc, no: () => F().dead || F().foul <= 0, sub: () => tr('wear') + Math.round(F().foul) + '%', do: () => F().foul = 0 },
  { k: 'repair', cost: () => 3e5, no: () => S.hp >= 100, sub: () => Math.round(S.hp) + '%', do: () => S.hp = Math.min(100, S.hp + 30) }
];
const up = (k, n, base, max, f) => ({
  k: 'u_' + k, cost: () => base * 1.6 ** S.lv[k], no: () => S.lv[k] >= max,
  sub: () => S.lv[k] >= max ? tr('max') : tr('lvl') + S.lv[k] + '/' + max, do: () => { S.lv[k]++; f(); }
});
const UP = [
  up('rs', 'Скорость радара', 8e5, 5, () => S.rs += .45),
  up('range', 'Дальность радара', 1e6, 4, () => S.range = Math.min(1, S.range + .1)),
  up('acc', 'Наведение', 1.5e6, 5, () => S.acc += .04),
  up('cap', 'Боезапас +2', 7e5, 5, () => { S.capUp += 2; for (const k in S.fleet) S.fleet[k].ammo += 2; }),
  up('cd', 'Скорость пуска', 9e5, 4, () => S.cdMul *= .85)
];
const items = [];
function mk(box, o) {
  const b = document.createElement('button');
  b.onclick = () => {
    if (!S || S.over || o.no() || S.money < o.cost()) return;
    S.money -= o.cost(); o.do(); upd();
  };
  box.append(b); items.push([b, o]);
}
SV.forEach(o => mk($('sv'), o)); UP.forEach(o => mk($('up'), o));

function upd() {
  if (!S) return;
  if (shown !== L()) applyLang();
  $('money').textContent = '💰 ' + fmt(S.money);
  $('hp').textContent = '🛡 ' + Math.max(0, Math.round(S.hp)) + '%';
  $('ammo').textContent = '🚀 ' + F().ammo + '/' + capOf();
  $('foul').textContent = '🔧 ' + Math.round(100 - F().foul) + '%';
  $('shopBtn').innerHTML = '<b>🛒 ' + tr('shop') + '</b><span>' + sy().fl + ' ' + nm(sy()) + (F().dead ? ' ⚠' : '') + '</span>';
  updShop();
  $('expo').textContent = S.exposed > 0 ? tr('exp') + Math.ceil(S.exposed) + tr('sec') : '';
  $('kills').textContent = '✔ ' + S.kills;
  for (const [b, o] of items) {
    const m = o.no(), c = o.cost();
    b.disabled = m || S.money < c;
    b.innerHTML = '<b>' + tr(o.k) + '</b><small>' + (m ? '' : fmt(c) + ' · ') + o.sub() + '</small>';
  }
}
function flash(t) { $('msg').textContent = t; clearTimeout(flashT); flashT = setTimeout(() => $('msg').textContent = '', 1200); }

// ---- логика ----
function spawn() {
  const pool = Object.values(TYPES).filter(q => S.t >= q.t0);
  let w = Math.random() * pool.reduce((s, q) => s + q.w, 0), T = pool[0];
  for (const q of pool) { if ((w -= q.w) <= 0) { T = q; break; } }
  const a = Math.random() * TAU;
  const x = Math.cos(a) * 1.05, y = Math.sin(a) * 1.05;
  const dx = (Math.random() - .5) * .1 - x, dy = (Math.random() - .5) * .1 - y, d = Math.hypot(dx, dy);
  S.targets.push({ T, x, y, vx: dx / d * T.v, vy: dy / d * T.v, px: x, py: y, seen: false, ping: 0 });
}
const inSweep = (a0, a1, x) => a1 >= a0 ? x >= a0 && x <= a1 : x >= a0 || x <= a1;
const addFx = (x, y, col, txt) => S.fx.push({ x, y, col, txt, t: 0 });

function fire(t) {
  const f = F(), ch = chance(t.T);
  if (f.dead) return flash(tr('deadFire'));
  if (S.cd > 0) return flash(tr('reload'));
  if (f.ammo < 1) return flash(tr('noAmmo'));
  if (!ch) return flash(nm(sy()) + tr('noBal'));
  if (Math.hypot(t.x, t.y) > sy().range) return flash(tr('range'));
  f.ammo--; S.cd = sy().cd * S.cdMul; f.foul = Math.min(100, f.foul + 7);
  S.shots.push({ x: 0, y: 0, t, ch, ms: sy().ms });
  upd();
}

function step(dt) {
  S.t += dt; S.cd = Math.max(0, S.cd - dt); S.exposed = Math.max(0, S.exposed - dt);
  const pa = S.sweep; S.sweep = (S.sweep + S.rs * dt) % TAU;
  S.spawn -= dt;
  if (S.spawn <= 0) { spawn(); S.spawn = Math.max(.55, 3.2 - S.t * .02) * (.7 + Math.random() * .6) * (S.exposed > 0 ? .6 : 1); }
  for (const t of S.targets) {
    if (t.T.recon && (t.orb || Math.hypot(t.x, t.y) <= .4)) {   // наблюдатель кружит вокруг базы
      if (!t.orb) { t.orb = 1; t.oa = Math.atan2(t.y, t.x); }
      t.oa += t.T.v / .4 * dt; t.x = Math.cos(t.oa) * .4; t.y = Math.sin(t.oa) * .4;
      t.obs = (t.obs || 0) + dt;
      if (t.obs >= OBS && S.exposed <= 0) { S.exposed = EXPO; t.obs = 0; addFx(0, 0, '#f55', tr('spotted')); flash(tr('spotted')); }
    } else { t.x += t.vx * dt; t.y += t.vy * dt; }
    const d = Math.hypot(t.x, t.y), ang = (Math.atan2(t.y, t.x) + TAU) % TAU;
    if (d <= S.range && inSweep(pa, S.sweep, ang)) { t.px = t.x; t.py = t.y; t.ping = S.t; t.seen = true; }
    if (d < .05) {
      t.dead = 1; S.hp -= t.T.dmg; addFx(0, 0, '#f55', tr('strike') + t.T.dmg + '%'); navigator.vibrate && navigator.vibrate(120);
      if (S.exposed > 0 && !F().dead && Math.random() < lossChance(t.T)) destroyVehicle();
      if (S.hp <= 0) return end();
    }
  }
  for (const s of S.shots) {
    if (s.t.dead) { s.done = 1; continue; }
    const dx = s.t.x - s.x, dy = s.t.y - s.y, d = Math.hypot(dx, dy), m = s.ms * dt;
    if (d <= m + .02) {
      s.done = 1;
      if (Math.random() < s.ch) {
        const T = s.t.T; s.t.dead = 1; S.kills++; S.money += T.r; S.earned += T.r;
        addFx(s.t.x, s.t.y, '#7f7', '+' + fmt(T.r));
      } else addFx(s.t.x, s.t.y, '#fb3', 'ПРОМАХ');
    } else { s.x += dx / d * m; s.y += dy / d * m; }
  }
  S.targets = S.targets.filter(t => !t.dead); S.shots = S.shots.filter(s => !s.done);
  for (const f of S.fx) f.t += dt;
  S.fx = S.fx.filter(f => f.t < 1.2);
  const ids = Object.keys(S.own);
  if (ids.every(k => S.fleet[k].dead) && S.money < Math.min(...ids.map(restoreCost))) end('lostAll');
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
  ctx.fillStyle = '#020a04'; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = '#0a5a1a'; ctx.lineWidth = 1;
  for (let i = 1; i <= 4; i++) { ctx.beginPath(); ctx.arc(cx, cy, R * i / 4, 0, TAU); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(cx - R, cy); ctx.lineTo(cx + R, cy); ctx.moveTo(cx, cy - R); ctx.lineTo(cx, cy + R); ctx.stroke();
  if (!S) return;
  ctx.strokeStyle = '#2f4'; ctx.beginPath(); ctx.arc(cx, cy, R * S.range, 0, TAU); ctx.stroke();
  ctx.setLineDash([4, 6]); ctx.strokeStyle = '#3a6'; ctx.beginPath(); ctx.arc(cx, cy, R * sy().range, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
  for (let i = 0; i < 24; i++) {
    ctx.fillStyle = 'rgba(40,255,80,' + (.28 * (1 - i / 24)) + ')';
    ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, R * S.range, S.sweep - (i + 1) * .03, S.sweep - i * .03); ctx.fill();
  }
  ctx.strokeStyle = '#6f8'; ctx.beginPath(); ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(S.sweep) * R * S.range, cy + Math.sin(S.sweep) * R * S.range); ctx.stroke();
  ctx.fillStyle = '#4f4'; ctx.fillRect(cx - 4, cy - 4, 8, 8);
  if (S.exposed > 0) { ctx.strokeStyle = 'rgba(255,70,70,' + (.55 + .4 * Math.sin(S.t * 6)) + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, 14, 0, TAU); ctx.stroke(); ctx.lineWidth = 1; }

  ctx.font = '10px ui-monospace,Menlo,Consolas,monospace'; ctx.textAlign = 'center';
  for (const t of S.targets) {
    if (!t.seen) continue;
    const a = 1 - .65 * Math.min(1, (S.t - t.ping) * S.rs / TAU), x = cx + t.px * R, y = cy + t.py * R;
    ctx.fillStyle = 'rgba(80,255,100,' + a + ')';
    ctx.beginPath(); ctx.arc(x, y, 4, 0, TAU); ctx.fill();
    ctx.fillText(tn(t.T), x, y + 15);
    ctx.fillText(t.T.kmh + ' ' + tr('kmh'), x, y + 26);
    ctx.fillText(tr('hit') + Math.round(chance(t.T) * 100) + '%', x, y + 37);
    if (t.obs > 0) ctx.fillText(tr('obs') + Math.min(OBS, t.obs | 0) + '/' + OBS, x, y + 48);
  }
  ctx.fillStyle = '#cfc';
  for (const s of S.shots) { ctx.beginPath(); ctx.arc(cx + s.x * R, cy + s.y * R, 2.5, 0, TAU); ctx.fill(); }
  ctx.font = 'bold 12px ui-monospace,Menlo,Consolas,monospace';
  for (const f of S.fx) {
    const x = cx + f.x * R, y = cy + f.y * R - f.t * 25;
    ctx.globalAlpha = 1 - f.t / 1.2; ctx.strokeStyle = f.col; ctx.fillStyle = f.col;
    ctx.beginPath(); ctx.arc(x, y + f.t * 25, 6 + f.t * 22, 0, TAU); ctx.stroke();
    ctx.fillText(f.txt, x, y - 8); ctx.globalAlpha = 1;
  }
}

// ---- магазин ----
const bmTxt = v => tr(v <= 0 ? 'b0' : v <= .35 ? 'b1' : v <= .7 ? 'b2' : 'b3');
let shopBtns = [];
function buildShop() {
  const box = $('slist'); box.innerHTML = ''; shopBtns = [];
  for (const id in SYS) {
    const s = SYS[id], c = document.createElement('div'); c.className = 'card';
    c.innerHTML = '<img class="pic" src="img/' + id + '.jpg" alt=""><div class="inf"><h3>' + s.fl + ' ' + nm(s) + '</h3>' +
      tr('missileL') + mn(s) + ' · ~' + s.kmh + ' ' + tr('kmh') + '<br>' + tr('rangeL') + s.km + ' ' + tr('km') + tr('cap') + s.cap + tr('fire') + s.cd + tr('sec') + '<br>' +
      tr('balL') + bmTxt(s.bm) + tr('acc') + (s.acc >= 0 ? '+' : '') + Math.round(s.acc * 100) + '%<br>' + tr('svcx') + s.svc + '</div>';
    const im = c.querySelector('img');
    im.onerror = () => { const d = document.createElement('div'); d.className = 'pic'; d.textContent = s.fl; im.replaceWith(d); };
    const b = document.createElement('button'); b.onclick = () => buy(id);
    c.querySelector('.inf').append(b); box.append(c); shopBtns.push([c, b, id]);
  }
  updShop();
}
function updShop() {
  if (!S || $('shop').hidden) return;
  $('smoney').textContent = '💰 ' + fmt(S.money);
  for (const [c, b, id] of shopBtns) {
    const own = S.own[id], dead = own && S.fleet[id].dead, cur = S.cur === id && !dead, p = dead ? restoreCost(id) : SYS[id].price;
    c.classList.toggle('cur', cur); c.classList.toggle('dead', !!dead);
    b.disabled = cur || ((!own || dead) && S.money < p);
    b.textContent = dead ? tr('restore') + fmt(p) : cur ? tr('active') : own ? tr('pick') : tr('buy') + fmt(p);
  }
}
function buy(id) {
  if (S.own[id]) {
    if (S.fleet[id].dead) {
      const c = restoreCost(id); if (S.money < c) return;
      S.money -= c; S.fleet[id] = { ammo: SYS[id].cap + S.capUp, foul: 0 };
    }
    S.cur = id; return upd();
  }
  const p = SYS[id].price; if (S.money < p) return;
  S.money -= p; S.own[id] = 1; S.fleet[id] = { ammo: SYS[id].cap + S.capUp, foul: 0 }; S.cur = id; upd();
}
$('shopBtn').onclick = () => { if (S && !S.over) { $('shop').hidden = false; buildShop(); } };
$('sclose').onclick = () => { $('shop').hidden = true; };

let acc = 0;
function loop(ts) {
  const dt = Math.min(.05, (ts - last) / 1000 || 0); last = ts;
  if (S && !S.over && $('shop').hidden && $('set').hidden) { step(dt); acc += dt; if (acc > .2) { acc = 0; upd(); } }
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
$('again').onclick = () => { $('over').hidden = true; $('menu').hidden = false; };
const markLang = () => document.querySelectorAll('#set [data-l]').forEach(b => b.classList.toggle('cur', b.dataset.l === setLang));
$('gear').onclick = $('gearM').onclick = () => { $('set').hidden = false; markLang(); };
$('setClose').onclick = () => { $('set').hidden = true; };
document.querySelectorAll('#set [data-l]').forEach(b => b.onclick = () => {
  setLang = b.dataset.l; try { localStorage.pvoLang = setLang; } catch (e) {}
  applyLang(); upd(); markLang();
});
applyLang();
requestAnimationFrame(loop);
