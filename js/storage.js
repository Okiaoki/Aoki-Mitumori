/**
 * storage.js
 * LocalStorage統一ユーティリティ
 * - バージョン管理・期限チェック付き保存/復元
 * - 全キーのプレフィックス: "ads_"
 */

const STORAGE_VERSION = 2; // v2改修に合わせてバージョン番号

/**
 * 期限付きでLocalStorageに保存
 * @param {string} key       - ストレージキー（ads_ プレフィックス不要、自動付与）
 * @param {*}      value     - 保存する値
 * @param {number} [ttlDays] - 有効期限（日数）。省略時は無期限
 */
function storageSave(key, value, ttlDays) {
  try {
    const entry = {
      v: STORAGE_VERSION,
      data: value,
      savedAt: Date.now(),
    };
    if (ttlDays) {
      entry.expiresAt = Date.now() + ttlDays * 86400000;
    }
    localStorage.setItem("ads_" + key, JSON.stringify(entry));
  } catch (e) {
    // プライベートブラウジング等
  }
}

/**
 * LocalStorageから復元（期限チェック付き）
 * @param {string} key - ストレージキー（ads_ プレフィックス不要）
 * @returns {*|null}   - 値またはnull
 */
function storageLoad(key) {
  try {
    const raw = localStorage.getItem("ads_" + key);
    if (!raw) return null;

    const entry = JSON.parse(raw);

    // バージョンチェック（旧形式は破棄）
    if (!entry.v) {
      // 旧形式: そのまま返す（後方互換）
      return entry;
    }

    // 期限チェック
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      localStorage.removeItem("ads_" + key);
      return null;
    }

    return entry.data;
  } catch (e) {
    return null;
  }
}

/**
 * LocalStorageからキーを削除
 */
function storageRemove(key) {
  try {
    localStorage.removeItem("ads_" + key);
  } catch (e) {}
}

/**
 * 旧形式データのマイグレーション
 * v1のads_simulator_state, ads_compare_slots を新形式に変換
 */
function migrateStorageV1() {
  try {
    // ads_simulator_state: 旧形式は { siteTypeId, ..., savedAt } で .v がない
    const simRaw = localStorage.getItem("ads_simulator_state");
    if (simRaw) {
      const parsed = JSON.parse(simRaw);
      if (!parsed.v) {
        // 旧形式 → 新形式に変換
        const isExpired = parsed.savedAt && (Date.now() - parsed.savedAt > 7 * 86400000);
        if (isExpired) {
          localStorage.removeItem("ads_simulator_state");
        } else {
          storageSave("simulator_state", {
            siteTypeId: parsed.siteTypeId,
            pageCountId: parsed.pageCountId,
            optionIds: parsed.optionIds || [],
            urgencyId: parsed.urgencyId,
          }, 7);
          localStorage.removeItem("ads_simulator_state");
        }
      }
    }

    // ads_compare_slots: 旧形式は配列
    const compRaw = localStorage.getItem("ads_compare_slots");
    if (compRaw) {
      const parsed = JSON.parse(compRaw);
      if (Array.isArray(parsed)) {
        storageSave("compare_slots", parsed, 30);
        localStorage.removeItem("ads_compare_slots");
      }
    }

    // ads_discount_usage: 期限なし → 90日期限に
    const discRaw = localStorage.getItem("ads_discount_usage");
    if (discRaw) {
      const parsed = JSON.parse(discRaw);
      storageSave("discount_usage", parsed, 90);
      localStorage.removeItem("ads_discount_usage");
    }
  } catch (e) {}
}

// ページ読み込み時にマイグレーション実行
document.addEventListener("DOMContentLoaded", migrateStorageV1);
