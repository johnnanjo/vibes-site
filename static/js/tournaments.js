(function () {
  var form = document.getElementById('tf'); if (!form) return;
  var rows = [].slice.call(document.querySelectorAll('#tf-list .row')), grps = [].slice.call(document.querySelectorAll('[data-grp]'));
  var KANTO = { '東京都': 1, '神奈川県': 1, '埼玉県': 1, '千葉県': 1, '茨城県': 1, '栃木県': 1, '群馬県': 1 };
  function jst(off) { return new Date(Date.now() + 9 * 36e5 + (off || 0) * 864e5).toISOString().slice(0, 10); }
  var qs = new URLSearchParams(location.search);
  if (qs.get('game')) qs.set('g', qs.get('game'));
  if (qs.get('women')) qs.set('w', '1');
  ['date', 'p', 'g', 'c', 'k', 'q', 'w'].forEach(function (k) {
    var v = qs.get(k); if (!v) return; var el = form.elements[k]; if (!el) return;
    if (el.tagName === 'SELECT' && ![].some.call(el.options, function (o) { return o.value === v; })) { var o = document.createElement('option'); o.value = v; o.textContent = /^\d{4}-\d\d-\d\d$/.test(v) ? (+v.slice(5, 7)) + '月' + (+v.slice(8)) + '日' : v; el.appendChild(o); }
    el.value = v;
  });
  function range(v) {
    var t = jst(0);
    if (!v) return null;
    if (v === 'today') return [t, t];
    if (v === 'tomorrow') return [jst(1), jst(1)];
    if (v === 'week') return [t, jst(6)];
    if (v === 'month') return [t, jst(30)];
    if (v === 'weekend') { var w = new Date(t + 'T00:00:00Z').getUTCDay(), sat = w === 0 ? -1 : 6 - w; return [jst(Math.max(0, sat)), jst(sat + 1)]; }
    if (/^\d{4}-\d\d-\d\d$/.test(v)) return [v, v];
    return null;
  }
  function apply() {
    var f = form.elements, r = range(f.date.value), p = f.p.value, g = f.g.value, c = f.c.value, k = f.k.value, q = (f.q.value || '').trim().toLowerCase(), w = f.w.value, n = 0;
    rows.forEach(function (a) {
      var ok = true, ds = a.dataset;
      if (r && (ds.e < r[0] || ds.d > r[1])) ok = false;
      if (ok && p) ok = p === 'kanto' ? !!KANTO[ds.p] : ds.p === p;
      if (ok && g) ok = ds.g === g;
      if (ok && c) ok = (' ' + ds.c + ' ').indexOf(' ' + c + ' ') >= 0 || (c === 'C' && /\bbeginner\b/.test(ds.c));
      if (ok && k) ok = ds.k === k;
      if (ok && w) ok = ds.w === '1' || /\bladies\b/.test(ds.c);
      if (ok && q) ok = q.split(/\s+/).every(function (x) { return ds.q.indexOf(x) >= 0; });
      a.hidden = !ok; if (ok) n++;
    });
    grps.forEach(function (gp) { var v = gp.querySelectorAll('.row:not([hidden])').length; gp.hidden = !v; gp.querySelector('[data-grpn]').textContent = v + '件'; });
    document.getElementById('tf-n').textContent = n + '件';
    document.getElementById('tf-empty').hidden = n > 0;
    var qm = document.getElementById('tf-q'); qm.hidden = !q; if (q) qm.textContent = '「' + f.q.value + '」で絞り込み中';
    var u = new URLSearchParams(); ['date', 'p', 'g', 'c', 'k', 'q', 'w'].forEach(function (x) { if (f[x].value) u.set(x, f[x].value); });
    try { history.replaceState(null, '', location.pathname + (u.toString() ? '?' + u : '')); } catch (e) {}
  }
  form.addEventListener('change', apply);
  document.getElementById('tf-clr').addEventListener('click', function () { form.reset(); form.elements.q.value = ''; form.elements.w.value = ''; apply(); });
  apply();
})();
