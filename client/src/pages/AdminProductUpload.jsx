import React, { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { apiFetch } from '../utils/api';
import '../styles/auth.css';

const AdminProductUpload = () => {
    const { user } = useContext(AuthContext);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState('');
    const [category, setCategory] = useState('');
    const [stock, setStock] = useState('');
    const [image, setImage] = useState(null);
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

        if (!image) {
            setMessage('Please choose an image before uploading the product.');
            return;
        }

        const formData = new FormData();
        formData.append('name', name);
        formData.append('description', description);
        formData.append('price', price);
        formData.append('category', category);
        formData.append('stock', stock);
        formData.append('image', image);

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
            setDescription('');
            setPrice('');
            setCategory('');
            setStock('');
            setImage(null);
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
                <input
                    type="text"
                    placeholder="Category"
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                    required
                />
                <input
                    type="number"
                    placeholder="Stock"
                    value={stock}
                    onChange={(event) => setStock(event.target.value)}
                    min="0"
                    step="1"
                    required
                />
                <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => setImage(event.target.files[0] || null)}
                />
                {imagePreview && (
                    <img
                        src={imagePreview}
                        alt="Selected product preview"
                        style={{ display: 'block', maxWidth: '100%', maxHeight: '240px', objectFit: 'contain', margin: '0 auto' }}
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
