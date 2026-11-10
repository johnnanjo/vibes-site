(function () {
  var box = document.getElementById('vb-week'); if (!box) return;
  var WD = ['日', '月', '火', '水', '木', '金', '土'];
  var AREAS = [['tokyo', '東京', 35.69, 139.69], ['saitama', 'さいたま', 35.86, 139.65], ['yokohama', '横浜', 35.44, 139.64], ['chiba', '千葉', 35.61, 140.12], ['sapporo', '札幌', 43.06, 141.35], ['sendai', '仙台', 38.27, 140.87], ['nagoya', '名古屋', 35.18, 136.91], ['osaka', '大阪', 34.69, 135.50], ['hiroshima', '広島', 34.39, 132.46], ['fukuoka', '福岡', 33.59, 130.40], ['naha', '那覇', 26.21, 127.68], ['geo', '現在地', 0, 0]];
  var P = { sun: '<circle cx="12" cy="12" r="4.5"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/>', cloud: '<path d="M7 18h10a4 4 0 0 0 0-8 6 6 0 0 0-11.5 1.5A3.3 3.3 0 0 0 7 18z"/>', rain: '<path d="M7 14h10a4 4 0 0 0 0-8 6 6 0 0 0-11.5 1.5A3.3 3.3 0 0 0 7 14zM8 17l-1 3M12 17l-1 3M16 17l-1 3"/>', snow: '<path d="M7 14h10a4 4 0 0 0 0-8 6 6 0 0 0-11.5 1.5A3.3 3.3 0 0 0 7 14zM8 18h.01M12 20h.01M16 18h.01"/>' };
  function ic(c) { c = +c; return c <= 2 ? 'sun' : c <= 48 ? 'cloud' : (c >= 71 && c <= 77) || (c >= 85 && c <= 86) ? 'snow' : 'rain'; }
  function svgI(n, s) { return '<svg width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (s > 30 ? 1.8 : 2) + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + P[n] + '</svg>'; }
  function lbl(c) { c = +c; if (c === 0) return '快晴'; if (c <= 2) return '晴れ'; if (c === 3) return 'くもり'; if (c <= 48) return '霧'; if (c <= 57) return '霧雨'; if (c <= 67) return '雨'; if (c <= 77) return '雪'; if (c <= 82) return 'にわか雨'; if (c <= 86) return '雪'; return '雷雨'; }
  function jst(off) { return new Date(Date.now() + 9 * 36e5 + (off || 0) * 864e5).toISOString().slice(0, 10); }
  function dow(s) { return new Date(s + 'T00:00:00Z').getUTCDay(); }
  var q = function (s) { return box.querySelector(s); };

  var tf = fetch('/data/tfeed.json').then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
  var sel = q('[data-wx-sel]'), cur = null;
  try { cur = JSON.parse(localStorage.getItem('vb_wx') || 'null'); } catch (e) {}
  if (!cur || !cur.id) cur = { id: 'tokyo' };
  AREAS.forEach(function (a) { var o = document.createElement('option'); o.value = a[0]; o.textContent = a[1]; if (a[0] === cur.id) o.selected = true; sel.appendChild(o); });
  function coords() { var a = AREAS.filter(function (x) { return x[0] === cur.id; })[0] || AREAS[0]; if (a[0] === 'geo') return cur.lat ? { name: '現在地', lat: cur.lat, lon: cur.lon } : null; return { name: a[1], lat: a[2], lon: a[3] }; }
  function loadWx() { var c = coords(); if (!c) return Promise.resolve(null); return fetch('https://api.open-meteo.com/v1/forecast?latitude=' + c.lat + '&longitude=' + c.lon + '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&current=temperature_2m,weather_code&timezone=Asia%2FTokyo&forecast_days=7').then(function (r) { return r.ok ? r.json() : null; }).then(function (j) { if (j) j._name = c.name; return j; }).catch(function () { return null; }); }
  var W = null;
  function paintWx(j) {
    W = j; var wx = document.getElementById('vb-wx');
    if (!j || !j.daily) { q('[data-wx-pl]').textContent = '天気を取得できませんでした'; return; }
    var d = j.daily, c = j.current || {}, code = d.weather_code[0], pp = d.precipitation_probability_max[0] || 0;
    var old = wx.querySelector('svg'); old.outerHTML = svgI(ic(code), 44);
    q('[data-wx-pl]').textContent = j._name + '　' + lbl(code);
    q('[data-wx-now]').textContent = c.temperature_2m != null ? 'いま ' + Math.round(c.temperature_2m) + '°' : '';
    q('[data-wx-hl]').textContent = '最高 ' + Math.round(d.temperature_2m_max[0]) + '° ／ 最低 ' + Math.round(d.temperature_2m_min[0]) + '°・降水 ' + pp + '%';
    var snow = (+code >= 71 && +code <= 77) || (+code >= 85 && +code <= 86), m = q('[data-wx-msg]');
    m.textContent = snow ? '雪の予報。ケースは防水カバー、足元は滑りにくい靴で。' : (pp >= 50 || +code >= 51) ? '雨の可能性が高め。キューケースは防水カバー＋傘を。' : pp >= 30 ? 'にわか雨の可能性あり。念のためケースカバーを。' : 'キューケースの持ち運びは問題なさそうです。';
    paintWeek();
  }
  var LIST = null;
  function paintWeek() {
    var html = '';
    for (var i = 0; i < 7; i++) {
      var s = jst(i), n = 0, w = dow(s);
      if (LIST) LIST.forEach(function (x) { if (x.d <= s && x.e >= s) n++; });
      var k = W && W.daily ? W.daily.time.indexOf(s) : -1, wx = '', t = '';
      if (k >= 0) { wx = svgI(ic(W.daily.weather_code[k]), 18); t = Math.round(W.daily.temperature_2m_max[k]) + '/' + Math.round(W.daily.temperature_2m_min[k]); }
      html += '<a class="wd' + (i === 0 ? ' on' : '') + '" href="/pages/tournaments?date=' + (i === 0 ? 'today' : s) + '"><span class="a">' + (i === 0 ? '今日' : i === 1 ? '明日' : WD[w]) + '</span><span class="n">' + (+s.slice(8)) + '</span>' + wx + '<span class="t">' + t + '</span><span class="c">' + (LIST ? n + '件' : '') + '</span></a>';
    }
    q('[data-wk-days]').innerHTML = html;
  }
  sel.addEventListener('change', function () {
    var id = sel.value;
    if (id === 'geo') {
      if (!navigator.geolocation) { sel.value = cur.id; return; }
      navigator.geolocation.getCurrentPosition(function (p) { cur = { id: 'geo', lat: +p.coords.latitude.toFixed(2), lon: +p.coords.longitude.toFixed(2) }; try { localStorage.setItem('vb_wx', JSON.stringify(cur)); } catch (e) {} loadWx().then(paintWx); }, function () { sel.value = cur.id; });
      return;
    }
    cur = { id: id }; try { localStorage.setItem('vb_wx', JSON.stringify(cur)); } catch (e) {} loadWx().then(paintWx);
  });
  Promise.all([tf, loadWx()]).then(function (r) {
    LIST = r[0];
    var t0 = jst(0), n = 0;
    if (LIST) LIST.forEach(function (x) { if (x.d <= t0 && x.e >= t0) n++; });
    q('[data-wk-n]').innerHTML = (LIST ? n : '–') + '<small>件</small>';
    paintWeek(); paintWx(r[1]);
  });
})();
