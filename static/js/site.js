(function () {
  var d = document, dr = d.getElementById('drawer');
  function open(e) { if (!dr) return; if (e) e.preventDefault(); dr.hidden = false; d.body.style.overflow = 'hidden'; var c = dr.querySelector('[data-close-menu]'); if (c) c.focus(); }
  function close() { if (!dr) return; dr.hidden = true; d.body.style.overflow = ''; }
  [].forEach.call(d.querySelectorAll('[data-open-menu]'), function (b) { b.addEventListener('click', open); });
  [].forEach.call(d.querySelectorAll('[data-close-menu]'), function (b) { b.addEventListener('click', close); });
  d.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  if (dr) dr.addEventListener('click', function (e) { var a = e.target.closest('a'); if (a && a.getAttribute('href').charAt(0) === '#') close(); });

  /* language links keep the current page */
  var m = location.pathname.match(/^\/(en|ko|zh|vi)(\/|$)/), pre = m ? '/' + m[1] : '', rest = location.pathname.slice(pre.length) || '/';
  [].forEach.call(d.querySelectorAll('[data-langs] a'), function (a) { var p = a.getAttribute('data-prefix'); a.href = p + rest + location.search; if (p === pre) a.className = 'cur'; });

  /* day tabs (home calendar) */
  [].forEach.call(d.querySelectorAll('[data-daytabs]'), function (box) {
    var tabs = box.querySelectorAll('[data-day]');
    [].forEach.call(tabs, function (t) {
      t.addEventListener('click', function () {
        [].forEach.call(tabs, function (x) { x.setAttribute('aria-selected', x === t ? 'true' : 'false'); });
        [].forEach.call(box.querySelectorAll('[data-daypanel]'), function (p) { p.hidden = p.getAttribute('data-daypanel') !== t.getAttribute('data-day'); });
      });
    });
  });

  /* desktop-only LINE button in header */
  if (matchMedia('(min-width:900px)').matches) [].forEach.call(d.querySelectorAll('[data-desk]'), function (a) { a.style.display = ''; });

  /* service worker-free PWA: nothing else needed */
})();
