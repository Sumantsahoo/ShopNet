const express=require('express');

const router=express.Router();
const {
    registerUser,
    loginUser,
    requestPasswordResetOtp,
    resetPasswordWithOtp,
    getUsers,
    getProfile,
    updateDefaultAddress,
    updateProfile
}=require("../controllers/authController");
const {protect}=require('../middleware/authMiddleWare');
const {admin}=require('../middleware/adminMiddleWare');
const {
    getWishlist,
    addWishlistProduct,
    removeWishlistProduct
}=require('../controllers/wishlistController');
const sendEmail = require('../utils/sendEmail');

router.get('/test-email', async (req, res) => {
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
router.get('/wishlist',protect,getWishlist);
router.post('/wishlist/:productId',protect,addWishlistProduct);
router.delete('/wishlist/:productId',protect,removeWishlistProduct);
router.get('/user',protect,admin,getUsers);

module.exports=router;
