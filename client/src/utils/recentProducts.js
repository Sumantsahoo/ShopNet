const RECENT_PRODUCTS_KEY = 'shopnest-recent-products';
const MAX_RECENT_PRODUCTS = 5;

export const readRecentProductIds = () => {
    try {
        const recent = JSON.parse(localStorage.getItem(RECENT_PRODUCTS_KEY) || '[]');
        return Array.isArray(recent)
            ? recent.filter((id) => typeof id === 'string').slice(0, MAX_RECENT_PRODUCTS)
            : [];
    } catch (error) {
        console.error('Could not load recently viewed products:', error);
        return [];
    }
};

export const saveRecentProduct = (id) => {
    if (typeof id !== 'string' || !id) return;

    try {
        const recent = readRecentProductIds().filter((recentId) => recentId !== id);
        localStorage.setItem(RECENT_PRODUCTS_KEY, JSON.stringify([id, ...recent].slice(0, MAX_RECENT_PRODUCTS)));
    } catch (error) {
        console.error('Could not save recently viewed products:', error);
    }
};
