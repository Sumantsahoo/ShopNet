import React, { useContext, useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useSelector } from 'react-redux';
import "../styles/navbar.css";
import { AuthContext } from "../context/AuthContext";
import { useLanguage } from '../context/LanguageContext';
import { apiFetch } from '../utils/api';
import { recordLocalSearch } from '../utils/searchHistory';

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
    const isEmployee = user?.role === 'employee';
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
    }, [isAdmin, isEmployee, user?.token]);
    const isActive = (path) => location.pathname === path || (path === '/categories' && location.pathname.startsWith('/category/'));
    const submitSearch = async (event) => {
        event.preventDefault();
        const query = search.trim();
        if (query && !user?.token) {
            try {
                recordLocalSearch(query);
            } catch (error) {
                console.error('Could not save recent searches:', error);
            }
        }
        if (query && user?.token && !isAdmin) {
            try {
                const response = await apiFetch('/api/authorite/history/searches', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${user.token}`
                    },
                    body: JSON.stringify({ term: query })
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.message || 'Could not save recent search.');
            } catch (error) {
                console.error('Could not save account search history:', error);
            }
        }
        navigate(query ? `/search?search=${encodeURIComponent(query)}` : '/search');
    };
    const adminMenuItems = [
        { to: '/admin', label: t('dashboard') },
        { to: '/admin/products/new', label: t('addProduct') },
        { to: '/admin/products/edit', label: t('editProducts') },
        { to: '/admin/storefront', label: 'Edit front page' },
        { to: '/admin/homepage-sections', label: 'Homepage sections' },
        { to: '/admin/picked-for-you', label: 'Picked for You products' },
        { to: '/admin/seasonal-deals', label: 'Seasonal deals' },
        { to: '/admin/users', label: t('customers') },
        { to: '/admin/employees', label: 'Employees' },
        { to: '/admin/orders', label: t('manageOrders') },
        { to: '/admin/profile', label: 'Admin profile' }
    ];
    const employeeMenuItems = [
        { to: '/admin/products/new', label: 'Add product' },
        { to: '/admin/products/edit', label: 'Edit products' },
        { to: '/admin/users', label: t('customers') },
        { to: '/admin/orders', label: 'Manage orders' },
        { to: '/admin/homepage-sections', label: 'Still Looking & homepage products' },
        { to: '/admin/picked-for-you', label: 'Picked for You' }
    ];
    const closeAdminMenu = (event) => {
        const menu = event.currentTarget.closest('details');
        if (menu) menu.open = false;
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
            {!isAdmin && <li><Link to='/categories'>Categories</Link></li>}
            {!isAdmin && <li><Link to='/cart'>{t('cart')} {cartCount > 0 && <span className="navbar-cart-count">{cartCount}</span>}</Link></li>}
            {isAdmin ? (
                <>
                    <li className="navbar-admin-menu">
                        <details>
                            <summary>Admin menu</summary>
                            <div className="navbar-admin-menu-panel">
                                {adminMenuItems.map((item) => <Link key={item.to} to={item.to} onClick={closeAdminMenu}>{item.label}</Link>)}
                            </div>
                        </details>
                    </li>
                    <li><Link to="/admin/profile">{t('profile')}</Link></li>
                </>
            ) : user ? (
                <>
                    <li><Link to="/profile">{t('profile')}</Link></li>
                    <li><Link to='/orders'>{t('myOrders')}</Link></li>
                    {isEmployee && <li><Link to="/employee/workspace">{user.employeePosition || 'Attendance'}</Link></li>}
                    {isEmployee && (
                        <li className="navbar-admin-menu">
                            <details>
                                <summary>Manage</summary>
                                <div className="navbar-admin-menu-panel">
                                    {employeeMenuItems.map((item) => <Link key={item.to} to={item.to} onClick={closeAdminMenu}>{item.label}</Link>)}
                                </div>
                            </details>
                        </li>
                    )}
                </>
            ) : <li><Link to='/login'>{t('login')}</Link></li>}
        </ul>
        <nav className={`mobile-bottom-nav${isAdmin ? ' is-admin' : ''}`} aria-label="Main navigation">
            {isAdmin ? (
                <>
                    <Link className={isActive('/') ? 'is-active' : ''} to="/"><span aria-hidden="true">⌂</span>Home</Link>
                    <details className="mobile-admin-menu">
                        <summary><span aria-hidden="true">☰</span>Manage</summary>
                        <div className="mobile-admin-menu-panel">
                            {adminMenuItems.map((item) => <Link key={item.to} to={item.to} onClick={closeAdminMenu}>{item.label}</Link>)}
                        </div>
                    </details>
                    <Link className={location.pathname === '/admin/profile' ? 'is-active' : ''} to="/admin/profile"><span aria-hidden="true">♙</span>Account</Link>
                </>
            ) : (
                <>
                    <Link className={isActive('/') ? 'is-active' : ''} to="/"><span aria-hidden="true">⌂</span>Home</Link>
                    <Link className={isActive('/categories') ? 'is-active' : ''} to="/categories"><span aria-hidden="true">▦</span>Categories</Link>
                    <Link className={isActive('/cart') ? 'is-active' : ''} to="/cart"><span aria-hidden="true">🛒</span>Cart{cartCount > 0 && <b>{cartCount}</b>}</Link>
                    {isEmployee && <Link className={location.pathname === '/employee/workspace' ? 'is-active' : ''} to="/employee/workspace"><span aria-hidden="true">◷</span>Work</Link>}
                    {isEmployee && (
                        <details className="mobile-admin-menu">
                            <summary><span aria-hidden="true">☰</span>Manage</summary>
                            <div className="mobile-admin-menu-panel">
                                {employeeMenuItems.map((item) => <Link key={item.to} to={item.to} onClick={closeAdminMenu}>{item.label}</Link>)}
                            </div>
                        </details>
                    )}
                    <Link className={isActive('/profile') ? 'is-active' : ''} to={user ? '/profile' : '/login'}><span aria-hidden="true">♙</span>Account</Link>
                </>
            )}
        </nav>
        </nav>     
    );
};
export default Navbar;