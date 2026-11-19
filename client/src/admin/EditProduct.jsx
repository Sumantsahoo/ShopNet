import React, { useContext, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { apiFetch } from '../utils/api';
import { saveProductCache } from '../utils/productCache';
import { calculateDiscountedPrice, calculateFinalPrice, getProductDiscountPercent } from '../utils/productPricing';
import './admin.css';

const toDateTimeLocal = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

const EditProduct = () => {
    const { user } = useContext(AuthContext);
    const canManageProducts = ['admin', 'employee'].includes(user?.role);
    const navigate = useNavigate();
    const { id } = useParams();
    const [products, setProducts] = useState([]);
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState('');
    const imageInputRef = useRef(null);

    useEffect(() => {
        if (!imageFile) {
            setImagePreview('');
            return undefined;
        }

        const previewUrl = URL.createObjectURL(imageFile);
        setImagePreview(previewUrl);
        return () => URL.revokeObjectURL(previewUrl);
    }, [imageFile]);

    useEffect(() => {
        if (!user?.token) {
            navigate('/login');
            return;
        }
        if (!canManageProducts) {
            setLoading(false);
            return;
        }

        const loadProducts = async () => {
            try {
                const response = await apiFetch('/api/products');
                const data = await response.json();
                if (!response.ok) throw new Error(data.message || 'Could not load products.');
                setProducts(data);
                if (id) {
                    const selected = data.find((item) => item._id === id);
                    if (selected) setProduct(selected);
                    else setError('Product not found.');
                }
            } catch (fetchError) {
                setError(fetchError.message || 'Could not load products.');
            } finally {
                setLoading(false);
            }
        };

        loadProducts();
    }, [canManageProducts, user, navigate, id]);

    const updateField = (event) => {
        const { name, value } = event.target;
        setProduct((current) => ({ ...current, [name]: value }));
    };

    const getEditableDiscountPercent = (currentProduct) => (
        currentProduct.discountPercent === undefined || currentProduct.discountPercent === null
            ? getProductDiscountPercent(currentProduct)
            : Number(currentProduct.discountPercent)
    );

    const getEditableBasePrice = (currentProduct) => (
        currentProduct.basePrice === undefined || currentProduct.basePrice === null
            ? Number(currentProduct.price)
            : Number(currentProduct.basePrice)
    );

    const updateBasePrice = (event) => {
        const { value } = event.target;
        setProduct((current) => ({
            ...current,
            basePrice: value,
            price: calculateFinalPrice(value, current.additionalDiscountPercent || 0, current.additionalOfferActive !== false, current.additionalOfferExpiresAt)
        }));
    };

    const updateOriginalPrice = (event) => {
        const { value } = event.target;
        setProduct((current) => {
            const discount = getEditableDiscountPercent(current);
            const basePrice = discount > 0 && Number(value) > 0
                ? calculateDiscountedPrice(value, discount)
                : getEditableBasePrice(current);
            return {
                ...current,
                originalPrice: value,
                discountPercent: discount,
                basePrice,
                price: calculateFinalPrice(basePrice, current.additionalDiscountPercent || 0, current.additionalOfferActive !== false, current.additionalOfferExpiresAt)
            };
        });
    };

    const updateDiscountPercent = (event) => {
        const { value } = event.target;
        setProduct((current) => {
            const discount = Number(value);
            if (value === '0') {
                const originalPrice = Number(current.originalPrice);
                const basePrice = Number.isFinite(originalPrice) && originalPrice > 0
                    ? originalPrice
                    : getEditableBasePrice(current);
                return {
                    ...current,
                    discountPercent: 0,
                    basePrice,
                    price: calculateFinalPrice(basePrice, current.additionalDiscountPercent || 0, current.additionalOfferActive !== false, current.additionalOfferExpiresAt)
                };
            }
            const basePrice = discount > 0 && Number(current.originalPrice) > 0
                ? calculateDiscountedPrice(current.originalPrice, discount)
                : getEditableBasePrice(current);
            return {
                ...current,
                discountPercent: value,
                basePrice,
                price: calculateFinalPrice(basePrice, current.additionalDiscountPercent || 0, current.additionalOfferActive !== false, current.additionalOfferExpiresAt)
            };
        });
    };

    const updateAdditionalDiscount = (event) => {
        const { value } = event.target;
        setProduct((current) => ({
            ...current,
            additionalDiscountPercent: value,
            price: calculateFinalPrice(getEditableBasePrice(current), value || 0, current.additionalOfferActive !== false, current.additionalOfferExpiresAt)
        }));
    };

    const updateOfferActive = (event) => {
        const additionalOfferActive = event.target.checked;
        setProduct((current) => ({
            ...current,
            additionalOfferActive,
            price: calculateFinalPrice(getEditableBasePrice(current), current.additionalDiscountPercent || 0, additionalOfferActive, current.additionalOfferExpiresAt)
        }));
    };

    const updateOfferExpiry = (event) => {
        const additionalOfferExpiresAt = event.target.value;
        setProduct((current) => ({
            ...current,
            additionalOfferExpiresAt,
            price: calculateFinalPrice(getEditableBasePrice(current), current.additionalDiscountPercent || 0, current.additionalOfferActive !== false, additionalOfferExpiresAt || undefined)
        }));
    };

    const saveProduct = async (event) => {
        event.preventDefault();
        setSaving(true);
        setError('');
        setMessage('');
        try {
            const formData = new FormData();
            ['name', 'brand', 'color', 'gender', 'countryOfOrigin', 'occasion', 'description', 'category', 'originalPrice', 'stock', 'imageUrl'].forEach((field) => {
                formData.append(field, product[field] ?? '');
            });
            formData.append('price', String(getEditableBasePrice(product)));
            formData.append('discountPercent', String(getEditableDiscountPercent(product)));
            formData.append('additionalDiscountPercent', String(product.additionalDiscountPercent || 0));
            const offerExpiry = product.additionalOfferExpiresAt ? new Date(product.additionalOfferExpiresAt) : null;
            if (offerExpiry && Number.isNaN(offerExpiry.getTime())) throw new Error('Enter a valid promotion expiry date.');
            formData.append('additionalOfferActive', String(product.additionalOfferActive !== false));
            formData.append('additionalOfferExpiresAt', offerExpiry ? offerExpiry.toISOString() : '');
            formData.append('sizes', Array.isArray(product.sizes) ? product.sizes.join(', ') : (product.sizes || ''));
            formData.append('fastDelivery', String(Boolean(product.fastDelivery)));
            formData.append('showInAllProducts', String(product.showInAllProducts !== false));
            formData.append('showInCelebrate', String(Boolean(product.showInCelebrate)));
            formData.append('showInValue365', String(Boolean(product.showInValue365)));
            formData.append('showInRatingReviews', String(Boolean(product.showInRatingReviews)));
            formData.append('showInSuggested', String(Boolean(product.showInSuggested)));
            formData.append('showInStillLooking', String(Boolean(product.showInStillLooking)));
            formData.append('showInFeatured', String(Boolean(product.showInFeatured)));
            formData.append('showInBrandSpotlight', String(Boolean(product.showInBrandSpotlight)));
            formData.append('showInSeasonalDeals', String(Boolean(product.showInSeasonalDeals)));
            if (imageFile) formData.append('image', imageFile);

            const response = await apiFetch(`/api/products/${product._id}`, {
                method: 'PUT',
                headers: {
                    Authorization: `Bearer ${user.token}`
                },
                body: formData
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Could not update product.');
            setProduct(data);
            setMessage('Product updated successfully.');
            setImageFile(null);
            if (imageInputRef.current) imageInputRef.current.value = '';
            const updatedProducts = products
                .map((item) => item._id === data._id ? data : item)
                .sort((left, right) => new Date(right.updatedAt || right.createdAt || 0) - new Date(left.updatedAt || left.createdAt || 0));
            setProducts(updatedProducts);
            saveProductCache(updatedProducts);
        } catch (saveError) {
            setError(saveError.message || 'Could not update product.');
        } finally {
            setSaving(false);
        }
    };

    if (!canManageProducts) {
        return <main className="admin-page"><p className="admin-alert">Product management access required.</p></main>;
    }

    return (
        <main className="admin-page">
            <header className="admin-heading"><div><p className="admin-eyebrow">SHOPNEST / ADMIN</p><h1>{product ? 'Edit product' : 'Products'}</h1></div></header>
            {loading && <p className="admin-status">Loading products...</p>}
            {error && <p className="admin-alert" role="alert">{error}</p>}
            {!loading && !id && (
                <div className="admin-table-wrap">
                    <table className="admin-table">
                        <thead><tr><th>Product</th><th>Brand</th><th>Category</th><th>Price</th><th>All Products</th><th>Celebrate</th><th>Value 365</th><th>Rating section</th><th>Suggested</th><th>Still looking</th><th>Picked for You</th><th>Brand spotlight</th><th>Seasonal deal</th><th>Rating</th><th>Stock</th><th></th></tr></thead>
                        <tbody>
                            {products.map((item) => (
                                <tr key={item._id}>
                                    <td>{item.name}</td><td>{item.brand || '—'}</td><td>{item.category}</td>
                                    <td>
                                        ₹{Number(item.price).toLocaleString('en-IN')}
                                        {Number(item.originalPrice) > Number(item.price) && <del className="admin-original-price">₹{Number(item.originalPrice).toLocaleString('en-IN')}</del>}
                                        {getProductDiscountPercent(item) > 0 && <small>{Math.round(getProductDiscountPercent(item))}% off</small>}
                                    </td>
                                    <td>{item.showInAllProducts === false ? 'Hidden' : 'Visible'}</td>
                                    <td>{item.showInCelebrate ? 'Included' : '—'}</td>
                                    <td>{item.showInValue365 ? 'Included' : '—'}</td>
                                    <td>{item.showInRatingReviews ? 'Included' : '—'}</td>
                                    <td>{item.showInSuggested ? 'Eligible' : '—'}</td>
                                    <td>{item.showInStillLooking ? 'Included' : '—'}</td>
                                    <td>{item.showInFeatured ? 'Included' : '—'}</td>
                                    <td>{item.showInBrandSpotlight ? 'Included' : '—'}</td>
                                    <td>{item.showInSeasonalDeals ? 'Included' : '—'}</td>
                                    <td>★ {Number(item.rating || 0).toFixed(1)} ({Number(item.numReviews || 0)})</td><td>{item.stock}</td>
                                    <td><Link className="admin-text-link" to={`/admin/products/${item._id}/edit`}>Edit</Link></td>
                                </tr>
                            ))}
                            {products.length === 0 && <tr><td colSpan="16">No products found.</td></tr>}
                        </tbody>
                    </table>
                </div>
            )}
            {!loading && product && (
                <form className="admin-edit-form" onSubmit={saveProduct}>
                    <label>Product name<input name="name" value={product.name || ''} onChange={updateField} required /></label>
                    <label>Brand (optional)<input name="brand" value={product.brand || ''} onChange={updateField} maxLength={80} /></label>
                    <div className="admin-form-row">
                        <label>Color<input name="color" value={product.color || ''} onChange={updateField} maxLength="50" /></label>
                        <label>Gender<select name="gender" value={product.gender || ''} onChange={updateField}><option value="">Not specified</option><option value="Men">Men</option><option value="Women">Women</option><option value="Unisex">Unisex</option><option value="Kids">Kids</option></select></label>
                        <label>Country of origin<input name="countryOfOrigin" value={product.countryOfOrigin || ''} onChange={updateField} maxLength="60" /></label>
                    </div>
                    <div className="admin-form-row">
                        <label>Occasion<input name="occasion" value={product.occasion || ''} onChange={updateField} maxLength="80" /></label>
                        <label>Sizes (comma separated)<input name="sizes" value={Array.isArray(product.sizes) ? product.sizes.join(', ') : (product.sizes || '')} onChange={updateField} maxLength="120" /></label>
                        <label className="admin-fast-delivery"><input name="fastDelivery" type="checkbox" checked={Boolean(product.fastDelivery)} onChange={(event) => setProduct((current) => ({ ...current, fastDelivery: event.target.checked }))} /> Eligible for delivery in 2 days</label>
                    </div>
                    <label>Description<textarea name="description" value={product.description || ''} onChange={updateField} required rows="5" /></label>
                    <div className="admin-form-row">
                        <label>Category<input name="category" value={product.category || ''} onChange={updateField} required /></label>
                        <label>Base price before promotion<input name="price" type="number" min="0" step="0.01" value={getEditableBasePrice(product)} onChange={updateBasePrice} required disabled={getEditableDiscountPercent(product) > 0} /></label>
                        <label>Original price<input name="originalPrice" type="number" min="0" step="0.01" value={product.originalPrice ?? ''} onChange={updateOriginalPrice} /></label>
                        <label>Base discount (%)<input name="discountPercent" type="number" min="0" max="100" step="any" value={getEditableDiscountPercent(product)} onChange={updateDiscountPercent} /></label>
                        <label>Promotion discount (%)<input name="additionalDiscountPercent" type="number" min="0" max="100" step="any" value={product.additionalDiscountPercent ?? 0} onChange={updateAdditionalDiscount} /></label>
                        <label className="admin-checkbox-label"><input type="checkbox" checked={product.additionalOfferActive !== false} onChange={updateOfferActive} /> Activate additional offer</label>
                        <label>Offer expires at (optional)<input type="datetime-local" value={toDateTimeLocal(product.additionalOfferExpiresAt)} onChange={updateOfferExpiry} /></label>
                        <label>Stock<input name="stock" type="number" min="0" step="1" value={product.stock ?? ''} onChange={updateField} required /></label>
                    </div>
                    <p className="admin-status">Customer price after discounts: ₹{Number(product.price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    <fieldset className="product-visibility-options">
                        <legend>Storefront visibility</legend>
                        <label><input type="checkbox" checked={product.showInAllProducts !== false} onChange={(event) => setProduct((current) => ({ ...current, showInAllProducts: event.target.checked }))} /> Show in All Products and search results</label>
                        <label><input type="checkbox" checked={Boolean(product.showInCelebrate)} onChange={(event) => setProduct((current) => ({ ...current, showInCelebrate: event.target.checked }))} /> Include in Celebrate Every Moment</label>
                        <label><input type="checkbox" checked={Boolean(product.showInValue365)} onChange={(event) => setProduct((current) => ({ ...current, showInValue365: event.target.checked }))} /> Include in Value 365 lowest-price picks</label>
                        <label><input type="checkbox" checked={Boolean(product.showInRatingReviews)} onChange={(event) => setProduct((current) => ({ ...current, showInRatingReviews: event.target.checked }))} /> Include in Rating &amp; Reviews</label>
                        <label><input type="checkbox" checked={Boolean(product.showInSuggested)} onChange={(event) => setProduct((current) => ({ ...current, showInSuggested: event.target.checked }))} /> Allow in personalized Suggested for You</label>
                        <label><input type="checkbox" checked={Boolean(product.showInStillLooking)} onChange={(event) => setProduct((current) => ({ ...current, showInStillLooking: event.target.checked }))} /> Include in Still looking for these?</label>
                        <label><input type="checkbox" checked={Boolean(product.showInFeatured)} onChange={(event) => setProduct((current) => ({ ...current, showInFeatured: event.target.checked }))} /> Include in Picked for You carousel</label>
                        <label><input type="checkbox" checked={Boolean(product.showInBrandSpotlight)} onChange={(event) => setProduct((current) => ({ ...current, showInBrandSpotlight: event.target.checked }))} /> Include brand in Brands in Spotlight</label>
                        <label><input type="checkbox" checked={Boolean(product.showInSeasonalDeals)} onChange={(event) => setProduct((current) => ({ ...current, showInSeasonalDeals: event.target.checked }))} /> Include in Seasonal Deals</label>
                    </fieldset>
                    <label>Product image<input ref={imageInputRef} name="image" type="file" accept="image/*" onChange={(event) => setImageFile(event.target.files[0] || null)} /></label>
                    <label>Or update image URL<input name="imageUrl" type="url" value={product.imageUrl || ''} onChange={(event) => { updateField(event); setImageFile(null); if (imageInputRef.current) imageInputRef.current.value = ''; }} /></label>
                    {(imagePreview || product.imageUrl) && <img className="admin-product-image-preview" src={imagePreview || product.imageUrl} alt={`Preview of ${product.name}`} />}
                    {message && <p className="admin-success" role="status">{message}</p>}
                    <div className="admin-form-actions"><Link className="admin-text-link" to="/admin/products/edit">Cancel</Link><button className="admin-action" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save changes'}</button></div>
                </form>
            )}
        </main>
    );
};

export default EditProduct;