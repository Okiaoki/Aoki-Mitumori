/**
 * analytics.js
 * Google Analytics 4 イベントトラッキング
 * 依存: emailjs-config.js (GA4_CONFIG)
 */

/** gtag関数が使用可能かチェック */
function isGtagReady() {
  return typeof gtag === "function";
}

/** 汎用イベント送信 */
function trackEvent(eventName, params = {}) {
  if (!isGtagReady()) return;
  gtag("event", eventName, params);
}

// ─── シミュレーター系 ──────────────────────────────────────

/** ステップ通過トラッキング */
function trackSimulatorStep(stepNumber, stepName) {
  trackEvent("simulator_step_view", {
    step_number: stepNumber,
    step_name: stepName,
    event_category: "Simulator",
  });
}

/** 選択変更トラッキング */
function trackSimulatorSelection(stepName, selectedValue) {
  trackEvent("simulator_selection", {
    step_name: stepName,
    selected_value: selectedValue,
    event_category: "Simulator",
  });
}

/** 見積結果表示トラッキング */
function trackResultView(totalAmount, estimatedDays) {
  trackEvent("estimate_result_view", {
    estimate_amount: totalAmount,
    estimated_days: estimatedDays,
    currency: "JPY",
    event_category: "Simulator",
  });
}

/** リトライトラッキング */
function trackSimulatorRetry() {
  trackEvent("simulator_retry", { event_category: "Simulator" });
}

// ─── フォーム系 ───────────────────────────────────────────

/** フォーム送信（確認画面表示）トラッキング */
function trackFormConfirm() {
  trackEvent("form_confirm_view", { event_category: "Form" });
}

/** フォーム送信完了トラッキング */
function trackFormSubmit(success) {
  trackEvent("form_submit", {
    success: success,
    event_category: "Form",
  });
}

// ─── 結果アクション系 ─────────────────────────────────────

/** PDF出力トラッキング */
function trackPdfDownload(totalAmount) {
  trackEvent("pdf_download", {
    estimate_amount: totalAmount,
    event_category: "Result",
  });
}

/** URL共有トラッキング */
function trackUrlShare() {
  trackEvent("url_share", { event_category: "Result" });
}

/** メール受取トラッキング */
function trackEstimateEmailSend() {
  trackEvent("estimate_email_send", { event_category: "Result" });
}

/** 「この内容で相談する」クリックトラッキング */
function trackConsultClick() {
  trackEvent("consult_click", { event_category: "Result" });
}
