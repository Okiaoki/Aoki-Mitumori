/**
 * pricingLoader.js
 * Applies browser-local pricing overrides on top of the runtime canonical data.
 *
 * v2.1 boundary:
 * - runtime canonical source: js/pricingData.js
 * - local override storage: storage admin_pricing_override
 * - reference snapshot file: data/pricing.json
 * - admin editable scope:
 *   - siteTypes.basePrice
 *   - siteTypes.estimatedDays
 *   - options.price
 *   - discountCodes.*
 */

function applyPricingOverrides() {
  if (typeof pricingData === "undefined") return;

  try {
    const rawOverride = typeof storageGetAdminPricingOverride === "function"
      ? storageGetAdminPricingOverride()
      : null;
    const override = typeof sanitizePricingOverride === "function"
      ? sanitizePricingOverride(rawOverride)
      : rawOverride;
    if (!override) return;

    if (Array.isArray(override.siteTypes)) {
      override.siteTypes.forEach((entry) => {
        const target = pricingData.siteTypes.find((siteType) => siteType.id === entry.id);
        if (!target) return;
        if (entry.basePrice !== undefined) target.basePrice = Number(entry.basePrice);
        if (entry.estimatedDays !== undefined) target.estimatedDays = Number(entry.estimatedDays);
      });
    }

    if (Array.isArray(override.options)) {
      override.options.forEach((entry) => {
        const target = pricingData.options.find((option) => option.id === entry.id);
        if (!target) return;
        if (entry.price !== undefined) target.price = Number(entry.price);
      });
    }

    if (Array.isArray(override.discountCodes)) {
      pricingData.discountCodes = override.discountCodes.map((code) => ({ ...code }));
    }

    console.info("[pricingLoader] Applied editable pricing overrides on top of js/pricingData.js");
  } catch (error) {
    console.warn("[pricingLoader] Failed to apply pricing overrides:", error);
  }
}

function savePricingOverrides(overrideData) {
  try {
    const sanitized = typeof sanitizePricingOverride === "function"
      ? sanitizePricingOverride(overrideData)
      : overrideData;

    if (typeof storageSetAdminPricingOverride === "function") {
      if (sanitized) {
        storageSetAdminPricingOverride(sanitized);
      } else if (typeof storageClearAdminPricingOverride === "function") {
        storageClearAdminPricingOverride();
      }
    }
  } catch (error) {
    console.error("[pricingLoader] Failed to save pricing overrides:", error);
  }
}

function clearPricingOverrides() {
  if (typeof storageClearAdminPricingOverride === "function") {
    storageClearAdminPricingOverride();
  }
}

function getPricingOverrides() {
  if (typeof storageGetAdminPricingOverride === "function") {
    const rawOverride = storageGetAdminPricingOverride();
    return typeof sanitizePricingOverride === "function"
      ? sanitizePricingOverride(rawOverride)
      : rawOverride;
  }
  return null;
}

document.addEventListener("DOMContentLoaded", applyPricingOverrides);
