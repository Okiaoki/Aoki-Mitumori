/**
 * pricingData.js
 * 料金データ定義 — UIロジックと完全に分離。
 * 将来的にAPIレスポンスへの置き換えを想定した構造。
 * labelEn / descriptionEn など _En サフィックスが英語訳。
 */

const pricingData = {
  siteTypes: [
    {
      id: "lp",
      label: "LP（ランディングページ）",
      labelEn: "Landing Page (LP)",
      description: "1ページ完結型。商品・サービスの訴求に特化",
      descriptionEn: "Single-page site focused on promoting a product or service.",
      basePrice: 150000,
      estimatedDays: 14,
    },
    {
      id: "corporate",
      label: "コーポレートサイト",
      labelEn: "Corporate Site",
      description: "会社・事業の信頼感を高める複数ページ構成",
      descriptionEn: "Multi-page site to build company credibility.",
      basePrice: 350000,
      estimatedDays: 30,
    },
    {
      id: "ec",
      label: "EC風サイト",
      labelEn: "E-Commerce Style Site",
      description: "商品一覧・詳細・カート機能を備えた販売サイト",
      descriptionEn: "Sales site with product listing, detail pages, and cart features.",
      basePrice: 500000,
      estimatedDays: 45,
    },
    {
      id: "wordpress",
      label: "WordPress構築",
      labelEn: "WordPress Build",
      description: "クライアント自身が更新できるCMS付きサイト",
      descriptionEn: "CMS-based site that clients can update themselves.",
      basePrice: 300000,
      estimatedDays: 25,
    },
  ],

  pageCountOptions: [
    { id: "1p",      label: "1ページ",      labelEn: "1 Page",      description: "LP・シングルページ向け",  descriptionEn: "For LP or single-page sites.",  multiplier: 1.0, dayImpact: 0 },
    { id: "3-5p",    label: "3〜5ページ",   labelEn: "3–5 Pages",   description: "小規模サイト向け",        descriptionEn: "For small sites.",              multiplier: 1.5, dayImpact: 5 },
    { id: "6-10p",   label: "6〜10ページ",  labelEn: "6–10 Pages",  description: "中規模サイト向け",        descriptionEn: "For medium sites.",             multiplier: 2.2, dayImpact: 12 },
    { id: "11p-plus",label: "11ページ以上", labelEn: "11+ Pages",   description: "大規模サイト向け",        descriptionEn: "For large sites.",              multiplier: 3.0, dayImpact: 22 },
  ],

  options: [
    { id: "form",       label: "お問い合わせフォーム", labelEn: "Contact Form",          description: "入力バリデーション付きの問い合わせフォーム",     descriptionEn: "Inquiry form with input validation.",                   price: 30000, dayImpact: 2 },
    { id: "cms",        label: "CMS導入",              labelEn: "CMS Setup",             description: "WordPressなどによるコンテンツ管理システム",       descriptionEn: "Content management system (e.g. WordPress).",           price: 80000, dayImpact: 5 },
    { id: "responsive", label: "レスポンシブ対応",     labelEn: "Responsive Design",     description: "スマートフォン・タブレット最適化",               descriptionEn: "Smartphone & tablet optimization.",                     price: 50000, dayImpact: 3 },
    { id: "seo",        label: "SEO基礎設定",          labelEn: "Basic SEO Setup",       description: "メタタグ・構造化データ・サイトマップ設定",       descriptionEn: "Meta tags, structured data & sitemap configuration.",   price: 40000, dayImpact: 2 },
    { id: "sns",        label: "SNS連携",              labelEn: "Social Media Integration", description: "OGP設定・シェアボタン・SNSフィード埋め込み", descriptionEn: "OGP settings, share buttons & SNS feed embedding.",     price: 25000, dayImpact: 1 },
  ],

  urgencyOptions: [
    { id: "normal",  label: "通常",              labelEn: "Standard",                description: "納期目安通りの進行",                        descriptionEn: "Normal delivery timeline.",                              priceMultiplier: 1.0, dayMultiplier: 1.0, dayOffset: 0 },
    { id: "rush",    label: "急ぎ（-30%短縮）",  labelEn: "Rush (−30% shorter)",    description: "標準納期より30%短縮 / 割増料金30%",          descriptionEn: "30% shorter than standard / 30% surcharge.",             priceMultiplier: 1.3, dayMultiplier: 0.7, dayOffset: 0 },
    { id: "express", label: "特急（-50%短縮）",  labelEn: "Express (−50% shorter)", description: "標準納期より50%短縮 / 割増料金50%",          descriptionEn: "50% shorter than standard / 50% surcharge.",             priceMultiplier: 1.5, dayMultiplier: 0.5, dayOffset: -2 },
  ],

  recommendedPlans: [
    {
      id: "start",
      name: "スタートパック",
      nameEn: "Starter Pack",
      description: "シンプルなLP制作に最適。短期間で効果的な訴求ページを制作します。",
      descriptionEn: "Perfect for simple LP production. Create an effective promotion page in a short timeframe.",
      condition: (sel) =>
        sel.siteType?.id === "lp" && sel.pageCount?.id === "1p",
    },
    {
      id: "business",
      name: "ビジネスパック",
      nameEn: "Business Pack",
      description: "中小企業・個人事業主様のコーポレートサイトに最適。信頼感のあるWebプレゼンスを構築します。",
      descriptionEn: "Ideal for SMB and sole proprietor corporate websites. Build a trustworthy web presence.",
      condition: (sel) =>
        sel.siteType?.id === "corporate" &&
        ["3-5p", "6-10p"].includes(sel.pageCount?.id) &&
        sel.options.some((o) => o.id === "responsive"),
    },
    {
      id: "premium",
      name: "プレミアムパック",
      nameEn: "Premium Pack",
      description: "機能を充実させたハイクオリティなサイト制作。SEOから運用まで包括的にサポートします。",
      descriptionEn: "Full-featured high-quality site production. Comprehensive support from SEO to ongoing management.",
      condition: (sel) =>
        ["ec", "wordpress"].includes(sel.siteType?.id) &&
        sel.options.length >= 3,
    },
    {
      id: "custom",
      name: "カスタムプラン",
      nameEn: "Custom Plan",
      description: "ご要望に合わせた完全カスタムプランです。まずはお気軽にご相談ください。",
      descriptionEn: "A fully custom plan tailored to your needs. Feel free to reach out for a consultation.",
      condition: () => true, // フォールバック
    },
  ],

  /** 割引コード一覧 */
  discountCodes: [
    { code: "OPEN2024", label: "オープン記念割引",    discountRate: 0.10 },
    { code: "WEB20",    label: "Web制作20%割引",      discountRate: 0.20 },
    { code: "REFER10",  label: "紹介キャンペーン割引", discountRate: 0.10 },
  ],

  /** 料金プラン（比較表用） */
  plans: [
    {
      id: "lp",
      name: "LP・1ページ制作",
      nameEn: "LP / 1-Page Production",
      price: "¥150,000 〜",
      tag: "",
      tagEn: "",
      desc: "商品・サービスの訴求に特化した1ページ完結型のランディングページ制作。短期間で成果につながるページを制作します。",
      descEn: "Single-page landing page focused on promoting products or services. Delivered quickly with strong visual impact.",
      features: [
        { text: "LP（1ページ）制作",         textEn: "Landing Page (1 page)",        included: true },
        { text: "レスポンシブ対応",           textEn: "Responsive Design",            included: true },
        { text: "お問い合わせフォーム",       textEn: "Contact Form",                 included: true },
        { text: "SEO基礎設定",               textEn: "Basic SEO Setup",              included: false },
        { text: "CMS（WordPress）",          textEn: "CMS (WordPress)",              included: false },
        { text: "納品後30日サポート",         textEn: "30-Day Post-Delivery Support", included: true },
      ],
      cta: "シミュレーターで試算する",
      ctaEn: "Try the Simulator",
      preset: { siteType: "lp", pageCount: "1p" },
    },
    {
      id: "corporate",
      name: "コーポレートサイト制作",
      nameEn: "Corporate Site Production",
      price: "¥350,000 〜",
      tag: "ご依頼多数",
      tagEn: "Most Popular",
      desc: "企業・ブランドの信頼感を高める複数ページ構成のコーポレートサイト。SEO・問い合わせ導線まで一貫して対応します。",
      descEn: "Multi-page corporate website to build trust for companies and sole proprietors. Full support from SEO to inquiry flow.",
      features: [
        { text: "コーポレートサイト（5P〜）制作", textEn: "Corporate Site (5+ pages)",     included: true },
        { text: "レスポンシブ対応",               textEn: "Responsive Design",            included: true },
        { text: "お問い合わせフォーム",           textEn: "Contact Form",                 included: true },
        { text: "SEO基礎設定",                   textEn: "Basic SEO Setup",              included: true },
        { text: "CMS（WordPress）",              textEn: "CMS (WordPress)",              included: false },
        { text: "納品後30日サポート",             textEn: "30-Day Post-Delivery Support", included: true },
      ],
      cta: "シミュレーターで試算する",
      ctaEn: "Try the Simulator",
      preset: { siteType: "corporate", pageCount: "3-5p" },
    },
    {
      id: "ec",
      name: "ECサイト・大規模制作",
      nameEn: "E-Commerce / Large Scale",
      price: "¥500,000 〜",
      tag: "",
      tagEn: "",
      desc: "商品販売・EC機能を備えた大規模サイト制作。CMS・SEO・SNS連携を含むフルパッケージで対応します。",
      descEn: "Large-scale site with shopping features. Full package including CMS, SEO, and social media integration.",
      features: [
        { text: "EC風 or 大規模サイト制作",   textEn: "E-Commerce or Large Scale Site", included: true },
        { text: "レスポンシブ対応",           textEn: "Responsive Design",              included: true },
        { text: "お問い合わせフォーム",       textEn: "Contact Form",                   included: true },
        { text: "SEO基礎設定",               textEn: "Basic SEO Setup",                included: true },
        { text: "CMS（WordPress）",          textEn: "CMS (WordPress)",                included: true },
        { text: "納品後30日サポート",         textEn: "30-Day Post-Delivery Support",   included: true },
      ],
      cta: "シミュレーターで試算する",
      ctaEn: "Try the Simulator",
      preset: { siteType: "ec", pageCount: "6-10p" },
    },
  ],

  /** ユースケース別導入ナビ */
  useCases: [
    {
      icon: "🏢",
      title: "会社のWebサイトが初めて必要",
      titleEn: "Need your first company website",
      desc: "信頼感のあるコーポレートサイトで、問い合わせ・採用につなげたい方。",
      descEn: "Build a trustworthy corporate site to drive inquiries and recruitment.",
      recommend: "スタンダードプラン",
      recommendEn: "Standard Plan",
      preset: { siteType: "corporate", pageCount: "3-5p" },
    },
    {
      icon: "🛍️",
      title: "商品・サービスをオンラインで売りたい",
      titleEn: "Want to sell products or services online",
      desc: "商品一覧・カート・お申し込みフォームを備えた販売特化サイトを作りたい方。",
      descEn: "Build a sales site with product listing, cart, and order form.",
      recommend: "プレミアムプラン",
      recommendEn: "Premium Plan",
      preset: { siteType: "ec", pageCount: "6-10p" },
    },
    {
      icon: "📣",
      title: "広告・キャンペーンのLPが必要",
      titleEn: "Need an LP for ads or campaigns",
      desc: "1ページ完結の訴求力の高いランディングページを素早く作りたい方。",
      descEn: "Create a high-converting single-page landing page quickly.",
      recommend: "ライトプラン",
      recommendEn: "Light Plan",
      preset: { siteType: "lp", pageCount: "1p" },
    },
    {
      icon: "✏️",
      title: "自分でブログや情報を更新したい",
      titleEn: "Want to update your own blog or news",
      desc: "担当者が自由に記事・お知らせを更新できるCMSサイトを持ちたい方。",
      descEn: "Build a CMS site where your team can freely update articles and announcements.",
      recommend: "スタンダードプラン",
      recommendEn: "Standard Plan",
      preset: { siteType: "wordpress", pageCount: "3-5p" },
    },
  ],

  faqItems: [
    {
      question: "この見積もりの精度はどのくらいですか？",
      questionEn: "How accurate is this estimate?",
      answer: "シミュレーターの金額はあくまで概算です。実際のご要望・デザイン仕様・機能数によって変動します。正式なお見積もりはヒアリング後にご提示いたします。",
      answerEn: "The simulator provides approximate costs only. Actual prices may vary based on your specific requirements, design specs, and feature count. A formal quote will be provided after a consultation.",
    },
    {
      question: "相談・見積もりに費用はかかりますか？",
      questionEn: "Is there a charge for consultation or estimates?",
      answer: "初回相談・概算見積もりは完全無料です。正式発注の意思がない段階でのご相談も歓迎しております。",
      answerEn: "Initial consultations and rough estimates are completely free. Feel free to reach out even if you're still exploring your options.",
    },
    {
      question: "相談後にキャンセルすることはできますか？",
      questionEn: "Can I cancel after the consultation?",
      answer: "正式な契約（発注書・作業開始）前であればいつでもキャンセル可能です。キャンセル料は一切発生しません。",
      answerEn: "You can cancel at any time before a formal contract (order form / work start). No cancellation fees apply.",
    },
    {
      question: "制作期間中の修正対応はどうなっていますか？",
      questionEn: "How are revisions handled during development?",
      answer: "デザインカンプ・コーディングの各フェーズで修正回数を設けています。標準プランでは各フェーズ3回まで無償対応いたします。",
      answerEn: "We allow revisions at each phase (design mockup and coding). Standard plans include up to 3 free revisions per phase.",
    },
    {
      question: "完成後のサポートやメンテナンスはありますか？",
      questionEn: "Is there support after the site is completed?",
      answer: "納品後30日間は無償サポート期間としています。以降は月額保守プランをご用意しており、テキスト修正・プラグイン更新・セキュリティ対応などを承ります。",
      answerEn: "We provide 30 days of free support after delivery. Monthly maintenance plans are also available for text updates, plugin upgrades, and security management.",
    },
    {
      question: "他社で制作したサイトのリニューアルにも対応していますか？",
      questionEn: "Do you handle redesigns of sites made by other companies?",
      answer: "もちろんです。既存サイトの解析・現状ヒアリングを行った上で、最適なリニューアル提案をいたします。",
      answerEn: "Absolutely. We analyze your current site and conduct a detailed consultation before proposing the optimal redesign solution.",
    },
    {
      question: "制作物の著作権はどちらに帰属しますか？",
      questionEn: "Who owns the copyright to the deliverables?",
      answer: "納品・お支払い完了後は、制作物の著作権はすべてクライアント様に帰属いたします。",
      answerEn: "All copyrights to the deliverables transfer to the client upon delivery and full payment.",
    },
  ],
};

// ─── 共通 i18n ヘルパー（全JSから参照可能） ─────────────────
/** 現在の言語に応じて label / labelEn を返す */
const PRICING_MODEL_META = Object.freeze({
  runtimeCanonicalSource: "js/pricingData.js",
  referenceSnapshotFile: "data/pricing.json",
  runtimeOverrideStorageKey: "admin_pricing_override",
  adminEditable: Object.freeze({
    siteTypes: Object.freeze(["basePrice", "estimatedDays"]),
    options: Object.freeze(["price"]),
    discountCodes: Object.freeze(["code", "label", "discountRate"]),
  }),
  runtimeFixed: Object.freeze({
    siteTypes: Object.freeze(["label", "labelEn", "description", "descriptionEn"]),
    pageCountOptions: Object.freeze(["label", "labelEn", "description", "descriptionEn", "multiplier", "dayImpact"]),
    options: Object.freeze(["label", "labelEn", "description", "descriptionEn", "dayImpact"]),
    urgencyOptions: Object.freeze(["label", "labelEn", "description", "descriptionEn", "priceMultiplier", "dayMultiplier", "dayOffset"]),
  }),
});

function getPricingModelMeta() {
  return {
    runtimeCanonicalSource: PRICING_MODEL_META.runtimeCanonicalSource,
    referenceSnapshotFile: PRICING_MODEL_META.referenceSnapshotFile,
    runtimeOverrideStorageKey: PRICING_MODEL_META.runtimeOverrideStorageKey,
    adminEditable: {
      siteTypes: [...PRICING_MODEL_META.adminEditable.siteTypes],
      options: [...PRICING_MODEL_META.adminEditable.options],
      discountCodes: [...PRICING_MODEL_META.adminEditable.discountCodes],
    },
    runtimeFixed: {
      siteTypes: [...PRICING_MODEL_META.runtimeFixed.siteTypes],
      pageCountOptions: [...PRICING_MODEL_META.runtimeFixed.pageCountOptions],
      options: [...PRICING_MODEL_META.runtimeFixed.options],
      urgencyOptions: [...PRICING_MODEL_META.runtimeFixed.urgencyOptions],
    },
  };
}

function sanitizePricingOverride(override) {
  if (!override || typeof override !== "object") return null;

  const sanitized = {};

  if (Array.isArray(override.siteTypes)) {
    const siteTypes = override.siteTypes
      .map((entry) => {
        if (!entry || typeof entry !== "object" || !entry.id) return null;
        const next = { id: String(entry.id) };
        if (Number.isFinite(Number(entry.basePrice))) next.basePrice = Number(entry.basePrice);
        if (Number.isFinite(Number(entry.estimatedDays))) next.estimatedDays = Number(entry.estimatedDays);
        return Object.keys(next).length > 1 ? next : null;
      })
      .filter(Boolean);
    if (siteTypes.length) sanitized.siteTypes = siteTypes;
  }

  if (Array.isArray(override.options)) {
    const options = override.options
      .map((entry) => {
        if (!entry || typeof entry !== "object" || !entry.id) return null;
        if (!Number.isFinite(Number(entry.price))) return null;
        return {
          id: String(entry.id),
          price: Number(entry.price),
        };
      })
      .filter(Boolean);
    if (options.length) sanitized.options = options;
  }

  if (Array.isArray(override.discountCodes)) {
    const discountCodes = override.discountCodes
      .map((entry) => {
        if (!entry || typeof entry !== "object") return null;
        const code = String(entry.code || "").trim().toUpperCase();
        const label = String(entry.label || "").trim();
        const discountRate = Number(entry.discountRate);
        if (!code || !label || !Number.isFinite(discountRate)) return null;
        return { code, label, discountRate };
      })
      .filter(Boolean);
    if (discountCodes.length) sanitized.discountCodes = discountCodes;
  }

  return Object.keys(sanitized).length ? sanitized : null;
}

function buildPricingReferenceSnapshot(override) {
  const sanitizedOverride = sanitizePricingOverride(override) || {};

  const siteTypes = pricingData.siteTypes.map((item) => {
    const overrideEntry = sanitizedOverride.siteTypes?.find((entry) => entry.id === item.id) || {};
    return {
      id: item.id,
      label: item.label,
      labelEn: item.labelEn,
      description: item.description,
      descriptionEn: item.descriptionEn,
      basePrice: overrideEntry.basePrice !== undefined ? overrideEntry.basePrice : item.basePrice,
      estimatedDays: overrideEntry.estimatedDays !== undefined ? overrideEntry.estimatedDays : item.estimatedDays,
    };
  });

  const pageCountOptions = pricingData.pageCountOptions.map((item) => ({
    id: item.id,
    label: item.label,
    labelEn: item.labelEn,
    description: item.description,
    descriptionEn: item.descriptionEn,
    multiplier: item.multiplier,
    dayImpact: item.dayImpact,
  }));

  const options = pricingData.options.map((item) => {
    const overrideEntry = sanitizedOverride.options?.find((entry) => entry.id === item.id) || {};
    return {
      id: item.id,
      label: item.label,
      labelEn: item.labelEn,
      description: item.description,
      descriptionEn: item.descriptionEn,
      price: overrideEntry.price !== undefined ? overrideEntry.price : item.price,
      dayImpact: item.dayImpact,
    };
  });

  const urgencyOptions = pricingData.urgencyOptions.map((item) => ({
    id: item.id,
    label: item.label,
    labelEn: item.labelEn,
    description: item.description,
    descriptionEn: item.descriptionEn,
    priceMultiplier: item.priceMultiplier,
    dayMultiplier: item.dayMultiplier,
    dayOffset: item.dayOffset,
  }));

  const discountCodes = (sanitizedOverride.discountCodes || pricingData.discountCodes || []).map((item) => ({
    code: item.code,
    label: item.label,
    discountRate: item.discountRate,
  }));

  return {
    _meta: {
      runtimeCanonicalSource: PRICING_MODEL_META.runtimeCanonicalSource,
      referenceSnapshotFile: PRICING_MODEL_META.referenceSnapshotFile,
      runtimeOverrideStorageKey: PRICING_MODEL_META.runtimeOverrideStorageKey,
      runtimeUsage: "Reference snapshot only. v2.1 reads pricing from js/pricingData.js and applies local overrides via pricingLoader.js.",
      adminEditable: getPricingModelMeta().adminEditable,
      runtimeFixed: getPricingModelMeta().runtimeFixed,
    },
    siteTypes,
    pageCountOptions,
    options,
    urgencyOptions,
    discountCodes,
  };
}

function _i18nLabel(item) {
  const lang = typeof getCurrentLang === "function" ? getCurrentLang() : "ja";
  return (lang === "en" && item.labelEn) ? item.labelEn : item.label;
}
/** 現在の言語に応じて description / descriptionEn を返す */
function _i18nDesc(item) {
  const lang = typeof getCurrentLang === "function" ? getCurrentLang() : "ja";
  return (lang === "en" && item.descriptionEn) ? item.descriptionEn : item.description;
}
/** 現在の言語に応じて name / nameEn を返す */
function _i18nName(item) {
  const lang = typeof getCurrentLang === "function" ? getCurrentLang() : "ja";
  return (lang === "en" && item.nameEn) ? item.nameEn : item.name;
}
