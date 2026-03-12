/**
 * form.js
 * フォームバリデーション・確認画面・EmailJS送信・reCAPTCHA v3
 */

// ─── 状態 ──────────────────────────────────────────────
/** 現在の画面フェーズ: 'input' | 'confirm' | 'success' | 'error' */
let formPhase = "input";

// ─── バリデーションメッセージ（i18n対応） ─────────────────
const validationMessages = {
  ja: {
    nameRequired:    "お名前を入力してください",
    nameMinLength:   "2文字以上で入力してください",
    emailRequired:   "メールアドレスを入力してください",
    emailInvalid:    "正しいメールアドレスを入力してください",
    phoneInvalid:    "正しい電話番号を入力してください",
    messageRequired: "相談内容を入力してください",
    messageMinLength:"10文字以上でご記入ください",
    privacyRequired: "プライバシーポリシーへの同意が必要です",
  },
  en: {
    nameRequired:    "Please enter your name",
    nameMinLength:   "Name must be at least 2 characters",
    emailRequired:   "Please enter your email address",
    emailInvalid:    "Please enter a valid email address",
    phoneInvalid:    "Please enter a valid phone number",
    messageRequired: "Please enter your message",
    messageMinLength:"Message must be at least 10 characters",
    privacyRequired: "You must agree to the Privacy Policy",
  },
};

/** 現在の言語に応じたバリデーションメッセージを返す */
function _vm(key) {
  const lang = typeof getCurrentLang === "function" ? getCurrentLang() : "ja";
  const msgs = validationMessages[lang] || validationMessages.ja;
  return msgs[key] || validationMessages.ja[key] || key;
}

// ─── バリデーションルール ──────────────────────────────────
const validators = {
  name: (v) => {
    if (!v.trim()) return _vm("nameRequired");
    if (v.trim().length < 2) return _vm("nameMinLength");
    return null;
  },
  email: (v) => {
    if (!v.trim()) return _vm("emailRequired");
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(v.trim())) return _vm("emailInvalid");
    return null;
  },
  phone: (v) => {
    if (!v.trim()) return null; // 任意項目
    const phonePattern = /^[\d\-\+\(\)\s]{10,15}$/;
    if (!phonePattern.test(v.trim())) return _vm("phoneInvalid");
    return null;
  },
  message: (v) => {
    if (!v.trim()) return _vm("messageRequired");
    if (v.trim().length < 10) return _vm("messageMinLength");
    return null;
  },
  privacy: (v, el) => {
    const checked = el ? el.checked : false;
    if (!checked) return _vm("privacyRequired");
    return null;
  },
};

// ─── フィールド表示名（確認画面用・i18n対応） ──────────────
function getFieldLabels() {
  const lang = typeof getCurrentLang === "function" ? getCurrentLang() : "ja";
  if (lang === "en") {
    return {
      name:    "Full Name",
      email:   "Email Address",
      phone:   "Phone Number",
      message: "Message",
      privacy: "Privacy Policy",
    };
  }
  return {
    name:    "お名前",
    email:   "メールアドレス",
    phone:   "電話番号",
    message: "相談内容",
    privacy: "プライバシーポリシー",
  };
}

// ─── DOM操作ヘルパー ───────────────────────────────────────
function showFieldError(fieldName, message) {
  const errorEl = document.getElementById(`error-${fieldName}`);
  const inputEl = document.getElementById(`field-${fieldName}`);
  if (!errorEl || !inputEl) return;
  errorEl.textContent = message;
  errorEl.classList.add("visible");
  inputEl.classList.add("error");
  inputEl.setAttribute("aria-invalid", "true");
}

function clearFieldError(fieldName) {
  const errorEl = document.getElementById(`error-${fieldName}`);
  const inputEl = document.getElementById(`field-${fieldName}`);
  if (!errorEl || !inputEl) return;
  errorEl.textContent = "";
  errorEl.classList.remove("visible");
  inputEl.classList.remove("error");
  inputEl.setAttribute("aria-invalid", "false");
}

// ─── バリデーション実行 ────────────────────────────────────
function validateField(fieldName) {
  const inputEl = document.getElementById(`field-${fieldName}`);
  if (!inputEl) return true;

  const validator = validators[fieldName];
  if (!validator) return true;

  const value = inputEl.value;
  const error = validator(value, inputEl);
  if (error) {
    showFieldError(fieldName, error);
    return false;
  } else {
    clearFieldError(fieldName);
    return true;
  }
}

function validateAllFields() {
  const fields = ["name", "email", "phone", "message", "privacy"];
  return fields.every((f) => validateField(f));
}

function updateSubmitButtonState() {
  const submitBtn = document.getElementById("btnSubmit");
  if (!submitBtn) return;

  const fields = ["name", "email", "phone", "message", "privacy"];
  const allValid = fields.every((fieldName) => {
    const inputEl = document.getElementById(`field-${fieldName}`);
    if (!inputEl) return true;
    const validator = validators[fieldName];
    if (!validator) return true;
    return validator(inputEl.value, inputEl) === null;
  });

  submitBtn.disabled = !allValid;
}

// ─── フォームデータ収集 ────────────────────────────────────
function collectFormData() {
  return {
    name:    document.getElementById("field-name")?.value.trim()    || "",
    email:   document.getElementById("field-email")?.value.trim()   || "",
    phone:   document.getElementById("field-phone")?.value.trim()   || "（未入力）",
    message: document.getElementById("field-message")?.value.trim() || "",
    quote:   document.getElementById("hiddenQuoteSummary")?.value   || "",
  };
}

// ─── 確認画面 ─────────────────────────────────────────────
function showConfirmScreen() {
  const data = collectFormData();
  const confirmList = document.getElementById("confirmList");
  if (!confirmList) return;

  const fieldLabels = getFieldLabels();
  const rows = [
    { label: fieldLabels.name,    value: data.name },
    { label: fieldLabels.email,   value: data.email },
    { label: fieldLabels.phone,   value: data.phone },
    { label: fieldLabels.message, value: data.message },
  ];

  if (data.quote) {
    const lang = typeof getCurrentLang === "function" ? getCurrentLang() : "ja";
    rows.push({ label: lang === "en" ? "Estimate Details" : "お見積り内容", value: data.quote });
  }

  confirmList.innerHTML = rows
    .map(
      (r) =>
        `<div class="form-confirm__row">
          <dt class="form-confirm__term">${escapeHtml(r.label)}</dt>
          <dd class="form-confirm__desc">${escapeHtml(r.value).replace(/\n/g, "<br>")}</dd>
        </div>`
    )
    .join("");

  switchPanel("contactForm", "hidden");
  switchPanel("formConfirm", "visible");
  formPhase = "confirm";
  document.getElementById("formConfirm")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function hideConfirmScreen() {
  switchPanel("formConfirm", "hidden");
  switchPanel("contactForm", "visible");
  formPhase = "input";
  document.getElementById("contactForm")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

// ─── 画面切り替えヘルパー ──────────────────────────────────
function switchPanel(showId, action) {
  const el = document.getElementById(showId);
  if (!el) return;
  if (action === "visible") {
    el.classList.remove("hidden");
  } else {
    el.classList.add("hidden");
  }
}

// ─── HTMLエスケープ ────────────────────────────────────────
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ─── reCAPTCHA v3 トークン取得 ────────────────────────────
async function getRecaptchaToken() {
  return new Promise((resolve) => {
    // reCAPTCHA未設定・ライブラリ未読み込み時はスキップ
    if (
      typeof grecaptcha === "undefined" ||
      !RECAPTCHA_CONFIG?.SITE_KEY ||
      RECAPTCHA_CONFIG.SITE_KEY.includes("YOUR_")
    ) {
      resolve(null);
      return;
    }
    grecaptcha.ready(() => {
      grecaptcha
        .execute(RECAPTCHA_CONFIG.SITE_KEY, { action: "contact_submit" })
        .then((token) => resolve(token))
        .catch(() => resolve(null));
    });
  });
}

// ─── EmailJS 送信 ──────────────────────────────────────────
async function sendEmail(data, recaptchaToken) {
  // EmailJS未設定時はコンソールに出力してUIだけ完了画面へ
  if (
    !EMAILJS_CONFIG?.PUBLIC_KEY ||
    EMAILJS_CONFIG.PUBLIC_KEY.includes("YOUR_")
  ) {
    console.warn("[form.js] EmailJSが未設定です。emailjs-config.js を編集してください。");
    console.info("送信データ:", data);
    return { ok: true, demo: true };
  }

  try {
    // EmailJS初期化（冪等: 複数回呼んでも安全だが、初回のみ実行）
    if (!window._emailjsInitialized) {
      emailjs.init({ publicKey: EMAILJS_CONFIG.PUBLIC_KEY });
      window._emailjsInitialized = true;
    }

    const result = await emailjs.send(
      EMAILJS_CONFIG.SERVICE_ID,
      EMAILJS_CONFIG.TEMPLATE_ID,
      {
        from_name:        data.name,
        from_email:       data.email,
        from_phone:       data.phone,
        message:          data.message,
        quote_summary:    data.quote,
        recaptcha_token:  recaptchaToken || "",
        reply_to:         data.email,
      }
    );

    return { ok: result.status === 200, result };
  } catch (err) {
    console.error("[form.js] EmailJS送信エラー:", err);
    return { ok: false, err };
  }
}

// ─── 確認画面からの最終送信 ───────────────────────────────
async function handleConfirmSend() {
  const sendBtn   = document.getElementById("btnConfirmSend");
  const sendLabel = document.getElementById("confirmSendLabel");
  if (!sendBtn) return;

  // 2重送信防止
  sendBtn.disabled = true;
  if (sendLabel) sendLabel.textContent = "送信中...";

  const data           = collectFormData();
  const recaptchaToken = await getRecaptchaToken();

  // hiddenフィールドにトークン記録（省略可）
  const tokenField = document.getElementById("recaptchaToken");
  if (tokenField && recaptchaToken) tokenField.value = recaptchaToken;

  const { ok } = await sendEmail(data, recaptchaToken);

  if (ok) {
    // LocalStorageに問い合わせ保存（管理ダッシュボード用）
    saveInquiryToStorage(data);

    // GA4トラッキング
    if (typeof trackFormSubmit === "function") trackFormSubmit(true);
    if (typeof trackABFormConversion === "function") trackABFormConversion();

    // 成功
    switchPanel("formConfirm", "hidden");
    switchPanel("formSuccess", "visible");
    document.getElementById("formSuccess")?.scrollIntoView({ behavior: "smooth", block: "center" });
    formPhase = "success";
  } else {
    // 失敗
    switchPanel("formConfirm", "hidden");
    switchPanel("formError",   "visible");
    document.getElementById("formError")?.scrollIntoView({ behavior: "smooth", block: "center" });
    formPhase = "error";
    // ボタンを元に戻す（エラー画面の「もう一度試す」で入力画面に戻る）
    sendBtn.disabled = false;
    if (sendLabel) sendLabel.textContent = "送信する";
  }
}

// ─── フォーム送信（→ 確認画面へ） ─────────────────────────
function handleFormSubmit(e) {
  e.preventDefault();
  if (!validateAllFields()) {
    // 最初のエラーフィールドにスクロール＆フォーカス
    const firstError = document.querySelector(".form-input.error, input.error");
    if (firstError) {
      firstError.scrollIntoView({ behavior: "smooth", block: "center" });
      // スクロール完了後にフォーカス（scrollIntoViewとfocusの競合回避）
      setTimeout(() => firstError.focus(), 300);
    }
    return;
  }
  showConfirmScreen();
}

// ─── 初期化 ────────────────────────────────────────────────
function initForm() {
  const form = document.getElementById("contactForm");
  if (!form) return;

  // ── リアルタイムバリデーション ──
  ["name", "email", "phone", "message"].forEach((fieldName) => {
    const inputEl = document.getElementById(`field-${fieldName}`);
    if (!inputEl) return;

    inputEl.addEventListener("blur", () => {
      validateField(fieldName);
      updateSubmitButtonState();
    });

    inputEl.addEventListener("input", () => {
      if (inputEl.classList.contains("error")) {
        const validator = validators[fieldName];
        if (validator && validator(inputEl.value, inputEl) === null) {
          clearFieldError(fieldName);
        }
      }
      updateSubmitButtonState();
    });
  });

  // プライバシーチェックボックス
  const privacyEl = document.getElementById("field-privacy");
  if (privacyEl) {
    privacyEl.addEventListener("change", () => {
      validateField("privacy");
      updateSubmitButtonState();
    });
  }

  // フォーム送信 → 確認画面
  form.addEventListener("submit", handleFormSubmit);

  // 確認画面「修正する」
  document.getElementById("btnConfirmBack")?.addEventListener("click", hideConfirmScreen);

  // 確認画面「送信する」
  document.getElementById("btnConfirmSend")?.addEventListener("click", handleConfirmSend);

  // エラー画面「もう一度試す」
  document.getElementById("btnErrorRetry")?.addEventListener("click", () => {
    switchPanel("formError",   "hidden");
    switchPanel("contactForm", "visible");
    formPhase = "input";
    document.getElementById("contactForm")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  updateSubmitButtonState();
}

// ─── 問い合わせデータ保存（管理ダッシュボード連携） ───────
function saveInquiryToStorage(data) {
  const INQUIRY_KEY = "ads_inquiries";
  try {
    const all = JSON.parse(localStorage.getItem(INQUIRY_KEY) || "[]");
    all.push({
      id:        Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      timestamp: Date.now(),
      name:      data.name,
      email:     data.email,
      phone:     data.phone !== "（未入力）" ? data.phone : "",
      message:   data.message,
      quote:     data.quote,
    });
    localStorage.setItem(INQUIRY_KEY, JSON.stringify(all));
  } catch (e) {}
}

// ─── 個人情報の自動クリーンアップ ─────────────────────────
// 問い合わせデータが30日以上経過している場合はLocalStorageから削除
function cleanupOldInquiries() {
  const INQUIRY_KEY = "ads_inquiries";
  const MAX_AGE_MS = 30 * 86400000; // 30日
  try {
    const raw = localStorage.getItem(INQUIRY_KEY);
    if (!raw) return;
    const all = JSON.parse(raw);
    const filtered = all.filter((d) => Date.now() - d.timestamp < MAX_AGE_MS);
    if (filtered.length !== all.length) {
      if (filtered.length > 0) {
        localStorage.setItem(INQUIRY_KEY, JSON.stringify(filtered));
      } else {
        localStorage.removeItem(INQUIRY_KEY);
      }
    }
  } catch (e) {}
}

document.addEventListener("DOMContentLoaded", () => {
  initForm();
  cleanupOldInquiries();
});
