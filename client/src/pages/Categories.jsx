import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { apiFetch } from '../utils/api';
import { getCategorySlug, PRODUCT_CATEGORIES } from '../utils/categories';
import { readProductCache, saveProductCache } from '../utils/productCache';
import '../styles/home.css';

const CATEGORY_ICONS = {
    fashion: '👗',
    mobiles: '📱',
    electronics: '🎧',
    beauty: '💄',
    'home-appliances': '🏠',
    toys: '🧸',
    bags: '👜',
    'food-grocery': '🛒',
    'auto-accessories': '🚗',
    sports: '⚽',
    furniture: '🛋️',
    books: '📚',
    'two-wheelers': '🏍️'
};

const Categories = () => {
    const [cachedProducts] = useState(readProductCache);
    const [products, setProducts] = useState(cachedProducts || []);
    const [loading, setLoading] = useState(cachedProducts === null);
    const [error, setError] = useState('');

    useEffect(() => {
        let cancelled = false;
        const loadProducts = async () => {
            try {
                const response = await apiFetch('/api/products');
                const data = await response.json();
                if (!response.ok || !Array.isArray(data)) {
                    throw new Error(data.message || 'Could not load product categories.');
                }
                if (!cancelled) {
                    setProducts(data);
                    saveProductCache(data);
                    setError('');
                }
            } catch (loadError) {
                if (!cancelled) {
                    setError(cachedProducts === null
                        ? loadError.message || 'Could not load product categories.'
                        : 'Could not refresh products. Showing recently saved product information.');
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        loadProducts();
        return () => { cancelled = true; };
    }, [cachedProducts]);

    const categories = useMemo(() => {
        const options = [...PRODUCT_CATEGORIES];
        const knownSlugs = new Set(options.map((category) => category.slug));
        products.forEach((product) => {
            const label = String(product.category || '').trim();
            const slug = getCategorySlug(label);
            if (label && !knownSlugs.has(slug)) {
                options.push({ slug, label });
                knownSlugs.add(slug);
            }
        });
        return options.map((category) => ({
            ...category,
            count: products.filter((product) => getCategorySlug(product.category) === category.slug).length
        }));
    }, [products]);

    return (
        <main className="category-directory">
            <header>
                <span>SHOPNEST 365</span>
                <h1>Shop by category</h1>
                <p>Explore every department, then find your next favorite product.</p>
            </header>
            {error && <p className="product-load-message" role={products.length ? 'status' : 'alert'}>{error}</p>}
            {!loading && products.length === 0 && !error && <p className="category-products-empty">No products are available yet. Please check back soon.</p>}
            <>
                <nav className="category-icon-strip" aria-label="Shop by category">
                    <Link to="/shop" className="category-icon-link">
                        <span className="category-directory-icon" aria-hidden="true">▦</span>
                        <strong>All</strong>
                        <small>{products.length} products</small>
                    </Link>
                    {categories.map((category) => (
                        <Link to={`/category/${category.slug}`} className="category-icon-link" key={category.slug}>
                            <span className="category-directory-icon" aria-hidden="true">{CATEGORY_ICONS[category.slug] || '📦'}</span>
                            <strong>{category.label}</strong>
                            <small>{category.count} {category.count === 1 ? 'product' : 'products'}</small>
                        </Link>
                    ))}
                </nav>

                <section className="category-products-section">
                    <header>
                        <div>
                            <span>SHOPNEST PICKS</span>
                            <h2>Explore products</h2>
                        </div>
                        <Link to="/shop">View all products <span aria-hidden="true">→</span></Link>
                    </header>
                    {loading && products.length === 0 ? (
                        <div className="category-image-placeholder">
                            <img src="/logo.png" alt="ShopNest" />
                        </div>
                    ) : products.length > 0 ? (
                        <div className="product-grid">
                            {products.map((product) => <ProductCard key={product._id} product={product} />)}
                        </div>
                    ) : null}
                </section>
            </>
        </main>
    );
};

export default Categories;
