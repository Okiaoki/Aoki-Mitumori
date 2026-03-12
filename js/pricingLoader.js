/**
 * pricingLoader.js
 * 料金データのLocalStorage上書き管理
 *
 * 動作フロー:
 *   1. adminが管理画面で料金を編集 → localStorage(PRICING_OVERRIDE_KEY)に保存
 *   2. ページロード時に applyPricingOverrides() を呼び出し
 *   3. pricingData の価格・ラベルを上書き（関数定義はそのまま維持）
 *   4. 管理画面では pricing.json をベースに編集UIを生成し、
 *      完了したらlocalhostに保存 + JSONダウンロードを提供
 */

const PRICING_OVERRIDE_KEY = "ads_pricing_override";

/**
 * LocalStorageの上書きデータを pricingData に適用する
 * pricingData.js と pricingLoader.js の両方が読み込まれた後に呼ぶこと
 */
function applyPricingOverrides() {
  if (typeof pricingData === "undefined") return;

  try {
    const raw = localStorage.getItem(PRICING_OVERRIDE_KEY);
    if (!raw) return;

    const override = JSON.parse(raw);

    // siteTypes の価格・ラベルを上書き
    if (override.siteTypes) {
      override.siteTypes.forEach((ov) => {
        const target = pricingData.siteTypes.find((s) => s.id === ov.id);
        if (target) {
          if (ov.label       !== undefined) target.label       = ov.label;
          if (ov.basePrice   !== undefined) target.basePrice   = Number(ov.basePrice);
          if (ov.estimatedDays !== undefined) target.estimatedDays = Number(ov.estimatedDays);
          if (ov.description !== undefined) target.description = ov.description;
        }
      });
    }

    // options の価格・ラベルを上書き
    if (override.options) {
      override.options.forEach((ov) => {
        const target = pricingData.options.find((o) => o.id === ov.id);
        if (target) {
          if (ov.label !== undefined) target.label = ov.label;
          if (ov.price !== undefined) target.price = Number(ov.price);
          if (ov.description !== undefined) target.description = ov.description;
        }
      });
    }

    // discountCodes を上書き（全件置換）
    if (override.discountCodes) {
      pricingData.discountCodes = override.discountCodes;
    }

    console.info("[pricingLoader] 管理者設定の料金データを適用しました");
  } catch (e) {
    console.warn("[pricingLoader] 料金データの読み込みに失敗しました:", e);
  }
}

/**
 * 現在の pricingData をLocalStorageに保存する（管理画面から呼ぶ）
 * @param {object} overrideData - 保存する上書きデータ
 */
function savePricingOverrides(overrideData) {
  try {
    localStorage.setItem(PRICING_OVERRIDE_KEY, JSON.stringify(overrideData));
  } catch (e) {
    console.error("[pricingLoader] 保存に失敗しました:", e);
  }
}

/**
 * LocalStorageの上書きデータをクリア（デフォルトに戻す）
 */
function clearPricingOverrides() {
  try {
    localStorage.removeItem(PRICING_OVERRIDE_KEY);
  } catch (e) {}
}

/**
 * 現在の上書きデータを取得する
 */
function getPricingOverrides() {
  try {
    const raw = localStorage.getItem(PRICING_OVERRIDE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

// ページロード時に自動適用
document.addEventListener("DOMContentLoaded", applyPricingOverrides);
