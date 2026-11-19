import React, { useEffect, useState } from 'react';
import {useSelector,useDispatch} from 'react-redux';
import {Link,useNavigate} from 'react-router-dom';
import {removeFromCart,setCheckoutItems,syncCartProducts,updateCartQuantity} from '../redux/cartSlice';
import { AuthContext } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { fetchCurrentProducts } from '../utils/cartPrices';
import { apiFetch } from '../utils/api';
import ProductPrice from '../components/ProductPrice';
import ProductCard from '../components/ProductCard';
import { getProductFinalPrice } from '../utils/productPricing';
import '../styles/cart.css';

const Cart = () => {
    const cartItems=useSelector((state)=>state.cart.cartItems);
    const checkoutItemIds=useSelector((state)=>state.cart.checkoutItemIds);
    const dispatch=useDispatch();
    const navigate=useNavigate();
    const { user } = React.useContext(AuthContext);
    const { t } = useLanguage();
    const [priceRefresh, setPriceRefresh] = useState({ loading: false, error: '' });
    const [refreshVersion, setRefreshVersion] = useState(0);
    const [cartRecommendations, setCartRecommendations] = useState([]);
    const [cartRecommendationError, setCartRecommendationError] = useState('');
    const cartProductIds = cartItems.map((item) => String(item._id || item.productId)).filter(Boolean).join(',');

    useEffect(() => {
        if (cartItems.length === 0) return undefined;
        let cancelled = false;
        const refreshPrices = async () => {
            setPriceRefresh({ loading: true, error: '' });
            try {
                const products = await fetchCurrentProducts();
                if (cancelled) return;
                dispatch(syncCartProducts(products));
                setPriceRefresh({ loading: false, error: '' });
            } catch (error) {
                console.error('Could not refresh cart prices:', error);
                if (!cancelled) setPriceRefresh({ loading: false, error: error.message || 'Could not refresh product prices.' });
            }
        };
        refreshPrices();
        return () => { cancelled = true; };
    }, [cartItems.length, dispatch, refreshVersion]);

    useEffect(() => {
        if (!cartProductIds) {
            setCartRecommendations([]);
            setCartRecommendationError('');
            return undefined;
        }
        let cancelled = false;
        const loadCartRecommendations = async () => {
            try {
                const response = await apiFetch(`/api/recommendations?cartProductIds=${encodeURIComponent(cartProductIds)}`, {
                    headers: user?.token ? { Authorization: `Bearer ${user.token}` } : {}
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.message || 'Could not load cart recommendations.');
                if (!cancelled) {
                    setCartRecommendations(Array.isArray(data.cartRecommendations) ? data.cartRecommendations : []);
                    setCartRecommendationError('');
                }
            } catch (error) {
                console.error('Could not load cart recommendations:', error);
                if (!cancelled) setCartRecommendationError(error.message || 'Could not load cart recommendations.');
            }
        };
        loadCartRecommendations();
        return () => { cancelled = true; };
    }, [cartProductIds, user?.token]);

    const handleRemove=(id)=>{
        dispatch(removeFromCart(id));
    };
    const handleUpdateQty=(item,qty)=>{
        dispatch(updateCartQuantity({id:item._id || item.productId,qty}));
    };
    const selectedItems=cartItems.filter((item)=>checkoutItemIds.some((id)=>String(id)===String(item._id || item.productId)));
    const selectedTotal=selectedItems.reduce((total,item)=>total+getProductFinalPrice(item)*Number(item.qty),0);
    const allSelected=cartItems.length>0 && selectedItems.length===cartItems.length;

    const toggleCheckoutItem=(itemId)=>{
        const isSelected=checkoutItemIds.some((id)=>String(id)===String(itemId));
        dispatch(setCheckoutItems(isSelected
            ? checkoutItemIds.filter((id)=>String(id)!==String(itemId))
            : [...checkoutItemIds,itemId]));
    };

    return(
        <div className='cart-container'>
            <h2>{t('shoppingCart')}</h2>
            {cartItems.length===0 ?(
                <section className="cart-empty-state">
                    <span aria-hidden="true">🛒</span>
                    <h3>{t('cartEmpty')}</h3>
                    <p>Your cart is waiting for something you love.</p>
                    <Link className="btn" to="/">{t('goShopping')}</Link>
                </section>
            ):
            (
                <div className='cart-layout'>
                    <div className='cart-items'>
                        <button
                            type="button"
                            className="cart-selection-toggle"
                            onClick={()=>dispatch(setCheckoutItems(allSelected ? [] : cartItems.map((item)=>item._id || item.productId)))}
                        >
                            {allSelected ? t('clearSelection') : t('selectAll')}
                        </button>
                        {priceRefresh.loading && <p className="cart-price-status" role="status">Refreshing current prices...</p>}
                        {priceRefresh.error && (
                            <p className="cart-price-status is-error" role="alert">
                                {priceRefresh.error} <button type="button" onClick={() => setRefreshVersion((version) => version + 1)}>Retry</button>
                            </p>
                        )}
                        {
                            cartItems.map((item)=>(
                                <div key={item._id || item.productId} className='cart-item'>
                                    <label className="cart-select-item">
                                        <input
                                            type="checkbox"
                                            checked={checkoutItemIds.some((id)=>String(id)===String(item._id || item.productId))}
                                            onChange={()=>toggleCheckoutItem(item._id || item.productId)}
                                            aria-label={`Select ${item.name} for checkout`}
                                        />
                                    </label>
                                    <img src={item.imageUrl} alt={item.name} className='cart-item-image'/>
                                    <div className='cart-item-details'>
                                        <h4>{item.name}</h4>
                                        <ProductPrice product={item} className="is-compact" />
                                        <div className='qty-controls'>
                                            <button aria-label={`Decrease ${item.name} quantity`} onClick={()=> handleUpdateQty(item,item.qty-1)}>-</button>
                                            <span>{item.qty}</span>
                                            <button aria-label={`Increase ${item.name} quantity`} onClick={()=> handleUpdateQty(item,item.qty+1)}>+</button>
                                        </div>
                                        <button onClick={()=> handleRemove(item._id || item.productId)} className='btn-remove'>{t('remove')}</button>
                                    </div>
                                </div>
                            ))
                        }
                        <div className='cart-summary'>
                            <div>
                                <p>{t('selectedItems').replace('{count}', String(selectedItems.length))}</p>
                                <h3>{t('selectedSubtotal')}: ₹{selectedTotal.toFixed(2)}</h3>
                            </div>
                            <button onClick={()=>navigate('/checkout')} className='btn btn-checkout' disabled={selectedItems.length===0 || priceRefresh.loading || Boolean(priceRefresh.error)}>{t('buySelectedItems')}</button>
                        </div>
                    </div>
                </div>
            )}
            {cartItems.length > 0 && cartRecommendationError && (
                <p className="cart-price-status" role="status">{cartRecommendationError}</p>
            )}
            {cartItems.length > 0 && cartRecommendations.length > 0 && (
                <section className="cart-recommendations discovery-section" aria-labelledby="cart-recommendations-title">
                    <header>
                        <div><span>BASED ON YOUR CART AND RECENT INTERESTS</span><h2 id="cart-recommendations-title">You may need these too</h2></div>
                        <Link to="/shop">Explore more →</Link>
                    </header>
                    <div className="product-grid">
                        {cartRecommendations.map((product) => <ProductCard key={product._id} product={product} />)}
                    </div>
                </section>
            )}
        </div>
    )
};
export default Cart;
