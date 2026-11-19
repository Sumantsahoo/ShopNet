const User = require('../model/user');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { createHash, randomInt, timingSafeEqual } = require('crypto');
const sendEmail = require('../utils/sendEmail');
const { isCofounder } = require('../middleware/cofounderMiddleWare');

const generateToken = (userId) => {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

const hashOtp = (otp) => createHash('sha256').update(otp).digest();

const registerUser = async (req, res) => {
    const { name, email, password } = req.body;
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

    if (!name || !normalizedEmail || !password) {
        return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    try {
        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser) {
            return res.status(400).json({ message: 'An account with this email already exists.' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const user = await User.create({ name, email: normalizedEmail, password: hashedPassword, joinedAt: new Date() });
        return res.status(201).json({
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            isCofounder: isCofounder(user),
            token: generateToken(user._id)
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: 'That email address is already registered.' });
        }
        console.error('Registration failed:', error.message);
        return res.status(500).json({ message: 'server error' });
    }
};

const loginUser = async (req, res) => {
    const { email, password } = req.body;
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

    if (!normalizedEmail || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }
    try {
        const user = await User.findOne({ email: normalizedEmail });

        if (user && (await bcrypt.compare(password, user.password))) {
            if (user.accountDisabled) {
                return res.status(403).json({ message: 'This account has been deactivated. Contact ShopNest management.' });
            }
            user.lastLoginAt = new Date();
            await user.save();
            return res.json({
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                isCofounder: isCofounder(user),
                employeePosition: user.employeePosition,
                employeeCompanyId: user.employeeCompanyId,
                token: generateToken(user._id)
            });
        }

        return res.status(401).json({ message: 'invalid email or password' });
    } catch (error) {
        console.error('Login failed:', error.message);
        return res.status(500).json({ message: 'server error' });
    }
};

const requestPasswordResetOtp = async (req, res) => {
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    if (!email) {
        return res.status(400).json({ message: 'Email is required.' });
    }

    const genericMessage = 'If an account exists for that email, a password reset code will be sent.';
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.json({ message: genericMessage });
        }
        if (user.passwordResetOtpSentAt && Date.now() - user.passwordResetOtpSentAt.getTime() < 60 * 1000) {
            return res.status(429).json({ message: 'Please wait one minute before requesting another reset code.' });
        }

        const otp = randomInt(100000, 1000000).toString();
        user.passwordResetOtpHash = hashOtp(otp).toString('hex');
        user.passwordResetOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
        user.passwordResetOtpSentAt = new Date();
        user.passwordResetOtpAttempts = 0;
        await user.save();

        try {
            await sendEmail(
                user.email,
                'ShopNest password reset code',
                `Your ShopNest password reset code is ${otp}. It expires in 10 minutes. If you did not request this, ignore this email.`
            );
            return res.json({ message: `If an account exists for ${email}, a password reset code was sent to your email. Check your inbox and spam folder.` });
        } catch (emailError) {
            console.error('Password reset email failed:', emailError.message);
            user.passwordResetOtpHash = undefined;
            user.passwordResetOtpExpiresAt = undefined;
            user.passwordResetOtpSentAt = undefined;
            await user.save();
            return res.status(503).json({ 
                message: `Could not send reset code to ${user.email}. Add RESEND_API_KEY to your Render environment variables to send emails over HTTPS.`,
                error: emailError.message 
            });
        }
    } catch (error) {
        console.error('Password reset code request failed:', error.message);
        return res.status(500).json({ message: 'Could not request a password reset code. Please try again.' });
    }
};

const resetPasswordWithOtp = async (req, res) => {
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const { otp, newPassword } = req.body;
    if (!email || !/^\d{6}$/.test(otp || '') || typeof newPassword !== 'string' || newPassword.length < 8) {
        return res.status(400).json({ message: 'Enter your email, six-digit reset code, and a new password of at least 8 characters.' });
    }

    try {
        const user = await User.findOne({ email });
        if (!user || !user.passwordResetOtpHash || !user.passwordResetOtpExpiresAt || user.passwordResetOtpExpiresAt <= new Date()) {
            return res.status(400).json({ message: 'Reset code is invalid or expired. Request a new code.' });
        }
        if (user.passwordResetOtpAttempts >= 5) {
            return res.status(429).json({ message: 'Too many incorrect attempts. Request a new reset code.' });
        }

        const expectedHash = Buffer.from(user.passwordResetOtpHash, 'hex');
        const suppliedHash = hashOtp(otp);
        if (expectedHash.length !== suppliedHash.length || !timingSafeEqual(expectedHash, suppliedHash)) {
            user.passwordResetOtpAttempts += 1;
            await user.save();
            return res.status(400).json({ message: 'Reset code is incorrect.' });
        }

        user.password = await bcrypt.hash(newPassword, 10);
        user.passwordResetOtpHash = undefined;
        user.passwordResetOtpExpiresAt = undefined;
        user.passwordResetOtpSentAt = undefined;
        user.passwordResetOtpAttempts = 0;
        await user.save();

        return res.json({ message: 'Password changed successfully. Please log in with your new password.' });
    } catch (error) {
        console.error('Password reset failed:', error.message);
        return res.status(500).json({ message: 'Could not reset your password. Please try again.' });
    }
};

const getUsers = async (req, res) => {
    try {
        const pageValue = req.query.page;
        if (pageValue !== undefined && (typeof pageValue !== 'string' || !/^[1-9]\d*$/.test(pageValue) || !Number.isSafeInteger(Number(pageValue)))) {
            return res.status(400).json({ message: 'Page must be a positive whole number.' });
        }
        const requestedPage = pageValue === undefined ? 1 : Number(pageValue);
        const filters = { role: 'user' };
        let invalidFilter = false;
        ['state', 'district', 'block', 'village'].forEach((field) => {
            const filterValue = req.query[field];
            if (filterValue !== undefined && typeof filterValue !== 'string') {
                invalidFilter = true;
                return;
            }
            const value = typeof filterValue === 'string' ? filterValue.trim() : '';
            if (value) {
                if (value.length > 100) {
                    invalidFilter = true;
                    return;
                }
                const escapedValue = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                filters[`defaultAddress.${field}`] = { $regex: `^${escapedValue}$`, $options: 'i' };
            }
        });
        if (invalidFilter) {
            return res.status(400).json({ message: 'Location filters must be 100 characters or fewer.' });
        }
        const limit = 50;
        const total = await User.countDocuments(filters);
        const pages = Math.ceil(total / limit);
        const page = Math.min(requestedPage, Math.max(pages, 1));
        const users = await User.find(filters)
            .select('name email joinedAt lastLoginAt defaultAddress')
            .sort({ joinedAt: -1, _id: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();
        return res.json({ users, total, page, pages, limit });
    } catch (error) {
        console.error('Could not load customer records:', error.message);
        return res.status(500).json({ message: 'server error' });
    }
};

const getCustomerLocationOptions = async (req, res) => {
    const locationFields = ['state', 'district', 'block'];
    const values = {};
    for (const field of locationFields) {
        const value = req.query[field];
        if (value !== undefined && (typeof value !== 'string' || value.trim().length > 100)) {
            return res.status(400).json({ message: 'Location filters must be 100 characters or fewer.' });
        }
        values[field] = typeof value === 'string' ? value.trim() : '';
    }

    const exactValue = (value) => {
        const escapedValue = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return { $regex: `^${escapedValue}$`, $options: 'i' };
    };
    try {
        const parentFilters = { role: 'user' };
        if (values.state) parentFilters['defaultAddress.state'] = exactValue(values.state);
        if (values.district) parentFilters['defaultAddress.district'] = exactValue(values.district);
        let blocks = [];
        let villages = [];
        if (values.state && values.district) {
            blocks = await User.distinct('defaultAddress.block', {
                ...parentFilters,
                'defaultAddress.block': { $nin: ['', null] }
            });
            blocks = blocks.filter((value) => typeof value === 'string' && value.trim()).sort((left, right) => left.localeCompare(right));
        }
        if (values.state && values.district && values.block) {
            villages = await User.distinct('defaultAddress.village', {
                ...parentFilters,
                'defaultAddress.block': exactValue(values.block),
                'defaultAddress.village': { $nin: ['', null] }
            });
            villages = villages.filter((value) => typeof value === 'string' && value.trim()).sort((left, right) => left.localeCompare(right));
        }
        return res.json({ blocks, villages });
    } catch (error) {
        console.error('Could not load customer location options:', error.message);
        return res.status(500).json({ message: 'Could not load block and village options.' });
    }
};

const getProfile = async (req, res) => {
    return res.json({
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        isCofounder: isCofounder(req.user),
        employeePosition: req.user.employeePosition,
        employeeCompanyId: req.user.employeeCompanyId,
        defaultAddress: req.user.defaultAddress || null
    });
};

const updateDefaultAddress = async (req, res) => {
    const { fullName, phone, altPhone, street, district, state, block, village, postalCode } = req.body;
    const defaultAddress = {
        fullName: typeof fullName === 'string' ? fullName.trim() : '',
        phone: typeof phone === 'string' ? phone.trim() : '',
        altPhone: typeof altPhone === 'string' ? altPhone.trim() : '',
        street: typeof street === 'string' ? street.trim() : '',
        district: typeof district === 'string' ? district.trim() : '',
        state: typeof state === 'string' ? state.trim() : '',
        block: typeof block === 'string' ? block.trim() : '',
        village: typeof village === 'string' ? village.trim() : '',
        postalCode: typeof postalCode === 'string' ? postalCode.trim() : '',
        country: 'India'
    };
    const validIndianMobile = (value) => /^[6-9]\d{9}$/.test(value);
    if ([defaultAddress.fullName, defaultAddress.phone, defaultAddress.street, defaultAddress.district, defaultAddress.state].some((value) => !value) || !/^\d{6}$/.test(defaultAddress.postalCode)) {
        return res.status(400).json({ message: 'Enter your name, phone, street, state, district, and valid six-digit PIN code.' });
    }
    if (defaultAddress.fullName.length > 80 || defaultAddress.street.length > 300 ||
        defaultAddress.district.length > 100 || defaultAddress.state.length > 100) {
        return res.status(400).json({ message: 'Name, street, state, or district is too long.' });
    }
    if (defaultAddress.block.length > 100 || defaultAddress.village.length > 100) {
        return res.status(400).json({ message: 'Block and village names must be 100 characters or fewer.' });
    }
    if (!validIndianMobile(defaultAddress.phone) || (defaultAddress.altPhone && !validIndianMobile(defaultAddress.altPhone))) {
        return res.status(400).json({ message: 'Phone numbers must be valid 10-digit Indian mobile numbers.' });
    }

    try {
        const user = await User.findByIdAndUpdate(
            req.user._id,
            { $set: { defaultAddress } },
            { new: true, runValidators: true }
        ).select('-password');
        if (!user) return res.status(404).json({ message: 'Account not found.' });
        return res.json({ message: 'Default address saved.', defaultAddress: user.defaultAddress });
    } catch (error) {
        console.error('Default address update failed:', error.message);
        return res.status(500).json({ message: 'Could not save your default address.' });
    }
};

const updateProfile = async (req, res) => {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    if (name.length < 2 || name.length > 80) {
        return res.status(400).json({ message: 'Name must be between 2 and 80 characters.' });
    }

    try {
        const user = await User.findByIdAndUpdate(
            req.user._id,
            { $set: { name } },
            { new: true, runValidators: true }
        ).select('-password');
        if (!user) return res.status(404).json({ message: 'Account not found.' });
        return res.json({ message: 'Profile updated.', name: user.name });
    } catch (error) {
        console.error('Profile update failed:', error.message);
        return res.status(500).json({ message: 'Could not update your profile.' });
    }
};

module.exports = {
    registerUser,
    loginUser,
    requestPasswordResetOtp,
    resetPasswordWithOtp,
    getUsers,
    getCustomerLocationOptions,
    getProfile,
    updateDefaultAddress,
    updateProfile
};
