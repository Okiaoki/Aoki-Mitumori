/**
 * Runtime configuration placeholders.
 *
 * Production checklist:
 * - Set EMAILJS_CONFIG.PUBLIC_KEY / SERVICE_ID / TEMPLATE_ID
 * - Set RECAPTCHA_CONFIG.SITE_KEY
 * - Set SENTRY_CONFIG.DSN
 * - Set GA4_CONFIG.MEASUREMENT_ID
 * - Replace the Calendly URL in index.html
 * - Replace ADMIN_PASSWORD_HASH in admin.html
 */

const EMAILJS_CONFIG = {
  PUBLIC_KEY: "YOUR_PUBLIC_KEY_HERE",
  SERVICE_ID: "YOUR_SERVICE_ID_HERE",
  TEMPLATE_ID: "YOUR_TEMPLATE_ID_HERE",
};

const RECAPTCHA_CONFIG = {
  SITE_KEY: "YOUR_RECAPTCHA_SITE_KEY_HERE",
};

const SENTRY_CONFIG = {
  DSN: "YOUR_SENTRY_DSN_HERE",
  ENVIRONMENT: "production",
  RELEASE: "1.0.0",
  SAMPLE_RATE: 0.1,
};

const GA4_CONFIG = {
  MEASUREMENT_ID: "G-XXXXXXXXXX",
};

function hasConfiguredValue(value) {
  return typeof value === "string" && value.trim() !== "" && !value.includes("YOUR_");
}

function isEmailJsConfigured() {
  return (
    hasConfiguredValue(EMAILJS_CONFIG?.PUBLIC_KEY) &&
    hasConfiguredValue(EMAILJS_CONFIG?.SERVICE_ID) &&
    hasConfiguredValue(EMAILJS_CONFIG?.TEMPLATE_ID)
  );
}

function isRecaptchaConfigured() {
  return hasConfiguredValue(RECAPTCHA_CONFIG?.SITE_KEY);
}

function isSentryConfigured() {
  return hasConfiguredValue(SENTRY_CONFIG?.DSN);
}

function isGa4Configured() {
  const measurementId = GA4_CONFIG?.MEASUREMENT_ID;
  return typeof measurementId === "string" && /^G-[A-Z0-9]+$/i.test(measurementId) && measurementId !== "G-XXXXXXXXXX";
}
