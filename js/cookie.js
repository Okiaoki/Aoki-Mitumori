/**
 * cookie.js
 * Cookie同意バナーの表示・管理
 * 個人情報保護法・GDPR準拠
 * - 同意状態に応じてGA4等の解析ツールを制御
 */

const COOKIE_CONSENT_KEY = "ads_cookie_consent";
const COOKIE_CONSENT_EXPIRY_DAYS = 365;

/** Cookieをセット */
function setCookie(name, value, days) {
  const expires = new Date(Date.now() + days * 86400000).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

/** Cookieを取得 */
function getCookie(name) {
  const match = document.cookie.match(new RegExp("(?:^|; )" + name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "=([^;]*)"));
  return match ? decodeURIComponent(match[1]) : null;
}

/** 同意済みかどうか */
function hasConsented() {
  return getCookie(COOKIE_CONSENT_KEY) !== null;
}

/** 「すべて許可」の同意か */
function hasFullConsent() {
  return getCookie(COOKIE_CONSENT_KEY) === "all";
}

/** Cookie同意バナーを表示 */
function showCookieBanner() {
  const banner = document.getElementById("cookieBanner");
  if (!banner) return;
  // 少し遅らせて表示（ページ読み込み直後の視覚的衝撃を和らげる）
  setTimeout(() => {
    banner.classList.add("visible");
    banner.removeAttribute("aria-hidden");
  }, 800);
}

/** Cookie同意バナーを非表示 */
function hideCookieBanner() {
  const banner = document.getElementById("cookieBanner");
  if (!banner) return;
  banner.classList.remove("visible");
  banner.setAttribute("aria-hidden", "true");
}

/**
 * GA4・解析ツールの有効化/無効化
 * 「すべて許可」の場合のみGA4を有効化する
 */
function applyConsentState() {
  if (typeof gtag !== "function") return;

  if (hasFullConsent()) {
    // すべて許可: GA4のデータ収集を有効化
    gtag("consent", "update", {
      analytics_storage: "granted",
      ad_storage: "granted",
    });
  } else {
    // 必須のみ or 未同意: GA4のデータ収集を無効化
    gtag("consent", "update", {
      analytics_storage: "denied",
      ad_storage: "denied",
    });
  }
}

/** 同意ボタン押下時 */
function handleAcceptAll() {
  setCookie(COOKIE_CONSENT_KEY, "all", COOKIE_CONSENT_EXPIRY_DAYS);
  hideCookieBanner();
  applyConsentState();
}

/** 必須のみボタン押下時 */
function handleAcceptNecessary() {
  setCookie(COOKIE_CONSENT_KEY, "necessary", COOKIE_CONSENT_EXPIRY_DAYS);
  hideCookieBanner();
  applyConsentState();
}

/** 初期化 */
function initCookieBanner() {
  // ページロード時に同意状態を反映（GA4のデフォルトを制御）
  if (typeof gtag === "function") {
    // デフォルトはdenied（同意前）
    gtag("consent", "default", {
      analytics_storage: hasFullConsent() ? "granted" : "denied",
      ad_storage: hasFullConsent() ? "granted" : "denied",
    });
  }

  if (hasConsented()) return; // 同意済みなら表示しない

  showCookieBanner();

  const btnAll = document.getElementById("cookieAcceptAll");
  const btnNec = document.getElementById("cookieAcceptNecessary");

  if (btnAll) btnAll.addEventListener("click", handleAcceptAll);
  if (btnNec) btnNec.addEventListener("click", handleAcceptNecessary);
}

document.addEventListener("DOMContentLoaded", initCookieBanner);
