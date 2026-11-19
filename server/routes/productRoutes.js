const express=require('express');
const {protect}=require('../middleware/authMiddleWare');
const {productManager}=require('../middleware/productManagerMiddleWare');
const {getProducts,getProductById,createProduct,updateProduct,deleteProduct,createProductReview,updateFeaturedProducts}=require('../controllers/productController');
const multer=require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}
const upload=multer({dest:uploadDir});
const router=express.Router();
router.post('/:id/reviews', protect, createProductReview);
//for all users who can see the products without login
router.route('/').get(getProducts).post(protect,productManager,upload.single('image'),createProduct);
router.put('/picked-for-you', protect, productManager, updateFeaturedProducts);
//for specific product and id that can add by admin and can be see by all users
router.route('/:id').get(getProductById).put(protect,productManager,upload.single('image'),updateProduct).delete(protect,productManager,deleteProduct);
module.exports=router;
