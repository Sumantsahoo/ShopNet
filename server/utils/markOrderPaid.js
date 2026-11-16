const Order = require('../model/order');
const Product = require('../model/product');

const markOrderPaid = async (order, paymentFields) => {
    const claim = await Order.updateOne(
        { _id: order._id, isPaid: false, inventoryDeducted: { $ne: true } },
        { $set: { inventoryDeducted: true } }
    );
    if (claim.modifiedCount !== 1) {
        const latestOrder = await Order.findById(order._id);
        if (latestOrder?.isPaid) return { order: latestOrder, alreadyPaid: true };
        throw new Error('Order inventory is already being updated. Please retry in a moment.');
    }

    const decrementedProducts = [];
    try {
        for (const item of order.orderItems) {
            const result = await Product.updateOne(
                { _id: item.product, stock: { $gte: item.qty } },
                { $inc: { stock: -item.qty } }
            );
            if (result.modifiedCount !== 1) {
                throw new Error(`${item.name} no longer has enough stock to complete this order.`);
            }
            decrementedProducts.push(item);
        }

        const paidAt = new Date();
        const updatedOrder = await Order.findOneAndUpdate(
            { _id: order._id, isPaid: false, inventoryDeducted: true },
            {
                $set: {
                    ...paymentFields,
                    isPaid: true,
                    paidAt,
                    status: 'processing',
                    processingAt: order.processingAt || paidAt
                }
            },
            { new: true }
        );
        if (!updatedOrder) throw new Error('Could not finalize payment for this order.');
        return { order: updatedOrder, alreadyPaid: false };
    } catch (error) {
        for (const item of decrementedProducts.reverse()) {
            const rollback = await Product.updateOne(
                { _id: item.product },
                { $inc: { stock: item.qty } }
            );
            if (rollback.modifiedCount !== 1) {
                console.error(`Could not restore ${item.name} stock after payment update failed.`);
            }
        }
        await Order.updateOne(
            { _id: order._id, isPaid: false, inventoryDeducted: true },
            { $set: { inventoryDeducted: false } }
        );
        throw error;
    }
};

module.exports = markOrderPaid;
