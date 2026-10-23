const mongoose = require('mongoose');
const Product = require('../model/product');
const User = require('../model/user');

const getWishlist = async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .populate('wishlist', 'name price imageUrl category stock');
        return res.json(user?.wishlist || []);
    } catch (error) {
        console.error('Wishlist load failed:', error.message);
        return res.status(500).json({ message: 'Could not load your wishlist.' });
    }
};

const addWishlistProduct = async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.productId)) {
        return res.status(400).json({ message: 'Invalid product.' });
    }
    try {
        const product = await Product.findById(req.params.productId).select('_id');
        if (!product) return res.status(404).json({ message: 'Product not found.' });
        await User.findByIdAndUpdate(req.user._id, { $addToSet: { wishlist: product._id } });
        return res.json({ message: 'Added to wishlist.' });
    } catch (error) {
        console.error('Wishlist add failed:', error.message);
        return res.status(500).json({ message: 'Could not update your wishlist.' });
    }
};

const removeWishlistProduct = async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.productId)) {
        return res.status(400).json({ message: 'Invalid product.' });
    }
    try {
        await User.findByIdAndUpdate(req.user._id, { $pull: { wishlist: req.params.productId } });
        return res.json({ message: 'Removed from wishlist.' });
    } catch (error) {
        console.error('Wishlist remove failed:', error.message);
        return res.status(500).json({ message: 'Could not update your wishlist.' });
    }
};

module.exports = { getWishlist, addWishlistProduct, removeWishlistProduct };