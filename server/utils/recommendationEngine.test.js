const test = require('node:test');
const assert = require('node:assert/strict');
const { rankRecommendations, takeUniqueProducts } = require('./recommendationEngine');

const products = [
    { _id: 'laptop-bag', name: 'Laptop bag', category: 'Accessories', brand: 'A', stock: 5 },
    { _id: 'laptop-case', name: 'Laptop case', category: 'Accessories', brand: 'B', stock: 2 },
    { _id: 'out-of-stock', name: 'Laptop', category: 'Electronics', stock: 0 },
    { _id: 'hidden', name: 'Laptop stand', category: 'Accessories', stock: 3, showInAllProducts: false }
];

test('ranks available products that match recent search terms', () => {
    const results = rankRecommendations(products, { searchTerms: ['laptop'], mode: 'search' });
    assert.deepEqual(results.map((product) => product._id), ['laptop-bag', 'laptop-case']);
});

test('uses product attributes to find cart-related accessories', () => {
    const results = rankRecommendations(products, {
        sourceProducts: [{ _id: 'laptop', category: 'Accessories' }],
        mode: 'affinity'
    });
    assert.deepEqual(results.map((product) => product._id), ['laptop-bag', 'laptop-case']);
});

test('deduplicates across recommendation sections', () => {
    const seen = new Set();
    const first = takeUniqueProducts(products.slice(0, 2), seen, 12);
    const next = takeUniqueProducts([products[1], products[0]], seen, 12);
    assert.equal(first.length, 2);
    assert.equal(next.length, 0);
});
