import { apiFetch } from './api';

export const fetchCurrentProducts = async () => {
    const response = await apiFetch('/api/products');
    if (!response.ok) {
        throw new Error(`Could not refresh product prices (${response.status}).`);
    }

    const products = await response.json();
    if (!Array.isArray(products) || products.some((product) => !product?._id)) {
        throw new Error('The current product price response was invalid.');
    }

    return products;
};
