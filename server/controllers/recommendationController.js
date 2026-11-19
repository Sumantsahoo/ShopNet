const mongoose = require('mongoose');
const Order = require('../model/order');
const Product = require('../model/product');
const {
    rankRecommendations,
    takeUniqueProducts
} = require('../utils/recommendationEngine');
const { toProductResponse } = require('../utils/productPricing');

const HISTORY_WINDOW_DAYS = 90;
const HISTORY_WINDOW_MS = HISTORY_WINDOW_DAYS * 24 * 60 * 60 * 1000;
const PRODUCT_FIELDS = 'name brand category color gender countryOfOrigin occasion description price basePrice originalPrice discountPercent additionalDiscountPercent additionalOfferActive additionalOfferExpiresAt imageUrl stock rating numReviews showInAllProducts showInFeatured featuredActive featuredOrder createdAt updatedAt';

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const idString = (value) => String(value?._id || value || '');
const isRecent = (value, cutoff) => new Date(value).getTime() >= cutoff;

const getPopularProducts = async (cutoff) => {
    const popularRows = await Order.aggregate([
        { $match: { isPaid: true, createdAt: { $gte: new Date(cutoff) } } },
        { $unwind: '$orderItems' },
        { $group: { _id: '$orderItems.product', units: { $sum: '$orderItems.qty' } } },
        { $sort: { units: -1 } },
        { $limit: 40 }
    ]);
    const popularity = new Map(popularRows.map((row) => [String(row._id), row.units]));
    const popularIds = [...popularity.keys()];
    let products = popularIds.length
        ? await Product.find({
            _id: { $in: popularIds },
            stock: { $gt: 0 },
            showInAllProducts: { $ne: false }
        }).select(PRODUCT_FIELDS).lean()
        : [];
    if (products.length) {
        products.sort((left, right) => (popularity.get(String(right._id)) || 0) - (popularity.get(String(left._id)) || 0));
    } else {
        products = await Product.find({ stock: { $gt: 0 }, showInAllProducts: { $ne: false } })
            .select(PRODUCT_FIELDS)
            .sort({ numReviews: -1, rating: -1, createdAt: -1 })
            .limit(24)
            .lean();
    }
    return products;
};

const getRecommendations = async (req, res) => {
    const now = new Date();
    const cutoff = now.getTime() - HISTORY_WINDOW_MS;
    const productId = typeof req.query.productId === 'string' ? req.query.productId : '';
    if (productId && !mongoose.isValidObjectId(productId)) {
        return res.status(400).json({ message: 'Invalid product ID.' });
    }

    const cartProductIds = typeof req.query.cartProductIds === 'string'
        ? [...new Set(req.query.cartProductIds.split(',').filter(Boolean))]
        : [];
    if (cartProductIds.length > 20 || cartProductIds.some((id) => !mongoose.isValidObjectId(id))) {
        return res.status(400).json({ message: 'Cart recommendations support up to 20 valid product IDs.' });
    }

    try {
        const isCustomer = req.user?.role === 'user';
        const searchHistory = isCustomer
            ? (req.user.searchHistory || [])
                .filter((entry) => entry.term && isRecent(entry.searchedAt, cutoff))
                .sort((left, right) => new Date(right.searchedAt) - new Date(left.searchedAt))
                .slice(0, 30)
            : [];
        const searchTerms = searchHistory.length
            ? searchHistory.map((entry) => entry.term)
            : (isCustomer ? (req.user.recentSearches || []).slice(0, 6) : []);
        const viewHistoryIds = isCustomer
            ? (req.user.productViewHistory || [])
                .filter((entry) => entry.product && isRecent(entry.viewedAt, cutoff))
                .sort((left, right) => new Date(right.viewedAt) - new Date(left.viewedAt))
                .slice(0, 40)
                .map((entry) => idString(entry.product))
            : [];
        const cartHistoryIds = isCustomer
            ? (req.user.cartHistory || [])
                .filter((entry) => entry.product && isRecent(entry.addedAt, cutoff))
                .slice(0, 30)
                .map((entry) => idString(entry.product))
            : [];
        const legacyViewIds = isCustomer && viewHistoryIds.length === 0
            ? (req.user.recentProducts || []).map(idString)
            : [];
        const viewedIds = [...new Set([...viewHistoryIds, ...legacyViewIds])];
        const sourceIds = [...new Set([...viewedIds, ...cartHistoryIds, ...cartProductIds])];
        const sourceProducts = sourceIds.length
            ? await Product.find({ _id: { $in: sourceIds } }).select(PRODUCT_FIELDS).lean()
            : [];
        const cartSources = cartProductIds.length
            ? await Product.find({ _id: { $in: cartProductIds } }).select(PRODUCT_FIELDS).lean()
            : [];
        const targetProduct = productId
            ? await Product.findById(productId).select(PRODUCT_FIELDS).lean()
            : null;
        if (productId && !targetProduct) return res.status(404).json({ message: 'Product not found.' });

        const paidOrders = isCustomer
            ? await Order.find({ user: req.user._id, isPaid: true, createdAt: { $gte: new Date(cutoff) } })
                .select('orderItems.product')
                .lean()
            : [];
        const purchasedIds = [...new Set(paidOrders.flatMap((order) => order.orderItems || []).map((item) => idString(item.product)))];
        const excludedIds = [...new Set([...purchasedIds, ...cartProductIds])];

        const candidateClauses = [];
        for (const term of [...new Set(searchTerms.map((value) => String(value).trim()).filter((value) => value.length > 2))].slice(0, 12)) {
            const patterns = [...new Set([term, ...term.split(/\s+/).filter((token) => token.length > 2)])]
                .map((value) => new RegExp(escapeRegex(value), 'i'));
            patterns.forEach((expression) => {
                candidateClauses.push({ name: expression }, { brand: expression }, { category: expression }, { description: expression });
            });
        }
        const sourceAttributes = [...sourceProducts, ...(targetProduct ? [targetProduct] : [])].slice(0, 20);
        for (const field of ['category', 'brand', 'gender', 'color', 'occasion']) {
            const values = [...new Set(sourceAttributes.map((product) => String(product[field] || '').trim()).filter(Boolean))].slice(0, 10);
            values.forEach((value) => candidateClauses.push({ [field]: new RegExp(`^${escapeRegex(value)}$`, 'i') }));
        }
        const candidates = candidateClauses.length
            ? await Product.find({
                stock: { $gt: 0 },
                showInAllProducts: { $ne: false },
                _id: { $nin: [...excludedIds, ...sourceIds, ...(productId ? [productId] : [])] },
                $or: candidateClauses
            }).select(PRODUCT_FIELDS).limit(300).lean()
            : [];

        const featuredProducts = await Product.find({
            showInFeatured: true,
            featuredActive: { $ne: false },
            showInAllProducts: { $ne: false },
            stock: { $gt: 0 }
        }).select(PRODUCT_FIELDS).sort({ featuredOrder: 1, updatedAt: -1 }).limit(12).lean();
        const popularProducts = productId || cartProductIds.length ? [] : await getPopularProducts(cutoff);
        const seen = new Set();
        const pickedForYou = takeUniqueProducts(featuredProducts, seen, 12).map(toProductResponse);
        const basedOnRecentSearches = takeUniqueProducts(
            rankRecommendations(candidates, { searchTerms, excludeIds: [...excludedIds, ...[...seen]], mode: 'search' }),
            seen,
            12
        ).map(toProductResponse);
        const youMayAlsoLike = takeUniqueProducts(
            rankRecommendations(candidates, {
                searchTerms,
                sourceProducts,
                excludeIds: [...excludedIds, ...[...seen]],
                mode: 'combined'
            }),
            seen,
            12
        ).map(toProductResponse);
        const similarProducts = targetProduct
            ? takeUniqueProducts(
                rankRecommendations(candidates, { sourceProducts: [targetProduct], excludeIds: [...excludedIds, productId], mode: 'affinity' }),
                new Set(),
                12
            ).map(toProductResponse)
            : [];
        const cartRecommendations = cartSources.length
            ? takeUniqueProducts(
                rankRecommendations(candidates, {
                    searchTerms,
                    sourceProducts: cartSources,
                    excludeIds,
                    mode: 'combined'
                }),
                new Set(),
                12
            ).map(toProductResponse)
            : [];
        const trending = takeUniqueProducts(popularProducts, seen, 12).map(toProductResponse);

        return res.json({
            basedOnRecentSearches,
            youMayAlsoLike,
            pickedForYou,
            similarProducts,
            cartRecommendations,
            trending,
            hasPersonalizedSignals: searchTerms.length > 0 || sourceProducts.length > 0
        });
    } catch (error) {
        console.error('Could not generate product recommendations:', error.message);
        return res.status(500).json({ message: 'Could not load product recommendations.' });
    }
};

module.exports = { getRecommendations };
