/**
 * emailjs-config.js
 * EmailJS 設定ファイル
 *
 * 本番運用前にこのファイルの値を実際のEmailJSの値に書き換えてください。
 * https://www.emailjs.com/ でアカウント作成・設定後、以下を入力します。
 *
 * ① PUBLIC_KEY    : Account > API Keys > Public Key
 * ② SERVICE_ID    : Email Services > サービスID
 * ③ TEMPLATE_ID   : Email Templates > テンプレートID
 */

const EMAILJS_CONFIG = {
  PUBLIC_KEY:   "YOUR_PUBLIC_KEY_HERE",   // ← EmailJSのPublic Keyを入力
  SERVICE_ID:   "YOUR_SERVICE_ID_HERE",   // ← EmailJSのService IDを入力
  TEMPLATE_ID:  "YOUR_TEMPLATE_ID_HERE",  // ← EmailJSのTemplate IDを入力
};

/**
 * reCAPTCHA v3 設定
 * https://www.google.com/recaptcha/admin でサイトキーを取得してください。
 *
 * SITE_KEY : reCAPTCHA管理画面のサイトキー（フロントエンド用）
 */
const RECAPTCHA_CONFIG = {
  SITE_KEY: "YOUR_RECAPTCHA_SITE_KEY_HERE", // ← reCAPTCHAサイトキーを入力
};

/**
 * Sentry エラーログ設定
 * https://sentry.io/ でプロジェクト作成後、DSNを入力してください。
 *
 * DSN         : Sentry プロジェクト設定 > Client Keys > DSN
 * ENVIRONMENT : "production" / "staging" / "development"
 * RELEASE     : アプリバージョン（例: "1.0.0"）
 * SAMPLE_RATE : パフォーマンストレースのサンプル率（0〜1.0）
 */
const SENTRY_CONFIG = {
  DSN:         "YOUR_SENTRY_DSN_HERE", // ← Sentry DSNを入力
  ENVIRONMENT: "production",
  RELEASE:     "1.0.0",
  SAMPLE_RATE: 0.1,
};

/**
 * Google Analytics 4 設定
 * https://analytics.google.com/ でプロパティを作成後、測定IDを入力してください。
 * 測定IDは「G-XXXXXXXXXX」の形式です。
 */
const GA4_CONFIG = {
  MEASUREMENT_ID: "G-XXXXXXXXXX", // ← GA4 測定IDを入力
};
