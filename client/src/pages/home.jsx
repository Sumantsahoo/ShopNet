import React from "react";
import { useContext, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams, useSearchParams } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import { useLanguage } from '../context/LanguageContext';
import { apiFetch } from '../utils/api';
import { getCategoryLabel, getCategorySlug, PRODUCT_CATEGORIES } from '../utils/categories';
import { AuthContext } from '../context/AuthContext';
import { readProductCache, saveProductCache } from '../utils/productCache';
import '../styles/home.css';

const Home=() =>{
    const { pathname } = useLocation();
    const { category: routeCategory } = useParams();
    const [searchParams] = useSearchParams();
    const { t } = useLanguage();
    const { user } = useContext(AuthContext);
    const isShopPage = pathname === '/shop';
    const isHomePage = pathname === '/';
    const isValuePage = pathname === '/value-365';
    const searchTerm = searchParams.get('search')?.trim() || '';
    const brandFilter = searchParams.get('brand')?.trim() || '';
    const activeCategory = routeCategory || 'all';
    const [cachedProducts] = useState(readProductCache);
    const [products, setProducts] = useState(cachedProducts || []);
    const [heroIndex, setHeroIndex] = useState(0);
    const [recentSearches, setRecentSearches] = useState([]);
    const [loading,setLoading] = useState(cachedProducts === null);
    const [error,setError] = useState('');

    useEffect(() => {
        const fetchProducts=async() =>{
            try{
                const res=await apiFetch('/api/products');
                if (!res.ok) {
                    throw new Error(`Products request failed (${res.status})`);
                }
                const data=await res.json();
                if (!Array.isArray(data)) {
                    throw new Error('The products response was not a list.');
                }
                setProducts(data);
                saveProductCache(data);
                setError('');
            }
            catch(error){
                 console.error('Could not load products:', error);
                 setError(cachedProducts === null
                    ? 'Products could not be loaded. Please try again in a moment.'
                    : 'Could not refresh products. Showing recently saved product information.');
            }
            finally{
                setLoading(false);
            }
        };
        fetchProducts();
    }, [cachedProducts]);

    useEffect(() => {
        try {
            const recent = JSON.parse(localStorage.getItem('shopnest-recent-searches') || '[]');
            setRecentSearches(Array.isArray(recent) ? recent.filter((term) => typeof term === 'string').slice(0, 6) : []);
        } catch (error) {
            console.error('Could not load recent searches:', error);
            setRecentSearches([]);
        }
    }, [searchParams]);

    useEffect(() => {
        if (products.length < 2) return undefined;
        const timer = window.setInterval(() => {
            setHeroIndex((current) => (current + 1) % products.length);
        }, 1000);
        return () => window.clearInterval(timer);
    }, [products.length]);

    const visibleProducts = useMemo(() => {
        const query = searchTerm.toLocaleLowerCase();
        const filtered = products.filter((product) => {
            const categoryMatches = activeCategory === 'all' || getCategorySlug(product.category) === activeCategory;
            const searchMatches = !query || [product.name, product.description, product.category]
                .some((value) => String(value || '').toLocaleLowerCase().includes(query));
            const brandMatches = !brandFilter || String(product.brand || '').toLocaleLowerCase() === brandFilter.toLocaleLowerCase();
            return categoryMatches && searchMatches && brandMatches;
        });
        return isValuePage ? filtered.sort((left, right) => Number(left.price) - Number(right.price)) : filtered;
    }, [activeCategory, brandFilter, isValuePage, products, searchTerm]);

    const recommendedProducts = useMemo(() => [...products].sort((left, right) => (
        Number(right.rating || 0) - Number(left.rating || 0) || new Date(right.createdAt || 0) - new Date(left.createdAt || 0)
    )).slice(0, 4), [products]);
    const valueProducts = useMemo(() => [...products].sort((left, right) => Number(left.price) - Number(right.price)).slice(0, 4), [products]);
    const celebrationProducts = useMemo(() => {
        const celebration = products.filter((product) => ['beauty', 'toys', 'fashion', 'food-grocery', 'bags'].includes(getCategorySlug(product.category)));
        return (celebration.length ? celebration : products).slice(0, 4);
    }, [products]);
    const spotlightBrands = useMemo(() => [...new Set(products.map((product) => String(product.brand || '').trim()).filter(Boolean))].slice(0, 8), [products]);
    const heroProduct = products.length ? products[heroIndex % products.length] : null;
    const categoryOptions = useMemo(() => {
        const categories = [...PRODUCT_CATEGORIES];
        const knownSlugs = new Set(categories.map((category) => category.slug));
        products.forEach((product) => {
            const label = String(product.category || '').trim();
            const slug = getCategorySlug(label);
            if (label && !knownSlugs.has(slug)) {
                categories.push({ slug, label });
                knownSlugs.add(slug);
            }
        });
        return categories;
    }, [products]);
    const activeCategoryLabel = categoryOptions.find((category) => category.slug === activeCategory)?.label || getCategoryLabel(activeCategory);

    return (
        <main className='home-container'>
            {isHomePage && activeCategory === 'all' && !searchTerm && (
                <>
                <div className="hero-banner">
                    <img
                        key={heroProduct?._id || 'shopnest-logo'}
                        src={heroProduct?.imageUrl || '/logo.png'}
                        alt=""
                        className={heroProduct?.imageUrl ? 'hero-product-image' : 'hero-product-image is-shopnest-logo'}
                    />
                    <div className="hero-copy">
                        <span className="hero-eyebrow">SHOPNEST 365</span>
                        <h1>{user?.name ? `Hello, ${user.name}` : t('welcome')}</h1>
                        <p>{heroProduct ? `${heroProduct.name} · ${t('discover')}` : t('discover')}</p>
                        <div className="hero-actions"><Link to="/shop">Explore products</Link><Link to="/value-365">Shop Value 365</Link></div>
                    </div>
                </div>
                {recentSearches.length > 0 && (
                    <section className="recent-search-section">
                        <h2>Still looking for these?</h2>
                        <div>{recentSearches.map((term) => <Link key={term} to={`/shop?search=${encodeURIComponent(term)}`}>{term}<span> ↗</span></Link>)}</div>
                    </section>
                )}
                </>
            )}
            <section className="storefront-layout">
                <div className="storefront-results">
                    <header className="storefront-heading">
                        <div>
                            <span>SHOPNEST STOREFRONT</span>
                            <h1>{searchTerm ? `Results for “${searchTerm}”` : brandFilter ? `Brand: ${brandFilter}` : isValuePage ? 'Value 365 · Lowest prices' : activeCategory === 'all' ? (isShopPage ? t('shopAll') : t('allProducts')) : activeCategoryLabel}</h1>
                        </div>
                        {!loading && <p>{visibleProducts.length} {visibleProducts.length === 1 ? 'product' : 'products'}</p>}
                    </header>
                    {error && <p className="product-load-message" role={products.length ? 'status' : 'alert'}>{error}</p>}
                    {!loading && products.length === 0 && !error ? (
                        <section className="storefront-empty">
                            <h2>No products yet</h2>
                            <p>Check back soon to see what’s available.</p>
                        </section>
                    ) : !loading && products.length > 0 && visibleProducts.length === 0 ? (
                        <section className="storefront-empty">
                            <h2>{searchTerm ? 'No matching products' : 'Nothing in this category yet'}</h2>
                            <p>{searchTerm ? 'Try another product name or category.' : 'Explore other categories to find something you like.'}</p>
                            <Link to="/shop">Browse all products</Link>
                        </section>
                    ) : !loading && visibleProducts.length > 0 ? (
                        <div className="product-grid">
                            {visibleProducts.map((product) => <ProductCard key={product._id} product={product} />)}
                        </div>
                    ) : null}
                </div>
            </section>
            {isHomePage && !searchTerm && (
                <div className="home-discovery-sections">
                    {spotlightBrands.length > 0 && (
                        <section className="discovery-section">
                            <header><div><span>BRANDS IN SPOTLIGHT</span><h2>Explore popular brands</h2></div></header>
                            <div className="brand-spotlight-list">{spotlightBrands.map((brand) => <Link key={brand} to={`/shop?brand=${encodeURIComponent(brand)}`}>{brand}<span>Explore →</span></Link>)}</div>
                        </section>
                    )}
                    {celebrationProducts.length > 0 && (
                        <section className="discovery-section">
                            <header><div><span>CELEBRATE EVERY MOMENT</span><h2>Thoughtful picks for every day</h2></div><Link to="/shop">View all</Link></header>
                            <div className="product-grid">{celebrationProducts.map((product) => <ProductCard key={product._id} product={product} />)}</div>
                        </section>
                    )}
                    {valueProducts.length > 0 && (
                        <section className="discovery-section">
                            <header><div><span>SHOPNEST 365</span><h2>Lowest prices in Value 365</h2></div><Link to="/value-365">View all value picks →</Link></header>
                            <div className="product-grid">{valueProducts.map((product) => <ProductCard key={product._id} product={product} />)}</div>
                        </section>
                    )}
                    {recommendedProducts.length > 0 && (
                        <section className="discovery-section">
                            <header><div><span>PERSONALIZED DISCOVERY</span><h2>Suggested for you</h2></div><Link to="/shop">View all products →</Link></header>
                            <div className="product-grid">{recommendedProducts.map((product) => <ProductCard key={product._id} product={product} />)}</div>
                        </section>
                    )}
                </div>
            )}
        </main>
    );    
};
export default Home;