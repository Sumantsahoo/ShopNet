import React, { useContext, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { DISTRICTS_BY_STATE, INDIAN_STATES_AND_UTS, lookupIndiaPin } from '../utils/indiaAddress';
import { LANGUAGE_OPTIONS, useLanguage } from '../context/LanguageContext';
import { useWishlist } from '../context/WishlistContext';
import WishlistButton from '../components/WishlistButton';
import '../styles/profile.css';

const Profile = () => {
    const { user, logout } = useContext(AuthContext);
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

    useEffect(() => {
        if (!user?.token) return undefined;
        let cancelled = false;
        const loadProfile = async () => {
            try {
                const response = await fetch('/api/authorite/profile', {
                    headers: { Authorization: `Bearer ${user.token}` }
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.message || 'Could not load profile address.');
                if (cancelled || !data.defaultAddress) return;
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
    }, [user?.name, user?.token]);

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
            const response = await fetch('/api/authorite/profile', {
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

    if (!user) {
        navigate('/login');
        return null;
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
                <label className="profile-language-control">
                    <span>{t('language')}</span>
                    <select value={language} onChange={(event) => setLanguage(event.target.value)}>
                        {LANGUAGE_OPTIONS.map((option) => <option key={option.code} value={option.code}>{option.label}</option>)}
                    </select>
                </label>
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
            </section>

            <section className="profile-address-card">
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
                            <label>{t('phone')}<input type="tel" autoComplete="tel" required value={defaultAddress.phone} onChange={(event) => setDefaultAddress({ ...defaultAddress, phone: event.target.value })} /></label>
                            <label>{t('alternativePhone')} <span className="profile-field-optional">{t('optional')}</span><input type="tel" autoComplete="tel-national" value={defaultAddress.altPhone || ''} onChange={(event) => setDefaultAddress({ ...defaultAddress, altPhone: event.target.value })} /></label>
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
                <button type="button" className="profile-logout" onClick={handleLogout}>
                    Log out
                </button>
            </section>
        </main>
    );
};

export default Profile;
