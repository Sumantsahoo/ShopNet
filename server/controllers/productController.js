const Product = require('../model/product');
const cloudinary = require('../config/cloudinary');
const fs = require('fs/promises');

const removeUploadedFile = async (file) => {
    if (file?.path) {
        await fs.unlink(file.path).catch(() => {});
    }
};

const getProducts = async (req, res) => {
    try {
        const products = await Product.find({});
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
        const { name, description, price, category, stock, imageUrl: providedImageUrl } = req.body;
        if (!req.file && !providedImageUrl) {
            return res.status(400).json({ message: 'A product image is required' });
        }

        if (!name || !description || !category || price === undefined || stock === undefined) {
            await removeUploadedFile(req.file);
            return res.status(400).json({ message: 'Name, description, price, category, and stock are required' });
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
            description,
            price,
            category,
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
        const { name, description, price, category, stock, imageUrl: providedImageUrl } = req.body;
        const product = await Product.findById(req.params.id);

        if (product) {
            if (name !== undefined) product.name = name;
            if (description !== undefined) product.description = description;
            if (price !== undefined) product.price = price;
            if (category !== undefined) product.category = category;
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

module.exports = {
    getProducts,
    getProductById,
    updateProduct,
    createProduct,
    deleteProduct
};