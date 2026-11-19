import React, { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { apiFetch } from '../utils/api';
import { saveProductCache } from '../utils/productCache';
import { getProductAdditionalDiscountPercent } from '../utils/productPricing';
import './admin.css';

const SeasonalDeals = () => {
    const { user } = useContext(AuthContext);
    const [products, setProducts] = useState([]);
    const [campaignName, setCampaignName] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    useEffect(() => {
        let cancelled = false;
        const loadSettings = async () => {
            try {
                const [productsResponse, settingsResponse] = await Promise.all([
                    apiFetch('/api/products'),
                    apiFetch('/api/storefront')
                ]);
                const [productData, settingsData] = await Promise.all([
                    productsResponse.json(),
                    settingsResponse.json()
                ]);
                if (!productsResponse.ok) throw new Error(productData.message || 'Could not load products.');
                if (!settingsResponse.ok) throw new Error(settingsData.message || 'Could not load storefront settings.');
                if (!Array.isArray(productData)) throw new Error('The products response was not a list.');
                if (!cancelled) {
                    setProducts(productData.map((product) => ({
                        ...product,
                        seasonalDiscount: getProductAdditionalDiscountPercent(product),
                        savedShowInSeasonalDeals: Boolean(product.showInSeasonalDeals)
                    })));
                    setCampaignName(settingsData.seasonalCampaignName || '');
                }
            } catch (loadError) {
                if (!cancelled) setError(loadError.message || 'Could not load seasonal deals.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        loadSettings();
        return () => { cancelled = true; };
    }, []);

    const updateProduct = (productId, updates) => {
        setProducts((current) => current.map((product) => (
            String(product._id) === String(productId) ? { ...product, ...updates } : product
        )));
    };

    const saveSettings = async (event) => {
        event.preventDefault();
        if (products.some((product) => product.showInSeasonalDeals &&
            (!Number.isInteger(Number(product.seasonalDiscount ?? getProductAdditionalDiscountPercent(product))) ||
                Number(product.seasonalDiscount ?? getProductAdditionalDiscountPercent(product)) < 1 ||
                Number(product.seasonalDiscount ?? getProductAdditionalDiscountPercent(product)) > 100))) {
            setError('Seasonal shelf products need a whole-number discount from 1% to 100%.');
            return;
        }
        setSaving(true);
        setError('');
        setMessage('');
        try {
            const settingsForm = new FormData();
            settingsForm.append('seasonalCampaignName', campaignName.trim());
            const settingsResponse = await apiFetch('/api/storefront', {
                method: 'PUT',
                headers: { Authorization: `Bearer ${user.token}` },
                body: settingsForm
            });
            const settingsData = await settingsResponse.json();
            if (!settingsResponse.ok) throw new Error(settingsData.message || 'Could not save seasonal campaign.');

            const savedProducts = [];
            for (const product of products) {
                const additionalDiscountPercent = Number(product.seasonalDiscount ?? getProductAdditionalDiscountPercent(product));
                const currentDiscount = getProductAdditionalDiscountPercent(product);
                if (Boolean(product.showInSeasonalDeals) === Boolean(product.savedShowInSeasonalDeals) &&
                    additionalDiscountPercent === currentDiscount) {
                    savedProducts.push(product);
                    continue;
                }

                const formData = new FormData();
                formData.append('showInSeasonalDeals', String(Boolean(product.showInSeasonalDeals)));
                formData.append('additionalDiscountPercent', String(additionalDiscountPercent));
                const response = await apiFetch(`/api/products/${product._id}`, {
                    method: 'PUT',
                    headers: { Authorization: `Bearer ${user.token}` },
                    body: formData
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.message || `Could not update ${product.name}.`);
                savedProducts.push({ ...data, seasonalDiscount: getProductAdditionalDiscountPercent(data), savedShowInSeasonalDeals: Boolean(data.showInSeasonalDeals) });
            }
            const normalizedProducts = products.map((product) => (
                savedProducts.find((saved) => String(saved._id) === String(product._id)) || product
            ));
            setProducts(normalizedProducts.map((product) => ({
                ...product,
                seasonalDiscount: getProductAdditionalDiscountPercent(product),
                savedShowInSeasonalDeals: Boolean(product.showInSeasonalDeals)
            })));
            saveProductCache(normalizedProducts.map(({ seasonalDiscount, savedShowInSeasonalDeals, ...product }) => product));
            setMessage('Seasonal campaign and product offers saved.');
        } catch (saveError) {
            setError(`${saveError.message || 'Could not save seasonal deals.'} Some earlier changes may already have been saved.`);
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
                <div><p className="admin-eyebrow">SHOPNEST / ADMIN</p><h1>Seasonal deals</h1></div>
                <Link className="admin-profile-link" to="/admin/storefront">Back to front page</Link>
            </header>
            <p className="admin-status">Choose a campaign name, add products to the shelf, and set a whole-number extra offer from 1% to 100%. The extra offer is calculated on the regular discounted selling price.</p>
            {error && <p className="admin-alert" role="alert">{error}</p>}
            {loading ? <p className="admin-status">Loading products...</p> : (
                <form className="admin-edit-form seasonal-deals-form" onSubmit={saveSettings}>
                    <label>Campaign name<input value={campaignName} onChange={(event) => setCampaignName(event.target.value)} maxLength={80} placeholder="Winter Season Offers" /></label>
                    <div className="admin-table-wrap">
                        <table className="admin-table">
                            <thead><tr><th>Product</th><th>Customer price</th><th>Promotion discount</th><th>Show in seasonal shelf</th></tr></thead>
                            <tbody>
                                {products.map((product) => (
                                    <tr key={product._id}>
                                        <td>{product.name}</td>
                                        <td>₹{Number(product.price).toLocaleString('en-IN')}</td>
                                        <td>
                                            <input
                                                aria-label={`Promotion discount for ${product.name}`}
                                                type="number"
                                                min="0"
                                                max="100"
                                                step="1"
                                                value={product.seasonalDiscount ?? getProductAdditionalDiscountPercent(product)}
                                                onChange={(event) => updateProduct(product._id, { seasonalDiscount: event.target.value === '' ? '' : Number(event.target.value) })}
                                            />
                                        </td>
                                        <td><input aria-label={`Show ${product.name} in seasonal shelf`} type="checkbox" checked={Boolean(product.showInSeasonalDeals)} onChange={(event) => updateProduct(product._id, { showInSeasonalDeals: event.target.checked })} /></td>
                                    </tr>
                                ))}
                                {products.length === 0 && <tr><td colSpan="4">No products found.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                    {message && <p className="admin-success" role="status">{message}</p>}
                    <button className="admin-action" type="submit" disabled={saving}>{saving ? 'Saving deals...' : 'Save seasonal deals'}</button>
                </form>
            )}
        </main>
    );
};

export default SeasonalDeals;
