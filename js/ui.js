/**
 * ui.js
 * FAQ アコーディオン・スムーズスクロール・汎用UI
 */

// ─── FAQ アコーディオン ────────────────────────────────────

/** FAQアイテムを開閉する */
function toggleFAQItem(item) {
  const isOpen = item.classList.contains("open");
  const body = item.querySelector(".faq__answer");
  const icon = item.querySelector(".faq__icon");

  // 他のアイテムを閉じる（アコーディオン動作）
  document.querySelectorAll(".faq__item").forEach((el) => {
    if (el !== item) {
      closeFAQItem(el);
    }
  });

  if (isOpen) {
    closeFAQItem(item);
  } else {
    openFAQItem(item);
  }
}

function openFAQItem(item) {
  const body = item.querySelector(".faq__answer");
  const icon = item.querySelector(".faq__icon");

  item.classList.add("open");
  body.style.maxHeight = body.scrollHeight + "px";
  body.setAttribute("aria-hidden", "false");
  if (icon) icon.textContent = "−";
  item.querySelector(".faq__question").setAttribute("aria-expanded", "true");
}

function closeFAQItem(item) {
  const body = item.querySelector(".faq__answer");
  const icon = item.querySelector(".faq__icon");

  item.classList.remove("open");
  body.style.maxHeight = "0";
  body.setAttribute("aria-hidden", "true");
  if (icon) icon.textContent = "+";
  item.querySelector(".faq__question").setAttribute("aria-expanded", "false");
}

/** FAQリストをpricingDataから生成して初期化 */
function initFAQ() {
  const listEl = document.getElementById("faqList");
  if (!listEl) return;

  const lang = typeof getCurrentLang === "function" ? getCurrentLang() : "ja";

  // FAQアイテムをDOMに生成
  listEl.innerHTML = pricingData.faqItems
    .map(
      (item, i) => {
        const question = (lang === "en" && item.questionEn) ? item.questionEn : item.question;
        const answer   = (lang === "en" && item.answerEn)   ? item.answerEn   : item.answer;
        return `
      <div class="faq__item" id="faq-${i}">
        <button class="faq__question" aria-expanded="false" aria-controls="faq-answer-${i}">
          <span class="faq__question-text">${question}</span>
          <span class="faq__icon" aria-hidden="true">+</span>
        </button>
        <div class="faq__answer" id="faq-answer-${i}" aria-hidden="true" style="max-height:0">
          <div class="faq__answer-inner">
            <p>${answer}</p>
          </div>
        </div>
      </div>`;
      }
    )
    .join("");

  // イベントリスナー登録
  listEl.querySelectorAll(".faq__question").forEach((btn) => {
    btn.addEventListener("click", () => {
      toggleFAQItem(btn.closest(".faq__item"));
    });
  });
}

// ─── スムーズスクロール ────────────────────────────────────

/** 指定IDの要素へスムーズスクロール */
function scrollToSection(targetId) {
  const el = document.getElementById(targetId);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
}

/** ページ内アンカーリンクにスムーズスクロールを設定 */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (e) => {
      const href = link.getAttribute("href");
      if (href === "#") return;

      const targetId = href.slice(1);
      const target = document.getElementById(targetId);
      if (!target) return;

      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

// ─── ヘッダーのスクロール制御 ─────────────────────────────

function initHeaderScroll() {
  const header = document.getElementById("siteHeader");
  if (!header) return;

  let lastScrollY = 0;

  window.addEventListener(
    "scroll",
    () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > 80) {
        header.classList.add("scrolled");
      } else {
        header.classList.remove("scrolled");
      }
      lastScrollY = currentScrollY;
    },
    { passive: true }
  );
}

// ─── スクロール連動フェードイン（Intersection Observer） ──

// スクロールアニメーション監視インスタンスを保持（重複登録防止）
let _revealObserver = null;

function initRevealOnScroll() {
  // 未処理（revealed / observed マークなし）の要素だけを対象にする
  const items = Array.from(document.querySelectorAll(".reveal-item"))
    .filter((el) => !el.dataset.observed);

  if (!items.length) return;

  if (typeof IntersectionObserver === "undefined") {
    // 非対応環境では全要素を即表示
    items.forEach((el) => el.classList.add("revealed"));
    return;
  }

  if (!_revealObserver) {
    _revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
            _revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.06, rootMargin: "0px 0px -20px 0px" }
    );
  }

  items.forEach((el) => {
    el.dataset.observed = "1"; // 登録済みマーク
    _revealObserver.observe(el);
  });
}

// ─── ダーク/ライトモード切り替え ────────────────────────────

const THEME_KEY = "ads_theme";

function getPreferredTheme() {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === "dark" || stored === "light") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme, saveToStorage = true) {
  document.documentElement.setAttribute("data-theme", theme);
  if (saveToStorage) {
    localStorage.setItem(THEME_KEY, theme);
  }

  const btn = document.getElementById("themeToggle");
  if (btn) {
    const lang = typeof getCurrentLang === "function" ? getCurrentLang() : "ja";
    btn.textContent = theme === "dark" ? "☀" : "🌙";
    if (lang === "en") {
      btn.setAttribute("aria-label", theme === "dark" ? "Switch to light mode" : "Switch to dark mode");
    } else {
      btn.setAttribute("aria-label", theme === "dark" ? "ライトモードに切り替え" : "ダークモードに切り替え");
    }
  }
}

function initThemeToggle() {
  // 初期テーマを適用
  applyTheme(getPreferredTheme());

  const btn = document.getElementById("themeToggle");
  if (!btn) return;

  btn.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme");
    applyTheme(current === "dark" ? "light" : "dark");
  });

  // システムの配色設定変更にも追従（手動設定がない場合のみ）
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
    const stored = localStorage.getItem(THEME_KEY);
    if (!stored) {
      applyTheme(e.matches ? "dark" : "light", false);
    }
  });
}

// ─── 言語ヘルパー（共通ヘルパーへの参照） ────────────────
// pricingData.js で定義した _i18nLabel / _i18nDesc を利用
function _label(item) {
  return typeof _i18nLabel === "function" ? _i18nLabel(item) : item.label;
}
function _desc(item) {
  return typeof _i18nDesc === "function" ? _i18nDesc(item) : item.description;
}

/** 推奨ラベル文字列を返す */
function _recommend(uc) {
  const lang = typeof getCurrentLang === "function" ? getCurrentLang() : "ja";
  return (lang === "en" && uc.recommendEn) ? uc.recommendEn : uc.recommend;
}

// ─── 料金プラングリッド描画 ────────────────────────────────

function renderPricingGrid() {
  const grid = document.getElementById("pricingGrid");
  if (!grid || typeof pricingData === "undefined") return;

  const lang = typeof getCurrentLang === "function" ? getCurrentLang() : "ja";

  grid.innerHTML = pricingData.plans.map((plan) => {
    const tag        = (lang === "en" && plan.tagEn  ) ? plan.tagEn   : plan.tag;
    const name       = (lang === "en" && plan.nameEn ) ? plan.nameEn  : plan.name;
    const desc       = (lang === "en" && plan.descEn ) ? plan.descEn  : plan.desc;
    const cta        = (lang === "en" && plan.ctaEn  ) ? plan.ctaEn   : plan.cta;
    const isFeatured = tag !== "";
    const featuredClass = isFeatured ? " pricing-card--featured" : "";
    const badge = tag ? `<span class="pricing-card__badge">${tag}</span>` : "";

    const features = plan.features.map((f) => {
      const text = (lang === "en" && f.textEn) ? f.textEn : f.text;
      const cls  = f.included ? "pricing-card__feature" : "pricing-card__feature pricing-card__feature--excluded";
      const mark = f.included ? "✓" : "✗";
      return `<li class="${cls}" data-included="${f.included}"><span class="pricing-card__feature-mark">${mark}</span>${text}</li>`;
    }).join("");

    const btnClass = isFeatured ? "btn btn--outline-light btn--block" : "btn btn--primary btn--block";
    return `
      <div class="pricing-card${featuredClass} reveal-item">
        ${badge}
        <p class="pricing-card__name">${name}</p>
        <p class="pricing-card__price">${plan.price}</p>
        <p class="pricing-card__desc">${desc}</p>
        <ul class="pricing-card__features">${features}</ul>
        <a href="#simulator" class="${btnClass}">${cta}</a>
      </div>`;
  }).join("");
}

// ─── ユースケースグリッド描画 ─────────────────────────────

function renderUsecaseGrid() {
  const grid = document.getElementById("usecaseGrid");
  if (!grid || typeof pricingData === "undefined") return;

  const lang = typeof getCurrentLang === "function" ? getCurrentLang() : "ja";
  const recommendPrefix = lang === "en" ? "Recommended: " : "推奨: ";

  grid.innerHTML = pricingData.useCases.map((uc, i) => `
    <div class="usecase-card reveal-item" role="button" tabindex="0" data-usecase-index="${i}">
      <div class="usecase-card__icon">${uc.icon}</div>
      <div class="usecase-card__body">
        <p class="usecase-card__title">${(lang === "en" && uc.titleEn) ? uc.titleEn : uc.title}</p>
        <p class="usecase-card__desc">${(lang === "en" && uc.descEn) ? uc.descEn : uc.desc}</p>
        <p class="usecase-card__recommend">${recommendPrefix}${_recommend(uc)}</p>
      </div>
    </div>`
  ).join("");

  // ユースケースカードのクリック・キーボード操作
  grid.querySelectorAll(".usecase-card").forEach((card) => {
    function handleUsecaseClick() {
      const simulator = document.getElementById("simulator");
      if (simulator) {
        simulator.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
    card.addEventListener("click", handleUsecaseClick);
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleUsecaseClick();
      }
    });
  });
}

// ─── 初期化 ────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  initThemeToggle();
  initFAQ();
  renderPricingGrid();
  renderUsecaseGrid();
  initSmoothScroll();
  initHeaderScroll();
  // renderUsecaseGrid が .reveal-item を生成した後に呼ぶ
  initRevealOnScroll();
});

// 言語切り替え・初回ロケート読み込み完了時に動的コンテンツを再描画
function _refreshUITexts() {
  initFAQ();
  renderPricingGrid();
  renderUsecaseGrid();
  initRevealOnScroll();
  // テーマボタンのaria-labelを更新
  const currentTheme = document.documentElement.getAttribute("data-theme") || "light";
  applyTheme(currentTheme, false);
}
document.addEventListener("languageChanged", _refreshUITexts);
document.addEventListener("localeReady", _refreshUITexts);
