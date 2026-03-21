const CACHE_NAME = 'droughtai-v1';
const ASSETS = [
    '/',
    '/index.html',
    '/auth.html',
    '/report.html',
    '/volunteer.html',
    '/ngo.html',
    '/app.js',
    '/auth.js',
    '/report.js',
    '/volunteer.js',
    '/ngo.js',
    '/firebase-config.js',
    'https://cdn.tailwindcss.com',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
    'https://cdn.jsdelivr.net/npm/chart.js'
];

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
});

self.addEventListener('fetch', (e) => {
    e.respondWith(
        caches.match(e.request).then((res) => res || fetch(e.request))
    );
});
