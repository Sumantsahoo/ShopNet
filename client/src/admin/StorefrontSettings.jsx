import React, { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { apiFetch } from '../utils/api';
import { getProductImageUrl } from '../utils/productImage';
import './admin.css';

const StorefrontSettings = () => {
    const { user } = useContext(AuthContext);
    const [heroSlides, setHeroSlides] = useState(() => Array.from({ length: 6 }, () => ({ url: '', file: null })));
    const [imagePreviews, setImagePreviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    useEffect(() => {
        const previewUrls = heroSlides.map(({ file }) => file ? URL.createObjectURL(file) : '');
        setImagePreviews(previewUrls);
        return () => previewUrls.forEach((url) => url && URL.revokeObjectURL(url));
    }, [heroSlides]);

    useEffect(() => {
        if (!user?.token) return;
        let cancelled = false;
        const loadSettings = async () => {
            try {
                const response = await apiFetch('/api/storefront');
                const data = await response.json();
                if (!response.ok) throw new Error(data.message || 'Could not load storefront settings.');
                if (!cancelled) {
                    const urls = Array.isArray(data.heroImageUrls) && data.heroImageUrls.length
                        ? data.heroImageUrls
                        : (data.heroImageUrl ? [data.heroImageUrl] : []);
                    setHeroSlides(Array.from({ length: 6 }, (_, index) => ({ url: urls[index] || '', file: null })));
                }
            } catch (loadError) {
                if (!cancelled) setError(loadError.message || 'Could not load storefront settings.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        loadSettings();
        return () => { cancelled = true; };
    }, [user?.token]);

    const saveSettings = async (event) => {
        event.preventDefault();
        setSaving(true);
        setError('');
        setMessage('');
        try {
            const formData = new FormData();
            heroSlides.forEach((slide, index) => {
                formData.append(`heroImageUrl${index}`, slide.url.trim());
                if (slide.file) formData.append(`heroImage${index}`, slide.file);
            });
            const response = await apiFetch('/api/storefront', {
                method: 'PUT',
                headers: { Authorization: `Bearer ${user.token}` },
                body: formData
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Could not save storefront settings.');
            const urls = Array.isArray(data.heroImageUrls) ? data.heroImageUrls : [];
            setHeroSlides(Array.from({ length: 6 }, (_, index) => ({ url: urls[index] || '', file: null })));
            setMessage('Homepage banner slides updated.');
        } catch (saveError) {
            setError(saveError.message || 'Could not save storefront settings.');
        } finally {
            setSaving(false);
        }
    };

    if (user?.role !== 'admin') {
        return <main className="admin-page"><p className="admin-alert">Admin access required.</p></main>;
    }

    return (
        <main className="admin-page">
            <header className="admin-heading">
                <div><p className="admin-eyebrow">SHOPNEST / ADMIN</p><h1>Edit front page</h1></div>
                <Link className="admin-profile-link" to="/admin">Back to dashboard</Link>
            </header>
            <section className="admin-settings-card">
                <h2>Homepage banner slideshow</h2>
                <p>Add up to six images. Active slides rotate automatically every second and are shared with every visitor.</p>
                {loading ? <p className="admin-status">Loading banner settings...</p> : (
                    <form className="admin-edit-form" onSubmit={saveSettings}>
                        {heroSlides.map((slide, index) => (
                            <fieldset className="hero-slide-editor" key={index}>
                                <legend>Slide {index + 1}</legend>
                                <label>Image URL<input type="url" value={slide.url} onChange={(event) => setHeroSlides((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, url: event.target.value, file: null } : item))} placeholder="https://..." /></label>
                                <label>Or upload an image (Cloudinary)<input key={`${index}-${Boolean(slide.file)}`} type="file" accept="image/*" onChange={(event) => setHeroSlides((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, file: event.target.files[0] || null, url: '' } : item))} /></label>
                                {(imagePreviews[index] || slide.url) && <img className="admin-product-image-preview" src={imagePreviews[index] || getProductImageUrl(slide.url, 900)} alt={`Homepage banner slide ${index + 1} preview`} />}
                                {slide.url && <button className="admin-text-link" type="button" onClick={() => setHeroSlides((current) => current.map((item, itemIndex) => itemIndex === index ? { url: '', file: null } : item))}>Clear slide</button>}
                            </fieldset>
                        ))}
                        {error && <p className="admin-alert" role="alert">{error}</p>}
                        {message && <p className="admin-success" role="status">{message}</p>}
                        <div className="admin-form-actions">
                            <button className="admin-action" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save banner'}</button>
                        </div>
                    </form>
                )}
            </section>
            <section className="admin-settings-card admin-section-settings-card">
                <h2>Picked for You carousel</h2>
                <p>Choose the products in this carousel and update them whenever you need. The homepage automatically rotates through up to six selected products every second.</p>
                <Link className="admin-action" to="/admin/homepage-sections#picked-for-you">Manage Picked for You products</Link>
            </section>
            <section className="admin-settings-card admin-section-settings-card">
                <h2>Homepage product sections</h2>
                <p>Choose products for All Products, Picked for You, Still Looking, Suggested for You, Celebrate Every Moment, Value 365, Rating &amp; Reviews, and Brands in Spotlight.</p>
                <Link className="admin-action" to="/admin/homepage-sections">Manage all homepage product sections</Link>
            </section>
            <section className="admin-settings-card admin-section-settings-card">
                <h2>Seasonal deals</h2>
                <p>Create a seasonal shelf and set each product's discount from 1% to 100%.</p>
                <Link className="admin-action" to="/admin/seasonal-deals">Manage seasonal deals</Link>
            </section>
        </main>
    );
};

export default StorefrontSettings;
