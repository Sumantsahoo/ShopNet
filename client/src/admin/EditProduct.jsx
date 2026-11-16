import React, { useContext, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { apiFetch } from '../utils/api';
import './admin.css';

const EditProduct = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const { id } = useParams();
    const [products, setProducts] = useState([]);
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (!user?.token) {
            navigate('/login');
            return;
        }
        if (user.role !== 'admin') {
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
    }, [user, navigate, id]);

    const updateField = (event) => {
        const { name, value } = event.target;
        setProduct((current) => ({ ...current, [name]: value }));
    };

    const saveProduct = async (event) => {
        event.preventDefault();
        setSaving(true);
        setError('');
        setMessage('');
        try {
            const response = await apiFetch(`/api/products/${product._id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${user.token}`
                },
                body: JSON.stringify({
                    name: product.name,
                    brand: product.brand || '',
                    description: product.description,
                    category: product.category,
                    price: product.price,
                    originalPrice: product.originalPrice || '',
                    stock: product.stock,
                    imageUrl: product.imageUrl
                })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Could not update product.');
            setProduct(data);
            setMessage('Product updated successfully.');
            setProducts((current) => current.map((item) => item._id === data._id ? data : item));
        } catch (saveError) {
            setError(saveError.message || 'Could not update product.');
        } finally {
            setSaving(false);
        }
    };

    if (user?.role !== 'admin') {
        return <main className="admin-page"><p className="admin-alert">Admin access required.</p></main>;
    }

    return (
        <main className="admin-page">
            <header className="admin-heading"><div><p className="admin-eyebrow">SHOPNEST / ADMIN</p><h1>{product ? 'Edit product' : 'Products'}</h1></div></header>
            {loading && <p className="admin-status">Loading products...</p>}
            {error && <p className="admin-alert" role="alert">{error}</p>}
            {!loading && !id && (
                <div className="admin-table-wrap">
                    <table className="admin-table">
                        <thead><tr><th>Product</th><th>Brand</th><th>Category</th><th>Price</th><th>Rating</th><th>Stock</th><th></th></tr></thead>
                        <tbody>
                            {products.map((item) => (
                                <tr key={item._id}>
                                    <td>{item.name}</td><td>{item.brand || '—'}</td><td>{item.category}</td>
                                    <td>
                                        ₹{Number(item.price).toLocaleString('en-IN')}
                                        {Number(item.originalPrice) > Number(item.price) && <del className="admin-original-price">₹{Number(item.originalPrice).toLocaleString('en-IN')}</del>}
                                    </td>
                                    <td>★ {Number(item.rating || 0).toFixed(1)} ({Number(item.numReviews || 0)})</td><td>{item.stock}</td>
                                    <td><Link className="admin-text-link" to={`/admin/products/${item._id}/edit`}>Edit</Link></td>
                                </tr>
                            ))}
                            {products.length === 0 && <tr><td colSpan="7">No products found.</td></tr>}
                        </tbody>
                    </table>
                </div>
            )}
            {!loading && product && (
                <form className="admin-edit-form" onSubmit={saveProduct}>
                    <label>Product name<input name="name" value={product.name || ''} onChange={updateField} required /></label>
                    <label>Brand (optional)<input name="brand" value={product.brand || ''} onChange={updateField} maxLength={80} /></label>
                    <label>Description<textarea name="description" value={product.description || ''} onChange={updateField} required rows="5" /></label>
                    <div className="admin-form-row">
                        <label>Category<input name="category" value={product.category || ''} onChange={updateField} required /></label>
                        <label>Price<input name="price" type="number" min="0" step="0.01" value={product.price ?? ''} onChange={updateField} required /></label>
                        <label>Original price (optional)<input name="originalPrice" type="number" min="0" step="0.01" value={product.originalPrice ?? ''} onChange={updateField} /></label>
                        <label>Stock<input name="stock" type="number" min="0" step="1" value={product.stock ?? ''} onChange={updateField} required /></label>
                    </div>
                    <label>Image URL<input name="imageUrl" type="url" value={product.imageUrl || ''} onChange={updateField} /></label>
                    {message && <p className="admin-success" role="status">{message}</p>}
                    <div className="admin-form-actions"><Link className="admin-text-link" to="/admin/products/edit">Cancel</Link><button className="admin-action" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save changes'}</button></div>
                </form>
            )}
        </main>
    );
};

export default EditProduct;