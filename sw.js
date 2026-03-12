/**
 * sw.js — Service Worker
 * Aoki Design Studio 見積シミュレーター
 * オフライン対応・キャッシュ戦略: Cache First（静的アセット）+ Network First（ページ）
 */

const CACHE_NAME    = "ads-simulator-v2.1";
const CACHE_VERSION = 3;

/** キャッシュ対象（静的アセット） */
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/css/style.css",
  "/js/storage.js",
  "/js/emailjs-config.js",
  "/js/analytics.js",
  "/js/share.js",
  "/js/pricingData.js",
  "/js/pricingLoader.js",
  "/js/simulator.js",
  "/js/form.js",
  "/js/ui.js",
  "/js/pdf.js",
  "/js/cookie.js",
  "/js/abtest.js",
  "/js/constellation.js",
  "/js/cursor.js",
  "/js/errorTracking.js",
  "/js/i18n.js",
  "/locales/ja.json",
  "/locales/en.json",
  "/assets/favicon.svg",
  "/manifest.json",
];

// ─── インストール ──────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ─── アクティベート（古いキャッシュ削除） ─────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ─── フェッチ戦略 ─────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 外部リクエスト（CDN、GA4等）はスルー
  if (url.origin !== self.location.origin) return;

  // HTML: Network First（最新のページを優先）
  if (request.destination === "document") {
    event.respondWith(networkFirst(request));
    return;
  }

  // JS / CSS / 画像: Cache First（高速）
  event.respondWith(cacheFirst(request));
});

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached ?? caches.match("/index.html");
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
    return response;
  } catch {
    return new Response("Offline", { status: 503 });
  }
}
