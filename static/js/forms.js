(function () {
  var COLOR = 2500, BASE = 25000;
  [].forEach.call(document.querySelectorAll('form[data-kind]'), function (form) {
    var msg = form.querySelector('[data-msg]'), kind = form.getAttribute('data-kind'), hook = form.getAttribute('data-hook');
    var price = document.querySelector('[data-price]'), color = form.querySelector('[data-color]');
    function total() { return BASE + (color && /カラー/.test(color.value) ? COLOR : 0); }
    if (color && price) color.addEventListener('change', function () { price.textContent = '¥' + total().toLocaleString(); });
    if (location.hash && kind === 'order') { var el = document.getElementById(location.hash.slice(1)); if (el) { var s = el.querySelector('select,input'); if (s) setTimeout(function () { s.focus(); }, 300); } }
    function show(ok, html) { msg.hidden = false; msg.className = 'msg ' + (ok ? 'ok' : 'ng'); msg.innerHTML = html; msg.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var bad = [].filter.call(form.querySelectorAll('[required]'), function (x) { return !String(x.value).trim(); });
      if (bad.length) { show(false, '未入力の項目があります。'); bad[0].focus(); return; }
      var data = { kind: kind, sentAt: new Date().toISOString(), page: location.href };
      new FormData(form).forEach(function (v, k) { data[k] = String(v).trim(); });
      if (data.hp) return;
      if (kind === 'order') data.total = total();
      var lines = Object.keys(data).filter(function (k) { return !/^(hp|kind|sentAt|page)$/.test(k); }).map(function (k) { return k + '：' + data[k]; }).join('\n');
      if (!hook) {
        var subj = kind === 'order' ? '【ご注文】Vibes Carbon Shaft' : '【お問い合わせ】VIBES';
        location.href = 'mailto:info@vibesbilliards.com?subject=' + encodeURIComponent(subj) + '&body=' + encodeURIComponent(lines);
        show(true, 'メールアプリが開きます。そのまま送信してください。開かない場合は info@vibesbilliards.com までお送りください。');
        return;
      }
      var btn = form.querySelector('button[type=submit]'); btn.disabled = true; var label = btn.textContent; btn.textContent = '送信中…';
      fetch(hook, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
        .then(function (r) { if (!r.ok) throw 0; return r.text(); })
        .then(function () {
          show(true, kind === 'order' ? '<b>ご注文を受け付けました。</b><br>ご入力のメールアドレスに、お振込先とご注文内容をお送りします（平日対応）。ご入金を確認してから工場へ発注します。' : '<b>送信しました。</b><br>通常1〜2営業日以内にご返信します。');
          form.reset(); if (price) price.textContent = '¥' + BASE.toLocaleString();
        })
        .catch(function () { show(false, '送信できませんでした。時間をおいてもう一度お試しいただくか、info@vibesbilliards.com までメールでお送りください。'); })
        .then(function () { btn.disabled = false; btn.textContent = label; });
    });
  });
})();
