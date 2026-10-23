const express=require('express');

const router=express.Router();
const {
    registerUser,
    loginUser,
    requestPasswordResetOtp,
    resetPasswordWithOtp,
    getUsers,
    getProfile,
    updateDefaultAddress
}=require("../controllers/authController");
const {protect}=require('../middleware/authMiddleWare');
const {admin}=require('../middleware/adminMiddleWare');
const {
    getWishlist,
    addWishlistProduct,
    removeWishlistProduct
}=require('../controllers/wishlistController');
router.post("/register",registerUser);
router.post('/login',loginUser);
router.post('/forgot-password/request-otp',requestPasswordResetOtp);
router.post('/forgot-password/reset',resetPasswordWithOtp);
router.get('/profile',protect,getProfile);
router.put('/profile',protect,updateDefaultAddress);
router.get('/wishlist',protect,getWishlist);
router.post('/wishlist/:productId',protect,addWishlistProduct);
router.delete('/wishlist/:productId',protect,removeWishlistProduct);
router.get('/user',protect,admin,getUsers);
// router.post('/verify-email',async(req,res)=>{
//     const{email}=req.body;
// });
module.exports=router;
