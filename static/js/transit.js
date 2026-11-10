(function () {
  [].forEach.call(document.querySelectorAll('[data-tr-form]'), function (form) {
    var f = form.elements.from, t = form.elements.to, msg = form.querySelector('[data-tr-msg]');
    var preset = t.value;
    try { var s = JSON.parse(localStorage.getItem('vb_tr') || '{}'); if (s.from) f.value = s.from; if (!preset && s.to) t.value = s.to; } catch (e) {}
    function clean(v) { return (v || '').trim().replace(/駅$/, ''); }
    form.querySelector('[data-tr-sw]').addEventListener('click', function () { var a = f.value; f.value = t.value; t.value = a; });
    function go(kind) {
      var from = clean(f.value), to = clean(t.value); msg.textContent = '';
      if (!to) { msg.textContent = '到着駅を入力してください。'; t.focus(); return; }
      if (kind === 'yahoo' && !from) { msg.textContent = 'Yahoo!乗換案内では出発駅を入力してください（現在地から調べる場合はGoogleマップを使ってください）。'; f.focus(); return; }
      try { localStorage.setItem('vb_tr', JSON.stringify({ from: f.value.trim(), to: preset ? '' : t.value.trim() })); } catch (e) {}
      var url = kind === 'yahoo'
        ? 'https://transit.yahoo.co.jp/search/result?from=' + encodeURIComponent(from) + '&to=' + encodeURIComponent(to)
        : 'https://www.google.com/maps/dir/?api=1' + (from ? '&origin=' + encodeURIComponent(from + '駅') : '') + '&destination=' + encodeURIComponent(to + '駅') + '&travelmode=transit';
      window.open(url, '_blank', 'noopener');
    }
    [].forEach.call(form.querySelectorAll('[data-tr]'), function (b) { b.addEventListener('click', function () { go(b.getAttribute('data-tr')); }); });
    form.addEventListener('submit', function (e) { e.preventDefault(); go(f.value.trim() ? 'yahoo' : 'google'); });
  });
})();
