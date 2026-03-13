/**
 * Service worker for the estimate site.
 *
 * v2.1 constraints:
 * - Paths are resolved from registration.scope so subdirectory installs work.
 * - JS/CSS/locales/manifest use network-first because assets are not content-hashed yet.
 * - Keep CACHE_VERSION in sync with releases until hashed asset filenames are introduced.
 */

const CACHE_VERSION = "v2.1.1";
const CACHE_NAME = `ads-simulator-${CACHE_VERSION}`;
const APP_SCOPE_URL = new URL(self.registration.scope);
const APP_SCOPE_PATH = APP_SCOPE_URL.pathname.endsWith("/")
  ? APP_SCOPE_URL.pathname
  : `${APP_SCOPE_URL.pathname}/`;

const PRECACHE_ASSETS = [
  "./",
  "index.html",
  "manifest.json",
  "css/style.css",
  "js/storage.js",
  "js/emailjs-config.js",
  "js/analytics.js",
  "js/share.js",
  "js/pricingData.js",
  "js/pricingLoader.js",
  "js/simulator.js",
  "js/form.js",
  "js/ui.js",
  "js/pdf.js",
  "js/cookie.js",
  "js/abtest.js",
  "js/constellation.js",
  "js/cursor.js",
  "js/errorTracking.js",
  "js/i18n.js",
  "locales/ja.json",
  "locales/en.json",
  "assets/favicon.svg",
  "assets/favicon-32.png",
  "assets/apple-touch-icon.png",
];

function resolveScopedUrl(path) {
  return new URL(path, APP_SCOPE_URL).toString();
}

function isScopedSameOriginRequest(request) {
  const url = new URL(request.url);
  return request.method === "GET"
    && url.origin === self.location.origin
    && url.pathname.startsWith(APP_SCOPE_PATH);
}

function getCacheKey(request) {
  const url = new URL(request.url);
  if (request.mode === "navigate" || request.destination === "document") {
    return new Request(`${url.origin}${url.pathname}`);
  }
  return request;
}

function shouldUseNetworkFirst(request) {
  const url = new URL(request.url);
  if (request.mode === "navigate" || request.destination === "document") return true;
  if (["script", "style", "worker", "manifest"].includes(request.destination)) return true;
  if (url.pathname.startsWith(`${APP_SCOPE_PATH}locales/`)) return true;
  if (url.pathname.endsWith(".json")) return true;
  return false;
}

async function putInCache(cache, cacheKey, response) {
  if (!response || !response.ok) return response;
  await cache.put(cacheKey, response.clone());
  return response;
}

async function precacheStaticAssets() {
  const cache = await caches.open(CACHE_NAME);
  await Promise.allSettled(
    PRECACHE_ASSETS.map(async (assetPath) => {
      const assetUrl = resolveScopedUrl(assetPath);
      const response = await fetch(assetUrl, { cache: "no-cache" });
      await putInCache(cache, assetUrl, response);
    })
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(precacheStaticAssets().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (!isScopedSameOriginRequest(request)) return;

  event.respondWith(
    shouldUseNetworkFirst(request)
      ? networkFirst(request)
      : cacheFirst(request)
  );
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cacheKey = getCacheKey(request);

  try {
    const response = await fetch(request, { cache: "no-cache" });
    return await putInCache(cache, cacheKey, response);
  } catch {
    const cached = await caches.match(cacheKey);
    if (cached) return cached;

    if (request.mode === "navigate" || request.destination === "document") {
      return (await caches.match(resolveScopedUrl("index.html")))
        || (await caches.match(resolveScopedUrl("./")))
        || new Response("Offline", { status: 503, statusText: "Offline" });
    }

    return new Response("Offline", { status: 503, statusText: "Offline" });
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cacheKey = getCacheKey(request);
  const cached = await caches.match(cacheKey);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    return await putInCache(cache, cacheKey, response);
  } catch {
    return new Response("Offline", { status: 503, statusText: "Offline" });
  }
}
