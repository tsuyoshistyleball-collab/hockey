/* オフラインでも遊べるようにキャッシュする。
   中身を更新したら CACHE の番号と index.html の APP_VERSION を必ず上げること。 */
var CACHE = 'hockey-v16';

var ASSETS = [
  './',
  './index.html',
  './field-3.jpg',
  './stage-forest.jpg',
  './stage-water.jpg',
  './stage-lava.jpg',
  './ttl-stage.png',
  './title-bg.jpg',
  './side.jpg',
  './btn-start.png',
  './btn-solo.png',
  './btn-duo.png',
  './mallet-red.png',
  './mallet-blue.png',
  './puck.png',
  './title.mp3',
  './battle.mp3',
  './goal.png',
  './num-1.png',
  './num-2.png',
  './num-3.png',
  './jk-0.png',
  './jk-1.png',
  './jk-2.png',
  './icon-192-2.png',
  './icon-512-2.png',
  './icon-512-maskable-2.png'
];

/* CACHE を上げたら、必ずサーバーから取り直す。
   同じファイル名のまま絵を差し替えても、古いものが残らないようにするため。 */
self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return Promise.all(ASSETS.map(function (u) {
        var bust = u + (u.indexOf('?') < 0 ? '?' : '&') + CACHE;
        return fetch(bust, { cache: 'reload' }).then(function (res) {
          if (res && res.ok) return c.put(u, res);      // 保存はきれいなURLで
        }).catch(function () {});                       // 1つ失敗しても止めない
      }));
    }).then(function () { return self.skipWaiting(); })
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
  if (!res || res.status !== 200 || res.type === 'opaque') return;
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
      fetch(req.url, { cache: 'no-store', credentials: 'same-origin' }).then(function (res) {
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

  // それ以外（画像・音）はキャッシュ優先
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
