const express = require('express');
const { protect } = require('../middleware/authMiddleWare');
const { commerceStaff } = require('../middleware/commerceStaffMiddleWare');
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
router.get('/', protect, commerceStaff, getOrders);
router.put('/:id/payment-confirmation', protect, commerceStaff, confirmManualPayment);
router.put('/:id/exchange-request', protect, commerceStaff, reviewExchangeRequest);
router.get('/:id', protect, getOrderById);
router.put('/:id/status', protect, commerceStaff, updateOrderStatus);

module.exports = router;
