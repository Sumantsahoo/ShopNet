const StorefrontSettings = require('../model/storefrontSettings');
const cloudinary = require('../config/cloudinary');
const fs = require('fs/promises');

const HERO_SLIDE_COUNT = 6;

const getUploadedHeroFiles = (files = {}) => [
    ...(files.heroImage || []),
    ...Array.from({ length: HERO_SLIDE_COUNT }, (_, index) => files[`heroImage${index}`]?.[0]).filter(Boolean)
];

const removeUploadedFile = async (file) => {
    if (file?.path) {
        await fs.unlink(file.path).catch(() => {});
    }
};

const removeUploadedFiles = async (files) => {
    await Promise.all(files.map(removeUploadedFile));
};

const getStorefrontSettings = async (req, res) => {
    try {
        const settings = await StorefrontSettings.findOne().lean();
        const heroImageUrls = Array.isArray(settings?.heroImageUrls) && settings.heroImageUrls.length
            ? settings.heroImageUrls
            : (settings?.heroImageUrl ? [settings.heroImageUrl] : []);
        return res.json({
            heroImageUrl: heroImageUrls[0] || '',
            heroImageUrls,
            seasonalCampaignName: settings?.seasonalCampaignName || ''
        });
    } catch (error) {
        console.error('Could not load storefront settings:', error.message);
        return res.status(500).json({ message: 'Could not load storefront settings.' });
    }
};

const updateStorefrontSettings = async (req, res) => {
    const uploadedFiles = getUploadedHeroFiles(req.files);
    const hasHeroSlides = Array.from({ length: HERO_SLIDE_COUNT }, (_, index) => (
        Object.prototype.hasOwnProperty.call(req.body, `heroImageUrl${index}`)
    )).some(Boolean) || Object.prototype.hasOwnProperty.call(req.body, 'heroImageUrl') || uploadedFiles.length > 0;
    const campaignName = typeof req.body.seasonalCampaignName === 'string'
        ? req.body.seasonalCampaignName.trim()
        : undefined;
    if (campaignName !== undefined && campaignName.length > 80) {
        await removeUploadedFiles(uploadedFiles);
        return res.status(400).json({ message: 'Seasonal campaign name must be 80 characters or fewer.' });
    }

    const providedImageUrls = Array.from({ length: HERO_SLIDE_COUNT }, (_, index) => {
        const url = req.body[`heroImageUrl${index}`];
        return typeof url === 'string' ? url.trim() : '';
    });
    if (Object.prototype.hasOwnProperty.call(req.body, 'heroImageUrl') && !providedImageUrls.some(Boolean)) {
        const legacyUrl = typeof req.body.heroImageUrl === 'string' ? req.body.heroImageUrl.trim() : '';
        if (legacyUrl) providedImageUrls[0] = legacyUrl;
    }
    const uploadedSlideIndexes = new Set(
        Array.from({ length: HERO_SLIDE_COUNT }, (_, index) => req.files?.[`heroImage${index}`]?.[0] ? index : -1)
            .filter((index) => index >= 0)
    );
    if (req.files?.heroImage?.[0]) uploadedSlideIndexes.add(0);
    if (providedImageUrls.some((url, index) => url && !uploadedSlideIndexes.has(index) && !/^https?:\/\/\S+$/i.test(url))) {
        await removeUploadedFiles(uploadedFiles);
        return res.status(400).json({ message: 'Enter valid HTTP or HTTPS image URLs for each banner slide.' });
    }
    try {
        let heroImageUrls = providedImageUrls.filter(Boolean);
        if (uploadedFiles.length) {
            const uploadedUrls = await Promise.all(uploadedFiles.map(async (file) => {
                const result = await cloudinary.uploader.upload(file.path);
                if (!result.secure_url) {
                    throw new Error('Cloudinary did not return a secure image URL');
                }
                return result.secure_url;
            }));
            const legacyFile = req.files?.heroImage?.[0];
            if (legacyFile) {
                heroImageUrls = [uploadedUrls[0], ...heroImageUrls.slice(1)];
            } else {
                heroImageUrls = Array.from({ length: HERO_SLIDE_COUNT }, (_, index) => {
                    const file = req.files?.[`heroImage${index}`]?.[0];
                    return file
                        ? uploadedUrls[uploadedFiles.indexOf(file)]
                        : providedImageUrls[index];
                }).filter(Boolean);
            }
        }

        const settings = await StorefrontSettings.findOne() || new StorefrontSettings();
        if (hasHeroSlides) {
            settings.heroImageUrls = heroImageUrls.slice(0, HERO_SLIDE_COUNT);
            settings.heroImageUrl = settings.heroImageUrls[0] || '';
        }
        if (campaignName !== undefined) settings.seasonalCampaignName = campaignName;
        settings.updatedAt = new Date();
        await settings.save();
        await removeUploadedFiles(uploadedFiles);
        return res.json({
            heroImageUrl: settings.heroImageUrl,
            heroImageUrls: settings.heroImageUrls,
            seasonalCampaignName: settings.seasonalCampaignName
        });
    } catch (error) {
        await removeUploadedFiles(uploadedFiles);
        console.error('Could not update storefront settings:', error.message);
        return res.status(500).json({ message: 'Could not update storefront settings.' });
    }
};

module.exports = { getStorefrontSettings, updateStorefrontSettings };
