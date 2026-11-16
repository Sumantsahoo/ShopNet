import React, { useContext, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { LANGUAGE_OPTIONS, useLanguage } from '../context/LanguageContext';
import { apiFetch } from '../utils/api';
import '../styles/profile.css';
import './admin.css';

const AdminProfile = () => {
    const { user, logout, updateUser } = useContext(AuthContext);
    const navigate = useNavigate();
    const { language, setLanguage, t } = useLanguage();
    const [profileName, setProfileName] = useState(user?.name || '');
    const [editingProfile, setEditingProfile] = useState(false);
    const [profileSaving, setProfileSaving] = useState(false);
    const [profileMessage, setProfileMessage] = useState('');
    const [profileError, setProfileError] = useState(false);
    const [theme, setTheme] = useState(() => localStorage.getItem('shopnest-theme') === 'light' ? 'light' : 'dark');
    const [notifications, setNotifications] = useState(() => {
        try {
            const saved = JSON.parse(localStorage.getItem('shopnest-notifications') || '{}');
            return { orderUpdates: saved.orderUpdates !== false, offers: saved.offers === true };
        } catch (error) {
            console.error('Could not load notification preferences:', error);
            return { orderUpdates: true, offers: false };
        }
    });
    const [overview, setOverview] = useState(null);
    const [lowStockProducts, setLowStockProducts] = useState([]);
    const [overviewError, setOverviewError] = useState('');
    const [overviewLoading, setOverviewLoading] = useState(true);

    useEffect(() => {
        if (!user?.token || user.role !== 'admin') return undefined;
        let cancelled = false;
        const loadOverview = async () => {
            try {
                const headers = { Authorization: `Bearer ${user.token}` };
                const [statsResponse, productsResponse] = await Promise.all([
                    apiFetch('/api/analytics', { headers }),
                    apiFetch('/api/products', { headers })
                ]);
                const [stats, products] = await Promise.all([statsResponse.json(), productsResponse.json()]);
                if (!statsResponse.ok) throw new Error(stats.message || 'Could not load store performance.');
                if (!productsResponse.ok) throw new Error(products.message || 'Could not load inventory.');
                if (cancelled) return;
                setOverview(stats);
                setLowStockProducts(Array.isArray(products) ? products.filter((product) => Number(product.stock) <= 5) : []);
            } catch (error) {
                if (!cancelled) setOverviewError(error.message || 'Could not load admin overview.');
            } finally {
                if (!cancelled) setOverviewLoading(false);
            }
        };
        loadOverview();
        return () => { cancelled = true; };
    }, [user?.role, user?.token]);

    if (!user) {
        navigate('/login');
        return null;
    }

    if (user.role !== 'admin') {
        return <main className="admin-page"><p className="admin-alert">Admin access required.</p></main>;
    }

    const saveProfile = async (event) => {
        event.preventDefault();
        setProfileSaving(true);
        setProfileError(false);
        setProfileMessage('');
        try {
            const response = await apiFetch('/api/authorite/profile/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` },
                body: JSON.stringify({ name: profileName })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Could not update your profile.');
            setProfileName(data.name);
            updateUser({ name: data.name });
            setEditingProfile(false);
            setProfileMessage(data.message || 'Profile updated.');
        } catch (error) {
            setProfileError(true);
            setProfileMessage(error.message || 'Could not update your profile.');
        } finally {
            setProfileSaving(false);
        }
    };

    const changeTheme = (nextTheme) => {
        setTheme(nextTheme);
        localStorage.setItem('shopnest-theme', nextTheme);
        document.documentElement.dataset.theme = nextTheme;
    };

    const changeNotification = (key, enabled) => {
        const nextPreferences = { ...notifications, [key]: enabled };
        setNotifications(nextPreferences);
        localStorage.setItem('shopnest-notifications', JSON.stringify(nextPreferences));
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <main className="profile-page admin-profile">
            <header className="profile-heading">
                <div>
                    <span>SHOPNEST ADMIN</span>
                    <h1>Admin profile</h1>
                    <p>Manage your account and keep track of store operations.</p>
                </div>
                <Link to="/faq" className="profile-help-link"><span aria-hidden="true">?</span> Help</Link>
            </header>

            <section className="profile-card">
                <div className="profile-avatar" aria-hidden="true">
                    {(user.name || user.email || 'A').trim().charAt(0).toUpperCase()}
                </div>
                <div className="profile-identity">
                    <h2>{user.name || 'ShopNest administrator'}</h2>
                    <p>{user.email}</p>
                    <span className="profile-role">Administrator</span>
                </div>
                <button className="profile-address-edit profile-edit-name" type="button" onClick={() => setEditingProfile((current) => !current)}>
                    {editingProfile ? 'Cancel' : 'Edit profile'}
                </button>
            </section>
            {editingProfile && (
                <form className="profile-edit-form" onSubmit={saveProfile}>
                    <label htmlFor="admin-profile-name">Full name</label>
                    <input id="admin-profile-name" minLength={2} maxLength={80} required value={profileName} onChange={(event) => setProfileName(event.target.value)} />
                    <button className="profile-address-save" type="submit" disabled={profileSaving}>{profileSaving ? 'Saving...' : 'Save profile'}</button>
                </form>
            )}
            {profileMessage && <p className={profileError ? 'profile-address-status is-error' : 'profile-address-status'} role={profileError ? 'alert' : 'status'}>{profileMessage}</p>}

            <section className="admin-profile-overview" aria-labelledby="admin-overview-title">
                <div className="profile-section-heading">
                    <span>STORE OPERATIONS</span>
                    <h2 id="admin-overview-title">Your store at a glance</h2>
                </div>
                {overviewLoading && <p className="admin-status">Loading store overview...</p>}
                {overviewError && <p className="admin-alert" role="alert">{overviewError}</p>}
                {overview && (
                    <div className="admin-stats">
                        <article><span>Customers</span><strong>{overview.totalUsers}</strong></article>
                        <article><span>Products</span><strong>{overview.totalProducts}</strong></article>
                        <article><span>Orders</span><strong>{overview.totalOrders}</strong></article>
                        <article><span>Paid orders</span><strong>{overview.totalPaidOrders}</strong></article>
                        <article><span>Revenue</span><strong>₹{Number(overview.totalRevenue || 0).toLocaleString('en-IN')}</strong></article>
                        <article className={lowStockProducts.length ? 'admin-inventory-warning' : 'admin-inventory-ok'}>
                            <span>Low inventory (5 or less)</span>
                            <strong>{lowStockProducts.length}</strong>
                            <Link to="/admin/products/edit">Review inventory</Link>
                        </article>
                    </div>
                )}
                {!overviewLoading && !overviewError && lowStockProducts.length > 0 && (
                    <div className="admin-low-stock-list">
                        <h3>Products to restock</h3>
                        {lowStockProducts.slice(0, 4).map((product) => (
                            <div key={product._id}>
                                <span>{product.name}</span>
                                <strong>{Number(product.stock) <= 0 ? 'Out of stock' : `${product.stock} left`}</strong>
                            </div>
                        ))}
                        {lowStockProducts.length > 4 && <Link to="/admin/products/edit">See all {lowStockProducts.length} low-stock products</Link>}
                    </div>
                )}
            </section>

            <nav className="admin-profile-shortcuts" aria-label="Admin tools">
                <Link to="/admin">Dashboard <span>View store performance</span></Link>
                <Link to="/admin/products/new">Add product <span>Create a catalog listing</span></Link>
                <Link to="/admin/products/edit">Manage products <span>Edit prices, details, and stock</span></Link>
                <Link to="/admin/orders">Manage orders <span>Update order fulfillment status</span></Link>
                <Link to="/admin/users">Customers <span>View registered customers</span></Link>
            </nav>

            <section className="profile-settings-card">
                <div className="profile-section-heading"><span>ACCOUNT SETTINGS</span><h2>Preferences</h2></div>
                <div className="profile-preference-row">
                    <div><strong>Appearance</strong><small>Choose light or dark mode</small></div>
                    <div className="profile-theme-toggle" role="group" aria-label="Color theme">
                        <button type="button" className={theme === 'light' ? 'is-selected' : ''} onClick={() => changeTheme('light')}>Light</button>
                        <button type="button" className={theme === 'dark' ? 'is-selected' : ''} onClick={() => changeTheme('dark')}>Dark</button>
                    </div>
                </div>
                <div className="profile-preference-row">
                    <div><strong>Order updates</strong><small>Preference saved on this device</small></div>
                    <input aria-label="Order update notification preference" type="checkbox" checked={notifications.orderUpdates} onChange={(event) => changeNotification('orderUpdates', event.target.checked)} />
                </div>
                <div className="profile-preference-row">
                    <div><strong>Offers and updates</strong><small>Preference saved on this device</small></div>
                    <input aria-label="Offers notification preference" type="checkbox" checked={notifications.offers} onChange={(event) => changeNotification('offers', event.target.checked)} />
                </div>
                <div className="profile-language-row">
                    <div><strong>{t('language')}</strong><small>Choose your preferred language</small></div>
                    <label className="profile-language-control">
                        <span className="sr-only">{t('language')}</span>
                        <select value={language} onChange={(event) => setLanguage(event.target.value)}>
                            {LANGUAGE_OPTIONS.map((option) => <option key={option.code} value={option.code}>{option.label}</option>)}
                        </select>
                    </label>
                </div>
            </section>

            <section className="profile-actions" aria-label="Admin account actions">
                <Link to="/policies" className="profile-action-card">
                    <span className="profile-action-icon" aria-hidden="true">§</span>
                    <span><strong>Terms and policies</strong><small>Read ShopNest service information</small></span>
                    <span className="profile-action-arrow" aria-hidden="true">›</span>
                </Link>
                <button type="button" className="profile-logout" onClick={handleLogout}>Log out</button>
            </section>
            <section className="profile-social-card">
                <h2>Follow ShopNest</h2>
                <div>
                    <Link to="/social/instagram">Instagram</Link>
                    <Link to="/social/youtube">YouTube</Link>
                    <Link to="/social/linkedin">LinkedIn</Link>
                </div>
                <span>© {new Date().getFullYear()} ShopNest</span>
            </section>
        </main>
    );
};

export default AdminProfile;
