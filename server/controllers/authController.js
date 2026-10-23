const User = require('../model/user');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { createHash, randomInt, timingSafeEqual } = require('crypto');
const sendEmail = require('../utils/sendEmail');

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
            user.lastLoginAt = new Date();
            await user.save();
            return res.json({
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
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
        } catch (emailError) {
            console.error('Password reset email failed:', emailError.message);
            user.passwordResetOtpHash = undefined;
            user.passwordResetOtpExpiresAt = undefined;
            user.passwordResetOtpSentAt = undefined;
            await user.save();
            return res.status(503).json({ message: 'We could not send a reset code. Check the email settings and try again.' });
        }

        return res.json({ message: genericMessage });
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
        const users = await User.find().select('-password');
        return res.json(users);
    } catch (error) {
        return res.status(500).json({ message: 'server error' });
    }
};

const getProfile = async (req, res) => {
    return res.json({
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        defaultAddress: req.user.defaultAddress || null
    });
};

const updateDefaultAddress = async (req, res) => {
    const { fullName, phone, altPhone, street, district, state, postalCode } = req.body;
    const defaultAddress = {
        fullName: typeof fullName === 'string' ? fullName.trim() : '',
        phone: typeof phone === 'string' ? phone.trim() : '',
        altPhone: typeof altPhone === 'string' ? altPhone.trim() : '',
        street: typeof street === 'string' ? street.trim() : '',
        district: typeof district === 'string' ? district.trim() : '',
        state: typeof state === 'string' ? state.trim() : '',
        postalCode: typeof postalCode === 'string' ? postalCode.trim() : '',
        country: 'India'
    };
    const validIndianMobile = (value) => /^[6-9]\d{9}$/.test(value);
    if ([defaultAddress.fullName, defaultAddress.phone, defaultAddress.street, defaultAddress.district, defaultAddress.state].some((value) => !value) || !/^\d{6}$/.test(defaultAddress.postalCode)) {
        return res.status(400).json({ message: 'Enter your name, phone, street, state, district, and valid six-digit PIN code.' });
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

module.exports = {
    registerUser,
    loginUser,
    requestPasswordResetOtp,
    resetPasswordWithOtp,
    getUsers,
    getProfile,
    updateDefaultAddress
};
