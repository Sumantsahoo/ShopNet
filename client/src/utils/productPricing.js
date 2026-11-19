const roundPrice = (price) => Math.round((price + Number.EPSILON) * 100) / 100;

export const calculateDiscountedPrice = (originalPrice, discountPercent) => (
    roundPrice(Number(originalPrice) * (100 - Number(discountPercent)) / 100)
);

export const isProductOfferActive = (product, now = new Date()) => {
    const discountPercent = Number(product.additionalDiscountPercent);
    const expiresAt = product.additionalOfferExpiresAt ? new Date(product.additionalOfferExpiresAt) : null;
    return Number.isFinite(discountPercent) &&
        discountPercent > 0 &&
        product.additionalOfferActive !== false &&
        (!expiresAt || (!Number.isNaN(expiresAt.getTime()) && expiresAt > now));
};

export const getProductBasePrice = (product) => {
    const basePrice = Number(product.basePrice ?? product.regularPrice);
    if (Number.isFinite(basePrice) && basePrice >= 0) return basePrice;

    const originalPrice = Number(product.originalPrice);
    const discountPercent = Number(product.discountPercent);
    if (Number.isFinite(originalPrice) && originalPrice > 0 &&
        Number.isFinite(discountPercent) && discountPercent > 0 && discountPercent <= 100) {
        return calculateDiscountedPrice(originalPrice, discountPercent);
    }

    const price = Number(product.price);
    return Number.isFinite(price) && price >= 0 ? price : 0;
};

export const calculateFinalPrice = (basePrice, offerPercent, offerActive = true, expiresAt, now = new Date()) => {
    const priceBeforeOffer = Number(basePrice);
    const discountPercent = Number(offerPercent);
    const expiry = expiresAt ? new Date(expiresAt) : null;
    const isLive = offerActive !== false &&
        Number.isFinite(discountPercent) &&
        discountPercent > 0 &&
        (!expiry || (!Number.isNaN(expiry.getTime()) && expiry > now));
    return isLive
        ? roundPrice(priceBeforeOffer * (100 - discountPercent) / 100)
        : priceBeforeOffer;
};

export const getProductFinalPrice = (product, now = new Date()) => (
    calculateFinalPrice(
        getProductBasePrice(product),
        product.additionalDiscountPercent,
        product.additionalOfferActive !== false,
        product.additionalOfferExpiresAt,
        now
    )
);

export const getProductAdditionalDiscountPercent = (product) => {
    const additionalDiscountPercent = Number(product.additionalDiscountPercent);
    return Number.isFinite(additionalDiscountPercent) && additionalDiscountPercent > 0
        ? additionalDiscountPercent
        : 0;
};

export const getProductRegularDiscountPercent = (product) => {
    const basePrice = getProductBasePrice(product);
    const originalPrice = Number(product.originalPrice);
    if (Number.isFinite(basePrice) && Number.isFinite(originalPrice) && originalPrice > basePrice && originalPrice > 0) {
        return (1 - basePrice / originalPrice) * 100;
    }
    const configuredDiscount = Number(product.discountPercent);
    return Number.isFinite(configuredDiscount) && configuredDiscount > 0 ? configuredDiscount : 0;
};

export const getProductDiscountPercent = (product) => {
    const price = getProductFinalPrice(product);
    const originalPrice = Number(product.originalPrice);
    if (Number.isFinite(price) && Number.isFinite(originalPrice) && originalPrice > price && originalPrice > 0) {
        return (1 - price / originalPrice) * 100;
    }
    return getProductRegularDiscountPercent(product);
};
