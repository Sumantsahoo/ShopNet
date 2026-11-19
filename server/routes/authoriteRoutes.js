const express=require('express');

const router=express.Router();
const {
    registerUser,
    loginUser,
    requestPasswordResetOtp,
    resetPasswordWithOtp,
    getUsers,
    getCustomerLocationOptions,
    getProfile,
    updateDefaultAddress,
    updateProfile
}=require("../controllers/authController");
const {protect}=require('../middleware/authMiddleWare');
const {admin}=require('../middleware/adminMiddleWare');
const {commerceStaff}=require('../middleware/commerceStaffMiddleWare');
const {
    getWishlist,
    addWishlistProduct,
    removeWishlistProduct
}=require('../controllers/wishlistController');
const sendEmail = require('../utils/sendEmail');
const {
    getShoppingHistory,
    recordSearch,
    removeSearch,
    recordProductView,
    recordCartAdd
}=require('../controllers/shoppingHistoryController');

router.get('/test-email', protect, admin, async (req, res) => {
    try {
        const targetEmail = req.query.email || process.env.EMAIL_USER || 'sumantkusahoo06@gmail.com';
        const info = await sendEmail(
            targetEmail,
            'Test Email from Render Backend',
            'If you receive this email, your Render email configuration is working perfectly!'
        );
        return res.json({ success: true, message: 'Email sent successfully', info });
    } catch (err) {
        return res.status(500).json({
            success: false,
            errorMessage: err.message,
            errorCode: err.code || null,
            errorResponse: err.response || null,
            hasEmailUser: Boolean(process.env.EMAIL_USER),
            hasEmailPass: Boolean(process.env.EMAIL_PASS),
            emailUserValue: process.env.EMAIL_USER ? process.env.EMAIL_USER.substring(0, 4) + '***' : null
        });
    }
});

router.post("/register",registerUser);
router.post('/login',loginUser);
router.post('/forgot-password/request-otp',requestPasswordResetOtp);
router.post('/forgot-password/reset',resetPasswordWithOtp);
router.get('/profile',protect,getProfile);
router.put('/profile',protect,updateDefaultAddress);
router.put('/profile/settings',protect,updateProfile);
router.get('/history',protect,getShoppingHistory);
router.post('/history/searches',protect,recordSearch);
router.delete('/history/searches',protect,removeSearch);
router.post('/history/products/:productId',protect,recordProductView);
router.post('/history/cart/:productId',protect,recordCartAdd);
router.get('/wishlist',protect,getWishlist);
router.post('/wishlist/:productId',protect,addWishlistProduct);
router.delete('/wishlist/:productId',protect,removeWishlistProduct);
router.get('/user/location-options',protect,commerceStaff,getCustomerLocationOptions);
router.get('/user',protect,commerceStaff,getUsers);

module.exports=router;
