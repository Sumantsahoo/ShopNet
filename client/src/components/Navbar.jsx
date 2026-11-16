import React, { useContext, useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useSelector } from 'react-redux';
import "../styles/navbar.css";
import { AuthContext } from "../context/AuthContext";
import { useLanguage } from '../context/LanguageContext';
import { apiFetch } from '../utils/api';

const Navbar=()=>{
    const{user}=useContext(AuthContext);
    const { t } = useLanguage();
    const navigate=useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const [search, setSearch] = useState(searchParams.get('search') || '');
    const [deliveryAddress, setDeliveryAddress] = useState(null);
    const [deliveryAddressError, setDeliveryAddressError] = useState(false);
    const cartCount = useSelector((state) => state.cart.cartItems.reduce((total, item) => total + Number(item.qty || 0), 0));
    const isAdmin = user?.role === 'admin';
    useEffect(() => {
        setSearch(searchParams.get('search') || '');
    }, [searchParams]);
    useEffect(() => {
        if (!user?.token || isAdmin) {
            setDeliveryAddress(null);
            setDeliveryAddressError(false);
            return undefined;
        }
        let cancelled = false;
        const loadDeliveryAddress = async () => {
            try {
                const response = await apiFetch('/api/authorite/profile', {
                    headers: { Authorization: `Bearer ${user.token}` }
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.message || 'Could not load delivery address.');
                if (!cancelled) {
                    setDeliveryAddress(data.defaultAddress || null);
                    setDeliveryAddressError(false);
                }
            } catch (error) {
                if (!cancelled) {
                    console.error('Could not load delivery address:', error.message);
                    setDeliveryAddressError(true);
                }
            }
        };
        loadDeliveryAddress();
        return () => { cancelled = true; };
    }, [isAdmin, user?.token]);
    const isActive = (path) => location.pathname === path || (path === '/categories' && location.pathname.startsWith('/category/'));
    const submitSearch = (event) => {
        event.preventDefault();
        const query = search.trim();
        if (query) {
            try {
                const saved = JSON.parse(localStorage.getItem('shopnest-recent-searches') || '[]');
                const recent = [query, ...saved.filter((term) => term.toLowerCase() !== query.toLowerCase())].slice(0, 6);
                localStorage.setItem('shopnest-recent-searches', JSON.stringify(recent));
            } catch (error) {
                console.error('Could not save recent searches:', error);
            }
        }
        navigate(query ? `/shop?search=${encodeURIComponent(query)}` : '/shop');
    };
    return(
        <nav className="navbar">
             <div className="navbar-brand">
                <Link to="/">
                <img src="/logo.png" alt="ShopNest Logo" className="navbar-logo" />
                ShopNest</Link>
             </div>
        <form className="navbar-search" role="search" onSubmit={submitSearch}>
            {!isAdmin && (
                <div className="navbar-search-location">
                    <span>Deliver to <strong>{user?.name || 'your location'}</strong></span>
                    {deliveryAddress?.postalCode
                        ? <span>{deliveryAddress.district}, {deliveryAddress.state} {deliveryAddress.postalCode}</span>
                        : <Link to={user ? '/profile#address' : '/login'}>{deliveryAddressError ? 'Check delivery address' : 'Set delivery address'}</Link>}
                </div>
            )}
            <div className="navbar-search-control">
                <input aria-label="Search products" placeholder="Search products, brands and more" value={search} onChange={(event) => setSearch(event.target.value)} />
                <button type="submit" aria-label="Search">⌕</button>
            </div>
        </form>
        <ul className="navbar-links">
            <li><Link to='/'>Home</Link></li>
            <li><Link to='/categories'>Categories</Link></li>
            {!isAdmin && <li><Link to='/cart'>{t('cart')} {cartCount > 0 && <span className="navbar-cart-count">{cartCount}</span>}</Link></li>}
            {user ?(
                <>
                <li><Link to={isAdmin ? '/admin/profile' : '/profile'}>{t('profile')}</Link></li>
                {user.role !== 'admin' && <li><Link to='/orders'>{t('myOrders')}</Link></li>}
                {user.role === 'admin' && (
                    <>
                        <li><Link to='/admin'>{t('dashboard')}</Link></li>
                        <li><Link to='/admin/products/new'>{t('addProduct')}</Link></li>
                        <li><Link to='/admin/products/edit'>{t('editProducts')}</Link></li>
                        <li><Link to='/admin/users'>{t('customers')}</Link></li>
                        <li><Link to='/admin/orders'>{t('manageOrders')}</Link></li>
                    </>
                )}
                </>

            ):(
                <li><Link to='/login'>{t('login')}</Link></li>
            )
            }
            </ul>     
            <nav className="mobile-bottom-nav" aria-label="Main navigation">
                <Link className={isActive('/') ? 'is-active' : ''} to="/"><span aria-hidden="true">⌂</span>Home</Link>
                <Link className={isActive('/categories') ? 'is-active' : ''} to="/categories"><span aria-hidden="true">▦</span>Categories</Link>
                {!isAdmin && <Link className={isActive('/cart') ? 'is-active' : ''} to="/cart"><span aria-hidden="true">🛒</span>Cart{cartCount > 0 && <b>{cartCount}</b>}</Link>}
                <Link className={isActive('/profile') || (isAdmin && location.pathname === '/admin/profile') ? 'is-active' : ''} to={user ? (isAdmin ? '/admin/profile' : '/profile') : '/login'}><span aria-hidden="true">♙</span>Account</Link>
            </nav>
        </nav>     
    );
};
export default Navbar;