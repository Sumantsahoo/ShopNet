const commerceStaff = (req, res, next) => {
    if (req.user && ['admin', 'employee'].includes(req.user.role)) {
        return next();
    }
    return res.status(403).json({ message: 'Administrator or employee access is required.' });
};

module.exports = { commerceStaff };
