/**
 * share.js
 * URL共有機能（クエリパラメータ）・LocalStorage保存・状態復元
 */

const STORAGE_KEY = "ads_simulator_state";

// ─── LocalStorage ─────────────────────────────────────────

/** 現在の選択状態をLocalStorageに保存 */
function saveStateToStorage(selections) {
  try {
    const data = {
      siteTypeId:  selections.siteType?.id  ?? null,
      pageCountId: selections.pageCount?.id ?? null,
      optionIds:   selections.options.map((o) => o.id),
      urgencyId:   selections.urgency?.id   ?? null,
      savedAt:     Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    // プライベートブラウジング等でlocalStorage使用不可の場合は無視
  }
}

/** LocalStorageから状態を読み込む（IDのみ返す） */
function loadStateFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    // 7日以上前のデータは破棄
    if (Date.now() - data.savedAt > 7 * 86400000) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return data;
  } catch (e) {
    return null;
  }
}

/** LocalStorageの状態を削除 */
function clearStateFromStorage() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {}
}

// ─── URL共有 ──────────────────────────────────────────────

/**
 * 現在の選択状態をURLパラメータにエンコードして返す
 * @param {object} selections - simulatorState.selections
 * @returns {string} 共有用URL
 */
function generateShareUrl(selections) {
  // コンパクトなパラメータ形式: s=lp&p=1p&o=form,cms&u=normal
  const url = new URL(window.location.href);
  url.hash = "";
  url.search = "";

  if (selections.siteType?.id)  url.searchParams.set("s", selections.siteType.id);
  if (selections.pageCount?.id) url.searchParams.set("p", selections.pageCount.id);
  if (selections.options.length > 0) {
    url.searchParams.set("o", selections.options.map((o) => o.id).join(","));
  }
  if (selections.urgency?.id)   url.searchParams.set("u", selections.urgency.id);

  return url.toString();
}

/**
 * URLパラメータから選択状態を復元する（ID群を返す）
 * @returns {{ siteTypeId, pageCountId, optionIds, urgencyId } | null}
 */
function parseUrlParams() {
  try {
    const params = new URLSearchParams(window.location.search);

    // 新しいコンパクト形式: s=lp&p=1p&o=form,cms&u=normal
    if (params.has("s") || params.has("p") || params.has("o") || params.has("u")) {
      return {
        siteTypeId:  params.get("s") || null,
        pageCountId: params.get("p") || null,
        optionIds:   params.get("o") ? params.get("o").split(",").filter(Boolean) : [],
        urgencyId:   params.get("u") || null,
      };
    }

    // 旧形式（Base64エンコード）の後方互換性
    const encoded = params.get("q");
    if (!encoded) return null;

    const data = JSON.parse(decodeURIComponent(atob(encoded)));
    return {
      siteTypeId:  data.s || null,
      pageCountId: data.p || null,
      optionIds:   data.o ? data.o.split(",").filter(Boolean) : [],
      urgencyId:   data.u || null,
    };
  } catch (e) {
    return null;
  }
}

/**
 * URLをクリップボードにコピーし、ユーザーにフィードバックを返す
 * @param {string} url
 * @returns {Promise<boolean>}
 */
async function copyUrlToClipboard(url) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(url);
      return true;
    }
    // フォールバック（古いブラウザ）
    const ta = document.createElement("textarea");
    ta.value = url;
    ta.style.position = "fixed";
    ta.style.opacity  = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch (e) {
    return false;
  }
}

// ─── シェアボタンUI ───────────────────────────────────────

/**
 * シェアボタンのクリックハンドラーを初期化
 * simulatorState が利用可能になってから呼ぶこと
 */
function initShareButton() {
  const btn = document.getElementById("btnShare");
  if (!btn) return;

  btn.addEventListener("click", async () => {
    if (typeof simulatorState === "undefined") return;

    const url = generateShareUrl(simulatorState.selections);
    const ok  = await copyUrlToClipboard(url);

    if (ok) {
      showShareFeedback(btn, "URLをコピーしました！");
    } else {
      // コピー失敗時はpromptで表示
      window.prompt("以下のURLをコピーしてください:", url);
    }

    // GA4トラッキング
    if (typeof trackUrlShare === "function") trackUrlShare();
  });
}

/** シェアボタンのフィードバックを一時表示 */
function showShareFeedback(btn, message) {
  const original = btn.textContent;
  btn.textContent = message;
  btn.disabled = true;
  setTimeout(() => {
    btn.textContent = original;
    btn.disabled = false;
  }, 2500);
}
