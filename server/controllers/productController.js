const Product = require('../model/product');
const Order = require('../model/order');
const cloudinary = require('../config/cloudinary');
const fs = require('fs/promises');

const removeUploadedFile = async (file) => {
    if (file?.path) {
        await fs.unlink(file.path).catch(() => {});
    }
};

const getProducts = async (req, res) => {
    try {
        const products = await Product.find({}).sort({ createdAt: -1 });
        return res.json(products);
    } catch (error) {
        return res.status(400).json({ message: error.message });
    }
};

const getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (product) {
            return res.json(product);
        }
        return res.status(404).json({ message: 'product not found' });
    } catch (error) {
        return res.status(400).json({ message: error.message });
    }
};

const createProduct = async (req, res) => {
    try {
        const { name, brand, description, price, originalPrice, category, stock, imageUrl: providedImageUrl } = req.body;
        if (!req.file && !providedImageUrl) {
            return res.status(400).json({ message: 'A product image is required' });
        }

        if (!name || !description || !category || price === undefined || stock === undefined) {
            await removeUploadedFile(req.file);
            return res.status(400).json({ message: 'Name, description, price, category, and stock are required' });
        }
        if (originalPrice !== undefined && originalPrice !== '' && Number(originalPrice) <= Number(price)) {
            await removeUploadedFile(req.file);
            return res.status(400).json({ message: 'Original price must be greater than the current price.' });
        }

        let imageUrl = providedImageUrl || '';
        if (req.file) {
            const result = await cloudinary.uploader.upload(req.file.path);
            if (!result.secure_url) {
                throw new Error('Cloudinary did not return a secure image URL');
            }
            imageUrl = result.secure_url;
            await removeUploadedFile(req.file);
        }

        const product = new Product({
            name,
            brand: typeof brand === 'string' ? brand.trim() : '',
            description,
            price,
            originalPrice: originalPrice === '' || originalPrice === undefined ? undefined : originalPrice,
            category: typeof category === 'string' ? category.trim() : category,
            stock,
            imageUrl
        });

        const createdProduct = await product.save();
        return res.status(201).json(createdProduct);
    } catch (error) {
        await removeUploadedFile(req.file);
        return res.status(400).json({ message: error.message });
    }
};

const updateProduct = async (req, res) => {
    try {
        const { name, brand, description, price, originalPrice, category, stock, imageUrl: providedImageUrl } = req.body;
        const product = await Product.findById(req.params.id);

        if (product) {
            const nextPrice = price === undefined ? Number(product.price) : Number(price);
            if (originalPrice !== undefined && originalPrice !== '' && Number(originalPrice) <= nextPrice) {
                return res.status(400).json({ message: 'Original price must be greater than the current price.' });
            }
            if (name !== undefined) product.name = name;
            if (brand !== undefined) product.brand = typeof brand === 'string' ? brand.trim() : '';
            if (description !== undefined) product.description = description;
            if (price !== undefined) product.price = price;
            if (originalPrice !== undefined) product.originalPrice = originalPrice === '' ? undefined : originalPrice;
            if (category !== undefined) product.category = typeof category === 'string' ? category.trim() : category;
            if (stock !== undefined) product.stock = stock;

            if (req.file) {
                const result = await cloudinary.uploader.upload(req.file.path);
                product.imageUrl = result.secure_url;
                await removeUploadedFile(req.file);
            } else if (providedImageUrl !== undefined) {
                product.imageUrl = providedImageUrl;
            }

            const updatedProduct = await product.save();
            return res.json(updatedProduct);
        }

        return res.status(404).json({ message: 'product not found' });
    } catch (error) {
        await removeUploadedFile(req.file);
        return res.status(400).json({ message: error.message });
    }
};

const deleteProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);

        if (product) {
            await product.deleteOne();
            return res.json({ message: 'Product removed' });
        }

        return res.status(404).json({ message: 'Product Not Found' });
    } catch (error) {
        return res.status(400).json({ message: error.message });
    }
};

const createProductReview = async (req, res) => {
    const rating = Number(req.body.rating);
    const comment = typeof req.body.comment === 'string' ? req.body.comment.trim() : '';
    if (!Number.isInteger(rating) || rating < 1 || rating > 5 || comment.length < 3 || comment.length > 1000) {
        return res.status(400).json({ message: 'Choose a rating from 1 to 5 and write a review between 3 and 1000 characters.' });
    }

    try {
        const deliveredOrder = await Order.exists({
            user: req.user._id,
            status: 'delivered',
            orderItems: { $elemMatch: { product: req.params.id } }
        });
        if (!deliveredOrder) {
            return res.status(403).json({ message: 'You can review this product after it has been delivered to you.' });
        }

        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ message: 'Product not found.' });
        }

        const existingReview = product.reviews.find((review) => review.user.toString() === req.user._id.toString());
        if (existingReview) {
            existingReview.rating = rating;
            existingReview.comment = comment;
            existingReview.createdAt = new Date();
        } else {
            product.reviews.push({ user: req.user._id, name: req.user.name, rating, comment });
        }
        product.numReviews = product.reviews.length;
        product.rating = product.numReviews
            ? product.reviews.reduce((total, review) => total + review.rating, 0) / product.numReviews
            : 0;
        await product.save();
        return res.status(existingReview ? 200 : 201).json({ message: 'Your review was saved.', product });
    } catch (error) {
        console.error('Product review save failed:', error.message);
        return res.status(500).json({ message: 'Could not save your review. Please try again.' });
    }
};

module.exports = {
    getProducts,
    getProductById,
    updateProduct,
    createProduct,
    deleteProduct,
    createProductReview
};