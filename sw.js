const CACHE_NAME = 'fumikiri-kanchan-v3';
const PRECACHE_URLS = [
  './',
  './index.html',
  './game.html',
  './manifest.webmanifest',
  './assets/app-icon-192.png',
  './assets/app-icon-512.png',
  './assets/apple-touch-icon.png',
  './assets/audio/bgm.mp3',
  './assets/audio/crossing.mp3',
  './assets/audio/shinkansen.mp3',
  './assets/audio/steam_hiss.mp3',
  './assets/audio/steam_run.mp3',
  './assets/audio/steam_whistle.mp3',
  './assets/audio/train.mp3',
  './assets/bg/scene0_nihon.webp',
  './assets/bg/scene1_city.webp',
  './assets/bg/scene2_jungle.webp',
  './assets/bg/scene3_desert.webp',
  './assets/bg/scene4_sea.webp',
  './assets/bg/scene5_moon.webp',
  './assets/bg/start.webp',
  './assets/fg/scene0_nihon.webp',
  './assets/fg/scene1_city.webp',
  './assets/fg/scene2_jungle.webp',
  './assets/fg/scene3_desert.webp',
  './assets/fg/scene4_sea.webp',
  './assets/fg/scene5_moon.webp',
  './assets/train/d51_coach.webp',
  './assets/train/d51_loco.webp',
  './assets/train/e235_head.webp',
  './assets/train/e235_mid.webp',
  './assets/train/e235_tail.webp',
  './assets/train/keihan_head.webp',
  './assets/train/keihan_mid.webp',
  './assets/train/keihan_tail.webp',
  './assets/train/komachi_head.webp',
  './assets/train/komachi_mid.webp',
  './assets/train/komachi_tail.webp',
  './assets/train/n700s_head.webp',
  './assets/train/n700s_mid.webp',
  './assets/train/n700s_tail.webp',
  './assets/ui/start_btn.webp',
  './assets/ui/tap_idle.webp',
  './assets/ui/tap_press.webp'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(names => Promise.all(
        names.filter(name => name !== CACHE_NAME).map(name => caches.delete(name))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  event.respondWith(handleRequest(request));
});

async function handleRequest(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request, {ignoreSearch:true});
  if (cached) {
    const ranged = await maybeRangeResponse(request, cached.clone());
    return ranged || cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok && !request.headers.has('range')) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    if (request.mode === 'navigate') {
      return cache.match('./index.html');
    }
    return new Response('', {status:504, statusText:'Offline'});
  }
}

async function maybeRangeResponse(request, response) {
  const range = request.headers.get('range');
  if (!range) return null;

  const blob = await response.blob();
  const match = range.match(/bytes=(\d*)-(\d*)/);
  if (!match) return response;

  let start;
  let end;
  if (!match[1] && match[2]) {
    const suffixLength = Number(match[2]);
    start = Math.max(blob.size - suffixLength, 0);
    end = blob.size - 1;
  } else {
    start = match[1] ? Number(match[1]) : 0;
    end = match[2] ? Number(match[2]) : blob.size - 1;
  }

  end = Math.min(end, blob.size - 1);
  if (start > end || start >= blob.size) {
    return new Response('', {
      status:416,
      statusText:'Range Not Satisfiable',
      headers:{'Content-Range':`bytes */${blob.size}`}
    });
  }

  const chunk = blob.slice(start, end + 1);

  return new Response(chunk, {
    status:206,
    statusText:'Partial Content',
    headers:{
      'Accept-Ranges':'bytes',
      'Content-Length':String(chunk.size),
      'Content-Range':`bytes ${start}-${end}/${blob.size}`,
      'Content-Type':response.headers.get('Content-Type') || 'application/octet-stream'
    }
  });
}
