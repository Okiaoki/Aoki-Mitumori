/**
 * abtest.js
 * A/Bテスト基盤
 * - ユーザーごとにバリアントを固定（LocalStorage）
 * - GA4でバリアント別CVRを計測
 * - i18n対応: 各バリアントに日英テキストを定義
 */

const AB_STORAGE_KEY = "ads_ab_variants";

/**
 * テスト定義
 * variants: 各バリアントの割合（合計1.0）
 * apply: バリアントをDOMに反映する関数（現在の言語に応じたテキストを適用）
 */
const AB_TESTS = {

  /** ヒーローキャッチコピー */
  hero_copy: {
    variants: [
      {
        id: "control",
        weight: 0.5,
        label: "コントロール（30秒）",
        text: { ja: "30秒で概算見積が分かる", en: "Get an estimate in 30 seconds" },
        apply() {
          const el = document.querySelector(".hero__title-main");
          if (!el) return;
          const lang = typeof getCurrentLang === "function" ? getCurrentLang() : "ja";
          el.textContent = this.text[lang] || this.text.ja;
        },
      },
      {
        id: "challenger",
        weight: 0.5,
        label: "チャレンジャー（費用・納期）",
        text: { ja: "費用・納期をその場で確認", en: "Check cost & timeline instantly" },
        apply() {
          const el = document.querySelector(".hero__title-main");
          if (!el) return;
          const lang = typeof getCurrentLang === "function" ? getCurrentLang() : "ja";
          el.textContent = this.text[lang] || this.text.ja;
        },
      },
    ],
  },

  /** CTAボタンコピー */
  hero_cta: {
    variants: [
      {
        id: "control",
        weight: 0.5,
        label: "コントロール（使う）",
        apply() {},  // デフォルトのまま（i18nに任せる）
      },
      {
        id: "challenger",
        weight: 0.5,
        label: "チャレンジャー（今すぐ）",
        text: { ja: "今すぐ無料で見積もる", en: "Get your free estimate now" },
        apply() {
          const el = document.querySelector('a[href="#simulator"].btn--primary');
          if (!el) return;
          const lang = typeof getCurrentLang === "function" ? getCurrentLang() : "ja";
          el.textContent = this.text[lang] || this.text.ja;
        },
      },
    ],
  },
};

// ─── バリアント割り当て ────────────────────────────────────

/** 保存済みバリアントを取得（なければ割り当て） */
function getOrAssignVariant(testId) {
  const stored = loadStoredVariants();
  if (stored[testId]) return stored[testId];

  const test = AB_TESTS[testId];
  if (!test) return null;

  // 重み付きランダム選択
  const rand = Math.random();
  let cumulative = 0;
  let assigned = test.variants[0].id;
  for (const v of test.variants) {
    cumulative += v.weight;
    if (rand < cumulative) { assigned = v.id; break; }
  }

  stored[testId] = assigned;
  saveStoredVariants(stored);
  return assigned;
}

function loadStoredVariants() {
  try {
    return JSON.parse(localStorage.getItem(AB_STORAGE_KEY) || "{}");
  } catch { return {}; }
}

function saveStoredVariants(data) {
  try {
    localStorage.setItem(AB_STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

// ─── GA4 トラッキング ──────────────────────────────────────

function trackABVariantView(testId, variantId) {
  if (typeof gtag !== "function") return;
  gtag("event", "ab_test_view", {
    test_id:    testId,
    variant_id: variantId,
    event_category: "AB_Test",
  });
}

function trackABConversion(testId, variantId, conversionType) {
  if (typeof gtag !== "function") return;
  gtag("event", "ab_test_conversion", {
    test_id:         testId,
    variant_id:      variantId,
    conversion_type: conversionType,
    event_category:  "AB_Test",
  });
}

/** フォーム送信完了時に全テストのコンバージョンを記録 */
function trackABFormConversion() {
  const stored = loadStoredVariants();
  Object.entries(stored).forEach(([testId, variantId]) => {
    trackABConversion(testId, variantId, "form_submit");
  });
}

// ─── バリアント適用 ─────────────────────────────────────────

/** 全テストのバリアントをDOMに適用（言語変更時も呼ばれる） */
function applyABVariants() {
  Object.keys(AB_TESTS).forEach((testId) => {
    const variantId = getOrAssignVariant(testId);
    const test      = AB_TESTS[testId];
    const variant   = test.variants.find((v) => v.id === variantId);
    if (!variant) return;
    variant.apply();
  });
}

// ─── 初期化 ────────────────────────────────────────────────

let _abInitialized = false;

function initABTests() {
  Object.keys(AB_TESTS).forEach((testId) => {
    const variantId = getOrAssignVariant(testId);
    const test      = AB_TESTS[testId];
    const variant   = test.variants.find((v) => v.id === variantId);
    if (!variant) return;

    // DOMに反映
    variant.apply();

    // GA4に送信（初回のみ）
    if (!_abInitialized) {
      trackABVariantView(testId, variantId);
    }
  });
  _abInitialized = true;
}

/** 現在の割り当てを返す（管理画面確認用） */
function getCurrentABVariants() {
  const stored = loadStoredVariants();
  return Object.entries(AB_TESTS).map(([testId, test]) => {
    const variantId = stored[testId] || "(未割り当て)";
    const variant   = test.variants.find((v) => v.id === variantId);
    return {
      testId,
      variantId,
      variantLabel: variant?.label ?? variantId,
    };
  });
}

document.addEventListener("DOMContentLoaded", initABTests);

// 言語切り替え・初回ロケール読み込み完了時にA/Bテストのテキストを再適用
// i18nがDOM書き換えた後に実行するためsetTimeoutで遅延
function _reapplyABAfterI18n() {
  setTimeout(applyABVariants, 0);
}
document.addEventListener("languageChanged", _reapplyABAfterI18n);
document.addEventListener("localeReady", _reapplyABAfterI18n);
