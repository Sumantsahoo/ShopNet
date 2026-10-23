const Razorpay = require('razorpay');
const crypto = require('crypto');
const Order = require('../model/order');
const User = require('../model/user');
const sendEmail = require('../utils/sendEmail');

const safeCompareHex = (left, right) => {
    const leftBuffer = Buffer.from(left, 'hex');
    const rightBuffer = Buffer.from(right, 'hex');
    return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

const createPaymentOrder = async (req, res) => {
    try {
        const { orderId } = req.body;
        if (!orderId) {
            return res.status(400).json({ message: 'Order ID is required' });
        }
        const order = await Order.findOne({ _id: orderId, user: req.user._id });

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }
        if (order.isPaid) {
            return res.status(400).json({ message: 'Order is already paid' });
        }

        const instance = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET
        });
        const razorpayOrder = await instance.orders.create({
            amount: Math.round(order.totalPrice * 100),
            currency: 'INR',
            receipt: order._id.toString()
        });

        order.razorpayOrderId = razorpayOrder.id;
        await order.save();

        return res.status(201).json({
            orderId: order._id,
            razorpayOrderId: razorpayOrder.id,
            amount: razorpayOrder.amount,
            currency: razorpayOrder.currency,
            keyId: process.env.RAZORPAY_KEY_ID
        });
    } catch (error) {
        console.error('Razorpay order creation failed:', error.message);
        return res.status(500).json({ message: 'Unable to create payment order' });
    }
};

const verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ message: 'Payment details are required' });
        }

        const order = await Order.findOne({
            razorpayOrderId: razorpay_order_id,
            user: req.user._id
        });
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        const generatedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex');

        if (!safeCompareHex(generatedSignature, razorpay_signature)) {
            return res.status(400).json({ message: 'Payment verification failed' });
        }

        if (order.isPaid) {
            return res.json({ message: 'Payment was already verified', order });
        }

        order.isPaid = true;
        order.paidAt = new Date();
        order.status = 'processing';
        order.processingAt = order.processingAt || order.paidAt;
        order.paymentConfirmation = 'razorpay';
        order.manualPaymentReference = undefined;
        order.paymentConfirmedBy = undefined;
        order.paymentResult = {
            razorpayPaymentId: razorpay_payment_id,
            razorpaySignature: razorpay_signature
        };
        await order.save();

        try {
            const user = await User.findById(order.user).select('email');
            if (user?.email) {
                await sendEmail(user.email, 'Order Confirmation', `Your payment was successful and your order with ID ${order._id} is confirmed. Total amount: INR ${order.totalPrice}.`);
            }
        } catch (emailError) {
            console.error('Paid order confirmation email failed:', emailError.message);
        }

        return res.json({ message: 'Payment verified successfully', order });
    } catch (error) {
        console.error('Razorpay payment verification failed:', error.message);
        return res.status(500).json({ message: 'Unable to verify payment' });
    }
};

module.exports = { createPaymentOrder, verifyPayment };
