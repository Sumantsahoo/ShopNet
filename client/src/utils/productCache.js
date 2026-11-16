const PRODUCT_CACHE_KEY = 'shopnest-products-cache';
const PRODUCT_CACHE_TTL = 24 * 60 * 60 * 1000;

let memoryCache = null;
let memoryCacheAt = 0;

export const readProductCache = () => {
    if (Array.isArray(memoryCache) && Date.now() - memoryCacheAt < PRODUCT_CACHE_TTL) {
        return memoryCache;
    }

    if (typeof window === 'undefined') return null;

    try {
        const cached = JSON.parse(window.localStorage.getItem(PRODUCT_CACHE_KEY) || 'null');
        if (
            !Array.isArray(cached?.products) ||
            !Number.isFinite(cached.savedAt) ||
            Date.now() - cached.savedAt > PRODUCT_CACHE_TTL
        ) {
            window.localStorage.removeItem(PRODUCT_CACHE_KEY);
            return null;
        }

        memoryCache = cached.products;
        memoryCacheAt = cached.savedAt;
        return memoryCache;
    } catch (error) {
        console.error('Could not read the saved product cache:', error);
        return null;
    }
};

export const saveProductCache = (products) => {
    memoryCache = products;
    memoryCacheAt = Date.now();

    try {
        window.localStorage.setItem(PRODUCT_CACHE_KEY, JSON.stringify({
            savedAt: memoryCacheAt,
            products
        }));
    } catch (error) {
        console.error('Could not save the product cache:', error);
    }
};
