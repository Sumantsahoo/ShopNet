const express = require('express');
const { protect } = require('../middleware/authMiddleWare');
const { commerceStaff } = require('../middleware/commerceStaffMiddleWare');
const {
    createOrder,
    myOrders,
    getOrders,
    getOrderById,
    updateOrderStatus
} = require('../controllers/orderController');

const router = express.Router();

router.route('/').post(protect, createOrder).get(protect, commerceStaff, getOrders);
router.route('/myOrders').get(protect, myOrders);
router.route('/:id').get(protect, getOrderById);
router.route('/:id/status').put(protect, commerceStaff, updateOrderStatus);

module.exports = router;
