/**
 * i18n.js
 * 多言語対応（日本語 / 英語）
 * - data-i18n="key" 属性を持つ要素のテキストを置換
 * - data-i18n-placeholder="key" 属性はplaceholderを置換
 * - ユーザーの言語設定はLocalStorageに保存
 * - getCurrentLang() / t(key) をグローバルに公開
 * - 初回ロード完了時に "localeReady" カスタムイベントを発火
 * - 言語切り替え時に "languageChanged" カスタムイベントを発火
 */

const I18N_STORAGE_KEY = "ads_lang";
const SUPPORTED_LANGS  = ["ja", "en"];
const DEFAULT_LANG     = "ja";

let _currentLocale = {};
let _currentLang   = DEFAULT_LANG;
let _localeReady   = false;

// ─── 公開 API ──────────────────────────────────────────────

/** 現在の言語コードを返す */
function getCurrentLang() {
  return _currentLang;
}

/** ロケールが読み込み済みかどうか */
function isLocaleReady() {
  return _localeReady;
}

/**
 * 現在のロケールからキーに対応するテキストを返す
 * ロケール未読込時は undefined を返す（呼び出し側でフォールバックを使用すること）
 */
function t(key) {
  if (!_localeReady) return undefined;
  return _currentLocale[key] !== undefined ? _currentLocale[key] : key;
}

// ─── ロード（メモリキャッシュ付き） ──────────────────────

const _localeCache = {};

async function loadLocale(lang) {
  if (_localeCache[lang]) return _localeCache[lang];

  try {
    const res  = await fetch(`locales/${lang}.json`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    _localeCache[lang] = data;
    return data;
  } catch (e) {
    console.warn(`[i18n] ${lang}.json の読み込みに失敗しました:`, e);
    return null;
  }
}

// ─── 適用 ─────────────────────────────────────────────────

function applyLocale(locale) {
  if (!locale) return;
  _currentLocale = locale;

  // テキストノード置換
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (locale[key] !== undefined) el.textContent = locale[key];
  });

  // placeholder 置換
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (locale[key] !== undefined) el.setAttribute("placeholder", locale[key]);
  });

  // html lang 属性
  document.documentElement.lang = locale.lang || DEFAULT_LANG;

  // 言語切り替えボタンのラベルを更新
  const btn = document.getElementById("langToggle");
  if (btn && locale.langLabel) btn.textContent = locale.langLabel;
}

// ─── 切り替え ─────────────────────────────────────────────

async function switchLanguage(lang) {
  if (!SUPPORTED_LANGS.includes(lang)) return;
  _currentLang = lang;

  try {
    localStorage.setItem(I18N_STORAGE_KEY, lang);
  } catch {}

  const locale = await loadLocale(lang);
  applyLocale(locale);

  // 動的コンテンツの再描画を通知
  document.dispatchEvent(new CustomEvent("languageChanged", { detail: { lang } }));

  // GA4トラッキング
  if (typeof gtag === "function") {
    gtag("event", "language_switch", { language: lang, event_category: "UI" });
  }
}

// ─── 初期化 ───────────────────────────────────────────────

async function initI18n() {
  // 保存済み言語 > ブラウザ言語 > デフォルト の順で決定
  let savedLang = DEFAULT_LANG;
  try {
    savedLang = localStorage.getItem(I18N_STORAGE_KEY) || DEFAULT_LANG;
  } catch {}

  const browserLang = navigator.language?.slice(0, 2);
  const lang = SUPPORTED_LANGS.includes(savedLang)
    ? savedLang
    : SUPPORTED_LANGS.includes(browserLang)
      ? browserLang
      : DEFAULT_LANG;

  _currentLang = lang;

  // ロケールファイルを読み込み
  const locale = await loadLocale(lang);
  if (locale) {
    _currentLocale = locale;
    // 全言語で applyLocale を実行（data-i18n要素を統一的に更新）
    applyLocale(locale);
  }

  _localeReady = true;

  // 全言語で localeReady を発火（他モジュールが t() を使った再描画を行えるようにする）
  document.dispatchEvent(new CustomEvent("localeReady", { detail: { lang } }));

  // 言語切り替えボタン
  const toggleBtn = document.getElementById("langToggle");
  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      const next = _currentLang === "ja" ? "en" : "ja";
      switchLanguage(next);
    });
  }
}

document.addEventListener("DOMContentLoaded", initI18n);
