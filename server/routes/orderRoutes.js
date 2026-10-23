const express = require('express');
const { protect } = require('../middleware/authMiddleWare');
const { admin } = require('../middleware/adminMiddleWare');
const {
    requestOrderOtp,
    verifyOrderOtp,
    createOrder,
    myOrders,
    requestExchange,
    getOrders,
    getOrderById,
    updateOrderStatus,
    reviewExchangeRequest,
    confirmManualPayment
} = require('../controllers/orderController');

const router = express.Router();

router.post('/request-otp', protect, requestOrderOtp);
router.post('/verify-otp', protect, verifyOrderOtp);
router.post('/', protect, createOrder);
router.get('/myorders', protect, myOrders);
router.post('/:id/exchange-request', protect, requestExchange);
router.get('/', protect, admin, getOrders);
router.put('/:id/payment-confirmation', protect, admin, confirmManualPayment);
router.put('/:id/exchange-request', protect, admin, reviewExchangeRequest);
router.get('/:id', protect, getOrderById);
router.put('/:id/status', protect, admin, updateOrderStatus);

module.exports = router;
