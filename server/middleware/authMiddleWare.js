const jwt = require('jsonwebtoken');
const User = require('../model/user');

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = await User.findById(decoded.id).select('-password');

            if (!req.user) {
                return res.status(401).json({ message: 'Not authorized, user not found' });
            }
            if (req.user.accountDisabled) {
                return res.status(403).json({ message: 'This account has been deactivated. Contact ShopNest management.' });
            }

            return next();
        } catch (error) {
            return res.status(401).json({ message: 'Not authorized, invalid token' });
        }
    }

    return res.status(401).json({ message: 'Not authorized, no token' });
};

const optionalProtect = async (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) return next();
    if (!authorization.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Not authorized, invalid token' });
    }

    try {
        const token = authorization.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(decoded.id).select('-password');
        if (!req.user) return res.status(401).json({ message: 'Not authorized, user not found' });
        if (req.user.accountDisabled) {
            return res.status(403).json({ message: 'This account has been deactivated. Contact ShopNest management.' });
        }
        return next();
    } catch (error) {
        return res.status(401).json({ message: 'Not authorized, invalid token' });
    }
};

module.exports = { protect, optionalProtect };
