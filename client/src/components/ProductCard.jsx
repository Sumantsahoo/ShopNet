import React from "react";
import {Link} from "react-router-dom";
import { useLanguage } from '../context/LanguageContext';
import WishlistButton from './WishlistButton';
import '../styles/productCard.css';
const FALLBACK_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect width='100%25' height='100%25' fill='%2327272a'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23a1a1aa' font-family='sans-serif' font-size='16'%3ENo Image Available%3C/text%3E%3C/svg%3E";

const ProductCard= ({product})=>{
    const price=Number(product.price);
    const { t } = useLanguage();

    return (
        <div className="product-card">
               <WishlistButton product={product} compact />
             <img 
                src={product.imageUrl || FALLBACK_IMAGE} 
                alt={product.name} 
                className='product-image'
                onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = FALLBACK_IMAGE;
                }}
             />
             <div className="product-info">
                <h3 className='product-name'>{product.name}</h3>
                <p className='product-price'>₹{price.toFixed(2)}</p>
                <Link to={`/products/${product._id}`} className='view-details-button'>{t('viewDetails')}</Link>
             </div>
        </div>
    )
};
export default ProductCard;

