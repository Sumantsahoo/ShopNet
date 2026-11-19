import React, { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { apiFetch } from '../utils/api';
import { PRODUCT_CATEGORIES } from '../utils/categories';
import { readProductCache, saveProductCache } from '../utils/productCache';
import { calculateDiscountedPrice, calculateFinalPrice } from '../utils/productPricing';
import '../styles/auth.css';

const AdminProductUpload = () => {
    const { user } = useContext(AuthContext);
    const [name, setName] = useState('');
    const [brand, setBrand] = useState('');
    const [color, setColor] = useState('');
    const [gender, setGender] = useState('');
    const [countryOfOrigin, setCountryOfOrigin] = useState('');
    const [occasion, setOccasion] = useState('');
    const [sizes, setSizes] = useState('');
    const [fastDelivery, setFastDelivery] = useState(false);
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState('');
    const [originalPrice, setOriginalPrice] = useState('');
    const [discountPercent, setDiscountPercent] = useState('0');
    const [additionalDiscountPercent, setAdditionalDiscountPercent] = useState('0');
    const [additionalOfferActive, setAdditionalOfferActive] = useState(true);
    const [additionalOfferExpiresAt, setAdditionalOfferExpiresAt] = useState('');
    const [category, setCategory] = useState('');
    const [customCategory, setCustomCategory] = useState('');
    const [stock, setStock] = useState('');
    const [showInAllProducts, setShowInAllProducts] = useState(true);
    const [showInCelebrate, setShowInCelebrate] = useState(false);
    const [showInValue365, setShowInValue365] = useState(false);
    const [showInRatingReviews, setShowInRatingReviews] = useState(false);
    const [showInSuggested, setShowInSuggested] = useState(false);
    const [showInStillLooking, setShowInStillLooking] = useState(false);
    const [showInFeatured, setShowInFeatured] = useState(false);
    const [showInBrandSpotlight, setShowInBrandSpotlight] = useState(false);
    const [showInSeasonalDeals, setShowInSeasonalDeals] = useState(false);
    const [image, setImage] = useState(null);
    const [imageUrl, setImageUrl] = useState('');
    const [imagePreview, setImagePreview] = useState('');
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const baseSalePrice = Number(discountPercent) > 0 && originalPrice
        ? calculateDiscountedPrice(originalPrice, discountPercent)
        : Number(price);
    const customerPrice = calculateFinalPrice(baseSalePrice, additionalDiscountPercent, additionalOfferActive, additionalOfferExpiresAt || undefined);

    useEffect(() => {
        if (!image) {
            setImagePreview('');
            return undefined;
        }

        const previewUrl = URL.createObjectURL(image);
        setImagePreview(previewUrl);

        return () => URL.revokeObjectURL(previewUrl);
    }, [image]);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setMessage('');

        if (!user?.token) {
            setMessage('Please log in with an authorized account before uploading a product.');
            return;
        }

        if (!image && !imageUrl.trim()) {
            setMessage('Please choose an image file to upload or enter an image URL.');
            return;
        }

        const selectedCategory = category === '__custom' ? customCategory.trim() : category;
        if (!selectedCategory) {
            setMessage('Please choose or enter a product category.');
            return;
        }
        if (Number(discountPercent) > 0 && !Number(originalPrice)) {
            setMessage('Enter the original price before setting a discount.');
            return;
        }
        const offerExpiry = additionalOfferExpiresAt ? new Date(additionalOfferExpiresAt) : null;
        if (offerExpiry && Number.isNaN(offerExpiry.getTime())) {
            setMessage('Enter a valid promotion expiry date.');
            return;
        }

        const basePrice = baseSalePrice;
        if (!Number.isFinite(basePrice) || basePrice < 0) {
            setMessage('Enter a valid base price.');
            return;
        }
        const formData = new FormData();
        formData.append('name', name);
        if (brand.trim()) formData.append('brand', brand.trim());
        formData.append('color', color.trim());
        formData.append('gender', gender);
        formData.append('countryOfOrigin', countryOfOrigin.trim());
        formData.append('occasion', occasion.trim());
        formData.append('sizes', sizes);
        formData.append('fastDelivery', String(fastDelivery));
        formData.append('description', description);
        formData.append('price', String(basePrice));
        if (originalPrice) formData.append('originalPrice', originalPrice);
        formData.append('discountPercent', discountPercent);
        formData.append('additionalDiscountPercent', additionalDiscountPercent);
        formData.append('additionalOfferActive', String(additionalOfferActive));
        formData.append('additionalOfferExpiresAt', offerExpiry ? offerExpiry.toISOString() : '');
        formData.append('category', selectedCategory);
        formData.append('stock', stock);
        formData.append('showInAllProducts', String(showInAllProducts));
        formData.append('showInCelebrate', String(showInCelebrate));
        formData.append('showInValue365', String(showInValue365));
        formData.append('showInRatingReviews', String(showInRatingReviews));
        formData.append('showInSuggested', String(showInSuggested));
        formData.append('showInStillLooking', String(showInStillLooking));
        formData.append('showInFeatured', String(showInFeatured));
        formData.append('showInBrandSpotlight', String(showInBrandSpotlight));
        formData.append('showInSeasonalDeals', String(showInSeasonalDeals));
        if (image) {
            formData.append('image', image);
        }
        if (imageUrl.trim()) {
            formData.append('imageUrl', imageUrl.trim());
        }

        setIsSubmitting(true);
        try {
            const response = await apiFetch('/api/products', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${user.token}`
                },
                body: formData
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Product upload failed.');
            }

            const cachedProducts = readProductCache() || [];
            saveProductCache([
                data,
                ...cachedProducts.filter((product) => String(product._id) !== String(data._id))
            ]);
            setMessage(`Product "${data.name}" uploaded successfully.`);
            setName('');
            setBrand('');
            setColor('');
            setGender('');
            setCountryOfOrigin('');
            setOccasion('');
            setSizes('');
            setFastDelivery(false);
            setDescription('');
            setPrice('');
            setOriginalPrice('');
            setDiscountPercent('0');
            setAdditionalDiscountPercent('0');
            setAdditionalOfferActive(true);
            setAdditionalOfferExpiresAt('');
            setCategory('');
            setCustomCategory('');
            setStock('');
            setShowInAllProducts(true);
            setShowInCelebrate(false);
            setShowInValue365(false);
            setShowInRatingReviews(false);
            setShowInSuggested(false);
            setShowInStillLooking(false);
            setShowInFeatured(false);
            setShowInBrandSpotlight(false);
            setShowInSeasonalDeals(false);
            setImage(null);
            setImageUrl('');
            event.target.reset();
        } catch (error) {
            console.error('Product upload failed:', error);
            setMessage(error.message || 'Could not upload the product. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!['admin', 'employee'].includes(user?.role)) {
        return (
            <div className="auth-container">
                <div className="auth-form">
                    <h2>Product management access required</h2>
                    <p>Log in with an admin or active employee account to upload products.</p>
                    <Link to="/login">Go to login</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-container">
            <form onSubmit={handleSubmit} className="auth-form">
                <h2>Upload a product</h2>
                <input
                    type="text"
                    placeholder="Product name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                />
                <input type="text" placeholder="Brand (optional)" value={brand} onChange={(event) => setBrand(event.target.value)} maxLength={80} />
                <input type="text" placeholder="Color (optional, e.g. Blue)" value={color} onChange={(event) => setColor(event.target.value)} maxLength={50} />
                <select value={gender} onChange={(event) => setGender(event.target.value)}>
                    <option value="">Gender (optional)</option>
                    <option value="Men">Men</option>
                    <option value="Women">Women</option>
                    <option value="Unisex">Unisex</option>
                    <option value="Kids">Kids</option>
                </select>
                <input type="text" placeholder="Country of origin (optional)" value={countryOfOrigin} onChange={(event) => setCountryOfOrigin(event.target.value)} maxLength={60} />
                <input type="text" placeholder="Occasion (optional, e.g. Wedding)" value={occasion} onChange={(event) => setOccasion(event.target.value)} maxLength={80} />
                <input type="text" placeholder="Sizes (optional, comma separated, e.g. S, M, L)" value={sizes} onChange={(event) => setSizes(event.target.value)} maxLength={120} />
                <label className="admin-fast-delivery"><input type="checkbox" checked={fastDelivery} onChange={(event) => setFastDelivery(event.target.checked)} /> Eligible for delivery in 2 days</label>
                <textarea
                    placeholder="Description"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    required
                />
                <label>Base price before additional promotion
                    <input
                        type="number"
                        placeholder="Price"
                        value={Number(discountPercent) > 0 && originalPrice
                            ? calculateDiscountedPrice(originalPrice, discountPercent)
                            : price}
                        onChange={(event) => setPrice(event.target.value)}
                        min="0"
                        step="0.01"
                        required={Number(discountPercent) === 0}
                        disabled={Number(discountPercent) > 0}
                    />
                </label>
                <fieldset className="product-visibility-options">
                    <legend>Where should this product appear?</legend>
                    <label><input type="checkbox" checked={showInAllProducts} onChange={(event) => setShowInAllProducts(event.target.checked)} /> All Products</label>
                    <label><input type="checkbox" checked={showInCelebrate} onChange={(event) => setShowInCelebrate(event.target.checked)} /> Celebrate Every Moment</label>
                    <label><input type="checkbox" checked={showInValue365} onChange={(event) => setShowInValue365(event.target.checked)} /> Value 365 (lowest prices)</label>
                    <label><input type="checkbox" checked={showInRatingReviews} onChange={(event) => setShowInRatingReviews(event.target.checked)} /> Rating &amp; Reviews</label>
                    <label><input type="checkbox" checked={showInSuggested} onChange={(event) => setShowInSuggested(event.target.checked)} /> Suggested for You (eligible for personalized picks)</label>
                    <label><input type="checkbox" checked={showInStillLooking} onChange={(event) => setShowInStillLooking(event.target.checked)} /> Still looking for these? (match recent searches)</label>
                    <label><input type="checkbox" checked={showInFeatured} onChange={(event) => setShowInFeatured(event.target.checked)} /> Picked for You carousel</label>
                    <label><input type="checkbox" checked={showInBrandSpotlight} onChange={(event) => setShowInBrandSpotlight(event.target.checked)} /> Brands in Spotlight</label>
                    <label><input type="checkbox" checked={showInSeasonalDeals} onChange={(event) => setShowInSeasonalDeals(event.target.checked)} /> Seasonal Deals</label>
                </fieldset>
                <select value={category} onChange={(event) => setCategory(event.target.value)} required>
                    <option value="">Choose a product category</option>
                    {PRODUCT_CATEGORIES.map(({ slug, label }) => <option key={slug} value={label}>{label}</option>)}
                    <option value="__custom">Other / custom category</option>
                </select>
                {category === '__custom' && <input type="text" placeholder="Enter custom category (e.g. Pants)" value={customCategory} onChange={(event) => setCustomCategory(event.target.value)} maxLength={60} required />}
                <input type="number" placeholder="Original price (before discount)" value={originalPrice} onChange={(event) => setOriginalPrice(event.target.value)} min="0" step="0.01" />
                <label>Base discount (%)
                    <input type="number" value={discountPercent} onChange={(event) => setDiscountPercent(event.target.value)} min="0" max="100" step="1" />
                </label>
                <label>Promotion discount (%)
                    <input
                        type="number"
                        value={additionalDiscountPercent}
                        onChange={(event) => setAdditionalDiscountPercent(event.target.value)}
                        min="0"
                        max="100"
                        step="1"
                    />
                </label>
                <label className="admin-checkbox-label">
                    <input type="checkbox" checked={additionalOfferActive} onChange={(event) => setAdditionalOfferActive(event.target.checked)} />
                    Activate additional offer
                </label>
                <label>Offer expires at (optional)
                    <input type="datetime-local" value={additionalOfferExpiresAt} onChange={(event) => setAdditionalOfferExpiresAt(event.target.value)} />
                </label>
                {((Number(discountPercent) > 0 && originalPrice) || Number(price) > 0) && (
                    <p className="admin-discount-preview">
                        Customer price: ₹{customerPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                )}
                <input
                    type="number"
                    placeholder="Stock"
                    value={stock}
                    onChange={(event) => setStock(event.target.value)}
                    min="0"
                    step="1"
                    required
                />
                <div style={{ width: '100%', margin: '10px 0', textAlign: 'left' }}>
                    <label style={{ fontSize: '0.85rem', color: '#a1a1aa', display: 'block', marginBottom: '5px' }}>
                        Product Image File (uploads to Cloudinary):
                    </label>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={(event) => {
                            const selected = event.target.files[0] || null;
                            setImage(selected);
                            if (selected) setImageUrl('');
                        }}
                    />
                    <div style={{ textAlign: 'center', color: '#71717a', fontSize: '0.85rem', margin: '6px 0' }}>— OR —</div>
                    <input
                        type="url"
                        placeholder="Paste image URL (e.g. https://...)"
                        value={imageUrl}
                        onChange={(event) => {
                            setImageUrl(event.target.value);
                            if (event.target.value) setImage(null);
                        }}
                    />
                </div>
                {(imagePreview || imageUrl) && (
                    <img
                        src={imagePreview || imageUrl}
                        alt="Selected product preview"
                        style={{ display: 'block', maxWidth: '100%', maxHeight: '240px', objectFit: 'contain', margin: '10px auto', borderRadius: '8px' }}
                    />
                )}
                {message && <p role="status">{message}</p>}
                <button type="submit" className="btn" disabled={isSubmitting}>
                    {isSubmitting ? 'Uploading…' : 'Upload product'}
                </button>
            </form>
        </div>
    );
};

export default AdminProductUpload;
