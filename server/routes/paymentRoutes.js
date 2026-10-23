const express = require('express');
const { protect } = require('../middleware/authMiddleWare');
const { createPaymentOrder, verifyPayment } = require('../controllers/paymentController');

const router = express.Router();

router.post('/order', protect, createPaymentOrder);
router.post('/payment', protect, verifyPayment);

module.exports = router;