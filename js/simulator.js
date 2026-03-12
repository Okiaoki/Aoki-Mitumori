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

  // 利用回数を記録（90日期限）
  if (typeof storageSave === "function" && typeof storageLoad === "function") {
    const usage = storageLoad("discount_usage") || {};
    usage[found.code] = (usage[found.code] || 0) + 1;
    storageSave("discount_usage", usage, 90);
  }

  return { ok: true, message: `「${found.label}」が適用されました（${Math.round(found.discountRate * 100)}%割引）` };
}

// ─── 計算ロジック ──────────────────────────────────────────

/**
 * 価格内訳を算出する（純粋関数）
 * @returns {{ basePrice, pagePrice, optionPrice, urgencyPrice, discountAmount, totalPrice, breakdown }}
 */
function calculatePriceBreakdown(selections, discount) {
  const { siteType, pageCount, options, urgency } = selections;
  if (!siteType) return null;

  // 基本料金 = サイト種別のベース
  const basePrice = siteType.basePrice;

  // ページ数追加分 = (basePrice × multiplier) - basePrice
  const pageMultiplier = pageCount ? pageCount.multiplier : 1;
  const pagePrice = Math.round(basePrice * (pageMultiplier - 1));

  // オプション追加分
  const optionPrice = options.reduce((sum, o) => sum + o.price, 0);

  // 小計（特急割増計算のベース）
  const subtotal = basePrice + pagePrice + optionPrice;

  // 特急割増 = 小計 × (倍率 - 1)
  const urgencyMultiplier = urgency ? urgency.priceMultiplier : 1;
  const urgencyPrice = Math.round(subtotal * (urgencyMultiplier - 1));

  // 割引前合計
  const beforeDiscount = subtotal + urgencyPrice;

  // 割引額
  const discountRate = discount ? discount.discountRate : 0;
  const discountAmount = Math.round(beforeDiscount * discountRate);

  // 最終金額（1000円単位に切り上げ）
  const totalPrice = Math.ceil((beforeDiscount - discountAmount) / 1000) * 1000;

  // 内訳配列（表示用）
  const breakdown = [
    { label: _simLabel(siteType), price: basePrice, type: "base" },
  ];
  if (pagePrice > 0 && pageCount) {
    breakdown.push({ label: _simLabel(pageCount) + "追加分", price: pagePrice, type: "page" });
  }
  options.forEach((o) => {
    breakdown.push({ label: _simLabel(o), price: o.price, type: "option" });
  });
  if (urgencyPrice > 0 && urgency) {
    breakdown.push({ label: _simLabel(urgency) + "割増", price: urgencyPrice, type: "urgency" });
  }
  if (discountAmount > 0 && discount) {
    breakdown.push({ label: discount.label, price: -discountAmount, type: "discount" });
  }

  return { basePrice, pagePrice, optionPrice, urgencyPrice, discountAmount, totalPrice, breakdown };
}

/**
 * 納期内訳を算出する（純粋関数）
 * @returns {{ baseDays, pageDays, optionDays, urgencyAdjustment, totalDays, breakdown }}
 */
function calculateDaysBreakdown(selections) {
  const { siteType, pageCount, options, urgency } = selections;
  if (!siteType) return null;

  // 基本納期 = サイト種別のベース
  const baseDays = siteType.estimatedDays;

  // ページ数による追加日数
  const pageDays = pageCount ? (pageCount.dayImpact || 0) : 0;

  // オプションによる追加日数
  const optionDays = options.reduce((sum, o) => sum + (o.dayImpact || 0), 0);

  // 小計（特急調整前）
  const subtotalDays = baseDays + pageDays + optionDays;

  // 特急: 倍率適用 + 固定オフセット
  const dayMultiplier = urgency ? urgency.dayMultiplier : 1;
  const dayOffset = urgency ? (urgency.dayOffset || 0) : 0;
  const urgencyAdjustment = Math.ceil(subtotalDays * dayMultiplier) - subtotalDays + dayOffset;

  const totalDays = Math.max(3, subtotalDays + urgencyAdjustment); // 最低3日

  // 内訳配列（表示用）
  const breakdown = [
    { label: _simLabel(siteType), days: baseDays, type: "base" },
  ];
  if (pageDays > 0 && pageCount) {
    breakdown.push({ label: _simLabel(pageCount) + "追加分", days: pageDays, type: "page" });
  }
  if (optionDays > 0) {
    options.filter((o) => o.dayImpact > 0).forEach((o) => {
      breakdown.push({ label: _simLabel(o), days: o.dayImpact, type: "option" });
    });
  }
  if (urgencyAdjustment !== 0 && urgency && urgency.id !== "normal") {
    breakdown.push({ label: _simLabel(urgency) + "調整", days: urgencyAdjustment, type: "urgency" });
  }

  return { baseDays, pageDays, optionDays, urgencyAdjustment, totalDays, breakdown };
}

/**
 * 統一見積結果オブジェクトを返す
 */
function calculateEstimate() {
  const sel = simulatorState.selections;
  const price = calculatePriceBreakdown(sel, appliedDiscount);
  const days = calculateDaysBreakdown(sel);
  if (!price || !days) return null;

  return {
    // 価格
    basePrice:      price.basePrice,
    pagePrice:      price.pagePrice,
    optionPrice:    price.optionPrice,
    urgencyPrice:   price.urgencyPrice,
    discountAmount: price.discountAmount,
    totalPrice:     price.totalPrice,
    priceBreakdown: price.breakdown,
    // 納期
    baseDays:           days.baseDays,
    pageDays:           days.pageDays,
    optionDays:         days.optionDays,
    urgencyAdjustment:  days.urgencyAdjustment,
    totalDays:          days.totalDays,
    daysBreakdown:      days.breakdown,
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
  const estimate = calculateEstimate();
  const amountEl = document.getElementById("previewAmount");
  const noteEl   = document.getElementById("previewNote");

  if (!amountEl || !noteEl) return;
  if (!estimate) {
    amountEl.textContent = "---";
    noteEl.textContent   = (typeof t === "function" && t("preview.init")) || "サイト種別を選択してください";
    return;
  }

  // フラッシュアニメーション
  amountEl.classList.add("price-flash");
  clearTimeout(priceAnimTimer);
  priceAnimTimer = setTimeout(() => amountEl.classList.remove("price-flash"), 400);

  const lang = typeof getCurrentLang === "function" ? getCurrentLang() : "ja";
  amountEl.textContent = "¥" + estimate.totalPrice.toLocaleString("ja-JP");
  noteEl.textContent   = lang === "en"
    ? `Est. delivery: approx. ${estimate.totalDays} days`
    : `推定納期：約${estimate.totalDays}日`;
}

// ─── 選択カード生成ヘルパー ────────────────────────────────

/** 選択後にマイクロインタラクション（ripple）を発火 */
function fireSelectAnimation(cardEl) {
  cardEl.classList.add("select-pop");
  cardEl.addEventListener("animationend", () => cardEl.classList.remove("select-pop"), { once: true });
}

// ─── 言語ヘルパー（共通ヘルパーへの参照） ─────────────────
// pricingData.js で定義した _i18nLabel / _i18nDesc を利用
function _simLabel(item) {
  return typeof _i18nLabel === "function" ? _i18nLabel(item) : item.label;
}
function _simDesc(item) {
  return typeof _i18nDesc === "function" ? _i18nDesc(item) : item.description;
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

/**
 * 状態変更時の統一フロー
 * 入力イベント → state更新 → 計算 → 描画 → 保存
 */
function onStateChange() {
  // 1. 計算 & 描画
  updatePricePreview();
  updateNavButtons();

  // 2. 永続化
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
  const estimate = calculateEstimate();
  if (!estimate) return;

  const plan = getRecommendedPlan();
  const lang = typeof getCurrentLang === "function" ? getCurrentLang() : "ja";

  // ── 価格内訳テーブル ────────────────────────────────────
  const priceRows = estimate.priceBreakdown.map((row) => {
    const sign = row.price >= 0 ? "+" : "";
    const cls  = row.type === "discount" ? ' class="breakdown-discount"' : "";
    // 最初の行（base）は符号なし
    const displayPrice = row.type === "base"
      ? `¥${row.price.toLocaleString("ja-JP")}`
      : `${sign}¥${Math.abs(row.price).toLocaleString("ja-JP")}`;
    return `<tr${cls}><td>${_esc(row.label)}</td><td>${row.type === "discount" ? "−" : ""}${row.type === "discount" ? `¥${Math.abs(row.price).toLocaleString("ja-JP")}` : displayPrice}</td></tr>`;
  }).join("");

  // ── 納期内訳テーブル ────────────────────────────────────
  const daysRows = estimate.daysBreakdown.map((row) => {
    const sign = row.days >= 0 ? "+" : "";
    const displayDays = row.type === "base"
      ? `${row.days}日`
      : `${sign}${row.days}日`;
    return `<tr><td>${_esc(row.label)}</td><td>${displayDays}</td></tr>`;
  }).join("");

  // ── 概算注記 ────────────────────────────────────────────
  const disclaimerText = lang === "en"
    ? "This is an approximate estimate. Final pricing may vary after consultation."
    : "※ こちらは概算見積です。正式なお見積りはヒアリング後にご提示いたします。";
  const includesText = lang === "en"
    ? "Includes: Design, coding, basic testing, delivery support (30 days)"
    : "含まれるもの：デザイン・コーディング・基本テスト・納品後サポート（30日間）";

  // ── DOM更新 ─────────────────────────────────────────────
  document.getElementById("resultTotal").textContent     = "¥0";
  document.getElementById("resultDays").textContent      = lang === "en"
    ? `Approx. ${estimate.totalDays} days`
    : `約${estimate.totalDays}日`;
  document.getElementById("resultBreakdown").innerHTML   = priceRows;
  document.getElementById("resultPlanName").textContent  = plan
    ? ((lang === "en" && plan.nameEn) ? plan.nameEn : plan.name) : "";
  document.getElementById("resultPlanDesc").textContent  = plan
    ? ((lang === "en" && plan.descriptionEn) ? plan.descriptionEn : plan.description) : "";

  // 納期内訳（DOM要素が存在する場合のみ）
  const daysBreakdownEl = document.getElementById("resultDaysBreakdown");
  if (daysBreakdownEl) {
    daysBreakdownEl.innerHTML = daysRows;
  }

  // 概算注記
  const disclaimerEl = document.getElementById("resultDisclaimer");
  if (disclaimerEl) {
    disclaimerEl.textContent = disclaimerText;
  }
  const includesEl = document.getElementById("resultIncludes");
  if (includesEl) {
    includesEl.textContent = includesText;
  }

  document.getElementById("simulator").classList.add("hidden");
  const resultSection = document.getElementById("result");
  resultSection.classList.remove("hidden");
  resultSection.scrollIntoView({ behavior: "smooth", block: "start" });

  // ── アニメーション演出 ──────────────────────────────────
  const resultCards = resultSection.querySelectorAll(".result__body > *");
  staggerFadeIn(Array.from(resultCards), 0.1, 0.15);

  setTimeout(() => {
    animateAmount(document.getElementById("resultTotal"), estimate.totalPrice, 1200);
  }, 250);

  const breakdownTrs = resultSection.querySelectorAll("#resultBreakdown tr");
  staggerFadeIn(Array.from(breakdownTrs), 0.5, 0.08);

  if (daysBreakdownEl) {
    const daysTrs = daysBreakdownEl.querySelectorAll("tr");
    staggerFadeIn(Array.from(daysTrs), 0.6, 0.08);
  }

  // 有効期限表示
  const expEl = document.getElementById("resultExpiry");
  if (expEl) {
    const expDate = new Date();
    expDate.setDate(expDate.getDate() + 30);
    expEl.textContent = lang === "en"
      ? `Valid until: ${expDate.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`
      : `有効期限：${expDate.toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" })} まで`;
  }

  // GA4トラッキング
  if (typeof trackResultView === "function") {
    trackResultView(estimate.totalPrice, estimate.totalDays);
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
  const estimate = calculateEstimate();

  const summary = [
    siteType  ? `【サイト種別】${siteType.label}`                                                     : "",
    pageCount ? `【ページ数】${pageCount.label}`                                                      : "",
    options.length > 0 ? `【オプション】${options.map((o) => o.label).join("、")}` : "【オプション】なし",
    urgency   ? `【納期優先度】${urgency.label}`                                                      : "",
    estimate  ? `【概算見積】¥${estimate.totalPrice.toLocaleString("ja-JP")} / 推定${estimate.totalDays}日` : "",
    estimate  ? `【内訳】${estimate.priceBreakdown.map((r) => `${r.label}: ¥${r.price.toLocaleString("ja-JP")}`).join(" / ")}` : "",
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

    // 見積プレビューバナーを表示
    const banner = document.getElementById("quotePreviewBanner");
    const previewText = document.getElementById("quotePreviewText");
    const hiddenVal = document.getElementById("hiddenQuoteSummary")?.value;
    if (banner && previewText && hiddenVal) {
      previewText.textContent = hiddenVal;
      banner.classList.remove("hidden");
    }

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

  // キーボードショートカット: ステップ内でEnterを押すと「次へ」
  document.getElementById("simulator")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.target.matches("button, a, textarea")) {
      e.preventDefault();
      const btnNext = document.getElementById("btnNext");
      if (btnNext && !btnNext.disabled) btnNext.click();
    }
  });

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

    const estimate = calculateEstimate();
    if (!estimate) return;

    const { siteType, pageCount, options, urgency } = simulatorState.selections;
    const summaryText = [
      siteType  ? `サイト種別: ${siteType.label}` : "",
      pageCount ? `ページ数: ${pageCount.label}` : "",
      options.length > 0 ? `オプション: ${options.map((o) => o.label).join("、")}` : "",
      urgency   ? `納期優先度: ${urgency.label}` : "",
      `概算合計: ¥${estimate.totalPrice.toLocaleString("ja-JP")}`,
      `推定納期: 約${estimate.totalDays}日`,
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
  if (typeof storageLoad === "function") {
    const loaded = storageLoad("compare_slots");
    if (Array.isArray(loaded)) compareSlots = loaded;
  } else {
    try {
      const raw = localStorage.getItem(COMPARE_KEY);
      if (raw) compareSlots = JSON.parse(raw);
    } catch (e) {}
  }
  updateCompareButtons();
}

function saveCompareSlots() {
  if (typeof storageSave === "function") {
    storageSave("compare_slots", compareSlots, 30);
  } else {
    try { localStorage.setItem(COMPARE_KEY, JSON.stringify(compareSlots)); } catch (e) {}
  }
}

function saveCompareSlot(index) {
  const estimate = calculateEstimate();
  if (!estimate) return;

  compareSlots[index] = {
    label:      `パターン${index === 0 ? "A" : "B"}`,
    selections: JSON.parse(JSON.stringify(simulatorState.selections)),
    result:     { total: estimate.totalPrice, estimatedDays: estimate.totalDays, breakdown: estimate.priceBreakdown },
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
