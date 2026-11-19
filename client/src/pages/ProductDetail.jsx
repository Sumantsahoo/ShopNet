import React, { useContext, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { addToCart } from '../redux/cartSlice';
import { AuthContext } from '../context/AuthContext';
import WishlistButton from '../components/WishlistButton';
import ProductCard from '../components/ProductCard';
import ProductPrice from '../components/ProductPrice';
import { useLanguage } from '../context/LanguageContext';
import { apiFetch } from '../utils/api';
import { getCategorySlug } from '../utils/categories';
import { readProductCache, saveProductCache } from '../utils/productCache';
import { saveRecentProduct } from '../utils/recentProducts';
import { getProductBasePrice, isProductOfferActive } from '../utils/productPricing';
import '../styles/product.css';

const FALLBACK_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='400' viewBox='0 0 600 400'%3E%3Crect width='100%25' height='100%25' fill='%2327272a'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23a1a1aa' font-family='sans-serif' font-size='20'%3ENo Image Available%3C/text%3E%3C/svg%3E";

const ProductDetail = () => {
    const { id } = useParams();
    const location = useLocation();
    const { user } = useContext(AuthContext);
    const [product, setProduct] = useState(() => readProductCache()?.find((item) => String(item._id) === String(id)) || null);
    const [relatedProducts, setRelatedProducts] = useState([]);
    const [loading, setLoading] = useState(() => !readProductCache()?.some((item) => String(item._id) === String(id)));
    const [error, setError] = useState('');
    const [relatedError, setRelatedError] = useState('');
    const [cartMessage, setCartMessage] = useState('');
    const [cartHistoryError, setCartHistoryError] = useState('');
    const [shareMessage, setShareMessage] = useState('');
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');
    const [reviewMessage, setReviewMessage] = useState('');
    const [reviewError, setReviewError] = useState(false);
    const [reviewSubmitting, setReviewSubmitting] = useState(false);
    const [canReview, setCanReview] = useState(false);
    const [reviewEligibilityError, setReviewEligibilityError] = useState('');
    const dispatch = useDispatch();
    const { t } = useLanguage();

    useEffect(() => {
        let cancelled = false;
        const cachedProduct = readProductCache()?.find((item) => String(item._id) === String(id)) || null;
        setProduct(cachedProduct);
        setLoading(!cachedProduct);
        setError('');
        const fetchProduct = async () => {
            try {
                const productResponse = await apiFetch(`/api/products/${id}`);
                const data = await productResponse.json();
                if (!productResponse.ok) throw new Error(data.message || 'Could not load this product.');
                if (cancelled) return;
                setProduct(data);
                saveRecentProduct(String(data._id));
                if (user?.token && user.role !== 'admin') {
                    apiFetch(`/api/authorite/history/products/${data._id}`, {
                        method: 'POST',
                        headers: { Authorization: `Bearer ${user.token}` }
                    }).then(async (historyResponse) => {
                        const historyData = await historyResponse.json();
                        if (!historyResponse.ok) throw new Error(historyData.message || 'Could not save product history.');
                    }).catch((historyError) => {
                        console.error('Could not save account product history:', historyError);
                    });
                }
                const cachedProducts = readProductCache() || [];
                saveProductCache([
                    data,
                    ...cachedProducts.filter((item) => String(item._id) !== String(data._id))
                ]);
                try {
                    const recommendationsResponse = await apiFetch(`/api/recommendations?productId=${encodeURIComponent(id)}`, {
                        headers: user?.token ? { Authorization: `Bearer ${user.token}` } : {}
                    });
                    const recommendationData = await recommendationsResponse.json();
                    if (!recommendationsResponse.ok) throw new Error(recommendationData.message || 'Could not load similar products.');
                    if (!cancelled) {
                        setRelatedProducts(Array.isArray(recommendationData.similarProducts) ? recommendationData.similarProducts : []);
                        setRelatedError('');
                    }
                } catch (recommendationError) {
                    console.error('Could not load similar products:', recommendationError);
                    if (!cancelled) setRelatedError(recommendationError.message || 'Could not load similar products.');
                }
                if (user?.token) {
                    try {
                        const ordersResponse = await apiFetch('/api/orders/myorders', {
                            headers: { Authorization: `Bearer ${user.token}` }
                        });
                        const orders = await ordersResponse.json();
                        if (!ordersResponse.ok) throw new Error(orders.message || 'Could not check delivery eligibility.');
                        if (!cancelled) {
                            setCanReview(orders.some((order) => order.status === 'delivered' && order.orderItems.some((item) => String(item.product?._id || item.product) === String(data._id))));
                            setReviewEligibilityError('');
                        }
                    } catch (eligibilityError) {
                        if (!cancelled) setReviewEligibilityError(eligibilityError.message || 'Could not check whether this order was delivered.');
                    }
                } else {
                    setCanReview(false);
                }
            } catch (fetchError) {
                if (!cancelled) setError(fetchError.message || 'Could not load this product.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        fetchProduct();
        return () => { cancelled = true; };
    }, [id, user?.role, user?.token]);

    useEffect(() => {
        if (!loading && location.hash === '#product-reviews') {
            document.getElementById('product-reviews')?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [loading, location.hash]);

    const averageRating = useMemo(() => Number(product?.rating || 0).toFixed(1), [product]);

    const handleAddToCart = () => {
        if (!product) return;
        dispatch(addToCart({
            _id: product._id,
            name: product.name,
            price: product.price,
            imageUrl: product.imageUrl,
            originalPrice: product.originalPrice,
            basePrice: getProductBasePrice(product),
            discountPercent: product.discountPercent,
            additionalDiscountPercent: product.additionalDiscountPercent,
            additionalOfferActive: product.additionalOfferActive,
            additionalOfferExpiresAt: product.additionalOfferExpiresAt,
            brand: product.brand,
            stock: product.stock,
            qty: 1
        }));
        setCartMessage(t('addedToCart'));
        setCartHistoryError('');
        if (user?.token && user.role !== 'admin') {
            apiFetch(`/api/authorite/history/cart/${product._id}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${user.token}` }
            }).then(async (response) => {
                const data = await response.json();
                if (!response.ok) throw new Error(data.message || 'Could not save your cart activity.');
            }).catch((historyError) => {
                console.error('Could not save account cart activity:', historyError);
                setCartHistoryError('Your item was added, but could not be saved for personalized recommendations.');
            });
        }
    };

    const handleShare = async () => {
        setShareMessage('');
        try {
            if (navigator.share) {
                await navigator.share({ title: product.name, text: product.description, url: window.location.href });
            } else if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(window.location.href);
                setShareMessage('Product link copied.');
            } else {
                throw new Error('Sharing is not supported on this browser.');
            }
        } catch (shareError) {
            if (shareError.name !== 'AbortError') setShareMessage(shareError.message || 'Could not share this product.');
        }
    };

    const submitReview = async (event) => {
        event.preventDefault();
        if (!user?.token) {
            setReviewError(true);
            setReviewMessage('Please sign in to leave a review.');
            return;
        }
        setReviewSubmitting(true);
        setReviewError(false);
        setReviewMessage('');
        try {
            const response = await apiFetch(`/api/products/${id}/reviews`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${user.token}`
                },
                body: JSON.stringify({ rating, comment })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Could not save your review.');
            setProduct(data.product);
            setComment('');
            setReviewMessage(data.message);
        } catch (submitError) {
            setReviewError(true);
            setReviewMessage(submitError.message || 'Could not save your review.');
        } finally {
            setReviewSubmitting(false);
        }
    };

    if (loading && !product) {
        return (
            <main className="product-detail-page product-detail-image-fallback">
                <img src="/logo.png" alt="ShopNest" />
            </main>
        );
    }
    if (!product) return <main className="product-detail-page"><p className="product-page-error" role="alert">{error || 'Product not found.'}</p><Link to="/shop">Browse products</Link></main>;

    const hasDiscount = Number(product.originalPrice) > getProductBasePrice(product);

    return (
        <main className="product-detail-page">
            {error && <p className="product-page-error" role="status">Could not refresh this product. Showing saved product information.</p>}
            <nav className="product-breadcrumbs" aria-label="Breadcrumb">
                <Link to="/">Home</Link><span>/</span><Link to={`/category/${getCategorySlug(product.category)}`}>{product.category}</Link><span>/</span><span>{product.name}</span>
            </nav>

            <section className="product-detail">
                <div className="detail-image-container">
                    <img
                        src={product.imageUrl || FALLBACK_IMAGE}
                        alt={product.name}
                        className="detail-image"
                        onError={(event) => {
                            event.currentTarget.onerror = null;
                            event.currentTarget.src = FALLBACK_IMAGE;
                        }}
                    />
                </div>
                <div className="detail-info">
                    <div className="product-detail-actions">
                        <WishlistButton product={product} />
                        <button className="product-share-button" type="button" onClick={handleShare}>↗ <span>Share</span></button>
                    </div>
                    <p className="product-detail-category">{product.category}</p>
                    <h1>{product.name}</h1>
                    <a className="product-rating-link" href="#product-reviews">
                        <span>★ {averageRating}</span> · {Number(product.numReviews || 0)} ratings and reviews
                    </a>
                    <div className="detail-price-row">
                        <ProductPrice product={product} className="is-detail" />
                    </div>
                    <p className="product-offer-note">{hasDiscount || isProductOfferActive(product) ? 'Special price available while stocks last.' : 'Secure payment options available at checkout.'}</p>

                    <section className="product-delivery-card">
                        <strong>Delivery</strong>
                        <p>Check delivery options and add or update your address at checkout.</p>
                        <Link to="/profile#address">Manage saved address</Link>
                    </section>

                    <section className="product-description">
                        <h2>About this product</h2>
                        <p>{product.description}</p>
                    </section>

                    <p className={`product-stock ${product.stock > 0 ? 'is-available' : 'is-unavailable'}`}>
                        {product.stock > 0 ? `${t('inStock')} (${product.stock} ${t('unitsAvailable')})` : t('outOfStock')}
                    </p>
                    {shareMessage && <p className="product-share-feedback" role="status">{shareMessage}</p>}
                </div>
            </section>

            {relatedProducts.length > 0 && (
                <section className="related-products">
                    <h2>Similar products</h2>
                    <div className="product-grid">
                        {relatedProducts.map((item) => <ProductCard key={item._id} product={item} />)}
                    </div>
                </section>
            )}
            {relatedError && <p className="product-page-error" role="status">{relatedError}</p>}

            <section className="product-bottom-actions">
                <div>
                    <strong>{product.name}</strong>
                    <ProductPrice product={product} className="is-compact" />
                </div>
                <button onClick={handleAddToCart} className="btn" disabled={product.stock < 1}>{t('addToCart')}</button>
                <Link className="product-cart-link" to="/cart">Go to cart</Link>
                {cartMessage && <p className="cart-feedback" role="status">{cartMessage}</p>}
                {cartHistoryError && <p className="cart-feedback is-error" role="status">{cartHistoryError}</p>}
            </section>

            <section className="product-reviews" id="product-reviews">
                <header>
                    <div><span>CUSTOMER FEEDBACK</span><h2>Ratings & reviews</h2></div>
                    <strong>★ {averageRating} <small>({Number(product.numReviews || 0)})</small></strong>
                </header>
                {user?.token && canReview && <form className="product-review-form" onSubmit={submitReview}>
                    <label htmlFor="product-rating">Your rating</label>
                    <div className="review-stars" role="radiogroup" aria-label="Choose a star rating">
                        {[1, 2, 3, 4, 5].map((value) => (
                            <button
                                aria-label={`${value} star${value === 1 ? '' : 's'}`}
                                aria-checked={rating === value}
                                className={rating >= value ? 'is-selected' : ''}
                                key={value}
                                onClick={() => setRating(value)}
                                role="radio"
                                type="button"
                            >★</button>
                        ))}
                    </div>
                    <label htmlFor="product-review-comment">Write your review</label>
                    <textarea id="product-review-comment" value={comment} onChange={(event) => setComment(event.target.value)} minLength={3} maxLength={1000} placeholder="What did you think of this product?" required />
                    {reviewMessage && <p className={reviewError ? 'product-review-message is-error' : 'product-review-message'} role={reviewError ? 'alert' : 'status'}>{reviewMessage}</p>}
                    <button className="btn" type="submit" disabled={reviewSubmitting}>{reviewSubmitting ? 'Saving review...' : 'Submit review'}</button>
                </form>}
                {!user?.token && <p className="no-product-reviews"><Link to="/login">Sign in</Link> and come back after delivery to write a review.</p>}
                {user?.token && !canReview && (
                    <p className="no-product-reviews" role={reviewEligibilityError ? 'alert' : 'status'}>
                        {reviewEligibilityError || 'You can rate and review this product after your order is delivered.'}
                    </p>
                )}
                <div className="product-review-list">
                    {product.reviews?.length ? product.reviews.slice().reverse().map((review, index) => (
                        <article key={`${review.user}-${index}`}>
                            <div><strong>{review.name}</strong><span>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span></div>
                            <p>{review.comment}</p>
                            <time dateTime={review.createdAt}>{new Date(review.createdAt).toLocaleDateString()}</time>
                        </article>
                    )) : <p className="no-product-reviews">No reviews yet. Be the first to share your experience.</p>}
                </div>
            </section>
        </main>
    );
};

export default ProductDetail;
