import { getProductDiscountPercent } from './productPricing';

export const EMPTY_PRODUCT_FILTERS = Object.freeze({
    brand: '',
    color: '',
    minPrice: '',
    maxPrice: '',
    minRating: '',
    gender: '',
    countryOfOrigin: '',
    occasion: '',
    size: '',
    discountOnly: false,
    fastDelivery: false
});

export const filterAndSortProducts = (products, filters, sortOrder) => {
    const filtered = products.filter((product) => {
        const price = Number(product.price);
        const matchesPrice = (!filters.minPrice || price >= Number(filters.minPrice)) &&
            (!filters.maxPrice || price <= Number(filters.maxPrice));
        const matchesRating = !filters.minRating || Number(product.rating || 0) >= Number(filters.minRating);
        const matchesDiscount = !filters.discountOnly || getProductDiscountPercent(product) > 0;
        const matchesDelivery = !filters.fastDelivery || Boolean(product.fastDelivery);
        const matchesSize = !filters.size || (Array.isArray(product.sizes) &&
            product.sizes.some((size) => size.toLocaleLowerCase() === filters.size.toLocaleLowerCase()));
        const matchesFields = ['brand', 'color', 'gender', 'countryOfOrigin', 'occasion'].every((field) => (
            !filters[field] || String(product[field] || '').toLocaleLowerCase() === filters[field].toLocaleLowerCase()
        ));
        return matchesPrice && matchesRating && matchesDiscount && matchesDelivery && matchesSize && matchesFields;
    });

    return filtered.sort((left, right) => {
        if (sortOrder === 'price-low') return Number(left.price) - Number(right.price);
        if (sortOrder === 'price-high') return Number(right.price) - Number(left.price);
        if (sortOrder === 'rating') return Number(right.rating || 0) - Number(left.rating || 0);
        if (sortOrder === 'discount') return getProductDiscountPercent(right) - getProductDiscountPercent(left);
        if (sortOrder === 'newest') return new Date(right.createdAt || 0) - new Date(left.createdAt || 0);
        return 0;
    });
};
