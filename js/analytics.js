/**
 * analytics.js
 * Loads GA4 only when a real measurement ID is configured.
 */

const GA4_SCRIPT_BASE_URL = "https://www.googletagmanager.com/gtag/js?id=";

function ensureDataLayer() {
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag() {
    window.dataLayer.push(arguments);
  };
}

function getAnalyticsConsentState() {
  const consentGranted = typeof hasFullConsent === "function" ? hasFullConsent() : false;
  return {
    analytics_storage: consentGranted ? "granted" : "denied",
    ad_storage: consentGranted ? "granted" : "denied",
  };
}

function loadGa4Script() {
  if (document.querySelector('script[data-ga4-loader="true"]')) return;

  const script = document.createElement("script");
  script.async = true;
  script.src = `${GA4_SCRIPT_BASE_URL}${encodeURIComponent(GA4_CONFIG.MEASUREMENT_ID)}`;
  script.dataset.ga4Loader = "true";
  document.head.appendChild(script);
}

function initAnalytics() {
  if (typeof isGa4Configured !== "function" || !isGa4Configured()) {
    console.info("[analytics.js] GA4 is not configured. Analytics is disabled.");
    return;
  }

  ensureDataLayer();
  window.gtag("consent", "default", getAnalyticsConsentState());
  window.gtag("js", new Date());
  window.gtag("config", GA4_CONFIG.MEASUREMENT_ID, {
    anonymize_ip: true,
  });
  loadGa4Script();
}

function isGtagReady() {
  return typeof window.gtag === "function";
}

function trackEvent(eventName, params = {}) {
  if (!isGtagReady()) return;
  window.gtag("event", eventName, params);
}

function trackSimulatorStep(stepNumber, stepName) {
  trackEvent("simulator_step_view", {
    step_number: stepNumber,
    step_name: stepName,
    event_category: "Simulator",
  });
}

function trackSimulatorSelection(stepName, selectedValue) {
  trackEvent("simulator_selection", {
    step_name: stepName,
    selected_value: selectedValue,
    event_category: "Simulator",
  });
}

function trackResultView(totalAmount, estimatedDays) {
  trackEvent("estimate_result_view", {
    estimate_amount: totalAmount,
    estimated_days: estimatedDays,
    currency: "JPY",
    event_category: "Simulator",
  });
}

function trackSimulatorRetry() {
  trackEvent("simulator_retry", { event_category: "Simulator" });
}

function trackFormConfirm() {
  trackEvent("form_confirm_view", { event_category: "Form" });
}

function trackFormSubmit(success) {
  trackEvent("form_submit", {
    success,
    event_category: "Form",
  });
}

function trackPdfDownload(totalAmount) {
  trackEvent("pdf_download", {
    estimate_amount: totalAmount,
    event_category: "Result",
  });
}

function trackUrlShare() {
  trackEvent("url_share", { event_category: "Result" });
}

function trackEstimateEmailSend() {
  trackEvent("estimate_email_send", { event_category: "Result" });
}

function trackConsultClick() {
  trackEvent("consult_click", { event_category: "Result" });
}

document.addEventListener("DOMContentLoaded", initAnalytics);
