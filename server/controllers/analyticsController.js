const Order = require('../model/order');
const User = require('../model/user');
const Product = require('../model/product');

const getAdminStats = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments({ role: 'user' });
        const totalProducts = await Product.countDocuments({});
        const orders = await Order.find({});
        const totalOrders = orders.length;
        const totalRevenueData = orders.reduce((acc, item) => acc + (item.totalPrice || 0), 0);

        res.json({
            totalUsers,
            totalProducts,
            totalOrders,
            totalRevenue: totalRevenueData
        });
    } catch (error) {
        res.status(500).json({ message: 'Error Fetching stats', error });
    }
};

module.exports = { getAdminStats };