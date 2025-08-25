"use strict";
/**
 * Centralized Stripe Price Configuration for Cloud Functions
 *
 * Single source of truth for all Stripe price IDs.
 * This eliminates hardcoded price IDs scattered throughout the codebase.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PRICE_ID_TO_PLAN_MAP = void 0;
exports.getPlanFromPriceId = getPlanFromPriceId;
exports.isValidPriceId = isValidPriceId;
// Production Price IDs (Live Mode)
const PRODUCTION_PRICES = {
    monthly: 'price_1RubMXHdrJomitOwNNI4LmWB', // £8.99/month (LIVE)
    yearly: 'price_1RubMxHdrJomitOwElEo6nys', // £89.99/year (LIVE)
};
// Test Price IDs (Test Mode)
const TEST_PRICES = {
    monthly: 'price_1RzIUUQkBRi5wGMEzm9veY3j', // £8.99/month (TEST)
    yearly: 'price_1RzIVDQkBRi5wGME6v7ECis8', // £89.99/year (TEST)
};
// Price ID to Plan Type mapping - includes both test and production
exports.PRICE_ID_TO_PLAN_MAP = {
    // Production prices
    [PRODUCTION_PRICES.monthly]: 'monthly',
    [PRODUCTION_PRICES.yearly]: 'yearly',
    // Test prices
    [TEST_PRICES.monthly]: 'monthly',
    [TEST_PRICES.yearly]: 'yearly',
};
// Helper function to get plan type from price ID
function getPlanFromPriceId(priceId) {
    if (!priceId)
        return 'free';
    return exports.PRICE_ID_TO_PLAN_MAP[priceId] || 'free';
}
// Helper function to validate price ID
function isValidPriceId(priceId) {
    return priceId in exports.PRICE_ID_TO_PLAN_MAP;
}
//# sourceMappingURL=stripe-prices.js.map