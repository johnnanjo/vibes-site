/* Offline support for the scoreboards: /pages/count (start), /pages/count-3c, /pages/count-pocket, /pages/count-remote. */
var C = 'vibes-count-3c-offline-v20';
var PAGES = ['/pages/count/', '/pages/count-3c/', '/pages/count-pocket/'];
var pageKey = function (u) { var p = new URL(u, location.origin).pathname; return p.charAt(p.length - 1) === '/' ? p : p + '/'; };
var CORE = PAGES.concat([ '/img/vibes-logo-t.png', '/img/favicon-64.png', '/count-3c.webmanifest', '/fonts/unbounded-latin-900-normal.woff2',
  'https://fonts.googleapis.com/css2?family=Anton&family=Noto+Sans+JP:wght@500;700;900&display=swap']);
/* a redirected response cannot be used to answer a navigation, so store a clean copy */
function clean(r) { return r.redirected ? r.blob().then(function (b) { return new Response(b, { status: r.status, statusText: r.statusText, headers: r.headers }); }) : Promise.resolve(r); }
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(C).then(function (c) { return Promise.all(CORE.map(function (u) { return fetch(u, { mode: u.charAt(0) === '/' ? 'same-origin' : 'cors' }).then(function (r) { if (r.ok) return clean(r).then(function (x) { return c.put(u, x); }); }).catch(function () {}); })); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k.indexOf('vibes-count-3c-offline-') === 0 && k !== C; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('message', function (e) {
  var d = e.data || {};
  if (d.type === 'cache' && d.urls) e.waitUntil(caches.open(C).then(function (c) { return Promise.all(d.urls.map(function (u) { return c.match(u).then(function (hit) { return hit || fetch(u, { mode: u.indexOf(location.origin) === 0 ? 'same-origin' : 'cors' }).then(function (r) { if (r.ok) return c.put(u, r); }).catch(function () {}); }); })); }));
});
self.addEventListener('fetch', function (e) {
  var req = e.request; if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.hostname === 'inputtools.google.com' || url.pathname.indexOf('/api/') === 0) return;
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(function (r) { if (r.ok) { clean(r.clone()).then(function (cp) { caches.open(C).then(function (c) { c.put(pageKey(req.url), cp); }); }); } return r; })
      .catch(function () { return caches.match(pageKey(req.url)).then(function (r) { return r || new Response('Offline. Open this page once while online.', { status: 503, headers: { 'Content-Type': 'text/plain' } }); }); }));
    return;
  }
  var cacheable = url.origin === location.origin ? /^\/(img|css|js|fonts)\//.test(url.pathname) || url.pathname === '/count-3c.webmanifest' : /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (!cacheable) return;
  e.respondWith(caches.match(req, { ignoreVary: true }).then(function (hit) {
    return hit || fetch(req).then(function (r) { if (r.ok) { var cp = r.clone(); caches.open(C).then(function (c) { c.put(req, cp); }); } return r; });
  }));
});
