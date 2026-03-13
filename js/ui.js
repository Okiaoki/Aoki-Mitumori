/**
 * ui.js
 * View-only UI helpers for FAQ, theme toggle, reveal effects,
 * pricing plans, and use case cards.
 */

function toggleFAQItem(item) {
  const isOpen = item.classList.contains("open");

  document.querySelectorAll(".faq__item").forEach((el) => {
    if (el !== item) closeFAQItem(el);
  });

  if (isOpen) closeFAQItem(item);
  else openFAQItem(item);
}

function openFAQItem(item) {
  const body = item.querySelector(".faq__answer");
  const icon = item.querySelector(".faq__icon");

  item.classList.add("open");
  body.style.maxHeight = body.scrollHeight + "px";
  body.setAttribute("aria-hidden", "false");
  if (icon) icon.textContent = "-";
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

function initFAQ() {
  const listEl = document.getElementById("faqList");
  if (!listEl || typeof pricingData === "undefined") return;

  const lang = typeof getCurrentLang === "function" ? getCurrentLang() : "ja";

  listEl.innerHTML = pricingData.faqItems
    .map((item, i) => {
      const question = lang === "en" && item.questionEn ? item.questionEn : item.question;
      const answer = lang === "en" && item.answerEn ? item.answerEn : item.answer;

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
    })
    .join("");

  listEl.querySelectorAll(".faq__question").forEach((btn) => {
    btn.addEventListener("click", () => {
      toggleFAQItem(btn.closest(".faq__item"));
    });
  });
}

function scrollToSection(targetId) {
  const el = document.getElementById(targetId);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
}

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

function initHeaderScroll() {
  const header = document.getElementById("siteHeader");
  if (!header) return;

  window.addEventListener(
    "scroll",
    () => {
      header.classList.toggle("scrolled", window.scrollY > 80);
    },
    { passive: true }
  );
}

let _revealObserver = null;
let _heroStatsAnimated = false;

function initRevealOnScroll() {
  const items = Array.from(document.querySelectorAll(".reveal-item")).filter(
    (el) => !el.dataset.observed
  );

  if (!items.length) return;

  if (typeof IntersectionObserver === "undefined") {
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
    el.dataset.observed = "1";
    _revealObserver.observe(el);
  });
}

function initHeroStatsAnimation() {
  const heroStats = document.querySelector(".hero__stats");
  const countEls = document.querySelectorAll(".count-up");
  if (!heroStats || !countEls.length) return;

  function runCountAnimation() {
    if (_heroStatsAnimated) return;
    _heroStatsAnimated = true;

    countEls.forEach((el) => {
      const target = parseInt(el.dataset.target || "0", 10);
      const duration = 1600;
      let start = null;

      function step(ts) {
        if (start === null) start = ts;
        const progress = Math.min((ts - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = String(Math.floor(eased * target));
        if (progress < 1) requestAnimationFrame(step);
        else el.textContent = String(target);
      }

      requestAnimationFrame(step);
    });

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.querySelectorAll(".stat-gauge__fill").forEach((fill) => {
          const pct = parseFloat(fill.dataset.pct || "0") || 0;
          const arcLen = 150.8;
          const offset = arcLen * (1 - pct / 100);
          fill.style.setProperty("--gauge-offset", String(offset));
          fill.classList.add("run");
        });
      });
    });
  }

  if (typeof IntersectionObserver === "undefined") {
    setTimeout(runCountAnimation, 800);
    return;
  }

  const heroObserver = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        runCountAnimation();
        heroObserver.disconnect();
      }
    },
    { threshold: 0.4 }
  );

  heroObserver.observe(heroStats);
}

function initBookingWidgetState() {
  const widget = document.getElementById("calendlyWidget");
  const placeholder = document.getElementById("bookingPlaceholder");
  if (!widget || !placeholder) return;

  const url = widget.dataset.url || "";
  const isConfigured = /^https:\/\/calendly\.com\//.test(url) && !url.includes("YOUR_CALENDLY_URL");
  widget.style.display = isConfigured ? "block" : "none";
  placeholder.style.display = isConfigured ? "none" : "block";
}

function initServiceWorkerRegistration() {
  if (!("serviceWorker" in navigator)) return;

  const register = () => {
    const swUrl = new URL("sw.js", window.location.href);
    navigator.serviceWorker.register(swUrl.href).then((registration) => {
      registration.update().catch(() => {});
    }).catch(() => {});
  };

  if (document.readyState === "complete") {
    register();
  } else {
    window.addEventListener("load", register, { once: true });
  }
}

function getPreferredTheme() {
  const stored = typeof storageGetTheme === "function" ? storageGetTheme() : null;
  if (stored === "dark" || stored === "light") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme, saveToStorage = true) {
  document.documentElement.setAttribute("data-theme", theme);
  if (saveToStorage && typeof storageSetTheme === "function") storageSetTheme(theme);

  const btn = document.getElementById("themeToggle");
  if (!btn) return;

  const lang = typeof getCurrentLang === "function" ? getCurrentLang() : "ja";
  btn.textContent = theme === "dark" ? "☀" : "☾";
  if (lang === "en") {
    btn.setAttribute(
      "aria-label",
      theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
    );
  } else {
    btn.setAttribute(
      "aria-label",
      theme === "dark" ? "ライトモードに切り替え" : "ダークモードに切り替え"
    );
  }
}

function initThemeToggle() {
  applyTheme(getPreferredTheme());

  const btn = document.getElementById("themeToggle");
  if (!btn) return;

  btn.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme");
    applyTheme(current === "dark" ? "light" : "dark");
  });

  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
    const stored = typeof storageGetTheme === "function" ? storageGetTheme() : null;
    if (!stored) applyTheme(e.matches ? "dark" : "light", false);
  });
}

function _recommend(uc) {
  const lang = typeof getCurrentLang === "function" ? getCurrentLang() : "ja";
  return lang === "en" && uc.recommendEn ? uc.recommendEn : uc.recommend;
}

function _presetDataAttrs(preset = {}) {
  const attrs = [];
  if (preset.siteType) attrs.push(`data-preset-site-type="${preset.siteType}"`);
  if (preset.pageCount) attrs.push(`data-preset-page-count="${preset.pageCount}"`);
  if (Array.isArray(preset.optionIds) && preset.optionIds.length > 0) {
    attrs.push(`data-preset-option-ids="${preset.optionIds.join(",")}"`);
  }
  if (preset.urgencyId) attrs.push(`data-preset-urgency-id="${preset.urgencyId}"`);
  return attrs.length ? " " + attrs.join(" ") : "";
}

function _readPresetFromElement(el) {
  if (!el) return null;

  const preset = {};
  if (el.dataset.presetSiteType) preset.siteType = el.dataset.presetSiteType;
  if (el.dataset.presetPageCount) preset.pageCount = el.dataset.presetPageCount;
  if (el.dataset.presetOptionIds) {
    preset.optionIds = el.dataset.presetOptionIds.split(",").filter(Boolean);
  }
  if (el.dataset.presetUrgencyId) preset.urgencyId = el.dataset.presetUrgencyId;

  return Object.keys(preset).length ? preset : null;
}

function _handlePresetTrigger(el) {
  const preset = _readPresetFromElement(el);
  if (!preset || typeof applyPresetToSimulator !== "function") return;

  const applied = applyPresetToSimulator(preset);
  if (applied !== false) scrollToSection("simulator");
}

function attachPresetActions() {
  document.querySelectorAll("[data-preset-trigger='pricing']").forEach((btn) => {
    btn.addEventListener("click", () => {
      _handlePresetTrigger(btn);
    });
  });

  document.querySelectorAll("[data-preset-trigger='usecase']").forEach((card) => {
    card.addEventListener("click", () => {
      _handlePresetTrigger(card);
    });
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        _handlePresetTrigger(card);
      }
    });
  });
}

function renderPricingGrid() {
  const grid = document.getElementById("pricingGrid");
  if (!grid || typeof pricingData === "undefined") return;

  const lang = typeof getCurrentLang === "function" ? getCurrentLang() : "ja";

  grid.innerHTML = pricingData.plans
    .map((plan) => {
      const tag = lang === "en" && plan.tagEn ? plan.tagEn : plan.tag;
      const name = lang === "en" && plan.nameEn ? plan.nameEn : plan.name;
      const desc = lang === "en" && plan.descEn ? plan.descEn : plan.desc;
      const cta = lang === "en" && plan.ctaEn ? plan.ctaEn : plan.cta;
      const featuredClass = tag ? " pricing-card--featured" : "";
      const badge = tag ? `<span class="pricing-card__badge">${tag}</span>` : "";

      const features = plan.features
        .map((feature) => {
          const text = lang === "en" && feature.textEn ? feature.textEn : feature.text;
          const cls = feature.included
            ? "pricing-card__feature"
            : "pricing-card__feature pricing-card__feature--excluded";
          const mark = feature.included ? "&#10003;" : "&#8212;";
          return `<li class="${cls}" data-included="${feature.included}"><span class="pricing-card__feature-mark">${mark}</span>${text}</li>`;
        })
        .join("");

      const btnClass = tag ? "btn btn--outline-light btn--block" : "btn btn--primary btn--block";

      return `
      <div class="pricing-card${featuredClass} reveal-item">
        ${badge}
        <p class="pricing-card__name">${name}</p>
        <p class="pricing-card__price">${plan.price}</p>
        <p class="pricing-card__desc">${desc}</p>
        <ul class="pricing-card__features">${features}</ul>
        <button type="button" class="${btnClass} pricing-card__cta" data-preset-trigger="pricing"${_presetDataAttrs(plan.preset)}>${cta}</button>
      </div>`;
    })
    .join("");
}

function renderUsecaseGrid() {
  const grid = document.getElementById("usecaseGrid");
  if (!grid || typeof pricingData === "undefined") return;

  const lang = typeof getCurrentLang === "function" ? getCurrentLang() : "ja";
  const recommendPrefix = lang === "en" ? "Recommended: " : "おすすめ: ";

  grid.innerHTML = pricingData.useCases
    .map((uc) => `
    <div class="usecase-card reveal-item" role="button" tabindex="0" data-preset-trigger="usecase"${_presetDataAttrs(uc.preset)}>
      <div class="usecase-card__icon">${uc.icon}</div>
      <div class="usecase-card__body">
        <p class="usecase-card__title">${lang === "en" && uc.titleEn ? uc.titleEn : uc.title}</p>
        <p class="usecase-card__desc">${lang === "en" && uc.descEn ? uc.descEn : uc.desc}</p>
        <p class="usecase-card__recommend">${recommendPrefix}${_recommend(uc)}</p>
      </div>
    </div>`)
    .join("");
}

function renderPresetSections() {
  renderPricingGrid();
  renderUsecaseGrid();
  attachPresetActions();
}

function initUI() {
  initThemeToggle();
  initFAQ();
  renderPresetSections();
  initSmoothScroll();
  initHeaderScroll();
  initHeroStatsAnimation();
  initBookingWidgetState();
  initServiceWorkerRegistration();
  initRevealOnScroll();
}

document.addEventListener("DOMContentLoaded", initUI);

function _refreshUITexts() {
  initFAQ();
  renderPresetSections();
  initRevealOnScroll();

  const currentTheme = document.documentElement.getAttribute("data-theme") || "light";
  applyTheme(currentTheme, false);
}

document.addEventListener("languageChanged", _refreshUITexts);
document.addEventListener("localeReady", _refreshUITexts);
