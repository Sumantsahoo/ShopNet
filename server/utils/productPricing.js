const roundPrice = (price) => Math.round((price + Number.EPSILON) * 100) / 100;
const parseOfferExpiry = (value) => {
    if (value === undefined || value === null || value === '') return undefined;
    const expiresAt = new Date(value);
    if (Number.isNaN(expiresAt.getTime())) {
        throw new Error('Enter a valid promotion expiry date.');
    }
    return expiresAt;
};

const isAdditionalOfferLive = (product, now = new Date()) => {
    const discountPercent = Number(product.additionalDiscountPercent);
    const expiresAt = product.additionalOfferExpiresAt ? new Date(product.additionalOfferExpiresAt) : null;
    return Number.isFinite(discountPercent) &&
        discountPercent > 0 &&
        product.additionalOfferActive !== false &&
        (!expiresAt || (!Number.isNaN(expiresAt.getTime()) && expiresAt > now));
};

const getRegularPrice = (product) => {
    const basePrice = Number(product.basePrice);
    if (Number.isFinite(basePrice) && basePrice >= 0) return basePrice;

    const originalPrice = Number(product.originalPrice);
    const discountPercent = Number(product.discountPercent);
    if (Number.isFinite(originalPrice) && originalPrice > 0 &&
        Number.isFinite(discountPercent) && discountPercent > 0 && discountPercent <= 100) {
        return roundPrice(originalPrice * (100 - discountPercent) / 100);
    }
    const price = Number(product.price);
    return Number.isFinite(price) && price >= 0 ? price : 0;
};

const getEffectiveProductPrice = (product, now = new Date()) => {
    const regularPrice = getRegularPrice(product);
    if (!isAdditionalOfferLive(product, now)) return regularPrice;
    return roundPrice(regularPrice * (100 - Number(product.additionalDiscountPercent)) / 100);
};

const toProductResponse = (product) => {
    const data = typeof product.toObject === 'function' ? product.toObject() : { ...product };
    const now = new Date();
    return {
        ...data,
        basePrice: getRegularPrice(data),
        price: getEffectiveProductPrice(data, now),
        isAdditionalOfferLive: isAdditionalOfferLive(data, now)
    };
};

const normalizeProductPricing = (priceValue, originalPriceValue, discountPercentValue) => {
    const price = Number(priceValue);
    if (!Number.isFinite(price) || price < 0) {
        throw new Error('Enter a valid product price.');
    }

    if (discountPercentValue !== undefined && discountPercentValue !== '') {
        const discountPercent = Number(discountPercentValue);
        if (!Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 100) {
            throw new Error('Discount must be between 0 and 100.');
        }
        if (discountPercent === 0) {
            const originalPrice = Number(originalPriceValue);
            return {
                price,
                originalPrice: Number.isFinite(originalPrice) && originalPrice > 0 ? originalPrice : undefined,
                discountPercent: 0
            };
        }

        const originalPrice = Number(originalPriceValue);
        if (!Number.isFinite(originalPrice) || originalPrice <= 0) {
            throw new Error('Enter an original price before setting a discount.');
        }
        return {
            price: roundPrice(originalPrice * (100 - discountPercent) / 100),
            originalPrice,
            discountPercent
        };
    }

    if (originalPriceValue === undefined || originalPriceValue === '') {
        return { price, originalPrice: undefined, discountPercent: 0 };
    }

    const originalPrice = Number(originalPriceValue);
    if (!Number.isFinite(originalPrice) || originalPrice < price) {
        throw new Error('Original price must not be less than the current price.');
    }
    return {
        price,
        originalPrice,
        discountPercent: originalPrice === price ? 0 : (1 - price / originalPrice) * 100
    };
};

const normalizePromotionalPricing = (
    basePriceValue,
    originalPriceValue,
    discountPercentValue,
    promotionDiscountValue,
    promotionActiveValue = true,
    promotionExpiresAtValue,
    now = new Date()
) => {
    const basePricing = normalizeProductPricing(basePriceValue, originalPriceValue, discountPercentValue);
    const promotionDiscountPercent = Number(promotionDiscountValue || 0);
    if (!Number.isFinite(promotionDiscountPercent) || promotionDiscountPercent < 0 || promotionDiscountPercent > 100) {
        throw new Error('Promotion discount must be between 0 and 100.');
    }
    const additionalOfferExpiresAt = parseOfferExpiry(promotionExpiresAtValue);
    const additionalOfferActive = promotionActiveValue !== false && promotionActiveValue !== 'false';

    const originalPrice = basePricing.originalPrice ??
        (promotionDiscountPercent > 0 ? basePricing.price : undefined);
    const pricingProduct = {
        additionalDiscountPercent: promotionDiscountPercent,
        additionalOfferActive,
        additionalOfferExpiresAt
    };
    const offerIsLive = isAdditionalOfferLive(pricingProduct, now);
    const price = offerIsLive
        ? roundPrice(basePricing.price * (100 - promotionDiscountPercent) / 100)
        : basePricing.price;
    return {
        price,
        basePrice: basePricing.price,
        originalPrice,
        discountPercent: basePricing.discountPercent,
        additionalDiscountPercent: promotionDiscountPercent,
        additionalOfferActive,
        additionalOfferExpiresAt
    };
};

module.exports = {
    normalizeProductPricing,
    normalizePromotionalPricing,
    getRegularPrice,
    getEffectiveProductPrice,
    isAdditionalOfferLive,
    toProductResponse
};
