import React, { useContext, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import ProductPrice from '../components/ProductPrice';
import { apiFetch } from '../utils/api';
import { saveProductCache } from '../utils/productCache';
import './pickedForYou.css';
import './admin.css';

const AdminPickedForYou = () => {
    const { user } = useContext(AuthContext);
    const [products, setProducts] = useState([]);
    const [selection, setSelection] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    useEffect(() => {
        let cancelled = false;
        const loadProducts = async () => {
            try {
                const response = await apiFetch('/api/products');
                const data = await response.json();
                if (!response.ok) throw new Error(data.message || 'Could not load products.');
                if (!Array.isArray(data)) throw new Error('The products response was not a list.');
                if (cancelled) return;
                setProducts(data);
                setSelection(data
                    .filter((product) => product.showInFeatured)
                    .sort((left, right) => Number(left.featuredOrder || 0) - Number(right.featuredOrder || 0))
                    .map((product) => ({ productId: String(product._id), active: product.featuredActive !== false })));
            } catch (loadError) {
                if (!cancelled) setError(loadError.message || 'Could not load Picked for You products.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        loadProducts();
        return () => { cancelled = true; };
    }, []);

    const selectedIds = useMemo(() => new Set(selection.map((entry) => entry.productId)), [selection]);
    const updateSelection = (productId, selected) => {
        setSelection((current) => selected
            ? current.some((entry) => entry.productId === productId)
                ? current
                : [...current, { productId, active: true }]
            : current.filter((entry) => entry.productId !== productId));
        setMessage('');
    };

    const moveProduct = (index, direction) => {
        setSelection((current) => {
            const destination = index + direction;
            if (destination < 0 || destination >= current.length) return current;
            const reordered = [...current];
            [reordered[index], reordered[destination]] = [reordered[destination], reordered[index]];
            return reordered;
        });
        setMessage('');
    };

    const setActive = (productId, active) => {
        setSelection((current) => current.map((entry) => entry.productId === productId ? { ...entry, active } : entry));
        setMessage('');
    };

    const saveSelection = async (event) => {
        event.preventDefault();
        if (selection.length > 50) {
            setError('Choose no more than 50 products.');
            return;
        }
        setSaving(true);
        setError('');
        setMessage('');
        try {
            const response = await apiFetch('/api/products/picked-for-you', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${user.token}`
                },
                body: JSON.stringify({ products: selection })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Could not save Picked for You products.');
            const selectedById = new Map(selection.map((entry, index) => [entry.productId, { ...entry, featuredOrder: index }]));
            const updatedProducts = products.map((product) => {
                const entry = selectedById.get(String(product._id));
                return {
                    ...product,
                    showInFeatured: Boolean(entry),
                    featuredActive: entry ? entry.active : product.featuredActive,
                    featuredOrder: entry ? entry.featuredOrder : product.featuredOrder
                };
            });
            setProducts(updatedProducts);
            saveProductCache(updatedProducts);
            setMessage(`Picked for You saved. ${data.products?.filter((product) => product.featuredActive).length || 0} products are active on the storefront.`);
        } catch (saveError) {
            setError(saveError.message || 'Could not save Picked for You products.');
        } finally {
            setSaving(false);
        }
    };

    if (!['admin', 'employee'].includes(user?.role)) {
        return <main className="admin-page"><p className="admin-alert">Product management access required.</p></main>;
    }

    return (
        <main className="admin-page picked-for-you-admin">
            <header className="admin-heading">
                <div><p className="admin-eyebrow">SHOPNEST / PRODUCT MANAGEMENT</p><h1>Picked for You</h1></div>
                <Link className="admin-profile-link" to="/admin/homepage-sections">Homepage sections</Link>
            </header>
            <p className="admin-status">Select products, set their display order, and activate or deactivate each pick. Changes are saved to the storefront without affecting banner settings.</p>
            {error && <p className="admin-alert" role="alert">{error}</p>}
            {message && <p className="admin-success" role="status">{message}</p>}
            {loading ? <p className="admin-status">Loading products...</p> : (
                <form onSubmit={saveSelection}>
                    <section className="admin-settings-card">
                        <h2>Selected products ({selection.length}/50)</h2>
                        {selection.length === 0 ? <p>No products selected yet.</p> : (
                            <ol className="picked-for-you-selection">
                                {selection.map((entry, index) => {
                                    const product = products.find((item) => String(item._id) === entry.productId);
                                    if (!product) return null;
                                    const available = Number(product.stock) > 0 && product.showInAllProducts !== false;
                                    return (
                                        <li key={entry.productId}>
                                            <span className="picked-for-you-order">{index + 1}</span>
                                            <div className="picked-for-you-product">
                                                <strong>{product.name}</strong>
                                                <ProductPrice product={product} className="is-compact" />
                                                {!available && <small>Unavailable or hidden; deactivate before saving.</small>}
                                            </div>
                                            <label className="admin-checkbox-label">
                                                <input type="checkbox" checked={entry.active} onChange={(event) => setActive(entry.productId, event.target.checked && available)} />
                                                Active
                                            </label>
                                            <div className="picked-for-you-controls">
                                                <button type="button" className="admin-text-link" aria-label={`Move ${product.name} up`} disabled={index === 0} onClick={() => moveProduct(index, -1)}>↑</button>
                                                <button type="button" className="admin-text-link" aria-label={`Move ${product.name} down`} disabled={index === selection.length - 1} onClick={() => moveProduct(index, 1)}>↓</button>
                                                <button type="button" className="admin-text-link" onClick={() => updateSelection(entry.productId, false)}>Remove</button>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ol>
                        )}
                    </section>
                    <section className="admin-table-wrap">
                        <table className="admin-table">
                            <thead><tr><th>Add</th><th>Product</th><th>Brand</th><th>Category</th><th>Price</th></tr></thead>
                            <tbody>
                                {products.map((product) => (
                                    <tr key={product._id}>
                                        <td><input
                                            type="checkbox"
                                            checked={selectedIds.has(String(product._id))}
                                            disabled={!selectedIds.has(String(product._id)) && selection.length >= 50}
                                            aria-label={`Select ${product.name} for Picked for You`}
                                            onChange={(event) => updateSelection(String(product._id), event.target.checked)}
                                        /></td>
                                        <td>{product.name}</td><td>{product.brand || '—'}</td><td>{product.category}</td>
                                        <td><ProductPrice product={product} className="is-compact" /></td>
                                    </tr>
                                ))}
                                {products.length === 0 && <tr><td colSpan="5">No products found. Add products before selecting them.</td></tr>}
                            </tbody>
                        </table>
                    </section>
                    <div className="admin-form-actions">
                        <button className="admin-action" type="submit" disabled={saving}>{saving ? 'Saving picks...' : 'Save Picked for You'}</button>
                    </div>
                </form>
            )}
        </main>
    );
};

export default AdminPickedForYou;
