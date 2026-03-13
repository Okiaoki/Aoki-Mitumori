/**
 * errorTracking.js
 * エラーログ収集（Sentry ラッパー）
 * 依存: emailjs-config.js (SENTRY_CONFIG)
 *
 * 未設定の場合は console.error へのフォールバックで動作します。
 */

// ─── Sentryが利用可能か判定 ──────────────────────────────

function isSentryReady() {
  return (
    typeof Sentry !== "undefined" &&
    typeof isSentryConfigured === "function" &&
    isSentryConfigured()
  );
}

// ─── 公開API ─────────────────────────────────────────────

/**
 * エラーを手動でキャプチャ
 * @param {Error|string} error
 * @param {object} context - 追加情報（任意）
 */
function captureError(error, context = {}) {
  if (isSentryReady()) {
    Sentry.withScope((scope) => {
      Object.entries(context).forEach(([key, val]) => scope.setExtra(key, val));
      if (error instanceof Error) {
        Sentry.captureException(error);
      } else {
        Sentry.captureMessage(String(error), "error");
      }
    });
  } else {
    console.error("[ErrorTracking]", error, context);
  }
}

/**
 * メッセージを記録（警告レベル）
 * @param {string} message
 * @param {object} context
 */
function captureWarning(message, context = {}) {
  if (isSentryReady()) {
    Sentry.withScope((scope) => {
      Object.entries(context).forEach(([key, val]) => scope.setExtra(key, val));
      Sentry.captureMessage(message, "warning");
    });
  } else {
    console.warn("[ErrorTracking]", message, context);
  }
}

/**
 * パンくずを追加（エラー発生前の行動記録）
 * @param {string} message
 * @param {string} category
 * @param {object} data
 */
function addBreadcrumb(message, category = "user", data = {}) {
  if (isSentryReady()) {
    Sentry.addBreadcrumb({ message, category, data, level: "info" });
  }
}

// ─── グローバルエラーハンドラー ───────────────────────────

window.addEventListener("error", (event) => {
  if (isSentryReady()) return; // Sentryが自動処理
  console.error("[ErrorTracking] Unhandled error:", event.error || event.message);
});

window.addEventListener("unhandledrejection", (event) => {
  if (isSentryReady()) return;
  console.error("[ErrorTracking] Unhandled promise rejection:", event.reason);
});

// ─── 初期化 ───────────────────────────────────────────────

function initErrorTracking() {
  if (!isSentryReady()) {
    console.info("[ErrorTracking] Sentry未設定。エラーはコンソールに出力されます。");
    return;
  }

  Sentry.init({
    dsn:              SENTRY_CONFIG.DSN,
    environment:      SENTRY_CONFIG.ENVIRONMENT || "production",
    release:          SENTRY_CONFIG.RELEASE     || "1.0.0",
    tracesSampleRate: SENTRY_CONFIG.SAMPLE_RATE || 0.1,
    integrations: [
      Sentry.browserTracingIntegration(),
    ],
    beforeSend(event) {
      // 開発環境ではSentryに送信しない
      if (window.location.hostname === "localhost" ||
          window.location.hostname === "127.0.0.1") {
        return null;
      }
      return event;
    },
  });

  console.info("[ErrorTracking] Sentry initialized:", SENTRY_CONFIG.ENVIRONMENT || "production");
}

document.addEventListener("DOMContentLoaded", initErrorTracking);
