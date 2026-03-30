const CACHE_NAME = 'kansai-trip-v1';
// 需要被離線快取的檔案
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  // 如果你有 Logo 圖片也可以加進來
  './apple-touch-icon.png' 
];

// 安裝 Service Worker 並快取檔案
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// 攔截網路請求，優先使用網路，如果斷網則使用快取 (Network First Strategy)
self.addEventListener('fetch', event => {
  // 忽略 API 的請求 (天氣、雲端記帳、匯率)，讓這些維持即時抓取，抓不到就 catch
  if (event.request.url.includes('api') || event.request.url.includes('script.google.com')) {
    return;
  }

  event.respondWith(
    fetch(event.request).catch(() => {
      // 如果斷網，就從快取抓資料
      return caches.match(event.request);
    })
  );
});

// 更新 Service Worker 時清除舊快取
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(cacheName => {
          return cacheName !== CACHE_NAME;
        }).map(cacheName => {
          return caches.delete(cacheName);
        })
      );
    })
  );
});
