/**
 * simulator.js
 * ステップUI制御・計算ロジック
 * 依存: pricingData.js / analytics.js / share.js
 */

// ─── 比較データ管理 ───────────────────────────────────────
const COMPARE_KEY = "ads_compare_slots";

// ─── HTMLエスケープ（compareパネルのinnerHTML用） ──────────
function _esc(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
let compareSlots = [null, null]; // 最大2件

// ─── 状態管理 ─────────────────────────────────────────────
const simulatorState = {
  currentStep: 1,
  totalSteps: 4,
  selections: {
    siteType: null,   // { id, label, basePrice, estimatedDays }
    pageCount: null,  // { id, label, multiplier }
    options: [],      // [{ id, label, price }, ...]
    urgency: null,    // { id, label, multiplier, dayMultiplier }
  },
};

const STEP_NAMES = { 1: "サイト種別", 2: "ページ数", 3: "オプション", 4: "納期" };

// ステップ遷移方向（方向スライドアニメーション用）
let stepDirection = "forward";

// ─── 割引コード管理 ───────────────────────────────────────
let appliedDiscount = null; // { code, label, discountRate }

function applyDiscountCode(code) {
  const found = (pricingData.discountCodes || []).find(
    (d) => d.code.toUpperCase() === code.trim().toUpperCase()
  );
  if (!found) return { ok: false, message: "このコードは無効です" };
  appliedDiscount = found;

  // 利用回数をLocalStorageに記録
  try {
    const key   = "ads_discount_usage";
    const usage = JSON.parse(localStorage.getItem(key) || "{}");
    usage[found.code] = (usage[found.code] || 0) + 1;
    localStorage.setItem(key, JSON.stringify(usage));
  } catch (e) {}

  return { ok: true, message: `「${found.label}」が適用されました（${Math.round(found.discountRate * 100)}%割引）` };
}

// ─── 計算ロジック ──────────────────────────────────────────
function calculatePrice() {
  const { siteType, pageCount, options, urgency } = simulatorState.selections;
  if (!siteType) return null;

  const baseSubtotal = siteType.basePrice * (pageCount ? pageCount.multiplier : 1);
  const optionsTotal = options.reduce((sum, o) => sum + o.price, 0);
  const urgencyMultiplier = urgency ? urgency.multiplier : 1;
  const discountMultiplier = appliedDiscount ? (1 - appliedDiscount.discountRate) : 1;
  const rawTotal = (baseSubtotal + optionsTotal) * urgencyMultiplier * discountMultiplier;
  const total = Math.ceil(rawTotal / 1000) * 1000;

  const estimatedDays = urgency
    ? Math.ceil(siteType.estimatedDays * urgency.dayMultiplier)
    : siteType.estimatedDays;

  return {
    total,
    breakdown: {
      base: Math.round(siteType.basePrice * (pageCount ? pageCount.multiplier : 1)),
      optionsTotal,
      urgencySurcharge: Math.round((baseSubtotal + optionsTotal) * (urgencyMultiplier - 1)),
      options: options.map((o) => ({ label: o.label, price: o.price })),
    },
    estimatedDays,
  };
}

function getRecommendedPlan() {
  const sel = simulatorState.selections;
  if (!sel.siteType || !sel.pageCount) return null;
  for (const plan of pricingData.recommendedPlans) {
    if (plan.condition(sel)) return plan;
  }
  return null;
}

// ─── DOM操作 ───────────────────────────────────────────────

function updateProgress() {
  const { currentStep, totalSteps } = simulatorState;

  const fill = document.getElementById("progressFill");
  const pct = ((currentStep - 1) / (totalSteps - 1)) * 100;
  fill.style.width = pct + "%";

  // aria-valuenow 更新
  const indicator = document.querySelector(".progress-indicator");
  if (indicator) {
    indicator.setAttribute("aria-valuenow", currentStep);
    indicator.setAttribute("aria-valuetext", `ステップ ${currentStep} / ${totalSteps}`);
  }

  document.querySelectorAll(".step-indicator").forEach((el) => {
    const step = parseInt(el.dataset.step, 10);
    el.classList.toggle("active", step === currentStep);
    el.classList.toggle("done", step < currentStep);
  });
}

function renderStepPanel(step) {
  const animClass = stepDirection === "backward" ? "slide-in-left" : "slide-in-right";
  document.querySelectorAll(".step-panel").forEach((el) => {
    const isActive = parseInt(el.dataset.step, 10) === step;
    el.classList.toggle("active", isActive);
    if (isActive) {
      el.classList.remove("slide-in", "slide-in-right", "slide-in-left");
      void el.offsetWidth; // reflow
      el.classList.add(animClass);
    }
  });
}

function updateNavButtons() {
  const { currentStep, totalSteps } = simulatorState;
  const btnBack = document.getElementById("btnBack");
  const btnNext = document.getElementById("btnNext");

  btnBack.disabled = currentStep === 1;
  btnNext.textContent = currentStep === totalSteps
    ? ((typeof t === "function" && t("btn.result")) || "見積結果を見る")
    : ((typeof t === "function" && t("btn.next"))   || "次へ →");

  const hasSelection = isCurrentStepSelected();
  btnNext.disabled = !hasSelection;
}

function isCurrentStepSelected() {
  const { currentStep, selections } = simulatorState;
  switch (currentStep) {
    case 1: return selections.siteType !== null;
    case 2: return selections.pageCount !== null;
    case 3: return true;
    case 4: return selections.urgency !== null;
    default: return false;
  }
}

// ─── 価格プレビュー（アニメーション付き） ──────────────────
let priceAnimTimer = null;

function updatePricePreview() {
  const result = calculatePrice();
  const amountEl = document.getElementById("previewAmount");
  const noteEl   = document.getElementById("previewNote");

  if (!amountEl || !noteEl) return;
  if (!result) {
    amountEl.textContent = "---";
    noteEl.textContent   = (typeof t === "function" && t("preview.init")) || "サイト種別を選択してください";
    return;
  }

  // フラッシュアニメーション
  amountEl.classList.add("price-flash");
  clearTimeout(priceAnimTimer);
  priceAnimTimer = setTimeout(() => amountEl.classList.remove("price-flash"), 400);

  amountEl.textContent = "¥" + result.total.toLocaleString("ja-JP");
  noteEl.textContent   = `推定納期：約${result.estimatedDays}日`;
}

// ─── 選択カード生成ヘルパー ────────────────────────────────

/** 選択後にマイクロインタラクション（ripple）を発火 */
function fireSelectAnimation(cardEl) {
  cardEl.classList.add("select-pop");
  cardEl.addEventListener("animationend", () => cardEl.classList.remove("select-pop"), { once: true });
}

// ─── 言語ヘルパー（simulator内） ─────────────────────────
function _simLabel(item) {
  const lang = typeof getCurrentLang === "function" ? getCurrentLang() : "ja";
  return (lang === "en" && item.labelEn) ? item.labelEn : item.label;
}
function _simDesc(item) {
  const lang = typeof getCurrentLang === "function" ? getCurrentLang() : "ja";
  return (lang === "en" && item.descriptionEn) ? item.descriptionEn : item.description;
}

/** Step1: サイト種別 */
function renderSiteTypeStep() {
  const container = document.getElementById("step1-options");
  const basePriceLabel = (typeof t === "function" && t("simulator.basePrice")) || "基本価格：";
  container.innerHTML = pricingData.siteTypes
    .map(
      (item) => `
      <label class="radio-card" data-id="${item.id}">
        <input type="radio" name="siteType" value="${item.id}" />
        <span class="radio-card__content">
          <span class="radio-card__label">${_simLabel(item)}</span>
          <span class="radio-card__desc">${_simDesc(item)}</span>
          <span class="radio-card__price">${basePriceLabel}¥${item.basePrice.toLocaleString("ja-JP")} 〜</span>
        </span>
        <span class="radio-card__check" aria-hidden="true"></span>
      </label>`
    )
    .join("");

  restoreRadioSelection(container, "siteType", simulatorState.selections.siteType?.id);

  container.querySelectorAll("input[type=radio]").forEach((input) => {
    input.addEventListener("change", () => {
      simulatorState.selections.siteType = pricingData.siteTypes.find((s) => s.id === input.value);
      updateCardSelection(container, input);
      fireSelectAnimation(input.closest(".radio-card"));
      updatePricePreview();
      updateNavButtons();
      onStateChange();
      if (typeof trackSimulatorSelection === "function")
        trackSimulatorSelection("サイト種別", simulatorState.selections.siteType.label);
    });
  });
}

/** Step2: ページ数 */
function renderPageCountStep() {
  const container = document.getElementById("step2-options");
  const basePriceLabel = (typeof t === "function" && t("simulator.basePrice")) || "基本価格：";
  container.innerHTML = pricingData.pageCountOptions
    .map(
      (item) => `
      <label class="radio-card" data-id="${item.id}">
        <input type="radio" name="pageCount" value="${item.id}" />
        <span class="radio-card__content">
          <span class="radio-card__label">${_simLabel(item)}</span>
          <span class="radio-card__desc">${_simDesc(item)}</span>
          <span class="radio-card__price">${basePriceLabel} × ${item.multiplier}</span>
        </span>
        <span class="radio-card__check" aria-hidden="true"></span>
      </label>`
    )
    .join("");

  restoreRadioSelection(container, "pageCount", simulatorState.selections.pageCount?.id);

  container.querySelectorAll("input[type=radio]").forEach((input) => {
    input.addEventListener("change", () => {
      simulatorState.selections.pageCount = pricingData.pageCountOptions.find((p) => p.id === input.value);
      updateCardSelection(container, input);
      fireSelectAnimation(input.closest(".radio-card"));
      updatePricePreview();
      updateNavButtons();
      onStateChange();
      if (typeof trackSimulatorSelection === "function")
        trackSimulatorSelection("ページ数", simulatorState.selections.pageCount.label);
    });
  });
}

/** Step3: オプション */
function renderOptionsStep() {
  const container = document.getElementById("step3-options");
  container.innerHTML = pricingData.options
    .map(
      (item) => `
      <label class="checkbox-card ${simulatorState.selections.options.some((o) => o.id === item.id) ? "selected" : ""}" data-id="${item.id}">
        <input type="checkbox" name="options" value="${item.id}" ${simulatorState.selections.options.some((o) => o.id === item.id) ? "checked" : ""} />
        <span class="checkbox-card__content">
          <span class="checkbox-card__label">${_simLabel(item)}</span>
          <span class="checkbox-card__desc">${_simDesc(item)}</span>
          <span class="checkbox-card__price">+¥${item.price.toLocaleString("ja-JP")}</span>
        </span>
        <span class="checkbox-card__check" aria-hidden="true"></span>
      </label>`
    )
    .join("");

  container.querySelectorAll("input[type=checkbox]").forEach((input) => {
    input.addEventListener("change", () => {
      const card = input.closest(".checkbox-card");
      if (input.checked) {
        const opt = pricingData.options.find((o) => o.id === input.value);
        simulatorState.selections.options.push(opt);
        card.classList.add("selected");
        fireSelectAnimation(card);
      } else {
        simulatorState.selections.options = simulatorState.selections.options.filter(
          (o) => o.id !== input.value
        );
        card.classList.remove("selected");
      }
      updatePricePreview();
      onStateChange();
    });
  });
}

/** Step4: 納期 */
function renderUrgencyStep() {
  const container = document.getElementById("step4-options");
  container.innerHTML = pricingData.urgencyOptions
    .map(
      (item) => `
      <label class="radio-card" data-id="${item.id}">
        <input type="radio" name="urgency" value="${item.id}" />
        <span class="radio-card__content">
          <span class="radio-card__label">${_simLabel(item)}</span>
          <span class="radio-card__desc">${_simDesc(item)}</span>
        </span>
        <span class="radio-card__check" aria-hidden="true"></span>
      </label>`
    )
    .join("");

  restoreRadioSelection(container, "urgency", simulatorState.selections.urgency?.id);

  container.querySelectorAll("input[type=radio]").forEach((input) => {
    input.addEventListener("change", () => {
      simulatorState.selections.urgency = pricingData.urgencyOptions.find((u) => u.id === input.value);
      updateCardSelection(container, input);
      fireSelectAnimation(input.closest(".radio-card"));
      updatePricePreview();
      updateNavButtons();
      onStateChange();
      if (typeof trackSimulatorSelection === "function")
        trackSimulatorSelection("納期", simulatorState.selections.urgency.label);
    });
  });
}

// ─── カード状態管理ヘルパー ───────────────────────────────

function updateCardSelection(container, checkedInput) {
  container.querySelectorAll(".radio-card").forEach((card) => card.classList.remove("selected"));
  checkedInput.closest(".radio-card").classList.add("selected");
}

function restoreRadioSelection(container, name, selectedId) {
  if (!selectedId) return;
  const input = container.querySelector(`input[value="${selectedId}"]`);
  if (input) {
    input.checked = true;
    input.closest(".radio-card").classList.add("selected");
  }
}

// ─── 状態変更時の処理 ─────────────────────────────────────

function onStateChange() {
  // LocalStorage保存
  if (typeof saveStateToStorage === "function") {
    saveStateToStorage(simulatorState.selections);
  }
}

// ─── 結果パネル アニメーションヘルパー ────────────────────

/** 金額カウントアップ */
function animateAmount(el, target, duration) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    el.textContent = "¥" + target.toLocaleString("ja-JP");
    return;
  }
  const start = performance.now();
  function step(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased    = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    el.textContent = "¥" + Math.floor(eased * target).toLocaleString("ja-JP");
    if (progress < 1) requestAnimationFrame(step);
    else el.textContent = "¥" + target.toLocaleString("ja-JP");
  }
  requestAnimationFrame(step);
}

/** 要素を遅延フェードインさせる */
function staggerFadeIn(elements, baseDelay, interval) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    elements.forEach((el) => {
      el.style.opacity   = "1";
      el.style.transform = "none";
    });
    return;
  }
  elements.forEach((el, i) => {
    el.style.opacity  = "0";
    el.style.transform = "translateY(14px)";
    el.style.transition =
      `opacity 0.45s ease ${baseDelay + i * interval}s,
       transform 0.45s ease ${baseDelay + i * interval}s`;
    // double rAF で確実にトランジションを発火
    requestAnimationFrame(() => requestAnimationFrame(() => {
      el.style.opacity  = "1";
      el.style.transform = "translateY(0)";
    }));
  });
}

// ─── 結果パネル ────────────────────────────────────────────

function showResultPanel() {
  const result = calculatePrice();
  if (!result) return;

  const { siteType, pageCount, options, urgency } = simulatorState.selections;
  const plan = getRecommendedPlan();

  const breakdownRows = [
    `<tr><td>${siteType.label}</td><td>¥${siteType.basePrice.toLocaleString("ja-JP")}</td></tr>`,
    pageCount
      ? `<tr><td>ページ数（${pageCount.label} × ${pageCount.multiplier}）</td><td>¥${result.breakdown.base.toLocaleString("ja-JP")}</td></tr>`
      : "",
    ...options.map(
      (o) => `<tr><td>${o.label}</td><td>+¥${o.price.toLocaleString("ja-JP")}</td></tr>`
    ),
    urgency && urgency.id !== "normal"
      ? `<tr><td>納期割増（${urgency.label}）</td><td>+¥${result.breakdown.urgencySurcharge.toLocaleString("ja-JP")}</td></tr>`
      : "",
  ]
    .filter(Boolean)
    .join("");

  // テキスト設定（カウントアップは後で発火）
  document.getElementById("resultTotal").textContent     = "¥0";
  document.getElementById("resultDays").textContent      = `約${result.estimatedDays}日`;
  document.getElementById("resultBreakdown").innerHTML   = breakdownRows;
  document.getElementById("resultPlanName").textContent  = plan ? plan.name : "";
  document.getElementById("resultPlanDesc").textContent  = plan ? plan.description : "";

  document.getElementById("simulator").classList.add("hidden");
  const resultSection = document.getElementById("result");
  resultSection.classList.remove("hidden");
  resultSection.scrollIntoView({ behavior: "smooth", block: "start" });

  // ── アニメーション演出 ──────────────────────────────────
  // 結果カードをスタガーで表示
  const resultCards = resultSection.querySelectorAll(".result__body > *");
  staggerFadeIn(Array.from(resultCards), 0.1, 0.15);

  // 合計金額カウントアップ（0.25秒後に開始）
  setTimeout(() => {
    animateAmount(document.getElementById("resultTotal"), result.total, 1200);
  }, 250);

  // 内訳テーブルの行をスタガーで表示
  const breakdownTrs = resultSection.querySelectorAll("#resultBreakdown tr");
  staggerFadeIn(Array.from(breakdownTrs), 0.5, 0.08);

  // 有効期限表示
  const expEl = document.getElementById("resultExpiry");
  if (expEl) {
    const expDate = new Date();
    expDate.setDate(expDate.getDate() + 30);
    expEl.textContent = `有効期限：${expDate.toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" })} まで`;
  }

  // GA4トラッキング
  if (typeof trackResultView === "function") {
    trackResultView(result.total, result.estimatedDays);
  }
}

// ─── ナビゲーション ────────────────────────────────────────

function handleNext() {
  const { currentStep, totalSteps } = simulatorState;

  if (currentStep === totalSteps) {
    showResultPanel();
    return;
  }

  stepDirection = "forward";
  simulatorState.currentStep = currentStep + 1;
  renderCurrentStep();
  updateProgress();
  updateNavButtons();

  // フォーカスを新しいステップのタイトルに移動（アクセシビリティ）
  focusCurrentStepTitle();

  // GA4トラッキング
  if (typeof trackSimulatorStep === "function") {
    trackSimulatorStep(simulatorState.currentStep, STEP_NAMES[simulatorState.currentStep]);
  }

  document.getElementById("simulator").scrollIntoView({ behavior: "smooth", block: "start" });
}

function handleBack() {
  if (simulatorState.currentStep === 1) return;
  stepDirection = "backward";
  simulatorState.currentStep -= 1;
  renderCurrentStep();
  updateProgress();
  updateNavButtons();

  // フォーカスを戻ったステップのタイトルに移動（アクセシビリティ）
  focusCurrentStepTitle();
}

/** アクセシビリティ: 現在のステップタイトルにフォーカスを移動 */
function focusCurrentStepTitle() {
  const step = simulatorState.currentStep;
  const panel = document.querySelector(`.step-panel[data-step="${step}"]`);
  if (!panel) return;
  const title = panel.querySelector("h3, .step-panel__title, [data-i18n*='step']");
  if (title) {
    // tabindex=-1 で一時的にフォーカス可能にする
    if (!title.hasAttribute("tabindex")) title.setAttribute("tabindex", "-1");
    title.focus({ preventScroll: true });
  }
}

function renderCurrentStep() {
  const step = simulatorState.currentStep;
  renderStepPanel(step);
  switch (step) {
    case 1: renderSiteTypeStep(); break;
    case 2: renderPageCountStep(); break;
    case 3: renderOptionsStep(); break;
    case 4: renderUrgencyStep(); break;
  }
}

// ─── 状態復元 ─────────────────────────────────────────────

/**
 * IDの組み合わせからselectionsオブジェクトに復元する
 */
function applyRestoredIds({ siteTypeId, pageCountId, optionIds = [], urgencyId }) {
  if (siteTypeId) {
    simulatorState.selections.siteType =
      pricingData.siteTypes.find((s) => s.id === siteTypeId) ?? null;
  }
  if (pageCountId) {
    simulatorState.selections.pageCount =
      pricingData.pageCountOptions.find((p) => p.id === pageCountId) ?? null;
  }
  if (optionIds.length > 0) {
    simulatorState.selections.options = pricingData.options.filter((o) =>
      optionIds.includes(o.id)
    );
  }
  if (urgencyId) {
    simulatorState.selections.urgency =
      pricingData.urgencyOptions.find((u) => u.id === urgencyId) ?? null;
  }
}

// ─── 見積→フォーム転記 ────────────────────────────────────

function populateFormHiddenFields() {
  const { siteType, pageCount, options, urgency } = simulatorState.selections;
  const result = calculatePrice();

  const summary = [
    siteType  ? `【サイト種別】${siteType.label}`                                                   : "",
    pageCount ? `【ページ数】${pageCount.label}`                                                    : "",
    options.length > 0 ? `【オプション】${options.map((o) => o.label).join("、")}` : "【オプション】なし",
    urgency   ? `【納期】${urgency.label}`                                                          : "",
    result    ? `【概算見積】¥${result.total.toLocaleString("ja-JP")} / 推定${result.estimatedDays}日` : "",
  ]
    .filter(Boolean)
    .join("\n");

  document.getElementById("hiddenQuoteSummary").value = summary;
}

// ─── 初期化 ────────────────────────────────────────────────

function initSimulator() {
  // ① URLパラメータから復元（優先）
  let restored = false;
  if (typeof parseUrlParams === "function") {
    const urlState = parseUrlParams();
    if (urlState) {
      applyRestoredIds(urlState);
      restored = true;
      // URLパラメータをクリーンアップ
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, "", cleanUrl);
    }
  }

  // ② LocalStorageから復元（URLパラメータがなかった場合）
  if (!restored && typeof loadStateFromStorage === "function") {
    const saved = loadStateFromStorage();
    if (saved) {
      applyRestoredIds(saved);
    }
  }

  renderCurrentStep();
  updateProgress();
  updateNavButtons();
  updatePricePreview();

  document.getElementById("btnNext").addEventListener("click", handleNext);
  document.getElementById("btnBack").addEventListener("click", handleBack);

  // 「もう一度試す」
  document.getElementById("btnRetry").addEventListener("click", () => {
    simulatorState.currentStep = 1;
    simulatorState.selections  = { siteType: null, pageCount: null, options: [], urgency: null };
    if (typeof clearStateFromStorage === "function") clearStateFromStorage();

    document.getElementById("result").classList.add("hidden");
    document.getElementById("simulator").classList.remove("hidden");
    renderCurrentStep();
    updateProgress();
    updateNavButtons();
    updatePricePreview();
    document.getElementById("simulator").scrollIntoView({ behavior: "smooth", block: "start" });

    if (typeof trackSimulatorRetry === "function") trackSimulatorRetry();
  });

  // 「この内容で相談する」
  document.getElementById("btnConsult").addEventListener("click", () => {
    populateFormHiddenFields();
    document.getElementById("contact").scrollIntoView({ behavior: "smooth", block: "start" });
    if (typeof trackConsultClick === "function") trackConsultClick();
  });

  // URLシェアボタン
  if (typeof initShareButton === "function") initShareButton();

  // 見積メール送信ボタン
  initEstimateEmailButton();

  // 割引コードボタン
  initDiscountCode();

  // 比較機能
  initCompare();

  // GA4 初期ステップトラッキング
  if (typeof trackSimulatorStep === "function") {
    trackSimulatorStep(1, STEP_NAMES[1]);
  }
}

// ─── 見積メールで受け取る ─────────────────────────────────

function initEstimateEmailButton() {
  const btn = document.getElementById("btnSendEstimate");
  if (!btn) return;

  btn.addEventListener("click", async () => {
    const input = document.getElementById("estimateEmailInput");
    if (!input) return;

    const email = input.value.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      input.classList.add("error");
      input.focus();
      return;
    }
    input.classList.remove("error");

    const result = calculatePrice();
    if (!result) return;

    const { siteType, pageCount, options, urgency } = simulatorState.selections;
    const summaryText = [
      siteType  ? `サイト種別: ${siteType.label}` : "",
      pageCount ? `ページ数: ${pageCount.label}` : "",
      options.length > 0 ? `オプション: ${options.map((o) => o.label).join("、")}` : "",
      urgency   ? `納期: ${urgency.label}` : "",
      `概算合計: ¥${result.total.toLocaleString("ja-JP")}`,
      `推定納期: 約${result.estimatedDays}日`,
    ].filter(Boolean).join("\n");

    // EmailJS送信（未設定時はスキップ）
    if (
      typeof emailjs !== "undefined" &&
      typeof EMAILJS_CONFIG !== "undefined" &&
      !EMAILJS_CONFIG.PUBLIC_KEY.includes("YOUR_")
    ) {
      btn.disabled = true;
      btn.textContent = "送信中...";
      try {
        if (!window._emailjsInitialized) {
          emailjs.init({ publicKey: EMAILJS_CONFIG.PUBLIC_KEY });
          window._emailjsInitialized = true;
        }
        await emailjs.send(EMAILJS_CONFIG.SERVICE_ID, EMAILJS_CONFIG.TEMPLATE_ID, {
          from_name:  "見積シミュレーター",
          from_email: email,
          message:    summaryText,
          reply_to:   email,
        });
        btn.textContent = "送信完了！";
        setTimeout(() => { btn.textContent = "送信する"; btn.disabled = false; }, 3000);
      } catch {
        btn.textContent = "送信失敗";
        setTimeout(() => { btn.textContent = "送信する"; btn.disabled = false; }, 3000);
      }
    } else {
      // 未設定: コンソール出力してUIだけ完了
      console.info("[simulator.js] 見積メール送信データ:", { email, summaryText });
      btn.textContent = "送信完了！（デモ）";
      setTimeout(() => { btn.textContent = "送信する"; }, 3000);
    }

    if (typeof trackEstimateEmailSend === "function") trackEstimateEmailSend();
  });
}

// ─── 割引コード UI ────────────────────────────────────────
function initDiscountCode() {
  const btn   = document.getElementById("btnApplyDiscount");
  const input = document.getElementById("discountCodeInput");
  const msg   = document.getElementById("discountMsg");
  if (!btn || !input) return;

  btn.addEventListener("click", () => {
    const result = applyDiscountCode(input.value);
    if (msg) {
      msg.textContent  = result.message;
      msg.className    = "discount-msg " + (result.ok ? "discount-msg--ok" : "discount-msg--err");
    }
    if (result.ok) {
      input.disabled = true;
      btn.disabled   = true;
      btn.textContent = "適用済み";
      updatePricePreview();
    }
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") btn.click();
  });
}

// ─── A/B 比較機能 ─────────────────────────────────────────
function initCompare() {
  loadCompareSlots();

  document.getElementById("btnSaveCompareA")?.addEventListener("click", () => saveCompareSlot(0));
  document.getElementById("btnSaveCompareB")?.addEventListener("click", () => saveCompareSlot(1));
  document.getElementById("btnShowCompare")?.addEventListener("click", showComparePanel);
  document.getElementById("btnCloseCompare")?.addEventListener("click", closeComparePanel);
  document.getElementById("btnClearCompare")?.addEventListener("click", () => {
    compareSlots = [null, null];
    saveCompareSlots();
    updateCompareButtons();
    closeComparePanel();
  });
}

function loadCompareSlots() {
  try {
    const raw = localStorage.getItem(COMPARE_KEY);
    if (raw) compareSlots = JSON.parse(raw);
  } catch (e) {}
  updateCompareButtons();
}

function saveCompareSlots() {
  try { localStorage.setItem(COMPARE_KEY, JSON.stringify(compareSlots)); } catch (e) {}
}

function saveCompareSlot(index) {
  const result = calculatePrice();
  if (!result) return;

  compareSlots[index] = {
    label:      `パターン${index === 0 ? "A" : "B"}`,
    selections: JSON.parse(JSON.stringify(simulatorState.selections)),
    result,
    discount:   appliedDiscount,
    savedAt:    Date.now(),
  };
  saveCompareSlots();
  updateCompareButtons();

  const btn = document.getElementById(index === 0 ? "btnSaveCompareA" : "btnSaveCompareB");
  if (btn) {
    const orig = btn.textContent;
    btn.textContent = "保存しました！";
    setTimeout(() => { btn.textContent = orig; }, 2000);
  }
}

function updateCompareButtons() {
  const btnShow = document.getElementById("btnShowCompare");
  if (btnShow) {
    const filled = compareSlots.filter(Boolean).length;
    const lang   = typeof getCurrentLang === "function" ? getCurrentLang() : "ja";
    btnShow.disabled    = filled < 2;
    btnShow.textContent = filled < 2
      ? (lang === "en"
          ? `Show Comparison (save ${2 - filled} more)`
          : `比較表示（あと${2 - filled}件保存）`)
      : (lang === "en" ? "Show A/B Comparison" : "A/B 比較を表示");
  }
}

function showComparePanel() {
  const [a, b] = compareSlots;
  if (!a || !b) return;

  const panel = document.getElementById("comparePanel");
  if (!panel) return;

  const formatSel = (slot) => {
    const s = slot.selections;
    const lines = [
      s.siteType  ? _esc(s.siteType.label)  : "—",
      s.pageCount ? _esc(s.pageCount.label) : "—",
      s.options.length ? s.options.map((o) => _esc(o.label)).join("、") : "なし",
      s.urgency   ? _esc(s.urgency.label)   : "—",
      slot.discount ? `割引: ${_esc(slot.discount.label)}` : "",
    ].filter(Boolean);
    return lines.join("<br>");
  };

  document.getElementById("compareNameA").textContent  = a.label;
  document.getElementById("compareNameB").textContent  = b.label;
  document.getElementById("compareDetailA").innerHTML  = formatSel(a);
  document.getElementById("compareDetailB").innerHTML  = formatSel(b);
  document.getElementById("comparePriceA").textContent = "¥" + a.result.total.toLocaleString("ja-JP");
  document.getElementById("comparePriceB").textContent = "¥" + b.result.total.toLocaleString("ja-JP");
  document.getElementById("compareDaysA").textContent  = `約${a.result.estimatedDays}日`;
  document.getElementById("compareDaysB").textContent  = `約${b.result.estimatedDays}日`;

  // 安い方をハイライト
  const cheaper = a.result.total <= b.result.total ? "A" : "B";
  document.getElementById("comparePriceA").classList.toggle("compare-winner", cheaper === "A");
  document.getElementById("comparePriceB").classList.toggle("compare-winner", cheaper === "B");

  panel.classList.remove("hidden");
  panel.scrollIntoView({ behavior: "smooth", block: "center" });
}

function closeComparePanel() {
  document.getElementById("comparePanel")?.classList.add("hidden");
}

document.addEventListener("DOMContentLoaded", initSimulator);

// 言語切り替え・初回ロケール読み込み完了時にシミュレーターの動的テキストを再描画
function _refreshSimulatorTexts() {
  renderCurrentStep();
  updateNavButtons();
  updatePricePreview();
  updateCompareButtons();
}
document.addEventListener("languageChanged", _refreshSimulatorTexts);
document.addEventListener("localeReady", _refreshSimulatorTexts);
