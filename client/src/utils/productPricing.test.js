import { calculateDiscountedPrice, calculateFinalPrice, getProductDiscountPercent } from './productPricing';

test('calculates each discount from the unchanged original price', () => {
    expect(calculateDiscountedPrice(1000, 10)).toBe(900);
    expect(calculateDiscountedPrice(1000, 10)).toBe(900);
    expect(calculateDiscountedPrice(1000, 46)).toBe(540);
    expect(calculateDiscountedPrice(40000, 10)).toBe(36000);
});

test('applies the additional offer on top of the regular selling price', () => {
    expect(calculateFinalPrice(640, 10)).toBe(576);
    expect(calculateFinalPrice(640, 10)).toBe(576);
    expect(calculateFinalPrice(36000, 10)).toBe(32400);
});

test('does not apply an inactive or expired offer', () => {
    const now = new Date('2026-11-19T10:00:00.000Z');
    expect(calculateFinalPrice(640, 10, false, undefined, now)).toBe(640);
    expect(calculateFinalPrice(640, 10, true, '2026-11-19T09:00:00.000Z', now)).toBe(640);
});

test('reports the effective single discount against the original price', () => {
    expect(getProductDiscountPercent({
        price: 576,
        basePrice: 640,
        originalPrice: 800,
        discountPercent: 20,
        additionalDiscountPercent: 10
    })).toBeCloseTo(28, 5);
});
