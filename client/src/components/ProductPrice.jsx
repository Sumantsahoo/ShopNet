import React from 'react';
import {
    getProductAdditionalDiscountPercent,
    getProductBasePrice,
    getProductFinalPrice,
    getProductRegularDiscountPercent,
    isProductOfferActive
} from '../utils/productPricing';
import '../styles/productPricing.css';

const formatPrice = (price) => `₹${Number(price || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
})}`;

const ProductPrice = ({ product, className = '' }) => {
    const regularPrice = getProductBasePrice(product);
    const finalPrice = getProductFinalPrice(product);
    const originalPrice = Number(product.originalPrice);
    const regularDiscount = Math.round(getProductRegularDiscountPercent(product));
    const offerPercent = getProductAdditionalDiscountPercent(product);
    const hasRegularDiscount = Number.isFinite(originalPrice) && originalPrice > regularPrice;
    const hasLiveOffer = isProductOfferActive(product);
    const crossedPrice = Number.isFinite(originalPrice) && originalPrice >= regularPrice && originalPrice > 0
        ? originalPrice
        : regularPrice;

    return (
        <div className={`product-price-breakdown ${className}`.trim()}>
            {(hasRegularDiscount || hasLiveOffer) && (
                <div className="product-price-regular">
                    <del>{formatPrice(crossedPrice)}</del>
                    {hasRegularDiscount && <span>Regular {regularDiscount}% off</span>}
                </div>
            )}
            {hasLiveOffer && (
                <>
                    <span className="product-price-base">Current selling price: {formatPrice(regularPrice)}</span>
                    <span className="product-extra-offer">Extra {offerPercent}% Off</span>
                </>
            )}
            <strong className="product-price-final">{formatPrice(finalPrice)}</strong>
        </div>
    );
};

export default ProductPrice;
