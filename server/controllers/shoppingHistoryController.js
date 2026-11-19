const mongoose = require('mongoose');
const Product = require('../model/product');

const SHOPPING_HISTORY_DAYS = 90;
const SEARCH_HISTORY_LIMIT = 100;

const getHistoryCutoff = () => Date.now() - SHOPPING_HISTORY_DAYS * 24 * 60 * 60 * 1000;

const getRecentSearchHistory = (user) => {
    const cutoff = getHistoryCutoff();
    const history = (user.searchHistory || []).length
        ? user.searchHistory
        : (user.recentSearches || []).map((term) => ({ term, searchedAt: new Date() }));
    return history
        .filter((entry) => entry.term && new Date(entry.searchedAt).getTime() >= cutoff)
        .sort((left, right) => new Date(right.searchedAt) - new Date(left.searchedAt))
        .slice(0, SEARCH_HISTORY_LIMIT)
        .map((entry) => ({ term: entry.term, searchedAt: entry.searchedAt }));
};

const getRecentCartHistory = (user) => (user.cartHistory || [])
    .filter((entry) => entry.product && new Date(entry.addedAt).getTime() >= getHistoryCutoff())
    .sort((left, right) => new Date(right.addedAt) - new Date(left.addedAt))
    .slice(0, SEARCH_HISTORY_LIMIT)
    .map((entry) => ({ product: String(entry.product), addedAt: entry.addedAt }));

const getRecentProductViewHistory = (user) => (user.productViewHistory || [])
    .filter((entry) => entry.product && new Date(entry.viewedAt).getTime() >= getHistoryCutoff())
    .sort((left, right) => new Date(right.viewedAt) - new Date(left.viewedAt))
    .slice(0, SEARCH_HISTORY_LIMIT)
    .map((entry) => ({ product: String(entry.product), viewedAt: entry.viewedAt }));

const getShoppingHistory = (req, res) => {
    const searchHistory = getRecentSearchHistory(req.user);
    return res.json({
        searchHistory,
        recentSearches: searchHistory.slice(0, 6).map((entry) => entry.term),
        recentProducts: [...new Set([
            ...getRecentProductViewHistory(req.user).map((entry) => entry.product),
            ...(req.user.recentProducts || []).map((productId) => String(productId))
        ])].slice(0, SEARCH_HISTORY_LIMIT),
        productViewHistory: getRecentProductViewHistory(req.user),
        cartHistory: getRecentCartHistory(req.user)
    });
};

const recordSearch = async (req, res) => {
    const term = typeof req.body.term === 'string' ? req.body.term.trim().slice(0, 80) : '';
    if (!term) {
        return res.status(400).json({ message: 'A search term is required.' });
    }

    try {
        const searchHistory = getRecentSearchHistory(req.user)
            .filter((entry) => entry.term.toLocaleLowerCase() !== term.toLocaleLowerCase());
        req.user.searchHistory = [{ term, searchedAt: new Date() }, ...searchHistory].slice(0, SEARCH_HISTORY_LIMIT);
        const searches = (req.user.recentSearches || [])
            .filter((savedTerm) => savedTerm.toLocaleLowerCase() !== term.toLocaleLowerCase());
        req.user.recentSearches = [term, ...searches].slice(0, 6);
        await req.user.save();
        return res.json({ recentSearches: req.user.recentSearches });
    } catch (error) {
        console.error('Could not record customer search:', error.message);
        return res.status(500).json({ message: 'Could not save your recent search.' });
    }
};

const removeSearch = async (req, res) => {
    const term = typeof req.body.term === 'string' ? req.body.term.trim() : '';
    try {
        req.user.searchHistory = getRecentSearchHistory(req.user)
            .filter((entry) => entry.term.toLocaleLowerCase() !== term.toLocaleLowerCase());
        req.user.recentSearches = (req.user.recentSearches || [])
            .filter((savedTerm) => savedTerm !== term);
        await req.user.save();
        return res.json({ recentSearches: req.user.recentSearches });
    } catch (error) {
        console.error('Could not remove customer search:', error.message);
        return res.status(500).json({ message: 'Could not remove the recent search.' });
    }
};

const recordProductView = async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.productId)) {
        return res.status(400).json({ message: 'Invalid product ID.' });
    }

    try {
        const productExists = await Product.exists({ _id: req.params.productId });
        if (!productExists) {
            return res.status(404).json({ message: 'Product not found.' });
        }
        const productId = String(req.params.productId);
        const cutoff = getHistoryCutoff();
        const viewHistory = (req.user.productViewHistory || [])
            .filter((entry) => new Date(entry.viewedAt).getTime() >= cutoff)
            .filter((entry) => String(entry.product) !== productId);
        req.user.productViewHistory = [{ product: productId, viewedAt: new Date() }, ...viewHistory]
            .slice(0, SEARCH_HISTORY_LIMIT);
        const recentProducts = (req.user.recentProducts || [])
            .filter((savedId) => String(savedId) !== productId);
        req.user.recentProducts = [productId, ...recentProducts].slice(0, 5);
        await req.user.save();
        return res.json({ recentProducts: req.user.recentProducts.map((savedId) => String(savedId)) });
    } catch (error) {
        console.error('Could not record viewed product:', error.message);
        return res.status(500).json({ message: 'Could not save your product history.' });
    }
};

const recordCartAdd = async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.productId)) {
        return res.status(400).json({ message: 'Invalid product ID.' });
    }

    try {
        const productExists = await Product.exists({ _id: req.params.productId });
        if (!productExists) {
            return res.status(404).json({ message: 'Product not found.' });
        }
        const productId = String(req.params.productId);
        const history = getRecentCartHistory(req.user)
            .filter((entry) => entry.product !== productId);
        req.user.cartHistory = [{ product: productId, addedAt: new Date() }, ...history].slice(0, SEARCH_HISTORY_LIMIT);
        await req.user.save();
        return res.json({ cartHistory: getRecentCartHistory(req.user) });
    } catch (error) {
        console.error('Could not record customer cart activity:', error.message);
        return res.status(500).json({ message: 'Could not save your cart activity.' });
    }
};

module.exports = { getShoppingHistory, recordSearch, removeSearch, recordProductView, recordCartAdd };
