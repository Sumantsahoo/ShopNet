import React, { useContext, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import ProductPrice from '../components/ProductPrice';
import EmployeeWorkspace from '../components/EmployeeWorkspace';
import ProductFilters from '../components/ProductFilters';
import { useLanguage } from '../context/LanguageContext';
import { apiFetch } from '../utils/api';
import { getCategoryIcon, getCategoryLabel, getCategorySlug, PRODUCT_CATEGORIES } from '../utils/categories';
import { AuthContext } from '../context/AuthContext';
import { readProductCache, saveProductCache } from '../utils/productCache';
import { readRecentProductIds } from '../utils/recentProducts';
import { getProductImageUrl } from '../utils/productImage';
import { getProductDiscountPercent, isProductOfferActive } from '../utils/productPricing';
import { EMPTY_PRODUCT_FILTERS, filterAndSortProducts } from '../utils/productFilters';
import { readSearchHistory } from '../utils/searchHistory';
import '../styles/home.css';

const Home = () => {
    const { pathname } = useLocation();
    const { category: routeCategory } = useParams();
    const [searchParams] = useSearchParams();
    const { t } = useLanguage();
    const { user } = useContext(AuthContext);
    const isEmployee = user?.role === 'employee';
    const isEmployeeWorkspace = isEmployee && pathname === '/employee/workspace';
    const isShopPage = pathname === '/shop';
    const isSearchPage = pathname === '/search';
    const isHomePage = pathname === '/';
    const isValuePage = pathname === '/value-365';
    const isHeroPage = isHomePage || isValuePage;
    const requestedSort = searchParams.get('sort');
    const searchTerm = searchParams.get('search')?.trim() || '';
    const brandFilter = searchParams.get('brand')?.trim() || '';
    const activeCategory = routeCategory || 'all';
    const [cachedProducts] = useState(readProductCache);
    const [products, setProducts] = useState(cachedProducts || []);
    const [heroIndex, setHeroIndex] = useState(0);
    const [filters, setFilters] = useState(EMPTY_PRODUCT_FILTERS);
    const [sortOrder, setSortOrder] = useState(requestedSort || (isValuePage ? 'price-low' : 'recommended'));
    const [searchHistory, setSearchHistory] = useState([]);
    const [cartHistory, setCartHistory] = useState([]);
    const [recommendations, setRecommendations] = useState({
        basedOnRecentSearches: [],
        youMayAlsoLike: [],
        pickedForYou: [],
        trending: [],
        hasPersonalizedSignals: false
    });
    const [recommendationError, setRecommendationError] = useState('');
    const [recentProductIds, setRecentProductIds] = useState(readRecentProductIds);
    const [recentOrderProductIds, setRecentOrderProductIds] = useState([]);
    const [featuredProductIndex, setFeaturedProductIndex] = useState(0);
    const [storefrontSettings, setStorefrontSettings] = useState({ heroImageUrl: '', heroImageUrls: [], seasonalCampaignName: '' });
    const [recentOrderProducts, setRecentOrderProducts] = useState([]);
    const [ordersError, setOrdersError] = useState('');
    const [historyError, setHistoryError] = useState('');
    const [storefrontError, setStorefrontError] = useState('');
    const [loading, setLoading] = useState(cachedProducts === null);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isEmployeeWorkspace) {
            setLoading(false);
            return undefined;
        }
        const fetchProducts = async () => {
            try {
                const response = await apiFetch('/api/products');
                if (!response.ok) throw new Error(`Products request failed (${response.status})`);
                const data = await response.json();
                if (!Array.isArray(data)) throw new Error('The products response was not a list.');
                setProducts(data);
                saveProductCache(data);
                setError('');
            } catch (fetchError) {
                console.error('Could not load products:', fetchError);
                setError(cachedProducts === null
                    ? 'Products could not be loaded. Please try again in a moment.'
                    : 'Could not refresh products. Showing recently saved product information.');
            } finally {
                setLoading(false);
            }
        };
        fetchProducts();
    }, [cachedProducts, isEmployeeWorkspace]);

    useEffect(() => {
        let cancelled = false;
        const loadHistory = async () => {
            if (!user?.token || user.role === 'admin' || isEmployeeWorkspace) {
                if (!cancelled) {
                    setSearchHistory(readSearchHistory());
                    setCartHistory([]);
                    setRecentProductIds(readRecentProductIds());
                    setRecentOrderProductIds([]);
                }
                return;
            }

            try {
                const response = await apiFetch('/api/authorite/history', {
                    headers: { Authorization: `Bearer ${user.token}` }
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.message || 'Could not load your shopping history.');
                if (!cancelled) {
                    const history = Array.isArray(data.searchHistory)
                        ? data.searchHistory
                        : (Array.isArray(data.recentSearches)
                            ? data.recentSearches.map((term) => ({ term, searchedAt: new Date().toISOString() }))
                            : []);
                    setSearchHistory(history);
                    setCartHistory(Array.isArray(data.cartHistory) ? data.cartHistory : []);
                    setRecentProductIds(Array.isArray(data.recentProducts) ? data.recentProducts : []);
                    setHistoryError('');
                }
            } catch (loadError) {
                console.error('Could not load account shopping history:', loadError);
                if (!cancelled) setHistoryError('Could not load your saved searches and suggestions.');
            }
        };
        loadHistory();
        return () => { cancelled = true; };
    }, [isEmployeeWorkspace, searchParams, user?.role, user?.token]);

    useEffect(() => {
        let cancelled = false;
        if (!user?.token || user.role === 'admin' || isEmployeeWorkspace) {
            setRecentOrderProducts([]);
            setRecentOrderProductIds([]);
            setOrdersError('');
            return undefined;
        }

        const loadRecentOrders = async () => {
            try {
                const response = await apiFetch('/api/orders/myorders', {
                    headers: { Authorization: `Bearer ${user.token}` }
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.message || 'Could not load your recent orders.');
                if (!Array.isArray(data)) throw new Error('The orders response was not a list.');
                const historyCutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
                const productIds = [...new Set(data
                    .filter((order) => new Date(order.createdAt).getTime() >= historyCutoff)
                    .flatMap((order) => order.orderItems || [])
                    .map((item) => String(item.product?._id || item.product))
                    .filter((id) => id && id !== 'undefined'))];
                const latestOrder = data
                    .slice()
                    .filter((order) => order.status === 'delivered')
                    .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))[0];
                const seen = new Set();
                const orderedProducts = (latestOrder?.orderItems || [])
                    .map((item) => item.product)
                    .filter((product) => product && typeof product === 'object' && product._id && product.showInRatingReviews)
                    .filter((product) => {
                        const id = String(product._id);
                        if (seen.has(id)) return false;
                        seen.add(id);
                        return true;
                    });
                if (!cancelled) {
                    setRecentOrderProducts(orderedProducts);
                    setRecentOrderProductIds(productIds);
                    setOrdersError('');
                }
            } catch (loadError) {
                console.error('Could not load recent orders for home page:', loadError);
                if (!cancelled) setOrdersError('Your recent purchases could not be loaded.');
            }
        };
        loadRecentOrders();
        return () => { cancelled = true; };
    }, [isEmployeeWorkspace, user?.role, user?.token]);

    useEffect(() => {
        let cancelled = false;
        const loadRecommendations = async () => {
            try {
                const response = await apiFetch('/api/recommendations', {
                    headers: user?.token ? { Authorization: `Bearer ${user.token}` } : {}
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.message || 'Could not load product recommendations.');
                if (cancelled) return;
                setRecommendations({
                    basedOnRecentSearches: Array.isArray(data.basedOnRecentSearches) ? data.basedOnRecentSearches : [],
                    youMayAlsoLike: Array.isArray(data.youMayAlsoLike) ? data.youMayAlsoLike : [],
                    pickedForYou: Array.isArray(data.pickedForYou) ? data.pickedForYou : [],
                    trending: Array.isArray(data.trending) ? data.trending : [],
                    hasPersonalizedSignals: Boolean(data.hasPersonalizedSignals)
                });
                setRecommendationError('');
            } catch (loadError) {
                console.error('Could not load product recommendations:', loadError);
                if (!cancelled) setRecommendationError(loadError.message || 'Could not load product recommendations.');
            }
        };
        loadRecommendations();
        return () => { cancelled = true; };
    }, [pathname, searchParams, user?.role, user?.token]);

    useEffect(() => {
        if (isEmployeeWorkspace) return undefined;
        let cancelled = false;
        const loadStorefrontSettings = async () => {
            try {
                const response = await apiFetch('/api/storefront');
                const data = await response.json();
                if (!response.ok) throw new Error(data.message || 'Could not load homepage banner.');
                if (!cancelled) {
                    setStorefrontSettings(data);
                    setStorefrontError('');
                }
            } catch (loadError) {
                console.error('Could not load homepage banner:', loadError);
                if (!cancelled) setStorefrontError('The custom ShopNest 365 banner is unavailable right now.');
            }
        };
        loadStorefrontSettings();
        return () => { cancelled = true; };
    }, [isEmployeeWorkspace]);

    const catalogProducts = useMemo(
        () => products.filter((product) => product.showInAllProducts !== false),
        [products]
    );
    const visibleProducts = useMemo(() => {
        const query = searchTerm.toLocaleLowerCase();
        const filtered = products.filter((product) => {
            const storefrontMatches = isValuePage
                ? Boolean(product.showInValue365)
                : product.showInAllProducts !== false;
            const categoryMatches = activeCategory === 'all' || getCategorySlug(product.category) === activeCategory;
            const searchMatches = !query || [product.name, product.description, product.category]
                .some((value) => String(value || '').toLocaleLowerCase().includes(query));
            const brandMatches = !brandFilter || String(product.brand || '').toLocaleLowerCase() === brandFilter.toLocaleLowerCase();
            return storefrontMatches && categoryMatches && searchMatches && brandMatches;
        });
        return isValuePage ? filtered.sort((left, right) => Number(left.price) - Number(right.price)) : filtered;
    }, [activeCategory, brandFilter, isValuePage, products, searchTerm]);
    const filteredProducts = useMemo(
        () => filterAndSortProducts(visibleProducts, filters, sortOrder),
        [filters, sortOrder, visibleProducts]
    );
    const viewedProducts = useMemo(() => recentProductIds
        .map((id) => products.find((product) => String(product._id) === String(id)))
        .filter(Boolean), [products, recentProductIds]);
    const cartProducts = useMemo(() => cartHistory
        .map((entry) => products.find((product) => String(product._id) === String(entry.product)))
        .filter(Boolean), [cartHistory, products]);
    const orderedProducts = useMemo(() => recentOrderProductIds
        .map((id) => products.find((product) => String(product._id) === String(id)))
        .filter(Boolean), [products, recentOrderProductIds]);
    const interactionProducts = useMemo(() => {
        const selected = new Map();
        [...viewedProducts, ...cartProducts, ...orderedProducts].forEach((product) => selected.set(String(product._id), product));
        return [...selected.values()];
    }, [cartProducts, orderedProducts, viewedProducts]);
    const searchMatchedProducts = useMemo(() => {
        const terms = searchHistory.flatMap(({ term }) => term.toLocaleLowerCase().split(/\s+/))
            .filter((term) => term.length > 2);
        return catalogProducts.filter((product) => {
            const searchable = [product.name, product.description, product.category, product.brand]
                .map((value) => String(value || '').toLocaleLowerCase()).filter(Boolean);
            return terms.some((term) => searchable.some((value) => value.includes(term)));
        });
    }, [catalogProducts, searchHistory]);
    const recommendationSignals = useMemo(() => {
        const selected = new Map();
        [...searchMatchedProducts, ...interactionProducts]
            .forEach((product) => selected.set(String(product._id), product));
        return [...selected.values()];
    }, [interactionProducts, searchMatchedProducts]);
    const suggestedProducts = useMemo(() => {
        const eligibleProducts = products.filter((product) => Boolean(product.showInSuggested));
        const searchTerms = searchHistory.map(({ term }) => term.toLocaleLowerCase());
        return eligibleProducts
            .map((product, index) => {
                const searchable = [product.name, product.description, product.category, product.brand]
                    .map((value) => String(value || '').toLocaleLowerCase());
                const searchScore = searchTerms.reduce((score, term) => (
                    score + (searchable.some((value) => value.includes(term)) ? 4 : 0)
                ), 0);
                const activityScore = recommendationSignals.reduce((score, interactedProduct) => (
                    score + (String(interactedProduct._id) === String(product._id) ? 1 : 0) +
                        (interactedProduct.category && interactedProduct.category === product.category ? 3 : 0) +
                        (interactedProduct.brand && interactedProduct.brand.toLocaleLowerCase() === String(product.brand || '').toLocaleLowerCase() ? 2 : 0)
                ), 0);
                return { product, index, score: searchScore + activityScore };
            })
            .sort((left, right) => right.score - left.score || left.index - right.index)
            .slice(0, 24)
            .map(({ product }) => product);
    }, [products, recommendationSignals, searchHistory]);
    const stillLookingProducts = useMemo(() => {
        const selected = new Map();
        const eligibleProducts = catalogProducts.filter((product) => Boolean(product.showInStillLooking));
        for (const { term } of searchHistory) {
            const query = term.toLocaleLowerCase();
            eligibleProducts.forEach((product) => {
                if (selected.size >= 24 || selected.has(String(product._id))) return;
                const matches = [product.name, product.description, product.category, product.brand]
                    .some((value) => String(value || '').toLocaleLowerCase().includes(query));
                const sameType = searchMatchedProducts.some((searchedProduct) => (
                    (searchedProduct.category && String(searchedProduct.category).toLocaleLowerCase() === String(product.category || '').toLocaleLowerCase()) ||
                    (searchedProduct.brand && searchedProduct.brand.toLocaleLowerCase() === String(product.brand || '').toLocaleLowerCase())
                ));
                if (matches || sameType) selected.set(String(product._id), product);
            });
            if (selected.size >= 24) break;
        }
        return [...selected.values()];
    }, [catalogProducts, searchHistory, searchMatchedProducts]);
    const allHomeProducts = useMemo(() => {
        const selected = new Map();
        [...interactionProducts, ...catalogProducts].forEach((product) => selected.set(String(product._id), product));
        return [...selected.values()].slice(0, 24);
    }, [catalogProducts, interactionProducts]);
    const moreForYouProducts = useMemo(() => {
        const alreadyShown = new Set([...stillLookingProducts, ...suggestedProducts].map((product) => String(product._id)));
        const searchTerms = searchHistory.map(({ term }) => term.toLocaleLowerCase());
        return catalogProducts
            .filter((product) => !alreadyShown.has(String(product._id)))
            .map((product, index) => {
                const searchable = [product.name, product.description, product.category, product.brand]
                    .map((value) => String(value || '').toLocaleLowerCase());
                const searchScore = searchTerms.reduce((score, term) => (
                    score + (searchable.some((value) => value.includes(term)) ? 3 : 0)
                ), 0);
                const viewedScore = recommendationSignals.reduce((score, viewed) => (
                    score + (viewed.category && viewed.category === product.category ? 2 : 0) +
                        (viewed.brand && viewed.brand.toLocaleLowerCase() === String(product.brand || '').toLocaleLowerCase() ? 2 : 0)
                ), 0);
                return { product, index, score: searchScore + viewedScore };
            })
            .sort((left, right) => right.score - left.score || left.index - right.index)
            .slice(0, 24)
            .map(({ product }) => product);
    }, [catalogProducts, recommendationSignals, searchHistory, stillLookingProducts, suggestedProducts]);
    const valueProducts = useMemo(() => products.filter((product) => Boolean(product.showInValue365))
        .sort((left, right) => Number(left.price) - Number(right.price)).slice(0, 24), [products]);
    const celebrationProducts = useMemo(
        () => catalogProducts.filter((product) => Boolean(product.showInCelebrate)).slice(0, 24),
        [catalogProducts]
    );
    const seasonalProducts = useMemo(
        () => catalogProducts.filter((product) => (
            Boolean(product.showInSeasonalDeals) &&
            (Number(product.discountPercent) > 0 || isProductOfferActive(product))
        )).slice(0, 24),
        [catalogProducts]
    );
    const spotlightBrands = useMemo(() => [...new Set(catalogProducts
        .filter((product) => Boolean(product.showInBrandSpotlight))
        .map((product) => String(product.brand || '').trim()).filter(Boolean))], [catalogProducts]);
    const heroProduct = catalogProducts.length ? catalogProducts[heroIndex % catalogProducts.length] : null;
    const heroSlides = Array.isArray(storefrontSettings.heroImageUrls) && storefrontSettings.heroImageUrls.length
        ? storefrontSettings.heroImageUrls
        : (storefrontSettings.heroImageUrl ? [storefrontSettings.heroImageUrl] : []);
    const heroImageUrl = heroSlides.length
        ? heroSlides[heroIndex % heroSlides.length]
        : heroProduct?.imageUrl || '';
    const featuredProducts = useMemo(() => {
        const selected = new Map();
        const curatedProducts = recommendations.pickedForYou.length
            ? recommendations.pickedForYou
            : products.filter((product) => product.showInFeatured && product.featuredActive !== false)
                .sort((left, right) => Number(left.featuredOrder || 0) - Number(right.featuredOrder || 0));
        const preferredProducts = [
            ...curatedProducts,
            ...suggestedProducts,
            ...interactionProducts,
            ...catalogProducts
        ];
        preferredProducts.forEach((product) => selected.set(String(product._id), product));
        return [...selected.values()]
            .map((product, index) => ({
                product,
                index,
                discount: getProductDiscountPercent(product),
                isCurated: Boolean(product.showInFeatured && product.featuredActive !== false),
                qualifiesForOffer: getProductDiscountPercent(product) >= 15
            }))
            .sort((left, right) => {
                if (left.isCurated && right.isCurated) return left.index - right.index;
                return Number(right.isCurated) - Number(left.isCurated) ||
                    Number(right.qualifiesForOffer) - Number(left.qualifiesForOffer) ||
                    right.discount - left.discount ||
                    left.index - right.index;
            })
            .slice(0, 6)
            .map(({ product }) => product);
    }, [catalogProducts, interactionProducts, products, recommendations.pickedForYou, suggestedProducts]);
    const distinctRecommendations = useMemo(() => {
        const seen = new Set(featuredProducts.map((product) => String(product._id)));
        const takeDistinct = (items) => items.filter((product) => {
            const id = String(product._id);
            if (seen.has(id)) return false;
            seen.add(id);
            return true;
        });
        return {
            basedOnRecentSearches: takeDistinct(recommendations.basedOnRecentSearches),
            youMayAlsoLike: takeDistinct(recommendations.youMayAlsoLike),
            trending: takeDistinct(recommendations.trending)
        };
    }, [featuredProducts, recommendations]);
    const activeFeaturedProduct = featuredProducts.length
        ? featuredProducts[featuredProductIndex % featuredProducts.length]
        : null;
    const categoryOptions = useMemo(() => {
        const categories = [...PRODUCT_CATEGORIES];
        const knownSlugs = new Set(categories.map((category) => category.slug));
        catalogProducts.forEach((product) => {
            const label = String(product.category || '').trim();
            const slug = getCategorySlug(label);
            if (label && !knownSlugs.has(slug)) {
                categories.push({ slug, label });
                knownSlugs.add(slug);
            }
        });
        return categories;
    }, [catalogProducts]);
    const activeCategoryLabel = categoryOptions.find((category) => category.slug === activeCategory)?.label || getCategoryLabel(activeCategory);

    useEffect(() => {
        if (!isHeroPage) return undefined;
        if (heroSlides.length > 1) {
            const timer = window.setInterval(() => {
                setHeroIndex((current) => (current + 1) % heroSlides.length);
            }, 1000);
            return () => window.clearInterval(timer);
        }
        if (heroSlides.length === 1 || catalogProducts.length < 2) return undefined;
        const timer = window.setInterval(() => {
            setHeroIndex((current) => (current + 1) % catalogProducts.length);
        }, 1000);
        return () => window.clearInterval(timer);
    }, [catalogProducts.length, heroSlides.length, isHeroPage]);

    useEffect(() => {
        if (featuredProducts.length < 2) return undefined;
        const timer = window.setInterval(() => {
            setFeaturedProductIndex((current) => (current + 1) % featuredProducts.length);
        }, 1000);
        return () => window.clearInterval(timer);
    }, [featuredProducts.length]);

    useEffect(() => {
        setSortOrder(requestedSort || (isValuePage ? 'price-low' : 'recommended'));
    }, [isValuePage, requestedSort]);

    if (isEmployeeWorkspace) {
        return <EmployeeWorkspace user={user} />;
    }

    return (
        <main className="home-container">
            {isHeroPage && activeCategory === 'all' && !searchTerm && (
                <div className="hero-banner">
                    <img
                        key={`${heroImageUrl}-${heroIndex}`}
                        src={getProductImageUrl(heroImageUrl, 900) || '/logo.png'}
                        alt=""
                        className={heroImageUrl ? 'hero-product-image' : 'hero-product-image is-shopnest-logo'}
                        onError={(event) => {
                            event.currentTarget.onerror = null;
                            event.currentTarget.src = '/logo.png';
                            event.currentTarget.classList.add('is-shopnest-logo');
                        }}
                    />
                    <div className="hero-copy">
                        <span className="hero-eyebrow">SHOPNEST 365</span>
                        <h1>ShopNest 365</h1>
                        <p>{heroProduct ? `${heroProduct.name} · ${t('discover')}` : t('discover')}</p>
                        <div className="hero-actions"><Link to="/shop">Explore products</Link><Link to="/value-365">Shop Value 365</Link></div>
                    </div>
                    {heroSlides.length > 1 && (
                        <div className="hero-slide-indicators" aria-label="Homepage banner slides">
                            {heroSlides.map((slide, index) => (
                                <button
                                    key={`${slide}-${index}`}
                                    type="button"
                                    aria-label={`Show banner slide ${index + 1}`}
                                    aria-current={index === heroIndex % heroSlides.length ? 'true' : undefined}
                                    className={index === heroIndex % heroSlides.length ? 'is-active' : ''}
                                    onClick={() => setHeroIndex(index)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}
            {isHomePage && (
                <nav className="home-category-strip" aria-label="Product categories">
                    <Link className="is-active" to="/shop">
                        <span className="home-category-icon" aria-hidden="true">✨</span>
                        <span className="home-category-label">For You</span>
                    </Link>
                    {categoryOptions.map((category) => (
                        <Link key={category.slug} to={`/category/${category.slug}`}>
                            <span className="home-category-icon" aria-hidden="true">{getCategoryIcon(category.slug)}</span>
                            <span className="home-category-label">{category.label}</span>
                        </Link>
                    ))}
                </nav>
            )}
            {isHomePage && activeFeaturedProduct && (
                <section className="discovery-section rotating-featured-section" aria-label="Featured products">
                    <header><div><span>PERSONALIZED PICKS · UPDATED EVERY SECOND</span><h2>Picked for you</h2></div><Link to="/shop">Shop all →</Link></header>
                    <div className="featured-offer-banner" key={activeFeaturedProduct._id}>
                        <Link className="featured-offer-image" to={`/products/${activeFeaturedProduct._id}`} aria-label={`View ${activeFeaturedProduct.name}`}>
                            <img
                                src={getProductImageUrl(activeFeaturedProduct.imageUrl, 1000) || '/logo.png'}
                                alt={activeFeaturedProduct.name}
                                onError={(event) => {
                                    event.currentTarget.onerror = null;
                                    event.currentTarget.src = '/logo.png';
                                }}
                            />
                        </Link>
                        <div className="featured-offer-copy">
                            <span>{activeFeaturedProduct.showInFeatured ? 'SHOPNEST SPECIAL' : 'PERSONALIZED FOR YOU'}</span>
                            <h3>{activeFeaturedProduct.name}</h3>
                            <ProductPrice product={activeFeaturedProduct} className="is-featured" />
                            <Link className="featured-offer-action" to={`/products/${activeFeaturedProduct._id}`}>View offer</Link>
                        </div>
                        {featuredProducts.length > 1 && (
                            <>
                                <button
                                    className="featured-offer-arrow is-previous"
                                    type="button"
                                    aria-label="Show previous Picked for You product"
                                    onClick={() => setFeaturedProductIndex((current) => (current - 1 + featuredProducts.length) % featuredProducts.length)}
                                >‹</button>
                                <button
                                    className="featured-offer-arrow is-next"
                                    type="button"
                                    aria-label="Show next Picked for You product"
                                    onClick={() => setFeaturedProductIndex((current) => (current + 1) % featuredProducts.length)}
                                >›</button>
                            </>
                        )}
                    </div>
                </section>
            )}
            {storefrontError && isHomePage && <p className="product-load-message" role="status">{storefrontError}</p>}
            {historyError && <p className="product-load-message" role="status">{historyError}</p>}
            {!isHomePage && (
                <section className="storefront-layout">
                    <div className="storefront-results">
                        <header className="storefront-heading">
                            <div>
                                <span>{isSearchPage ? 'SHOPNEST SEARCH' : 'SHOPNEST STOREFRONT'}</span>
                                <h1>{searchTerm ? `Results for “${searchTerm}”` : brandFilter ? `Brand: ${brandFilter}` : isValuePage ? 'Value 365 · Lowest prices' : activeCategory === 'all' ? (isShopPage ? t('shopAll') : t('allProducts')) : activeCategoryLabel}</h1>
                            </div>
                            {!loading && <p>{filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'}</p>}
                        </header>
                        {error && <p className="product-load-message" role={products.length ? 'status' : 'alert'}>{error}</p>}
                        {!loading && (visibleProducts.length > 0 || searchTerm || brandFilter) && (
                            <ProductFilters
                                products={visibleProducts.length ? visibleProducts : catalogProducts}
                                optionProducts={catalogProducts}
                                filters={filters}
                                onFilterChange={(name, value) => setFilters((current) => ({ ...current, [name]: value }))}
                                sortOrder={sortOrder}
                                onSortChange={setSortOrder}
                                onClear={() => {
                                    setFilters(EMPTY_PRODUCT_FILTERS);
                                    setSortOrder(isValuePage ? 'price-low' : 'recommended');
                                }}
                            />
                        )}
                        {!loading && products.length === 0 && !error ? (
                            <section className="storefront-empty">
                                <h2>No products yet</h2>
                                <p>Check back soon to see what’s available.</p>
                            </section>
                        ) : !loading && products.length > 0 && visibleProducts.length === 0 ? (
                            <section className="storefront-empty">
                                <h2>{searchTerm ? 'No matching products' : isValuePage ? 'No Value 365 picks yet' : 'Nothing in this category yet'}</h2>
                                <p>{searchTerm ? 'Try another product name or category.' : isValuePage ? 'Check back soon for selected low-price products.' : 'Explore other categories to find something you like.'}</p>
                                <Link to="/shop">Browse all products</Link>
                            </section>
                        ) : !loading && visibleProducts.length > 0 && filteredProducts.length === 0 ? (
                            <section className="storefront-empty">
                                <h2>No products match these filters</h2>
                                <p>Clear one or more filters to see more products.</p>
                            </section>
                        ) : !loading && filteredProducts.length > 0 ? (
                            <div className="product-grid">
                                {filteredProducts.map((product) => <ProductCard key={product._id} product={product} />)}
                            </div>
                        ) : null}
                    </div>
                </section>
            )}
            {isHomePage && !searchTerm && (
                <div className="home-discovery-sections">
                    {recommendationError && <p className="home-section-message" role="status">{recommendationError}</p>}
                    {distinctRecommendations.basedOnRecentSearches.length > 0 && (
                        <section className="discovery-section recent-search-recommendations-section">
                            <header><div><span>YOUR RECENT INTERESTS · LAST 90 DAYS</span><h2>Based on your recent searches</h2></div><Link to="/shop">Explore more →</Link></header>
                            <div className="product-grid">{distinctRecommendations.basedOnRecentSearches.map((product) => <ProductCard key={product._id} product={product} />)}</div>
                        </section>
                    )}
                    {distinctRecommendations.youMayAlsoLike.length > 0 && (
                        <section className="discovery-section you-may-also-like-section">
                            <header><div><span>PERSONALIZED PRODUCT MATCHES</span><h2>You May Also Like</h2></div><Link to="/shop">View more →</Link></header>
                            <div className="product-grid">{distinctRecommendations.youMayAlsoLike.map((product) => <ProductCard key={product._id} product={product} />)}</div>
                        </section>
                    )}
                    {distinctRecommendations.basedOnRecentSearches.length === 0 &&
                        distinctRecommendations.youMayAlsoLike.length === 0 &&
                        distinctRecommendations.trending.length > 0 && (
                        <section className="discovery-section trending-recommendations-section">
                            <header><div><span>POPULAR RIGHT NOW</span><h2>Trending products</h2></div><Link to="/shop">Shop all →</Link></header>
                            <div className="product-grid">{distinctRecommendations.trending.map((product) => <ProductCard key={product._id} product={product} />)}</div>
                        </section>
                    )}
                    {stillLookingProducts.length > 0 && (
                        <section className="discovery-section still-looking-section">
                            <header><div><span>BASED ON YOUR ACTIVITY · LAST 90 DAYS</span><h2>Still looking for these?</h2></div><Link to="/shop">Browse all →</Link></header>
                            <div className="product-grid">{stillLookingProducts.map((product) => <ProductCard key={product._id} product={product} />)}</div>
                        </section>
                    )}
                    {allHomeProducts.length > 0 && (
                        <section className="discovery-section all-products-discovery-section">
                            <header><div><span>SHOP THE COLLECTION</span><h2>All products</h2></div><Link to="/shop">View all →</Link></header>
                            <div className="product-grid">{allHomeProducts.map((product) => <ProductCard key={product._id} product={product} />)}</div>
                        </section>
                    )}
                    {suggestedProducts.length > 0 && (
                        <section className="discovery-section suggested-discovery-section">
                            <header><div><span>PERSONALIZED FOR YOU</span><h2>Suggested for You</h2></div><Link to="/shop">View all →</Link></header>
                            <div className="product-grid">{suggestedProducts.map((product) => <ProductCard key={product._id} product={product} />)}</div>
                        </section>
                    )}
                    {valueProducts.length > 0 && (
                        <section className="discovery-section value-discovery-section">
                            <header><div><span>SHOPNEST 365 · LOWEST PRICES</span><h2>Value 365</h2></div><Link to="/value-365">View all value picks →</Link></header>
                            <div className="product-grid">{valueProducts.map((product) => <ProductCard key={product._id} product={product} />)}</div>
                        </section>
                    )}
                    {seasonalProducts.length > 0 && (
                        <section className="discovery-section seasonal-deals-section">
                            <header><div><span>LIMITED-TIME OFFERS</span><h2>{storefrontSettings.seasonalCampaignName || 'Seasonal Deals'}</h2></div><Link to="/shop">View all deals →</Link></header>
                            <div className="product-grid">{seasonalProducts.map((product) => <ProductCard key={product._id} product={product} />)}</div>
                        </section>
                    )}
                    {celebrationProducts.length > 0 && (
                        <section className="discovery-section celebration-discovery-section">
                            <header><div><span>CELEBRATE EVERY MOMENT</span><h2>Thoughtful picks for every day</h2></div><Link to="/shop">View all</Link></header>
                            <div className="product-grid">{celebrationProducts.map((product) => <ProductCard key={product._id} product={product} />)}</div>
                        </section>
                    )}
                    {user?.token && user.role !== 'admin' && (
                        <section className="discovery-section recent-order-reviews-section">
                            <header><div><span>YOUR LATEST ORDER</span><h2>Rating &amp; Reviews</h2></div><Link to="/orders">View all orders →</Link></header>
                            {ordersError ? <p className="home-section-message" role="status">{ordersError}</p> : recentOrderProducts.length ? (
                                <div className="product-grid">
                                    {recentOrderProducts.map((product) => (
                                        <article className="review-purchase-card" key={product._id}>
                                            <ProductCard product={product} />
                                            <Link className="review-purchase-action" to={`/products/${product._id}#product-reviews`}>Rate &amp; review</Link>
                                        </article>
                                    ))}
                                </div>
                            ) : <p className="home-section-message">Your latest order’s products will appear here. <Link to="/shop">Explore products</Link></p>}
                        </section>
                    )}
                    {moreForYouProducts.length > 0 && (
                        <section className="discovery-section recent-products-discovery-section">
                            <header><div><span>MORE TO EXPLORE</span><h2>More products for you</h2></div><Link to="/shop">View more →</Link></header>
                            <div className="product-grid">{moreForYouProducts.map((product) => <ProductCard key={product._id} product={product} />)}</div>
                        </section>
                    )}
                    {spotlightBrands.length > 0 && (
                        <section className="discovery-section brands-discovery-section">
                            <header><div><span>BRANDS IN SPOTLIGHT</span><h2>Explore popular brands</h2></div></header>
                            <div className="brand-spotlight-list">{spotlightBrands.map((brand) => <Link key={brand} to={`/shop?brand=${encodeURIComponent(brand)}`}>{brand}<span>Explore →</span></Link>)}</div>
                        </section>
                    )}
                </div>
            )}
        </main>
    );
};

export default Home;
