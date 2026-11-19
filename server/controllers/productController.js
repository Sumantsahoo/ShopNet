const Product = require('../model/product');
const Order = require('../model/order');
const mongoose = require('mongoose');
const cloudinary = require('../config/cloudinary');
const fs = require('fs/promises');
const {
    normalizePromotionalPricing,
    getRegularPrice,
    toProductResponse
} = require('../utils/productPricing');

const removeUploadedFile = async (file) => {
    if (file?.path) {
        await fs.unlink(file.path).catch(() => {});
    }
};

const parseBoolean = (value, defaultValue) => {
    if (value === undefined) return defaultValue;
    return value === true || value === 'true';
};

const parseSizes = (value) => {
    const sizes = Array.isArray(value) ? value : String(value || '').split(',');
    return [...new Set(sizes.map((size) => String(size).trim()).filter(Boolean))];
};

const getProducts = async (req, res) => {
    try {
        const products = await Product.find({}).sort({ updatedAt: -1, createdAt: -1 });
        return res.json(products.map(toProductResponse));
    } catch (error) {
        return res.status(400).json({ message: error.message });
    }
};

const getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (product) {
            return res.json(toProductResponse(product));
        }
        return res.status(404).json({ message: 'product not found' });
    } catch (error) {
        return res.status(400).json({ message: error.message });
    }
};

const createProduct = async (req, res) => {
    try {
        const {
            name, brand, color, gender, countryOfOrigin, occasion, sizes, fastDelivery,
            description, price, originalPrice, category, stock, imageUrl: providedImageUrl,
            discountPercent, additionalDiscountPercent, additionalOfferActive, additionalOfferExpiresAt,
            showInAllProducts, showInCelebrate, showInValue365,
            showInRatingReviews, showInSuggested, showInStillLooking, showInFeatured, showInBrandSpotlight, showInSeasonalDeals
        } = req.body;
        if (!req.file && !providedImageUrl) {
            return res.status(400).json({ message: 'A product image is required' });
        }

        if (!name || !description || !category || price === undefined || stock === undefined) {
            await removeUploadedFile(req.file);
            return res.status(400).json({ message: 'Name, description, price, category, and stock are required' });
        }
        const pricing = normalizePromotionalPricing(
            price,
            originalPrice,
            discountPercent,
            additionalDiscountPercent,
            parseBoolean(additionalOfferActive, true),
            additionalOfferExpiresAt
        );

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
            color: typeof color === 'string' ? color.trim() : '',
            gender: typeof gender === 'string' ? gender.trim() : '',
            countryOfOrigin: typeof countryOfOrigin === 'string' ? countryOfOrigin.trim() : '',
            occasion: typeof occasion === 'string' ? occasion.trim() : '',
            sizes: parseSizes(sizes),
            fastDelivery: parseBoolean(fastDelivery, false),
            description,
            ...pricing,
            category: typeof category === 'string' ? category.trim() : category,
            stock,
            imageUrl,
            showInAllProducts: parseBoolean(showInAllProducts, true),
            showInCelebrate: parseBoolean(showInCelebrate, false),
            showInValue365: parseBoolean(showInValue365, false),
            showInRatingReviews: parseBoolean(showInRatingReviews, false),
            showInSuggested: parseBoolean(showInSuggested, false),
            showInStillLooking: parseBoolean(showInStillLooking, false),
            showInFeatured: parseBoolean(showInFeatured, false),
            showInBrandSpotlight: parseBoolean(showInBrandSpotlight, false),
            showInSeasonalDeals: parseBoolean(showInSeasonalDeals, false)
        });

        const createdProduct = await product.save();
        return res.status(201).json(toProductResponse(createdProduct));
    } catch (error) {
        await removeUploadedFile(req.file);
        return res.status(400).json({ message: error.message });
    }
};

const updateProduct = async (req, res) => {
    try {
        const {
            name, brand, color, gender, countryOfOrigin, occasion, sizes, fastDelivery,
            description, price, originalPrice, category, stock, imageUrl: providedImageUrl,
            discountPercent, additionalDiscountPercent, additionalOfferActive, additionalOfferExpiresAt,
            showInAllProducts, showInCelebrate, showInValue365,
            showInRatingReviews, showInSuggested, showInStillLooking, showInFeatured, showInBrandSpotlight, showInSeasonalDeals
        } = req.body;
        const product = await Product.findById(req.params.id);

        if (product) {
            if (price !== undefined || originalPrice !== undefined || discountPercent !== undefined ||
                additionalDiscountPercent !== undefined || additionalOfferActive !== undefined ||
                additionalOfferExpiresAt !== undefined) {
                const nextPrice = price === undefined
                    ? getRegularPrice(product)
                    : price;
                const nextOriginalPrice = originalPrice === undefined ? product.originalPrice : originalPrice;
                const nextDiscountPercent = discountPercent === undefined ? product.discountPercent : discountPercent;
                const nextAdditionalDiscountPercent = additionalDiscountPercent === undefined
                    ? product.additionalDiscountPercent
                    : additionalDiscountPercent;
                const nextOfferActive = additionalOfferActive === undefined
                    ? product.additionalOfferActive
                    : parseBoolean(additionalOfferActive, true);
                const nextOfferExpiresAt = additionalOfferExpiresAt === undefined
                    ? product.additionalOfferExpiresAt
                    : additionalOfferExpiresAt;
                const pricing = normalizePromotionalPricing(
                    nextPrice,
                    nextOriginalPrice,
                    nextDiscountPercent,
                    nextAdditionalDiscountPercent,
                    nextOfferActive,
                    nextOfferExpiresAt
                );
                product.price = pricing.price;
                product.basePrice = pricing.basePrice;
                product.originalPrice = pricing.originalPrice;
                product.discountPercent = pricing.discountPercent;
                product.additionalDiscountPercent = pricing.additionalDiscountPercent;
                product.additionalOfferActive = pricing.additionalOfferActive;
                product.additionalOfferExpiresAt = pricing.additionalOfferExpiresAt;
            }
            if (name !== undefined) product.name = name;
            if (brand !== undefined) product.brand = typeof brand === 'string' ? brand.trim() : '';
            if (color !== undefined) product.color = typeof color === 'string' ? color.trim() : '';
            if (gender !== undefined) product.gender = typeof gender === 'string' ? gender.trim() : '';
            if (countryOfOrigin !== undefined) product.countryOfOrigin = typeof countryOfOrigin === 'string' ? countryOfOrigin.trim() : '';
            if (occasion !== undefined) product.occasion = typeof occasion === 'string' ? occasion.trim() : '';
            if (sizes !== undefined) product.sizes = parseSizes(sizes);
            if (fastDelivery !== undefined) product.fastDelivery = parseBoolean(fastDelivery, false);
            if (description !== undefined) product.description = description;
            if (category !== undefined) product.category = typeof category === 'string' ? category.trim() : category;
            if (stock !== undefined) product.stock = stock;
            if (showInAllProducts !== undefined) product.showInAllProducts = parseBoolean(showInAllProducts, false);
            if (showInCelebrate !== undefined) product.showInCelebrate = parseBoolean(showInCelebrate, false);
            if (showInValue365 !== undefined) product.showInValue365 = parseBoolean(showInValue365, false);
            if (showInRatingReviews !== undefined) product.showInRatingReviews = parseBoolean(showInRatingReviews, false);
            if (showInSuggested !== undefined) product.showInSuggested = parseBoolean(showInSuggested, false);
            if (showInStillLooking !== undefined) product.showInStillLooking = parseBoolean(showInStillLooking, false);
            if (showInFeatured !== undefined) product.showInFeatured = parseBoolean(showInFeatured, false);
            if (showInBrandSpotlight !== undefined) product.showInBrandSpotlight = parseBoolean(showInBrandSpotlight, false);
            if (showInSeasonalDeals !== undefined) product.showInSeasonalDeals = parseBoolean(showInSeasonalDeals, false);

            if (req.file) {
                const result = await cloudinary.uploader.upload(req.file.path);
                if (!result.secure_url) {
                    throw new Error('Cloudinary did not return a secure image URL');
                }
                product.imageUrl = result.secure_url;
                await removeUploadedFile(req.file);
            } else if (providedImageUrl !== undefined) {
                product.imageUrl = providedImageUrl;
            }

            product.updatedAt = new Date();
            const updatedProduct = await product.save();
            return res.json(toProductResponse(updatedProduct));
        }

        await removeUploadedFile(req.file);
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
        return res.status(existingReview ? 200 : 201).json({ message: 'Your review was saved.', product: toProductResponse(product) });
    } catch (error) {
        console.error('Product review save failed:', error.message);
        return res.status(500).json({ message: 'Could not save your review. Please try again.' });
    }
};

const updateFeaturedProducts = async (req, res) => {
    const entries = req.body.products;
    if (!Array.isArray(entries) || entries.length > 50) {
        return res.status(400).json({ message: 'Choose up to 50 products for Picked for You.' });
    }

    const seenIds = new Set();
    for (const entry of entries) {
        const productId = String(entry?.productId || '');
        if (!mongoose.isValidObjectId(productId) || typeof entry.active !== 'boolean') {
            return res.status(400).json({ message: 'Each Picked for You entry needs a valid product and active status.' });
        }
        if (seenIds.has(productId)) {
            return res.status(400).json({ message: 'A product can only be selected once for Picked for You.' });
        }
        seenIds.add(productId);
    }

    try {
        const selectedIds = [...seenIds];
        const selectedProducts = selectedIds.length
            ? await Product.find({ _id: { $in: selectedIds } }).select('_id stock showInAllProducts').lean()
            : [];
        if (selectedProducts.length !== selectedIds.length) {
            return res.status(404).json({ message: 'One or more selected products could not be found.' });
        }
        const selectedById = new Map(selectedProducts.map((product) => [String(product._id), product]));
        if (entries.some((entry) => entry.active && (
            Number(selectedById.get(String(entry.productId)).stock) <= 0 ||
            selectedById.get(String(entry.productId)).showInAllProducts === false
        ))) {
            return res.status(400).json({ message: 'Unavailable or hidden products must be deactivated before saving Picked for You.' });
        }

        const operations = [
            {
                updateMany: {
                    filter: { showInFeatured: true },
                    update: { $set: { showInFeatured: false } }
                }
            },
            ...entries.map((entry, featuredOrder) => ({
                updateOne: {
                    filter: { _id: entry.productId },
                    update: { $set: { showInFeatured: true, featuredActive: entry.active, featuredOrder } }
                }
            }))
        ];
        await Product.bulkWrite(operations);
        const products = await Product.find({ showInFeatured: true })
            .sort({ featuredOrder: 1, updatedAt: -1 })
            .lean();
        return res.json({ products: products.map(toProductResponse) });
    } catch (error) {
        console.error('Could not update Picked for You products:', error.message);
        return res.status(500).json({ message: 'Could not save Picked for You products.' });
    }
};

module.exports = {
    getProducts,
    getProductById,
    updateProduct,
    createProduct,
    deleteProduct,
    createProductReview,
    updateFeaturedProducts
};