/* オフラインでも遊べるようにキャッシュする */
var CACHE = 'hockey-v4';

/* 画像などは名前にバージョンが入っているのでキャッシュ優先でよい */
var ASSETS = [
  './',
  './index.html',
  './icon-192-2.png',
  './icon-512-2.png',
  './icon-512-maskable-2.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CACHE) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

function putInCache(req, res) {
  var copy = res.clone();
  caches.open(CACHE).then(function (c) { c.put(req, copy); }).catch(function () {});
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;

  // HTML と manifest は「まずネットワーク」。更新がすぐ反映されるようにする
  var isDoc = req.mode === 'navigate' ||
              (req.headers.get('accept') || '').indexOf('text/html') !== -1;
  var isManifest = req.url.indexOf('manifest.json') !== -1;

  if (isDoc || isManifest) {
    e.respondWith(
      fetch(req).then(function (res) {
        putInCache(req, res);
        return res;
      }).catch(function () {
        return caches.match(req).then(function (hit) {
          return hit || caches.match('./index.html');
        });
      })
    );
    return;
  }

  // それ以外はキャッシュ優先
  e.respondWith(
    caches.match(req).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (res) {
        putInCache(req, res);
        return res;
      }).catch(function () {
        return caches.match('./index.html');
      });
    })
  );
});
