const getConfiguredCofounderEmail = () => (
    (process.env.COFOUNDER_EMAIL || process.env.ADMIN_EMAIL || '').trim().toLowerCase()
);

const isCofounder = (user) => {
    const configuredEmail = getConfiguredCofounderEmail();
    return Boolean(
        configuredEmail &&
        user?.role === 'admin' &&
        String(user.email || '').trim().toLowerCase() === configuredEmail
    );
};

const cofounder = (req, res, next) => {
    if (isCofounder(req.user)) return next();
    return res.status(403).json({ message: 'Access denied. Co-founder access is required.' });
};

module.exports = { cofounder, isCofounder };
