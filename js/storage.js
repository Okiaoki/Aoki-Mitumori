/**
 * storage.js
 * Shared localStorage helpers and key definitions.
 *
 * Storage categories:
 * - estimateDraft: estimate draft and compare slots
 * - ui: theme and language
 * - ab: A/B variant assignments
 * - admin: inquiries, pricing override, discount usage
 */

const STORAGE_VERSION = 3;
const STORAGE_PREFIX = "ads_";

const STORAGE_KEYS = Object.freeze({
  estimateDraft: "estimate_draft",
  estimateCompareSlots: "estimate_compare_slots",
  uiTheme: "ui_theme",
  uiLanguage: "ui_language",
  abVariants: "ab_variants",
  adminInquiries: "admin_inquiries",
  adminPricingOverride: "admin_pricing_override",
  adminDiscountUsage: "admin_discount_usage",
});

const STORAGE_DEFINITIONS = Object.freeze({
  estimateDraft: {
    key: STORAGE_KEYS.estimateDraft,
    category: "estimateDraft",
    ttlDays: 7,
    description: "Simulator draft selections for reload/share recovery.",
    legacyKeys: ["ads_simulator_state"],
  },
  estimateCompareSlots: {
    key: STORAGE_KEYS.estimateCompareSlots,
    category: "estimateDraft",
    ttlDays: 30,
    description: "Saved compare patterns from the estimate result screen.",
    legacyKeys: ["ads_compare_slots"],
  },
  uiTheme: {
    key: STORAGE_KEYS.uiTheme,
    category: "ui",
    ttlDays: null,
    description: "Theme preference chosen by the visitor.",
    legacyKeys: ["ads_theme"],
  },
  uiLanguage: {
    key: STORAGE_KEYS.uiLanguage,
    category: "ui",
    ttlDays: null,
    description: "Selected UI language.",
    legacyKeys: ["ads_lang"],
  },
  abVariants: {
    key: STORAGE_KEYS.abVariants,
    category: "ab",
    ttlDays: null,
    description: "Assigned A/B variants for the current browser.",
    legacyKeys: ["ads_ab_variants"],
  },
  adminInquiries: {
    key: STORAGE_KEYS.adminInquiries,
    category: "admin",
    ttlDays: null,
    description: "Locally stored inquiry records for the demo admin screen.",
    legacyKeys: ["ads_inquiries"],
  },
  adminPricingOverride: {
    key: STORAGE_KEYS.adminPricingOverride,
    category: "admin",
    ttlDays: null,
    description: "Locally edited pricing overrides.",
    legacyKeys: ["ads_pricing_override"],
  },
  adminDiscountUsage: {
    key: STORAGE_KEYS.adminDiscountUsage,
    category: "admin",
    ttlDays: 90,
    description: "Discount code usage counters.",
    legacyKeys: ["ads_discount_usage"],
  },
});

function getStorageCatalog() {
  return Object.values(STORAGE_DEFINITIONS).map((definition) => ({
    ...definition,
    localStorageKey: storageFullKey(definition.key),
  }));
}

function storageFullKey(key) {
  return STORAGE_PREFIX + key;
}

function storageSave(key, value, ttlDays = null) {
  try {
    const entry = {
      v: STORAGE_VERSION,
      data: value,
      savedAt: Date.now(),
    };

    if (ttlDays) {
      entry.expiresAt = Date.now() + ttlDays * 86400000;
    }

    localStorage.setItem(storageFullKey(key), JSON.stringify(entry));
  } catch (error) {
    console.warn("[storage.js] Failed to save storage entry:", key, error);
  }
}

function storageLoad(key) {
  try {
    const raw = localStorage.getItem(storageFullKey(key));
    if (!raw) return null;

    const entry = JSON.parse(raw);

    if (!entry || typeof entry !== "object") return null;

    if (!("v" in entry)) {
      return entry;
    }

    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      localStorage.removeItem(storageFullKey(key));
      return null;
    }

    return entry.data;
  } catch (error) {
    console.warn("[storage.js] Failed to load storage entry:", key, error);
    return null;
  }
}

function storageRemove(key) {
  try {
    localStorage.removeItem(storageFullKey(key));
  } catch (error) {
    console.warn("[storage.js] Failed to remove storage entry:", key, error);
  }
}

function storageLoadRawLegacy(fullKey) {
  try {
    const raw = localStorage.getItem(fullKey);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function migrateLegacyStorageEntry(definition, transform) {
  if (storageLoad(definition.key) !== null) return;

  for (const legacyKey of definition.legacyKeys) {
    const legacyValue = storageLoadRawLegacy(legacyKey);
    if (legacyValue === null) continue;

    const nextValue = typeof transform === "function" ? transform(legacyValue) : legacyValue;
    if (nextValue !== null && nextValue !== undefined) {
      storageSave(definition.key, nextValue, definition.ttlDays);
    }

    try {
      localStorage.removeItem(legacyKey);
    } catch {}
    break;
  }
}

function migrateStorage() {
  migrateLegacyStorageEntry(STORAGE_DEFINITIONS.estimateDraft, (legacyValue) => {
    if (legacyValue && legacyValue.v) return legacyValue.data ?? null;

    const savedAt = legacyValue?.savedAt;
    if (savedAt && Date.now() - savedAt > 7 * 86400000) {
      return null;
    }

    return {
      siteTypeId: legacyValue?.siteTypeId ?? null,
      pageCountId: legacyValue?.pageCountId ?? null,
      optionIds: Array.isArray(legacyValue?.optionIds) ? legacyValue.optionIds : [],
      urgencyId: legacyValue?.urgencyId ?? null,
    };
  });

  migrateLegacyStorageEntry(STORAGE_DEFINITIONS.estimateCompareSlots, (legacyValue) => {
    if (legacyValue && legacyValue.v) return legacyValue.data ?? null;
    return Array.isArray(legacyValue) ? legacyValue : null;
  });

  migrateLegacyStorageEntry(STORAGE_DEFINITIONS.uiTheme, (legacyValue) => {
    if (legacyValue === "dark" || legacyValue === "light") return legacyValue;
    return null;
  });

  migrateLegacyStorageEntry(STORAGE_DEFINITIONS.uiLanguage, (legacyValue) => {
    if (legacyValue === "ja" || legacyValue === "en") return legacyValue;
    return null;
  });

  migrateLegacyStorageEntry(STORAGE_DEFINITIONS.abVariants, (legacyValue) => {
    if (legacyValue && legacyValue.v) return legacyValue.data ?? null;
    return legacyValue && typeof legacyValue === "object" ? legacyValue : {};
  });

  migrateLegacyStorageEntry(STORAGE_DEFINITIONS.adminInquiries, (legacyValue) => {
    if (legacyValue && legacyValue.v) return legacyValue.data ?? null;
    return Array.isArray(legacyValue) ? legacyValue : [];
  });

  migrateLegacyStorageEntry(STORAGE_DEFINITIONS.adminPricingOverride, (legacyValue) => {
    if (legacyValue && legacyValue.v) return legacyValue.data ?? null;
    return legacyValue && typeof legacyValue === "object" ? legacyValue : null;
  });

  migrateLegacyStorageEntry(STORAGE_DEFINITIONS.adminDiscountUsage, (legacyValue) => {
    if (legacyValue && legacyValue.v) return legacyValue.data ?? null;
    return legacyValue && typeof legacyValue === "object" ? legacyValue : {};
  });
}

function initStorageMigrations() {
  migrateStorage();
}

function storageGetEstimateDraft() {
  return storageLoad(STORAGE_KEYS.estimateDraft);
}

function storageSetEstimateDraft(value) {
  storageSave(STORAGE_KEYS.estimateDraft, value, STORAGE_DEFINITIONS.estimateDraft.ttlDays);
}

function storageClearEstimateDraft() {
  storageRemove(STORAGE_KEYS.estimateDraft);
}

function storageGetEstimateCompareSlots() {
  const value = storageLoad(STORAGE_KEYS.estimateCompareSlots);
  return Array.isArray(value) ? value : [];
}

function storageSetEstimateCompareSlots(value) {
  storageSave(STORAGE_KEYS.estimateCompareSlots, value, STORAGE_DEFINITIONS.estimateCompareSlots.ttlDays);
}

function storageClearEstimateCompareSlots() {
  storageRemove(STORAGE_KEYS.estimateCompareSlots);
}

function storageGetTheme() {
  const value = storageLoad(STORAGE_KEYS.uiTheme);
  return value === "dark" || value === "light" ? value : null;
}

function storageSetTheme(theme) {
  storageSave(STORAGE_KEYS.uiTheme, theme);
}

function storageClearTheme() {
  storageRemove(STORAGE_KEYS.uiTheme);
}

function storageGetLanguage() {
  const value = storageLoad(STORAGE_KEYS.uiLanguage);
  return value === "ja" || value === "en" ? value : null;
}

function storageSetLanguage(language) {
  storageSave(STORAGE_KEYS.uiLanguage, language);
}

function storageGetABVariants() {
  const value = storageLoad(STORAGE_KEYS.abVariants);
  return value && typeof value === "object" ? value : {};
}

function storageSetABVariants(value) {
  storageSave(STORAGE_KEYS.abVariants, value);
}

function storageClearABVariants() {
  storageRemove(STORAGE_KEYS.abVariants);
}

function storageGetAdminInquiries() {
  const value = storageLoad(STORAGE_KEYS.adminInquiries);
  return Array.isArray(value) ? value : [];
}

function storageSetAdminInquiries(items) {
  storageSave(STORAGE_KEYS.adminInquiries, items);
}

function storageAppendAdminInquiry(item) {
  const all = storageGetAdminInquiries();
  all.push(item);
  storageSetAdminInquiries(all);
}

function storageClearAdminInquiries() {
  storageRemove(STORAGE_KEYS.adminInquiries);
}

function storageCleanupAdminInquiries(maxAgeDays = 30) {
  const maxAgeMs = maxAgeDays * 86400000;
  const all = storageGetAdminInquiries();
  const filtered = all.filter((entry) => entry?.timestamp && Date.now() - entry.timestamp < maxAgeMs);
  if (filtered.length === all.length) return filtered;
  if (filtered.length > 0) {
    storageSetAdminInquiries(filtered);
  } else {
    storageClearAdminInquiries();
  }
  return filtered;
}

function storageGetAdminPricingOverride() {
  const value = storageLoad(STORAGE_KEYS.adminPricingOverride);
  return value && typeof value === "object" ? value : null;
}

function storageSetAdminPricingOverride(value) {
  storageSave(STORAGE_KEYS.adminPricingOverride, value);
}

function storageClearAdminPricingOverride() {
  storageRemove(STORAGE_KEYS.adminPricingOverride);
}

function storageGetAdminDiscountUsage() {
  const value = storageLoad(STORAGE_KEYS.adminDiscountUsage);
  return value && typeof value === "object" ? value : {};
}

function storageSetAdminDiscountUsage(value) {
  storageSave(STORAGE_KEYS.adminDiscountUsage, value, STORAGE_DEFINITIONS.adminDiscountUsage.ttlDays);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initStorageMigrations);
} else {
  initStorageMigrations();
}
