import React, { useContext, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { DISTRICTS_BY_STATE, INDIAN_STATES_AND_UTS, lookupIndiaPin } from '../utils/indiaAddress';
import { LANGUAGE_OPTIONS, useLanguage } from '../context/LanguageContext';
import { useWishlist } from '../context/WishlistContext';
import WishlistButton from '../components/WishlistButton';
import { apiFetch } from '../utils/api';
import AdminProfile from '../admin/AdminProfile';
import '../styles/profile.css';

const Profile = () => {
    const { user, logout, updateUser } = useContext(AuthContext);
    const navigate = useNavigate();
    const { language, setLanguage, t } = useLanguage();
    const { wishlistItems, wishlistLoading } = useWishlist();
    const [defaultAddress, setDefaultAddress] = useState({
        fullName: user?.name || '', phone: '', street: '', district: '', state: '', postalCode: '', country: 'India'
    });
    const [addressLoading, setAddressLoading] = useState(true);
    const [savedAddress, setSavedAddress] = useState(null);
    const [addressEditing, setAddressEditing] = useState(false);
    const [addressSaving, setAddressSaving] = useState(false);
    const [addressMessage, setAddressMessage] = useState('');
    const [addressError, setAddressError] = useState(false);
    const [pinMessage, setPinMessage] = useState('');
    const [pinError, setPinError] = useState(false);
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

    useEffect(() => {
        if (!user?.token || user.role === 'admin') return undefined;
        let cancelled = false;
        const loadProfile = async () => {
            try {
                const response = await apiFetch('/api/authorite/profile', {
                    headers: { Authorization: `Bearer ${user.token}` }
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.message || 'Could not load profile address.');
                if (cancelled) return;
                setProfileName(data.name || user.name || '');
                if (!data.defaultAddress) return;
                const loadedAddress = {
                    fullName: data.defaultAddress.fullName || user.name || '',
                    phone: data.defaultAddress.phone || '',
                    altPhone: data.defaultAddress.altPhone || '',
                    street: data.defaultAddress.street || '',
                    district: data.defaultAddress.district || '',
                    state: data.defaultAddress.state || '',
                    postalCode: data.defaultAddress.postalCode || '',
                    country: 'India'
                };
                setDefaultAddress(loadedAddress);
                setSavedAddress(loadedAddress);
            } catch (error) {
                if (!cancelled) {
                    setAddressError(true);
                    setAddressMessage(error.message || 'Could not load profile address.');
                }
            } finally {
                if (!cancelled) setAddressLoading(false);
            }
        };
        loadProfile();
        return () => { cancelled = true; };
    }, [user?.name, user?.role, user?.token]);

    useEffect(() => {
        if (!/^\d{6}$/.test(defaultAddress.postalCode)) {
            setPinMessage('');
            setPinError(false);
            return undefined;
        }
        let cancelled = false;
        const lookupPin = async () => {
            setPinMessage('Looking up PIN code...');
            setPinError(false);
            try {
                const pinAddress = await lookupIndiaPin(defaultAddress.postalCode);
                if (cancelled) return;
                setDefaultAddress((current) => ({ ...current, ...pinAddress }));
                setPinMessage(`Found ${pinAddress.district}, ${pinAddress.state}.`);
            } catch (error) {
                if (!cancelled) {
                    setPinError(true);
                    setPinMessage(error.message || 'Could not look up this PIN code.');
                }
            }
        };
        lookupPin();
        return () => { cancelled = true; };
    }, [defaultAddress.postalCode]);

    const saveAddress = async (event) => {
        event.preventDefault();
        setAddressSaving(true);
        setAddressError(false);
        setAddressMessage('');
        try {
            const response = await apiFetch('/api/authorite/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${user.token}`
                },
                body: JSON.stringify(defaultAddress)
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Could not save your address.');
            setDefaultAddress((current) => ({ ...current, ...data.defaultAddress }));
            setSavedAddress((current) => ({ ...current, ...data.defaultAddress }));
            setAddressMessage(data.message || 'Default address saved.');
            setAddressEditing(false);
        } catch (error) {
            setAddressError(true);
            setAddressMessage(error.message || 'Could not save your address.');
        } finally {
            setAddressSaving(false);
        }
    };

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

    if (!user) {
        navigate('/login');
        return null;
    }

    if (user.role === 'admin') {
        return <AdminProfile />;
    }

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const cancelAddressEdit = () => {
        setDefaultAddress(savedAddress || {
            fullName: user.name || '', phone: '', altPhone: '', street: '', district: '', state: '', postalCode: '', country: 'India'
        });
        setAddressEditing(false);
        setAddressMessage('');
        setAddressError(false);
    };

    return (
        <main className="profile-page">
            <header className="profile-heading">
                <div>
                    <span>{t('yourAccount')}</span>
                    <h1>{t('profile')}</h1>
                    <p>Manage your ShopNest account and find your purchases.</p>
                </div>
                <Link to="/faq" className="profile-help-link"><span aria-hidden="true">?</span> Help</Link>
            </header>

            <section className="profile-card">
                <div className="profile-avatar" aria-hidden="true">
                    {(user.name || user.email || 'U').trim().charAt(0).toUpperCase()}
                </div>
                <div className="profile-identity">
                    <h2>{user.name || 'ShopNest customer'}</h2>
                    <p>{user.email}</p>
                    {user.role === 'admin' && <span className="profile-role">Administrator</span>}
                </div>
                <button className="profile-address-edit profile-edit-name" type="button" onClick={() => setEditingProfile((current) => !current)}>
                    {editingProfile ? 'Cancel' : 'Edit profile'}
                </button>
            </section>
            {editingProfile && (
                <form className="profile-edit-form" onSubmit={saveProfile}>
                    <label htmlFor="profile-name">Full name</label>
                    <input id="profile-name" minLength={2} maxLength={80} required value={profileName} onChange={(event) => setProfileName(event.target.value)} />
                    <button className="profile-address-save" type="submit" disabled={profileSaving}>{profileSaving ? 'Saving...' : 'Save profile'}</button>
                </form>
            )}
            {profileMessage && <p className={profileError ? 'profile-address-status is-error' : 'profile-address-status'} role={profileError ? 'alert' : 'status'}>{profileMessage}</p>}

            <section className="profile-settings-card">
                <div className="profile-section-heading"><span>SETTINGS</span><h2>Preferences</h2></div>
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

            <section className="profile-address-card" id="address">
                <div className="profile-address-heading">
                    <div>
                        <span>{t('deliveryDetails')}</span>
                        <h2>{t('defaultAddress')}</h2>
                    </div>
                    <p>{t('saveDefaultAddress')}</p>
                    {!addressLoading && !addressEditing && (
                        <button className="profile-address-edit" type="button" onClick={() => setAddressEditing(true)}>
                            {savedAddress ? t('editAddress') : t('addAddress')}
                        </button>
                    )}
                </div>
                {addressLoading ? <p className="profile-address-status">Loading saved address...</p> : !addressEditing ? (
                    savedAddress ? (
                        <div className="profile-address-summary">
                            <strong>{savedAddress.fullName}</strong>
                            <span>{savedAddress.phone}{savedAddress.altPhone ? ` · Alt: ${savedAddress.altPhone}` : ''}</span>
                            <span>{savedAddress.street}</span>
                            <span>{savedAddress.district}, {savedAddress.state} {savedAddress.postalCode}</span>
                            {addressMessage && <p className="profile-address-status" role="status">{addressMessage}</p>}
                        </div>
                    ) : <p className="profile-address-status">{t('noAddress')}</p>
                ) : (
                    <form className="profile-address-form" onSubmit={saveAddress}>
                        <div className="profile-address-fields">
                            <label>{t('fullName')}<input autoComplete="name" required value={defaultAddress.fullName} onChange={(event) => setDefaultAddress({ ...defaultAddress, fullName: event.target.value })} /></label>
                            <label>{t('phone')}<input type="tel" inputMode="numeric" autoComplete="tel" pattern="[6-9][0-9]{9}" maxLength={10} required value={defaultAddress.phone} onChange={(event) => setDefaultAddress({ ...defaultAddress, phone: event.target.value.replace(/\D/g, '').slice(0, 10) })} /></label>
                            <label>{t('alternativePhone')} <span className="profile-field-optional">{t('optional')}</span><input type="tel" inputMode="numeric" autoComplete="tel-national" pattern="[6-9][0-9]{9}" maxLength={10} value={defaultAddress.altPhone || ''} onChange={(event) => setDefaultAddress({ ...defaultAddress, altPhone: event.target.value.replace(/\D/g, '').slice(0, 10) })} /></label>
                            <label className="profile-address-wide">{t('street')}<input autoComplete="street-address" required value={defaultAddress.street} onChange={(event) => setDefaultAddress({ ...defaultAddress, street: event.target.value })} /></label>
                            <label>{t('state')}
                                <select
                                    autoComplete="address-level1"
                                    required
                                    value={defaultAddress.state}
                                    onChange={(event) => setDefaultAddress({ ...defaultAddress, state: event.target.value, district: '' })}
                                >
                                    <option value="">{t('selectState')}</option>
                                    {INDIAN_STATES_AND_UTS.map((state) => <option key={state} value={state}>{state}</option>)}
                                </select>
                            </label>
                            <label>{t('district')}
                                {DISTRICTS_BY_STATE[defaultAddress.state]?.length ? (
                                    <select
                                        required
                                        value={defaultAddress.district}
                                        onChange={(event) => setDefaultAddress({ ...defaultAddress, district: event.target.value })}
                                    >
                                        <option value="">{t('selectDistrict')}</option>
                                        {Array.from(new Set([...DISTRICTS_BY_STATE[defaultAddress.state], ...(defaultAddress.district ? [defaultAddress.district] : [])])).map((district) => <option key={district} value={district}>{district}</option>)}
                                    </select>
                                ) : (
                                    <input
                                        required
                                        disabled={!defaultAddress.state}
                                        placeholder={defaultAddress.state ? t('enterDistrict') : t('selectStateFirst')}
                                        value={defaultAddress.district}
                                        onChange={(event) => setDefaultAddress({ ...defaultAddress, district: event.target.value })}
                                    />
                                )}
                            </label>
                            <label>{t('pinCode')}
                                <input
                                    inputMode="numeric"
                                    autoComplete="postal-code"
                                    pattern="[0-9]{6}"
                                    maxLength={6}
                                    required
                                    value={defaultAddress.postalCode}
                                    onChange={(event) => setDefaultAddress({ ...defaultAddress, postalCode: event.target.value.replace(/\D/g, '').slice(0, 6) })}
                                />
                                {pinMessage && <small className={pinError ? 'profile-pin-message is-error' : 'profile-pin-message'} role={pinError ? 'alert' : 'status'}>{pinMessage}</small>}
                            </label>
                        </div>
                        {addressMessage && <p className={addressError ? 'profile-address-status is-error' : 'profile-address-status'} role={addressError ? 'alert' : 'status'}>{addressMessage}</p>}
                        <div className="profile-address-actions">
                            <button className="profile-address-cancel" type="button" onClick={cancelAddressEdit} disabled={addressSaving}>{t('cancel')}</button>
                            <button className="profile-address-save" type="submit" disabled={addressSaving || pinError}>
                                {addressSaving ? t('savingAddress') : t('saveAddress')}
                            </button>
                        </div>
                    </form>
                )}
            </section>

            <section className="profile-services-card">
                <div className="profile-section-heading"><span>SHOPNEST SERVICES</span><h2>Your services</h2></div>
                <div className="profile-service-grid">
                    {['Subscriptions', 'ShopNest wallet', 'Gift cards', 'Saved payment methods', 'Privacy center', 'Manage devices', 'Earn with ShopNest', 'Sell on ShopNest'].map((service) => (
                        <div className="profile-service-item" key={service}>
                            <strong>{service}</strong><span>Coming soon</span>
                        </div>
                    ))}
                </div>
                <p className="profile-services-note">These account services are not active yet. Payment details are handled by the payment provider during checkout.</p>
            </section>

            <section className="profile-wishlist">
                <div className="profile-wishlist-heading">
                    <div>
                        <span>{t('wishlist')}</span>
                        <h2>{t('savedProducts')}</h2>
                    </div>
                    <strong>{wishlistItems.length}</strong>
                </div>
                {wishlistLoading ? <p>{t('loading')}</p> : wishlistItems.length === 0 ? (
                    <p className="profile-wishlist-empty">{t('wishlistEmpty')}</p>
                ) : (
                    <div className="profile-wishlist-grid">
                        {wishlistItems.map((product) => (
                            <article className="profile-wishlist-item" key={product._id}>
                                <Link to={`/products/${product._id}`}>
                                    <img src={product.imageUrl} alt={product.name} />
                                    <span>{product.name}</span>
                                    <strong>₹{Number(product.price).toFixed(2)}</strong>
                                </Link>
                                <WishlistButton product={product} compact />
                            </article>
                        ))}
                    </div>
                )}
            </section>

            <section className="profile-actions" aria-label="Account actions">
                <Link to="/orders" className="profile-action-card">
                    <span className="profile-action-icon" aria-hidden="true">▤</span>
                    <span>
                        <strong>{t('myOrders')}</strong>
                        <small>See order items, payment, and delivery status</small>
                    </span>
                    <span className="profile-action-arrow" aria-hidden="true">›</span>
                </Link>
                <Link to="/faq" className="profile-action-card">
                    <span className="profile-action-icon" aria-hidden="true">?</span>
                    <span><strong>FAQs</strong><small>Help with shopping, payments, and orders</small></span>
                    <span className="profile-action-arrow" aria-hidden="true">›</span>
                </Link>
                <Link to="/policies" className="profile-action-card">
                    <span className="profile-action-icon" aria-hidden="true">§</span>
                    <span><strong>Terms, policies & licenses</strong><small>Read ShopNest service information</small></span>
                    <span className="profile-action-arrow" aria-hidden="true">›</span>
                </Link>
                <button type="button" className="profile-logout" onClick={handleLogout}>
                    Log out
                </button>
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

export default Profile;
