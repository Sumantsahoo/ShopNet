const employee = (req, res, next) => {
    if (req.user?.role === 'employee' && req.user.employmentStatus === 'active') {
        return next();
    }
    return res.status(403).json({ message: 'Active employee access is required.' });
};

module.exports = { employee };
