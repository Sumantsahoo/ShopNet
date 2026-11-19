const Order = require('../model/order');
const Product = require('../model/product');
const User = require('../model/user');
const { createHash, randomBytes, randomInt, timingSafeEqual } = require('crypto');
const sendEmail = require('../utils/sendEmail');
const markOrderPaid = require('../utils/markOrderPaid');
const {
    getEffectiveProductPrice,
    getRegularPrice,
    isAdditionalOfferLive
} = require('../utils/productPricing');

const hashSecret = (value) => createHash('sha256').update(value).digest();
const EXCHANGE_WINDOW_MS = 10 * 24 * 60 * 60 * 1000;

const requestOrderOtp = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: 'Account not found.' });
        }
        if (user.orderOtpSentAt && Date.now() - user.orderOtpSentAt.getTime() < 60 * 1000) {
            return res.status(429).json({ message: 'Please wait one minute before requesting another order code.' });
        }

        const otp = randomInt(100000, 1000000).toString();
        const sentAt = new Date();
        user.orderOtpHash = hashSecret(otp).toString('hex');
        user.orderOtpExpiresAt = new Date(sentAt.getTime() + 10 * 60 * 1000);
        user.orderOtpSentAt = sentAt;
        user.orderOtpAttempts = 0;
        user.orderAuthorizationHash = undefined;
        user.orderAuthorizationExpiresAt = undefined;
        await user.save();

        try {
            await sendEmail(
                user.email,
                'Confirm your ShopNest order',
                `Your ShopNest order confirmation code is ${otp}. Enter it at checkout to confirm your order. It expires in 10 minutes. Do not share it with anyone.`
            );
            return res.json({ message: `A confirmation code was sent to ${user.email}. Please check your inbox (and spam folder).` });
        } catch (emailError) {
            console.error('Order confirmation email failed:', emailError.message);
            user.orderOtpHash = undefined;
            user.orderOtpExpiresAt = undefined;
            user.orderOtpSentAt = undefined;
            await user.save();
            return res.status(503).json({ 
                message: `Could not send confirmation code to ${user.email}. Add RESEND_API_KEY to your Render environment variables to send emails over HTTPS.`,
                error: emailError.message 
            });
        }
    } catch (error) {
        console.error('Could not request order confirmation code:', error.message);
        return res.status(500).json({ message: 'Could not request an order confirmation code. Please try again.' });
    }
};

const verifyOrderOtp = async (req, res) => {
    const { otp } = req.body;
    if (!/^\d{6}$/.test(otp || '')) {
        return res.status(400).json({ message: 'Enter the six-digit order confirmation code.' });
    }

    try {
        const user = await User.findById(req.user._id);
        if (!user || !user.orderOtpHash || !user.orderOtpExpiresAt || user.orderOtpExpiresAt <= new Date()) {
            return res.status(400).json({ message: 'Your order code is invalid or expired. Request a new code.' });
        }
        if (user.orderOtpAttempts >= 5) {
            return res.status(429).json({ message: 'Too many incorrect attempts. Request a new order code.' });
        }

        const expectedHash = Buffer.from(user.orderOtpHash, 'hex');
        const suppliedHash = hashSecret(otp);
        if (expectedHash.length !== suppliedHash.length || !timingSafeEqual(expectedHash, suppliedHash)) {
            user.orderOtpAttempts += 1;
            await user.save();
            return res.status(400).json({ message: 'Incorrect order confirmation code.' });
        }

        const orderAuthorization = randomBytes(32).toString('hex');
        user.orderOtpHash = undefined;
        user.orderOtpExpiresAt = undefined;
        user.orderOtpSentAt = undefined;
        user.orderOtpAttempts = 0;
        user.orderAuthorizationHash = hashSecret(orderAuthorization).toString('hex');
        user.orderAuthorizationExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
        await user.save();

        return res.json({ orderAuthorization, message: 'Email confirmed. You can now place this order.' });
    } catch (error) {
        console.error('Order confirmation code verification failed:', error.message);
        return res.status(500).json({ message: 'Could not verify the order confirmation code. Please try again.' });
    }
};

const createOrder = async (req, res) => {
    try {
        const { orderItems, shippingAddress, paymentMethod, orderAuthorization } = req.body;

        if (!Array.isArray(orderItems) || orderItems.length === 0) {
            return res.status(400).json({ message: 'No order items' });
        }
        const requiredAddressFields = ['fullName', 'phone', 'address', 'city', 'district', 'state', 'postalCode', 'country'];
        if (!shippingAddress || requiredAddressFields.some((field) => typeof shippingAddress[field] !== 'string' || !shippingAddress[field].trim()) || typeof paymentMethod !== 'string' || !paymentMethod.trim()) {
            return res.status(400).json({ message: 'Shipping address and payment method are required' });
        }
        const invalidOptionalLocation = ['block', 'village'].some((field) => (
            shippingAddress[field] !== undefined &&
            (typeof shippingAddress[field] !== 'string' || shippingAddress[field].trim().length > 100)
        ));
        if (invalidOptionalLocation) {
            return res.status(400).json({ message: 'Block and village names must be 100 characters or fewer.' });
        }
        if (shippingAddress.fullName.trim().length > 80 || shippingAddress.address.trim().length > 300 ||
            shippingAddress.city.trim().length > 100 || shippingAddress.district.trim().length > 100 ||
            shippingAddress.state.trim().length > 100 || !/^\d{6}$/.test(shippingAddress.postalCode.trim())) {
            return res.status(400).json({ message: 'Enter a valid shipping address with a six-digit PIN code.' });
        }
        const validIndianMobile = (value) => typeof value === 'string' && /^[6-9]\d{9}$/.test(value);
        if (!validIndianMobile(shippingAddress.phone) || (shippingAddress.altPhone && !validIndianMobile(shippingAddress.altPhone))) {
            return res.status(400).json({ message: 'Phone numbers must be valid 10-digit Indian mobile numbers.' });
        }
        if (typeof orderAuthorization !== 'string' || !/^[a-f0-9]{64}$/.test(orderAuthorization)) {
            return res.status(403).json({ message: 'Confirm your email with the order code before placing this order.' });
        }

        const normalizedItems = orderItems.map((item) => ({
            product: item.product,
            qty: Number(item.qty)
        }));
        if (normalizedItems.some((item) => !item.product || !Number.isInteger(item.qty) || item.qty < 1)) {
            return res.status(400).json({ message: 'Each order item must have a product and a valid quantity.' });
        }

        const productIds = normalizedItems.map((item) => item.product);
        const products = await Product.find({ _id: { $in: productIds } });
        if (products.length !== productIds.length) {
            return res.status(400).json({ message: 'One or more products do not exist' });
        }

        const productById = new Map(products.map((product) => [product._id.toString(), product]));
        for (const item of normalizedItems) {
            const product = productById.get(item.product.toString());
            if (item.qty > product.stock) {
                return res.status(400).json({ message: `${product.name} does not have enough stock for this quantity.` });
            }
        }

        const verifiedItems = normalizedItems.map((item) => {
            const product = productById.get(item.product.toString());
            const offerIsLive = isAdditionalOfferLive(product);
            return {
                name: product.name,
                qty: item.qty,
                price: getEffectiveProductPrice(product),
                regularPrice: getRegularPrice(product),
                originalPrice: product.originalPrice,
                discountPercent: product.discountPercent,
                additionalDiscountPercent: offerIsLive ? product.additionalDiscountPercent : 0,
                additionalOfferActive: offerIsLive,
                product: product._id
            };
        });
        const itemsPrice = verifiedItems.reduce((acc, item) => acc + (item.price * item.qty), 0);
        const taxPrice = Math.round(itemsPrice * 0.005 * 100) / 100;
        const promiseFee = 5;
        const shippingPrice = 9;
        const totalPrice = Math.round((itemsPrice + taxPrice + promiseFee + shippingPrice) * 100) / 100;

        const normalizedShippingAddress = {
            fullName: shippingAddress.fullName.trim(),
            phone: shippingAddress.phone.trim(),
            altPhone: typeof shippingAddress.altPhone === 'string' ? shippingAddress.altPhone.trim() : '',
            address: shippingAddress.address.trim(),
            city: shippingAddress.city.trim(),
            district: shippingAddress.district.trim(),
            block: typeof shippingAddress.block === 'string' ? shippingAddress.block.trim() : '',
            village: typeof shippingAddress.village === 'string' ? shippingAddress.village.trim() : '',
            state: shippingAddress.state.trim(),
            postalCode: shippingAddress.postalCode.trim(),
            country: shippingAddress.country.trim()
        };
        const consumedAuthorization = await User.findOneAndUpdate(
            {
                _id: req.user._id,
                orderAuthorizationHash: hashSecret(orderAuthorization).toString('hex'),
                orderAuthorizationExpiresAt: { $gt: new Date() }
            },
            {
                $unset: { orderAuthorizationHash: 1, orderAuthorizationExpiresAt: 1 },
                $set: {
                    defaultAddress: {
                        fullName: normalizedShippingAddress.fullName,
                        phone: normalizedShippingAddress.phone,
                        altPhone: normalizedShippingAddress.altPhone,
                        street: normalizedShippingAddress.address,
                        district: normalizedShippingAddress.district,
                        block: normalizedShippingAddress.block,
                        village: normalizedShippingAddress.village,
                        state: normalizedShippingAddress.state,
                        postalCode: normalizedShippingAddress.postalCode,
                        country: normalizedShippingAddress.country
                    }
                }
            }
        );
        if (!consumedAuthorization) {
            return res.status(403).json({ message: 'Your order confirmation expired or was already used. Request a new code.' });
        }

        const order = await Order.create({
            orderItems: verifiedItems,
            shippingAddress: normalizedShippingAddress,
            paymentMethod,
            itemsPrice,
            taxPrice,
            promiseFee,
            shippingPrice,
            totalPrice,
            user: req.user._id
        });

        return res.status(201).json({ message: 'Order created successfully', order });
    } catch (error) {
        console.error('Order creation failed:', error.message);
        return res.status(500).json({ message: 'Could not create the order. Please try again.' });
    }
};

const myOrders = async (req, res) => {
    try {
        const orders = await Order.find({ user: req.user._id }).populate('orderItems.product', 'name brand category price imageUrl rating numReviews showInRatingReviews');
        return res.json(orders);
    } catch (error) {
        return res.status(500).json({ message: 'Server error' });
    }
};

const requestExchange = async (req, res) => {
    const reason = typeof req.body.reason === 'string' ? req.body.reason.trim() : '';
    if (reason.length < 5 || reason.length > 500) {
        return res.status(400).json({ message: 'Tell us why you are requesting an exchange (5–500 characters).' });
    }

    try {
        const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
        if (!order) {
            return res.status(404).json({ message: 'Order not found.' });
        }
        if (!order.isPaid || !order.isDelivered || !order.deliveredAt) {
            return res.status(400).json({ message: 'An exchange can only be requested for a paid and delivered order.' });
        }
        if (Date.now() > order.deliveredAt.getTime() + EXCHANGE_WINDOW_MS) {
            return res.status(400).json({ message: 'The 10-day exchange period has ended.' });
        }
        if (order.exchangeRequest?.status) {
            return res.status(409).json({ message: 'An exchange request already exists for this order.' });
        }

        order.exchangeRequest = {
            status: 'requested',
            reason,
            requestedAt: new Date()
        };
        await order.save();
        await order.populate('orderItems.product', 'name price imageUrl');
        return res.status(201).json({ message: 'Exchange request submitted.', order });
    } catch (error) {
        console.error('Exchange request failed:', error.message);
        return res.status(400).json({ message: 'Could not submit the exchange request.' });
    }
};

const getOrderById = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('user', 'id name email')
            .populate('orderItems.product', 'name brand price imageUrl rating numReviews');

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        const isOwner = order.user._id.toString() === req.user._id.toString();
        if (!isOwner && !['admin', 'employee'].includes(req.user.role)) {
            return res.status(403).json({ message: 'Not authorized to view this order' });
        }

        return res.json(order);
    } catch (error) {
        return res.status(400).json({ message: 'Invalid order ID' });
    }
};

const getOrders = async (req, res) => {
    try {
        const orders = await Order.find({})
            .sort({ createdAt: -1 })
            .populate('user', 'id name email')
            .populate('paymentConfirmedBy', 'name email')
            .populate('orderItems.product', 'name brand price imageUrl rating numReviews');
        return res.json(orders);
    } catch (error) {
        return res.status(500).json({ message: 'server Error' });
    }
};

const updateOrderStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['pending', 'processing', 'shipped', 'in_transit', 'out_for_delivery', 'delivered'];

        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: 'Invalid order status' });
        }

        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        if (status !== 'pending' && !order.isPaid) {
            return res.status(400).json({ message: 'Only paid orders can be processed, shipped, or delivered.' });
        }

        const statusProgress = ['pending', 'processing', 'shipped', 'in_transit', 'out_for_delivery', 'delivered'];
        if (statusProgress.indexOf(status) < statusProgress.indexOf(order.status)) {
            return res.status(400).json({ message: 'Order fulfillment status cannot move backward.' });
        }

        const wasDelivered = order.isDelivered;
        const statusChangedAt = new Date();
        order.status = status;
        order.isDelivered = status === 'delivered';
        if (status === 'processing' && !order.processingAt) order.processingAt = statusChangedAt;
        if (status === 'shipped' && !order.shippedAt) order.shippedAt = statusChangedAt;
        if (status === 'in_transit' && !order.inTransitAt) order.inTransitAt = statusChangedAt;
        if (status === 'out_for_delivery' && !order.outForDeliveryAt) order.outForDeliveryAt = statusChangedAt;
        order.deliveredAt = status === 'delivered'
            ? (wasDelivered ? order.deliveredAt : statusChangedAt)
            : order.deliveredAt;
        await order.save();
        const updatedOrder = await Order.findById(order._id)
            .populate('user', 'id name email')
            .populate('paymentConfirmedBy', 'name email')
            .populate('orderItems.product', 'name brand price originalPrice imageUrl rating numReviews');
        return res.json({ message: 'Order status updated successfully', order: updatedOrder });
    } catch (error) {
        return res.status(500).json({ message: 'Server error' });
    }
};

const reviewExchangeRequest = async (req, res) => {
    const { status } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ message: 'Choose approved or rejected.' });
    }

    try {
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ message: 'Order not found.' });
        }
        if (order.exchangeRequest?.status !== 'requested') {
            return res.status(409).json({ message: 'There is no pending exchange request for this order.' });
        }

        order.exchangeRequest.status = status;
        order.exchangeRequest.reviewedAt = new Date();
        await order.save();
        const updatedOrder = await Order.findById(order._id)
            .populate('user', 'id name email')
            .populate('orderItems.product', 'name brand price originalPrice imageUrl rating numReviews');
        return res.json({ message: `Exchange request ${status}.`, order: updatedOrder });
    } catch (error) {
        console.error('Exchange request review failed:', error.message);
        return res.status(500).json({ message: 'Could not update the exchange request.' });
    }
};

const confirmManualPayment = async (req, res) => {
    const reference = typeof req.body.reference === 'string' ? req.body.reference.trim() : '';
    if (reference.length < 4 || reference.length > 120) {
        return res.status(400).json({ message: 'Enter the payment reference from your payment provider (4–120 characters).' });
    }

    try {
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ message: 'Order not found.' });
        }
        if (order.isPaid) {
            return res.status(409).json({ message: 'This order is already marked as paid.' });
        }

        const { order: paidOrder, alreadyPaid } = await markOrderPaid(order, {
            paymentConfirmation: 'admin',
            manualPaymentReference: reference,
            paymentConfirmedBy: req.user._id
        });
        if (alreadyPaid) {
            return res.status(409).json({ message: 'This order was already marked as paid.' });
        }
        if (!paidOrder) {
            return res.status(409).json({ message: 'Could not confirm payment for this order.' });
        }

        const updatedOrder = await Order.findById(paidOrder._id)
            .populate('user', 'id name email')
            .populate('paymentConfirmedBy', 'name email')
            .populate('orderItems.product', 'name brand price originalPrice imageUrl rating numReviews');
        return res.json({ message: 'Payment manually confirmed. Check fulfillment details before shipping.', order: updatedOrder });
    } catch (error) {
        console.error('Admin payment confirmation failed:', error.message);
        if (error.message.includes('stock') || error.message.includes('inventory')) {
            return res.status(409).json({ message: error.message });
        }
        return res.status(500).json({ message: 'Could not confirm payment. Please try again.' });
    }
};

module.exports = {
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
};