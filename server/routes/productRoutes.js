const express=require('express');
const {protect}=require('../middleware/authMiddleWare');
const {admin}=require('../middleware/adminMiddleWare');
const {getProducts,getProductById,createProduct,updateProduct,deleteProduct}=require('../controllers/productController');
const multer=require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}
const upload=multer({dest:uploadDir});
const router=express.Router();
//for all users who can see the products without login
router.route('/').get(getProducts).post(protect,admin,upload.single('image'),createProduct);
//for specific product and id that can add by admin and can be see by all users
router.route('/:id').get(getProductById).put(protect,admin,upload.single('image'),updateProduct).delete(protect,admin,deleteProduct);
module.exports=router;
