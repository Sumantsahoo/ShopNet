import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import ProductFilters from '../components/ProductFilters';
import { apiFetch } from '../utils/api';
import { getCategoryIcon, getCategoryImageUrl, getCategoryLabel, getCategorySlug, PRODUCT_CATEGORIES } from '../utils/categories';
import { readProductCache, saveProductCache } from '../utils/productCache';
import { getProductImageUrl } from '../utils/productImage';
import { EMPTY_PRODUCT_FILTERS, filterAndSortProducts } from '../utils/productFilters';
import '../styles/home.css';

const Categories = () => {
    const navigate = useNavigate();
    const { category: routeCategory } = useParams();
    const [cachedProducts] = useState(readProductCache);
    const [products, setProducts] = useState(cachedProducts || []);
    const [filters, setFilters] = useState(EMPTY_PRODUCT_FILTERS);
    const [sortOrder, setSortOrder] = useState('recommended');
    const [loading, setLoading] = useState(cachedProducts === null);
    const [error, setError] = useState('');

    useEffect(() => {
        let cancelled = false;
        const loadProducts = async () => {
            try {
                const response = await apiFetch('/api/products');
                const data = await response.json();
                if (!response.ok || !Array.isArray(data)) {
                    const message = data && typeof data.message === 'string'
                        ? data.message
                        : 'Could not load product categories.';
                    throw new Error(message);
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

    const catalogProducts = useMemo(
        () => products.filter((product) => product.showInAllProducts !== false),
        [products]
    );
    const categories = useMemo(() => {
        const options = [...PRODUCT_CATEGORIES];
        const knownSlugs = new Set(options.map((item) => item.slug));
        catalogProducts.forEach((product) => {
            const label = String(product.category || '').trim();
            const slug = getCategorySlug(label);
            if (label && !knownSlugs.has(slug)) {
                options.push({ slug, label });
                knownSlugs.add(slug);
            }
        });
        return options.map((item) => ({
            ...item,
            imageUrl: getCategoryImageUrl(item.slug, catalogProducts)
        }));
    }, [catalogProducts]);
    const activeCategorySlug = routeCategory ? getCategorySlug(routeCategory) : '';
    const categoryProducts = useMemo(() => catalogProducts.filter((product) => (
        !activeCategorySlug || getCategorySlug(product.category) === activeCategorySlug
    )), [activeCategorySlug, catalogProducts]);
    const filteredProducts = useMemo(
        () => filterAndSortProducts(categoryProducts, filters, sortOrder),
        [categoryProducts, filters, sortOrder]
    );
    const categoryTitle = activeCategorySlug
        ? categories.find((item) => item.slug === activeCategorySlug)?.label || getCategoryLabel(activeCategorySlug)
        : 'Choose a category';

    const selectCategory = (slug) => {
        setFilters(EMPTY_PRODUCT_FILTERS);
        setSortOrder('recommended');
        navigate(slug ? `/category/${slug}` : '/categories');
    };

    return (
        <main className="category-shop-layout">
            <aside className="category-filter-sidebar" aria-label="Product categories">
                <h1>Categories</h1>
                {categories.map((category) => (
                    <button
                        className={routeCategory === category.slug ? 'is-selected' : ''}
                        key={category.slug}
                        type="button"
                        onClick={() => selectCategory(category.slug)}
                    >
                        <span className="category-filter-icon" aria-hidden="true">
                            <img
                                src={getProductImageUrl(category.imageUrl, 80)}
                                alt=""
                                onError={(event) => { event.currentTarget.hidden = true; }}
                            />
                            <span>{getCategoryIcon(category.slug)}</span>
                        </span>
                        <span className="category-filter-name">{category.label}</span>
                    </button>
                ))}
            </aside>
            <section className="category-shop-results">
                <header className="category-shop-heading">
                    <div><h2>{categoryTitle}</h2></div>
                    {activeCategorySlug && (
                        <p>{filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'}</p>
                    )}
                </header>
                {error && <p className="product-load-message" role={products.length ? 'status' : 'alert'}>{error}</p>}
                {activeCategorySlug && !loading && catalogProducts.length > 0 && (
                    <ProductFilters
                        products={categoryProducts.length ? categoryProducts : catalogProducts}
                        optionProducts={catalogProducts}
                        filters={filters}
                        onFilterChange={(name, value) => setFilters((current) => ({ ...current, [name]: value }))}
                        sortOrder={sortOrder}
                        onSortChange={setSortOrder}
                        onClear={() => {
                            setFilters(EMPTY_PRODUCT_FILTERS);
                            setSortOrder('recommended');
                        }}
                    />
                )}
                {!activeCategorySlug ? (
                    <section className="category-products-empty">
                        <h2>Select a category to browse products</h2>
                        <p>Choose Fashion or another category from the list.</p>
                    </section>
                ) : loading && products.length === 0 ? (
                    <div className="category-image-placeholder"><img src="/logo.png" alt="ShopNest" /></div>
                ) : filteredProducts.length > 0 ? (
                    <div className="product-grid">
                        {filteredProducts.map((product) => <ProductCard key={product._id} product={product} />)}
                    </div>
                ) : (
                    <section className="category-products-empty">
                        <h2>{categoryProducts.length ? 'No products match these filters' : 'No products in this category yet'}</h2>
                        <p>Try another category or clear some filters.</p>
                        <Link to="/shop">Browse the full catalog</Link>
                    </section>
                )}
            </section>
        </main>
    );
};

export default Categories;
