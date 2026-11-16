import React, { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { apiFetch } from '../utils/api';
import { PRODUCT_CATEGORIES } from '../utils/categories';
import '../styles/auth.css';

const AdminProductUpload = () => {
    const { user } = useContext(AuthContext);
    const [name, setName] = useState('');
    const [brand, setBrand] = useState('');
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState('');
    const [originalPrice, setOriginalPrice] = useState('');
    const [category, setCategory] = useState('');
    const [customCategory, setCustomCategory] = useState('');
    const [stock, setStock] = useState('');
    const [image, setImage] = useState(null);
    const [imageUrl, setImageUrl] = useState('');
    const [imagePreview, setImagePreview] = useState('');
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

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
            setMessage('Please log in with an admin account before uploading a product.');
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

        const formData = new FormData();
        formData.append('name', name);
        if (brand.trim()) formData.append('brand', brand.trim());
        formData.append('description', description);
        formData.append('price', price);
        if (originalPrice) formData.append('originalPrice', originalPrice);
        formData.append('category', selectedCategory);
        formData.append('stock', stock);
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

            setMessage(`Product "${data.name}" uploaded successfully.`);
            setName('');
            setBrand('');
            setDescription('');
            setPrice('');
            setOriginalPrice('');
            setCategory('');
            setCustomCategory('');
            setStock('');
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

    if (user?.role !== 'admin') {
        return (
            <div className="auth-container">
                <div className="auth-form">
                    <h2>Admin access required</h2>
                    <p>Log in with an admin account to upload products.</p>
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
                <textarea
                    placeholder="Description"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    required
                />
                <input
                    type="number"
                    placeholder="Price"
                    value={price}
                    onChange={(event) => setPrice(event.target.value)}
                    min="0"
                    step="0.01"
                    required
                />
                <select value={category} onChange={(event) => setCategory(event.target.value)} required>
                    <option value="">Choose a product category</option>
                    {PRODUCT_CATEGORIES.map(({ slug, label }) => <option key={slug} value={label}>{label}</option>)}
                    <option value="__custom">Other / custom category</option>
                </select>
                {category === '__custom' && <input type="text" placeholder="Enter custom category (e.g. Pants)" value={customCategory} onChange={(event) => setCustomCategory(event.target.value)} maxLength={60} required />}
                <input type="number" placeholder="Original price (optional, for sale display)" value={originalPrice} onChange={(event) => setOriginalPrice(event.target.value)} min={price || 0} step="0.01" />
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
