const productManager = (req, res, next) => {
    if (req.user && ['admin', 'employee'].includes(req.user.role)) {
        return next();
    }
    return res.status(403).json({ message: 'Product management access is required.' });
};

module.exports = { productManager };
