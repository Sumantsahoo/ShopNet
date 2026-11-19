import React, { useState } from "react";
import {Link} from "react-router-dom";
import { useLanguage } from '../context/LanguageContext';
import WishlistButton from './WishlistButton';
import ProductPrice from './ProductPrice';
import { getCategoryIcon, getCategorySlug } from '../utils/categories';
import { getProductImageUrl } from '../utils/productImage';
import { getProductAdditionalDiscountPercent, getProductBasePrice, getProductRegularDiscountPercent, isProductOfferActive } from '../utils/productPricing';
import '../styles/productCard.css';

const ProductCard= ({product, hideWishlist = false})=>{
    const regularPrice = getProductBasePrice(product);
    const originalPrice = Number(product.originalPrice);
    const discountPercent = Math.round(getProductRegularDiscountPercent(product));
    const hasDiscount = discountPercent > 0 && Number.isFinite(originalPrice) && originalPrice > regularPrice;
    const hasVisibleOffer = hasDiscount || isProductOfferActive(product);
    const imageUrl = getProductImageUrl(product.imageUrl);
    const [failedImageUrl, setFailedImageUrl] = useState('');
    const imageUnavailable = !imageUrl || failedImageUrl === imageUrl;
    const { t } = useLanguage();

    return (
        <div className="product-card">
               {!hideWishlist && <WishlistButton product={product} compact />}
             <Link to={`/products/${product._id}`} className="product-card-image-link" aria-label={`View ${product.name}`}>
                {hasVisibleOffer && (
                    <span className="product-discount-badge">{hasDiscount ? `${discountPercent}% OFF` : `Extra ${getProductAdditionalDiscountPercent(product)}% OFF`}</span>
                )}
                {imageUnavailable ? (
                    <div className="product-image-fallback" role="img" aria-label={`${product.name} image unavailable`}>
                        <span aria-hidden="true">{getCategoryIcon(product.category)}</span>
                        <strong>{product.name}</strong>
                    </div>
                ) : (
                    <img
                        src={imageUrl}
                        alt={product.name}
                        className='product-image'
                        loading="lazy"
                        decoding="async"
                        onError={() => setFailedImageUrl(imageUrl)}
                    />
                )}
             </Link>
             <div className="product-info">
                {product.category && (
                    <Link className="product-category-link" to={`/category/${getCategorySlug(product.category)}`}>
                        {product.category}
                    </Link>
                )}
                {product.brand && <p className="product-brand">{product.brand}</p>}
                <h3 className='product-name'><Link to={`/products/${product._id}`}>{product.name}</Link></h3>
                <div className="product-card-rating" aria-label={`${Number(product.rating || 0).toFixed(1)} out of 5 stars`}>
                    <span>★ {Number(product.rating || 0).toFixed(1)}</span>
                    <small>({Number(product.numReviews || 0)})</small>
                </div>
                <div className='product-price'>
                    <ProductPrice product={product} className="is-compact" />
                </div>
                <Link to={`/products/${product._id}`} className='view-details-button'>{t('viewDetails')}</Link>
             </div>
        </div>
    )
};
export default ProductCard;

