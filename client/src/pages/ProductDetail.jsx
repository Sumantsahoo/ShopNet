import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { addToCart } from '../redux/cartSlice';
import { useLanguage } from '../context/LanguageContext';
import WishlistButton from '../components/WishlistButton';
import '../styles/product.css';

const FALLBACK_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='400' viewBox='0 0 600 400'%3E%3Crect width='100%25' height='100%25' fill='%2327272a'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23a1a1aa' font-family='sans-serif' font-size='20'%3ENo Image Available%3C/text%3E%3C/svg%3E";

const ProductDetail = () => {
    const { id } = useParams();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [cartMessage, setCartMessage] = useState('');
    const dispatch = useDispatch();
    const { t } = useLanguage();

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                const res = await fetch(`/api/products/${id}`);
                const data = await res.json();
                setProduct(data);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        fetchProduct();
    }, [id]);

    const handleAddToCart = () => {
        if (product) {
            dispatch(addToCart({
                _id: product._id,
                name: product.name,
                price: product.price,
                imageUrl: product.imageUrl,
                qty: 1
            }));
            setCartMessage(t('addedToCart'));
        }
    };

    if (loading) return <div style={{ textAlign: 'center', margin: '10px', color: '#f97316' }}>Loading Product...</div>;
    if (!product) return <div style={{ textAlign: 'center', margin: '100px', color: '#ef4444' }}>Product Not Found</div>;

    return (
        <div className="product-detail-wrapper" style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
            <div style={{ color: '#a1a1aa', marginBottom: '20px', fontSize: '0.95rem' }}>
                <Link to='/' style={{ color: '#f97316' }}>Home</Link> / <Link to='/shop' style={{ color: '#f97316' }}>Shop</Link> / {product.category} / <span style={{ color: '#fff' }}>{product.name}</span>
            </div>

            <div className='product-detail'>
                <div className='detail-image-container'>
                    <img 
                        src={product.imageUrl || FALLBACK_IMAGE} 
                        alt={product.name} 
                        className='detail-image'
                        onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = FALLBACK_IMAGE;
                        }} 
                    />
                </div>

                <div className='detail-info'>
                    <h2 style={{ fontSize: '2.8rem', marginBottom: '10px' }}>{product.name}</h2>
                    <p className='detail-price' style={{ fontSize: '2.5rem', margin: '15px 0' }}>₹{product.price.toFixed(2)}</p>

                    <div style={{ marginBottom: '25px' }}>
                        <h4 style={{ color: '#fff', marginBottom: '10px' }}>{t('productDescription')}</h4>
                        <p style={{ color: '#a1a1aa', lineHeight: '1.8' }}>{product.description}</p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <button onClick={handleAddToCart} className='btn' style={{ flexGrow: '1', padding: '18px', fontSize: '1.5rem' }}>
                            {t('addToCart')}
                        </button>
                        <WishlistButton product={product} />
                    </div>
                    {cartMessage && <p className="cart-feedback" role="status">{cartMessage}</p>}

                    <p style={{ marginTop: '20px', color: product.stock > 0 ? '#10b981' : '#ef4444', fontWeight: '600' }}>
                        {product.stock > 0 ? `${t('inStock')} (${product.stock} ${t('unitsAvailable')})` : t('outOfStock')}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ProductDetail;