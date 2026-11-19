import React, { useContext, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { apiFetch } from '../utils/api';
import { saveProductCache } from '../utils/productCache';
import './admin.css';

const SECTION_FIELDS = [
    { key: 'showInAllProducts', label: 'All products', checked: (product) => product.showInAllProducts !== false },
    { key: 'showInCelebrate', label: 'Celebrate every moment' },
    { key: 'showInValue365', label: 'Value 365' },
    { key: 'showInRatingReviews', label: 'Rating & reviews' },
    { key: 'showInSuggested', label: 'Suggested for you' },
    { key: 'showInStillLooking', label: 'Still looking for these?' },
    { key: 'showInFeatured', label: 'Picked for You' },
    { key: 'showInBrandSpotlight', label: 'Brand spotlight' },
    { key: 'showInSeasonalDeals', label: 'Seasonal deals' }
];

const getSectionValue = (product, field) => (
    field.checked ? field.checked(product) : Boolean(product[field.key])
);

const HomepageSections = () => {
    const { user } = useContext(AuthContext);
    const canManageProducts = ['admin', 'employee'].includes(user?.role);
    const location = useLocation();
    const [products, setProducts] = useState([]);
    const [savedProducts, setSavedProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [savingProductId, setSavingProductId] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (location.hash === '#picked-for-you') {
            document.getElementById('picked-for-you')?.scrollIntoView({ block: 'start' });
        }
    }, [location.hash]);

    useEffect(() => {
        let cancelled = false;
        const loadProducts = async () => {
            try {
                const response = await apiFetch('/api/products');
                const data = await response.json();
                if (!response.ok) throw new Error(data.message || 'Could not load products.');
                if (!Array.isArray(data)) throw new Error('The products response was not a list.');
                if (!cancelled) {
                    setProducts(data);
                    setSavedProducts(data);
                }
            } catch (loadError) {
                if (!cancelled) setError(loadError.message || 'Could not load products.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        loadProducts();
        return () => { cancelled = true; };
    }, []);

    const dirtyProducts = useMemo(() => new Set(products.filter((product) => {
        const saved = savedProducts.find((item) => String(item._id) === String(product._id));
        return saved && SECTION_FIELDS.some((field) => getSectionValue(product, field) !== getSectionValue(saved, field));
    }).map((product) => String(product._id))), [products, savedProducts]);

    const updateField = (productId, field, value) => {
        setProducts((current) => current.map((product) => (
            String(product._id) === String(productId) ? { ...product, [field.key]: value } : product
        )));
    };

    const saveProductSections = async (product) => {
        setSavingProductId(String(product._id));
        setError('');
        setMessage('');
        try {
            const formData = new FormData();
            SECTION_FIELDS.forEach(({ key }) => {
                formData.append(key, String(key === 'showInAllProducts' ? product.showInAllProducts !== false : Boolean(product[key])));
            });
            const response = await apiFetch(`/api/products/${product._id}`, {
                method: 'PUT',
                headers: { Authorization: `Bearer ${user.token}` },
                body: formData
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || `Could not update ${product.name}.`);
            setProducts((current) => current.map((item) => String(item._id) === String(data._id) ? data : item));
            setSavedProducts((current) => current.map((item) => String(item._id) === String(data._id) ? data : item));
            setMessage(`Homepage sections updated for ${data.name}.`);
            const cachedProducts = products.map((item) => String(item._id) === String(data._id) ? data : item);
            saveProductCache(cachedProducts);
        } catch (saveError) {
            setError(saveError.message || 'Could not update homepage sections.');
        } finally {
            setSavingProductId('');
        }
    };

    if (!canManageProducts) {
        return <main className="admin-page"><p className="admin-alert">Product management access required.</p></main>;
    }

    return (
        <main className="admin-page homepage-sections-page">
            <header className="admin-heading">
                <div><p className="admin-eyebrow">SHOPNEST / PRODUCT MANAGEMENT</p><h1>Homepage sections</h1></div>
                <Link className="admin-profile-link" to={user.role === 'employee' ? '/admin/products/edit' : '/admin/storefront'}>
                    {user.role === 'employee' ? 'Back to products' : 'Back to front page'}
                </Link>
            </header>
            <section id="picked-for-you" className="admin-settings-card admin-section-settings-card">
                <h2>Picked for You carousel</h2>
                <p>Manage the selected products, their order, and activation from the dedicated Picked for You manager. The homepage rotates active choices automatically.</p>
                <Link className="admin-profile-link" to="/admin/picked-for-you">Open Picked for You manager →</Link>
            </section>
            <p className="admin-status">Choose the homepage shelves for each product. Suggestions are personalized separately for each signed-in customer from their own searches, product views, cart additions, and orders from the last 90 days. Customer activity stays private; this page controls which products are eligible. Save a row after changing its checkboxes.</p>
            {user.role === 'admin' && <div className="homepage-section-shortcuts">
                <Link to="/admin/seasonal-deals">Manage seasonal deals and discounts →</Link>
                <Link to="/admin/storefront">Manage the six-slide homepage banner →</Link>
            </div>}
            {error && <p className="admin-alert" role="alert">{error}</p>}
            {message && <p className="admin-success" role="status">{message}</p>}
            {loading ? <p className="admin-status">Loading products...</p> : (
                <div className="admin-table-wrap homepage-sections-table-wrap">
                    <table className="admin-table homepage-sections-table">
                        <thead>
                            <tr>
                                <th>Product</th>
                                <th>Brand</th>
                                {SECTION_FIELDS.map((field) => <th key={field.key}>{field.label}</th>)}
                                <th>Save</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.map((product) => (
                                <tr key={product._id}>
                                    <td>{product.name}</td>
                                    <td>{product.brand || '—'}</td>
                                    {SECTION_FIELDS.map((field) => (
                                        <td key={field.key}>
                                            <input
                                                aria-label={`${field.label}: ${product.name}`}
                                                type="checkbox"
                                                checked={getSectionValue(product, field)}
                                                onChange={(event) => updateField(product._id, field, event.target.checked)}
                                            />
                                        </td>
                                    ))}
                                    <td>
                                        <button
                                            className="admin-action"
                                            type="button"
                                            disabled={!dirtyProducts.has(String(product._id)) || savingProductId === String(product._id)}
                                            onClick={() => saveProductSections(product)}
                                        >{savingProductId === String(product._id) ? 'Saving...' : 'Save'}</button>
                                    </td>
                                </tr>
                            ))}
                            {products.length === 0 && <tr><td colSpan={SECTION_FIELDS.length + 3}>No products found. Add products before assigning homepage sections.</td></tr>}
                        </tbody>
                    </table>
                </div>
            )}
        </main>
    );
};

export default HomepageSections;
