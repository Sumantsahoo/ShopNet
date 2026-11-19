const test = require('node:test');
const assert = require('node:assert/strict');
const {
    normalizeProductPricing,
    normalizePromotionalPricing,
    getEffectiveProductPrice,
    isAdditionalOfferLive
} = require('./productPricing');

test('calculates the regular discount from the unchanged original price', () => {
    assert.equal(normalizeProductPricing(640, 800, 20).price, 640);
    assert.equal(normalizeProductPricing(36000, 40000, 10).price, 36000);
    assert.equal(normalizeProductPricing(540, 1000, 46).price, 540);
});

test('applies the extra offer once to the regular selling price', () => {
    const firstCalculation = normalizePromotionalPricing(640, 800, 20, 10);
    const repeatedCalculation = normalizePromotionalPricing(
        firstCalculation.basePrice,
        firstCalculation.originalPrice,
        firstCalculation.discountPercent,
        firstCalculation.additionalDiscountPercent
    );

    assert.equal(firstCalculation.price, 576);
    assert.equal(repeatedCalculation.price, 576);
    assert.equal(repeatedCalculation.originalPrice, 800);
});

test('deactivation and expiry restore the regular selling price', () => {
    const now = new Date('2026-11-19T10:00:00.000Z');
    const expiredOffer = normalizePromotionalPricing(640, 800, 20, 10, true, '2026-11-19T09:00:00.000Z', now);
    const inactiveOffer = normalizePromotionalPricing(640, 800, 20, 10, false, undefined, now);

    assert.equal(expiredOffer.price, 640);
    assert.equal(inactiveOffer.price, 640);
    assert.equal(isAdditionalOfferLive(expiredOffer, now), false);
    assert.equal(getEffectiveProductPrice({ ...expiredOffer, price: 576 }, now), 640);
});
